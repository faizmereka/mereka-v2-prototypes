/**
 * Notification Enums
 * Shared enums for notification system
 */

/**
 * Notification Scope
 * Defines whether the notification is user-level or hub-level
 *
 * - user: Personal notifications (password reset, welcome, account updates)
 * - hub: Hub-related notifications (bookings, payments, members, jobs)
 */
export enum NotificationScope {
  USER = 'user',
  HUB = 'hub',
}

/**
 * Target User Types
 * Defines which user types can receive a notification
 *
 * Used in templates to specify the intended audience
 */
export enum TargetUserType {
  LEARNER = 'learner',
  EXPERT = 'expert',
  HUB_OWNER = 'hub_owner',
  HUB_ADMIN = 'hub_admin',
  HUB_COLLABORATOR = 'hub_collaborator',
}

/**
 * All target user type values as array
 * Useful for validation and enum checks
 */
export const TARGET_USER_TYPE_VALUES = Object.values(TargetUserType);

/**
 * All notification scope values as array
 */
export const NOTIFICATION_SCOPE_VALUES = Object.values(NotificationScope);
