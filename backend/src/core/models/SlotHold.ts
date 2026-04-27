import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * SlotHold status enum
 */
export enum SlotHoldStatus {
  ACTIVE = 'active',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
  RELEASED = 'released',
}

/**
 * Ticket hold subdocument interface
 */
export interface ITicketHold {
  ticketId: string;
  quantity: number;
}

/**
 * SlotHold document interface
 *
 * Represents a temporary hold on experience slot capacity during checkout.
 * Prevents overbooking by reserving capacity for a limited time (TTL).
 */
export interface ISlotHold extends Document {
  // Core references
  experienceId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId; // ExperienceEvent._id
  userId: mongoose.Types.ObjectId;

  // Tickets being held
  tickets: ITicketHold[];
  totalQuantity: number;

  // Status
  status: SlotHoldStatus;

  // TTL - MongoDB auto-deletes after expiry
  expiresAt: Date;

  // Conversion to booking
  bookingId?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default hold duration: 15 minutes
 */
export const SLOT_HOLD_TTL_MINUTES = 15;

/**
 * Ticket hold subdocument schema
 */
const ticketHoldSchema = new Schema<ITicketHold>(
  {
    ticketId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

/**
 * SlotHold schema definition
 */
const slotHoldSchema = new Schema<ISlotHold>(
  {
    // Core references
    experienceId: {
      type: Schema.Types.ObjectId,
      ref: 'Experience',
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'ExperienceEvent',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Tickets being held
    tickets: {
      type: [ticketHoldSchema],
      required: true,
      validate: {
        validator: (v: ITicketHold[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one ticket must be held',
      },
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: 1,
    },

    // Status
    status: {
      type: String,
      enum: Object.values(SlotHoldStatus),
      default: SlotHoldStatus.ACTIVE,
      required: true,
      index: true,
    },

    // TTL - MongoDB auto-deletes documents when expiresAt is past
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index
    },

    // Conversion to booking
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'slotHolds',
    toJSON: {
      transform: (_doc, ret) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Compound indexes for availability queries
slotHoldSchema.index({ eventId: 1, status: 1 });
slotHoldSchema.index({ userId: 1, eventId: 1 });
slotHoldSchema.index({ experienceId: 1, status: 1 });

/**
 * Static methods
 */

/**
 * Find active holds for an event
 */
slotHoldSchema.statics.findActiveHoldsForEvent = function (
  eventId: mongoose.Types.ObjectId | string,
) {
  return this.find({
    eventId,
    status: SlotHoldStatus.ACTIVE,
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Find active hold for user on specific event
 */
slotHoldSchema.statics.findUserHoldForEvent = function (
  userId: mongoose.Types.ObjectId | string,
  eventId: mongoose.Types.ObjectId | string,
) {
  return this.findOne({
    userId,
    eventId,
    status: SlotHoldStatus.ACTIVE,
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Release all active holds for a user on an event
 */
slotHoldSchema.statics.releaseUserHoldsForEvent = function (
  userId: mongoose.Types.ObjectId | string,
  eventId: mongoose.Types.ObjectId | string,
) {
  return this.updateMany(
    { userId, eventId, status: SlotHoldStatus.ACTIVE },
    { $set: { status: SlotHoldStatus.RELEASED } },
  );
};

/**
 * Instance methods
 */

/**
 * Check if hold is still valid
 */
slotHoldSchema.methods.isValid = function (): boolean {
  return this.status === SlotHoldStatus.ACTIVE && this.expiresAt > new Date();
};

/**
 * Get remaining time in seconds
 */
slotHoldSchema.methods.getRemainingSeconds = function (): number {
  if (!this.isValid()) return 0;
  return Math.max(0, Math.floor((this.expiresAt.getTime() - Date.now()) / 1000));
};

/**
 * SlotHold model
 */
export const SlotHold = mongoose.model<ISlotHold>('SlotHold', slotHoldSchema);
