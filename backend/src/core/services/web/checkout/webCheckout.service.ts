import type { ILearnerDetail, ISelectedTicket } from '@core/models/Booking';

import {
  Booking,
  BookingStatus,
  BookingType,
  PayBy,
  StripePaymentStatus,
} from '@core/models/Booking';
import { Experience } from '@core/models/Experience';
import { ExperienceEvent } from '@core/models/ExperienceEvent';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { SlotHoldStatus } from '@core/models/SlotHold';
import {
  SourceModel,
  Transaction,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '@core/models/Transaction';
import { AuthProvider, User } from '@core/models/User';
import { conversationTriggerService } from '@core/services/shared/chat';
import {
  type CouponValidationResult,
  couponService,
} from '@core/services/shared/checkout/coupon.service';
import {
  CapacityError,
  slotHoldService,
  type TicketHoldRequest,
} from '@core/services/shared/checkout/slotHold.service';
import { bookingService } from '@core/services/shared/payments/booking.service';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import { calculatePricing, DEFAULT_PLATFORM_FEE_RATE } from '@core/utils/stripe-fee.util';
import { getStripeRegion, type StripeRegion } from '@core/utils/stripe-region';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

// ============================================================================
// Types - Experience Checkout
// ============================================================================

export interface ExperienceCheckoutInitInput {
  experienceSlug: string;
  eventId: string;
  tickets: TicketHoldRequest[];
  userId?: string; // Optional for guest checkout
}

export interface ExperienceCheckoutInitResponse {
  holdId: string;
  holdExpiresAt: string;
  remainingSeconds: number;
  // Stripe Payment Element fields
  clientSecret?: string;
  paymentIntentId?: string;
  stripePublishableKey?: string; // Regional Stripe publishable key
  stripeRegion?: string; // 'malaysia' | 'atlas'
  experience: {
    _id: string;
    title: string;
    slug: string;
    coverPhoto?: string;
    hub: {
      _id: string;
      name: string;
      slug: string;
      logo?: string;
    };
    location?: {
      address?: string;
      city?: string;
      country?: string;
    };
    timeZone?: string;
  };
  event: {
    _id: string;
    startTime: string;
    endTime: string;
    timeZone?: string;
  };
  tickets: Array<{
    ticketId: string;
    ticketName: string;
    ticketType: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  pricing: {
    currency: string;
    subtotal: number;
    serviceFee: number;
    discount: number;
    total: number;
    isHubPayingFee: boolean;
  };
  questionnaire?: {
    isQuestionMandatory: boolean;
    questionArray: Array<{
      questionLabel: string;
      questionType: string;
      dropDown?: string[];
      checkBox?: string[];
      multipleChoices?: string[];
    }>;
  };
}

// ============================================================================
// Types - Expertise Checkout
// ============================================================================

export interface ExpertiseCheckoutInitInput {
  expertiseSlug: string;
  ticketId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  userId?: string;
}

export interface ExpertiseCheckoutInitResponse {
  // Hold fields (empty for expertise since no slot hold is needed)
  holdId: string;
  holdExpiresAt: string;
  // Stripe fields for regional payment
  stripePublishableKey?: string; // Regional Stripe publishable key
  stripeRegion?: string; // 'malaysia' | 'atlas'
  expertise: {
    _id: string;
    title: string;
    slug: string;
    coverPhoto?: string;
    expertiseType: 'Online' | 'Physical' | 'Hybrid';
    host?: {
      _id: string;
      name: string;
      photoUrl?: string;
    };
    hub: {
      _id: string;
      name: string;
      slug: string;
      logo?: string;
    };
    location?: {
      address?: string;
      city?: string;
      country?: string;
    };
    timeZone?: string;
  };
  ticket: {
    ticketId: string;
    ticketName: string;
    ticketType: string;
    unitPrice: number;
    mode: string;
    sessionDuration?: number;
    durationUnit?: string;
  };
  session: {
    date: string;
    startTime: string;
    endTime: string;
  };
  pricing: {
    currency: string;
    subtotal: number;
    serviceFee: number;
    discount: number;
    total: number;
    isHubPayingFee: boolean;
  };
  questionnaire?: {
    isQuestionMandatory: boolean;
    questionArray: Array<{
      questionLabel: string;
      questionType: string;
      dropDown?: string[];
      checkBox?: string[];
      multipleChoices?: string[];
    }>;
  };
  instantBooking: boolean;
}

// ============================================================================
// Types - Payment
// ============================================================================

export interface LearnerInput {
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  ticketId?: string;
  ticketName?: string;
}

export interface ExperiencePaymentInput {
  holdId?: string; // Optional for guest checkout
  // Alternative fields for guest checkout (when no holdId)
  experienceId?: string;
  eventId?: string;
  tickets?: Array<{ ticketId: string; quantity: number }>;
  // Legacy Card Element flow - send paymentMethodId
  paymentMethodId?: string;
  // New Payment Element flow - payment confirmed client-side, send paymentIntentId to verify
  paymentIntentId?: string;
  learners: LearnerInput[];
  questionnaire?: Record<string, unknown>[];
  couponCode?: string;
  userId?: string; // Optional for guest checkout
}

export interface ExpertisePaymentInput {
  expertiseId: string;
  ticketId: string;
  date: string;
  time: string;
  paymentMethodId: string;
  learner: LearnerInput;
  questionnaire?: Record<string, unknown>[];
  couponCode?: string;
  userId?: string; // Optional for guest checkout
}

export interface PaymentResult {
  success: boolean;
  bookingId: string;
  bookingReference?: string;
  status: BookingStatus;
  stripeStatus: StripePaymentStatus;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Error Codes
// ============================================================================

export enum CheckoutErrorCode {
  EXPERIENCE_NOT_FOUND = 'EXPERIENCE_NOT_FOUND',
  EXPERTISE_NOT_FOUND = 'EXPERTISE_NOT_FOUND',
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  HUB_NOT_FOUND = 'HUB_NOT_FOUND',
  TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',
  HOLD_NOT_FOUND = 'HOLD_NOT_FOUND',
  HOLD_EXPIRED = 'HOLD_EXPIRED',
  INVALID_TICKET_QUANTITY = 'INVALID_TICKET_QUANTITY',
  INSUFFICIENT_CAPACITY = 'INSUFFICIENT_CAPACITY',
  COUPON_INVALID = 'COUPON_INVALID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  BOOKING_CREATION_FAILED = 'BOOKING_CREATION_FAILED',
  INVALID_DATE_TIME = 'INVALID_DATE_TIME',
}

export class CheckoutError extends Error {
  constructor(
    public code: CheckoutErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

// ============================================================================
// Guest User Helper
// ============================================================================

/**
 * Get or create a guest user from learner info
 * Used for guest checkout - creates user if doesn't exist
 */
async function getOrCreateGuestUser(learner: LearnerInput): Promise<string> {
  const normalizedEmail = learner.email.toLowerCase();

  // Check if user exists
  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    // Create guest user
    user = await User.create({
      email: normalizedEmail,
      name: learner.name,
      phoneNumber: learner.phone,
      authProvider: AuthProvider.EMAIL,
      authProviders: [AuthProvider.EMAIL],
      emailVerified: false,
      currency: 'MYR',
      timeZone: 'Asia/Kuala_Lumpur',
      locale: 'en',
    });
  }

  return String(user._id);
}

// ============================================================================
// Web Checkout Service
// ============================================================================

class WebCheckoutService {
  // ==========================================================================
  // Experience Checkout
  // ==========================================================================

  /**
   * Initialize experience checkout
   * - Validates experience and event
   * - Creates slot hold for selected tickets
   * - Returns checkout data with hold info
   */
  async initializeExperienceCheckout(
    input: ExperienceCheckoutInitInput,
  ): Promise<ExperienceCheckoutInitResponse> {
    const { experienceSlug, eventId, tickets, userId } = input;

    // Step 1: Get experience
    const experience = await Experience.findOne({
      slug: experienceSlug,
      status: 'ACTIVE',
    }).lean();

    if (!experience) {
      throw new CheckoutError(CheckoutErrorCode.EXPERIENCE_NOT_FOUND, 'Experience not found');
    }

    // Step 2: Get event
    const event = await ExperienceEvent.findById(eventId).lean();

    if (!event) {
      throw new CheckoutError(CheckoutErrorCode.EVENT_NOT_FOUND, 'Event not found');
    }

    // Step 3: Get hub (with stripeRegion for regional Stripe selection)
    const hub = await Hub.findById(experience.hubId)
      .select('name slug logo stripeRegion location')
      .lean();

    if (!hub) {
      throw new CheckoutError(CheckoutErrorCode.HUB_NOT_FOUND, 'Hub not found');
    }

    // Get hub's regional Stripe service for checkout payments
    const region: StripeRegion =
      (hub.stripeRegion as StripeRegion) || getStripeRegion(hub.location?.country);
    const regionalStripeService = StripeServiceFactory.getService(region);

    // Step 4: Validate and create slot hold
    // For guest checkout, generate a temporary ObjectId to hold the slot
    const holdUserId = userId || new ObjectId().toString();
    let holdResult: Awaited<ReturnType<typeof slotHoldService.createHold>> | undefined;
    try {
      holdResult = await slotHoldService.createHold(
        holdUserId,
        String(experience._id),
        eventId,
        tickets,
      );
    } catch (error) {
      if (error instanceof CapacityError) {
        throw new CheckoutError(
          CheckoutErrorCode.INSUFFICIENT_CAPACITY,
          error.message,
          error.details,
        );
      }
      throw error;
    }

    // Step 5: Calculate ticket subtotals
    const ticketDetails = this.calculateExperienceTickets(experience.ticket || [], tickets);
    const subtotal = ticketDetails.reduce((sum, t) => sum + t.subtotal, 0);

    // Step 6: Calculate pricing
    const currency = experience.currency || 'MYR';
    const isHubPayingFee = experience.feePaidBy === 'hub';
    const pricing = calculatePricing(subtotal, currency, DEFAULT_PLATFORM_FEE_RATE, isHubPayingFee);

    // Step 7: Build questionnaire if enabled
    const questionnaire = experience.customQuestions?.questionArray?.length
      ? {
          isQuestionMandatory: experience.customQuestions.isQuestionMandatory || false,
          questionArray: experience.customQuestions.questionArray.map((q) => ({
            questionLabel: q.questionLabel,
            questionType: q.questionType,
            dropDown: q.dropDown,
            checkBox: q.checkBox,
            multipleChoices: q.multipleChoices,
          })),
        }
      : undefined;

    // Step 8: Create PaymentIntent for Payment Element (if paid checkout)
    // Uses Hub's regional Stripe platform
    const total = isHubPayingFee ? subtotal : pricing.totalCharge;
    let clientSecret: string | undefined;
    let paymentIntentId: string | undefined;

    if (total > 0) {
      try {
        const paymentIntent = await regionalStripeService
          .getStripeInstance()
          .paymentIntents.create({
            amount: Math.round(total * 100), // Convert to cents
            currency: currency.toLowerCase(),
            description: `Booking: ${experience.experienceTitle}`,
            automatic_payment_methods: { enabled: true },
            metadata: {
              type: 'experience',
              experienceId: String(experience._id),
              eventId,
              hubId: String(hub._id),
              holdId: holdResult?.hold._id ? String(holdResult.hold._id) : '',
              stripeRegion: region,
            },
          });
        clientSecret = paymentIntent.client_secret || undefined;
        paymentIntentId = paymentIntent.id;
      } catch (error) {
        // Log but don't fail - payment can still be processed with fallback
        console.error('Failed to create checkout PaymentIntent:', error);
      }
    }

    return {
      holdId: holdResult?.hold._id ? String(holdResult.hold._id) : '',
      holdExpiresAt: holdResult?.expiresAt.toISOString() || '',
      remainingSeconds: holdResult?.remainingSeconds || 0,
      clientSecret,
      paymentIntentId,
      stripePublishableKey: StripeServiceFactory.getPublishableKey(region),
      stripeRegion: region,
      experience: {
        _id: String(experience._id),
        title: experience.experienceTitle,
        slug: experience.slug,
        coverPhoto: experience.coverPhoto,
        hub: {
          _id: String(hub._id),
          name: hub.name,
          slug: hub.slug,
          logo: hub.logo,
        },
        location: experience.location,
        timeZone: experience.timeZone,
      },
      event: {
        _id: String(event._id),
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        timeZone: event.timeZone,
      },
      tickets: ticketDetails,
      pricing: {
        currency,
        subtotal,
        serviceFee: isHubPayingFee ? 0 : pricing.stripeFee,
        discount: 0,
        total,
        isHubPayingFee,
      },
      questionnaire,
    };
  }

  /**
   * Process experience payment
   * - Validates hold if provided (logged-in user)
   * - Gets or creates user for guest checkout
   * - Handles both Payment Element flow (paymentIntentId) and Card Element flow (paymentMethodId)
   * - Creates booking on payment success
   * - Confirms hold if exists
   */
  async processExperiencePayment(input: ExperiencePaymentInput): Promise<PaymentResult> {
    const { holdId, paymentMethodId, paymentIntentId, learners, questionnaire, couponCode } = input;
    let { userId } = input;

    // Get primary learner for guest user creation
    const primaryLearner = learners[0];
    if (!primaryLearner) {
      throw new CheckoutError(
        CheckoutErrorCode.BOOKING_CREATION_FAILED,
        'No learner details provided',
      );
    }

    // Step 1: Get or create user for guest checkout
    if (!userId) {
      userId = await getOrCreateGuestUser(primaryLearner);
    }

    // Step 2: Validate hold if provided
    const hold = holdId ? await slotHoldService.getHold(holdId) : null;

    if (holdId && hold) {
      if (hold.status !== SlotHoldStatus.ACTIVE || hold.expiresAt < new Date()) {
        throw new CheckoutError(CheckoutErrorCode.HOLD_EXPIRED, 'Hold has expired');
      }
    }

    // Step 3: Get experience and event details
    // For guest checkout (no hold), use the alternative fields
    let experienceId: string;
    let eventId: string;
    let tickets: Array<{ ticketId: string; quantity: number }>;

    if (hold) {
      // Use hold data for authenticated users
      experienceId = String(hold.experienceId);
      eventId = String(hold.eventId);
      tickets = hold.tickets;
    } else if (input.experienceId && input.eventId && input.tickets) {
      // Use direct fields for guest checkout
      experienceId = input.experienceId;
      eventId = input.eventId;
      tickets = input.tickets;
    } else {
      throw new CheckoutError(
        CheckoutErrorCode.HOLD_NOT_FOUND,
        'Either holdId or experienceId/eventId/tickets required',
      );
    }

    const experience = await Experience.findById(experienceId).lean();
    const event = await ExperienceEvent.findById(eventId).lean();

    if (!experience || !event) {
      throw new CheckoutError(
        CheckoutErrorCode.EXPERIENCE_NOT_FOUND,
        'Experience or event not found',
      );
    }

    // Get hub details (with stripeRegion for regional Stripe selection)
    const hub = await Hub.findById(experience.hubId)
      .select('name stripeAccountId stripeRegion location')
      .lean();
    if (!hub) {
      throw new CheckoutError(CheckoutErrorCode.HUB_NOT_FOUND, 'Hub not found');
    }

    // Get hub's regional Stripe service for checkout payments
    const region: StripeRegion =
      (hub.stripeRegion as StripeRegion) || getStripeRegion(hub.location?.country);
    const regionalStripeService = StripeServiceFactory.getService(region);

    // Step 3: Calculate pricing
    const ticketDetails = this.calculateExperienceTickets(experience.ticket || [], tickets);
    const subtotal = ticketDetails.reduce((sum, t) => sum + t.subtotal, 0);
    const currency = experience.currency || 'MYR';
    const isHubPayingFee = experience.feePaidBy === 'hub';

    // Step 4: Apply coupon if provided
    let couponResult: CouponValidationResult | undefined;
    let discount = 0;
    if (couponCode) {
      couponResult = await couponService.validateCoupon(
        couponCode,
        'experience',
        String(experience._id),
        userId,
        subtotal,
        experience.hubId ? String(experience.hubId) : undefined,
      );
      if (couponResult.valid && couponResult.discount) {
        discount = couponResult.discount;
      }
    }

    // Step 5: Calculate final pricing with discount
    const chargeAmount = subtotal - discount;

    // Check if free booking BEFORE calculating fees (fees shouldn't apply to free bookings)
    const isFree = chargeAmount === 0;

    const pricing = isFree
      ? { platformFee: 0, stripeFee: 0, transferAmount: 0, totalCharge: 0 }
      : calculatePricing(chargeAmount, currency, DEFAULT_PLATFORM_FEE_RATE, isHubPayingFee);
    const totalCharge = isFree ? 0 : isHubPayingFee ? chargeAmount : pricing.totalCharge;

    let stripePaymentIntentId: string | undefined;
    let stripeStatus = StripePaymentStatus.PENDING;
    let stripeResponse: Record<string, unknown> | undefined;

    if (!isFree) {
      // Step 7: Get or create Stripe customer using regional service
      const customer = await regionalStripeService.getOrCreateCustomer({
        _id: userId,
        email: primaryLearner.email,
        name: primaryLearner.name,
        phoneNumber: primaryLearner.phone,
      });

      // Step 8: Process payment - handle both Payment Element and Card Element flows
      // Uses Hub's regional Stripe platform
      try {
        const stripe = regionalStripeService.getStripeInstance();

        if (paymentIntentId) {
          // NEW FLOW: Payment Element - payment already confirmed client-side
          // Retrieve and verify the PaymentIntent status
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

          stripePaymentIntentId = paymentIntent.id;
          stripeStatus =
            paymentIntent.status === 'succeeded'
              ? StripePaymentStatus.SUCCEEDED
              : (paymentIntent.status as StripePaymentStatus);
          stripeResponse = paymentIntent as unknown as Record<string, unknown>;

          if (paymentIntent.status !== 'succeeded') {
            return {
              success: false,
              bookingId: '',
              status: BookingStatus.PENDING,
              stripeStatus,
              error: {
                code: CheckoutErrorCode.PAYMENT_FAILED,
                message: `Payment not completed. Status: ${paymentIntent.status}`,
              },
            };
          }

          // Update PaymentIntent metadata with booking info
          await stripe.paymentIntents.update(paymentIntentId, {
            customer: customer.id,
            metadata: {
              bookingType: 'experience',
              experienceId: String(experience._id),
              eventId: String(event._id),
              hubId: String(hub._id),
              userId,
              stripeRegion: region,
            },
          });
        } else if (paymentMethodId) {
          // LEGACY FLOW: Card Element - create and confirm PaymentIntent
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalCharge * 100), // Convert to cents
            currency: currency.toLowerCase(),
            customer: customer.id,
            payment_method: paymentMethodId,
            confirm: true,
            off_session: true,
            metadata: {
              bookingType: 'experience',
              experienceId: String(experience._id),
              eventId: String(event._id),
              hubId: String(hub._id),
              userId,
              stripeRegion: region,
            },
          });

          stripePaymentIntentId = paymentIntent.id;
          stripeStatus =
            paymentIntent.status === 'succeeded'
              ? StripePaymentStatus.SUCCEEDED
              : (paymentIntent.status as StripePaymentStatus);
          stripeResponse = paymentIntent as unknown as Record<string, unknown>;

          if (paymentIntent.status !== 'succeeded') {
            return {
              success: false,
              bookingId: '',
              status: BookingStatus.PENDING,
              stripeStatus,
              error: {
                code: CheckoutErrorCode.PAYMENT_FAILED,
                message: 'Payment requires additional action or failed',
              },
            };
          }
        } else {
          // No payment method provided
          return {
            success: false,
            bookingId: '',
            status: BookingStatus.PENDING,
            stripeStatus: StripePaymentStatus.FAILED,
            error: {
              code: CheckoutErrorCode.PAYMENT_FAILED,
              message: 'No payment method or payment intent provided',
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          bookingId: '',
          status: BookingStatus.PENDING,
          stripeStatus: StripePaymentStatus.FAILED,
          error: {
            code: CheckoutErrorCode.PAYMENT_FAILED,
            message: error instanceof Error ? error.message : 'Payment failed',
          },
        };
      }
    } else {
      stripeStatus = StripePaymentStatus.SUCCEEDED;
    }

    // Step 9: Create booking
    const learnerDetails: ILearnerDetail[] = learners.map((l, index) => ({
      id: index + 1,
      name: l.name,
      email: l.email,
      phone: l.phone,
      ticketId: l.ticketId,
      ticketName: l.ticketName,
      isBooker: index === 0,
    }));

    const selectedTickets: ISelectedTicket[] = ticketDetails.map((t) => ({
      id: t.ticketId,
      numberOfSelectedTickets: t.quantity,
      standardRate: t.unitPrice,
      ticketName: t.ticketName,
      ticketType: t.ticketType,
    }));

    const booking = await Booking.create({
      bookingType: BookingType.EXPERIENCE,
      serviceId: new ObjectId(String(experience._id)),
      hubId: new ObjectId(String(hub._id)),
      bookedBy: new ObjectId(userId),
      eventId: new ObjectId(String(event._id)),
      bookingStartDate: event.startTime,
      bookingEndDate: event.endTime,
      timeZone: event.timeZone || 'Asia/Kuala_Lumpur',
      learnerDetail: learnerDetails,
      selectedTickets,
      totalCost: totalCharge,
      currency,
      discountAmount: discount,
      platformFee: pricing.platformFee,
      platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
      stripeFee: pricing.stripeFee,
      transferAmount: pricing.transferAmount,
      stripeFeePayBy: isHubPayingFee ? PayBy.HUB : PayBy.LEARNER,
      status: BookingStatus.ACTIVE,
      stripeStatus,
      stripePaymentIntentId,
      stripeResponse,
      isFree,
      isCouponUsed: !!couponResult?.valid,
      isHubCouponUsed: couponResult?.couponType === 'hub',
      promotionCode: couponCode,
      questionnaireFormData: questionnaire,
    });

    // Step 10: Create transaction record for financial tracking
    await Transaction.create({
      type: TransactionType.BOOKING_PAYMENT,
      direction: TransactionDirection.INBOUND,
      sourceModel: SourceModel.BOOKING,
      sourceId: booking._id,
      amount: totalCharge,
      currency,
      platformFee: pricing.platformFee,
      platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
      stripeFee: pricing.stripeFee,
      transferAmount: pricing.transferAmount,
      fromUserId: new ObjectId(userId),
      hubId: new ObjectId(String(hub._id)),
      serviceType: 'experience',
      serviceId: new ObjectId(String(experience._id)),
      stripePaymentIntentId,
      status: isFree ? TransactionStatus.SUCCEEDED : TransactionStatus.SUCCEEDED,
      stripeStatus: stripeStatus,
      description: `Experience booking: ${experience.experienceTitle}`,
    });

    // Step 11: Confirm hold (if exists) and apply coupon
    if (holdId && hold) {
      await slotHoldService.confirmHold(holdId, String(booking._id));
    }

    if (couponResult?.valid && couponResult.couponId) {
      await couponService.applyCoupon({
        couponId: couponResult.couponId,
        userId,
        bookingId: String(booking._id),
        discountAmount: discount,
        currency,
        serviceType: 'experience',
        serviceId: String(experience._id),
        hubId: String(hub._id),
      });
    }

    // Step 12: Send booking confirmation notifications (non-blocking)
    void bookingService.sendBookingConfirmationNotifications(booking);

    // Step 13: Create chat room for booking (non-blocking)
    void conversationTriggerService.createBookingRoom({
      bookingId: booking._id as mongoose.Types.ObjectId,
      hubId: new ObjectId(String(hub._id)),
      learnerId: new ObjectId(userId),
      serviceId: new ObjectId(String(experience._id)),
      serviceType: 'experience',
      serviceName: experience.experienceTitle,
      bookingDate: event.startTime,
    });

    return {
      success: true,
      bookingId: String(booking._id),
      status: BookingStatus.ACTIVE,
      stripeStatus: StripePaymentStatus.SUCCEEDED,
    };
  }

  // ==========================================================================
  // Expertise Checkout
  // ==========================================================================

  /**
   * Initialize expertise checkout
   * - Validates expertise and ticket
   * - Returns checkout data (no hold for expertise)
   */
  async initializeExpertiseCheckout(
    input: ExpertiseCheckoutInitInput,
  ): Promise<ExpertiseCheckoutInitResponse> {
    const { expertiseSlug, ticketId, date, time } = input;

    // Step 1: Get expertise
    const expertise = await Expertise.findOne({
      slug: expertiseSlug,
      status: 'published',
    }).lean();

    if (!expertise) {
      throw new CheckoutError(CheckoutErrorCode.EXPERTISE_NOT_FOUND, 'Expertise not found');
    }

    // Step 2: Get hub (with stripeRegion for regional Stripe selection)
    const hub = await Hub.findById(expertise.hubId)
      .select('name slug logo stripeRegion location')
      .lean();

    if (!hub) {
      throw new CheckoutError(CheckoutErrorCode.HUB_NOT_FOUND, 'Hub not found');
    }

    // Get hub's regional Stripe info for checkout
    const region: StripeRegion =
      (hub.stripeRegion as StripeRegion) || getStripeRegion(hub.location?.country);

    // Step 3: Find the selected ticket
    const ticket = expertise.ticket?.find((t) => t._id?.toString() === ticketId);

    if (!ticket) {
      throw new CheckoutError(CheckoutErrorCode.TICKET_NOT_FOUND, 'Ticket not found');
    }

    // Step 4: Validate and calculate session times
    const sessionDurationMinutes = this.calculateDurationMinutes(
      ticket.sessionDuration || 60,
      ticket.durationUnit || 'minutes',
    );

    const startDateTime = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startDateTime.getTime())) {
      throw new CheckoutError(CheckoutErrorCode.INVALID_DATE_TIME, 'Invalid date or time');
    }

    const endDateTime = new Date(startDateTime.getTime() + sessionDurationMinutes * 60 * 1000);

    // Step 5: Calculate pricing
    const subtotal = ticket.standardRate || 0;
    const currency = expertise.currency || 'MYR';
    const isHubPayingFee = expertise.feePaidBy === 'hub';
    const pricing = calculatePricing(subtotal, currency, DEFAULT_PLATFORM_FEE_RATE, isHubPayingFee);

    // Step 6: Build questionnaire if enabled
    const questionnaire = expertise.customQuestions?.questionArray?.length
      ? {
          isQuestionMandatory: expertise.customQuestions.isQuestionMandatory || false,
          questionArray: expertise.customQuestions.questionArray.map((q) => ({
            questionLabel: q.questionLabel,
            questionType: q.questionType,
            dropDown: q.dropDown,
            checkBox: q.checkBox,
            multipleChoices: q.multipleChoices,
          })),
        }
      : undefined;

    // Step 7: Get host details
    const expertiseHost = expertise.host;

    // Map expertise mode to expertiseType
    const getExpertiseType = (): 'Online' | 'Physical' | 'Hybrid' => {
      const mode = ticket.expertiseMode;
      if (mode === 'online') return 'Online';
      if (mode === 'physical') return 'Physical';
      return 'Hybrid';
    };

    return {
      // Empty hold fields - expertise doesn't use slot holds
      holdId: '',
      holdExpiresAt: '',
      stripePublishableKey: StripeServiceFactory.getPublishableKey(region),
      stripeRegion: region,
      expertise: {
        _id: String(expertise._id),
        title: expertise.expertiseTitle,
        slug: expertise.slug,
        coverPhoto: expertise.coverPhoto,
        expertiseType: getExpertiseType(),
        host: expertiseHost
          ? {
              _id: expertiseHost.id || '',
              name: expertiseHost.name || '',
              photoUrl: expertiseHost.profileUrl,
            }
          : undefined,
        hub: {
          _id: String(hub._id),
          name: hub.name,
          slug: hub.slug,
          logo: hub.logo,
        },
        location: expertise.location,
        timeZone: 'Asia/Kuala_Lumpur', // Default timezone for expertise
      },
      ticket: {
        ticketId: ticket._id?.toString() ?? '',
        ticketName: ticket.ticketName,
        ticketType: ticket.ticketType,
        unitPrice: ticket.standardRate,
        mode: ticket.expertiseMode,
        sessionDuration: ticket.sessionDuration,
        durationUnit: ticket.durationUnit,
      },
      session: {
        date,
        startTime: time, // Keep HH:mm format for checkout endpoints
        endTime: `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`,
      },
      pricing: {
        currency,
        subtotal,
        serviceFee: isHubPayingFee ? 0 : pricing.stripeFee,
        discount: 0,
        total: isHubPayingFee ? subtotal : pricing.totalCharge,
        isHubPayingFee,
      },
      questionnaire,
      instantBooking: ticket.instantBooking ?? true,
    };
  }

  /**
   * Process expertise payment
   * - Gets or creates user for guest checkout
   * - Creates payment intent with Stripe
   * - Creates booking on payment success
   */
  async processExpertisePayment(input: ExpertisePaymentInput): Promise<PaymentResult> {
    const {
      expertiseId,
      ticketId,
      date,
      time,
      paymentMethodId,
      learner,
      questionnaire,
      couponCode,
    } = input;
    let { userId } = input;

    // Step 1: Get or create user for guest checkout
    if (!userId) {
      userId = await getOrCreateGuestUser(learner);
    }

    // Step 2: Get expertise
    const expertise = await Expertise.findById(expertiseId).lean();

    if (!expertise) {
      throw new CheckoutError(CheckoutErrorCode.EXPERTISE_NOT_FOUND, 'Expertise not found');
    }

    // Step 2: Get hub (with stripeRegion for regional Stripe selection)
    const hub = await Hub.findById(expertise.hubId)
      .select('name stripeAccountId stripeRegion location')
      .lean();

    if (!hub) {
      throw new CheckoutError(CheckoutErrorCode.HUB_NOT_FOUND, 'Hub not found');
    }

    // Get hub's regional Stripe service for checkout payments
    const region: StripeRegion =
      (hub.stripeRegion as StripeRegion) || getStripeRegion(hub.location?.country);
    const regionalStripeService = StripeServiceFactory.getService(region);

    // Step 3: Find the selected ticket
    const ticket = expertise.ticket?.find((t) => t._id?.toString() === ticketId);

    if (!ticket) {
      throw new CheckoutError(CheckoutErrorCode.TICKET_NOT_FOUND, 'Ticket not found');
    }

    // Step 4: Calculate session times
    const sessionDurationMinutes = this.calculateDurationMinutes(
      ticket.sessionDuration || 60,
      ticket.durationUnit || 'minutes',
    );

    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + sessionDurationMinutes * 60 * 1000);

    // Step 5: Calculate pricing
    const subtotal = ticket.standardRate || 0;
    const currency = expertise.currency || 'MYR';
    const isHubPayingFee = expertise.feePaidBy === 'hub';

    // Step 6: Apply coupon if provided
    let couponResult: CouponValidationResult | undefined;
    let discount = 0;
    if (couponCode) {
      couponResult = await couponService.validateCoupon(
        couponCode,
        'expertise',
        expertiseId,
        userId,
        subtotal,
        expertise.hubId?.toString(),
      );
      if (couponResult.valid && couponResult.discount) {
        discount = couponResult.discount;
      }
    }

    // Step 7: Calculate final pricing with discount
    const chargeAmount = subtotal - discount;

    // Check if free booking BEFORE calculating fees (fees shouldn't apply to free bookings)
    const isFree = chargeAmount === 0;

    const pricing = isFree
      ? { platformFee: 0, stripeFee: 0, transferAmount: 0, totalCharge: 0 }
      : calculatePricing(chargeAmount, currency, DEFAULT_PLATFORM_FEE_RATE, isHubPayingFee);
    const totalCharge = isFree ? 0 : isHubPayingFee ? chargeAmount : pricing.totalCharge;

    let stripePaymentIntentId: string | undefined;
    let stripeStatus = StripePaymentStatus.PENDING;
    let stripeResponse: Record<string, unknown> | undefined;

    if (!isFree) {
      // Step 9: Get or create Stripe customer using regional service
      const customer = await regionalStripeService.getOrCreateCustomer({
        _id: userId,
        email: learner.email,
        name: learner.name,
        phoneNumber: learner.phone,
      });

      // Step 10: Create and confirm payment intent using Hub's regional Stripe platform
      try {
        const stripe = regionalStripeService.getStripeInstance();
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalCharge * 100), // Convert to cents
          currency: currency.toLowerCase(),
          customer: customer.id,
          payment_method: paymentMethodId,
          confirm: true,
          off_session: true,
          metadata: {
            bookingType: 'expertise',
            expertiseId,
            hubId: String(hub._id),
            userId,
            stripeRegion: region,
          },
        });

        stripePaymentIntentId = paymentIntent.id;
        stripeStatus =
          paymentIntent.status === 'succeeded'
            ? StripePaymentStatus.SUCCEEDED
            : (paymentIntent.status as StripePaymentStatus);
        stripeResponse = paymentIntent as unknown as Record<string, unknown>;

        if (paymentIntent.status !== 'succeeded') {
          return {
            success: false,
            bookingId: '',
            status: BookingStatus.PENDING,
            stripeStatus,
            error: {
              code: CheckoutErrorCode.PAYMENT_FAILED,
              message: 'Payment requires additional action or failed',
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          bookingId: '',
          status: BookingStatus.PENDING,
          stripeStatus: StripePaymentStatus.FAILED,
          error: {
            code: CheckoutErrorCode.PAYMENT_FAILED,
            message: error instanceof Error ? error.message : 'Payment failed',
          },
        };
      }
    } else {
      stripeStatus = StripePaymentStatus.SUCCEEDED;
    }

    // Step 11: Create booking
    const learnerDetails: ILearnerDetail[] = [
      {
        id: 1,
        name: learner.name,
        email: learner.email,
        phone: learner.phone,
        ticketId: ticket._id?.toString() ?? '',
        ticketName: ticket.ticketName,
        isBooker: true,
      },
    ];

    const selectedTickets: ISelectedTicket[] = [
      {
        id: ticket._id?.toString() ?? '',
        numberOfSelectedTickets: 1,
        standardRate: ticket.standardRate,
        ticketName: ticket.ticketName,
        ticketType: ticket.ticketType,
        sessionDuration: `${ticket.sessionDuration} ${ticket.durationUnit}`,
        expertiseMode: ticket.expertiseMode,
      },
    ];

    // Determine booking status based on instantBooking
    const bookingStatus = ticket.instantBooking ? BookingStatus.ACTIVE : BookingStatus.PENDING;

    const booking = await Booking.create({
      bookingType: BookingType.EXPERTISE,
      serviceId: new ObjectId(expertiseId),
      hubId: new ObjectId(String(hub._id)),
      bookedBy: new ObjectId(userId),
      scheduleId: `${date}_${time}`,
      bookingStartDate: startDateTime,
      bookingEndDate: endDateTime,
      timeZone: 'Asia/Kuala_Lumpur', // Default timezone for expertise
      learnerDetail: learnerDetails,
      selectedTickets,
      totalCost: totalCharge,
      currency,
      discountAmount: discount,
      platformFee: pricing.platformFee,
      platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
      stripeFee: pricing.stripeFee,
      transferAmount: pricing.transferAmount,
      stripeFeePayBy: isHubPayingFee ? PayBy.HUB : PayBy.LEARNER,
      status: bookingStatus,
      stripeStatus,
      stripePaymentIntentId,
      stripeResponse,
      isFree,
      isCouponUsed: !!couponResult?.valid,
      isHubCouponUsed: couponResult?.couponType === 'hub',
      promotionCode: couponCode,
      questionnaireFormData: questionnaire,
    });

    // Create transaction record for financial tracking
    await Transaction.create({
      type: TransactionType.BOOKING_PAYMENT,
      direction: TransactionDirection.INBOUND,
      sourceModel: SourceModel.BOOKING,
      sourceId: booking._id,
      amount: totalCharge,
      currency,
      platformFee: pricing.platformFee,
      platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
      stripeFee: pricing.stripeFee,
      transferAmount: pricing.transferAmount,
      fromUserId: new ObjectId(userId),
      hubId: new ObjectId(String(hub._id)),
      serviceType: 'expertise',
      serviceId: new ObjectId(expertiseId),
      stripePaymentIntentId,
      status: isFree ? TransactionStatus.SUCCEEDED : TransactionStatus.SUCCEEDED,
      stripeStatus: stripeStatus,
      description: `Expertise booking: ${expertise.expertiseTitle}`,
    });

    // Apply coupon usage
    if (couponResult?.valid && couponResult.couponId) {
      await couponService.applyCoupon({
        couponId: couponResult.couponId,
        userId,
        bookingId: String(booking._id),
        discountAmount: discount,
        currency,
        serviceType: 'expertise',
        serviceId: expertiseId,
        hubId: String(hub._id),
      });
    }

    // Send booking confirmation notifications for active bookings (non-blocking)
    if (bookingStatus === BookingStatus.ACTIVE) {
      void bookingService.sendBookingConfirmationNotifications(booking);
    }

    // Create chat room for booking (non-blocking)
    void conversationTriggerService.createBookingRoom({
      bookingId: booking._id as mongoose.Types.ObjectId,
      hubId: new ObjectId(String(hub._id)),
      learnerId: new ObjectId(userId),
      serviceId: new ObjectId(expertiseId),
      serviceType: 'expertise',
      serviceName: expertise.expertiseTitle,
      bookingDate: startDateTime,
    });

    return {
      success: true,
      bookingId: String(booking._id),
      status: bookingStatus,
      stripeStatus: StripePaymentStatus.SUCCEEDED,
    };
  }

  // ==========================================================================
  // Coupon Validation
  // ==========================================================================

  /**
   * Validate a coupon code for a service
   */
  async validateCoupon(
    code: string,
    serviceType: 'experience' | 'expertise',
    serviceId: string,
    userId: string,
    amount: number,
    hubId?: string,
  ): Promise<CouponValidationResult> {
    return couponService.validateCoupon(code, serviceType, serviceId, userId, amount, hubId);
  }

  // ==========================================================================
  // Slot Hold Management
  // ==========================================================================

  /**
   * Release a slot hold (for abandoned checkouts)
   */
  async releaseHold(holdId: string, userId: string): Promise<void> {
    await slotHoldService.releaseHold(holdId, userId);
  }

  /**
   * Extend a slot hold (for payment retries)
   */
  async extendHold(
    holdId: string,
    userId: string,
    additionalMinutes = 5,
  ): Promise<{
    expiresAt: string;
    remainingSeconds: number;
  } | null> {
    const hold = await slotHoldService.extendHold(holdId, userId, additionalMinutes);
    if (!hold) return null;

    return {
      expiresAt: hold.expiresAt.toISOString(),
      remainingSeconds: Math.floor((hold.expiresAt.getTime() - Date.now()) / 1000),
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Calculate ticket subtotals for experience
   */
  private calculateExperienceTickets(
    ticketDefinitions: Array<{
      _id?: unknown;
      ticketName: string;
      ticketType: string;
      ticketPrice: number;
    }>,
    requestedTickets: TicketHoldRequest[],
  ): Array<{
    ticketId: string;
    ticketName: string;
    ticketType: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }> {
    return requestedTickets.map((req) => {
      const def = ticketDefinitions.find((t) => t._id?.toString() === req.ticketId);
      if (!def) {
        throw new CheckoutError(
          CheckoutErrorCode.TICKET_NOT_FOUND,
          `Ticket ${req.ticketId} not found`,
        );
      }

      return {
        ticketId: req.ticketId,
        ticketName: def.ticketName,
        ticketType: def.ticketType,
        unitPrice: def.ticketPrice,
        quantity: req.quantity,
        subtotal: def.ticketPrice * req.quantity,
      };
    });
  }

  /**
   * Calculate duration in minutes based on unit
   */
  private calculateDurationMinutes(duration: number, unit: string): number {
    if (unit.toLowerCase() === 'hours') {
      return duration * 60;
    }
    return duration; // Default: minutes
  }
}

// Export singleton instance
export const webCheckoutService = new WebCheckoutService();
