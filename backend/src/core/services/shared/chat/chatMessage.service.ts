// src/core/services/shared/chat/chatMessage.service.ts
// @spec: specs/messaging/messaging-send-receive_spec.md
// @covers AC-SR-001 through AC-SR-056

import {
  ChatMessage,
  ChatMessageType,
  type IChatMessage,
  type IChatMessageSender,
} from '@core/models/ChatMessage';
import { ChatRoom, ChatRoomStatus } from '@core/models/ChatRoom';
import { ChatUserState } from '@core/models/ChatUserState';
import {
  broadcastMessageDeleted,
  broadcastNewMessage,
  broadcastTotalUnreadUpdate,
  broadcastUnreadUpdate,
  type ChatMessagePayload,
} from '@core/websocket';
import mongoose from 'mongoose';
import { chatParticipantService } from './chatParticipant.service';

// ============================================
// TYPES
// ============================================

interface ChatFileInput {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl?: string;
}

interface SendMessageParams {
  roomId: mongoose.Types.ObjectId | string;
  senderId: mongoose.Types.ObjectId | string;
  senderHubId?: mongoose.Types.ObjectId | string;
  senderName: string;
  senderAvatar?: string;
  senderType: 'LEARNER' | 'HUB_TEAM';
  text?: string;
  files?: ChatFileInput[];
}

interface GetMessagesParams {
  roomId: mongoose.Types.ObjectId | string;
  cursor?: mongoose.Types.ObjectId | string;
  limit?: number;
}

interface GetMessagesResult {
  messages: IChatMessage[];
  hasMore: boolean;
  cursor?: string;
}

interface DeleteMessageParams {
  messageId: mongoose.Types.ObjectId | string;
  deletedBy: mongoose.Types.ObjectId | string;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_MESSAGE_LENGTH = 10000; // AC-SR-020
const DELETE_WINDOW_HOURS = 24; // AC-SR-053
const DEFAULT_PAGE_SIZE = 20; // AC-SR-041

// ============================================
// SERVICE CLASS
// ============================================

class ChatMessageService {
  /**
   * Send a text message with optional file attachments
   * @covers AC-SR-001 through AC-SR-010
   */
  async sendMessage(params: SendMessageParams): Promise<IChatMessage> {
    const { roomId, senderId, senderHubId, senderName, senderAvatar, senderType, text, files } =
      params;

    // Validate room exists and is active
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // AC-SR-004: Room must be active
    if (room.status !== ChatRoomStatus.ACTIVE) {
      throw new Error('Cannot send messages to a closed room');
    }

    // AC-SR-001, AC-SR-002, AC-SR-003: Check if user can send messages
    const canSend = await chatParticipantService.canSendMessage(roomId, senderId);
    if (!canSend) {
      throw new Error('You must join the conversation to send messages');
    }

    // AC-SR-021: Validate message has content (text or files)
    const trimmedText = text?.trim() || '';
    const hasFiles = files && files.length > 0;

    if (!trimmedText && !hasFiles) {
      throw new Error('Message must contain text or file attachments');
    }

    // AC-SR-020: Validate message length
    if (trimmedText.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
    }

    // Validate files if provided
    if (hasFiles) {
      if (files.length > 10) {
        throw new Error('Maximum 10 files allowed per message');
      }
      for (const file of files) {
        if (file.sizeBytes > 52428800) {
          // 50MB
          throw new Error(`File "${file.name}" exceeds maximum size of 50MB`);
        }
      }
    }

    // AC-SR-022: Sanitize text (basic - strip dangerous patterns)
    const sanitizedText = trimmedText ? this.sanitizeText(trimmedText) : undefined;

    // Determine message type based on content
    const messageType = hasFiles ? ChatMessageType.FILE : ChatMessageType.TEXT;

    // AC-SR-005, AC-SR-006: Create message
    const sender: IChatMessageSender = {
      userId: new mongoose.Types.ObjectId(senderId.toString()),
      hubId: senderHubId ? new mongoose.Types.ObjectId(senderHubId.toString()) : undefined,
      name: senderName,
      avatar: senderAvatar,
      type: senderType,
    };

    // AC-SR-007: Server timestamp
    const message = await ChatMessage.create({
      roomId: new mongoose.Types.ObjectId(roomId.toString()),
      sender,
      type: messageType,
      text: sanitizedText,
      files: hasFiles ? files : undefined,
      isDeleted: false,
    });

    // AC-SR-008: Update room's lastMessage cache
    await this.updateLastMessageCache(roomId, message);

    // AC-SR-009: Increment room's messageCount
    await ChatRoom.findByIdAndUpdate(roomId, {
      $inc: { messageCount: 1 },
    });

    // AC-SR-010: Increment unreadCount for all OTHER participants
    await ChatUserState.updateMany(
      {
        roomId: new mongoose.Types.ObjectId(roomId.toString()),
        userId: { $ne: new mongoose.Types.ObjectId(senderId.toString()) },
      },
      {
        $inc: { unreadCount: 1 },
      },
    );

    // AC-RT-030, AC-RT-031, AC-RT-032: Broadcast new message via Socket.IO
    const messagePayload: ChatMessagePayload = {
      _id: message._id.toString(),
      roomId: message.roomId.toString(),
      sender: {
        userId: message.sender.userId.toString(),
        hubId: message.sender.hubId?.toString(),
        name: message.sender.name,
        avatar: message.sender.avatar,
        type: message.sender.type,
      },
      type: message.type,
      text: message.text,
      files: message.files,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.createdAt.toISOString(), // Use createdAt since updatedAt is disabled
    };
    broadcastNewMessage(roomId.toString(), messagePayload);

    // AC-RT-050, AC-RT-051: Broadcast unread updates to other participants
    void this.broadcastUnreadUpdates(roomId.toString(), senderId.toString());

    return message;
  }

  /**
   * Get messages with pagination
   * @covers AC-SR-040 through AC-SR-046
   */
  async getMessages(params: GetMessagesParams): Promise<GetMessagesResult> {
    const { roomId, cursor, limit = DEFAULT_PAGE_SIZE } = params;

    // Build query
    const query: Record<string, unknown> = {
      roomId: new mongoose.Types.ObjectId(roomId.toString()),
    };

    // AC-SR-043: Cursor-based pagination
    if (cursor) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor.toString()) };
    }

    // AC-SR-042: Order by createdAt descending
    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    // AC-SR-046: Determine if there are more pages
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    // AC-SR-044, AC-SR-045: Transform deleted messages
    const transformedMessages = messages.map((msg) => {
      if (msg.isDeleted) {
        return {
          ...msg,
          text: undefined, // AC-SR-045 - use undefined instead of null for type compatibility
        };
      }
      return msg;
    }) as unknown as IChatMessage[];

    // Get cursor for next page
    const lastMessage = messages[messages.length - 1];
    const nextCursor = lastMessage?._id?.toString();

    return {
      messages: transformedMessages,
      hasMore,
      cursor: nextCursor,
    };
  }

  /**
   * Get a single message by ID
   */
  async getById(messageId: mongoose.Types.ObjectId | string): Promise<IChatMessage | null> {
    return ChatMessage.findById(messageId);
  }

  /**
   * Soft delete a message
   * @covers AC-SR-050 through AC-SR-056
   */
  async deleteMessage(params: DeleteMessageParams): Promise<void> {
    const { messageId, deletedBy } = params;

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // AC-SR-050: Only sender can delete
    if (message.sender.userId.toString() !== deletedBy.toString()) {
      throw new Error('You can only delete your own messages');
    }

    // Check if already deleted
    if (message.isDeleted) {
      throw new Error('Message already deleted');
    }

    // AC-SR-053, AC-SR-054: Check 24-hour window
    const hoursSinceCreation = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > DELETE_WINDOW_HOURS) {
      throw new Error('Messages can only be deleted within 24 hours of sending');
    }

    // AC-SR-051, AC-SR-052: Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    // AC-SR-056: If deleted message was lastMessage, update to previous
    const room = await ChatRoom.findById(message.roomId);
    if (room?.lastMessage?._id?.toString() === messageId.toString()) {
      await this.updateLastMessageCacheFromPrevious(message.roomId);
    }

    // AC-RT-034, AC-RT-035: Broadcast message_deleted to room via Socket.IO
    broadcastMessageDeleted(message.roomId.toString(), messageId.toString());
  }

  /**
   * Update room's lastMessage cache
   * @covers AC-SR-008
   */
  async updateLastMessageCache(
    roomId: mongoose.Types.ObjectId | string,
    message: IChatMessage,
  ): Promise<void> {
    const preview = this.getMessagePreview(message);

    await ChatRoom.findByIdAndUpdate(roomId, {
      lastMessage: {
        _id: message._id,
        preview,
        sentAt: message.createdAt,
        senderName: message.sender.name,
      },
    });
  }

  /**
   * Update lastMessage cache from previous message (after deletion)
   * @covers AC-SR-056
   */
  private async updateLastMessageCacheFromPrevious(roomId: mongoose.Types.ObjectId): Promise<void> {
    // Find the most recent non-deleted message
    const previousMessage = await ChatMessage.findOne({
      roomId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    if (previousMessage) {
      await this.updateLastMessageCache(roomId, previousMessage);
    } else {
      // No messages left, clear lastMessage
      await ChatRoom.findByIdAndUpdate(roomId, {
        $unset: { lastMessage: 1 },
      });
    }
  }

  /**
   * Get message preview (truncated for lastMessage cache)
   */
  private getMessagePreview(message: IChatMessage, maxLength = 100): string {
    if (message.type === ChatMessageType.TEXT && message.text) {
      return message.text.length > maxLength
        ? `${message.text.substring(0, maxLength - 3)}...`
        : message.text;
    }
    if (message.type === ChatMessageType.FILE && message.files?.length) {
      return `📎 ${message.files.length} file(s)`;
    }
    if (message.type === ChatMessageType.EVENT && message.event) {
      return message.event.summary;
    }
    return '';
  }

  /**
   * Sanitize text (basic HTML stripping)
   * @covers AC-SR-022
   */
  private sanitizeText(text: string): string {
    // Remove script tags and event handlers
    let sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
    sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');

    // Keep basic formatting (newlines, etc.)
    // AC-SR-023, AC-SR-024: URLs and emoji are preserved as-is
    return sanitized;
  }

  /**
   * Count messages in a room
   */
  async countByRoomId(
    roomId: mongoose.Types.ObjectId | string,
    includeDeleted = false,
  ): Promise<number> {
    const query: Record<string, unknown> = {
      roomId: new mongoose.Types.ObjectId(roomId.toString()),
    };
    if (!includeDeleted) {
      query.isDeleted = false;
    }
    return ChatMessage.countDocuments(query);
  }

  /**
   * Mark messages as read for a user
   */
  async markAsRead(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
  ): Promise<void> {
    // Get the latest message
    const latestMessage = await ChatMessage.findOne({
      roomId: new mongoose.Types.ObjectId(roomId.toString()),
    }).sort({ createdAt: -1 });

    await ChatUserState.findOneAndUpdate(
      {
        roomId: new mongoose.Types.ObjectId(roomId.toString()),
        userId: new mongoose.Types.ObjectId(userId.toString()),
      },
      {
        unreadCount: 0,
        lastReadAt: new Date(),
        lastReadMessageId: latestMessage?._id,
        hasViewed: true,
      },
    );
  }

  /**
   * Get unread count for a user in a room
   */
  async getUnreadCount(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
  ): Promise<number> {
    const state = await ChatUserState.findOne({
      roomId: new mongoose.Types.ObjectId(roomId.toString()),
      userId: new mongoose.Types.ObjectId(userId.toString()),
    });
    return state?.unreadCount || 0;
  }

  /**
   * Get total unread count for a user across all rooms
   */
  async getTotalUnreadCount(userId: mongoose.Types.ObjectId | string): Promise<number> {
    const result = await ChatUserState.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId.toString()),
          isArchived: false,
          isMuted: false,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$unreadCount' },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Broadcast unread updates to all participants except sender
   * @covers AC-RT-050, AC-RT-051, AC-RT-053
   */
  private async broadcastUnreadUpdates(roomId: string, senderId: string): Promise<void> {
    try {
      // Get all participants' unread counts
      const userStates = await ChatUserState.find({
        roomId: new mongoose.Types.ObjectId(roomId),
        userId: { $ne: new mongoose.Types.ObjectId(senderId) },
      }).lean();

      // Broadcast to each participant
      for (const state of userStates) {
        const userId = state.userId.toString();
        broadcastUnreadUpdate(userId, roomId, state.unreadCount);

        // AC-RT-053: Also send total unread count
        const totalUnread = await this.getTotalUnreadCount(userId);
        broadcastTotalUnreadUpdate(userId, totalUnread);
      }
    } catch (error) {
      console.error('[ChatMessage] Error broadcasting unread updates:', error);
    }
  }
}

// Export singleton instance
export const chatMessageService = new ChatMessageService();
