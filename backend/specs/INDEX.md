# Specification Index - Mereka Backend v2

> Specs define WHAT MUST BE TRUE. They are machine-checkable contracts.

## Summary

| Status | Count |
|--------|-------|
| implemented | 10 |
| draft | 2 |
| in_progress | 0 |
| approved | 0 |

---

## Messaging System Specs

The messaging system is split into domain-specific specs for clarity and parallel implementation.

### Backend Specs (12)

| # | Spec | Status | ACs | Tier | Description |
|---|------|--------|-----|------|-------------|
| 1 | [messaging-overview_spec](messaging/messaging-overview_spec.md) | draft | 0 | 0 | System overview, user journeys, architecture |
| 2 | [messaging-nfr_spec](messaging/messaging-nfr_spec.md) | draft | 20 | 0 | Non-functional: performance, security, observability |
| 3 | [messaging-data-models_spec](messaging/messaging-data-models_spec.md) | ✅ implemented | 40 | 1 | ChatRoom, ChatMessage, ChatParticipant, ChatUserState |
| 4 | [messaging-room-lifecycle_spec](messaging/messaging-room-lifecycle_spec.md) | ✅ implemented | 25 | 2 | Room creation, context linking, auto-creation triggers |
| 5 | [messaging-participants_spec](messaging/messaging-participants_spec.md) | ✅ implemented | 30 | 2 | Join flow, assignment, visibility, leave |
| 6 | [messaging-conversation-triggers_spec](messaging/messaging-conversation-triggers_spec.md) | ✅ implemented | 20 | 2 | Hook locations in booking/proposal/contract APIs |
| 7 | [messaging-send-receive_spec](messaging/messaging-send-receive_spec.md) | ✅ implemented | 25 | 3 | Sending/receiving messages, deletion |
| 8 | [messaging-events_spec](messaging/messaging-events_spec.md) | ✅ implemented | 30 | 3 | System events for booking/job/contract status |
| 9 | [messaging-realtime_spec](messaging/messaging-realtime_spec.md) | ✅ implemented | 35 | 4 | WebSocket, Socket.IO, typing indicators |
| 10 | [messaging-unread-tracking_spec](messaging/messaging-unread-tracking_spec.md) | ✅ implemented | 20 | 4 | Unread counts, read state, badges |
| 11 | [messaging-hub-inbox_spec](messaging/messaging-hub-inbox_spec.md) | ✅ implemented | 35 | 5 | Hub inbox API, sidebar, filtering |
| 12 | [messaging-learner-inbox_spec](messaging/messaging-learner-inbox_spec.md) | ✅ implemented | 20 | 5 | Learner inbox API, privacy transform |

**Total Backend ACs: ~300**

---

## Implementation Order

See [IMPLEMENTATION_ORDER.md](IMPLEMENTATION_ORDER.md) for the dependency graph and recommended sequence.

```
Tier 0: Overview + NFR (Read first, no code)
   ↓
Tier 1: Data Models (Foundation - must be first)
   ↓
Tier 2: Room Lifecycle + Participants (can parallelize)
   ↓
Tier 3: Send/Receive + Events (can parallelize)
   ↓
Tier 4: Realtime + Unread Tracking (can parallelize)
   ↓
Tier 5: Hub Inbox + Learner Inbox (can parallelize)
```

---

## Related Frontend Specs

Frontend specs are in the frontend repository:
- `/home/hira/projects/projects/v2/mereka-frontend-workspace-v2/specs/messaging/`

---

## Other Feature Specs (Future)

| Spec | Type | Description |
|------|------|-------------|
| bookings_spec | feature_spec | Expertise booking system |
| jobs_spec | feature_spec | Job posting and proposals |
| contracts_spec | feature_spec | Contracts and milestones |
| payments_spec | feature_spec | Payment processing |
| notifications_spec | feature_spec | Push/email notifications |

---

*Generated: 2026-02-17 | Total: 12 specs, ~300 ACs*
