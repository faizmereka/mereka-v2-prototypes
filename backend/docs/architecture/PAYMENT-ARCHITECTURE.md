# Payment System Architecture

## Core Principle: User-Centric Payment Model

**IMPORTANT**: Stripe accounts, bank accounts, and withdrawals are linked to **individual users (experts)**, NOT to hubs.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Platform                            │
│                    (Mereka Backend)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│   User A     │      │   User B     │     │   User C     │
│  (Expert)    │      │  (Expert)    │     │  (Expert)    │
├──────────────┤      ├──────────────┤     ├──────────────┤
│ Stripe Acct  │      │ Stripe Acct  │     │ Stripe Acct  │
│ Bank Account │      │ Bank Account │     │ Bank Account │
│ Balance: $500│      │ Balance: $300│     │ Balance: $150│
└──────────────┘      └──────────────┘     └──────────────┘
        │                     │                     │
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              │ All belong to
                              ▼
                      ┌──────────────┐
                      │   Hub XYZ    │
                      ├──────────────┤
                      │ Collaborators│
                      │ - User A     │
                      │ - User B     │
                      │ - User C     │
                      └──────────────┘
```

---

## Key Concepts

### 1. User-Based Stripe Accounts

Each **expert (user)** has:
- Their own Stripe Connect account
- Their own bank account(s)
- Their own balance
- Their own withdrawal capability
- Their own transaction history

### 2. Hub-Expert Relationship

A **Hub** is a collection of experts who:
- Collaborate on experiences/services
- Share the hub's brand and listings
- Each get paid for their own bookings
- Manage their own finances independently

### 3. Payment Flow

```
Learner Books Experience
         ↓
    Payment to Platform
         ↓
    Platform Holds (Escrow)
         ↓
   After 3 days / Completion
         ↓
Transfer to Expert's Stripe Account
  (Expert who hosted the booking)
         ↓
   Expert's Available Balance
         ↓
  Expert Requests Withdrawal
         ↓
   Expert's Bank Account
```

---

## Data Model Relationships

```
User (Expert)
├── id (userId)
├── name
├── email
├── stripeAccountId ← Unique to this user
├── stripeVerification
└── connectCompleted

StripeAccount
├── id
├── userId ← Foreign key to User
├── stripeAccountId
├── country
├── currency
└── verificationStatus

BankAccount
├── id
├── userId ← Foreign key to User
├── stripeAccountId
├── bankName
├── accountNumber (encrypted)
└── defaultForCurrency

Withdrawal
├── id
├── userId ← Foreign key to User
├── stripeAccountId
├── amount
├── bankAccountId
└── status

BookingTransaction
├── id
├── serviceId
├── hubId ← Hub where service is listed
├── expertId ← User who hosted (gets paid)
├── bookedBy ← User who booked
├── totalCost
├── transferAmount
└── isMoneyTransferred

Hub
├── id
├── name
├── experts[] ← Array of User IDs
│   ├── expertId
│   ├── role (owner, admin, host)
│   └── permissions
└── services[]
```

---

## Multi-Expert Hub Scenarios

### Scenario 1: Single Expert Hub

```
Hub: "Pottery Studio"
Experts: [User A]

Booking Flow:
- Learner books "Pottery Workshop"
- Hosted by User A
- Payment → User A's Stripe account
- User A can withdraw to their bank
```

### Scenario 2: Multiple Expert Hub

```
Hub: "Creative Arts Center"
Experts: [User A, User B, User C]

Service Assignments:
- "Pottery Workshop" → Hosted by User A
- "Painting Class" → Hosted by User B
- "Photography Tour" → Hosted by User C

Booking Flows:
- Pottery booking → User A's Stripe account
- Painting booking → User B's Stripe account
- Photo booking → User C's Stripe account

Each expert:
- Has independent balance
- Withdraws to their own bank
- Manages their own finances
```

### Scenario 3: Collaborative Service

```
Hub: "Adventure Tours"
Experts: [User A, User B]

Service: "Mountain Hiking Experience"
Co-Hosts: User A (60%), User B (40%)

Booking Flow:
- Learner books for $100
- Platform fee: $3.50
- Stripe fee: $3.00
- Net: $93.50

Payment Split:
- User A receives: $93.50 × 60% = $56.10
- User B receives: $93.50 × 40% = $37.40

Two separate transfers:
- Transfer 1: $56.10 → User A's Stripe account
- Transfer 2: $37.40 → User B's Stripe account
```

---

## Database Schema

### Users Collection

```typescript
{
  _id: ObjectId,
  uid: "user_123",
  email: "expert@example.com",
  name: "Jane Doe",
  role: "expert",

  // Stripe fields (user-specific)
  stripeAccountId: "acct_xxxxxxxxxxxxx",
  stripeVerification: true,
  connectCompleted: true,
  stripeCountry: "MY",
  stripeCurrency: "MYR",

  // Hub memberships
  hubs: [
    {
      hubId: "hub_abc",
      role: "owner",
      permissions: ["manage", "host", "withdraw"]
    },
    {
      hubId: "hub_xyz",
      role: "host",
      permissions: ["host"]
    }
  ],

  createdAt: ISODate,
  updatedAt: ISODate
}
```

### StripeAccounts Collection

```typescript
{
  _id: ObjectId,
  userId: "user_123", // Foreign key
  stripeAccountId: "acct_xxxxxxxxxxxxx",

  country: "MY",
  currency: "MYR",

  chargesEnabled: true,
  payoutsEnabled: true,
  detailsSubmitted: true,

  requirements: {
    currentlyDue: [],
    eventuallyDue: [],
    pastDue: []
  },

  createdAt: ISODate,
  updatedAt: ISODate
}
```

### BankAccounts Collection

```typescript
{
  _id: ObjectId,
  userId: "user_123", // Foreign key
  stripeAccountId: "acct_xxxxxxxxxxxxx",
  stripeBankId: "ba_xxxxxxxxxxxxx",

  accountHolderName: "Jane Doe",
  bankName: "Maybank",
  last4: "6789",
  routingNumber: "MBBEMYKL",

  currency: "MYR",
  country: "MY",
  defaultForCurrency: true,

  status: "verified",

  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Withdrawals Collection

```typescript
{
  _id: ObjectId,
  userId: "user_123", // Foreign key
  stripeAccountId: "acct_xxxxxxxxxxxxx",
  stripePayoutId: "po_xxxxxxxxxxxxx",

  amount: 5000.00,
  currency: "MYR",

  bankAccountId: "ba_xxxxxxxxxxxxx",
  sourceType: "card",

  status: "paid",
  description: "Monthly withdrawal",

  stripeResponse: {
    id: "po_xxxxxxxxxxxxx",
    status: "paid",
    arrivalDate: 1234567890
  },

  requestedBy: "user_123",

  createdAt: ISODate,
  arrivalDate: ISODate
}
```

### BookingTransactions Collection

```typescript
{
  _id: ObjectId,

  // Service info
  serviceType: "experience",
  serviceId: "exp_123",
  hubId: "hub_abc", // Hub where service is listed

  // People
  expertId: "user_123", // Expert who hosted (gets paid)
  bookedBy: "user_456", // Learner who booked

  // Amounts
  totalCost: 150.00,
  currency: "MYR",
  stripeFee: 7.50,
  platformFee: 5.25,
  transferAmount: 137.25,

  // Transfer info
  isMoneyTransferred: true,
  transferId: "tr_xxxxxxxxxxxxx",
  transferDate: ISODate,

  // Stripe
  stripeTransactionId: "pi_xxxxxxxxxxxxx",
  stripeResponse: { ... },

  status: "active",

  // Dates
  createdAt: ISODate,
  bookingStartDate: ISODate,
  bookingEndDate: ISODate
}
```

### Hubs Collection

```typescript
{
  _id: ObjectId,
  uid: "hub_abc",
  name: "Creative Arts Center",
  agencyName: "Creative Arts Center",

  // Experts/Collaborators ONLY
  experts: [
    {
      userId: "user_123",
      role: "owner",
      permissions: ["manage", "host"],
      joinedAt: ISODate
    },
    {
      userId: "user_456",
      role: "admin",
      permissions: ["manage", "host"],
      joinedAt: ISODate
    },
    {
      userId: "user_789",
      role: "host",
      permissions: ["host"],
      joinedAt: ISODate
    }
  ],

  // Hub info (NO PAYMENT FIELDS AT ALL)
  location: {
    country: "Malaysia",
    city: "Kuala Lumpur"
  },
  description: "Creative arts education center",
  agencyLogo: "https://...",

  // Settings
  isCompleted: true,

  createdAt: ISODate,
  updatedAt: ISODate
}

// IMPORTANT: NO stripeAccountId, NO stripeVerification, NO connectCompleted
// All payment fields belong to User and StripeAccount collections
```

---

## API Endpoint Structure

All payment-related endpoints are **user-centric**:

### User's Stripe Account
```
POST   /api/v1/users/:userId/stripe/account
GET    /api/v1/users/:userId/stripe/account
GET    /api/v1/users/:userId/stripe/account/status
POST   /api/v1/users/:userId/stripe/account/links
```

### User's Bank Accounts
```
POST   /api/v1/users/:userId/banks
GET    /api/v1/users/:userId/banks
PATCH  /api/v1/users/:userId/banks/:bankId/default
DELETE /api/v1/users/:userId/banks/:bankId
```

### User's Balance
```
GET    /api/v1/users/:userId/balance
GET    /api/v1/users/:userId/balance/stripe
```

### User's Withdrawals
```
POST   /api/v1/users/:userId/withdrawals
GET    /api/v1/users/:userId/withdrawals
GET    /api/v1/users/:userId/withdrawals/:withdrawalId
```

### User's Transactions
```
GET    /api/v1/users/:userId/transactions
GET    /api/v1/users/:userId/transactions/:id
POST   /api/v1/users/:userId/transactions/export
```

### Hub-Related (Read-Only for Payments)
```
GET    /api/v1/hubs/:hubId/experts
GET    /api/v1/hubs/:hubId/transactions
GET    /api/v1/hubs/:hubId/analytics
```

---

## Authorization Logic

### User Access Control

```typescript
// User can access their own payment data
const canAccessPaymentData = (
  requestingUserId: string,
  resourceUserId: string
): boolean => {
  return requestingUserId === resourceUserId;
};

// Example middleware
async function authorizeUserPaymentAccess(req, res, next) {
  const requestingUser = req.user.uid;
  const resourceUser = req.params.userId;

  if (requestingUser !== resourceUser) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You can only access your own payment data'
      }
    });
  }

  next();
}
```

### Hub Context

```typescript
// Get all experts in a hub
async function getHubExperts(hubId: string): Promise<User[]> {
  const hub = await Hub.findOne({ uid: hubId });
  const expertIds = hub.experts.map(e => e.userId);
  return await User.find({ uid: { $in: expertIds } });
}

// Get hub's total earnings (sum of all experts)
async function getHubTotalEarnings(hubId: string): Promise<number> {
  const experts = await getHubExperts(hubId);
  const expertIds = experts.map(e => e.uid);

  const transactions = await BookingTransaction.find({
    expertId: { $in: expertIds },
    isMoneyTransferred: true
  });

  return transactions.reduce((sum, t) => sum + t.transferAmount, 0);
}
```

---

## Payment Splitting for Co-Hosted Services

### Model: Service with Multiple Hosts

```typescript
interface Service {
  id: string;
  hubId: string;
  title: string;

  // Co-hosting configuration
  hosts: Array<{
    userId: string;
    role: 'primary' | 'secondary';
    payoutPercentage: number; // 0-100
  }>;

  // Validation: Sum of payoutPercentage must equal 100
}
```

### Split Payment Logic

```typescript
async function createSplitTransfers(
  booking: BookingTransaction,
  service: Service
): Promise<Transfer[]> {
  const netAmount = booking.transferAmount;
  const transfers: Transfer[] = [];

  for (const host of service.hosts) {
    const amount = (netAmount * host.payoutPercentage) / 100;

    const transfer = await createTransfer({
      userId: host.userId,
      bookingId: booking.id,
      amount: amount,
      currency: booking.currency,
      sourceTransaction: booking.stripeTransactionId
    });

    transfers.push(transfer);
  }

  return transfers;
}
```

---

## Migration from Hub-Based to User-Based

### Current State (Frontend)
- Uses `myAgency.stripeAccountId`
- Uses `hubService.myAgency`
- Hub-centric API calls

### Target State (Backend)
- Use `currentUser.stripeAccountId`
- Use `userService.currentUser`
- User-centric API calls

### Migration Strategy

1. **Backend Implementation**
   - Build user-based APIs
   - Keep backward compatibility with hub context
   - Add user resolution middleware

2. **Data Migration**
   - Move `stripeAccountId` from Hub to User
   - Create User.stripeAccountId if not exists
   - Link existing accounts to hub owners

3. **Frontend Update**
   - Update API calls to user-based endpoints
   - Change context from hub to user
   - Handle multi-hub scenarios

4. **Gradual Rollout**
   - Feature flag for new payment system
   - A/B testing
   - Monitor for issues

---

## Security Considerations

### User Isolation

- Users can ONLY access their own:
  - Stripe account
  - Bank accounts
  - Balance
  - Withdrawals
  - Transaction history

### Hub Admins

- Hub admins can VIEW (read-only):
  - List of hub experts
  - Aggregate hub analytics
  - Hub-level transaction reports

- Hub admins CANNOT:
  - Access expert's Stripe accounts
  - Initiate withdrawals for experts
  - View expert's bank details
  - Modify expert's payment settings

### Platform Admins

- Can view all data for support
- Can resolve disputes
- Cannot initiate withdrawals
- Audit log all admin actions

---

## FAQs

### Q: What if a user belongs to multiple hubs?

**A:** No problem! The user has ONE Stripe account. They receive payments from ALL hubs they work with, into the same account.

Example:
```
User A belongs to:
- Hub X (Photography)
- Hub Y (Videography)

Balance combines earnings from both:
- Photo bookings from Hub X → User A's account
- Video bookings from Hub Y → User A's account
- Single balance, single withdrawal
```

### Q: What if a hub owner wants to pay other experts directly?

**A:** They can't through the platform. Each expert manages their own payments. Hub owners can:
- Offer services with revenue sharing (co-hosting)
- Set payout percentages per service
- Platform handles automated splits

### Q: Can a hub admin see expert earnings?

**A:** Only aggregated data:
- Total hub earnings (sum of all experts)
- Number of bookings per expert
- Service performance

Cannot see:
- Expert's bank details
- Expert's Stripe account
- Expert's withdrawal history
- Expert's available balance

### Q: What happens if an expert leaves a hub?

**A:** Expert keeps:
- Their Stripe account
- Their balance
- Their transaction history
- Their withdrawal capability

Hub loses:
- Expert's future availability
- Access to expert's services
- Expert from analytics

Historical data remains for reporting.

---

## Next Steps

1. Implement user-based models (StripeAccount, BankAccount, Withdrawal)
2. Build user-centric API endpoints
3. Add authorization middleware
4. Implement payment splitting for co-hosted services
5. Create migration scripts
6. Update frontend to use new APIs

---

**Document Version**: 2.0
**Last Updated**: 2025-01-15
**Status**: Architecture Approved - Ready for Implementation
