import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent, DialogService } from '@mereka/ui';
import { AuthStateService } from '../../../../../core/services/auth-state.service';
import {
  HubTeamService,
  HubTeamMember,
  HubInvitation,
  HubRole,
  InvitationLink,
  TeamStats,
} from '../../../../../core/services/hub-team.service';

// Sub-components
import { MemberListComponent } from './components/member-list/member-list.component';
import { MemberDetailsComponent } from './components/member-details/member-details.component';
import { InviteModalComponent, InviteModalData } from './components/invite-modal/invite-modal.component';
import { RoleSwitchModalComponent, RoleSwitchModalData } from './components/role-switch-modal/role-switch-modal.component';

export type TeamTab = 'team_member' | 'collaborator' | 'invitation_links';

export interface DisplayMember {
  id: string;
  odooId?: number | null;
  odooUserId?: number | null;
  userId?: string;
  name: string;
  email: string;
  avatar: string | null;
  // Primary role (first assigned role) - for backwards compatibility
  role: string;
  roleKey: string;
  roleId: string;
  // All assigned roles (for multi-role support)
  roles: string[];
  roleKeys: string[];
  roleIds: string[];
  status: 'Active' | 'Invited';
  joinedDate: string;
  addedBy?: string;
  addedByName?: string;
  isInvitation: boolean;
  isOwner: boolean;
  permissions?: string[];
  rolePermissions?: string[];
}

// Pagination config
const PAGE_SIZE = 20;

@Component({
  selector: 'app-hub-settings-team-members',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    MemberListComponent,
    MemberDetailsComponent,
  ],
  templateUrl: './team-members.component.html',
})
export class HubSettingsTeamMembersComponent implements OnInit {
  private readonly hubTeamService = inject(HubTeamService);
  private readonly authState = inject(AuthStateService);
  private readonly dialogService = inject(DialogService);

  // Loading states
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly saving = signal(false);

  // UI states
  readonly activeTab = signal<TeamTab>('team_member');
  readonly searchText = signal('');
  readonly editingPermissions = signal(false);

  // Data from API - raw data (separate for team members and collaborators)
  readonly teamMembers = signal<HubTeamMember[]>([]);
  readonly collaborators = signal<HubTeamMember[]>([]);
  readonly invitations = signal<HubInvitation[]>([]);
  readonly roles = signal<HubRole[]>([]);
  readonly invitationLinks = signal<InvitationLink[]>([]);
  readonly stats = signal<TeamStats>({
    teamMembers: 0,
    collaborators: 0,
    pendingInvitations: 0,
    activeInvitationLinks: 0,
  });

  // Pagination state (separate for team members and collaborators)
  readonly pagination = signal({
    teamMembers: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, hasMore: true },
    collaborators: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, hasMore: true },
    invitations: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, hasMore: true },
    invitationLinks: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, hasMore: true },
  });

  // Search debounce
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Copied link state
  readonly copiedLinkId = signal<string | null>(null);

  // Selected member
  readonly selectedMember = signal<DisplayMember | null>(null);

  // Computed hub ID and current user
  readonly hubId = computed(() => this.authState.selectedHub()?.id);
  readonly currentUserId = computed(() => this.authState.user()?.id);

  // Available roles for dropdown (all roles except owner)
  readonly teamMemberRoles = computed(() =>
    this.roles().filter(r => r.key !== 'owner')
  );

  // Counts from stats API (server-side totals)
  readonly teamMemberCount = computed(() => this.stats().teamMembers);
  readonly collaboratorCount = computed(() => this.stats().collaborators);
  readonly invitationLinksCount = computed(() => this.stats().activeInvitationLinks);

  // Has more data to load (based on active tab)
  readonly hasMoreMembers = computed(() => {
    const tab = this.activeTab();
    if (tab === 'team_member') {
      return this.pagination().teamMembers.hasMore;
    } else if (tab === 'collaborator') {
      return this.pagination().collaborators.hasMore;
    }
    return false;
  });
  readonly hasMoreInvitations = computed(() => this.pagination().invitations.hasMore);

  // Helper to convert HubTeamMember to DisplayMember
  private memberToDisplayMember(member: HubTeamMember): DisplayMember {
    const isOwner = member.roleKeys.includes('owner');
    return {
      id: member.id,
      odooId: member.odooId,
      odooUserId: member.odooUserId,
      userId: member.userId,
      name: member.name,
      email: member.email,
      avatar: member.avatar ?? null,
      // Primary role (first assigned)
      role: member.roleNames[0] || 'Member',
      roleKey: member.roleKeys[0] || 'member',
      roleId: member.roleIds?.[0] || '',
      // All assigned roles
      roles: member.roleNames,
      roleKeys: member.roleKeys,
      roleIds: member.roleIds || [],
      joinedDate: member.joinedAt || '',
      addedBy: member.invitedBy,
      status: 'Active',
      isInvitation: false,
      isOwner,
      // Copy arrays to avoid shared references between members
      permissions: member.permissions ? [...member.permissions] : undefined,
      rolePermissions: member.rolePermissions ? [...member.rolePermissions] : [],
    };
  }

  // Members for display based on active tab
  readonly displayMembers = computed<DisplayMember[]>(() => {
    const tab = this.activeTab();
    const allMembers: DisplayMember[] = [];

    // Get members based on tab
    const members = tab === 'collaborator' ? this.collaborators() : this.teamMembers();
    for (const member of members) {
      allMembers.push(this.memberToDisplayMember(member));
    }

    // Add invitations only for team_member tab
    if (tab === 'team_member') {
      for (const invitation of this.invitations()) {
        allMembers.push({
          id: invitation.id,
          name: invitation.email,
          email: invitation.email,
          avatar: null,
          // Primary role (first assigned)
          role: invitation.roleNames[0] || 'Member',
          roleKey: invitation.roleKeys?.[0] || 'member',
          roleId: invitation.roleIds?.[0] || '',
          // All assigned roles
          roles: invitation.roleNames,
          roleKeys: invitation.roleKeys || [],
          roleIds: invitation.roleIds,
          joinedDate: invitation.invitedAt || '',
          addedBy: invitation.invitedBy?.name,
          status: 'Invited',
          isInvitation: true,
          isOwner: false,
        });
      }
    }

    // Sort: owner first, then by joined date
    return allMembers.sort((a, b) => {
      if (a.isOwner) return -1;
      if (b.isOwner) return 1;
      return new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime();
    });
  });

  // Filtered members based on search (server-side filtering by role is already done)
  readonly filteredMembers = computed(() => {
    let result = this.displayMembers();

    // Filter by search (client-side for already loaded data)
    const search = this.searchText().toLowerCase();
    if (search) {
      result = result.filter(
        m => m.name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search)
      );
    }

    return result;
  });

  // Permission check for current user
  readonly canManageTeam = computed(() => {
    const currentUserId = this.currentUserId();

    // Check if current user has team management permissions (check both lists)
    const allMembers = [...this.teamMembers(), ...this.collaborators()];
    const currentMember = allMembers.find(m => m.userId === currentUserId);
    if (!currentMember) return false;

    // Owner has full access
    if (currentMember.roleKeys.includes('owner')) return true;

    const permissions = currentMember.permissions || currentMember.rolePermissions || [];
    return permissions.some(p =>
      p.includes('team.') || p === 'team.invite' || p === 'team.remove' || p === 'team.editRoles'
    );
  });

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  /**
   * Load initial data - roles, stats, and first page of members
   */
  async loadInitialData(): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    this.loading.set(true);
    try {
      // Load roles and stats in parallel (small datasets)
      const [rolesResult, statsResult] = await Promise.all([
        this.hubTeamService.listRoles(hubId),
        this.hubTeamService.getTeamStats(hubId),
      ]);
      this.roles.set(rolesResult);
      this.stats.set(statsResult);

      // Load first page of team members and invitations (collaborators loaded lazily)
      await Promise.all([
        this.loadTeamMembers(1, true),
        this.loadInvitations(1, true),
      ]);

      // Select first member if none selected
      if (!this.selectedMember() && this.filteredMembers().length > 0) {
        this.selectMember(this.filteredMembers()[0]);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Load team members (non-collaborators) with pagination
   */
  async loadTeamMembers(page: number, reset = false): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    if (reset) {
      this.teamMembers.set([]);
    }

    try {
      // Fetch active members, excluding collaborators (server-side filter would be ideal)
      // For now, we fetch all active and filter client-side, or use roleKey filter if backend supports
      const result = await this.hubTeamService.listMembers(hubId, {
        status: 'active',
        search: this.searchText() || undefined,
        page,
        limit: PAGE_SIZE,
      });

      // Filter out collaborators client-side (backend doesn't support "not equal" filter)
      const nonCollaborators = result.members.filter(m => !m.roleKeys.includes('collaborator'));

      if (reset) {
        this.teamMembers.set(nonCollaborators);
      } else {
        this.teamMembers.update(current => [...current, ...nonCollaborators]);
      }

      // Update pagination
      this.pagination.update(p => ({
        ...p,
        teamMembers: {
          ...result.pagination,
          hasMore: result.pagination.page < result.pagination.totalPages,
        },
      }));
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }

  /**
   * Load collaborators with pagination
   */
  async loadCollaborators(page: number, reset = false): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    if (reset) {
      this.collaborators.set([]);
    }

    try {
      const result = await this.hubTeamService.listMembers(hubId, {
        status: 'active',
        roleKey: 'collaborator', // Server-side filter for collaborators
        search: this.searchText() || undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (reset) {
        this.collaborators.set(result.members);
      } else {
        this.collaborators.update(current => [...current, ...result.members]);
      }

      // Update pagination
      this.pagination.update(p => ({
        ...p,
        collaborators: {
          ...result.pagination,
          hasMore: result.pagination.page < result.pagination.totalPages,
        },
      }));
    } catch (error) {
      console.error('Error loading collaborators:', error);
    }
  }

  /**
   * Load invitations with pagination
   */
  async loadInvitations(page: number, reset = false): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    if (reset) {
      this.invitations.set([]);
    }

    try {
      const result = await this.hubTeamService.listPendingInvitations(hubId, {
        page,
        limit: PAGE_SIZE,
      });

      if (reset) {
        this.invitations.set(result.invitations);
      } else {
        this.invitations.update(current => [...current, ...result.invitations]);
      }

      // Update pagination
      this.pagination.update(p => ({
        ...p,
        invitations: {
          ...result.pagination,
          hasMore: result.pagination.page < result.pagination.totalPages,
        },
      }));
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  }

  /**
   * Load more members (infinite scroll) - based on active tab
   */
  async loadMoreMembers(): Promise<void> {
    if (this.loadingMore() || !this.hasMoreMembers()) return;

    this.loadingMore.set(true);
    try {
      const tab = this.activeTab();
      if (tab === 'team_member') {
        const nextPage = this.pagination().teamMembers.page + 1;
        await this.loadTeamMembers(nextPage, false);
      } else if (tab === 'collaborator') {
        const nextPage = this.pagination().collaborators.page + 1;
        await this.loadCollaborators(nextPage, false);
      }
    } finally {
      this.loadingMore.set(false);
    }
  }

  /**
   * Load more invitations (infinite scroll)
   */
  async loadMoreInvitations(): Promise<void> {
    if (this.loadingMore() || !this.hasMoreInvitations()) return;

    this.loadingMore.set(true);
    try {
      const nextPage = this.pagination().invitations.page + 1;
      await this.loadInvitations(nextPage, false);
    } finally {
      this.loadingMore.set(false);
    }
  }

  /**
   * Handle scroll event from member list
   */
  async onListScroll(): Promise<void> {
    // Load more members when scrolling
    await this.loadMoreMembers();
    // Also load more invitations if needed
    await this.loadMoreInvitations();
  }

  /**
   * Reload all data (after mutations)
   */
  async reloadData(): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    this.loading.set(true);
    try {
      // Reload stats
      const statsResult = await this.hubTeamService.getTeamStats(hubId);
      this.stats.set(statsResult);

      // Reload data based on active tab
      const tab = this.activeTab();
      if (tab === 'team_member') {
        await Promise.all([
          this.loadTeamMembers(1, true),
          this.loadInvitations(1, true),
        ]);
      } else if (tab === 'collaborator') {
        await this.loadCollaborators(1, true);
      } else if (tab === 'invitation_links') {
        await this.loadInvitationLinks();
      }

      // Reselect member if still exists
      const currentMember = this.selectedMember();
      if (currentMember) {
        const updatedMember = this.filteredMembers().find(m => m.id === currentMember.id);
        if (updatedMember) {
          this.selectMember(updatedMember);
        } else if (this.filteredMembers().length > 0) {
          this.selectMember(this.filteredMembers()[0]);
        } else {
          this.selectedMember.set(null);
        }
      }
    } catch (error) {
      console.error('Error reloading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // Tab switching
  async setActiveTab(tab: TeamTab): Promise<void> {
    this.activeTab.set(tab);
    this.editingPermissions.set(false);

    // Load data lazily when tab is clicked
    if (tab === 'collaborator' && this.collaborators().length === 0) {
      this.loading.set(true);
      await this.loadCollaborators(1, true);
      this.loading.set(false);
    } else if (tab === 'invitation_links' && this.invitationLinks().length === 0) {
      await this.loadInvitationLinks();
    }

    // Select first member in new tab
    const members = this.filteredMembers();
    if (members.length > 0) {
      this.selectMember(members[0]);
    } else {
      this.selectedMember.set(null);
    }
  }

  /**
   * Load invitation links (lazy load)
   */
  async loadInvitationLinks(): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    try {
      const result = await this.hubTeamService.listInvitationLinks(hubId, { limit: 100 });
      this.invitationLinks.set(result.links);
    } catch (error) {
      console.error('Error loading invitation links:', error);
    }
  }

  // Search with debounce
  onSearch(text: string): void {
    this.searchText.set(text);

    // Debounce search - reload from server
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(async () => {
      // Reset and reload members with search filter based on active tab
      const tab = this.activeTab();
      if (tab === 'team_member') {
        await this.loadTeamMembers(1, true);
      } else if (tab === 'collaborator') {
        await this.loadCollaborators(1, true);
      }
    }, 300);
  }

  // Member selection
  selectMember(member: DisplayMember): void {
    this.editingPermissions.set(false);
    this.selectedMember.set(member);
  }

  // Open invite dialog
  openInviteModal(): void {
    const hubId = this.hubId();
    if (!hubId) return;

    const dialogRef = this.dialogService.open<InviteModalComponent, InviteModalData, boolean>(
      InviteModalComponent,
      {
        data: {
          hubId,
          roles: this.teamMemberRoles(),
          existingEmails: this.displayMembers().map(m => m.email),
        },
        width: 'lg',
      }
    );

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reloadData();
      }
    });
  }

  // Open role switch dialog
  async openRoleSwitchModal(member: DisplayMember, newRole: HubRole, type: 'switch' | 'remove'): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    const dialogRef = this.dialogService.open<RoleSwitchModalComponent, RoleSwitchModalData, boolean>(
      RoleSwitchModalComponent,
      {
        data: {
          hubId,
          member,
          newRole,
          type,
          currentRoleType: this.activeTab(),
        },
        width: 'md',
      }
    );

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reloadData();
        // Select next member if removed
        if (type === 'remove') {
          const members = this.filteredMembers();
          if (members.length > 0) {
            this.selectMember(members[0]);
          } else {
            this.selectedMember.set(null);
          }
        }
      }
    });
  }

  // Permission editing
  startEditingPermissions(): void {
    this.editingPermissions.set(true);
  }

  cancelEditingPermissions(): void {
    this.editingPermissions.set(false);
    // Reload to reset any changes
    this.reloadData();
  }

  async savePermissions(permissions: string[]): Promise<void> {
    const hubId = this.hubId();
    const member = this.selectedMember();
    if (!hubId || !member || member.isInvitation) return;

    console.log('[PERM] savePermissions called:', {
      hubId,
      memberId: member.id,
      memberName: member.name,
      permissionsCount: permissions.length,
      permissions,
    });

    this.saving.set(true);
    try {
      const result = await this.hubTeamService.updateMemberPermissions(hubId, member.id, permissions);
      console.log('[PERM] API response:', result);
      this.editingPermissions.set(false);
      await this.reloadData();
      console.log('[PERM] Data reloaded after save');
    } catch (error) {
      console.error('[PERM] Error saving permissions:', error);
      throw error; // Re-throw to allow UI to handle
    } finally {
      this.saving.set(false);
    }
  }

  // Cancel invitation
  async cancelInvitation(member: DisplayMember): Promise<void> {
    const hubId = this.hubId();
    if (!hubId || !member.isInvitation) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Cancel Invitation',
      message: `Are you sure you want to cancel the invitation for ${member.email}?`,
      type: 'warning',
      confirmText: 'Cancel Invitation',
      cancelText: 'Keep',
    });

    if (!confirmed) return;

    try {
      await this.hubTeamService.cancelInvitation(hubId, member.id);
      await this.reloadData();

      // Select next member
      const members = this.filteredMembers();
      if (members.length > 0) {
        this.selectMember(members[0]);
      } else {
        this.selectedMember.set(null);
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
    }
  }

  // Remove member
  async removeMember(member: DisplayMember): Promise<void> {
    const hubId = this.hubId();
    if (!hubId || member.isInvitation || member.isOwner) return;

    // Open role switch modal with type 'remove'
    const dummyRole = this.roles()[0]; // Just need a role for the modal
    await this.openRoleSwitchModal(member, dummyRole, 'remove');
  }

  // Change role
  async changeRole(member: DisplayMember, newRoleId: string): Promise<void> {
    const hubId = this.hubId();
    if (!hubId || member.isInvitation || member.isOwner) return;

    const newRole = this.roles().find(r => r.id === newRoleId);
    if (!newRole || newRole.id === member.roleId) return;

    // Open confirmation modal
    await this.openRoleSwitchModal(member, newRole, 'switch');
  }

  // Invitation link methods
  copyInvitationLink(link: InvitationLink): void {
    navigator.clipboard.writeText(link.link);
    this.copiedLinkId.set(link.id);
    setTimeout(() => this.copiedLinkId.set(null), 2000);
  }

  async disableInvitationLink(link: InvitationLink): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Disable Invitation Link',
      message: `Are you sure you want to disable this invitation link for "${link.roleName}"? This action cannot be undone.`,
      type: 'warning',
      confirmText: 'Disable Link',
      cancelText: 'Keep',
    });

    if (!confirmed) return;

    try {
      await this.hubTeamService.disableInvitationLink(hubId, link.id);
      await this.loadInvitationLinks();
    } catch (error) {
      console.error('Error disabling invitation link:', error);
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  isLinkExpired(link: InvitationLink): boolean {
    if (!link.expiresAt) return false;
    return new Date(link.expiresAt) < new Date();
  }
}
