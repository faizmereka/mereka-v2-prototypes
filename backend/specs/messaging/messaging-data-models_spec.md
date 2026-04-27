---
title: Messaging Data Models
type: feature_spec
status: implemented
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-17'
depends_on:
- specs/messaging/messaging-overview_spec.md
links:
  related_specs:
  - specs/messaging/messaging-nfr_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

The foundational data models for the messaging system:
- **ChatRoom** - A conversation container linked to business context
- **ChatMessage** - Individual messages (text, file, event)
- **ChatParticipant** - Who is in the conversation (embedded in ChatRoom)
- **ChatUserState** - Per-user settings (unread, archived, muted)

## Why

Without solid data models, all other messaging features cannot be built. This is Tier 1 - the foundation.

## Success looks like

- Models created with proper Mongoose schemas
- Indexes optimized for common queries
- TypeScript interfaces exported for type safety
- All CRUD operations work correctly

---

# Agent Contract

## Scope

#
## Non-goals

- Items explicitly not covered by this spec

## In Scope

- ChatRoom Mongoose model and schema
- ChatMessage Mongoose model and schema
- ChatUserState Mongoose model and schema
- TypeScript interfaces for all models
- Database indexes for performance
- Validation rules

### Out of Scope

- Service layer (see messaging-room-lifecycle_spec)
- API endpoints (see messaging-hub-inbox_spec)
- Real-time events (see messaging-realtime_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### ChatRoom Model

- [x] AC-DM-001: ChatRoom MUST have `contextType` field with enum: `EXPERTISE | BOOKING | JOB | CONTRACT | GENERAL`
- [x] AC-DM-002: ChatRoom MUST have `contextId` field (ObjectId, optional) linking to the business entity
- [x] AC-DM-003: ChatRoom MUST have `contextSnapshot` object with `title: string`, `image?: string`, `status?: string`
- [x] AC-DM-004: ChatRoom MUST have `hubId` (ObjectId, required) - the hub this chat belongs to
- [x] AC-DM-005: ChatRoom MUST have `hubSnapshot` object with `name: string`, `logo?: string`
- [x] AC-DM-006: ChatRoom MUST have `learnerId` (ObjectId, optional) - for learner-initiated chats
- [x] AC-DM-007: ChatRoom MUST have `learnerSnapshot` object with `name`, `email`, `avatar` (optional)
- [x] AC-DM-008: ChatRoom MUST have `otherHubId` (ObjectId, optional) - for hub-to-hub chats
- [x] AC-DM-009: ChatRoom MUST have `otherHubSnapshot` object (optional) with `name`, `logo`
- [x] AC-DM-010: ChatRoom MUST have `participants` array of embedded ChatParticipant documents
- [x] AC-DM-011: ChatRoom MUST have `participantIds` (ObjectId[]) - flat array for efficient querying
- [x] AC-DM-012: ChatRoom MUST have `lastMessage` object with `_id`, `preview` (100 chars), `sentAt`, `senderName`
- [x] AC-DM-013: ChatRoom MUST have `messageCount` (number, default 0)
- [x] AC-DM-014: ChatRoom MUST have `initiatedBy` enum: `LEARNER | HUB`
- [x] AC-DM-015: ChatRoom MUST have `status` enum: `ACTIVE | CLOSED`
- [x] AC-DM-016: ChatRoom MUST have `createdAt`, `createdBy`, `updatedAt` timestamps

### ChatParticipant (Embedded Document)

- [x] AC-DM-020: ChatParticipant MUST have `userId` (ObjectId, required)
- [x] AC-DM-021: ChatParticipant MUST have `name` (string, required)
- [x] AC-DM-022: ChatParticipant MUST have `email` (string, required)
- [x] AC-DM-023: ChatParticipant MUST have `avatar` (string, optional)
- [x] AC-DM-024: ChatParticipant MUST have `type` enum: `LEARNER | HUB_TEAM`
- [x] AC-DM-025: ChatParticipant MUST have `hubId` (ObjectId, optional) - which hub they belong to if HUB_TEAM
- [x] AC-DM-026: ChatParticipant MUST have `status` enum: `JOINED | LEFT`
- [x] AC-DM-027: ChatParticipant MUST have `isAssigned` (boolean, default false)
- [x] AC-DM-028: ChatParticipant MUST have `joinedAt` (Date, required)
- [x] AC-DM-029: ChatParticipant MUST have `leftAt` (Date, optional)
- [x] AC-DM-030: ChatParticipant MUST have `assignedAt` (Date, optional)
- [x] AC-DM-031: ChatParticipant MUST have `assignedBy` (ObjectId, optional)

### ChatMessage Model

- [x] AC-DM-040: ChatMessage MUST have `roomId` (ObjectId, required, indexed)
- [x] AC-DM-041: ChatMessage MUST have `sender` object with `userId`, `hubId?`, `name`, `avatar?`, `type`
- [x] AC-DM-042: ChatMessage MUST have `type` enum: `TEXT | FILE | EVENT`
- [x] AC-DM-043: ChatMessage MUST have `text` (string, optional, max 10000 chars) - for TEXT type
- [x] AC-DM-044: ChatMessage MUST have `files` array (optional) - for FILE type
- [x] AC-DM-045: ChatFile MUST have `name`, `url`, `mimeType`, `sizeBytes`, `thumbnailUrl?`
- [x] AC-DM-046: ChatMessage MUST have `event` object (optional) - for EVENT type
- [x] AC-DM-047: ChatEvent MUST have `eventType` (ChatEventType enum)
- [x] AC-DM-048: ChatEvent MUST have `entityType` enum: `BOOKING | PROPOSAL | CONTRACT | MILESTONE | PAYMENT | PARTICIPANT`
- [x] AC-DM-049: ChatEvent MUST have `entityId` (ObjectId)
- [x] AC-DM-050: ChatEvent MUST have `summary` (string) - human readable
- [x] AC-DM-051: ChatEvent MUST have `data` (Record<string, any>) - structured metadata
- [x] AC-DM-052: ChatMessage MUST have `createdAt` (Date, required, indexed)
- [x] AC-DM-053: ChatMessage MUST have `editedAt` (Date, optional)
- [x] AC-DM-054: ChatMessage MUST have `deletedAt` (Date, optional)
- [x] AC-DM-055: ChatMessage MUST have `isDeleted` (boolean, default false)

### ChatEventType Enum

- [x] AC-DM-060: ChatEventType MUST include booking events: `BOOKING_REQUESTED`, `BOOKING_CONFIRMED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`, `BOOKING_COMPLETED`, `BOOKING_REVIEWED`
- [x] AC-DM-061: ChatEventType MUST include proposal events: `PROPOSAL_SUBMITTED`, `PROPOSAL_VIEWED`, `PROPOSAL_REVISED`, `PROPOSAL_ACCEPTED`, `PROPOSAL_REJECTED`, `PROPOSAL_WITHDRAWN`
- [x] AC-DM-062: ChatEventType MUST include contract events: `CONTRACT_STARTED`, `CONTRACT_PAUSED`, `CONTRACT_RESUMED`, `CONTRACT_COMPLETED`, `CONTRACT_CANCELLED`
- [x] AC-DM-063: ChatEventType MUST include milestone events: `MILESTONE_CREATED`, `MILESTONE_SUBMITTED`, `MILESTONE_APPROVED`, `MILESTONE_REVISION_REQUESTED`
- [x] AC-DM-064: ChatEventType MUST include payment events: `PAYMENT_REQUESTED`, `PAYMENT_RELEASED`, `PAYMENT_RECEIVED`, `PAYMENT_REFUNDED`
- [x] AC-DM-065: ChatEventType MUST include participant events: `PARTICIPANT_JOINED`, `PARTICIPANT_LEFT`, `PARTICIPANT_ASSIGNED`, `PARTICIPANT_UNASSIGNED`

### ChatUserState Model

- [x] AC-DM-070: ChatUserState MUST have `roomId` (ObjectId, required)
- [x] AC-DM-071: ChatUserState MUST have `userId` (ObjectId, required)
- [x] AC-DM-072: ChatUserState MUST have `hubId` (ObjectId, optional) - for hub team members
- [x] AC-DM-073: ChatUserState MUST have unique compound index on `(roomId, userId)`
- [x] AC-DM-074: ChatUserState MUST have `unreadCount` (number, default 0)
- [x] AC-DM-075: ChatUserState MUST have `lastReadMessageId` (ObjectId, optional)
- [x] AC-DM-076: ChatUserState MUST have `lastReadAt` (Date, optional)
- [x] AC-DM-077: ChatUserState MUST have `isArchived` (boolean, default false)
- [x] AC-DM-078: ChatUserState MUST have `isMuted` (boolean, default false)
- [x] AC-DM-079: ChatUserState MUST have `isPinned` (boolean, default false)
- [x] AC-DM-080: ChatUserState MUST have `hasViewed` (boolean, default false) - has user ever opened this chat
- [x] AC-DM-081: ChatUserState MUST have `updatedAt` (Date)

### Indexes

- [x] AC-DM-090: ChatRoom MUST have index on `hubId` for hub inbox queries
- [x] AC-DM-091: ChatRoom MUST have index on `participantIds` for user inbox queries
- [x] AC-DM-092: ChatRoom MUST have index on `(contextType, contextId)` for duplicate prevention
- [x] AC-DM-093: ChatRoom MUST have index on `lastMessage.sentAt` for sorting
- [x] AC-DM-094: ChatMessage MUST have index on `(roomId, createdAt)` for pagination
- [x] AC-DM-095: ChatMessage MUST have text index on `text` for search
- [x] AC-DM-096: ChatUserState MUST have index on `(userId, isArchived)` for inbox filtering

---



### Non-Functional Requirements

(To be defined)
## Data Model (Complete Schema)

### ChatRoom

```typescript
// src/core/models/ChatRoom.ts

import type { ObjectId } from 'mongoose';

export type ChatContextType = 'EXPERTISE' | 'BOOKING' | 'JOB' | 'CONTRACT' | 'GENERAL';
export type ChatRoomStatus = 'ACTIVE' | 'CLOSED';
export type ChatInitiatedBy = 'LEARNER' | 'HUB';
export type ChatParticipantType = 'LEARNER' | 'HUB_TEAM';
export type ChatParticipantStatus = 'JOINED' | 'LEFT';

export interface IChatParticipant {
  userId: ObjectId;
  name: string;
  email: string;
  avatar?: string;
  type: ChatParticipantType;
  hubId?: ObjectId;
  status: ChatParticipantStatus;
  isAssigned: boolean;
  joinedAt: Date;
  leftAt?: Date;
  assignedAt?: Date;
  assignedBy?: ObjectId;
}

export interface IChatRoom {
  _id: ObjectId;

  // Context
  contextType: ChatContextType;
  contextId?: ObjectId;
  contextSnapshot: {
    title: string;
    image?: string;
    status?: string;
  };

  // Hub side
  hubId: ObjectId;
  hubSnapshot: {
    name: string;
    logo?: string;
  };

  // Learner side (optional)
  learnerId?: ObjectId;
  learnerSnapshot?: {
    name: string;
    email: string;
    avatar?: string;
  };

  // Other hub (for hub-to-hub)
  otherHubId?: ObjectId;
  otherHubSnapshot?: {
    name: string;
    logo?: string;
  };

  // Participants
  participants: IChatParticipant[];
  participantIds: ObjectId[];

  // Last message cache
  lastMessage?: {
    _id: ObjectId;
    preview: string;
    sentAt: Date;
    senderName: string;
  };
  messageCount: number;

  // Metadata
  initiatedBy: ChatInitiatedBy;
  status: ChatRoomStatus;
  createdAt: Date;
  createdBy: ObjectId;
  updatedAt: Date;
}
```

### ChatMessage

```typescript
// src/core/models/ChatMessage.ts

import type { ObjectId } from 'mongoose';

export type ChatMessageType = 'TEXT' | 'FILE' | 'EVENT';

export type ChatEventType =
  // Booking
  | 'BOOKING_REQUESTED' | 'BOOKING_CONFIRMED' | 'BOOKING_RESCHEDULED'
  | 'BOOKING_CANCELLED' | 'BOOKING_COMPLETED' | 'BOOKING_REVIEWED'
  // Proposal
  | 'PROPOSAL_SUBMITTED' | 'PROPOSAL_VIEWED' | 'PROPOSAL_REVISED'
  | 'PROPOSAL_ACCEPTED' | 'PROPOSAL_REJECTED' | 'PROPOSAL_WITHDRAWN'
  // Contract
  | 'CONTRACT_STARTED' | 'CONTRACT_PAUSED' | 'CONTRACT_RESUMED'
  | 'CONTRACT_COMPLETED' | 'CONTRACT_CANCELLED'
  // Milestone
  | 'MILESTONE_CREATED' | 'MILESTONE_SUBMITTED'
  | 'MILESTONE_APPROVED' | 'MILESTONE_REVISION_REQUESTED'
  // Payment
  | 'PAYMENT_REQUESTED' | 'PAYMENT_RELEASED'
  | 'PAYMENT_RECEIVED' | 'PAYMENT_REFUNDED'
  // Participant
  | 'PARTICIPANT_JOINED' | 'PARTICIPANT_LEFT'
  | 'PARTICIPANT_ASSIGNED' | 'PARTICIPANT_UNASSIGNED';

export type ChatEventEntityType = 'BOOKING' | 'PROPOSAL' | 'CONTRACT' | 'MILESTONE' | 'PAYMENT' | 'PARTICIPANT';

export interface IChatFile {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl?: string;
}

export interface IChatEvent {
  eventType: ChatEventType;
  entityType: ChatEventEntityType;
  entityId: ObjectId;
  summary: string;
  data: Record<string, unknown>;
  triggeredBy?: ObjectId;
}

export interface IChatMessageSender {
  userId: ObjectId;
  hubId?: ObjectId;
  name: string;
  avatar?: string;
  type: 'LEARNER' | 'HUB_TEAM';
}

export interface IChatMessage {
  _id: ObjectId;
  roomId: ObjectId;

  // Sender
  sender: IChatMessageSender;

  // Content (one of these based on type)
  type: ChatMessageType;
  text?: string;
  files?: IChatFile[];
  event?: IChatEvent;

  // State
  createdAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
  isDeleted: boolean;
}
```

### ChatUserState

```typescript
// src/core/models/ChatUserState.ts

import type { ObjectId } from 'mongoose';

export interface IChatUserState {
  _id: ObjectId;

  roomId: ObjectId;
  userId: ObjectId;
  hubId?: ObjectId;

  // Read state
  unreadCount: number;
  lastReadMessageId?: ObjectId;
  lastReadAt?: Date;

  // User preferences
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  hasViewed: boolean;

  updatedAt: Date;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/models/ChatRoom.ts` | ChatRoom Mongoose model |
| `src/core/models/ChatMessage.ts` | ChatMessage Mongoose model |
| `src/core/models/ChatUserState.ts` | ChatUserState Mongoose model |
| `src/core/types/chat.types.ts` | Shared TypeScript types |

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
# Test file: tests/core/models/ChatRoom.test.ts
# @covers AC-DM-001 through AC-DM-016

# Test file: tests/core/models/ChatMessage.test.ts
# @covers AC-DM-040 through AC-DM-065

# Test file: tests/core/models/ChatUserState.test.ts
# @covers AC-DM-070 through AC-DM-081
```

### Manual Verification

1. Create ChatRoom with all required fields
2. Verify indexes exist in MongoDB
3. Test unique constraint on ChatUserState (roomId, userId)
