import type { PermissionKey } from '@core/constants';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import type { IRole } from '@core/models/Role';
import { User } from '@core/models/User';
import { getUserId } from '@core/utils/auth-helpers';
import type { FastifyReply, FastifyRequest } from 'fastify';
import mongoose from 'mongoose';

/**
 * Hub context attached to request after loadHubContext middleware
 */
export interface HubContext {
  hubId: string;
  userId: string;
  userEmail: string;
  isOwner: boolean;
  permissions: string[];
  roles: string[];
}

// Extend FastifyRequest to include hubContext
declare module 'fastify' {
  interface FastifyRequest {
    hubContext?: HubContext;
  }
}

/**
 * Middleware to load hub context (ownership, permissions) for the user
 * This should be used as a preHandler for all hub routes
 * Attaches hubContext to request for use in handlers
 */
export async function loadHubContext(request: FastifyRequest, reply: FastifyReply) {
  const { hubId } = request.params as { hubId: string };
  const userId = getUserId(request);

  try {
    // Get user email for collaborator experience filtering
    const user = await User.findById(userId).select('email').lean();
    const userEmail = user?.email ?? '';

    // Find member with all their roles
    // Note: Convert to ObjectId explicitly for proper querying
    const member = await HubMember.findOne({
      hubId: new mongoose.Types.ObjectId(hubId),
      userId: new mongoose.Types.ObjectId(userId),
      status: HubMemberStatus.ACTIVE,
    }).populate({
      path: 'roleIds',
      populate: {
        path: 'permissions',
        select: 'key',
      },
    });

    if (!member) {
      // Not a member - set empty permissions
      request.hubContext = {
        hubId,
        userId,
        userEmail,
        isOwner: false,
        permissions: [],
        roles: [],
      };
      return;
    }

    // Get all roles with their permissions
    const roles = member.roleIds as unknown as Array<
      IRole & { permissions: Array<{ key: string }> }
    >;

    // Collect all permission keys from all roles
    const permissionKeys = new Set<string>();
    const roleNames: string[] = [];

    for (const role of roles) {
      roleNames.push(role.key);
      if (role.permissions) {
        for (const permission of role.permissions) {
          permissionKeys.add(permission.key);
        }
      }
    }

    // Check if user has owner role
    const isOwner = roleNames.includes('owner');

    request.hubContext = {
      hubId,
      userId,
      userEmail,
      isOwner,
      permissions: Array.from(permissionKeys),
      roles: roleNames,
    };
  } catch (error) {
    request.log.error({ error, hubId, userId }, 'Failed to load hub context');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'HUB_CONTEXT_ERROR',
        message: 'Failed to load hub context',
      },
    });
  }
}

/**
 * Middleware to check if user has a specific permission in a hub
 * Requires loadHubContext to be called first
 * @param permissionKey - The permission key to check (e.g., 'analytics.view')
 */
export function requireHubPermission(permissionKey: PermissionKey) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const hubContext = request.hubContext;

    if (!hubContext) {
      request.log.error('requireHubPermission called without loadHubContext');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'MIDDLEWARE_ERROR',
          message: 'Hub context not loaded',
        },
      });
    }

    // Owner has all permissions
    if (hubContext.isOwner) {
      return;
    }

    // Check if user has the required permission
    if (!hubContext.permissions.includes(permissionKey)) {
      // Log missing permission for debugging
      request.log.warn(
        {
          userId,
          hubId: hubContext.hubId,
          requiredPermission: permissionKey,
          userPermissions: hubContext.permissions,
          userRoles: hubContext.roles,
        },
        'Permission denied - missing required permission',
      );

      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Missing permission: ${permissionKey}`,
          missingPermission: permissionKey,
        },
      });
    }
  };
}

/**
 * Middleware to require any of the specified permissions
 * @param permissionKeys - Array of permission keys (user needs at least one)
 */
export function requireAnyHubPermission(permissionKeys: PermissionKey[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const hubContext = request.hubContext;

    if (!hubContext) {
      request.log.error('requireAnyHubPermission called without loadHubContext');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'MIDDLEWARE_ERROR',
          message: 'Hub context not loaded',
        },
      });
    }

    // Owner has all permissions
    if (hubContext.isOwner) {
      return;
    }

    // Check if user has any of the required permissions
    const hasAny = permissionKeys.some((key) => hubContext.permissions.includes(key));

    if (!hasAny) {
      request.log.warn(
        {
          userId,
          hubId: hubContext.hubId,
          requiredPermissions: permissionKeys,
          userPermissions: hubContext.permissions,
          userRoles: hubContext.roles,
        },
        'Permission denied - missing all required permissions',
      );

      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Missing permissions: ${permissionKeys.join(' or ')}`,
          missingPermissions: permissionKeys,
        },
      });
    }
  };
}

/**
 * Middleware to require hub membership (not necessarily permissions)
 * Requires loadHubContext to be called first
 */
export async function requireHubAccess(request: FastifyRequest, reply: FastifyReply) {
  const hubContext = request.hubContext;

  if (!hubContext) {
    request.log.error('requireHubAccess called without loadHubContext');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'MIDDLEWARE_ERROR',
        message: 'Hub context not loaded',
      },
    });
  }

  // Owner always has access
  if (hubContext.isOwner) {
    return;
  }

  // Check if user has any role (is a member)
  if (hubContext.roles.length === 0) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'NOT_HUB_MEMBER',
        message: 'You are not a member of this hub',
      },
    });
  }
}

/**
 * Middleware to check if user is a member of the hub (any status)
 */
export async function requireHubMembership(request: FastifyRequest, reply: FastifyReply) {
  const { hubId } = request.params as { hubId: string };
  const userId = getUserId(request);

  try {
    const member = await HubMember.findOne({
      hubId: new mongoose.Types.ObjectId(hubId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!member) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'NOT_HUB_MEMBER',
          message: 'You are not a member of this hub',
        },
      });
    }

    if (member.status !== HubMemberStatus.ACTIVE) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'MEMBER_INACTIVE',
          message: `Your membership status is: ${member.status}`,
        },
      });
    }
  } catch (error) {
    request.log.error({ error, hubId, userId }, 'Membership check error');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'MEMBERSHIP_CHECK_ERROR',
        message: 'Failed to verify membership',
      },
    });
  }
}
