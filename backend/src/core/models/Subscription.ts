import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Subscription status enum
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  TRIALING = 'trialing',
}

/**
 * Subscription document interface
 * Links: User → Subscription → SubscriptionProduct (plan)
 */
export interface ISubscription extends Document {
  // Relationships
  userId: string; // User who owns this subscription
  hubId?: string; // Hub associated with this subscription (optional - set after hub created)
  planCode: string; // 'scale' or 'soar' - references SubscriptionProduct

  // Status
  status: SubscriptionStatus;

  // Billing
  billingCycle: 'monthly'; // Only monthly for now
  price: number; // Price paid (in cents)
  currency: string; // USD, MYR, etc.

  // Billing Dates
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  trialEndDate?: Date; // If user has trial period

  // Stripe Integration
  stripeCustomerId: string; // Stripe customer ID
  stripeSubscriptionId: string; // Stripe subscription ID (unique)
  stripePaymentMethodId?: string; // Stripe payment method

  // Audit
  createdBy: string;
  lastUpdatedBy: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription schema definition
 */
const subscriptionSchema = new Schema<ISubscription>(
  {
    // Relationships
    userId: {
      type: String,
      required: true,
    },
    hubId: {
      type: String,
    },
    planCode: {
      type: String,
      required: true,
      enum: ['scale', 'soar'],
    },

    // Status
    status: {
      type: String,
      required: true,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
    },

    // Billing
    billingCycle: {
      type: String,
      required: true,
      enum: ['monthly'],
      default: 'monthly',
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
    },

    // Billing Dates
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    nextBillingDate: {
      type: Date,
      required: true,
    },
    trialEndDate: {
      type: Date,
    },

    // Stripe Integration
    stripeCustomerId: {
      type: String,
      required: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
      unique: true,
    },
    stripePaymentMethodId: {
      type: String,
    },

    // Audit
    createdBy: {
      type: String,
      required: true,
    },
    lastUpdatedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ hubId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 }); // Lookup by Stripe ID
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 }); // For finding expiring subscriptions
subscriptionSchema.index({ userId: 1, planCode: 1 });

/**
 * Subscription model
 */
export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
