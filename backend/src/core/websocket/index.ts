// src/core/websocket/index.ts
// WebSocket (Socket.IO) module barrel export

export { chatSocketHandler } from './handlers/chat.handler';
export {
  broadcastMessageDeleted,
  broadcastNewMessage,
  broadcastRoomUpdate,
  broadcastTotalUnreadUpdate,
  broadcastUnreadUpdate,
  getIO,
  sendAuthError,
  setupSocketIO,
} from './socket';
export type {
  ChatMessagePayload,
  ClientToServerEvents,
  InterServerEvents,
  Server,
  ServerToClientEvents,
  Socket,
  SocketData,
} from './types';
