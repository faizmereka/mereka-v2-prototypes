import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubChatService } from '../../../../services/hub-chat.service';

/**
 * Assign Member Modal Component
 * @covers AC-FEH-040 through AC-FEH-044
 */
@Component({
  selector: 'app-assign-member-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assign-member-modal.component.html',
})
export class AssignMemberModalComponent implements OnInit {
  private readonly chatService = inject(HubChatService);

  // Inputs
  readonly roomId = input.required<string>();
  readonly currentAssigneeId = input<string | null>(null);

  // Outputs
  readonly close = output<void>();
  readonly assigned = output<{ userId: string; name: string }>();

  // State
  readonly members = signal<Array<{ userId: string; name: string; avatar?: string; email: string }>>([]);
  readonly loading = signal(false);
  readonly assigning = signal<string | null>(null);

  ngOnInit(): void {
    this.loadMembers();
  }

  async loadMembers(): Promise<void> {
    this.loading.set(true);
    const members = await this.chatService.getHubTeamMembers();
    this.members.set(members);
    this.loading.set(false);
  }

  async assignMember(member: { userId: string; name: string }): Promise<void> {
    this.assigning.set(member.userId);
    const success = await this.chatService.assignToMember(this.roomId(), member.userId);
    this.assigning.set(null);

    if (success) {
      this.assigned.emit(member);
      this.close.emit();
    }
  }

  async unassignCurrent(): Promise<void> {
    this.assigning.set('unassign');
    const success = await this.chatService.unassign(this.roomId());
    this.assigning.set(null);

    if (success) {
      this.close.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}
