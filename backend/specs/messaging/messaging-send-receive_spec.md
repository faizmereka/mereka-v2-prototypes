---
title: Messaging Send & Receive
type: feature_spec
status: implemented
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-17'
depends_on:
- specs/messaging/messaging-data-models_spec.md
- specs/messaging/messaging-participants_spec.md
links:
  related_specs:
  - specs/messaging/messaging-realtime_spec.md
  - specs/messaging/messaging-files_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

The core message sending and receiving functionality:
- Send text messages
- Receive messages (via API and WebSocket)
- Delete messages (soft delete)
- Message validation and limits

## Why

This is the core chat functionality. Without it, there is no messaging.

## Success looks like

- Messages send instantly
- Messages delivered to all participants
- Deleted messages show "This message was deleted"
- Message limits enforced

---

# Agent Contract

## Scope

#
## Non-goals

- Items explicitly not covered by this spec

## In Scope

- Send text messages
- Message validation
- Message retrieval (pagination)
- Message deletion (soft delete)
- Last message cache update

### Out of Scope

- File attachments (see messaging-files_spec)
- Event messages (see messaging-events_spec)
- Real-time delivery (see messaging-realtime_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Sending Messages

- [x] AC-SR-001: Participant with `status: JOINED` MUST be able to send messages
- [x] AC-SR-002: Participant with `status: LEFT` MUST NOT be able to send messages
- [x] AC-SR-003: Hub member who hasn't joined MUST NOT be able to send messages
- [x] AC-SR-004: Room with `status: CLOSED` MUST NOT accept new messages
- [x] AC-SR-005: Message MUST be created with `type: TEXT`
- [x] AC-SR-006: Message MUST include `sender` object with userId, name, avatar, type
- [x] AC-SR-007: Message MUST have `createdAt` set to server timestamp (not client)
- [x] AC-SR-008: After sending, system MUST update room's `lastMessage` cache
- [x] AC-SR-009: After sending, system MUST increment room's `messageCount`
- [x] AC-SR-010: After sending, system MUST increment `unreadCount` for all OTHER participants

### Message Validation

- [x] AC-SR-020: Message text MUST NOT exceed 10,000 characters
- [x] AC-SR-021: Message text MUST NOT be empty or whitespace-only
- [x] AC-SR-022: Message MUST be sanitized (strip dangerous HTML, preserve safe formatting)
- [x] AC-SR-023: URLs in message MUST be preserved and linkified on display
- [x] AC-SR-024: Emoji in message MUST be preserved

### Rate Limiting

- [ ] AC-SR-030: User MUST NOT send more than 10 messages per second
- [ ] AC-SR-031: If rate limit exceeded, return 429 Too Many Requests
- [ ] AC-SR-032: Rate limit MUST be per user, not per room

### Retrieving Messages

- [x] AC-SR-040: GET messages MUST support cursor-based pagination
- [x] AC-SR-041: Default page size MUST be 20 messages
- [x] AC-SR-042: Messages MUST be ordered by `createdAt` descending (newest first)
- [x] AC-SR-043: Pagination cursor MUST be the `_id` of the last message
- [x] AC-SR-044: Deleted messages MUST be included but show `isDeleted: true`
- [x] AC-SR-045: Deleted messages MUST have `text` replaced with null (not original text)
- [x] AC-SR-046: Response MUST include `hasMore: boolean` to indicate more pages

### Deleting Messages

- [x] AC-SR-050: Only message sender MUST be able to delete their message
- [x] AC-SR-051: Deletion MUST be soft delete: set `isDeleted: true`, `deletedAt: now`
- [x] AC-SR-052: Deleted message MUST remain in database (for audit)
- [x] AC-SR-053: Message CAN only be deleted within 24 hours of sending
- [x] AC-SR-054: After 24 hours, deletion MUST be rejected with error
- [x] AC-SR-055: System MUST broadcast `message_deleted` event to room participants
- [x] AC-SR-056: If deleted message was `lastMessage`, system MUST update to previous message

---



### Non-Functional Requirements

(To be defined)
## API Endpoints

### Send Message

```http
POST /chat-rooms/:roomId/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Hello, I have a question about..."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "msg_abc123",
    "roomId": "room_xyz",
    "sender": {
      "userId": "user_123",
      "name": "John Doe",
      "avatar": "https://...",
      "type": "LEARNER"
    },
    "type": "TEXT",
    "text": "Hello, I have a question about...",
    "createdAt": "2026-02-17T10:30:00Z",
    "isDeleted": false
  }
}
```

**Errors:**
- 400: Empty message or exceeds 10k chars
- 403: Not a joined participant
- 404: Room not found
- 423: Room is closed
- 429: Rate limit exceeded

### Get Messages

```http
GET /chat-rooms/:roomId/messages?cursor=msg_abc123&limit=20
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "msg_xyz",
        "sender": { ... },
        "type": "TEXT",
        "text": "Latest message",
        "createdAt": "2026-02-17T10:35:00Z",
        "isDeleted": false
      },
      {
        "_id": "msg_deleted",
        "sender": { ... },
        "type": "TEXT",
        "text": null,
        "createdAt": "2026-02-17T10:32:00Z",
        "isDeleted": true,
        "deletedAt": "2026-02-17T10:33:00Z"
      }
    ],
    "pagination": {
      "cursor": "msg_oldest",
      "hasMore": true
    }
  }
}
```

### Delete Message

```http
DELETE /chat-rooms/:roomId/messages/:messageId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_abc123",
    "deletedAt": "2026-02-17T10:40:00Z"
  }
}
```

**Errors:**
- 403: Not the message sender
- 404: Message not found
- 410: Message already deleted
- 422: Cannot delete after 24 hours

---

## Service Methods

```typescript
// src/core/services/chat/chatMessage.service.ts

interface ChatMessageService {
  /**
   * Send a text message
   * @covers AC-SR-001 through AC-SR-010
   */
  sendMessage(params: {
    roomId: ObjectId;
    senderId: ObjectId;
    text: string;
  }): Promise<IChatMessage>;

  /**
   * Get messages with pagination
   * @covers AC-SR-040 through AC-SR-046
   */
  getMessages(params: {
    roomId: ObjectId;
    cursor?: ObjectId;
    limit?: number;
  }): Promise<{ messages: IChatMessage[]; hasMore: boolean; cursor?: ObjectId }>;

  /**
   * Soft delete a message
   * @covers AC-SR-050 through AC-SR-056
   */
  deleteMessage(params: {
    messageId: ObjectId;
    deletedBy: ObjectId;
  }): Promise<void>;

  /**
   * Update room's lastMessage cache
   * @covers AC-SR-008, AC-SR-056
   */
  updateLastMessageCache(roomId: ObjectId): Promise<void>;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/services/chat/chatMessage.service.ts` | Message service |
| `src/modules/shared/routes/chat/message.routes.ts` | API routes |
| `src/modules/shared/controllers/chat/message.controller.ts` | Controller |
| `src/core/schemas/chat/message.schema.ts` | Validation schemas |

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
# @covers AC-SR-001 through AC-SR-056
npm test -- tests/core/services/chat/chatMessage.service.test.ts
npm test -- tests/modules/shared/routes/chat/message.routes.test.ts
```
