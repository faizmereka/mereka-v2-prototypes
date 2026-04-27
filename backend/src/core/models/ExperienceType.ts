import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Experience Type Interface
 * Types of experiences/events offered by a Hub
 */
export interface IExperienceType extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Experience Type schema definition
 */
const experienceTypeSchema = new Schema<IExperienceType>(
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
experienceTypeSchema.index({ isActive: 1, priority: 1 });

export const ExperienceType = mongoose.model<IExperienceType>(
  'ExperienceType',
  experienceTypeSchema,
);
