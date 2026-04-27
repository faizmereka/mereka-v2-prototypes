import type { Document } from 'mongoose';
import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Job status enum
 */
export enum JobStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/**
 * Employment type enum
 */
export enum EmploymentType {
  FULL_TIME = 'full-time',
  FREELANCE = 'freelance',
  PART_TIME = 'part-time',
}

/**
 * Pricing type enum
 */
export enum PricingType {
  FIXED = 'fixed',
  HOURLY = 'hourly',
}

/**
 * Access mode enum
 */
export enum AccessMode {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

/**
 * Job document interface - matches frontend Job interface exactly
 */
export interface IJob extends Document {
  // Job details
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType: EmploymentType;
  status: JobStatus;

  // Service category
  serviceCategory: {
    category: string;
    serviceType: string;
  };

  // Experience and location
  expertLevel?: string;
  jobLocation?: string;
  preferredLocation?: string[];

  // Budget - split as per frontend
  jobBudget: {
    pricingType: PricingType;
    fromAmount: number;
    upToAmount?: number;
  };
  jobCurrency: string;

  // Timeline
  jobStartDate?: Date;
  jobEndDate?: string; // Can be duration string like "<1" or actual date

  // Skills and attachments
  jobSkills: string[];
  jobUploads?: string[];

  // Access mode
  accessMode: AccessMode;

  // Contact information (flat structure as per frontend)
  name: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;
  aboutOrganization?: string;
  organizationImage?: string;

  // References
  hubId: string; // Reference to Hub ID
  createdBy: string; // Reference to User ID

  // Timestamps (Frontend uses these names)
  createdDate?: Date;
  lastUpdatedDate?: Date;

  // Mongoose timestamps (also keep these for consistency)
  createdAt: Date;
  updatedAt: Date;

  // Migration tracking
  firebaseId?: string;
}

/**
 * Job schema - matches frontend structure
 */
const jobSchema = new Schema<IJob>(
  {
    // Job details
    jobTitle: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    jobDescription: {
      type: String,
      required: true,
      maxlength: 10000, // HTML content
    },
    jobSummary: {
      type: String,
      maxlength: 500,
    },
    employmentType: {
      type: String,
      enum: Object.values(EmploymentType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.DRAFT,
      index: true,
    },

    // Service category
    serviceCategory: {
      category: { type: String, required: true, index: true },
      serviceType: { type: String, required: true },
    },

    // Experience and location
    expertLevel: {
      type: String,
    },
    jobLocation: {
      type: String,
    },
    preferredLocation: [String],

    // Budget (split as per frontend)
    jobBudget: {
      pricingType: {
        type: String,
        enum: Object.values(PricingType),
        required: true,
      },
      fromAmount: { type: Number, required: true },
      upToAmount: Number,
    },
    jobCurrency: {
      type: String,
      required: true,
    },

    // Timeline
    jobStartDate: {
      type: Date,
    },
    jobEndDate: {
      type: String,
    },

    // Skills and attachments
    jobSkills: {
      type: [String],
      index: true,
    },
    jobUploads: [String],

    // Access mode
    accessMode: {
      type: String,
      enum: Object.values(AccessMode),
      default: AccessMode.PUBLIC,
    },

    // Contact information (flat structure as per frontend)
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
    },
    organizationName: {
      type: String,
    },
    aboutOrganization: {
      type: String,
    },
    organizationImage: {
      type: String,
    },

    // References
    hubId: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },

    // Frontend timestamp fields
    createdDate: {
      type: Date,
    },
    lastUpdatedDate: {
      type: Date,
    },

    // Migration tracking
    firebaseId: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true, // Also creates createdAt and updatedAt
    toJSON: {
      transform: (_doc, ret) => {
        // biome-ignore lint/suspicious/noExplicitAny: required for mongoose
        delete (ret as any).__v;
        return ret;
      },
    },
  },
);

// Compound Indexes
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ hubId: 1, status: 1 });

/**
 * Job model
 */
export const Job = mongoose.model<IJob>('Job', jobSchema);
