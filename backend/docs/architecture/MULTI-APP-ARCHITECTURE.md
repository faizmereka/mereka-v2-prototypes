# Multi-App Architecture

## Overview

Mereka Backend v2 serves multiple frontend applications from a single codebase using a **Core + Modules** architecture pattern. This design provides clean separation between shared business logic and app-specific API endpoints.

## Frontend Applications

| App | Domain | Purpose | Access Level |
|-----|--------|---------|--------------|
| **Auth** | auth.mereka.io | Authentication & identity | Public |
| **Public** | mereka.io | Public website, browsing | Public |
| **Checkout** | checkout.mereka.io | Payment & booking flow | Authenticated |
| **Admin** | admin.mereka.io | Internal administration | Super Admin only |
| **Main App** | app.mereka.io | Primary application | Authenticated |

## Architecture Pattern

```
src/
├── core/                        # Shared business logic (80% of code)
│   ├── models/                  # Mongoose models (database schemas)
│   ├── services/                # Business logic services
│   ├── schemas/                 # Zod validation schemas
│   ├── config/                  # Configuration (env, database, firebase)
│   ├── middlewares/             # Shared middlewares (auth, RBAC)
│   ├── plugins/                 # Fastify plugins (JWT, CORS, Swagger)
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Helper utilities
│
├── modules/                     # App-specific API layers (20% of code)
│   ├── web/                     # Web app (mereka.io, app.mereka.io)
│   │   ├── routes/              # Public + authenticated user routes
│   │   └── controllers/         # HTTP handlers for web app
│   │
│   ├── admin/                   # Admin panel (admin.mereka.io)
│   │   ├── routes/              # Admin-only routes
│   │   └── controllers/         # Admin HTTP handlers
│   │
│   ├── hub/                     # Hub dashboard
│   │   ├── routes/              # Hub management routes
│   │   └── controllers/         # Hub HTTP handlers
│   │
│   └── shared/                  # Cross-app modules
│       ├── auth/                # Authentication (login, register, etc.)
│       │   ├── routes/
│       │   └── controllers/
│       └── payments/            # Payment processing
│           ├── routes/
│           └── controllers/
│
├── app.ts                       # Fastify app setup & module mounting
└── server.ts                    # Server entry point
```

## Design Principles

### 1. Core Contains Business Logic

The `core/` directory contains all shared business logic:

- **Models**: Database schemas shared across all apps
- **Services**: Reusable business logic (no HTTP concerns)
- **Schemas**: Zod validation schemas for data validation

```typescript
// core/services/user.service.ts
export class UserService {
  async createUser(data: CreateUserInput): Promise<IUser> {
    // Business logic - no HTTP awareness
    const existing = await User.findOne({ email: data.email });
    if (existing) throw new Error('User already exists');
    return User.create(data);
  }
}
```

### 2. Modules Handle HTTP Layer

Each module in `modules/` handles app-specific HTTP concerns:

- **Routes**: Define API endpoints with Swagger docs
- **Controllers**: Handle request/response, call services

```typescript
// modules/web/controllers/user.controller.ts
export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  const user = await userService.getUserById(request.user.id);
  return reply.send({ success: true, data: user });
}
```

### 3. Shared Modules for Cross-Cutting Concerns

Some functionality is shared across multiple apps:

- **Auth**: Login, register, password reset (all apps need this)
- **Payments**: Stripe processing (checkout + main app)

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend Applications                         │
├───────────┬───────────┬───────────┬───────────┬────────────────────┤
│ auth.     │ mereka.io │ checkout. │ admin.    │ app.mereka.io      │
│ mereka.io │ (public)  │ mereka.io │ mereka.io │ (main app)         │
└─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┴─────────┬──────────┘
      │           │           │           │               │
      ▼           ▼           ▼           ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway (app.ts)                         │
│  /api/v1/auth/*  /api/v1/public/*  /api/v1/checkout/*  /api/v1/app/*│
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Modules (HTTP Layer)                          │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│ modules/shared/ │ modules/web/    │ modules/admin/                  │
│   - auth        │   - experiences │   - templates                   │
│   - payments    │   - profiles    │   - monitoring                  │
│                 │   - bookings    │   - reference-data              │
└────────┬────────┴────────┬────────┴────────┬────────────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Core (Business Logic)                         │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│ core/models/    │ core/services/  │ core/schemas/                   │
│   - User        │   - auth        │   - user.schema                 │
│   - Hub         │   - user        │   - hub.schema                  │
│   - Experience  │   - hub         │   - experience.schema           │
│   - Booking     │   - booking     │   - booking.schema              │
│   - etc...      │   - etc...      │   - etc...                      │
└─────────────────┴─────────────────┴─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            MongoDB                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Route Organization by Module

### modules/shared/auth/
Authentication endpoints (all apps):
- `POST /auth/register` - User registration
- `POST /auth/login` - Email/password login
- `POST /auth/firebase` - Firebase token login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### modules/web/
Public website + main app endpoints:
- `GET /experiences` - Browse experiences
- `GET /hubs` - Browse hubs
- `GET /profile` - User profile
- `POST /bookings` - Create bookings
- Reference data endpoints (amenities, skills, etc.)

### modules/admin/
Admin panel endpoints (super_admin only):
- `GET/POST/PATCH/DELETE /templates/*` - Email/notification templates
- `GET /monitoring/*` - API logs, quotas, security
- `GET /cron-jobs/*` - Cron job monitoring
- Reference data management (full CRUD)

### modules/hub/
Hub dashboard endpoints:
- `GET/PATCH /hub` - Hub profile management
- `GET/POST /hub/members` - Member management
- `GET/POST /hub/invitations` - Invitation links
- Hub-specific analytics

## Role-Based Access Control (RBAC)

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

## Implementation

### app.ts - Module Mounting

```typescript
import { buildApp } from './app';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ /* config */ });

  // === Core Plugins ===
  await registerCors(fastify);
  await registerJwt(fastify);
  await registerSwagger(fastify);

  // === Shared Modules ===
  const authRoutes = await import('./modules/shared/auth/routes');
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

  const paymentRoutes = await import('./modules/shared/payments/routes');
  await fastify.register(paymentRoutes, { prefix: '/api/v1/payments' });

  // === Web Module (public + authenticated) ===
  const webRoutes = await import('./modules/web/routes');
  await fastify.register(webRoutes.publicRoutes, { prefix: '/api/v1/public' });
  await fastify.register(webRoutes.appRoutes, { prefix: '/api/v1/app' });

  // === Admin Module ===
  const adminRoutes = await import('./modules/admin/routes');
  await fastify.register(adminRoutes, { prefix: '/api/v1/admin' });

  // === Hub Module ===
  const hubRoutes = await import('./modules/hub/routes');
  await fastify.register(hubRoutes, { prefix: '/api/v1/hub' });

  return fastify;
}
```

### Module Structure Example

```
modules/web/
├── routes/
│   ├── index.ts           # Exports publicRoutes + appRoutes
│   ├── experience.routes.ts
│   ├── profile.routes.ts
│   └── booking.routes.ts
└── controllers/
    ├── experience.controller.ts
    ├── profile.controller.ts
    └── booking.controller.ts
```

## Path Aliases (tsconfig.json)

```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@core/*": ["./src/core/*"],
    "@modules/*": ["./src/modules/*"],
    "@models/*": ["./src/core/models/*"],
    "@services/*": ["./src/core/services/*"],
    "@schemas/*": ["./src/core/schemas/*"],
    "@config/*": ["./src/core/config/*"],
    "@middlewares/*": ["./src/core/middlewares/*"],
    "@plugins/*": ["./src/core/plugins/*"],
    "@utils/*": ["./src/core/utils/*"],
    "@types/*": ["./src/core/types/*"]
  }
}
```

## Benefits

1. **Clear Separation**: Business logic vs HTTP layer
2. **Code Reuse**: Services shared across all apps
3. **Easy Testing**: Test services independently from routes
4. **Scalable**: Add new modules without touching core
5. **Maintainable**: Each module has single responsibility
6. **Type Safe**: Path aliases for clean imports

## Migration Strategy

### Phase 1: Create Structure
1. Create `core/` directory
2. Create `modules/` directory structure

### Phase 2: Move Core Files
1. Move models to `core/models/`
2. Move services to `core/services/`
3. Move schemas to `core/schemas/`
4. Move config, middlewares, plugins, types, utils to `core/`

### Phase 3: Organize Modules
1. Create `modules/shared/auth/` from auth routes/controllers
2. Create `modules/shared/payments/` from payment routes/controllers
3. Create `modules/web/` from public + user routes/controllers
4. Create `modules/admin/` from admin routes/controllers
5. Create `modules/hub/` from hub routes/controllers

### Phase 4: Update Imports
1. Update tsconfig.json paths
2. Update all imports to use new aliases
3. Update app.ts to mount modules

### Phase 5: Validate
1. Run `npm run check`
2. Run all tests
3. Test each frontend app

---

_Last updated: December 2024_
