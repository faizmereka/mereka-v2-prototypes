import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Booking type enum - types of consumer bookings
 */
export enum BookingType {
  EXPERIENCE = 'experience',
  EXPERTISE = 'expertise',
  SPACE = 'space',
}

/**
 * Booking status enum
 */
export enum BookingStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  WITHDRAWN = 'withdrawn',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * Stripe payment status enum
 */
export enum StripePaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  REQUIRES_CAPTURE = 'requires_capture',
  CANCELED = 'canceled',
  FAILED = 'failed',
}

/**
 * Dispute status enum
 */
export enum DisputeStatus {
  NONE = 'none',
  OPENED = 'opened',
  UNDER_REVIEW = 'under_review',
  WON = 'won',
  LOST = 'lost',
  CLOSED = 'closed',
}

/**
 * Pay by enum (who pays the stripe fee)
 */
export enum PayBy {
  HUB = 'hub',
  LEARNER = 'learner',
}

/**
 * Learner detail subdocument interface
 */
export interface ILearnerDetail {
  id: number;
  name: string;
  email: string;
  phone?: string;
  attendance?: boolean;
  attendanceDate?: Date;
  ticketId?: string;
  ticketName?: string;
  ticketType?: string;
  isBooker?: boolean;
  isEmailSent?: boolean;
}

/**
 * Selected ticket subdocument interface
 */
export interface ISelectedTicket {
  id: string;
  numberOfSelectedTickets: number;
  standardRate: number;
  ticketName: string;
  ticketType?: string;
  ticketPeriod?: string;
  sessionDuration?: string;
  expertiseMode?: string;
}

/**
 * Booking document interface
 */
export interface IBooking extends Document {
  // Firebase migration tracking
  firebaseId?: string; // Original Firebase document ID for migration

  // Core booking information
  bookingType: BookingType;
  serviceId: mongoose.Types.ObjectId; // Reference to Experience/Expertise/Space
  hubId: mongoose.Types.ObjectId; // Reference to Hub
  bookedBy?: mongoose.Types.ObjectId; // Reference to User (optional for guest bookings)
  eventId?: mongoose.Types.ObjectId; // Reference to ExperienceEvent (for experiences)
  scheduleId?: string; // Schedule identifier (for expertise)

  // Booking dates and times
  bookingStartDate: Date;
  bookingEndDate: Date;
  timeZone: string;

  // Participants
  learnerDetail: ILearnerDetail[];
  selectedTickets: ISelectedTicket[];

  // Pricing
  totalCost: number;
  currency: string;
  discountAmount?: number;
  refundAmount?: number;

  // Fees breakdown
  platformFee: number;
  platformFeeRate: number;
  stripeFee: number;
  transferAmount: number; // Expert receives

  // Stripe fee responsibility
  stripeFeePayBy?: PayBy;

  // Statuses
  status: BookingStatus;
  stripeStatus: StripePaymentStatus;
  disputeStatus: DisputeStatus;

  // Stripe payment
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeResponse?: Record<string, unknown>;
  refundResponse?: Record<string, unknown>;

  // Card info
  cardId?: string;
  cardType?: string;
  cardLastDigit?: string;

  // Transaction reference
  transactionId?: mongoose.Types.ObjectId; // Link to Transaction

  // Transfer tracking
  transferId?: string; // Stripe transfer ID
  transferStatus?: 'pending' | 'paid' | 'failed';
  transferredAt?: Date;

  // Flags
  isFree?: boolean;
  isMalaysian?: boolean;
  isPrivateBooking?: boolean;
  isWalkingBooking?: boolean;
  canBookOngoingEvent?: boolean;

  // Coupons and promotions
  isCouponUsed?: boolean;
  isHubCouponUsed?: boolean;
  promotionCode?: string;
  isDiscoveryPassBooking?: boolean;

  // Status flags
  isRedeemDone?: boolean;
  isMoneyTransferred?: string;
  isRefunded?: boolean;
  isScholarBooking?: boolean;

  // Notification tracking
  isBookingSuccessNotificationSentToExpert?: boolean;
  isBookingSuccessNotificationSentToLearner?: boolean;
  isBookingRejectNotificationSentToExpert?: boolean;
  isBookingRejectNotificationSentToLearner?: boolean;
  isBookingWithdrawalNotificationSentToLearner?: boolean;
  isBookingWithdrawalNotificationSentToExpert?: boolean;

  // Cancellation
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledDate?: Date;
  cancellationReason?: string;

  // Additional information
  addedByHub?: mongoose.Types.ObjectId;
  phoneNumber?: string;

  // UTM tracking
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  utm_id?: string;

  // Questionnaire data
  questionnaireFormData?: unknown[];

  // Legacy compatibility - will be removed after migration
  legacyBookingTransactionId?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Learner detail schema
 */
const learnerDetailSchema = new Schema<ILearnerDetail>(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    attendance: { type: Boolean, default: false },
    attendanceDate: { type: Date },
    ticketId: { type: String },
    ticketName: { type: String },
    ticketType: { type: String },
    isBooker: { type: Boolean, default: false },
    isEmailSent: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * Selected ticket schema
 */
const selectedTicketSchema = new Schema<ISelectedTicket>(
  {
    id: { type: String, required: true },
    numberOfSelectedTickets: { type: Number, required: true, min: 0 },
    standardRate: { type: Number, required: true, min: 0 },
    ticketName: { type: String, required: true },
    ticketType: { type: String },
    ticketPeriod: { type: String },
    sessionDuration: { type: String },
    expertiseMode: { type: String },
  },
  { _id: false },
);

/**
 * Booking schema definition
 */
const bookingSchema = new Schema<IBooking>(
  {
    // Firebase migration tracking
    firebaseId: {
      type: String,
      sparse: true,
      index: true,
    },

    // Core booking information
    bookingType: {
      type: String,
      enum: Object.values(BookingType),
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      refPath: 'bookingType',
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    bookedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'ExperienceEvent',
      index: true,
    },
    scheduleId: {
      type: String,
      index: true,
    },

    // Booking dates and times
    bookingStartDate: {
      type: Date,
      required: true,
      index: true,
    },
    bookingEndDate: {
      type: Date,
      required: true,
      index: true,
    },
    timeZone: {
      type: String,
      required: true,
      default: 'Asia/Kuala_Lumpur',
    },

    // Participants
    learnerDetail: {
      type: [learnerDetailSchema],
      required: true,
      validate: {
        validator: (v: ILearnerDetail[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one learner detail is required',
      },
    },
    selectedTickets: {
      type: [selectedTicketSchema],
      required: true,
      validate: {
        validator: (v: ISelectedTicket[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one ticket must be selected',
      },
    },

    // Pricing
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'MYR',
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    refundAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Fees breakdown
    platformFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    platformFeeRate: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.15, // 15% default
    },
    stripeFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    transferAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Stripe fee responsibility
    stripeFeePayBy: {
      type: String,
      enum: Object.values(PayBy),
    },

    // Statuses
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
      required: true,
      index: true,
    },
    stripeStatus: {
      type: String,
      enum: Object.values(StripePaymentStatus),
      default: StripePaymentStatus.PENDING,
      required: true,
      index: true,
    },
    disputeStatus: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.NONE,
      index: true,
    },

    // Stripe payment
    stripePaymentIntentId: {
      type: String,
      index: true,
    },
    stripeChargeId: {
      type: String,
      index: true,
    },
    stripeResponse: {
      type: Schema.Types.Mixed,
    },
    refundResponse: {
      type: Schema.Types.Mixed,
    },

    // Card info
    cardId: { type: String },
    cardType: { type: String },
    cardLastDigit: { type: String },

    // Transaction reference
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },

    // Transfer tracking
    transferId: {
      type: String,
      index: true,
    },
    transferStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
    },
    transferredAt: {
      type: Date,
    },

    // Flags
    isFree: { type: Boolean, default: false },
    isMalaysian: { type: Boolean, default: false },
    isPrivateBooking: { type: Boolean, default: false },
    isWalkingBooking: { type: Boolean, default: false },
    canBookOngoingEvent: { type: Boolean, default: false },

    // Coupons and promotions
    isCouponUsed: { type: Boolean, default: false },
    isHubCouponUsed: { type: Boolean, default: false },
    promotionCode: { type: String, trim: true },
    isDiscoveryPassBooking: { type: Boolean, default: false },

    // Status flags
    isRedeemDone: { type: Boolean, default: false },
    isMoneyTransferred: { type: String },
    isRefunded: { type: Boolean, default: false },
    isScholarBooking: { type: Boolean, default: false },

    // Notification tracking
    isBookingSuccessNotificationSentToExpert: { type: Boolean, default: false },
    isBookingSuccessNotificationSentToLearner: { type: Boolean, default: false },
    isBookingRejectNotificationSentToExpert: { type: Boolean, default: false },
    isBookingRejectNotificationSentToLearner: { type: Boolean, default: false },
    isBookingWithdrawalNotificationSentToLearner: { type: Boolean, default: false },
    isBookingWithdrawalNotificationSentToExpert: { type: Boolean, default: false },

    // Cancellation
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledDate: { type: Date },
    cancellationReason: { type: String, maxlength: 1000 },

    // Additional information
    addedByHub: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
    },
    phoneNumber: { type: String, trim: true },

    // UTM tracking
    utm_medium: { type: String, trim: true },
    utm_campaign: { type: String, trim: true },
    utm_term: { type: String, trim: true },
    utm_content: { type: String, trim: true },
    utm_id: { type: String, trim: true },

    // Questionnaire data
    questionnaireFormData: {
      type: [Schema.Types.Mixed],
      default: [],
    },

    // Legacy compatibility
    legacyBookingTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'BookingTransaction',
    },
  },
  {
    timestamps: true,
    collection: 'bookings',
    toJSON: {
      transform: (_doc, ret) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Compound indexes for performance
bookingSchema.index({ hubId: 1, bookingStartDate: -1 });
bookingSchema.index({ bookedBy: 1, bookingStartDate: -1 });
bookingSchema.index({ eventId: 1, status: 1 });
bookingSchema.index({ serviceId: 1, bookingType: 1 });
bookingSchema.index({ status: 1, bookingType: 1 });
bookingSchema.index({ stripeStatus: 1, status: 1 });
bookingSchema.index({ bookingEndDate: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ transferStatus: 1, status: 1 });

// Text index for search
bookingSchema.index({
  'learnerDetail.name': 'text',
  'learnerDetail.email': 'text',
  promotionCode: 'text',
});

/**
 * Pre-save hook to calculate fees
 */
bookingSchema.pre('save', function (next) {
  // Calculate fees if not already set and totalCost is provided
  if (this.totalCost > 0 && this.platformFee === 0) {
    this.platformFee = Number((this.totalCost * this.platformFeeRate).toFixed(2));

    // Stripe fee calculation (2.9% + fixed fee based on currency)
    const stripeFeeRate = 0.029;
    const stripeFeeFixed = this.currency === 'MYR' ? 1.0 : 0.3;
    this.stripeFee = Number((this.totalCost * stripeFeeRate + stripeFeeFixed).toFixed(2));

    // Calculate transfer amount to expert
    this.transferAmount = Number((this.totalCost - this.platformFee - this.stripeFee).toFixed(2));
  }

  next();
});

/**
 * Instance methods
 */

/**
 * Check if booking can be cancelled
 */
bookingSchema.methods.canBeCancelled = function (): boolean {
  return [BookingStatus.PENDING, BookingStatus.ACTIVE].includes(this.status);
};

/**
 * Check if booking is completed
 */
bookingSchema.methods.isCompleted = function (): boolean {
  return this.status === BookingStatus.COMPLETED;
};

/**
 * Check if payment is successful
 */
bookingSchema.methods.isPaymentSuccessful = function (): boolean {
  return this.stripeStatus === StripePaymentStatus.SUCCEEDED;
};

/**
 * Static methods
 */

/**
 * Find bookings by hub
 */
bookingSchema.statics.findByHubId = function (
  hubId: mongoose.Types.ObjectId | string,
  options?: { status?: BookingStatus; limit?: number },
) {
  const query = this.find({ hubId });
  if (options?.status) query.where('status').equals(options.status);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ bookingStartDate: -1 });
};

/**
 * Find bookings by user
 */
bookingSchema.statics.findByUserId = function (
  userId: mongoose.Types.ObjectId | string,
  options?: { status?: BookingStatus; limit?: number },
) {
  const query = this.find({ bookedBy: userId });
  if (options?.status) query.where('status').equals(options.status);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ bookingStartDate: -1 });
};

/**
 * Find pending transfers (for cron job)
 */
bookingSchema.statics.findPendingTransfers = function () {
  return this.find({
    status: BookingStatus.COMPLETED,
    stripeStatus: StripePaymentStatus.SUCCEEDED,
    transferStatus: { $ne: 'paid' },
  }).sort({ bookingEndDate: 1 });
};

/**
 * Booking model
 */
export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
