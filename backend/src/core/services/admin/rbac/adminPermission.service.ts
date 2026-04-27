import { type IPermission, Permission, PermissionCategory } from '@core/models/Permission';
import type {
  AdminCreatePermissionInput,
  AdminQueryPermissionsInput,
  AdminUpdatePermissionInput,
} from '@schemas/admin';
import mongoose from 'mongoose';

/**
 * Admin Permission Service
 * Handles all business logic for permission management
 */
class AdminPermissionService {
  /**
   * Create a new permission
   */
  async createPermission(data: AdminCreatePermissionInput): Promise<IPermission> {
    // Check for duplicate key
    const existing = await Permission.findOne({ key: data.key });

    if (existing) {
      throw new Error('Permission with this key already exists');
    }

    const permission = await Permission.create({
      key: data.key,
      name: data.name,
      description: data.description,
      category: data.category,
      isActive: data.isActive ?? true,
      isSystemPermission: false,
    });

    return permission;
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(id: string): Promise<IPermission | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    return Permission.findById(id).lean() as unknown as IPermission | null;
  }

  /**
   * Get permission by key
   */
  async getPermissionByKey(key: string): Promise<IPermission | null> {
    return Permission.findOne({ key }).lean() as unknown as IPermission | null;
  }

  /**
   * Update a permission
   */
  async updatePermission(
    id: string,
    data: AdminUpdatePermissionInput['body'],
  ): Promise<IPermission | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid permission ID');
    }

    const permission = await Permission.findById(id);
    if (!permission) {
      throw new Error('Permission not found');
    }

    // Don't allow editing system permissions' core properties
    if (permission.isSystemPermission && data.name) {
      throw new Error('Cannot modify system permission core properties');
    }

    const updateData: Partial<IPermission> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedPermission = (await Permission.findByIdAndUpdate(id, updateData, {
      new: true,
    }).lean()) as unknown as IPermission | null;

    return updatedPermission;
  }

  /**
   * Delete a permission (soft delete)
   */
  async deletePermission(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid permission ID');
    }

    const permission = await Permission.findById(id);
    if (!permission) {
      throw new Error('Permission not found');
    }

    if (permission.isSystemPermission) {
      throw new Error('Cannot delete system permissions');
    }

    await Permission.findByIdAndUpdate(id, { isActive: false });
  }

  /**
   * List all permissions with filtering
   */
  async listPermissions(query: AdminQueryPermissionsInput): Promise<{
    permissions: IPermission[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};

    if (query.category) {
      filter.category = query.category;
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

    const [permissions, total] = await Promise.all([
      Permission.find(filter).sort({ category: 1, name: 1 }).lean() as unknown as IPermission[],
      Permission.countDocuments(filter),
    ]);

    return { permissions, total };
  }

  /**
   * Get all active permissions
   */
  async getActivePermissions(): Promise<IPermission[]> {
    return Permission.find({ isActive: true })
      .sort({ category: 1, name: 1 })
      .lean() as unknown as IPermission[];
  }

  /**
   * Get permissions by category
   */
  async getPermissionsByCategory(category: PermissionCategory): Promise<IPermission[]> {
    return Permission.find({ category, isActive: true })
      .sort({ name: 1 })
      .lean() as unknown as IPermission[];
  }

  /**
   * Get all permission categories with their permissions
   */
  async getPermissionsGroupedByCategory(): Promise<Record<string, IPermission[]>> {
    const permissions = await this.getActivePermissions();

    const grouped: Record<string, IPermission[]> = {};

    for (const permission of permissions) {
      const category = permission.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(permission);
    }

    return grouped;
  }

  /**
   * Toggle permission active status
   */
  async togglePermissionStatus(id: string, isActive: boolean): Promise<IPermission | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid permission ID');
    }

    const permission = await Permission.findById(id);
    if (!permission) {
      throw new Error('Permission not found');
    }

    if (permission.isSystemPermission && !isActive) {
      throw new Error('Cannot deactivate system permissions');
    }

    return Permission.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    ).lean() as unknown as IPermission | null;
  }

  /**
   * Get permissions by IDs
   */
  async getPermissionsByIds(ids: string[]): Promise<IPermission[]> {
    const objectIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    return Permission.find({
      _id: { $in: objectIds },
      isActive: true,
    }).lean() as unknown as IPermission[];
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Object.values(PermissionCategory);
  }
}

export const adminPermissionService = new AdminPermissionService();
