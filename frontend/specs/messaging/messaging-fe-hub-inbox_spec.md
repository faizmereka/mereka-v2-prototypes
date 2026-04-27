---
title: Messaging Frontend Hub Inbox
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
  - /home/hira/projects/projects/v2/mereka-backend-v2/specs/messaging/messaging-hub-inbox_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

The Hub Dashboard Chat Inbox page - where hub team members manage all conversations.

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Hub Dashboard > Chats                                    [👤 Sarah] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌────────────────────────────────────────┐  │
│  │     SIDEBAR      │  │           ROOM LIST / DETAIL            │  │
│  │                  │  │                                         │  │
│  │  📥 All     (15) │  │  ┌─────────────────────────────────┐   │  │
│  │  👤 Mine     (3) │  │  │ 🔴 John Doe                     │   │  │
│  │  👥 Unassign (8) │  │  │ About: Python Masterclass       │   │  │
│  │  📦 Archive  (4) │  │  │ "Hi, I have a question..."      │   │  │
│  │  ───────────────│  │  │ 2 min ago           [3] [Join]  │   │  │
│  │  📂 By Context   │  │  └─────────────────────────────────┘   │  │
│  │    Expertises(7) │  │  ┌─────────────────────────────────┐   │  │
│  │    Bookings  (5) │  │  │ ⚪ TechCorp Hub                 │   │  │
│  │    Jobs      (2) │  │  │ Job: Website Redesign           │   │  │
│  │    Contracts (1) │  │  │ "Proposal looks good"           │   │  │
│  │                  │  │  │ 1 hour ago    [Sarah]           │   │  │
│  │  🔍 Search...    │  │  └─────────────────────────────────┘   │  │
│  │                  │  │                                         │  │
│  └──────────────────┘  └────────────────────────────────────────┘  │
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

- Hub chat inbox page component
- Sidebar component with filters
- Room list with pagination
- Room detail panel (split view)
- Assignment modal
- Actions (join, assign, archive, mute)
- Real-time updates
- Mobile responsive layout

### Out of Scope

- Shared components (see messaging-fe-components_spec)
- Learner inbox (see messaging-fe-learner-inbox_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Page Layout

- [x] AC-FEH-001: Page MUST show sidebar on left (collapsible on mobile)
- [x] AC-FEH-002: Page MUST show room list in center
- [x] AC-FEH-003: When room selected, page MUST show split view (list + detail)
- [x] AC-FEH-004: On mobile, room detail MUST be full screen (hide list)
- [x] AC-FEH-005: Page MUST have breadcrumb: Hub Dashboard > Chats

### Sidebar Component

- [x] AC-FEH-010: Sidebar MUST show filter options: All, Assigned to Me, Unassigned, Archived
- [x] AC-FEH-011: Each filter MUST show count badge from API
- [x] AC-FEH-012: Clicking filter MUST update room list
- [x] AC-FEH-013: Active filter MUST be visually highlighted
- [x] AC-FEH-014: Sidebar MUST show context sub-filters (expandable)
- [x] AC-FEH-015: Sidebar MUST have search input
- [x] AC-FEH-016: Search MUST debounce input (300ms) before API call
- [x] AC-FEH-017: Sidebar MUST be collapsible via hamburger icon on mobile

### Room List

- [x] AC-FEH-020: Room list MUST use ChatRoomListItem component for each room
- [x] AC-FEH-021: Room list MUST support infinite scroll pagination
- [x] AC-FEH-022: Room list MUST show loading skeleton while fetching
- [x] AC-FEH-023: Clicking room MUST select it and show detail panel
- [x] AC-FEH-024: Selected room MUST be highlighted
- [x] AC-FEH-025: Room list MUST show "No conversations" when empty
- [x] AC-FEH-026: Each room MUST show action buttons: [Join] / [View] based on status
- [x] AC-FEH-027: Each room MUST show [Assign] button (for admins)

### Room Detail Panel

- [x] AC-FEH-030: Panel MUST show room header with context info
- [x] AC-FEH-031: Panel MUST show participant list (collapsible)
- [x] AC-FEH-032: Panel MUST show message list using ChatMessageList component
- [x] AC-FEH-033: Panel MUST show message input using ChatInput component
- [x] AC-FEH-034: If user not joined, input MUST be disabled with "Join to send messages" prompt
- [x] AC-FEH-035: Panel MUST have [Join] button if not joined
- [x] AC-FEH-036: Panel MUST have action menu (...) with: Assign, Archive, Mute
- [x] AC-FEH-037: If room is CLOSED, input MUST be disabled with "This conversation is closed"

### Assignment Modal

- [x] AC-FEH-040: Modal MUST show list of hub team members
- [x] AC-FEH-041: Modal MUST show current assignee (if any)
- [x] AC-FEH-042: Clicking member MUST assign them
- [x] AC-FEH-043: Modal MUST have "Unassign" option if already assigned
- [x] AC-FEH-044: Modal MUST close and show success toast after assignment

### Actions

- [x] AC-FEH-050: [Join] action MUST call POST /join and update UI
- [x] AC-FEH-051: [Archive] action MUST call POST /archive and move room to Archived filter
- [x] AC-FEH-052: [Unarchive] action MUST call POST /unarchive and move room back
- [x] AC-FEH-053: [Mute] action MUST call POST /mute and show muted icon
- [x] AC-FEH-054: All actions MUST show loading state and success/error toast

### Real-time Updates

- [x] AC-FEH-060: New messages MUST appear instantly via Socket.IO
- [x] AC-FEH-061: Unread counts MUST update in real-time
- [x] AC-FEH-062: Typing indicators MUST show when other users typing
- [x] AC-FEH-063: New room (from another user) MUST appear at top of list
- [x] AC-FEH-064: Sidebar counts MUST update in real-time

### Sending Messages

- [x] AC-FEH-070: Sending message MUST call POST /messages API
- [x] AC-FEH-071: Optimistic update: message MUST appear immediately (before API confirms)
- [x] AC-FEH-072: If send fails, message MUST show error state with retry button
- [x] AC-FEH-073: Typing indicator MUST be sent while user types

### Loading States

- [x] AC-FEH-080: Initial load MUST show full page skeleton
- [x] AC-FEH-081: Room switch MUST show message list skeleton
- [x] AC-FEH-082: Pagination MUST show loading spinner at top
- [x] AC-FEH-083: Actions MUST show button loading state

### Error Handling

- [x] AC-FEH-090: API errors MUST show toast notification
- [x] AC-FEH-091: Socket disconnect MUST show banner "Reconnecting..."
- [x] AC-FEH-092: Socket reconnect MUST fetch latest messages

---



### Non-Functional Requirements

(To be defined)
## Component Structure

```typescript
// projects/app/src/app/features/hub-dashboard/pages/chats/chats.component.ts

@Component({
  selector: 'app-hub-chats',
  standalone: true,
  imports: [
    CommonModule,
    ChatSidebarComponent,
    ChatRoomListComponent,
    ChatRoomDetailComponent,
    AssignMemberModalComponent,
    // Shared components
    ChatMessageListComponent,
    ChatInputComponent,
  ],
})
export class HubChatsComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private socketService = inject(ChatSocketService);

  // State
  readonly filter = signal<FilterType>('ALL');
  readonly contextFilter = signal<ChatContextType | null>(null);
  readonly searchQuery = signal('');
  readonly selectedRoomId = signal<string | null>(null);
  readonly showAssignModal = signal(false);

  // Derived from service
  readonly rooms = this.chatService.rooms;
  readonly activeRoom = this.chatService.activeRoom;
  readonly sidebarCounts = this.chatService.sidebarCounts;
  readonly isLoading = this.chatService.isLoading;

  ngOnInit() {
    this.loadInbox();
    this.connectSocket();
  }

  ngOnDestroy() {
    this.socketService.disconnect();
  }

  async loadInbox() {
    await this.chatService.loadHubInbox({
      hubId: this.currentHubId,
      filter: this.filter(),
      context: this.contextFilter(),
    });
  }

  selectRoom(roomId: string) {
    this.selectedRoomId.set(roomId);
    this.chatService.loadRoom(roomId);
    this.socketService.joinRoom(roomId);
  }

  async joinRoom() {
    await this.chatService.joinRoom(this.activeRoom()!._id);
  }

  async sendMessage(data: { text: string; files?: File[] }) {
    await this.chatService.sendMessage(this.activeRoom()!._id, data);
  }
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `features/hub-dashboard/pages/chats/chats.component.ts` | Modify | Main page component |
| `features/hub-dashboard/pages/chats/chats.component.html` | Modify | Template |
| `features/hub-dashboard/pages/chats/components/chat-sidebar/` | Create | Sidebar component |
| `features/hub-dashboard/pages/chats/components/chat-room-detail/` | Create | Detail panel |
| `features/hub-dashboard/pages/chats/components/assign-member-modal/` | Create | Assignment modal |

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
# @covers AC-FEH-001 through AC-FEH-092
ng test --include="**/hub-dashboard/pages/chats/**"
```

### Manual Testing

1. Open hub inbox, verify all filters work
2. Select room, verify messages load
3. Join conversation, send message
4. Assign team member
5. Archive/unarchive room
6. Test on mobile viewport
