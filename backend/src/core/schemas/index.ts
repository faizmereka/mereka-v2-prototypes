/**
 * Schema exports - Use module-specific imports:
 *
 * @schemas/admin  - Admin schemas (adminUser, rbac, communications, settings, reference-data)
 * @schemas/hub    - Hub schemas (contracts, jobs, proposals, milestones, experience, expertise, profiles)
 * @schemas/shared - Shared schemas (auth, payments, communications, infrastructure)
 *
 * Example:
 *   import { adminLoginSchema } from '@schemas/admin';
 *   import { hubContractSchema } from '@schemas/hub';
 */

// Do NOT use `export * from './module'` here to avoid duplicate export conflicts
// Import directly from @schemas/admin, @schemas/hub, @schemas/shared
