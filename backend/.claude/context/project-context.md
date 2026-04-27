# Project Context for Claude Code

This file provides essential context for optimal AI assistance.

## Project Identity

**Name**: Mereka Backend v2
**Type**: Multi-App Node.js/TypeScript Backend API
**Purpose**: Serve multiple frontend applications from single codebase
**Stage**: Active Development (Production-Ready Foundation)

## Frontend Applications Served

| App | Domain | Purpose | Access Level |
|-----|--------|---------|--------------|
| Auth | auth.mereka.io | Authentication | Public |
| Public | mereka.io | Public website | Public |
| Checkout | checkout.mereka.io | Payment flow | Authenticated |
| Admin | admin.mereka.io | Administration | Super Admin |
| Main App | app.mereka.io | Primary app | Authenticated |

## Core Technologies

### Runtime & Framework

- **Node.js**: 20.11+ (ESM-only)
- **Framework**: Fastify 4.29.1 (high-performance)
- **Language**: TypeScript 5.9.2 (strict mode)

### Database

- **Primary**: MongoDB 8.0+ (document database)
- **ORM**: Mongoose 8.19.2 (elegant schema)
- **Validation**: Native JSON Schema with Fastify AJV

### Development

- **Testing**: Vitest 3.2.4 (coverage ≥80%)
- **Build**: tsup 8.5.0 (esbuild-based)
- **Linting**: Biome 2.3.4 (strict rules)

## Architecture: Core + Modules

### Pattern Overview

```
┌─────────────────────────────────────────────────┐
│           Frontend Applications                  │
│  auth.mereka.io │ mereka.io │ admin.mereka.io   │
└────────┬────────┴─────┬─────┴────────┬──────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────────────────────────────────────────┐
│              modules/ (HTTP Layer)               │
│  shared/auth │ web/ │ admin/ │ hub/ │ payments  │
└────────────────────────┬────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│            core/ (Business Logic)                │
│  models/ │ services/ │ schemas/ │ middlewares/  │
└────────────────────────┬────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│                    MongoDB                       │
└─────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── core/                    # Shared business logic (80% of code)
│   ├── models/              # Mongoose models (database schemas)
│   ├── services/            # Business logic services
│   ├── schemas/             # JSON Schema validation (native Fastify)
│   ├── config/              # Configuration (env, database)
│   ├── middlewares/         # Shared middlewares (auth, RBAC)
│   ├── plugins/             # Fastify plugins (JWT, CORS, Swagger)
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Helper utilities
│
├── modules/                 # App-specific API layers (20% of code)
│   ├── web/                 # Web app (mereka.io, app.mereka.io)
│   │   ├── routes/
│   │   └── controllers/
│   ├── admin/               # Admin panel (admin.mereka.io)
│   │   ├── routes/
│   │   └── controllers/
│   ├── hub/                 # Hub dashboard
│   │   ├── routes/
│   │   └── controllers/
│   └── shared/              # Cross-app modules
│       ├── auth/            # Authentication (all apps)
│       └── payments/        # Payment processing
│
├── app.ts                   # Fastify app & module mounting
└── server.ts                # Server entry point
```

### Key Principle

- **Core**: Contains ALL business logic - models, services, schemas
- **Modules**: Contains ONLY HTTP layer - routes, controllers
- Services have NO HTTP awareness (no request/reply)
- Controllers import from core, handle HTTP only

## Code Standards (Professional Level)

### TypeScript Configuration

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "useUnknownInCatchVariables": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true
}
```

**NEVER use:**

- `any` type
- `@ts-ignore` or `@ts-expect-error`
- Unsafe operations
- `console.log` (use structured logging)

**ALWAYS use:**

- Proper types or `unknown`
- `import type` for type-only imports
- Path aliases (`@core/`, `@modules/`)
- Structured logging (`request.log.*`)

### Path Aliases

```typescript
// Core imports (business logic)
import type { IUser } from '@core/models/User';
import { userService } from '@core/services/user.service';
import { createUserSchema } from '@core/schemas/user.schema';

// Module imports (HTTP layer)
import { webRoutes } from '@modules/web/routes';
```

### Naming Conventions (Strict)

| Type        | Convention       | Example                    |
| ----------- | ---------------- | -------------------------- |
| Models      | PascalCase       | `User.ts`, `Experience.ts` |
| Collections | camelCase plural | `users`, `experiences`     |
| Interfaces  | I + PascalCase   | `IUser`, `IExperience`     |
| Routes      | kebab-case       | `user.routes.ts`           |
| Controllers | camelCase        | `user.controller.ts`       |
| Services    | camelCase        | `user.service.ts`          |
| Schemas     | camelCase        | `createUserSchema`         |

## Response Formats (Consistent)

### Success

```json
{
  "success": true,
  "data": { /* result */ },
  "meta": { /* pagination, optional */ }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "DESCRIPTIVE_ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* optional */ }
  }
}
```

## HTTP Status Codes

- `200` - OK (GET, PATCH, DELETE success)
- `201` - Created (POST success)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (no/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Role-Based Access Control

### Role Hierarchy

```
guest → user → host → admin → super_admin
```

### App Access Matrix

| Role | auth | public | checkout | admin | app |
|------|------|--------|----------|-------|-----|
| guest | ✅ | ✅ | ❌ | ❌ | ❌ |
| user | ✅ | ✅ | ✅ | ❌ | ✅ |
| host | ✅ | ✅ | ✅ | ❌ | ✅ |
| admin | ✅ | ✅ | ✅ | ❌ | ✅ |
| super_admin | ✅ | ✅ | ✅ | ✅ | ✅ |

## Creating New Features

### Step 1: Core Layer

1. Create Model (`src/core/models/Feature.ts`)
2. Create Schema (`src/core/schemas/feature.schema.ts`)
3. Create Service (`src/core/services/feature.service.ts`)

### Step 2: Module Layer

4. Decide which module(s) need the feature
5. Create Controller (`src/modules/{app}/controllers/`)
6. Create Routes (`src/modules/{app}/routes/`)
7. Register in module's index.ts

### Step 3: Testing

8. Unit tests for services
9. Integration tests for routes
10. 80%+ coverage minimum

## Quality Gates

### Before Commit (Required)

```bash
npm run check  # Must pass with 0 errors
```

**Includes**:

- Biome lint strict mode
- TypeScript type checking
- All tests passing
- Import/export validation
- Secret scanning

## Key Documentation Files

- **CLAUDE.md** - Main AI instructions (READ FIRST)
- **docs/architecture/MULTI-APP-ARCHITECTURE.md** - Core + Modules explained
- **docs/BUILDING.md** - Build system (AUTHORITATIVE)
- **biome.json** - Linting and formatting rules

## When Uncertain

1. **Read architecture doc** - `docs/architecture/MULTI-APP-ARCHITECTURE.md`
2. **Follow existing patterns** - Check similar features in core/
3. **Run validation** - `npm run check`
4. **Ask for clarification** - Better than assumptions

---

_Last updated: December 2025_
