# Hub Transactions - Implementation Plan (V2)

## Overview

This document outlines the comprehensive implementation plan for the Hub Transactions feature, including Stripe Account management for both **Hub (Company)** and **User (Expert)** accounts.

---

## Architecture Overview

### Stripe Account Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STRIPE ACCOUNT ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PLATFORM ACCOUNT (Atlas - Mereka)                                           │
│  └── Main Stripe account                                                     │
│      ├── Receives ALL payments from learners                                 │
│      ├── Takes platform fees                                                 │
│      └── Transfers to Hub/Expert accounts                                    │
│                                                                              │
│  HUB ACCOUNT (Company - StripeAccount where accountType='hub')               │
│  └── Each Hub has its own Connect account                                    │
│      ├── Receives: Experience/Expertise booking earnings                     │
│      ├── Pays: Expert job payments                                           │
│      └── Owner manages: Bank accounts, withdrawals                           │
│                                                                              │
│  USER ACCOUNT (Expert - StripeAccount where accountType='user')              │
│  └── Each Expert has their own Connect account                               │
│      ├── Receives: Job payments from Hubs                                    │
│      └── Manages: Personal bank accounts, withdrawals                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Money Flow Diagrams

**1. Experience/Expertise Booking (Hub Earns)**
```
Learner pays for Experience
    ↓
Platform (Atlas) receives payment
    ↓
Platform takes fee (e.g., 15%)
    ↓
Transfer to Hub's StripeAccount
    ↓
Hub owner can withdraw to bank
```

**2. Job Payment (Hub Pays Expert)**
```
Hub hires Expert for Job
    ↓
Hub approves milestone/payment
    ↓
Transfer from Hub's StripeAccount to Expert's StripeAccount
    ↓
Expert can withdraw to bank
```

### User Scenarios

| Scenario | Hub Account | User Account |
|----------|-------------|--------------|
| Scale Plan (Single Expert) | Hub gets one | Same user's account for payouts |
| Soar Plan (Multi-User) | Hub gets one | Each expert gets their own |
| User in Multiple Hubs | Each hub has own account | User has ONE account |
| Hub Hires External Expert | Hub pays from its account | Expert receives to their account |

---

## Phase 0: Model Updates

### 0.1 Update StripeAccount Model

**File**: `src/core/models/StripeAccount.ts`

```typescript
export enum StripeAccountType {
  USER = 'user',    // Expert personal account
  HUB = 'hub',      // Hub business account
}

export interface IStripeAccount extends Document {
  // Owner reference - ONE of these should be set
  userId?: string;    // For expert personal account (accountType='user')
  hubId?: string;     // For hub business account (accountType='hub')

  // Account type
  accountType: StripeAccountType;

  // Stripe Connect account ID
  stripeAccountId: string;

  // Account details
  country: string;
  currency: string;
  email: string;
  businessName?: string;  // For hub accounts

  // Verification status
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  connectCompleted: boolean;

  // Requirements
  requirements: IStripeRequirements;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

**Index Changes**:
```typescript
// Remove: unique index on userId (allow null)
// Add: Compound unique indexes
stripeAccountSchema.index({ userId: 1, accountType: 1 }, { unique: true, sparse: true });
stripeAccountSchema.index({ hubId: 1, accountType: 1 }, { unique: true, sparse: true });
stripeAccountSchema.index({ stripeAccountId: 1 }, { unique: true });
```

### 0.2 Update Hub Model

**File**: `src/core/models/Hub.ts`

```typescript
// Add to IHub interface
stripeAccountId?: string;  // Reference to StripeAccount._id (not Stripe's acct_xxx)
```

### 0.3 Update User Model (Already Done)

```typescript
// Already updated
stripeCustomerId?: string;  // For paying (subscriptions, bookings)
stripeAccountId?: string;   // For receiving (as hired expert)
```

---

## Phase 1: UI Design - Hub Transactions Page

### 1.1 Page Structure with Tabs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HUB TRANSACTIONS PAGE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ [Dashboard] [Transactions] [Withdrawals] [Bank Accounts] [KYC Setup]    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  TAB CONTENT AREA (Lazy Loaded)                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Tab: Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD TAB                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐    │
│  │   AVAILABLE   │ │    PENDING    │ │    ESCROW     │ │  TOTAL EARNED │    │
│  │   MYR 5,000   │ │   MYR 2,500   │ │   MYR 1,200   │ │  MYR 45,000   │    │
│  │  [Withdraw]   │ │   ~5 days     │ │   3-day hold  │ │   Lifetime    │    │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  EARNINGS CHART (Last 30 days / 12 months toggle)                       ││
│  │  [Line chart showing earnings over time]                                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐          │
│  │  RECENT TRANSACTIONS         │ │  STRIPE ACCOUNT STATUS       │          │
│  │  • TXN-001 +MYR 150         │ │  ✓ KYC Verified              │          │
│  │  • TXN-002 +MYR 200         │ │  ✓ Payouts Enabled           │          │
│  │  • TXN-003 -MYR 50 (refund) │ │  ✓ Bank Account Added        │          │
│  │  [View All →]                │ │  [Manage Account →]          │          │
│  └──────────────────────────────┘ └──────────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Tab: Transactions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TRANSACTIONS TAB                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ [All] [Sales] [Refunds] [Job Payments]                    [Export CSV]  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ FILTERS                                                                  ││
│  │ [Service Type ▼] [Date Range ▼] [Status ▼] [Search...           ]       ││
│  │  Experience       Last 7 days    All                                     ││
│  │  Expertise        Last 30 days   Succeeded                               ││
│  │  Job              Custom         Pending                                 ││
│  │                                  Failed                                  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Reference     Service          Customer       Amount    Fee    Net      ││
│  │ ───────────────────────────────────────────────────────────────────────││
│  │ TXN-2024-001  Pottery Class    John Doe      MYR 150   MYR 22  MYR 128 ││
│  │               Experience       john@mail.com  ✓ Paid                    ││
│  │ ───────────────────────────────────────────────────────────────────────││
│  │ TXN-2024-002  1:1 Coaching     Jane Smith    MYR 200   MYR 30  MYR 170 ││
│  │               Expertise        jane@mail.com  ✓ Paid                    ││
│  │ ───────────────────────────────────────────────────────────────────────││
│  │ TXN-2024-003  Logo Design      Bob Wilson    MYR 500   MYR 75  MYR 425 ││
│  │               Job (Paid Out)   bob@mail.com   ✓ Transferred             ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [← Previous]  Page 1 of 8  [Next →]                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Tab: Withdrawals

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WITHDRAWALS TAB                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ AVAILABLE TO WITHDRAW                              [+ New Withdrawal]   ││
│  │ MYR 5,000.00                                                            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ WITHDRAWAL HISTORY                                                       ││
│  │ ───────────────────────────────────────────────────────────────────────││
│  │                                                                          ││
│  │ WD-2024-001                                             MYR 3,000.00    ││
│  │ Maybank ****6789                                        ✓ Completed     ││
│  │ Requested: Jan 10, 2024                                 Arrived: Jan 12 ││
│  │ ───────────────────────────────────────────────────────────────────────││
│  │                                                                          ││
│  │ WD-2024-002                                             MYR 2,000.00    ││
│  │ CIMB ****1234                                           ⏳ In Transit   ││
│  │ Requested: Jan 15, 2024                                 ETA: Jan 17     ││
│  │ ───────────────────────────────────────────────────────────────────────││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

NEW WITHDRAWAL MODAL:
┌─────────────────────────────────────────────────────────────────────────────┐
│  CREATE WITHDRAWAL                                                    [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Available Balance: MYR 5,000.00                                             │
│                                                                              │
│  Amount *                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ MYR 5,000.00                                              [Withdraw All]││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Bank Account *                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ● Maybank ****6789 (Default)                                            ││
│  │ ○ CIMB ****1234                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Estimated Arrival: 1-2 business days                                        │
│                                                                              │
│                                        [Cancel]  [Confirm Withdrawal]        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.5 Tab: Bank Accounts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BANK ACCOUNTS TAB                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ YOUR BANK ACCOUNTS                                    [+ Add Account]   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  🏦 Maybank                                                 ★ DEFAULT   ││
│  │     Account: ****6789                                                    ││
│  │     Name: John Doe                                                       ││
│  │     Currency: MYR                                                        ││
│  │                                           [Set Default] [Delete]         ││
│  │ ───────────────────────────────────────────────────────────────────────││
│  │                                                                          ││
│  │  🏦 CIMB Bank                                                            ││
│  │     Account: ****1234                                                    ││
│  │     Name: John Doe                                                       ││
│  │     Currency: MYR                                                        ││
│  │                                           [Set Default] [Delete]         ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

ADD BANK ACCOUNT MODAL:
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADD BANK ACCOUNT                                                     [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Bank Name *                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ [Select Bank ▼]                                                         ││
│  │  Maybank                                                                 ││
│  │  CIMB Bank                                                               ││
│  │  Public Bank                                                             ││
│  │  RHB Bank                                                                ││
│  │  Hong Leong Bank                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Account Holder Name *                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Account Number *                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ☐ Set as default bank account                                               │
│                                                                              │
│                                              [Cancel]  [Add Bank Account]    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.6 Tab: KYC Setup (Stripe Connect Onboarding)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  KYC SETUP TAB                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STRIPE CONNECT STATUS                                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  ACCOUNT STATUS                                                          ││
│  │                                                                          ││
│  │  ┌──────────────────────────────────────────────────────────────────┐   ││
│  │  │ Step 1: Business Information          ✓ Completed                │   ││
│  │  ├──────────────────────────────────────────────────────────────────┤   ││
│  │  │ Step 2: Identity Verification         ✓ Completed                │   ││
│  │  ├──────────────────────────────────────────────────────────────────┤   ││
│  │  │ Step 3: Bank Account                  ✓ Completed                │   ││
│  │  ├──────────────────────────────────────────────────────────────────┤   ││
│  │  │ Step 4: Review & Submit               ✓ Completed                │   ││
│  │  └──────────────────────────────────────────────────────────────────┘   ││
│  │                                                                          ││
│  │  ✅ Your account is fully verified!                                      ││
│  │                                                                          ││
│  │  Capabilities:                                                           ││
│  │  ✓ Accept Payments                                                       ││
│  │  ✓ Receive Payouts                                                       ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [Update Account Information]                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

INCOMPLETE KYC STATE:
┌─────────────────────────────────────────────────────────────────────────────┐
│  KYC SETUP TAB                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ⚠️  COMPLETE YOUR ACCOUNT SETUP                                             │
│                                                                              │
│  To receive payouts, you need to complete your Stripe Connect setup.         │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  ┌──────────────────────────────────────────────────────────────────┐   ││
│  │  │ Step 1: Business Information          ✓ Completed                │   ││
│  │  ├──────────────────────────────────────────────────────────────────┤   ││
│  │  │ Step 2: Identity Verification         ⏳ Pending                 │   ││
│  │  │         Please upload your IC/Passport                           │   ││
│  │  ├──────────────────────────────────────────────────────────────────┤   ││
│  │  │ Step 3: Bank Account                  ○ Not Started              │   ││
│  │  ├──────────────────────────────────────────────────────────────────┤   ││
│  │  │ Step 4: Review & Submit               ○ Not Started              │   ││
│  │  └──────────────────────────────────────────────────────────────────┘   ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [Continue Setup →]                                                          │
│  (Opens Stripe Connect onboarding flow)                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 2: API Endpoints

### 2.1 Hub Stripe Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/hub/:hubId/stripe/setup` | Create hub's Stripe Connect account |
| GET | `/hub/:hubId/stripe/status` | Get account status & requirements |
| POST | `/hub/:hubId/stripe/onboarding-link` | Generate onboarding URL |
| GET | `/hub/:hubId/stripe/dashboard-link` | Get Stripe Express dashboard URL |

### 2.2 Hub Balance & Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/hub/:hubId/transactions/balance` | Get balance (available, pending, escrow) |
| GET | `/hub/:hubId/transactions/summary` | Get earnings summary & chart data |

### 2.3 Hub Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/hub/:hubId/transactions` | List transactions with filters |
| GET | `/hub/:hubId/transactions/:id` | Get transaction details |
| GET | `/hub/:hubId/transactions/export` | Export as CSV |

### 2.4 Hub Withdrawals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/hub/:hubId/withdrawals` | List withdrawal history |
| POST | `/hub/:hubId/withdrawals` | Create new withdrawal |
| GET | `/hub/:hubId/withdrawals/:id` | Get withdrawal details |

### 2.5 Hub Bank Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/hub/:hubId/bank-accounts` | List bank accounts |
| POST | `/hub/:hubId/bank-accounts` | Add bank account |
| DELETE | `/hub/:hubId/bank-accounts/:id` | Remove bank account |
| PUT | `/hub/:hubId/bank-accounts/:id/default` | Set as default |

---

## Phase 3: Backend Implementation

### 3.1 File Structure

```
src/
├── core/
│   ├── models/
│   │   ├── StripeAccount.ts          # UPDATE: Add hubId, accountType
│   │   └── Hub.ts                     # UPDATE: Add stripeAccountId reference
│   │
│   ├── schemas/hub/
│   │   └── transactions/
│   │       ├── hubTransaction.schema.ts
│   │       ├── hubStripeAccount.schema.ts
│   │       ├── hubBankAccount.schema.ts
│   │       ├── hubWithdrawal.schema.ts
│   │       └── index.ts
│   │
│   └── services/hub/
│       └── transactions/
│           ├── hubTransaction.service.ts
│           ├── hubStripeAccount.service.ts
│           ├── hubBankAccount.service.ts
│           ├── hubWithdrawal.service.ts
│           └── index.ts
│
└── modules/hub/
    ├── controllers/
    │   └── transactions/
    │       ├── hubTransaction.controller.ts
    │       ├── hubStripeAccount.controller.ts
    │       ├── hubBankAccount.controller.ts
    │       ├── hubWithdrawal.controller.ts
    │       └── index.ts
    │
    └── routes/
        └── transactions/
            ├── hubTransaction.routes.ts
            └── index.ts
```

### 3.2 Service: HubStripeAccountService

```typescript
export class HubStripeAccountService {
  /**
   * Create Stripe Connect account for Hub
   */
  async createHubStripeAccount(hubId: string, userId: string): Promise<IStripeAccount>;

  /**
   * Get Hub's Stripe account status
   */
  async getAccountStatus(hubId: string): Promise<StripeAccountStatus>;

  /**
   * Generate onboarding link for Stripe Connect
   */
  async createOnboardingLink(hubId: string, returnUrl: string, refreshUrl: string): Promise<string>;

  /**
   * Generate Stripe Express dashboard link
   */
  async createDashboardLink(hubId: string): Promise<string>;

  /**
   * Sync account status from Stripe (webhook handler)
   */
  async syncAccountStatus(stripeAccountId: string): Promise<void>;
}
```

### 3.3 Service: HubTransactionService

```typescript
export class HubTransactionService {
  /**
   * Get hub balance from Stripe
   */
  async getBalance(hubId: string): Promise<HubBalance>;

  /**
   * Get earnings summary for dashboard
   */
  async getSummary(hubId: string, period: 'week' | 'month' | 'year'): Promise<HubSummary>;

  /**
   * List transactions with filters
   */
  async listTransactions(hubId: string, options: ListTransactionsOptions): Promise<PaginatedTransactions>;

  /**
   * Get single transaction details
   */
  async getTransaction(hubId: string, transactionId: string): Promise<TransactionDetails>;

  /**
   * Export transactions as CSV
   */
  async exportTransactions(hubId: string, options: ExportOptions): Promise<Buffer>;

  /**
   * Calculate escrow amount (bookings in guarantee period)
   */
  private async calculateEscrowAmount(hubId: string): Promise<number>;
}
```

### 3.4 Service: HubWithdrawalService

```typescript
export class HubWithdrawalService {
  /**
   * List withdrawal history
   */
  async listWithdrawals(hubId: string, options: ListOptions): Promise<PaginatedWithdrawals>;

  /**
   * Create new withdrawal (Stripe payout)
   */
  async createWithdrawal(hubId: string, userId: string, data: CreateWithdrawalInput): Promise<IWithdrawal>;

  /**
   * Get withdrawal details
   */
  async getWithdrawal(hubId: string, withdrawalId: string): Promise<IWithdrawal>;

  /**
   * Update withdrawal status (webhook handler)
   */
  async updateWithdrawalStatus(payoutId: string, status: string): Promise<void>;
}
```

### 3.5 Service: HubBankAccountService

```typescript
export class HubBankAccountService {
  /**
   * List hub's bank accounts
   */
  async listBankAccounts(hubId: string): Promise<IBankAccount[]>;

  /**
   * Add bank account to hub's Stripe Connect
   */
  async addBankAccount(hubId: string, data: AddBankAccountInput): Promise<IBankAccount>;

  /**
   * Remove bank account
   */
  async removeBankAccount(hubId: string, bankAccountId: string): Promise<void>;

  /**
   * Set bank account as default
   */
  async setDefaultBankAccount(hubId: string, bankAccountId: string): Promise<IBankAccount>;
}
```

---

## Phase 4: Frontend Implementation

### 4.1 Angular Module Structure

```
projects/app/src/app/features/hub-dashboard/
├── pages/
│   └── hub-transactions/
│       ├── hub-transactions.component.ts       # Main page with tabs
│       ├── hub-transactions.component.html
│       ├── components/
│       │   ├── dashboard-tab/                   # Balance cards, chart
│       │   ├── transactions-tab/                # Transaction list with filters
│       │   ├── withdrawals-tab/                 # Withdrawal history & create
│       │   ├── bank-accounts-tab/               # Bank account management
│       │   └── kyc-setup-tab/                   # Stripe Connect onboarding
│       └── services/
│           └── hub-transaction-api.service.ts   # API calls
│
└── hub-dashboard.routes.ts                      # Lazy loaded route
```

### 4.2 Route Configuration (Lazy Loading)

```typescript
// hub-dashboard.routes.ts
{
  path: 'finances',
  loadComponent: () => import('./pages/hub-transactions/hub-transactions.component')
    .then(m => m.HubTransactionsComponent),
  data: { title: 'Finances' }
}
```

### 4.3 API Service

```typescript
@Injectable({ providedIn: 'root' })
export class HubTransactionApiService {
  // Stripe Account
  setupStripeAccount(hubId: string): Observable<StripeAccount>;
  getStripeStatus(hubId: string): Observable<StripeAccountStatus>;
  getOnboardingLink(hubId: string): Observable<{ url: string }>;

  // Balance & Dashboard
  getBalance(hubId: string): Observable<HubBalance>;
  getSummary(hubId: string, period: string): Observable<HubSummary>;

  // Transactions
  getTransactions(hubId: string, params: TransactionParams): Observable<PaginatedTransactions>;
  exportTransactions(hubId: string, params: ExportParams): Observable<Blob>;

  // Withdrawals
  getWithdrawals(hubId: string, params: ListParams): Observable<PaginatedWithdrawals>;
  createWithdrawal(hubId: string, data: CreateWithdrawalInput): Observable<Withdrawal>;

  // Bank Accounts
  getBankAccounts(hubId: string): Observable<BankAccount[]>;
  addBankAccount(hubId: string, data: AddBankAccountInput): Observable<BankAccount>;
  removeBankAccount(hubId: string, bankAccountId: string): Observable<void>;
  setDefaultBankAccount(hubId: string, bankAccountId: string): Observable<BankAccount>;
}
```

---

## Phase 5: Stripe Webhooks

### 5.1 Webhook Events to Handle

| Event | Action |
|-------|--------|
| `account.updated` | Sync StripeAccount status |
| `payout.created` | Update withdrawal status |
| `payout.paid` | Mark withdrawal as completed |
| `payout.failed` | Mark withdrawal as failed |
| `transfer.created` | Record incoming transfer |

---

## Phase 6: Permissions

| Permission | Description | Roles |
|------------|-------------|-------|
| `hub.finances.view` | View dashboard, transactions | owner, admin |
| `hub.finances.withdraw` | Create withdrawals | owner |
| `hub.finances.bank_accounts` | Manage bank accounts | owner |
| `hub.finances.export` | Export transactions | owner, admin |

---

## Implementation Order

### Step 1: Model Updates (Backend)
1. ✅ Update User model (already done)
2. Update StripeAccount model (add hubId, accountType)
3. Update Hub model (add stripeAccountId)

### Step 2: Stripe Account Services (Backend)
4. Create HubStripeAccountService
5. Create hub Stripe account on subscription
6. Implement onboarding link generation

### Step 3: Transaction Services (Backend)
7. Create HubTransactionService
8. Create HubWithdrawalService
9. Create HubBankAccountService

### Step 4: Routes & Controllers (Backend)
10. Create schemas
11. Create controllers
12. Create routes
13. Add to hub routes index

### Step 5: Webhooks (Backend)
14. Add Stripe webhook handlers

### Step 6: Frontend
15. Create hub-transactions page
16. Create tab components
17. Create API service
18. Implement lazy loading

### Step 7: Testing
19. Unit tests for services
20. Integration tests for routes
21. E2E tests for flows

---

## Success Criteria

1. **Hub Stripe Account**: Created automatically on subscription
2. **KYC Flow**: Redirects to Stripe Connect onboarding
3. **Dashboard**: Shows accurate balance (available, pending, escrow)
4. **Transactions**: Filterable, searchable, paginated list
5. **Withdrawals**: Can create payout to linked bank account
6. **Bank Accounts**: Can add/remove/set default
7. **Export**: Generates valid CSV
8. **Permissions**: Properly restricted by role
9. **Performance**: All pages load < 2 seconds
10. **Test Coverage**: > 80%

---

**Document Version**: 2.0
**Created**: 2024-01-12
**Updated**: 2024-01-12
**Status**: Ready for Implementation
