import {
  Booking,
  BookingStatus,
  BookingType,
  type IBooking,
  StripePaymentStatus,
} from '@core/models/Booking';
import { ChatEventType } from '@core/models/ChatMessage';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { Role, RoleScope, SystemRoleKey } from '@core/models/Role';
import {
  SourceModel,
  Transaction,
  TransactionDirection,
  TransactionType,
} from '@core/models/Transaction';
import { User } from '@core/models/User';
import { chatEventService, conversationTriggerService } from '@core/services/shared/chat';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import { communicationTriggerService } from '@services/communications';
import mongoose from 'mongoose';

/**
 * Create booking input interface
 */
export interface CreateBookingInput {
  bookingType: BookingType;
  serviceId: string;
  hubId: string;
  bookedBy?: string;
  eventId?: string;
  scheduleId?: string;
  bookingStartDate: Date;
  bookingEndDate: Date;
  timeZone?: string;
  learnerDetail: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string;
    ticketId?: string;
    ticketName?: string;
    ticketType?: string;
    isBooker?: boolean;
  }>;
  selectedTickets: Array<{
    id: string;
    numberOfSelectedTickets: number;
    standardRate: number;
    ticketName: string;
    ticketType?: string;
    ticketPeriod?: string;
    sessionDuration?: string;
    expertiseMode?: string;
  }>;
  totalCost: number;
  currency?: string;
  discountAmount?: number;
  platformFeeRate?: number;
  stripeFeePayBy?: 'hub' | 'learner';
  isFree?: boolean;
  promotionCode?: string;
  phoneNumber?: string;
  questionnaireFormData?: unknown[];
  // UTM tracking
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  utm_id?: string;
}

/**
 * List bookings params
 */
export interface ListBookingsParams {
  hubId?: string;
  bookedBy?: string;
  bookingType?: BookingType;
  status?: BookingStatus;
  stripeStatus?: StripePaymentStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Booking Service - Handles consumer bookings for Experience/Expertise/Space
 */
export class BookingService {
  /**
   * Create a new booking
   */
  async create(input: CreateBookingInput): Promise<IBooking> {
    const booking = new Booking({
      bookingType: input.bookingType,
      serviceId: new mongoose.Types.ObjectId(input.serviceId),
      hubId: new mongoose.Types.ObjectId(input.hubId),
      bookedBy: input.bookedBy ? new mongoose.Types.ObjectId(input.bookedBy) : undefined,
      eventId: input.eventId ? new mongoose.Types.ObjectId(input.eventId) : undefined,
      scheduleId: input.scheduleId,
      bookingStartDate: input.bookingStartDate,
      bookingEndDate: input.bookingEndDate,
      timeZone: input.timeZone || 'Asia/Kuala_Lumpur',
      learnerDetail: input.learnerDetail,
      selectedTickets: input.selectedTickets,
      totalCost: input.totalCost,
      currency: input.currency || 'MYR',
      discountAmount: input.discountAmount || 0,
      platformFeeRate: input.platformFeeRate ?? 0.15,
      stripeFeePayBy: input.stripeFeePayBy,
      isFree: input.isFree || input.totalCost === 0,
      promotionCode: input.promotionCode,
      isCouponUsed: !!input.promotionCode,
      phoneNumber: input.phoneNumber,
      questionnaireFormData: input.questionnaireFormData,
      utm_medium: input.utm_medium,
      utm_campaign: input.utm_campaign,
      utm_term: input.utm_term,
      utm_content: input.utm_content,
      utm_id: input.utm_id,
      status: BookingStatus.PENDING,
      stripeStatus: StripePaymentStatus.PENDING,
    });

    await booking.save();

    // @spec: messaging-conversation-triggers_spec.md
    // @covers AC-CT-001, AC-CT-003, AC-CT-004, AC-CT-005, AC-CT-006
    // Create chat room for booking (non-blocking)
    void this.createBookingChatRoom(booking);

    return booking;
  }

  /**
   * Create chat room for a booking
   * @covers AC-CT-001, AC-CT-005
   */
  private async createBookingChatRoom(booking: IBooking): Promise<void> {
    try {
      if (!booking.bookedBy || !booking.hubId) return;

      // Get service name
      let serviceName = 'Booking';
      if (booking.bookingType === BookingType.EXPERIENCE && booking.serviceId) {
        const experience = await Experience.findById(booking.serviceId)
          .select('experienceTitle')
          .lean();
        serviceName = experience?.experienceTitle || 'Experience Booking';
      } else if (booking.bookingType === BookingType.EXPERTISE && booking.serviceId) {
        const expertise = await Expertise.findById(booking.serviceId)
          .select('expertiseTitle')
          .lean();
        serviceName = expertise?.expertiseTitle || 'Expertise Booking';
      }

      await conversationTriggerService.createBookingRoom({
        bookingId: booking._id as mongoose.Types.ObjectId,
        hubId: booking.hubId,
        learnerId: booking.bookedBy,
        serviceId: booking.serviceId,
        serviceType: booking.bookingType === BookingType.EXPERIENCE ? 'experience' : 'expertise',
        serviceName,
        bookingDate: booking.bookingStartDate,
      });
    } catch (error) {
      // Log but don't fail the booking
      console.error('Failed to create chat room for booking:', error);
    }
  }

  /**
   * Get booking by ID
   */
  async getById(id: string): Promise<IBooking | null> {
    const booking = await Booking.findById(id)
      .populate('hubId', 'name slug logo')
      .populate('bookedBy', 'name email profilePhoto')
      .populate('eventId', 'name startDate endDate')
      .lean();
    return booking as unknown as IBooking | null;
  }

  /**
   * List bookings with filters
   */
  async list(params: ListBookingsParams): Promise<{
    bookings: IBooking[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      hubId,
      bookedBy,
      bookingType,
      status,
      stripeStatus,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const filter: Record<string, unknown> = {};

    if (hubId) filter.hubId = new mongoose.Types.ObjectId(hubId);
    if (bookedBy) filter.bookedBy = new mongoose.Types.ObjectId(bookedBy);
    if (bookingType) filter.bookingType = bookingType;
    if (status) filter.status = status;
    if (stripeStatus) filter.stripeStatus = stripeStatus;

    if (startDate || endDate) {
      filter.bookingStartDate = {};
      if (startDate) (filter.bookingStartDate as Record<string, unknown>).$gte = startDate;
      if (endDate) (filter.bookingStartDate as Record<string, unknown>).$lte = endDate;
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [bookingsResult, total] = await Promise.all([
      Booking.find(filter)
        .populate('hubId', 'name slug logo')
        .populate('bookedBy', 'name email profilePhoto')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return {
      bookings: bookingsResult as unknown as IBooking[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update booking status
   */
  async updateStatus(
    id: string,
    status: BookingStatus,
    options?: {
      cancelledBy?: string;
      cancellationReason?: string;
    },
  ): Promise<IBooking | null> {
    const update: Record<string, unknown> = { status };

    if (status === BookingStatus.CANCELLED) {
      update.cancelledDate = new Date();
      if (options?.cancelledBy) {
        update.cancelledBy = new mongoose.Types.ObjectId(options.cancelledBy);
      }
      if (options?.cancellationReason) {
        update.cancellationReason = options.cancellationReason;
      }
    }

    const booking = await Booking.findByIdAndUpdate(id, update, { new: true });

    // @spec: messaging-events_spec.md
    // @covers AC-EV-001, AC-EV-002, AC-EV-003, AC-EV-004, AC-EV-005, AC-EV-006
    // Create booking status change event (non-blocking)
    if (booking) {
      void this.createBookingStatusEvent(booking, status);
    }

    return booking;
  }

  /**
   * Create event message for booking status change
   * @covers AC-EV-001 through AC-EV-006
   */
  private async createBookingStatusEvent(booking: IBooking, status: BookingStatus): Promise<void> {
    try {
      // Map status to event type
      const eventTypeMap: Record<string, ChatEventType> = {
        [BookingStatus.PENDING]: ChatEventType.BOOKING_REQUESTED,
        [BookingStatus.ACTIVE]: ChatEventType.BOOKING_CONFIRMED,
        [BookingStatus.CANCELLED]: ChatEventType.BOOKING_CANCELLED,
        [BookingStatus.COMPLETED]: ChatEventType.BOOKING_COMPLETED,
      };

      const eventType = eventTypeMap[status];
      if (!eventType) return;

      // Get service name for summary
      let serviceName = 'booking';
      if (booking.bookingType === BookingType.EXPERIENCE && booking.serviceId) {
        const experience = await Experience.findById(booking.serviceId)
          .select('experienceTitle')
          .lean();
        serviceName = experience?.experienceTitle || 'experience';
      } else if (booking.bookingType === BookingType.EXPERTISE && booking.serviceId) {
        const expertise = await Expertise.findById(booking.serviceId)
          .select('expertiseTitle')
          .lean();
        serviceName = expertise?.expertiseTitle || 'expertise';
      }

      // Build summary
      const dateStr = booking.bookingStartDate
        ? booking.bookingStartDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
        : '';

      const summaryMap: Record<string, string> = {
        [BookingStatus.PENDING]: `Booking requested for ${serviceName}`,
        [BookingStatus.ACTIVE]: `Booking confirmed for ${dateStr}`,
        [BookingStatus.CANCELLED]: 'Booking cancelled',
        [BookingStatus.COMPLETED]: 'Booking completed',
      };

      await chatEventService.createBookingEvent({
        bookingId: booking._id as mongoose.Types.ObjectId,
        hubId: booking.hubId,
        learnerId: booking.bookedBy || new mongoose.Types.ObjectId(),
        expertiseId: booking.serviceId,
        eventType,
        summary: summaryMap[status] || `Booking ${status.toLowerCase()}`,
        data: {
          bookingId: (booking._id as mongoose.Types.ObjectId).toString(),
          expertiseId: booking.serviceId?.toString(),
          date: booking.bookingStartDate?.toISOString(),
          status,
        },
      });
    } catch (error) {
      console.error('Failed to create booking status event:', error);
    }
  }

  /**
   * Update Stripe payment status
   */
  async updateStripeStatus(
    id: string,
    stripeStatus: StripePaymentStatus,
    stripeData?: {
      stripePaymentIntentId?: string;
      stripeChargeId?: string;
      stripeResponse?: Record<string, unknown>;
    },
  ): Promise<IBooking | null> {
    const update: Record<string, unknown> = { stripeStatus };

    if (stripeData?.stripePaymentIntentId) {
      update.stripePaymentIntentId = stripeData.stripePaymentIntentId;
    }
    if (stripeData?.stripeChargeId) {
      update.stripeChargeId = stripeData.stripeChargeId;
    }
    if (stripeData?.stripeResponse) {
      update.stripeResponse = stripeData.stripeResponse;
    }

    // If payment succeeded, update booking status to active
    if (stripeStatus === StripePaymentStatus.SUCCEEDED) {
      update.status = BookingStatus.ACTIVE;
    }

    return Booking.findByIdAndUpdate(id, update, { new: true });
  }

  /**
   * Process payment for booking
   * Uses hub's regional Stripe platform (Malaysia or Atlas)
   */
  async processPayment(
    bookingId: string,
    paymentData: {
      customerId: string;
      paymentMethodId: string;
      expertId?: string;
    },
  ): Promise<{ booking: IBooking; transaction: InstanceType<typeof Transaction> }> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Get hub for regional Stripe service
    const hub = await Hub.findById(booking.hubId).select('stripeRegion location').lean();
    const regionalStripeService = hub
      ? StripeServiceFactory.getServiceForHub(hub)
      : StripeServiceFactory.getService('atlas');

    if (booking.isFree) {
      // Free booking - just update status
      booking.status = BookingStatus.ACTIVE;
      booking.stripeStatus = StripePaymentStatus.SUCCEEDED;
      await booking.save();

      // Create transaction record
      const transaction = await Transaction.create({
        type: TransactionType.BOOKING_PAYMENT,
        direction: TransactionDirection.INBOUND,
        sourceModel: SourceModel.BOOKING,
        sourceId: booking._id,
        amount: 0,
        currency: booking.currency,
        platformFee: 0,
        platformFeeRate: 0,
        stripeFee: 0,
        transferAmount: 0,
        fromUserId: booking.bookedBy,
        toUserId: paymentData.expertId
          ? new mongoose.Types.ObjectId(paymentData.expertId)
          : undefined,
        hubId: booking.hubId,
        serviceType: booking.bookingType,
        serviceId: booking.serviceId,
        status: 'succeeded',
        description: `Free booking for ${booking.bookingType}`,
      });

      booking.transactionId = transaction._id as mongoose.Types.ObjectId;
      await booking.save();

      // Send booking confirmation notifications for free bookings (non-blocking)
      void this.sendBookingConfirmationNotifications(booking);

      return { booking, transaction };
    }

    // Create Stripe PaymentIntent on hub's regional platform
    const bookingIdStr = (booking._id as mongoose.Types.ObjectId).toString();
    const paymentIntent = await regionalStripeService.createPaymentIntent({
      amount: Math.round(booking.totalCost * 100), // Convert to cents
      currency: booking.currency,
      customerId: paymentData.customerId,
      paymentMethodId: paymentData.paymentMethodId,
      description: `Booking: ${booking.bookingType} - ${bookingIdStr}`,
      metadata: {
        bookingId: bookingIdStr,
        bookingType: booking.bookingType,
        hubId: booking.hubId.toString(),
        stripeRegion: regionalStripeService.region,
      },
    });

    // Update booking with payment info
    booking.stripePaymentIntentId = paymentIntent.id;
    booking.stripeStatus =
      paymentIntent.status === 'succeeded'
        ? StripePaymentStatus.SUCCEEDED
        : (paymentIntent.status as StripePaymentStatus);

    if (paymentIntent.status === 'succeeded') {
      booking.status = BookingStatus.ACTIVE;
    }

    await booking.save();

    // Create transaction record
    const transaction = await Transaction.create({
      type: TransactionType.BOOKING_PAYMENT,
      direction: TransactionDirection.INBOUND,
      sourceModel: SourceModel.BOOKING,
      sourceId: booking._id,
      amount: booking.totalCost,
      currency: booking.currency,
      platformFee: booking.platformFee,
      platformFeeRate: booking.platformFeeRate,
      stripeFee: booking.stripeFee,
      transferAmount: booking.transferAmount,
      fromUserId: booking.bookedBy,
      toUserId: paymentData.expertId
        ? new mongoose.Types.ObjectId(paymentData.expertId)
        : undefined,
      hubId: booking.hubId,
      serviceType: booking.bookingType,
      serviceId: booking.serviceId,
      stripePaymentIntentId: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'processing',
      stripeStatus: paymentIntent.status,
      description: `Payment for ${booking.bookingType} booking`,
    });

    booking.transactionId = transaction._id as mongoose.Types.ObjectId;
    await booking.save();

    // Send booking confirmation notifications (non-blocking)
    if (booking.status === BookingStatus.ACTIVE) {
      void this.sendBookingConfirmationNotifications(booking);
    }

    return { booking, transaction };
  }

  /**
   * Send booking confirmation notifications to learner and expert
   * Public method to allow calling from checkout service
   */
  async sendBookingConfirmationNotifications(booking: IBooking): Promise<void> {
    try {
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

      const serviceName =
        experience?.experienceTitle || expertise?.expertiseTitle || 'your session';
      const hubName = hub?.name || 'The host';
      const bookingId = (booking._id as mongoose.Types.ObjectId).toString();
      const hubIdStr = booking.hubId?.toString();

      // Format booking date and time for notifications
      const bookingDate = booking.bookingStartDate
        ? booking.bookingStartDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '';
      const bookingTime = booking.bookingStartDate
        ? booking.bookingStartDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

      // Get expert name for learner notification
      let expertName = hubName;
      if (hubIdStr) {
        // Find the owner role first
        const ownerRole = await Role.findOne({
          key: SystemRoleKey.OWNER,
          scope: RoleScope.SYSTEM,
        }).lean();

        if (ownerRole) {
          const hubOwner = await HubMember.findOne({
            hubId: booking.hubId,
            roleIds: ownerRole._id,
            status: HubMemberStatus.ACTIVE,
          })
            .populate<{
              userId: { _id: unknown; name: string; email: string; phoneNumber?: string };
            }>('userId', 'name email phoneNumber')
            .lean();

          if (hubOwner?.userId && typeof hubOwner.userId === 'object') {
            expertName = hubOwner.userId.name || hubName;
          }
        }
      }

      // 1. Send BOOKING_CONFIRMED_LEARNER notification (user-scoped, no hubId)
      // Note: Not passing hubId so notification appears in user's personal notifications
      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'BOOKING_CONFIRMED_LEARNER',
        user: {
          _id: booking.bookedBy.toString(),
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        },
        // hubId intentionally omitted for user-scoped notifications
        data: {
          userName: user.name,
          userEmail: user.email,
          experienceName: serviceName,
          serviceName,
          hubName,
          expertName,
          bookingId,
          bookingDate,
          bookingTime,
          bookingEndDate: booking.bookingEndDate?.toISOString(),
          totalCost: booking.totalCost,
          currency: booking.currency,
        },
      });

      // 2. Send BOOKING_CONFIRMED_EXPERT notification to hub owner
      if (hubIdStr) {
        // Find the owner role
        const ownerRoleForExpert = await Role.findOne({
          key: SystemRoleKey.OWNER,
          scope: RoleScope.SYSTEM,
        }).lean();

        if (ownerRoleForExpert) {
          const hubOwnerForExpert = await HubMember.findOne({
            hubId: booking.hubId,
            roleIds: ownerRoleForExpert._id,
            status: HubMemberStatus.ACTIVE,
          })
            .populate<{
              userId: { _id: unknown; name: string; email: string; phoneNumber?: string };
            }>('userId', 'name email phoneNumber')
            .lean();

          if (hubOwnerForExpert?.userId && typeof hubOwnerForExpert.userId === 'object') {
            const owner = hubOwnerForExpert.userId;
            await communicationTriggerService.triggerCommunicationWithUser({
              templateId: 'BOOKING_CONFIRMED_EXPERT',
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
                learnerEmail: user.email,
                experienceName: serviceName,
                serviceName,
                hubName,
                bookingId,
                bookingDate,
                bookingTime,
                bookingEndDate: booking.bookingEndDate?.toISOString(),
                totalCost: booking.totalCost,
                currency: booking.currency,
              },
            });
          }
        }
      }
    } catch (error) {
      // Log error but don't throw - notifications shouldn't block booking flow
      console.error('Failed to send booking confirmation notifications:', error);
    }
  }

  /**
   * Complete booking (after service is delivered)
   */
  async complete(bookingId: string): Promise<IBooking | null> {
    return Booking.findByIdAndUpdate(
      bookingId,
      {
        status: BookingStatus.COMPLETED,
      },
      { new: true },
    );
  }

  /**
   * Transfer payment to expert
   * Uses hub's regional Stripe platform (same as where payment was made)
   */
  async transferToExpert(
    bookingId: string,
    expertStripeAccountId: string,
  ): Promise<IBooking | null> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new Error('Booking must be completed before transfer');
    }

    if (booking.transferStatus === 'paid') {
      throw new Error('Transfer already completed');
    }

    if (booking.transferAmount <= 0) {
      // Nothing to transfer
      booking.transferStatus = 'paid';
      booking.transferredAt = new Date();
      await booking.save();
      return booking;
    }

    // Get hub for regional Stripe service (transfer must be on same platform as payment)
    const hub = await Hub.findById(booking.hubId).select('stripeRegion location').lean();
    const regionalStripeService = hub
      ? StripeServiceFactory.getServiceForHub(hub)
      : StripeServiceFactory.getService('atlas');

    // Create Stripe transfer on hub's regional platform
    const transferBookingId = (booking._id as mongoose.Types.ObjectId).toString();
    const transfer = await regionalStripeService.createTransfer({
      amount: Math.round(booking.transferAmount * 100), // Convert to cents
      currency: booking.currency,
      destination: expertStripeAccountId,
      transferGroup: `booking_${transferBookingId}`,
      sourceTransaction: booking.stripeChargeId,
      metadata: {
        bookingId: transferBookingId,
        bookingType: booking.bookingType,
        stripeRegion: regionalStripeService.region,
      },
    });

    // Update booking
    booking.transferId = transfer.id;
    booking.transferStatus = 'paid';
    booking.transferredAt = new Date();
    await booking.save();

    // Create transfer transaction record
    await Transaction.create({
      type: TransactionType.EXPERT_TRANSFER,
      direction: TransactionDirection.INTERNAL,
      sourceModel: SourceModel.BOOKING,
      sourceId: booking._id,
      amount: booking.transferAmount,
      currency: booking.currency,
      platformFee: 0,
      platformFeeRate: 0,
      stripeFee: 0,
      transferAmount: booking.transferAmount,
      hubId: booking.hubId,
      serviceType: booking.bookingType,
      serviceId: booking.serviceId,
      stripeTransferId: transfer.id,
      status: 'succeeded',
      transferredAt: new Date(),
      transferMethod: 'stripe_connect',
      description: `Transfer to expert for ${booking.bookingType} booking`,
    });

    return booking;
  }

  /**
   * Refund booking
   * Uses hub's regional Stripe platform (same as where payment was made)
   */
  async refund(
    bookingId: string,
    options?: {
      amount?: number;
      reason?: string;
      refundedBy?: string;
    },
  ): Promise<IBooking | null> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (!booking.stripePaymentIntentId) {
      throw new Error('No payment to refund');
    }

    // Get hub for regional Stripe service (refund must be on same platform as payment)
    const hub = await Hub.findById(booking.hubId).select('stripeRegion location').lean();
    const regionalStripeService = hub
      ? StripeServiceFactory.getServiceForHub(hub)
      : StripeServiceFactory.getService('atlas');

    // Process refund through regional Stripe service
    const refund = await regionalStripeService.refundPaymentIntent(
      booking.stripePaymentIntentId,
      options?.amount ? Math.round(options.amount * 100) : undefined,
    );

    const refundAmount = refund.amount / 100;

    // Update booking
    booking.isRefunded = true;
    booking.refundAmount = (booking.refundAmount || 0) + refundAmount;
    booking.refundResponse = refund as unknown as Record<string, unknown>;
    booking.status = BookingStatus.CANCELLED;
    await booking.save();

    // Create refund transaction record
    await Transaction.create({
      type: TransactionType.REFUND,
      direction: TransactionDirection.OUTBOUND,
      sourceModel: SourceModel.BOOKING,
      sourceId: booking._id,
      amount: refundAmount,
      currency: booking.currency,
      platformFee: 0,
      platformFeeRate: 0,
      stripeFee: 0,
      transferAmount: 0,
      fromUserId: booking.bookedBy,
      hubId: booking.hubId,
      serviceType: booking.bookingType,
      serviceId: booking.serviceId,
      stripeRefundId: refund.id,
      status: 'succeeded',
      refundedAt: new Date(),
      refundReason: options?.reason,
      refundedBy: options?.refundedBy ? new mongoose.Types.ObjectId(options.refundedBy) : undefined,
      description: `Refund for ${booking.bookingType} booking`,
    });

    // Send refund notification to the learner (non-blocking)
    void this.sendRefundNotification(booking, refundAmount, options?.reason);

    return booking;
  }

  /**
   * Get bookings pending transfer
   */
  async getPendingTransfers(): Promise<IBooking[]> {
    const bookings = await Booking.find({
      status: BookingStatus.COMPLETED,
      stripeStatus: StripePaymentStatus.SUCCEEDED,
      transferStatus: { $ne: 'paid' },
      transferAmount: { $gt: 0 },
    })
      .populate('hubId', 'name slug')
      .sort({ bookingEndDate: 1 })
      .lean();
    return bookings as unknown as IBooking[];
  }

  /**
   * Get booking statistics by hub
   */
  async getStatsByHub(
    hubId: string,
    options?: { startDate?: Date; endDate?: Date },
  ): Promise<{
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    totalPlatformFees: number;
    byType: Array<{ type: string; count: number; revenue: number }>;
  }> {
    const matchQuery: Record<string, unknown> = {
      hubId: new mongoose.Types.ObjectId(hubId),
    };

    if (options?.startDate || options?.endDate) {
      matchQuery.createdAt = {};
      if (options?.startDate)
        (matchQuery.createdAt as Record<string, unknown>).$gte = options.startDate;
      if (options?.endDate)
        (matchQuery.createdAt as Record<string, unknown>).$lte = options.endDate;
    }

    const [stats, byType] = await Promise.all([
      Booking.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            completedBookings: {
              $sum: { $cond: [{ $eq: ['$status', BookingStatus.COMPLETED] }, 1, 0] },
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ['$status', BookingStatus.CANCELLED] }, 1, 0] },
            },
            totalRevenue: {
              $sum: {
                $cond: [{ $eq: ['$stripeStatus', StripePaymentStatus.SUCCEEDED] }, '$totalCost', 0],
              },
            },
            totalPlatformFees: {
              $sum: {
                $cond: [
                  { $eq: ['$stripeStatus', StripePaymentStatus.SUCCEEDED] },
                  '$platformFee',
                  0,
                ],
              },
            },
          },
        },
      ]),
      Booking.aggregate([
        { $match: { ...matchQuery, stripeStatus: StripePaymentStatus.SUCCEEDED } },
        {
          $group: {
            _id: '$bookingType',
            count: { $sum: 1 },
            revenue: { $sum: '$totalCost' },
          },
        },
        {
          $project: {
            type: '$_id',
            count: 1,
            revenue: 1,
            _id: 0,
          },
        },
      ]),
    ]);

    const defaultStats = {
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      totalRevenue: 0,
      totalPlatformFees: 0,
    };

    return {
      ...(stats[0] || defaultStats),
      byType,
    };
  }

  /**
   * Send refund notification to the learner
   */
  private async sendRefundNotification(
    booking: IBooking,
    refundAmount: number,
    reason?: string,
  ): Promise<void> {
    try {
      if (!booking.bookedBy) return;

      // Fetch user and service details
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

      const serviceName =
        experience?.experienceTitle || expertise?.expertiseTitle || 'your booking';
      const hubName = hub?.name || 'The provider';

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'BOOKING_REFUNDED',
        user: {
          _id: booking.bookedBy.toString(),
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        },
        hubId: booking.hubId?.toString(),
        data: {
          userName: user.name,
          userEmail: user.email,
          bookingId: String(booking._id),
          serviceName,
          experienceName: serviceName,
          hubName,
          refundAmount,
          amount: refundAmount,
          currency: booking.currency,
          refundReason: reason || 'Booking cancelled',
          refundDetails: reason
            ? `Reason: ${reason}. The refund has been initiated and will be credited to your original payment method.`
            : 'The refund has been initiated and will be credited to your original payment method within 5-10 business days.',
        },
      });
    } catch (error) {
      console.error('Failed to send refund notification:', error);
    }
  }
}

// Export singleton instance
export const bookingService = new BookingService();
