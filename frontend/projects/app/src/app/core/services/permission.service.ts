import { Injectable, inject, computed } from '@angular/core';
import { AuthStateService } from './auth-state.service';

/**
 * Permission Service
 * Provides utility methods for checking permissions in components and services.
 * For template-based checks, use the HasPermissionDirective.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly authState = inject(AuthStateService);

  // ============================================================================
  // Computed Signals for Common Permission Groups
  // ============================================================================

  // Experience permissions
  readonly canViewExperiences = computed(() => this.authState.hasPermission('experience.view'));
  readonly canCreateExperiences = computed(() => this.authState.hasPermission('experience.create'));
  readonly canEditExperiences = computed(() => this.authState.hasPermission('experience.edit'));
  readonly canDeleteExperiences = computed(() => this.authState.hasPermission('experience.delete'));
  readonly canPublishExperiences = computed(() => this.authState.hasPermission('experience.publish'));

  // Expertise permissions
  readonly canViewExpertise = computed(() => this.authState.hasPermission('expertise.view'));
  readonly canCreateExpertise = computed(() => this.authState.hasPermission('expertise.create'));
  readonly canEditExpertise = computed(() => this.authState.hasPermission('expertise.edit'));
  readonly canDeleteExpertise = computed(() => this.authState.hasPermission('expertise.delete'));
  readonly canPublishExpertise = computed(() => this.authState.hasPermission('expertise.publish'));

  // Booking permissions
  readonly canViewBookings = computed(() => this.authState.hasPermission('booking.view'));
  readonly canManageBookings = computed(() =>
    this.authState.hasAnyPermission(['booking.confirm', 'booking.cancel', 'booking.reschedule'])
  );
  readonly canRefundBookings = computed(() => this.authState.hasPermission('booking.refund'));
  readonly canManageCalendar = computed(() => this.authState.hasPermission('booking.manageCalendar'));

  // Job permissions
  readonly canViewJobs = computed(() => this.authState.hasPermission('job.viewPosts'));
  readonly canCreateJobs = computed(() => this.authState.hasPermission('job.createPost'));
  readonly canManageJobs = computed(() =>
    this.authState.hasAnyPermission(['job.editPost', 'job.deletePost', 'job.publishPost'])
  );
  readonly canManageContracts = computed(() =>
    this.authState.hasAnyPermission(['job.viewContracts', 'job.manageMilestones', 'job.approveMilestones'])
  );

  // Team permissions
  readonly canViewTeam = computed(() => this.authState.hasPermission('team.view'));
  readonly canInviteMembers = computed(() => this.authState.hasPermission('team.invite'));
  readonly canRemoveMembers = computed(() => this.authState.hasPermission('team.remove'));
  readonly canManageRoles = computed(() =>
    this.authState.hasAnyPermission(['team.editRoles', 'team.managePermissions'])
  );

  // Financial permissions
  readonly canViewFinancials = computed(() =>
    this.authState.hasAnyPermission(['financial.viewDashboard', 'financial.viewTransactions'])
  );
  readonly canManageFinancials = computed(() =>
    this.authState.hasAnyPermission(['financial.requestWithdrawal', 'financial.manageSubscription', 'financial.managePayouts'])
  );

  // Analytics permissions
  readonly canViewAnalytics = computed(() => this.authState.hasPermission('analytics.view'));
  readonly canExportAnalytics = computed(() => this.authState.hasPermission('analytics.export'));

  // Profile permissions
  readonly canEditProfile = computed(() => this.authState.hasPermission('profile.edit'));
  readonly canManageMedia = computed(() => this.authState.hasPermission('profile.manageMedia'));

  // Communication permissions
  readonly canViewChats = computed(() => this.authState.hasPermission('communication.viewChats'));
  readonly canSendMessages = computed(() => this.authState.hasPermission('communication.sendMessages'));
  readonly canManageReviews = computed(() =>
    this.authState.hasAnyPermission(['communication.viewReviews', 'communication.respondReviews'])
  );

  // Settings permissions
  readonly canManageSettings = computed(() =>
    this.authState.hasAnyPermission(['settings.edit', 'settings.manageSecurity', 'settings.manageIntegrations'])
  );

  // ============================================================================
  // Role-based Computed Signals
  // ============================================================================

  readonly isOwner = computed(() => this.authState.hasRole('owner'));
  readonly isAdmin = computed(() => this.authState.hasRole('admin'));
  readonly isExpert = computed(() => this.authState.hasRole('expert'));
  readonly isMember = computed(() => this.authState.hasRole('member'));
  readonly isCollaborator = computed(() => this.authState.hasRole('collaborator'));

  // ============================================================================
  // Dynamic Permission Check Methods
  // ============================================================================

  /**
   * Check if user has a specific permission
   */
  has(permissionKey: string): boolean {
    return this.authState.hasPermission(permissionKey);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAny(permissionKeys: string[]): boolean {
    return this.authState.hasAnyPermission(permissionKeys);
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAll(permissionKeys: string[]): boolean {
    return this.authState.hasAllPermissions(permissionKeys);
  }

  /**
   * Check if user has a specific role
   */
  hasRole(roleKey: string): boolean {
    return this.authState.hasRole(roleKey);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roleKeys: string[]): boolean {
    return this.authState.hasAnyRole(roleKeys);
  }

  /**
   * Get all current permission keys
   */
  getAllPermissions(): string[] {
    return this.authState.permissions();
  }

  /**
   * Get all current role keys
   */
  getAllRoles(): string[] {
    return this.authState.roles().map((r) => r.key);
  }
}
