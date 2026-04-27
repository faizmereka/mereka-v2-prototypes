---
title: Messaging System Overview
type: feature_spec
status: draft
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-17'
depends_on: []
links:
  related_docs:
  - docs/architecture/MULTI-APP-ARCHITECTURE.md
  v1_reference:
  - /home/hira/projects/projects/v1/mereka-web/src/app/pages/chats/
  - /home/hira/projects/projects/v1/mereka-web/src/app/_models/chatRoom.ts
  related_specs:
  - specs/messaging/messaging-data-models_spec.md
  - specs/messaging/messaging-nfr_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

A comprehensive real-time messaging system for Mereka v2 that enables communication between:

1. **Learners & Hubs** - For expertise inquiries, booking discussions, and support
2. **Hubs & Hubs** - For job proposals, contract negotiations, and collaboration

This is NOT a standalone chat product - it's deeply integrated with Mereka's business entities (Expertise, Booking, Job, Contract).

## Why

Currently, v2 has **ZERO messaging capability**. Users cannot:
- Ask questions before booking an expertise
- Discuss job proposals with potential clients
- Coordinate on active contracts
- Get support from hub owners

The v1 system handles 1000s of conversations daily. Without messaging, v2 cannot replace v1.

## Success looks like

- A learner can message a hub about an expertise before/after booking
- Hub team members see all conversations in their inbox with unread counts
- Hub admins can assign conversations to team members
- Real-time delivery with <500ms latency
- Mobile-responsive chat UI

---

# Agent Contract

## Scope

This spec is an **OVERVIEW ONLY**. It does not contain implementation details.

### In Scope (covered by related specs)

| Domain | Spec | What it covers |
|--------|------|----------------|
| Data | messaging-data-models_spec | ChatRoom, ChatMessage, ChatParticipant, ChatUserState |
| Rooms | messaging-room-lifecycle_spec | Room creation, context linking, auto-triggers |
| People | messaging-participants_spec | Join, assign, leave, visibility |
| Messages | messaging-send-receive_spec | Send, receive, delete messages |
| Events | messaging-events_spec | System events (booking status, payments) |
| Files | messaging-files_spec | File attachments |
| Real-time | messaging-realtime_spec | WebSocket, typing indicators |
| Tracking | messaging-unread-tracking_spec | Unread counts, read receipts |
| Hub UI | messaging-hub-inbox_spec | Hub inbox API |
| Learner UI | messaging-learner-inbox_spec | Learner inbox API |
| Search | messaging-search_spec | Full-text search |
| NFR | messaging-nfr_spec | Performance, security, observability |

### Out of Scope

- Video/audio calls (future)
- Message reactions/emoji (future)
- Message threading/replies (future)
- End-to-end encryption (not needed for MVP)
- Chatbots/AI responses (future)
- Push notifications to mobile (separate spec)
- WhatsApp/SMS integration (existing notification system)

## Non-goals

## Requirements

System MUST implement all specifications defined in related specs.

## Acceptance Criteria

- [ ] AC-OV-001: All related specs MUST be implemented
- [ ] AC-OV-002: System MUST support real-time messaging with <500ms latency
- [ ] AC-OV-003: System MUST support learner-hub and hub-hub conversations

- Building a standalone chat product
- Supporting external users without Mereka accounts
- Real-time presence beyond typing indicators
- Message editing after send (only delete allowed)

---

## User Journeys

### Journey 1: Learner Asks About Expertise (BEFORE Booking)

```
┌─────────────────────────────────────────────────────────────────────┐
│ LEARNER: "I want to ask about this Python course"                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Learner views Expertise detail page                            │
│     └─ URL: /expertise/python-masterclass                          │
│                                                                     │
│  2. Learner sees [💬 Ask a Question] button                        │
│     └─ Button visible if: learner is logged in                     │
│                                                                     │
│  3. Learner clicks button                                          │
│     └─ System: Check if ChatRoom exists for (expertise + learner)  │
│        ├─ EXISTS: Navigate to existing room                        │
│        └─ NOT EXISTS: Create new room                              │
│                                                                     │
│  4. Chat room opens (modal or full page)                           │
│     ├─ Header: "About: Python Masterclass" + Hub logo              │
│     ├─ If new room: Welcome message from system                    │
│     └─ Input field to type message                                 │
│                                                                     │
│  5. Learner types and sends message                                │
│     └─ "Hi, is this course suitable for beginners?"                │
│                                                                     │
│  6. Hub team receives notification                                 │
│     ├─ In-app: Unread badge on inbox                               │
│     └─ Optional: Email notification                                │
│                                                                     │
│  7. Hub member JOINS the conversation                              │
│     ├─ Sees: "New conversation about Python Masterclass"           │
│     ├─ Clicks: [Join] button to participate                        │
│     └─ Now can send messages                                       │
│                                                                     │
│  8. Hub member replies                                             │
│     └─ "Yes! This course starts from basics."                      │
│                                                                     │
│  9. Learner receives reply in real-time                            │
│     └─ Message appears instantly via WebSocket                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Journey 2: Learner Books Expertise (Chat Already Exists)

```
┌─────────────────────────────────────────────────────────────────────┐
│ LEARNER: "I want to book this expertise"                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Learner completes booking flow                                 │
│     └─ Booking status: REQUESTED                                   │
│                                                                     │
│  2. System creates EVENT message in existing ChatRoom              │
│     └─ "📅 Booking requested for March 15, 2026"                   │
│     └─ Context changes: EXPERTISE → BOOKING                        │
│                                                                     │
│  3. Hub receives notification about booking request                │
│                                                                     │
│  4. Hub member confirms booking                                    │
│     └─ Booking status: CONFIRMED                                   │
│                                                                     │
│  5. System creates EVENT message                                   │
│     └─ "✅ Booking confirmed! See you on March 15"                 │
│                                                                     │
│  6. Conversation continues in same room                            │
│     └─ Full history preserved                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Journey 3: Learner Books Expertise (NO Prior Chat)

```
┌─────────────────────────────────────────────────────────────────────┐
│ LEARNER: "I want to book without asking questions first"           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Learner completes booking flow directly                        │
│     └─ No prior ChatRoom exists                                    │
│                                                                     │
│  2. System auto-creates ChatRoom                                   │
│     ├─ Context: BOOKING                                            │
│     ├─ Participants: Learner + Hub                                 │
│     └─ First message: EVENT "📅 Booking requested"                 │
│                                                                     │
│  3. Learner sees chat in their inbox                               │
│     └─ Can message hub about the booking                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Journey 4: Hub Posts Job, Expert Hub Submits Proposal

```
┌─────────────────────────────────────────────────────────────────────┐
│ HUB-TO-HUB: Job proposal negotiation                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Client Hub posts job: "Need website redesign"                  │
│                                                                     │
│  2. Expert Hub views job and clicks [Submit Proposal]              │
│                                                                     │
│  3. System creates ChatRoom                                        │
│     ├─ Context: JOB                                                │
│     ├─ Participants: Client Hub + Expert Hub                       │
│     └─ First message: EVENT "📝 Proposal submitted: $5,000"        │
│                                                                     │
│  4. Client Hub reviews proposal in their inbox                     │
│     ├─ Sees proposal details                                       │
│     └─ Can message Expert Hub with questions                       │
│                                                                     │
│  5. Negotiation happens via chat                                   │
│     └─ "Can you include mobile responsiveness?"                    │
│                                                                     │
│  6. Client Hub accepts proposal                                    │
│     └─ System: EVENT "✅ Proposal accepted"                        │
│     └─ System: Creates Contract                                    │
│     └─ Context changes: JOB → CONTRACT                             │
│                                                                     │
│  7. Contract work tracked in same chat                             │
│     ├─ EVENT "🎯 Milestone 1 completed"                            │
│     ├─ EVENT "💰 Payment released: $2,000"                         │
│     └─ Messages about work progress                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Journey 5: Hub Member Manages Inbox

```
┌─────────────────────────────────────────────────────────────────────┐
│ HUB MEMBER: "I need to manage our conversations"                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Hub member opens Hub Dashboard → Chat Inbox                    │
│                                                                     │
│  2. Sees sidebar with filters:                                     │
│     ┌─────────────────────┐                                        │
│     │ 📥 All          (15)│                                        │
│     │ 👤 Assigned to me (3)│                                        │
│     │ 👥 Unassigned     (8)│                                        │
│     │ 📦 Archived       (4)│                                        │
│     │ ─────────────────── │                                        │
│     │ 📂 By Context       │                                        │
│     │   └─ Expertises (7) │                                        │
│     │   └─ Bookings   (5) │                                        │
│     │   └─ Jobs       (2) │                                        │
│     │   └─ Contracts  (1) │                                        │
│     └─────────────────────┘                                        │
│                                                                     │
│  3. Member sees conversation list:                                 │
│     ┌────────────────────────────────────────────────────────┐     │
│     │ 🔴 John Doe - About: Python Masterclass                │     │
│     │    "Hi, is this course suitable..."  •  2 min ago      │     │
│     │    👥 No one assigned              [Join] [Assign]     │     │
│     ├────────────────────────────────────────────────────────┤     │
│     │ ⚪ TechCorp Hub - Job: Website Redesign                │     │
│     │    "Can you include mobile..."  •  1 hour ago          │     │
│     │    👤 Sarah (assigned)             [View]              │     │
│     └────────────────────────────────────────────────────────┘     │
│                                                                     │
│  4. Member actions:                                                │
│     ├─ [Join] - Become active participant                          │
│     ├─ [Assign] - Assign to self or teammate                       │
│     ├─ [View] - Read-only, no notifications                        │
│     ├─ [Archive] - Hide from inbox (per-user)                      │
│     └─ [Mute] - Stop notifications (per-user)                      │
│                                                                     │
│  5. Member clicks [Assign] on John Doe conversation               │
│     ├─ Modal shows team members                                    │
│     ├─ Selects "Sarah"                                             │
│     └─ System: EVENT "Sarah assigned to conversation"              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐     ┌─────────────────┐                       │
│  │   Hub Dashboard │     │   Learner App   │                       │
│  │   Chat Inbox    │     │   Chat Inbox    │                       │
│  └────────┬────────┘     └────────┬────────┘                       │
│           │                       │                                 │
│           └───────────┬───────────┘                                 │
│                       │                                             │
│              ┌────────┴────────┐                                    │
│              │  ChatService    │ (Angular)                          │
│              │  SocketService  │                                    │
│              └────────┬────────┘                                    │
│                       │                                             │
└───────────────────────┼─────────────────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │ REST API      │ WebSocket   │
         │ (HTTP)        │ (Socket.IO) │
         └──────────────┬──────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────────────┐
│                       │            BACKEND                          │
├───────────────────────┼─────────────────────────────────────────────┤
│                       │                                             │
│  ┌────────────────────┴────────────────────┐                       │
│  │            Fastify Server               │                       │
│  ├─────────────────────────────────────────┤                       │
│  │                                         │                       │
│  │  ┌─────────────┐   ┌─────────────────┐ │                       │
│  │  │ REST Routes │   │ Socket.IO       │ │                       │
│  │  │ /chat-rooms │   │ Handlers        │ │                       │
│  │  │ /messages   │   │ join_room       │ │                       │
│  │  └──────┬──────┘   │ send_message    │ │                       │
│  │         │          │ typing          │ │                       │
│  │         │          └────────┬────────┘ │                       │
│  │         │                   │          │                       │
│  │  ┌──────┴───────────────────┴───────┐  │                       │
│  │  │           Services               │  │                       │
│  │  │  ┌─────────────────────────────┐ │  │                       │
│  │  │  │ chatRoom.service            │ │  │                       │
│  │  │  │ chatMessage.service         │ │  │                       │
│  │  │  │ chatParticipant.service     │ │  │                       │
│  │  │  │ chatEvent.service           │ │  │                       │
│  │  │  │ unreadTracking.service      │ │  │                       │
│  │  │  └─────────────────────────────┘ │  │                       │
│  │  └──────────────┬───────────────────┘  │                       │
│  │                 │                      │                       │
│  └─────────────────┼──────────────────────┘                       │
│                    │                                               │
│  ┌─────────────────┴───────────────────┐                          │
│  │            MongoDB                   │                          │
│  │  ┌─────────────┐ ┌─────────────────┐│                          │
│  │  │ ChatRoom    │ │ ChatMessage     ││                          │
│  │  │ collection  │ │ collection      ││                          │
│  │  └─────────────┘ └─────────────────┘│                          │
│  │  ┌─────────────┐ ┌─────────────────┐│                          │
│  │  │ChatUserState│ │ (indexes)       ││                          │
│  │  │ collection  │ │                 ││                          │
│  │  └─────────────┘ └─────────────────┘│                          │
│  └─────────────────────────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Context Types

| Context | Who Participates | Triggered By | Example |
|---------|------------------|--------------|---------|
| EXPERTISE | Learner + Hub | Learner clicks "Ask Question" | "Questions about Python Masterclass" |
| BOOKING | Learner + Hub | Booking created | "Booking #12345 - Python Masterclass" |
| JOB | Hub + Hub | Proposal submitted | "Proposal for Website Redesign job" |
| CONTRACT | Hub + Hub | Proposal accepted | "Contract: Website Redesign" |
| GENERAL | Any + Hub | Direct message | "General inquiry" |

---

## Open Questions

- [ ] AC-001: Should booking chat upgrade from EXPERTISE chat or create new room?
- [ ] AC-002: Should learner see hub member names or just "Hub Team"?
- [ ] AC-003: Message retention policy for GDPR?
- [ ] AC-004: Should we implement read receipts (seen by X)?

---

## Related Specs

Read these specs in order:
1. **messaging-data-models_spec** - Understand the data structures
2. **messaging-room-lifecycle_spec** - How rooms are created
3. **messaging-participants_spec** - How people join/leave
4. **messaging-send-receive_spec** - Sending messages
5. **messaging-realtime_spec** - Real-time delivery
6. **messaging-hub-inbox_spec** - Hub inbox features

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
