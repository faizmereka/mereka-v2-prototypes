# Withdrawal Model Documentation

## Overview

The `Withdrawal` model tracks payout requests from experts/freelancers to their bank accounts. It integrates with Stripe Connect payouts and maintains a complete audit trail of fund transfers.

- **Collection**: `withdrawals`
- **Location**: `src/models/Withdrawal.ts`

## Model Structure

### Field Reference

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| `userId` | String | Yes | Yes | Reference to User |
| `stripeAccountId` | String | Yes | Yes | Stripe Connect account ID |
| `stripePayoutId` | String | Yes | Yes (unique) | Stripe payout ID (po_xxx) |
| `amount` | Number | Yes | No | Amount in currency units |
| `currency` | String | Yes | No | ISO currency code (3 chars) |
| `bankAccountId` | String | Yes | Yes | Reference to BankAccount stripeBankId |
| `sourceType` | Enum | Yes | Yes | Payment method type |
| `status` | Enum | No | Yes | Current payout status |
| `description` | String | No | No | Optional note from user |
| `stripeResponse` | Object | Yes | No | Full Stripe payout response |
| `requestedBy` | String | Yes | Yes | User ID who requested |
| `approvedBy` | String | No | No | Admin ID if manual approval |
| `arrivalDate` | Date | No | No | Expected fund arrival date |
| `completedDate` | Date | No | No | When payout completed |

### Enums

#### WithdrawalStatus
```typescript
enum WithdrawalStatus {
  PENDING = 'pending',       // Payout initiated
  IN_TRANSIT = 'in_transit', // Funds are being transferred
  PAID = 'paid',             // Successfully completed
  FAILED = 'failed',         // Payout failed
  CANCELED = 'canceled',     // Canceled by user or admin
}
```

#### SourceType
```typescript
enum SourceType {
  CARD = 'card',               // Card payout
  FPX = 'fpx',                 // FPX (Malaysia)
  BANK_TRANSFER = 'bank_transfer', // Standard bank transfer
}
```

### Stripe Response Interface

```typescript
interface IStripePayoutResponse {
  id: string;              // Stripe payout ID
  amount: number;          // Amount in smallest currency unit
  currency: string;        // Currency code
  status: string;          // Stripe status
  arrivalDate: number;     // Unix timestamp
  created: number;         // Unix timestamp
  method: string;          // Payout method
  sourceType: string;      // Source type
  failureCode?: string;    // Error code if failed
  failureMessage?: string; // Error message
  destination?: string;    // Destination account
}
```

## Indexes

### Single Field Indexes
- `userId` - Find user's withdrawals
- `stripeAccountId` - Find by Connect account
- `stripePayoutId` (unique) - Lookup by Stripe ID
- `bankAccountId` - Find by destination bank
- `sourceType` - Filter by payment method
- `status` - Filter by payout status
- `requestedBy` - Audit trail

### Compound Indexes
- `{ userId: 1, createdAt: -1 }` - User's withdrawals sorted by date
- `{ stripeAccountId: 1, status: 1 }` - Account status queries
- `{ status: 1, createdAt: -1 }` - Status-based queries
- `{ requestedBy: 1, createdAt: -1 }` - Requester audit

## Instance Methods

### isCompleted()
```typescript
withdrawal.isCompleted(); // returns boolean
```
Returns `true` if status is `PAID`.

### isFailed()
```typescript
withdrawal.isFailed(); // returns boolean
```
Returns `true` if status is `FAILED`.

### isPending()
```typescript
withdrawal.isPending(); // returns boolean
```
Returns `true` if status is `PENDING` or `IN_TRANSIT`.

### getReference()
```typescript
withdrawal.getReference(); // returns "Bank - My withdrawal note"
```
Returns formatted reference string with source type label.

## Static Methods

### findByUserId(userId, options?)
```typescript
const withdrawals = await Withdrawal.findByUserId('user-123', {
  status: WithdrawalStatus.PAID,
  limit: 10,
});
```
Returns user's withdrawals with optional filters.

### findByStripePayoutId(stripePayoutId)
```typescript
const withdrawal = await Withdrawal.findByStripePayoutId('po_xxx');
```
Finds withdrawal by Stripe payout ID.

### findPending(userId?)
```typescript
// All pending withdrawals
const pending = await Withdrawal.findPending();

// User's pending withdrawals
const userPending = await Withdrawal.findPending('user-123');
```
Returns pending and in-transit withdrawals.

## Usage Examples

### Create Withdrawal
```typescript
import { Withdrawal, WithdrawalStatus, SourceType } from '@models/Withdrawal';

const withdrawal = await Withdrawal.create({
  userId: 'user-123',
  stripeAccountId: 'acct_xxx',
  stripePayoutId: 'po_xxx',
  amount: 500.00,
  currency: 'MYR',
  bankAccountId: 'ba_xxx',
  sourceType: SourceType.BANK_TRANSFER,
  status: WithdrawalStatus.PENDING,
  description: 'Weekly earnings withdrawal',
  stripeResponse: {
    id: 'po_xxx',
    amount: 50000,
    currency: 'myr',
    status: 'pending',
    arrivalDate: 1700000000,
    created: 1699900000,
    method: 'standard',
    sourceType: 'bank_account',
    destination: 'ba_xxx',
  },
  requestedBy: 'user-123',
});
```

### Get User's Withdrawal History
```typescript
const withdrawals = await Withdrawal.findByUserId('user-123');

// With filters
const paidWithdrawals = await Withdrawal.findByUserId('user-123', {
  status: WithdrawalStatus.PAID,
  limit: 20,
});
```

### Update Withdrawal Status (from Stripe webhook)
```typescript
await Withdrawal.updateOne(
  { stripePayoutId: 'po_xxx' },
  {
    $set: {
      status: WithdrawalStatus.PAID,
      completedDate: new Date(),
    },
  }
);
```

### Handle Failed Withdrawal
```typescript
await Withdrawal.updateOne(
  { stripePayoutId: 'po_xxx' },
  {
    $set: {
      status: WithdrawalStatus.FAILED,
      'stripeResponse.failureCode': 'insufficient_funds',
      'stripeResponse.failureMessage': 'Insufficient funds in Stripe balance',
    },
  }
);
```

### Get Pending Withdrawals for Dashboard
```typescript
const pendingWithdrawals = await Withdrawal.findPending();
const totalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
```

### Aggregate Withdrawal Statistics
```typescript
const stats = await Withdrawal.aggregate([
  { $match: { userId: 'user-123', status: WithdrawalStatus.PAID } },
  {
    $group: {
      _id: '$currency',
      totalAmount: { $sum: '$amount' },
      count: { $sum: 1 },
    },
  },
]);
```

## Pre-save Hook

Automatically sets `arrivalDate` from Stripe response:
```typescript
withdrawalSchema.pre('save', function(next) {
  if (this.stripeResponse?.arrivalDate && !this.arrivalDate) {
    this.arrivalDate = new Date(this.stripeResponse.arrivalDate * 1000);
  }
  next();
});
```

## Related Models

- **User** - Who requested the withdrawal
- **BankAccount** - Destination bank account
- **BookingTransaction** - Source of funds (earnings)

## Integration with Stripe Connect

### Payout Flow
1. User requests withdrawal from available balance
2. Backend creates Stripe payout via Connect API
3. `Withdrawal` record created with `PENDING` status
4. Stripe webhook updates status to `IN_TRANSIT`
5. Stripe webhook updates to `PAID` on completion

### Webhook Events
- `payout.created` - Payout initiated
- `payout.updated` - Status changed
- `payout.paid` - Funds delivered
- `payout.failed` - Payout failed
- `payout.canceled` - Payout canceled

## Best Practices

1. **Store complete Stripe response** - Helps with debugging and audits
2. **Update via webhooks** - Don't poll for status
3. **Track both requester and approver** - For compliance
4. **Handle failures gracefully** - Notify users and retry if appropriate
5. **Use proper status transitions** - Don't skip states

## Security Considerations

- Validate user owns the Stripe Connect account
- Verify bank account belongs to user
- Check sufficient balance before requesting payout
- Log all withdrawal attempts for audit
- Rate limit withdrawal requests

## Performance Tips

- Index on status for pending withdrawal queries
- Use compound indexes for user + date queries
- Archive old completed withdrawals periodically
- Cache user balance calculations

## Error Handling

Common Stripe failure codes:
- `insufficient_funds` - Not enough balance
- `account_closed` - Bank account closed
- `invalid_account_number` - Bank details incorrect
- `could_not_process` - Processing error

---

_Last updated: 2025-11-24_
