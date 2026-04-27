---
title: Messaging Unread Tracking
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
  - specs/messaging/messaging-realtime_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

Unread message tracking per user per room:
- Unread count badges on rooms
- Total unread count for inbox badge
- Mark as read functionality
- Real-time count updates

## Why

Users need to know which conversations need attention. Accurate unread counts are essential UX.

---

# Agent Contract

## Scope

This spec covers the implementation requirements defined in the Acceptance Criteria below.

## Non-goals

- Features not listed in Acceptance Criteria
- Implementation details beyond specified requirements

## Requirements

System MUST implement all acceptance criteria defined below.


## Acceptance Criteria

### Unread Count Increment

- [x] AC-UT-001: When new message arrives, system MUST increment `unreadCount` for all participants EXCEPT sender
- [x] AC-UT-002: When new message arrives, system MUST update `ChatUserState.unreadCount` for each participant
- [x] AC-UT-003: Increment MUST happen even if user is not currently connected
- [x] AC-UT-004: Event messages MUST also increment unread counts

### Mark as Read

- [x] AC-UT-010: When user opens room, system MUST reset their `unreadCount` to 0
- [x] AC-UT-011: System MUST update `ChatUserState.lastReadMessageId` to latest message
- [x] AC-UT-012: System MUST update `ChatUserState.lastReadAt` to current time
- [x] AC-UT-013: Mark as read MUST be triggered automatically when room is opened
- [x] AC-UT-014: POST `/chat-rooms/:roomId/read` MUST mark room as read

### Total Unread Count

- [x] AC-UT-020: System MUST provide total unread count across all rooms for a user
- [x] AC-UT-021: GET `/user/chat-rooms/unread-count` MUST return `{ total: number }`
- [x] AC-UT-022: Total MUST exclude archived rooms (per user)
- [x] AC-UT-023: Total MUST exclude muted rooms (per user)

### Real-time Updates

- [x] AC-UT-030: When unread count changes, system MUST emit `unread_update` via Socket.IO
- [x] AC-UT-031: `unread_update` event MUST include `{ roomId, count }`
- [x] AC-UT-032: When total unread changes, system MUST emit `total_unread_update`
- [x] AC-UT-033: `total_unread_update` event MUST include `{ total }`

### User State Management

- [x] AC-UT-040: System MUST create `ChatUserState` record when user first interacts with room
- [x] AC-UT-041: `ChatUserState` MUST be created with `unreadCount: 0` for room creator
- [x] AC-UT-042: When participant joins room, system MUST create their `ChatUserState`

---



### Non-Functional Requirements

(To be defined)
## Service Implementation

```typescript
// src/core/services/chat/unreadTracking.service.ts

interface UnreadTrackingService {
  /**
   * Increment unread count for participants (except sender)
   * @covers AC-UT-001, AC-UT-002
   */
  incrementUnread(params: {
    roomId: ObjectId;
    excludeUserId: ObjectId;
  }): Promise<void>;

  /**
   * Reset unread count to 0 for a user
   * @covers AC-UT-010, AC-UT-011, AC-UT-012
   */
  markAsRead(params: {
    roomId: ObjectId;
    userId: ObjectId;
    lastMessageId: ObjectId;
  }): Promise<void>;

  /**
   * Get total unread count for a user
   * @covers AC-UT-020, AC-UT-022, AC-UT-023
   */
  getTotalUnread(userId: ObjectId): Promise<number>;

  /**
   * Get unread count for specific room
   */
  getRoomUnread(roomId: ObjectId, userId: ObjectId): Promise<number>;

  /**
   * Create initial ChatUserState for participant
   * @covers AC-UT-040, AC-UT-041
   */
  initializeUserState(params: {
    roomId: ObjectId;
    userId: ObjectId;
    hubId?: ObjectId;
    initialUnread?: number;
  }): Promise<IChatUserState>;
}
```

### Implementation Details

```typescript
// src/core/services/chat/unreadTracking.service.ts

class UnreadTrackingServiceImpl implements UnreadTrackingService {
  async incrementUnread({ roomId, excludeUserId }: { roomId: ObjectId; excludeUserId: ObjectId }) {
    // Increment for all participants except sender
    await ChatUserState.updateMany(
      {
        roomId,
        userId: { $ne: excludeUserId },
        isMuted: { $ne: true }, // Don't increment for muted
      },
      {
        $inc: { unreadCount: 1 },
        $set: { updatedAt: new Date() },
      }
    );

    // Emit real-time updates
    const states = await ChatUserState.find({ roomId, userId: { $ne: excludeUserId } });
    for (const state of states) {
      fastify.io.to(`user:${state.userId}`).emit('unread_update', {
        roomId: roomId.toString(),
        count: state.unreadCount,
      });
    }
  }

  async markAsRead({ roomId, userId, lastMessageId }: MarkAsReadParams) {
    const state = await ChatUserState.findOneAndUpdate(
      { roomId, userId: userId },
      {
        $set: {
          unreadCount: 0,
          lastReadMessageId: lastMessageId,
          lastReadAt: new Date(),
          hasViewed: true,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    // Emit real-time update
    fastify.io.to(`user:${userId}`).emit('unread_update', {
      roomId: roomId.toString(),
      count: 0,
    });

    // Update total unread
    const total = await this.getTotalUnread(userId);
    fastify.io.to(`user:${userId}`).emit('total_unread_update', { total });
  }

  async getTotalUnread(userId: ObjectId): Promise<number> {
    const result = await ChatUserState.aggregate([
      {
        $match: {
          userId: userId,
          isArchived: { $ne: true },
          isMuted: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$unreadCount' },
        },
      },
    ]);

    return result[0]?.total ?? 0;
  }
}
```

---

## API Endpoints

### Mark Room as Read

```http
POST /chat-rooms/:roomId/read
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "room_abc",
    "unreadCount": 0
  }
}
```

### Get Total Unread

```http
GET /user/chat-rooms/unread-count
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 12
  }
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/services/chat/unreadTracking.service.ts` | Unread tracking service |
| `src/modules/shared/routes/chat/unread.routes.ts` | API routes |

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
# @covers AC-UT-001 through AC-UT-042
npm test -- tests/core/services/chat/unreadTracking.service.test.ts
```

### Test Scenarios

1. Send message, verify other participants' counts increment
2. Open room, verify count resets to 0
3. Get total unread, verify excludes archived/muted
4. Join room, verify ChatUserState created
