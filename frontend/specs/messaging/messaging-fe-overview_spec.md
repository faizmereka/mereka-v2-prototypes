---
title: Messaging Frontend Overview
type: feature_spec
status: implemented
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-18'
depends_on: []
links:
  backend_specs:
  - /home/hira/projects/projects/v2/mereka-backend-v2/specs/messaging/
  v1_reference:
  - /home/hira/projects/projects/v1/mereka-web/src/app/pages/chats/
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

The Angular 21 frontend for the messaging system:
- **Hub Dashboard Chat** - Full inbox with sidebar, assignment, real-time updates
- **Learner App Chat** - Simplified inbox for learner conversations
- **Shared Components** - Reusable chat UI components

## Technology Stack

- Angular 21 with Signals (not RxJS Subjects)
- Tailwind CSS for styling
- Socket.IO client for real-time
- Clean Architecture (presentation/domain/data layers)

## Why

The frontend is how users interact with the chat system. Without it, the backend is useless.

## Success looks like

- Responsive chat UI on desktop and mobile
- Real-time message updates
- Intuitive inbox navigation
- Smooth typing indicators

## Scope

This spec covers the frontend architecture overview for the messaging system.

## Non-goals

- Backend implementation details
- Database schema (see backend specs)

## Requirements

System MUST implement all frontend components defined in related specs.

## Acceptance Criteria

- [x] AC-FEO-001: Frontend MUST use Angular 21 with Signals
- [x] AC-FEO-002: Frontend MUST use Socket.IO for real-time updates
- [x] AC-FEO-003: UI MUST be responsive on desktop and mobile

---

# Frontend Architecture

## Component Structure

```
projects/app/src/app/
├── core/
│   ├── services/
│   │   ├── chat.service.ts           # REST API calls
│   │   └── chat-socket.service.ts    # Socket.IO connection
│   └── models/
│       └── chat.model.ts             # TypeScript interfaces
│
├── shared/
│   └── components/
│       └── chat/                     # Shared chat components
│           ├── chat-message-bubble/
│           ├── chat-message-list/
│           ├── chat-input/
│           ├── chat-room-list-item/
│           ├── chat-event-message/
│           └── typing-indicator/
│
├── features/
│   ├── hub-dashboard/
│   │   └── pages/
│   │       └── chats/                # Hub chat inbox
│   │           ├── chats.component.ts
│   │           ├── chats.component.html
│   │           └── components/
│   │               ├── chat-sidebar/
│   │               ├── chat-room-detail/
│   │               └── assign-member-modal/
│   │
│   └── user-dashboard/
│       └── pages/
│           └── chats/                # Learner chat inbox
│               ├── chats.component.ts
│               └── chats.component.html
```

## State Management (Signals)

```typescript
// src/app/core/services/chat.service.ts

@Injectable({ providedIn: 'root' })
export class ChatService {
  // Signals for reactive state
  readonly rooms = signal<ChatRoom[]>([]);
  readonly activeRoom = signal<ChatRoom | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly sidebarCounts = signal<SidebarCounts | null>(null);
  readonly isLoading = signal(false);

  // Computed signals
  readonly unreadTotal = computed(() =>
    this.rooms().reduce((sum, r) => sum + r.unreadCount, 0)
  );

  readonly activeRoomMessages = computed(() =>
    this.messages().filter(m => m.roomId === this.activeRoom()?._id)
  );
}
```

## Socket Service (Real-time)

```typescript
// src/app/core/services/chat-socket.service.ts

@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  private socket: Socket | null = null;

  // Signals for connection state
  readonly connected = signal(false);
  readonly typing = signal<TypingUser[]>([]);

  // Events as observables (for subscriptions)
  readonly newMessage$ = new Subject<ChatMessage>();
  readonly unreadUpdate$ = new Subject<UnreadUpdate>();

  connect(token: string) {
    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('new_message', (msg) => this.newMessage$.next(msg));
    this.socket.on('user_typing', (data) => this.addTyping(data));
  }

  joinRoom(roomId: string) {
    this.socket?.emit('join_room', { roomId });
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leave_room', { roomId });
  }

  sendTyping(roomId: string, isTyping: boolean) {
    this.socket?.emit(isTyping ? 'typing_start' : 'typing_stop', { roomId });
  }
}
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND DATA FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User Action (click "Send")                                        │
│       │                                                             │
│       ▼                                                             │
│  Component calls ChatService.sendMessage()                         │
│       │                                                             │
│       ├─────────────────────────────────┐                          │
│       │                                 │                          │
│       ▼ REST API                        │                          │
│  POST /chat-rooms/:id/messages          │                          │
│       │                                 │                          │
│       ▼                                 │                          │
│  Backend saves message                  │                          │
│       │                                 │                          │
│       ▼                                 │                          │
│  Backend emits Socket.IO event ─────────┘                          │
│       │                                 │                          │
│       ▼                                 ▼                          │
│  ChatSocketService receives          ChatService updates           │
│  'new_message' event                 messages signal               │
│       │                                 │                          │
│       └─────────────────────────────────┘                          │
│                       │                                             │
│                       ▼                                             │
│              Component re-renders with new message                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Related Specs

Read these specs in order:

### Backend (API contracts)
1. `/mereka-backend-v2/specs/messaging/messaging-hub-inbox_spec.md` - Hub inbox API
2. `/mereka-backend-v2/specs/messaging/messaging-realtime_spec.md` - Socket events

### Frontend (implementation)
1. `messaging-fe-components_spec.md` - Shared components
2. `messaging-fe-hub-inbox_spec.md` - Hub inbox page
3. `messaging-fe-learner-inbox_spec.md` - Learner inbox page

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
