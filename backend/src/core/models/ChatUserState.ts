// src/core/models/ChatUserState.ts
// @spec: specs/messaging/messaging-data-models_spec.md
// @covers AC-DM-070 through AC-DM-081, AC-DM-096

import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

// ============================================
// INTERFACE (AC-DM-070 through AC-DM-081)
// ============================================

export interface IChatUserState extends Document {
  _id: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId; // AC-DM-070
  userId: mongoose.Types.ObjectId; // AC-DM-071
  hubId?: mongoose.Types.ObjectId; // AC-DM-072
  unreadCount: number; // AC-DM-074
  lastReadMessageId?: mongoose.Types.ObjectId; // AC-DM-075
  lastReadAt?: Date; // AC-DM-076
  isArchived: boolean; // AC-DM-077
  isMuted: boolean; // AC-DM-078
  isPinned: boolean; // AC-DM-079
  hasViewed: boolean; // AC-DM-080
  updatedAt: Date; // AC-DM-081
}

// ============================================
// SCHEMA
// ============================================

const chatUserStateSchema = new Schema<IChatUserState>(
  {
    // AC-DM-070
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
    },

    // AC-DM-071
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // AC-DM-072
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
    },

    // AC-DM-074
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // AC-DM-075
    lastReadMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatMessage',
    },

    // AC-DM-076
    lastReadAt: {
      type: Date,
    },

    // AC-DM-077
    isArchived: {
      type: Boolean,
      default: false,
    },

    // AC-DM-078
    isMuted: {
      type: Boolean,
      default: false,
    },

    // AC-DM-079
    isPinned: {
      type: Boolean,
      default: false,
    },

    // AC-DM-080
    hasViewed: {
      type: Boolean,
      default: false,
    },
  },
  {
    // AC-DM-081: updatedAt timestamp
    timestamps: { createdAt: false, updatedAt: true },
    toJSON: {
      transform: (_doc, ret) => {
        const { __v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// ============================================
// INDEXES (AC-DM-073, AC-DM-096)
// ============================================

// AC-DM-073: Unique compound index - one state per user per room
chatUserStateSchema.index({ roomId: 1, userId: 1 }, { unique: true });

// AC-DM-096: Inbox filtering by user and archive status
chatUserStateSchema.index({ userId: 1, isArchived: 1 });

// For hub team inbox filtering
chatUserStateSchema.index({ hubId: 1, isArchived: 1 });

// For finding pinned chats
chatUserStateSchema.index({ userId: 1, isPinned: 1 });

// For unread count queries
chatUserStateSchema.index({ userId: 1, unreadCount: 1 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find or create user state for a room
 */
chatUserStateSchema.statics.findOrCreate = async function (
  roomId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  hubId?: mongoose.Types.ObjectId | string,
): Promise<IChatUserState> {
  let state = await this.findOne({ roomId, userId });

  if (!state) {
    state = await this.create({
      roomId,
      userId,
      hubId,
      unreadCount: 0,
      isArchived: false,
      isMuted: false,
      isPinned: false,
      hasViewed: false,
    });
  }

  return state;
};

/**
 * Get user states for inbox
 */
chatUserStateSchema.statics.getInbox = function (
  userId: mongoose.Types.ObjectId | string,
  options: { includeArchived?: boolean; pinnedFirst?: boolean } = {},
) {
  const query: Record<string, unknown> = { userId };

  if (!options.includeArchived) {
    query.isArchived = false;
  }

  const sort: Record<string, number> = {};
  if (options.pinnedFirst) {
    sort.isPinned = -1;
  }
  sort.updatedAt = -1;

  return this.find(query).sort(sort);
};

/**
 * Get total unread count for a user
 */
chatUserStateSchema.statics.getTotalUnreadCount = async function (
  userId: mongoose.Types.ObjectId | string,
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId.toString()),
        isArchived: false,
        isMuted: false,
      },
    },
    { $group: { _id: null, total: { $sum: '$unreadCount' } } },
  ]);

  return result.length > 0 ? result[0].total : 0;
};

/**
 * Increment unread count for all participants except sender
 */
chatUserStateSchema.statics.incrementUnreadForRoom = async function (
  roomId: mongoose.Types.ObjectId | string,
  excludeUserId: mongoose.Types.ObjectId | string,
): Promise<void> {
  await this.updateMany(
    {
      roomId,
      userId: { $ne: excludeUserId },
    },
    {
      $inc: { unreadCount: 1 },
    },
  );
};

/**
 * Mark room as read for a user
 */
chatUserStateSchema.statics.markAsRead = async function (
  roomId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  lastMessageId?: mongoose.Types.ObjectId | string,
): Promise<IChatUserState | null> {
  return this.findOneAndUpdate(
    { roomId, userId },
    {
      unreadCount: 0,
      lastReadAt: new Date(),
      lastReadMessageId: lastMessageId,
      hasViewed: true,
    },
    { new: true },
  );
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Archive this chat for the user
 */
chatUserStateSchema.methods.archive = function (): Promise<IChatUserState> {
  this.isArchived = true;
  return this.save();
};

/**
 * Unarchive this chat for the user
 */
chatUserStateSchema.methods.unarchive = function (): Promise<IChatUserState> {
  this.isArchived = false;
  return this.save();
};

/**
 * Toggle mute status
 */
chatUserStateSchema.methods.toggleMute = function (): Promise<IChatUserState> {
  this.isMuted = !this.isMuted;
  return this.save();
};

/**
 * Toggle pin status
 */
chatUserStateSchema.methods.togglePin = function (): Promise<IChatUserState> {
  this.isPinned = !this.isPinned;
  return this.save();
};

// ============================================
// EXPORT
// ============================================

export const ChatUserState = mongoose.model<IChatUserState>('ChatUserState', chatUserStateSchema);
