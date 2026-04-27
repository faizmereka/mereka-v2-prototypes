import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================================
// API Response Types (local - ApiResponse is already exported from auth.service)
// ============================================================================

interface InvitationApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface InvitationInfo {
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
}

export interface AcceptInvitationResult {
  member: {
    id: string;
    hubId: string;
    userId: string;
    status: string;
  };
  hub: {
    id: string;
    name: string;
    slug: string;
  };
  roles: Array<{
    id: string;
    key: string;
    name: string;
  }>;
}

// ============================================================================
// Error Types
// ============================================================================

export type InvitationErrorCode =
  | 'INVALID_TOKEN'
  | 'EXPIRED_INVITATION'
  | 'ALREADY_MEMBER'
  | 'ACCEPT_FAILED'
  | 'JOIN_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export class InvitationError extends Error {
  constructor(
    public code: InvitationErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'InvitationError';
  }
}

// ============================================================================
// Invitation Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class InvitationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Get invitation info by token (public - no auth required)
   */
  async getInvitationInfo(token: string): Promise<InvitationInfo> {
    const url = `${this.apiUrl}/hub/invitations/${token}/info`;

    try {
      const response = await firstValueFrom(
        this.http.get<InvitationApiResponse<InvitationInfo>>(url)
      );

      if (!response.success || !response.data) {
        throw new InvitationError(
          'INVALID_TOKEN',
          response.error?.message || 'Invalid invitation token'
        );
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'INVALID_TOKEN');
    }
  }

  /**
   * Accept email invitation (requires auth)
   */
  async acceptEmailInvitation(token: string): Promise<AcceptInvitationResult> {
    const url = `${this.apiUrl}/hub/invitations/${token}/accept`;

    try {
      const response = await firstValueFrom(
        this.http.post<InvitationApiResponse<AcceptInvitationResult>>(url, {}, {
          withCredentials: true,
        })
      );

      if (!response.success || !response.data) {
        throw new InvitationError(
          'ACCEPT_FAILED',
          response.error?.message || 'Failed to accept invitation'
        );
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'ACCEPT_FAILED');
    }
  }

  /**
   * Join via invitation link (requires auth)
   */
  async joinViaLink(token: string): Promise<AcceptInvitationResult> {
    const url = `${this.apiUrl}/hub/invitation-links/${token}/join`;

    try {
      const response = await firstValueFrom(
        this.http.post<InvitationApiResponse<AcceptInvitationResult>>(url, {}, {
          withCredentials: true,
        })
      );

      if (!response.success || !response.data) {
        throw new InvitationError(
          'JOIN_FAILED',
          response.error?.message || 'Failed to join via link'
        );
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'JOIN_FAILED');
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Handle HTTP errors and convert to InvitationError
   */
  private handleError(error: unknown, defaultCode: InvitationErrorCode): InvitationError {
    if (error instanceof InvitationError) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      // Network error
      if (error.status === 0) {
        return new InvitationError('NETWORK_ERROR', 'Unable to connect to server');
      }

      // API error with message
      if (error.error?.error?.message) {
        const message = error.error.error.message;

        // Map specific messages to error codes
        if (message.includes('expired')) {
          return new InvitationError('EXPIRED_INVITATION', message);
        }
        if (message.includes('already a member')) {
          return new InvitationError('ALREADY_MEMBER', message);
        }
        if (message.includes('invalid') || message.includes('not found')) {
          return new InvitationError('INVALID_TOKEN', message);
        }

        return new InvitationError(defaultCode, message);
      }

      // HTTP status based error
      if (error.status === 410) {
        return new InvitationError('EXPIRED_INVITATION', 'This invitation has expired');
      }
      if (error.status === 404) {
        return new InvitationError('INVALID_TOKEN', 'Invitation not found');
      }
    }

    return new InvitationError(defaultCode, 'An unexpected error occurred');
  }
}
