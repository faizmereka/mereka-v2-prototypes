import { Hub } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { InvitationLink } from '@core/models/InvitationLink';
import { Permission } from '@core/models/Permission';
import { Role } from '@core/models/Role';
import { Subscription } from '@core/models/Subscription';
import { User } from '@core/models/User';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';
import {
  createHubMember,
  createTestInvitation,
  createTestInvitationLink,
  createTestUser,
  getAuthHeader,
  setupHubInvitationTestEnvironment,
} from '../../../fixtures/hubInvitation.fixture';

describe('Hub Invitation Routes', () => {
  let app: FastifyInstance;
  let ownerId: string;
  let ownerToken: string;
  let hubId: string;
  let adminRoleId: string;
  let expertRoleId: string;
  let memberRoleId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear collections
    await Promise.all([
      User.deleteMany({}),
      Hub.deleteMany({}),
      HubMember.deleteMany({}),
      InvitationLink.deleteMany({}),
      Role.deleteMany({}),
      Permission.deleteMany({}),
      Subscription.deleteMany({}),
    ]);

    // Setup test environment
    const testEnv = await setupHubInvitationTestEnvironment();
    ownerId = testEnv.ownerId;
    ownerToken = testEnv.ownerToken;
    hubId = testEnv.hubId;
    adminRoleId = testEnv.roles.adminId;
    expertRoleId = testEnv.roles.expertId;
    memberRoleId = testEnv.roles.memberId;
  });

  describe('POST /api/v1/hubs/:hubId/members/invite', () => {
    it('should create email invitations successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/hubs/${hubId}/members/invite`,
        headers: getAuthHeader(ownerToken),
        payload: {
          invitations: [
            {
              email: 'newmember1@test.com',
              roleKey: 'admin',
              title: 'Team Admin',
            },
            {
              email: 'newmember2@test.com',
              roleKey: 'expert',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.created).toBe(2);
      expect(data.data.invitations).toHaveLength(2);
      expect(data.data.invitations[0]?.email).toBe('newmember1@test.com');
      expect(data.data.invitations[0]?.invitationUrl).toContain('/invite/');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/hubs/${hubId}/members/invite`,
        payload: {
          invitations: [
            {
              email: 'test@test.com',
              roleKey: 'admin',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user lacks permission', async () => {
      // Create user without invite permission
      const { userId, token } = await createTestUser('noPermission@test.com', 'No Permission');
      await createHubMember(hubId, userId, memberRoleId, HubMemberStatus.ACTIVE);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/hubs/${hubId}/members/invite`,
        headers: getAuthHeader(token),
        payload: {
          invitations: [
            {
              email: 'test@test.com',
              roleKey: 'admin',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(403);
      const data = JSON.parse(response.body);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should handle already active member error', async () => {
      // Create existing user
      const { userId } = await createTestUser('existing@test.com', 'Existing User');
      await createHubMember(hubId, userId, adminRoleId, HubMemberStatus.ACTIVE);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/hubs/${hubId}/members/invite`,
        headers: getAuthHeader(ownerToken),
        payload: {
          invitations: [
            {
              email: 'existing@test.com',
              roleKey: 'admin',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.data.created).toBe(0);
      expect(data.data.errors).toHaveLength(1);
      expect(data.data.errors?.[0]?.error).toContain('already an active member');
    });

    it('should validate email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/hubs/${hubId}/members/invite`,
        headers: getAuthHeader(ownerToken),
        payload: {
          invitations: [
            {
              email: 'invalid-email',
              roleKey: 'admin',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/invitations/:token/accept', () => {
    it('should accept email invitation successfully', async () => {
      // Create test user and invitation
      const { userId, token: userToken } = await createTestUser('invited@test.com', 'Invited User');
      const { token: invitationToken } = await createTestInvitation(
        hubId,
        adminRoleId,
        ownerId,
        'invited@test.com',
        userId,
      );

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/invitations/${invitationToken}/accept`,
        headers: getAuthHeader(userToken),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.member.status).toBe(HubMemberStatus.ACTIVE);
    });

    it('should return 400 if invitation token invalid', async () => {
      const { token: userToken } = await createTestUser('user@test.com', 'User');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/invitations/invalid-token/accept',
        headers: getAuthHeader(userToken),
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error.message).toContain('Invalid invitation token');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/invitations/some-token/accept',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/hubs/:hubId/invitation-links', () => {
    it('should create invitation link successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/hubs/${hubId}/invitation-links`,
        headers: getAuthHeader(ownerToken),
        payload: {
          roleKey: 'manager',
          expiresInDays: 30,
          maxUses: 10,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.url).toContain('/join/');
      expect(data.data.maxUses).toBe(10);
      expect(data.data.status).toBe('active');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/hubs/${hubId}/invitation-links`,
        payload: {
          roleKey: 'manager',
          expiresInDays: 30,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user lacks permission', async () => {
      const { userId, token } = await createTestUser('member@test.com', 'Member');
      await createHubMember(hubId, userId, memberRoleId, HubMemberStatus.ACTIVE);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/hubs/${hubId}/invitation-links`,
        headers: getAuthHeader(token),
        payload: {
          roleKey: 'manager',
          expiresInDays: 30,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should validate expiresInDays', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/hubs/${hubId}/invitation-links`,
        headers: getAuthHeader(ownerToken),
        payload: {
          roleKey: 'manager',
          expiresInDays: 0, // Invalid
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/invitation-links/:token/join', () => {
    it('should join via invitation link successfully', async () => {
      // Create invitation link
      const { token: linkToken } = await createTestInvitationLink(hubId, expertRoleId, ownerId, 10);

      // Create new user
      const { token: userToken } = await createTestUser('newjoiner@test.com', 'New Joiner');

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/invitation-links/${linkToken}/join`,
        headers: getAuthHeader(userToken),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.member.status).toBe(HubMemberStatus.ACTIVE);
    });

    it('should return 400 if link invalid', async () => {
      const { token: userToken } = await createTestUser('user@test.com', 'User');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/invitation-links/invalid-token/join',
        headers: getAuthHeader(userToken),
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/invitation-links/some-token/join',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 if user already member', async () => {
      const { token: linkToken } = await createTestInvitationLink(hubId, expertRoleId, ownerId);

      // User is already owner/member
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/invitation-links/${linkToken}/join`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error.message).toContain('already a member');
    });
  });

  describe('GET /api/v1/hubs/:hubId/members', () => {
    it('should list hub members successfully', async () => {
      // Create additional member
      const { userId } = await createTestUser('member@test.com', 'Member');
      await createHubMember(hubId, userId, expertRoleId, HubMemberStatus.ACTIVE);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/hubs/${hubId}/members`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.members.length).toBeGreaterThanOrEqual(2);
      expect(data.data.pagination).toBeDefined();
    });

    it('should filter members by status', async () => {
      // Create invited member
      await createTestInvitation(hubId, adminRoleId, ownerId, 'invited@test.com');

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/hubs/${hubId}/members?status=invited`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.members.every((m: any) => m.status === 'invited')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/hubs/${hubId}/members?page=1&limit=10`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBe(10);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/hubs/${hubId}/members`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/hubs/:hubId/invitations', () => {
    it('should list pending invitations', async () => {
      // Create invitations
      await createTestInvitation(hubId, adminRoleId, ownerId, 'invited1@test.com');
      await createTestInvitation(hubId, expertRoleId, ownerId, 'invited2@test.com');

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/hubs/${hubId}/invitations`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.invitations.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/hubs/${hubId}/invitations`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/v1/hubs/:hubId/members/:memberId', () => {
    it('should update member role successfully', async () => {
      // Create member
      const { userId } = await createTestUser('member@test.com', 'Member');
      const { memberId } = await createHubMember(
        hubId,
        userId,
        memberRoleId,
        HubMemberStatus.ACTIVE,
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/hubs/${hubId}/members/${memberId}`,
        headers: getAuthHeader(ownerToken),
        payload: {
          roleKey: 'manager',
          title: 'Team Manager',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.member).toBeDefined();
    });

    it('should return 403 if user lacks permission', async () => {
      const { userId, token } = await createTestUser('member@test.com', 'Member');
      const { memberId } = await createHubMember(
        hubId,
        userId,
        memberRoleId,
        HubMemberStatus.ACTIVE,
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/hubs/${hubId}/members/${memberId}`,
        headers: getAuthHeader(token),
        payload: {
          roleKey: 'admin',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 400 if member not found', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/hubs/${hubId}/members/507f1f77bcf86cd799439011`,
        headers: getAuthHeader(ownerToken),
        payload: {
          roleKey: 'manager',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/v1/hubs/:hubId/members/:memberId', () => {
    it('should remove member successfully', async () => {
      // Create member
      const { userId } = await createTestUser('toremove@test.com', 'To Remove');
      const { memberId } = await createHubMember(
        hubId,
        userId,
        expertRoleId,
        HubMemberStatus.ACTIVE,
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/hubs/${hubId}/members/${memberId}`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('removed successfully');
    });

    it('should return 403 if user lacks permission', async () => {
      const { userId, token } = await createTestUser('member@test.com', 'Member');
      const { memberId } = await createHubMember(
        hubId,
        userId,
        memberRoleId,
        HubMemberStatus.ACTIVE,
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/hubs/${hubId}/members/${memberId}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/hubs/:hubId/invitations/:memberId', () => {
    it('should cancel invitation successfully', async () => {
      // Create invitation
      const { memberId } = await createTestInvitation(
        hubId,
        adminRoleId,
        ownerId,
        'tocancel@test.com',
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/hubs/${hubId}/invitations/${memberId}`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('cancelled successfully');
    });

    it('should return 400 if trying to cancel active member', async () => {
      // Create active member
      const { userId } = await createTestUser('active@test.com', 'Active');
      const { memberId } = await createHubMember(
        hubId,
        userId,
        adminRoleId,
        HubMemberStatus.ACTIVE,
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/hubs/${hubId}/invitations/${memberId}`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error.message).toContain('only cancel pending invitations');
    });
  });

  describe('GET /api/v1/hubs/:hubId/invitation-links', () => {
    it('should list invitation links', async () => {
      // Create links
      await createTestInvitationLink(hubId, adminRoleId, ownerId);
      await createTestInvitationLink(hubId, expertRoleId, ownerId, 5);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/hubs/${hubId}/invitation-links`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.links.length).toBeGreaterThanOrEqual(2);
      expect(data.data.links[0]?.url).toContain('/join/');
    });

    it('should filter links by status', async () => {
      await createTestInvitationLink(hubId, adminRoleId, ownerId);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/hubs/${hubId}/invitation-links?status=active`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.links.every((l: any) => l.status === 'active')).toBe(true);
    });
  });

  describe('DELETE /api/v1/hubs/:hubId/invitation-links/:linkId', () => {
    it('should disable invitation link successfully', async () => {
      const { linkId } = await createTestInvitationLink(hubId, adminRoleId, ownerId);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/hubs/${hubId}/invitation-links/${linkId}`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('disabled successfully');
    });

    it('should return 400 if link not found', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/hubs/${hubId}/invitation-links/507f1f77bcf86cd799439011`,
        headers: getAuthHeader(ownerToken),
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 if user lacks permission', async () => {
      const { linkId } = await createTestInvitationLink(hubId, adminRoleId, ownerId);
      const { userId, token } = await createTestUser('member@test.com', 'Member');
      await createHubMember(hubId, userId, memberRoleId, HubMemberStatus.ACTIVE);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/hubs/${hubId}/invitation-links/${linkId}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
