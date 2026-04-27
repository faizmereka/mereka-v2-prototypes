import { Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IconComponent,
  UiPermissionTableComponent,
  ALL_HUB_PERMISSION_CATEGORIES,
  COLLABORATOR_PERMISSION_CATEGORIES,
  PermissionCategory,
} from '@mereka/ui';
import type { DisplayMember, TeamTab } from '../../team-members.component';
import type { HubRole } from '../../../../../../../core/services/hub-team.service';

@Component({
  selector: 'app-member-details',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, UiPermissionTableComponent],
  template: `
    <div class="member-details p-6">
      @if (member) {
        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold text-neutral-900">{{ member.name }}</h2>
            <p class="text-sm text-neutral-500 mt-1">
              @if (member.isOwner) {
                Hub Owner
              } @else if (member.addedBy) {
                Added by: {{ member.addedBy }}
              }
              @if (member.joinedDate) {
                <span class="mx-1">|</span>
                {{ member.isInvitation ? 'Invited' : getRolesDisplay() + ' Since' }}: {{ formatDate(member.joinedDate) }}
              }
            </p>
            <p class="text-sm text-neutral-600 mt-2">
              {{ getRoleDescription() }}
            </p>
          </div>

          <!-- Role Dropdown -->
          @if (canManage && !member.isOwner) {
            <div class="relative">
              <button
                type="button"
                (click)="toggleDropdown()"
                class="flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                [disabled]="member.isOwner"
              >
                <span>{{ getRolesDisplay() }}</span>
                <ui-icon name="chevron-down" size="sm" />
              </button>

              @if (showDropdown()) {
                <div class="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-neutral-200 z-10">
                  @if (!member.isInvitation) {
                    @for (role of roles; track role.id) {
                      <button
                        type="button"
                        (click)="selectRole(role)"
                        class="w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-b-0"
                        [ngClass]="{ 'bg-primary/5': hasRole(role.id) }"
                      >
                        <div class="flex items-center justify-between">
                          <div>
                            <div class="font-medium">{{ role.name === 'Expert' ? 'Team Member' : role.name }}</div>
                            <div class="text-sm text-neutral-500">{{ role.description }}</div>
                          </div>
                          @if (hasRole(role.id)) {
                            <ui-icon name="check" size="sm" class="text-primary" />
                          }
                        </div>
                      </button>
                    }
                    <button
                      type="button"
                      (click)="onRemove()"
                      class="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Remove {{ activeTab === 'team_member' ? 'Team Member' : 'Collaborator' }}
                    </button>
                  } @else {
                    <button
                      type="button"
                      (click)="onCancelInvitation()"
                      class="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Cancel Invitation
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Access Section -->
        <div class="mt-8">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-neutral-900">
              @if (activeTab === 'team_member') {
                {{ hasRoleKey('admin') || member.isOwner ? 'Full' : 'Team Member' }} Access
              } @else {
                Collaborator Access
              }
            </h3>
            @if (canManage && !member.isOwner && !member.isInvitation) {
              @if (isEditing) {
                <div class="flex gap-2">
                  <button
                    type="button"
                    (click)="cancelEditClicked.emit()"
                    class="px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    (click)="onSavePermissions()"
                    [disabled]="isSaving"
                    class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {{ isSaving ? 'Saving...' : 'Save Access' }}
                  </button>
                </div>
              } @else {
                <button
                  type="button"
                  (click)="editPermissionsClicked.emit()"
                  class="text-primary hover:text-primary-dark transition-colors"
                >
                  Manage Access
                </button>
              }
            }
          </div>

          <!-- Permission Table - Shows ALL permissions -->
          <div class="max-h-[60vh] overflow-y-auto">
            <ui-permission-table
              [permissions]="currentPermissions()"
              [categories]="getPermissionCategories()"
              [isEditing]="isEditing"
              (permissionToggled)="togglePermission($event)"
            />
          </div>
        </div>
      }
    </div>

    <!-- Click outside to close dropdown -->
    @if (showDropdown()) {
      <div class="fixed inset-0 z-0" (click)="showDropdown.set(false)"></div>
    }
  `,
})
export class MemberDetailsComponent implements OnChanges {
  @Input() member!: DisplayMember;
  @Input() roles: HubRole[] = [];
  @Input() activeTab: TeamTab = 'team_member';
  @Input() canManage = false;
  @Input() isEditing = false;
  @Input() isSaving = false;

  @Output() roleChange = new EventEmitter<string>();
  @Output() removeClicked = new EventEmitter<void>();
  @Output() cancelInvitationClicked = new EventEmitter<void>();
  @Output() editPermissionsClicked = new EventEmitter<void>();
  @Output() cancelEditClicked = new EventEmitter<void>();
  @Output() savePermissionsClicked = new EventEmitter<string[]>();

  showDropdown = signal(false);
  editedPermissions = signal<string[]>([]);

  // Current permissions to display - updated via ngOnChanges, not computed
  // (computed signals don't track @Input changes)
  currentPermissions = signal<string[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    // Update permissions when member changes or editing mode changes
    if (changes['member'] || changes['isEditing']) {
      // Get the base permissions from member (custom or role-based)
      const memberPermissions = this.getMemberPermissions();

      if (this.isEditing) {
        // In edit mode, initialize editedPermissions with member's current permissions
        this.editedPermissions.set([...memberPermissions]);
        this.currentPermissions.set(this.editedPermissions());
      } else {
        // Not editing - show member's actual permissions
        this.currentPermissions.set([...memberPermissions]);
      }
    }
  }

  /**
   * Get the member's effective permissions (custom if set, otherwise role-based)
   */
  private getMemberPermissions(): string[] {
    if (this.member?.permissions !== undefined && this.member?.permissions !== null) {
      return this.member.permissions;
    }
    return this.member?.rolePermissions || [];
  }

  /**
   * Get permission categories based on active tab
   * Shows ALL permissions so users can toggle any of them
   */
  getPermissionCategories(): PermissionCategory[] {
    if (this.activeTab === 'collaborator') {
      return COLLABORATOR_PERMISSION_CATEGORIES;
    }

    // Show ALL permissions for team members (admin, expert, owner)
    // This allows toggling any permission on/off
    return ALL_HUB_PERMISSION_CATEGORIES;
  }

  toggleDropdown(): void {
    this.showDropdown.update(v => !v);
  }

  selectRole(role: HubRole): void {
    this.showDropdown.set(false);
    if (role.id !== this.member.roleId) {
      this.roleChange.emit(role.id);
    }
  }

  onRemove(): void {
    this.showDropdown.set(false);
    this.removeClicked.emit();
  }

  onCancelInvitation(): void {
    this.showDropdown.set(false);
    this.cancelInvitationClicked.emit();
  }

  hasPermission(permission: string): boolean {
    return this.currentPermissions().includes(permission);
  }

  togglePermission(permission: string): void {
    if (!this.isEditing) return;

    this.editedPermissions.update(perms => {
      // Handle case-insensitive matching
      const lowerPerm = permission.toLowerCase();
      const existingIndex = perms.findIndex(p => p.toLowerCase() === lowerPerm);

      if (existingIndex >= 0) {
        return perms.filter((_, i) => i !== existingIndex);
      } else {
        return [...perms, permission];
      }
    });

    // Update currentPermissions to reflect the change
    this.currentPermissions.set([...this.editedPermissions()]);
  }

  onSavePermissions(): void {
    this.savePermissionsClicked.emit(this.editedPermissions());
  }

  getRoleLabel(roleKey: string): string {
    if (roleKey === 'expert') return 'Team Member';
    return roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
  }

  /**
   * Get display label for all member roles
   */
  getRolesDisplay(): string {
    const roleKeys = this.member?.roleKeys || [this.member?.roleKey];
    if (!roleKeys || roleKeys.length === 0) return 'Member';

    const labels = roleKeys.map(key => this.getRoleLabel(key));
    return labels.join(', ');
  }

  /**
   * Get description based on member's roles
   */
  getRoleDescription(): string {
    if (!this.member) return '';

    const roleKeys = this.member.roleKeys || [this.member.roleKey];

    if (roleKeys.includes('admin')) {
      return 'Admin can Manage Services, Users, Billings & other Hub settings.';
    }
    if (roleKeys.includes('expert')) {
      return 'Team Member can manage Services';
    }
    if (roleKeys.includes('collaborator')) {
      return 'Collaborator can view and edit assigned experiences.';
    }
    return '';
  }

  /**
   * Check if member has a specific role by ID
   */
  hasRole(roleId: string): boolean {
    const roleIds = this.member?.roleIds || [this.member?.roleId];
    return roleIds.includes(roleId);
  }

  /**
   * Check if member has a specific role by key
   */
  hasRoleKey(roleKey: string): boolean {
    const roleKeys = this.member?.roleKeys || [this.member?.roleKey];
    return roleKeys.includes(roleKey);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
    });
  }
}
