import { type Document, model, Schema, type Types } from 'mongoose';

export interface IExperienceEvent extends Document {
  // References
  experienceId: Types.ObjectId;
  scheduleId: string; // Schedule UID from experience.schedules[]

  // Event details
  startTime: Date;
  endTime: Date;
  timeZone: string;

  // Recurrence
  isRecurring: boolean;

  // Status
  status: 'ACTIVE' | 'CANCELLED' | 'DELETED';
  isLocked: boolean; // Locked events won't be auto-updated

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const experienceEventSchema = new Schema<IExperienceEvent>(
  {
    // References
    experienceId: {
      type: Schema.Types.ObjectId,
      ref: 'Experience',
      required: true,
      index: true,
    },
    scheduleId: {
      type: String,
      required: true,
      index: true,
    },

    // Event details
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    timeZone: {
      type: String,
      required: true,
    },

    // Recurrence
    isRecurring: {
      type: Boolean,
      default: false,
    },

    // Status
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED', 'DELETED'],
      default: 'ACTIVE',
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'experienceEvents',
  },
);

// Compound indexes for common queries
experienceEventSchema.index({ experienceId: 1, startTime: 1 });
experienceEventSchema.index({ scheduleId: 1, status: 1 });
experienceEventSchema.index({ startTime: 1, status: 1 });

export const ExperienceEvent = model<IExperienceEvent>('ExperienceEvent', experienceEventSchema);
