import {
  PERMISSION_CATEGORIES,
  PERMISSIONS,
  type PermissionCategoryKey,
  type PermissionKey,
} from '@core/constants';
import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Permission category enum
 * Groups permissions by functional area
 * @deprecated Use PERMISSION_CATEGORIES from @core/constants instead
 */
export enum PermissionCategory {
  EXPERIENCE = 'experience',
  EXPERTISE = 'expertise',
  BOOKING = 'booking',
  COLLABORATOR = 'collaborator',
  JOB = 'job',
  PROFILE = 'profile',
  TEAM = 'team',
  FINANCIAL = 'financial',
  ANALYTICS = 'analytics',
  COMMUNICATION = 'communication',
  NOTIFICATION = 'notification',
  SETTINGS = 'settings',
}

/**
 * Permission document interface
 */
export interface IPermission extends Document {
  // Permission identifier (unique key)
  key: string; // e.g., "canEditExperiences"

  // Display info
  name: string; // e.g., "Edit Experiences"
  description?: string; // e.g., "Allows editing of all experiences in the hub"

  // Categorization
  category: PermissionCategory;

  // Metadata
  isActive: boolean; // Can be disabled without deleting
  isSystemPermission: boolean; // Cannot be deleted (core permissions)

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission schema definition
 */
const permissionSchema = new Schema<IPermission>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // Examples: experience.view, booking.manageCalendar, team.invite
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(PermissionCategory),
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystemPermission: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
permissionSchema.index({ category: 1, isActive: 1 });

/**
 * Permission model
 */
export const Permission = mongoose.model<IPermission>('Permission', permissionSchema);

// Re-export constants for backward compatibility
export { PERMISSIONS, PERMISSION_CATEGORIES, type PermissionKey, type PermissionCategoryKey };

/**
 * Seed default permissions
 * Uses PERMISSIONS constant from @core/constants as single source of truth
 */
const P = PERMISSIONS;

export const DEFAULT_PERMISSIONS = [
  // ============================================
  // EXPERIENCE MANAGEMENT
  // ============================================
  {
    key: P.EXPERIENCE_VIEW,
    name: 'View Experiences',
    description: 'Can view all experiences in the hub',
    category: PermissionCategory.EXPERIENCE,
    isSystemPermission: true,
  },
  {
    key: P.EXPERIENCE_CREATE,
    name: 'Create Experiences',
    description: 'Can create new experiences',
    category: PermissionCategory.EXPERIENCE,
    isSystemPermission: true,
  },
  {
    key: P.EXPERIENCE_EDIT,
    name: 'Edit Experiences',
    description: 'Can edit existing experiences',
    category: PermissionCategory.EXPERIENCE,
    isSystemPermission: true,
  },
  {
    key: P.EXPERIENCE_DELETE,
    name: 'Delete Experiences',
    description: 'Can delete experiences permanently',
    category: PermissionCategory.EXPERIENCE,
    isSystemPermission: true,
  },
  {
    key: P.EXPERIENCE_PUBLISH,
    name: 'Publish Experiences',
    description: 'Can publish/unpublish experiences',
    category: PermissionCategory.EXPERIENCE,
    isSystemPermission: true,
  },
  {
    key: P.EXPERIENCE_ARCHIVE,
    name: 'Archive Experiences',
    description: 'Can archive/unarchive experiences',
    category: PermissionCategory.EXPERIENCE,
    isSystemPermission: true,
  },

  // ============================================
  // EXPERTISE MANAGEMENT
  // ============================================
  {
    key: P.EXPERTISE_VIEW,
    name: 'View Expertise',
    description: 'Can view all expertise services in the hub',
    category: PermissionCategory.EXPERTISE,
    isSystemPermission: true,
  },
  {
    key: P.EXPERTISE_CREATE,
    name: 'Create Expertise',
    description: 'Can create new expertise services',
    category: PermissionCategory.EXPERTISE,
    isSystemPermission: true,
  },
  {
    key: P.EXPERTISE_EDIT,
    name: 'Edit Expertise',
    description: 'Can edit existing expertise services',
    category: PermissionCategory.EXPERTISE,
    isSystemPermission: true,
  },
  {
    key: P.EXPERTISE_DELETE,
    name: 'Delete Expertise',
    description: 'Can delete expertise services permanently',
    category: PermissionCategory.EXPERTISE,
    isSystemPermission: true,
  },
  {
    key: P.EXPERTISE_PUBLISH,
    name: 'Publish Expertise',
    description: 'Can publish/unpublish expertise services',
    category: PermissionCategory.EXPERTISE,
    isSystemPermission: true,
  },
  {
    key: P.EXPERTISE_ARCHIVE,
    name: 'Archive Expertise',
    description: 'Can archive/unarchive expertise services',
    category: PermissionCategory.EXPERTISE,
    isSystemPermission: true,
  },

  // ============================================
  // BOOKING MANAGEMENT
  // ============================================
  {
    key: P.BOOKING_VIEW,
    name: 'View Bookings',
    description: 'Can view all bookings',
    category: PermissionCategory.BOOKING,
    isSystemPermission: true,
  },
  {
    key: P.BOOKING_CREATE,
    name: 'Create Bookings',
    description: 'Can create manual bookings',
    category: PermissionCategory.BOOKING,
    isSystemPermission: true,
  },
  {
    key: P.BOOKING_CONFIRM,
    name: 'Confirm Bookings',
    description: 'Can confirm pending bookings',
    category: PermissionCategory.BOOKING,
    isSystemPermission: true,
  },
  {
    key: P.BOOKING_CANCEL,
    name: 'Cancel Bookings',
    description: 'Can cancel bookings',
    category: PermissionCategory.BOOKING,
    isSystemPermission: true,
  },
  {
    key: P.BOOKING_RESCHEDULE,
    name: 'Reschedule Bookings',
    description: 'Can reschedule bookings',
    category: PermissionCategory.BOOKING,
    isSystemPermission: true,
  },
  {
    key: P.BOOKING_REFUND,
    name: 'Refund Bookings',
    description: 'Can issue refunds for bookings',
    category: PermissionCategory.BOOKING,
    isSystemPermission: true,
  },
  {
    key: P.BOOKING_MANAGE_CALENDAR,
    name: 'Manage Calendar',
    description: 'Can manage availability and block dates',
    category: PermissionCategory.BOOKING,
    isSystemPermission: true,
  },

  // ============================================
  // JOB MANAGEMENT
  // ============================================
  {
    key: P.JOB_VIEW_POSTS,
    name: 'View Job Posts',
    description: 'Can view job posts',
    category: PermissionCategory.JOB,
    isSystemPermission: true,
  },
  {
    key: P.JOB_CREATE_POST,
    name: 'Create Job Posts',
    description: 'Can create new job posts',
    category: PermissionCategory.JOB,
    isSystemPermission: true,
  },
  {
    key: P.JOB_EDIT_POST,
    name: 'Edit Job Posts',
    description: 'Can edit job posts',
    category: PermissionCategory.JOB,
    isSystemPermission: true,
  },
  {
    key: P.JOB_DELETE_POST,
    name: 'Delete Job Posts',
    description: 'Can delete job posts',
    category: PermissionCategory.JOB,
    isSystemPermission: true,
  },
  {
    key: P.JOB_PUBLISH_POST,
    name: 'Publish Job Posts',
    description: 'Can publish/close job posts',
    category: PermissionCategory.JOB,
    isSystemPermission: true,
  },
  {
    key: P.JOB_VIEW_APPLICATIONS,
    name: 'View Applications',
    description: 'Can view job applications/proposals',
    category: PermissionCategory.JOB,
    isSystemPermission: true,
  },
  {
    key: P.JOB_MANAGE_OFFERS,
    name: 'Manage Offers',
    description: 'Can send, edit, and manage job offers',
    category: PermissionCategory.JOB,
    isSystemPermission: true,
  },
  {
    key: P.JOB_VIEW_CONTRACTS,
    name: 'View Contracts',
    description: 'Can view job contracts',
    category: PermissionCategory.JOB,
    isSystemPermission: true,
  },
  {
    key: P.JOB_MANAGE_MILESTONES,
    name: 'Manage Milestones',
    description: 'Can manage contract milestones',
    category: PermissionCategory.JOB,
    isSystemPermission: true,
  },
  {
    key: P.JOB_APPROVE_MILESTONES,
    name: 'Approve Milestones',
    description: 'Can approve/reject milestone completions',
    category: PermissionCategory.JOB,
    isSystemPermission: true,
  },

  // ============================================
  // HUB PROFILE MANAGEMENT
  // ============================================
  {
    key: P.PROFILE_VIEW,
    name: 'View Hub Profile',
    description: 'Can view hub profile information',
    category: PermissionCategory.PROFILE,
    isSystemPermission: true,
  },
  {
    key: P.PROFILE_EDIT,
    name: 'Edit Hub Profile',
    description: 'Can edit hub profile information',
    category: PermissionCategory.PROFILE,
    isSystemPermission: true,
  },
  {
    key: P.PROFILE_MANAGE_MEDIA,
    name: 'Manage Media',
    description: 'Can upload/delete images and videos',
    category: PermissionCategory.PROFILE,
    isSystemPermission: true,
  },

  // ============================================
  // TEAM MANAGEMENT
  // ============================================
  {
    key: P.TEAM_VIEW,
    name: 'View Team Members',
    description: 'Can view team members list',
    category: PermissionCategory.TEAM,
    isSystemPermission: true,
  },
  {
    key: P.TEAM_INVITE,
    name: 'Invite Members',
    description: 'Can invite new team members',
    category: PermissionCategory.TEAM,
    isSystemPermission: true,
  },
  {
    key: P.TEAM_REMOVE,
    name: 'Remove Members',
    description: 'Can remove team members',
    category: PermissionCategory.TEAM,
    isSystemPermission: true,
  },
  {
    key: P.TEAM_EDIT_ROLES,
    name: 'Edit Member Roles',
    description: 'Can change team member roles',
    category: PermissionCategory.TEAM,
    isSystemPermission: true,
  },
  {
    key: P.TEAM_MANAGE_PERMISSIONS,
    name: 'Manage Permissions',
    description: 'Can edit member permissions',
    category: PermissionCategory.TEAM,
    isSystemPermission: true,
  },

  // ============================================
  // FINANCIAL MANAGEMENT
  // ============================================
  {
    key: P.FINANCIAL_VIEW_DASHBOARD,
    name: 'View Financial Dashboard',
    description: 'Can view financial overview and stats',
    category: PermissionCategory.FINANCIAL,
    isSystemPermission: true,
  },
  {
    key: P.FINANCIAL_VIEW_TRANSACTIONS,
    name: 'View Transactions',
    description: 'Can view transaction history',
    category: PermissionCategory.FINANCIAL,
    isSystemPermission: true,
  },
  {
    key: P.FINANCIAL_DOWNLOAD_STATEMENTS,
    name: 'Download Statements',
    description: 'Can download financial statements',
    category: PermissionCategory.FINANCIAL,
    isSystemPermission: true,
  },
  {
    key: P.FINANCIAL_REQUEST_WITHDRAWAL,
    name: 'Request Withdrawal',
    description: 'Can request fund withdrawals',
    category: PermissionCategory.FINANCIAL,
    isSystemPermission: true,
  },
  {
    key: P.FINANCIAL_MANAGE_SUBSCRIPTION,
    name: 'Manage Subscription',
    description: 'Can manage subscription plans and billing',
    category: PermissionCategory.FINANCIAL,
    isSystemPermission: true,
  },
  {
    key: P.FINANCIAL_MANAGE_PAYOUTS,
    name: 'Manage Payouts',
    description: 'Can manage payout settings and bank accounts',
    category: PermissionCategory.FINANCIAL,
    isSystemPermission: true,
  },

  // ============================================
  // ANALYTICS
  // ============================================
  {
    key: P.ANALYTICS_VIEW,
    name: 'View Analytics',
    description: 'Can view analytics dashboard',
    category: PermissionCategory.ANALYTICS,
    isSystemPermission: true,
  },
  {
    key: P.ANALYTICS_EXPORT,
    name: 'Export Analytics',
    description: 'Can export analytics data',
    category: PermissionCategory.ANALYTICS,
    isSystemPermission: true,
  },

  // ============================================
  // COMMUNICATION (Chats, Reviews, Notifications)
  // ============================================
  {
    key: P.COMMUNICATION_VIEW_CHATS,
    name: 'View Chats',
    description: 'Can view chat messages',
    category: PermissionCategory.COMMUNICATION,
    isSystemPermission: true,
  },
  {
    key: P.COMMUNICATION_SEND_MESSAGES,
    name: 'Send Messages',
    description: 'Can send chat messages',
    category: PermissionCategory.COMMUNICATION,
    isSystemPermission: true,
  },
  {
    key: P.COMMUNICATION_VIEW_REVIEWS,
    name: 'View Reviews',
    description: 'Can view customer reviews',
    category: PermissionCategory.COMMUNICATION,
    isSystemPermission: true,
  },
  {
    key: P.COMMUNICATION_RESPOND_REVIEWS,
    name: 'Respond to Reviews',
    description: 'Can respond to customer reviews',
    category: PermissionCategory.COMMUNICATION,
    isSystemPermission: true,
  },
  {
    key: P.COMMUNICATION_MANAGE_NOTIFICATIONS,
    name: 'Manage Notifications',
    description: 'Can manage notification settings',
    category: PermissionCategory.COMMUNICATION,
    isSystemPermission: true,
  },

  // ============================================
  // SETTINGS
  // ============================================
  {
    key: P.SETTINGS_VIEW,
    name: 'View Settings',
    description: 'Can view hub settings',
    category: PermissionCategory.SETTINGS,
    isSystemPermission: true,
  },
  {
    key: P.SETTINGS_EDIT,
    name: 'Edit Settings',
    description: 'Can edit hub settings',
    category: PermissionCategory.SETTINGS,
    isSystemPermission: true,
  },
  {
    key: P.SETTINGS_MANAGE_SECURITY,
    name: 'Manage Security',
    description: 'Can manage security settings (password, 2FA)',
    category: PermissionCategory.SETTINGS,
    isSystemPermission: true,
  },
  {
    key: P.SETTINGS_MANAGE_INTEGRATIONS,
    name: 'Manage Integrations',
    description: 'Can connect/disconnect third-party services',
    category: PermissionCategory.SETTINGS,
    isSystemPermission: true,
  },

  // ============================================
  // COLLABORATOR
  // ============================================
  {
    key: P.COLLABORATOR_VIEW_DASHBOARD,
    name: 'View Collaborator Dashboard',
    description: 'Can view collaborator dashboard with assigned experiences',
    category: PermissionCategory.COLLABORATOR,
    isSystemPermission: true,
  },

  // ============================================
  // NOTIFICATION PREFERENCES
  // ============================================
  {
    key: P.NOTIFICATION_VIEW_OWN,
    name: 'View Own Notifications',
    description: 'Can view own notifications',
    category: PermissionCategory.NOTIFICATION,
    isSystemPermission: true,
  },
  {
    key: P.NOTIFICATION_VIEW_HUB,
    name: 'View Hub Notifications',
    description: 'Can view all hub-level notifications',
    category: PermissionCategory.NOTIFICATION,
    isSystemPermission: true,
  },
  {
    key: P.NOTIFICATION_RECEIVE_BOOKING,
    name: 'Receive Booking Notifications',
    description: 'Receives notifications for booking events',
    category: PermissionCategory.NOTIFICATION,
    isSystemPermission: true,
  },
  {
    key: P.NOTIFICATION_RECEIVE_EXPERIENCE,
    name: 'Receive Experience Notifications',
    description: 'Receives notifications for experience events',
    category: PermissionCategory.NOTIFICATION,
    isSystemPermission: true,
  },
  {
    key: P.NOTIFICATION_RECEIVE_JOB,
    name: 'Receive Job Notifications',
    description: 'Receives notifications for job events',
    category: PermissionCategory.NOTIFICATION,
    isSystemPermission: true,
  },
  {
    key: P.NOTIFICATION_RECEIVE_MEMBER,
    name: 'Receive Member Notifications',
    description: 'Receives notifications for team member events',
    category: PermissionCategory.NOTIFICATION,
    isSystemPermission: true,
  },
  {
    key: P.NOTIFICATION_RECEIVE_PAYMENT,
    name: 'Receive Payment Notifications',
    description: 'Receives notifications for payment events',
    category: PermissionCategory.NOTIFICATION,
    isSystemPermission: true,
  },
  {
    key: P.NOTIFICATION_RECEIVE_SYSTEM,
    name: 'Receive System Notifications',
    description: 'Receives system-level notifications',
    category: PermissionCategory.NOTIFICATION,
    isSystemPermission: true,
  },
  {
    key: P.NOTIFICATION_MANAGE_PREFERENCES,
    name: 'Manage Notification Preferences',
    description: 'Can manage hub notification settings',
    category: PermissionCategory.NOTIFICATION,
    isSystemPermission: true,
  },
];
