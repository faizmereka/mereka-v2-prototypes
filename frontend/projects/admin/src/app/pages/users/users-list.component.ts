import { Component, signal, computed, OnInit, inject, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { CardComponent, ToastService } from '../../shared/ui';
import {
  PlatformUsersService,
  type PlatformUser,
  type PlatformUserStats,
  type UserStatus,
  type PlatformUserType,
} from './platform-users.service';

@Component({
  selector: 'app-users-list',
  imports: [RouterLink, FormsModule, DecimalPipe, DatePipe, CardComponent],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  private readonly platformUsersService = inject(PlatformUsersService);
  private readonly toast = inject(ToastService);

  searchQuery = '';
  userTypeFilter = signal<PlatformUserType>('all');
  currentPage = signal(1);
  pageSize = 20;
  showActions = signal(false);
  showFilters = signal(false);
  currentStatus = signal<'all' | UserStatus>('all');
  selectedIds = signal<Set<string>>(new Set());
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Expose service signals
  readonly stats = this.platformUsersService.stats;
  readonly statsLoading = this.platformUsersService.statsLoading;
  readonly users = this.platformUsersService.users;
  readonly usersLoading = this.platformUsersService.usersLoading;
  readonly usersMeta = this.platformUsersService.usersMeta;

  // User type tabs with dynamic counts from stats
  userTypeTabs = computed(() => {
    const s = this.stats();
    return [
      { label: 'All', value: 'all' as PlatformUserType, count: s?.total ?? 0 },
      { label: 'Learners', value: 'learner' as PlatformUserType, count: s?.byType?.learners ?? 0 },
      { label: 'Hub Owners', value: 'hub_owner' as PlatformUserType, count: s?.byType?.hubOwners ?? 0 },
      { label: 'Experts', value: 'expert' as PlatformUserType, count: s?.byType?.experts ?? 0 },
      { label: 'Admins', value: 'admin' as PlatformUserType, count: s?.byType?.admins ?? 0 },
      { label: 'Members', value: 'member' as PlatformUserType, count: s?.byType?.members ?? 0 },
    ];
  });

  // Status dropdown options
  statusOptions = computed(() => {
    const s = this.stats();
    return [
      { label: 'All Status', value: 'all' as const, count: s?.total ?? 0 },
      { label: 'Active', value: 'active' as UserStatus, count: s?.active ?? 0 },
      { label: 'Inactive', value: 'inactive' as UserStatus, count: s?.inactive ?? 0 },
      { label: 'Suspended', value: 'suspended' as UserStatus, count: s?.suspended ?? 0 },
    ];
  });

  totalPages = computed(() => this.usersMeta()?.totalPages ?? 1);
  pageStart = computed(() => {
    const meta = this.usersMeta();
    if (!meta) return 0;
    return (meta.page - 1) * meta.limit + 1;
  });
  pageEnd = computed(() => {
    const meta = this.usersMeta();
    if (!meta) return 0;
    return Math.min(meta.page * meta.limit, meta.total);
  });
  totalItems = computed(() => this.usersMeta()?.total ?? 0);

  selectedUsers = computed(() => Array.from(this.selectedIds()));

  allSelected = computed(() => {
    const userIds = this.users().map((u) => u._id);
    return userIds.length > 0 && userIds.every((id) => this.selectedIds().has(id));
  });

  ngOnInit() {
    this.loadStats();
    this.loadUsers();
  }

  async loadStats() {
    try {
      await this.platformUsersService.getStatsAsync();
    } catch (error) {
      console.error('Error loading stats:', error);
      this.toast.error('Failed to load user statistics');
    }
  }

  async loadUsers() {
    try {
      const currentStatusVal = this.currentStatus();
      const statusParam: UserStatus | undefined = currentStatusVal === 'all' ? undefined : currentStatusVal;
      await this.platformUsersService.listUsersAsync({
        page: this.currentPage(),
        limit: this.pageSize,
        status: statusParam,
        userType: this.userTypeFilter(),
        search: this.searchQuery || undefined,
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
      });
    } catch (error) {
      console.error('Error loading users:', error);
      this.toast.error('Failed to load users');
    }
  }

  setStatus(status: 'all' | UserStatus) {
    this.currentStatus.set(status);
    this.currentPage.set(1);
    this.loadUsers();
  }

  setUserType(userType: PlatformUserType) {
    this.userTypeFilter.set(userType);
    this.currentPage.set(1);
    this.loadUsers();
  }

  filterUsers() {
    this.currentPage.set(1);
    this.loadUsers();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadUsers();
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: string) {
    const newSet = new Set(this.selectedIds());
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    this.selectedIds.set(newSet);
  }

  toggleSelectAll() {
    const userIds = this.users().map((u) => u._id);
    const newSet = new Set(this.selectedIds());

    if (this.allSelected()) {
      userIds.forEach((id) => newSet.delete(id));
    } else {
      userIds.forEach((id) => newSet.add(id));
    }

    this.selectedIds.set(newSet);
  }

  bulkAction(action: string) {
    console.log('Bulk action:', action, 'on users:', this.selectedUsers());
    this.showActions.set(false);
  }

  exportData() {
    console.log('Exporting data...');
  }

  editUser(id: string) {
    console.log('Edit user:', id);
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      learner: 'Learner',
      owner: 'Hub Owner',
      expert: 'Expert',
      admin: 'Admin',
      member: 'Member',
    };
    return labels[role] || role;
  }

  getRoleClass(role: string): string {
    const classes: Record<string, string> = {
      learner: 'bg-blue-100 text-blue-700',
      owner: 'bg-green-100 text-green-700',
      expert: 'bg-purple-100 text-purple-700',
      admin: 'bg-orange-100 text-orange-700',
      member: 'bg-gray-100 text-gray-700',
    };
    return classes[role] || 'bg-gray-100 text-gray-700';
  }

  getTabCountClass(tabValue: string): string {
    const classes: Record<string, string> = {
      all: 'bg-gray-600 text-white',
      learner: 'bg-blue-600 text-white',
      hub_owner: 'bg-green-600 text-white',
      expert: 'bg-purple-600 text-white',
      admin: 'bg-orange-600 text-white',
      member: 'bg-gray-500 text-white',
    };
    return classes[tabValue] || 'bg-primary text-white';
  }

  getHubName(hubDisplay: string): string {
    // Remove the (+N) suffix if present
    return hubDisplay.replace(/\s*\(\+\d+\)$/, '');
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-orange-100 text-orange-700',
      suspended: 'bg-red-100 text-red-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  clearFilters() {
    this.searchQuery = '';
    this.userTypeFilter.set('all');
    this.currentStatus.set('all');
    this.showFilters.set(false);
    this.loadUsers();
  }

  applyFilters() {
    this.showFilters.set(false);
    this.loadUsers();
  }
}
