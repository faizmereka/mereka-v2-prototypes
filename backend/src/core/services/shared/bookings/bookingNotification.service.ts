import { Booking } from '@core/models/Booking';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import { communicationTriggerService } from '@services/communications';

/**
 * Booking Notification Template IDs
 * Maps to templates seeded in InAppNotificationTemplate, EmailTemplate, and WhatsAppTemplate
 */
export enum BookingNotificationTemplate {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_PAYMENT_FAILED = 'BOOKING_PAYMENT_FAILED',
  BOOKING_PAYMENT_RECEIVED = 'BOOKING_PAYMENT_RECEIVED',
  BOOKING_TRANSFER_FAILED = 'BOOKING_TRANSFER_FAILED',
  BOOKING_TRANSFER_COMPLETED = 'BOOKING_TRANSFER_COMPLETED',
  BOOKING_REFUND_PROCESSED = 'BOOKING_REFUND_PROCESSED',
  BOOKING_REFUND_FAILED = 'BOOKING_REFUND_FAILED',
}

/**
 * Booking Notification Service
 *
 * Handles multi-channel notifications for booking-related events:
 * - Booking confirmation
 * - Payment success/failure
 * - Transfer to hub success/failure
 * - Refunds
 */
export class BookingNotificationService {
  /**
   * Helper to get user data for communication trigger
   */
  private async getUserData(
    userId: string,
  ): Promise<{ _id: string; name?: string; email?: string; phone?: string } | null> {
    const user = await User.findById(userId).select('name email phoneNumber').lean();
    if (!user) return null;
    return {
      _id: userId,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber,
    };
  }

  /**
   * Notify learner/customer that booking payment failed
   */
  async notifyBookingPaymentFailed(bookingId: string, errorMessage: string): Promise<void> {
    try {
      const booking = await Booking.findById(bookingId).lean();
      if (!booking || !booking.bookedBy) return;

      const learnerUser = await this.getUserData(booking.bookedBy.toString());
      if (!learnerUser) return;

      // Get service name from booking type
      const serviceName = booking.bookingType || 'Service';

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: BookingNotificationTemplate.BOOKING_PAYMENT_FAILED,
        user: learnerUser,
        data: {
          userName: learnerUser.name,
          userEmail: learnerUser.email,
          userPhone: learnerUser.phone,
          serviceName,
          amount: ((booking.totalCost || 0) / 100).toFixed(2),
          currency: booking.currency || '$',
          bookingId: bookingId,
          errorMessage,
          actionRequired: 'Please try again or use a different payment method.',
        },
      });
    } catch (error) {
      console.error('Failed to send booking payment failed notification:', error);
    }
  }

  /**
   * Notify learner that booking payment was successful
   */
  async notifyBookingPaymentReceived(bookingId: string): Promise<void> {
    try {
      const booking = await Booking.findById(bookingId).lean();
      if (!booking || !booking.bookedBy) return;

      const learnerUser = await this.getUserData(booking.bookedBy.toString());
      if (!learnerUser) return;

      const serviceName = booking.bookingType || 'Service';

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: BookingNotificationTemplate.BOOKING_PAYMENT_RECEIVED,
        user: learnerUser,
        data: {
          userName: learnerUser.name,
          userEmail: learnerUser.email,
          userPhone: learnerUser.phone,
          serviceName,
          amount: ((booking.totalCost || 0) / 100).toFixed(2),
          currency: booking.currency || '$',
          bookingId: bookingId,
        },
      });
    } catch (error) {
      console.error('Failed to send booking payment received notification:', error);
    }
  }

  /**
   * Notify hub that transfer to their account failed
   */
  async notifyBookingTransferFailed(bookingId: string, errorMessage: string): Promise<void> {
    try {
      const booking = await Booking.findById(bookingId).lean();
      if (!booking) return;

      // Get hub owner to notify
      const hub = await Hub.findById(booking.hubId).select('ownerId name').lean();
      if (!hub || !hub.ownerId) return;

      const hubOwner = await this.getUserData(hub.ownerId.toString());
      if (!hubOwner) return;

      const serviceName = booking.bookingType || 'Service';

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: BookingNotificationTemplate.BOOKING_TRANSFER_FAILED,
        user: hubOwner,
        hubId: booking.hubId.toString(),
        data: {
          userName: hubOwner.name,
          userEmail: hubOwner.email,
          userPhone: hubOwner.phone,
          hubName: hub.name,
          serviceName,
          amount: (booking.transferAmount || 0).toFixed(2),
          currency: booking.currency || '$',
          bookingId: bookingId,
          errorMessage,
          actionRequired: 'Please ensure your Stripe account is properly set up.',
        },
      });
    } catch (error) {
      console.error('Failed to send booking transfer failed notification:', error);
    }
  }

  /**
   * Notify hub that transfer was completed successfully
   */
  async notifyBookingTransferCompleted(bookingId: string): Promise<void> {
    try {
      const booking = await Booking.findById(bookingId).lean();
      if (!booking) return;

      const hub = await Hub.findById(booking.hubId).select('ownerId name').lean();
      if (!hub || !hub.ownerId) return;

      const hubOwner = await this.getUserData(hub.ownerId.toString());
      if (!hubOwner) return;

      const serviceName = booking.bookingType || 'Service';

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: BookingNotificationTemplate.BOOKING_TRANSFER_COMPLETED,
        user: hubOwner,
        hubId: booking.hubId.toString(),
        data: {
          userName: hubOwner.name,
          userEmail: hubOwner.email,
          userPhone: hubOwner.phone,
          hubName: hub.name,
          serviceName,
          amount: (booking.transferAmount || 0).toFixed(2),
          currency: booking.currency || '$',
          bookingId: bookingId,
        },
      });
    } catch (error) {
      console.error('Failed to send booking transfer completed notification:', error);
    }
  }

  /**
   * Notify learner that refund was processed
   */
  async notifyBookingRefundProcessed(bookingId: string, refundAmount: number): Promise<void> {
    try {
      const booking = await Booking.findById(bookingId).lean();
      if (!booking || !booking.bookedBy) return;

      const learnerUser = await this.getUserData(booking.bookedBy.toString());
      if (!learnerUser) return;

      const serviceName = booking.bookingType || 'Service';

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: BookingNotificationTemplate.BOOKING_REFUND_PROCESSED,
        user: learnerUser,
        data: {
          userName: learnerUser.name,
          userEmail: learnerUser.email,
          userPhone: learnerUser.phone,
          serviceName,
          refundAmount: refundAmount.toFixed(2),
          currency: booking.currency || '$',
          bookingId: bookingId,
        },
      });
    } catch (error) {
      console.error('Failed to send booking refund processed notification:', error);
    }
  }

  /**
   * Notify learner that refund failed
   */
  async notifyBookingRefundFailed(bookingId: string, errorMessage: string): Promise<void> {
    try {
      const booking = await Booking.findById(bookingId).lean();
      if (!booking || !booking.bookedBy) return;

      const learnerUser = await this.getUserData(booking.bookedBy.toString());
      if (!learnerUser) return;

      const serviceName = booking.bookingType || 'Service';

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: BookingNotificationTemplate.BOOKING_REFUND_FAILED,
        user: learnerUser,
        data: {
          userName: learnerUser.name,
          userEmail: learnerUser.email,
          userPhone: learnerUser.phone,
          serviceName,
          amount: ((booking.totalCost || 0) / 100).toFixed(2),
          currency: booking.currency || '$',
          bookingId: bookingId,
          errorMessage,
          actionRequired: 'Please contact support for assistance.',
        },
      });
    } catch (error) {
      console.error('Failed to send booking refund failed notification:', error);
    }
  }
}

export const bookingNotificationService = new BookingNotificationService();
