---
title: Messaging Hub Inbox
type: feature_spec
status: implemented
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-17'
depends_on:
- specs/messaging/messaging-data-models_spec.md
- specs/messaging/messaging-room-lifecycle_spec.md
- specs/messaging/messaging-participants_spec.md
- specs/messaging/messaging-send-receive_spec.md
- specs/messaging/messaging-realtime_spec.md
- specs/messaging/messaging-unread-tracking_spec.md
links:
  related_specs:
  - specs/messaging/messaging-learner-inbox_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

The Hub Inbox - where hub team members manage all conversations:
- **Sidebar** - Filter categories with counts
- **Room List** - Conversations with previews and unread badges
- **Actions** - Join, Assign, Archive, Mute
- **Room Detail** - Message history and input

## Why

Hub members need a unified view of all conversations. This is their primary interface for customer communication.

## Success looks like

- Hub member sees all conversations at a glance
- Unread counts are accurate and real-time
- Filtering works correctly
- Assignment workflow is intuitive

---

# Agent Contract

## Scope

#
## Non-goals

- Items explicitly not covered by this spec

## In Scope

- Hub inbox API endpoints
- Sidebar filter categories
- Room list with pagination
- Room actions (join, assign, archive, mute)
- Room detail view data

### Out of Scope

- Frontend components (see messaging-fe-hub-inbox_spec)
- Learner inbox (see messaging-learner-inbox_spec)
- Real-time updates (see messaging-realtime_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Sidebar Filters

- [ ] AC-HI-001: Sidebar MUST show filter categories: ALL, ASSIGNED_TO_ME, UNASSIGNED, ARCHIVED
- [ ] AC-HI-002: Each filter MUST show room count (number of rooms matching filter)
- [ ] AC-HI-003: ALL filter MUST show all non-archived rooms for the hub
- [ ] AC-HI-004: ASSIGNED_TO_ME filter MUST show rooms where current user `isAssigned: true`
- [ ] AC-HI-005: UNASSIGNED filter MUST show rooms where NO participant has `isAssigned: true`
- [ ] AC-HI-006: ARCHIVED filter MUST show rooms where current user's ChatUserState `isArchived: true`
- [ ] AC-HI-007: Counts MUST update in real-time when rooms change

### Context Filters (Sub-filters)

- [ ] AC-HI-010: Sidebar MUST show context sub-filters: EXPERTISES, BOOKINGS, JOBS, CONTRACTS
- [ ] AC-HI-011: Context filter MUST show count of rooms with that contextType
- [ ] AC-HI-012: Context filter MUST be combinable with main filter (e.g., ASSIGNED_TO_ME + BOOKINGS)

### Room List

- [ ] AC-HI-020: Room list MUST be sorted by `lastMessage.sentAt` descending (most recent first)
- [ ] AC-HI-021: Room list MUST support cursor-based pagination (20 rooms per page)
- [ ] AC-HI-022: Each room item MUST show:
  - Context badge (Expertise, Booking, Job, Contract)
  - Participant name (learner name or other hub name)
  - Context title (e.g., "About: Python Masterclass")
  - Last message preview (truncated to 100 chars)
  - Last message timestamp (relative: "2 min ago")
  - Unread count badge (if > 0)
  - Assigned member badge (if assigned)
- [ ] AC-HI-023: Unread rooms MUST be visually highlighted
- [ ] AC-HI-024: Rooms MUST show action buttons: [Join], [Assign], [More...]

### Room Actions API

- [ ] AC-HI-030: POST `/hub/:hubId/chat-rooms/:roomId/join` - Join conversation
- [ ] AC-HI-031: POST `/hub/:hubId/chat-rooms/:roomId/assign` - Assign member
- [ ] AC-HI-032: POST `/hub/:hubId/chat-rooms/:roomId/unassign` - Unassign member
- [ ] AC-HI-033: POST `/hub/:hubId/chat-rooms/:roomId/archive` - Archive for current user
- [ ] AC-HI-034: POST `/hub/:hubId/chat-rooms/:roomId/unarchive` - Unarchive for current user
- [ ] AC-HI-035: POST `/hub/:hubId/chat-rooms/:roomId/mute` - Mute notifications
- [ ] AC-HI-036: POST `/hub/:hubId/chat-rooms/:roomId/unmute` - Unmute notifications

### Room Detail View

- [ ] AC-HI-040: GET room detail MUST return room metadata + participants
- [ ] AC-HI-041: Room detail MUST show context information (linked entity details)
- [ ] AC-HI-042: Room detail MUST show participant list with roles
- [ ] AC-HI-043: Room detail MUST indicate current user's participation status
- [ ] AC-HI-044: Room detail MUST indicate if room is closed

### Access Control

- [ ] AC-HI-050: Only hub members MUST access hub inbox
- [ ] AC-HI-051: Assign action MUST require hub admin/owner role
- [ ] AC-HI-052: Join action MUST be available to any hub member
- [ ] AC-HI-053: Archive/Mute actions MUST be per-user (not affect others)

### Search

- [ ] AC-HI-060: GET `/hub/:hubId/chat-rooms/search?q=query` - Search rooms
- [ ] AC-HI-061: Search MUST match against participant names
- [ ] AC-HI-062: Search MUST match against context title
- [ ] AC-HI-063: Search MUST match against message content (full-text)
- [ ] AC-HI-064: Search results MUST be sorted by relevance

---



### Non-Functional Requirements

(To be defined)
## API Endpoints

### List Rooms (Inbox)

```http
GET /hub/:hubId/chat-rooms?filter=ALL&context=&cursor=&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `filter`: ALL | ASSIGNED_TO_ME | UNASSIGNED | ARCHIVED
- `context`: EXPERTISE | BOOKING | JOB | CONTRACT (optional)
- `cursor`: ObjectId of last room for pagination
- `limit`: Number of rooms (default 20, max 50)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sidebar": {
      "all": 15,
      "assignedToMe": 3,
      "unassigned": 8,
      "archived": 4,
      "byContext": {
        "EXPERTISE": 7,
        "BOOKING": 5,
        "JOB": 2,
        "CONTRACT": 1
      }
    },
    "rooms": [
      {
        "_id": "room_abc",
        "contextType": "EXPERTISE",
        "contextSnapshot": {
          "title": "Python Masterclass",
          "image": "https://..."
        },
        "learnerSnapshot": {
          "name": "John Doe",
          "avatar": "https://..."
        },
        "lastMessage": {
          "preview": "Hi, I have a question about...",
          "sentAt": "2026-02-17T10:30:00Z",
          "senderName": "John Doe"
        },
        "unreadCount": 3,
        "assignedTo": null,
        "myParticipation": {
          "isJoined": false,
          "isAssigned": false
        }
      }
    ],
    "pagination": {
      "cursor": "room_last",
      "hasMore": true
    }
  }
}
```

### Get Room Detail

```http
GET /chat-rooms/:roomId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "room_abc",
    "contextType": "BOOKING",
    "contextId": "booking_123",
    "contextSnapshot": {
      "title": "Python Masterclass - March 15",
      "status": "CONFIRMED"
    },
    "hubSnapshot": { "name": "Code Academy", "logo": "..." },
    "learnerSnapshot": { "name": "John Doe", "email": "john@...", "avatar": "..." },
    "participants": [
      {
        "userId": "user_1",
        "name": "John Doe",
        "type": "LEARNER",
        "status": "JOINED",
        "isAssigned": false
      },
      {
        "userId": "user_2",
        "name": "Sarah",
        "type": "HUB_TEAM",
        "status": "JOINED",
        "isAssigned": true,
        "assignedAt": "2026-02-17T09:00:00Z"
      }
    ],
    "messageCount": 15,
    "status": "ACTIVE",
    "myParticipation": {
      "isJoined": true,
      "isAssigned": false,
      "isMuted": false,
      "isArchived": false
    }
  }
}
```

### Join Room

```http
POST /hub/:hubId/chat-rooms/:roomId/join
Authorization: Bearer <token>
```

### Assign Member

```http
POST /hub/:hubId/chat-rooms/:roomId/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user_123"
}
```

---

## Service Methods

```typescript
// src/core/services/chat/hubInbox.service.ts

interface HubInboxService {
  /**
   * Get inbox data with sidebar counts and room list
   * @covers AC-HI-001 through AC-HI-024
   */
  getInbox(params: {
    hubId: ObjectId;
    userId: ObjectId;
    filter: 'ALL' | 'ASSIGNED_TO_ME' | 'UNASSIGNED' | 'ARCHIVED';
    context?: ChatContextType;
    cursor?: ObjectId;
    limit?: number;
  }): Promise<{
    sidebar: SidebarCounts;
    rooms: RoomListItem[];
    pagination: { cursor?: ObjectId; hasMore: boolean };
  }>;

  /**
   * Get sidebar counts only (for real-time updates)
   * @covers AC-HI-007
   */
  getSidebarCounts(hubId: ObjectId, userId: ObjectId): Promise<SidebarCounts>;

  /**
   * Search rooms
   * @covers AC-HI-060 through AC-HI-064
   */
  searchRooms(params: {
    hubId: ObjectId;
    query: string;
    limit?: number;
  }): Promise<RoomListItem[]>;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/services/chat/hubInbox.service.ts` | Hub inbox service |
| `src/modules/hub/routes/chat/hubChat.routes.ts` | API routes |
| `src/modules/hub/controllers/chat/hubChat.controller.ts` | Controller |
| `src/core/schemas/hub/chat/hubChat.schema.ts` | Validation schemas |

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
# @covers AC-HI-001 through AC-HI-064
npm test -- tests/core/services/chat/hubInbox.service.test.ts
npm test -- tests/modules/hub/routes/chat/hubChat.routes.test.ts
```
