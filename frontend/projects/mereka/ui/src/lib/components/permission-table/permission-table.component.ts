import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Permission definition for the table
 */
export interface PermissionDef {
  key: string;
  name: string;
  description?: string;
  category: string;
}

/**
 * Permission category configuration
 */
export interface PermissionCategory {
  key: string;
  label: string;
  columns: string[];
  rows: PermissionRow[];
}

/**
 * Permission row configuration
 */
export interface PermissionRow {
  label: string;
  permissions: (string | null)[]; // Permission keys for each column, null = no checkbox
}

/**
 * ALL Hub permissions organized by category
 * Based on DEFAULT_PERMISSIONS from backend Permission model
 */
export const ALL_HUB_PERMISSION_CATEGORIES: PermissionCategory[] = [
  // ============================================
  // EXPERIENCE MANAGEMENT
  // ============================================
  {
    key: 'experience',
    label: 'Experience Management',
    columns: ['View', 'Create', 'Edit', 'Delete', 'Publish', 'Archive'],
    rows: [
      {
        label: 'Experiences',
        permissions: [
          'experience.view',
          'experience.create',
          'experience.edit',
          'experience.delete',
          'experience.publish',
          'experience.archive',
        ],
      },
    ],
  },

  // ============================================
  // EXPERTISE MANAGEMENT
  // ============================================
  {
    key: 'expertise',
    label: 'Expertise Management',
    columns: ['View', 'Create', 'Edit', 'Delete', 'Publish', 'Archive'],
    rows: [
      {
        label: 'Expertise Services',
        permissions: [
          'expertise.view',
          'expertise.create',
          'expertise.edit',
          'expertise.delete',
          'expertise.publish',
          'expertise.archive',
        ],
      },
    ],
  },

  // ============================================
  // BOOKING MANAGEMENT
  // ============================================
  {
    key: 'booking',
    label: 'Booking Management',
    columns: ['View', 'Create', 'Confirm', 'Cancel', 'Reschedule', 'Refund', 'Calendar'],
    rows: [
      {
        label: 'Bookings',
        permissions: [
          'booking.view',
          'booking.create',
          'booking.confirm',
          'booking.cancel',
          'booking.reschedule',
          'booking.refund',
          'booking.manageCalendar',
        ],
      },
    ],
  },

  // ============================================
  // JOB MANAGEMENT
  // ============================================
  {
    key: 'job',
    label: 'Job Management',
    columns: ['View', 'Create', 'Edit', 'Delete', 'Publish'],
    rows: [
      {
        label: 'Job Posts',
        permissions: ['job.viewPosts', 'job.createPost', 'job.editPost', 'job.deletePost', 'job.publishPost'],
      },
    ],
  },
  {
    key: 'job-applications',
    label: 'Job Applications & Contracts',
    columns: ['View Apps', 'Manage Offers', 'View Contracts', 'Manage Milestones', 'Approve'],
    rows: [
      {
        label: 'Applications & Contracts',
        permissions: [
          'job.viewApplications',
          'job.manageOffers',
          'job.viewContracts',
          'job.manageMilestones',
          'job.approveMilestones',
        ],
      },
    ],
  },

  // ============================================
  // HUB PROFILE MANAGEMENT
  // ============================================
  {
    key: 'profile',
    label: 'Hub Profile',
    columns: ['View', 'Edit', 'Manage Media'],
    rows: [
      {
        label: 'Profile',
        permissions: ['profile.view', 'profile.edit', 'profile.manageMedia'],
      },
    ],
  },

  // ============================================
  // TEAM MANAGEMENT
  // ============================================
  {
    key: 'team',
    label: 'Team Management',
    columns: ['View', 'Invite', 'Remove', 'Edit Roles', 'Manage Permissions'],
    rows: [
      {
        label: 'Team Members',
        permissions: ['team.view', 'team.invite', 'team.remove', 'team.editRoles', 'team.managePermissions'],
      },
    ],
  },

  // ============================================
  // FINANCIAL MANAGEMENT
  // ============================================
  {
    key: 'financial',
    label: 'Financial Management',
    columns: ['View Dashboard', 'View Transactions', 'Download', 'Withdrawal', 'Billing', 'Payouts'],
    rows: [
      {
        label: 'Financials',
        permissions: [
          'financial.viewDashboard',
          'financial.viewTransactions',
          'financial.downloadStatements',
          'financial.requestWithdrawal',
          'financial.manageSubscription',
          'financial.managePayouts',
        ],
      },
    ],
  },

  // ============================================
  // ANALYTICS
  // ============================================
  {
    key: 'analytics',
    label: 'Analytics',
    columns: ['View', 'Export'],
    rows: [
      {
        label: 'Analytics',
        permissions: ['analytics.view', 'analytics.export'],
      },
    ],
  },

  // ============================================
  // COMMUNICATION
  // ============================================
  {
    key: 'communication',
    label: 'Communication',
    columns: ['View Chats', 'Send Messages', 'View Reviews', 'Respond Reviews', 'Notifications'],
    rows: [
      {
        label: 'Communication',
        permissions: [
          'communication.viewChats',
          'communication.sendMessages',
          'communication.viewReviews',
          'communication.respondReviews',
          'communication.manageNotifications',
        ],
      },
    ],
  },

  // ============================================
  // SETTINGS
  // ============================================
  {
    key: 'settings',
    label: 'Settings',
    columns: ['View', 'Edit', 'Security', 'Integrations'],
    rows: [
      {
        label: 'Hub Settings',
        permissions: ['settings.view', 'settings.edit', 'settings.manageSecurity', 'settings.manageIntegrations'],
      },
    ],
  },
];

/**
 * Simplified permission categories for Hub team members (legacy format)
 */
export const HUB_PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: 'settings',
    label: 'Settings',
    columns: ['Add', 'View', 'Edit', 'Delete'],
    rows: [
      { label: 'Hub Profile', permissions: [null, 'settings.view', 'settings.edit', null] },
      { label: 'Users', permissions: ['team.invite', 'team.view', 'team.editRoles', 'team.remove'] },
      { label: 'Subscription', permissions: [null, 'financial.viewDashboard', 'financial.manageSubscription', null] },
    ],
  },
  {
    key: 'services',
    label: 'Service',
    columns: ['Add', 'View', 'Edit & Export', 'Delete'],
    rows: [
      {
        label: 'All Listings',
        permissions: ['experience.create', 'experience.view', 'experience.edit', 'experience.delete'],
      },
      {
        label: 'All Calendar',
        permissions: ['booking.manageCalendar', 'booking.view', 'booking.manageCalendar', 'booking.cancel'],
      },
      { label: 'All Bookings', permissions: ['booking.create', 'booking.view', 'booking.confirm', 'booking.cancel'] },
    ],
  },
];

/**
 * Collaborator permission categories (limited access)
 */
export const COLLABORATOR_PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: 'experience',
    label: 'Experience',
    columns: ['View', 'Export', 'Edit'],
    rows: [{ label: 'Assigned Experiences', permissions: ['experience.view', 'experience.edit', 'experience.edit'] }],
  },
];

@Component({
  selector: 'ui-permission-table',
  imports: [CommonModule],
  template: `
    <div class="permission-table">
      <ng-container *ngFor="let category of categories; trackBy: trackByKey">
        <div class="mb-6">
          <!-- Header Row -->
          <div
            class="grid gap-2 py-3 border-b border-neutral-200 text-sm font-medium text-neutral-500"
            [ngStyle]="{ 'grid-template-columns': getGridColumns(category) }"
          >
            <div class="font-semibold text-neutral-700">{{ category.label }}</div>
            <ng-container *ngFor="let col of category.columns">
              <div class="text-center text-xs">{{ col }}</div>
            </ng-container>
          </div>

          <!-- Data Rows -->
          <ng-container *ngFor="let row of category.rows">
            <div
              class="grid gap-2 py-3 border-b border-neutral-100 items-center"
              [ngStyle]="{ 'grid-template-columns': getGridColumns(category) }"
            >
              <div class="text-neutral-700 text-sm">{{ row.label }}</div>
              <ng-container *ngFor="let permKey of row.permissions; let i = index">
                <div class="flex justify-center">
                  <input
                    *ngIf="permKey"
                    type="checkbox"
                    [checked]="hasPermission(permKey)"
                    [disabled]="!isEditing"
                    (change)="onToggle(permKey)"
                    class="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary disabled:opacity-50 cursor-pointer disabled:cursor-default"
                  />
                </div>
              </ng-container>
            </div>
          </ng-container>
        </div>
      </ng-container>
    </div>
  `,
})
export class UiPermissionTableComponent {
  /**
   * Array of permission keys that are currently enabled
   */
  @Input() permissions: string[] = [];

  /**
   * Permission categories to display
   */
  @Input() categories: PermissionCategory[] = HUB_PERMISSION_CATEGORIES;

  /**
   * Whether permissions can be edited
   */
  @Input() isEditing = false;

  /**
   * Emitted when a permission is toggled
   */
  @Output() permissionToggled = new EventEmitter<string>();

  /**
   * Get grid columns style based on number of columns
   */
  getGridColumns(category: PermissionCategory): string {
    const colCount = category.columns.length;
    // First column for label (wider), then equal columns for checkboxes
    return `minmax(120px, 1fr) repeat(${colCount}, 60px)`;
  }

  /**
   * Check if a permission is enabled (case-insensitive)
   */
  hasPermission(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.permissions.some((p) => p.toLowerCase() === lowerKey);
  }

  /**
   * Toggle a permission
   */
  onToggle(key: string): void {
    this.permissionToggled.emit(key);
  }

  /**
   * Track by function for categories
   */
  trackByKey(index: number, category: PermissionCategory): string {
    return category.key;
  }
}
