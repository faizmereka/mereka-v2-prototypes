---
title: Messaging Frontend Components
type: feature_spec
status: implemented
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-17'
depends_on:
- specs/messaging/messaging-fe-overview_spec.md
links:
  backend_specs:
  - /home/hira/projects/projects/v2/mereka-backend-v2/specs/messaging/messaging-data-models_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

Reusable Angular chat components that work in both Hub and Learner contexts:
- **ChatMessageBubble** - Single message display
- **ChatMessageList** - Scrollable message list with date separators
- **ChatInput** - Message input with file attachment
- **ChatRoomListItem** - Room preview in sidebar/list
- **ChatEventMessage** - System event display
- **TypingIndicator** - "User is typing..." animation

## Why

DRY principle - these components are used in both Hub and Learner inboxes.

---

# Agent Contract

## Scope

#
## Non-goals

- Items explicitly not covered by this spec

## In Scope

- All shared chat components
- Component inputs/outputs
- Styling with Tailwind
- Mobile responsiveness

### Out of Scope

- Page-level components (see messaging-fe-hub-inbox_spec)
- API calls (components receive data via inputs)
- Socket connections (handled by parent)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### ChatMessageBubble Component

- [x] AC-FEC-001: Component MUST accept `message: ChatMessage` input
- [x] AC-FEC-002: Component MUST display sender name and avatar
- [x] AC-FEC-003: Component MUST display message text with proper line breaks
- [x] AC-FEC-004: Component MUST display timestamp (relative: "2 min ago")
- [x] AC-FEC-005: Own messages MUST be right-aligned, others left-aligned
- [x] AC-FEC-006: Deleted messages MUST show "This message was deleted" in italic
- [x] AC-FEC-007: Component MUST have delete button (visible on hover) for own messages
- [x] AC-FEC-008: Component MUST emit `deleteMessage` event when delete clicked
- [x] AC-FEC-009: Links in message MUST be clickable and open in new tab
- [x] AC-FEC-010: Long messages MUST wrap properly, not overflow

### ChatMessageList Component

- [x] AC-FEC-020: Component MUST accept `messages: ChatMessage[]` input
- [x] AC-FEC-021: Component MUST auto-scroll to bottom when new message arrives
- [x] AC-FEC-022: Component MUST show date separators between messages from different days
- [x] AC-FEC-023: Component MUST support infinite scroll (load more on scroll up)
- [x] AC-FEC-024: Component MUST emit `loadMore` event when scrolled to top
- [x] AC-FEC-025: Component MUST show loading spinner while fetching older messages
- [x] AC-FEC-026: Component MUST preserve scroll position when loading older messages
- [x] AC-FEC-027: Component MUST show "No messages yet" when empty

### ChatInput Component

- [x] AC-FEC-030: Component MUST have textarea for message input
- [x] AC-FEC-031: Textarea MUST auto-resize up to 5 lines
- [x] AC-FEC-032: Component MUST have send button (icon)
- [x] AC-FEC-033: Send button MUST be disabled when input is empty
- [x] AC-FEC-034: Enter key MUST send message (Shift+Enter for new line)
- [x] AC-FEC-035: Component MUST have file attachment button
- [x] AC-FEC-036: File button MUST open file picker (images, PDFs, docs)
- [x] AC-FEC-037: Component MUST show selected file preview before sending
- [x] AC-FEC-038: Component MUST emit `sendMessage` event with `{ text, files? }`
- [x] AC-FEC-039: Component MUST emit `typing` event when user types (debounced)
- [x] AC-FEC-040: Component MUST be disabled when `disabled: boolean` input is true

### ChatRoomListItem Component

- [x] AC-FEC-050: Component MUST accept `room: ChatRoom` input
- [x] AC-FEC-051: Component MUST display participant avatar and name
- [x] AC-FEC-052: Component MUST display context badge (Expertise, Booking, Job, Contract)
- [x] AC-FEC-053: Component MUST display context title
- [x] AC-FEC-054: Component MUST display last message preview (truncated to 100 chars)
- [x] AC-FEC-055: Component MUST display last message timestamp
- [x] AC-FEC-056: Component MUST display unread count badge (if > 0)
- [x] AC-FEC-057: Component MUST highlight (bold) if has unread messages
- [x] AC-FEC-058: Component MUST show assigned member badge if assigned
- [x] AC-FEC-059: Component MUST emit `click` event when clicked
- [x] AC-FEC-060: Component MUST have hover state

### ChatEventMessage Component

- [x] AC-FEC-070: Component MUST accept `event: ChatEvent` input
- [x] AC-FEC-071: Component MUST display event summary text centered
- [x] AC-FEC-072: Component MUST display event icon based on eventType
- [x] AC-FEC-073: Component MUST have muted styling (gray, smaller font)
- [x] AC-FEC-074: Component MUST display timestamp

### TypingIndicator Component

- [x] AC-FEC-080: Component MUST accept `users: TypingUser[]` input
- [x] AC-FEC-081: Component MUST display "John is typing..." for single user
- [x] AC-FEC-082: Component MUST display "John and Sarah are typing..." for two users
- [x] AC-FEC-083: Component MUST display "Multiple people are typing..." for 3+ users
- [x] AC-FEC-084: Component MUST have animated dots (CSS animation)
- [x] AC-FEC-085: Component MUST hide when `users` is empty

---



### Non-Functional Requirements

(To be defined)
## Component Specifications

### ChatMessageBubble

```typescript
// projects/app/src/app/shared/components/chat/chat-message-bubble/

@Component({
  selector: 'app-chat-message-bubble',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `...`,
  styles: `...`,
})
export class ChatMessageBubbleComponent {
  @Input({ required: true }) message!: ChatMessage;
  @Input() isOwn = false;
  @Input() showAvatar = true;

  @Output() deleteMessage = new EventEmitter<string>();
}
```

### ChatMessageList

```typescript
@Component({
  selector: 'app-chat-message-list',
  standalone: true,
})
export class ChatMessageListComponent {
  @Input({ required: true }) messages!: ChatMessage[];
  @Input() currentUserId!: string;
  @Input() isLoading = false;
  @Input() hasMore = false;

  @Output() loadMore = new EventEmitter<void>();
  @Output() deleteMessage = new EventEmitter<string>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  // Auto-scroll to bottom
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  onScroll(event: Event) {
    const target = event.target as HTMLElement;
    if (target.scrollTop === 0 && this.hasMore) {
      this.loadMore.emit();
    }
  }
}
```

### ChatInput

```typescript
@Component({
  selector: 'app-chat-input',
  standalone: true,
})
export class ChatInputComponent {
  @Input() disabled = false;
  @Input() placeholder = 'Type a message...';

  @Output() sendMessage = new EventEmitter<{ text: string; files?: File[] }>();
  @Output() typing = new EventEmitter<boolean>();

  messageText = signal('');
  selectedFiles = signal<File[]>([]);

  private typingTimeout?: ReturnType<typeof setTimeout>;

  onInput() {
    this.emitTyping(true);

    // Debounce typing stop
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.emitTyping(false);
    }, 3000);
  }

  onSend() {
    if (!this.messageText().trim() && !this.selectedFiles().length) return;

    this.sendMessage.emit({
      text: this.messageText(),
      files: this.selectedFiles().length ? this.selectedFiles() : undefined,
    });

    this.messageText.set('');
    this.selectedFiles.set([]);
    this.emitTyping(false);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }
}
```

### ChatRoomListItem

```typescript
@Component({
  selector: 'app-chat-room-list-item',
  standalone: true,
})
export class ChatRoomListItemComponent {
  @Input({ required: true }) room!: ChatRoom;
  @Input() isActive = false;

  readonly contextBadges: Record<ChatContextType, { label: string; color: string }> = {
    EXPERTISE: { label: 'Expertise', color: 'bg-blue-100 text-blue-800' },
    BOOKING: { label: 'Booking', color: 'bg-green-100 text-green-800' },
    JOB: { label: 'Job', color: 'bg-purple-100 text-purple-800' },
    CONTRACT: { label: 'Contract', color: 'bg-orange-100 text-orange-800' },
    GENERAL: { label: 'General', color: 'bg-gray-100 text-gray-800' },
  };
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `shared/components/chat/chat-message-bubble/chat-message-bubble.component.ts` | Message bubble |
| `shared/components/chat/chat-message-list/chat-message-list.component.ts` | Message list |
| `shared/components/chat/chat-input/chat-input.component.ts` | Input field |
| `shared/components/chat/chat-room-list-item/chat-room-list-item.component.ts` | Room item |
| `shared/components/chat/chat-event-message/chat-event-message.component.ts` | Event message |
| `shared/components/chat/typing-indicator/typing-indicator.component.ts` | Typing indicator |
| `shared/components/chat/index.ts` | Barrel export |

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
# @covers AC-FEC-001 through AC-FEC-085
ng test --include="**/shared/components/chat/**"
```

### Visual Testing

1. Storybook stories for each component
2. Test mobile and desktop breakpoints
3. Test RTL support (if needed)
