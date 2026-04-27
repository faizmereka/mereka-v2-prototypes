/**
 * Admin Services Index
 *
 * Organized by domain:
 * - jobs/ - Job, Proposal, Contract management
 * - hubs/ - Hub management
 * - experiences/ - Experience management
 * - users/ - Admin user authentication and management
 * - communications/ - Email and notification templates
 * - banking/ - Bank management
 * - rbac/ - Role and permission management
 * - settings/ - Settings and reference data stats
 */

// Banking domain
export * from './banking';
// Communications domain (email/notification templates)
export * from './communications';
// Dashboard domain
export * from './dashboard';

// Experiences domain
export * from './experiences';
// Favorites domain (analytics)
export * from './favorites';
// Hubs domain
export * from './hubs';
// Jobs domain (jobs, proposals, contracts)
export * from './jobs';
// RBAC domain (roles, permissions)
export * from './rbac';
// Reference data domain
export * from './reference-data';
// Settings domain (stats, reference data)
export * from './settings';
// Users domain (admin users)
export * from './users';
// Withdrawals domain
export * from './withdrawals';
