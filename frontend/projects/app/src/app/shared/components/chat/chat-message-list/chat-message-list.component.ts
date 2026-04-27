import {
  Component,
  input,
  output,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  effect,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessageBubbleComponent } from '../chat-message-bubble/chat-message-bubble.component';
import { ChatEventMessageComponent } from '../chat-event-message/chat-event-message.component';
import type { ChatMessage } from '@mereka/models';

/**
 * ChatMessageList - Scrollable message list with date separators
 *
 * @covers AC-FEC-020 through AC-FEC-027
 */
@Component({
  selector: 'app-chat-message-list',
  standalone: true,
  imports: [CommonModule, ChatMessageBubbleComponent, ChatEventMessageComponent],
  templateUrl: './chat-message-list.component.html',
  styles: [`:host { display: flex; flex: 1; min-height: 0; overflow: hidden; }`],
})
export class ChatMessageListComponent implements AfterViewChecked {
  // @covers AC-FEC-020
  readonly messages = input<ChatMessage[]>([]);
  readonly currentUserId = input<string>('');
  readonly isLoading = input(false);
  readonly hasMore = input(false);

  // @covers AC-FEC-024
  readonly loadMore = output<void>();
  readonly deleteMessage = output<string>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  private shouldScrollToBottom = signal(true);
  private shouldPreserveScroll = signal(false);
  private previousMessagesLength = 0;
  private previousScrollHeight = 0;
  private isLoadingOlder = false;

  constructor() {
    // Use effect() for reactive message changes - more reliable with signals
    effect(() => {
      const currentMessages = this.messages();
      const currentLength = currentMessages.length;
      const prevLength = this.previousMessagesLength;

      if (currentLength > prevLength && prevLength > 0) {
        // Check if new messages were added at the end (real-time) or beginning (load more)
        const newMessagesAtEnd = currentLength - prevLength;

        if (!this.isLoadingOlder) {
          // New real-time message - check if we should scroll
          const newMessages = currentMessages.slice(-newMessagesAtEnd);
          const isOwnMessage = newMessages.some((m) => m.sender.userId === this.currentUserId());

          if (isOwnMessage || this.isNearBottom()) {
            this.shouldScrollToBottom.set(true);
          }
        } else {
          // Loading older messages - preserve scroll position
          this.shouldPreserveScroll.set(true);
          this.isLoadingOlder = false;
        }
      } else if (currentLength > 0 && prevLength === 0) {
        // Initial load - scroll to bottom
        this.shouldScrollToBottom.set(true);
      }

      this.previousMessagesLength = currentLength;
    });
  }

  // @covers AC-FEC-021
  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom()) {
      this.scrollToBottom();
      this.shouldScrollToBottom.set(false);
    }

    // @covers AC-FEC-026 - Preserve scroll position when loading older messages
    if (this.shouldPreserveScroll()) {
      this.preserveScrollPosition();
      this.shouldPreserveScroll.set(false);
    }
  }

  // @covers AC-FEC-023, AC-FEC-024
  onScroll(event: Event): void {
    const target = event.target as HTMLDivElement;

    // Load more when scrolled to top
    if (target.scrollTop < 100 && this.hasMore() && !this.isLoading()) {
      this.previousScrollHeight = target.scrollHeight;
      this.isLoadingOlder = true;
      this.loadMore.emit();
    }
  }

  // @covers AC-FEC-022
  isNewDay(index: number): boolean {
    const msgs = this.messages();
    if (index === 0) return true;

    const current = new Date(msgs[index].createdAt);
    const prev = new Date(msgs[index - 1].createdAt);

    return current.toDateString() !== prev.toDateString();
  }

  formatDateHeader(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  isOwnMessage(message: ChatMessage): boolean {
    return message.sender.userId === this.currentUserId();
  }

  isEventMessage(message: ChatMessage): boolean {
    return message.type === 'EVENT';
  }

  onDeleteMessage(messageId: string): void {
    this.deleteMessage.emit(messageId);
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      const element = this.scrollContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private isNearBottom(): boolean {
    if (!this.scrollContainer) return true;

    const element = this.scrollContainer.nativeElement;
    const threshold = 100;
    return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
  }

  // @covers AC-FEC-026
  private preserveScrollPosition(): void {
    if (this.scrollContainer) {
      const element = this.scrollContainer.nativeElement;
      const newScrollHeight = element.scrollHeight;
      const scrollDiff = newScrollHeight - this.previousScrollHeight;
      element.scrollTop = element.scrollTop + scrollDiff;
    }
  }
}
