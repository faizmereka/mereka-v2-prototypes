# Cron Jobs System Architecture

## Overview

The Mereka Backend v2 includes a robust cron job system for scheduling and monitoring background tasks. The system uses `toad-scheduler` with a custom MongoDB-based monitoring layer.

## Architecture

```
src/
├── jobs/                          # Cron job handlers
│   ├── helpers/
│   │   ├── job-runner.ts          # Core job execution with monitoring
│   │   └── index.ts
│   ├── payment/
│   │   ├── retry-pending-payments.ts
│   │   ├── weekly-payout-processor.ts
│   │   ├── transfer-stripe-balance.ts
│   │   └── index.ts
│   └── index.ts
├── models/
│   ├── CronJobRun.ts              # Job run tracking model
│   └── PendingPayment.ts          # Failed payment retry queue
├── plugins/
│   └── cron-jobs.ts               # Fastify plugin for scheduler
├── routes/
│   └── cron-job.routes.ts         # Monitoring API endpoints
└── schemas/
    └── cron-job.schema.ts         # Zod validation schemas
```

## Components

### 1. Job Runner (`src/jobs/helpers/job-runner.ts`)

The core utility that wraps job handlers with:
- Automatic job run tracking in MongoDB
- Duration measurement
- Error capture and logging
- Skip-if-running logic to prevent overlaps
- Metadata updates during execution

```typescript
const jobRunner = createJobRunner(fastify, {
  name: 'myJob',
  category: CronJobCategory.PAYMENT,
  handler: myJobHandler,
  skipIfRunning: true,
});
```

### 2. CronJobRun Model (`src/models/CronJobRun.ts`)

Tracks all job executions with:
- Job name and category
- Status (running, completed, failed, skipped)
- Start/end times and duration
- Error messages and stack traces
- Custom metadata
- Auto-delete after 30 days (TTL index)

### 3. PendingPayment Model (`src/models/PendingPayment.ts`)

Stores failed payments for retry:
- Contract and job references
- Stripe payment details
- Retry count and next retry time
- Error tracking

### 4. Cron Jobs Plugin (`src/plugins/cron-jobs.ts`)

Fastify plugin that:
- Initializes `toad-scheduler`
- Registers all defined jobs
- Provides manual trigger capability
- Cleans up on server shutdown

## Registered Jobs

| Job Name | Schedule | Description |
|----------|----------|-------------|
| `retryPendingPayments` | Every 1 hour | Retries failed payments with exponential backoff |
| `weeklyPayoutProcessor` | Weekly (168h) | Processes weekly timelogs and charges job posters |
| `transferStripeBalance` | Every 12 hours | Transfers funds from platform to hub accounts |

## Job Definitions

Jobs are defined in `src/plugins/cron-jobs.ts`:

```typescript
const JOB_DEFINITIONS: JobDefinition[] = [
  {
    name: 'retryPendingPayments',
    category: CronJobCategory.PAYMENT,
    handler: retryPendingPaymentsHandler,
    intervalHours: 1,
    runImmediately: false,
    skipIfRunning: true,
    enabled: true,
  },
  // ... more jobs
];
```

### Job Definition Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Unique job identifier |
| `category` | CronJobCategory | Job category for grouping |
| `handler` | JobHandler | Async function to execute |
| `intervalHours` | number | Interval in hours |
| `intervalMinutes` | number | Interval in minutes (alternative) |
| `runImmediately` | boolean | Run on startup |
| `skipIfRunning` | boolean | Skip if previous run still active |
| `enabled` | boolean | Whether job is active |

## Writing a New Job

### 1. Create Job Handler

```typescript
// src/jobs/payment/my-new-job.ts
import type { IJobMetadata, JobContext } from '@jobs/helpers/job-runner';

export async function myNewJobHandler(
  context: JobContext,
): Promise<IJobMetadata> {
  const { log } = context;

  log.info('Starting my new job');

  // Your job logic here
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // ... process items ...

  return {
    recordsProcessed: processed,
    recordsSucceeded: succeeded,
    recordsFailed: failed,
  };
}
```

### 2. Export from Index

```typescript
// src/jobs/payment/index.ts
export * from './my-new-job';
```

### 3. Register in Plugin

```typescript
// src/plugins/cron-jobs.ts
import { myNewJobHandler } from '@jobs/payment/my-new-job';

const JOB_DEFINITIONS: JobDefinition[] = [
  // ... existing jobs
  {
    name: 'myNewJob',
    category: CronJobCategory.PAYMENT,
    handler: myNewJobHandler,
    intervalHours: 6,
    skipIfRunning: true,
    enabled: true,
  },
];
```

## Monitoring API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/cron-jobs/runs` | List recent job runs |
| GET | `/api/v1/cron-jobs/statistics` | Get job statistics |
| GET | `/api/v1/cron-jobs/recent` | Get most recent runs |
| GET | `/api/v1/cron-jobs/stuck` | Find stuck jobs |
| GET | `/api/v1/cron-jobs/registered` | List registered jobs |
| POST | `/api/v1/cron-jobs/trigger` | Manually trigger a job |
| GET | `/api/v1/cron-jobs/run/:id` | Get specific run details |

### Example: Trigger Job Manually

```bash
curl -X POST http://localhost:3000/api/v1/cron-jobs/trigger \
  -H "Content-Type: application/json" \
  -d '{"jobName": "retryPendingPayments"}'
```

### Example: Get Job Statistics

```bash
curl "http://localhost:3000/api/v1/cron-jobs/statistics?hours=24"
```

## Payment Jobs Detail

### retryPendingPayments

**Schedule:** Every 1 hour

**Purpose:** Retries failed weekly payout payments

**Process:**
1. Find pending payments where `nextRetryAt <= now` and `retryCount < 5`
2. Attempt to charge using saved payment method
3. On success: mark as completed, update work logs
4. On failure: increment retry count, schedule next retry (exponential backoff)
5. After 5 failures: mark as permanently failed

**Retry Intervals:** 6h, 12h, 24h, 48h, 72h

### weeklyPayoutProcessor

**Schedule:** Weekly (runs every 168 hours)

**Purpose:** Processes weekly timelogs and charges job posters

**Process:**
1. Get approved timelogs from previous week (Monday-Sunday)
2. Group by contract and calculate total hours
3. Calculate amount = hours × hourlyRate + stripeFee
4. Charge job poster's saved payment method
5. Create booking transaction record
6. Mark timelogs as paid
7. On failure: create PendingPayment for retry

### transferStripeBalance

**Schedule:** Every 12 hours

**Purpose:** Transfers funds from platform to hub owner's Stripe Connect accounts

**v2 Architecture:**
- Uses `StripeAccount` model (linked to User via `userId`)
- Hub has `ownerId` field pointing to User
- Single Stripe account (simplified - no Malaysian/Atlas split)
- Handles experience/expertise/space bookings only
- Standard Stripe fee: 2.9% + $0.30

**Process:**
1. Find BookingTransactions where:
   - `stripeStatus = 'succeeded'`
   - `status` NOT in ['cancelled', 'withdrawn', 'rejected']
   - `isMoneyTransferred != 'true'`
   - `isRefunded != true`
2. For each transaction:
   - Get Hub by `hubId`
   - Get StripeAccount by `hub.ownerId`
   - Verify `payoutsEnabled` is true
3. Calculate transfer:
   - `transferAmount = stripeAmount - stripeFee - refundAmount`
   - Handle partial coupons (Mereka pays discount portion)
   - Deduct platform fee (10% default, or from subscription tier)
4. Create Stripe transfer to hub owner's Connect account
5. Update transaction with transfer details

## Job Categories

```typescript
enum CronJobCategory {
  PAYMENT = 'payment',
  NOTIFICATION = 'notification',
  MAINTENANCE = 'maintenance',
  DATA_SYNC = 'data_sync',
  CLEANUP = 'cleanup',
}
```

## Error Handling

All jobs are wrapped with error handling:

1. **Execution errors** are caught and logged
2. **Job run status** is set to `failed`
3. **Error message and stack** are stored in CronJobRun
4. **Next run** proceeds normally (no job blocking)

For payment jobs specifically:
- Failed payments create `PendingPayment` records
- Retry logic with exponential backoff
- Email notifications on permanent failure

## Best Practices

1. **Keep jobs idempotent** - Running twice should be safe
2. **Use skipIfRunning** - Prevent overlapping executions
3. **Log progress** - Use `context.log` for structured logging
4. **Update metadata** - Track records processed/succeeded/failed
5. **Handle errors gracefully** - Don't crash, log and continue
6. **Use transactions** - For multi-document updates
7. **Monitor stuck jobs** - Check `/api/v1/cron-jobs/stuck` regularly

## Migration from Cloud Functions

| Cloud Function | v2 Job | Notes |
|---------------|--------|-------|
| `retryPendingPayments` | `retryPendingPayments` | Same logic, every hour |
| `weeklyPayoutProcessor` | `weeklyPayoutProcessor` | Uses TimelogEntry model |
| `transferStripeBalance` | `transferStripeBalance` | Every 12 hours |

## Environment Variables

No additional environment variables required. Jobs use existing configuration:
- `STRIPE_SECRET_KEY` - For payment processing
- MongoDB connection - For job tracking

## Testing

Jobs can be tested by:
1. Manual trigger via API
2. Unit tests with mocked context
3. Integration tests with test database

```typescript
// Manual trigger example
await fastify.triggerJob('retryPendingPayments');
```
