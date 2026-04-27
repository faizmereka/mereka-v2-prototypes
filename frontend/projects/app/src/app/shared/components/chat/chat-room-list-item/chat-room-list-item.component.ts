import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ChatRoomListItem, ChatContextType } from '@mereka/models';

/**
 * ChatRoomListItem - Room preview in sidebar/list
 *
 * @covers AC-FEC-050 through AC-FEC-060
 */
@Component({
  selector: 'app-chat-room-list-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-room-list-item.component.html',
})
export class ChatRoomListItemComponent {
  // @covers AC-FEC-050
  readonly roomItem = input.required<ChatRoomListItem>();
  readonly isActive = input(false);

  // @covers AC-FEC-059
  readonly roomClick = output<string>();

  // @covers AC-FEC-052
  readonly contextBadges: Record<ChatContextType, { label: string; color: string }> = {
    HUB: { label: 'Hub', color: 'bg-neutral-100 text-neutral-800' },
    EXPERTISE: { label: 'Expertise', color: 'bg-blue-100 text-blue-800' },
    EXPERIENCE: { label: 'Experience', color: 'bg-indigo-100 text-indigo-800' },
    BOOKING: { label: 'Booking', color: 'bg-green-100 text-green-800' },
    JOB: { label: 'Job', color: 'bg-purple-100 text-purple-800' },
    PROPOSAL: { label: 'Proposal', color: 'bg-amber-100 text-amber-800' },
    CONTRACT: { label: 'Contract', color: 'bg-orange-100 text-orange-800' },
    GENERAL: { label: 'General', color: 'bg-gray-100 text-gray-800' },
  };

  // @covers AC-FEC-051
  readonly displayName = computed(() => {
    const room = this.roomItem().room;
    // For learner chats, show learner name
    if (room.learnerSnapshot) {
      return room.learnerSnapshot.name;
    }
    // For hub-to-hub chats, show other hub name
    if (room.otherHubSnapshot) {
      return room.otherHubSnapshot.name;
    }
    return 'Unknown';
  });

  readonly avatarUrl = computed(() => {
    const room = this.roomItem().room;
    return room.learnerSnapshot?.avatar ?? room.otherHubSnapshot?.logo;
  });

  // @covers AC-FEC-057
  readonly hasUnread = computed(() => {
    return this.roomItem().userState.unreadCount > 0;
  });

  onClick(): void {
    this.roomClick.emit(this.roomItem().room._id);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  // @covers AC-FEC-054
  truncateMessage(text: string | undefined, maxLength: number = 100): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // @covers AC-FEC-055
  formatTimestamp(dateString: string | undefined): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
