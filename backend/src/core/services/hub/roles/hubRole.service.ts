import { type IRole, Role, RoleScope } from '@core/models/Role';
import mongoose from 'mongoose';

/**
 * HubRoleService
 *
 * Provides role metadata for hub-facing UIs (e.g. team management, host selection).
 */
export interface HubRoleListItem {
  id: string;
  key: string;
  name: string;
  description?: string;
  scope: RoleScope;
  hubId: string | null;
  isSystemRole: boolean;
}

export class HubRoleService {
  /**
   * List roles available in a hub.
   * Includes active system roles and hub-specific custom roles.
   */
  async listRolesForHub(hubId: string): Promise<HubRoleListItem[]> {
    const roles = await Role.find({
      $or: [
        { scope: RoleScope.SYSTEM },
        { scope: RoleScope.HUB, hubId: new mongoose.Types.ObjectId(hubId) },
      ],
      isActive: true,
    })
      .select('key name description scope hubId isSystemRole')
      .sort({ isSystemRole: -1, name: 1 })
      .lean<IRole[]>();

    return roles.map((role) => ({
      id: String(role._id),
      key: role.key,
      name: role.name,
      description: role.description ?? '',
      scope: role.scope,
      hubId: role.hubId ? String(role.hubId) : null,
      isSystemRole: role.isSystemRole,
    }));
  }
}

export const hubRoleService = new HubRoleService();
