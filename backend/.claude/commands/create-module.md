# Create Module

Help me create a new module (controller + routes) for: $ARGUMENTS

## Instructions

When creating a new module, follow this workflow:

### 1. Determine the App

Ask: Which app module is this for?
- **web** → `src/modules/web/`
- **hub** → `src/modules/hub/`
- **admin** → `src/modules/admin/`
- **shared** → `src/modules/shared/`

### 2. Create Controller

```typescript
// src/modules/{app}/controllers/{domain}.controller.ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import { jobService } from '@core/services/web/job';
import type { CreateJobInput, GetJobsQuery } from '@core/schemas/job.schema';

export async function createJob(
  request: FastifyRequest<{ Body: CreateJobInput }>,
  reply: FastifyReply,
) {
  try {
    const job = await jobService.createJob(request.body, request.user.id);
    return reply.status(201).send({ success: true, data: job });
  } catch (error) {
    request.log.error({ error }, 'Error creating job');
    return reply.status(400).send({
      success: false,
      error: { code: 'JOB_CREATE_ERROR', message: error.message },
    });
  }
}

export async function getJobs(
  request: FastifyRequest<{ Querystring: GetJobsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await jobService.getJobs(request.query);
    return reply.send({ success: true, data: result });
  } catch (error) {
    request.log.error({ error }, 'Error fetching jobs');
    return reply.status(500).send({
      success: false,
      error: { code: 'JOB_FETCH_ERROR', message: 'Failed to fetch jobs' },
    });
  }
}
```

### 3. Create Routes

```typescript
// src/modules/{app}/routes/{domain}.routes.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createJob, getJobs, getJobById } from '../controllers/job.controller';

const createJobSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function jobRoutes(fastify: FastifyInstance) {
  // List jobs
  fastify.get('/', {
    schema: {
      tags: ['Jobs'],
      summary: 'List jobs',
      querystring: querySchema,
    },
    handler: getJobs,
  });

  // Create job
  fastify.post('/', {
    schema: {
      tags: ['Jobs'],
      summary: 'Create a job',
      body: createJobSchema,
    },
    handler: createJob,
  });

  // Get by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Jobs'],
      summary: 'Get job by ID',
    },
    handler: getJobById,
  });
}
```

### 4. Register in Module Index

```typescript
// src/modules/{app}/routes/index.ts
import type { FastifyInstance } from 'fastify';
import { jobRoutes } from './job.routes';
import { userRoutes } from './user.routes';

export async function webRoutes(fastify: FastifyInstance) {
  await fastify.register(jobRoutes, { prefix: '/jobs' });
  await fastify.register(userRoutes, { prefix: '/users' });
}
```

### 5. Module File Structure

```
src/modules/{app}/
├── controllers/
│   ├── {domain}.controller.ts
│   └── index.ts
├── routes/
│   ├── {domain}.routes.ts
│   └── index.ts
└── index.ts
```

### 6. Checklist

- [ ] Service exists in `core/services/{app}/{domain}/`
- [ ] Controller imports service correctly
- [ ] Routes define proper schemas
- [ ] Swagger tags and descriptions added
- [ ] Routes registered in module index
- [ ] Error handling in controllers
- [ ] Proper status codes (200, 201, 400, 404, 500)
