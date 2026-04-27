# PendingPayment Model Documentation

## Overview

The `PendingPayment` model tracks failed payments that require retry. When a payment fails during weekly payout processing, a pending payment record is created to enable automatic retry with exponential backoff.

- **Collection**: `pendingPayments`
- **Location**: `src/models/PendingPayment.ts`

## Model Structure

### Field Reference

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| `contractId` | String | Yes | Yes | Reference to the contract |
| `jobId` | String | Yes | Yes | Reference to the job |
| `applicationId` | String | Yes | No | Reference to the job application |
| `hubId` | String | Yes | Yes | Reference to the hub |
| `expertId` | String | Yes | Yes | Expert who performed work |
| `learnerId` | String | Yes | Yes | Learner who owes payment |
| `paymentMethodId` | String | Yes | No | Stripe payment method ID |
| `stripeCustomerId` | String | Yes | No | Stripe customer ID |
| `amount` | Number | Yes | No | Payment amount in cents |
| `currency` | String | Yes | No | ISO currency code (uppercase) |
| `totalHours` | Number | Yes | No | Total hours worked |
| `startDateTime` | String | Yes | No | Work period start |
| `endDateTime` | String | Yes | No | Work period end |
| `contractTitle` | String | Yes | No | Title for reference |
| `description` | String | No | No | Payment description |
| `workLogIds` | String[] | No | No | Associated timelog IDs |
| `status` | Enum | No | Yes | Current payment status |
| `retryCount` | Number | No | No | Number of retry attempts |
| `maxRetries` | Number | No | No | Maximum retries (default: 5) |
| `nextRetryAt` | Date | Yes | Yes | When to attempt next retry |
| `lastError` | String | No | No | Most recent error message |
| `lastAttempt` | Date | No | No | When last retry occurred |
| `failedAt` | Date | No | No | When permanently failed |
| `processedAt` | Date | No | No | When successfully processed |
| `paymentIntentId` | String | No | No | Stripe PaymentIntent ID on success |

### Enums

#### PendingPaymentStatus
```typescript
enum PendingPaymentStatus {
  PENDING = 'pending',       // Awaiting retry
  PROCESSING = 'processing', // Currently being processed
  COMPLETED = 'completed',   // Payment succeeded
  FAILED = 'failed',         // Permanently failed (max retries reached)
}
```

## Indexes

### Single Field Indexes
- `contractId` - Query by contract
- `jobId` - Query by job
- `hubId` - Filter by hub
- `expertId` - Find expert's pending payments
- `learnerId` - Find learner's pending payments
- `status` - Filter by payment status
- `nextRetryAt` - Find payments due for retry

### Compound Indexes
- `{ status: 1, nextRetryAt: 1, retryCount: 1 }` - Retry job query optimization
- `{ contractId: 1, status: 1 }` - Contract payment status

## Retry Strategy

The system uses exponential backoff for payment retries:

| Retry # | Wait Time | Cumulative Time |
|---------|-----------|-----------------|
| 1 | 6 hours | 6 hours |
| 2 | 12 hours | 18 hours |
| 3 | 24 hours | 42 hours |
| 4 | 48 hours | 90 hours |
| 5 | 72 hours | 162 hours (~6.75 days) |

After 5 failed retries, the payment is marked as `FAILED` permanently.

## Usage Examples

### Create Pending Payment
```typescript
import { PendingPayment, PendingPaymentStatus } from '@models/PendingPayment';

const pendingPayment = await PendingPayment.create({
  contractId: 'contract-123',
  jobId: 'job-456',
  applicationId: 'app-789',
  hubId: 'hub-001',
  expertId: 'expert-111',
  learnerId: 'learner-222',
  paymentMethodId: 'pm_xxx',
  stripeCustomerId: 'cus_xxx',
  amount: 50000, // $500.00 in cents
  currency: 'USD',
  totalHours: 10,
  startDateTime: '2025-01-01T00:00:00Z',
  endDateTime: '2025-01-07T23:59:59Z',
  contractTitle: 'Web Development',
  description: 'Weekly payout',
  workLogIds: ['log1', 'log2'],
  status: PendingPaymentStatus.PENDING,
  retryCount: 0,
  maxRetries: 5,
  nextRetryAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
  lastError: 'Card declined',
});
```

### Get Payments Due for Retry
```typescript
const pendingPayments = await PendingPayment.find({
  status: PendingPaymentStatus.PENDING,
  nextRetryAt: { $lte: new Date() },
  retryCount: { $lt: 5 },
}).lean();
```

### Mark as Processing
```typescript
await PendingPayment.updateOne(
  { _id: paymentId },
  { $set: { status: PendingPaymentStatus.PROCESSING } }
);
```

### Mark as Completed
```typescript
await PendingPayment.updateOne(
  { _id: paymentId },
  {
    $set: {
      status: PendingPaymentStatus.COMPLETED,
      processedAt: new Date(),
      paymentIntentId: 'pi_xxx',
    },
  }
);
```

### Mark as Failed with Retry
```typescript
const retryIntervals = [6, 12, 24, 48, 72]; // hours
const nextRetryHours = retryIntervals[Math.min(retryCount, 4)];

await PendingPayment.updateOne(
  { _id: paymentId },
  {
    $set: {
      status: PendingPaymentStatus.PENDING,
      retryCount: retryCount + 1,
      lastError: 'Insufficient funds',
      lastAttempt: new Date(),
      nextRetryAt: new Date(Date.now() + nextRetryHours * 60 * 60 * 1000),
    },
  }
);
```

### Mark as Permanently Failed
```typescript
await PendingPayment.updateOne(
  { _id: paymentId },
  {
    $set: {
      status: PendingPaymentStatus.FAILED,
      retryCount: maxRetries,
      lastError: 'Max retries exceeded',
      failedAt: new Date(),
    },
  }
);
```

### Get Contract Pending Payments
```typescript
const contractPayments = await PendingPayment.find({
  contractId: 'contract-123',
}).lean();
```

## Related Models

- **Contract** - The contract for which payment failed
- **Job** - Associated job
- **Timelog** - Work logs that need payment
- **BookingTransaction** - Created on successful payment
- **CronJobRun** - Tracks retry job executions

## Integration with Cron Jobs

### Weekly Payout Processor
Creates `PendingPayment` records when initial payment fails:
- Runs weekly on Sunday at midnight
- Processes approved timelogs
- Creates pending payment on Stripe failure

### Pending Payment Retry Job
Processes pending payments for retry:
- Runs every 6 hours
- Finds payments where `nextRetryAt <= now`
- Attempts payment via Stripe
- Updates status based on result

## Best Practices

1. **Always check status before processing** - Prevent concurrent processing
2. **Use exponential backoff** - Don't overwhelm failed payment methods
3. **Store meaningful error messages** - Help with debugging and customer support
4. **Track work log IDs** - Ensure timelogs get marked paid on success
5. **Notify on permanent failure** - Alert admin when max retries reached

## Security Considerations

- Payment method IDs should be handled securely
- Stripe customer IDs are sensitive data
- Amount should be validated before Stripe API calls
- Access should be restricted to payment processing services

## Performance Tips

- Use compound index for retry queries
- Set appropriate `maxRetries` to prevent infinite retries
- Archive completed/failed payments periodically
- Monitor queue depth for capacity planning

---

_Last updated: 2025-11-24_
