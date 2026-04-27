import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Hub status enum
 */
export enum HubStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  INACTIVE = 'inactive',
}

/**
 * Review stats interface (aggregated from BookingReview + ContractReview)
 */
export interface IReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  lastReviewAt?: Date;
}

/**
 * Operating hours for a single day
 */
export interface IDayHours {
  open?: string; // e.g., "09:00"
  close?: string; // e.g., "17:00"
  isClosed?: boolean;
}

/**
 * Operating hours for the week
 */
export interface IOperatingHours {
  monday?: IDayHours;
  tuesday?: IDayHours;
  wednesday?: IDayHours;
  thursday?: IDayHours;
  friday?: IDayHours;
  saturday?: IDayHours;
  sunday?: IDayHours;
}

/**
 * Hub document interface
 *
 * Note: stripeAccountId stores Stripe Connect account ID (acct_xxx) directly
 * Note: StripeAccount model caches account status/requirements (linked via hubId)
 * Note: Subscription data is stored in Subscription model (linked via hubId)
 * Note: Plan data is stored in Plan model (referenced via Subscription.planCode)
 */
export interface IHub extends Document {
  // Firebase Migration
  firebaseId?: string; // Original Firebase document ID (for migration tracking)

  // Basic Info
  name: string;
  slug: string; // Current active slug (managed by Slug collection)
  logo: string;
  phoneNumber: string;
  coverImage?: string;

  // Description
  description?: string;
  companyType?: mongoose.Types.ObjectId; // Reference to CompanyType collection

  // Media
  introVideo?: string; // YouTube/Vimeo URL
  gallery: string[]; // Array of image URLs
  autoPopulateImages?: boolean; // Auto-populate gallery from service images
  portfolio?: Array<{
    title: string;
    description?: string;
    images?: string[];
    year?: string;
  }>; // Portfolio/Projects (all users)

  // Location
  location: {
    address?: string;
    city: string;
    state?: string;
    country: string;
    postcode?: string;
    lat?: number;
    lng?: number;
  };
  displayFullAddress?: boolean; // Privacy: show full address or just city/country

  // Operating Hours
  operatingHours?: IOperatingHours;

  // Social Links
  socialLinks?: {
    website?: string;
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    email?: string;
  };

  // Categories & Tags (Reference Data)
  amenities: mongoose.Types.ObjectId[]; // References to Amenity collection
  facilities: mongoose.Types.ObjectId[]; // References to Facility collection
  focusAreas: mongoose.Types.ObjectId[]; // References to FocusArea collection
  spaceTypes: mongoose.Types.ObjectId[]; // References to SpaceType collection
  experienceTypes: mongoose.Types.ObjectId[]; // References to ExperienceType collection

  // Free-form fields
  tags: string[]; // User-added tags
  services: string[]; // Services offered

  // Subscription (reference to Subscription model)
  subscriptionId?: string;

  // Stripe Account ID (acct_xxx) - stores Stripe Connect account ID directly
  stripeAccountId?: string; // Stripe's acct_xxx ID for receiving payouts

  // Stripe region for multi-account support (malaysia or atlas)
  stripeRegion?: 'malaysia' | 'atlas';

  // Stripe Customer IDs per region (for paying for services, e.g., milestone funding)
  // Key: region ('malaysia' | 'atlas'), Value: Stripe customer ID (cus_xxx)
  stripeCustomers?: Record<string, string>;

  // Currency derived from location.country (immutable after Stripe connected)
  currency?: string; // ISO currency code (e.g., 'MYR', 'IDR', 'USD')

  // Status
  status: HubStatus;
  onboardingStep: number; // 1-5, tracks progress
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number; // For ordering hubs in listings (lower = higher priority)

  // Ownership
  ownerId: string; // User ID who owns this hub
  createdBy: string;
  lastUpdatedBy: string;

  // Review Stats (aggregated from BookingReview + ContractReview)
  reviewStats?: IReviewStats;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Hub schema definition
 */
const hubSchema = new Schema<IHub>(
  {
    // Firebase Migration
    firebaseId: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values
      index: true,
    },

    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    logo: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },

    // Description
    description: {
      type: String,
      required: false,
      default: '',
      maxlength: 1000,
    },
    companyType: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyType',
    },

    // Media
    introVideo: {
      type: String,
    },
    gallery: {
      type: [String],
      default: [],
    },
    autoPopulateImages: {
      type: Boolean,
      default: false,
    },
    portfolio: {
      type: [
        {
          title: { type: String, required: true },
          description: String,
          images: [String],
          year: String,
        },
      ],
      default: [],
    },

    // Location
    location: {
      address: String,
      city: {
        type: String,
        required: true,
      },
      state: String,
      country: {
        type: String,
        required: true,
      },
      postcode: String,
      lat: Number,
      lng: Number,
    },

    // Location Visibility
    displayFullAddress: {
      type: Boolean,
      default: false, // By default, show only city/country for privacy
    },

    // Operating Hours
    operatingHours: {
      monday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      tuesday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      wednesday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      thursday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      friday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      saturday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      sunday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
    },

    // Social Links
    socialLinks: {
      website: String,
      facebook: String,
      linkedin: String,
      instagram: String,
      twitter: String,
      email: String,
    },

    // Reference Data Arrays
    amenities: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Amenity' }],
      default: [],
    },
    facilities: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Facility' }],
      default: [],
    },
    focusAreas: {
      type: [{ type: Schema.Types.ObjectId, ref: 'FocusArea' }],
      default: [],
    },
    spaceTypes: {
      type: [{ type: Schema.Types.ObjectId, ref: 'SpaceType' }],
      default: [],
    },
    experienceTypes: {
      type: [{ type: Schema.Types.ObjectId, ref: 'ExperienceType' }],
      default: [],
    },

    // Free-form Arrays
    tags: {
      type: [String],
      default: [],
    },
    services: {
      type: [String],
      default: [],
    },

    // Subscription (reference to Subscription model)
    subscriptionId: {
      type: String,
      index: true,
    },

    // Stripe Account ID (acct_xxx) - stores Stripe Connect account ID directly
    stripeAccountId: {
      type: String,
      index: true,
      sparse: true, // Stripe's acct_xxx ID for receiving payouts
    },

    // Stripe region for multi-account support (malaysia or atlas)
    stripeRegion: {
      type: String,
      enum: ['malaysia', 'atlas'],
      index: true,
    },

    // Stripe Customer IDs per region (for paying for services)
    stripeCustomers: {
      type: Map,
      of: String,
    },

    // Currency derived from location.country (immutable after Stripe connected)
    currency: {
      type: String,
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: Object.values(HubStatus),
      default: HubStatus.DRAFT,
    },
    onboardingStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 1000,
      index: true,
    },

    // Ownership
    ownerId: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    lastUpdatedBy: {
      type: String,
      required: true,
    },

    // Review Stats (aggregated from BookingReview + ContractReview)
    reviewStats: {
      type: {
        averageRating: { type: Number, default: 0, min: 0, max: 5 },
        totalReviews: { type: Number, default: 0, min: 0 },
        ratingDistribution: {
          type: {
            1: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            5: { type: Number, default: 0 },
          },
          default: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
        lastReviewAt: { type: Date },
      },
      default: {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
// Note: slug has unique: true, which creates an index automatically
hubSchema.index({ ownerId: 1, status: 1 });
hubSchema.index({ status: 1, isActive: 1, isFeatured: 1 });
hubSchema.index({ tags: 1 });
hubSchema.index({ focusAreas: 1 }); // For filtering by focus area
hubSchema.index({ amenities: 1 }); // For filtering by amenities
hubSchema.index({ facilities: 1 }); // For filtering by facilities

// Text index for search
hubSchema.index(
  { name: 'text', description: 'text' },
  { weights: { name: 10, description: 5 }, name: 'hub_text_search' },
);

/**
 * Hub model
 */
export const Hub = mongoose.model<IHub>('Hub', hubSchema);
