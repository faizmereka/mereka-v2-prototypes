import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ChatEvent, ChatEventType } from '@mereka/models';

/**
 * ChatEventMessage - System event display
 *
 * @covers AC-FEC-070 through AC-FEC-074
 */
@Component({
  selector: 'app-chat-event-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-event-message.component.html',
  styles: [`:host { display: block; width: 100%; }`],
})
export class ChatEventMessageComponent {
  // @covers AC-FEC-070
  readonly event = input.required<ChatEvent>();
  readonly timestamp = input.required<string>();

  // @covers AC-FEC-072
  readonly eventIcons: Record<ChatEventType, { icon: string; color: string }> = {
    BOOKING_REQUESTED: { icon: 'calendar', color: 'text-blue-600' },
    BOOKING_CONFIRMED: { icon: 'check-circle', color: 'text-green-600' },
    BOOKING_CANCELLED: { icon: 'x-circle', color: 'text-red-600' },
    BOOKING_COMPLETED: { icon: 'check-badge', color: 'text-green-600' },
    PROPOSAL_SUBMITTED: { icon: 'document-text', color: 'text-purple-600' },
    PROPOSAL_ACCEPTED: { icon: 'check-circle', color: 'text-green-600' },
    PROPOSAL_REJECTED: { icon: 'x-circle', color: 'text-red-600' },
    CONTRACT_STARTED: { icon: 'briefcase', color: 'text-orange-600' },
    CONTRACT_COMPLETED: { icon: 'check-badge', color: 'text-green-600' },
    MILESTONE_CREATED: { icon: 'flag', color: 'text-blue-600' },
    MILESTONE_SUBMITTED: { icon: 'paper-airplane', color: 'text-blue-600' },
    MILESTONE_APPROVED: { icon: 'check-circle', color: 'text-green-600' },
    PARTICIPANT_JOINED: { icon: 'user-plus', color: 'text-blue-600' },
    PARTICIPANT_LEFT: { icon: 'user-minus', color: 'text-neutral-600' },
    PARTICIPANT_ASSIGNED: { icon: 'user-check', color: 'text-blue-600' },
  };

  readonly iconConfig = computed(() => {
    return this.eventIcons[this.event().eventType] ?? { icon: 'info', color: 'text-neutral-600' };
  });

  // @covers AC-FEC-074
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}
