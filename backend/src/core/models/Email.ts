import mongoose from 'mongoose';

/**
 * Email Type Enum
 * Types of emails that can be sent (matches templateId values in EmailTemplate)
 */
export enum EmailType {
  // Authentication & User Management
  WELCOME_EMAIL = 'WELCOME_EMAIL',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  EMAIL_CHANGED = 'EMAIL_CHANGED',

  // Booking - Learner
  BOOKING_CONFIRMATION_RECEIPT = 'BOOKING_CONFIRMATION_RECEIPT',
  BOOKING_CONFIRMATION_ONLINE = 'BOOKING_CONFIRMATION_ONLINE',
  BOOKING_CONFIRMATION_PHYSICAL = 'BOOKING_CONFIRMATION_PHYSICAL',
  BOOKING_CONFIRMATION_NON_BOOKER_ONLINE = 'BOOKING_CONFIRMATION_NON_BOOKER_ONLINE',
  BOOKING_CONFIRMATION_NON_BOOKER_PHYSICAL = 'BOOKING_CONFIRMATION_NON_BOOKER_PHYSICAL',
  BOOKING_REMINDER_ONE_HOUR = 'BOOKING_REMINDER_ONE_HOUR',
  BOOKING_REMINDER_ONE_DAY = 'BOOKING_REMINDER_ONE_DAY',
  BOOKING_CANCELLATION_CONFIRMATION = 'BOOKING_CANCELLATION_CONFIRMATION',
  MEETING_LINK_CHANGED = 'MEETING_LINK_CHANGED',

  // Booking - Host/Hub
  BOOKING_RECEIVED_HOST = 'BOOKING_RECEIVED_HOST',
  BOOKING_RECEIVED_ADMIN = 'BOOKING_RECEIVED_ADMIN',
  BOOKING_CANCELLED_BY_LEARNER = 'BOOKING_CANCELLED_BY_LEARNER',
  BOOKING_CANCELLED_BY_HUB = 'BOOKING_CANCELLED_BY_HUB',

  // Experience
  EXPERIENCE_APPROVED = 'EXPERIENCE_APPROVED',
  EXPERIENCE_REJECTED = 'EXPERIENCE_REJECTED',
  EXPERIENCE_UNDER_REVIEW = 'EXPERIENCE_UNDER_REVIEW',
  EXPERIENCE_EXPIRED = 'EXPERIENCE_EXPIRED',
  EXPERIENCE_OPEN_FOR_INQUIRY = 'EXPERIENCE_OPEN_FOR_INQUIRY',

  // Hub Management
  HUB_INVITATION = 'HUB_INVITATION',
  HUB_MEMBER_JOINED = 'HUB_MEMBER_JOINED',
  HUB_APPROVED = 'HUB_APPROVED',
  HUB_REJECTED = 'HUB_REJECTED',
  HUB_STRIPE_VERIFICATION = 'HUB_STRIPE_VERIFICATION',
  COLLABORATOR_ADDED = 'COLLABORATOR_ADDED',
  COLLABORATOR_REMOVED = 'COLLABORATOR_REMOVED',

  // Space
  SPACE_BOOKING_CONFIRMATION = 'SPACE_BOOKING_CONFIRMATION',
  SPACE_BOOKING_REMINDER = 'SPACE_BOOKING_REMINDER',
  SPACE_FEEDBACK_REQUEST = 'SPACE_FEEDBACK_REQUEST',

  // Expertise
  EXPERTISE_BOOKING_CONFIRMATION_LEARNER = 'EXPERTISE_BOOKING_CONFIRMATION_LEARNER',
  EXPERTISE_BOOKING_CONFIRMATION_EXPERT = 'EXPERTISE_BOOKING_CONFIRMATION_EXPERT',
  EXPERTISE_BOOKING_RECEIPT = 'EXPERTISE_BOOKING_RECEIPT',
  EXPERTISE_BOOKING_EXPIRED = 'EXPERTISE_BOOKING_EXPIRED',

  // Job Marketplace
  JOB_POSTED = 'JOB_POSTED',
  JOB_PROPOSAL_RECEIVED = 'JOB_PROPOSAL_RECEIVED',
  JOB_OFFER_SENT = 'JOB_OFFER_SENT',
  JOB_OFFER_ACCEPTED = 'JOB_OFFER_ACCEPTED',
  JOB_OFFER_DECLINED = 'JOB_OFFER_DECLINED',
  PROPOSAL_WITHDRAWAL = 'PROPOSAL_WITHDRAWAL',
  WORK_SUBMITTED = 'WORK_SUBMITTED',
  MILESTONE_FUNDED = 'MILESTONE_FUNDED',

  // Payments
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_LINK = 'PAYMENT_LINK',
  WEEKLY_PAYOUT = 'WEEKLY_PAYOUT',
  WITHDRAWAL_REMINDER = 'WITHDRAWAL_REMINDER',

  // Subscriptions
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_PAYMENT_FAILED = 'SUBSCRIPTION_PAYMENT_FAILED',

  // Messages & Communication
  NEW_MESSAGE = 'NEW_MESSAGE',
  UNREAD_MESSAGES_DIGEST = 'UNREAD_MESSAGES_DIGEST',

  // Reviews
  REVIEW_REQUEST = 'REVIEW_REQUEST',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',

  // Admin & System
  ADMIN_NOTIFICATION = 'ADMIN_NOTIFICATION',
  SYSTEM_ALERT = 'SYSTEM_ALERT',

  // Onboarding
  ONBOARDING_BASIC_PLAN = 'ONBOARDING_BASIC_PLAN',
  ONBOARDING_SCALE_PLAN = 'ONBOARDING_SCALE_PLAN',
  ONBOARDING_SOAR_PLAN = 'ONBOARDING_SOAR_PLAN',
}

/**
 * Email Status Enum
 * Tracks the lifecycle of an email
 */
export enum EmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  BOUNCED = 'BOUNCED',
  FAILED = 'FAILED',
}

/**
 * SendGrid Event Schema
 * Tracks SendGrid webhook events
 */
const sendGridEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      enum: [
        'processed',
        'dropped',
        'delivered',
        'deferred',
        'bounce',
        'open',
        'click',
        'spamreport',
        'unsubscribe',
        'group_unsubscribe',
        'group_resubscribe',
      ],
    },
    timestamp: {
      type: Date,
      required: true,
    },
    sg_event_id: String,
    sg_message_id: String,
    reason: String,
    url: String,
  },
  { _id: false },
);

/**
 * Email Schema (Simplified for SendGrid)
 * Tracks all emails sent through the system
 */
const emailSchema = new mongoose.Schema(
  {
    toEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    emailType: {
      type: String,
      required: true,
      index: true,
      // Note: Not using enum to allow any templateId
      // Old enum values kept in EmailType for backward compatibility
    },
    sendGridTemplateId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: Object.values(EmailStatus),
      default: EmailStatus.PENDING,
      index: true,
    },
    providerMessageId: {
      type: String,
      index: true,
    },
    sendGridEvents: {
      type: [sendGridEventSchema],
      default: [],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    error: {
      type: String,
    },
    sentAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'emails',
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Indexes
emailSchema.index({ toEmail: 1, createdAt: -1 });
emailSchema.index({ emailType: 1, status: 1 });
emailSchema.index({ userId: 1, createdAt: -1 });
emailSchema.index({ createdAt: -1 });

/**
 * TypeScript Interface for Email
 */
export interface IEmail extends mongoose.Document {
  toEmail: string;
  emailType: string;
  sendGridTemplateId: string;
  data: Record<string, unknown>;
  status: EmailStatus;
  providerMessageId?: string;
  sendGridEvents: Array<{
    event: string;
    timestamp: Date;
    sg_event_id?: string;
    sg_message_id?: string;
    reason?: string;
    url?: string;
  }>;
  userId?: mongoose.Types.ObjectId;
  error?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const Email = mongoose.model<IEmail>('Email', emailSchema);
