import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Auth provider enum
 */
export enum AuthProvider {
  FIREBASE = 'firebase',
  EMAIL = 'email',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  KAJABI = 'kajabi',
  CUSTOM = 'custom',
}

// UserRole enum removed - no longer needed

/**
 * User status enum
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * User document interface
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;

  // Firebase Migration
  firebaseId?: string; // Original Firebase document ID (for migration tracking)

  email: string;
  name: string;
  username?: string; // Unique username/slug for profile URL
  birthDate?: Date;
  password?: string;
  status: UserStatus;
  profilePhoto?: string; // Changed from avatar
  bio?: string;
  phoneNumber?: string;
  emailVerified: boolean;

  // Learner Profile Fields (Optional)
  coverPhoto?: string;
  location?: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };

  // Firebase Auth fields (for social login only)
  firebaseUid?: string;
  authProviders: AuthProvider[]; // Array: user can have multiple (email + google + facebook)

  // Session management
  refreshTokens?: string[];
  lastLoginAt?: Date;
  lastLoginMethod?: AuthProvider;
  lastLoginIp?: string;

  // User Profile
  currency?: string;
  timeZone?: string;
  locale?: string;
  isGuestSignup?: boolean;

  // Expert Fields (Scale plan only - flattened)
  professionalTitle?: string; // "Senior Product Designer"
  introVideo?: string; // Expert intro video URL
  skills?: mongoose.Types.ObjectId[]; // References to Skill collection
  focusAreaId?: mongoose.Types.ObjectId; // Reference to FocusArea collection
  languages?: Array<{
    languageId: mongoose.Types.ObjectId; // Reference to Language collection
    proficiency: string; // "Basic", "Conversational", "Proficient", "Fluent", "Native"
  }>;
  portfolio?: Array<{
    title: string;
    description?: string;
    images?: string[];
    skills?: mongoose.Types.ObjectId[]; // References to Skill collection
    year?: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  employment?: Array<{
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }>;
  hourlyRate?: number; // For job marketplace
  jobPreferences?: mongoose.Types.ObjectId[]; // References to JobPreference collection

  // Password Reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  // Stripe Integration (v2 Account - unified for payments and payouts)
  stripeAccountId?: string; // Stripe Account ID (acct_xxx) - unified account for both paying and receiving

  // Stripe region for multi-account support (malaysia or atlas)
  stripeRegion?: 'malaysia' | 'atlas';

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User schema definition
 */
const userSchema = new Schema<IUser>(
  {
    // Firebase Migration
    firebaseId: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values
      lowercase: true,
      trim: true,
      minlength: 6,
      maxlength: 30,
      index: true,
    },
    birthDate: {
      type: Date,
    },
    password: {
      type: String,
      select: false, // Don't include in queries by default
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    profilePhoto: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },

    // Firebase Auth fields (for social login only)
    firebaseUid: {
      type: String,
      sparse: true,
      unique: true,
    },
    authProviders: {
      type: [String],
      enum: Object.values(AuthProvider),
      default: [],
      required: true,
    },

    // Session management
    refreshTokens: {
      type: [String],
      default: [],
      select: false, // Don't include in queries
    },
    lastLoginAt: {
      type: Date,
    },
    lastLoginMethod: {
      type: String,
      enum: Object.values(AuthProvider),
    },
    lastLoginIp: {
      type: String,
    },

    // User Profile
    currency: {
      type: String,
      uppercase: true,
      default: 'IDR',
    },
    timeZone: {
      type: String,
      default: 'Asia/Jakarta',
    },
    locale: {
      type: String,
      enum: ['en', 'id'],
      default: 'en',
    },
    isGuestSignup: {
      type: Boolean,
      default: false,
    },

    // Learner Profile Fields (Optional)
    coverPhoto: {
      type: String,
    },
    location: {
      city: String,
      country: String,
      lat: Number,
      lng: Number,
    },
    socialLinks: {
      website: String,
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
    },

    // Expert Fields (Scale plan only - flattened)
    professionalTitle: {
      type: String,
    },
    introVideo: {
      type: String,
    },
    skills: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Skill' }],
      default: [],
    },
    focusAreaId: {
      type: Schema.Types.ObjectId,
      ref: 'FocusArea',
    },
    languages: [
      {
        languageId: {
          type: Schema.Types.ObjectId,
          ref: 'Language',
          required: true,
        },
        proficiency: {
          type: String,
          enum: ['Basic', 'Conversational', 'Proficient', 'Fluent', 'Native'],
          required: true,
        },
      },
    ],
    portfolio: [
      {
        title: String,
        description: String,
        images: [String],
        skills: {
          type: [{ type: Schema.Types.ObjectId, ref: 'Skill' }],
          default: [],
        },
        year: String,
      },
    ],
    education: [
      {
        degree: String,
        institution: String,
        year: String,
      },
    ],
    employment: [
      {
        title: String,
        company: String,
        duration: String,
        description: String,
      },
    ],
    hourlyRate: {
      type: Number,
    },
    jobPreferences: {
      type: [{ type: Schema.Types.ObjectId, ref: 'JobPreference' }],
      default: [],
    },

    // Password Reset
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // Stripe Integration (v2 Account - unified for payments and payouts)
    stripeAccountId: {
      type: String,
      index: true,
      sparse: true, // Stripe Account ID (acct_xxx) for both paying and receiving
    },

    // Stripe region for multi-account support (malaysia or atlas)
    stripeRegion: {
      type: String,
      enum: ['malaysia', 'atlas'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        // Remove sensitive fields from JSON output
        const { password: _password, __v: _v, ...rest } = ret;
        return rest;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        const { password: _password, __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Indexes for performance
// Note: email and firebaseUid have unique: true, which creates indexes automatically
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ focusAreaId: 1 }); // For filtering by expert focus area
userSchema.index({ skills: 1 }); // For filtering by skills

// Text index for search (experts)
userSchema.index(
  { name: 'text', professionalTitle: 'text', bio: 'text' },
  { weights: { name: 10, professionalTitle: 8, bio: 3 }, name: 'user_text_search' },
);

/**
 * User model
 */
export const User = mongoose.model<IUser>('User', userSchema);
