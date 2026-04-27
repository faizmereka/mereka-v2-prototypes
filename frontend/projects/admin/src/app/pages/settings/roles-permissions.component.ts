import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/ui';
import { DialogService } from '../../shared/dialog';
import {
  RolePermissionService,
  type Role,
  type Permission,
  type CreateRoleInput,
  type UpdateRoleInput,
  type PermissionCategory,
} from './role-permission.service';

@Component({
  selector: 'app-roles-permissions',
  imports: [FormsModule],
  templateUrl: './roles-permissions.component.html',
  styleUrl: './roles-permissions.component.scss',
})
export class RolesPermissionsComponent implements OnInit {
  private readonly rolePermissionService = inject(RolePermissionService);
  private readonly toast = inject(ToastService);
  private readonly dialogService = inject(DialogService);

  activeTab = signal<'roles' | 'permissions'>('roles');
  searchQuery = '';
  selectedModule = signal<string>('all');
  showRoleModal = signal(false);
  editingRole = signal<Role | null>(null);
  isSubmitting = signal(false);

  roleForm = {
    key: '',
    name: '',
    description: '',
    permissions: [] as string[],
  };

  // Category mapping for display
  readonly categoryLabels: Record<PermissionCategory, string> = {
    content: 'Content',
    booking: 'Booking',
    profile: 'Profile',
    team: 'Team',
    financial: 'Financial',
    settings: 'Settings',
  };

  // Module list from backend categories
  modules = signal<string[]>([]);

  // Expose service signals
  readonly roles = this.rolePermissionService.roles;
  readonly rolesLoading = this.rolePermissionService.rolesLoading;
  readonly rolesError = this.rolePermissionService.rolesError;

  readonly permissions = this.rolePermissionService.permissions;
  readonly permissionsLoading = this.rolePermissionService.permissionsLoading;
  readonly permissionsError = this.rolePermissionService.permissionsError;

  // Filtered roles based on search
  filteredRoles = computed(() => {
    const roles = this.roles();
    if (!this.searchQuery) return roles;
    const query = this.searchQuery.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.key.toLowerCase().includes(query)
    );
  });

  // Filtered permissions based on selected module
  filteredPermissions = computed(() => {
    const permissions = this.permissions();
    if (this.selectedModule() === 'all') return permissions;
    const selectedCategory = this.selectedModule().toLowerCase() as PermissionCategory;
    return permissions.filter((p) => p.category === selectedCategory);
  });

  // Track if data has been loaded
  private rolesLoaded = false;
  private permissionsLoaded = false;

  ngOnInit() {
    // Load only roles initially (default tab)
    this.loadRoles();
  }

  // Load roles data
  async loadRoles() {
    if (this.rolesLoaded) return;
    try {
      await this.rolePermissionService.getRolesAsync();
      this.rolesLoaded = true;
    } catch (error) {
      console.error('Error loading roles:', error);
      this.toast.error('Failed to load roles');
    }
  }

  // Load permissions data
  async loadPermissions() {
    if (this.permissionsLoaded) return;
    try {
      await this.rolePermissionService.getPermissionsAsync();
      this.permissionsLoaded = true;

      // Set modules from permissions categories
      const permissions = this.permissions();
      const categories = [...new Set(permissions.map((p) => p.category))];
      this.modules.set(categories.map((c) => this.categoryLabels[c as PermissionCategory] || c));
    } catch (error) {
      console.error('Error loading permissions:', error);
      this.toast.error('Failed to load permissions');
    }
  }

  // Switch tab and load data on demand
  switchTab(tab: 'roles' | 'permissions') {
    this.activeTab.set(tab);
    if (tab === 'roles') {
      this.loadRoles();
    } else {
      this.loadPermissions();
    }
  }

  // Get permissions by module (category)
  getPermissionsByModule(module: string): Permission[] {
    const permissions = this.permissions();
    // Map display name back to category
    const category = Object.entries(this.categoryLabels).find(
      ([, label]) => label === module
    )?.[0] as PermissionCategory | undefined;
    if (!category) return [];
    return permissions.filter((p) => p.category === category);
  }

  // Get roles that have a specific permission
  getRolesWithPermission(permissionId: string): Role[] {
    return this.roles().filter((r) =>
      r.permissions.some((p) => p._id === permissionId)
    );
  }

  // Check if all permissions in a module are selected
  isModuleFullySelected(module: string): boolean {
    const modulePermissions = this.getPermissionsByModule(module);
    return modulePermissions.length > 0 && modulePermissions.every((p) =>
      this.roleForm.permissions.includes(p._id)
    );
  }

  // Toggle all permissions in a module
  toggleModule(module: string): void {
    const modulePermissions = this.getPermissionsByModule(module);
    const allSelected = this.isModuleFullySelected(module);

    if (allSelected) {
      this.roleForm.permissions = this.roleForm.permissions.filter(
        (p) => !modulePermissions.map((mp) => mp._id).includes(p)
      );
    } else {
      const newPermissions = modulePermissions.map((p) => p._id);
      this.roleForm.permissions = [...new Set([...this.roleForm.permissions, ...newPermissions])];
    }
  }

  // Toggle a single permission
  togglePermission(permissionId: string): void {
    const index = this.roleForm.permissions.indexOf(permissionId);
    if (index > -1) {
      this.roleForm.permissions.splice(index, 1);
    } else {
      this.roleForm.permissions.push(permissionId);
    }
  }

  // Open modal for editing a role
  async editRole(role: Role): Promise<void> {
    // Load permissions if not already loaded (needed for permission checkboxes)
    await this.loadPermissions();

    this.editingRole.set(role);
    this.roleForm = {
      key: role.key,
      name: role.name,
      description: role.description || '',
      permissions: role.permissions.map((p) => p._id),
    };
    this.showRoleModal.set(true);
  }

  // Open modal for creating a new role
  async openCreateRoleModal(): Promise<void> {
    // Load permissions if not already loaded (needed for permission checkboxes)
    await this.loadPermissions();

    this.editingRole.set(null);
    this.roleForm = { key: '', name: '', description: '', permissions: [] };
    this.showRoleModal.set(true);
  }

  // Close the modal
  closeRoleModal(): void {
    this.showRoleModal.set(false);
    this.editingRole.set(null);
    this.roleForm = { key: '', name: '', description: '', permissions: [] };
  }

  // Normalize role key: lowercase, replace spaces with hyphens, remove special chars
  private normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  // Save role (create or update)
  async saveRole(): Promise<void> {
    if (!this.roleForm.name) {
      this.toast.warning('Please enter a role name');
      return;
    }

    this.isSubmitting.set(true);

    try {
      if (this.editingRole()) {
        // Update existing role
        const updateData: UpdateRoleInput = {
          name: this.roleForm.name,
          description: this.roleForm.description,
          permissionIds: this.roleForm.permissions,
        };
        await this.rolePermissionService.updateRoleAsync(this.editingRole()!._id, updateData);
        this.toast.success('Role updated successfully');
      } else {
        // Create new role
        let roleKey = this.roleForm.key;
        if (!roleKey) {
          // Generate key from name if not provided
          roleKey = this.normalizeKey(this.roleForm.name);
        } else {
          // Normalize user-provided key
          roleKey = this.normalizeKey(roleKey);
        }

        if (!roleKey) {
          this.toast.warning('Please enter a valid role key');
          this.isSubmitting.set(false);
          return;
        }

        const createData: CreateRoleInput = {
          key: roleKey,
          name: this.roleForm.name,
          description: this.roleForm.description,
          permissionIds: this.roleForm.permissions,
          scope: 'hub', // Default to hub scope for custom roles
        };
        await this.rolePermissionService.createRoleAsync(createData);
        this.toast.success('Role created successfully');
      }
      this.closeRoleModal();
    } catch (error) {
      console.error('Error saving role:', error);
      this.toast.error(this.editingRole() ? 'Failed to update role' : 'Failed to create role');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Delete a role
  async deleteRole(role: Role): Promise<void> {
    if (role.isSystemRole) {
      this.toast.warning('Cannot delete system roles');
      return;
    }

    const confirmed = await this.dialogService.confirm({
      title: 'Delete Role',
      message: `Are you sure you want to delete "${role.name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) {
      return;
    }

    try {
      await this.rolePermissionService.deleteRoleAsync(role._id);
      this.toast.success('Role deleted successfully');
    } catch (error) {
      console.error('Error deleting role:', error);
      this.toast.error('Failed to delete role');
    }
  }

  // Toggle role status
  async toggleRoleStatus(role: Role): Promise<void> {
    if (role.isSystemRole) {
      this.toast.warning('Cannot deactivate system roles');
      return;
    }

    try {
      await this.rolePermissionService
        .toggleRoleStatus(role._id, !role.isActive)
        .toPromise();
      this.toast.success(`Role ${!role.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling role status:', error);
      this.toast.error('Failed to update role status');
    }
  }
}
