import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Target Audience Interface
 * Audience types for experiences (e.g., Students, Professionals, Families)
 */
export interface ITargetAudience extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Target Audience schema definition
 */
const targetAudienceSchema = new Schema<ITargetAudience>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
targetAudienceSchema.index({ isActive: 1, priority: 1 });
targetAudienceSchema.index({ name: 1 });

export const TargetAudience = mongoose.model<ITargetAudience>(
  'TargetAudience',
  targetAudienceSchema,
);
