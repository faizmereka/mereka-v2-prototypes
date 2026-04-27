import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Focus Area Interface
 * Primary focus areas/expertise categories for Hubs and Experts
 */
export interface IFocusArea extends Document {
  name: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Focus Area schema definition
 */
const focusAreaSchema = new Schema<IFocusArea>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    icon: {
      type: String,
      trim: true,
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
focusAreaSchema.index({ isActive: 1, priority: 1 });

export const FocusArea = mongoose.model<IFocusArea>('FocusArea', focusAreaSchema);
