import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Amenity Interface
 * Amenities offered at a Hub (comforts and conveniences)
 */
export interface IAmenity extends Document {
  name: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Amenity schema definition
 */
const amenitySchema = new Schema<IAmenity>(
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
amenitySchema.index({ isActive: 1, priority: 1 });

export const Amenity = mongoose.model<IAmenity>('Amenity', amenitySchema);
