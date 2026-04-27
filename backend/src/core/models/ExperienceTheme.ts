import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Experience Theme Interface
 * Categories/themes for experiences (e.g., Art, Music, Technology)
 */
export interface IExperienceTheme extends Document {
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  count?: number; // Number of experiences in this theme
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Experience Theme schema definition
 */
const experienceThemeSchema = new Schema<IExperienceTheme>(
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
    icon: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
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
experienceThemeSchema.index({ isActive: 1, priority: 1 });
experienceThemeSchema.index({ name: 1 });

export const ExperienceTheme =
  (mongoose.models.ExperienceTheme as mongoose.Model<IExperienceTheme>) ||
  mongoose.model<IExperienceTheme>('ExperienceTheme', experienceThemeSchema);
