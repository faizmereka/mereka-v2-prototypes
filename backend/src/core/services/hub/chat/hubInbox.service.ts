// src/core/services/hub/chat/hubInbox.service.ts
// @spec: specs/messaging/messaging-hub-inbox_spec.md
// @covers AC-HI-001 through AC-HI-064

import { ChatMessage } from '@core/models/ChatMessage';
import {
  type ChatContextType,
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

export interface SidebarCounts {
  all: number;
  assignedToMe: number;
  unassigned: number;
  archived: number;
  byContext: {
    EXPERTISE: number;
    BOOKING: number;
    JOB: number;
    CONTRACT: number;
  };
}

export interface RoomListItemParticipant {
  userId: mongoose.Types.ObjectId;
  hubId?: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  avatar?: string;
  type: 'LEARNER' | 'HUB_TEAM';
  status: string;
  isAssigned?: boolean;
}

export interface RoomListItem {
  _id: mongoose.Types.ObjectId;
  contextType: ChatContextType;
  contextSnapshot: {
    title: string;
    image?: string;
    status?: string;
  };
  learnerSnapshot?: {
    name: string;
    avatar?: string;
  };
  otherHubSnapshot?: {
    name: string;
    logo?: string;
  };
  lastMessage?: {
    preview: string;
    sentAt: Date;
    senderName: string;
  };
  unreadCount: number;
  assignedTo: {
    userId: mongoose.Types.ObjectId;
    name: string;
  } | null;
  myParticipation: {
    isJoined: boolean;
    isAssigned: boolean;
  };
  participants: RoomListItemParticipant[];
}

export interface GetInboxParams {
  hubId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  filter: 'ALL' | 'ASSIGNED_TO_ME' | 'UNASSIGNED' | 'ARCHIVED';
  context?: ChatContextType;
  cursor?: mongoose.Types.ObjectId | string;
  limit?: number;
}

export interface GetInboxResult {
  sidebar: SidebarCounts;
  rooms: RoomListItem[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
  };
}

export interface SearchRoomsParams {
  hubId: mongoose.Types.ObjectId | string;
  query: string;
  limit?: number;
}

// ============================================
// SERVICE CLASS
// ============================================

class HubInboxService {
  /**
   * Get inbox data with sidebar counts and room list
   * @covers AC-HI-001 through AC-HI-024
   */
  async getInbox(params: GetInboxParams): Promise<GetInboxResult> {
    const { hubId, userId, filter, context, cursor, limit = 20 } = params;

    const hubObjectId = new mongoose.Types.ObjectId(hubId.toString());
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    // Get sidebar counts in parallel
    const sidebar = await this.getSidebarCounts(hubObjectId, userObjectId);

    // Build room query based on filter
    const roomQuery: Record<string, unknown> = {
      hubId: hubObjectId,
    };

    // AC-HI-003, AC-HI-004, AC-HI-005, AC-HI-006: Handle filters
    if (filter === 'ARCHIVED') {
      // Get archived room IDs for this user
      const archivedStates = await ChatUserState.find({
        userId: userObjectId,
        hubId: hubObjectId,
        isArchived: true,
      })
        .select('roomId')
        .lean();
      roomQuery._id = { $in: archivedStates.map((s) => s.roomId) };
    } else {
      roomQuery.status = ChatRoomStatus.ACTIVE;

      if (filter === 'ASSIGNED_TO_ME') {
        roomQuery.participants = {
          $elemMatch: {
            userId: userObjectId,
            isAssigned: true,
            status: ChatParticipantStatus.JOINED,
          },
        };
      } else if (filter === 'UNASSIGNED') {
        roomQuery.participants = {
          $not: {
            $elemMatch: { isAssigned: true, status: ChatParticipantStatus.JOINED },
          },
        };
      }
    }

    // AC-HI-010, AC-HI-011, AC-HI-012: Context filter
    if (context) {
      roomQuery.contextType = context;
    }

    // AC-HI-021: Cursor-based pagination
    if (cursor) {
      const cursorRoom = await ChatRoom.findById(cursor);
      if (cursorRoom?.lastMessage?.sentAt) {
        roomQuery['lastMessage.sentAt'] = { $lt: cursorRoom.lastMessage.sentAt };
      }
    }

    // AC-HI-020: Sort by lastMessage.sentAt descending
    const rooms = await ChatRoom.find(roomQuery)
      .sort({ 'lastMessage.sentAt': -1 })
      .limit(limit + 1)
      .lean<IChatRoom[]>();

    const hasMore = rooms.length > limit;
    if (hasMore) {
      rooms.pop();
    }

    // Get unread counts for this user
    const roomIds = rooms.map((r) => r._id);
    const userStates = await ChatUserState.find({
      roomId: { $in: roomIds },
      userId: userObjectId,
    }).lean();

    const unreadMap = new Map(userStates.map((s) => [s.roomId.toString(), s.unreadCount]));

    // Transform to RoomListItem
    const roomItems: RoomListItem[] = rooms.map((room) => {
      const participant = room.participants.find((p) => p.userId.toString() === userId.toString());
      const assignedParticipant = room.participants.find(
        (p) => p.isAssigned && p.status === ChatParticipantStatus.JOINED,
      );

      return {
        _id: room._id,
        contextType: room.contextType,
        contextSnapshot: room.contextSnapshot,
        learnerSnapshot: room.learnerSnapshot,
        otherHubSnapshot: room.otherHubSnapshot,
        lastMessage: room.lastMessage,
        unreadCount: unreadMap.get(room._id.toString()) || 0,
        assignedTo: assignedParticipant
          ? {
              userId: assignedParticipant.userId,
              name: assignedParticipant.name,
            }
          : null,
        myParticipation: {
          isJoined: participant?.status === ChatParticipantStatus.JOINED,
          isAssigned: participant?.isAssigned || false,
        },
        participants: room.participants.map((p) => ({
          userId: p.userId,
          hubId: p.hubId,
          name: p.name,
          email: p.email,
          avatar: p.avatar,
          type: p.type,
          status: p.status,
          isAssigned: p.isAssigned,
        })),
      };
    });

    // Get next cursor
    const lastRoom = rooms[rooms.length - 1];
    const nextCursor = lastRoom?._id?.toString();

    return {
      sidebar,
      rooms: roomItems,
      pagination: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  /**
   * Get sidebar counts only (for real-time updates)
   * @covers AC-HI-001 through AC-HI-007
   */
  async getSidebarCounts(
    hubId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
  ): Promise<SidebarCounts> {
    const hubObjectId = new mongoose.Types.ObjectId(hubId.toString());
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    // Run all counts in parallel
    const [all, assignedToMe, unassigned, archived, byContext] = await Promise.all([
      // AC-HI-003: All non-archived rooms
      ChatRoom.countDocuments({
        hubId: hubObjectId,
        status: ChatRoomStatus.ACTIVE,
      }),

      // AC-HI-004: Assigned to me
      ChatRoom.countDocuments({
        hubId: hubObjectId,
        status: ChatRoomStatus.ACTIVE,
        participants: {
          $elemMatch: {
            userId: userObjectId,
            isAssigned: true,
            status: ChatParticipantStatus.JOINED,
          },
        },
      }),

      // AC-HI-005: Unassigned
      ChatRoom.countDocuments({
        hubId: hubObjectId,
        status: ChatRoomStatus.ACTIVE,
        participants: {
          $not: {
            $elemMatch: { isAssigned: true, status: ChatParticipantStatus.JOINED },
          },
        },
      }),

      // AC-HI-006: Archived (count from user states)
      ChatUserState.countDocuments({
        userId: userObjectId,
        hubId: hubObjectId,
        isArchived: true,
      }),

      // AC-HI-010, AC-HI-011: Context counts
      ChatRoom.aggregate([
        {
          $match: {
            hubId: hubObjectId,
            status: ChatRoomStatus.ACTIVE,
          },
        },
        {
          $group: {
            _id: '$contextType',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Transform context counts to object
    const contextCounts: SidebarCounts['byContext'] = {
      EXPERTISE: 0,
      BOOKING: 0,
      JOB: 0,
      CONTRACT: 0,
    };

    for (const item of byContext) {
      if (item._id in contextCounts) {
        contextCounts[item._id as keyof typeof contextCounts] = item.count;
      }
    }

    return {
      all,
      assignedToMe,
      unassigned,
      archived,
      byContext: contextCounts,
    };
  }

  /**
   * Get room detail for hub view
   * @covers AC-HI-040 through AC-HI-044
   */
  async getRoomDetail(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
    hubId: mongoose.Types.ObjectId | string,
  ): Promise<{
    room: IChatRoom;
    myParticipation: {
      isJoined: boolean;
      isAssigned: boolean;
      isMuted: boolean;
      isArchived: boolean;
    };
  } | null> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return null;
    }

    // Verify hub access
    if (room.hubId.toString() !== hubId.toString()) {
      return null;
    }

    // Get user state
    const userState = await ChatUserState.findOne({
      roomId: room._id,
      userId: new mongoose.Types.ObjectId(userId.toString()),
    });

    // Get participant info
    const participant = room.participants.find((p) => p.userId.toString() === userId.toString());

    return {
      room,
      myParticipation: {
        isJoined: participant?.status === ChatParticipantStatus.JOINED,
        isAssigned: participant?.isAssigned || false,
        isMuted: userState?.isMuted || false,
        isArchived: userState?.isArchived || false,
      },
    };
  }

  /**
   * Archive room for user
   * @covers AC-HI-033, AC-HI-053
   */
  async archiveRoom(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
    hubId: mongoose.Types.ObjectId | string,
  ): Promise<void> {
    await ChatUserState.findOneAndUpdate(
      {
        roomId: new mongoose.Types.ObjectId(roomId.toString()),
        userId: new mongoose.Types.ObjectId(userId.toString()),
      },
      {
        roomId: new mongoose.Types.ObjectId(roomId.toString()),
        userId: new mongoose.Types.ObjectId(userId.toString()),
        hubId: new mongoose.Types.ObjectId(hubId.toString()),
        isArchived: true,
      },
      { upsert: true },
    );
  }

  /**
   * Unarchive room for user
   * @covers AC-HI-034, AC-HI-053
   */
  async unarchiveRoom(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
  ): Promise<void> {
    await ChatUserState.findOneAndUpdate(
      {
        roomId: new mongoose.Types.ObjectId(roomId.toString()),
        userId: new mongoose.Types.ObjectId(userId.toString()),
      },
      { isArchived: false },
    );
  }

  /**
   * Mute room for user
   * @covers AC-HI-035, AC-HI-053
   */
  async muteRoom(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
    hubId: mongoose.Types.ObjectId | string,
  ): Promise<void> {
    await ChatUserState.findOneAndUpdate(
      {
        roomId: new mongoose.Types.ObjectId(roomId.toString()),
        userId: new mongoose.Types.ObjectId(userId.toString()),
      },
      {
        roomId: new mongoose.Types.ObjectId(roomId.toString()),
        userId: new mongoose.Types.ObjectId(userId.toString()),
        hubId: new mongoose.Types.ObjectId(hubId.toString()),
        isMuted: true,
      },
      { upsert: true },
    );
  }

  /**
   * Unmute room for user
   * @covers AC-HI-036, AC-HI-053
   */
  async unmuteRoom(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
  ): Promise<void> {
    await ChatUserState.findOneAndUpdate(
      {
        roomId: new mongoose.Types.ObjectId(roomId.toString()),
        userId: new mongoose.Types.ObjectId(userId.toString()),
      },
      { isMuted: false },
    );
  }

  /**
   * Search rooms
   * @covers AC-HI-060 through AC-HI-064
   */
  async searchRooms(params: SearchRoomsParams): Promise<RoomListItem[]> {
    const { hubId, query, limit = 20 } = params;

    const hubObjectId = new mongoose.Types.ObjectId(hubId.toString());

    // Search by participant name, context title, or message content
    const searchRegex = new RegExp(query, 'i');

    // First search by room metadata
    const roomsByMeta = await ChatRoom.find({
      hubId: hubObjectId,
      status: ChatRoomStatus.ACTIVE,
      $or: [
        { 'contextSnapshot.title': searchRegex },
        { 'learnerSnapshot.name': searchRegex },
        { 'participants.name': searchRegex },
      ],
    })
      .sort({ 'lastMessage.sentAt': -1 })
      .limit(limit)
      .lean<IChatRoom[]>();

    // Also search in messages
    const messageMatches = await ChatMessage.aggregate([
      {
        $match: {
          $text: { $search: query },
        },
      },
      {
        $lookup: {
          from: 'chatrooms',
          localField: 'roomId',
          foreignField: '_id',
          as: 'room',
        },
      },
      {
        $unwind: '$room',
      },
      {
        $match: {
          'room.hubId': hubObjectId,
          'room.status': ChatRoomStatus.ACTIVE,
        },
      },
      {
        $group: {
          _id: '$roomId',
          score: { $max: { $meta: 'textScore' } },
        },
      },
      {
        $sort: { score: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    // Merge and deduplicate
    const roomIds = new Set<string>();
    const allRooms: IChatRoom[] = [];

    for (const room of roomsByMeta) {
      const id = room._id.toString();
      if (!roomIds.has(id)) {
        roomIds.add(id);
        allRooms.push(room);
      }
    }

    // Get additional rooms from message search
    const additionalRoomIds = messageMatches
      .map((m) => m._id)
      .filter((id) => !roomIds.has(id.toString()));

    if (additionalRoomIds.length > 0) {
      const additionalRooms = await ChatRoom.find({
        _id: { $in: additionalRoomIds },
      }).lean<IChatRoom[]>();

      for (const room of additionalRooms) {
        allRooms.push(room);
      }
    }

    // Transform to RoomListItem
    return allRooms.slice(0, limit).map((room) => {
      const assignedParticipant = room.participants.find(
        (p) => p.isAssigned && p.status === ChatParticipantStatus.JOINED,
      );

      return {
        _id: room._id,
        contextType: room.contextType,
        contextSnapshot: room.contextSnapshot,
        learnerSnapshot: room.learnerSnapshot,
        otherHubSnapshot: room.otherHubSnapshot,
        lastMessage: room.lastMessage,
        unreadCount: 0, // Search results don't need unread
        assignedTo: assignedParticipant
          ? {
              userId: assignedParticipant.userId,
              name: assignedParticipant.name,
            }
          : null,
        myParticipation: {
          isJoined: false,
          isAssigned: false,
        },
        participants: room.participants.map((p) => ({
          userId: p.userId,
          hubId: p.hubId,
          name: p.name,
          email: p.email,
          avatar: p.avatar,
          type: p.type,
          status: p.status,
          isAssigned: p.isAssigned,
        })),
      };
    });
  }

  /**
   * Get total unread count for hub member
   * @covers AC-FEH-011
   */
  async getTotalUnreadCount(
    hubId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
  ): Promise<number> {
    const hubObjectId = new mongoose.Types.ObjectId(hubId.toString());
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    // Get rooms in this hub
    const rooms = await ChatRoom.find({
      hubId: hubObjectId,
      status: ChatRoomStatus.ACTIVE,
    })
      .select('_id')
      .lean();

    const roomIds = rooms.map((r) => r._id);

    // Sum unread counts
    const result = await ChatUserState.aggregate([
      {
        $match: {
          roomId: { $in: roomIds },
          userId: userObjectId,
          isArchived: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$unreadCount' },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  /**
   * Get filter counts for sidebar badges
   * @covers AC-FEH-011, AC-FEH-014
   */
  async getFilterCounts(
    hubId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
  ): Promise<{
    all: number;
    unread: number;
    assigned: number;
    unassigned: number;
    contexts: {
      EXPERTISE: number;
      EXPERIENCE: number;
      BOOKING: number;
      JOB: number;
      CONTRACT: number;
    };
  }> {
    const hubObjectId = new mongoose.Types.ObjectId(hubId.toString());
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    // Get all active room IDs
    const allActiveRooms = await ChatRoom.find({
      hubId: hubObjectId,
      status: ChatRoomStatus.ACTIVE,
    })
      .select('_id')
      .lean();
    const roomIds = allActiveRooms.map((r) => r._id);

    // Get counts in parallel
    const [all, assigned, unassigned, unreadResult, contextCounts] = await Promise.all([
      // All active rooms
      ChatRoom.countDocuments({
        hubId: hubObjectId,
        status: ChatRoomStatus.ACTIVE,
      }),

      // Assigned (has at least one assigned participant)
      ChatRoom.countDocuments({
        hubId: hubObjectId,
        status: ChatRoomStatus.ACTIVE,
        participants: {
          $elemMatch: { isAssigned: true, status: ChatParticipantStatus.JOINED },
        },
      }),

      // Unassigned (no assigned participants)
      ChatRoom.countDocuments({
        hubId: hubObjectId,
        status: ChatRoomStatus.ACTIVE,
        participants: {
          $not: {
            $elemMatch: { isAssigned: true, status: ChatParticipantStatus.JOINED },
          },
        },
      }),

      // Rooms with unread messages
      ChatUserState.countDocuments({
        roomId: { $in: roomIds },
        userId: userObjectId,
        unreadCount: { $gt: 0 },
        isArchived: { $ne: true },
      }),

      // Context type counts
      ChatRoom.aggregate([
        {
          $match: {
            hubId: hubObjectId,
            status: ChatRoomStatus.ACTIVE,
          },
        },
        {
          $group: {
            _id: '$contextType',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Transform context counts
    const contexts = {
      EXPERTISE: 0,
      EXPERIENCE: 0,
      BOOKING: 0,
      JOB: 0,
      CONTRACT: 0,
    };

    for (const item of contextCounts) {
      if (item._id && item._id in contexts) {
        contexts[item._id as keyof typeof contexts] = item.count;
      }
    }

    return {
      all,
      unread: unreadResult,
      assigned,
      unassigned,
      contexts,
    };
  }
}

// Export singleton instance
export const hubInboxService = new HubInboxService();
