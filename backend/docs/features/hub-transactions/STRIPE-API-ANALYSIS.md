# Stripe API Analysis for Hub Transactions

## Executive Summary

This document analyzes Stripe Connect API capabilities and their feasibility for implementing the Hub Transactions feature in Mereka v2. Based on our investigation, **we recommend continuing with Stripe Connect v1 (Custom Accounts)** as it provides all required features for Malaysia-based marketplace operations.

---

## Table of Contents

1. [Stripe Connect API Versions](#stripe-connect-api-versions)
2. [Key Stripe Features Required](#key-stripe-features-required)
3. [Malaysia-Specific Considerations](#malaysia-specific-considerations)
4. [Current V2 Implementation Status](#current-v2-implementation-status)
5. [V1 vs V2 Feature Comparison](#v1-vs-v2-feature-comparison)
6. [Implementation Feasibility](#implementation-feasibility)
7. [Recommended Approach](#recommended-approach)
8. [API Endpoints Needed](#api-endpoints-needed)
9. [Technical Specifications](#technical-specifications)

---

## 1. Stripe Connect API Versions

### Connect v1 (Current Standard)
- **Account Types**: Standard, Express, Custom
- **Full Feature Set**: OAuth, cross-border payouts, all payment methods
- **Mature & Stable**: Well-documented, extensive community support
- **Recommended for**: Platforms using OAuth or cross-border payouts

### Connect v2 (Accounts API v2) - NEW
- **Unified Identity System**: Single Account object for connected accounts AND customers
- **Configuration-Based**: Assign configurations (merchant, customer, recipient) instead of managing separate resources
- **Capabilities**:
  - `card_payments` - Accept card payments
  - `stripe_balance.payouts` - Receive payouts (replaces v1 `payouts`)
  - `stripe_balance.stripe_transfers` - Receive transfers (replaces v1 `transfers`)

### v2 Limitations (Why We Use v1)
| Limitation | Impact |
|------------|--------|
| No OAuth Support | Cannot use OAuth for account onboarding |
| No Cross-Border Payouts | Malaysia not supported for cross-border |
| Newer/Less Mature | Less community documentation |

**Decision**: Continue with **Connect v1 Custom Accounts** for Mereka.

---

## 2. Key Stripe Features Required

### 2.1 Balance Management

```typescript
// Retrieve connected account balance
const balance = await stripe.balance.retrieve({
  stripeAccount: 'acct_xxxxxxxxxxxxx',
});

// Returns:
{
  available: [{ amount: 50000, currency: 'myr' }],  // Ready for payout
  pending: [{ amount: 25000, currency: 'myr' }],    // Processing (5+ days)
}
```

**Balance States**:
- **Available**: Funds ready for immediate payout
- **Pending**: Funds not yet available (typically 5 business days for Malaysia)

### 2.2 Manual Payouts (Withdrawals)

```typescript
// Configure manual payouts on account creation
await stripe.accounts.update('acct_xxx', {
  settings: {
    payouts: {
      schedule: { interval: 'manual' }  // Experts manually request withdrawals
    }
  }
});

// Create payout when expert requests withdrawal
const payout = await stripe.payouts.create({
  amount: 500000,  // Amount in cents (MYR 5,000.00)
  currency: 'myr',
  destination: 'ba_xxxxxxxxxxxxx',  // Bank account ID
}, {
  stripeAccount: 'acct_xxxxxxxxxxxxx',
});
```

**Payout Timing**:
- Standard payouts: 1-3 business days (Malaysia)
- Instant payouts: Not available in Malaysia

### 2.3 Transfers (Platform to Connected Account)

```typescript
// Transfer earnings to expert after booking completion
const transfer = await stripe.transfers.create({
  amount: 13725,  // Amount in cents (MYR 137.25)
  currency: 'myr',
  destination: 'acct_xxxxxxxxxxxxx',  // Expert's Stripe account
  transfer_group: 'booking_123',
  source_transaction: 'ch_xxxxxxxxxxxxx',  // Original charge ID
  metadata: {
    bookingId: 'booking_123',
    serviceType: 'experience',
  }
});
```

**Transfer Best Practices**:
- Use `source_transaction` to link transfers to original charges
- Use `transfer_group` to group related transfers
- Transfers execute after charge funds settle

### 2.4 Bank Account Management

```typescript
// Add bank account to connected account
const bankAccount = await stripe.accounts.createExternalAccount('acct_xxx', {
  external_account: {
    object: 'bank_account',
    account_holder_name: 'Jane Doe',
    account_number: '1234567890',
    routing_number: 'MBBEMYKL',  // SWIFT/BIC code
    country: 'MY',
    currency: 'MYR',
  },
  default_for_currency: true,
});

// List bank accounts
const bankAccounts = await stripe.accounts.listExternalAccounts('acct_xxx', {
  object: 'bank_account',
});

// Set default bank account
await stripe.accounts.updateExternalAccount('acct_xxx', 'ba_xxx', {
  default_for_currency: true,
});
```

### 2.5 Webhook Events

Essential events for transaction tracking:

| Event | Description |
|-------|-------------|
| `payment_intent.succeeded` | Payment completed |
| `payment_intent.failed` | Payment failed |
| `transfer.created` | Transfer to connected account created |
| `transfer.updated` | Transfer status changed |
| `payout.created` | Payout initiated |
| `payout.paid` | Payout completed |
| `payout.failed` | Payout failed |
| `charge.refunded` | Refund processed |
| `charge.dispute.created` | Dispute opened |

---

## 3. Malaysia-Specific Considerations

### 3.1 Supported Features in Malaysia

| Feature | Status | Notes |
|---------|--------|-------|
| Card Payments | Supported | Visa, Mastercard, AMEX |
| FPX (Online Banking) | Supported | Major Malaysian banks |
| Payouts to Bank | Supported | MYR only |
| Custom Accounts | Supported | Full control |
| Express Accounts | Supported | Stripe-hosted onboarding |
| Cross-Border Payouts | NOT Supported | Platform and connected accounts must be in same region |

### 3.2 Payout Timing (Malaysia)

- **Card Payments**: Funds available in 5 business days
- **FPX Payments**: Funds available in 2 business days
- **Payout to Bank**: 1-3 business days after request

### 3.3 Currency

- **Settlement Currency**: MYR (Malaysian Ringgit)
- **Minimum Payout**: MYR 2.00
- **Maximum Single Payout**: No limit (subject to balance)

### 3.4 Fund Holding Limits

- **Maximum Holding Period**: 90 days
- **Action Required**: Must payout within 90 days
- **Our Escrow Period**: 3 days (Mereka Guarantee)

---

## 4. Current V2 Implementation Status

### 4.1 Models (Complete)

| Model | Status | Description |
|-------|--------|-------------|
| `Transaction` | Complete | Full transaction ledger |
| `Booking` | Complete | Booking with payment tracking |
| `Withdrawal` | Complete | Payout tracking |
| `StripeAccount` | Complete | Connect account tracking |
| `BankAccount` | Complete | Bank account management |
| `Bank` | Complete | Bank reference data |

### 4.2 Services (Partial)

| Service | Status | What's Missing |
|---------|--------|----------------|
| `TransactionService` | Complete | - |
| `StripeService` | Complete | - |
| `HubTransactionService` | Missing | Hub-specific transaction logic |

### 4.3 Routes (Missing)

| Route | Status | Priority |
|-------|--------|----------|
| Hub Transactions List | Missing | High |
| Hub Transaction Details | Missing | High |
| Hub Balance Dashboard | Missing | High |
| Hub Withdrawals | Missing | High |
| CSV Export | Missing | Medium |

---

## 5. V1 vs V2 Feature Comparison

### Feature Matrix

| Feature | V1 (Firebase) | V2 (MongoDB) | Status |
|---------|---------------|--------------|--------|
| **Financial Dashboard** |
| Available Balance | Firebase + Stripe API | Transaction model + Stripe API | Need API |
| Pending Balance | Firebase + Stripe API | Transaction model + Stripe API | Need API |
| Escrow Amount | Calculated from bookings | Calculated from bookings | Need API |
| Total Profit | Aggregated from transfers | Aggregated from transactions | Need API |
| **Transaction List** |
| Sales Tab | BookingTransaction collection | Transaction model (type=booking_payment) | Need API |
| Refunds Tab | BookingTransaction with refund | Transaction model (type=refund) | Need API |
| Withdrawals Tab | Withdrawals collection | Withdrawal model | Need API |
| **Filters** |
| Service Type | Manual filter | Transaction.serviceType | Built-in |
| Date Range | Manual filter | TransactionService.findByHubId | Built-in |
| Status | Manual filter | Transaction.status | Built-in |
| **Actions** |
| Withdraw Balance | StripeService.createPayout | StripeService.createPayout | Ready |
| Add Bank Account | StripeService.createExternalAccount | StripeService.createExternalAccount | Ready |
| CSV Export | Custom logic | Need implementation | Need API |
| **Stripe Integration** |
| Connect Accounts | Custom accounts | Custom accounts | Ready |
| Balance Retrieval | stripe.balance.retrieve | stripe.balance.retrieve | Ready |
| Payouts | stripe.payouts.create | stripe.payouts.create | Ready |

---

## 6. Implementation Feasibility

### 6.1 Stripe API Feasibility

| Requirement | Stripe Support | Notes |
|-------------|----------------|-------|
| Malaysia Marketplace | Full | Custom accounts supported |
| MYR Payments | Full | Card + FPX supported |
| MYR Payouts | Full | Bank transfer only |
| Manual Payout Control | Full | interval: 'manual' |
| Balance Retrieval | Full | Per-account balance API |
| Bank Account Management | Full | External accounts API |
| Escrow/Holding | Partial | Use delayed transfers, NOT true escrow |

### 6.2 What Stripe CANNOT Do

1. **True Escrow**: Stripe does not provide true escrow services. We implement "escrow" by:
   - Holding funds in platform account
   - Delaying transfers to connected accounts
   - Transferring after 3-day guarantee period

2. **Cross-Border Malaysia**: Cannot payout to non-Malaysian banks from Malaysian Stripe account

3. **Instant Payouts**: Not available in Malaysia

### 6.3 Implementation Effort

| Component | Effort | Dependencies |
|-----------|--------|--------------|
| Hub Transaction Service | 2-3 days | Transaction model, Stripe service |
| Hub Transaction Controller | 1-2 days | Service layer |
| Hub Transaction Routes | 1 day | Controller, schemas |
| Hub Transaction Schemas | 0.5 days | - |
| CSV Export | 1 day | Service layer |
| Frontend Integration | 3-5 days | API endpoints |

**Total Backend Effort**: ~5-7 days

---

## 7. Recommended Approach

### 7.1 Architecture Decision

**Use User-Centric Payment Model** (as documented in PAYMENT-ARCHITECTURE.md):
- Stripe accounts belong to **users (experts)**, not hubs
- Users can belong to multiple hubs
- Each expert manages their own finances
- Hub dashboard shows aggregated view

### 7.2 Hub Transaction Dashboard Design

```
Hub Transactions Page
├── Balance Summary Card
│   ├── Available for Withdrawal (from Stripe API)
│   ├── Pending (arriving in 5 days)
│   ├── In Escrow (3-day guarantee period)
│   └── Total Profit (lifetime earnings)
│
├── Tabs
│   ├── Sales (succeeded transactions)
│   ├── Refunds/Cancellations
│   └── Withdrawals
│
├── Filters
│   ├── Service Type (Experience, Expertise, Space)
│   ├── Date Range
│   └── Search
│
└── Actions
    ├── Export CSV
    ├── Withdraw Balance (if available > 0)
    └── Manage Bank Accounts
```

### 7.3 API Design

```
GET  /hub/:hubId/transactions
     Query: type, status, serviceType, startDate, endDate, page, limit

GET  /hub/:hubId/transactions/balance
     Returns: available, pending, escrow, totalProfit

GET  /hub/:hubId/transactions/summary
     Returns: todayEarnings, weekEarnings, monthEarnings, pendingTransfers

GET  /hub/:hubId/transactions/:id
     Returns: Single transaction with full details

GET  /hub/:hubId/transactions/withdrawals
     Query: status, page, limit

POST /hub/:hubId/transactions/withdraw
     Body: amount, bankAccountId, description

GET  /hub/:hubId/transactions/export
     Query: type, startDate, endDate, format (csv)
```

---

## 8. API Endpoints Needed

### 8.1 Balance & Summary

```typescript
// GET /hub/:hubId/transactions/balance
interface BalanceResponse {
  available: number;           // Ready to withdraw
  pending: number;             // Arriving in 5 days
  escrow: number;              // In 3-day guarantee period
  totalProfit: number;         // Lifetime earnings
  currency: string;            // MYR
  lastUpdated: Date;
}

// GET /hub/:hubId/transactions/summary
interface SummaryResponse {
  today: { amount: number; count: number };
  thisWeek: { amount: number; count: number };
  thisMonth: { amount: number; count: number };
  pendingTransfers: number;
  byServiceType: Array<{
    serviceType: string;
    count: number;
    totalAmount: number;
  }>;
}
```

### 8.2 Transaction List

```typescript
// GET /hub/:hubId/transactions
interface TransactionListRequest {
  type?: 'sales' | 'refunds' | 'withdrawals';
  serviceType?: 'experience' | 'expertise' | 'space';
  status?: 'succeeded' | 'pending' | 'failed' | 'refunded';
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

interface TransactionListResponse {
  transactions: TransactionWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface TransactionWithDetails {
  _id: string;
  referenceId: string;           // TXN-2024-XXXXXX
  type: TransactionType;
  status: TransactionStatus;

  // Service info
  serviceType: string;
  serviceTitle: string;
  serviceId: string;

  // Customer info
  customerName: string;
  customerEmail: string;

  // Host info (for hub with multiple hosts)
  hostName: string;
  hostId: string;

  // Amounts
  amount: number;
  platformFee: number;
  stripeFee: number;
  transferAmount: number;
  currency: string;

  // Payment info
  paymentMethod: string;         // card, fpx
  cardBrand?: string;
  cardLast4?: string;

  // Dates
  createdAt: Date;
  transferredAt?: Date;
  refundedAt?: Date;
}
```

### 8.3 Withdrawal

```typescript
// POST /hub/:hubId/transactions/withdraw
interface WithdrawRequest {
  amount: number;
  bankAccountId: string;
  description?: string;
}

interface WithdrawResponse {
  withdrawal: {
    _id: string;
    stripePayoutId: string;
    amount: number;
    currency: string;
    status: string;
    estimatedArrival: Date;
    bankAccount: {
      bankName: string;
      last4: string;
    };
  };
}
```

### 8.4 Export

```typescript
// GET /hub/:hubId/transactions/export
interface ExportRequest {
  type?: 'sales' | 'refunds' | 'withdrawals' | 'all';
  startDate?: Date;
  endDate?: Date;
  format?: 'csv' | 'xlsx';
}

// Returns: File download with headers:
// Content-Type: text/csv
// Content-Disposition: attachment; filename="transactions-2024-01-12.csv"
```

---

## 9. Technical Specifications

### 9.1 Escrow Calculation

```typescript
/**
 * Calculate escrow amount (funds in 3-day guarantee period)
 *
 * Escrow = Bookings where:
 * - stripeStatus = 'succeeded'
 * - transferStatus != 'paid'
 * - bookingEndDate + 3 days > now
 */
async function calculateEscrowAmount(hubId: string): Promise<number> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const escrowBookings = await Booking.find({
    hubId,
    stripeStatus: 'succeeded',
    transferStatus: { $ne: 'paid' },
    bookingEndDate: { $gte: threeDaysAgo },
  });

  return escrowBookings.reduce((sum, b) => sum + b.transferAmount, 0);
}
```

### 9.2 Balance Retrieval

```typescript
/**
 * Get combined balance for hub (aggregates all host balances)
 */
async function getHubBalance(hubId: string): Promise<BalanceResponse> {
  // Get hub's primary user (owner) Stripe account
  const hub = await Hub.findById(hubId);
  const owner = await HubMember.findOne({ hubId, roles: 'owner' });
  const stripeAccount = await StripeAccount.findOne({ userId: owner.userId });

  if (!stripeAccount) {
    throw new Error('Stripe account not configured');
  }

  // Get Stripe balance
  const stripeBalance = await stripe.balance.retrieve({
    stripeAccount: stripeAccount.stripeAccountId,
  });

  // Calculate escrow from pending bookings
  const escrow = await calculateEscrowAmount(hubId);

  // Calculate total profit from completed transfers
  const totalProfit = await Transaction.aggregate([
    {
      $match: {
        hubId: new mongoose.Types.ObjectId(hubId),
        type: 'expert_transfer',
        status: 'succeeded',
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return {
    available: stripeBalance.available[0]?.amount / 100 || 0,
    pending: stripeBalance.pending[0]?.amount / 100 || 0,
    escrow,
    totalProfit: totalProfit[0]?.total || 0,
    currency: 'MYR',
    lastUpdated: new Date(),
  };
}
```

### 9.3 CSV Export Format

```csv
Reference,Date,Service,Customer,Amount,Platform Fee,Stripe Fee,Net Amount,Status,Payment Method
TXN-2024-ABC123,2024-01-12,Pottery Workshop,john@example.com,150.00,22.50,5.25,122.25,Succeeded,Visa ****4242
TXN-2024-DEF456,2024-01-11,Painting Class,jane@example.com,200.00,30.00,7.00,163.00,Succeeded,FPX Maybank
```

---

## 10. Next Steps

1. **Create Hub Transaction Service** (`hubTransaction.service.ts`)
   - Balance retrieval with Stripe API
   - Transaction listing with filters
   - Escrow calculation
   - Export generation

2. **Create Hub Transaction Controller** (`hubTransaction.controller.ts`)
   - Route handlers for all endpoints
   - Input validation
   - Error handling

3. **Create Hub Transaction Routes** (`hubTransaction.routes.ts`)
   - Route definitions with schemas
   - Permission checks

4. **Create Hub Transaction Schemas** (`hubTransaction.schema.ts`)
   - JSON Schema for request/response validation

5. **Update Frontend**
   - Implement lazy loading for transaction API
   - Build transaction list with filters
   - Build balance dashboard
   - Implement withdrawal flow

---

## References

- [Stripe Connect Documentation](https://docs.stripe.com/connect)
- [Stripe Balance API](https://docs.stripe.com/api/balance)
- [Stripe Payouts API](https://docs.stripe.com/api/payouts)
- [Stripe Transfers API](https://docs.stripe.com/api/transfers)
- [PAYMENT-ARCHITECTURE.md](../../architecture/PAYMENT-ARCHITECTURE.md)

---

**Document Version**: 1.0
**Created**: 2024-01-12
**Author**: AI Assistant
**Status**: Ready for Review
