import { ROLE_PERMISSIONS } from '@core/constants';
import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Role scope enum
 * Determines where the role can be used
 */
export enum RoleScope {
  SYSTEM = 'system', // Built-in roles (owner, admin, etc.)
  HUB = 'hub', // Custom roles created by hub owners
}

/**
 * Role document interface
 */
export interface IRole extends Document {
  // Role identifier
  key: string; // e.g., "owner", "admin", "content-manager"

  // Display info
  name: string; // e.g., "Owner", "Content Manager"
  description?: string;

  // Permissions (array of Permission IDs)
  permissions: mongoose.Types.ObjectId[]; // References to Permission collection

  // Scope
  scope: RoleScope;
  hubId?: mongoose.Types.ObjectId; // If scope=HUB, which hub does this role belong to?

  // Metadata
  isActive: boolean;
  isSystemRole: boolean; // Cannot be deleted/edited (core roles)

  // Usage tracking
  memberCount?: number; // Number of members with this role (computed field)

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role schema definition
 */
const roleSchema = new Schema<IRole>(
  {
    key: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
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
    permissions: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
      default: [],
    },
    scope: {
      type: String,
      enum: Object.values(RoleScope),
      required: true,
      default: RoleScope.HUB,
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystemRole: {
      type: Boolean,
      default: false,
    },
    memberCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index: key must be unique within scope+hub
roleSchema.index({ key: 1, scope: 1, hubId: 1 }, { unique: true });

// Index for querying roles by hub
roleSchema.index({ hubId: 1, isActive: 1 });

/**
 * Role model
 */
export const Role = mongoose.model<IRole>('Role', roleSchema);

/**
 * System role keys (built-in roles that exist globally)
 */
export enum SystemRoleKey {
  OWNER = 'owner',
  ADMIN = 'admin',
  EXPERT = 'expert',
  MEMBER = 'member',
  COLLABORATOR = 'collaborator',
}

/**
 * Seed default system roles
 * Uses ROLE_PERMISSIONS from @core/constants as single source of truth
 */
export const DEFAULT_SYSTEM_ROLES = [
  {
    key: SystemRoleKey.OWNER,
    name: 'Owner',
    description: 'Full control over hub including billing, settings, and team management',
    scope: RoleScope.SYSTEM,
    isSystemRole: true,
    permissionKeys: ROLE_PERMISSIONS.owner,
  },
  {
    key: SystemRoleKey.ADMIN,
    name: 'Admin',
    description: 'Hub administrator - manage team, content, and settings (but not financials)',
    scope: RoleScope.SYSTEM,
    isSystemRole: true,
    permissionKeys: ROLE_PERMISSIONS.admin,
  },
  {
    key: SystemRoleKey.EXPERT,
    name: 'Expert',
    description: 'Content creator - create and manage experiences, expertise, bookings, and media',
    scope: RoleScope.SYSTEM,
    isSystemRole: true,
    permissionKeys: ROLE_PERMISSIONS.expert,
  },
  {
    key: SystemRoleKey.MEMBER,
    name: 'Member',
    description: 'Basic hub member - view bookings, analytics, and limited hub access',
    scope: RoleScope.SYSTEM,
    isSystemRole: true,
    permissionKeys: ROLE_PERMISSIONS.member,
  },
  {
    key: SystemRoleKey.COLLABORATOR,
    name: 'Collaborator',
    description: 'Experience collaborator - manage specific experiences they are assigned to',
    scope: RoleScope.SYSTEM,
    isSystemRole: true,
    permissionKeys: ROLE_PERMISSIONS.collaborator,
  },
];
