---
title: Messaging Real-time
type: feature_spec
status: implemented
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-17'
depends_on:
- specs/messaging/messaging-data-models_spec.md
- specs/messaging/messaging-send-receive_spec.md
links:
  related_specs:
  - specs/messaging/messaging-nfr_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

Real-time messaging via WebSocket (Socket.IO):
- Instant message delivery
- Typing indicators
- Unread count updates
- Connection management

## Why

HTTP polling is inefficient and slow. Real-time delivery is expected in modern chat.

## Success looks like

- Messages appear instantly (<500ms)
- Typing indicators work smoothly
- Reconnection is seamless
- Graceful fallback if WebSocket fails

---

# Agent Contract

## Scope

#
## Non-goals

- Items explicitly not covered by this spec

## In Scope

- Socket.IO integration with Fastify
- Room-based message broadcasting
- Typing indicators
- Unread count updates
- Connection authentication
- Reconnection handling

### Out of Scope

- Message storage (see messaging-send-receive_spec)
- Frontend implementation (see messaging-fe-components_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Socket.IO Setup

- [x] AC-RT-001: Server MUST use Socket.IO for WebSocket connections
- [x] AC-RT-002: Socket.IO MUST be integrated with Fastify via fastify-socket.io plugin
- [x] AC-RT-003: Socket.IO MUST use Redis adapter for multi-instance support
- [x] AC-RT-004: CORS MUST be configured for allowed frontend origins

### Authentication

- [x] AC-RT-010: Client MUST send auth token on connection: `io({ auth: { token } })`
- [x] AC-RT-011: Server MUST verify Firebase token on connection
- [x] AC-RT-012: Invalid token MUST reject connection with error
- [x] AC-RT-013: Token expiry during session MUST trigger `auth_error` event
- [x] AC-RT-014: Authenticated socket MUST have `socket.data.userId` set

### Room Management

- [x] AC-RT-020: Client MUST emit `join_room` with `{ roomId }` to join a chat room
- [x] AC-RT-021: Server MUST verify user is a participant before allowing join
- [x] AC-RT-022: Server MUST add socket to Socket.IO room: `socket.join(roomId)`
- [x] AC-RT-023: Client MUST emit `leave_room` with `{ roomId }` when leaving
- [x] AC-RT-024: Client CAN join multiple rooms simultaneously
- [x] AC-RT-025: Disconnect MUST auto-leave all rooms

### Message Broadcasting

- [x] AC-RT-030: When message sent via REST API, server MUST emit `new_message` to room
- [x] AC-RT-031: `new_message` event MUST include full ChatMessage object
- [x] AC-RT-032: Sender MUST also receive the `new_message` event (for confirmation)
- [ ] AC-RT-033: Delivery latency MUST be < 500ms for 95th percentile
- [x] AC-RT-034: When message deleted, server MUST emit `message_deleted` to room
- [x] AC-RT-035: `message_deleted` event MUST include `{ roomId, messageId }`

### Typing Indicators

- [x] AC-RT-040: Client MUST emit `typing_start` with `{ roomId }` when user starts typing
- [x] AC-RT-041: Client MUST emit `typing_stop` with `{ roomId }` when user stops typing
- [x] AC-RT-042: Server MUST broadcast `user_typing` to OTHER room members (not sender)
- [x] AC-RT-043: `user_typing` event MUST include `{ roomId, userId, userName }`
- [x] AC-RT-044: Server MUST broadcast `user_stopped_typing` when received
- [x] AC-RT-045: Typing state MUST auto-expire after 5 seconds (server-side timeout)
- [x] AC-RT-046: Disconnect MUST clear all typing states for that user

### Unread Updates

- [x] AC-RT-050: When new message arrives, server MUST emit `unread_update` to room members
- [x] AC-RT-051: `unread_update` MUST include `{ roomId, count }` for each user
- [x] AC-RT-052: When user marks room as read, server MUST emit `unread_update` with `count: 0`
- [x] AC-RT-053: Server MUST emit `total_unread_update` for global badge: `{ total }`

### Room Updates

- [x] AC-RT-060: When room metadata changes, server MUST emit `room_updated` to room
- [x] AC-RT-061: `room_updated` events include: participant_joined, participant_left, participant_assigned, room_closed

### Connection Management

- [x] AC-RT-070: Server MUST handle reconnection gracefully
- [ ] AC-RT-071: On reconnect, client MUST rejoin previously joined rooms
- [ ] AC-RT-072: Server MUST track connected users for presence (optional: who's online)
- [x] AC-RT-073: Heartbeat interval MUST be 25 seconds
- [x] AC-RT-074: Connection timeout MUST be 60 seconds

### Fallback

- [x] AC-RT-080: If WebSocket fails, client SHOULD fall back to long-polling
- [x] AC-RT-081: Socket.IO transport preference: WebSocket > long-polling

---



### Non-Functional Requirements

(To be defined)
## Socket Events Reference

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomId: string }` | Join a chat room |
| `leave_room` | `{ roomId: string }` | Leave a chat room |
| `typing_start` | `{ roomId: string }` | User started typing |
| `typing_stop` | `{ roomId: string }` | User stopped typing |
| `mark_read` | `{ roomId: string }` | Mark room as read |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | `ChatMessage` | New message in room |
| `message_deleted` | `{ roomId, messageId }` | Message was deleted |
| `user_typing` | `{ roomId, userId, userName }` | User is typing |
| `user_stopped_typing` | `{ roomId, userId }` | User stopped typing |
| `unread_update` | `{ roomId, count }` | Room unread count changed |
| `total_unread_update` | `{ total }` | Total unread count changed |
| `room_updated` | `{ roomId, type, data }` | Room metadata changed |
| `auth_error` | `{ message }` | Authentication failed |

---

## Implementation

### Socket.IO Server Setup

```typescript
// src/core/websocket/socket.ts

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

export function setupSocketIO(fastify: FastifyInstance) {
  const io = new Server(fastify.server, {
    cors: {
      origin: ['https://app.mereka.io', 'https://hub.mereka.io'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // Redis adapter for multi-instance
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = await verifyFirebaseToken(token);
      socket.data.userId = decoded.uid;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Event handlers
  io.on('connection', (socket) => {
    chatSocketHandler(io, socket);
  });

  fastify.decorate('io', io);
}
```

### Chat Socket Handler

```typescript
// src/core/websocket/handlers/chat.handler.ts

export function chatSocketHandler(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // Join room
  socket.on('join_room', async ({ roomId }) => {
    // Verify participant
    const canJoin = await chatParticipantService.isParticipant(roomId, userId);
    if (!canJoin) {
      socket.emit('error', { message: 'Not a participant' });
      return;
    }
    socket.join(roomId);
  });

  // Leave room
  socket.on('leave_room', ({ roomId }) => {
    socket.leave(roomId);
  });

  // Typing indicators
  socket.on('typing_start', ({ roomId }) => {
    socket.to(roomId).emit('user_typing', {
      roomId,
      userId,
      userName: socket.data.user.name,
    });
  });

  socket.on('typing_stop', ({ roomId }) => {
    socket.to(roomId).emit('user_stopped_typing', { roomId, userId });
  });

  // Mark read
  socket.on('mark_read', async ({ roomId }) => {
    await unreadTrackingService.markAsRead(roomId, userId);
    socket.emit('unread_update', { roomId, count: 0 });
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    // Clear typing states, etc.
  });
}
```

### Broadcasting from Services

```typescript
// In chatMessage.service.ts after saving message

// Broadcast to room
fastify.io.to(roomId).emit('new_message', message);

// Update unread counts for all participants except sender
const participants = await chatRoomService.getParticipantIds(roomId);
for (const participantId of participants) {
  if (participantId !== senderId) {
    const count = await unreadTrackingService.incrementUnread(roomId, participantId);
    fastify.io.to(`user:${participantId}`).emit('unread_update', { roomId, count });
  }
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/websocket/socket.ts` | Socket.IO setup |
| `src/core/websocket/handlers/chat.handler.ts` | Chat event handlers |
| `src/core/websocket/middleware/auth.middleware.ts` | Socket authentication |

---


---

## Edge Cases

- See individual AC items for edge case handling

## Observability

- Standard logging for errors and key operations
- Metrics collection per NFR requirements

## Rollout & Rollback

- Feature flag controlled rollout
- Database migrations are backwards compatible

## Open Questions

- None at this time

## Verification

### Automated Tests

```bash
# @covers AC-RT-001 through AC-RT-081
npm test -- tests/core/websocket/chat.handler.test.ts
```

### Manual Verification

1. Open two browser tabs, join same room
2. Send message in one, verify instant delivery in other
3. Test typing indicators
4. Disconnect and reconnect
5. Verify fallback to polling
