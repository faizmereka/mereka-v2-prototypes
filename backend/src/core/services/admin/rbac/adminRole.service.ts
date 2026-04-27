import { Permission } from '@core/models/Permission';
import { type IRole, Role, RoleScope } from '@core/models/Role';
import type {
  AdminCreateRoleInput,
  AdminQueryRolesInput,
  AdminUpdateRoleInput,
} from '@schemas/admin';
import mongoose from 'mongoose';

/**
 * Admin Role Service
 * Handles all business logic for role management
 */
class AdminRoleService {
  /**
   * Create a new role
   */
  async createRole(data: AdminCreateRoleInput): Promise<IRole> {
    // Check for duplicate key within scope/hub
    const existing = await Role.findOne({
      key: data.key,
      scope: data.scope,
      hubId: data.hubId,
    });

    if (existing) {
      throw new Error('Role with this key already exists in this scope');
    }

    // Validate permission IDs exist
    if (data.permissionIds && data.permissionIds.length > 0) {
      const permissions = await Permission.find({
        _id: { $in: data.permissionIds },
        isActive: true,
      });

      if (permissions.length !== data.permissionIds.length) {
        throw new Error('Some permission IDs are invalid or inactive');
      }
    }

    const role = await Role.create({
      key: data.key,
      name: data.name,
      description: data.description,
      permissions: data.permissionIds || [],
      scope: data.scope,
      hubId: data.hubId,
      isActive: true,
      isSystemRole: false,
    });

    return role;
  }

  /**
   * Get role by ID with populated permissions
   */
  async getRoleById(id: string): Promise<IRole | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    return Role.findById(id).populate('permissions').lean() as unknown as IRole | null;
  }

  /**
   * Update a role
   */
  async updateRole(id: string, data: AdminUpdateRoleInput['body']): Promise<IRole | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid role ID');
    }

    const role = await Role.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    // Don't allow editing system roles' core properties
    if (role.isSystemRole && (data.name || data.permissionIds)) {
      throw new Error('Cannot modify system role core properties');
    }

    // Validate permission IDs if provided
    if (data.permissionIds && data.permissionIds.length > 0) {
      const permissions = await Permission.find({
        _id: { $in: data.permissionIds },
        isActive: true,
      });

      if (permissions.length !== data.permissionIds.length) {
        throw new Error('Some permission IDs are invalid or inactive');
      }
    }

    const updateData: Partial<IRole> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.permissionIds !== undefined) {
      updateData.permissions = data.permissionIds.map((id) => new mongoose.Types.ObjectId(id));
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedRole = (await Role.findByIdAndUpdate(id, updateData, { new: true })
      .populate('permissions')
      .lean()) as unknown as IRole | null;

    return updatedRole;
  }

  /**
   * Delete a role (soft delete by setting isActive to false)
   */
  async deleteRole(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid role ID');
    }

    const role = await Role.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystemRole) {
      throw new Error('Cannot delete system roles');
    }

    await Role.findByIdAndUpdate(id, { isActive: false });
  }

  /**
   * Permanently delete a role
   */
  async permanentlyDeleteRole(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid role ID');
    }

    const role = await Role.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystemRole) {
      throw new Error('Cannot delete system roles');
    }

    await Role.findByIdAndDelete(id);
  }

  /**
   * List all roles with filtering
   */
  async listRoles(query: AdminQueryRolesInput): Promise<{
    roles: IRole[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = 1;
    const limit = 100; // For admin, we typically want all roles

    const filter: Record<string, unknown> = {};

    if (query.scope) {
      filter.scope = query.scope;
    }

    if (query.hubId) {
      filter.hubId = new mongoose.Types.ObjectId(query.hubId);
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { key: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [roles, total] = await Promise.all([
      Role.find(filter)
        .populate('permissions')
        .sort({ isSystemRole: -1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean() as unknown as IRole[],
      Role.countDocuments(filter),
    ]);

    return {
      roles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all active roles
   */
  async getActiveRoles(): Promise<IRole[]> {
    return Role.find({ isActive: true })
      .populate('permissions')
      .sort({ isSystemRole: -1, name: 1 })
      .lean() as unknown as IRole[];
  }

  /**
   * Get system roles
   */
  async getSystemRoles(): Promise<IRole[]> {
    return Role.find({ scope: RoleScope.SYSTEM, isActive: true })
      .populate('permissions')
      .sort({ name: 1 })
      .lean() as unknown as IRole[];
  }

  /**
   * Get roles by hub
   */
  async getRolesByHub(hubId: string): Promise<IRole[]> {
    return Role.find({
      $or: [{ scope: RoleScope.SYSTEM }, { hubId: new mongoose.Types.ObjectId(hubId) }],
      isActive: true,
    })
      .populate('permissions')
      .sort({ isSystemRole: -1, name: 1 })
      .lean() as unknown as IRole[];
  }

  /**
   * Update member count for a role
   */
  async updateMemberCount(roleId: string, count: number): Promise<void> {
    await Role.findByIdAndUpdate(roleId, { memberCount: count });
  }

  /**
   * Toggle role active status
   */
  async toggleRoleStatus(id: string, isActive: boolean): Promise<IRole | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid role ID');
    }

    const role = await Role.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystemRole) {
      throw new Error('Cannot deactivate system roles');
    }

    return Role.findByIdAndUpdate(id, { isActive }, { new: true })
      .populate('permissions')
      .lean() as unknown as IRole | null;
  }
}

export const adminRoleService = new AdminRoleService();
