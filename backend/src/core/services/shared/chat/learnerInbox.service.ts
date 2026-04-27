// src/core/services/shared/chat/learnerInbox.service.ts
// @spec: specs/messaging/messaging-learner-inbox_spec.md
// @covers AC-LI-001 through AC-LI-040

import { ChatMessage, type IChatMessage } from '@core/models/ChatMessage';
import {
  ChatParticipantStatus,
  ChatRoom,
  ChatRoomStatus,
  type IChatRoom,
} from '@core/models/ChatRoom';
import { ChatUserState } from '@core/models/ChatUserState';
import mongoose from 'mongoose';

// ============================================
// TYPES
// ============================================

export interface LearnerRoomParticipant {
  userId: mongoose.Types.ObjectId;
  name: string;
  avatar?: string;
  type: 'LEARNER' | 'HUB_TEAM';
  status: string;
}

export interface LearnerRoomListItem {
  _id: mongoose.Types.ObjectId;
  contextType: string;
  contextSnapshot: {
    title: string;
    image?: string;
  };
  hubSnapshot: {
    name: string;
    logo?: string;
  };
  lastMessage?: {
    preview: string;
    sentAt: Date;
    senderName: string;
  };
  unreadCount: number;
  status: string;
  participants: LearnerRoomParticipant[];
}

export interface LearnerRoomDetail {
  _id: mongoose.Types.ObjectId;
  contextType: string;
  contextSnapshot: {
    title: string;
    image?: string;
    status?: string;
  };
  hubSnapshot: {
    name: string;
    logo?: string;
  };
  participants: Array<{
    type: 'LEARNER' | 'HUB_TEAM';
    name: string;
    isCurrentUser?: boolean;
  }>;
  mySettings: {
    unreadCount: number;
    isArchived: boolean;
    isMuted: boolean;
  };
  status: string;
}

export interface LearnerMessage {
  _id: mongoose.Types.ObjectId;
  sender: {
    name: string;
    type: 'LEARNER' | 'HUB_TEAM';
    avatar?: string;
  };
  type: string;
  text?: string | null;
  files?: unknown[];
  event?: unknown;
  createdAt: Date;
  isDeleted: boolean;
}

export interface GetLearnerRoomsParams {
  userId: mongoose.Types.ObjectId | string;
  cursor?: mongoose.Types.ObjectId | string;
  limit?: number;
}

export interface GetLearnerRoomsResult {
  rooms: LearnerRoomListItem[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
  };
}

// ============================================
// SERVICE CLASS
// ============================================

class LearnerInboxService {
  /**
   * Get rooms for learner
   * @covers AC-LI-001 through AC-LI-008
   */
  async getRooms(params: GetLearnerRoomsParams): Promise<GetLearnerRoomsResult> {
    const { userId, cursor, limit = 20 } = params;

    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    // Get user's ChatUserState records (non-archived)
    const userStates = await ChatUserState.find({
      userId: userObjectId,
      isArchived: { $ne: true },
    })
      .select('roomId unreadCount')
      .lean();

    const roomIds = userStates.map((s) => s.roomId);
    const unreadMap = new Map(userStates.map((s) => [s.roomId.toString(), s.unreadCount]));

    // Build room query
    const query: Record<string, unknown> = {
      _id: { $in: roomIds },
      status: ChatRoomStatus.ACTIVE,
    };

    // Cursor-based pagination
    if (cursor) {
      const cursorRoom = await ChatRoom.findById(cursor);
      if (cursorRoom?.lastMessage?.sentAt) {
        query['lastMessage.sentAt'] = { $lt: cursorRoom.lastMessage.sentAt };
      }
    }

    // AC-LI-007: Sort by lastMessage.sentAt descending
    const rooms = await ChatRoom.find(query)
      .sort({ 'lastMessage.sentAt': -1 })
      .limit(limit + 1)
      .lean<IChatRoom[]>();

    const hasMore = rooms.length > limit;
    if (hasMore) {
      rooms.pop();
    }

    // AC-LI-002, AC-LI-003, AC-LI-004, AC-LI-005: Transform for learner view
    const roomItems: LearnerRoomListItem[] = rooms.map((room) => {
      // AC-LI-002: Transform hub member sender to hub name
      const lastMessage = room.lastMessage
        ? {
            preview: room.lastMessage.preview,
            sentAt: room.lastMessage.sentAt,
            // If sender is hub team, show hub name instead
            senderName: this.isHubTeamSender(room.lastMessage.senderName, room)
              ? room.hubSnapshot.name
              : room.lastMessage.senderName,
          }
        : undefined;

      return {
        _id: room._id,
        contextType: room.contextType,
        contextSnapshot: {
          title: room.contextSnapshot.title,
          image: room.contextSnapshot.image,
        },
        hubSnapshot: room.hubSnapshot,
        lastMessage,
        unreadCount: unreadMap.get(room._id.toString()) || 0,
        status: room.status,
        participants: room.participants.map((p) => ({
          userId: p.userId,
          name: p.type === 'HUB_TEAM' ? room.hubSnapshot.name : p.name,
          avatar: p.type === 'LEARNER' ? p.avatar : undefined,
          type: p.type,
          status: p.status,
        })),
      };
    });

    const lastRoom = rooms[rooms.length - 1];
    const nextCursor = lastRoom?._id?.toString();

    return {
      rooms: roomItems,
      pagination: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  /**
   * Get room detail for learner
   * @covers AC-LI-010 through AC-LI-013
   */
  async getRoomDetail(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
  ): Promise<LearnerRoomDetail | null> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return null;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    // AC-LI-010: Verify learner is participant
    const isParticipant = room.participantIds.some((id) => id.toString() === userId.toString());
    if (!isParticipant) {
      return null;
    }

    // Get user state
    const userState = await ChatUserState.findOne({
      roomId: room._id,
      userId: userObjectId,
    });

    // AC-LI-011, AC-LI-012: Transform participants for privacy
    const participants: LearnerRoomDetail['participants'] = [];

    // Add learner
    const learner = room.participants.find((p) => p.type === 'LEARNER');
    if (learner) {
      participants.push({
        type: 'LEARNER',
        name: learner.name,
        isCurrentUser: learner.userId.toString() === userId.toString(),
      });
    }

    // AC-LI-012: Hub team members shown as hub name
    const hasHubTeam = room.participants.some(
      (p) => p.type === 'HUB_TEAM' && p.status === ChatParticipantStatus.JOINED,
    );
    if (hasHubTeam) {
      participants.push({
        type: 'HUB_TEAM',
        name: room.hubSnapshot.name,
      });
    }

    return {
      _id: room._id,
      contextType: room.contextType,
      contextSnapshot: room.contextSnapshot,
      hubSnapshot: room.hubSnapshot,
      participants,
      mySettings: {
        unreadCount: userState?.unreadCount || 0,
        isArchived: userState?.isArchived || false,
        isMuted: userState?.isMuted || false,
      },
      status: room.status,
    };
  }

  /**
   * Get messages with privacy transform
   * @covers AC-LI-020 through AC-LI-023
   */
  async getMessages(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
    cursor?: mongoose.Types.ObjectId | string,
    limit = 20,
  ): Promise<{
    messages: LearnerMessage[];
    hasMore: boolean;
    cursor?: string;
  }> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Verify access
    const isParticipant = room.participantIds.some((id) => id.toString() === userId.toString());
    if (!isParticipant) {
      throw new Error('Access denied');
    }

    // Build query
    const query: Record<string, unknown> = {
      roomId: new mongoose.Types.ObjectId(roomId.toString()),
    };

    if (cursor) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor.toString()) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean<IChatMessage[]>();

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    // AC-LI-020, AC-LI-021, AC-LI-022, AC-LI-023: Transform messages
    const transformedMessages: LearnerMessage[] = messages.map((msg) =>
      this.transformMessageForLearner(msg, room, userId.toString()),
    );

    const lastMsg = messages[messages.length - 1];
    const nextCursor = lastMsg?._id?.toString();

    return {
      messages: transformedMessages,
      hasMore,
      cursor: nextCursor,
    };
  }

  /**
   * Get total unread count for learner
   * @covers AC-LI-040
   */
  async getTotalUnreadCount(userId: mongoose.Types.ObjectId | string): Promise<number> {
    const result = await ChatUserState.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId.toString()),
          isArchived: { $ne: true },
          isMuted: { $ne: true },
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
   * Update settings for learner
   * @covers AC-LI-032
   */
  async updateSettings(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
    settings: { isArchived?: boolean; isMuted?: boolean },
  ): Promise<void> {
    const update: Record<string, unknown> = {};

    if (settings.isArchived !== undefined) {
      update.isArchived = settings.isArchived;
    }
    if (settings.isMuted !== undefined) {
      update.isMuted = settings.isMuted;
    }

    if (Object.keys(update).length > 0) {
      await ChatUserState.findOneAndUpdate(
        {
          roomId: new mongoose.Types.ObjectId(roomId.toString()),
          userId: new mongoose.Types.ObjectId(userId.toString()),
        },
        { $set: update },
      );
    }
  }

  /**
   * Transform message for learner view
   * @covers AC-LI-020 through AC-LI-023
   */
  private transformMessageForLearner(
    message: IChatMessage,
    room: IChatRoom,
    userId: string,
  ): LearnerMessage {
    const isOwnMessage = message.sender.userId.toString() === userId;

    // Handle deleted messages
    if (message.isDeleted) {
      return {
        _id: message._id,
        sender: {
          name: isOwnMessage ? message.sender.name : room.hubSnapshot.name,
          type: message.sender.type as 'LEARNER' | 'HUB_TEAM',
        },
        type: message.type,
        text: null, // Hide deleted message text
        createdAt: message.createdAt,
        isDeleted: true,
      };
    }

    // AC-LI-021, AC-LI-022: Transform hub team sender
    if (message.sender.type === 'HUB_TEAM') {
      return {
        _id: message._id,
        sender: {
          type: 'HUB_TEAM',
          name: room.hubSnapshot.name, // Show hub name, not individual
          // No avatar or email for hub team
        },
        type: message.type,
        text: message.text,
        files: message.files,
        event: message.event,
        createdAt: message.createdAt,
        isDeleted: false,
      };
    }

    // AC-LI-023: Learner's own messages show actual name
    return {
      _id: message._id,
      sender: {
        type: 'LEARNER',
        name: message.sender.name,
        avatar: message.sender.avatar,
      },
      type: message.type,
      text: message.text,
      files: message.files,
      event: message.event,
      createdAt: message.createdAt,
      isDeleted: false,
    };
  }

  /**
   * Check if sender is hub team (for lastMessage privacy)
   */
  private isHubTeamSender(senderName: string, room: IChatRoom): boolean {
    // Check if the sender name matches any hub team participant
    return room.participants.some(
      (p) => p.type === 'HUB_TEAM' && (p.name === senderName || p.email === senderName),
    );
  }
}

// Export singleton instance
export const learnerInboxService = new LearnerInboxService();
