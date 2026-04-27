// src/core/websocket/socket.ts
// @spec: specs/messaging/messaging-realtime_spec.md
// @covers AC-RT-001 through AC-RT-014, AC-RT-070 through AC-RT-081

import { env } from '@core/config/env';
import type { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { chatSocketHandler } from './handlers/chat.handler';
import type { ChatMessagePayload, Server, Socket } from './types';

// Store io instance for use in services
let ioInstance: Server | null = null;

/**
 * Get the Socket.IO server instance
 * Used by services to broadcast messages
 */
export function getIO(): Server | null {
  return ioInstance;
}

/**
 * Setup Socket.IO server with Fastify
 * @covers AC-RT-001, AC-RT-002, AC-RT-003, AC-RT-004
 */
export function setupSocketIO(fastify: FastifyInstance): Server {
  // AC-RT-001: Use Socket.IO for WebSocket connections
  const io: Server = new SocketIOServer(fastify.server, {
    // AC-RT-004: CORS configuration
    cors: {
      origin: [
        'https://app.mereka.io',
        'https://hub.mereka.io',
        'https://admin.mereka.io',
        'http://localhost:3000',
        'http://localhost:4200',
        'http://localhost:4201',
        'http://localhost:4202',
        'http://localhost:4203',
        'http://localhost:4204',
        'http://localhost:5173',
      ],
      credentials: true,
    },
    // AC-RT-081: Transport preference - WebSocket first, then polling
    transports: ['websocket', 'polling'],
    // AC-RT-073: Heartbeat interval (25 seconds)
    pingInterval: 25000,
    // AC-RT-074: Connection timeout (60 seconds)
    pingTimeout: 60000,
    // Allow upgrades from polling to websocket
    allowUpgrades: true,
  });

  // AC-RT-003: Redis adapter for multi-instance support
  // Uncomment when Redis is available
  // if (env.REDIS_URL) {
  //   const pubClient = createClient({ url: env.REDIS_URL });
  //   const subClient = pubClient.duplicate();
  //   io.adapter(createAdapter(pubClient, subClient));
  // }

  // AC-RT-010, AC-RT-011, AC-RT-012, AC-RT-013, AC-RT-014
  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      // Try to get token from auth object first, then from cookies
      let token = socket.handshake.auth.token;

      // If no token in auth, try to get from cookies
      if (!token) {
        const cookieHeader = socket.handshake.headers.cookie;
        if (cookieHeader) {
          const cookies = cookieHeader.split(';').reduce(
            (acc, cookie) => {
              const [key, value] = cookie.trim().split('=');
              if (key) {
                acc[key] = value || '';
              }
              return acc;
            },
            {} as Record<string, string>,
          );
          token = cookies.accessToken;
        }
      }

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify Firebase token
      const decoded = await verifyToken(token);

      if (!decoded) {
        return next(new Error('Invalid authentication token'));
      }

      // AC-RT-014: Set user data on socket
      socket.data.userId = decoded.uid;
      socket.data.user = {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
      };

      next();
    } catch (error) {
      console.error('[Socket] Authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Handle connections
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.info(`[Socket] User connected: ${userId}`);

    // Setup chat event handlers
    chatSocketHandler(io, socket);

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket] Socket error for user ${userId}:`, error);
    });
  });

  // Store instance for service use
  ioInstance = io;

  // Decorate fastify with io instance
  fastify.decorate('io', io);

  console.info('[Socket] Socket.IO server initialized');

  return io;
}

/**
 * Verify authentication token
 * Supports Firebase tokens and JWT tokens
 * @covers AC-RT-011, AC-RT-012
 */
async function verifyToken(
  token: string,
): Promise<{ uid: string; email?: string; name?: string } | null> {
  try {
    // Try Firebase verification first
    const { getAuth } = await import('firebase-admin/auth');
    const decodedToken = await getAuth().verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
  } catch (firebaseError) {
    // Fallback to JWT verification for development/testing
    try {
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(token, env.JWT_SECRET) as {
        sub?: string;
        userId?: string;
        id?: string;
        email?: string;
        name?: string;
      };

      return {
        uid: decoded.sub || decoded.userId || decoded.id || '',
        email: decoded.email,
        name: decoded.name,
      };
    } catch (_jwtError) {
      console.error('[Socket] Token verification failed:', firebaseError);
      return null;
    }
  }
}

// ============================================
// BROADCAST HELPERS
// Used by services to emit events
// ============================================

/**
 * Broadcast new message to room
 * @covers AC-RT-030, AC-RT-031, AC-RT-032
 */
export function broadcastNewMessage(roomId: string, message: ChatMessagePayload): void {
  const io = getIO();
  if (!io) {
    console.warn('[Socket] Cannot broadcast: Socket.IO not initialized');
    return;
  }

  // AC-RT-030, AC-RT-031: Emit new_message to room
  // AC-RT-032: All room members including sender receive the event
  io.to(roomId).emit('new_message', message);
}

/**
 * Broadcast message deletion to room
 * @covers AC-RT-034, AC-RT-035
 */
export function broadcastMessageDeleted(roomId: string, messageId: string): void {
  const io = getIO();
  if (!io) return;

  io.to(roomId).emit('message_deleted', { roomId, messageId });
}

/**
 * Broadcast unread count update to user
 * @covers AC-RT-050, AC-RT-051
 */
export function broadcastUnreadUpdate(userId: string, roomId: string, count: number): void {
  const io = getIO();
  if (!io) return;

  io.to(`user:${userId}`).emit('unread_update', { roomId, count });
}

/**
 * Broadcast total unread count to user
 * @covers AC-RT-053
 */
export function broadcastTotalUnreadUpdate(userId: string, total: number): void {
  const io = getIO();
  if (!io) return;

  io.to(`user:${userId}`).emit('total_unread_update', { total });
}

/**
 * Broadcast room update to room members
 * @covers AC-RT-060, AC-RT-061
 */
export function broadcastRoomUpdate(roomId: string, updateType: string, data: unknown): void {
  const io = getIO();
  if (!io) return;

  io.to(roomId).emit('room_updated', { roomId, type: updateType, data });
}

/**
 * Send auth error to specific socket
 * @covers AC-RT-013
 */
export function sendAuthError(socketId: string, message: string): void {
  const io = getIO();
  if (!io) return;

  io.to(socketId).emit('auth_error', { message });
}
