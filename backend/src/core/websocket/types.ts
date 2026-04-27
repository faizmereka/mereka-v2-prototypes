// src/core/websocket/types.ts
// @spec: specs/messaging/messaging-realtime_spec.md
// Socket.IO types for chat messaging

import type { Server as BaseServer, Socket as BaseSocket } from 'socket.io';

// ============================================
// SOCKET DATA
// ============================================

export interface SocketData {
  userId: string;
  user: {
    uid: string;
    email?: string;
    name?: string;
  };
  joinedRooms: Set<string>;
  typingRooms: Set<string>;
}

// ============================================
// CLIENT TO SERVER EVENTS
// ============================================

export interface ClientToServerEvents {
  join_room: (data: { roomId: string }) => void;
  leave_room: (data: { roomId: string }) => void;
  typing_start: (data: { roomId: string }) => void;
  typing_stop: (data: { roomId: string }) => void;
  mark_read: (data: { roomId: string }) => void;
}

// ============================================
// SERVER TO CLIENT EVENTS
// ============================================

export interface ServerToClientEvents {
  new_message: (message: ChatMessagePayload) => void;
  message_deleted: (data: { roomId: string; messageId: string }) => void;
  user_typing: (data: { roomId: string; userId: string; userName: string }) => void;
  user_stopped_typing: (data: { roomId: string; userId: string }) => void;
  unread_update: (data: { roomId: string; count: number }) => void;
  total_unread_update: (data: { total: number }) => void;
  room_updated: (data: { roomId: string; type: string; data: unknown }) => void;
  auth_error: (data: { message: string }) => void;
  error: (data: { message: string }) => void;
  joined_room: (data: { roomId: string }) => void;
  left_room: (data: { roomId: string }) => void;
}

// ============================================
// INTER-SERVER EVENTS (for Redis adapter)
// ============================================

export interface InterServerEvents {
  ping: () => void;
}

// ============================================
// CHAT MESSAGE PAYLOAD
// ============================================

export interface ChatMessagePayload {
  _id: string;
  roomId: string;
  sender: {
    userId: string;
    hubId?: string;
    name: string;
    avatar?: string;
    type: 'LEARNER' | 'HUB_TEAM';
  };
  type: 'TEXT' | 'FILE' | 'EVENT';
  text?: string;
  files?: Array<{
    name: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    thumbnailUrl?: string;
  }>;
  event?: {
    eventType: string;
    entityType: string;
    entityId: string;
    summary: string;
    data: Record<string, unknown>;
  };
  createdAt: string;
  updatedAt: string;
}

// ============================================
// TYPED SOCKET AND SERVER
// ============================================

export type Socket = BaseSocket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type Server = BaseServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
