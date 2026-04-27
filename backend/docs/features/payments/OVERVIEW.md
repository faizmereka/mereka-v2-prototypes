# Payment System Overview

## Summary

User-centric payment management system where each expert manages their own Stripe Connect account, bank accounts, balance, and withdrawals independently.

---

## Core Principle

**Stripe accounts belong to USERS (experts), not HUBS.**

- Each expert has their own Stripe Connect account
- Each expert manages their own bank accounts
- Each expert has their own balance and can withdraw independently
- Hubs are collections of experts who collaborate but manage finances separately

See [Payment Architecture](../../architecture/PAYMENT-ARCHITECTURE.md) for complete details.

---

## System Components

### 1. Stripe Account Onboarding
Expert creates and verifies Stripe Connect account.

📄 **[Stripe Onboarding Guide](./STRIPE-ONBOARDING.md)**

**Key Features**:
- One-time account creation per user
- KYC verification through Stripe hosted pages
- Country-specific flows (Malaysia vs International)
- Account status tracking

### 2. Bank Account Management
Expert adds and manages bank accounts for withdrawals.

📄 **See**: [Withdrawals Guide](./WITHDRAWALS.md#bank-account-management)

**Key Features**:
- Add multiple bank accounts
- Set default bank for currency
- Verify bank accounts
- Remove unused accounts

### 3. Balance Tracking
Real-time view of earnings and available funds.

📄 **[Balance Tracking Guide](./BALANCE-TRACKING.md)**

**Key Features**:
- Total earnings (all-time)
- Available balance (withdrawable now)
- Pending balance (in transit from Stripe)
- Escrow amount (3-day guarantee period)
- Source type breakdown (card vs FPX)

### 4. Transaction History
Complete history of all bookings and payments.

📄 **[Transactions Guide](./TRANSACTIONS.md)**

**Key Features**:
- Sales (active bookings)
- Cancellations (refunded bookings)
- Withdrawal history
- CSV export
- Detailed revenue breakdown

### 5. Withdrawal Processing
Request payouts to bank account.

📄 **[Withdrawals Guide](./WITHDRAWALS.md)**

**Key Features**:
- Withdraw available balance
- Select source type (card or FPX)
- Select destination bank
- Re-authentication required
- Email notifications
- Track arrival date (1-5 business days)

---

## User Journey

### First-Time Expert

```
1. Sign up as expert → Create account
2. Navigate to payments → Click "Connect Stripe"
3. Complete Stripe onboarding → KYC verification
4. Add bank account → Verify account
5. Receive first booking → Payment held in escrow
6. After 3 days → Funds transferred to Stripe account
7. Request withdrawal → Funds sent to bank
8. Receive funds in bank → 1-5 business days
```

### Returning Expert

```
1. Check balance → View available funds
2. Review transactions → See booking history
3. Request withdrawal → Enter amount
4. Re-authenticate → Confirm identity
5. Receive funds → Track status
```

---

## Multi-Expert Hub Scenarios

### Scenario 1: Solo Expert Hub
```
Hub: "Jane's Pottery Studio"
Expert: Jane (owner)

All bookings → Jane's Stripe account
Jane withdraws to her bank
```

### Scenario 2: Multi-Expert Hub
```
Hub: "Creative Arts Center"
Experts: Alice, Bob, Carol

Pottery class (hosted by Alice) → Alice's account
Painting class (hosted by Bob) → Bob's account
Photo tour (hosted by Carol) → Carol's account

Each expert withdraws independently
```

### Scenario 3: Co-Hosted Service
```
Hub: "Adventure Tours"
Service: "Mountain Hiking"
Co-Hosts: David (60%), Emma (40%)

Booking for $100:
- Platform fee: $3.50
- Stripe fee: $3.00
- Net: $93.50

Split payment:
- David receives: $56.10 (60%)
- Emma receives: $37.40 (40%)

Two separate transfers to their accounts
```

---

## Technical Stack

**Backend**:
- Fastify + TypeScript
- MongoDB + Mongoose
- Stripe SDK (Connect API)
- Zod validation

**Frontend**:
- Angular
- Firebase (transitioning to backend APIs)

**Stripe Services**:
- Stripe Connect (marketplace payments)
- Payment Intents (customer payments)
- Transfers (platform → expert)
- Payouts (expert → bank)

---

## Data Flow

```
Learner Books Service
       ↓
Platform Charges Learner (Payment Intent)
       ↓
Funds Held in Platform (Escrow - 3 days)
       ↓
Transfer to Expert's Stripe Account
       ↓
Expert's Available Balance
       ↓
Expert Requests Withdrawal (Payout)
       ↓
Expert's Bank Account
```

---

## Implementation Status

| Component | Status | Priority |
|-----------|--------|----------|
| Architecture | ✅ Designed | High |
| User Models | ⏳ Pending | High |
| Stripe Account APIs | ⏳ Pending | High |
| Bank Account APIs | ⏳ Pending | High |
| Balance APIs | ⏳ Pending | Medium |
| Transaction APIs | ⏳ Pending | Medium |
| Withdrawal APIs | ⏳ Pending | High |
| Frontend Migration | ⏳ Pending | Low |

---

## Quick Links

### Documentation
- [Payment Architecture](../../architecture/PAYMENT-ARCHITECTURE.md)
- [Stripe Onboarding](./STRIPE-ONBOARDING.md)
- [Balance Tracking](./BALANCE-TRACKING.md)
- [Withdrawals](./WITHDRAWALS.md)
- [Transactions](./TRANSACTIONS.md)

### Models
- [User Model](../../models/USER.md)
- [Stripe Account Model](../../models/STRIPE-ACCOUNT.md)
- [Bank Account Model](../../models/BANK-ACCOUNT.md)
- [Withdrawal Model](../../models/WITHDRAWAL.md)
- [Booking Transaction Model](../../models/BOOKING-TRANSACTION.md)

### API Documentation
- [Stripe Account APIs](../../api/payments/stripe-accounts.md)
- [Bank Account APIs](../../api/payments/bank-accounts.md)
- [Balance APIs](../../api/payments/balance.md)
- [Withdrawal APIs](../../api/payments/withdrawals.md)
- [Transaction APIs](../../api/payments/transactions.md)

---

## Next Steps

1. Review [Payment Architecture](../../architecture/PAYMENT-ARCHITECTURE.md)
2. Read feature-specific guides
3. Check model documentation
4. Review API specifications
5. Begin implementation (Week 1: Stripe Account Management)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-15
**Status**: Ready for Implementation
