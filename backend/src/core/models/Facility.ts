import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Facility Interface
 * Facilities present at a Hub (features and infrastructure)
 */
export interface IFacility extends Document {
  name: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Facility schema definition
 */
const facilitySchema = new Schema<IFacility>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
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
facilitySchema.index({ isActive: 1, priority: 1 });

export const Facility = mongoose.model<IFacility>('Facility', facilitySchema);
