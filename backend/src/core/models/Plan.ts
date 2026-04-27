import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Plan status enum
 */
export enum PlanStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

/**
 * Plan document interface
 */
export interface IPlan extends Document {
  planCode: string; // Unique plan code (e.g., 'scale', 'soar', 'pro')
  name: string; // Display name
  tagline: string; // Short tagline for pricing page (e.g., "For solo experts")
  description: string; // Plan description

  // Pricing (monthly only)
  price: number; // Price in cents (e.g., 9900 = $99.00)
  currency: string; // USD, MYR, etc.

  // Stripe Configuration
  stripePriceId: string; // Stripe price ID
  stripeProductId: string; // Stripe product ID

  // Features
  features: string[]; // Array of feature descriptions

  // Status
  status: PlanStatus; // Plan status (active, inactive, archived)
  sortOrder: number; // Display order

  // Audit
  createdBy: string;
  lastUpdatedBy: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Plan schema
 */
const planSchema = new Schema<IPlan>(
  {
    planCode: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    tagline: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
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
    stripePriceId: {
      type: String,
      required: true,
    },
    stripeProductId: {
      type: String,
      required: true,
    },
    features: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(PlanStatus),
      default: PlanStatus.ACTIVE,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
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

// Indexes
// Note: planCode has unique: true, which creates an index automatically
planSchema.index({ status: 1, sortOrder: 1 });
planSchema.index({ stripePriceId: 1 });

/**
 * Plan model
 * Note: Uses 'SubscriptionProduct' collection for backward compatibility
 */
export const Plan = mongoose.model<IPlan>('SubscriptionProduct', planSchema);

// Re-export old names for backward compatibility during migration
export { Plan as SubscriptionProduct };
export type { IPlan as ISubscriptionProduct };
