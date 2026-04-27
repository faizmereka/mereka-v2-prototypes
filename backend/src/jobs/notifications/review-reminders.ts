import { Booking, BookingStatus, BookingType, StripePaymentStatus } from '@core/models/Booking';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import type { IJobMetadata, JobContext } from '@jobs/helpers/job-runner';
import { communicationTriggerService } from '@services/communications';

/**
 * Review Reminders Job Handler
 *
 * Sends REVIEW_REMINDER_LEARNER notifications to users who:
 * - Have completed bookings (status = COMPLETED)
 * - Booking completed 3-4 days ago (to allow initial review request time)
 * - Haven't submitted a review yet
 *
 * Note: The initial REVIEW_REQUEST_LEARNER is sent by auto-complete-bookings job
 * This job sends a follow-up reminder 3 days later
 *
 * @runs Daily at 10 AM UTC
 */
export async function reviewRemindersHandler(context: JobContext): Promise<IJobMetadata> {
  const { log } = context;

  log.info('Starting review reminders job');

  try {
    const now = new Date();

    // Only run once per day (between 10-11 AM UTC)
    const currentHour = now.getUTCHours();
    if (currentHour !== 10) {
      log.info({ currentHour }, 'Skipping review reminders - not 10 AM UTC');
      return {
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        skipped: true,
        reason: 'Not scheduled hour',
      };
    }

    // Find bookings completed 3-4 days ago
    // This gives users time after the initial review request
    const minCompletedDate = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000); // 4 days ago
    const maxCompletedDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

    const bookings = await Booking.find({
      status: BookingStatus.COMPLETED,
      stripeStatus: StripePaymentStatus.SUCCEEDED,
      bookingEndDate: { $gte: minCompletedDate, $lt: maxCompletedDate },
      bookedBy: { $exists: true, $ne: null },
    })
      .select('_id bookedBy hubId serviceId bookingType bookingStartDate bookingEndDate')
      .lean();

    log.info({ count: bookings.length }, 'Found bookings for review reminders');

    let sent = 0;
    let failed = 0;

    for (const booking of bookings) {
      try {
        await sendReviewReminder(booking, log);
        sent++;
      } catch (error) {
        log.error({ error, bookingId: booking._id }, 'Failed to send review reminder');
        failed++;
      }
    }

    const metadata: IJobMetadata = {
      recordsProcessed: bookings.length,
      recordsSucceeded: sent,
      recordsFailed: failed,
    };

    log.info(metadata, 'Review reminders job completed');

    return metadata;
  } catch (error) {
    log.error({ error }, 'Error in review reminders job');
    throw error;
  }
}

/**
 * Send review reminder notification to a learner
 */
async function sendReviewReminder(
  booking: {
    _id: unknown;
    bookedBy?: unknown;
    hubId?: unknown;
    serviceId?: unknown;
    bookingType?: string;
    bookingStartDate?: Date;
    bookingEndDate?: Date;
  },
  log: JobContext['log'],
): Promise<void> {
  if (!booking.bookedBy) return;

  const [user, hub, experience, expertise] = await Promise.all([
    User.findById(booking.bookedBy).select('name email phoneNumber').lean(),
    booking.hubId ? Hub.findById(booking.hubId).select('name').lean() : null,
    booking.bookingType === BookingType.EXPERIENCE && booking.serviceId
      ? Experience.findById(booking.serviceId).select('experienceTitle').lean()
      : null,
    booking.bookingType === BookingType.EXPERTISE && booking.serviceId
      ? Expertise.findById(booking.serviceId).select('expertiseTitle').lean()
      : null,
  ]);

  if (!user) {
    log.info({ bookingId: booking._id }, 'User not found, skipping review reminder');
    return;
  }

  const serviceName = experience?.experienceTitle || expertise?.expertiseTitle || 'your session';
  const hubName = hub?.name || 'The host';
  const bookingId = booking._id?.toString();
  const hubIdStr = booking.hubId?.toString();

  await communicationTriggerService.triggerCommunicationWithUser({
    templateId: 'REVIEW_REMINDER_LEARNER',
    user: {
      _id: booking.bookedBy.toString(),
      name: user.name,
      email: user.email,
      phone: user.phoneNumber,
    },
    hubId: hubIdStr,
    data: {
      userName: user.name,
      userEmail: user.email,
      experienceName: serviceName,
      serviceName,
      hubName,
      bookingId,
      reviewUrl: `/reviews/create/${bookingId}`,
      bookingDate: booking.bookingStartDate?.toISOString(),
    },
  });
}
