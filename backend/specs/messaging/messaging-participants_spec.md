---
title: Messaging Participants
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
  - specs/messaging/messaging-room-lifecycle_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

The participant management system for chat rooms:
- **Join Flow** - How hub members join conversations
- **Assignment** - Assigning responsibility for a conversation
- **Visibility** - Who can see vs who can participate
- **Leave Flow** - Leaving a conversation

## Why

In v1, participation was implicit. In v2, we need explicit control:
- Hub members should JOIN to participate (not auto-added to all)
- Assignment shows responsibility
- Clear visibility rules prevent confusion

## Success looks like

- Hub members can view all hub chats but must join to participate
- Assignment is tracked and visible
- Join/leave creates audit trail (event messages)
- Permissions enforced correctly

---

# Agent Contract

## Scope

#
## Non-goals

- Items explicitly not covered by this spec

## In Scope

- Join flow for hub members
- Assignment logic
- Visibility rules
- Leave flow
- Participant list management
- Event messages for participant changes

### Out of Scope

- Room creation (see messaging-room-lifecycle_spec)
- Sending messages (see messaging-send-receive_spec)
- UI components (see messaging-fe-components_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Visibility Rules

- [x] AC-PT-001: All hub team members MUST be able to VIEW all chat rooms for their hub
- [x] AC-PT-002: Learners MUST only see rooms where they are a participant
- [x] AC-PT-003: "View" means: see room in inbox, read messages, but NOT send messages or receive notifications
- [x] AC-PT-004: Hub team members MUST have `hasViewed: true` in ChatUserState after opening a room

### Join Flow

- [x] AC-PT-010: Hub team member MUST click "Join" button to become an active participant
- [x] AC-PT-011: When joining, system MUST:
  - Add ChatParticipant to room's `participants` array with `status: JOINED`
  - Add userId to `participantIds` array
  - Set `joinedAt` to current timestamp
  - Create ChatUserState record with `unreadCount: 0`
- [x] AC-PT-012: System MUST create EVENT message: "Sarah joined the conversation"
- [x] AC-PT-013: After joining, member MUST receive real-time notifications for new messages
- [x] AC-PT-014: After joining, member MUST be able to send messages
- [x] AC-PT-015: Learner participants are auto-joined when room is created (no explicit join needed)

### Assignment Flow

- [x] AC-PT-020: Hub admin/owner MUST be able to assign any hub member to a room
- [x] AC-PT-021: Assignment MUST auto-join the member if not already joined
- [x] AC-PT-022: System MUST update participant's `isAssigned: true`, `assignedAt`, `assignedBy`
- [x] AC-PT-023: System MUST create EVENT message: "Sarah was assigned by John"
- [x] AC-PT-024: Only ONE member can be assigned at a time per hub (single assignee)
- [x] AC-PT-025: Unassigning MUST set `isAssigned: false` and create EVENT message
- [x] AC-PT-026: Self-assignment MUST be allowed (member assigns themselves)

### Leave Flow

- [x] AC-PT-030: Joined members MUST be able to leave a conversation
- [x] AC-PT-031: When leaving, system MUST:
  - Update participant `status: LEFT`, `leftAt: now`
  - Keep participant in `participants` array (for history)
  - Remove userId from `participantIds` array
  - Stop real-time notifications
- [x] AC-PT-032: System MUST create EVENT message: "Sarah left the conversation"
- [x] AC-PT-033: Assigned members MUST unassign before leaving
- [x] AC-PT-034: Learners CANNOT leave booking/contract rooms (they are always participants)
- [x] AC-PT-035: Left members CAN rejoin later

### Initial Participants (Room Creation)

- [x] AC-PT-040: When learner creates room, system MUST add learner as participant with `type: LEARNER`, `status: JOINED`
- [x] AC-PT-041: When learner creates room, system MUST add hub owner as participant with `type: HUB_TEAM`, `status: JOINED`, `isAssigned: false`
- [x] AC-PT-042: When hub-to-hub room created, system MUST add owners from both hubs as participants
- [x] AC-PT-043: Hub owner is auto-joined but NOT auto-assigned

### Hub Member Removal (Edge Case)

- [ ] AC-PT-050: When hub member is removed from hub, system MUST:
  - Update all their chat participations to `status: LEFT`
  - Create EVENT message "Member removed from hub"
  - Remove from `participantIds` arrays
- [x] AC-PT-051: Removed member's messages MUST remain visible (not deleted)

### Participant List Display

- [x] AC-PT-060: Room details MUST show list of current participants (status: JOINED)
- [x] AC-PT-061: For each participant, show: name, avatar, type, isAssigned
- [x] AC-PT-062: Assigned participant MUST be highlighted/badged
- [x] AC-PT-063: For learner view, show "Hub Team" instead of individual member names (privacy)

---



### Non-Functional Requirements

(To be defined)
## Service Methods

```typescript
// src/core/services/chat/chatParticipant.service.ts

interface ChatParticipantService {
  /**
   * Join a conversation
   * @covers AC-PT-010, AC-PT-011, AC-PT-012, AC-PT-013
   */
  joinRoom(params: {
    roomId: ObjectId;
    userId: ObjectId;
    hubId: ObjectId;
    user: { name: string; email: string; avatar?: string };
  }): Promise<IChatParticipant>;

  /**
   * Leave a conversation
   * @covers AC-PT-030, AC-PT-031, AC-PT-032
   */
  leaveRoom(params: {
    roomId: ObjectId;
    userId: ObjectId;
  }): Promise<void>;

  /**
   * Assign member to room
   * @covers AC-PT-020, AC-PT-021, AC-PT-022, AC-PT-023
   */
  assignMember(params: {
    roomId: ObjectId;
    userId: ObjectId;
    assignedBy: ObjectId;
  }): Promise<IChatParticipant>;

  /**
   * Unassign member from room
   * @covers AC-PT-025
   */
  unassignMember(params: {
    roomId: ObjectId;
    userId: ObjectId;
    unassignedBy: ObjectId;
  }): Promise<void>;

  /**
   * Get participants for a room
   * @covers AC-PT-060
   */
  getParticipants(roomId: ObjectId): Promise<IChatParticipant[]>;

  /**
   * Check if user can send messages
   * @covers AC-PT-003, AC-PT-014
   */
  canSendMessage(roomId: ObjectId, userId: ObjectId): Promise<boolean>;

  /**
   * Handle hub member removal
   * @covers AC-PT-050, AC-PT-051
   */
  handleMemberRemovedFromHub(userId: ObjectId, hubId: ObjectId): Promise<void>;
}
```

---

## Permission Matrix

| Action | Learner | Hub Member (Not Joined) | Hub Member (Joined) | Hub Admin | Hub Owner |
|--------|---------|-------------------------|---------------------|-----------|-----------|
| View room | Own rooms | All hub rooms | All hub rooms | All hub rooms | All hub rooms |
| Read messages | Yes | Yes | Yes | Yes | Yes |
| Send messages | Yes | No | Yes | Yes | Yes |
| Join room | N/A | Yes | N/A | Yes | Yes |
| Leave room | No* | N/A | Yes | Yes | Yes |
| Assign self | N/A | No | Yes | Yes | Yes |
| Assign others | N/A | No | No | Yes | Yes |
| Unassign others | N/A | No | No | Yes | Yes |

*Learners cannot leave booking/contract rooms

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/services/chat/chatParticipant.service.ts` | Participant management |
| `tests/core/services/chat/chatParticipant.service.test.ts` | Tests |

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
# @covers AC-PT-001 through AC-PT-063
npm test -- tests/core/services/chat/chatParticipant.service.test.ts
```

### Test Scenarios

1. Hub member joins conversation
2. Hub member assigned to conversation
3. Hub member leaves conversation
4. Learner cannot leave booking room
5. Removed hub member loses access
6. Self-assignment works
7. Permission checks enforce rules
