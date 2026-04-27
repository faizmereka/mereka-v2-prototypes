import { Hub } from '@core/models/Hub';
import { Subscription, SubscriptionStatus } from '@core/models/Subscription';
import { User } from '@core/models/User';
import type { IJobMetadata, JobContext } from '@jobs/helpers/job-runner';
import { communicationTriggerService } from '@services/communications';

/**
 * Subscription Expiring Job Handler
 *
 * Sends SUBSCRIPTION_EXPIRING notifications to users whose subscriptions are:
 * - Active or past_due status
 * - Expiring in 7 days, 3 days, or 1 day
 *
 * Uses time windows to send exactly one notification per reminder period:
 * - 7-day reminder: currentPeriodEnd in 6.5-7.5 days
 * - 3-day reminder: currentPeriodEnd in 2.5-3.5 days
 * - 1-day reminder: currentPeriodEnd in 0.5-1.5 days
 *
 * @runs Daily at 8 AM UTC
 */
export async function subscriptionExpiringHandler(context: JobContext): Promise<IJobMetadata> {
  const { log } = context;

  log.info('Starting subscription expiring job');

  try {
    const now = new Date();

    // Only run once per day (between 8-9 AM UTC)
    const currentHour = now.getUTCHours();
    if (currentHour !== 8) {
      log.info({ currentHour }, 'Skipping subscription expiring - not 8 AM UTC');
      return {
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        skipped: true,
        reason: 'Not scheduled hour',
      };
    }

    let totalSent = 0;
    let totalFailed = 0;

    // 1. Send 7-day reminders
    const sevenDayResult = await sendExpiringReminders(now, 7, log);
    totalSent += sevenDayResult.sent;
    totalFailed += sevenDayResult.failed;

    // 2. Send 3-day reminders
    const threeDayResult = await sendExpiringReminders(now, 3, log);
    totalSent += threeDayResult.sent;
    totalFailed += threeDayResult.failed;

    // 3. Send 1-day reminders
    const oneDayResult = await sendExpiringReminders(now, 1, log);
    totalSent += oneDayResult.sent;
    totalFailed += oneDayResult.failed;

    const metadata: IJobMetadata = {
      recordsProcessed: totalSent + totalFailed,
      recordsSucceeded: totalSent,
      recordsFailed: totalFailed,
      sevenDayReminders: sevenDayResult.sent,
      threeDayReminders: threeDayResult.sent,
      oneDayReminders: oneDayResult.sent,
    };

    log.info(metadata, 'Subscription expiring job completed');

    return metadata;
  } catch (error) {
    log.error({ error }, 'Error in subscription expiring job');
    throw error;
  }
}

/**
 * Send expiring reminders for subscriptions expiring in `daysFromNow` days
 */
async function sendExpiringReminders(
  now: Date,
  daysFromNow: number,
  log: JobContext['log'],
): Promise<{ sent: number; failed: number }> {
  // Calculate time window (±12 hours from target)
  const targetTime = now.getTime() + daysFromNow * 24 * 60 * 60 * 1000;
  const minTime = new Date(targetTime - 12 * 60 * 60 * 1000); // -12 hours
  const maxTime = new Date(targetTime + 12 * 60 * 60 * 1000); // +12 hours

  const subscriptions = await Subscription.find({
    status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
    currentPeriodEnd: { $gte: minTime, $lt: maxTime },
  }).lean();

  log.info({ count: subscriptions.length, daysFromNow }, 'Found subscriptions expiring');

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    try {
      await sendExpiringNotification(subscription, daysFromNow, log);
      sent++;
    } catch (error) {
      log.error(
        { error, subscriptionId: subscription._id, daysFromNow },
        'Failed to send expiring notification',
      );
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send expiring notification to subscription owner
 */
async function sendExpiringNotification(
  subscription: {
    _id: unknown;
    userId: string;
    hubId?: string;
    planCode: string;
    status: string;
    currentPeriodEnd: Date;
    price: number;
    currency: string;
  },
  daysRemaining: number,
  log: JobContext['log'],
): Promise<void> {
  const [user, hub] = await Promise.all([
    User.findById(subscription.userId).select('name email phoneNumber').lean(),
    subscription.hubId ? Hub.findById(subscription.hubId).select('name').lean() : null,
  ]);

  if (!user) {
    log.info({ subscriptionId: subscription._id }, 'User not found, skipping notification');
    return;
  }

  const planName = subscription.planCode === 'soar' ? 'Soar' : 'Scale';
  const hubName = hub?.name || 'your hub';
  const expiryDate = subscription.currentPeriodEnd.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format price (convert from cents to dollars)
  const priceFormatted = `${subscription.currency} ${(subscription.price / 100).toFixed(2)}`;

  await communicationTriggerService.triggerCommunicationWithUser({
    templateId: 'SUBSCRIPTION_EXPIRING',
    user: {
      _id: subscription.userId,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber,
    },
    hubId: subscription.hubId,
    data: {
      userName: user.name,
      userEmail: user.email,
      hubName,
      planName,
      planCode: subscription.planCode,
      daysRemaining,
      expiryDate,
      price: priceFormatted,
      renewUrl: '/hub/settings/subscription',
      subscriptionId: subscription._id?.toString(),
    },
  });
}
