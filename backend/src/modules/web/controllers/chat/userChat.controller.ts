// src/modules/web/controllers/chat/userChat.controller.ts
// @spec: specs/messaging/messaging-learner-inbox_spec.md
// @covers AC-LI-001 through AC-LI-040

import { ChatContextType, ChatInitiatedBy } from '@core/models/ChatRoom';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { Job } from '@core/models/Job';
import type {
  UserInitiateChatBody,
  UserListChatRoomsQuery,
  UserSendMessageBody,
  UserUpdateSettingsBody,
} from '@core/schemas/web/chat';
import {
  chatMessageService,
  chatRoomService,
  learnerInboxService,
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

// Helper to get user name from request
function getUserName(request: FastifyRequest): string {
  const user = request.user as AuthUser | undefined;
  return user?.name || user?.email || 'Unknown';
}

/**
 * List user chat rooms
 * GET /api/v1/user/chat-rooms
 * @covers AC-LI-001 through AC-LI-008
 */
export async function listUserChatRooms(
  request: FastifyRequest<{
    Querystring: UserListChatRoomsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { cursor, limit = 20 } = request.query;
    const userId = getUserId(request);

    const result = await learnerInboxService.getRooms({
      userId,
      cursor,
      limit,
    });

    // Transform to ChatRoomListItem format expected by frontend
    const transformedRooms = result.rooms.map((item) => ({
      room: {
        _id: item._id,
        contextType: item.contextType,
        contextSnapshot: item.contextSnapshot,
        hubSnapshot: item.hubSnapshot,
        lastMessage: item.lastMessage,
        participants: item.participants || [],
      },
      userState: {
        roomId: item._id.toString(),
        userId,
        unreadCount: item.unreadCount,
        isArchived: false,
        isMuted: false,
        isPinned: false,
        hasViewed: true,
      },
      isMember: true,
      isMuted: false,
      isArchived: false,
    }));

    return reply.send({
      success: true,
      data: {
        rooms: transformedRooms,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing user chat rooms');
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
 * Get user unread count
 * GET /api/v1/user/chat-rooms/unread-count
 * @covers AC-LI-040
 */
export async function getUserUnreadCount(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);

    const unreadCount = await learnerInboxService.getTotalUnreadCount(userId);

    return reply.send({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting unread count');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_UNREAD_COUNT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get unread count',
      },
    });
  }
}

/**
 * Get chat room detail (for learner)
 * GET /api/v1/chat-rooms/:roomId
 * @covers AC-LI-010 through AC-LI-013
 */
export async function getUserChatRoom(
  request: FastifyRequest<{
    Params: { roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const userId = getUserId(request);

    const result = await learnerInboxService.getRoomDetail(roomId, userId);

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
      data: result,
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
 * Get chat messages (for learner)
 * GET /api/v1/chat-rooms/:roomId/messages
 * @covers AC-LI-020 through AC-LI-023
 */
export async function getUserChatMessages(
  request: FastifyRequest<{
    Params: { roomId: string };
    Querystring: { cursor?: string; limit?: number };
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const { cursor, limit = 20 } = request.query;
    const userId = getUserId(request);

    const result = await learnerInboxService.getMessages(roomId, userId, cursor, limit);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting chat messages');
    const statusCode =
      error instanceof Error && error.message.includes('Access denied') ? 403 : 500;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'GET_CHAT_MESSAGES_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get messages',
      },
    });
  }
}

/**
 * Send chat message (for learner)
 * POST /api/v1/chat-rooms/:roomId/messages
 * @covers AC-LI-030
 */
export async function sendUserChatMessage(
  request: FastifyRequest<{
    Params: { roomId: string };
    Body: UserSendMessageBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const { text, files } = request.body;
    const user = request.user as AuthUser | undefined;
    const userId = getUserId(request);
    const senderName = getUserName(request);

    // Validate: either text or files must be provided
    if (!text?.trim() && (!files || files.length === 0)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_MESSAGE',
          message: 'Message must contain either text or file attachments',
        },
      });
    }

    const message = await chatMessageService.sendMessage({
      roomId,
      senderId: userId,
      senderName,
      senderAvatar: user?.avatar,
      senderType: 'LEARNER',
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
 * Mark chat as read (for learner)
 * POST /api/v1/chat-rooms/:roomId/read
 * @covers AC-LI-031
 */
export async function markUserChatRead(
  request: FastifyRequest<{
    Params: { roomId: string };
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
 * Update chat settings (for learner)
 * PATCH /api/v1/chat-rooms/:roomId/settings
 * @covers AC-LI-032
 */
export async function updateUserChatSettings(
  request: FastifyRequest<{
    Params: { roomId: string };
    Body: UserUpdateSettingsBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const { isArchived, isMuted } = request.body;
    const userId = getUserId(request);

    await learnerInboxService.updateSettings(roomId, userId, {
      isArchived,
      isMuted,
    });

    return reply.send({
      success: true,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating chat settings');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_CHAT_SETTINGS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update settings',
      },
    });
  }
}

/**
 * Archive chat room (for learner)
 * POST /api/v1/learner/chat/rooms/:roomId/archive
 */
export async function archiveUserChatRoom(
  request: FastifyRequest<{
    Params: { roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const userId = getUserId(request);

    await learnerInboxService.updateSettings(roomId, userId, {
      isArchived: true,
    });

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
 * Unarchive chat room (for learner)
 * POST /api/v1/learner/chat/rooms/:roomId/unarchive
 */
export async function unarchiveUserChatRoom(
  request: FastifyRequest<{
    Params: { roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const userId = getUserId(request);

    await learnerInboxService.updateSettings(roomId, userId, {
      isArchived: false,
    });

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
 * Mute chat room (for learner)
 * POST /api/v1/learner/chat/rooms/:roomId/mute
 */
export async function muteUserChatRoom(
  request: FastifyRequest<{
    Params: { roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const userId = getUserId(request);

    await learnerInboxService.updateSettings(roomId, userId, {
      isMuted: true,
    });

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
 * Unmute chat room (for learner)
 * POST /api/v1/learner/chat/rooms/:roomId/unmute
 */
export async function unmuteUserChatRoom(
  request: FastifyRequest<{
    Params: { roomId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { roomId } = request.params;
    const userId = getUserId(request);

    await learnerInboxService.updateSettings(roomId, userId, {
      isMuted: false,
    });

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
 * Initiate chat with a hub
 * POST /api/v1/learner/chat/rooms/initiate
 * Creates or retrieves an existing chat room between learner and hub
 */
export async function initiateChat(
  request: FastifyRequest<{
    Body: UserInitiateChatBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, contextType, contextId } = request.body;
    const user = request.user as AuthUser | undefined;
    const userId = getUserId(request);
    const userName = getUserName(request);

    // Validate contextId is provided for non-HUB context types
    if (contextType !== 'HUB' && !contextId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: `contextId is required for ${contextType} context type`,
        },
      });
    }

    // Fetch hub details for snapshot
    const hub = await Hub.findById(hubId).lean();
    if (!hub) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'HUB_NOT_FOUND',
          message: 'Hub not found',
        },
      });
    }

    // Build context snapshot based on context type
    let contextSnapshot: { title: string; image?: string; status?: string };
    let finalContextId: string | undefined;
    let finalContextType: ChatContextType = ChatContextType.HUB;

    if (contextType === 'EXPERIENCE' && contextId) {
      const experience = await Experience.findById(contextId).lean();
      if (!experience) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'EXPERIENCE_NOT_FOUND',
            message: 'Experience not found',
          },
        });
      }
      contextSnapshot = {
        title: experience.experienceTitle,
        image: experience.coverPhoto,
        status: experience.status,
      };
      finalContextId = contextId;
      finalContextType = ChatContextType.EXPERIENCE;
    } else if (contextType === 'EXPERTISE' && contextId) {
      const expertise = await Expertise.findById(contextId).lean();
      if (!expertise) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'EXPERTISE_NOT_FOUND',
            message: 'Expertise not found',
          },
        });
      }
      contextSnapshot = {
        title: expertise.expertiseTitle,
        image: expertise.coverPhoto,
        status: expertise.status,
      };
      finalContextId = contextId;
      finalContextType = ChatContextType.EXPERTISE;
    } else if (contextType === 'JOB' && contextId) {
      const job = await Job.findById(contextId).lean();
      if (!job) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found',
          },
        });
      }
      contextSnapshot = {
        title: job.jobTitle,
        image: undefined, // Jobs typically don't have cover images
        status: job.status,
      };
      finalContextId = contextId;
      finalContextType = ChatContextType.JOB;
    } else {
      // HUB context - general inquiry
      contextSnapshot = {
        title: `Chat with ${hub.name}`,
        image: hub.logo,
      };
      finalContextType = ChatContextType.HUB;
    }

    // Get or create chat room using user info from JWT token
    const room = await chatRoomService.getOrCreateRoom({
      contextType: finalContextType,
      contextId: finalContextId,
      contextSnapshot,
      hubId,
      hubSnapshot: {
        name: hub.name,
        logo: hub.logo,
      },
      learnerId: userId,
      learnerSnapshot: {
        name: userName,
        email: user?.email || userName, // Fallback to name if email not in token
        avatar: user?.avatar,
      },
      initiatedBy: ChatInitiatedBy.LEARNER,
      createdBy: userId,
    });

    // Check if this was a newly created room (no lastMessage means new)
    const isNewRoom = !room.lastMessage;

    return reply.status(isNewRoom ? 201 : 200).send({
      success: true,
      data: room,
    });
  } catch (error) {
    request.log.error({ error }, 'Error initiating chat');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INITIATE_CHAT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to initiate chat',
      },
    });
  }
}
