# Payment Models Architecture

## Overview

This document describes the payment and transaction architecture for the Mereka platform. The system handles payments for multiple service types across consumer bookings and job contracts.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        PAYMENT ARCHITECTURE                                   │
└──────────────────────────────────────────────────────────────────────────────┘

                              CUSTOMER PAYS
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         DOMAIN MODELS                                         │
├─────────────────────────┬────────────────────────┬───────────────────────────┤
│       Booking           │    ContractPayment     │       Transaction         │
│   (Consumer-facing)     │    (Jobs domain)       │    (Unified ledger)       │
├─────────────────────────┼────────────────────────┼───────────────────────────┤
│ • Experience bookings   │ • Milestone payments   │ • ALL money movements     │
│ • Expertise sessions    │ • Timelog payments     │ • Platform fees           │
│ • Space rentals         │ • Contract escrow      │ • Expert transfers        │
│                         │                        │ • Withdrawals             │
│                         │                        │ • Refunds                 │
└─────────────────────────┴────────────────────────┴───────────────────────────┘
         │                          │                          ▲
         │                          │                          │
         └──────────────────────────┴──────────────────────────┘
                      Creates entry in Transaction
```

---

## Models

### 1. Booking

**Purpose**: Track consumer-facing bookings for experiences, expertise sessions, and space rentals.

**Collection**: `bookings`

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bookingType` | enum | Yes | `experience`, `expertise`, `space` |
| `serviceId` | ObjectId | Yes | Reference to Experience/Expertise/Space |
| `hubId` | ObjectId | Yes | Reference to Hub |
| `bookedBy` | ObjectId | No | Reference to User (optional for guests) |
| `eventId` | ObjectId | No | For experience events |
| `scheduleId` | string | No | For expertise sessions |
| `bookingStartDate` | Date | Yes | Start of booking |
| `bookingEndDate` | Date | Yes | End of booking |
| `timeZone` | string | Yes | Timezone (default: Asia/Kuala_Lumpur) |
| `learnerDetail` | array | Yes | Participant information |
| `selectedTickets` | array | Yes | Ticket/pricing selection |
| `totalCost` | number | Yes | Total amount charged |
| `currency` | string | Yes | ISO currency code |
| `discountAmount` | number | No | Discount applied |
| `status` | enum | Yes | Booking status |
| `transactionId` | ObjectId | No | Link to Transaction |

**Status Flow**:
```
pending → active → completed
                 ↘ cancelled
                 ↘ withdrawn
                 ↘ rejected
```

---

### 2. ContractPayment

**Purpose**: Track payments for job contracts (milestones and hourly timelogs).

**Collection**: `contractPayments`

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentType` | enum | Yes | `milestone`, `timelog` |
| `contractId` | ObjectId | Yes | Reference to Contract |
| `jobId` | ObjectId | Yes | Reference to Job |
| `hubId` | ObjectId | Yes | Reference to Hub |
| `clientId` | ObjectId | Yes | Who pays (job poster) |
| `expertId` | ObjectId | Yes | Who receives (expert) |
| `milestoneId` | ObjectId | No | For milestone payments |
| `timelogEntryIds` | ObjectId[] | No | For timelog payments |
| `weekNumber` | number | No | Week of timelog |
| `year` | number | No | Year of timelog |
| `hoursWorked` | number | No | Total hours for timelog |
| `amount` | number | Yes | Payment amount |
| `currency` | string | Yes | ISO currency code |
| `hourlyRate` | number | No | Rate for timelogs |
| `status` | enum | Yes | Payment status |
| `transactionId` | ObjectId | No | Link to Transaction |

**Payment Types**:

#### Milestone (Fixed Price)
```
Client funds milestone → Escrow (manual capture)
Expert submits work → Client reviews
Client approves → Funds released to expert
```

#### Timelog (Hourly)
```
Expert logs hours → Client approves
Weekly batch payment → Auto-charge client
Funds transferred to expert
```

**Status Flow**:
```
pending → funded → released
                 ↘ refunded
                 ↘ failed
```

---

### 3. Transaction

**Purpose**: Unified financial ledger for ALL money movements. Used for reporting, auditing, and reconciliation.

**Collection**: `transactions`

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | enum | Yes | Transaction type |
| `sourceModel` | string | Yes | Source model name |
| `sourceId` | ObjectId | Yes | Reference to source record |
| `amount` | number | Yes | Total transaction amount |
| `currency` | string | Yes | ISO currency code |
| `platformFee` | number | Yes | Platform commission |
| `platformFeeRate` | number | Yes | Fee rate (e.g., 0.15) |
| `stripeFee` | number | Yes | Stripe processing fee |
| `transferAmount` | number | Yes | Amount to expert |
| `fromUserId` | ObjectId | No | Payer (customer) |
| `toUserId` | ObjectId | No | Receiver (expert) |
| `hubId` | ObjectId | Yes | Reference to Hub |
| `stripePaymentIntentId` | string | No | Stripe PI ID |
| `stripeTransferId` | string | No | Stripe Transfer ID |
| `stripePayoutId` | string | No | Stripe Payout ID |
| `stripeChargeId` | string | No | Stripe Charge ID |
| `status` | enum | Yes | Transaction status |
| `transferredAt` | Date | No | When transfer completed |
| `errorCode` | string | No | Error code if failed |
| `errorMessage` | string | No | Error message |

**Transaction Types**:

| Type | Description | Source |
|------|-------------|--------|
| `booking_payment` | Customer pays for booking | Booking |
| `milestone_fund` | Client funds milestone escrow | ContractPayment |
| `milestone_release` | Escrow released to expert | ContractPayment |
| `timelog_payment` | Hourly work payment | ContractPayment |
| `refund` | Refund to customer | Booking/ContractPayment |
| `withdrawal` | Expert withdraws to bank | Withdrawal |
| `platform_fee` | Platform commission | Any |

**Status Flow**:
```
pending → processing → succeeded
                     ↘ failed
                     ↘ refunded
                     ↘ cancelled
```

---

## Money Flow

### Experience/Expertise/Space Booking

```
1. Customer books service
   └── Create Booking (status: pending)
   └── Create Transaction (type: booking_payment, status: pending)

2. Customer pays via Stripe
   └── Stripe PaymentIntent created
   └── Transaction updated (stripePaymentIntentId, status: processing)

3. Payment succeeds
   └── Booking updated (status: active)
   └── Transaction updated (status: succeeded)

4. Service delivered
   └── Booking updated (status: completed)
   └── Platform calculates fees
   └── Stripe Transfer to expert's Connect account
   └── Transaction updated (transferredAt, stripeTransferId)

5. Expert withdraws
   └── Create Withdrawal record
   └── Create Transaction (type: withdrawal)
   └── Stripe Payout to bank
```

### Fixed Price Job (Milestone)

```
1. Contract created with milestones
   └── Milestones created (status: pending)

2. Client funds milestone
   └── Create ContractPayment (type: milestone, status: pending)
   └── Create Transaction (type: milestone_fund, status: pending)
   └── Stripe Escrow PaymentIntent (manual capture)
   └── ContractPayment updated (status: funded)
   └── Transaction updated (status: succeeded)

3. Expert submits work
   └── Milestone updated (status: work_submitted)

4. Client approves
   └── Stripe captures payment
   └── Create Transaction (type: milestone_release)
   └── Transfer to expert's Connect account
   └── ContractPayment updated (status: released)
   └── Milestone updated (status: completed)
```

### Hourly Job (Timelog)

```
1. Expert logs time
   └── TimelogEntry created (status: draft)

2. Expert submits timesheet
   └── TimelogEntry updated (status: submitted)

3. Client approves
   └── TimelogEntry updated (status: approved)

4. Weekly payment batch (cron job)
   └── Create ContractPayment (type: timelog)
   └── Create Transaction (type: timelog_payment)
   └── Charge client's saved payment method
   └── Transfer to expert's Connect account
   └── TimelogEntry updated (status: paid)
```

---

## Fee Calculation

```typescript
const calculateFees = (totalCost: number, currency: string) => {
  // Platform fee (configurable per hub or global)
  const platformFeeRate = 0.15; // 15%
  const platformFee = totalCost * platformFeeRate;

  // Stripe fee (depends on payment method and region)
  // Malaysia: 2.9% + RM1 for cards, 1.5% for FPX
  const stripeFeeRate = 0.029;
  const stripeFeeFixed = currency === 'MYR' ? 1.00 : 0.30;
  const stripeFee = (totalCost * stripeFeeRate) + stripeFeeFixed;

  // Expert receives
  const transferAmount = totalCost - platformFee - stripeFee;

  return {
    totalCost,
    platformFee,
    platformFeeRate,
    stripeFee,
    transferAmount,
  };
};
```

---

## Migration Strategy

### Phase 1: Create New Models
1. Create `Booking` model
2. Create `ContractPayment` model
3. Create `Transaction` model
4. Keep `BookingTransaction` for backward compatibility

### Phase 2: Dual-Write
1. Update services to write to both old and new models
2. Verify data consistency
3. Run parallel for 1-2 weeks

### Phase 3: Switch Read Operations
1. Update read operations to use new models
2. Update admin APIs
3. Update frontend

### Phase 4: Deprecate Old Model
1. Stop writing to `BookingTransaction`
2. Archive old data
3. Remove old model code

---

## Related Models

| Model | Purpose | Relationship |
|-------|---------|--------------|
| `Booking` | Consumer bookings | Has one Transaction |
| `ContractPayment` | Job payments | Has one Transaction |
| `Transaction` | Financial ledger | Belongs to Booking/ContractPayment |
| `Contract` | Job contract | Has many ContractPayments |
| `Milestone` | Fixed price task | Has one ContractPayment |
| `TimelogEntry` | Hourly work log | Grouped in ContractPayment |
| `Withdrawal` | Expert payout | Has one Transaction |
| `PendingPayment` | Retry queue | Temporary, creates ContractPayment |

---

## API Endpoints

### Booking APIs
- `POST /bookings` - Create booking
- `GET /bookings/:id` - Get booking details
- `PATCH /bookings/:id/cancel` - Cancel booking
- `GET /bookings` - List bookings (with filters)

### ContractPayment APIs
- `POST /contracts/:id/payments/milestone` - Fund milestone
- `POST /contracts/:id/payments/timelog` - Process timelog payment
- `GET /contracts/:id/payments` - List contract payments

### Transaction APIs (Admin)
- `GET /admin/transactions` - List all transactions
- `GET /admin/transactions/stats` - Transaction statistics
- `GET /admin/transactions/:id` - Transaction details

---

## Indexes

### Booking
```javascript
{ hubId: 1, bookingStartDate: -1 }
{ bookedBy: 1, status: 1 }
{ serviceId: 1, bookingType: 1 }
{ status: 1, createdAt: -1 }
```

### ContractPayment
```javascript
{ contractId: 1, status: 1 }
{ expertId: 1, status: 1 }
{ clientId: 1, status: 1 }
{ paymentType: 1, createdAt: -1 }
```

### Transaction
```javascript
{ sourceModel: 1, sourceId: 1 }
{ hubId: 1, createdAt: -1 }
{ type: 1, status: 1 }
{ stripePaymentIntentId: 1 }
{ fromUserId: 1, createdAt: -1 }
{ toUserId: 1, createdAt: -1 }
```

---

_Last updated: 2025-12-05_
