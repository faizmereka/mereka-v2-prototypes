import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Permission Category
 */
export type PermissionCategory = 'content' | 'booking' | 'profile' | 'team' | 'financial' | 'settings';

/**
 * Role Scope
 */
export type RoleScope = 'system' | 'hub';

/**
 * Permission interface
 */
export interface Permission {
  _id: string;
  key: string;
  name: string;
  description?: string;
  category: PermissionCategory;
  isActive: boolean;
  isSystemPermission: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Role interface
 */
export interface Role {
  _id: string;
  key: string;
  name: string;
  description?: string;
  permissions: Permission[];
  scope: RoleScope;
  hubId?: string;
  isActive: boolean;
  isSystemRole: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * API Response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create Role Input
 */
export interface CreateRoleInput {
  key: string;
  name: string;
  description?: string;
  permissionIds: string[];
  scope: RoleScope;
  hubId?: string;
}

/**
 * Update Role Input
 */
export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionIds?: string[];
  isActive?: boolean;
}

/**
 * Create Permission Input
 */
export interface CreatePermissionInput {
  key: string;
  name: string;
  description?: string;
  category: PermissionCategory;
}

/**
 * Update Permission Input
 */
export interface UpdatePermissionInput {
  name?: string;
  description?: string;
  category?: PermissionCategory;
  isActive?: boolean;
}

/**
 * Query Roles Params
 */
export interface QueryRolesParams {
  scope?: RoleScope;
  hubId?: string;
  isActive?: boolean;
  search?: string;
}

/**
 * Query Permissions Params
 */
export interface QueryPermissionsParams {
  category?: PermissionCategory;
  isActive?: boolean;
  search?: string;
}

/**
 * Role Permission Service
 * Handles roles and permissions management for admin panel
 */
@Injectable({
  providedIn: 'root',
})
export class RolePermissionService {
  private readonly http = inject(HttpClient);
  private readonly ADMIN_URL = `${environment.apiUrl}/admin`;

  // Roles state
  private readonly _roles = signal<Role[]>([]);
  private readonly _rolesLoading = signal(false);
  private readonly _rolesError = signal<string | null>(null);

  // Permissions state
  private readonly _permissions = signal<Permission[]>([]);
  private readonly _permissionsLoading = signal(false);
  private readonly _permissionsError = signal<string | null>(null);

  // Grouped permissions state
  private readonly _groupedPermissions = signal<Record<string, Permission[]>>({});

  // Public readonly signals
  readonly roles = this._roles.asReadonly();
  readonly rolesLoading = this._rolesLoading.asReadonly();
  readonly rolesError = this._rolesError.asReadonly();

  readonly permissions = this._permissions.asReadonly();
  readonly permissionsLoading = this._permissionsLoading.asReadonly();
  readonly permissionsError = this._permissionsError.asReadonly();

  readonly groupedPermissions = this._groupedPermissions.asReadonly();

  // ============ ROLES ============

  /**
   * Get all roles with optional filtering
   */
  getRoles(params?: QueryRolesParams): Observable<ApiResponse<Role[]>> {
    this._rolesLoading.set(true);
    this._rolesError.set(null);

    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http
      .get<ApiResponse<Role[]>>(`${this.ADMIN_URL}/roles`, {
        params: httpParams,
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._roles.set(response.data);
          }
          this._rolesLoading.set(false);
        }),
        catchError((error) => {
          this._rolesLoading.set(false);
          this._rolesError.set(error.error?.message || 'Failed to fetch roles');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get roles (async)
   */
  async getRolesAsync(params?: QueryRolesParams): Promise<Role[]> {
    const response = await firstValueFrom(this.getRoles(params));
    return response.data;
  }

  /**
   * Get active roles
   */
  getActiveRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(`${this.ADMIN_URL}/roles/active`, {
      withCredentials: true,
    });
  }

  /**
   * Get system roles
   */
  getSystemRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(`${this.ADMIN_URL}/roles/system`, {
      withCredentials: true,
    });
  }

  /**
   * Get role by ID
   */
  getRoleById(id: string): Observable<ApiResponse<Role>> {
    return this.http.get<ApiResponse<Role>>(`${this.ADMIN_URL}/roles/${id}`, {
      withCredentials: true,
    });
  }

  /**
   * Create a new role
   */
  createRole(data: CreateRoleInput): Observable<ApiResponse<Role>> {
    return this.http
      .post<ApiResponse<Role>>(`${this.ADMIN_URL}/roles`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._roles.update((roles) => [...roles, response.data]);
          }
        })
      );
  }

  /**
   * Create role (async)
   */
  async createRoleAsync(data: CreateRoleInput): Promise<Role> {
    const response = await firstValueFrom(this.createRole(data));
    return response.data;
  }

  /**
   * Update a role
   */
  updateRole(id: string, data: UpdateRoleInput): Observable<ApiResponse<Role>> {
    return this.http
      .patch<ApiResponse<Role>>(`${this.ADMIN_URL}/roles/${id}`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._roles.update((roles) =>
              roles.map((r) => (r._id === id ? response.data : r))
            );
          }
        })
      );
  }

  /**
   * Update role (async)
   */
  async updateRoleAsync(id: string, data: UpdateRoleInput): Promise<Role> {
    const response = await firstValueFrom(this.updateRole(id, data));
    return response.data;
  }

  /**
   * Delete a role
   */
  deleteRole(id: string): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.ADMIN_URL}/roles/${id}`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._roles.update((roles) => roles.filter((r) => r._id !== id));
          }
        })
      );
  }

  /**
   * Delete role (async)
   */
  async deleteRoleAsync(id: string): Promise<void> {
    await firstValueFrom(this.deleteRole(id));
  }

  /**
   * Toggle role status
   */
  toggleRoleStatus(id: string, isActive: boolean): Observable<ApiResponse<Role>> {
    return this.http
      .patch<ApiResponse<Role>>(
        `${this.ADMIN_URL}/roles/${id}/toggle`,
        { isActive },
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            this._roles.update((roles) =>
              roles.map((r) => (r._id === id ? response.data : r))
            );
          }
        })
      );
  }

  // ============ PERMISSIONS ============

  /**
   * Get all permissions with optional filtering
   */
  getPermissions(params?: QueryPermissionsParams): Observable<ApiResponse<Permission[]>> {
    this._permissionsLoading.set(true);
    this._permissionsError.set(null);

    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http
      .get<ApiResponse<Permission[]>>(`${this.ADMIN_URL}/permissions`, {
        params: httpParams,
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._permissions.set(response.data);
          }
          this._permissionsLoading.set(false);
        }),
        catchError((error) => {
          this._permissionsLoading.set(false);
          this._permissionsError.set(error.error?.message || 'Failed to fetch permissions');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get permissions (async)
   */
  async getPermissionsAsync(params?: QueryPermissionsParams): Promise<Permission[]> {
    const response = await firstValueFrom(this.getPermissions(params));
    return response.data;
  }

  /**
   * Get active permissions
   */
  getActivePermissions(): Observable<ApiResponse<Permission[]>> {
    return this.http.get<ApiResponse<Permission[]>>(`${this.ADMIN_URL}/permissions/active`, {
      withCredentials: true,
    });
  }

  /**
   * Get permissions grouped by category
   */
  getPermissionsGrouped(): Observable<ApiResponse<Record<string, Permission[]>>> {
    return this.http
      .get<ApiResponse<Record<string, Permission[]>>>(`${this.ADMIN_URL}/permissions/grouped`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._groupedPermissions.set(response.data);
          }
        })
      );
  }

  /**
   * Get permissions grouped (async)
   */
  async getPermissionsGroupedAsync(): Promise<Record<string, Permission[]>> {
    const response = await firstValueFrom(this.getPermissionsGrouped());
    return response.data;
  }

  /**
   * Get permission categories
   */
  getPermissionCategories(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.ADMIN_URL}/permissions/categories`, {
      withCredentials: true,
    });
  }

  /**
   * Get permission by ID
   */
  getPermissionById(id: string): Observable<ApiResponse<Permission>> {
    return this.http.get<ApiResponse<Permission>>(`${this.ADMIN_URL}/permissions/${id}`, {
      withCredentials: true,
    });
  }

  /**
   * Create a new permission
   */
  createPermission(data: CreatePermissionInput): Observable<ApiResponse<Permission>> {
    return this.http
      .post<ApiResponse<Permission>>(`${this.ADMIN_URL}/permissions`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._permissions.update((permissions) => [...permissions, response.data]);
          }
        })
      );
  }

  /**
   * Create permission (async)
   */
  async createPermissionAsync(data: CreatePermissionInput): Promise<Permission> {
    const response = await firstValueFrom(this.createPermission(data));
    return response.data;
  }

  /**
   * Update a permission
   */
  updatePermission(id: string, data: UpdatePermissionInput): Observable<ApiResponse<Permission>> {
    return this.http
      .patch<ApiResponse<Permission>>(`${this.ADMIN_URL}/permissions/${id}`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._permissions.update((permissions) =>
              permissions.map((p) => (p._id === id ? response.data : p))
            );
          }
        })
      );
  }

  /**
   * Update permission (async)
   */
  async updatePermissionAsync(id: string, data: UpdatePermissionInput): Promise<Permission> {
    const response = await firstValueFrom(this.updatePermission(id, data));
    return response.data;
  }

  /**
   * Delete a permission
   */
  deletePermission(id: string): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.ADMIN_URL}/permissions/${id}`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._permissions.update((permissions) => permissions.filter((p) => p._id !== id));
          }
        })
      );
  }

  /**
   * Delete permission (async)
   */
  async deletePermissionAsync(id: string): Promise<void> {
    await firstValueFrom(this.deletePermission(id));
  }

  /**
   * Toggle permission status
   */
  togglePermissionStatus(id: string, isActive: boolean): Observable<ApiResponse<Permission>> {
    return this.http
      .patch<ApiResponse<Permission>>(
        `${this.ADMIN_URL}/permissions/${id}/toggle`,
        { isActive },
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            this._permissions.update((permissions) =>
              permissions.map((p) => (p._id === id ? response.data : p))
            );
          }
        })
      );
  }
}
