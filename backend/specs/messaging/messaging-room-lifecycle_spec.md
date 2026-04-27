---
title: Messaging Room Lifecycle
type: feature_spec
status: implemented
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-17'
depends_on:
- specs/messaging/messaging-data-models_spec.md
links:
  related_specs:
  - specs/messaging/messaging-participants_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

The logic for creating, finding, and managing chat rooms throughout their lifecycle:
- When to create a new room vs find existing
- How rooms are linked to business entities
- Auto-creation triggers (booking, proposal)
- Room status transitions

## Why

Without clear room lifecycle rules, we'll have duplicate rooms, orphaned conversations, and inconsistent behavior.

## Success looks like

- One room per unique context (no duplicates)
- Rooms auto-created when needed
- Clear status transitions
- Context always linked correctly

---

# Agent Contract

## Scope

#
## Non-goals

- Items explicitly not covered by this spec

## In Scope

- Room creation logic
- Duplicate prevention
- Context linking
- Auto-creation triggers
- Status transitions
- Room closing/archiving

### Out of Scope

- Participant management (see messaging-participants_spec)
- Message sending (see messaging-send-receive_spec)
- UI/API (see messaging-hub-inbox_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Room Creation - Manual (User Initiates)

- [x] AC-RL-001: When a learner clicks "Ask Question" on an expertise, system MUST check for existing room with `(contextType: EXPERTISE, contextId: expertiseId, learnerId: learnerId)`
- [x] AC-RL-002: If existing room found, system MUST navigate to that room (no new room created)
- [x] AC-RL-003: If no existing room, system MUST create new ChatRoom with:
  - `contextType: EXPERTISE`
  - `contextId: expertiseId`
  - `hubId: expertise.hubId`
  - `hubSnapshot: { name, logo }` from Hub
  - `learnerId: currentUser.id`
  - `learnerSnapshot: { name, email, avatar }` from User
  - `initiatedBy: LEARNER`
  - `status: ACTIVE`
- [x] AC-RL-004: When hub member clicks "New Message" to a learner, system MUST create room with `initiatedBy: HUB`

### Room Creation - Auto (System Triggers)

- [x] AC-RL-010: When a Booking is created, system MUST:
  - Check if ChatRoom exists with `(contextType: EXPERTISE, contextId: expertiseId, learnerId: learnerId)`
  - If EXISTS: Update room's `contextType` to `BOOKING`, `contextId` to `bookingId`
  - If NOT EXISTS: Create new room with `contextType: BOOKING`
- [x] AC-RL-011: When a Proposal is submitted, system MUST create ChatRoom with:
  - `contextType: JOB`
  - `contextId: jobId`
  - `hubId: job.clientHubId`
  - `otherHubId: proposal.expertHubId`
  - Participants from both hubs
- [x] AC-RL-012: When a Proposal is accepted and Contract created, system MUST update room:
  - `contextType: CONTRACT`
  - `contextId: contractId`
  - Keep all participants
- [x] AC-RL-013: System MUST NOT create room for cancelled/rejected proposals

### Duplicate Prevention

- [x] AC-RL-020: ChatRoom collection MUST have unique compound index on `(contextType, contextId, learnerId)` for learner chats
- [x] AC-RL-021: ChatRoom collection MUST have unique compound index on `(contextType, contextId, hubId, otherHubId)` for hub-to-hub chats
- [x] AC-RL-022: `getOrCreateRoom()` function MUST use `findOneAndUpdate` with `upsert: true` to prevent race conditions

### Context Linking

- [x] AC-RL-030: ChatRoom MUST store `contextSnapshot` at creation time (title, image, status)
- [x] AC-RL-031: When context entity changes (e.g., expertise renamed), `contextSnapshot` SHOULD remain unchanged (historical accuracy)
- [x] AC-RL-032: When context entity is deleted, system MUST update `contextSnapshot.status` to `DELETED`
- [x] AC-RL-033: ChatRoom MUST remain accessible even if context entity is deleted

### Room Status Transitions

- [x] AC-RL-040: New rooms MUST start with `status: ACTIVE`
- [x] AC-RL-041: Room `status` MAY be changed to `CLOSED` when:
  - Booking is completed/cancelled
  - Contract is completed/cancelled
  - Manually closed by hub admin
- [x] AC-RL-042: `CLOSED` rooms MUST remain readable but MUST NOT accept new messages
- [x] AC-RL-043: `CLOSED` rooms MAY be reopened by hub admin

### Context Upgrade Flow

- [x] AC-RL-050: EXPERTISE → BOOKING upgrade MUST preserve all existing messages
- [x] AC-RL-051: EXPERTISE → BOOKING upgrade MUST create EVENT message "Booking requested"
- [x] AC-RL-052: JOB → CONTRACT upgrade MUST preserve all existing messages
- [x] AC-RL-053: JOB → CONTRACT upgrade MUST create EVENT message "Contract started"

---



### Non-Functional Requirements

(To be defined)
## Service Methods

```typescript
// src/core/services/chat/chatRoom.service.ts

interface ChatRoomService {
  /**
   * Find existing room or create new one
   * @covers AC-RL-001, AC-RL-002, AC-RL-003, AC-RL-022
   */
  getOrCreateRoom(params: {
    contextType: ChatContextType;
    contextId?: ObjectId;
    hubId: ObjectId;
    learnerId?: ObjectId;
    otherHubId?: ObjectId;
    initiatedBy: ChatInitiatedBy;
  }): Promise<IChatRoom>;

  /**
   * Upgrade room context (e.g., EXPERTISE → BOOKING)
   * @covers AC-RL-010, AC-RL-050, AC-RL-051
   */
  upgradeContext(params: {
    roomId: ObjectId;
    newContextType: ChatContextType;
    newContextId: ObjectId;
    newContextSnapshot: { title: string; image?: string };
  }): Promise<IChatRoom>;

  /**
   * Find room by context
   */
  findByContext(params: {
    contextType: ChatContextType;
    contextId: ObjectId;
  }): Promise<IChatRoom | null>;

  /**
   * Find rooms for a hub (inbox)
   */
  findByHub(params: {
    hubId: ObjectId;
    filter?: 'ALL' | 'ASSIGNED' | 'UNASSIGNED' | 'ARCHIVED';
    userId?: ObjectId;
    limit?: number;
    cursor?: ObjectId;
  }): Promise<IChatRoom[]>;

  /**
   * Find rooms for a user (learner inbox)
   */
  findByUser(params: {
    userId: ObjectId;
    limit?: number;
    cursor?: ObjectId;
  }): Promise<IChatRoom[]>;

  /**
   * Close a room
   * @covers AC-RL-041, AC-RL-042
   */
  closeRoom(roomId: ObjectId, closedBy: ObjectId): Promise<IChatRoom>;

  /**
   * Reopen a closed room
   * @covers AC-RL-043
   */
  reopenRoom(roomId: ObjectId, reopenedBy: ObjectId): Promise<IChatRoom>;

  /**
   * Mark context as deleted
   * @covers AC-RL-032
   */
  markContextDeleted(contextType: ChatContextType, contextId: ObjectId): Promise<void>;
}
```

---

## Auto-Creation Hooks

These hooks should be added to existing services:

### Booking Service Hook

```typescript
// In booking.service.ts after booking creation

// @covers AC-RL-010
async function afterBookingCreated(booking: IBooking) {
  await chatRoomService.getOrCreateRoom({
    contextType: 'BOOKING',
    contextId: booking._id,
    hubId: booking.hubId,
    learnerId: booking.learnerId,
    initiatedBy: 'LEARNER',
  });

  await chatEventService.createEvent({
    roomId: room._id,
    eventType: 'BOOKING_REQUESTED',
    entityType: 'BOOKING',
    entityId: booking._id,
    summary: `Booking requested for ${booking.expertiseTitle}`,
    data: { bookingId: booking._id, date: booking.date },
  });
}
```

### Proposal Service Hook

```typescript
// In proposal.service.ts after proposal submission

// @covers AC-RL-011
async function afterProposalSubmitted(proposal: IProposal, job: IJob) {
  const room = await chatRoomService.getOrCreateRoom({
    contextType: 'JOB',
    contextId: job._id,
    hubId: job.clientHubId,
    otherHubId: proposal.expertHubId,
    initiatedBy: 'HUB',
  });

  await chatEventService.createEvent({
    roomId: room._id,
    eventType: 'PROPOSAL_SUBMITTED',
    entityType: 'PROPOSAL',
    entityId: proposal._id,
    summary: `Proposal submitted: ${proposal.amount}`,
    data: { proposalId: proposal._id, amount: proposal.amount },
  });
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/core/services/chat/chatRoom.service.ts` | Create | Room lifecycle service |
| `src/core/services/shared/payments/booking.service.ts` | Modify | Add auto-create hook |
| `src/core/services/hub/proposals/hubProposal.service.ts` | Modify | Add auto-create hook |
| `src/core/services/hub/contracts/hubContract.service.ts` | Modify | Add context upgrade hook |

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
# Test file: tests/core/services/chat/chatRoom.service.test.ts
# @covers AC-RL-001 through AC-RL-053
```

### Test Scenarios

1. Create room for expertise inquiry
2. Find existing room (no duplicate)
3. Booking upgrades expertise room
4. Proposal creates job room
5. Contract upgrades job room
6. Context deletion marks room
7. Closed room rejects messages
