import { env } from '@core/config/env';
import { Hub } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { InvitationLink, InvitationLinkStatus } from '@core/models/InvitationLink';
import { type IRole, Role, RoleScope } from '@core/models/Role';
import { User } from '@core/models/User';
import type {
  HubCreateEmailInvitationsInput,
  HubCreateInvitationLinkInput,
  HubListHubMembersInput,
  HubListInvitationLinksInput,
  HubListPendingInvitationsInput,
  HubUpdateMemberRoleInput,
} from '@schemas/hub';
import { communicationTriggerService } from '@services/communications';
import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

export class HubInvitationService {
  /**
   * Get team member stats for tabs
   * Returns counts for team members, collaborators, pending invitations, and active links
   */
  async getTeamStats(hubId: string): Promise<{
    teamMembers: number;
    collaborators: number;
    pendingInvitations: number;
    activeInvitationLinks: number;
  }> {
    // Get collaborator role ID
    const collaboratorRole = await Role.findOne({
      key: 'collaborator',
      scope: RoleScope.SYSTEM,
    }).select('_id');

    const collaboratorRoleId = collaboratorRole?._id;

    // Run all counts in parallel
    const [teamMembers, collaborators, pendingInvitations, activeInvitationLinks] =
      await Promise.all([
        // Team members: active members who are NOT collaborators
        HubMember.countDocuments({
          hubId,
          status: HubMemberStatus.ACTIVE,
          ...(collaboratorRoleId ? { roleIds: { $ne: collaboratorRoleId } } : {}),
        }),
        // Collaborators: active members with collaborator role
        collaboratorRoleId
          ? HubMember.countDocuments({
              hubId,
              status: HubMemberStatus.ACTIVE,
              roleIds: collaboratorRoleId,
            })
          : 0,
        // Pending invitations
        HubMember.countDocuments({
          hubId,
          status: HubMemberStatus.INVITED,
        }),
        // Active invitation links
        InvitationLink.countDocuments({
          hubId,
          status: InvitationLinkStatus.ACTIVE,
          expiresAt: { $gt: new Date() },
        }),
      ]);

    return {
      teamMembers,
      collaborators,
      pendingInvitations,
      activeInvitationLinks,
    };
  }

  /**
   * Create email invitations
   * Supports two formats:
   * 1. Legacy: { invitations: [{ email, roleKey }] }
   * 2. Simple: { emails: string[], roleId: string }
   */
  async createEmailInvitations(
    hubId: string,
    data: HubCreateEmailInvitationsInput['body'],
    invitedBy: string,
  ) {
    // Verify hub exists
    const hub = await Hub.findById(hubId);
    if (!hub) {
      throw new Error('Hub not found');
    }

    // Normalize input to invitations array
    let invitations: Array<{ email: string; roleKey?: string; roleId?: string; title?: string }>;
    let sharedRole: mongoose.Document | null = null;

    if ('emails' in data && 'roleId' in data) {
      // Simple format: { emails, roleId }
      // Find role by ID
      sharedRole = await Role.findById(data.roleId);
      if (!sharedRole) {
        throw new Error('Role not found');
      }
      invitations = data.emails.map((email) => ({
        email,
        roleId: data.roleId,
      }));
    } else if ('invitations' in data) {
      // Legacy format: { invitations: [{ email, roleKey }] }
      invitations = data.invitations;
    } else {
      throw new Error('Invalid invitation format');
    }

    const createdInvitations = [];
    const errors = [];

    for (const invitation of invitations) {
      try {
        // Find role by key or use shared role
        let role = sharedRole;
        if (!role && invitation.roleKey) {
          role = await Role.findOne({
            key: invitation.roleKey,
            scope: RoleScope.SYSTEM,
          });
        }

        if (!role) {
          errors.push({
            email: invitation.email,
            error: invitation.roleKey ? `Role '${invitation.roleKey}' not found` : 'Role not found',
          });
          continue;
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: invitation.email });

        // Check if already a member or invited in THIS hub
        if (existingUser) {
          const existingMember = await HubMember.findOne({
            hubId,
            userId: existingUser._id,
          });

          if (existingMember) {
            if (existingMember.status === HubMemberStatus.ACTIVE) {
              errors.push({
                email: invitation.email,
                error: 'User is already an active member of this hub',
              });
              continue;
            }

            if (existingMember.status === HubMemberStatus.INVITED) {
              errors.push({
                email: invitation.email,
                error: 'User already has a pending invitation to this hub',
              });
              continue;
            }

            // If status is 'left', we can reactivate with new invitation
          }
        }

        // Generate invitation token
        const token = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        // Create HubMember with invited status
        const member = await HubMember.create({
          hubId,
          userId: existingUser?._id, // May be null if user doesn't exist yet
          roleIds: [role._id], // Array of roles
          status: HubMemberStatus.INVITED,
          invitedBy,
          invitedAt: new Date(),
          invitationToken: token,
          invitationExpiry: expiresAt,
          invitedEmail: invitation.email, // Store the invited email for reference
          title: invitation.title,
        });

        const roleObj = role as { key?: string; name?: string };
        createdInvitations.push({
          _id: member._id,
          email: invitation.email,
          roleKey: roleObj.key || '',
          roleName: roleObj.name || '',
          status: member.status,
          invitationUrl: `${env.AUTH_URL}/join/invite/${token}`,
          expiresAt,
          createdAt: member.createdAt,
        });
      } catch (error) {
        errors.push({
          email: invitation.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Send invitation notifications for successfully created invitations
    for (const invitation of createdInvitations) {
      void this.sendInvitationEmailNotification(
        invitation.email,
        hub.name,
        hubId,
        invitation.roleName,
        invitation.invitationUrl,
        invitation.expiresAt.toISOString(),
      );
    }

    return {
      invited: createdInvitations.length,
      failed: errors.map((e) => e.email),
      invitations: createdInvitations,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Send invitation email notification
   */
  private async sendInvitationEmailNotification(
    email: string,
    hubName: string,
    hubId: string,
    roleName: string,
    invitationUrl: string,
    expiresAt: string,
  ): Promise<void> {
    try {
      // Check if user exists to get their details
      const user = await User.findOne({ email }).select('name email phone').lean();

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'HUB_INVITATION_EMAIL',
        user: user
          ? {
              _id: user._id.toString(),
              name: user.name,
              email: user.email,
              phone: user.phoneNumber,
            }
          : {
              _id: 'new-user',
              name: email.split('@')[0],
              email,
            },
        hubId,
        data: {
          userEmail: email,
          hubName,
          roleName,
          invitationUrl,
          invitationLink: invitationUrl,
          expiresAt,
        },
        channels: ['email'], // Email only for invitations
      });
    } catch (error) {
      console.error('Failed to send invitation email notification:', error);
    }
  }

  /**
   * Accept email invitation
   */
  async acceptEmailInvitation(token: string, userId: string) {
    // Find invitation by token
    const member = await HubMember.findOne({
      invitationToken: token,
    })
      .populate('hubId')
      .populate('roleIds');

    if (!member) {
      throw new Error('Invalid invitation token');
    }

    if (member.status !== HubMemberStatus.INVITED) {
      throw new Error('Invitation already used or cancelled');
    }

    if (member.invitationExpiry && member.invitationExpiry < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Verify user's email matches if user already assigned
    if (member.userId && String(member.userId) !== userId) {
      throw new Error('This invitation is for a different user');
    }

    // Check if user is already a member (in case userId wasn't set initially)
    const existingActive = await HubMember.findOne({
      hubId: member.hubId,
      userId,
      status: HubMemberStatus.ACTIVE,
    });

    if (existingActive) {
      throw new Error('You are already a member of this hub');
    }

    // Update member
    member.userId = new mongoose.Types.ObjectId(userId) as unknown as mongoose.Types.ObjectId;
    member.status = HubMemberStatus.ACTIVE;
    member.joinedAt = new Date();
    member.invitationToken = undefined; // Clear token for security
    await member.save();

    // Send notification about new member joining
    void this.sendMemberJoinedNotification(userId, member.hubId as unknown as string);

    return {
      member,
      hub: member.hubId,
      roles: member.roleIds,
    };
  }

  /**
   * Send notification when a member joins via invitation
   */
  private async sendMemberJoinedNotification(userId: string, hubId: string): Promise<void> {
    try {
      const [user, hub, member] = await Promise.all([
        User.findById(userId).select('name email').lean(),
        Hub.findById(hubId).select('name ownerId').lean(),
        HubMember.findOne({ hubId, userId })
          .populate<{ roleIds: Array<{ name: string }> }>('roleIds', 'name')
          .lean(),
      ]);

      if (!user || !hub) return;

      // Notify hub owner about new member
      const owner = await User.findById(hub.ownerId).select('name email phone').lean();
      if (!owner) return;

      // Format role name for display
      const firstRole = member?.roleIds?.[0];
      const roleName = firstRole?.name || 'Member';

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'HUB_MEMBER_JOINED',
        user: {
          _id: owner._id.toString(),
          name: owner.name,
          email: owner.email,
          phone: owner.phoneNumber,
        },
        hubId,
        data: {
          userName: owner.name,
          memberName: user.name,
          newMemberName: user.name,
          newMemberEmail: user.email,
          hubName: hub.name,
          roleName,
        },
        channels: ['inApp'], // InApp only for member joined
      });
    } catch (error) {
      console.error('Failed to send member joined notification:', error);
    }
  }

  /**
   * Create invitation link
   * Accepts either roleKey or roleId
   */
  async createInvitationLink(
    hubId: string,
    data: HubCreateInvitationLinkInput['body'],
    createdBy: string,
  ) {
    // Verify hub exists
    const hub = await Hub.findById(hubId);
    if (!hub) {
      throw new Error('Hub not found');
    }

    // Find role by ID or key
    let role: IRole | null = null;
    if (data.roleId) {
      role = await Role.findById(data.roleId);
    } else if (data.roleKey) {
      role = await Role.findOne({
        key: data.roleKey,
        scope: RoleScope.SYSTEM,
      });
    }

    if (!role) {
      throw new Error('Role not found');
    }

    // Generate token
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays ?? 30));

    // Create link
    const link = await InvitationLink.create({
      hubId,
      roleIds: [role._id], // Array of roles
      token,
      maxUses: data.maxUses,
      usedCount: 0,
      status: InvitationLinkStatus.ACTIVE,
      createdBy,
      expiresAt,
    });

    const populated = await link.populate('roleIds');

    return {
      ...populated.toObject(),
      link: `${env.AUTH_URL}/join/link/${token}`,
      url: `${env.AUTH_URL}/join/link/${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Join via invitation link
   */
  async joinViaLink(token: string, userId: string) {
    // Find link
    const link = await InvitationLink.findOne({ token }).populate('hubId').populate('roleIds');

    if (!link) {
      throw new Error('Invalid invitation link');
    }

    if (link.status !== InvitationLinkStatus.ACTIVE) {
      throw new Error('Invitation link is no longer active');
    }

    if (link.expiresAt < new Date()) {
      // Auto-expire
      link.status = InvitationLinkStatus.EXPIRED;
      await link.save();
      throw new Error('Invitation link has expired');
    }

    if (link.maxUses && link.usedCount >= link.maxUses) {
      throw new Error('Invitation link has reached maximum uses');
    }

    // Check if user is already a member
    const existingMember = await HubMember.findOne({
      hubId: link.hubId,
      userId,
    });

    if (existingMember) {
      if (existingMember.status === HubMemberStatus.ACTIVE) {
        throw new Error('You are already a member of this hub');
      }

      if (existingMember.status === HubMemberStatus.INVITED) {
        // Activate existing invitation
        existingMember.status = HubMemberStatus.ACTIVE;
        existingMember.joinedAt = new Date();
        await existingMember.save();

        // Increment link usage
        link.usedCount += 1;
        await link.save();

        return {
          member: existingMember,
          hub: link.hubId,
          roles: link.roleIds,
        };
      }

      if (existingMember.status === HubMemberStatus.LEFT) {
        // Reactivate
        existingMember.status = HubMemberStatus.ACTIVE;
        existingMember.joinedAt = new Date();
        await existingMember.save();

        // Increment link usage
        link.usedCount += 1;
        await link.save();

        return {
          member: existingMember,
          hub: link.hubId,
          roles: link.roleIds,
        };
      }
    }

    // Create new member - extract IDs from populated objects
    const hubIdValue =
      typeof link.hubId === 'object' && link.hubId !== null
        ? (link.hubId as { _id: unknown })._id
        : link.hubId;
    const roleIdValues = (link.roleIds || []).map((role) =>
      typeof role === 'object' && role !== null ? (role as { _id: unknown })._id : role,
    );

    const member = await HubMember.create({
      hubId: hubIdValue,
      userId,
      roleIds: roleIdValues, // Array of role IDs
      status: HubMemberStatus.ACTIVE,
      invitedBy: link.createdBy,
      joinedAt: new Date(),
    });

    // Increment link usage
    link.usedCount += 1;
    await link.save();

    // Send notification about new member joining (hubIdValue already declared above)
    void this.sendMemberJoinedNotification(userId, hubIdValue as string);

    return {
      member,
      hub: link.hubId,
      roles: link.roleIds,
    };
  }

  /**
   * List hub members
   */
  async listMembers(hubId: string, query: HubListHubMembersInput['querystring']) {
    const { status, roleKey, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hubId };
    if (status) filter.status = status;

    // If searching by roleKey, find role first
    if (roleKey) {
      const role = await Role.findOne({
        key: roleKey,
        scope: RoleScope.SYSTEM,
      });
      if (role) {
        filter.roleIds = role._id; // MongoDB will check if role._id is in the roleIds array
      }
    }

    // Build search filter for user
    let userMatch: Record<string, unknown> = {};
    if (search) {
      userMatch = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const [members, total] = await Promise.all([
      HubMember.find(filter)
        .populate({
          path: 'userId',
          select: 'name email profilePhoto bio',
          match: Object.keys(userMatch).length > 0 ? userMatch : undefined,
        })
        .populate({
          path: 'roleIds',
          select: 'key name description permissions',
          populate: {
            path: 'permissions',
            select: 'key',
          },
        })
        .populate('invitedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HubMember.countDocuments(filter),
    ]);

    // Filter out members where userId is null (didn't match search)
    // Transform to include rolePermissions (flattened from all roles)
    const filteredMembers = members
      .filter((m) => m.userId)
      .map((m) => {
        // Flatten permissions from all roles
        const rolePermissions: string[] = [];
        if (Array.isArray(m.roleIds)) {
          for (const role of m.roleIds) {
            if (role && typeof role === 'object' && 'permissions' in role) {
              const roleObj = role as { permissions?: Array<{ key?: string } | string> };
              if (Array.isArray(roleObj.permissions)) {
                for (const perm of roleObj.permissions) {
                  // Handle both populated permissions (objects with key) and string keys
                  const permKey = typeof perm === 'object' && perm !== null ? perm.key : perm;
                  if (
                    permKey &&
                    typeof permKey === 'string' &&
                    !rolePermissions.includes(permKey)
                  ) {
                    rolePermissions.push(permKey);
                  }
                }
              }
            }
          }
        }
        return {
          ...m,
          rolePermissions, // Computed: default permissions from all assigned roles
          // permissions: m.permissions - already exists from model (custom override)
        };
      });

    return {
      members: filteredMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * List pending invitations
   */
  async listPendingInvitations(
    hubId: string,
    query: HubListPendingInvitationsInput['querystring'],
  ) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const filter = {
      hubId,
      status: HubMemberStatus.INVITED,
    };

    const [invitations, total] = await Promise.all([
      HubMember.find(filter)
        .populate('roleIds', 'key name description')
        .populate('invitedBy', 'name email')
        .sort({ invitedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HubMember.countDocuments(filter),
    ]);

    return {
      invitations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update member role
   * Note: This replaces all roles with the new role. For adding/removing individual roles,
   * use addMemberRole/removeMemberRole from hubMemberService.
   */
  async updateMemberRole(memberId: string, data: HubUpdateMemberRoleInput['body']) {
    const member = await HubMember.findById(memberId).populate('roleIds');
    if (!member) {
      throw new Error('Member not found');
    }

    // Capture old role name before changing
    let oldRoleName: string | undefined;
    if (member.roleIds && member.roleIds.length > 0) {
      const oldRole = member.roleIds[0] as unknown as { name?: string };
      oldRoleName = oldRole?.name;
    }

    // Find role by key if provided
    let newRoleName: string | undefined;
    if (data.roleKey) {
      const role = await Role.findOne({
        key: data.roleKey,
        scope: RoleScope.SYSTEM,
      });

      if (!role) {
        throw new Error(`Role '${data.roleKey}' not found`);
      }

      // Check if this is the hub owner (prevent role change)
      const hub = await Hub.findById(member.hubId);
      if (hub && String(hub.ownerId) === String(member.userId)) {
        throw new Error('Cannot change role of hub owner');
      }

      member.roleIds = [role._id as unknown as mongoose.Types.ObjectId];
      newRoleName = role.name;
    }

    if (data.title !== undefined) {
      member.title = data.title;
    }

    await member.save();

    // Send notification about role change
    if (newRoleName && member.userId) {
      void this.sendRoleChangedNotification(
        member.userId.toString(),
        member.hubId.toString(),
        newRoleName,
        oldRoleName,
      );
    }

    return await member.populate(['roleIds', 'userId']);
  }

  /**
   * Send notification when a member's role is changed
   */
  private async sendRoleChangedNotification(
    userId: string,
    hubId: string,
    newRoleName: string,
    oldRoleName?: string,
  ): Promise<void> {
    try {
      const [user, hub] = await Promise.all([
        User.findById(userId).select('name email phone').lean(),
        Hub.findById(hubId).select('name').lean(),
      ]);

      if (!user || !hub) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'ROLE_CHANGED',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        },
        hubId,
        data: {
          userName: user.name,
          hubName: hub.name,
          oldRole: oldRoleName || 'Previous Role',
          newRole: newRoleName,
          newRoleName,
        },
        channels: ['email', 'inApp'],
      });
    } catch (error) {
      console.error('Failed to send role changed notification:', error);
    }
  }

  /**
   * Update member custom permissions
   * When permissions are set, they override the default role permissions.
   * Pass undefined/null to reset to role-based permissions.
   */
  async updateMemberPermissions(memberId: string, permissions: string[] | null) {
    const member = await HubMember.findById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    if (member.status !== HubMemberStatus.ACTIVE) {
      throw new Error('Can only update permissions for active members');
    }

    // Check if this is the hub owner (prevent permission change)
    const hub = await Hub.findById(member.hubId);
    if (hub && String(hub.ownerId) === String(member.userId)) {
      throw new Error('Cannot change permissions of hub owner');
    }

    // Log before update
    console.log('[PERM-SERVICE] Updating permissions:', {
      memberId,
      currentPermissions: member.permissions,
      newPermissions: permissions,
      permissionsCount: permissions?.length || 0,
    });

    // Set permissions (null/undefined removes custom permissions, array sets them)
    if (permissions === null || permissions === undefined) {
      member.permissions = undefined;
    } else {
      member.permissions = permissions;
    }

    // Explicitly mark permissions as modified to ensure Mongoose tracks the change
    // This is needed because the field has default: undefined
    member.markModified('permissions');

    await member.save();

    // Verify save
    const saved = await HubMember.findById(memberId);
    console.log('[PERM-SERVICE] Permissions saved:', {
      memberId,
      savedPermissions: saved?.permissions,
      savedPermissionsCount: saved?.permissions?.length || 0,
    });

    return await member.populate(['roleIds', 'userId']);
  }

  /**
   * Remove member
   */
  async removeMember(memberId: string) {
    const member = await HubMember.findById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    // Check if this is the hub owner
    const hub = await Hub.findById(member.hubId);
    if (hub && String(hub.ownerId) === String(member.userId)) {
      throw new Error('Cannot remove hub owner');
    }

    // Soft delete - set status to 'left'
    member.status = HubMemberStatus.LEFT;
    await member.save();

    // Send notification about removal
    if (member.userId) {
      void this.sendMemberRemovedNotification(
        member.userId.toString(),
        member.hubId.toString(),
        hub?.name || 'the hub',
      );
    }

    return { message: 'Member removed successfully' };
  }

  /**
   * Send notification when a member is removed from a hub
   */
  private async sendMemberRemovedNotification(
    userId: string,
    hubId: string,
    hubName: string,
    reason?: string,
  ): Promise<void> {
    try {
      const user = await User.findById(userId).select('name email phone').lean();
      if (!user) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'MEMBER_REMOVED',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        },
        hubId,
        data: {
          userName: user.name,
          hubName,
          removalReason: reason || '',
        },
        channels: ['email', 'inApp'],
      });
    } catch (error) {
      console.error('Failed to send member removed notification:', error);
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(memberId: string) {
    const member = await HubMember.findById(memberId).select('+invitedEmail');
    if (!member) {
      throw new Error('Invitation not found');
    }

    if (member.status !== HubMemberStatus.INVITED) {
      throw new Error('Can only cancel pending invitations');
    }

    // Get details before deletion for notification
    const invitedEmail = (member as unknown as { invitedEmail?: string }).invitedEmail;
    const hubId = member.hubId.toString();

    // Delete the invitation
    await HubMember.findByIdAndDelete(memberId);

    // Send cancellation notification if we have an email
    if (invitedEmail) {
      void this.sendInvitationCancelledNotification(invitedEmail, hubId);
    }

    return { message: 'Invitation cancelled successfully' };
  }

  /**
   * Send notification when an invitation is cancelled
   */
  private async sendInvitationCancelledNotification(email: string, hubId: string): Promise<void> {
    try {
      const [user, hub] = await Promise.all([
        User.findOne({ email }).select('name email phone').lean(),
        Hub.findById(hubId).select('name').lean(),
      ]);

      if (!hub) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'INVITATION_CANCELLED',
        user: user
          ? {
              _id: user._id.toString(),
              name: user.name,
              email: user.email,
              phone: user.phoneNumber,
            }
          : {
              _id: 'cancelled-invite',
              name: email.split('@')[0],
              email,
            },
        hubId,
        data: {
          userEmail: email,
          hubName: hub.name,
        },
        channels: ['email'],
      });
    } catch (error) {
      console.error('Failed to send invitation cancelled notification:', error);
    }
  }

  /**
   * List invitation links
   */
  async listInvitationLinks(hubId: string, query: HubListInvitationLinksInput['querystring']) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hubId };
    if (status) filter.status = status;

    const [links, total] = await Promise.all([
      InvitationLink.find(filter)
        .populate('roleIds', 'key name description')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InvitationLink.countDocuments(filter),
    ]);

    // Add URL to each link
    const linksWithUrl = links.map((link) => ({
      ...link,
      url: `${env.AUTH_URL}/join/link/${link.token}`,
    }));

    return {
      links: linksWithUrl,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Disable invitation link
   */
  async disableInvitationLink(linkId: string) {
    const link = await InvitationLink.findById(linkId);
    if (!link) {
      throw new Error('Invitation link not found');
    }

    link.status = InvitationLinkStatus.DISABLED;
    await link.save();

    return { message: 'Invitation link disabled successfully' };
  }

  /**
   * Get invitation info by token (public - no auth required)
   * Used by the Auth App to display invitation details before login
   */
  async getInvitationInfo(token: string): Promise<{
    type: 'email' | 'link';
    isValid: boolean;
    isExpired: boolean;
    hubId: string;
    hubName: string;
    hubLogo: string | null;
    hubSlug: string;
    roleName: string;
    roleKey: string;
    invitedEmail?: string;
    invitedByName?: string;
    expiresAt: string;
    userExists?: boolean;
  }> {
    // First try to find as email invitation (HubMember with token)
    // Need to explicitly select invitationToken since it has select: false
    const emailInvitation = await HubMember.findOne({
      invitationToken: token,
    })
      .select('+invitationToken +invitedEmail')
      .populate<{ hubId: { _id: string; name: string; logo?: string; slug: string } }>(
        'hubId',
        'name logo slug',
      )
      .populate<{ roleIds: Array<{ key: string; name: string }> }>('roleIds', 'key name')
      .populate<{ invitedBy: { name: string } }>('invitedBy', 'name')
      .lean();

    if (emailInvitation) {
      const hub = emailInvitation.hubId;
      const role = Array.isArray(emailInvitation.roleIds) ? emailInvitation.roleIds[0] : null;
      const invitedBy = emailInvitation.invitedBy;

      // Get the invited email from the stored field or from the linked user
      const invitedEmailFromModel = (emailInvitation as unknown as { invitedEmail?: string })
        .invitedEmail;
      let invitedEmail: string | undefined = invitedEmailFromModel;
      let userExists = false;

      if (emailInvitation.userId) {
        // User already assigned to invitation - get their email
        const user = await User.findById(emailInvitation.userId).select('email').lean();
        if (user?.email) {
          invitedEmail = user.email;
        }
        userExists = true;
      } else if (invitedEmail) {
        // Check if an account exists for the invited email
        const existingUser = await User.findOne({ email: invitedEmail.toLowerCase() })
          .select('_id')
          .lean();
        userExists = !!existingUser;
      }

      const isExpired = emailInvitation.invitationExpiry
        ? new Date(emailInvitation.invitationExpiry) < new Date()
        : false;
      const isValid = emailInvitation.status === HubMemberStatus.INVITED && !isExpired;

      return {
        type: 'email',
        isValid,
        isExpired,
        hubId: String(hub._id),
        hubName: hub.name,
        hubLogo: hub.logo || null,
        hubSlug: hub.slug,
        roleName: role?.name || 'Member',
        roleKey: role?.key || 'member',
        invitedEmail,
        invitedByName: invitedBy?.name,
        expiresAt: emailInvitation.invitationExpiry
          ? new Date(emailInvitation.invitationExpiry).toISOString()
          : '',
        userExists,
      };
    }

    // Try to find as link invitation
    const linkInvitation = await InvitationLink.findOne({ token })
      .populate<{ hubId: { _id: string; name: string; logo?: string; slug: string } }>(
        'hubId',
        'name logo slug',
      )
      .populate<{ roleIds: Array<{ key: string; name: string }> }>('roleIds', 'key name')
      .populate<{ createdBy: { name: string } }>('createdBy', 'name')
      .lean();

    if (linkInvitation) {
      const hub = linkInvitation.hubId;
      const role = Array.isArray(linkInvitation.roleIds) ? linkInvitation.roleIds[0] : null;
      const createdBy = linkInvitation.createdBy;

      const isExpired = new Date(linkInvitation.expiresAt) < new Date();
      const isMaxedOut = linkInvitation.maxUses
        ? linkInvitation.usedCount >= linkInvitation.maxUses
        : false;
      const isValid =
        linkInvitation.status === InvitationLinkStatus.ACTIVE && !isExpired && !isMaxedOut;

      return {
        type: 'link',
        isValid,
        isExpired,
        hubId: String(hub._id),
        hubName: hub.name,
        hubLogo: hub.logo || null,
        hubSlug: hub.slug,
        roleName: role?.name || 'Member',
        roleKey: role?.key || 'member',
        invitedByName: createdBy?.name,
        expiresAt: new Date(linkInvitation.expiresAt).toISOString(),
      };
    }

    // Token not found
    return {
      type: 'email',
      isValid: false,
      isExpired: false,
      hubId: '',
      hubName: '',
      hubLogo: null,
      hubSlug: '',
      roleName: '',
      roleKey: '',
      expiresAt: '',
    };
  }

  /**
   * Check if an email has an existing user account
   */
  async checkUserExists(email: string): Promise<boolean> {
    const user = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();
    return !!user;
  }
}

export const hubInvitationService = new HubInvitationService();
