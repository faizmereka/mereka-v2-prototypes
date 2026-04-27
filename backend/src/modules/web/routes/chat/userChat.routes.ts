// src/modules/web/routes/chat/userChat.routes.ts
// @spec: specs/messaging/messaging-learner-inbox_spec.md
// @covers AC-LI-001 through AC-LI-040

import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  userArchiveChatRoomSchema,
  userGetChatMessagesSchema,
  userGetChatRoomSchema,
  userGetUnreadCountSchema,
  userInitiateChatSchema,
  userListChatRoomsSchema,
  userMarkChatReadSchema,
  userMuteChatRoomSchema,
  userSendChatMessageSchema,
  userUnarchiveChatRoomSchema,
  userUnmuteChatRoomSchema,
  userUpdateChatSettingsSchema,
} from '@core/schemas/web/chat';
import type { FastifyInstance } from 'fastify';
import {
  archiveUserChatRoom,
  getUserChatMessages,
  getUserChatRoom,
  getUserUnreadCount,
  initiateChat,
  listUserChatRooms,
  markUserChatRead,
  muteUserChatRoom,
  sendUserChatMessage,
  unarchiveUserChatRoom,
  unmuteUserChatRoom,
  updateUserChatSettings,
} from '../../controllers/chat';

/**
 * User Chat Routes (learner inbox)
 * Prefix: /api/v1/learner/chat
 * Frontend expects: /learner/chat/rooms, /learner/chat/rooms/:roomId, etc.
 */
export async function userChatRoutes(fastify: FastifyInstance): Promise<void> {
  // AC-LI-001 through AC-LI-008: List user chat rooms
  fastify.get('/rooms', {
    schema: userListChatRoomsSchema,
    preHandler: [requireAuth],
    handler: listUserChatRooms,
  });

  // Initiate chat with hub (must be before /rooms/:roomId to avoid matching "initiate" as roomId)
  fastify.post('/rooms/initiate', {
    schema: userInitiateChatSchema,
    preHandler: [requireAuth],
    handler: initiateChat,
  });

  // AC-LI-040: Get total unread count
  fastify.get('/unread/total', {
    schema: userGetUnreadCountSchema,
    preHandler: [requireAuth],
    handler: getUserUnreadCount,
  });

  // AC-LI-010 through AC-LI-013: Get room detail
  fastify.get('/rooms/:roomId', {
    schema: userGetChatRoomSchema,
    preHandler: [requireAuth],
    handler: getUserChatRoom,
  });

  // AC-LI-020 through AC-LI-023: Get messages
  fastify.get('/rooms/:roomId/messages', {
    schema: userGetChatMessagesSchema,
    preHandler: [requireAuth],
    handler: getUserChatMessages,
  });

  // AC-LI-030: Send message
  fastify.post('/rooms/:roomId/messages', {
    schema: userSendChatMessageSchema,
    preHandler: [requireAuth],
    handler: sendUserChatMessage,
  });

  // AC-LI-031: Mark as read
  fastify.post('/rooms/:roomId/read', {
    schema: userMarkChatReadSchema,
    preHandler: [requireAuth],
    handler: markUserChatRead,
  });

  // AC-LI-032: Update settings
  fastify.patch('/rooms/:roomId/settings', {
    schema: userUpdateChatSettingsSchema,
    preHandler: [requireAuth],
    handler: updateUserChatSettings,
  });

  // Archive room
  fastify.post('/rooms/:roomId/archive', {
    schema: userArchiveChatRoomSchema,
    preHandler: [requireAuth],
    handler: archiveUserChatRoom,
  });

  // Unarchive room
  fastify.post('/rooms/:roomId/unarchive', {
    schema: userUnarchiveChatRoomSchema,
    preHandler: [requireAuth],
    handler: unarchiveUserChatRoom,
  });

  // Mute room
  fastify.post('/rooms/:roomId/mute', {
    schema: userMuteChatRoomSchema,
    preHandler: [requireAuth],
    handler: muteUserChatRoom,
  });

  // Unmute room
  fastify.post('/rooms/:roomId/unmute', {
    schema: userUnmuteChatRoomSchema,
    preHandler: [requireAuth],
    handler: unmuteUserChatRoom,
  });
}
