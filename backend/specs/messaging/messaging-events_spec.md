---
title: Messaging Events
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
  - specs/messaging/messaging-room-lifecycle_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

System event messages that are auto-generated when business entity status changes:
- Booking events (requested, confirmed, completed)
- Proposal events (submitted, accepted, rejected)
- Contract events (started, milestone completed)
- Payment events (requested, released)
- Participant events (joined, assigned)

## Why

Events provide a timeline of what happened in the conversation, beyond just text messages.

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

### Booking Events

- [x] AC-EV-001: When booking status changes to REQUESTED, system MUST create event message with `eventType: BOOKING_REQUESTED`
- [x] AC-EV-002: When booking status changes to CONFIRMED, system MUST create event message with `eventType: BOOKING_CONFIRMED`
- [x] AC-EV-003: When booking status changes to CANCELLED, system MUST create event message with `eventType: BOOKING_CANCELLED`
- [x] AC-EV-004: When booking status changes to COMPLETED, system MUST create event message with `eventType: BOOKING_COMPLETED`
- [x] AC-EV-005: Booking event summary MUST include booking date and expertise title
- [x] AC-EV-006: Booking event data MUST include `{ bookingId, expertiseId, date, status }`

### Proposal Events

- [x] AC-EV-010: When proposal submitted, system MUST create event message with `eventType: PROPOSAL_SUBMITTED`
- [x] AC-EV-011: When proposal accepted, system MUST create event message with `eventType: PROPOSAL_ACCEPTED`
- [x] AC-EV-012: When proposal rejected, system MUST create event message with `eventType: PROPOSAL_REJECTED`
- [x] AC-EV-013: Proposal event summary MUST include amount and proposal title
- [x] AC-EV-014: Proposal event data MUST include `{ proposalId, jobId, amount, status }`

### Contract Events

- [x] AC-EV-020: When contract starts, system MUST create event message with `eventType: CONTRACT_STARTED`
- [x] AC-EV-021: When contract paused, system MUST create event message with `eventType: CONTRACT_PAUSED`
- [x] AC-EV-022: When contract completed, system MUST create event message with `eventType: CONTRACT_COMPLETED`
- [x] AC-EV-023: Contract event data MUST include `{ contractId, jobId, status }`

### Milestone Events

- [x] AC-EV-030: When milestone created, system MUST create event message with `eventType: MILESTONE_CREATED`
- [x] AC-EV-031: When milestone submitted for review, system MUST create event message with `eventType: MILESTONE_SUBMITTED`
- [x] AC-EV-032: When milestone approved, system MUST create event message with `eventType: MILESTONE_APPROVED`
- [x] AC-EV-033: Milestone event summary MUST include milestone title and amount
- [x] AC-EV-034: Milestone event data MUST include `{ milestoneId, contractId, title, amount }`

### Payment Events

- [ ] AC-EV-040: When payment requested, system MUST create event message with `eventType: PAYMENT_REQUESTED`
- [ ] AC-EV-041: When payment released, system MUST create event message with `eventType: PAYMENT_RELEASED`
- [ ] AC-EV-042: When payment received, system MUST create event message with `eventType: PAYMENT_RECEIVED`
- [ ] AC-EV-043: Payment event summary MUST include amount and currency
- [ ] AC-EV-044: Payment event data MUST include `{ paymentId, amount, currency }`

### Participant Events

- [x] AC-EV-050: When participant joins, system MUST create event message with `eventType: PARTICIPANT_JOINED`
- [x] AC-EV-051: When participant leaves, system MUST create event message with `eventType: PARTICIPANT_LEFT`
- [x] AC-EV-052: When participant assigned, system MUST create event message with `eventType: PARTICIPANT_ASSIGNED`
- [x] AC-EV-053: Participant event summary MUST include participant name
- [x] AC-EV-054: Participant event data MUST include `{ userId, userName, action }`

### Event Service

- [x] AC-EV-060: `chatEvent.service.createEvent()` MUST create ChatMessage with `type: EVENT`
- [ ] AC-EV-061: Event messages MUST be broadcast via Socket.IO like regular messages
- [x] AC-EV-062: Event messages MUST increment unread counts
- [x] AC-EV-063: Event messages MUST update room's lastMessage cache

---



### Non-Functional Requirements

(To be defined)
## Service Implementation

```typescript
// src/core/services/chat/chatEvent.service.ts

interface ChatEventService {
  createEvent(params: {
    roomId: ObjectId;
    eventType: ChatEventType;
    entityType: ChatEventEntityType;
    entityId: ObjectId;
    summary: string;
    data: Record<string, unknown>;
    triggeredBy?: ObjectId;
  }): Promise<IChatMessage>;
}

// Usage in booking.service.ts
async function onBookingStatusChange(booking: IBooking, newStatus: string) {
  const room = await chatRoomService.findByContext('BOOKING', booking._id);
  if (!room) return;

  const eventTypeMap = {
    REQUESTED: 'BOOKING_REQUESTED',
    CONFIRMED: 'BOOKING_CONFIRMED',
    CANCELLED: 'BOOKING_CANCELLED',
    COMPLETED: 'BOOKING_COMPLETED',
  };

  const summaryMap = {
    REQUESTED: `Booking requested for ${booking.expertiseTitle}`,
    CONFIRMED: `Booking confirmed for ${formatDate(booking.date)}`,
    CANCELLED: `Booking cancelled`,
    COMPLETED: `Booking completed`,
  };

  await chatEventService.createEvent({
    roomId: room._id,
    eventType: eventTypeMap[newStatus],
    entityType: 'BOOKING',
    entityId: booking._id,
    summary: summaryMap[newStatus],
    data: {
      bookingId: booking._id,
      expertiseId: booking.expertiseId,
      date: booking.date,
      status: newStatus,
    },
  });
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/core/services/chat/chatEvent.service.ts` | Create | Event creation service |
| `src/core/services/shared/payments/booking.service.ts` | Modify | Add event hooks |
| `src/core/services/hub/proposals/hubProposal.service.ts` | Modify | Add event hooks |
| `src/core/services/hub/contracts/hubContract.service.ts` | Modify | Add event hooks |

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
# @covers AC-EV-001 through AC-EV-063
npm test -- tests/core/services/chat/chatEvent.service.test.ts
```
