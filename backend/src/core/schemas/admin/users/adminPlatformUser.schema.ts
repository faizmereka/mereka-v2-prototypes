import { UserStatus } from '@core/models/User';

/**
 * Admin Platform User schemas - Native JSON Schema
 * For managing platform users (learners, experts, hub owners) - NOT admin users
 */

/**
 * Platform user type based on hub membership
 */
export type PlatformUserType = 'all' | 'learner' | 'hub_owner' | 'expert' | 'admin' | 'member';

/**
 * Query platform users schema
 */
export const adminQueryPlatformUsersSchema = {
  type: 'object',
  properties: {
    page: {
      type: 'number',
      minimum: 1,
      default: 1,
      description: 'Page number',
    },
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Items per page',
    },
    status: {
      type: 'string',
      enum: Object.values(UserStatus),
      description: 'User status filter',
    },
    userType: {
      type: 'string',
      enum: ['all', 'learner', 'hub_owner', 'expert', 'admin', 'member'],
      default: 'all',
      description: 'User type filter based on hub roles',
    },
    search: {
      type: 'string',
      description: 'Search by name or email',
    },
    sortBy: {
      type: 'string',
      enum: ['name', 'email', 'createdAt', 'lastLoginAt'],
      default: 'createdAt',
      description: 'Sort field',
    },
    sortOrder: {
      type: 'string',
      enum: ['asc', 'desc'],
      default: 'desc',
      description: 'Sort order',
    },
  },
} as const;

/**
 * Get platform user by ID schema
 */
export const adminGetPlatformUserSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      description: 'User ID',
    },
  },
} as const;

/**
 * Platform user stats response schema
 */
export const platformUserStatsResponseSchema = {
  type: 'object',
  properties: {
    total: { type: 'number' },
    active: { type: 'number' },
    inactive: { type: 'number' },
    suspended: { type: 'number' },
    byType: {
      type: 'object',
      properties: {
        learners: { type: 'number' },
        hubOwners: { type: 'number' },
        experts: { type: 'number' },
        admins: { type: 'number' },
        members: { type: 'number' },
      },
    },
    newThisMonth: { type: 'number' },
    newThisWeek: { type: 'number' },
  },
} as const;

/**
 * Platform user list item response schema
 */
export const platformUserListItemResponseSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    profilePhoto: { type: 'string' },
    status: { type: 'string', enum: Object.values(UserStatus) },
    emailVerified: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    lastLoginAt: { type: 'string', format: 'date-time' },
    userTypes: { type: 'array', items: { type: 'string' } },
    hubCount: { type: 'number' },
    primaryRole: { type: 'string' },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface AdminQueryPlatformUsersInput {
  page?: number;
  limit?: number;
  status?: UserStatus;
  userType?: PlatformUserType;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminGetPlatformUserInput {
  id: string;
}
