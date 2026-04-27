import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Skill Type Enum
 */
export enum SkillType {
  PRIMARY = 'primary',
  ADDITIONAL = 'additional',
}

/**
 * Skill Interface
 * Skills categorized by focus area
 */
export interface ISkill extends Document {
  name: string;
  focusAreaId: mongoose.Types.ObjectId;
  type: SkillType;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Skill schema definition
 */
const skillSchema = new Schema<ISkill>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    focusAreaId: {
      type: Schema.Types.ObjectId,
      ref: 'FocusArea',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(SkillType),
      default: SkillType.PRIMARY,
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
skillSchema.index({ focusAreaId: 1, isActive: 1, priority: 1 });
skillSchema.index({ name: 1, focusAreaId: 1 }, { unique: true }); // Prevent duplicate skills per focus area

export const Skill = mongoose.model<ISkill>('Skill', skillSchema);
