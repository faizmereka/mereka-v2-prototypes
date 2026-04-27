import { Booking, BookingStatus, BookingType, StripePaymentStatus } from '@core/models/Booking';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { Role, RoleScope, SystemRoleKey } from '@core/models/Role';
import { User } from '@core/models/User';
import type { IJobMetadata, JobContext } from '@jobs/helpers/job-runner';
import { communicationTriggerService } from '@services/communications';

/**
 * Booking Reminders Job Handler
 *
 * Sends reminder notifications for upcoming bookings:
 * - BOOKING_REMINDER_1_DAY: Sent ~24 hours before booking
 * - BOOKING_REMINDER_1_HOUR: Sent ~1 hour before booking
 * - BOOKING_REMINDER_HOST: Sent to hosts for their upcoming bookings
 *
 * Uses time windows to avoid duplicate notifications:
 * - 1-day reminder: bookings starting in 23-25 hours
 * - 1-hour reminder: bookings starting in 50-70 minutes
 *
 * @runs Every hour
 */
export async function bookingRemindersHandler(context: JobContext): Promise<IJobMetadata> {
  const { log } = context;

  log.info('Starting booking reminders job');

  try {
    const now = new Date();
    let totalSent = 0;
    let totalFailed = 0;

    // 1. Send 1-day reminders (23-25 hours from now)
    const oneDayResult = await sendOneDayReminders(now, log);
    totalSent += oneDayResult.sent;
    totalFailed += oneDayResult.failed;

    // 2. Send 1-hour reminders (50-70 minutes from now)
    const oneHourResult = await sendOneHourReminders(now, log);
    totalSent += oneHourResult.sent;
    totalFailed += oneHourResult.failed;

    // 3. Send host reminders (for bookings in next 24 hours, once per day)
    const hostResult = await sendHostReminders(now, log);
    totalSent += hostResult.sent;
    totalFailed += hostResult.failed;

    const metadata: IJobMetadata = {
      recordsProcessed: totalSent + totalFailed,
      recordsSucceeded: totalSent,
      recordsFailed: totalFailed,
      oneDayReminders: oneDayResult.sent,
      oneHourReminders: oneHourResult.sent,
      hostReminders: hostResult.sent,
    };

    log.info(metadata, 'Booking reminders job completed');

    return metadata;
  } catch (error) {
    log.error({ error }, 'Error in booking reminders job');
    throw error;
  }
}

/**
 * Send 1-day reminders for bookings starting in 23-25 hours
 */
async function sendOneDayReminders(
  now: Date,
  log: JobContext['log'],
): Promise<{ sent: number; failed: number }> {
  const minTime = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now
  const maxTime = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hours from now

  const bookings = await Booking.find({
    status: BookingStatus.ACTIVE,
    stripeStatus: StripePaymentStatus.SUCCEEDED,
    bookingStartDate: { $gte: minTime, $lt: maxTime },
  })
    .select(
      '_id bookedBy hubId serviceId bookingType bookingStartDate bookingEndDate learnerDetail',
    )
    .lean();

  log.info({ count: bookings.length }, 'Found bookings for 1-day reminder');

  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      await sendReminderToLearner(booking, 'BOOKING_REMINDER_1_DAY', log);
      sent++;
    } catch (error) {
      log.error({ error, bookingId: booking._id }, 'Failed to send 1-day reminder');
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send 1-hour reminders for bookings starting in 50-70 minutes
 */
async function sendOneHourReminders(
  now: Date,
  log: JobContext['log'],
): Promise<{ sent: number; failed: number }> {
  const minTime = new Date(now.getTime() + 50 * 60 * 1000); // 50 minutes from now
  const maxTime = new Date(now.getTime() + 70 * 60 * 1000); // 70 minutes from now

  const bookings = await Booking.find({
    status: BookingStatus.ACTIVE,
    stripeStatus: StripePaymentStatus.SUCCEEDED,
    bookingStartDate: { $gte: minTime, $lt: maxTime },
  })
    .select(
      '_id bookedBy hubId serviceId bookingType bookingStartDate bookingEndDate learnerDetail',
    )
    .lean();

  log.info({ count: bookings.length }, 'Found bookings for 1-hour reminder');

  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      await sendReminderToLearner(booking, 'BOOKING_REMINDER_1_HOUR', log);
      sent++;
    } catch (error) {
      log.error({ error, bookingId: booking._id }, 'Failed to send 1-hour reminder');
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send host reminders for bookings in the next 24 hours
 * Groups bookings by hub and sends one notification per hub owner
 */
async function sendHostReminders(
  now: Date,
  log: JobContext['log'],
): Promise<{ sent: number; failed: number }> {
  // Only run host reminders once per day (between 8-9 AM UTC)
  const currentHour = now.getUTCHours();
  if (currentHour !== 8) {
    log.info({ currentHour }, 'Skipping host reminders - not 8 AM UTC');
    return { sent: 0, failed: 0 };
  }

  const minTime = now;
  const maxTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours

  const bookings = await Booking.find({
    status: BookingStatus.ACTIVE,
    stripeStatus: StripePaymentStatus.SUCCEEDED,
    bookingStartDate: { $gte: minTime, $lt: maxTime },
  })
    .select('_id hubId serviceId bookingType bookingStartDate learnerDetail')
    .lean();

  log.info({ count: bookings.length }, 'Found bookings for host reminders');

  // Group bookings by hubId
  const bookingsByHub = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const hubId = booking.hubId?.toString();
    if (!hubId) continue;

    if (!bookingsByHub.has(hubId)) {
      bookingsByHub.set(hubId, []);
    }
    bookingsByHub.get(hubId)?.push(booking);
  }

  let sent = 0;
  let failed = 0;

  // Find the owner role once for all hubs
  const ownerRole = await Role.findOne({
    key: SystemRoleKey.OWNER,
    scope: RoleScope.SYSTEM,
  }).lean();

  if (!ownerRole) {
    log.error('Owner role not found in database');
    return { sent: 0, failed: 0 };
  }

  for (const [hubId, hubBookings] of bookingsByHub) {
    try {
      // Get hub and owner
      const [hub, hubOwner] = await Promise.all([
        Hub.findById(hubId).select('name').lean(),
        HubMember.findOne({
          hubId,
          roleIds: ownerRole._id,
          status: HubMemberStatus.ACTIVE,
        })
          .populate<{
            userId: { _id: unknown; name: string; email: string; phoneNumber?: string };
          }>('userId', 'name email phoneNumber')
          .lean(),
      ]);

      if (!hubOwner?.userId || typeof hubOwner.userId !== 'object') {
        continue;
      }

      const owner = hubOwner.userId;
      const bookingCount = hubBookings.length;
      const firstBooking = hubBookings[0];

      // Get details from the first booking for the notification
      let experienceName = 'your session';
      let learnerName = 'a learner';

      if (firstBooking) {
        // Get service name
        if (firstBooking.bookingType === BookingType.EXPERIENCE && firstBooking.serviceId) {
          const experience = await Experience.findById(firstBooking.serviceId)
            .select('experienceTitle')
            .lean();
          experienceName = experience?.experienceTitle || 'your session';
        } else if (firstBooking.bookingType === BookingType.EXPERTISE && firstBooking.serviceId) {
          const expertise = await Expertise.findById(firstBooking.serviceId)
            .select('expertiseTitle')
            .lean();
          experienceName = expertise?.expertiseTitle || 'your session';
        }

        // Get learner name
        if (firstBooking.learnerDetail?.[0]?.name) {
          learnerName = firstBooking.learnerDetail[0].name;
        }
      }

      // Calculate reminder time for first booking
      const reminderTime = firstBooking?.bookingStartDate
        ? `${Math.round((firstBooking.bookingStartDate.getTime() - now.getTime()) / (1000 * 60 * 60))} hours`
        : 'soon';

      // Send summary notification to host
      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'BOOKING_REMINDER_HOST',
        user: {
          _id: owner._id.toString(),
          name: owner.name,
          email: owner.email,
          phone: owner.phoneNumber,
        },
        hubId,
        data: {
          userName: owner.name,
          hubName: hub?.name || 'Your hub',
          experienceName,
          learnerName,
          reminderTime,
          bookingCount,
          bookingsToday: bookingCount,
          dashboardUrl: '/hub/bookings',
        },
      });

      sent++;
    } catch (error) {
      log.error({ error, hubId }, 'Failed to send host reminder');
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send reminder notification to a learner
 */
async function sendReminderToLearner(
  booking: {
    _id: unknown;
    bookedBy?: unknown;
    hubId?: unknown;
    serviceId?: unknown;
    bookingType?: string;
    bookingStartDate?: Date;
    bookingEndDate?: Date;
    learnerDetail?: Array<{ name: string; email: string }>;
  },
  templateId: string,
  _log: JobContext['log'],
): Promise<void> {
  if (!booking.bookedBy) return;

  const [user, hub, experience, expertise] = await Promise.all([
    User.findById(booking.bookedBy).select('name email phoneNumber').lean(),
    booking.hubId ? Hub.findById(booking.hubId).select('name location').lean() : null,
    booking.bookingType === BookingType.EXPERIENCE && booking.serviceId
      ? Experience.findById(booking.serviceId).select('experienceTitle location meetingLink').lean()
      : null,
    booking.bookingType === BookingType.EXPERTISE && booking.serviceId
      ? Expertise.findById(booking.serviceId).select('expertiseTitle').lean()
      : null,
  ]);

  if (!user) return;

  const serviceName = experience?.experienceTitle || expertise?.expertiseTitle || 'your session';
  const hubName = hub?.name || 'The host';
  const bookingId = booking._id?.toString();
  const hubIdStr = booking.hubId?.toString();

  // Format booking time
  const bookingTime = booking.bookingStartDate
    ? booking.bookingStartDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'your scheduled time';

  // Get location or meeting link
  const location = experience?.location?.address || hub?.location?.address || '';
  const meetingLink = experience?.meetingLink || '';

  await communicationTriggerService.triggerCommunicationWithUser({
    templateId,
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
      bookingTime,
      bookingDate: booking.bookingStartDate?.toISOString(),
      location,
      meetingLink,
      bookingDetailsUrl: `/bookings/${bookingId}`,
    },
  });
}
