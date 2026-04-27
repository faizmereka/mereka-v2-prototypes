import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe, DatePipe, NgClass } from '@angular/common';
import {
  SuperAdminService,
  Admin,
  AdminStats,
  CreateAdminInput,
  AdminRole,
  AdminStatus,
} from './super-admin.service';
import { DialogService } from '../../shared/dialog';
import { ToastService } from '../../shared/ui';
import { AuthService } from '../../core/services/auth.service';

type TabType = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [FormsModule, TitleCasePipe, DatePipe, NgClass],
  templateUrl: './super-admin.component.html',
})
export class SuperAdminComponent implements OnInit {
  private readonly superAdminService = inject(SuperAdminService);
  private readonly dialogService = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);

  // State
  admins = signal<Admin[]>([]);
  stats = signal<AdminStats | null>(null);
  loading = signal(false);
  searchQuery = '';
  activeTab: TabType = 'all';
  roleFilter = '';

  // Modal states
  showAddModal = signal(false);
  showEditModal = signal(false);
  showSessionModal = signal(false);
  selectedAdmin = signal<Admin | null>(null);
  sessionInfo = signal<{
    adminId: string;
    name: string;
    email: string;
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    loginAttempts: number;
    lockedUntil: string | null;
    activeSessions: number;
    isLocked: boolean;
  } | null>(null);

  // Form data
  formData = signal<CreateAdminInput>({
    email: '',
    password: '',
    name: '',
    role: 'platformAdmin',
  });

  editFormData = signal<{
    name: string;
    status: AdminStatus;
    role: AdminRole;
  }>({
    name: '',
    status: 'active',
    role: 'platformAdmin',
  });

  // Current admin ID (to prevent self-actions)
  currentAdminId = computed(() => this.authService.currentAdmin()?.id || '');

  ngOnInit() {
    this.loadAdmins();
    this.loadStats();
  }

  loadAdmins() {
    this.loading.set(true);
    const params: { status?: AdminStatus; role?: AdminRole; search?: string } = {};

    if (this.activeTab === 'active') params.status = 'active';
    if (this.activeTab === 'inactive') params.status = 'inactive';
    if (this.roleFilter) params.role = this.roleFilter as AdminRole;
    if (this.searchQuery) params.search = this.searchQuery;

    this.superAdminService.listAdmins(params).subscribe({
      next: (response) => {
        this.admins.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Failed to load admins');
        console.error('Failed to load admins:', err);
      },
    });
  }

  loadStats() {
    this.superAdminService.getStats().subscribe({
      next: (response) => {
        this.stats.set(response.data);
      },
      error: (err) => {
        console.error('Failed to load stats:', err);
      },
    });
  }

  filteredAdmins() {
    let result = this.admins();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) || a.email.toLowerCase().includes(query)
      );
    }

    return result;
  }

  openAddModal() {
    this.formData.set({
      email: '',
      password: '',
      name: '',
      role: 'platformAdmin',
    });
    this.showAddModal.set(true);
  }

  openEditModal(admin: Admin) {
    this.selectedAdmin.set(admin);
    this.editFormData.set({
      name: admin.name,
      status: admin.status,
      role: admin.role,
    });
    this.showEditModal.set(true);
  }

  async viewSessions(admin: Admin) {
    this.selectedAdmin.set(admin);
    this.superAdminService.getAdminSessions(admin._id).subscribe({
      next: (response) => {
        this.sessionInfo.set(response.data);
        this.showSessionModal.set(true);
      },
      error: (err) => {
        this.toast.error('Failed to load session info');
        console.error('Failed to load session info:', err);
      },
    });
  }

  createAdmin() {
    const data = this.formData();
    if (!data.email || !data.password || !data.name) {
      this.toast.error('All fields are required');
      return;
    }

    if (data.password.length < 8) {
      this.toast.error('Password must be at least 8 characters');
      return;
    }

    this.loading.set(true);
    this.superAdminService.createAdmin(data).subscribe({
      next: () => {
        this.showAddModal.set(false);
        this.loadAdmins();
        this.loadStats();
        this.loading.set(false);
        this.toast.success('Admin created successfully');
      },
      error: (err) => {
        this.loading.set(false);
        const message = err.error?.error?.message || 'Failed to create admin';
        this.toast.error(message);
        console.error('Failed to create admin:', err);
      },
    });
  }

  updateAdmin() {
    const admin = this.selectedAdmin();
    if (!admin) return;

    const data = this.editFormData();
    this.loading.set(true);
    this.superAdminService.updateAdmin(admin._id, data).subscribe({
      next: () => {
        this.showEditModal.set(false);
        this.selectedAdmin.set(null);
        this.loadAdmins();
        this.loadStats();
        this.loading.set(false);
        this.toast.success('Admin updated successfully');
      },
      error: (err) => {
        this.loading.set(false);
        const message = err.error?.error?.message || 'Failed to update admin';
        this.toast.error(message);
        console.error('Failed to update admin:', err);
      },
    });
  }

  async deleteAdmin(admin: Admin) {
    if (admin._id === this.currentAdminId()) {
      this.toast.error('Cannot deactivate your own account');
      return;
    }

    const confirmed = await this.dialogService.confirm({
      title: 'Deactivate Admin',
      message: `Are you sure you want to deactivate "${admin.name}"? They will no longer be able to access the admin panel.`,
      type: 'danger',
      confirmText: 'Deactivate',
    });

    if (!confirmed) return;

    this.superAdminService.deleteAdmin(admin._id).subscribe({
      next: () => {
        this.loadAdmins();
        this.loadStats();
        this.toast.success('Admin deactivated successfully');
      },
      error: (err) => {
        const message = err.error?.error?.message || 'Failed to deactivate admin';
        this.toast.error(message);
        console.error('Failed to deactivate admin:', err);
      },
    });
  }

  async forceLogout(admin: Admin) {
    if (admin._id === this.currentAdminId()) {
      this.toast.error('Use the logout button to logout yourself');
      return;
    }

    const confirmed = await this.dialogService.confirm({
      title: 'Force Logout',
      message: `Are you sure you want to logout "${admin.name}" from all sessions?`,
      type: 'warning',
      confirmText: 'Logout',
    });

    if (!confirmed) return;

    this.superAdminService.forceLogout(admin._id).subscribe({
      next: () => {
        this.showSessionModal.set(false);
        this.toast.success('Admin logged out from all sessions');
      },
      error: (err) => {
        const message = err.error?.error?.message || 'Failed to force logout';
        this.toast.error(message);
        console.error('Failed to force logout:', err);
      },
    });
  }

  unlockAdmin(admin: Admin) {
    this.superAdminService.unlockAdmin(admin._id).subscribe({
      next: () => {
        this.loadAdmins();
        this.showSessionModal.set(false);
        this.toast.success('Admin account unlocked');
      },
      error: (err) => {
        const message = err.error?.error?.message || 'Failed to unlock admin';
        this.toast.error(message);
        console.error('Failed to unlock admin:', err);
      },
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-500';
      case 'suspended':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'superAdmin':
        return 'bg-purple-100 text-purple-700';
      case 'platformAdmin':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  isAdminLocked(admin: Admin): boolean {
    if (!admin.lockedUntil) return false;
    return new Date(admin.lockedUntil) > new Date();
  }

  updateFormField(field: keyof CreateAdminInput, value: string) {
    this.formData.update((data) => ({ ...data, [field]: value }));
  }

  updateEditFormField(
    field: keyof { name: string; status: AdminStatus; role: AdminRole },
    value: string
  ) {
    this.editFormData.update((data) => ({ ...data, [field]: value }));
  }

  onTabChange(tab: TabType) {
    this.activeTab = tab;
    this.loadAdmins();
  }

  onRoleFilterChange() {
    this.loadAdmins();
  }

  onSearch() {
    this.loadAdmins();
  }
}
