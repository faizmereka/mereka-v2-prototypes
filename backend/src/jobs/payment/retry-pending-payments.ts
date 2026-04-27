import { ContractPayment, ContractPaymentType } from '@core/models/ContractPayment';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import { hubContractNotificationService } from '@core/services/hub/contracts/hubContractNotification.service';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import { getStripeRegion, type StripeRegion } from '@core/utils/stripe-region';
import type { IJobMetadata, JobContext } from '@jobs/helpers/job-runner';
import { hubTimelogService as timelogService } from '@services/hub';
import { pendingPaymentService } from '@services/payments';

/**
 * Retry Pending Payments Job Handler
 *
 * Processes failed payments that are queued for retry:
 * - Finds pending payments where nextRetryAt <= now
 * - Retries payment using saved payment method
 * - Updates payment status and work logs on success
 * - Implements exponential backoff on failure
 * - Marks as permanently failed after max retries
 *
 * @runs Every hour
 */
export async function retryPendingPaymentsHandler(context: JobContext): Promise<IJobMetadata> {
  const { log } = context;

  log.info('Starting retry pending payments job');

  // Find pending payments due for retry using service
  const pendingPayments = await pendingPaymentService.getPendingForRetry();

  if (pendingPayments.length === 0) {
    log.info('No pending payments to retry');
    return {
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
    };
  }

  log.info({ count: pendingPayments.length }, 'Found pending payments to retry');

  let successCount = 0;
  let failCount = 0;

  // Process each pending payment
  for (const payment of pendingPayments) {
    try {
      await processPaymentRetry(payment, log);
      successCount++;
    } catch (error) {
      failCount++;
      log.error(
        { paymentId: payment._id.toString(), contractId: payment.contractId, error },
        'Failed to process payment retry',
      );
    }
  }

  const metadata: IJobMetadata = {
    recordsProcessed: pendingPayments.length,
    recordsSucceeded: successCount,
    recordsFailed: failCount,
  };

  log.info(metadata, 'Retry pending payments job completed');

  return metadata;
}

/**
 * Process a single payment retry
 */
async function processPaymentRetry(
  payment: Awaited<ReturnType<typeof pendingPaymentService.getPendingForRetry>>[number],
  log: JobContext['log'],
): Promise<void> {
  const paymentId = payment._id.toString();

  log.info(
    { paymentId, contractId: payment.contractId, retryCount: payment.retryCount },
    'Processing payment retry',
  );

  try {
    // Mark as processing
    await pendingPaymentService.markAsProcessing(payment._id);

    // Determine expert's regional Stripe service
    // Payments use expert's region (their hub's platform or their own region if independent)
    let region: StripeRegion = 'atlas';
    if (payment.expertHubId) {
      const expertHub = await Hub.findById(payment.expertHubId)
        .select('stripeRegion location')
        .lean();
      if (expertHub?.stripeRegion === 'malaysia' || expertHub?.stripeRegion === 'atlas') {
        region = expertHub.stripeRegion;
      } else if (expertHub?.location?.country) {
        region = getStripeRegion(expertHub.location.country);
      }
    } else if (payment.expertId) {
      const expert = await User.findById(payment.expertId).select('stripeRegion location').lean();
      if (expert?.stripeRegion === 'malaysia' || expert?.stripeRegion === 'atlas') {
        region = expert.stripeRegion;
      } else if (expert?.location?.country) {
        region = getStripeRegion(expert.location.country);
      }
    }
    const regionalStripeService = StripeServiceFactory.getService(region);

    // Attempt to create payment intent using regional stripe service
    const paymentIntent = await regionalStripeService.createPaymentIntent({
      amount: payment.amount,
      currency: payment.currency,
      customerId: payment.stripeCustomerId,
      paymentMethodId: payment.paymentMethodId,
      description: payment.description || `Retry payment for ${payment.contractTitle}`,
      metadata: {
        contractId: payment.contractId.toString(),
        jobId: payment.jobId.toString(),
        proposalId: payment.proposalId?.toString() || '',
        clientId: payment.clientId.toString(),
        expertId: payment.expertId.toString(),
        retryAttempt: String(payment.retryCount + 1),
        stripeRegion: region,
      },
    });

    // Payment succeeded - update status using service
    await pendingPaymentService.markAsCompleted(payment._id, paymentIntent.id);

    // Update timelogs to paid status using service
    // Convert ObjectId[] to string[] for the timelog service
    const timelogIdStrings = payment.timelogEntryIds.map((id) => id.toString());
    if (timelogIdStrings.length > 0) {
      await timelogService.markTimelogsAsPaid(timelogIdStrings, paymentIntent.id);
    }

    // Calculate amount in base units (convert from cents)
    const amountBase = payment.amount / 100;

    // Create ContractPayment record for this timelog payment
    // NO platform commission - expert receives full amount
    await ContractPayment.create({
      paymentType: ContractPaymentType.TIMELOG,
      contractId: payment.contractId,
      jobId: payment.jobId,
      clientHubId: payment.clientHubId,
      expertHubId: payment.expertHubId,
      hubId: payment.expertHubId, // Legacy - same as expertHubId
      clientId: payment.clientId,
      expertId: payment.expertId,
      idempotencyKey: payment.idempotencyKey,
      amount: amountBase,
      currency: payment.currency,
      stripeFee: payment.stripeFee || 0,
      grossAmount: payment.grossAmount || amountBase,
      transferAmount: amountBase, // Expert receives full amount - no platform fee
      stripePaymentIntentId: paymentIntent.id,
      stripeRegion: region, // Track which regional platform was used
      status: 'paid',
      timelogEntryIds: payment.timelogEntryIds,
      weekStartDate: payment.weekStartDate,
      weekEndDate: payment.weekEndDate,
      hoursWorked: payment.totalHours,
    });

    log.info(
      {
        paymentId,
        contractId: payment.contractId,
        paymentIntentId: paymentIntent.id,
      },
      'Payment retry succeeded',
    );

    // Send success notification to expert (non-blocking)
    void hubContractNotificationService.notifyWeeklyPayoutProcessed(
      payment.expertId.toString(),
      payment.contractTitle || 'Contract',
      amountBase,
      payment.totalHours || 0,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const { isPermanentlyFailed } = await pendingPaymentService.markAsFailedWithRetry(
      payment._id,
      errorMessage,
      payment.retryCount,
      payment.maxRetries,
    );

    log.warn(
      {
        paymentId,
        contractId: payment.contractId,
        retryCount: payment.retryCount + 1,
        maxRetries: payment.maxRetries,
        error: errorMessage,
      },
      isPermanentlyFailed
        ? 'Payment permanently failed after max retries'
        : 'Payment retry failed, scheduling next retry',
    );

    // Send failure notifications (non-blocking)
    if (isPermanentlyFailed) {
      // Notify both client and expert about permanent failure
      void hubContractNotificationService.notifyPaymentPermanentlyFailed(
        payment.clientId.toString(),
        payment.expertId.toString(),
        payment.contractTitle || 'Contract',
        payment.amount / 100, // Convert from cents
        errorMessage,
        payment.clientHubId?.toString(),
        payment.expertHubId?.toString(),
      );
    } else {
      // Notify client about retry failure
      void hubContractNotificationService.notifyPaymentRetryFailed(
        payment.clientId.toString(),
        payment.contractTitle || 'Contract',
        payment.amount / 100, // Convert from cents
        payment.retryCount + 1,
        payment.maxRetries,
        errorMessage,
        payment.clientHubId?.toString(),
      );
    }
  }
}
