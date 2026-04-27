// src/core/models/ChatRoom.ts
// @spec: specs/messaging/messaging-data-models_spec.md
// @covers AC-DM-001 through AC-DM-016, AC-DM-020 through AC-DM-031, AC-DM-090 through AC-DM-093

import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

// ============================================
// ENUMS (AC-DM-001, AC-DM-014, AC-DM-015, AC-DM-024, AC-DM-026)
// ============================================

export enum ChatContextType {
  HUB = 'HUB', // General hub inquiry
  EXPERTISE = 'EXPERTISE', // Expertise inquiry
  EXPERIENCE = 'EXPERIENCE', // Experience inquiry
  BOOKING = 'BOOKING', // Booking conversation
  JOB = 'JOB', // Job inquiry
  PROPOSAL = 'PROPOSAL', // Proposal conversation
  CONTRACT = 'CONTRACT', // Contract conversation
  GENERAL = 'GENERAL', // General conversation
}

export enum ChatRoomStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum ChatInitiatedBy {
  LEARNER = 'LEARNER',
  HUB = 'HUB',
}

export enum ChatParticipantType {
  LEARNER = 'LEARNER',
  HUB_TEAM = 'HUB_TEAM',
}

export enum ChatParticipantStatus {
  JOINED = 'JOINED',
  LEFT = 'LEFT',
}

// ============================================
// INTERFACES
// ============================================

// AC-DM-020 through AC-DM-031
export interface IChatParticipant {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  avatar?: string;
  type: ChatParticipantType;
  hubId?: mongoose.Types.ObjectId;
  status: ChatParticipantStatus;
  isAssigned: boolean;
  joinedAt: Date;
  leftAt?: Date;
  assignedAt?: Date;
  assignedBy?: mongoose.Types.ObjectId;
}

// AC-DM-001 through AC-DM-016
export interface IChatRoom extends Document {
  _id: mongoose.Types.ObjectId;

  // Context (AC-DM-001, AC-DM-002, AC-DM-003)
  contextType: ChatContextType;
  contextId?: mongoose.Types.ObjectId;
  contextSnapshot: {
    title: string;
    image?: string;
    status?: string;
  };

  // Hub side (AC-DM-004, AC-DM-005)
  hubId: mongoose.Types.ObjectId;
  hubSnapshot: {
    name: string;
    logo?: string;
  };

  // Learner side (AC-DM-006, AC-DM-007)
  learnerId?: mongoose.Types.ObjectId;
  learnerSnapshot?: {
    name: string;
    email: string;
    avatar?: string;
  };

  // Other hub for hub-to-hub (AC-DM-008, AC-DM-009)
  otherHubId?: mongoose.Types.ObjectId;
  otherHubSnapshot?: {
    name: string;
    logo?: string;
  };

  // Participants (AC-DM-010, AC-DM-011)
  participants: IChatParticipant[];
  participantIds: mongoose.Types.ObjectId[];

  // Last message cache (AC-DM-012, AC-DM-013)
  lastMessage?: {
    _id: mongoose.Types.ObjectId;
    preview: string;
    sentAt: Date;
    senderName: string;
  };
  messageCount: number;

  // Metadata (AC-DM-014, AC-DM-015, AC-DM-016)
  initiatedBy: ChatInitiatedBy;
  status: ChatRoomStatus;
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

// ============================================
// SCHEMAS
// ============================================

// ChatParticipant embedded schema (AC-DM-020 through AC-DM-031)
const chatParticipantSchema = new Schema(
  {
    // AC-DM-020
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // AC-DM-021
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // AC-DM-022
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    // AC-DM-023
    avatar: {
      type: String,
    },
    // AC-DM-024
    type: {
      type: String,
      enum: Object.values(ChatParticipantType),
      required: true,
    },
    // AC-DM-025
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
    },
    // AC-DM-026
    status: {
      type: String,
      enum: Object.values(ChatParticipantStatus),
      default: ChatParticipantStatus.JOINED,
    },
    // AC-DM-027
    isAssigned: {
      type: Boolean,
      default: false,
    },
    // AC-DM-028
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // AC-DM-029
    leftAt: {
      type: Date,
    },
    // AC-DM-030
    assignedAt: {
      type: Date,
    },
    // AC-DM-031
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false },
);

// ChatRoom schema (AC-DM-001 through AC-DM-016)
const chatRoomSchema = new Schema<IChatRoom>(
  {
    // Context (AC-DM-001, AC-DM-002, AC-DM-003)
    contextType: {
      type: String,
      enum: Object.values(ChatContextType),
      required: true,
    },
    contextId: {
      type: Schema.Types.ObjectId,
    },
    contextSnapshot: {
      title: { type: String, required: true },
      image: { type: String },
      status: { type: String },
    },

    // Hub side (AC-DM-004, AC-DM-005)
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true, // AC-DM-090
    },
    hubSnapshot: {
      name: { type: String, required: true },
      logo: { type: String },
    },

    // Learner side (AC-DM-006, AC-DM-007)
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    learnerSnapshot: {
      name: { type: String },
      email: { type: String },
      avatar: { type: String },
    },

    // Other hub (AC-DM-008, AC-DM-009)
    otherHubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
    },
    otherHubSnapshot: {
      name: { type: String },
      logo: { type: String },
    },

    // Participants (AC-DM-010, AC-DM-011)
    participants: {
      type: [chatParticipantSchema],
      default: [],
    },
    participantIds: {
      type: [Schema.Types.ObjectId],
      default: [],
      index: true, // AC-DM-091
    },

    // Last message cache (AC-DM-012, AC-DM-013)
    lastMessage: {
      _id: { type: Schema.Types.ObjectId },
      preview: { type: String, maxlength: 100 },
      sentAt: { type: Date },
      senderName: { type: String },
    },
    messageCount: {
      type: Number,
      default: 0,
    },

    // Metadata (AC-DM-014, AC-DM-015, AC-DM-016)
    initiatedBy: {
      type: String,
      enum: Object.values(ChatInitiatedBy),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ChatRoomStatus),
      default: ChatRoomStatus.ACTIVE,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const { __v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// ============================================
// INDEXES (AC-DM-090 through AC-DM-093)
// ============================================

// AC-DM-092: Duplicate prevention - unique chat per context
chatRoomSchema.index({ contextType: 1, contextId: 1 });

// AC-DM-093: Sorting by last message
chatRoomSchema.index({ 'lastMessage.sentAt': -1 });

// Compound index for hub inbox queries (hubId + status + sort)
chatRoomSchema.index({ hubId: 1, status: 1, 'lastMessage.sentAt': -1 });

// Compound index for learner inbox queries
chatRoomSchema.index({ learnerId: 1, status: 1, 'lastMessage.sentAt': -1 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find rooms by hub ID
 */
chatRoomSchema.statics.findByHubId = function (
  hubId: mongoose.Types.ObjectId | string,
  status?: ChatRoomStatus,
) {
  const query: Record<string, unknown> = { hubId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ 'lastMessage.sentAt': -1 });
};

/**
 * Find rooms by participant user ID
 */
chatRoomSchema.statics.findByParticipantId = function (
  userId: mongoose.Types.ObjectId | string,
  status?: ChatRoomStatus,
) {
  const query: Record<string, unknown> = { participantIds: userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ 'lastMessage.sentAt': -1 });
};

/**
 * Find room by context (to prevent duplicates)
 */
chatRoomSchema.statics.findByContext = function (
  contextType: ChatContextType,
  contextId: mongoose.Types.ObjectId | string,
) {
  return this.findOne({ contextType, contextId });
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if room is active
 */
chatRoomSchema.methods.isActive = function (): boolean {
  return this.status === ChatRoomStatus.ACTIVE;
};

/**
 * Check if user is a participant
 */
chatRoomSchema.methods.hasParticipant = function (
  userId: mongoose.Types.ObjectId | string,
): boolean {
  return this.participantIds.some(
    (id: mongoose.Types.ObjectId) => id.toString() === userId.toString(),
  );
};

// ============================================
// EXPORT
// ============================================

export const ChatRoom = mongoose.model<IChatRoom>('ChatRoom', chatRoomSchema);
