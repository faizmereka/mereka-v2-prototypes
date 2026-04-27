import mongoose, { type Document, type Types } from 'mongoose';

const { Schema } = mongoose;

/**
 * Experience Topic Interface
 * Topics/subcategories within experience themes
 */
export interface IExperienceTopic extends Document {
  name: string;
  parentCategory: Types.ObjectId | string; // Reference to ExperienceTheme
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Experience Topic schema definition
 */
const experienceTopicSchema = new Schema<IExperienceTopic>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'ExperienceTheme',
      required: true,
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

// Composite index for efficient queries
experienceTopicSchema.index({ parentCategory: 1, isActive: 1 });
experienceTopicSchema.index({ parentCategory: 1, priority: 1 });
experienceTopicSchema.index({ name: 1, parentCategory: 1 }, { unique: true });

export const ExperienceTopic =
  (mongoose.models.ExperienceTopic as mongoose.Model<IExperienceTopic>) ||
  mongoose.model<IExperienceTopic>('ExperienceTopic', experienceTopicSchema);
