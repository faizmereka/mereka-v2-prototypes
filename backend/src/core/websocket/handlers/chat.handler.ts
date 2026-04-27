// src/core/websocket/handlers/chat.handler.ts
// @spec: specs/messaging/messaging-realtime_spec.md
// @covers AC-RT-020 through AC-RT-046, AC-RT-050 through AC-RT-061

import { ChatParticipantStatus, ChatRoom } from '@core/models/ChatRoom';
import { ChatUserState } from '@core/models/ChatUserState';
import mongoose from 'mongoose';
import type { Server, Socket } from '../types';

// Typing timeout tracking (per user per room)
const typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
const TYPING_TIMEOUT_MS = 5000; // AC-RT-045: Auto-expire after 5 seconds

/**
 * Chat Socket Handler
 * Handles all chat-related WebSocket events
 */
export function chatSocketHandler(io: Server, socket: Socket): void {
  const userId = socket.data.userId;
  socket.data.joinedRooms = new Set();
  socket.data.typingRooms = new Set();

  // ============================================
  // JOIN ROOM
  // @covers AC-RT-020, AC-RT-021, AC-RT-022, AC-RT-024
  // ============================================
  socket.on('join_room', async ({ roomId }) => {
    try {
      // AC-RT-021: Verify user is a participant
      const canJoin = await isParticipant(roomId, userId);
      if (!canJoin) {
        socket.emit('error', { message: 'Not a participant of this room' });
        return;
      }

      // AC-RT-022: Add socket to Socket.IO room
      await socket.join(roomId);
      socket.data.joinedRooms.add(roomId);

      // Also join user-specific room for personal notifications
      await socket.join(`user:${userId}`);

      socket.emit('joined_room', { roomId });
    } catch (error) {
      console.error('[Socket] Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // ============================================
  // LEAVE ROOM
  // @covers AC-RT-023
  // ============================================
  socket.on('leave_room', async ({ roomId }) => {
    try {
      await socket.leave(roomId);
      socket.data.joinedRooms.delete(roomId);

      // Clear typing state if any
      clearTypingState(io, socket, roomId);

      socket.emit('left_room', { roomId });
    } catch (error) {
      console.error('[Socket] Error leaving room:', error);
    }
  });

  // ============================================
  // TYPING START
  // @covers AC-RT-040, AC-RT-042, AC-RT-043, AC-RT-045
  // ============================================
  socket.on('typing_start', ({ roomId }) => {
    // AC-RT-042: Broadcast to OTHER room members (not sender)
    socket.to(roomId).emit('user_typing', {
      roomId,
      userId,
      userName: socket.data.user?.name || 'User',
    });

    socket.data.typingRooms.add(roomId);

    // AC-RT-045: Auto-expire typing state after 5 seconds
    const timeoutKey = `${userId}:${roomId}`;
    const existingTimeout = typingTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      socket.to(roomId).emit('user_stopped_typing', { roomId, userId });
      socket.data.typingRooms.delete(roomId);
      typingTimeouts.delete(timeoutKey);
    }, TYPING_TIMEOUT_MS);

    typingTimeouts.set(timeoutKey, timeout);
  });

  // ============================================
  // TYPING STOP
  // @covers AC-RT-041, AC-RT-044
  // ============================================
  socket.on('typing_stop', ({ roomId }) => {
    clearTypingState(io, socket, roomId);
  });

  // ============================================
  // MARK READ
  // @covers AC-RT-052
  // ============================================
  socket.on('mark_read', async ({ roomId }) => {
    try {
      // Update unread count to 0
      await ChatUserState.findOneAndUpdate(
        {
          roomId: new mongoose.Types.ObjectId(roomId),
          userId: new mongoose.Types.ObjectId(userId),
        },
        {
          unreadCount: 0,
          lastReadAt: new Date(),
        },
      );

      // AC-RT-052: Emit unread_update with count: 0
      socket.emit('unread_update', { roomId, count: 0 });

      // AC-RT-053: Emit total_unread_update
      const totalUnread = await getTotalUnreadCount(userId);
      socket.emit('total_unread_update', { total: totalUnread });
    } catch (error) {
      console.error('[Socket] Error marking room as read:', error);
    }
  });

  // ============================================
  // DISCONNECT
  // @covers AC-RT-025, AC-RT-046
  // ============================================
  socket.on('disconnect', () => {
    // AC-RT-046: Clear all typing states for this user
    for (const roomId of socket.data.typingRooms) {
      socket.to(roomId).emit('user_stopped_typing', { roomId, userId });
      const timeoutKey = `${userId}:${roomId}`;
      const timeout = typingTimeouts.get(timeoutKey);
      if (timeout) {
        clearTimeout(timeout);
        typingTimeouts.delete(timeoutKey);
      }
    }

    // AC-RT-025: Auto-leave all rooms (Socket.IO does this automatically)
    socket.data.joinedRooms.clear();
    socket.data.typingRooms.clear();

    console.info(`[Socket] User ${userId} disconnected`);
  });
}

/**
 * Check if user is a participant of the room
 * @covers AC-RT-021
 */
async function isParticipant(roomId: string, userId: string): Promise<boolean> {
  try {
    const room = await ChatRoom.findById(roomId).lean();
    if (!room) return false;

    // Check if user is the learner
    if (room.learnerId?.toString() === userId) {
      return true;
    }

    // Check if user is in participants list
    const isInParticipants = room.participants.some(
      (p) => p.userId.toString() === userId && p.status === ChatParticipantStatus.JOINED,
    );

    if (isInParticipants) {
      return true;
    }

    // Check participantIds array
    if (room.participantIds.some((id) => id.toString() === userId)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Socket] Error checking participant:', error);
    return false;
  }
}

/**
 * Get total unread count for user
 * @covers AC-RT-053
 */
async function getTotalUnreadCount(userId: string): Promise<number> {
  try {
    const result = await ChatUserState.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
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

    return result.length > 0 ? (result[0]?.total as number) : 0;
  } catch (error) {
    console.error('[Socket] Error getting total unread count:', error);
    return 0;
  }
}

/**
 * Clear typing state for a user in a room
 */
function clearTypingState(_io: Server, socket: Socket, roomId: string): void {
  const userId = socket.data.userId;
  const timeoutKey = `${userId}:${roomId}`;

  const timeout = typingTimeouts.get(timeoutKey);
  if (timeout) {
    clearTimeout(timeout);
    typingTimeouts.delete(timeoutKey);
  }

  socket.data.typingRooms.delete(roomId);
  socket.to(roomId).emit('user_stopped_typing', { roomId, userId });
}
