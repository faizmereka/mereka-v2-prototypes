import { Booking, StripePaymentStatus } from '@core/models/Booking';
import { Hub } from '@core/models/Hub';
import { SourceModel } from '@core/models/Transaction';
import { bookingNotificationService } from '@core/services/shared/bookings/bookingNotification.service';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import type { IJobMetadata, JobContext } from '@jobs/helpers/job-runner';
import { transactionService } from '@services/payments';
import mongoose from 'mongoose';

/**
 * Transferable booking type
 */
interface TransferableBooking {
  _id: string;
  hubId: string;
  serviceId: string;
  bookingType: string;
  totalCost: number;
  currency: string;
  isCouponUsed: boolean;
  isHubCouponUsed: boolean;
  isFree: boolean;
  discountAmount?: number;
  stripeFee: number;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeResponse?: {
    amount?: number;
    charges?: { data?: Array<{ id?: string }> };
    latest_charge?: string;
  };
  refundAmount?: number;
}

/**
 * Truncate number to specified decimal places
 */
function truncateNumber(num: number, decimalPlaces = 0): number {
  const multiplier = 10 ** decimalPlaces;
  const result = Math.floor(num * multiplier) / multiplier;
  return result > 0 ? result : 0;
}

/**
 * Transfer Stripe Balance Job Handler (v2 Architecture)
 *
 * Transfers money from platform to Hub's Stripe Connect accounts:
 * - Runs every 12 hours
 * - Finds bookings where:
 *   - Payment succeeded (stripeStatus: succeeded)
 *   - Service date has passed (bookingEndDate < now)
 *   - Not yet transferred (transferStatus != paid)
 * - Gets Hub's stripeAccountId directly from Hub model
 * - Verifies account is enabled via Stripe API
 * - Calculates platform fees based on subscription tier
 * - Transfers balance to Hub's Stripe Connect account
 * - Creates Transaction record for the transfer
 *
 * Note: v2 uses Hub's stripeAccountId (stored on Hub model)
 *
 * @runs Every 12 hours
 */
export async function transferStripeBalanceHandler(context: JobContext): Promise<IJobMetadata> {
  const { log } = context;

  log.info('Starting transfer stripe balance job');

  try {
    // Get bookings where payment succeeded and service date has passed
    // Only process bookings from the last 2 months to avoid processing old data
    const now = new Date();
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const bookings = await Booking.find({
      stripeStatus: StripePaymentStatus.SUCCEEDED,
      bookingEndDate: { $lt: now, $gte: twoMonthsAgo }, // Service date has passed but within last 2 months
      transferStatus: { $ne: 'paid' },
      transferAmount: { $gt: 0 },
      isFree: false,
    }).lean();

    if (bookings.length === 0) {
      log.info('No bookings to process for transfer');
      return {
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
      };
    }

    log.info({ count: bookings.length }, 'Found bookings to process');

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const booking of bookings) {
      try {
        const result = await processBooking(booking as unknown as TransferableBooking, log);

        if (result === 'success') {
          successCount++;
        } else if (result === 'skipped') {
          skippedCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error({ bookingId: booking._id, error: errorMessage }, 'Transfer failed');

        // Mark as error if duplicate transfer
        if (errorMessage.includes('There is already a transfer using this source')) {
          await Booking.updateOne(
            { _id: booking._id },
            { transferStatus: 'error', transferError: errorMessage },
          );
        }

        // Notify hub owner about transfer failure (non-blocking)
        void bookingNotificationService.notifyBookingTransferFailed(
          booking._id.toString(),
          errorMessage,
        );

        failCount++;
      }
    }

    const metadata: IJobMetadata = {
      recordsProcessed: bookings.length,
      recordsSucceeded: successCount,
      recordsFailed: failCount,
      recordsSkipped: skippedCount,
    };

    log.info(metadata, 'Transfer stripe balance job completed');

    return metadata;
  } catch (error) {
    log.error({ error }, 'Error in transfer stripe balance job');
    throw error;
  }
}

/**
 * Process a single booking transfer
 * Uses hub's regional Stripe platform (Malaysia or Atlas)
 */
async function processBooking(
  booking: TransferableBooking,
  log: JobContext['log'],
): Promise<'success' | 'skipped' | 'failed'> {
  // Skip if 100% coupon used (free booking - no payment to transfer)
  if (booking.isCouponUsed && booking.isFree) {
    log.info({ bookingId: booking._id }, 'Skipping free coupon booking - no payment');
    return 'skipped';
  }

  // Skip if no stripe response (shouldn't happen for succeeded)
  if (!booking.stripeResponse?.amount) {
    log.warn({ bookingId: booking._id }, 'No stripe response amount');
    return 'skipped';
  }

  // Get hub with its Stripe account ID and region info
  const hub = await Hub.findById(booking.hubId)
    .select('stripeAccountId stripeRegion location ownerId name')
    .lean();

  if (!hub) {
    log.warn({ bookingId: booking._id, hubId: booking.hubId }, 'Hub not found');
    return 'failed';
  }

  if (!hub.stripeAccountId) {
    log.warn(
      { bookingId: booking._id, hubId: booking.hubId },
      'Hub does not have a Stripe account',
    );
    return 'failed';
  }

  // Get regional Stripe service for hub
  const regionalStripeService = StripeServiceFactory.getServiceForHub(hub);

  // Check if Stripe account can receive payments by fetching from Stripe API
  const stripeAccount = await regionalStripeService
    .retrieveAccount(hub.stripeAccountId)
    .catch((error) => {
      log.warn(
        { bookingId: booking._id, stripeAccountId: hub.stripeAccountId, error },
        'Failed to retrieve Stripe account',
      );
      return null;
    });

  if (!stripeAccount) {
    return 'failed';
  }

  if (!stripeAccount.payouts_enabled) {
    log.warn(
      { bookingId: booking._id, stripeAccountId: hub.stripeAccountId },
      'Hub Stripe account payouts not enabled',
    );
    return 'failed';
  }

  // Get platform rate (default 10% if no subscription tier logic)
  // TODO: Get rate from subscription tier
  const platformRatePercent = 10;

  // Calculate transfer amount
  // Check multiple locations for charge ID: charges.data[0].id, latest_charge, or stripeChargeId
  const chargeId =
    booking.stripeResponse?.charges?.data?.[0]?.id ||
    booking.stripeResponse?.latest_charge ||
    booking.stripeChargeId;

  if (!chargeId) {
    log.warn({ bookingId: booking._id }, 'No charge ID found for transfer');
    return 'failed';
  }

  // Fetch charge and balance transaction from Stripe using regional service
  // When using sourceTransaction, we must use the BALANCE TRANSACTION currency and amount
  // Charges may be in local currency (MYR) but balance transactions settle in platform currency (USD)
  const charge = await regionalStripeService.retrieveCharge(chargeId);

  if (!charge.balance_transaction) {
    log.warn({ bookingId: booking._id, chargeId }, 'No balance transaction found for charge');
    return 'failed';
  }

  const balanceTransactionId =
    typeof charge.balance_transaction === 'string'
      ? charge.balance_transaction
      : charge.balance_transaction.id;
  const balanceTransaction =
    await regionalStripeService.retrieveBalanceTransaction(balanceTransactionId);

  // Use balance transaction net amount (already has Stripe processing fees deducted)
  // This is in the platform's settlement currency (USD)
  const currency = balanceTransaction.currency?.toLowerCase() || 'usd';
  const availableAmount = balanceTransaction.net; // Net amount in cents (after Stripe fees)

  // Deduct any refunds (convert to balance transaction currency if needed)
  // For simplicity, assume refunds are in same currency or handle proportionally
  const refundAmount = booking.refundAmount ? booking.refundAmount * 100 : 0;
  let transferAmount = availableAmount - refundAmount;

  // Note: Coupon handling would need currency conversion - skip for now as it's platform-side
  // The balance transaction already reflects what was actually charged

  // Deduct platform fee
  const merekaFees = (platformRatePercent / 100) * transferAmount;
  transferAmount = transferAmount - merekaFees;

  log.info(
    {
      bookingId: booking._id,
      chargeId,
      chargeCurrency: charge.currency,
      balanceTransactionCurrency: currency,
      balanceTransactionNet: availableAmount,
      refundAmount,
      platformFee: merekaFees,
      transferAmount,
    },
    'Calculated transfer amount from balance transaction',
  );

  if (transferAmount <= 0) {
    log.warn({ bookingId: booking._id, transferAmount }, 'Transfer amount is zero or negative');
    return 'skipped';
  }

  // Create transfer using regional stripe service
  const transfer = await regionalStripeService.createTransfer({
    amount: truncateNumber(transferAmount),
    currency,
    destination: hub.stripeAccountId,
    transferGroup: booking._id.toString(),
    sourceTransaction: chargeId,
    metadata: {
      bookingId: booking._id.toString(),
      hubId: booking.hubId.toString(),
      ownerId: hub.ownerId?.toString() || '',
      serviceType: booking.bookingType,
      stripeRegion: regionalStripeService.region,
    },
  });

  // Create Transaction record for this transfer
  await transactionService.createExpertTransfer({
    sourceId: new mongoose.Types.ObjectId(booking._id),
    sourceModel: SourceModel.BOOKING,
    amount: truncateNumber(transferAmount) / 100, // Convert from cents to dollars
    currency: currency.toUpperCase(),
    hubId: new mongoose.Types.ObjectId(booking.hubId),
    expertId: new mongoose.Types.ObjectId(hub.ownerId),
    stripeTransferId: transfer.id,
    description: `Booking transfer for ${booking.bookingType} service`,
  });

  // Update booking as transferred
  await Booking.updateOne(
    { _id: booking._id },
    {
      $set: {
        transferId: transfer.id,
        transferStatus: 'paid',
        transferredAt: new Date(),
        transferAmount: truncateNumber(transferAmount) / 100,
        platformFee: truncateNumber(merekaFees) / 100,
      },
    },
  );

  log.info(
    {
      bookingId: booking._id,
      transferAmount: truncateNumber(transferAmount),
      merekaFees: truncateNumber(merekaFees),
      stripeAccountId: hub.stripeAccountId,
    },
    'Transfer completed successfully',
  );

  // Notify hub owner about successful transfer (non-blocking)
  void bookingNotificationService.notifyBookingTransferCompleted(booking._id.toString());

  return 'success';
}
