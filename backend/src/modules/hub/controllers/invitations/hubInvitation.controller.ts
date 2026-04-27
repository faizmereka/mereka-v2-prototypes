import { getUserId } from '@core/utils/auth-helpers';
import type {
  HubAcceptEmailInvitationInput,
  HubCancelInvitationInput,
  HubCreateEmailInvitationsInput,
  HubCreateInvitationLinkInput,
  HubDisableInvitationLinkInput,
  HubJoinViaLinkInput,
  HubListHubMembersInput,
  HubListInvitationLinksInput,
  HubListPendingInvitationsInput,
  HubRemoveMemberInput,
  HubUpdateMemberPermissionsInput,
  HubUpdateMemberRoleInput,
} from '@schemas/hub';
import { hubInvitationService } from '@services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Create email invitations
 */
export async function createEmailInvitations(
  request: FastifyRequest<{
    Params: HubCreateEmailInvitationsInput['params'];
    Body: HubCreateEmailInvitationsInput['body'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const invitedBy = getUserId(request);

    const result = await hubInvitationService.createEmailInvitations(
      hubId,
      request.body,
      invitedBy,
    );

    return reply.status(201).send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, hubId: request.params.hubId }, 'Error creating invitations');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'INVITATION_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create invitations',
      },
    });
  }
}

/**
 * Accept email invitation
 */
export async function acceptEmailInvitation(
  request: FastifyRequest<{
    Params: HubAcceptEmailInvitationInput['params'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { token } = request.params;
    const userId = getUserId(request);

    const result = await hubInvitationService.acceptEmailInvitation(token, userId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, token: request.params.token }, 'Error accepting invitation');

    const statusCode = error instanceof Error && error.message.includes('expired') ? 410 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'INVITATION_ACCEPT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to accept invitation',
      },
    });
  }
}

/**
 * Create invitation link
 */
export async function createInvitationLink(
  request: FastifyRequest<{
    Params: HubCreateInvitationLinkInput['params'];
    Body: HubCreateInvitationLinkInput['body'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const createdBy = getUserId(request);

    const result = await hubInvitationService.createInvitationLink(hubId, request.body, createdBy);

    return reply.status(201).send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, hubId: request.params.hubId }, 'Error creating invitation link');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'INVITATION_LINK_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create invitation link',
      },
    });
  }
}

/**
 * Join via invitation link
 */
export async function joinViaLink(
  request: FastifyRequest<{
    Params: HubJoinViaLinkInput['params'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { token } = request.params;
    const userId = getUserId(request);

    const result = await hubInvitationService.joinViaLink(token, userId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, token: request.params.token }, 'Error joining via link');

    const statusCode =
      error instanceof Error &&
      (error.message.includes('expired') || error.message.includes('maximum uses'))
        ? 410
        : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'JOIN_VIA_LINK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to join via link',
      },
    });
  }
}

/**
 * List hub members
 */
export async function listHubMembers(
  request: FastifyRequest<{
    Params: HubListHubMembersInput['params'];
    Querystring: HubListHubMembersInput['querystring'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const result = await hubInvitationService.listMembers(hubId, request.query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, hubId: request.params.hubId }, 'Error listing members');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_MEMBERS_ERROR',
        message: 'Failed to list members',
      },
    });
  }
}

/**
 * List pending invitations
 */
export async function listPendingInvitations(
  request: FastifyRequest<{
    Params: HubListPendingInvitationsInput['params'];
    Querystring: HubListPendingInvitationsInput['querystring'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const result = await hubInvitationService.listPendingInvitations(hubId, request.query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, hubId: request.params.hubId }, 'Error listing invitations');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_INVITATIONS_ERROR',
        message: 'Failed to list invitations',
      },
    });
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(
  request: FastifyRequest<{
    Params: HubUpdateMemberRoleInput['params'];
    Body: HubUpdateMemberRoleInput['body'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { memberId } = request.params;
    const result = await hubInvitationService.updateMemberRole(memberId, request.body);

    return reply.send({
      success: true,
      data: { member: result },
    });
  } catch (error) {
    request.log.error({ error, memberId: request.params.memberId }, 'Error updating member role');

    const statusCode = error instanceof Error && error.message.includes('owner') ? 403 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'UPDATE_MEMBER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update member role',
      },
    });
  }
}

/**
 * Remove member
 */
export async function removeMember(
  request: FastifyRequest<{
    Params: HubRemoveMemberInput['params'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { memberId } = request.params;
    const result = await hubInvitationService.removeMember(memberId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, memberId: request.params.memberId }, 'Error removing member');

    const statusCode = error instanceof Error && error.message.includes('owner') ? 403 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'REMOVE_MEMBER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to remove member',
      },
    });
  }
}

/**
 * Update member permissions
 */
export async function updateMemberPermissions(
  request: FastifyRequest<{
    Params: HubUpdateMemberPermissionsInput['params'];
    Body: HubUpdateMemberPermissionsInput['body'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { memberId } = request.params;
    const { permissions } = request.body;

    request.log.info(
      { memberId, permissionsCount: permissions?.length, permissions },
      '[PERM] Updating member permissions',
    );

    // Empty array means reset to role permissions, pass null
    const permissionsToSet = permissions.length === 0 ? null : permissions;
    const result = await hubInvitationService.updateMemberPermissions(memberId, permissionsToSet);

    request.log.info(
      { memberId, permissionsCount: permissionsToSet?.length || 0 },
      '[PERM] Member permissions updated successfully',
    );

    return reply.send({
      success: true,
      data: { member: result },
    });
  } catch (error) {
    request.log.error(
      { error, memberId: request.params.memberId },
      '[PERM] Error updating member permissions',
    );

    const statusCode = error instanceof Error && error.message.includes('owner') ? 403 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'UPDATE_PERMISSIONS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update member permissions',
      },
    });
  }
}

/**
 * Cancel invitation
 */
export async function cancelInvitation(
  request: FastifyRequest<{
    Params: HubCancelInvitationInput['params'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { memberId } = request.params;
    const result = await hubInvitationService.cancelInvitation(memberId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, memberId: request.params.memberId }, 'Error cancelling invitation');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'CANCEL_INVITATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to cancel invitation',
      },
    });
  }
}

/**
 * List invitation links
 */
export async function listInvitationLinks(
  request: FastifyRequest<{
    Params: HubListInvitationLinksInput['params'];
    Querystring: HubListInvitationLinksInput['querystring'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const result = await hubInvitationService.listInvitationLinks(hubId, request.query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, hubId: request.params.hubId }, 'Error listing invitation links');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_LINKS_ERROR',
        message: 'Failed to list invitation links',
      },
    });
  }
}

/**
 * Disable invitation link
 */
export async function disableInvitationLink(
  request: FastifyRequest<{
    Params: HubDisableInvitationLinkInput['params'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { linkId } = request.params;
    const result = await hubInvitationService.disableInvitationLink(linkId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, linkId: request.params.linkId }, 'Error disabling invitation link');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'DISABLE_LINK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to disable invitation link',
      },
    });
  }
}

/**
 * Get invitation info by token (public - no auth required)
 * Used by Auth App to display invitation details before login
 */
export async function getInvitationInfo(
  request: FastifyRequest<{
    Params: { token: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { token } = request.params;
    const result = await hubInvitationService.getInvitationInfo(token);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, token: request.params.token }, 'Error getting invitation info');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'GET_INVITATION_INFO_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get invitation info',
      },
    });
  }
}

/**
 * Get team stats for tabs
 * Returns counts for team members, collaborators, pending invitations, and active links
 */
export async function getTeamStats(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const result = await hubInvitationService.getTeamStats(hubId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, hubId: request.params.hubId }, 'Error getting team stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_TEAM_STATS_ERROR',
        message: 'Failed to get team stats',
      },
    });
  }
}
