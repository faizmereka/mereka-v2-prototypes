import { Component, input, output, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import type { ChatMessage } from '@mereka/models';

/**
 * ChatMessageBubble - Single message display component
 *
 * @covers AC-FEC-001 through AC-FEC-010
 */
@Component({
  selector: 'app-chat-message-bubble',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './chat-message-bubble.component.html',
  styles: [`:host { display: block; width: 100%; }`],
})
export class ChatMessageBubbleComponent {
  // @covers AC-FEC-001
  readonly message = input.required<ChatMessage>();
  readonly isOwn = input(false);
  readonly showAvatar = input(true);

  // @covers AC-FEC-008
  readonly deleteMessage = output<string>();

  readonly showDeleteButton = computed(() => this.isOwn() && !this.message().isDeleted);

  // @covers AC-FEC-004
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  onDelete(): void {
    this.deleteMessage.emit(this.message()._id);
  }

  // @covers AC-FEC-009
  formatMessageText(text: string): string {
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-dark">$1</a>');
  }

  // Check if file is an image
  isImage(mimeType: string): boolean {
    return mimeType?.startsWith('image/') ?? false;
  }

  // Get file size in human-readable format
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Get file icon based on mime type
  getFileIcon(mimeType: string): string {
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType?.includes('document') || mimeType?.includes('word')) return 'doc';
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return 'sheet';
    return 'file';
  }
}
