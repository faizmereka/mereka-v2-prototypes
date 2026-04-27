# Backend Code Generator Agent

Specialized agent for generating backend code following project patterns.

## Trigger Conditions

Use this agent when:
- User asks to "create a new API", "add endpoint", "implement feature"
- User mentions "controller", "route", "service" creation
- User asks to "add CRUD for X"
- User wants to implement backend for a frontend feature

## Capabilities

1. **Service Generation** - Creates services following the module structure
2. **Controller Generation** - Creates HTTP handlers with proper error handling
3. **Route Generation** - Creates Fastify routes with Swagger docs
4. **Schema Generation** - Creates JSON Schema validation
5. **Test Generation** - Creates unit and integration tests

## Project Structure Reference

```
src/core/services/{module}/{domain}/    # Business logic
src/modules/{module}/controllers/{domain}/  # HTTP handlers
src/modules/{module}/routes/{domain}/       # Route definitions
src/core/schemas/                           # JSON Schema validation
tests/unit/modules/{module}/               # Unit tests
```

## Module Types

| Module | Use Case | Service Prefix | Path |
|--------|----------|----------------|------|
| admin | Admin panel APIs | admin* | @services/admin |
| hub | Hub dashboard APIs | hub* | @services/hub |
| web | Public/user APIs | (none) | @services/web |
| shared | Cross-app (auth, payments) | (none) | @services/shared |

## Code Generation Patterns

### Service Pattern
```typescript
import { Model } from '@core/models/Model';
import type { CreateInput, QueryInput } from '@core/schemas/model.schema';

export class DomainService {
  async create(data: CreateInput, userId: string) { /* ... */ }
  async list(query: QueryInput) { /* ... */ }
  async getById(id: string) { /* ... */ }
  async update(id: string, data: Partial<CreateInput>) { /* ... */ }
  async delete(id: string) { /* ... */ }
}

export const domainService = new DomainService();
```

### Controller Pattern
```typescript
import { domainService } from '@services/{module}';
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function listItems(
  request: FastifyRequest<{ Querystring: QueryInput }>,
  reply: FastifyReply
) {
  try {
    const result = await domainService.list(request.query);
    return reply.send({ success: true, data: result.items, meta: result.pagination });
  } catch (error) {
    request.log.error({ error }, 'Failed to list items');
    return reply.status(500).send({
      success: false,
      error: { code: 'LIST_ERROR', message: 'Failed to list items' },
    });
  }
}
```

### Route Pattern
```typescript
import { querySchema, idParamSchema } from '@core/schemas/model.schema';
import { listItems, getItem } from '@controllers/{module}';
import type { FastifyInstance } from 'fastify';

export async function domainRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: { tags: ['Domain'], summary: 'List items', querystring: querySchema },
    handler: listItems,
  });
}
```

## Workflow

1. **Ask for module** - admin, hub, web, or shared
2. **Ask for domain/feature name** - e.g., "booking", "payment"
3. **Generate files** in order:
   - Service → Controller → Routes → Tests
4. **Update barrel exports** (index.ts files)
5. **Register routes** in module's index.ts
6. **Run type check** to verify

## Error Response Format

Always use this format:
```typescript
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human readable message'
  }
}
```

## Success Response Format

```typescript
// Single item
{ success: true, data: item }

// List with pagination
{
  success: true,
  data: items,
  meta: { page, limit, total, totalPages }
}

// Action confirmation
{ success: true, message: 'Action completed' }
```

## Import Conventions

```typescript
// Service imports
import { serviceName } from '@services/admin';   // Admin services
import { serviceName } from '@services/hub';     // Hub services
import { serviceName } from '@services/web';     // Web services
import { serviceName } from '@services/shared';  // Shared services

// Controller imports in routes
import { handler } from '@controllers/admin';
import { handler } from '@controllers/hub';

// Schema imports
import { schema } from '@core/schemas/domain.schema';

// Model imports
import { Model } from '@core/models/Model';
```

## Naming Conventions

| Item | Admin | Hub | Web |
|------|-------|-----|-----|
| Service File | adminDomain.service.ts | hubDomain.service.ts | domain.service.ts |
| Service Class | AdminDomainService | HubDomainService | DomainService |
| Controller File | adminDomain.controller.ts | hubDomain.controller.ts | domain.controller.ts |
| Route File | adminDomain.routes.ts | hubDomain.routes.ts | domain.routes.ts |
| Route Function | adminDomainRoutes | hubDomainRoutes | domainRoutes |
