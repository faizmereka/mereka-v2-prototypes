/**
 * Permission System Constants
 *
 * Single source of truth for ALL permission keys used across
 * the backend and frontend (via API endpoint).
 *
 * Permission key format: {category}.{action}
 * Examples: experience.view, team.invite, financial.viewDashboard
 */

// ============================================
// PERMISSION KEYS (Single Source of Truth)
// ============================================

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
  FINANCIAL_MANAGE_BANK_ACCOUNTS: 'financial.manageBankAccounts',
  FINANCIAL_SETUP_STRIPE: 'financial.setupStripe',

  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',

  // Communication
  COMMUNICATION_VIEW_CHATS: 'communication.viewChats',
  COMMUNICATION_SEND_MESSAGES: 'communication.sendMessages',
  COMMUNICATION_VIEW_REVIEWS: 'communication.viewReviews',
  COMMUNICATION_RESPOND_REVIEWS: 'communication.respondReviews',
  COMMUNICATION_MANAGE_NOTIFICATIONS: 'communication.manageNotifications',

  // Notification Preferences
  NOTIFICATION_VIEW_OWN: 'notification.viewOwn',
  NOTIFICATION_VIEW_HUB: 'notification.viewHub',
  NOTIFICATION_RECEIVE_BOOKING: 'notification.receiveBooking',
  NOTIFICATION_RECEIVE_EXPERIENCE: 'notification.receiveExperience',
  NOTIFICATION_RECEIVE_JOB: 'notification.receiveJob',
  NOTIFICATION_RECEIVE_MEMBER: 'notification.receiveMember',
  NOTIFICATION_RECEIVE_PAYMENT: 'notification.receivePayment',
  NOTIFICATION_RECEIVE_SYSTEM: 'notification.receiveSystem',
  NOTIFICATION_MANAGE_PREFERENCES: 'notification.managePreferences',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_MANAGE_SECURITY: 'settings.manageSecurity',
  SETTINGS_MANAGE_INTEGRATIONS: 'settings.manageIntegrations',

  // Collaborator Dashboard
  COLLABORATOR_VIEW_DASHBOARD: 'collaborator.viewDashboard',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================
// PERMISSION CATEGORIES
// ============================================

export const PERMISSION_CATEGORIES = {
  EXPERIENCE: 'experience',
  EXPERTISE: 'expertise',
  BOOKING: 'booking',
  COLLABORATOR: 'collaborator',
  JOB: 'job',
  PROFILE: 'profile',
  TEAM: 'team',
  FINANCIAL: 'financial',
  ANALYTICS: 'analytics',
  COMMUNICATION: 'communication',
  NOTIFICATION: 'notification',
  SETTINGS: 'settings',
} as const;

export type PermissionCategoryKey =
  (typeof PERMISSION_CATEGORIES)[keyof typeof PERMISSION_CATEGORIES];

// ============================================
// ROLE PERMISSION MAPPINGS
// ============================================

const P = PERMISSIONS;

/**
 * Default permissions for each system role
 * Used for seeding roles and frontend display
 */
export const ROLE_PERMISSIONS = {
  // Owner has ALL permissions
  owner: Object.values(PERMISSIONS),

  // Admin has most permissions except sensitive financial/security
  admin: [
    // Experience - all
    P.EXPERIENCE_VIEW,
    P.EXPERIENCE_CREATE,
    P.EXPERIENCE_EDIT,
    P.EXPERIENCE_DELETE,
    P.EXPERIENCE_PUBLISH,
    P.EXPERIENCE_ARCHIVE,
    // Expertise - all
    P.EXPERTISE_VIEW,
    P.EXPERTISE_CREATE,
    P.EXPERTISE_EDIT,
    P.EXPERTISE_DELETE,
    P.EXPERTISE_PUBLISH,
    P.EXPERTISE_ARCHIVE,
    // Booking - all
    P.BOOKING_VIEW,
    P.BOOKING_CREATE,
    P.BOOKING_CONFIRM,
    P.BOOKING_CANCEL,
    P.BOOKING_RESCHEDULE,
    P.BOOKING_REFUND,
    P.BOOKING_MANAGE_CALENDAR,
    // Job - all
    P.JOB_VIEW_POSTS,
    P.JOB_CREATE_POST,
    P.JOB_EDIT_POST,
    P.JOB_DELETE_POST,
    P.JOB_PUBLISH_POST,
    P.JOB_VIEW_APPLICATIONS,
    P.JOB_MANAGE_OFFERS,
    P.JOB_VIEW_CONTRACTS,
    P.JOB_MANAGE_MILESTONES,
    P.JOB_APPROVE_MILESTONES,
    // Profile - all
    P.PROFILE_VIEW,
    P.PROFILE_EDIT,
    P.PROFILE_MANAGE_MEDIA,
    // Team - all except managePermissions
    P.TEAM_VIEW,
    P.TEAM_INVITE,
    P.TEAM_REMOVE,
    P.TEAM_EDIT_ROLES,
    // Financial - view only, no billing/payouts
    P.FINANCIAL_VIEW_DASHBOARD,
    P.FINANCIAL_VIEW_TRANSACTIONS,
    P.FINANCIAL_DOWNLOAD_STATEMENTS,
    P.FINANCIAL_REQUEST_WITHDRAWAL,
    // Analytics - all
    P.ANALYTICS_VIEW,
    P.ANALYTICS_EXPORT,
    // Communication - all
    P.COMMUNICATION_VIEW_CHATS,
    P.COMMUNICATION_SEND_MESSAGES,
    P.COMMUNICATION_VIEW_REVIEWS,
    P.COMMUNICATION_RESPOND_REVIEWS,
    P.COMMUNICATION_MANAGE_NOTIFICATIONS,
    // Notification - all except payment (no payment notifications for admin)
    P.NOTIFICATION_VIEW_OWN,
    P.NOTIFICATION_VIEW_HUB,
    P.NOTIFICATION_RECEIVE_BOOKING,
    P.NOTIFICATION_RECEIVE_EXPERIENCE,
    P.NOTIFICATION_RECEIVE_JOB,
    P.NOTIFICATION_RECEIVE_MEMBER,
    P.NOTIFICATION_RECEIVE_SYSTEM,
    P.NOTIFICATION_MANAGE_PREFERENCES,
    // Settings - view and edit, no security/integrations
    P.SETTINGS_VIEW,
    P.SETTINGS_EDIT,
  ],

  // Expert (Team Member) - content creation focused
  expert: [
    // Experience - full CRUD
    P.EXPERIENCE_VIEW,
    P.EXPERIENCE_CREATE,
    P.EXPERIENCE_EDIT,
    P.EXPERIENCE_DELETE,
    P.EXPERIENCE_PUBLISH,
    P.EXPERIENCE_ARCHIVE,
    // Expertise - full CRUD
    P.EXPERTISE_VIEW,
    P.EXPERTISE_CREATE,
    P.EXPERTISE_EDIT,
    P.EXPERTISE_DELETE,
    P.EXPERTISE_PUBLISH,
    P.EXPERTISE_ARCHIVE,
    // Booking - manage bookings
    P.BOOKING_VIEW,
    P.BOOKING_CREATE,
    P.BOOKING_CONFIRM,
    P.BOOKING_CANCEL,
    P.BOOKING_MANAGE_CALENDAR,
    // Job - view own applications and contracts (expert-specific)
    P.JOB_VIEW_APPLICATIONS,
    P.JOB_VIEW_CONTRACTS,
    // Profile - view and manage media
    P.PROFILE_VIEW,
    P.PROFILE_MANAGE_MEDIA,
    // Analytics - view only
    P.ANALYTICS_VIEW,
    // Communication - view and respond
    P.COMMUNICATION_VIEW_CHATS,
    P.COMMUNICATION_SEND_MESSAGES,
    P.COMMUNICATION_VIEW_REVIEWS,
    P.COMMUNICATION_RESPOND_REVIEWS,
    // Notification - own + assigned experience notifications
    P.NOTIFICATION_VIEW_OWN,
    P.NOTIFICATION_RECEIVE_BOOKING,
    P.NOTIFICATION_RECEIVE_EXPERIENCE,
    P.NOTIFICATION_RECEIVE_JOB,
  ],

  // Member - view only access
  member: [
    P.EXPERIENCE_VIEW,
    P.EXPERTISE_VIEW,
    P.BOOKING_VIEW,
    P.PROFILE_VIEW,
    P.ANALYTICS_VIEW,
    P.COMMUNICATION_VIEW_CHATS,
    P.COMMUNICATION_VIEW_REVIEWS,
    P.JOB_VIEW_POSTS,
    P.JOB_VIEW_CONTRACTS,
    // Notification - own notifications only
    P.NOTIFICATION_VIEW_OWN,
  ],

  // Collaborator - dashboard + view/edit experiences they're assigned to as hosts
  collaborator: [
    P.COLLABORATOR_VIEW_DASHBOARD,
    P.EXPERIENCE_VIEW,
    P.EXPERIENCE_EDIT,
    // Notification - own + assigned experience notifications only
    P.NOTIFICATION_VIEW_OWN,
    P.NOTIFICATION_RECEIVE_EXPERIENCE,
  ],
} as const;

export type RoleKey = keyof typeof ROLE_PERMISSIONS;

// ============================================
// PERMISSION UI CATEGORIES (for frontend tables)
// ============================================

export interface PermissionTableRow {
  label: string;
  permissions: (PermissionKey | null)[];
}

export interface PermissionTableCategory {
  key: string;
  label: string;
  columns: string[];
  rows: PermissionTableRow[];
}

/**
 * Permission categories formatted for UI permission tables
 * Used by frontend to display permission checkboxes
 */
export const PERMISSION_UI_CATEGORIES: PermissionTableCategory[] = [
  {
    key: 'experience',
    label: 'Experience Management',
    columns: ['View', 'Create', 'Edit', 'Delete', 'Publish', 'Archive'],
    rows: [
      {
        label: 'Experiences',
        permissions: [
          P.EXPERIENCE_VIEW,
          P.EXPERIENCE_CREATE,
          P.EXPERIENCE_EDIT,
          P.EXPERIENCE_DELETE,
          P.EXPERIENCE_PUBLISH,
          P.EXPERIENCE_ARCHIVE,
        ],
      },
    ],
  },
  {
    key: 'expertise',
    label: 'Expertise Management',
    columns: ['View', 'Create', 'Edit', 'Delete', 'Publish', 'Archive'],
    rows: [
      {
        label: 'Expertise Services',
        permissions: [
          P.EXPERTISE_VIEW,
          P.EXPERTISE_CREATE,
          P.EXPERTISE_EDIT,
          P.EXPERTISE_DELETE,
          P.EXPERTISE_PUBLISH,
          P.EXPERTISE_ARCHIVE,
        ],
      },
    ],
  },
  {
    key: 'booking',
    label: 'Booking Management',
    columns: ['View', 'Create', 'Confirm', 'Cancel', 'Reschedule', 'Refund', 'Calendar'],
    rows: [
      {
        label: 'Bookings',
        permissions: [
          P.BOOKING_VIEW,
          P.BOOKING_CREATE,
          P.BOOKING_CONFIRM,
          P.BOOKING_CANCEL,
          P.BOOKING_RESCHEDULE,
          P.BOOKING_REFUND,
          P.BOOKING_MANAGE_CALENDAR,
        ],
      },
    ],
  },
  {
    key: 'job',
    label: 'Job Management',
    columns: ['View', 'Create', 'Edit', 'Delete', 'Publish'],
    rows: [
      {
        label: 'Job Posts',
        permissions: [
          P.JOB_VIEW_POSTS,
          P.JOB_CREATE_POST,
          P.JOB_EDIT_POST,
          P.JOB_DELETE_POST,
          P.JOB_PUBLISH_POST,
        ],
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
          P.JOB_VIEW_APPLICATIONS,
          P.JOB_MANAGE_OFFERS,
          P.JOB_VIEW_CONTRACTS,
          P.JOB_MANAGE_MILESTONES,
          P.JOB_APPROVE_MILESTONES,
        ],
      },
    ],
  },
  {
    key: 'profile',
    label: 'Hub Profile',
    columns: ['View', 'Edit', 'Manage Media'],
    rows: [
      {
        label: 'Profile',
        permissions: [P.PROFILE_VIEW, P.PROFILE_EDIT, P.PROFILE_MANAGE_MEDIA],
      },
    ],
  },
  {
    key: 'team',
    label: 'Team Management',
    columns: ['View', 'Invite', 'Remove', 'Edit Roles', 'Permissions'],
    rows: [
      {
        label: 'Team Members',
        permissions: [
          P.TEAM_VIEW,
          P.TEAM_INVITE,
          P.TEAM_REMOVE,
          P.TEAM_EDIT_ROLES,
          P.TEAM_MANAGE_PERMISSIONS,
        ],
      },
    ],
  },
  {
    key: 'financial',
    label: 'Financial Management',
    columns: [
      'Dashboard',
      'Transactions',
      'Download',
      'Withdrawal',
      'Subscription',
      'Payouts',
      'Bank Accounts',
      'Stripe Setup',
    ],
    rows: [
      {
        label: 'Financials',
        permissions: [
          P.FINANCIAL_VIEW_DASHBOARD,
          P.FINANCIAL_VIEW_TRANSACTIONS,
          P.FINANCIAL_DOWNLOAD_STATEMENTS,
          P.FINANCIAL_REQUEST_WITHDRAWAL,
          P.FINANCIAL_MANAGE_SUBSCRIPTION,
          P.FINANCIAL_MANAGE_PAYOUTS,
          P.FINANCIAL_MANAGE_BANK_ACCOUNTS,
          P.FINANCIAL_SETUP_STRIPE,
        ],
      },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    columns: ['View', 'Export'],
    rows: [
      {
        label: 'Analytics',
        permissions: [P.ANALYTICS_VIEW, P.ANALYTICS_EXPORT],
      },
    ],
  },
  {
    key: 'communication',
    label: 'Communication',
    columns: ['View Chats', 'Send', 'View Reviews', 'Respond', 'Notifications'],
    rows: [
      {
        label: 'Communication',
        permissions: [
          P.COMMUNICATION_VIEW_CHATS,
          P.COMMUNICATION_SEND_MESSAGES,
          P.COMMUNICATION_VIEW_REVIEWS,
          P.COMMUNICATION_RESPOND_REVIEWS,
          P.COMMUNICATION_MANAGE_NOTIFICATIONS,
        ],
      },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    columns: ['View', 'Edit', 'Security', 'Integrations'],
    rows: [
      {
        label: 'Hub Settings',
        permissions: [
          P.SETTINGS_VIEW,
          P.SETTINGS_EDIT,
          P.SETTINGS_MANAGE_SECURITY,
          P.SETTINGS_MANAGE_INTEGRATIONS,
        ],
      },
    ],
  },
  {
    key: 'notification',
    label: 'Notification Preferences',
    columns: [
      'View Own',
      'View Hub',
      'Bookings',
      'Experiences',
      'Jobs',
      'Members',
      'Payments',
      'System',
      'Manage',
    ],
    rows: [
      {
        label: 'Notifications',
        permissions: [
          P.NOTIFICATION_VIEW_OWN,
          P.NOTIFICATION_VIEW_HUB,
          P.NOTIFICATION_RECEIVE_BOOKING,
          P.NOTIFICATION_RECEIVE_EXPERIENCE,
          P.NOTIFICATION_RECEIVE_JOB,
          P.NOTIFICATION_RECEIVE_MEMBER,
          P.NOTIFICATION_RECEIVE_PAYMENT,
          P.NOTIFICATION_RECEIVE_SYSTEM,
          P.NOTIFICATION_MANAGE_PREFERENCES,
        ],
      },
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all permission keys as an array
 */
export function getAllPermissionKeys(): PermissionKey[] {
  return Object.values(PERMISSIONS);
}

/**
 * Get permissions by category
 */
export function getPermissionsByCategory(category: PermissionCategoryKey): PermissionKey[] {
  return Object.values(PERMISSIONS).filter((key) => key.startsWith(`${category}.`));
}

/**
 * Check if a string is a valid permission key
 */
export function isValidPermissionKey(key: string): key is PermissionKey {
  return Object.values(PERMISSIONS).includes(key as PermissionKey);
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(roleKey: RoleKey): PermissionKey[] {
  return [...ROLE_PERMISSIONS[roleKey]];
}
