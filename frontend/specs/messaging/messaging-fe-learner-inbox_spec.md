---
title: Messaging Frontend Learner Inbox
type: feature_spec
status: implemented
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-17'
depends_on:
- specs/messaging/messaging-fe-components_spec.md
links:
  backend_specs:
  - /home/hira/projects/projects/v2/mereka-backend-v2/specs/messaging/messaging-learner-inbox_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

The Learner App Chat Inbox - a simplified view for learners to see their conversations.

## Key Differences from Hub Inbox

| Aspect | Hub Inbox | Learner Inbox |
|--------|-----------|---------------|
| Filters | All, Assigned, Unassigned, Archived | None (just list) |
| Assignment | Can assign team members | N/A |
| Participants shown | Individual hub members | "Hub Team" (anonymous) |
| Actions | Join, Assign, Archive, Mute | Archive, Mute only |
| Complexity | Full featured | Simplified |

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ My Messages                                               [👤 John] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🔍 Search conversations...                                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [Logo] Code Academy                                    [3]  │   │
│  │ About: Python Masterclass                                   │   │
│  │ "Thanks for your question! Yes, this course..."             │   │
│  │ 2 min ago                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [Logo] Design Studio                                        │   │
│  │ Booking: March 15 - UI Consultation                         │   │
│  │ "✅ Booking confirmed! See you on..."                       │   │
│  │ 1 hour ago                                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

# Agent Contract

## Scope

#
## Non-goals

- Items explicitly not covered by this spec

## In Scope

- Learner chat inbox page
- Room list with search
- Room detail view
- Sending messages
- Archive/Mute actions

### Out of Scope

- Assignment features (not applicable)
- Sidebar filters (simplified)
- Hub-specific features

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Page Layout

- [x] AC-FEL-001: Page MUST show header "My Messages" or "Chats"
- [x] AC-FEL-002: Page MUST show search bar at top
- [x] AC-FEL-003: Page MUST show room list below search
- [x] AC-FEL-004: Clicking room MUST open full-screen detail view (mobile-first)
- [x] AC-FEL-005: On desktop, MAY show split view (list + detail)

### Room List

- [x] AC-FEL-010: Each room MUST show hub logo (not individual member avatar)
- [x] AC-FEL-011: Each room MUST show hub name (not individual member names)
- [x] AC-FEL-012: Each room MUST show context label: "About: {expertiseTitle}" or "Booking: {date} - {title}"
- [x] AC-FEL-013: Each room MUST show last message preview
- [x] AC-FEL-014: Each room MUST show unread count badge (if > 0)
- [x] AC-FEL-015: Rooms MUST be sorted by last message time (recent first)
- [x] AC-FEL-016: Room list MUST support pull-to-refresh on mobile
- [x] AC-FEL-017: Room list MUST show "No messages yet" when empty

### Search

- [x] AC-FEL-020: Search MUST filter rooms by hub name
- [x] AC-FEL-021: Search MUST filter rooms by context title
- [x] AC-FEL-022: Search MUST be debounced (300ms)
- [x] AC-FEL-023: Search MUST show "No results" when no matches

### Room Detail View

- [x] AC-FEL-030: Header MUST show hub logo and name
- [x] AC-FEL-031: Header MUST show context badge and title
- [x] AC-FEL-032: Header MUST have back button (returns to list)
- [x] AC-FEL-033: Header MUST have action menu (...) with Archive, Mute
- [x] AC-FEL-034: Messages MUST use ChatMessageList component
- [x] AC-FEL-035: Hub team messages MUST show "Hub Team" or hub name (not individual names)
- [x] AC-FEL-036: Own messages MUST show own name
- [x] AC-FEL-037: Input MUST use ChatInput component
- [x] AC-FEL-038: If room CLOSED, show "This conversation is closed"

### Sending Messages

- [x] AC-FEL-040: User MUST be able to send text messages
- [x] AC-FEL-041: User MUST be able to attach files
- [x] AC-FEL-042: Sending MUST show optimistic update
- [x] AC-FEL-043: Send failure MUST show retry option

### Real-time Updates

- [x] AC-FEL-050: New messages MUST appear instantly
- [x] AC-FEL-051: Unread counts MUST update in real-time
- [x] AC-FEL-052: Typing indicators MUST show when hub is typing

### Privacy

- [x] AC-FEL-060: Individual hub member names MUST NOT be shown to learner
- [x] AC-FEL-061: Hub member emails MUST NOT be shown to learner
- [x] AC-FEL-062: Hub member avatars MUST NOT be shown to learner
- [x] AC-FEL-063: Messages MUST show as from "Hub Team" or hub name

---



### Non-Functional Requirements

(To be defined)
## Component Structure

```typescript
// projects/app/src/app/features/user-dashboard/pages/chats/chats.component.ts

@Component({
  selector: 'app-learner-chats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatMessageListComponent,
    ChatInputComponent,
  ],
})
export class LearnerChatsComponent implements OnInit {
  private chatService = inject(ChatService);
  private socketService = inject(ChatSocketService);

  // State
  readonly searchQuery = signal('');
  readonly selectedRoomId = signal<string | null>(null);

  // Derived
  readonly rooms = this.chatService.rooms;
  readonly activeRoom = this.chatService.activeRoom;
  readonly isLoading = this.chatService.isLoading;

  readonly filteredRooms = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.rooms();
    return this.rooms().filter(room =>
      room.hubSnapshot.name.toLowerCase().includes(query) ||
      room.contextSnapshot.title.toLowerCase().includes(query)
    );
  });

  ngOnInit() {
    this.loadInbox();
    this.connectSocket();
  }

  async loadInbox() {
    await this.chatService.loadLearnerInbox();
  }

  selectRoom(roomId: string) {
    this.selectedRoomId.set(roomId);
    this.chatService.loadRoom(roomId);
    this.socketService.joinRoom(roomId);
  }

  goBack() {
    this.selectedRoomId.set(null);
    this.socketService.leaveRoom(this.activeRoom()!._id);
  }
}
```

---

## Hub Team Privacy Transform

```typescript
// In chat.service.ts or a transform utility

function transformForLearnerView(message: ChatMessage, hubName: string): ChatMessage {
  if (message.sender.type === 'HUB_TEAM') {
    return {
      ...message,
      sender: {
        ...message.sender,
        name: hubName, // or "Hub Team"
        avatar: undefined, // Don't show individual avatar
      },
    };
  }
  return message;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `features/user-dashboard/pages/chats/chats.component.ts` | Main component |
| `features/user-dashboard/pages/chats/chats.component.html` | Template |
| `features/user-dashboard/pages/chats/chats.component.scss` | Styles |
| `features/user-dashboard/user-dashboard.routes.ts` | Add route |

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
# @covers AC-FEL-001 through AC-FEL-063
ng test --include="**/user-dashboard/pages/chats/**"
```

### Manual Testing

1. Open learner inbox, verify rooms show
2. Search for hub name
3. Open room, verify hub team privacy
4. Send message, verify delivery
5. Test on mobile viewport
