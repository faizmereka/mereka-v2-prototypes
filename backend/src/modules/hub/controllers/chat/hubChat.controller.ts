// src/modules/hub/controllers/chat/hubChat.controller.ts
// @spec: specs/messaging/messaging-hub-inbox_spec.md
// @covers AC-HI-001 through AC-HI-064

import type {
  HubAssignMemberBody,
  HubListChatRoomsQuery,
  HubSearchRoomsQuery,
  HubSendMessageBody,
} from '@core/schemas/hub/chat';
import { hubInboxService } from '@core/services/hub/chat';
import {
  chatMessageService,
  chatParticipantService,
  chatRoomService,
} from '@core/services/shared/chat';
import type { FastifyReply, FastifyRequest } from 'fastify';

// User type from auth (JWT payload)
interface AuthUser {
  sub?: string; // JWT subject (user ID)
  id?: string;
  email?: string;
  name?: string;
  avatar?: string;
}

// Helper to get user ID from request (throws if not authenticated)
function getUserId(request: FastifyRequest): string {
  const user = request.user as AuthUser | undefined;
  const userId = user?.sub || user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
}

// Helper to get user info from request
function getUserInfo(request: FastifyRequest): {
  id: string;
  name: string;
  email: string;
  avatar?: string;
} {
  const user = request.user as AuthUser | undefined;
  const userId = user?.sub || user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return {
    id: userId,
    name: user?.name || user?.email || 'Unknown',
    email: user?.email || '',
    avatar: user?.avatar,
  };
}

/**
 * List hub chat rooms (inbox)
 * GET /api/v1/hub/:hubId/chat-rooms
 * @covers AC-HI-001 through AC-HI-024
 */
export async function listHubChatRooms(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: HubListChatRoomsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { filter = 'ALL', context, cursor, limit = 20 } = request.query;
    const userId = getUserId(request);

    const result = await hubInboxService.getInbox({
      hubId,
      userId,
      filter,
      context,
      cursor,
      limit,
    });

    // Transform to match frontend ChatRoomListItem format
    const transformedRooms = result.rooms.map((roomItem) => ({
      room: {
        _id: roomItem._id,
        contextType: roomItem.contextType,
        contextSnapshot: roomItem.contextSnapshot,
        learnerSnapshot: roomItem.learnerSnapshot,
        otherHubSnapshot: roomItem.otherHubSnapshot,
        lastMessage: roomItem.lastMessage,
        participants: roomItem.participants,
      },
      userState: {
        roomId: roomItem._id.toString(),
        unreadCount: roomItem.unreadCount,
        isArchived: false,
        isMuted: false,
      },
      assignedMember: roomItem.assignedTo
        ? {
            memberId: roomItem.assignedTo.userId.toString(),
            name: roomItem.assignedTo.name,
          }
        : undefined,
      isMember: roomItem.myParticipation.isJoined,
      isMuted: false,
      isArchived: false,
    }));

    return reply.send({
      success: true,
      data: {
        rooms: transformedRooms,
        sidebar: result.sidebar,
        pagination: {
          page: 1,
          limit,
          total: transformedRooms.length,
          hasMore: result.pagination.hasMore,
        },
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing hub chat rooms');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_CHAT_ROOMS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list chat rooms',
      },
    });
  }
}

/**
 * Get chat room detail
 * GET /api/v1/hub/:hubId/chat-rooms/:roomId
 * @covers AC-HI-040 through AC-HI-044
 */
export async function getHubChatRoom(
  request: FastifyRequest<{
    Params: { hubId: string; roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, roomId } = request.params;
    const userId = getUserId(request);

    const result = await hubInboxService.getRoomDetail(roomId, userId, hubId);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ROOM_NOT_FOUND',
          message: 'Chat room not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        ...result.room.toObject(),
        myParticipation: result.myParticipation,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting chat room');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_CHAT_ROOM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get chat room',
      },
    });
  }
}

/**
 * Join chat room
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/join
 * @covers AC-HI-030, AC-HI-052
 */
export async function joinHubChatRoom(
  request: FastifyRequest<{
    Params: { hubId: string; roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, roomId } = request.params;
    const userInfo = getUserInfo(request);

    const participant = await chatParticipantService.joinRoom({
      roomId,
      userId: userInfo.id,
      hubId,
      user: {
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.avatar,
      },
    });

    return reply.send({
      success: true,
      data: participant,
    });
  } catch (error) {
    request.log.error({ error }, 'Error joining chat room');
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'JOIN_CHAT_ROOM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to join chat room',
      },
    });
  }
}

/**
 * Assign member to chat room
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/assign
 * @covers AC-HI-031, AC-HI-051
 */
export async function assignHubChatMember(
  request: FastifyRequest<{
    Params: { hubId: string; roomId: string };
    Body: HubAssignMemberBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, roomId } = request.params;
    const { userId: targetUserId } = request.body;
    const userInfo = getUserInfo(request);

    // Get target user info (in real app, fetch from user service)
    // For now, we'll use the request user if assigning self
    const targetUser =
      targetUserId === userInfo.id
        ? { name: userInfo.name, email: userInfo.email, avatar: userInfo.avatar }
        : { name: 'Hub Team Member', email: 'team@hub.com' }; // Placeholder

    const participant = await chatParticipantService.assignMember({
      roomId,
      userId: targetUserId,
      hubId,
      user: targetUser,
      assignedBy: userInfo.id,
      assignedByName: userInfo.name,
    });

    return reply.send({
      success: true,
      data: participant,
    });
  } catch (error) {
    request.log.error({ error }, 'Error assigning chat member');
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'ASSIGN_CHAT_MEMBER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to assign member',
      },
    });
  }
}

/**
 * Unassign member from chat room
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/unassign
 * @covers AC-HI-032
 */
export async function unassignHubChatMember(
  request: FastifyRequest<{
    Params: { hubId: string; roomId: string };
    Body: HubAssignMemberBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const { userId: targetUserId } = request.body;
    const userInfo = getUserInfo(request);

    await chatParticipantService.unassignMember({
      roomId,
      userId: targetUserId,
      unassignedBy: userInfo.id,
      unassignedByName: userInfo.name,
    });

    return reply.send({
      success: true,
    });
  } catch (error) {
    request.log.error({ error }, 'Error unassigning chat member');
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'UNASSIGN_CHAT_MEMBER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to unassign member',
      },
    });
  }
}

/**
 * Archive chat room for user
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/archive
 * @covers AC-HI-033, AC-HI-053
 */
export async function archiveHubChatRoom(
  request: FastifyRequest<{
    Params: { hubId: string; roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, roomId } = request.params;
    const userId = getUserId(request);

    await hubInboxService.archiveRoom(roomId, userId, hubId);

    return reply.send({
      success: true,
    });
  } catch (error) {
    request.log.error({ error }, 'Error archiving chat room');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'ARCHIVE_CHAT_ROOM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to archive chat room',
      },
    });
  }
}

/**
 * Unarchive chat room for user
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/unarchive
 * @covers AC-HI-034, AC-HI-053
 */
export async function unarchiveHubChatRoom(
  request: FastifyRequest<{
    Params: { hubId: string; roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const userId = getUserId(request);

    await hubInboxService.unarchiveRoom(roomId, userId);

    return reply.send({
      success: true,
    });
  } catch (error) {
    request.log.error({ error }, 'Error unarchiving chat room');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'UNARCHIVE_CHAT_ROOM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to unarchive chat room',
      },
    });
  }
}

/**
 * Mute chat room for user
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/mute
 * @covers AC-HI-035, AC-HI-053
 */
export async function muteHubChatRoom(
  request: FastifyRequest<{
    Params: { hubId: string; roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, roomId } = request.params;
    const userId = getUserId(request);

    await hubInboxService.muteRoom(roomId, userId, hubId);

    return reply.send({
      success: true,
    });
  } catch (error) {
    request.log.error({ error }, 'Error muting chat room');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'MUTE_CHAT_ROOM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to mute chat room',
      },
    });
  }
}

/**
 * Unmute chat room for user
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/unmute
 * @covers AC-HI-036, AC-HI-053
 */
export async function unmuteHubChatRoom(
  request: FastifyRequest<{
    Params: { hubId: string; roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const userId = getUserId(request);

    await hubInboxService.unmuteRoom(roomId, userId);

    return reply.send({
      success: true,
    });
  } catch (error) {
    request.log.error({ error }, 'Error unmuting chat room');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'UNMUTE_CHAT_ROOM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to unmute chat room',
      },
    });
  }
}

/**
 * Search chat rooms
 * GET /api/v1/hub/:hubId/chat-rooms/search
 * @covers AC-HI-060 through AC-HI-064
 */
export async function searchHubChatRooms(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: HubSearchRoomsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { q: query, limit = 20 } = request.query;

    const rooms = await hubInboxService.searchRooms({
      hubId,
      query,
      limit,
    });

    return reply.send({
      success: true,
      data: { rooms },
    });
  } catch (error) {
    request.log.error({ error }, 'Error searching chat rooms');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'SEARCH_CHAT_ROOMS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to search chat rooms',
      },
    });
  }
}

/**
 * Get chat messages
 * GET /api/v1/hub/:hubId/chat-rooms/:roomId/messages
 */
export async function getHubChatMessages(
  request: FastifyRequest<{
    Params: { hubId: string; roomId: string };
    Querystring: { cursor?: string; limit?: number };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, roomId } = request.params;
    const { cursor, limit = 20 } = request.query;
    const userId = getUserId(request);

    // Verify access
    const canAccess = await chatRoomService.canAccessRoom(roomId, userId, hubId);
    if (!canAccess) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this chat room',
        },
      });
    }

    const result = await chatMessageService.getMessages({
      roomId,
      cursor,
      limit,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting chat messages');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_CHAT_MESSAGES_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get messages',
      },
    });
  }
}

/**
 * Send chat message
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/messages
 */
export async function sendHubChatMessage(
  request: FastifyRequest<{
    Params: { hubId: string; roomId: string };
    Body: HubSendMessageBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, roomId } = request.params;
    const { text, files } = request.body;
    const userInfo = getUserInfo(request);

    // Validate: either text or files must be provided
    if (!text?.trim() && (!files || files.length === 0)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_MESSAGE',
          message: 'Message must contain text or file attachments',
        },
      });
    }

    const message = await chatMessageService.sendMessage({
      roomId,
      senderId: userInfo.id,
      senderHubId: hubId,
      senderName: userInfo.name,
      senderAvatar: userInfo.avatar,
      senderType: 'HUB_TEAM',
      text: text?.trim() || '',
      files,
    });

    return reply.status(201).send({
      success: true,
      data: message,
    });
  } catch (error) {
    request.log.error({ error }, 'Error sending chat message');
    const statusCode = error instanceof Error && error.message.includes('must join') ? 403 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'SEND_CHAT_MESSAGE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to send message',
      },
    });
  }
}

/**
 * Mark chat as read
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/read
 */
export async function markHubChatRead(
  request: FastifyRequest<{
    Params: { hubId: string; roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const userId = getUserId(request);

    await chatMessageService.markAsRead(roomId, userId);

    return reply.send({
      success: true,
    });
  } catch (error) {
    request.log.error({ error }, 'Error marking chat as read');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'MARK_CHAT_READ_ERROR',
        message: error instanceof Error ? error.message : 'Failed to mark as read',
      },
    });
  }
}

/**
 * Get total unread count for hub
 * GET /api/v1/hub/:hubId/chat/unread/total
 * @covers AC-FEH-011
 */
export async function getHubChatUnreadTotal(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const userId = getUserId(request);

    const total = await hubInboxService.getTotalUnreadCount(hubId, userId);

    return reply.send({
      success: true,
      data: { total },
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting unread total');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_UNREAD_TOTAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get unread total',
      },
    });
  }
}

/**
 * Get filter counts for hub inbox sidebar
 * GET /api/v1/hub/:hubId/chat/counts
 * @covers AC-FEH-011, AC-FEH-014
 */
export async function getHubChatCounts(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const userId = getUserId(request);

    const counts = await hubInboxService.getFilterCounts(hubId, userId);

    return reply.send({
      success: true,
      data: counts,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting chat counts');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_CHAT_COUNTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get chat counts',
      },
    });
  }
}
