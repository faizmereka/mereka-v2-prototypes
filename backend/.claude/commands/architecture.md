# Architecture Reference

Show me the current project architecture and folder structure.

## Layer Structure

```
Frontend Apps → modules/ (HTTP) → core/services/ (Logic) → core/models/ (Data) → MongoDB
```

## Complete Folder Layout

```
src/
├── core/                           # Shared business logic (80%)
│   ├── models/                     # Mongoose schemas
│   │   ├── User.ts
│   │   ├── Job.ts
│   │   └── ...
│   │
│   ├── schemas/                    # Zod validation
│   │   ├── user.schema.ts
│   │   ├── job.schema.ts
│   │   └── ...
│   │
│   ├── services/                   # Business logic by module
│   │   ├── admin/                  # @services/admin
│   │   │   ├── banking/
│   │   │   ├── communications/
│   │   │   ├── experiences/
│   │   │   ├── hubs/
│   │   │   ├── jobs/
│   │   │   ├── rbac/
│   │   │   ├── settings/
│   │   │   ├── users/
│   │   │   └── index.ts
│   │   │
│   │   ├── hub/                    # @services/hub
│   │   │   ├── contracts/
│   │   │   ├── invitations/
│   │   │   ├── jobs/
│   │   │   ├── members/
│   │   │   ├── milestones/
│   │   │   ├── profiles/
│   │   │   ├── proposals/
│   │   │   ├── timelogs/
│   │   │   └── index.ts
│   │   │
│   │   ├── web/                    # @services/web
│   │   │   ├── experience/
│   │   │   ├── profiles/
│   │   │   ├── reference-data/
│   │   │   └── index.ts
│   │   │
│   │   ├── shared/                 # @services/shared
│   │   │   ├── auth/               # @services/auth
│   │   │   ├── communications/     # @services/communications
│   │   │   ├── hub/
│   │   │   ├── infrastructure/     # @services/infrastructure
│   │   │   ├── payments/           # @services/payments
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── middlewares/                # Auth, RBAC, validation
│   ├── plugins/                    # Fastify plugins
│   └── config/                     # Environment, DB config
│
├── modules/                        # HTTP layer by app (20%)
│   ├── admin/                      # Admin panel
│   │   ├── controllers/
│   │   │   ├── auth/
│   │   │   ├── banking/
│   │   │   ├── communications/
│   │   │   ├── contracts/
│   │   │   ├── experiences/
│   │   │   ├── hubs/
│   │   │   ├── jobs/
│   │   │   ├── rbac/
│   │   │   ├── settings/
│   │   │   ├── users/
│   │   │   └── index.ts            # @controllers/admin
│   │   ├── routes/
│   │   │   └── index.ts            # @routes/admin
│   │   └── index.ts
│   │
│   ├── hub/                        # Hub dashboard
│   │   ├── controllers/
│   │   │   └── index.ts            # @controllers/hub
│   │   ├── routes/
│   │   │   └── index.ts            # @routes/hub
│   │   └── index.ts
│   │
│   ├── web/                        # Public/user app
│   │   ├── controllers/
│   │   └── routes/
│   │
│   └── shared/                     # Cross-app modules
│       ├── auth/
│       └── payments/
│
├── jobs/                           # Background jobs
│   └── payment/
│
├── app.ts                          # Fastify setup
└── server.ts                       # Entry point
```

## API Prefixes

| App | Prefix | Example |
|-----|--------|---------|
| Web | `/api/v1/*` | `/api/v1/experiences` |
| Hub | `/api/v1/*` | `/api/v1/contracts` |
| Admin | `/api/v1/admin/*` | `/api/v1/admin/jobs` |
| Auth | `/api/v1/auth/*` | `/api/v1/auth/login` |

## Import Aliases (tsconfig.json)

```json
{
  "paths": {
    "@services/admin": ["./src/core/services/admin"],
    "@services/hub": ["./src/core/services/hub"],
    "@services/web": ["./src/core/services/web"],
    "@services/shared": ["./src/core/services/shared"],
    "@services/auth": ["./src/core/services/shared/auth"],
    "@services/payments": ["./src/core/services/shared/payments"],
    "@services/communications": ["./src/core/services/shared/communications"],
    "@services/infrastructure": ["./src/core/services/shared/infrastructure"],
    "@controllers/admin": ["./src/modules/admin/controllers"],
    "@controllers/hub": ["./src/modules/hub/controllers"],
    "@routes/admin": ["./src/modules/admin/routes"],
    "@routes/hub": ["./src/modules/hub/routes"]
  }
}
```

## Data Flow

```
Request
   ↓
Module Route (defines endpoints, validation)
   ↓
Controller (HTTP handling, error responses)
   ↓
Core Service (business logic, no HTTP awareness)
   ↓
Core Model (database operations)
   ↓
MongoDB
```

## Module Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Routes** | `modules/{app}/routes/` | Define endpoints, Swagger docs, validation schemas |
| **Controllers** | `modules/{app}/controllers/` | HTTP request/response, error handling, logging |
| **Services** | `core/services/{app}/` | Business logic, data processing, validation rules |
| **Models** | `core/models/` | Database schema, indexes, virtuals |
| **Schemas** | `core/schemas/` | Zod validation for API inputs/outputs |

## Related Commands

- `/create-feature` - Create complete service + controller + route
- `/create-service` - Create service only
- `/naming` - File and class naming conventions

## Full Documentation

See `docs/architecture/SERVICE-ARCHITECTURE.md` for complete details.
