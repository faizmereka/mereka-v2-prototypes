# Specification Index - Mereka Frontend v2

> Specs define WHAT MUST BE TRUE. They are machine-checkable contracts.

## Summary

| Status | Count |
|--------|-------|
| draft | 0 |
| in_progress | 0 |
| approved | 0 |
| implemented | 4 |

---

## Messaging System Frontend Specs (4)

| # | Spec | Status | ACs | Tier | Description |
|---|------|--------|-----|------|-------------|
| 1 | [messaging-fe-overview_spec](messaging/messaging-fe-overview_spec.md) | ✅ implemented | 3 | 0 | Frontend architecture, state management |
| 2 | [messaging-fe-components_spec](messaging/messaging-fe-components_spec.md) | ✅ implemented | 45 | 1 | Shared chat UI components |
| 3 | [messaging-fe-hub-inbox_spec](messaging/messaging-fe-hub-inbox_spec.md) | ✅ implemented | 92 | 2 | Hub dashboard chat inbox page |
| 4 | [messaging-fe-learner-inbox_spec](messaging/messaging-fe-learner-inbox_spec.md) | ✅ implemented | 63 | 2 | Learner app chat inbox page |

**Total Frontend ACs: 203**

---

## Implementation Order

```
Tier 0: Overview (Read first, understand architecture)
   ↓
Tier 1: Shared Components (Build reusable parts first)
   ↓
Tier 2: Hub Inbox + Learner Inbox (can parallelize)
```

---

## Backend API Dependencies

Frontend specs depend on backend API contracts:
- **Hub Inbox API**: `/mereka-backend-v2/specs/messaging/messaging-hub-inbox_spec.md`
- **Learner Inbox API**: `/mereka-backend-v2/specs/messaging/messaging-learner-inbox_spec.md`
- **WebSocket Events**: `/mereka-backend-v2/specs/messaging/messaging-realtime_spec.md`
- **Data Models**: `/mereka-backend-v2/specs/messaging/messaging-data-models_spec.md`

---

## Technology Stack

- Angular 21 with Signals
- Tailwind CSS
- Socket.IO client
- Clean Architecture (presentation/domain/data)

---

*Updated: 2026-02-18 | Total: 4 specs, 203 ACs | All implemented ✅*
