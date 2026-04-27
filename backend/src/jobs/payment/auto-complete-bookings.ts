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
 * Auto Complete Bookings Job Handler
 *
 * Automatically marks bookings as COMPLETED after the service date passes:
 * - Runs every 6 hours
 * - Finds bookings where:
 *   - status is ACTIVE
 *   - stripeStatus is SUCCEEDED (payment done)
 *   - bookingEndDate has passed
 * - Updates status to COMPLETED
 * - Sends BOOKING_COMPLETED_LEARNER and BOOKING_COMPLETED_EXPERT notifications
 * - Sends REVIEW_REQUEST_LEARNER notification to request feedback
 *
 * This enables:
 * - Accurate dashboard stats (completed bookings count)
 * - Proper booking lifecycle management
 * - Transfer job can still use bookingEndDate for transfers
 *
 * @runs Every 6 hours
 */
export async function autoCompleteBookingsHandler(context: JobContext): Promise<IJobMetadata> {
  const { log } = context;

  log.info('Starting auto-complete bookings job');

  try {
    const now = new Date();
    // Only process bookings from the last 2 months to avoid processing old data
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // First, find all bookings that need to be completed (to send notifications)
    const bookingsToComplete = await Booking.find({
      status: BookingStatus.ACTIVE,
      stripeStatus: StripePaymentStatus.SUCCEEDED,
      bookingEndDate: { $lt: now, $gte: twoMonthsAgo },
    })
      .select(
        '_id bookedBy hubId serviceId bookingType learnerDetail bookingStartDate bookingEndDate',
      )
      .lean();

    if (bookingsToComplete.length === 0) {
      log.info('No bookings to complete');
      return {
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
      };
    }

    // Update all bookings to COMPLETED
    const bookingIds = bookingsToComplete.map((b) => b._id);
    const result = await Booking.updateMany(
      { _id: { $in: bookingIds } },
      { $set: { status: BookingStatus.COMPLETED } },
    );

    log.info({ count: result.modifiedCount }, 'Bookings marked as completed');

    // Send notifications for each completed booking (non-blocking)
    let notificationsFailed = 0;
    for (const booking of bookingsToComplete) {
      try {
        await sendCompletionNotifications(booking, log);
      } catch (error) {
        log.error({ error, bookingId: booking._id }, 'Failed to send completion notification');
        notificationsFailed++;
      }
    }

    const metadata: IJobMetadata = {
      recordsProcessed: result.matchedCount,
      recordsSucceeded: result.modifiedCount,
      recordsFailed: notificationsFailed,
    };

    log.info(metadata, 'Auto-complete bookings job completed');

    return metadata;
  } catch (error) {
    log.error({ error }, 'Error in auto-complete bookings job');
    throw error;
  }
}

/**
 * Send completion notifications to learner and expert/hub owner
 */
async function sendCompletionNotifications(
  booking: {
    _id: unknown;
    bookedBy?: unknown;
    hubId?: unknown;
    serviceId?: unknown;
    bookingType?: string;
    learnerDetail?: Array<{ name: string; email: string }>;
    bookingStartDate?: Date;
    bookingEndDate?: Date;
  },
  log: { error: (obj: unknown, msg: string) => void },
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

  if (!user) return;

  const serviceName = experience?.experienceTitle || expertise?.expertiseTitle || 'your session';
  const hubName = hub?.name || 'The host';
  const bookingId = booking._id?.toString();
  const hubIdStr = booking.hubId?.toString();

  // Get expert name for learner notification
  let expertName = hubName;
  if (hubIdStr) {
    // Find the owner role
    const ownerRole = await Role.findOne({
      key: SystemRoleKey.OWNER,
      scope: RoleScope.SYSTEM,
    }).lean();

    if (ownerRole) {
      const hubOwnerForLearner = await HubMember.findOne({
        hubId: booking.hubId,
        roleIds: ownerRole._id,
        status: HubMemberStatus.ACTIVE,
      })
        .populate<{ userId: { name: string } }>('userId', 'name')
        .lean();

      if (hubOwnerForLearner?.userId && typeof hubOwnerForLearner.userId === 'object') {
        expertName = hubOwnerForLearner.userId.name || hubName;
      }
    }
  }

  // 1. Send BOOKING_COMPLETED_LEARNER notification
  try {
    await communicationTriggerService.triggerCommunicationWithUser({
      templateId: 'BOOKING_COMPLETED_LEARNER',
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
        expertName,
        serviceName,
        hubName,
        bookingId,
        bookingDate: booking.bookingStartDate?.toISOString(),
      },
    });
  } catch (error) {
    log.error({ error, bookingId }, 'Failed to send BOOKING_COMPLETED_LEARNER');
  }

  // 2. Send REVIEW_REQUEST_LEARNER notification (after completion)
  try {
    await communicationTriggerService.triggerCommunicationWithUser({
      templateId: 'REVIEW_REQUEST_LEARNER',
      user: {
        _id: booking.bookedBy.toString(),
        name: user.name,
        email: user.email,
        phone: user.phoneNumber,
      },
      hubId: hubIdStr,
      data: {
        userName: user.name,
        experienceName: serviceName,
        serviceName,
        hubName,
        bookingId,
        reviewUrl: `/reviews/create/${bookingId}`,
      },
    });
  } catch (error) {
    log.error({ error, bookingId }, 'Failed to send REVIEW_REQUEST_LEARNER');
  }

  // 3. Send BOOKING_COMPLETED_EXPERT notification to hub owner
  if (hubIdStr) {
    try {
      // Find the owner role
      const ownerRoleForExpert = await Role.findOne({
        key: SystemRoleKey.OWNER,
        scope: RoleScope.SYSTEM,
      }).lean();

      const hubOwner = ownerRoleForExpert
        ? await HubMember.findOne({
            hubId: booking.hubId,
            roleIds: ownerRoleForExpert._id,
            status: HubMemberStatus.ACTIVE,
          })
            .populate<{
              userId: { _id: unknown; name: string; email: string; phoneNumber?: string };
            }>('userId', 'name email phoneNumber')
            .lean()
        : null;

      if (hubOwner?.userId && typeof hubOwner.userId === 'object') {
        const owner = hubOwner.userId;
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: 'BOOKING_COMPLETED_EXPERT',
          user: {
            _id: owner._id.toString(),
            name: owner.name,
            email: owner.email,
            phone: owner.phoneNumber,
          },
          hubId: hubIdStr,
          data: {
            userName: owner.name,
            learnerName: user.name,
            experienceName: serviceName,
            serviceName,
            hubName,
            bookingId,
            bookingDate: booking.bookingStartDate?.toISOString(),
          },
        });
      }
    } catch (error) {
      log.error({ error, bookingId }, 'Failed to send BOOKING_COMPLETED_EXPERT');
    }
  }
}
