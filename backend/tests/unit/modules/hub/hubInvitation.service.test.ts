import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Mongoose models BEFORE imports
vi.mock('@core/models/Hub');
vi.mock('@core/models/User');
vi.mock('@core/models/Role');
vi.mock('@core/models/HubMember');
vi.mock('@core/models/InvitationLink');
vi.mock('@core/models/Permission');

// Import after mocks
import { Hub } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { InvitationLink, InvitationLinkStatus } from '@core/models/InvitationLink';
import { Role, RoleScope } from '@core/models/Role';
import { User } from '@core/models/User';
import { hubInvitationService } from '@services/hub';

describe('HubInvitationService', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockHubId = '507f1f77bcf86cd799439012';
  const mockRoleId = '507f1f77bcf86cd799439013';
  const mockMemberId = '507f1f77bcf86cd799439014';
  const mockLinkId = '507f1f77bcf86cd799439015';
  const mockInvitedBy = '507f1f77bcf86cd799439016';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEmailInvitations', () => {
    it('should create email invitations successfully', async () => {
      const mockHub = { _id: mockHubId, name: 'Test Hub' };
      const mockRole = {
        _id: mockRoleId,
        key: 'admin',
        name: 'Admin',
        scope: RoleScope.SYSTEM,
      };
      const mockUser = { _id: mockUserId, email: 'user@example.com' };
      const mockMember = {
        _id: mockMemberId,
        hubId: mockHubId,
        userId: mockUserId,
        roleId: mockRoleId,
        status: HubMemberStatus.INVITED,
        invitationToken: 'token123',
        invitationExpiry: new Date(),
        createdAt: new Date(),
      };

      vi.mocked(Hub.findById).mockResolvedValue(mockHub as any);
      vi.mocked(Role.findOne).mockResolvedValue(mockRole as any);
      vi.mocked(User.findOne).mockResolvedValue(mockUser as any);
      vi.mocked(HubMember.findOne).mockResolvedValue(null);
      vi.mocked(HubMember.create).mockResolvedValue(mockMember as any);

      const result = await hubInvitationService.createEmailInvitations(
        mockHubId,
        {
          invitations: [
            {
              email: 'user@example.com',
              roleKey: 'admin',
              title: 'Admin User',
            },
          ],
        },
        mockInvitedBy,
      );

      expect(Hub.findById).toHaveBeenCalledWith(mockHubId);
      expect(Role.findOne).toHaveBeenCalledWith({
        key: 'admin',
        scope: RoleScope.SYSTEM,
      });
      expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(HubMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hubId: mockHubId,
          userId: mockUserId,
          roleId: mockRoleId,
          status: HubMemberStatus.INVITED,
          invitedBy: mockInvitedBy,
          title: 'Admin User',
        }),
      );
      expect(result.invited).toBe(1);
      expect(result.invitations).toHaveLength(1);
    });

    it('should throw error if hub not found', async () => {
      vi.mocked(Hub.findById).mockResolvedValue(null);

      await expect(
        hubInvitationService.createEmailInvitations(
          mockHubId,
          {
            invitations: [{ email: 'user@example.com', roleKey: 'admin' }],
          },
          mockInvitedBy,
        ),
      ).rejects.toThrow('Hub not found');
    });

    it('should handle user already active member error', async () => {
      const mockHub = { _id: mockHubId, name: 'Test Hub' };
      const mockRole = { _id: mockRoleId, key: 'admin', name: 'Admin' };
      const mockUser = { _id: mockUserId, email: 'user@example.com' };
      const mockExistingMember = {
        _id: mockMemberId,
        status: HubMemberStatus.ACTIVE,
      };

      vi.mocked(Hub.findById).mockResolvedValue(mockHub as any);
      vi.mocked(Role.findOne).mockResolvedValue(mockRole as any);
      vi.mocked(User.findOne).mockResolvedValue(mockUser as any);
      vi.mocked(HubMember.findOne).mockResolvedValue(mockExistingMember as any);

      const result = await hubInvitationService.createEmailInvitations(
        mockHubId,
        {
          invitations: [{ email: 'user@example.com', roleKey: 'admin' }],
        },
        mockInvitedBy,
      );

      expect(result.invited).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.error).toBe('User is already an active member of this hub');
    });

    it('should handle pending invitation error', async () => {
      const mockHub = { _id: mockHubId, name: 'Test Hub' };
      const mockRole = { _id: mockRoleId, key: 'admin', name: 'Admin' };
      const mockUser = { _id: mockUserId, email: 'user@example.com' };
      const mockExistingMember = {
        _id: mockMemberId,
        status: HubMemberStatus.INVITED,
      };

      vi.mocked(Hub.findById).mockResolvedValue(mockHub as any);
      vi.mocked(Role.findOne).mockResolvedValue(mockRole as any);
      vi.mocked(User.findOne).mockResolvedValue(mockUser as any);
      vi.mocked(HubMember.findOne).mockResolvedValue(mockExistingMember as any);

      const result = await hubInvitationService.createEmailInvitations(
        mockHubId,
        {
          invitations: [{ email: 'user@example.com', roleKey: 'admin' }],
        },
        mockInvitedBy,
      );

      expect(result.invited).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.error).toBe('User already has a pending invitation to this hub');
    });
  });

  describe('acceptEmailInvitation', () => {
    it('should accept email invitation successfully', async () => {
      const mockHub = { _id: mockHubId, name: 'Test Hub' };
      const mockRole = { _id: mockRoleId, key: 'admin', name: 'Admin' };
      const mockMember = {
        _id: mockMemberId,
        hubId: mockHub,
        roleId: mockRole,
        userId: null,
        status: HubMemberStatus.INVITED,
        invitationToken: 'token123',
        invitationExpiry: new Date(Date.now() + 86400000), // 1 day from now
        save: vi.fn().mockResolvedValue(true),
      };

      const mockPopulateChain = {
        populate: vi.fn(),
      };
      const secondPopulateChain = {
        populate: vi.fn().mockResolvedValue(mockMember),
      };
      mockPopulateChain.populate.mockReturnValue(secondPopulateChain);
      vi.mocked(HubMember.findOne)
        .mockReturnValueOnce(mockPopulateChain as any)
        .mockResolvedValueOnce(null); // No existing active member

      const result = await hubInvitationService.acceptEmailInvitation('token123', mockUserId);

      expect(result.member).toBeDefined();
      expect(result.hub).toBe(mockHub);
      expect(result.roles).toBeDefined();
      expect(mockMember.save).toHaveBeenCalled();
    });

    it('should throw error if invitation token invalid', async () => {
      const mockPopulateChain = {
        populate: vi.fn(),
      };
      const secondPopulateChain = {
        populate: vi.fn().mockResolvedValue(null),
      };
      mockPopulateChain.populate.mockReturnValue(secondPopulateChain);
      vi.mocked(HubMember.findOne).mockReturnValue(mockPopulateChain as any);

      await expect(
        hubInvitationService.acceptEmailInvitation('invalid-token', mockUserId),
      ).rejects.toThrow('Invalid invitation token');
    });

    it('should throw error if invitation expired', async () => {
      const mockMember = {
        _id: mockMemberId,
        status: HubMemberStatus.INVITED,
        invitationExpiry: new Date(Date.now() - 86400000), // 1 day ago
      };

      const mockPopulateChain = {
        populate: vi.fn(),
      };
      const secondPopulateChain = {
        populate: vi.fn().mockResolvedValue(mockMember),
      };
      mockPopulateChain.populate.mockReturnValue(secondPopulateChain);
      vi.mocked(HubMember.findOne).mockReturnValue(mockPopulateChain as any);

      await expect(
        hubInvitationService.acceptEmailInvitation('token123', mockUserId),
      ).rejects.toThrow('Invitation has expired');
    });

    it('should throw error if user already member', async () => {
      const mockHub = { _id: mockHubId };
      const mockMember = {
        _id: mockMemberId,
        hubId: mockHub,
        status: HubMemberStatus.INVITED,
        invitationExpiry: new Date(Date.now() + 86400000),
      };
      const mockExistingMember = { _id: 'existing-id', status: HubMemberStatus.ACTIVE };

      const mockPopulateChain = {
        populate: vi.fn(),
      };
      const secondPopulateChain = {
        populate: vi.fn().mockResolvedValue(mockMember),
      };
      mockPopulateChain.populate.mockReturnValue(secondPopulateChain);
      vi.mocked(HubMember.findOne)
        .mockReturnValueOnce(mockPopulateChain as any)
        .mockResolvedValueOnce(mockExistingMember as any);

      await expect(
        hubInvitationService.acceptEmailInvitation('token123', mockUserId),
      ).rejects.toThrow('You are already a member of this hub');
    });
  });

  describe('createInvitationLink', () => {
    it('should create invitation link successfully', async () => {
      const mockHub = { _id: mockHubId, name: 'Test Hub' };
      const mockRole = { _id: mockRoleId, key: 'admin', name: 'Admin' };
      const mockLinkData = {
        _id: mockLinkId,
        hubId: mockHubId,
        roleId: mockRoleId,
        token: 'link-token',
        maxUses: 10,
        usedCount: 0,
        status: InvitationLinkStatus.ACTIVE,
        expiresAt: new Date(),
      };

      const mockLink = {
        ...mockLinkData,
        populate: vi.fn().mockResolvedValue({
          ...mockLinkData,
          toObject: vi.fn().mockReturnValue(mockLinkData),
        }),
      };

      vi.mocked(Hub.findById).mockResolvedValue(mockHub as any);
      vi.mocked(Role.findOne).mockResolvedValue(mockRole as any);
      vi.mocked(InvitationLink.create).mockResolvedValue(mockLink as any);

      const result = await hubInvitationService.createInvitationLink(
        mockHubId,
        {
          roleKey: 'admin',
          expiresInDays: 30,
          maxUses: 10,
        },
        mockInvitedBy,
      );

      expect(Hub.findById).toHaveBeenCalledWith(mockHubId);
      expect(Role.findOne).toHaveBeenCalledWith({
        key: 'admin',
        scope: RoleScope.SYSTEM,
      });
      expect(InvitationLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hubId: mockHubId,
          roleId: mockRoleId,
          maxUses: 10,
          usedCount: 0,
          status: InvitationLinkStatus.ACTIVE,
          createdBy: mockInvitedBy,
        }),
      );
      expect(result.url).toContain('/join/');
      expect(result._id).toBe(mockLinkId);
    });

    it('should throw error if hub not found', async () => {
      vi.mocked(Hub.findById).mockResolvedValue(null);

      await expect(
        hubInvitationService.createInvitationLink(
          mockHubId,
          { roleKey: 'admin', expiresInDays: 30 },
          mockInvitedBy,
        ),
      ).rejects.toThrow('Hub not found');
    });

    it('should throw error if role not found', async () => {
      const mockHub = { _id: mockHubId, name: 'Test Hub' };
      vi.mocked(Hub.findById).mockResolvedValue(mockHub as any);
      vi.mocked(Role.findOne).mockResolvedValue(null);

      await expect(
        hubInvitationService.createInvitationLink(
          mockHubId,
          { roleKey: 'invalid-role', expiresInDays: 30 },
          mockInvitedBy,
        ),
      ).rejects.toThrow("Role 'invalid-role' not found");
    });
  });

  describe('joinViaLink', () => {
    it('should join via link successfully for new member', async () => {
      const mockHub = { _id: mockHubId, name: 'Test Hub' };
      const mockRole = { _id: mockRoleId, key: 'admin', name: 'Admin' };
      const mockLink = {
        _id: mockLinkId,
        hubId: mockHub,
        roleId: mockRole,
        token: 'link-token',
        status: InvitationLinkStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000),
        maxUses: 10,
        usedCount: 5,
        createdBy: mockInvitedBy,
        save: vi.fn().mockResolvedValue(true),
      };
      const mockMember = {
        _id: mockMemberId,
        hubId: mockHubId,
        userId: mockUserId,
        roleId: mockRoleId,
        status: HubMemberStatus.ACTIVE,
      };

      const mockPopulateChain = {
        populate: vi.fn(),
      };
      const secondPopulateChain = {
        populate: vi.fn().mockResolvedValue(mockLink),
      };
      mockPopulateChain.populate.mockReturnValue(secondPopulateChain);
      vi.mocked(InvitationLink.findOne).mockReturnValue(mockPopulateChain as any);
      vi.mocked(HubMember.findOne).mockResolvedValue(null);
      vi.mocked(HubMember.create).mockResolvedValue(mockMember as any);

      const result = await hubInvitationService.joinViaLink('link-token', mockUserId);

      expect(result.member).toBeDefined();
      expect(result.hub).toBe(mockHub);
      expect(result.roles).toBeDefined();
      expect(mockLink.usedCount).toBe(6);
      expect(mockLink.save).toHaveBeenCalled();
    });

    it('should throw error if link not found', async () => {
      const mockPopulateChain = {
        populate: vi.fn(),
      };
      const secondPopulateChain = {
        populate: vi.fn().mockResolvedValue(null),
      };
      mockPopulateChain.populate.mockReturnValue(secondPopulateChain);
      vi.mocked(InvitationLink.findOne).mockReturnValue(mockPopulateChain as any);

      await expect(hubInvitationService.joinViaLink('invalid-token', mockUserId)).rejects.toThrow(
        'Invalid invitation link',
      );
    });

    it('should throw error if link expired', async () => {
      const mockLink = {
        _id: mockLinkId,
        status: InvitationLinkStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        save: vi.fn().mockResolvedValue(true),
      };

      const mockPopulateChain = {
        populate: vi.fn(),
      };
      const secondPopulateChain = {
        populate: vi.fn().mockResolvedValue(mockLink),
      };
      mockPopulateChain.populate.mockReturnValue(secondPopulateChain);
      vi.mocked(InvitationLink.findOne).mockReturnValue(mockPopulateChain as any);

      await expect(hubInvitationService.joinViaLink('link-token', mockUserId)).rejects.toThrow(
        'Invitation link has expired',
      );
      expect(mockLink.status).toBe(InvitationLinkStatus.EXPIRED);
    });

    it('should throw error if max uses reached', async () => {
      const mockLink = {
        _id: mockLinkId,
        status: InvitationLinkStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000),
        maxUses: 10,
        usedCount: 10,
      };

      const mockPopulateChain = {
        populate: vi.fn(),
      };
      const secondPopulateChain = {
        populate: vi.fn().mockResolvedValue(mockLink),
      };
      mockPopulateChain.populate.mockReturnValue(secondPopulateChain);
      vi.mocked(InvitationLink.findOne).mockReturnValue(mockPopulateChain as any);

      await expect(hubInvitationService.joinViaLink('link-token', mockUserId)).rejects.toThrow(
        'Invitation link has reached maximum uses',
      );
    });

    it('should reactivate left member', async () => {
      const mockHub = { _id: mockHubId };
      const mockRole = { _id: mockRoleId };
      const mockLink = {
        _id: mockLinkId,
        hubId: mockHub,
        roleId: mockRole,
        status: InvitationLinkStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000),
        usedCount: 0,
        createdBy: mockInvitedBy,
        save: vi.fn().mockResolvedValue(true),
      };
      const mockExistingMember = {
        _id: mockMemberId,
        status: HubMemberStatus.LEFT,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockPopulateChain = {
        populate: vi.fn(),
      };
      const secondPopulateChain = {
        populate: vi.fn().mockResolvedValue(mockLink),
      };
      mockPopulateChain.populate.mockReturnValue(secondPopulateChain);
      vi.mocked(InvitationLink.findOne).mockReturnValue(mockPopulateChain as any);
      vi.mocked(HubMember.findOne).mockResolvedValue(mockExistingMember as any);

      const result = await hubInvitationService.joinViaLink('link-token', mockUserId);

      expect(mockExistingMember.status).toBe(HubMemberStatus.ACTIVE);
      expect(mockExistingMember.save).toHaveBeenCalled();
      expect(mockLink.usedCount).toBe(1);
    });
  });

  describe('listMembers', () => {
    it('should list members with pagination', async () => {
      const mockMembers = [
        { _id: '1', userId: { name: 'User 1' } },
        { _id: '2', userId: { name: 'User 2' } },
      ];

      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockMembers),
      };

      vi.mocked(HubMember.find).mockReturnValue(mockQuery as any);
      vi.mocked(HubMember.countDocuments).mockResolvedValue(2);

      const result = await hubInvitationService.listMembers(mockHubId, {
        page: 1,
        limit: 20,
      });

      expect(result.members).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter members by status', async () => {
      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(HubMember.find).mockReturnValue(mockQuery as any);
      vi.mocked(HubMember.countDocuments).mockResolvedValue(0);

      await hubInvitationService.listMembers(mockHubId, {
        status: HubMemberStatus.ACTIVE,
        page: 1,
        limit: 20,
      });

      expect(HubMember.find).toHaveBeenCalledWith(
        expect.objectContaining({
          hubId: mockHubId,
          status: HubMemberStatus.ACTIVE,
        }),
      );
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role successfully', async () => {
      const mockRole = { _id: mockRoleId, key: 'manager', name: 'Manager' };
      const mockHub = { _id: mockHubId, ownerId: 'different-user-id' };
      const mockMemberData = {
        _id: mockMemberId,
        hubId: mockHubId,
        userId: mockUserId,
        roleId: 'old-role-id',
      };

      const mockMember = {
        ...mockMemberData,
        save: vi.fn().mockResolvedValue(true),
        populate: vi.fn().mockResolvedValue(mockMemberData),
      };

      vi.mocked(HubMember.findById).mockResolvedValue(mockMember as any);
      vi.mocked(Role.findOne).mockResolvedValue(mockRole as any);
      vi.mocked(Hub.findById).mockResolvedValue(mockHub as any);

      const result = await hubInvitationService.updateMemberRole(mockMemberId, {
        roleKey: 'manager',
        title: 'Team Manager',
      });

      expect(mockMember.save).toHaveBeenCalled();
      expect(mockMember.populate).toHaveBeenCalledWith(['roleId', 'userId']);
    });

    it('should throw error if member not found', async () => {
      vi.mocked(HubMember.findById).mockResolvedValue(null);

      await expect(
        hubInvitationService.updateMemberRole(mockMemberId, { roleKey: 'manager' }),
      ).rejects.toThrow('Member not found');
    });

    it('should throw error when trying to change hub owner role', async () => {
      const mockHub = { _id: mockHubId, ownerId: mockUserId };
      const mockMember = {
        _id: mockMemberId,
        hubId: mockHubId,
        userId: mockUserId,
      };
      const mockRole = { _id: mockRoleId, key: 'manager' };

      vi.mocked(HubMember.findById).mockResolvedValue(mockMember as any);
      vi.mocked(Role.findOne).mockResolvedValue(mockRole as any);
      vi.mocked(Hub.findById).mockResolvedValue(mockHub as any);

      await expect(
        hubInvitationService.updateMemberRole(mockMemberId, { roleKey: 'manager' }),
      ).rejects.toThrow('Cannot change role of hub owner');
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      const mockHub = { _id: mockHubId, ownerId: 'different-user-id' };
      const mockMember = {
        _id: mockMemberId,
        hubId: mockHubId,
        userId: mockUserId,
        status: HubMemberStatus.ACTIVE,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(HubMember.findById).mockResolvedValue(mockMember as any);
      vi.mocked(Hub.findById).mockResolvedValue(mockHub as any);

      const result = await hubInvitationService.removeMember(mockMemberId);

      expect(mockMember.status).toBe(HubMemberStatus.LEFT);
      expect(mockMember.save).toHaveBeenCalled();
      expect(result.message).toBe('Member removed successfully');
    });

    it('should throw error if member not found', async () => {
      vi.mocked(HubMember.findById).mockResolvedValue(null);

      await expect(hubInvitationService.removeMember(mockMemberId)).rejects.toThrow(
        'Member not found',
      );
    });

    it('should throw error when trying to remove hub owner', async () => {
      const mockHub = { _id: mockHubId, ownerId: mockUserId };
      const mockMember = {
        _id: mockMemberId,
        hubId: mockHubId,
        userId: mockUserId,
      };

      vi.mocked(HubMember.findById).mockResolvedValue(mockMember as any);
      vi.mocked(Hub.findById).mockResolvedValue(mockHub as any);

      await expect(hubInvitationService.removeMember(mockMemberId)).rejects.toThrow(
        'Cannot remove hub owner',
      );
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', async () => {
      const mockMember = {
        _id: mockMemberId,
        status: HubMemberStatus.INVITED,
      };

      vi.mocked(HubMember.findById).mockResolvedValue(mockMember as any);
      vi.mocked(HubMember.findByIdAndDelete).mockResolvedValue(mockMember as any);

      const result = await hubInvitationService.cancelInvitation(mockMemberId);

      expect(HubMember.findByIdAndDelete).toHaveBeenCalledWith(mockMemberId);
      expect(result.message).toBe('Invitation cancelled successfully');
    });

    it('should throw error if invitation not found', async () => {
      vi.mocked(HubMember.findById).mockResolvedValue(null);

      await expect(hubInvitationService.cancelInvitation(mockMemberId)).rejects.toThrow(
        'Invitation not found',
      );
    });

    it('should throw error if trying to cancel non-invited member', async () => {
      const mockMember = {
        _id: mockMemberId,
        status: HubMemberStatus.ACTIVE,
      };

      vi.mocked(HubMember.findById).mockResolvedValue(mockMember as any);

      await expect(hubInvitationService.cancelInvitation(mockMemberId)).rejects.toThrow(
        'Can only cancel pending invitations',
      );
    });
  });

  describe('listInvitationLinks', () => {
    it('should list invitation links with pagination', async () => {
      const mockLinks = [
        { _id: '1', token: 'token1' },
        { _id: '2', token: 'token2' },
      ];

      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockLinks),
      };

      vi.mocked(InvitationLink.find).mockReturnValue(mockQuery as any);
      vi.mocked(InvitationLink.countDocuments).mockResolvedValue(2);

      const result = await hubInvitationService.listInvitationLinks(mockHubId, {
        page: 1,
        limit: 20,
      });

      expect(result.links).toHaveLength(2);
      expect(result.links[0]?.url).toContain('/join/token1');
      expect(result.pagination.total).toBe(2);
    });

    it('should filter links by status', async () => {
      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(InvitationLink.find).mockReturnValue(mockQuery as any);
      vi.mocked(InvitationLink.countDocuments).mockResolvedValue(0);

      await hubInvitationService.listInvitationLinks(mockHubId, {
        status: InvitationLinkStatus.ACTIVE,
        page: 1,
        limit: 20,
      });

      expect(InvitationLink.find).toHaveBeenCalledWith(
        expect.objectContaining({
          hubId: mockHubId,
          status: InvitationLinkStatus.ACTIVE,
        }),
      );
    });
  });

  describe('disableInvitationLink', () => {
    it('should disable invitation link successfully', async () => {
      const mockLink = {
        _id: mockLinkId,
        status: InvitationLinkStatus.ACTIVE,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(InvitationLink.findById).mockResolvedValue(mockLink as any);

      const result = await hubInvitationService.disableInvitationLink(mockLinkId);

      expect(mockLink.status).toBe(InvitationLinkStatus.DISABLED);
      expect(mockLink.save).toHaveBeenCalled();
      expect(result.message).toBe('Invitation link disabled successfully');
    });

    it('should throw error if link not found', async () => {
      vi.mocked(InvitationLink.findById).mockResolvedValue(null);

      await expect(hubInvitationService.disableInvitationLink(mockLinkId)).rejects.toThrow(
        'Invitation link not found',
      );
    });
  });
});
