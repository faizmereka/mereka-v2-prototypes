import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Language Interface
 * Languages spoken by experts
 */
export interface ILanguage extends Document {
  name: string;
  code?: string; // ISO language code (e.g., 'en', 'zh', 'hi')
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Language schema definition
 */
const languageSchema = new Schema<ILanguage>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
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
languageSchema.index({ isActive: 1, priority: 1 });

export const Language = mongoose.model<ILanguage>('Language', languageSchema);
