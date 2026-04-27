# Implementation Order - Messaging System

Generated from `depends_on` in spec frontmatter.

## Dependency Graph

```
Tier 0: Overview + NFR (No dependencies)
   │
   ▼
Tier 1: Data Models (Foundation)
   │
   ├────────────────┬────────────────┐
   ▼                ▼                ▼
Tier 2: Room       Tier 2:          Tier 2:
Lifecycle          Participants     (parallel)
   │                │
   ├────────────────┴────────────────┐
   ▼                                 ▼
Tier 3: Send/Receive    Tier 3: Events    Tier 3: Files
   │                         │                 │
   └─────────────────────────┴─────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
       Tier 4: Realtime              Tier 4: Unread Tracking
            │                                 │
            └─────────────────┬───────────────┘
                              ▼
       ┌──────────────────────┴──────────────────────┐
       ▼                                             ▼
  Tier 5: Hub Inbox                        Tier 5: Learner Inbox
  Tier 5: FE Components
       │                                             │
       └──────────────────────┬──────────────────────┘
                              ▼
                       Tier 6: Search
```

## Tier 0 - Foundation (No Dependencies)

| Spec | ACs | Title | Why First |
|------|-----|-------|-----------|
| messaging-overview_spec | 0 | System Overview | Defines architecture, no code |
| messaging-nfr_spec | 15 | Non-Functional Requirements | Cross-cutting, referenced by all |

## Tier 1 - Data Models (Depends on Tier 0)

| Spec | ACs | Title | Why This Tier |
|------|-----|-------|---------------|
| messaging-data-models_spec | 15 | Data Models | All features need models first |

## Tier 2 - Core Logic (Depends on Tier 1)

| Spec | ACs | Title | Can Parallelize |
|------|-----|-------|-----------------|
| messaging-room-lifecycle_spec | 20 | Room Lifecycle | Yes |
| messaging-participants_spec | 18 | Participants | Yes |
| messaging-conversation-triggers_spec | 20 | API Hook Points | Yes (after room-lifecycle) |

## Tier 3 - Messaging Features (Depends on Tier 2)

| Spec | ACs | Title | Can Parallelize |
|------|-----|-------|-----------------|
| messaging-send-receive_spec | 15 | Send/Receive | Yes |
| messaging-events_spec | 20 | Event Messages | Yes |
| messaging-files_spec | 12 | File Attachments | Yes |

## Tier 4 - Real-time & Tracking (Depends on Tier 3)

| Spec | ACs | Title | Can Parallelize |
|------|-----|-------|-----------------|
| messaging-realtime_spec | 18 | WebSocket/Real-time | Yes |
| messaging-unread-tracking_spec | 12 | Unread Tracking | Yes |

## Tier 5 - UI & Integration (Depends on Tier 4)

| Spec | ACs | Title | Can Parallelize |
|------|-----|-------|-----------------|
| messaging-hub-inbox_spec | 20 | Hub Inbox API | Yes |
| messaging-learner-inbox_spec | 12 | Learner Inbox API | Yes |
| messaging-fe-components_spec | 20 | FE Components | Yes |
| messaging-fe-hub-inbox_spec | 15 | FE Hub Inbox | Needs messaging-fe-components |
| messaging-fe-learner-inbox_spec | 12 | FE Learner Inbox | Needs messaging-fe-components |

## Tier 6 - Polish (Depends on Tier 5)

| Spec | ACs | Title |
|------|-----|-------|
| messaging-search_spec | 10 | Search |

---

## Recommended Implementation Sequence

### Week 1-2: Foundation
1. ✅ messaging-overview_spec (read, understand)
2. ✅ messaging-nfr_spec (read, understand)
3. 🔨 messaging-data-models_spec (implement models)

### Week 3: Core Backend
4. 🔨 messaging-room-lifecycle_spec (room creation)
5. 🔨 messaging-participants_spec (join/assignment)
6. 🔨 messaging-conversation-triggers_spec (hooks in booking/proposal APIs)

### Week 4: Messaging Features
6. 🔨 messaging-send-receive_spec (send messages)
7. 🔨 messaging-events_spec (event messages)
8. 🔨 messaging-files_spec (attachments)

### Week 5: Real-time
9. 🔨 messaging-realtime_spec (WebSocket)
10. 🔨 messaging-unread-tracking_spec (unread counts)

### Week 6: APIs & Frontend
11. 🔨 messaging-hub-inbox_spec (hub inbox API)
12. 🔨 messaging-learner-inbox_spec (learner inbox API)
13. 🔨 messaging-fe-components_spec (UI components)

### Week 7: Frontend Integration
14. 🔨 messaging-fe-hub-inbox_spec (hub inbox page)
15. 🔨 messaging-fe-learner-inbox_spec (learner inbox page)

### Week 8: Polish
16. 🔨 messaging-search_spec (search feature)

---

**Total**: 16 specs, ~200 ACs, 8 weeks estimated
