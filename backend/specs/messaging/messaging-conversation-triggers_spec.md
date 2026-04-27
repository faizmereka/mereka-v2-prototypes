---
title: Messaging Conversation Triggers
type: feature_spec
status: implemented
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-17'
depends_on:
- specs/messaging/messaging-data-models_spec.md
- specs/messaging/messaging-room-lifecycle_spec.md
links:
  related_specs:
  - specs/messaging/messaging-hub-inbox_spec.md
  - specs/messaging/messaging-learner-inbox_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What We're Building

Conversation (chat room) creation hooks in existing backend APIs. Each transactional entity gets its own separate chat room.

## Key Principle: ONE ENTITY = ONE ROOM

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SIMPLE ROOM CREATION RULE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  INQUIRIES (Ask Question):                                          │
│  ─────────────────────────                                          │
│  EACH inquiry (hub/expertise/experience/job)                        │
│    → ONE room per (learner + contextType + contextId)               │
│    → Reuse existing inquiry room if already exists                  │
│                                                                     │
│  TRANSACTIONS:                                                      │
│  ──────────────                                                     │
│  EACH booking   →  ONE separate chat room (contextType: BOOKING)    │
│  EACH proposal  →  ONE chat room (progresses to CONTRACT)           │
│                                                                     │
│  Inquiry rooms are SEPARATE from booking/proposal rooms!            │
│                                                                     │
│  Sidebar grouping by expertise/job = FRONTEND display concern       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Room Types Summary

| Context Type | Created When | Room Reuse Logic |
|--------------|--------------|------------------|
| `HUB` | User asks general question to hub | Reuse if (learnerId + hubId) room exists |
| `EXPERTISE` | User asks about expertise | Reuse if (learnerId + expertiseId) room exists |
| `EXPERIENCE` | User asks about experience | Reuse if (learnerId + experienceId) room exists |
| `JOB` | User asks about job posting | Reuse if (learnerId + jobId) room exists |
| `BOOKING` | Booking is created | ALWAYS new room per booking |
| `PROPOSAL` | Proposal is submitted | ALWAYS new room per proposal |
| `CONTRACT` | Proposal accepted | Reuses proposal room (context changes) |

## What This Spec Does NOT Cover

- Model changes (uses existing ChatRoom model)
- Sidebar grouping logic (frontend concern - see frontend specs)
- Complex linkedEntities tracking (rejected - too complex)

---

# Agent Contract

## Scope

This spec defines WHERE in existing backend APIs to:
1. Create chat rooms when bookings/proposals are created
2. Update chat room context when proposal becomes contract
3. Sync chat room status with entity status changes


## Non-goals

- Items explicitly not covered by this spec

## Non-Goals

- NO model changes beyond what's in messaging-data-models_spec
- NO grouping logic in backend (frontend handles display grouping)
- NO linkedEntities or multi-booking room tracking

---

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Booking Chat Room Creation

- [x] AC-CT-001: When booking created via `booking.service.create()`, system MUST create chat room
- [x] AC-CT-002: When booking created via `hubBooking.service.createBooking()`, system MUST create chat room
- [x] AC-CT-003: Chat room MUST have `contextType: 'BOOKING'` and `contextId: bookingId`
- [x] AC-CT-004: Chat room MUST be created AFTER booking.save() succeeds
- [x] AC-CT-005: Chat room creation MUST be non-blocking (use `void` for async)
- [x] AC-CT-006: First message in room MUST be system event "Booking requested"

### Proposal Chat Room Creation

- [x] AC-CT-010: When proposal created via `hubProposal.service.createProposal()`, system MUST create chat room
- [x] AC-CT-011: Chat room MUST have `contextType: 'PROPOSAL'` and `contextId: proposalId`
- [x] AC-CT-012: Chat room MUST be created AFTER proposal save succeeds
- [x] AC-CT-013: First message in room MUST be system event "Proposal submitted"

### Proposal → Contract Transition

- [x] AC-CT-020: When proposal accepted via `hubProposal.service.acceptProposal()`, system MUST update chat room
- [x] AC-CT-021: Chat room `contextType` MUST change from 'PROPOSAL' to 'CONTRACT'
- [x] AC-CT-022: Chat room `contextId` MUST change from proposalId to contractId
- [x] AC-CT-023: System MUST add event message "Proposal accepted, contract created"
- [x] AC-CT-024: Chat room MUST retain all previous messages (no data loss)

### Contract Status Sync

- [x] AC-CT-030: When contract offer sent via `hubContract.service.sendOffer()`, if no existing room from proposal, create room
- [x] AC-CT-031: When contract accepted via `hubContract.service.acceptOffer()`, add event "Contract started"
- [x] AC-CT-032: When contract paused via `hubContract.service.pauseContract()`, add event "Contract paused"
- [x] AC-CT-033: When contract resumed via `hubContract.service.resumeContract()`, add event "Contract resumed"
- [x] AC-CT-034: When contract cancelled via `hubContract.service.cancelContract()`, add event and close room

### Inquiry Chat Room (Ask Question)

- [x] AC-CT-040: Frontend "Ask Question" creates room via `POST /chat-rooms`
- [x] AC-CT-041: Inquiry rooms can have `contextType: 'HUB' | 'EXPERTISE' | 'EXPERIENCE' | 'JOB'`
- [x] AC-CT-042: If inquiry room for same (learner + context) already exists, MUST reuse existing room
- [x] AC-CT-043: Inquiry rooms are SEPARATE from booking/proposal rooms
- [x] AC-CT-044: For HUB inquiry (general question), contextId = hubId
- [x] AC-CT-045: For EXPERTISE inquiry, contextId = expertiseId
- [x] AC-CT-046: For EXPERIENCE inquiry, contextId = experienceId
- [x] AC-CT-047: For JOB inquiry (asking about job), contextId = jobId

### Error Handling

- [x] AC-CT-050: If chat room creation fails, booking/proposal creation MUST NOT fail
- [x] AC-CT-051: Failed chat room creation MUST be logged for retry
- [ ] AC-CT-052: System MUST have retry mechanism for failed room creations

---



### Non-Functional Requirements

(To be defined)
## Hook Locations in Backend APIs

### 1. Booking Service (Consumer Flow)

**File:** `src/core/services/shared/payments/booking.service.ts`

```typescript
// Hook Point 1: booking.service.create() - Line ~130
async create(input: CreateBookingInput): Promise<IBooking> {
  // ... existing validation and booking creation ...

  const booking = new Booking(bookingData);
  await booking.save();  // Line 130

  // ─── CHAT ROOM CREATION HOOK (ADD HERE) ───
  void this.createBookingChatRoom(booking);

  return booking;
}

// New private method
private async createBookingChatRoom(booking: IBooking): Promise<void> {
  try {
    const room = await chatRoomService.createRoom({
      contextType: 'BOOKING',
      contextId: booking._id,
      hubId: booking.hubId,
      learnerId: booking.bookedBy,
      contextSnapshot: {
        title: booking.serviceName,
        bookingDate: booking.bookingStartDate,
        status: booking.status,
      },
    });

    await chatEventService.createSystemMessage({
      roomId: room._id,
      eventType: 'BOOKING_REQUESTED',
      text: `Booking requested for ${formatDate(booking.bookingStartDate)}`,
    });
  } catch (error) {
    // Log but don't fail the booking
    logger.error({ error, bookingId: booking._id }, 'Failed to create chat room for booking');
  }
}
```

### 2. Hub Booking Service (Manual Creation)

**File:** `src/core/services/hub/bookings/hubBooking.service.ts`

```typescript
// Hook Point 2: hubBookingService.createBooking() - Line ~976
async createBooking(params: HubCreateBookingParams): Promise<IBooking> {
  // ... existing booking creation logic ...

  await booking.save();  // Line 976

  // ─── CHAT ROOM CREATION HOOK (ADD HERE) ───
  void this.createBookingChatRoom(booking);

  return booking;
}
```

### 3. Proposal Service

**File:** `src/core/services/hub/proposals/hubProposal.service.ts`

```typescript
// Hook Point 3: hubProposalService.createProposal() - Line ~69
async createProposal(data: HubCreateProposalInput, userId: string) {
  // ... existing proposal creation logic ...

  const proposal = await JobProposal.create(proposalData);  // Line 69

  // ─── CHAT ROOM CREATION HOOK (ADD HERE) ───
  void this.createProposalChatRoom(proposal);

  // ... existing notification logic ...
  return proposal;
}

// New private method
private async createProposalChatRoom(proposal: IJobProposal): Promise<void> {
  try {
    const job = await Job.findById(proposal.jobId).lean();

    const room = await chatRoomService.createRoom({
      contextType: 'PROPOSAL',
      contextId: proposal._id,
      hubId: job.hubId,              // Client hub (posted the job)
      otherHubId: proposal.expertHubId, // Expert hub (submitted proposal)
      contextSnapshot: {
        title: job.title,
        proposalAmount: proposal.proposedAmount,
        status: proposal.status,
      },
    });

    await chatEventService.createSystemMessage({
      roomId: room._id,
      eventType: 'PROPOSAL_SUBMITTED',
      text: `Proposal submitted for "${job.title}"`,
    });
  } catch (error) {
    logger.error({ error, proposalId: proposal._id }, 'Failed to create chat room for proposal');
  }
}

// Hook Point 4: hubProposalService.acceptProposal() - Line ~351
async acceptProposal(proposalId: string, contractId: string) {
  // ... existing acceptance logic ...

  proposal.status = 'ACCEPTED';
  proposal.contractId = contractId;
  await proposal.save();  // Line 351

  // ─── CHAT ROOM TRANSITION HOOK (ADD HERE) ───
  void this.transitionProposalToContract(proposalId, contractId);

  return proposal;
}

// New private method
private async transitionProposalToContract(proposalId: string, contractId: string): Promise<void> {
  try {
    const room = await ChatRoom.findOne({
      contextType: 'PROPOSAL',
      contextId: proposalId,
    });

    if (room) {
      // Update context from proposal to contract
      room.contextType = 'CONTRACT';
      room.contextId = contractId;
      room.contextSnapshot.status = 'ACTIVE';
      await room.save();

      await chatEventService.createSystemMessage({
        roomId: room._id,
        eventType: 'PROPOSAL_ACCEPTED',
        text: 'Proposal accepted! Contract created.',
      });
    }
  } catch (error) {
    logger.error({ error, proposalId, contractId }, 'Failed to transition chat room to contract');
  }
}
```

### 4. Contract Service

**File:** `src/core/services/hub/contracts/hubContract.service.ts`

```typescript
// Hook Point 5: hubContractService.sendOffer() - Line ~471
async sendOffer(data: HubSendOfferInput, userId: string) {
  // ... existing contract creation logic ...

  const contract = await Contract.create(contractData);  // Line 471

  // ─── CHAT ROOM CREATION HOOK (ADD HERE) ───
  // Only create room if NOT from accepted proposal (proposal already has room)
  if (!data.jobProposalId) {
    void this.createContractChatRoom(contract);
  }

  return contract;
}

// Hook Point 6: hubContractService.acceptOffer() - Line ~658
async acceptOffer(contractId: string, userId: string, input?: HubAcceptOfferInput) {
  // ... existing acceptance logic ...

  contract.status = 'ACTIVE';
  await contract.save();  // Line 658

  // ─── CHAT EVENT HOOK (ADD HERE) ───
  void this.addContractEvent(contractId, 'CONTRACT_STARTED', 'Contract started! Work can begin.');

  return contract;
}

// Hook Point 7: hubContractService.pauseContract() - Line ~234
async pauseContract(contractId: string, userId: string) {
  // ... existing pause logic ...

  contract.status = 'PAUSED';
  await contract.save();  // Line 234

  // ─── CHAT EVENT HOOK (ADD HERE) ───
  void this.addContractEvent(contractId, 'CONTRACT_PAUSED', 'Contract paused.');

  return contract;
}

// Hook Point 8: hubContractService.resumeContract() - Line ~267
async resumeContract(contractId: string, userId: string) {
  // ... existing resume logic ...

  contract.status = 'ACTIVE';
  await contract.save();  // Line 267

  // ─── CHAT EVENT HOOK (ADD HERE) ───
  void this.addContractEvent(contractId, 'CONTRACT_RESUMED', 'Contract resumed.');

  return contract;
}

// Hook Point 9: hubContractService.cancelContract() - Line ~197
async cancelContract(contractId: string, userId: string) {
  // ... existing cancel logic ...

  contract.status = 'CANCELLED';
  await contract.save();  // Line 197

  // ─── CHAT ROOM CLOSE HOOK (ADD HERE) ───
  void this.closeContractRoom(contractId, 'Contract cancelled.');

  return contract;
}

// Helper methods
private async addContractEvent(contractId: string, eventType: string, text: string): Promise<void> {
  try {
    const room = await ChatRoom.findOne({ contextType: 'CONTRACT', contextId: contractId });
    if (room) {
      await chatEventService.createSystemMessage({ roomId: room._id, eventType, text });
    }
  } catch (error) {
    logger.error({ error, contractId }, 'Failed to add contract event to chat');
  }
}

private async closeContractRoom(contractId: string, message: string): Promise<void> {
  try {
    const room = await ChatRoom.findOne({ contextType: 'CONTRACT', contextId: contractId });
    if (room) {
      room.status = 'CLOSED';
      await room.save();
      await chatEventService.createSystemMessage({
        roomId: room._id,
        eventType: 'CONTRACT_CANCELLED',
        text: message,
      });
    }
  } catch (error) {
    logger.error({ error, contractId }, 'Failed to close contract chat room');
  }
}
```

---

## Summary: Hook Points

### Transaction Hooks (Backend Services)

| Service | Method | Line | Action |
|---------|--------|------|--------|
| booking.service | `create()` | ~130 | Create BOOKING room |
| hubBooking.service | `createBooking()` | ~976 | Create BOOKING room |
| hubProposal.service | `createProposal()` | ~69 | Create PROPOSAL room |
| hubProposal.service | `acceptProposal()` | ~351 | Transition PROPOSAL → CONTRACT |
| hubContract.service | `sendOffer()` | ~471 | Create CONTRACT room (if no proposal) |
| hubContract.service | `acceptOffer()` | ~658 | Add "started" event |
| hubContract.service | `pauseContract()` | ~234 | Add "paused" event |
| hubContract.service | `resumeContract()` | ~267 | Add "resumed" event |
| hubContract.service | `cancelContract()` | ~197 | Close room + event |

### Inquiry Hooks (API Endpoint)

| Endpoint | Context Type | Reuse Logic |
|----------|--------------|-------------|
| `POST /chat-rooms` | HUB | Reuse if (learner + hubId) exists |
| `POST /chat-rooms` | EXPERTISE | Reuse if (learner + expertiseId) exists |
| `POST /chat-rooms` | EXPERIENCE | Reuse if (learner + experienceId) exists |
| `POST /chat-rooms` | JOB | Reuse if (learner + jobId) exists |

---

## Inquiry Room Creation (Frontend → API)

Inquiry rooms are created when user clicks "Ask Question" on any listing page.

**Endpoint:** `POST /chat-rooms`

```typescript
// Request body
{
  contextType: 'HUB' | 'EXPERTISE' | 'EXPERIENCE' | 'JOB';
  contextId: string;  // hubId, expertiseId, experienceId, or jobId
}

// Example: Ask about expertise
POST /chat-rooms
{
  "contextType": "EXPERTISE",
  "contextId": "expertise_abc123"
}
```

**Backend Logic:**

```typescript
// src/modules/web/routes/chat/chatRoom.routes.ts

async function createChatRoom(request: FastifyRequest, reply: FastifyReply) {
  const { contextType, contextId } = request.body;
  const userId = request.user._id;  // Current authenticated user

  // For inquiry types (HUB, EXPERTISE, EXPERIENCE, JOB)
  // Check if room already exists for this user + context
  if (['HUB', 'EXPERTISE', 'EXPERIENCE', 'JOB'].includes(contextType)) {
    const existingRoom = await ChatRoom.findOne({
      contextType,
      contextId: new ObjectId(contextId),
      learnerId: userId,
    });

    if (existingRoom) {
      return reply.send({ success: true, data: existingRoom });
    }
  }

  // Create new room
  const room = await chatRoomService.createRoom({
    contextType,
    contextId,
    learnerId: userId,
    // hubId is determined from context (expertise.hubId, experience.hubId, etc.)
  });

  return reply.status(201).send({ success: true, data: room });
}
```

---

## Chat Room Service Methods Needed

```typescript
// src/core/services/chat/chatRoom.service.ts

interface CreateRoomInput {
  contextType: 'EXPERTISE' | 'EXPERIENCE' | 'BOOKING' | 'PROPOSAL' | 'CONTRACT';
  contextId: ObjectId;
  hubId: ObjectId;
  learnerId?: ObjectId;      // For learner-hub chats
  otherHubId?: ObjectId;     // For hub-hub chats
  contextSnapshot: {
    title: string;
    status?: string;
    bookingDate?: Date;
    proposalAmount?: number;
  };
}

class ChatRoomService {
  async createRoom(input: CreateRoomInput): Promise<IChatRoom>;
  async updateContext(roomId: ObjectId, contextType: string, contextId: ObjectId): Promise<IChatRoom>;
  async closeRoom(roomId: ObjectId): Promise<IChatRoom>;
}

// src/core/services/chat/chatEvent.service.ts

interface CreateSystemMessageInput {
  roomId: ObjectId;
  eventType: string;
  text: string;
  data?: Record<string, any>;
}

class ChatEventService {
  async createSystemMessage(input: CreateSystemMessageInput): Promise<IChatMessage>;
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/core/services/chat/chatRoom.service.ts` | Create | Room CRUD operations |
| `src/core/services/chat/chatEvent.service.ts` | Create | System event messages |
| `src/core/services/shared/payments/booking.service.ts` | Modify | Add chat hook after line 130 |
| `src/core/services/hub/bookings/hubBooking.service.ts` | Modify | Add chat hook after line 976 |
| `src/core/services/hub/proposals/hubProposal.service.ts` | Modify | Add chat hooks |
| `src/core/services/hub/contracts/hubContract.service.ts` | Modify | Add chat hooks |

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
# @covers AC-CT-001 through AC-CT-006
npm test -- tests/core/services/chat/chatRoom.service.test.ts

# @covers AC-CT-010 through AC-CT-024
npm test -- tests/integration/proposal-to-contract-chat.test.ts

# @covers AC-CT-030 through AC-CT-034
npm test -- tests/integration/contract-status-chat.test.ts
```

### Manual Test Scenarios

1. Create booking → verify chat room created with contextType: 'BOOKING'
2. Create proposal → verify chat room created with contextType: 'PROPOSAL'
3. Accept proposal → verify room changes to contextType: 'CONTRACT'
4. Cancel contract → verify room status: 'CLOSED'
5. Create 2 bookings for same expertise → verify 2 SEPARATE rooms created

---

## Frontend Grouping (Reference Only)

Sidebar grouping is handled by frontend. Backend just returns flat list of rooms.

Frontend groups by:
- `contextSnapshot.title` (expertise/job name) for display grouping
- `contextType` for filter tabs

Example frontend grouping (NOT backend responsibility):

```
┌─────────────────────────────────────────────────────────────────────┐
│                   FRONTEND SIDEBAR DISPLAY                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📚 Python Masterclass (grouped by expertise name)                  │
│    ├─ 💬 Inquiry (John)          → Room A (EXPERTISE context)       │
│    ├─ 🎫 Booking Mar 15 (John)   → Room B (BOOKING context)         │
│    ├─ 🎫 Booking Apr 20 (John)   → Room C (BOOKING context)         │
│    └─ 💬 Inquiry (Sarah)         → Room D (EXPERTISE context)       │
│                                                                     │
│  🏢 Code Academy (grouped by hub name)                              │
│    └─ 💬 General Question (Mike) → Room E (HUB context)             │
│                                                                     │
│  💼 Website Redesign (grouped by job name)                          │
│    ├─ 📝 Proposal from TechHub   → Room F (PROPOSAL context)        │
│    └─ 📄 Contract with DesignPro → Room G (CONTRACT, was PROPOSAL)  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

KEY:
💬 = Inquiry (reuses existing room for same user+context)
🎫 = Booking (always NEW room per booking)
📝 = Proposal (always NEW room per proposal)
📄 = Contract (reuses proposal room when accepted)
```
