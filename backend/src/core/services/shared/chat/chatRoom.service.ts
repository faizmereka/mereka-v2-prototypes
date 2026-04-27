// src/core/services/shared/chat/chatRoom.service.ts
// @spec: specs/messaging/messaging-room-lifecycle_spec.md
// @covers AC-RL-001 through AC-RL-053

import { ChatEventEntityType, ChatEventType, ChatMessage } from '@core/models/ChatMessage';
import {
  ChatContextType,
  type ChatInitiatedBy,
  ChatParticipantStatus,
  ChatParticipantType,
  ChatRoom,
  ChatRoomStatus,
  type IChatParticipant,
  type IChatRoom,
} from '@core/models/ChatRoom';
import { ChatUserState } from '@core/models/ChatUserState';
import mongoose from 'mongoose';

// ============================================
// TYPES
// ============================================

interface GetOrCreateRoomParams {
  contextType: ChatContextType;
  contextId?: mongoose.Types.ObjectId | string;
  contextSnapshot: { title: string; image?: string; status?: string };
  hubId: mongoose.Types.ObjectId | string;
  hubSnapshot: { name: string; logo?: string };
  learnerId?: mongoose.Types.ObjectId | string;
  learnerSnapshot?: { name: string; email: string; avatar?: string };
  otherHubId?: mongoose.Types.ObjectId | string;
  otherHubSnapshot?: { name: string; logo?: string };
  initiatedBy: ChatInitiatedBy;
  createdBy: mongoose.Types.ObjectId | string;
}

interface UpgradeContextParams {
  roomId: mongoose.Types.ObjectId | string;
  newContextType: ChatContextType;
  newContextId: mongoose.Types.ObjectId | string;
  newContextSnapshot: { title: string; image?: string; status?: string };
  upgradedBy: mongoose.Types.ObjectId | string;
}

interface FindByHubParams {
  hubId: mongoose.Types.ObjectId | string;
  filter?: 'ALL' | 'ASSIGNED' | 'UNASSIGNED' | 'ARCHIVED';
  userId?: mongoose.Types.ObjectId | string;
  status?: ChatRoomStatus;
  limit?: number;
  cursor?: mongoose.Types.ObjectId | string;
}

interface FindByUserParams {
  userId: mongoose.Types.ObjectId | string;
  includeArchived?: boolean;
  limit?: number;
  cursor?: mongoose.Types.ObjectId | string;
}

// ============================================
// SERVICE CLASS
// ============================================

class ChatRoomService {
  /**
   * Find existing room or create new one
   * @covers AC-RL-001, AC-RL-002, AC-RL-003, AC-RL-022
   */
  async getOrCreateRoom(params: GetOrCreateRoomParams): Promise<IChatRoom> {
    const {
      contextType,
      contextId,
      contextSnapshot,
      hubId,
      hubSnapshot,
      learnerId,
      learnerSnapshot,
      otherHubId,
      otherHubSnapshot,
      initiatedBy,
      createdBy,
    } = params;

    // Build query for finding existing room
    const query: Record<string, unknown> = {
      contextType,
      hubId: new mongoose.Types.ObjectId(hubId.toString()),
    };

    if (contextId) {
      query.contextId = new mongoose.Types.ObjectId(contextId.toString());
    }

    if (learnerId) {
      query.learnerId = new mongoose.Types.ObjectId(learnerId.toString());
    }

    if (otherHubId) {
      query.otherHubId = new mongoose.Types.ObjectId(otherHubId.toString());
    }

    // Try to find existing room first
    // AC-RL-002: If existing room found, return it
    const existingRoom = await ChatRoom.findOne(query);
    if (existingRoom) {
      return existingRoom;
    }

    // AC-RL-003, AC-RL-022: Create new room with upsert to prevent race conditions
    const initialParticipants: IChatParticipant[] = [];
    const participantIds: mongoose.Types.ObjectId[] = [];

    // Add learner as participant if present
    // AC-PT-040: Learner is auto-added as participant
    if (learnerId && learnerSnapshot) {
      const learnerParticipant: IChatParticipant = {
        userId: new mongoose.Types.ObjectId(learnerId.toString()),
        name: learnerSnapshot.name,
        email: learnerSnapshot.email,
        avatar: learnerSnapshot.avatar,
        type: ChatParticipantType.LEARNER,
        status: ChatParticipantStatus.JOINED,
        isAssigned: false,
        joinedAt: new Date(),
      };
      initialParticipants.push(learnerParticipant);
      participantIds.push(new mongoose.Types.ObjectId(learnerId.toString()));
    }

    // Create room document
    const roomData = {
      contextType,
      contextId: contextId ? new mongoose.Types.ObjectId(contextId.toString()) : undefined,
      contextSnapshot,
      hubId: new mongoose.Types.ObjectId(hubId.toString()),
      hubSnapshot,
      learnerId: learnerId ? new mongoose.Types.ObjectId(learnerId.toString()) : undefined,
      learnerSnapshot,
      otherHubId: otherHubId ? new mongoose.Types.ObjectId(otherHubId.toString()) : undefined,
      otherHubSnapshot,
      participants: initialParticipants,
      participantIds,
      messageCount: 0,
      initiatedBy,
      status: ChatRoomStatus.ACTIVE, // AC-RL-040
      createdBy: new mongoose.Types.ObjectId(createdBy.toString()),
    };

    const room = await ChatRoom.create(roomData);

    // Create ChatUserState for initial participants
    for (const participantId of participantIds) {
      await ChatUserState.findOneAndUpdate(
        { roomId: room._id, userId: participantId },
        {
          roomId: room._id,
          userId: participantId,
          unreadCount: 0,
          isArchived: false,
          isMuted: false,
          isPinned: false,
          hasViewed: false,
        },
        { upsert: true, new: true },
      );
    }

    return room;
  }

  /**
   * Upgrade room context (e.g., EXPERTISE → BOOKING)
   * @covers AC-RL-010, AC-RL-012, AC-RL-050, AC-RL-051, AC-RL-052, AC-RL-053
   */
  async upgradeContext(params: UpgradeContextParams): Promise<IChatRoom> {
    const { roomId, newContextType, newContextId, newContextSnapshot, upgradedBy } = params;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const oldContextType = room.contextType;

    // Update context
    room.contextType = newContextType;
    room.contextId = new mongoose.Types.ObjectId(newContextId.toString());
    room.contextSnapshot = newContextSnapshot;

    await room.save();

    // AC-RL-051, AC-RL-053: Create EVENT message for context upgrade
    let eventType: ChatEventType;
    let summary: string;

    if (
      oldContextType === ChatContextType.EXPERTISE &&
      newContextType === ChatContextType.BOOKING
    ) {
      eventType = ChatEventType.BOOKING_REQUESTED;
      summary = `Booking requested for ${newContextSnapshot.title}`;
    } else if (
      oldContextType === ChatContextType.JOB &&
      newContextType === ChatContextType.CONTRACT
    ) {
      eventType = ChatEventType.CONTRACT_STARTED;
      summary = `Contract started: ${newContextSnapshot.title}`;
    } else {
      eventType = ChatEventType.BOOKING_REQUESTED; // Default
      summary = `Context updated to ${newContextType}`;
    }

    await ChatMessage.create({
      roomId: room._id,
      sender: {
        userId: new mongoose.Types.ObjectId(upgradedBy.toString()),
        name: 'System',
        type: 'HUB_TEAM',
      },
      type: 'EVENT',
      event: {
        eventType,
        entityType: newContextType as unknown as ChatEventEntityType,
        entityId: new mongoose.Types.ObjectId(newContextId.toString()),
        summary,
        data: { oldContextType, newContextType },
      },
    });

    return room;
  }

  /**
   * Find room by context
   */
  async findByContext(
    contextType: ChatContextType,
    contextId: mongoose.Types.ObjectId | string,
  ): Promise<IChatRoom | null> {
    return ChatRoom.findOne({
      contextType,
      contextId: new mongoose.Types.ObjectId(contextId.toString()),
    });
  }

  /**
   * Find rooms for a hub (inbox)
   */
  async findByHub(params: FindByHubParams): Promise<{ rooms: IChatRoom[]; hasMore: boolean }> {
    const { hubId, filter = 'ALL', userId, status, limit = 20, cursor } = params;

    const query: Record<string, unknown> = {
      hubId: new mongoose.Types.ObjectId(hubId.toString()),
    };

    if (status) {
      query.status = status;
    } else {
      query.status = ChatRoomStatus.ACTIVE;
    }

    // Handle filter
    if (filter === 'ASSIGNED' && userId) {
      query.participants = {
        $elemMatch: {
          userId: new mongoose.Types.ObjectId(userId.toString()),
          isAssigned: true,
          status: ChatParticipantStatus.JOINED,
        },
      };
    } else if (filter === 'UNASSIGNED') {
      query.participants = {
        $not: {
          $elemMatch: { isAssigned: true, status: ChatParticipantStatus.JOINED },
        },
      };
    }

    // Cursor-based pagination
    if (cursor) {
      const cursorRoom = await ChatRoom.findById(cursor);
      if (cursorRoom?.lastMessage?.sentAt) {
        query['lastMessage.sentAt'] = { $lt: cursorRoom.lastMessage.sentAt };
      }
    }

    const rooms = await ChatRoom.find(query)
      .sort({ 'lastMessage.sentAt': -1 })
      .limit(limit + 1)
      .lean<IChatRoom[]>();

    const hasMore = rooms.length > limit;
    if (hasMore) {
      rooms.pop();
    }

    return { rooms, hasMore };
  }

  /**
   * Find rooms for a user (learner inbox)
   */
  async findByUser(params: FindByUserParams): Promise<{ rooms: IChatRoom[]; hasMore: boolean }> {
    const { userId, includeArchived = false, limit = 20, cursor } = params;

    // First get user's ChatUserState records
    const stateQuery: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId.toString()),
    };

    if (!includeArchived) {
      stateQuery.isArchived = false;
    }

    const userStates = await ChatUserState.find(stateQuery).select('roomId').lean();
    const roomIds = userStates.map((s) => s.roomId);

    const query: Record<string, unknown> = {
      _id: { $in: roomIds },
      status: ChatRoomStatus.ACTIVE,
    };

    if (cursor) {
      const cursorRoom = await ChatRoom.findById(cursor);
      if (cursorRoom?.lastMessage?.sentAt) {
        query['lastMessage.sentAt'] = { $lt: cursorRoom.lastMessage.sentAt };
      }
    }

    const rooms = await ChatRoom.find(query)
      .sort({ 'lastMessage.sentAt': -1 })
      .limit(limit + 1)
      .lean<IChatRoom[]>();

    const hasMore = rooms.length > limit;
    if (hasMore) {
      rooms.pop();
    }

    return { rooms, hasMore };
  }

  /**
   * Get a single room by ID
   */
  async getById(roomId: mongoose.Types.ObjectId | string): Promise<IChatRoom | null> {
    return ChatRoom.findById(roomId);
  }

  /**
   * Close a room
   * @covers AC-RL-041, AC-RL-042
   */
  async closeRoom(
    roomId: mongoose.Types.ObjectId | string,
    closedBy: mongoose.Types.ObjectId | string,
  ): Promise<IChatRoom> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.status = ChatRoomStatus.CLOSED;
    await room.save();

    // Create system event message
    await ChatMessage.create({
      roomId: room._id,
      sender: {
        userId: new mongoose.Types.ObjectId(closedBy.toString()),
        name: 'System',
        type: 'HUB_TEAM',
      },
      type: 'EVENT',
      event: {
        eventType: ChatEventType.CONTRACT_COMPLETED,
        entityType: ChatEventEntityType.CONTRACT,
        entityId: room.contextId || room._id,
        summary: 'Conversation closed',
        data: { closedBy: closedBy.toString() },
      },
    });

    return room;
  }

  /**
   * Reopen a closed room
   * @covers AC-RL-043
   */
  async reopenRoom(
    roomId: mongoose.Types.ObjectId | string,
    reopenedBy: mongoose.Types.ObjectId | string,
  ): Promise<IChatRoom> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== ChatRoomStatus.CLOSED) {
      throw new Error('Room is not closed');
    }

    room.status = ChatRoomStatus.ACTIVE;
    await room.save();

    // Create system event message
    await ChatMessage.create({
      roomId: room._id,
      sender: {
        userId: new mongoose.Types.ObjectId(reopenedBy.toString()),
        name: 'System',
        type: 'HUB_TEAM',
      },
      type: 'EVENT',
      event: {
        eventType: ChatEventType.CONTRACT_RESUMED,
        entityType: ChatEventEntityType.CONTRACT,
        entityId: room.contextId || room._id,
        summary: 'Conversation reopened',
        data: { reopenedBy: reopenedBy.toString() },
      },
    });

    return room;
  }

  /**
   * Mark context as deleted
   * @covers AC-RL-032, AC-RL-033
   */
  async markContextDeleted(
    contextType: ChatContextType,
    contextId: mongoose.Types.ObjectId | string,
  ): Promise<void> {
    await ChatRoom.updateMany(
      {
        contextType,
        contextId: new mongoose.Types.ObjectId(contextId.toString()),
      },
      {
        $set: { 'contextSnapshot.status': 'DELETED' },
      },
    );
  }

  /**
   * Check if user can access room
   */
  async canAccessRoom(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
    hubId?: mongoose.Types.ObjectId | string,
  ): Promise<boolean> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return false;
    }

    // If user is a participant, they can access
    const isParticipant = room.participantIds.some((id) => id.toString() === userId.toString());
    if (isParticipant) {
      return true;
    }

    // If user is hub team member, they can view (but not send messages)
    if (hubId && room.hubId.toString() === hubId.toString()) {
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const chatRoomService = new ChatRoomService();
