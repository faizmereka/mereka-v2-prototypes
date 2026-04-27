import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Resource type enum
 */
export enum ResourceType {
  LEARNER = 'learner',
  EXPERIENCE = 'experience',
  SERVICE = 'service',
  SPACE = 'space',
  HUB = 'hub',
  EXPERT = 'expert',
}

/**
 * Slug history entry
 */
export interface ISlugHistoryEntry {
  slug: string;
  isActive: boolean;
  usedFrom: Date;
  usedUntil?: Date;
}

/**
 * Slug document interface
 * Note: One document per resource per resourceType
 */
export interface ISlug extends Document {
  resourceType: ResourceType; // Type of resource
  resourceId: string; // Resource ID (User._id for learners, Experience._id for experiences)
  slugHistory: ISlugHistoryEntry[]; // All slugs with history (query isActive:true for current)
  createdBy: string; // User ID who created this
  lastUpdatedBy: string; // User ID who last updated this
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Slug schema definition
 */
const slugSchema = new Schema<ISlug>(
  {
    resourceType: {
      type: String,
      required: true,
      enum: Object.values(ResourceType),
    },
    resourceId: {
      type: String,
      required: true,
    },
    slugHistory: [
      {
        slug: {
          type: String,
          required: true,
          lowercase: true,
          trim: true,
        },
        isActive: {
          type: Boolean,
          default: false,
        },
        usedFrom: {
          type: Date,
          required: true,
        },
        usedUntil: {
          type: Date,
        },
      },
    ],
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
slugSchema.index({ resourceId: 1, resourceType: 1 }, { unique: true }); // One doc per resource per type
slugSchema.index({ 'slugHistory.slug': 1 }); // Lookup any slug
slugSchema.index({ 'slugHistory.isActive': 1 }); // Find active slugs
slugSchema.index({ createdBy: 1 }); // Track who created

/**
 * Slug model
 */
export const Slug = mongoose.model<ISlug>('Slug', slugSchema);
