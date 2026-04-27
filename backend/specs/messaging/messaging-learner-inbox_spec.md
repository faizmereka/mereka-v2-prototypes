---
title: Messaging Learner Inbox
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
  - specs/messaging/messaging-hub-inbox_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

The Learner Inbox API - simplified endpoints for learners to view and interact with their conversations.

## Key Differences from Hub Inbox

- No filtering (all rooms shown)
- No assignment features
- Privacy: hub members shown as "Hub Team"
- Simpler response format

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

### Room List

- [ ] AC-LI-001: GET `/user/chat-rooms` MUST return all rooms where learner is participant
- [ ] AC-LI-002: Response MUST NOT include individual hub member details
- [ ] AC-LI-003: Each room MUST show `hubSnapshot` (name, logo)
- [ ] AC-LI-004: Each room MUST show `contextSnapshot` (title, type)
- [ ] AC-LI-005: Each room MUST show `lastMessage` preview
- [ ] AC-LI-006: Each room MUST show `unreadCount` for current user
- [ ] AC-LI-007: Rooms MUST be sorted by `lastMessage.sentAt` descending
- [ ] AC-LI-008: Response MUST support cursor-based pagination

### Room Detail

- [ ] AC-LI-010: GET `/chat-rooms/:roomId` MUST verify learner is participant
- [ ] AC-LI-011: Response MUST NOT include individual hub member names/emails
- [ ] AC-LI-012: Participants MUST be shown as `{ type: 'HUB_TEAM', name: hubName }`
- [ ] AC-LI-013: Response MUST include `contextSnapshot` with full details

### Messages (Privacy Transform)

- [ ] AC-LI-020: GET `/chat-rooms/:roomId/messages` MUST transform hub member senders
- [ ] AC-LI-021: Hub member messages MUST show `sender.name` as hub name (not individual name)
- [ ] AC-LI-022: Hub member messages MUST NOT include `sender.email`
- [ ] AC-LI-023: Learner's own messages MUST show their actual name

### User Actions

- [ ] AC-LI-030: POST `/chat-rooms/:roomId/messages` MUST work for learners
- [ ] AC-LI-031: POST `/chat-rooms/:roomId/read` MUST mark as read for learner
- [ ] AC-LI-032: PATCH `/chat-rooms/:roomId/settings` MUST allow archive/mute for learner
- [ ] AC-LI-033: Learner MUST NOT be able to leave booking/contract rooms

### Total Unread

- [ ] AC-LI-040: GET `/user/chat-rooms/unread-count` MUST return total unread for learner

---



### Non-Functional Requirements

(To be defined)
## API Endpoints

### List Learner Rooms

```http
GET /user/chat-rooms?cursor=&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "_id": "room_abc",
        "contextType": "EXPERTISE",
        "contextSnapshot": {
          "title": "Python Masterclass",
          "image": "https://..."
        },
        "hubSnapshot": {
          "name": "Code Academy",
          "logo": "https://..."
        },
        "lastMessage": {
          "preview": "Thanks for your question!",
          "sentAt": "2026-02-17T10:30:00Z",
          "senderName": "Code Academy"
        },
        "unreadCount": 3,
        "status": "ACTIVE"
      }
    ],
    "pagination": {
      "cursor": "room_last",
      "hasMore": true
    }
  }
}
```

### Get Room Detail (Learner View)

```http
GET /chat-rooms/:roomId
Authorization: Bearer <token>
```

**Response (for learner):**
```json
{
  "success": true,
  "data": {
    "_id": "room_abc",
    "contextType": "BOOKING",
    "contextSnapshot": {
      "title": "Python Masterclass - March 15",
      "status": "CONFIRMED"
    },
    "hubSnapshot": {
      "name": "Code Academy",
      "logo": "https://..."
    },
    "participants": [
      {
        "type": "LEARNER",
        "name": "John Doe",
        "isCurrentUser": true
      },
      {
        "type": "HUB_TEAM",
        "name": "Code Academy"
      }
    ],
    "mySettings": {
      "unreadCount": 0,
      "isArchived": false,
      "isMuted": false
    },
    "status": "ACTIVE"
  }
}
```

### Get Messages (Learner View)

```http
GET /chat-rooms/:roomId/messages
Authorization: Bearer <token>
```

**Response (privacy transformed):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "msg_1",
        "sender": {
          "name": "John Doe",
          "type": "LEARNER"
        },
        "type": "TEXT",
        "text": "Hi, I have a question",
        "createdAt": "2026-02-17T10:00:00Z"
      },
      {
        "_id": "msg_2",
        "sender": {
          "name": "Code Academy",
          "type": "HUB_TEAM"
        },
        "type": "TEXT",
        "text": "Sure, how can I help?",
        "createdAt": "2026-02-17T10:05:00Z"
      }
    ]
  }
}
```

---

## Privacy Transform Implementation

```typescript
// src/core/services/chat/learnerInbox.service.ts

function transformMessageForLearner(message: IChatMessage, room: IChatRoom): LearnerMessage {
  if (message.sender.type === 'HUB_TEAM') {
    return {
      ...message,
      sender: {
        type: 'HUB_TEAM',
        name: room.hubSnapshot.name,
        // No avatar, no email, no individual name
      },
    };
  }
  return {
    ...message,
    sender: {
      type: 'LEARNER',
      name: message.sender.name,
      avatar: message.sender.avatar,
    },
  };
}

function transformRoomForLearner(room: IChatRoom): LearnerRoomResponse {
  return {
    _id: room._id,
    contextType: room.contextType,
    contextSnapshot: room.contextSnapshot,
    hubSnapshot: room.hubSnapshot,
    lastMessage: room.lastMessage ? {
      preview: room.lastMessage.preview,
      sentAt: room.lastMessage.sentAt,
      senderName: room.lastMessage.senderName.includes('@')
        ? room.hubSnapshot.name // Replace individual name with hub name
        : room.lastMessage.senderName,
    } : undefined,
    status: room.status,
  };
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/services/chat/learnerInbox.service.ts` | Learner inbox service |
| `src/modules/web/routes/chat/userChat.routes.ts` | API routes |
| `src/modules/web/controllers/chat/userChat.controller.ts` | Controller |

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
# @covers AC-LI-001 through AC-LI-040
npm test -- tests/core/services/chat/learnerInbox.service.test.ts
npm test -- tests/modules/web/routes/chat/userChat.routes.test.ts
```
