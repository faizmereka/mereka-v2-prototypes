# Hub Transactions Feature

## Overview

The Hub Transactions feature provides a comprehensive financial dashboard for hub owners/admins to:
- View financial balance (available, pending, escrow)
- Track sales, refunds, and withdrawals
- Process withdrawal requests
- Export transaction data

This feature migrates functionality from V1 (Firebase + Cloud Functions) to V2 (MongoDB + Fastify).

---

## Documentation

| Document | Description |
|----------|-------------|
| [STRIPE-API-ANALYSIS.md](./STRIPE-API-ANALYSIS.md) | Stripe Connect API capabilities, Malaysia support, and feasibility analysis |
| [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) | Detailed implementation plan with V1 comparison and API specifications |

---

## Quick Links

### Related Architecture Docs
- [PAYMENT-ARCHITECTURE.md](../../architecture/PAYMENT-ARCHITECTURE.md) - User-centric payment model
- [PAYMENT-MODELS-ARCHITECTURE.md](../../architecture/PAYMENT-MODELS-ARCHITECTURE.md) - Payment data models

### Related Models
- [Transaction Model](../../../src/core/models/Transaction.ts)
- [Booking Model](../../../src/core/models/Booking.ts)
- [Withdrawal Model](../../../src/core/models/Withdrawal.ts)
- [StripeAccount Model](../../../src/core/models/StripeAccount.ts)
- [BankAccount Model](../../../src/core/models/BankAccount.ts)

### Existing Services
- [TransactionService](../../../src/core/services/shared/payments/transaction.service.ts)
- [StripeService](../../../src/core/services/shared/payments/stripe.service.ts)

---

## Feature Summary

### Dashboard Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    HUB TRANSACTIONS PAGE                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │
│  │  Available  │ │   Pending   │ │   Escrow    │ │   Total   │  │
│  │  MYR 5,000  │ │  MYR 2,500  │ │  MYR 1,200  │ │ MYR 45,000│  │
│  │  Withdraw ▼ │ │  ~5 days    │ │  3-day hold │ │  Lifetime │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [Sales] [Refunds/Cancellations] [Withdrawals]    [Export CSV]  │
├─────────────────────────────────────────────────────────────────┤
│  Filters: [Service Type ▼] [Date Range ▼] [Search...]           │
├─────────────────────────────────────────────────────────────────┤
│  Reference      Service          Customer      Amount    Status  │
│  ─────────────────────────────────────────────────────────────  │
│  TXN-2024-ABC   Pottery Class    John Doe      MYR 150   ✓ Paid │
│  TXN-2024-DEF   Painting        Jane Smith     MYR 200   ✓ Paid │
│  TXN-2024-GHI   Photography     Bob Wilson     MYR 300   ⏳ Pending│
│                                                                   │
│  [← Previous]  Page 1 of 8  [Next →]                             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Balance Dashboard** | Real-time balance from Stripe API |
| **Sales Tracking** | All successful booking payments |
| **Refund Tracking** | Refunds and cancellations |
| **Withdrawal History** | Past withdrawal requests |
| **Create Withdrawal** | Request payout to bank account |
| **CSV Export** | Download transaction reports |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/hub/:hubId/transactions/balance` | Get financial balance |
| GET | `/hub/:hubId/transactions/summary` | Get summary stats |
| GET | `/hub/:hubId/transactions` | List transactions |
| GET | `/hub/:hubId/transactions/:id` | Get transaction details |
| GET | `/hub/:hubId/transactions/withdrawals` | List withdrawals |
| POST | `/hub/:hubId/transactions/withdraw` | Create withdrawal |
| GET | `/hub/:hubId/transactions/export` | Export as CSV |

---

## Key Decisions

### 1. Stripe Connect v1 vs v2

**Decision**: Use Stripe Connect v1 (Custom Accounts)

**Reason**:
- v2 doesn't support OAuth or cross-border payouts
- v1 is mature and well-documented
- Our existing implementation uses v1

### 2. User-Centric vs Hub-Centric Payments

**Decision**: User-centric payment model

**Reason**:
- Stripe accounts belong to users (experts), not hubs
- Users can belong to multiple hubs
- Each expert manages their own finances independently
- Hub dashboard shows aggregated view

### 3. Escrow Implementation

**Decision**: Use delayed transfers (not true escrow)

**Reason**:
- Stripe doesn't provide true escrow
- We implement "escrow" by holding funds in platform account
- Transfer to expert after 3-day guarantee period

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Models | ✅ Complete | Transaction, Booking, Withdrawal |
| Stripe Service | ✅ Complete | Balance, Payouts, Transfers |
| Transaction Service | ✅ Complete | CRUD, Analytics |
| **Hub Transaction Service** | ❌ Not Started | Priority |
| **Hub Transaction Routes** | ❌ Not Started | Priority |
| **Hub Transaction Schemas** | ❌ Not Started | Priority |
| Frontend Component | ❌ Not Started | After backend |

---

## Next Steps

1. Review and approve documentation
2. Implement `HubTransactionService`
3. Implement routes and controllers
4. Write tests
5. Frontend integration

---

**Status**: Planning Complete - Ready for Implementation
**Last Updated**: 2024-01-12
