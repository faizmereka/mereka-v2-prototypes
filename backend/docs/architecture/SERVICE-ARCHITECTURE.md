# Service Architecture

## Overview

Services, controllers, and routes are organized to **mirror the modules structure** with domain-based grouping. Each module has its own folder structure.

## Import Patterns

```typescript
// Services - import from module barrel
import { adminJobService } from '@services/admin';
import { experienceService } from '@services/web';
import { hubContractService } from '@services/hub';
import { authService, stripeService } from '@services/shared';

// Controllers - import from module barrel (in routes)
import { listJobs, getJobById } from '@controllers/admin';
import { createContract, getContracts } from '@controllers/hub';

// Routes - import from module barrel (in module index)
import { adminJobRoutes } from '@routes/admin';
import { hubContractRoutes } from '@routes/hub';
```

## Complete Folder Structure

### Services (`src/core/services/`)

```
src/core/services/
├── admin/                              # @services/admin
│   ├── banking/
│   │   ├── adminBank.service.ts        → AdminBankService
│   │   └── index.ts
│   ├── communications/
│   │   ├── adminEmailTemplate.service.ts
│   │   ├── adminNotificationTemplate.service.ts
│   │   └── index.ts
│   ├── experiences/
│   │   ├── adminExperience.service.ts
│   │   └── index.ts
│   ├── hubs/
│   │   ├── adminHub.service.ts
│   │   └── index.ts
│   ├── jobs/
│   │   ├── adminJob.service.ts
│   │   ├── adminProposal.service.ts
│   │   ├── adminContract.service.ts
│   │   └── index.ts
│   ├── rbac/
│   │   ├── adminRole.service.ts
│   │   ├── adminPermission.service.ts
│   │   └── index.ts
│   ├── settings/
│   │   ├── adminSettingsStats.service.ts
│   │   └── index.ts
│   ├── users/
│   │   ├── adminUser.service.ts
│   │   └── index.ts
│   └── index.ts                        # Exports all admin services
│
├── hub/                                # @services/hub
│   ├── contracts/
│   │   ├── hubContract.service.ts      → HubContractService
│   │   └── index.ts
│   ├── invitations/
│   │   ├── hubInvitation.service.ts
│   │   └── index.ts
│   ├── jobs/
│   │   ├── hubJob.service.ts
│   │   └── index.ts
│   ├── members/
│   │   ├── hubMember.service.ts
│   │   └── index.ts
│   ├── milestones/
│   │   ├── hubMilestone.service.ts
│   │   └── index.ts
│   ├── profiles/
│   │   ├── hubProfile.service.ts
│   │   └── index.ts
│   ├── proposals/
│   │   ├── hubProposal.service.ts
│   │   └── index.ts
│   ├── timelogs/
│   │   ├── hubTimelog.service.ts
│   │   └── index.ts
│   └── index.ts                        # Exports all hub services
│
├── web/                                # @services/web
│   ├── experience/
│   │   ├── experience.service.ts       → ExperienceService
│   │   ├── experienceEvent.service.ts
│   │   └── index.ts
│   ├── profiles/
│   │   ├── learner-profile.service.ts
│   │   ├── expertise.service.ts
│   │   └── index.ts
│   ├── reference-data/                 # @services/reference-data
│   │   ├── amenity.service.ts
│   │   ├── company-type.service.ts
│   │   ├── experience-theme.service.ts
│   │   ├── experience-topic.service.ts
│   │   ├── experience-type.service.ts
│   │   ├── facility.service.ts
│   │   ├── focus-area.service.ts
│   │   ├── job-preference.service.ts
│   │   ├── language.service.ts
│   │   ├── skill.service.ts
│   │   ├── space-type.service.ts
│   │   ├── target-audience.service.ts
│   │   └── index.ts
│   └── index.ts
│
├── shared/                             # @services/shared
│   ├── auth/                           # @services/auth
│   │   ├── auth.service.ts
│   │   ├── password.service.ts
│   │   ├── token.service.ts
│   │   └── index.ts
│   ├── communications/                 # @services/communications
│   │   ├── email.service.ts
│   │   ├── notification.service.ts
│   │   └── index.ts
│   ├── hub/
│   │   ├── hub.service.ts
│   │   └── index.ts
│   ├── infrastructure/                 # @services/infrastructure
│   │   ├── apiLog.service.ts
│   │   ├── apiQuota.service.ts
│   │   ├── slug.service.ts
│   │   ├── systemConfig.service.ts
│   │   └── index.ts
│   ├── payments/                       # @services/payments
│   │   ├── stripe.service.ts
│   │   ├── subscription.service.ts
│   │   ├── plan.service.ts
│   │   ├── pending-payment.service.ts
│   │   ├── bookingTransaction.service.ts
│   │   └── index.ts
│   └── index.ts
│
└── index.ts                            # Re-exports all modules
```

### Controllers (`src/modules/{module}/controllers/`)

```
src/modules/admin/controllers/          # @controllers/admin
├── auth/
│   ├── adminAuth.controller.ts
│   └── index.ts
├── banking/
│   ├── adminBank.controller.ts
│   └── index.ts
├── communications/
│   ├── adminEmail.controller.ts
│   ├── adminEmailTemplate.controller.ts
│   ├── adminNotification.controller.ts
│   ├── adminNotificationTemplate.controller.ts
│   └── index.ts
├── contracts/
│   ├── adminContract.controller.ts
│   └── index.ts
├── experiences/
│   ├── adminExperience.controller.ts
│   ├── adminExpertise.controller.ts
│   ├── adminServices.controller.ts
│   └── index.ts
├── hubs/
│   ├── adminHub.controller.ts
│   └── index.ts
├── jobs/
│   ├── adminJob.controller.ts
│   ├── adminProposal.controller.ts
│   └── index.ts
├── rbac/
│   ├── adminPermission.controller.ts
│   ├── adminRole.controller.ts
│   └── index.ts
├── settings/
│   ├── adminPlan.controller.ts
│   ├── adminSettingsStats.controller.ts
│   └── index.ts
├── users/
│   ├── adminUsers.controller.ts
│   └── index.ts
└── index.ts                            # Barrel export

src/modules/hub/controllers/            # @controllers/hub
├── contracts/
│   ├── hubContract.controller.ts
│   └── index.ts
├── invitations/
│   ├── hubInvitation.controller.ts
│   └── index.ts
├── jobs/
│   ├── hubJob.controller.ts
│   └── index.ts
├── milestones/
│   ├── hubMilestone.controller.ts
│   └── index.ts
├── profiles/
│   ├── hubProfile.controller.ts
│   └── index.ts
├── proposals/
│   ├── hubProposal.controller.ts
│   └── index.ts
├── timelogs/
│   ├── hubTimelog.controller.ts
│   └── index.ts
└── index.ts                            # Barrel export
```

### Routes (`src/modules/{module}/routes/`)

```
src/modules/admin/routes/               # @routes/admin
├── auth/
│   ├── adminAuth.routes.ts             → adminAuthRoutes
│   └── index.ts
├── banking/
│   ├── adminBank.routes.ts             → adminBankRoutes
│   └── index.ts
├── communications/
│   ├── adminEmail.routes.ts            → adminEmailRoutes
│   ├── adminEmailTemplate.routes.ts    → adminEmailTemplateRoutes
│   ├── adminNotification.routes.ts     → adminNotificationRoutes
│   ├── adminNotificationTemplate.routes.ts
│   └── index.ts
├── contracts/
│   ├── adminContract.routes.ts
│   └── index.ts
├── experiences/
│   ├── adminExperience.routes.ts
│   ├── adminExpertise.routes.ts
│   ├── adminServices.routes.ts
│   └── index.ts
├── hubs/
│   ├── adminHub.routes.ts
│   └── index.ts
├── infrastructure/
│   ├── adminApiMonitoring.routes.ts
│   ├── adminCronJob.routes.ts
│   └── index.ts
├── jobs/
│   ├── adminJob.routes.ts
│   ├── adminProposal.routes.ts
│   └── index.ts
├── rbac/
│   ├── adminPermission.routes.ts
│   ├── adminRole.routes.ts
│   └── index.ts
├── reference-data/
│   ├── amenity.routes.ts
│   ├── company-type.routes.ts
│   ├── ... (all reference data routes)
│   └── index.ts
├── settings/
│   ├── adminPlan.routes.ts
│   ├── adminSettingsStats.routes.ts
│   └── index.ts
├── users/
│   ├── adminUsers.routes.ts
│   └── index.ts
└── index.ts                            # Barrel export

src/modules/hub/routes/                 # @routes/hub
├── contracts/
│   ├── hubContract.routes.ts           → hubContractRoutes
│   └── index.ts
├── invitations/
│   ├── hubInvitation.routes.ts
│   └── index.ts
├── jobs/
│   ├── hubJob.routes.ts
│   └── index.ts
├── milestones/
│   ├── hubMilestone.routes.ts
│   └── index.ts
├── profiles/
│   ├── hubProfile.routes.ts
│   └── index.ts
├── proposals/
│   ├── hubProposal.routes.ts
│   └── index.ts
├── timelogs/
│   ├── hubTimelog.routes.ts
│   └── index.ts
└── index.ts                            # Barrel export
```

## Path Aliases (tsconfig.json)

```json
{
  "paths": {
    // Services
    "@services/admin": ["./src/core/services/admin"],
    "@services/hub": ["./src/core/services/hub"],
    "@services/web": ["./src/core/services/web"],
    "@services/shared": ["./src/core/services/shared"],
    "@services/auth": ["./src/core/services/shared/auth"],
    "@services/payments": ["./src/core/services/shared/payments"],
    "@services/communications": ["./src/core/services/shared/communications"],
    "@services/infrastructure": ["./src/core/services/shared/infrastructure"],
    "@services/reference-data": ["./src/core/services/web/reference-data"],

    // Controllers
    "@controllers/admin": ["./src/modules/admin/controllers"],
    "@controllers/hub": ["./src/modules/hub/controllers"],

    // Routes
    "@routes/admin": ["./src/modules/admin/routes"],
    "@routes/hub": ["./src/modules/hub/routes"]
  }
}
```

## Naming Conventions

### File Naming by Module

| Module | Service File | Controller File | Route File |
|--------|--------------|-----------------|------------|
| Admin | `adminJob.service.ts` | `adminJob.controller.ts` | `adminJob.routes.ts` |
| Hub | `hubContract.service.ts` | `hubContract.controller.ts` | `hubContract.routes.ts` |
| Web | `job.service.ts` | `job.controller.ts` | `job.routes.ts` |
| Shared | `auth.service.ts` | `auth.controller.ts` | `auth.routes.ts` |

### Class/Function Naming

| Module | Service Class | Route Function |
|--------|---------------|----------------|
| Admin | `AdminJobService` | `adminJobRoutes` |
| Hub | `HubContractService` | `hubContractRoutes` |
| Web | `JobService` | `jobRoutes` |
| Shared | `AuthService` | `authRoutes` |

### Export Instances

```typescript
// Service - export singleton instance
export class AdminJobService { /* ... */ }
export const adminJobService = new AdminJobService();

// Route - export async function
export async function adminJobRoutes(fastify: FastifyInstance): Promise<void> {
  // Route definitions
}
```

## Module Mapping

| Module | Service Path | Controller Path | Route Path |
|--------|-------------|-----------------|------------|
| `modules/admin/` | `services/admin/` | `controllers/admin/` | `routes/admin/` |
| `modules/hub/` | `services/hub/` | `controllers/hub/` | `routes/hub/` |
| `modules/web/` | `services/web/` | `controllers/web/` | `routes/web/` |
| `modules/shared/` | `services/shared/` | N/A | N/A |

## Code Examples

### Admin Controller Example

```typescript
// src/modules/admin/controllers/jobs/adminJob.controller.ts
import type { AdminListJobsQuery, AdminJobIdParam } from '@core/schemas/admin/job.schema';
import { adminJobService } from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function listJobs(
  request: FastifyRequest<{ Querystring: AdminListJobsQuery }>,
  reply: FastifyReply
) {
  try {
    const result = await adminJobService.listJobs(request.query);
    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list jobs');
    return reply.status(500).send({
      success: false,
      error: { code: 'JOB_LIST_ERROR', message: 'Failed to list jobs' },
    });
  }
}

export async function getJobById(
  request: FastifyRequest<{ Params: AdminJobIdParam }>,
  reply: FastifyReply
) {
  try {
    const job = await adminJobService.getJobById(request.params.id);
    return reply.send({ success: true, data: job });
  } catch (error) {
    request.log.error({ error }, 'Failed to get job');
    return reply.status(404).send({
      success: false,
      error: { code: 'JOB_NOT_FOUND', message: (error as Error).message },
    });
  }
}
```

### Hub Controller Example

```typescript
// src/modules/hub/controllers/contracts/hubContract.controller.ts
import type { CreateContractInput, GetContractsQuery } from '@core/schemas/contract.schema';
import { hubContractService } from '@services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function createContract(
  request: FastifyRequest<{ Body: CreateContractInput }>,
  reply: FastifyReply
) {
  try {
    const contract = await hubContractService.create(request.body, request.user!.id);
    return reply.status(201).send({ success: true, data: contract });
  } catch (error) {
    request.log.error({ error }, 'Failed to create contract');
    return reply.status(400).send({
      success: false,
      error: { code: 'CONTRACT_CREATE_ERROR', message: (error as Error).message },
    });
  }
}
```

### Route Example

```typescript
// src/modules/admin/routes/jobs/adminJob.routes.ts
import { adminListJobsQuerySchema, adminJobIdParamSchema } from '@core/schemas/admin/job.schema';
import { listJobs, getJobById } from '@controllers/admin';
import type { FastifyInstance } from 'fastify';

export async function adminJobRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: {
      tags: ['Admin Jobs'],
      summary: 'List all jobs',
      querystring: adminListJobsQuerySchema,
    },
    handler: listJobs,
  });

  fastify.get('/:id', {
    schema: {
      tags: ['Admin Jobs'],
      summary: 'Get job by ID',
      params: adminJobIdParamSchema,
    },
    handler: getJobById,
  });
}
```

### Barrel Export (index.ts)

```typescript
// src/modules/admin/controllers/jobs/index.ts
export * from './adminJob.controller';
export * from './adminProposal.controller';

// src/modules/admin/controllers/index.ts
export * from './auth';
export * from './banking';
export * from './communications';
export * from './contracts';
export * from './experiences';
export * from './hubs';
export * from './jobs';
export * from './rbac';
export * from './settings';
export * from './users';
```

## Adding a New Feature

### Step-by-Step Guide

1. **Create Service** in `core/services/{module}/{domain}/`
   ```bash
   mkdir -p src/core/services/hub/bookings
   touch src/core/services/hub/bookings/hubBooking.service.ts
   touch src/core/services/hub/bookings/index.ts
   ```

2. **Export from Service Index**
   ```typescript
   // src/core/services/hub/bookings/index.ts
   export * from './hubBooking.service';

   // src/core/services/hub/index.ts
   export * from './bookings';
   ```

3. **Create Controller** in `modules/{module}/controllers/{domain}/`
   ```bash
   mkdir -p src/modules/hub/controllers/bookings
   touch src/modules/hub/controllers/bookings/hubBooking.controller.ts
   touch src/modules/hub/controllers/bookings/index.ts
   ```

4. **Export from Controller Index**
   ```typescript
   // src/modules/hub/controllers/bookings/index.ts
   export * from './hubBooking.controller';

   // src/modules/hub/controllers/index.ts
   export * from './bookings';
   ```

5. **Create Routes** in `modules/{module}/routes/{domain}/`
   ```bash
   mkdir -p src/modules/hub/routes/bookings
   touch src/modules/hub/routes/bookings/hubBooking.routes.ts
   touch src/modules/hub/routes/bookings/index.ts
   ```

6. **Export from Routes Index**
   ```typescript
   // src/modules/hub/routes/bookings/index.ts
   export * from './hubBooking.routes';

   // src/modules/hub/routes/index.ts
   export * from './bookings';
   ```

7. **Register in Module**
   ```typescript
   // src/modules/hub/index.ts
   export async function hubModule(fastify: FastifyInstance) {
     const routes = await import('@routes/hub');
     await fastify.register(routes.hubBookingRoutes, { prefix: '/bookings' });
   }
   ```

8. **Verify**
   ```bash
   npm run type-check
   ```

---

_Last updated: December 3, 2025_
