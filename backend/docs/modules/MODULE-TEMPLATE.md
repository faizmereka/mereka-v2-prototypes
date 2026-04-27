# Module Creation Template (Core + Modules Architecture)

> Follow this template for creating new modules with the Core + Modules architecture pattern.

---

## Architecture Overview

```
src/
├── core/                        # Business Logic (shared across all apps)
│   ├── models/                  # Mongoose models
│   ├── schemas/                 # JSON Schema validation (native Fastify)
│   ├── services/                # Business logic services
│   └── ...
│
└── modules/                     # HTTP Layer (app-specific)
    ├── web/                     # Public + Main app (mereka.io, app.mereka.io)
    │   ├── routes/
    │   └── controllers/
    ├── admin/                   # Admin panel (admin.mereka.io)
    │   ├── routes/
    │   └── controllers/
    ├── hub/                     # Hub dashboard
    │   ├── routes/
    │   └── controllers/
    └── shared/                  # Cross-app modules
        ├── auth/
        └── payments/
```

---

## Creating Module: [FeatureName]

Replace `[Feature]`, `[feature]`, and `[FEATURE]` throughout this template.

---

## Step 1: Create Model (`src/core/models/[Feature].ts`)

```typescript
import mongoose from 'mongoose';
import type { Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * [Feature] status enum
 */
export enum [Feature]Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * [Feature] document interface
 */
export interface I[Feature] extends Document {
  name: string;
  status: [Feature]Status;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * [Feature] schema
 */
const [feature]Schema = new Schema<I[Feature]>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values([Feature]Status),
      default: [Feature]Status.ACTIVE,
      index: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes
[feature]Schema.index({ name: 1 });
[feature]Schema.index({ status: 1 });
[feature]Schema.index({ createdAt: -1 });

/**
 * [Feature] model
 */
export const [Feature] = mongoose.model<I[Feature]>('[Feature]', [feature]Schema);
```

---

## Step 2: Create Schemas (`src/core/schemas/[module]/[feature]/[feature].schema.ts`)

**IMPORTANT**: Use native JSON Schema (not Zod). Fastify validates with AJV.

```typescript
import { [Feature]Status } from '@core/models/[Feature]';

/**
 * [Feature] schemas - Native JSON Schema
 * Fastify uses AJV for validation
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';

// Common schema components
const idParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      pattern: objectIdPattern,
      description: '[Feature] ID',
    },
  },
} as const;

// Create [Feature] Schema
export const create[Feature]Schema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        description: '[Feature] name',
      },
      status: {
        type: 'string',
        enum: Object.values([Feature]Status),
        default: [Feature]Status.ACTIVE,
        description: '[Feature] status',
      },
      description: {
        type: 'string',
        maxLength: 1000,
        description: 'Optional description',
      },
    },
  },
} as const;

// Update [Feature] Schema
export const update[Feature]Schema = {
  params: idParamSchema,
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        description: '[Feature] name',
      },
      status: {
        type: 'string',
        enum: Object.values([Feature]Status),
        description: '[Feature] status',
      },
      description: {
        type: 'string',
        maxLength: 1000,
        description: 'Optional description',
      },
    },
  },
} as const;

// Get [Feature] by ID Schema
export const get[Feature]Schema = {
  params: idParamSchema,
} as const;

// List [Features] Schema
export const list[Feature]sSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Items per page',
      },
      status: {
        type: 'string',
        enum: Object.values([Feature]Status),
        description: 'Filter by status',
      },
      search: {
        type: 'string',
        description: 'Search by name',
      },
    },
  },
} as const;

// TypeScript types (infer from schema structure)
export interface Create[Feature]Input {
  name: string;
  status?: [Feature]Status;
  description?: string;
}

export interface Update[Feature]Input {
  name?: string;
  status?: [Feature]Status;
  description?: string;
}

export interface List[Feature]sQuery {
  page?: number;
  limit?: number;
  status?: [Feature]Status;
  search?: string;
}
```

---

## Step 3: Create Service (`src/core/services/[module]/[feature]/[feature].service.ts`)

**Important**: Services have NO HTTP awareness (no request/reply objects).

```typescript
import { [Feature], [Feature]Status } from '@core/models/[Feature]';
import type { I[Feature] } from '@core/models/[Feature]';
import type {
  Create[Feature]Input,
  List[Feature]sQuery,
  Update[Feature]Input,
} from '@core/schemas/[module]/[feature]/[feature].schema';

export class [Feature]Service {
  async create(data: Create[Feature]Input): Promise<I[Feature]> {
    const [feature] = await [Feature].create(data);
    return [feature];
  }

  async getById(id: string): Promise<I[Feature] | null> {
    const [feature] = await [Feature].findById(id);
    return [feature];
  }

  async list(query: List[Feature]sQuery) {
    const { page = 1, limit = 20, status, search } = query;

    // Build filter
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;

    const [[feature]s, total] = await Promise.all([
      [Feature].find(filter).skip(skip).limit(limit).lean(),
      [Feature].countDocuments(filter),
    ]);

    return {
      items: [feature]s as I[Feature][],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, data: Update[Feature]Input): Promise<I[Feature]> {
    const [feature] = await [Feature].findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (![feature]) {
      throw new Error('[Feature] not found');
    }

    return [feature];
  }

  async delete(id: string): Promise<void> {
    const [feature] = await [Feature].findById(id);
    if (![feature]) {
      throw new Error('[Feature] not found');
    }

    [feature].status = [Feature]Status.INACTIVE;
    await [feature].save();
  }
}

export const [feature]Service = new [Feature]Service();
```

---

## Step 4: Create Controller (`src/modules/{app}/controllers/[feature]/[feature].controller.ts`)

**Important**: Choose the correct module based on which app needs this endpoint:
- `web/` - Public website + main app
- `admin/` - Admin panel only
- `hub/` - Hub dashboard
- `shared/` - Shared across multiple apps (auth, payments)

```typescript
import type { FastifyReply, FastifyRequest } from 'fastify';

import { [feature]Service } from '@services/[module]';
import type {
  Create[Feature]Input,
  List[Feature]sQuery,
  Update[Feature]Input,
} from '@core/schemas/[module]/[feature]/[feature].schema';

export async function create[Feature](
  request: FastifyRequest<{ Body: Create[Feature]Input }>,
  reply: FastifyReply,
) {
  try {
    const [feature] = await [feature]Service.create(request.body);
    return reply.status(201).send({
      success: true,
      data: [feature],
      message: '[Feature] created successfully',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating [feature]');
    return reply.status(400).send({
      success: false,
      error: {
        code: '[FEATURE]_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create [feature]',
      },
    });
  }
}

export async function list[Feature]s(
  request: FastifyRequest<{ Querystring: List[Feature]sQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await [feature]Service.list(request.query);
    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing [feature]s');
    return reply.status(500).send({
      success: false,
      error: {
        code: '[FEATURE]_LIST_ERROR',
        message: 'Failed to list [feature]s',
      },
    });
  }
}

export async function get[Feature](
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const [feature] = await [feature]Service.getById(request.params.id);
    if (![feature]) {
      return reply.status(404).send({
        success: false,
        error: {
          code: '[FEATURE]_NOT_FOUND',
          message: '[Feature] not found',
        },
      });
    }
    return reply.send({ success: true, data: [feature] });
  } catch (error) {
    request.log.error({ error }, 'Error getting [feature]');
    return reply.status(500).send({
      success: false,
      error: {
        code: '[FEATURE]_GET_ERROR',
        message: 'Failed to get [feature]',
      },
    });
  }
}

export async function update[Feature](
  request: FastifyRequest<{ Params: { id: string }; Body: Update[Feature]Input }>,
  reply: FastifyReply,
) {
  try {
    const [feature] = await [feature]Service.update(request.params.id, request.body);
    return reply.send({
      success: true,
      data: [feature],
      message: '[Feature] updated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating [feature]');
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return reply.status(status).send({
      success: false,
      error: {
        code: '[FEATURE]_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update [feature]',
      },
    });
  }
}

export async function delete[Feature](
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await [feature]Service.delete(request.params.id);
    return reply.send({
      success: true,
      message: '[Feature] deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Error deleting [feature]');
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return reply.status(status).send({
      success: false,
      error: {
        code: '[FEATURE]_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete [feature]',
      },
    });
  }
}
```

---

## Step 5: Create Routes (`src/modules/{app}/routes/[feature]/[feature].routes.ts`)

```typescript
import type { FastifyInstance } from 'fastify';

import {
  create[Feature]Schema,
  get[Feature]Schema,
  list[Feature]sSchema,
  update[Feature]Schema,
} from '@core/schemas/[module]/[feature]/[feature].schema';
import {
  create[Feature],
  delete[Feature],
  get[Feature],
  list[Feature]s,
  update[Feature],
} from './[feature].controller';

export async function [feature]Routes(fastify: FastifyInstance): Promise<void> {
  // List [Feature]s
  fastify.get('/', {
    schema: {
      tags: ['[Feature]s'],
      summary: 'List [feature]s',
      description: 'Get paginated list of [feature]s with optional filters',
      ...list[Feature]sSchema,
    },
    handler: list[Feature]s,
  });

  // Get [Feature] by ID
  fastify.get('/:id', {
    schema: {
      tags: ['[Feature]s'],
      summary: 'Get [feature] by ID',
      ...get[Feature]Schema,
    },
    handler: get[Feature],
  });

  // Create [Feature]
  fastify.post('/', {
    schema: {
      tags: ['[Feature]s'],
      summary: 'Create [feature]',
      ...create[Feature]Schema,
    },
    handler: create[Feature],
  });

  // Update [Feature]
  fastify.patch('/:id', {
    schema: {
      tags: ['[Feature]s'],
      summary: 'Update [feature]',
      ...update[Feature]Schema,
    },
    handler: update[Feature],
  });

  // Delete [Feature]
  fastify.delete('/:id', {
    schema: {
      tags: ['[Feature]s'],
      summary: 'Delete [feature]',
      ...get[Feature]Schema,
    },
    handler: delete[Feature],
  });
}
```

---

## Step 6: Register Routes (`src/modules/{app}/routes/index.ts`)

```typescript
import type { FastifyInstance } from 'fastify';
import { [feature]Routes } from './[feature]/[feature].routes';

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register([feature]Routes, { prefix: '/[feature]s' });
}
```

Then in `src/app.ts`:

```typescript
// Mount module routes
const webRoutes = await import('./modules/web/routes');
await fastify.register(webRoutes, { prefix: '/api/v1/web' });
```

---

## Step 7: Write Tests

Create `tests/unit/[feature].service.test.ts` and `tests/integration/[feature].routes.test.ts`.

Follow exact pattern from existing tests.

---

## Module Selection Guide

| If the feature is for... | Create in module... | Route prefix |
|--------------------------|---------------------|--------------|
| Public website (mereka.io) | `modules/web/` | `/api/v1/public` |
| Main app (app.mereka.io) | `modules/web/` | `/api/v1/app` |
| Admin panel (admin.mereka.io) | `modules/admin/` | `/api/v1/admin` |
| Hub dashboard | `modules/hub/` | `/api/v1/hub` |
| Auth (all apps) | `modules/shared/auth/` | `/api/v1/auth` |
| Payments (checkout + app) | `modules/shared/payments/` | `/api/v1/payments` |

---

## Checklist

Before marking module "complete":

### Core Layer
- [ ] Model created in `src/core/models/`
- [ ] Indexes added
- [ ] Schemas created in `src/core/schemas/{module}/{domain}/`
- [ ] Service created in `src/core/services/{module}/{domain}/`

### Module Layer
- [ ] Controller created in `src/modules/{app}/controllers/{domain}/`
- [ ] Routes created in `src/modules/{app}/routes/{domain}/`
- [ ] Routes registered in module's index.ts
- [ ] Module mounted in app.ts

### Quality
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] All imports organized (Biome)
- [ ] Type imports used (`import type`)
- [ ] No `any` types
- [ ] `npm run check` passes
- [ ] 80%+ coverage
- [ ] Swagger docs complete

---

## Schema Pattern (Native JSON Schema)

**DO NOT USE ZOD**. Use native JSON Schema objects:

```typescript
// Correct - Native JSON Schema
export const createItemSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 2 },
    },
  },
} as const;

// Wrong - Do not use Zod
// import { z } from 'zod';
// const schema = z.object({...});
```

Fastify validates with AJV automatically. TypeScript types are defined separately.

---

**Follow existing modules as reference. Consistency is key!**

---

_Updated for Native JSON Schema - December 2025_
