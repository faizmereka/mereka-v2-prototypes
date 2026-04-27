import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, DialogRef, DIALOG_DATA } from '@mereka/ui';
import { HubTeamService, HubRole } from '../../../../../../../core/services/hub-team.service';
import type { DisplayMember, TeamTab } from '../../team-members.component';

export interface RoleSwitchModalData {
  hubId: string;
  member: DisplayMember;
  newRole: HubRole;
  type: 'switch' | 'remove';
  currentRoleType: TeamTab;
}

@Component({
  selector: 'app-role-switch-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="role-switch-modal">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-neutral-200">
        <h2 class="text-xl font-bold text-neutral-900">{{ getHeaderText() }}</h2>
        <button
          type="button"
          (click)="close()"
          class="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <ui-icon name="close" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <p class="text-neutral-700" [innerHTML]="getBodyText()"></p>
      </div>

      <!-- Error -->
      @if (error()) {
        <div class="mx-6 mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {{ error() }}
        </div>
      }

      <!-- Footer -->
      <div class="flex justify-end gap-3 p-6 border-t border-neutral-200">
        <button
          type="button"
          (click)="close()"
          class="px-6 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          (click)="confirm()"
          [disabled]="loading()"
          class="px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          [ngClass]="data.type === 'remove'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-primary text-white hover:bg-primary-dark'"
        >
          {{ loading() ? 'Processing...' : getButtonText() }}
        </button>
      </div>
    </div>
  `,
})
export class RoleSwitchModalComponent {
  private readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<RoleSwitchModalData>(DIALOG_DATA);
  private readonly hubTeamService = inject(HubTeamService);

  loading = signal(false);
  error = signal('');

  close(): void {
    this.dialogRef.close(false);
  }

  getHeaderText(): string {
    if (this.data.type === 'remove') {
      return `Remove ${this.data.currentRoleType === 'team_member' ? 'Team Member' : 'Collaborator'}`;
    }
    const newRoleName = this.data.newRole.key === 'expert' ? 'Team Member' : this.data.newRole.name;
    return `Switch to ${newRoleName}`;
  }

  getBodyText(): string {
    const memberName = this.data.member.name;
    const currentRole = this.data.member.roleKey === 'expert' ? 'Team Member' : this.data.member.role;

    if (this.data.type === 'remove') {
      return `You are about to remove <strong>${memberName}</strong> from your Team. They will no longer have access to the Hub Dashboard.
              <br/><br/>
              Are you sure you want to remove this user from the Hub?`;
    }

    const newRoleName = this.data.newRole.key === 'expert' ? 'Team Member' : this.data.newRole.name;
    return `You are about to switch the role of <strong>${memberName}</strong> from '${currentRole}' to '${newRoleName}'.
            <br/><br/>
            This will change the access the user has in the Hub Dashboard. Are you sure you want to switch the role to ${newRoleName}?`;
  }

  getButtonText(): string {
    if (this.data.type === 'remove') {
      return 'Remove';
    }
    const newRoleName = this.data.newRole.key === 'expert' ? 'Team Member' : this.data.newRole.name;
    return `Switch to ${newRoleName}`;
  }

  async confirm(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      if (this.data.type === 'remove') {
        await this.hubTeamService.removeMember(this.data.hubId, this.data.member.id);
      } else {
        await this.hubTeamService.updateMemberRole(this.data.hubId, this.data.member.id, this.data.newRole.id);
      }
      this.dialogRef.close(true);
    } catch (err) {
      this.error.set(this.data.type === 'remove' ? 'Failed to remove member' : 'Failed to switch role');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }
}
