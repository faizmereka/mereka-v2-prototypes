// src/modules/hub/routes/chat/hubChat.routes.ts
// @spec: specs/messaging/messaging-hub-inbox_spec.md
// @covers AC-HI-001 through AC-HI-064

import {
  archiveHubChatRoom,
  assignHubChatMember,
  getHubChatCounts,
  getHubChatMessages,
  getHubChatRoom,
  getHubChatUnreadTotal,
  joinHubChatRoom,
  listHubChatRooms,
  markHubChatRead,
  muteHubChatRoom,
  searchHubChatRooms,
  sendHubChatMessage,
  unarchiveHubChatRoom,
  unassignHubChatMember,
  unmuteHubChatRoom,
} from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import { loadHubContext, requireHubAccess } from '@core/middlewares/hubPermission.middleware';
import {
  hubArchiveChatRoomSchema,
  hubAssignChatRoomSchema,
  hubGetChatMessagesSchema,
  hubGetChatRoomSchema,
  hubGetFilterCountsSchema,
  hubGetUnreadTotalSchema,
  hubJoinChatRoomSchema,
  hubListChatRoomsSchema,
  hubMarkChatReadSchema,
  hubMuteChatRoomSchema,
  hubSearchChatRoomsSchema,
  hubSendChatMessageSchema,
  hubUnarchiveChatRoomSchema,
  hubUnassignChatRoomSchema,
  hubUnmuteChatRoomSchema,
} from '@core/schemas/hub/chat';
import type { FastifyInstance } from 'fastify';

/**
 * Hub Chat Routes (scoped to hub)
 * Prefix: /api/v1/hub/:hubId/chat
 * Frontend expects: /chat/rooms, /chat/rooms/:roomId, etc.
 */
export async function hubChatRoutes(fastify: FastifyInstance): Promise<void> {
  // Common preHandlers
  const chatPreHandlers = [requireAuth, loadHubContext, requireHubAccess];

  // AC-HI-001 through AC-HI-024: List chat rooms (inbox)
  fastify.get('/rooms', {
    schema: hubListChatRoomsSchema,
    preHandler: chatPreHandlers,
    handler: listHubChatRooms,
  });

  // AC-HI-060 through AC-HI-064: Search chat rooms
  fastify.get('/rooms/search', {
    schema: hubSearchChatRoomsSchema,
    preHandler: chatPreHandlers,
    handler: searchHubChatRooms,
  });

  // AC-HI-040 through AC-HI-044: Get room detail
  fastify.get('/rooms/:roomId', {
    schema: hubGetChatRoomSchema,
    preHandler: chatPreHandlers,
    handler: getHubChatRoom,
  });

  // Get messages
  fastify.get('/rooms/:roomId/messages', {
    schema: hubGetChatMessagesSchema,
    preHandler: chatPreHandlers,
    handler: getHubChatMessages,
  });

  // Send message
  fastify.post('/rooms/:roomId/messages', {
    schema: hubSendChatMessageSchema,
    preHandler: chatPreHandlers,
    handler: sendHubChatMessage,
  });

  // Mark as read
  fastify.post('/rooms/:roomId/read', {
    schema: hubMarkChatReadSchema,
    preHandler: chatPreHandlers,
    handler: markHubChatRead,
  });

  // AC-HI-030, AC-HI-052: Join room
  fastify.post('/rooms/:roomId/join', {
    schema: hubJoinChatRoomSchema,
    preHandler: chatPreHandlers,
    handler: joinHubChatRoom,
  });

  // AC-HI-031, AC-HI-051: Assign member
  fastify.post('/rooms/:roomId/assign', {
    schema: hubAssignChatRoomSchema,
    preHandler: chatPreHandlers,
    handler: assignHubChatMember,
  });

  // AC-HI-032: Unassign member
  fastify.post('/rooms/:roomId/unassign', {
    schema: hubUnassignChatRoomSchema,
    preHandler: chatPreHandlers,
    handler: unassignHubChatMember,
  });

  // AC-HI-033, AC-HI-053: Archive room
  fastify.post('/rooms/:roomId/archive', {
    schema: hubArchiveChatRoomSchema,
    preHandler: chatPreHandlers,
    handler: archiveHubChatRoom,
  });

  // AC-HI-034, AC-HI-053: Unarchive room
  fastify.post('/rooms/:roomId/unarchive', {
    schema: hubUnarchiveChatRoomSchema,
    preHandler: chatPreHandlers,
    handler: unarchiveHubChatRoom,
  });

  // AC-HI-035, AC-HI-053: Mute room
  fastify.post('/rooms/:roomId/mute', {
    schema: hubMuteChatRoomSchema,
    preHandler: chatPreHandlers,
    handler: muteHubChatRoom,
  });

  // AC-HI-036, AC-HI-053: Unmute room
  fastify.post('/rooms/:roomId/unmute', {
    schema: hubUnmuteChatRoomSchema,
    preHandler: chatPreHandlers,
    handler: unmuteHubChatRoom,
  });

  // AC-FEH-011: Get total unread count
  fastify.get('/unread/total', {
    schema: hubGetUnreadTotalSchema,
    preHandler: chatPreHandlers,
    handler: getHubChatUnreadTotal,
  });

  // AC-FEH-011, AC-FEH-014: Get filter counts for sidebar
  fastify.get('/counts', {
    schema: hubGetFilterCountsSchema,
    preHandler: chatPreHandlers,
    handler: getHubChatCounts,
  });
}
