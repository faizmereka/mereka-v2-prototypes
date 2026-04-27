# Migrate Command (Core + Modules Architecture)

Migrate a Firebase collection to MongoDB using the Core + Modules architecture.

## Usage

`/migrate <collection-name>`

## Architecture Pattern

```
Core Layer (Business Logic):
  src/core/models/{Feature}.ts
  src/core/schemas/{feature}.schema.ts
  src/core/services/{feature}.service.ts

Module Layer (HTTP):
  src/modules/{app}/controllers/{feature}.controller.ts
  src/modules/{app}/routes/{feature}.routes.ts
```

## Tasks

### 1. Analyze Firebase Structure

- Read Firebase export data (if available)
- Document all fields and types
- Identify relationships
- Map data transformations needed
- Determine target module (web, admin, hub, shared)

### 2. Create Core Layer

**A. Create MongoDB Model** (`src/core/models/Feature.ts`)

- Create Mongoose schema
- Add indexes for frequently queried fields
- Define enums
- Enable timestamps
- Follow naming conventions (PascalCase)

**B. Create JSON Schemas** (`src/core/schemas/{module}/{feature}/{feature}.schema.ts`)

- createFeatureSchema (body validation)
- updateFeatureSchema (params + body)
- getFeatureSchema (params)
- listFeaturesSchema (querystring)
- TypeScript interfaces for types
- Follow hub/jobs pattern

**C. Create Service** (`src/core/services/feature.service.ts`)

- CRUD operations
- Business logic (NO HTTP awareness)
- Error handling
- Transaction support for complex operations

### 3. Create Module Layer

Decide which module based on the feature:

| Feature Type | Module | Route Prefix |
|-------------|--------|--------------|
| Public data | `modules/web/` | `/api/v1/public` |
| User features | `modules/web/` | `/api/v1/app` |
| Admin features | `modules/admin/` | `/api/v1/admin` |
| Hub management | `modules/hub/` | `/api/v1/hub` |
| Auth | `modules/shared/auth/` | `/api/v1/auth` |
| Payments | `modules/shared/payments/` | `/api/v1/payments` |

**D. Create Controller** (`src/modules/{app}/controllers/feature.controller.ts`)

- HTTP request handlers
- Import from Core layer
- Validation error handling
- Structured logging
- Consistent response format

**E. Create Routes** (`src/modules/{app}/routes/feature.routes.ts`)

- Define all CRUD endpoints
- Add Swagger documentation
- Apply authentication middleware

### 4. Register Routes

- Add routes to module's `index.ts`
- Mount module in `app.ts` if new module

### 5. Create Tests

- Unit tests for service (`tests/unit/`) - 80%+ coverage
- Integration tests for all endpoints (`tests/integration/`)
- Test validation, errors, edge cases

### 6. Validate

```bash
npm run check          # All validations must pass
```

## Reference

**Core Layer** - Follow pattern from:
- `src/core/models/User.ts`
- `src/core/schemas/user.schema.ts`
- `src/core/services/user.service.ts`

**Module Layer** - Follow pattern from:
- `src/modules/web/controllers/user.controller.ts`
- `src/modules/web/routes/user.routes.ts`

## Key Principles

1. **Services have NO HTTP awareness** - No request/reply objects
2. **Controllers import from Core** - All business logic in services
3. **Schemas in Core** - Shared across all modules
4. **Routes register controllers** - No business logic in routes

## Success Criteria

### Core Layer
- [ ] Model created in `src/core/models/`
- [ ] Schema created in `src/core/schemas/`
- [ ] Service created in `src/core/services/`
- [ ] No HTTP awareness in service

### Module Layer
- [ ] Controller created in correct module
- [ ] Routes created in correct module
- [ ] Routes registered in module's index.ts

### Quality
- [ ] All CRUD operations implemented
- [ ] Validation schemas complete
- [ ] Tests pass with 80%+ coverage
- [ ] `npm run check` passes
- [ ] Swagger docs generated
- [ ] Migration documented

---

_Updated for Core + Modules Architecture - December 2024_
