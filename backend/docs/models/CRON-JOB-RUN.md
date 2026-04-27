# CronJobRun Model Documentation

## Overview

The `CronJobRun` model tracks execution history for all scheduled and manual cron jobs in the system. It provides observability, debugging capabilities, and monitoring for background job processing.

- **Collection**: `cronJobRuns`
- **Location**: `src/models/CronJobRun.ts`

## Model Structure

### Field Reference

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| `jobName` | String | Yes | Yes | Name identifier of the job (e.g., `weekly-payout-processor`) |
| `jobCategory` | Enum | Yes | Yes | Category grouping for the job |
| `status` | Enum | No | Yes | Current execution status (default: `running`) |
| `startedAt` | Date | Yes | Yes | When the job started execution |
| `completedAt` | Date | No | No | When the job finished (success or failure) |
| `duration` | Number | No | No | Execution time in milliseconds |
| `error` | String | No | No | Error message if job failed |
| `errorStack` | String | No | No | Full stack trace for debugging |
| `metadata` | Mixed | No | No | Job-specific metrics and data |
| `retryCount` | Number | No | No | Number of retry attempts (default: 0) |
| `triggeredBy` | Enum | No | No | How the job was triggered |
| `serverInstance` | String | No | No | Server/pod identifier for distributed systems |

### Enums

#### CronJobStatus
```typescript
enum CronJobStatus {
  RUNNING = 'running',      // Job is currently executing
  COMPLETED = 'completed',  // Job finished successfully
  FAILED = 'failed',        // Job encountered an error
  SKIPPED = 'skipped',      // Job was skipped (already running)
}
```

#### CronJobCategory
```typescript
enum CronJobCategory {
  PAYMENT = 'payment',           // Payment processing jobs
  NOTIFICATION = 'notification', // Email/push notification jobs
  MAINTENANCE = 'maintenance',   // System maintenance jobs
  DATA_SYNC = 'data_sync',      // Data synchronization jobs
  CLEANUP = 'cleanup',          // Data cleanup jobs
}
```

#### TriggeredBy
```typescript
type TriggeredBy = 'schedule' | 'manual' | 'retry';
```
- `schedule`: Triggered by cron schedule
- `manual`: Triggered via admin API
- `retry`: Triggered by automatic retry mechanism

### Metadata Interface

```typescript
interface IJobMetadata {
  recordsProcessed?: number;   // Total records handled
  recordsSucceeded?: number;   // Successfully processed
  recordsFailed?: number;      // Failed to process
  duration?: number;           // Processing duration
  [key: string]: unknown;      // Additional job-specific data
}
```

## Indexes

### Single Field Indexes
- `jobName` - Query by job name
- `jobCategory` - Filter by category
- `status` - Filter by execution status
- `startedAt` - Sort by start time

### Compound Indexes
- `{ jobName: 1, startedAt: -1 }` - Recent runs for specific job
- `{ status: 1, startedAt: -1 }` - Recent runs by status
- `{ jobCategory: 1, status: 1 }` - Category filtering with status

### TTL Index
- `{ createdAt: 1 }` with `expireAfterSeconds: 2592000` (30 days)
- Automatically removes old job run records

## Usage Examples

### Create Job Run Record
```typescript
import { CronJobRun, CronJobStatus, CronJobCategory } from '@models/CronJobRun';

const jobRun = await CronJobRun.create({
  jobName: 'weekly-payout-processor',
  jobCategory: CronJobCategory.PAYMENT,
  status: CronJobStatus.RUNNING,
  startedAt: new Date(),
  triggeredBy: 'schedule',
  serverInstance: process.env.POD_NAME,
});
```

### Update Job Completion
```typescript
await CronJobRun.updateOne(
  { _id: runId },
  {
    $set: {
      status: CronJobStatus.COMPLETED,
      completedAt: new Date(),
      duration: Date.now() - startTime,
      metadata: {
        recordsProcessed: 100,
        recordsSucceeded: 98,
        recordsFailed: 2,
      },
    },
  }
);
```

### Query Recent Failed Jobs
```typescript
const failedJobs = await CronJobRun.find({
  status: CronJobStatus.FAILED,
  startedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
})
  .sort({ startedAt: -1 })
  .limit(10)
  .lean();
```

### Get Job Statistics (Aggregation)
```typescript
const stats = await CronJobRun.aggregate([
  {
    $match: {
      startedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  },
  {
    $group: {
      _id: '$jobName',
      totalRuns: { $sum: 1 },
      avgDuration: { $avg: '$duration' },
      successCount: {
        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
      },
      failureCount: {
        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
      },
    },
  },
]);
```

### Find Stuck Jobs
```typescript
const stuckJobs = await CronJobRun.find({
  status: CronJobStatus.RUNNING,
  startedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) }, // 30 min ago
}).lean();
```

## Related Models

- **PendingPayment** - Failed payments tracked by payment jobs
- **BookingTransaction** - Transactions created by payment jobs
- **Contract** - Contracts processed by weekly payout job
- **Milestone** - Milestones processed by auto-release job

## Best Practices

1. **Always record job runs** - Even skipped jobs should be recorded for monitoring
2. **Include meaningful metadata** - Record counts help with debugging
3. **Use categories** - Group related jobs for better filtering
4. **Log server instance** - Critical for debugging in multi-pod deployments
5. **Set appropriate TTL** - 30 days is default, adjust based on needs

## Security Considerations

- Error stacks may contain sensitive information - restrict API access
- Server instance names should not expose internal infrastructure
- Job metadata should not store PII directly

## Performance Tips

- Use compound indexes for common query patterns
- TTL index keeps collection size manageable
- Use `lean()` for read-only queries
- Limit result sets when querying history

---

_Last updated: 2025-11-24_
