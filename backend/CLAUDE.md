# Mereka Backend v2 - Claude AI Instructions

---

## Workspace & Project Identity

| Key | Value |
|-----|-------|
| **Project ID** | `mereka-backend-v2` |
| **Version** | v2 (Node.js + MongoDB) |
| **Firebase Production** | `mereka-production` |
| **Firebase Staging** | `mereka-web-17` |
| **Firebase Development** | `mereka-dev` |

### GCP Infrastructure (Kubernetes Deployment)

| Key | Value |
|-----|-------|
| **GCP Project** | `bbi-infrastructure` |
| **K8s Cluster** | `bbi-k8-cluster` |
| **Region** | `asia-southeast1-c` |
| **Context** | `gke_bbi-k8_asia-southeast1-c_bbi-k8-cluster` |

**All services are deployed to a single shared Kubernetes cluster in `bbi-infrastructure` GCP project.**

```bash
# Switch to correct kubectl context
gcloud container clusters get-credentials bbi-k8-cluster --zone asia-southeast1-c --project bbi-infrastructure

# Or use existing context
kubectl config use-context gke_bbi-k8_asia-southeast1-c_bbi-k8-cluster

# Check pods
kubectl get pods -n mereka
```

### Related Projects (v2 Workspace)

| Project | Path | CLAUDE.md |
|---------|------|-----------|
| **Frontend v2** | `../mereka-frontend-workspace` | [CLAUDE.md](../mereka-frontend-workspace/CLAUDE.md) |
| **Backend v2** | `.` (this project) | This file |

### Legacy Projects (v1 - Firebase)

| Project | Path | Description |
|---------|------|-------------|
| **mereka-web** | `../mereka-web` | v1 Frontend (Angular + Firebase) |
| **mereka-web-17** | `../mereka-web-17` | v1 Frontend Staging |
| **mereka-cloudfunctions** | `../mereka-cloudfunctions` | v1 Backend (Firebase Cloud Functions) |

**VS Code Workspace**: `mereka-backend-v2-elevate-ref.code-workspace`

### Cross-Project Development

When working on features that span frontend and backend:
1. **Backend changes needed from Frontend context**: Reference this CLAUDE.md for backend patterns
2. **Frontend changes needed from Backend context**: Reference `../mereka-frontend-workspace/CLAUDE.md`
3. Both projects share the same Firebase project (`mereka-dev` for dev, `mereka-production` for prod)

### v1 vs v2 (Important!)

| Aspect | v1 (Legacy) | v2 (Current) |
|--------|-------------|--------------|
| Backend | Firebase Functions (`mereka-cloudfunctions`) | Node.js + Fastify + MongoDB |
| Database | Firestore | MongoDB |
| Frontend | `mereka-web`, `mereka-web-17` | `mereka-frontend-workspace` |
| Auth | Firebase Auth | Firebase Auth (shared) |
| Storage | Firebase Storage | Firebase Storage (shared) |

**v2 is the active development stack. v1 is deprecated.**

---

## Project Context

**Node.js backend** serving multiple frontend apps: Fastify + MongoDB/Mongoose + TypeScript + Native JSON Schema

| App | Domain | Access |
|-----|--------|--------|
| Auth | auth.mereka.io | Public |
| Public | mereka.io | Public |
| Checkout | checkout.mereka.io | Authenticated |
| Admin | admin.mereka.io | Super Admin |
| Main App | app.mereka.io | Authenticated |

---

## Essential Reading

1. **[MULTI-APP-ARCHITECTURE.md](./docs/architecture/MULTI-APP-ARCHITECTURE.md)** - Core + Modules (START HERE!)
2. **[BUILDING.md](./docs/BUILDING.md)** - Build system
3. **[VALIDATION_SYSTEMS.md](./docs/VALIDATION_SYSTEMS.md)** - Quality gates
4. **[biome.json](./biome.json)** - Linting rules

---

## Quick Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build (types + JS)
npm run check            # ALL validations (before committing!)
npm run check:fast       # Quick check (lint + format + types)

# Testing
npm test                 # Run all tests
npm run test:coverage    # Coverage report (80%+ target)
```

---

## Admin Login Credentials (Development)

```
Email:    admin@mereka.io
Password: Admin@123456
```

To recreate admin user: `npx tsx scripts/db/seed-admin.ts --force`

---

## Project Structure

```
src/
├── core/                    # Shared business logic (80%)
│   ├── models/              # Mongoose models
│   ├── services/            # Business logic
│   ├── schemas/             # JSON Schema validation
│   ├── config/              # Configuration
│   ├── middlewares/         # Auth, RBAC
│   └── plugins/             # Fastify plugins
│
├── modules/                 # App-specific HTTP layer (20%)
│   ├── web/                 # mereka.io, app.mereka.io
│   ├── admin/               # admin.mereka.io
│   ├── hub/                 # Hub dashboard
│   └── shared/              # Cross-app (auth, payments)
│
└── app.ts                   # Fastify app & routing
```

**Architecture**: Core = ALL business logic | Modules = ONLY HTTP layer

```
Request → Module Route → Controller → Core Service → Core Model → MongoDB
```

---

## Creating Features (Order Matters!)

### 1. Model (`src/core/models/Feature.ts`)
```typescript
const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });
export const Feature = mongoose.model('Feature', schema);
```

### 2. Schema (`src/core/schemas/feature.schema.ts`)
```typescript
export const createFeatureSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: { email: { type: 'string', format: 'email' } },
  },
} as const;

export interface CreateFeatureInput { email: string; }
```

### 3. Service (`src/core/services/feature.service.ts`)
```typescript
export class FeatureService {
  async create(data: CreateFeatureInput) {
    const existing = await Feature.findOne({ email: data.email });
    if (existing) throw new Error('Already exists');
    return Feature.create(data);
  }
}
```

### 4. Controller (`src/modules/{app}/controllers/feature.controller.ts`)
```typescript
export async function createFeature(request: FastifyRequest<{ Body: CreateFeatureInput }>, reply: FastifyReply) {
  try {
    const result = await featureService.create(request.body);
    return reply.status(201).send({ success: true, data: result });
  } catch (error) {
    request.log.error({ error }, 'Error creating feature');
    return reply.status(400).send({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
  }
}
```

### 5. Routes (`src/modules/{app}/routes/feature.routes.ts`)
```typescript
export async function featureRoutes(fastify: FastifyInstance) {
  fastify.post('/', { schema: { tags: ['Features'], summary: 'Create', ...createFeatureSchema }, handler: createFeature });
}
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Models | PascalCase | `User.ts`, `Booking.ts` |
| Routes/Controllers/Services | camelCase with module prefix | `adminBooking.controller.ts`, `hubContract.service.ts` |
| Functions | camelCase | `createUser`, `getBookingStats` |
| Constants | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |
| Types/Interfaces | PascalCase | `IUser`, `CreateUserInput` |
| Schemas | camelCase with module prefix | `admin/booking.schema.ts` |

### Module-Prefixed Naming (IMPORTANT!)

For admin/hub modules, files MUST be prefixed with the module name:

| Module | Service | Controller | Routes | Schema |
|--------|---------|------------|--------|--------|
| Admin | `adminBooking.service.ts` | `adminBooking.controller.ts` | `adminBooking.routes.ts` | `adminBooking.schema.ts` |
| Hub | `hubContract.service.ts` | `hubContract.controller.ts` | `hubContract.routes.ts` | `hubContract.schema.ts` |
| Web | `booking.service.ts` | `booking.controller.ts` | `booking.routes.ts` | `booking.schema.ts` |

### Admin Module Folder Structure (CRITICAL!)

All admin feature files MUST be organized in subfolders, never directly in parent folders:

```
src/
├── core/
│   ├── schemas/admin/
│   │   ├── bookings/                      # Feature subfolder
│   │   │   ├── adminBooking.schema.ts     # Schema file with admin prefix
│   │   │   └── index.ts                   # Re-export
│   │   ├── users/
│   │   │   ├── adminUser.schema.ts
│   │   │   └── index.ts
│   │   └── index.ts                       # Export all subfolders
│   │
│   └── services/admin/
│       ├── bookings/                      # Feature subfolder
│       │   ├── adminBooking.service.ts    # Service file with admin prefix
│       │   └── index.ts
│       └── users/
│           ├── adminUser.service.ts
│           └── index.ts
│
└── modules/admin/
    ├── controllers/
    │   ├── bookings/                      # Feature subfolder
    │   │   ├── adminBooking.controller.ts # Controller with admin prefix
    │   │   └── index.ts
    │   ├── users/
    │   │   ├── adminUser.controller.ts
    │   │   └── index.ts
    │   └── index.ts                       # Export all subfolders
    │
    └── routes/
        ├── bookings/                      # Feature subfolder
        │   ├── adminBooking.routes.ts     # Routes with admin prefix
        │   └── index.ts
        ├── users/
        │   ├── adminUser.routes.ts
        │   └── index.ts
        └── index.ts                       # Export all subfolders
```

**WRONG - Files directly in parent folder:**
```
controllers/adminBooking.controller.ts    # NO! Must be in subfolder
schemas/admin/booking.schema.ts           # NO! Must be in subfolder
```

**CORRECT - Files in feature subfolders:**
```
controllers/bookings/adminBooking.controller.ts  # YES!
schemas/admin/bookings/adminBooking.schema.ts    # YES!
```

**Index.ts Pattern:**
```typescript
// controllers/bookings/index.ts
export * from './adminBooking.controller';

// controllers/index.ts
export * from './bookings';
export * from './users';
// ... other feature folders
```

---

## TypeScript Standards

- **NO `any`** - Use proper types or `unknown`
- **NO `@ts-ignore`** - Fix the issue
- **USE `type` imports** - `import type { User } from '...'`

### Import Order
```typescript
// 1. Node.js built-ins
import fs from 'node:fs';
// 2. External deps
import mongoose from 'mongoose';
// 3. Path alias imports (ALWAYS prefer over relative)
import type { IUser } from '@core/models/User';
import { UserService } from '@core/services/user.service';
import { createUser } from '@controllers/admin';
// 4. Relative imports (ONLY for same directory siblings)
```

### Path Aliases (MANDATORY)

**NEVER use relative paths like `../../` - ALWAYS use path aliases!**

| Alias | Maps To | Usage |
|-------|---------|-------|
| `@core/*` | `src/core/*` | Models, Services, Schemas, Config |
| `@controllers/admin` | `src/modules/admin/controllers` | Admin controllers |
| `@controllers/web` | `src/modules/web/controllers` | Web controllers |
| `@controllers/hub` | `src/modules/hub/controllers` | Hub controllers |
| `@modules/*` | `src/modules/*` | Module-level imports |

**Examples:**
```typescript
// CORRECT - Using path aliases
import { Booking } from '@core/models/Booking';
import { adminBookingService } from '@core/services/admin/bookings';
import { getBookingStats } from '@controllers/admin';
import { listBookingsSchema } from '@core/schemas/admin/booking.schema';

// WRONG - Never use deep relative paths
import { getBookingStats } from '../../controllers/booking.controller'; // NO!
import { Booking } from '../../../core/models/Booking'; // NO!
```

**Controller Export Pattern:**
- All controllers must be exported via their module's `index.ts`
- Routes import from `@controllers/{module}`, never directly from `.controller.ts` files

```typescript
// src/modules/admin/controllers/index.ts
export * from './adminBooking.controller';  // Note: prefix with 'admin'
export * from './auth';
// ... other exports

// src/modules/admin/routes/bookings/booking.routes.ts
import { getBookingStats, listBookings } from '@controllers/admin'; // CORRECT
```

---

## API Response Format

```typescript
// Success
{ "success": true, "data": {...}, "meta": {...} }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

**Status Codes**: 200 OK | 201 Created | 400 Bad Request | 401 Unauthorized | 403 Forbidden | 404 Not Found | 500 Server Error

---

## Documentation Standards

**All docs go in `docs/` folder** - NEVER in root directory.

| Type | Location |
|------|----------|
| Models | `docs/models/MODEL-NAME.md` |
| Features | `docs/features/FEATURE-NAME.md` |
| API | `docs/api/API-NAME.md` |
| Architecture | `docs/architecture/` |

Use **UPPER-KEBAB-CASE.md** naming.

---

## Critical Rules

1. **NO console.log** - Use `request.log.info/error`
2. **Type imports** - `import type { X }` for types only
3. **Handle promises** - Always `await` or explicit `void`
4. **Index queries** - Add indexes for frequently queried fields
5. **Use lean()** - For read-only queries: `Model.find().lean()`

---

## Frontend Integration

### Frontend Repos
- **Web**: `/Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-web`
- **Admin**: `/Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-admin-v2/mereka-admin-v2`

### Admin UI Components
See **[docs/dev/ADMIN-FRONTEND-UI.md](./docs/dev/ADMIN-FRONTEND-UI.md)** for ToastService and DialogService usage.

### Frontend-to-Backend Workflow
When implementing backend for frontend features:
1. Read frontend code, identify API calls
2. Document required endpoints (method, path, body, response)
3. Implement: Model → Schema → Service → Controller → Routes
4. Write tests (80%+ coverage)
5. Run `npm run check`

---

## Common Patterns

### Pagination
```typescript
const page = query.page || 1;
const limit = Math.min(query.limit || 20, env.MAX_PAGE_SIZE);
const [items, total] = await Promise.all([
  Model.find(filter).skip((page - 1) * limit).limit(limit).lean(),
  Model.countDocuments(filter),
]);
return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
```

### Error Handling
```typescript
// Service: throw errors
if (!item) throw new Error('Not found');

// Controller: catch and format
try {
  const result = await service.operation();
  return reply.send({ success: true, data: result });
} catch (error) {
  request.log.error({ error }, 'Operation failed');
  return reply.status(400).send({ success: false, error: { code: 'ERROR', message: error.message } });
}
```

---

## What to Avoid

- `any` type
- `@ts-ignore`
- Floating promises
- `console.log` in production
- Hard-coded values (use env vars)
- Deep relative imports (`../../../`) - use path aliases instead
- Skipping tests
- Committing secrets

---

## AI Agents & Automation

### Claude Code Configuration
Full details in **[.claude/README.md](./.claude/README.md)**

### Auto-Invoked Agents (7)

| Agent | Trigger | Purpose |
|-------|---------|---------|
| `backend-generator` | "create API", "add endpoint" | Generate service/controller/routes |
| `template-validator` | Template changes | Validate email/notification templates |
| `schema-fixer` | JSON Schema errors | Fix AJV schema issues in routes |
| `deployment-helper` | K8s/deploy mentions | Handle Kubernetes deployments |
| `test-enhancer` | Low coverage | Create tests for 80%+ coverage |
| `dev-runner` | "run", "start dev" | Start local dev with MongoDB |
| `api-tester` | API testing | Create curl tests and integration tests |

### Slash Commands

| Command | Purpose |
|---------|---------|
| `/validate` | Run all quality checks |
| `/test` | Run tests with coverage |
| `/create-feature {name}` | Full stack feature creation |
| `/create-service {name}` | Create service following patterns |
| `/architecture` | Show project structure |
| `/naming` | File naming conventions |

---

## Documentation Reference

### Docs Folder Structure (`docs/`)

| Folder | Content |
|--------|---------|
| `docs/architecture/` | System architecture, multi-app design |
| `docs/models/` | Mongoose model documentation |
| `docs/features/` | Feature specifications |
| `docs/api/` | API documentation |
| `docs/dev/` | Development guides (ADMIN-FRONTEND-UI.md) |
| `docs/guides/` | How-to guides |
| `docs/reference/` | Reference materials |

### Key Architecture Docs

- **[MULTI-APP-ARCHITECTURE.md](./docs/architecture/MULTI-APP-ARCHITECTURE.md)** - Core + Modules architecture
- **[SERVICE-ARCHITECTURE.md](./docs/architecture/SERVICE-ARCHITECTURE.md)** - Service layer patterns
- **[RECURRING-EVENTS-SYSTEM.md](./docs/architecture/RECURRING-EVENTS-SYSTEM.md)** - Event system

### Key Dev Docs

- **[BUILDING.md](./docs/BUILDING.md)** - Build system
- **[VALIDATION_SYSTEMS.md](./docs/VALIDATION_SYSTEMS.md)** - Quality gates
- **[ADMIN-FRONTEND-UI.md](./docs/dev/ADMIN-FRONTEND-UI.md)** - Admin UI components

---

_Last updated: 2025-12-31_
