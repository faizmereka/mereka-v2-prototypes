import crypto from 'node:crypto';
import { Hub } from '@core/models/Hub';
import { HubMember, HubMemberStatus, type IHubMember } from '@core/models/HubMember';
import { Role, RoleScope, SystemRoleKey } from '@core/models/Role';
import { User } from '@core/models/User';
import { communicationTriggerService } from '@services/communications';
import type mongoose from 'mongoose';

/**
 * HubMember Service
 * Manages hub memberships and roles (using Role collection)
 */
export class HubMemberService {
  /**
   * Get system role by key
   */
  private async getSystemRoleId(key: SystemRoleKey): Promise<mongoose.Types.ObjectId> {
    const role = await Role.findOne({ key, scope: RoleScope.SYSTEM, isActive: true });
    if (!role) {
      throw new Error(`System role '${key}' not found. Run seed script to create default roles.`);
    }
    return role._id as mongoose.Types.ObjectId;
  }

  /**
   * Add owner to hub (called when hub is created)
   */
  async addOwner(
    hubId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
  ): Promise<IHubMember> {
    const ownerRoleId = await this.getSystemRoleId(SystemRoleKey.OWNER);

    const membership = await HubMember.create({
      hubId,
      userId,
      roleIds: [ownerRoleId],
      status: HubMemberStatus.ACTIVE,
      joinedAt: new Date(),
    });

    return membership;
  }

  /**
   * Get all members of a hub
   */
  async getHubMembers(
    hubId: string | mongoose.Types.ObjectId,
    options?: {
      status?: HubMemberStatus;
      roleId?: string | mongoose.Types.ObjectId; // Filter by members who have this role
      includeUserDetails?: boolean;
    },
  ) {
    const filter: Record<string, unknown> = { hubId };

    if (options?.status) {
      filter.status = options.status;
    }

    if (options?.roleId) {
      filter.roleIds = options.roleId; // MongoDB $in is implicit for array fields
    }

    const query = HubMember.find(filter).sort({ createdAt: -1 });

    if (options?.includeUserDetails) {
      query.populate('userId', 'name email profilePhoto');
      query.populate('invitedBy', 'name email');
      query.populate('roleIds', 'key name');
    }

    return query.lean();
  }

  /**
   * Get user's hub memberships (all hubs the user is part of)
   */
  async getUserHubs(
    userId: string | mongoose.Types.ObjectId,
    options?: {
      status?: HubMemberStatus;
      includeHubDetails?: boolean;
    },
  ) {
    const filter: Record<string, unknown> = { userId };

    if (options?.status) {
      filter.status = options.status;
    } else {
      filter.status = HubMemberStatus.ACTIVE; // Default to active only
    }

    const query = HubMember.find(filter).sort({ createdAt: -1 });

    if (options?.includeHubDetails) {
      query.populate('hubId', 'name slug logo status');
      query.populate('roleIds', 'key name');
    }

    return query.lean();
  }

  /**
   * Get specific membership
   */
  async getMembership(
    hubId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
  ) {
    return HubMember.findOne({ hubId, userId }).populate('roleIds', 'key name').lean();
  }

  /**
   * Invite user to hub
   */
  async inviteUser(params: {
    hubId: string | mongoose.Types.ObjectId;
    email: string;
    roleIds: Array<string | mongoose.Types.ObjectId>; // Array of role IDs
    invitedBy: string | mongoose.Types.ObjectId;
    title?: string;
    department?: string;
  }): Promise<IHubMember> {
    // Check if user exists
    const user = await User.findOne({ email: params.email.toLowerCase() });

    if (!user) {
      throw new Error('User not found with this email');
    }

    // Check if already a member
    const existing = await HubMember.findOne({
      hubId: params.hubId,
      userId: user._id,
    });

    if (existing) {
      if (existing.status === HubMemberStatus.ACTIVE) {
        throw new Error('User is already a member of this hub');
      }
      if (existing.status === HubMemberStatus.INVITED) {
        throw new Error('User has already been invited');
      }
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiry = new Date();
    invitationExpiry.setDate(invitationExpiry.getDate() + 7); // 7 days expiry

    // Create or update membership
    const membership = await HubMember.findOneAndUpdate(
      { hubId: params.hubId, userId: user._id },
      {
        roleIds: params.roleIds,
        status: HubMemberStatus.INVITED,
        invitedBy: params.invitedBy,
        invitedAt: new Date(),
        invitationToken,
        invitationExpiry,
        title: params.title,
        department: params.department,
      },
      { upsert: true, new: true },
    );

    // TODO: Send invitation email with token
    // await emailService.sendHubInvitation(user.email, invitationToken);

    return membership;
  }

  /**
   * Accept hub invitation
   */
  async acceptInvitation(invitationToken: string): Promise<IHubMember> {
    const membership = await HubMember.findOne({
      invitationToken,
      status: HubMemberStatus.INVITED,
    });

    if (!membership) {
      throw new Error('Invalid or expired invitation');
    }

    if (membership.invitationExpiry && membership.invitationExpiry < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Update membership status
    membership.status = HubMemberStatus.ACTIVE;
    membership.joinedAt = new Date();
    membership.invitationToken = undefined;
    membership.invitationExpiry = undefined;

    await membership.save();

    return membership;
  }

  /**
   * Update member roles (replace all roles)
   */
  async updateMemberRoles(
    hubId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    newRoleIds: Array<string | mongoose.Types.ObjectId>,
  ): Promise<IHubMember> {
    const membership = await HubMember.findOne({ hubId, userId }).populate('roleIds');

    if (!membership) {
      throw new Error('Member not found');
    }

    // Get current role keys
    const currentRoles = membership.roleIds as unknown as Array<{
      key: string;
      _id: mongoose.Types.ObjectId;
    }>;
    const hasOwnerRole = currentRoles.some((r) => r.key === SystemRoleKey.OWNER);

    // Check new roles
    const newRoles = await Role.find({ _id: { $in: newRoleIds } });
    const newHasOwnerRole = newRoles.some((r) => r.key === SystemRoleKey.OWNER);

    // Prevent removing owner role if this is the last owner
    if (hasOwnerRole && !newHasOwnerRole) {
      const ownerRole = await Role.findOne({ key: SystemRoleKey.OWNER, scope: RoleScope.SYSTEM });
      if (ownerRole) {
        const ownerCount = await HubMember.countDocuments({
          hubId,
          roleIds: ownerRole._id,
          status: HubMemberStatus.ACTIVE,
        });

        if (ownerCount <= 1) {
          throw new Error(
            'Cannot remove owner role from the last owner. Assign another owner first.',
          );
        }
      }
    }

    membership.roleIds = newRoleIds as mongoose.Types.ObjectId[];
    await membership.save();

    return membership;
  }

  /**
   * Add role to member
   */
  async addMemberRole(
    hubId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    roleId: string | mongoose.Types.ObjectId,
  ): Promise<IHubMember> {
    const membership = await HubMember.findOne({ hubId, userId });

    if (!membership) {
      throw new Error('Member not found');
    }

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    // Add role if not already present
    const roleIdStr = roleId.toString();
    const hasRole = membership.roleIds.some((r) => r.toString() === roleIdStr);

    if (!hasRole) {
      membership.roleIds.push(roleId as mongoose.Types.ObjectId);
      await membership.save();
    }

    return membership;
  }

  /**
   * Remove role from member
   */
  async removeMemberRole(
    hubId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    roleId: string | mongoose.Types.ObjectId,
  ): Promise<IHubMember> {
    const membership = await HubMember.findOne({ hubId, userId }).populate('roleIds');

    if (!membership) {
      throw new Error('Member not found');
    }

    // Check if this is the owner role
    const roleToRemove = await Role.findById(roleId);
    if (roleToRemove?.key === SystemRoleKey.OWNER) {
      const ownerRole = await Role.findOne({ key: SystemRoleKey.OWNER, scope: RoleScope.SYSTEM });
      if (ownerRole) {
        const ownerCount = await HubMember.countDocuments({
          hubId,
          roleIds: ownerRole._id,
          status: HubMemberStatus.ACTIVE,
        });

        if (ownerCount <= 1) {
          throw new Error('Cannot remove owner role from the last owner.');
        }
      }
    }

    // Ensure at least one role remains
    if (membership.roleIds.length <= 1) {
      throw new Error('Member must have at least one role');
    }

    // Remove the role
    const roleIdStr = roleId.toString();
    membership.roleIds = membership.roleIds.filter((r) => r.toString() !== roleIdStr);
    await membership.save();

    return membership;
  }

  /**
   * Remove member from hub
   */
  async removeMember(
    hubId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
  ): Promise<void> {
    const membership = await HubMember.findOne({ hubId, userId }).populate('roleIds');

    if (!membership) {
      throw new Error('Member not found');
    }

    const memberRoles = membership.roleIds as unknown as Array<{ key: string }>;
    const hasOwnerRole = memberRoles.some((r) => r.key === SystemRoleKey.OWNER);

    // Prevent removing last owner
    if (hasOwnerRole) {
      const ownerRole = await Role.findOne({ key: SystemRoleKey.OWNER, scope: RoleScope.SYSTEM });
      if (ownerRole) {
        const ownerCount = await HubMember.countDocuments({
          hubId,
          roleIds: ownerRole._id,
          status: HubMemberStatus.ACTIVE,
        });

        if (ownerCount <= 1) {
          throw new Error('Cannot remove the last owner. Transfer ownership first.');
        }
      }
    }

    // Soft delete - mark as LEFT
    membership.status = HubMemberStatus.LEFT;
    await membership.save();
  }

  /**
   * Suspend member
   */
  async suspendMember(
    hubId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
  ): Promise<IHubMember> {
    const membership = await HubMember.findOne({ hubId, userId }).populate('roleIds');

    if (!membership) {
      throw new Error('Member not found');
    }

    const memberRoles = membership.roleIds as unknown as Array<{ key: string }>;
    const hasOwnerRole = memberRoles.some((r) => r.key === SystemRoleKey.OWNER);

    if (hasOwnerRole) {
      throw new Error('Cannot suspend an owner');
    }

    membership.status = HubMemberStatus.SUSPENDED;
    await membership.save();

    return membership;
  }

  /**
   * Reactivate suspended member
   */
  async reactivateMember(
    hubId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
  ): Promise<IHubMember> {
    const membership = await HubMember.findOne({ hubId, userId });

    if (!membership) {
      throw new Error('Member not found');
    }

    if (membership.status !== HubMemberStatus.SUSPENDED) {
      throw new Error('Member is not suspended');
    }

    membership.status = HubMemberStatus.ACTIVE;
    await membership.save();

    return membership;
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(
    hubId: string | mongoose.Types.ObjectId,
    currentOwnerId: string | mongoose.Types.ObjectId,
    newOwnerId: string | mongoose.Types.ObjectId,
  ): Promise<void> {
    const ownerRoleId = await this.getSystemRoleId(SystemRoleKey.OWNER);
    const adminRoleId = await this.getSystemRoleId(SystemRoleKey.ADMIN);

    // Find both memberships
    const [currentOwner, newOwner] = await Promise.all([
      HubMember.findOne({ hubId, userId: currentOwnerId }).populate('roleIds'),
      HubMember.findOne({ hubId, userId: newOwnerId }),
    ]);

    const currentOwnerRoles = currentOwner?.roleIds as unknown as Array<{
      key: string;
      _id: mongoose.Types.ObjectId;
    }>;
    const hasOwnerRole = currentOwnerRoles?.some((r) => r.key === SystemRoleKey.OWNER);

    if (!currentOwner || !hasOwnerRole) {
      throw new Error('Current owner not found');
    }

    if (!newOwner || newOwner.status !== HubMemberStatus.ACTIVE) {
      throw new Error('New owner must be an active member');
    }

    // Remove owner role from current owner, add admin if not present
    const ownerRoleIdStr = ownerRoleId.toString();
    currentOwner.roleIds = currentOwner.roleIds.filter((r) => r.toString() !== ownerRoleIdStr);
    const hasAdminRole = currentOwner.roleIds.some((r) => r.toString() === adminRoleId.toString());
    if (!hasAdminRole) {
      currentOwner.roleIds.push(adminRoleId);
    }

    // Add owner role to new owner
    const newOwnerHasOwner = newOwner.roleIds.some((r) => r.toString() === ownerRoleIdStr);
    if (!newOwnerHasOwner) {
      newOwner.roleIds.push(ownerRoleId);
    }

    await Promise.all([currentOwner.save(), newOwner.save()]);

    // Send notifications about ownership transfer
    void this.sendOwnershipTransferredNotifications(
      hubId as string,
      currentOwnerId as string,
      newOwnerId as string,
    );
  }

  /**
   * Send notifications when ownership is transferred
   */
  private async sendOwnershipTransferredNotifications(
    hubId: string,
    previousOwnerId: string,
    newOwnerId: string,
  ): Promise<void> {
    try {
      const [hub, previousOwner, newOwner] = await Promise.all([
        Hub.findById(hubId).select('name').lean(),
        User.findById(previousOwnerId).select('name email phone').lean(),
        User.findById(newOwnerId).select('name email phone').lean(),
      ]);

      if (!hub || !previousOwner || !newOwner) return;

      // Notify the new owner
      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'OWNERSHIP_TRANSFERRED',
        user: {
          _id: newOwner._id.toString(),
          name: newOwner.name,
          email: newOwner.email,
          phone: newOwner.phoneNumber,
        },
        hubId,
        data: {
          userName: newOwner.name,
          hubName: hub.name,
          previousOwnerName: previousOwner.name,
          isNewOwner: true,
          transferDetails: `You are now the owner of ${hub.name}. You have full control over all hub settings and members.`,
        },
        channels: ['email', 'inApp'],
      });

      // Notify the previous owner
      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'OWNERSHIP_TRANSFERRED',
        user: {
          _id: previousOwner._id.toString(),
          name: previousOwner.name,
          email: previousOwner.email,
          phone: previousOwner.phoneNumber,
        },
        hubId,
        data: {
          userName: previousOwner.name,
          hubName: hub.name,
          newOwnerName: newOwner.name,
          isNewOwner: false,
          transferDetails: `Ownership has been transferred to ${newOwner.name}. You are no longer the owner of this hub.`,
        },
        channels: ['email', 'inApp'],
      });
    } catch (error) {
      console.error('Failed to send ownership transferred notifications:', error);
    }
  }

  /**
   * Get member count by role
   * Note: A member with multiple roles will be counted once per role
   */
  async getMemberCountByRole(hubId: string | mongoose.Types.ObjectId) {
    const counts = await HubMember.aggregate([
      {
        $match: {
          hubId: typeof hubId === 'string' ? hubId : hubId.toString(),
          status: HubMemberStatus.ACTIVE,
        },
      },
      {
        $unwind: '$roleIds', // Unwind the roleIds array
      },
      {
        $lookup: {
          from: 'roles',
          localField: 'roleIds',
          foreignField: '_id',
          as: 'role',
        },
      },
      {
        $unwind: '$role',
      },
      {
        $group: {
          _id: '$role.key',
          count: { $sum: 1 },
        },
      },
    ]);

    const result: Record<string, number> = {};
    for (const item of counts) {
      result[item._id] = item.count;
    }

    return result;
  }

  /**
   * Check if hub has reached member limit (based on subscription plan)
   */
  async canAddMember(
    hubId: string | mongoose.Types.ObjectId,
    maxMembers: number,
  ): Promise<boolean> {
    const activeCount = await HubMember.countDocuments({
      hubId,
      status: HubMemberStatus.ACTIVE,
    });

    return activeCount < maxMembers;
  }

  /**
   * Check if user is owner of hub
   */
  async isOwner(
    hubId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
  ): Promise<boolean> {
    const ownerRoleId = await this.getSystemRoleId(SystemRoleKey.OWNER);

    const membership = await HubMember.findOne({
      hubId,
      userId,
      roleIds: ownerRoleId, // MongoDB will check if ownerRoleId is in the array
      status: HubMemberStatus.ACTIVE,
    });

    return !!membership;
  }

  /**
   * Check if user has a specific role in hub
   */
  async hasRole(
    hubId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    roleKey: SystemRoleKey,
  ): Promise<boolean> {
    const role = await Role.findOne({ key: roleKey, scope: RoleScope.SYSTEM, isActive: true });
    if (!role) return false;

    const membership = await HubMember.findOne({
      hubId,
      userId,
      roleIds: role._id,
      status: HubMemberStatus.ACTIVE,
    });

    return !!membership;
  }

  /**
   * Get user's role keys in a hub
   */
  async getUserRoleKeys(
    hubId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
  ): Promise<string[]> {
    const membership = await HubMember.findOne({
      hubId,
      userId,
      status: HubMemberStatus.ACTIVE,
    }).populate('roleIds', 'key');

    if (!membership) return [];

    const roles = membership.roleIds as unknown as Array<{ key: string }>;
    return roles.map((r) => r.key);
  }
}

export const hubMemberService = new HubMemberService();
