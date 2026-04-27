import {
  acceptEmailInvitation,
  cancelInvitation,
  createEmailInvitations,
  createInvitationLink,
  disableInvitationLink,
  getInvitationInfo,
  getTeamStats,
  joinViaLink,
  listHubMembers,
  listInvitationLinks,
  listPendingInvitations,
  removeMember,
  updateMemberPermissions,
  updateMemberRole,
} from '@controllers/hub';
import { PERMISSIONS } from '@core/constants';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  loadHubContext,
  requireHubMembership,
  requireHubPermission,
} from '@core/middlewares/hubPermission.middleware';
import {
  hubAcceptEmailInvitationSchema,
  hubCancelInvitationSchema,
  hubCreateEmailInvitationsSchema,
  hubCreateInvitationLinkSchema,
  hubDisableInvitationLinkSchema,
  hubJoinViaLinkSchema,
  hubListHubMembersSchema,
  hubListInvitationLinksSchema,
  hubListPendingInvitationsSchema,
  hubRemoveMemberSchema,
  hubUpdateMemberPermissionsSchema,
  hubUpdateMemberRoleSchema,
} from '@schemas/hub';
import type { FastifyInstance } from 'fastify';

// Shared pagination response schema
const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'number' },
    limit: { type: 'number' },
    total: { type: 'number' },
    totalPages: { type: 'number' },
  },
  additionalProperties: false,
};

export async function hubInvitationRoutes(fastify: FastifyInstance) {
  // ==========================================
  // Email Invitations
  // ==========================================

  /**
   * Create email invitations
   */
  fastify.post('/:hubId/members/invite', {
    schema: {
      tags: ['Hub Invitations'],
      summary: 'Invite users by email to join hub',
      description: 'Send invitation emails to users with specified role',
      params: hubCreateEmailInvitationsSchema.params,
      body: hubCreateEmailInvitationsSchema.body,
    },
    preHandler: [requireAuth, loadHubContext, requireHubPermission(PERMISSIONS.TEAM_INVITE)],
    handler: createEmailInvitations,
  });

  /**
   * Get invitation info (PUBLIC - no auth required)
   * Used by Auth App to display invitation details before user logs in
   */
  fastify.get('/invitations/:token/info', {
    schema: {
      tags: ['Hub Invitations'],
      summary: 'Get invitation info by token',
      description:
        'Get invitation details without authentication. Used by Auth App to display invitation info.',
      params: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          description: 'Invitation info retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['email', 'link'] },
                isValid: { type: 'boolean' },
                isExpired: { type: 'boolean' },
                hubId: { type: 'string' },
                hubName: { type: 'string' },
                hubLogo: { type: ['string', 'null'] },
                hubSlug: { type: 'string' },
                roleName: { type: 'string' },
                roleKey: { type: 'string' },
                invitedEmail: { type: 'string' },
                invitedByName: { type: 'string' },
                expiresAt: { type: 'string' },
                userExists: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    // NO preHandler - this is a public endpoint
    handler: getInvitationInfo,
  });

  /**
   * Accept email invitation
   */
  fastify.post('/invitations/:token/accept', {
    schema: {
      tags: ['Hub Invitations'],
      summary: 'Accept email invitation',
      description: 'Accept invitation and join hub',
      params: hubAcceptEmailInvitationSchema.params,
      response: {
        200: {
          description: 'Invitation accepted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                member: { type: 'object' },
                hub: { type: 'object' },
                role: { type: 'object' },
              },
            },
          },
        },
      },
    },
    preHandler: [requireAuth],
    handler: acceptEmailInvitation,
  });

  // ==========================================
  // Invitation Links
  // ==========================================

  /**
   * Create invitation link
   */
  fastify.post('/:hubId/invitation-links', {
    schema: {
      tags: ['Hub Invitation Links'],
      summary: 'Create shareable invitation link',
      description: 'Generate a link that can be shared for joining hub',
      params: hubCreateInvitationLinkSchema.params,
      body: hubCreateInvitationLinkSchema.body,
    },
    preHandler: [requireAuth, loadHubContext, requireHubPermission(PERMISSIONS.TEAM_INVITE)],
    handler: createInvitationLink,
  });

  /**
   * Join via invitation link
   */
  fastify.post('/invitation-links/:token/join', {
    schema: {
      tags: ['Hub Invitation Links'],
      summary: 'Join hub via invitation link',
      description: 'Use invitation link to join hub',
      params: hubJoinViaLinkSchema.params,
      response: {
        200: {
          description: 'Joined hub successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                member: { type: 'object' },
                hub: { type: 'object' },
                role: { type: 'object' },
              },
            },
          },
        },
      },
    },
    preHandler: [requireAuth],
    handler: joinViaLink,
  });

  /**
   * List invitation links
   */
  fastify.get('/:hubId/invitation-links', {
    schema: {
      tags: ['Hub Invitation Links'],
      summary: 'List invitation links for hub',
      description: 'Get all invitation links created for this hub',
      params: hubListInvitationLinksSchema.params,
      querystring: hubListInvitationLinksSchema.querystring,
      response: {
        200: {
          description: 'Invitation links retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                links: { type: 'array' },
                pagination: paginationSchema,
              },
            },
          },
        },
      },
    },
    preHandler: [requireAuth, loadHubContext, requireHubMembership],
    handler: listInvitationLinks,
  });

  /**
   * Disable invitation link
   */
  fastify.delete('/:hubId/invitation-links/:linkId', {
    schema: {
      tags: ['Hub Invitation Links'],
      summary: 'Disable invitation link',
      description: 'Disable an invitation link so it can no longer be used',
      params: hubDisableInvitationLinkSchema.params,
      response: {
        200: {
          description: 'Invitation link disabled successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
    preHandler: [requireAuth, loadHubContext, requireHubPermission(PERMISSIONS.TEAM_INVITE)],
    handler: disableInvitationLink,
  });

  // ==========================================
  // Team Members Management
  // ==========================================

  /**
   * Get team stats for tabs
   */
  fastify.get('/:hubId/members/stats', {
    schema: {
      tags: ['Hub Members'],
      summary: 'Get team stats',
      description:
        'Get counts for team members, collaborators, pending invitations, and active links',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Stats retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                teamMembers: { type: 'number' },
                collaborators: { type: 'number' },
                pendingInvitations: { type: 'number' },
                activeInvitationLinks: { type: 'number' },
              },
            },
          },
        },
      },
    },
    preHandler: [requireAuth, loadHubContext, requireHubMembership],
    handler: getTeamStats,
  });

  /**
   * List hub members
   */
  fastify.get('/:hubId/members', {
    schema: {
      tags: ['Hub Members'],
      summary: 'List team members',
      description: 'Get all members of the hub',
      params: hubListHubMembersSchema.params,
      querystring: hubListHubMembersSchema.querystring,
      response: {
        200: {
          description: 'Members retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                members: { type: 'array' },
                pagination: paginationSchema,
              },
            },
          },
        },
      },
    },
    preHandler: [requireAuth, loadHubContext, requireHubMembership],
    handler: listHubMembers,
  });

  /**
   * List pending invitations
   */
  fastify.get('/:hubId/invitations', {
    schema: {
      tags: ['Hub Invitations'],
      summary: 'List pending invitations',
      description: 'Get all pending email invitations for the hub',
      params: hubListPendingInvitationsSchema.params,
      querystring: hubListPendingInvitationsSchema.querystring,
      response: {
        200: {
          description: 'Invitations retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                invitations: { type: 'array' },
                pagination: paginationSchema,
              },
            },
          },
        },
      },
    },
    preHandler: [requireAuth, loadHubContext, requireHubMembership],
    handler: listPendingInvitations,
  });

  /**
   * Update member role
   */
  fastify.patch('/:hubId/members/:memberId', {
    schema: {
      tags: ['Hub Members'],
      summary: 'Update member role',
      description: "Change a team member's role or title",
      params: hubUpdateMemberRoleSchema.params,
      body: hubUpdateMemberRoleSchema.body,
      response: {
        200: {
          description: 'Member updated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
    preHandler: [requireAuth, loadHubContext, requireHubPermission(PERMISSIONS.TEAM_EDIT_ROLES)],
    handler: updateMemberRole,
  });

  /**
   * Update member permissions
   */
  fastify.patch('/:hubId/members/:memberId/permissions', {
    schema: {
      tags: ['Hub Members'],
      summary: 'Update member permissions',
      description:
        "Update a team member's custom permissions. Pass empty array to reset to role-based permissions.",
      params: hubUpdateMemberPermissionsSchema.params,
      body: hubUpdateMemberPermissionsSchema.body,
      response: {
        200: {
          description: 'Member permissions updated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
    preHandler: [
      requireAuth,
      loadHubContext,
      requireHubPermission(PERMISSIONS.TEAM_MANAGE_PERMISSIONS),
    ],
    handler: updateMemberPermissions,
  });

  /**
   * Remove member
   */
  fastify.delete('/:hubId/members/:memberId', {
    schema: {
      tags: ['Hub Members'],
      summary: 'Remove team member',
      description: 'Remove a member from the hub',
      params: hubRemoveMemberSchema.params,
      response: {
        200: {
          description: 'Member removed successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
    preHandler: [requireAuth, loadHubContext, requireHubPermission(PERMISSIONS.TEAM_REMOVE)],
    handler: removeMember,
  });

  /**
   * Cancel invitation
   */
  fastify.delete('/:hubId/invitations/:memberId', {
    schema: {
      tags: ['Hub Invitations'],
      summary: 'Cancel pending invitation',
      description: 'Cancel a pending email invitation',
      params: hubCancelInvitationSchema.params,
      response: {
        200: {
          description: 'Invitation cancelled successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
    preHandler: [requireAuth, loadHubContext, requireHubPermission(PERMISSIONS.TEAM_INVITE)],
    handler: cancelInvitation,
  });
}
