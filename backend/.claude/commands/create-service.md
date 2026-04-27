# Create Service

Help me create a new service for: $ARGUMENTS

## Instructions

When creating a new service, follow this workflow:

### 1. Determine the App Context

Ask: Which app is this service for?
- **shared** → `src/core/services/shared/{domain}/`
- **web** → `src/core/services/web/{domain}/`
- **hub** → `src/core/services/hub/{domain}/`
- **admin** → `src/core/services/admin/{domain}/`

### 2. Create Service File

**Web Service Example:**
```typescript
// src/core/services/web/job/job.service.ts
import { Job } from '@core/models/Job';
import type { CreateJobInput, GetJobsQuery } from '@core/schemas/job.schema';

export class JobService {
  async createJob(data: CreateJobInput, userId: string) {
    return await Job.create({ ...data, createdBy: userId });
  }

  async getJobs(query: GetJobsQuery) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Job.find().skip(skip).limit(limit).lean(),
      Job.countDocuments(),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const jobService = new JobService();
```

**Admin Service Example:**
```typescript
// src/core/services/admin/jobs/adminJob.service.ts
import { Job } from '@core/models/Job';
import type { AdminListJobsQuery } from '@core/schemas/admin/job.schema';

export class AdminJobService {
  async listJobs(query: AdminListJobsQuery) {
    // Admin-specific implementation with aggregation
  }

  async suspendJob(id: string) {
    // Admin-only operation
  }
}

export const adminJobService = new AdminJobService();
```

### 3. Create Index File

```typescript
// src/core/services/web/job/index.ts
export * from './job.service';
```

### 4. Service Rules

1. **NO HTTP concerns** - Services don't know about request/reply
2. **Single responsibility** - One service per domain per app
3. **Export singleton** - `export const service = new Service()`
4. **Use proper types** - Import types from schemas
5. **Handle errors** - Throw meaningful errors for controllers to catch

### 5. Directory Structure

```
src/core/services/{app}/{domain}/
├── {name}.service.ts    # Main service
├── {name}-{sub}.service.ts  # Sub-services if needed
└── index.ts             # Exports
```
