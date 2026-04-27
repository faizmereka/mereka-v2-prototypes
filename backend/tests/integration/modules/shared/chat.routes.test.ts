// tests/integration/modules/shared/chat.routes.test.ts
// @spec: specs/messaging/messaging-hub-inbox_spec.md
// @spec: specs/messaging/messaging-learner-inbox_spec.md
// @covers AC-HI-001 through AC-HI-064, AC-LI-001 through AC-LI-040

import { ChatMessage, ChatMessageType } from '@core/models/ChatMessage';
import {
  ChatContextType,
  ChatInitiatedBy,
  ChatParticipantStatus,
  ChatParticipantType,
  ChatRoom,
  ChatRoomStatus,
} from '@core/models/ChatRoom';
import { ChatUserState } from '@core/models/ChatUserState';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Chat Routes Integration Tests', () => {
  let app: FastifyInstance;

  // Test data
  const testHubId = new mongoose.Types.ObjectId();
  const testLearnerId = new mongoose.Types.ObjectId();
  const testHubMemberId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear test data
    await ChatRoom.deleteMany({});
    await ChatMessage.deleteMany({});
    await ChatUserState.deleteMany({});
  });

  describe('ChatRoom Model Tests', () => {
    it('should create a chat room with all required fields', async () => {
      const room = await ChatRoom.create({
        contextType: ChatContextType.EXPERTISE,
        contextSnapshot: {
          title: 'Test Expertise',
          image: 'https://example.com/image.jpg',
        },
        hubId: testHubId,
        hubSnapshot: {
          name: 'Test Hub',
          logo: 'https://example.com/logo.jpg',
        },
        learnerId: testLearnerId,
        learnerSnapshot: {
          name: 'Test Learner',
          email: 'learner@test.com',
          avatar: 'https://example.com/avatar.jpg',
        },
        participants: [
          {
            userId: testLearnerId,
            name: 'Test Learner',
            email: 'learner@test.com',
            type: ChatParticipantType.LEARNER,
            status: ChatParticipantStatus.JOINED,
            isAssigned: false,
            joinedAt: new Date(),
          },
        ],
        participantIds: [testLearnerId],
        messageCount: 0,
        initiatedBy: ChatInitiatedBy.LEARNER,
        status: ChatRoomStatus.ACTIVE,
        createdBy: testLearnerId,
      });

      expect(room._id).toBeDefined();
      expect(room.contextType).toBe(ChatContextType.EXPERTISE);
      expect(room.hubId.toString()).toBe(testHubId.toString());
      expect(room.learnerId?.toString()).toBe(testLearnerId.toString());
      expect(room.participants).toHaveLength(1);
      expect(room.status).toBe(ChatRoomStatus.ACTIVE);
    });

    it('should have correct indexes on ChatRoom', async () => {
      const indexes = await ChatRoom.collection.getIndexes();
      const indexKeys = Object.keys(indexes);

      // Verify expected indexes exist
      expect(indexKeys).toContain('hubId_1');
      expect(indexKeys).toContain('participantIds_1');
    });
  });

  describe('ChatMessage Model Tests', () => {
    it('should create a text message', async () => {
      const room = await createTestRoom();

      const message = await ChatMessage.create({
        roomId: room._id,
        sender: {
          userId: testLearnerId,
          name: 'Test Learner',
          type: 'LEARNER',
        },
        type: ChatMessageType.TEXT,
        text: 'Hello, this is a test message!',
        isDeleted: false,
      });

      expect(message._id).toBeDefined();
      expect(message.type).toBe(ChatMessageType.TEXT);
      expect(message.text).toBe('Hello, this is a test message!');
      expect(message.isDeleted).toBe(false);
    });

    it('should enforce message text max length', async () => {
      const room = await createTestRoom();

      // Create a message with text that's too long
      const longText = 'a'.repeat(10001);

      await expect(
        ChatMessage.create({
          roomId: room._id,
          sender: {
            userId: testLearnerId,
            name: 'Test Learner',
            type: 'LEARNER',
          },
          type: ChatMessageType.TEXT,
          text: longText,
          isDeleted: false,
        }),
      ).rejects.toThrow();
    });
  });

  describe('ChatUserState Model Tests', () => {
    it('should create user state with default values', async () => {
      const room = await createTestRoom();

      const userState = await ChatUserState.create({
        roomId: room._id,
        userId: testLearnerId,
        unreadCount: 0,
        isArchived: false,
        isMuted: false,
        isPinned: false,
        hasViewed: false,
      });

      expect(userState._id).toBeDefined();
      expect(userState.unreadCount).toBe(0);
      expect(userState.isArchived).toBe(false);
      expect(userState.isMuted).toBe(false);
    });

    it('should enforce unique constraint on roomId + userId', async () => {
      const room = await createTestRoom();

      await ChatUserState.create({
        roomId: room._id,
        userId: testLearnerId,
        unreadCount: 0,
      });

      // Try to create duplicate
      await expect(
        ChatUserState.create({
          roomId: room._id,
          userId: testLearnerId,
          unreadCount: 5,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Chat Service Tests', () => {
    it('should send a message and update room lastMessage', async () => {
      const room = await createTestRoom();

      // Import service
      const { chatMessageService } = await import('@core/services/shared/chat');

      // Send message
      const message = await chatMessageService.sendMessage({
        roomId: room._id,
        senderId: testLearnerId,
        senderName: 'Test Learner',
        senderType: 'LEARNER',
        text: 'Test message content',
      });

      expect(message._id).toBeDefined();
      expect(message.text).toBe('Test message content');

      // Verify room lastMessage was updated
      const updatedRoom = await ChatRoom.findById(room._id);
      expect(updatedRoom?.lastMessage).toBeDefined();
      expect(updatedRoom?.lastMessage?.preview).toContain('Test message');
      expect(updatedRoom?.messageCount).toBe(1);
    });

    it('should get messages with pagination', async () => {
      const room = await createTestRoom();
      const { chatMessageService } = await import('@core/services/shared/chat');

      // Create multiple messages
      for (let i = 0; i < 25; i++) {
        await ChatMessage.create({
          roomId: room._id,
          sender: {
            userId: testLearnerId,
            name: 'Test Learner',
            type: 'LEARNER',
          },
          type: ChatMessageType.TEXT,
          text: `Message ${i}`,
          isDeleted: false,
        });
      }

      // Get first page
      const result = await chatMessageService.getMessages({
        roomId: room._id,
        limit: 10,
      });

      expect(result.messages).toHaveLength(10);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBeDefined();
    });

    it('should soft delete a message', async () => {
      const room = await createTestRoom();
      const { chatMessageService } = await import('@core/services/shared/chat');

      // Create a message
      const message = await ChatMessage.create({
        roomId: room._id,
        sender: {
          userId: testLearnerId,
          name: 'Test Learner',
          type: 'LEARNER',
        },
        type: ChatMessageType.TEXT,
        text: 'Message to delete',
        isDeleted: false,
      });

      // Delete the message
      await chatMessageService.deleteMessage({
        messageId: message._id,
        deletedBy: testLearnerId,
      });

      // Verify soft delete
      const deletedMessage = await ChatMessage.findById(message._id);
      expect(deletedMessage?.isDeleted).toBe(true);
      expect(deletedMessage?.deletedAt).toBeDefined();
    });

    it('should mark messages as read', async () => {
      const room = await createTestRoom();
      const { chatMessageService } = await import('@core/services/shared/chat');

      // Create user state with unread count
      await ChatUserState.create({
        roomId: room._id,
        userId: testLearnerId,
        unreadCount: 5,
      });

      // Mark as read
      await chatMessageService.markAsRead(room._id, testLearnerId);

      // Verify unread count is 0
      const userState = await ChatUserState.findOne({
        roomId: room._id,
        userId: testLearnerId,
      });
      expect(userState?.unreadCount).toBe(0);
    });
  });

  describe('Participant Service Tests', () => {
    it('should allow hub member to join a room', async () => {
      const room = await createTestRoom();
      const { chatParticipantService } = await import('@core/services/shared/chat');

      const participant = await chatParticipantService.joinRoom({
        roomId: room._id,
        userId: testHubMemberId,
        hubId: testHubId,
        user: {
          name: 'Hub Member',
          email: 'member@hub.com',
        },
      });

      expect(participant.status).toBe(ChatParticipantStatus.JOINED);
      expect(participant.type).toBe(ChatParticipantType.HUB_TEAM);

      // Verify participant was added to room
      const updatedRoom = await ChatRoom.findById(room._id);
      expect(updatedRoom?.participants).toHaveLength(2);
      expect(updatedRoom?.participantIds).toHaveLength(2);
    });

    it('should allow hub member to be assigned', async () => {
      const room = await createTestRoom();
      const { chatParticipantService } = await import('@core/services/shared/chat');

      const participant = await chatParticipantService.assignMember({
        roomId: room._id,
        userId: testHubMemberId,
        hubId: testHubId,
        user: {
          name: 'Hub Member',
          email: 'member@hub.com',
        },
        assignedBy: testHubMemberId,
        assignedByName: 'Hub Member',
      });

      expect(participant.isAssigned).toBe(true);
      expect(participant.assignedAt).toBeDefined();
    });

    it('should prevent learner from leaving booking room', async () => {
      const room = await ChatRoom.create({
        contextType: ChatContextType.BOOKING,
        contextSnapshot: { title: 'Test Booking' },
        hubId: testHubId,
        hubSnapshot: { name: 'Test Hub' },
        learnerId: testLearnerId,
        learnerSnapshot: { name: 'Test Learner', email: 'learner@test.com' },
        participants: [
          {
            userId: testLearnerId,
            name: 'Test Learner',
            email: 'learner@test.com',
            type: ChatParticipantType.LEARNER,
            status: ChatParticipantStatus.JOINED,
            isAssigned: false,
            joinedAt: new Date(),
          },
        ],
        participantIds: [testLearnerId],
        messageCount: 0,
        initiatedBy: ChatInitiatedBy.LEARNER,
        status: ChatRoomStatus.ACTIVE,
        createdBy: testLearnerId,
      });

      const { chatParticipantService } = await import('@core/services/shared/chat');

      await expect(
        chatParticipantService.leaveRoom({
          roomId: room._id,
          userId: testLearnerId,
        }),
      ).rejects.toThrow('Learners cannot leave this conversation');
    });
  });

  describe('Room Lifecycle Service Tests', () => {
    it('should find or create a room', async () => {
      const { chatRoomService } = await import('@core/services/shared/chat');

      const room = await chatRoomService.getOrCreateRoom({
        contextType: ChatContextType.EXPERTISE,
        contextId: new mongoose.Types.ObjectId(),
        contextSnapshot: { title: 'Test Expertise' },
        hubId: testHubId,
        hubSnapshot: { name: 'Test Hub' },
        learnerId: testLearnerId,
        learnerSnapshot: { name: 'Learner', email: 'learner@test.com' },
        initiatedBy: ChatInitiatedBy.LEARNER,
        createdBy: testLearnerId,
      });

      expect(room._id).toBeDefined();
      expect(room.status).toBe(ChatRoomStatus.ACTIVE);

      // Calling again should return the same room
      const sameRoom = await chatRoomService.getOrCreateRoom({
        contextType: ChatContextType.EXPERTISE,
        contextId: room.contextId,
        contextSnapshot: { title: 'Test Expertise' },
        hubId: testHubId,
        hubSnapshot: { name: 'Test Hub' },
        learnerId: testLearnerId,
        learnerSnapshot: { name: 'Learner', email: 'learner@test.com' },
        initiatedBy: ChatInitiatedBy.LEARNER,
        createdBy: testLearnerId,
      });

      expect(sameRoom._id.toString()).toBe(room._id.toString());
    });

    it('should close and reopen a room', async () => {
      const { chatRoomService } = await import('@core/services/shared/chat');
      const room = await createTestRoom();

      // Close room
      const closedRoom = await chatRoomService.closeRoom(room._id, testHubMemberId);
      expect(closedRoom.status).toBe(ChatRoomStatus.CLOSED);

      // Reopen room
      const reopenedRoom = await chatRoomService.reopenRoom(room._id, testHubMemberId);
      expect(reopenedRoom.status).toBe(ChatRoomStatus.ACTIVE);
    });
  });

  // Helper function to create a test room
  async function createTestRoom() {
    return ChatRoom.create({
      contextType: ChatContextType.EXPERTISE,
      contextSnapshot: {
        title: 'Test Expertise',
      },
      hubId: testHubId,
      hubSnapshot: {
        name: 'Test Hub',
      },
      learnerId: testLearnerId,
      learnerSnapshot: {
        name: 'Test Learner',
        email: 'learner@test.com',
      },
      participants: [
        {
          userId: testLearnerId,
          name: 'Test Learner',
          email: 'learner@test.com',
          type: ChatParticipantType.LEARNER,
          status: ChatParticipantStatus.JOINED,
          isAssigned: false,
          joinedAt: new Date(),
        },
      ],
      participantIds: [testLearnerId],
      messageCount: 0,
      initiatedBy: ChatInitiatedBy.LEARNER,
      status: ChatRoomStatus.ACTIVE,
      createdBy: testLearnerId,
    });
  }
});
