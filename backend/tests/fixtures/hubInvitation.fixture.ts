import { Hub } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { InvitationLink, InvitationLinkStatus } from '@core/models/InvitationLink';
import { Permission, PermissionCategory } from '@core/models/Permission';
import { Role, RoleScope, SystemRoleKey } from '@core/models/Role';
import { Subscription } from '@core/models/Subscription';
import { AuthProvider, User, UserStatus } from '@core/models/User';
import { TokenService } from '@services/auth';

/**
 * Setup test environment with hub, roles, permissions, and members
 */
export async function setupHubInvitationTestEnvironment() {
  // Create owner user
  const owner = await User.create({
    email: 'hub-owner@test.com',
    name: 'Hub Owner',
    status: UserStatus.ACTIVE,
    authProviders: [AuthProvider.EMAIL],
    emailVerified: true,
  });

  // Create subscription for owner
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await Subscription.create({
    userId: String(owner._id),
    stripeCustomerId: `cus_test_owner_${Date.now()}`,
    stripeSubscriptionId: `sub_test_owner_${Date.now()}`,
    planCode: 'soar',
    status: 'active',
    billingCycle: 'monthly',
    price: 4900,
    currency: 'USD',
    currentPeriodStart,
    currentPeriodEnd,
    nextBillingDate: currentPeriodEnd,
    createdBy: String(owner._id),
    lastUpdatedBy: String(owner._id),
  });

  // Create permissions
  const permissions = await Permission.insertMany([
    {
      key: 'canInviteMembers',
      name: 'Can Invite Members',
      description: 'Can invite new members to the hub',
      category: PermissionCategory.TEAM,
      isActive: true,
    },
    {
      key: 'canRemoveMembers',
      name: 'Can Remove Members',
      description: 'Can remove members from the hub',
      category: PermissionCategory.TEAM,
      isActive: true,
    },
    {
      key: 'canEditMemberRoles',
      name: 'Can Edit Member Roles',
      description: 'Can change member roles',
      category: PermissionCategory.TEAM,
      isActive: true,
    },
    {
      key: 'canViewFinancials',
      name: 'Can View Financials',
      description: 'Can view financial data',
      category: PermissionCategory.FINANCIAL,
      isActive: true,
    },
  ]);

  const permissionIds = permissions.map((p) => p._id);

  // Create system roles
  const adminRole = await Role.create({
    key: SystemRoleKey.ADMIN,
    name: 'Admin',
    description: 'Full access to hub',
    permissions: permissionIds, // All permissions
    scope: RoleScope.SYSTEM,
    isSystemRole: true,
  });

  const expertRole = await Role.create({
    key: SystemRoleKey.EXPERT,
    name: 'Expert',
    description: 'Content creator - can manage experiences',
    permissions: [permissionIds[0], permissionIds[2]], // canInviteMembers, canEditMemberRoles
    scope: RoleScope.SYSTEM,
    isSystemRole: true,
  });

  const memberRole = await Role.create({
    key: SystemRoleKey.MEMBER,
    name: 'Member',
    description: 'Basic member access',
    permissions: [], // No permissions
    scope: RoleScope.SYSTEM,
    isSystemRole: true,
  });

  // Create hub with all required fields
  const hub = await Hub.create({
    name: 'Test Hub',
    slug: 'test-hub',
    ownerId: owner._id,
    logo: 'https://example.com/logo.png',
    phoneNumber: '+60123456789',
    location: {
      city: 'Kuala Lumpur',
      country: 'Malaysia',
    },
    gallery: [],
    createdBy: String(owner._id),
    lastUpdatedBy: String(owner._id),
  });

  // Create owner as hub member
  await HubMember.create({
    hubId: hub._id,
    userId: owner._id,
    roleId: adminRole._id,
    status: HubMemberStatus.ACTIVE,
    joinedAt: new Date(),
  });

  // Generate token for owner
  const tokenService = new TokenService();
  const ownerToken = tokenService.generateAccessToken(owner);

  return {
    owner,
    ownerId: String(owner._id),
    ownerToken,
    hub,
    hubId: String(hub._id),
    roles: {
      admin: adminRole,
      adminId: String(adminRole._id),
      expert: expertRole,
      expertId: String(expertRole._id),
      member: memberRole,
      memberId: String(memberRole._id),
    },
    permissions: permissions.map((p) => ({
      key: p.key,
      id: String(p._id),
    })),
  };
}

/**
 * Create additional test user
 */
export async function createTestUser(email: string, name: string) {
  const user = await User.create({
    email,
    name,
    status: UserStatus.ACTIVE,
    authProviders: [AuthProvider.EMAIL],
    emailVerified: true,
  });

  const tokenService = new TokenService();
  const token = tokenService.generateAccessToken(user);

  return {
    user,
    userId: String(user._id),
    token,
  };
}

/**
 * Create test invitation
 */
export async function createTestInvitation(
  hubId: string,
  roleId: string,
  invitedBy: string,
  _email: string,
  userId?: string,
) {
  const member = await HubMember.create({
    hubId,
    userId,
    roleId,
    status: HubMemberStatus.INVITED,
    invitedBy,
    invitedAt: new Date(),
    invitationToken: `test-token-${Date.now()}`,
    invitationExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  return {
    member,
    memberId: String(member._id),
    token: member.invitationToken,
  };
}

/**
 * Create test invitation link
 */
export async function createTestInvitationLink(
  hubId: string,
  roleId: string,
  createdBy: string,
  maxUses?: number,
) {
  const link = await InvitationLink.create({
    hubId,
    roleId,
    token: `link-token-${Date.now()}`,
    maxUses,
    usedCount: 0,
    status: InvitationLinkStatus.ACTIVE,
    createdBy,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  return {
    link,
    linkId: String(link._id),
    token: link.token,
  };
}

/**
 * Create hub member with specific role
 */
export async function createHubMember(
  hubId: string,
  userId: string,
  roleId: string,
  status: HubMemberStatus = HubMemberStatus.ACTIVE,
) {
  const member = await HubMember.create({
    hubId,
    userId,
    roleId,
    status,
    joinedAt: status === HubMemberStatus.ACTIVE ? new Date() : undefined,
  });

  return {
    member,
    memberId: String(member._id),
  };
}

/**
 * Get auth header helper
 */
export function getAuthHeader(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
  };
}
