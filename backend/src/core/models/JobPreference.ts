import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Job Preference Interface
 * Types of work an expert prefers
 */
export interface IJobPreference extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job Preference schema definition
 */
const jobPreferenceSchema = new Schema<IJobPreference>(
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
jobPreferenceSchema.index({ isActive: 1, priority: 1 });

export const JobPreference = mongoose.model<IJobPreference>('JobPreference', jobPreferenceSchema);
