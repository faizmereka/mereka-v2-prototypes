# Naming Conventions Reference

Show me the file and class naming conventions for this project.

## File Naming Patterns

### Models (PascalCase)
```
src/core/models/
├── User.ts
├── Job.ts
├── JobProposal.ts
├── Experience.ts
└── BookingTransaction.ts
```

### Schemas (kebab-case)
```
src/core/schemas/
├── user.schema.ts
├── job.schema.ts
├── job-proposal.schema.ts
├── experience.schema.ts
└── booking-transaction.schema.ts
```

### Services by Module

**Admin Services** (prefix: admin)
```
src/core/services/admin/{domain}/
├── adminJob.service.ts          → AdminJobService
├── adminUser.service.ts         → AdminUserService
├── adminExperience.service.ts   → AdminExperienceService
└── adminHub.service.ts          → AdminHubService
```

**Hub Services** (prefix: hub)
```
src/core/services/hub/{domain}/
├── hubContract.service.ts       → HubContractService
├── hubProposal.service.ts       → HubProposalService
├── hubMilestone.service.ts      → HubMilestoneService
├── hubTimelog.service.ts        → HubTimelogService
└── hubProfile.service.ts        → HubProfileService
```

**Web Services** (no prefix)
```
src/core/services/web/{domain}/
├── experience.service.ts        → ExperienceService
├── expertise.service.ts         → ExpertiseService
├── learner-profile.service.ts   → LearnerProfileService
└── amenity.service.ts           → AmenityService
```

**Shared Services** (no prefix)
```
src/core/services/shared/{domain}/
├── auth.service.ts              → AuthService
├── stripe.service.ts            → StripeService
├── email.service.ts             → EmailService
└── notification.service.ts      → NotificationService
```

### Controllers

**Admin Controllers**
```
src/modules/admin/controllers/{domain}/
├── adminJob.controller.ts
├── adminUser.controller.ts
└── adminHub.controller.ts
```

**Hub Controllers**
```
src/modules/hub/controllers/{domain}/
├── hubContract.controller.ts
├── hubProposal.controller.ts
└── hubTimelog.controller.ts
```

**Web Controllers**
```
src/modules/web/controllers/
├── experience.controller.ts
├── expertise.controller.ts
└── booking.controller.ts
```

### Routes

**Admin Routes**
```
src/modules/admin/routes/{domain}/
├── adminJob.routes.ts           → adminJobRoutes
├── adminUser.routes.ts          → adminUsersRoutes
└── adminHub.routes.ts           → adminHubRoutes
```

**Hub Routes**
```
src/modules/hub/routes/{domain}/
├── hubContract.routes.ts        → hubContractRoutes
├── hubProposal.routes.ts        → hubProposalRoutes
└── hubTimelog.routes.ts         → hubTimelogRoutes
```

**Web Routes**
```
src/modules/web/routes/
├── experience.routes.ts         → experienceRoutes
├── expertise.routes.ts          → expertiseRoutes
└── booking.routes.ts            → bookingRoutes
```

## Class & Function Naming

| Type | Convention | Example |
|------|------------|---------|
| Service Classes | PascalCase | `HubContractService`, `AdminJobService` |
| Service Instances | camelCase | `hubContractService`, `adminJobService` |
| Controller Functions | camelCase | `listJobs`, `createContract`, `getById` |
| Route Functions | camelCase + Routes | `hubContractRoutes`, `adminJobRoutes` |
| Interfaces | I prefix | `IUser`, `IContract`, `IJob` |
| Type Inputs | PascalCase + Input | `CreateJobInput`, `UpdateContractInput` |
| Type Queries | PascalCase + Query | `GetJobsQuery`, `ListContractsQuery` |
| Constants | UPPER_SNAKE | `MAX_PAGE_SIZE`, `DEFAULT_LIMIT` |

## Import Paths

| Module | Import Path | Example |
|--------|-------------|---------|
| Admin Services | `@services/admin` | `import { adminJobService } from '@services/admin'` |
| Hub Services | `@services/hub` | `import { hubContractService } from '@services/hub'` |
| Web Services | `@services/web` | `import { experienceService } from '@services/web'` |
| Shared Services | `@services/shared` | `import { authService } from '@services/shared'` |
| Admin Controllers | `@controllers/admin` | `import { listJobs } from '@controllers/admin'` |
| Hub Controllers | `@controllers/hub` | `import { createContract } from '@controllers/hub'` |
| Admin Routes | `@routes/admin` | `import { adminJobRoutes } from '@routes/admin'` |
| Hub Routes | `@routes/hub` | `import { hubContractRoutes } from '@routes/hub'` |

## Quick Reference Table

| App | Service File | Service Class | Controller File | Route File |
|-----|--------------|---------------|-----------------|------------|
| Admin | `adminJob.service.ts` | `AdminJobService` | `adminJob.controller.ts` | `adminJob.routes.ts` |
| Hub | `hubContract.service.ts` | `HubContractService` | `hubContract.controller.ts` | `hubContract.routes.ts` |
| Web | `job.service.ts` | `JobService` | `job.controller.ts` | `job.routes.ts` |
| Shared | `auth.service.ts` | `AuthService` | `auth.controller.ts` | `auth.routes.ts` |

## Full Documentation

See `docs/architecture/SERVICE-ARCHITECTURE.md` for complete architecture guide.
