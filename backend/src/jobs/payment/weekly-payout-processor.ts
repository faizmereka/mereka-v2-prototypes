import { ContractPayment, ContractPaymentType } from '@core/models/ContractPayment';
import { Hub } from '@core/models/Hub';
import { TransactionType } from '@core/models/Transaction';
import { User } from '@core/models/User';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import { getStripeRegion, type StripeRegion } from '@core/utils/stripe-region';
import type { IJobMetadata, JobContext } from '@jobs/helpers/job-runner';
import {
  hubContractService as contractService,
  hubContractNotificationService,
  hubTimelogService as timelogService,
} from '@services/hub';
import { pendingPaymentService, transactionService } from '@services/payments';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import utc from 'dayjs/plugin/utc.js';
import mongoose from 'mongoose';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(isoWeek);

/**
 * Stripe fee calculation (single account)
 * Standard Stripe fee: 2.9% + $0.30
 */
export function calculateStripeFee(totalCost: number): number {
  return truncateNumber((2.9 / 100) * totalCost + 0.3);
}

function truncateNumber(num: number, decimalPlaces = 0): number {
  const multiplier = 10 ** decimalPlaces;
  const result = Math.floor(num * multiplier) / multiplier;
  return result > 0 ? result : 0;
}

/**
 * Convert time to total minutes in 24-hour format
 */
function convertToMinutes(startTime: string, endTime: string): number {
  const [startHour = 0, startMin = 0] = startTime.split(':').map(Number);
  const [endHour = 0, endMin = 0] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;

  // Handle overnight work
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}

/**
 * Weekly summary interface
 */
interface WeeklySummary {
  contractId: string;
  totalMinutes: number;
  totalHours: number;
  totalTime: string;
  startDateTime: string;
  endDateTime: string;
  workLogIds: string[];
}

/**
 * Weekly Payout Processor Job Handler
 *
 * Processes weekly work logs and charges job posters for hourly contracts:
 * - Runs every Monday at 23:59 UTC
 * - Fetches work logs from previous week (Monday-Sunday)
 * - Groups by contract and calculates total hours
 * - Charges the job poster using saved payment method
 * - Creates booking transaction record
 * - Updates work logs as paid
 * - On failure: creates pending payment for retry
 *
 * @runs Monday 23:59 UTC (weekly)
 */
export async function weeklyPayoutProcessorHandler(context: JobContext): Promise<IJobMetadata> {
  const { log } = context;

  log.info('Starting weekly payout processor job');

  // Define the start and end of the previous week
  const lastMonday = dayjs.utc().startOf('isoWeek').subtract(1, 'week');
  const lastSunday = dayjs.utc().endOf('isoWeek').subtract(1, 'week');

  const startDateTime = lastMonday.toISOString();
  const endDateTime = lastSunday.toISOString();

  log.info({ startDateTime, endDateTime }, 'Fetching work logs for period');

  try {
    // Fetch timelogs using service
    const timelogs = await timelogService.getApprovedUnpaidTimelogs(
      lastMonday.toDate(),
      lastSunday.toDate(),
    );

    if (timelogs.length === 0) {
      log.info('No timelogs found for the past week');
      return {
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
      };
    }

    log.info({ count: timelogs.length }, 'Found timelogs to process');

    // Group timelogs by contractId and calculate totals
    const weeklyData = new Map<string, WeeklySummary>();

    for (const timelog of timelogs) {
      const workedMinutes = convertToMinutes(timelog.startTime, timelog.endTime);

      if (workedMinutes <= 0) continue; // Skip invalid logs

      const contractIdStr = timelog.contractId.toString();
      const existing = weeklyData.get(contractIdStr);

      if (existing) {
        existing.totalMinutes += workedMinutes;
        existing.workLogIds.push(timelog._id.toString());
      } else {
        weeklyData.set(contractIdStr, {
          contractId: contractIdStr,
          totalMinutes: workedMinutes,
          totalHours: 0,
          totalTime: '',
          startDateTime,
          endDateTime,
          workLogIds: [timelog._id.toString()],
        });
      }
    }

    // Calculate final totals
    for (const summary of weeklyData.values()) {
      const totalHoursDecimal = summary.totalMinutes / 60;
      const totalHours = Math.floor(totalHoursDecimal);
      const remainingMinutes = summary.totalMinutes % 60;

      summary.totalHours = Number.parseFloat(totalHoursDecimal.toFixed(2));
      summary.totalTime = `${totalHours}:${remainingMinutes.toString().padStart(2, '0')}`;
    }

    let successCount = 0;
    let failCount = 0;

    // Process each contract summary
    for (const summary of weeklyData.values()) {
      try {
        // Get contract data using service
        const contract = await contractService.getContractForPayment(summary.contractId);

        if (!contract) {
          log.warn({ contractId: summary.contractId }, 'Contract not found');
          failCount++;
          continue;
        }

        const totalCost = Math.ceil(summary.totalHours * (contract.hourlyProposedPrice || 0));
        const stripeFee = calculateStripeFee(totalCost);
        const totalAmountCents = Math.ceil((totalCost + stripeFee) * 100);

        // Generate idempotency key for this week's payment
        const weekNumber = lastMonday.isoWeek();
        const year = lastMonday.year();
        const idempotencyKey = `timelog-${contract._id.toString()}-${year}-W${weekNumber}`;

        // Determine expert's regional Stripe service
        let region: StripeRegion = 'atlas';
        if (contract.expertHubId) {
          const expertHub = await Hub.findById(contract.expertHubId)
            .select('stripeRegion location')
            .lean();
          if (expertHub?.stripeRegion === 'malaysia' || expertHub?.stripeRegion === 'atlas') {
            region = expertHub.stripeRegion;
          } else if (expertHub?.location?.country) {
            region = getStripeRegion(expertHub.location.country);
          }
        } else if (contract.asssignedExpertId) {
          const expert = await User.findById(contract.asssignedExpertId)
            .select('stripeRegion location')
            .lean();
          if (expert?.stripeRegion === 'malaysia' || expert?.stripeRegion === 'atlas') {
            region = expert.stripeRegion;
          } else if (expert?.location?.country) {
            region = getStripeRegion(expert.location.country);
          }
        }
        const regionalStripeService = StripeServiceFactory.getService(region);

        try {
          // Create payment intent using expert's regional stripe service
          const paymentIntent = await regionalStripeService.createPaymentIntent({
            amount: totalAmountCents,
            currency: contract.selectedCurrency || 'USD',
            customerId: contract.stripeCustomerId || '',
            paymentMethodId: contract.paymentMethodId || '',
            description: `Payout for ${contract.contractTitle}`,
            metadata: {
              contractId: contract._id.toString(),
              jobId: contract.jobId?.toString() || '',
              applicationId: contract.jobProposalId?.toString() || '',
              clientId: contract.createdBy?.toString() || '',
              expertId: contract.asssignedExpertId?.toString() || '',
              stripeRegion: region,
            },
          });

          // Update timelogs to paid status using service
          await timelogService.markTimelogsAsPaid(summary.workLogIds, paymentIntent.id);

          // Create ContractPayment record for this timelog payment
          // NO platform commission - expert receives full amount
          const contractPayment = await ContractPayment.create({
            paymentType: ContractPaymentType.TIMELOG,
            contractId: new mongoose.Types.ObjectId(contract._id.toString()),
            jobId: contract.jobId,
            clientHubId: contract.clientHubId,
            expertHubId: contract.expertHubId,
            hubId: contract.expertHubId, // Legacy - same as expertHubId
            clientId: contract.createdBy,
            expertId: contract.asssignedExpertId,
            idempotencyKey,
            amount: totalCost,
            currency: contract.selectedCurrency || 'USD',
            stripeFee,
            grossAmount: totalCost + stripeFee,
            transferAmount: totalCost, // Expert receives full amount - no platform fee
            stripePaymentIntentId: paymentIntent.id,
            stripeRegion: region, // Track which regional platform was used
            status: 'paid',
            weekNumber,
            year,
            weekStartDate: lastMonday.toDate(),
            weekEndDate: lastSunday.toDate(),
            timelogEntryIds: summary.workLogIds.map((id) => new mongoose.Types.ObjectId(id)),
            hoursWorked: summary.totalHours,
            hourlyRate: contract.hourlyProposedPrice,
          });

          // Create Transaction record for this payment
          // NO platform commission - expert receives full amount
          await transactionService.createFromContractPayment(
            {
              _id: contractPayment._id as mongoose.Types.ObjectId,
              paymentType: 'timelog',
              hubId: (contract.expertHubId || contract.clientHubId) as mongoose.Types.ObjectId,
              clientId: contract.createdBy as mongoose.Types.ObjectId,
              expertId: contract.asssignedExpertId as mongoose.Types.ObjectId,
              amount: totalCost,
              currency: contract.selectedCurrency || 'USD',
              platformFee: 0, // No platform fee
              platformFeeRate: 0,
              stripeFee,
              transferAmount: totalCost, // Expert receives full amount
              stripePaymentIntentId: paymentIntent.id,
            },
            TransactionType.TIMELOG_PAYMENT,
          );

          // Send success notification to expert
          await hubContractNotificationService.notifyWeeklyPayoutProcessed(
            contract.asssignedExpertId?.toString() || '',
            contract.contractTitle || '',
            totalCost,
            summary.totalHours,
          );

          log.info(
            {
              contractId: summary.contractId,
              totalHours: summary.totalHours,
              totalCost,
              paymentIntentId: paymentIntent.id,
            },
            'Payment processed successfully',
          );

          successCount++;
        } catch (paymentError) {
          const errorMessage =
            paymentError instanceof Error ? paymentError.message : 'Payment processing failed';

          log.error(
            { contractId: summary.contractId, error: errorMessage },
            'Payment failed, creating pending payment record',
          );

          // Send failure notification to client
          await hubContractNotificationService.notifyWeeklyPayoutFailed(
            contract.createdBy?.toString() || '',
            contract.contractTitle || '',
            totalCost,
            errorMessage,
          );

          // Create pending payment for retry using service
          await pendingPaymentService.create({
            contractId: contract._id,
            jobId: contract.jobId,
            proposalId: contract.jobProposalId,
            clientHubId: contract.clientHubId,
            expertHubId: contract.expertHubId || contract.clientHubId,
            expertId: contract.asssignedExpertId,
            clientId: contract.createdBy,
            idempotencyKey,
            paymentMethodId: contract.paymentMethodId || '',
            stripeCustomerId: contract.stripeCustomerId || '',
            amount: totalAmountCents,
            stripeFee: Math.ceil(stripeFee * 100), // Convert to cents
            grossAmount: totalAmountCents,
            currency: contract.selectedCurrency || 'USD',
            weekNumber,
            year,
            weekStartDate: lastMonday.toDate(),
            weekEndDate: lastSunday.toDate(),
            totalHours: summary.totalHours,
            hourlyRate: contract.hourlyProposedPrice,
            contractTitle: contract.contractTitle || '',
            description: `Payout for ${contract.contractTitle}`,
            timelogEntryIds: summary.workLogIds,
            lastError: errorMessage,
          });

          failCount++;
        }
      } catch (error) {
        log.error({ contractId: summary.contractId, error }, 'Error processing contract');
        failCount++;
      }
    }

    const metadata: IJobMetadata = {
      recordsProcessed: weeklyData.size,
      recordsSucceeded: successCount,
      recordsFailed: failCount,
    };

    log.info(metadata, 'Weekly payout processor completed');

    return metadata;
  } catch (error) {
    log.error({ error }, 'Error in weekly payout processor');
    throw error;
  }
}
