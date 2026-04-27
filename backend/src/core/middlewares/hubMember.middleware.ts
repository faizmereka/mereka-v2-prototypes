import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import type { IRole } from '@core/models/Role';
import { SystemRoleKey } from '@core/models/Role';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type mongoose from 'mongoose';

/**
 * Extended request type with hub member info
 */
export interface HubMemberRequest extends Omit<FastifyRequest, 'user'> {
  user?: { sub: string; id?: string };
  hubMember?: {
    roleIds: mongoose.Types.ObjectId[];
    roleKeys: string[];
    roleNames: string[];
    isOwner: boolean;
  };
}

/**
 * Middleware: Check if user is a member of the hub
 * Attaches hubMember info to request
 */
export async function requireHubMember(request: FastifyRequest, reply: FastifyReply) {
  const req = request as HubMemberRequest;
  // Support both 'sub' (from JWT) and 'id' (for compatibility)
  const userId = req.user?.sub || req.user?.id;
  const hubId = req.params as { hubId?: string };

  if (!userId) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  if (!hubId.hubId) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'MISSING_HUB_ID',
        message: 'Hub ID is required',
      },
    });
  }

  // Find membership with populated roles
  const membership = await HubMember.findOne({
    hubId: hubId.hubId,
    userId,
    status: HubMemberStatus.ACTIVE,
  })
    .populate('roleIds')
    .lean();

  if (!membership || !membership.roleIds || membership.roleIds.length === 0) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'NOT_HUB_MEMBER',
        message: 'You are not a member of this hub',
      },
    });
  }

  const roles = membership.roleIds as unknown as IRole[];
  const roleKeys = roles.map((r) => r.key);
  const roleNames = roles.map((r) => r.name);
  const isOwner = roleKeys.includes(SystemRoleKey.OWNER);

  // Attach membership info to request
  req.hubMember = {
    roleIds: membership.roleIds as mongoose.Types.ObjectId[],
    roleKeys,
    roleNames,
    isOwner,
  };
}

/**
 * Middleware: Check if user has specific role key
 * Usage: requireHubRoleKey(['owner', 'admin'])
 */
export function requireHubRoleKey(allowedRoleKeys: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as HubMemberRequest;

    // First check if user is a member (will populate req.hubMember)
    await requireHubMember(request, reply);

    const userRoleKeys = req.hubMember?.roleKeys || [];

    // Check if user has any of the allowed roles
    const hasAllowedRole = userRoleKeys.some((key) => allowedRoleKeys.includes(key));

    if (!hasAllowedRole) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `This action requires one of the following roles: ${allowedRoleKeys.join(', ')}`,
        },
      });
    }
  };
}

/**
 * Middleware: Check if user has specific permission
 * Usage: requireHubPermission('canEditExperiences')
 */
export function requireHubPermission(permissionKey: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as HubMemberRequest;

    // First check if user is a member
    await requireHubMember(request, reply);

    // Owner has all permissions
    if (req.hubMember?.isOwner) {
      return;
    }

    // Get all roles and collect all permission IDs
    const membership = await HubMember.findOne({
      hubId: (request.params as { hubId: string }).hubId,
      userId: req.user?.sub || req.user?.id,
      status: HubMemberStatus.ACTIVE,
    }).populate({
      path: 'roleIds',
      populate: { path: 'permissions' },
    });

    if (!membership) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'NOT_HUB_MEMBER',
          message: 'You are not a member of this hub',
        },
      });
    }

    const roles = membership.roleIds as unknown as Array<{
      permissions: Array<{ key: string; isActive: boolean }>;
    }>;

    // Check if any role has the required permission
    const hasPermission = roles.some((role) =>
      role.permissions?.some((perm) => perm.key === permissionKey && perm.isActive !== false),
    );

    if (!hasPermission) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSION',
          message: `This action requires the '${permissionKey}' permission`,
        },
      });
    }
  };
}

/**
 * Middleware: Check if user is owner of the hub
 */
export async function requireHubOwner(request: FastifyRequest, reply: FastifyReply) {
  return requireHubRoleKey([SystemRoleKey.OWNER])(request, reply);
}

/**
 * Helper: Check if user has access to hub (without middleware)
 * Use in services when you need programmatic access check
 */
export async function checkHubAccess(
  hubId: string | mongoose.Types.ObjectId,
  userId: string | mongoose.Types.ObjectId,
): Promise<{
  isMember: boolean;
  roleIds?: mongoose.Types.ObjectId[];
  roleKeys?: string[];
  isOwner: boolean;
}> {
  const membership = await HubMember.findOne({
    hubId,
    userId,
    status: HubMemberStatus.ACTIVE,
  })
    .populate('roleIds')
    .lean();

  if (!membership) {
    return { isMember: false, isOwner: false };
  }

  const roles = membership.roleIds as unknown as IRole[];
  const roleKeys = roles.map((r) => r.key);

  return {
    isMember: true,
    roleIds: membership.roleIds as mongoose.Types.ObjectId[],
    roleKeys,
    isOwner: roleKeys.includes(SystemRoleKey.OWNER),
  };
}

/**
 * Helper: Check if user has specific permission in hub
 */
export async function checkHubPermission(
  hubId: string | mongoose.Types.ObjectId,
  userId: string | mongoose.Types.ObjectId,
  permissionKey: string,
): Promise<boolean> {
  const access = await checkHubAccess(hubId, userId);

  if (!access.isMember) {
    return false;
  }

  // Owner has all permissions
  if (access.isOwner) {
    return true;
  }

  // Get all roles with permissions
  const membership = await HubMember.findOne({
    hubId,
    userId,
    status: HubMemberStatus.ACTIVE,
  }).populate({
    path: 'roleIds',
    populate: { path: 'permissions' },
  });

  if (!membership) {
    return false;
  }

  const roles = membership.roleIds as unknown as Array<{
    key: string;
    permissions: Array<{ key: string; isActive: boolean }>;
  }>;

  if (!roles || !Array.isArray(roles)) {
    return false;
  }

  // Check if any role has the required permission
  for (const role of roles) {
    if (!role.permissions || !Array.isArray(role.permissions)) {
      continue;
    }

    for (const perm of role.permissions) {
      if (perm.key === permissionKey && perm.isActive !== false) {
        return true;
      }
    }
  }

  return false;
}
