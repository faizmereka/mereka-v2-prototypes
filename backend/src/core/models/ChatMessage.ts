// src/core/models/ChatMessage.ts
// @spec: specs/messaging/messaging-data-models_spec.md
// @covers AC-DM-040 through AC-DM-065, AC-DM-094, AC-DM-095

import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

// ============================================
// ENUMS (AC-DM-042, AC-DM-048, AC-DM-060 through AC-DM-065)
// ============================================

// AC-DM-042
export enum ChatMessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  EVENT = 'EVENT',
}

// AC-DM-060 through AC-DM-065
export enum ChatEventType {
  // Booking events (AC-DM-060)
  BOOKING_REQUESTED = 'BOOKING_REQUESTED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_RESCHEDULED = 'BOOKING_RESCHEDULED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_COMPLETED = 'BOOKING_COMPLETED',
  BOOKING_REVIEWED = 'BOOKING_REVIEWED',

  // Proposal events (AC-DM-061)
  PROPOSAL_SUBMITTED = 'PROPOSAL_SUBMITTED',
  PROPOSAL_VIEWED = 'PROPOSAL_VIEWED',
  PROPOSAL_REVISED = 'PROPOSAL_REVISED',
  PROPOSAL_ACCEPTED = 'PROPOSAL_ACCEPTED',
  PROPOSAL_REJECTED = 'PROPOSAL_REJECTED',
  PROPOSAL_WITHDRAWN = 'PROPOSAL_WITHDRAWN',

  // Contract events (AC-DM-062)
  CONTRACT_STARTED = 'CONTRACT_STARTED',
  CONTRACT_PAUSED = 'CONTRACT_PAUSED',
  CONTRACT_RESUMED = 'CONTRACT_RESUMED',
  CONTRACT_COMPLETED = 'CONTRACT_COMPLETED',
  CONTRACT_CANCELLED = 'CONTRACT_CANCELLED',
  CONTRACT_REVIEWED = 'CONTRACT_REVIEWED',

  // Milestone events (AC-DM-063)
  MILESTONE_CREATED = 'MILESTONE_CREATED',
  MILESTONE_SUBMITTED = 'MILESTONE_SUBMITTED',
  MILESTONE_APPROVED = 'MILESTONE_APPROVED',
  MILESTONE_REVISION_REQUESTED = 'MILESTONE_REVISION_REQUESTED',

  // Payment events (AC-DM-064)
  PAYMENT_REQUESTED = 'PAYMENT_REQUESTED',
  PAYMENT_RELEASED = 'PAYMENT_RELEASED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',

  // Participant events (AC-DM-065)
  PARTICIPANT_JOINED = 'PARTICIPANT_JOINED',
  PARTICIPANT_LEFT = 'PARTICIPANT_LEFT',
  PARTICIPANT_ASSIGNED = 'PARTICIPANT_ASSIGNED',
  PARTICIPANT_UNASSIGNED = 'PARTICIPANT_UNASSIGNED',
}

// AC-DM-048
export enum ChatEventEntityType {
  BOOKING = 'BOOKING',
  PROPOSAL = 'PROPOSAL',
  CONTRACT = 'CONTRACT',
  MILESTONE = 'MILESTONE',
  PAYMENT = 'PAYMENT',
  PARTICIPANT = 'PARTICIPANT',
}

// ============================================
// INTERFACES
// ============================================

// AC-DM-044, AC-DM-045
export interface IChatFile {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl?: string;
}

// AC-DM-046 through AC-DM-051
export interface IChatEvent {
  eventType: ChatEventType; // AC-DM-047
  entityType: ChatEventEntityType; // AC-DM-048
  entityId: mongoose.Types.ObjectId; // AC-DM-049
  summary: string; // AC-DM-050
  data: Record<string, unknown>; // AC-DM-051
  triggeredBy?: mongoose.Types.ObjectId;
}

// AC-DM-041
export interface IChatMessageSender {
  userId: mongoose.Types.ObjectId;
  hubId?: mongoose.Types.ObjectId;
  name: string;
  avatar?: string;
  type: 'LEARNER' | 'HUB_TEAM';
}

// AC-DM-040 through AC-DM-055
export interface IChatMessage extends Document {
  _id: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId; // AC-DM-040
  sender: IChatMessageSender; // AC-DM-041
  type: ChatMessageType; // AC-DM-042
  text?: string; // AC-DM-043
  files?: IChatFile[]; // AC-DM-044
  event?: IChatEvent; // AC-DM-046
  createdAt: Date; // AC-DM-052
  editedAt?: Date; // AC-DM-053
  deletedAt?: Date; // AC-DM-054
  isDeleted: boolean; // AC-DM-055
}

// ============================================
// SCHEMAS
// ============================================

// AC-DM-045
const chatFileSchema = new Schema<IChatFile>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    thumbnailUrl: { type: String },
  },
  { _id: false },
);

// AC-DM-046 through AC-DM-051
const chatEventSchema = new Schema<IChatEvent>(
  {
    // AC-DM-047
    eventType: {
      type: String,
      enum: Object.values(ChatEventType),
      required: true,
    },
    // AC-DM-048
    entityType: {
      type: String,
      enum: Object.values(ChatEventEntityType),
      required: true,
    },
    // AC-DM-049
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    // AC-DM-050
    summary: {
      type: String,
      required: true,
      maxlength: 500,
    },
    // AC-DM-051
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    triggeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false },
);

// AC-DM-041
const chatMessageSenderSchema = new Schema<IChatMessageSender>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
    },
    name: { type: String, required: true },
    avatar: { type: String },
    type: {
      type: String,
      enum: ['LEARNER', 'HUB_TEAM'],
      required: true,
    },
  },
  { _id: false },
);

// Main ChatMessage schema
const chatMessageSchema = new Schema<IChatMessage>(
  {
    // AC-DM-040
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
      index: true,
    },

    // AC-DM-041
    sender: {
      type: chatMessageSenderSchema,
      required: true,
    },

    // AC-DM-042
    type: {
      type: String,
      enum: Object.values(ChatMessageType),
      required: true,
    },

    // AC-DM-043
    text: {
      type: String,
      maxlength: 10000,
    },

    // AC-DM-044
    files: {
      type: [chatFileSchema],
      default: undefined,
    },

    // AC-DM-046
    event: {
      type: chatEventSchema,
      default: undefined,
    },

    // AC-DM-053
    editedAt: { type: Date },

    // AC-DM-054
    deletedAt: { type: Date },

    // AC-DM-055
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    // AC-DM-052: createdAt timestamp
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret) => {
        const { __v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// ============================================
// INDEXES (AC-DM-094, AC-DM-095)
// ============================================

// AC-DM-094: Pagination - messages by room sorted by time
chatMessageSchema.index({ roomId: 1, createdAt: -1 });

// AC-DM-095: Text search on message content
chatMessageSchema.index({ text: 'text' });

// Index for finding undeleted messages
chatMessageSchema.index({ roomId: 1, isDeleted: 1, createdAt: -1 });

// ============================================
// VALIDATION
// ============================================

/**
 * Pre-save validation for message content based on type
 */
chatMessageSchema.pre('save', function (next) {
  if (this.type === ChatMessageType.TEXT) {
    if (!this.text || this.text.trim() === '') {
      return next(new Error('Text content is required for TEXT messages'));
    }
  } else if (this.type === ChatMessageType.FILE) {
    if (!this.files || this.files.length === 0) {
      return next(new Error('At least one file is required for FILE messages'));
    }
  } else if (this.type === ChatMessageType.EVENT) {
    if (!this.event) {
      return next(new Error('Event data is required for EVENT messages'));
    }
  }
  next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find messages by room ID with pagination
 */
chatMessageSchema.statics.findByRoomId = function (
  roomId: mongoose.Types.ObjectId | string,
  options: { limit?: number; before?: Date; includeDeleted?: boolean } = {},
) {
  const query: Record<string, unknown> = { roomId };

  if (!options.includeDeleted) {
    query.isDeleted = false;
  }

  if (options.before) {
    query.createdAt = { $lt: options.before };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

/**
 * Count messages in a room
 */
chatMessageSchema.statics.countByRoomId = function (
  roomId: mongoose.Types.ObjectId | string,
  includeDeleted = false,
) {
  const query: Record<string, unknown> = { roomId };
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  return this.countDocuments(query);
};

/**
 * Get the latest message in a room (for lastMessage cache)
 */
chatMessageSchema.statics.getLatestInRoom = function (roomId: mongoose.Types.ObjectId | string) {
  return this.findOne({ roomId, isDeleted: false }).sort({ createdAt: -1 });
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Soft delete a message
 */
chatMessageSchema.methods.softDelete = function (): Promise<IChatMessage> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

/**
 * Get preview text (truncated for lastMessage cache)
 */
chatMessageSchema.methods.getPreview = function (maxLength = 100): string {
  if (this.type === ChatMessageType.TEXT && this.text) {
    return this.text.length > maxLength ? `${this.text.substring(0, maxLength - 3)}...` : this.text;
  }
  if (this.type === ChatMessageType.FILE && this.files?.length) {
    return `📎 ${this.files.length} file(s)`;
  }
  if (this.type === ChatMessageType.EVENT && this.event) {
    return this.event.summary;
  }
  return '';
};

// ============================================
// EXPORT
// ============================================

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
