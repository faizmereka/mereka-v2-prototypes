import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================================
// Types (matching backend @core/constants/permissions.ts)
// ============================================================================

export interface PermissionTableRow {
  label: string;
  permissions: (string | null)[];
}

export interface PermissionTableCategory {
  key: string;
  label: string;
  columns: string[];
  rows: PermissionTableRow[];
}

export interface PermissionDefinitions {
  permissions: Record<string, string>;
  categories: Record<string, string>;
  rolePermissions: Record<string, string[]>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Permission Key Constants (Frontend reference - synced with backend)
// ============================================================================

/**
 * Permission key constants for type-safe permission checks.
 * These match the backend PERMISSIONS constant in @core/constants/permissions.ts
 *
 * Usage:
 * ```typescript
 * // Instead of:
 * if (permissionService.has('experience.view')) { ... }
 *
 * // Use:
 * if (permissionService.has(PERMISSIONS.EXPERIENCE_VIEW)) { ... }
 * ```
 */
export const PERMISSIONS = {
  // Experience Management
  EXPERIENCE_VIEW: 'experience.view',
  EXPERIENCE_CREATE: 'experience.create',
  EXPERIENCE_EDIT: 'experience.edit',
  EXPERIENCE_DELETE: 'experience.delete',
  EXPERIENCE_PUBLISH: 'experience.publish',
  EXPERIENCE_ARCHIVE: 'experience.archive',

  // Expertise Management
  EXPERTISE_VIEW: 'expertise.view',
  EXPERTISE_CREATE: 'expertise.create',
  EXPERTISE_EDIT: 'expertise.edit',
  EXPERTISE_DELETE: 'expertise.delete',
  EXPERTISE_PUBLISH: 'expertise.publish',
  EXPERTISE_ARCHIVE: 'expertise.archive',

  // Booking Management
  BOOKING_VIEW: 'booking.view',
  BOOKING_CREATE: 'booking.create',
  BOOKING_CONFIRM: 'booking.confirm',
  BOOKING_CANCEL: 'booking.cancel',
  BOOKING_RESCHEDULE: 'booking.reschedule',
  BOOKING_REFUND: 'booking.refund',
  BOOKING_MANAGE_CALENDAR: 'booking.manageCalendar',

  // Job Management
  JOB_VIEW_POSTS: 'job.viewPosts',
  JOB_CREATE_POST: 'job.createPost',
  JOB_EDIT_POST: 'job.editPost',
  JOB_DELETE_POST: 'job.deletePost',
  JOB_PUBLISH_POST: 'job.publishPost',
  JOB_VIEW_APPLICATIONS: 'job.viewApplications',
  JOB_MANAGE_OFFERS: 'job.manageOffers',
  JOB_VIEW_CONTRACTS: 'job.viewContracts',
  JOB_MANAGE_MILESTONES: 'job.manageMilestones',
  JOB_APPROVE_MILESTONES: 'job.approveMilestones',

  // Hub Profile Management
  PROFILE_VIEW: 'profile.view',
  PROFILE_EDIT: 'profile.edit',
  PROFILE_MANAGE_MEDIA: 'profile.manageMedia',

  // Team Management
  TEAM_VIEW: 'team.view',
  TEAM_INVITE: 'team.invite',
  TEAM_REMOVE: 'team.remove',
  TEAM_EDIT_ROLES: 'team.editRoles',
  TEAM_MANAGE_PERMISSIONS: 'team.managePermissions',

  // Financial Management
  FINANCIAL_VIEW_DASHBOARD: 'financial.viewDashboard',
  FINANCIAL_VIEW_TRANSACTIONS: 'financial.viewTransactions',
  FINANCIAL_DOWNLOAD_STATEMENTS: 'financial.downloadStatements',
  FINANCIAL_REQUEST_WITHDRAWAL: 'financial.requestWithdrawal',
  FINANCIAL_MANAGE_SUBSCRIPTION: 'financial.manageSubscription',
  FINANCIAL_MANAGE_PAYOUTS: 'financial.managePayouts',

  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',

  // Communication
  COMMUNICATION_VIEW_CHATS: 'communication.viewChats',
  COMMUNICATION_SEND_MESSAGES: 'communication.sendMessages',
  COMMUNICATION_VIEW_REVIEWS: 'communication.viewReviews',
  COMMUNICATION_RESPOND_REVIEWS: 'communication.respondReviews',
  COMMUNICATION_MANAGE_NOTIFICATIONS: 'communication.manageNotifications',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_MANAGE_SECURITY: 'settings.manageSecurity',
  SETTINGS_MANAGE_INTEGRATIONS: 'settings.manageIntegrations',

  // Collaborator Dashboard
  COLLABORATOR_VIEW_DASHBOARD: 'collaborator.viewDashboard',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================================================
// Permission Definitions Service
// ============================================================================

/**
 * Service for fetching permission definitions from the backend API.
 * Used for:
 * - Permission table UI (displaying all permissions with their categories)
 * - Validating permission keys
 * - Getting role-permission mappings for display
 *
 * Note: For checking user permissions, use PermissionService instead.
 */
@Injectable({ providedIn: 'root' })
export class PermissionDefinitionsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // State signals
  private readonly _definitions = signal<PermissionDefinitions | null>(null);
  private readonly _categories = signal<PermissionTableCategory[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly definitions = this._definitions.asReadonly();
  readonly categories = this._categories.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Fetch all permission definitions from the API
   * Call this on app initialization or when permission data is needed
   */
  async loadDefinitions(): Promise<void> {
    if (this._definitions()) {
      return; // Already loaded
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<PermissionDefinitions>>(`${this.apiUrl}/permissions`)
      );

      if (response.success && response.data) {
        this._definitions.set(response.data);
      } else {
        this._error.set(response.error?.message || 'Failed to load permission definitions');
      }
    } catch (err) {
      this._error.set('Failed to fetch permission definitions');
      console.error('Error loading permission definitions:', err);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Fetch permission categories formatted for UI tables
   * Used by permission-table component
   */
  async loadCategories(): Promise<void> {
    if (this._categories().length > 0) {
      return; // Already loaded
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<PermissionTableCategory[]>>(`${this.apiUrl}/permissions/categories`)
      );

      if (response.success && response.data) {
        this._categories.set(response.data);
      } else {
        this._error.set(response.error?.message || 'Failed to load permission categories');
      }
    } catch (err) {
      this._error.set('Failed to fetch permission categories');
      console.error('Error loading permission categories:', err);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Get all permission keys as an array
   */
  getAllPermissionKeys(): PermissionKey[] {
    return Object.values(PERMISSIONS);
  }

  /**
   * Get default permissions for a role
   */
  getRolePermissions(roleKey: string): string[] {
    const defs = this._definitions();
    return defs?.rolePermissions[roleKey] || [];
  }

  /**
   * Check if a permission key is valid
   */
  isValidPermissionKey(key: string): key is PermissionKey {
    return Object.values(PERMISSIONS).includes(key as PermissionKey);
  }

  /**
   * Get permission label for display
   */
  getPermissionLabel(key: string): string {
    // Convert 'experience.view' to 'View Experiences'
    const parts = key.split('.');
    if (parts.length !== 2) return key;

    const [category, action] = parts;
    const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);

    // Special cases for better labels
    const categoryLabels: Record<string, string> = {
      experience: 'Experiences',
      expertise: 'Expertise',
      booking: 'Bookings',
      job: 'Jobs',
      profile: 'Profile',
      team: 'Team',
      financial: 'Financials',
      analytics: 'Analytics',
      communication: 'Communication',
      settings: 'Settings',
      collaborator: 'Collaborator',
    };

    return `${actionLabel} ${categoryLabels[category] || category}`;
  }
}
