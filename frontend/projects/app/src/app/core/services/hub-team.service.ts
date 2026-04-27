import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export type MemberStatus = 'active' | 'invited' | 'suspended' | 'left';

export interface HubTeamMember {
  id: string; // HubMember _id
  odooId?: number | null;
  odooUserId?: number | null;
  userId: string;
  name: string;
  email: string;
  avatar?: string | null;
  bio?: string | null; // User's bio for host description
  roleIds?: string[];
  roleKeys: string[];
  roleNames: string[];
  status: MemberStatus;
  joinedAt?: string;
  invitedAt?: string;
  invitedBy?: string;
  title?: string;
  permissions?: string[]; // Custom permissions (override)
  rolePermissions?: string[]; // Default permissions from role
}

export interface HubInvitation {
  id: string;
  email: string;
  roleIds: string[];
  roleKeys?: string[];
  roleNames: string[];
  status: 'pending' | 'expired';
  invitedAt: string;
  expiresAt?: string;
  invitedBy?: {
    name: string;
    email: string;
  };
}

export interface HubRole {
  id: string;
  key: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
}

export interface TeamStats {
  teamMembers: number;
  collaborators: number;
  pendingInvitations: number;
  activeInvitationLinks: number;
}

interface ListMembersResponse {
  members: Array<{
    _id: string;
    userId?: {
      _id: string;
      name?: string;
      email?: string;
      profilePhoto?: string;
      bio?: string;
    } | null;
    roleIds?: Array<{
      _id: string;
      key: string;
      name: string;
    }>;
    status: MemberStatus;
    joinedAt?: string;
    invitedAt?: string;
    title?: string;
    permissions?: string[]; // Custom permissions from HubMember
    rolePermissions?: string[]; // Computed: default permissions from all assigned roles
    invitedBy?: {
      _id: string;
      name?: string;
      email?: string;
    } | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ListInvitationsResponse {
  invitations: Array<{
    _id: string;
    invitedEmail?: string; // Email address the invitation was sent to
    roleIds?: Array<{
      _id: string;
      key: string;
      name: string;
    }>;
    status: 'pending' | 'expired';
    invitedAt: string;
    expiresAt?: string;
    invitedBy?: {
      _id: string;
      name?: string;
      email?: string;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ListRolesResponse {
  roles: Array<{
    id: string;
    key: string;
    name: string;
    description?: string;
    isSystemRole: boolean;
  }>;
}

// Invitation response types
interface InviteMembersApiResponse {
  invited: number;
  failed: string[];
  invitations?: Array<{
    email: string;
    invitationUrl: string;
  }>;
}

export interface InviteMembersResult {
  success: boolean;
  invited: number;
  failed: string[];
  invitations: Array<{
    email: string;
    invitationUrl: string;
  }>;
}

export interface InvitationLink {
  id: string;
  token: string;
  link: string;
  roleId: string;
  roleName: string;
  roleKey: string;
  expiresAt: string;
  usageCount: number;
  maxUses: number | null;
  isActive: boolean;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  } | null;
}

@Injectable({
  providedIn: 'root',
})
export class HubTeamService {
  private readonly http = inject(HttpClient);

  private membersUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/members`;
  }

  private rolesUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/roles`;
  }

  private invitationsUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/invitations`;
  }

  private invitationLinksUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/invitation-links`;
  }

  private inviteUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/members/invite`;
  }

  private statsUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/members/stats`;
  }

  /**
   * Get team stats for tabs (counts only)
   */
  async getTeamStats(hubId: string): Promise<TeamStats> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<TeamStats>>(this.statsUrl(hubId), {
        withCredentials: true,
      }),
    );

    if (!response.success || !response.data) {
      return {
        teamMembers: 0,
        collaborators: 0,
        pendingInvitations: 0,
        activeInvitationLinks: 0,
      };
    }

    return response.data;
  }

  /**
   * List hub members with optional status and role filter.
   */
  async listMembers(
    hubId: string,
    options?: { status?: MemberStatus; roleKey?: string; search?: string; limit?: number; page?: number },
  ): Promise<{ members: HubTeamMember[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    let params = new HttpParams();

    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.roleKey) {
      params = params.set('roleKey', options.roleKey);
    }
    if (options?.search) {
      params = params.set('search', options.search);
    }
    if (options?.limit) {
      params = params.set('limit', String(options.limit));
    }
    if (options?.page) {
      params = params.set('page', String(options.page));
    }

    const response = await firstValueFrom(
      this.http.get<ApiResponse<ListMembersResponse>>(this.membersUrl(hubId), {
        params,
        withCredentials: true,
      }),
    );

    if (!response.success || !response.data) {
      return { members: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    const members = response.data.members
      .filter((m) => !!m.userId)
      .map((m) => {
        const user = m.userId!;
        const roles = m.roleIds ?? [];
        const memberData = {
          id: m._id,
          userId: user._id,
          name: user.name ?? user.email ?? 'Unknown',
          email: user.email ?? '',
          avatar: user.profilePhoto ?? null,
          bio: user.bio ?? null,
          roleIds: roles.map((r) => r._id),
          roleKeys: roles.map((r) => r.key),
          roleNames: roles.map((r) => r.name),
          status: m.status,
          joinedAt: m.joinedAt,
          invitedAt: m.invitedAt,
          invitedBy: m.invitedBy?.name,
          title: m.title,
          permissions: m.permissions, // Custom permissions (override)
          rolePermissions: m.rolePermissions, // Default permissions from role
        };
        
        // Debug logging for permissions
        if (m.permissions !== undefined || m.rolePermissions) {
          console.log('[API] Member loaded:', {
            id: memberData.id,
            name: memberData.name,
            customPermissions: m.permissions,
            customPermissionsLength: m.permissions?.length,
            rolePermissions: m.rolePermissions,
            rolePermissionsLength: m.rolePermissions?.length,
          });
        }
        
        return memberData;
      });

    return { members, pagination: response.data.pagination };
  }

  /**
   * List active hub members for the current hub.
   * Used for host selection (team members).
   */
  async listActiveMembers(hubId: string, options?: { search?: string; limit?: number }): Promise<HubTeamMember[]> {
    const result = await this.listMembers(hubId, { ...options, status: 'active' });
    return result.members;
  }

  /**
   * List pending invitations for the hub.
   */
  async listPendingInvitations(
    hubId: string,
    options?: { search?: string; limit?: number; page?: number },
  ): Promise<{ invitations: HubInvitation[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    let params = new HttpParams();

    if (options?.search) {
      params = params.set('search', options.search);
    }
    if (options?.limit) {
      params = params.set('limit', String(options.limit));
    }
    if (options?.page) {
      params = params.set('page', String(options.page));
    }

    const response = await firstValueFrom(
      this.http.get<ApiResponse<ListInvitationsResponse>>(this.invitationsUrl(hubId), {
        params,
        withCredentials: true,
      }),
    );

    if (!response.success || !response.data) {
      return { invitations: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    const invitations = response.data.invitations.map((inv) => ({
      id: inv._id,
      email: inv.invitedEmail ?? '', // Backend returns invitedEmail
      roleIds: inv.roleIds?.map((r) => r._id) ?? [],
      roleKeys: inv.roleIds?.map((r) => r.key) ?? [],
      roleNames: inv.roleIds?.map((r) => r.name) ?? [],
      status: inv.status,
      invitedAt: inv.invitedAt,
      expiresAt: inv.expiresAt,
      invitedBy: inv.invitedBy
        ? { name: inv.invitedBy.name ?? '', email: inv.invitedBy.email ?? '' }
        : undefined,
    }));

    return { invitations, pagination: response.data.pagination };
  }

  /**
   * Invite users by email to join the hub.
   * Returns invitation URLs for testing/manual sharing.
   */
  async inviteMembers(
    hubId: string,
    emails: string[],
    roleId: string,
  ): Promise<InviteMembersResult> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<InviteMembersApiResponse>>(
        this.inviteUrl(hubId),
        { emails, roleId },
        { withCredentials: true },
      ),
    );

    if (!response.success || !response.data) {
      return { success: false, invited: 0, failed: emails, invitations: [] };
    }

    return {
      success: true,
      invited: response.data.invited,
      failed: response.data.failed ?? [],
      invitations: response.data.invitations ?? [],
    };
  }

  /**
   * Remove a member from the hub.
   */
  async removeMember(hubId: string, memberId: string): Promise<boolean> {
    const response = await firstValueFrom(
      this.http.delete<ApiResponse<unknown>>(`${this.membersUrl(hubId)}/${memberId}`, {
        withCredentials: true,
      }),
    );

    return response.success;
  }

  /**
   * Cancel a pending invitation.
   */
  async cancelInvitation(hubId: string, invitationId: string): Promise<boolean> {
    const response = await firstValueFrom(
      this.http.delete<ApiResponse<unknown>>(`${this.invitationsUrl(hubId)}/${invitationId}`, {
        withCredentials: true,
      }),
    );

    return response.success;
  }

  /**
   * Update a member's role.
   * Accepts a single roleId or array of roleIds.
   */
  async updateMemberRole(hubId: string, memberId: string, roleId: string | string[]): Promise<boolean> {
    const roleIds = Array.isArray(roleId) ? roleId : [roleId];
    const response = await firstValueFrom(
      this.http.patch<ApiResponse<unknown>>(
        `${this.membersUrl(hubId)}/${memberId}`,
        { roleIds },
        { withCredentials: true },
      ),
    );

    return response.success;
  }

  /**
   * Update a member's custom permissions.
   * When permissions are set, they override the default role permissions.
   */
  async updateMemberPermissions(hubId: string, memberId: string, permissions: string[]): Promise<boolean> {
    const url = `${this.membersUrl(hubId)}/${memberId}/permissions`;
    const body = { permissions };
    console.log('[API] PATCH', url, body);

    const response = await firstValueFrom(
      this.http.patch<ApiResponse<unknown>>(url, body, { withCredentials: true }),
    );

    console.log('[API] Response:', response);
    return response.success;
  }

  /**
   * Create an invitation link for the hub.
   * Returns a shareable link that expires in 30 days.
   */
  async createInvitationLink(hubId: string, roleId: string): Promise<{ link: string; expiresAt: string }> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<{ link: string; expiresAt: string }>>(
        this.invitationLinksUrl(hubId),
        { roleId },
        { withCredentials: true },
      ),
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to create invitation link');
    }

    return response.data;
  }

  /**
   * List invitation links for the hub.
   */
  async listInvitationLinks(
    hubId: string,
    options?: { includeExpired?: boolean; limit?: number; page?: number },
  ): Promise<{ links: InvitationLink[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    let params = new HttpParams();

    if (options?.includeExpired) {
      params = params.set('includeExpired', 'true');
    }
    if (options?.limit) {
      params = params.set('limit', String(options.limit));
    }
    if (options?.page) {
      params = params.set('page', String(options.page));
    }

    const response = await firstValueFrom(
      this.http.get<ApiResponse<{
        links: Array<{
          _id: string;
          token: string;
          url: string; // Backend returns 'url', not 'link'
          roleIds: Array<{ _id: string; name: string; key: string }> | null; // Backend returns 'roleIds' array
          expiresAt: string;
          usedCount: number; // Backend returns 'usedCount', not 'usageCount'
          maxUses: number | null;
          status: 'active' | 'expired' | 'disabled'; // Backend returns 'status', not 'isActive'
          createdAt: string;
          createdBy: { name?: string; email?: string } | null;
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>>(this.invitationLinksUrl(hubId), {
        params,
        withCredentials: true,
      }),
    );

    if (!response.success || !response.data) {
      return { links: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    // Map backend response to frontend interface
    const links: InvitationLink[] = response.data.links.map((link) => {
      const firstRole = link.roleIds && link.roleIds.length > 0 ? link.roleIds[0] : null;
      return {
        id: link._id,
        token: link.token,
        link: link.url || '', // Backend returns 'url'
        roleId: firstRole?._id ?? '',
        roleName: firstRole?.name ?? 'Unknown',
        roleKey: firstRole?.key ?? 'unknown',
        expiresAt: link.expiresAt,
        usageCount: link.usedCount ?? 0, // Backend returns 'usedCount'
        maxUses: link.maxUses,
        isActive: link.status === 'active', // Convert status to boolean
        createdAt: link.createdAt,
        createdBy: link.createdBy ? { name: link.createdBy.name ?? '', email: link.createdBy.email ?? '' } : null,
      };
    });

    return { links, pagination: response.data.pagination };
  }

  /**
   * Disable an invitation link.
   */
  async disableInvitationLink(hubId: string, linkId: string): Promise<boolean> {
    const response = await firstValueFrom(
      this.http.delete<ApiResponse<unknown>>(`${this.invitationLinksUrl(hubId)}/${linkId}`, {
        withCredentials: true,
      }),
    );

    return response.success;
  }

  /**
   * List all roles available in the current hub.
   * Includes system and hub-specific roles.
   */
  async listRoles(hubId: string): Promise<HubRole[]> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<ListRolesResponse>>(this.rolesUrl(hubId), {
        withCredentials: true,
      }),
    );

    if (!response.success || !response.data) {
      return [];
    }

    return response.data.roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
    }));
  }
}


