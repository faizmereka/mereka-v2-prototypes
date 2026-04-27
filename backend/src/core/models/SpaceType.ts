import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Space Type Interface
 * Types of physical spaces offered by a Hub
 */
export interface ISpaceType extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Space Type schema definition
 */
const spaceTypeSchema = new Schema<ISpaceType>(
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
spaceTypeSchema.index({ isActive: 1, priority: 1 });

export const SpaceType = mongoose.model<ISpaceType>('SpaceType', spaceTypeSchema);
