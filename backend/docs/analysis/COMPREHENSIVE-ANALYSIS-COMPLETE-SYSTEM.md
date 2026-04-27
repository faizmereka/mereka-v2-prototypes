# Comprehensive Analysis: Complete Job Proposal/Contract/Milestone System

## Document Purpose

This document provides a **complete, authoritative analysis** of the Mereka job proposal, contract, and milestone system based on:
- ✅ Backend models and schemas (fully implemented)
- ✅ Timelog features for hourly contracts (analyzed)
- ✅ Payment flows and Stripe integration (documented)
- ⚠️ Frontend requirements (limited access, but documented from API specs)

**Last Updated**: 2025-11-19
**Analyst**: Claude (automated)
**Repository**: mereka-backend-v2-elevate-ref

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Models](#data-models)
3. [API Specifications](#api-specifications)
4. [Payment & Stripe Integration](#payment--stripe-integration)
5. [Business Workflows](#business-workflows)
6. [Missing Implementations](#missing-implementations)
7. [Implementation Roadmap](#implementation-roadmap)

---

## System Overview

### Core Features

The system supports **two types of job contracts**:

1. **Fixed Price Contracts** (Milestone-based)
   - Expert proposes a total fixed price
   - Work divided into milestones
   - Payment per milestone completion
   - Example: Website design for $5,000 in 3 milestones

2. **Hourly Contracts** (Time-based)
   - Expert proposes hourly rate
   - Weekly hour limit (max 168 hours/week)
   - Payment based on hours worked × hourly rate
   - Can update terms (rate, weekly limit) during contract
   - Example: UI consultation at $50/hour, 40 hours/week

### System Architecture

```
┌─────────────┐
│   Expert    │ Creates Proposal (fixed or hourly)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Proposal   │ Status: pending → accepted/rejected/withdrawn
└──────┬──────┘
       │ (accepted)
       ↓
┌─────────────┐
│  Contract   │ Status: pending → active → completed/cancelled
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Milestones  │ Status: active → work_submitted → approved → completed
└─────────────┘
       ↓
┌─────────────┐
│   Stripe    │ Payment processing & expert payouts
└─────────────┘
```

---

## Data Models

### 1. JobProposal Model

**File**: `src/models/JobProposal.ts`
**Collection**: `jobproposals`

**Purpose**: Stores expert's proposal for a job posting

**Key Fields**:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `jobId` | ObjectId | Job posting reference | Required, indexed |
| `proposalDetails` | String | Cover letter | 10-2000 chars |
| `priceType` | Enum | 'fixed' or 'hourly' | Required |
| `proposedPrice` | Number | For fixed contracts | Required if priceType = 'fixed' |
| `hourlyProposedPrice` | Number | Hourly rate | Required if priceType = 'hourly' |
| `workingHours` | Number | Estimated hours | Required if priceType = 'hourly' |
| `selectedCurrency` | String | Currency code | 3 chars, default 'MYR' |
| `files` | String[] | Attachment URLs | Optional |
| `createdBy` | ObjectId | Job poster (client) | Required |
| `asssignedExpertId` | ObjectId | Expert submitting | Required |
| `expertId` | ObjectId | Same as asssignedExpertId | Auto-filled |
| `status` | Enum | pending/accepted/rejected/withdrawn | Default: 'pending' |
| `contractId` | ObjectId | Created contract reference | Set when accepted |
| `isReviewFromClient` | Boolean | Client reviewed? | Default: false |
| `isReviewFromExpert` | Boolean | Expert reviewed? | Default: false |

**Status Flow**:
```
PENDING → ACCEPTED (creates contract)
PENDING → REJECTED (by client)
PENDING → WITHDRAWN (by expert)
```

**Indexes**:
- `{ jobId: 1, status: 1 }` - Query proposals by job
- `{ asssignedExpertId: 1, status: 1 }` - Query expert's proposals
- `{ createdBy: 1, status: 1 }` - Query client's received proposals
- `{ jobId: 1, asssignedExpertId: 1 }` (UNIQUE) - Prevent duplicate proposals

**Instance Methods**:
- `getTotalPrice()` → Returns `hourlyProposedPrice * workingHours` for hourly, `proposedPrice` for fixed
- `canBeWithdrawn()` → Returns `status === 'pending'`
- `canBeAccepted()` → Returns `status === 'pending'`

**Static Methods**:
- `findByJobId(jobId, status?)` → Find all proposals for a job
- `findByExpertId(expertId, status?)` → Find expert's proposals
- `findByClientId(clientId, status?)` → Find client's received proposals
- `hasExistingProposal(jobId, expertId)` → Check if expert already submitted proposal

**Validation Rules** (`proposal.schema.ts`):
- Fixed price: `proposedPrice` required and > 0
- Hourly: `hourlyProposedPrice` and `workingHours` required and > 0
- If milestones provided: sum of milestone amounts ≤ proposedPrice
- Unique constraint: One proposal per expert per job

---

### 2. Contract Model

**File**: `src/models/Contract.ts`
**Collection**: `contracts`

**Purpose**: Created when a proposal is accepted; manages work execution

**Key Fields**:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `jobId` | ObjectId | Job posting reference | Required |
| `jobProposalId` | ObjectId | Accepted proposal | Required, unique |
| `hubId` | ObjectId | Agency/hub reference | Required |
| `contractTitle` | String | Contract title | 1-70 chars |
| `contractDescription` | String | Full description | 20-5000 chars |
| `contractUploads` | String[] | Contract documents | Optional |
| `priceType` | Enum | 'fixed' or 'hourly' | Required |
| `proposedPrice` | Number | For fixed price | Required if priceType = 'fixed' |
| `hourlyProposedPrice` | Number | Hourly rate | Required if priceType = 'hourly' |
| `weeklyLimit` | Number | Max hours/week | 1-168 (hourly only) |
| `hasMilestones` | Boolean | Using milestones? | Default: false |
| `selectedCurrency` | String | Currency code | 3 chars |
| `startDate` | Date | Contract start | Required |
| `endDate` | Date | Contract end | Optional |
| `status` | Enum | pending/active/completed/cancelled/paused | Default: 'pending' |
| `asssignedExpertId` | ObjectId | Expert assigned | Required |
| `createdBy` | ObjectId | Client who created | Required |
| `expertId` | ObjectId | Same as asssignedExpertId | Auto-filled |
| `stripeCustomerId` | String | Stripe customer ID | Optional |
| `stripeAccount` | String | Expert's Stripe account | Optional |
| `paymentMethodId` | String | Payment method | Optional |
| `pendingTermsUpdate` | Object | Terms update request | Hourly only |

**Subdocument: PendingTermsUpdate** (for hourly contracts):

```typescript
{
  weeklyLimit: number;         // New weekly limit (1-168)
  hourlyRate: number;          // New hourly rate
  requestedDate: Date;         // When requested
  effectiveDate: Date;         // When to apply
  requestedBy: ObjectId;       // User who requested
  status: 'pending' | 'applied' | 'cancelled';
  appliedDate?: Date;          // When applied (if status = 'applied')
}
```

**Status Flow**:
```
PENDING → ACTIVE (work starts)
ACTIVE → COMPLETED (all work done)
ACTIVE → PAUSED (temporary hold) → ACTIVE (resumed)
ANY → CANCELLED (terminated)
```

**Indexes**:
- `{ hubId: 1, status: 1 }` - Hub's contracts
- `{ asssignedExpertId: 1, status: 1 }` - Expert's contracts
- `{ createdBy: 1, status: 1 }` - Client's contracts
- `{ jobId: 1, status: 1 }` - Contracts for a job
- `{ jobProposalId: 1 }` (UNIQUE) - One contract per proposal
- `{ stripeCustomerId: 1 }` - Stripe integration
- `{ priceType: 1 }` - Filter by contract type

**Instance Methods**:
- `isActive()` → Returns `status === 'active'`
- `canBeCancelled()` → Returns `status in ['pending', 'active', 'paused']`
- `canBePaused()` → Returns `status === 'active'`
- `canBeResumed()` → Returns `status === 'paused'`

**Static Methods**:
- `findByHubId(hubId, status?, limit?)` → Hub's contracts
- `findByExpertId(expertId, status?)` → Expert's contracts
- `findByClientId(clientId, status?)` → Client's contracts
- `findByJobId(jobId, status?)` → Contracts for a job

**Validation Rules** (`contract.schema.ts`):
- Fixed price: `proposedPrice` required
- Hourly: `hourlyProposedPrice` and `weeklyLimit` required
- `weeklyLimit`: 1-168 hours (max = 7 days × 24 hours)
- `startDate` required
- At least one filter required when querying (hubId OR expertId OR clientId OR jobId)

---

### 3. Milestone Model

**File**: `src/models/Milestone.ts`
**Collection**: `milestones`

**Purpose**: Represents a work milestone with payment tied to completion

**Key Fields**:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `jobId` | ObjectId | Job reference | Required |
| `jobProposalId` | ObjectId | Proposal reference | Required |
| `contractId` | ObjectId | Contract reference | Optional (set when linked) |
| `hubId` | ObjectId | Hub reference | Required |
| `taskName` | String | Milestone name | 1-150 chars |
| `taskDescription` | String | Description | Max 200 chars |
| `amount` | Number | Payment amount | ≥ 0 |
| `dueDate` | Date | Completion deadline | Required |
| `currency` | String | Currency code | 3 chars, default 'MYR' |
| `status` | Enum | active/work_submitted/approved/completed/cancelled | Default: 'active' |
| `workLogDescription` | String | Expert's work summary | Optional |
| `workLogFilesUrl` | String[] | Deliverable files | Default: [] |
| `workSubmittedDate` | Date | When work submitted | Auto-set |
| `paymentIntentId` | String | Stripe payment intent | Set on payment |
| `oldValues` | Object | Previous values | Change tracking |
| `changeHistory` | Array | Audit trail | Change tracking |
| `lastModifiedBy` | ObjectId | Last editor | Auto-set |
| `lastModifiedDate` | Date | Last modification | Auto-set |
| `createdBy` | ObjectId | Creator | Required |

**Subdocument: MilestoneOldValues**:
```typescript
{
  amount?: number;
  taskName?: string;
  taskDescription?: string;
  dueDate?: Date;
  workLogDescription?: string;
}
```

**Subdocument: MilestoneChange**:
```typescript
{
  fieldName: string;           // Which field changed
  oldValue: unknown;           // Previous value
  newValue: unknown;           // New value
  changedBy: ObjectId;         // User who made change
  changedDate: Date;           // When changed
  changeReason?: string;       // Optional explanation
}
```

**Status Flow**:
```
ACTIVE (waiting for work)
  ↓ (expert submits)
WORK_SUBMITTED (waiting for approval)
  ↓ (client approves)
APPROVED (payment processing)
  ↓ (payment confirmed)
COMPLETED

(Can go to CANCELLED from any state)
```

**Indexes**:
- `{ jobProposalId: 1, status: 1 }` - Milestones by proposal
- `{ contractId: 1, status: 1 }` - Milestones by contract
- `{ dueDate: 1, status: 1 }` - Upcoming/overdue queries
- `{ paymentIntentId: 1 }` - Stripe integration

**Instance Methods**:
- `canBeEdited()` → Returns `status in ['active', 'work_submitted']`
- `canBeDeleted()` → Returns `status === 'active' && !workSubmittedDate`
- `canSubmitWork()` → Returns `status === 'active'`
- `canBeApproved()` → Returns `status === 'work_submitted'`
- `isOverdue()` → Returns `status === 'active' && now > dueDate`

**Static Methods**:
- `findByProposalId(proposalId, status?)` → Milestones for proposal
- `findByContractId(contractId, status?)` → Milestones for contract
- `findByJobId(jobId, status?)` → Milestones for job
- `findUpcoming(proposalId, daysAhead = 7)` → Due in next N days
- `findOverdue(proposalId)` → Past due milestones
- `calculateTotalAmount(proposalId)` → Sum of all non-cancelled milestone amounts

**Validation Rules** (`milestone.schema.ts`):
- `taskName` required (1-150 chars)
- `amount` required (≥ 0)
- `dueDate` required
- Submit work: `workLogDescription` required (≥ 10 chars)
- At least one filter required when querying (proposalId OR contractId OR jobId)

**Change Tracking**:
- Tracked fields: `taskName`, `taskDescription`, `amount`, `dueDate`, `workLogDescription`
- On update: Old value saved to `oldValues`, change logged to `changeHistory[]`
- Includes: field name, old/new values, user, timestamp, optional reason

---

### 4. StripeAccount Model

**File**: `src/models/StripeAccount.ts`
**Collection**: `stripeaccounts`

**Purpose**: Manages expert's Stripe Connect account for payments

**Key Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `userId` | String | User reference (UNIQUE) |
| `stripeAccountId` | String | Stripe account ID (UNIQUE) |
| `country` | String | ISO country code (MY, US) |
| `currency` | String | Default currency |
| `email` | String | Account email |
| `chargesEnabled` | Boolean | Can accept payments? |
| `payoutsEnabled` | Boolean | Can receive payouts? |
| `detailsSubmitted` | Boolean | KYC completed? |
| `connectCompleted` | Boolean | Onboarding done? |
| `requirements.currentlyDue` | String[] | Missing fields |
| `requirements.eventuallyDue` | String[] | Future requirements |
| `requirements.pastDue` | String[] | Overdue fields |
| `requirements.disabledReason` | String | Why disabled |

**Instance Methods**:
- `canAcceptPayments()` → `chargesEnabled && payoutsEnabled && detailsSubmitted`
- `needsVerification()` → Has currentlyDue or pastDue requirements

---

## API Specifications

### Base Path

All endpoints use prefix: `/api/v1`

---

### Proposal Endpoints

#### 1. Create Proposal

**POST** `/proposals`

**Request Body**:
```json
{
  "jobId": "507f1f77bcf86cd799439011",
  "proposalDetails": "I have 5+ years of experience in UI/UX design...",
  "priceType": "fixed",
  "proposedPrice": 5000,
  "selectedCurrency": "MYR",
  "files": ["https://storage/portfolio.pdf"],
  "milestones": [
    {
      "taskName": "Design Phase",
      "taskDescription": "Wireframes and mockups",
      "amount": 2000,
      "dueDate": "2025-12-15"
    },
    {
      "taskName": "Development",
      "amount": 3000,
      "dueDate": "2026-01-30"
    }
  ]
}
```

**For Hourly**:
```json
{
  "jobId": "507f1f77bcf86cd799439011",
  "proposalDetails": "I can provide UI consultation...",
  "priceType": "hourly",
  "hourlyProposedPrice": 50,
  "workingHours": 160,
  "selectedCurrency": "MYR"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "jobId": "507f1f77bcf86cd799439011",
    "priceType": "fixed",
    "proposedPrice": 5000,
    "status": "pending",
    "asssignedExpertId": "507f1f77bcf86cd799439012",
    "createdDate": "2025-11-19T10:30:00Z"
  }
}
```

#### 2. Get Proposals

**GET** `/proposals?jobId={jobId}`
**GET** `/proposals?asssignedExpertId={expertId}`
**GET** `/proposals?createdBy={clientId}`

**Query Parameters**:
- `jobId` - Filter by job (optional)
- `asssignedExpertId` - Filter by expert (optional)
- `createdBy` - Filter by client (optional)
- `status` - Filter by status: pending/accepted/rejected/withdrawn (optional)
- `page` - Page number (optional, default: 1)
- `limit` - Items per page (optional, default: 20, max: 100)

**Note**: At least ONE of `jobId`, `asssignedExpertId`, or `createdBy` is required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "jobId": "...",
        "proposalDetails": "...",
        "priceType": "fixed",
        "proposedPrice": 5000,
        "status": "pending",
        "createdDate": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### 3. Get Proposal by ID

**GET** `/proposals/:proposalId`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "jobId": "507f1f77bcf86cd799439011",
    "proposalDetails": "Full proposal text...",
    "priceType": "fixed",
    "proposedPrice": 5000,
    "selectedCurrency": "MYR",
    "status": "pending",
    "asssignedExpertId": "507f1f77bcf86cd799439012",
    "createdBy": "507f1f77bcf86cd799439010",
    "files": ["https://..."],
    "createdDate": "2025-11-19T10:30:00Z",
    "updatedDate": "2025-11-19T10:30:00Z"
  }
}
```

#### 4. Update Proposal

**PATCH** `/proposals/:proposalId`

**Request Body**:
```json
{
  "status": "accepted",
  "contractId": "507f1f77bcf86cd799439014"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "status": "accepted",
    "contractId": "507f1f77bcf86cd799439014",
    "updatedDate": "2025-11-19T11:00:00Z"
  }
}
```

#### 5. Withdraw Proposal

**DELETE** `/proposals/:proposalId`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "status": "withdrawn",
    "updatedDate": "2025-11-19T11:15:00Z"
  }
}
```

**Error Responses**:
- `400` - Proposal not in PENDING status
- `404` - Proposal not found
- `403` - Not authorized to withdraw (not the expert)

---

### Contract Endpoints

#### 1. Create Contract (Accept Proposal)

**POST** `/contracts`

**Request Body** (Fixed Price):
```json
{
  "jobId": "507f1f77bcf86cd799439011",
  "jobProposalId": "507f1f77bcf86cd799439013",
  "hubId": "507f1f77bcf86cd799439020",
  "contractTitle": "E-commerce Platform Development",
  "contractDescription": "Build a full-featured e-commerce platform with product catalog, shopping cart, payment integration, and admin dashboard...",
  "contractUploads": ["https://storage/contract.pdf"],
  "priceType": "fixed",
  "proposedPrice": 15000,
  "hasMilestones": true,
  "startDate": "2025-11-20",
  "selectedCurrency": "MYR",
  "asssignedExpertId": "507f1f77bcf86cd799439012",
  "stripeCustomerId": "cus_1234567890",
  "stripeAccount": "acct_1234567890"
}
```

**Request Body** (Hourly):
```json
{
  "jobId": "507f1f77bcf86cd799439011",
  "jobProposalId": "507f1f77bcf86cd799439013",
  "hubId": "507f1f77bcf86cd799439020",
  "contractTitle": "UI/UX Consultation Services",
  "contractDescription": "Provide ongoing UI/UX consultation...",
  "priceType": "hourly",
  "hourlyProposedPrice": 75,
  "weeklyLimit": 40,
  "startDate": "2025-11-20",
  "selectedCurrency": "MYR",
  "asssignedExpertId": "507f1f77bcf86cd799439012"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "jobId": "507f1f77bcf86cd799439011",
    "jobProposalId": "507f1f77bcf86cd799439013",
    "contractTitle": "E-commerce Platform Development",
    "priceType": "fixed",
    "proposedPrice": 15000,
    "status": "pending",
    "startDate": "2025-11-20",
    "createdDate": "2025-11-19T11:00:00Z"
  }
}
```

**Side Effects**:
- Updates proposal: `status` = 'accepted', `contractId` = new contract ID
- Links all milestones to contract: sets `contractId` on all milestones

#### 2. Get Contract by ID

**GET** `/contracts/:contractId`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "jobId": "507f1f77bcf86cd799439011",
    "jobProposalId": "507f1f77bcf86cd799439013",
    "contractTitle": "E-commerce Platform Development",
    "contractDescription": "Full description...",
    "priceType": "fixed",
    "proposedPrice": 15000,
    "status": "active",
    "asssignedExpertId": "507f1f77bcf86cd799439012",
    "createdBy": "507f1f77bcf86cd799439010",
    "startDate": "2025-11-20",
    "createdDate": "2025-11-19T11:00:00Z"
  }
}
```

#### 3. Get Contracts (Query)

**GET** `/contracts?hubId={hubId}`
**GET** `/contracts?asssignedExpertId={expertId}`
**GET** `/contracts?createdBy={clientId}`
**GET** `/contracts?jobId={jobId}`

**Query Parameters**:
- `hubId` - Filter by hub (optional)
- `asssignedExpertId` - Filter by expert (optional)
- `createdBy` - Filter by client (optional)
- `jobId` - Filter by job (optional)
- `status` - Filter by status (optional)
- `priceType` - Filter by type: fixed/hourly (optional)
- `page` - Page number (optional)
- `limit` - Items per page (optional)

**Note**: At least ONE of the first 4 filters is required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

#### 4. Update Contract

**PATCH** `/contracts/:contractId`

**Request Body**:
```json
{
  "status": "active",
  "endDate": "2026-06-30"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "status": "active",
    "endDate": "2026-06-30",
    "updatedDate": "2025-11-19T12:00:00Z"
  }
}
```

#### 5. Cancel Contract

**PATCH** `/contracts/:contractId/cancel`

**Request Body**:
```json
{
  "reason": "Client decided to change project scope"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "status": "cancelled",
    "updatedDate": "2025-11-19T12:30:00Z"
  }
}
```

#### 6. Pause Contract

**PATCH** `/contracts/:contractId/pause`

**Request Body**:
```json
{
  "reason": "Waiting for client feedback"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "status": "paused",
    "updatedDate": "2025-11-19T13:00:00Z"
  }
}
```

#### 7. Resume Contract

**PATCH** `/contracts/:contractId/resume`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "status": "active",
    "updatedDate": "2025-11-19T14:00:00Z"
  }
}
```

#### 8. Request Terms Update (Hourly Only)

**POST** `/contracts/:contractId/request-terms-update`

**Request Body**:
```json
{
  "weeklyLimit": 50,
  "hourlyRate": 85,
  "effectiveDate": "2025-12-01"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "pendingTermsUpdate": {
      "weeklyLimit": 50,
      "hourlyRate": 85,
      "requestedDate": "2025-11-19T14:30:00Z",
      "effectiveDate": "2025-12-01",
      "requestedBy": "507f1f77bcf86cd799439010",
      "status": "pending"
    }
  }
}
```

#### 9. Apply Terms Update

**PATCH** `/contracts/:contractId/apply-terms-update`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "hourlyProposedPrice": 85,
    "weeklyLimit": 50,
    "pendingTermsUpdate": {
      "status": "applied",
      "appliedDate": "2025-12-01T00:00:00Z"
    },
    "updatedDate": "2025-12-01T00:00:00Z"
  }
}
```

---

### Milestone Endpoints

#### 1. Create Milestone

**POST** `/milestones`

**Request Body**:
```json
{
  "jobId": "507f1f77bcf86cd799439011",
  "jobProposalId": "507f1f77bcf86cd799439013",
  "hubId": "507f1f77bcf86cd799439020",
  "taskName": "Design Phase",
  "taskDescription": "Create wireframes and high-fidelity mockups",
  "amount": 2000,
  "dueDate": "2025-12-15",
  "currency": "MYR"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "taskName": "Design Phase",
    "amount": 2000,
    "dueDate": "2025-12-15",
    "status": "active",
    "createdDate": "2025-11-19T15:00:00Z"
  }
}
```

#### 2. Create Multiple Milestones (Bulk)

**POST** `/milestones/bulk`

**Request Body**:
```json
{
  "milestones": [
    {
      "jobId": "507f1f77bcf86cd799439011",
      "jobProposalId": "507f1f77bcf86cd799439013",
      "hubId": "507f1f77bcf86cd799439020",
      "taskName": "Design Phase",
      "amount": 2000,
      "dueDate": "2025-12-15",
      "currency": "MYR"
    },
    {
      "jobId": "507f1f77bcf86cd799439011",
      "jobProposalId": "507f1f77bcf86cd799439013",
      "hubId": "507f1f77bcf86cd799439020",
      "taskName": "Development Phase",
      "amount": 3000,
      "dueDate": "2026-01-30",
      "currency": "MYR"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "taskName": "Design Phase",
      "status": "active"
    },
    {
      "_id": "507f1f77bcf86cd799439016",
      "taskName": "Development Phase",
      "status": "active"
    }
  ]
}
```

#### 3. Get Milestones (Query)

**GET** `/milestones?jobProposalId={proposalId}`
**GET** `/milestones?contractId={contractId}`
**GET** `/milestones?jobId={jobId}`

**Query Parameters**:
- `jobProposalId` - Filter by proposal (optional)
- `contractId` - Filter by contract (optional)
- `jobId` - Filter by job (optional)
- `status` - Filter by status (optional)
- `page` - Page number (optional)
- `limit` - Items per page (optional)

**Note**: At least ONE of the first 3 filters is required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "507f1f77bcf86cd799439015",
        "taskName": "Design Phase",
        "amount": 2000,
        "dueDate": "2025-12-15",
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

#### 4. Get Milestone by ID

**GET** `/milestones/:milestoneId`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "jobId": "507f1f77bcf86cd799439011",
    "jobProposalId": "507f1f77bcf86cd799439013",
    "contractId": "507f1f77bcf86cd799439014",
    "taskName": "Design Phase",
    "taskDescription": "Create wireframes and mockups",
    "amount": 2000,
    "dueDate": "2025-12-15",
    "currency": "MYR",
    "status": "active",
    "createdDate": "2025-11-19T15:00:00Z"
  }
}
```

#### 5. Update Milestone

**PATCH** `/milestones/:milestoneId`

**Request Body**:
```json
{
  "taskName": "Updated Design Phase",
  "amount": 2500,
  "dueDate": "2025-12-20"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "taskName": "Updated Design Phase",
    "amount": 2500,
    "dueDate": "2025-12-20",
    "oldValues": {
      "taskName": "Design Phase",
      "amount": 2000,
      "dueDate": "2025-12-15"
    },
    "changeHistory": [
      {
        "fieldName": "taskName",
        "oldValue": "Design Phase",
        "newValue": "Updated Design Phase",
        "changedBy": "507f1f77bcf86cd799439010",
        "changedDate": "2025-11-19T16:00:00Z"
      }
    ],
    "updatedDate": "2025-11-19T16:00:00Z"
  }
}
```

#### 6. Submit Work

**POST** `/milestones/:milestoneId/submit-work`

**Request Body**:
```json
{
  "workLogDescription": "Completed wireframes and high-fidelity mockups for all pages. Includes mobile and desktop views.",
  "workLogFilesUrl": [
    "https://figma.com/design-link",
    "https://storage/wireframes.pdf"
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "status": "work_submitted",
    "workLogDescription": "Completed wireframes...",
    "workLogFilesUrl": ["https://figma.com/design-link", "..."],
    "workSubmittedDate": "2025-12-14T10:00:00Z",
    "updatedDate": "2025-12-14T10:00:00Z"
  }
}
```

**Validation**:
- Milestone must be in `active` status
- `workLogDescription` required (min 10 chars)

#### 7. Approve Milestone (& Release Payment)

**POST** `/milestones/:milestoneId/approve`

**Request Body**:
```json
{
  "paymentIntentId": "pi_1234567890abcdef"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "status": "approved",
    "paymentIntentId": "pi_1234567890abcdef",
    "updatedDate": "2025-12-15T09:00:00Z"
  }
}
```

**Side Effects**:
- Triggers Stripe payment processing
- Transfers payment to expert's Stripe Connect account
- Updates contract financials (paid amount)

**Validation**:
- Milestone must be in `work_submitted` status
- Client must have valid payment method

#### 8. Delete Milestone

**DELETE** `/milestones/:milestoneId`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Milestone deleted successfully"
  }
}
```

**Validation**:
- Milestone must be in `active` status
- No work submitted yet

#### 9. Get Upcoming Milestones

**GET** `/milestones/upcoming?jobProposalId={proposalId}&daysAhead=7`

**Query Parameters**:
- `jobProposalId` - Required
- `daysAhead` - Optional (default: 7)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "taskName": "Design Phase",
      "dueDate": "2025-12-15",
      "status": "active",
      "daysRemaining": 3
    }
  ]
}
```

#### 10. Get Overdue Milestones

**GET** `/milestones/overdue?jobProposalId={proposalId}`

**Query Parameters**:
- `jobProposalId` - Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "taskName": "Backend API",
      "dueDate": "2025-11-10",
      "status": "active",
      "daysOverdue": 9
    }
  ]
}
```

---

## Payment & Stripe Integration

### Stripe Service

**File**: `src/services/stripe.service.ts`

**Purpose**: Centralized Stripe API integration for all payment operations

---

### A. Stripe Connect (Expert Payments)

#### Create Expert Account

```typescript
createConnectAccount({
  email: "expert@example.com",
  country: "MY"  // ISO country code
})
```

**Returns**: Stripe Custom Account
- Experts need to complete onboarding (KYC)
- Use `createAccountLink()` to generate onboarding URL

#### Account Onboarding

```typescript
createAccountLink({
  accountId: "acct_1234567890",
  refreshUrl: "https://app.mereka.com/stripe/refresh",
  returnUrl: "https://app.mereka.com/stripe/return",
  type: "account_onboarding"  // or "account_update"
})
```

**Returns**: Stripe Account Link (valid for 5 minutes)
- Send expert to `link.url` to complete onboarding
- They'll be redirected to `returnUrl` when done

#### Check Account Status

```typescript
retrieveAccount("acct_1234567890")
```

**Returns**:
```json
{
  "id": "acct_1234567890",
  "chargesEnabled": true,
  "payoutsEnabled": true,
  "detailsSubmitted": true,
  "requirements": {
    "currentlyDue": [],
    "eventuallyDue": [],
    "pastDue": []
  }
}
```

**Expert can accept payments when**:
- `chargesEnabled` = true
- `payoutsEnabled` = true
- `detailsSubmitted` = true
- `requirements.currentlyDue` = []

---

### B. Bank Account Management

#### Add Bank Account

```typescript
createExternalAccount({
  accountId: "acct_1234567890",
  accountHolderName: "John Doe",
  accountNumber: "000123456789",
  routingNumber: "110000000",  // Bank code
  country: "MY",
  currency: "MYR"
})
```

**Returns**: Stripe BankAccount object

#### List Bank Accounts

```typescript
listExternalAccounts("acct_1234567890", {
  limit: 10
})
```

**Returns**: Array of BankAccount objects

#### Set Default Bank Account

```typescript
setDefaultExternalAccount(
  "acct_1234567890",
  "ba_1234567890abcdef",
  "MYR"
)
```

**Returns**: Updated BankAccount with `default_for_currency` = true

#### Delete Bank Account

```typescript
deleteExternalAccount(
  "acct_1234567890",
  "ba_1234567890abcdef"
)
```

**Returns**: Deleted confirmation

---

### C. Payment Processing

#### Get Account Balance

```typescript
getBalance("acct_1234567890")
```

**Returns**:
```json
{
  "available": [
    {
      "amount": 50000,  // in cents (RM 500.00)
      "currency": "myr"
    }
  ],
  "pending": [
    {
      "amount": 20000,  // in cents (RM 200.00)
      "currency": "myr"
    }
  ]
}
```

#### Create Payout (Withdraw to Bank)

```typescript
createPayout({
  accountId: "acct_1234567890",
  amount: 50000,  // in cents (RM 500.00)
  currency: "MYR",
  destination: "ba_1234567890abcdef",  // bank account ID
  sourceType: "bank_transfer",
  metadata: {
    userId: "507f1f77bcf86cd799439012",
    withdrawalReason: "Monthly earnings"
  }
})
```

**Returns**: Stripe Payout object
- Status: `pending` → `in_transit` (2-3 business days) → `paid`
- Failed if insufficient balance or bank account issues

#### List Payouts

```typescript
listPayouts("acct_1234567890", {
  limit: 20,
  status: "paid"  // or "pending", "failed", "canceled", "in_transit"
})
```

**Returns**: Array of Payout objects

#### Get Payout Details

```typescript
retrievePayout("acct_1234567890", "po_1234567890abcdef")
```

**Returns**: Stripe Payout object with status and arrival_date

---

### D. Transfers (Platform to Expert)

#### Create Transfer

```typescript
createTransfer({
  amount: 200000,  // in cents (RM 2,000.00)
  currency: "MYR",
  destination: "acct_1234567890",  // expert's Stripe account
  transferGroup: "milestone_507f1f77bcf86cd799439015",
  metadata: {
    milestoneId: "507f1f77bcf86cd799439015",
    expertId: "507f1f77bcf86cd799439012",
    clientId: "507f1f77bcf86cd799439010"
  }
})
```

**Returns**: Stripe Transfer object
- Instantly transfers from platform balance to expert's Stripe account
- Expert can then request payout to their bank

**Use Case**: When client approves milestone, backend:
1. Charges client via Payment Intent (if not pre-funded)
2. Transfers milestone amount to expert's Stripe Connect account
3. Expert sees balance in their Stripe account
4. Expert can request payout to bank anytime

#### Reverse Transfer (Refund)

```typescript
reverseTransfer("tr_1234567890abcdef", {
  amount: 200000  // optional, defaults to full amount
})
```

**Returns**: Stripe TransferReversal object
- Moves money back from expert's account to platform
- Used for refunds, disputes, cancellations

---

### E. Payment Intent Management

#### Retrieve Payment Intent

```typescript
retrievePaymentIntent("pi_1234567890abcdef")
```

**Returns**:
```json
{
  "id": "pi_1234567890abcdef",
  "amount": 200000,
  "currency": "myr",
  "status": "succeeded",
  "payment_method": "pm_1234567890abcdef",
  "customer": "cus_1234567890"
}
```

#### Refund Payment

```typescript
refundPayment({
  paymentIntentId: "pi_1234567890abcdef",
  amount: 200000,  // optional, defaults to full amount
  reason: "requested_by_customer"  // or "duplicate", "fraudulent"
})
```

**Returns**: Stripe Refund object
- Refunds client's payment
- Should also reverse transfer to expert

---

### F. Webhooks

#### Verify Webhook Signature

```typescript
verifyWebhookSignature(rawBody, stripeSignature)
```

**Returns**: Stripe Event object if signature is valid
**Throws**: Error if signature is invalid (potential attack)

**Important Webhook Events**:
- `payment_intent.succeeded` - Client payment successful
- `payment_intent.payment_failed` - Client payment failed
- `transfer.created` - Transfer to expert created
- `transfer.reversed` - Transfer reversed (refund)
- `payout.paid` - Expert withdrawal successful
- `payout.failed` - Expert withdrawal failed
- `account.updated` - Expert's Stripe account status changed

---

## Payment Workflows

### Fixed Price Milestone Payment

```
┌─────────────────────────────────────────────────┐
│ 1. Client approves milestone                   │
│    POST /milestones/:id/approve                │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 2. Backend creates/retrieves Payment Intent    │
│    - If pre-funded: use existing intent        │
│    - If not: create new payment intent         │
│    - Charge client via Stripe                  │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 3. Backend creates Transfer to expert          │
│    stripe.createTransfer({                     │
│      amount: milestone.amount,                 │
│      destination: expert.stripeAccountId       │
│    })                                           │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 4. Update Milestone                             │
│    - status: "approved"                         │
│    - paymentIntentId: Stripe intent ID          │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 5. Update Contract                              │
│    - paid += milestone.amount                   │
│    - Update mileStoneStatus                     │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 6. Expert receives funds in Stripe account     │
│    - Shows in balance (available)              │
│    - Can request payout to bank                │
└─────────────────────────────────────────────────┘
```

### Expert Withdrawal to Bank

```
┌─────────────────────────────────────────────────┐
│ 1. Expert checks balance                        │
│    GET /users/:userId/balance                   │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 2. Expert requests withdrawal                   │
│    POST /users/:userId/withdrawals              │
│    Body: {                                       │
│      amount: 50000,                             │
│      currency: "MYR",                           │
│      bankId: "ba_1234567890",                   │
│      sourceType: "bank_transfer"                │
│    }                                             │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 3. Backend validates                             │
│    - Sufficient balance?                        │
│    - Bank account exists?                       │
│    - Account verified?                          │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 4. Backend creates Stripe Payout                │
│    stripe.createPayout({                        │
│      accountId: expert.stripeAccountId,         │
│      amount: 50000,                             │
│      destination: bankId                        │
│    })                                            │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 5. Stripe processes payout                      │
│    Status: pending → in_transit → paid         │
│    Duration: 2-3 business days                  │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 6. Funds arrive in expert's bank account       │
│    Webhook: payout.paid                        │
└─────────────────────────────────────────────────┘
```

### Hourly Contract Payment (NOT YET IMPLEMENTED)

**Proposed Flow**:
```
1. Expert logs work hours weekly
2. Weekly settlement (automated):
   - Calculate: hours × hourlyRate
   - Validate: hours ≤ weeklyLimit
   - Create payment for billable hours
3. Transfer to expert's Stripe account
4. Update contract: totalPaidHours, escrowHours
5. Expert can withdraw anytime
```

**Missing Implementation**:
- Timelog model for hour tracking
- Weekly settlement cron job
- Escrow management (pending approval hours)

---

## Business Workflows

### Complete Workflow: Proposal to Payment

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: Expert Creates Proposal                              │
├──────────────────────────────────────────────────────────────┤
│ POST /proposals                                               │
│ {                                                             │
│   jobId: "...",                                               │
│   priceType: "fixed",                                         │
│   proposedPrice: 5000,                                        │
│   milestones: [                                               │
│     { taskName: "Design", amount: 2000, dueDate: "..." },    │
│     { taskName: "Dev", amount: 3000, dueDate: "..." }        │
│   ]                                                            │
│ }                                                             │
│                                                               │
│ Result:                                                       │
│ - JobProposal created with status: "pending"                 │
│ - Expert waits for client response                           │
└──────────────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: Create Milestones (if in proposal)                   │
├──────────────────────────────────────────────────────────────┤
│ POST /milestones/bulk                                         │
│ {                                                             │
│   milestones: [                                               │
│     { jobId, jobProposalId, taskName, amount, dueDate },     │
│     { ... }                                                   │
│   ]                                                            │
│ }                                                             │
│                                                               │
│ Result:                                                       │
│ - Milestones created with status: "active"                   │
│ - Linked to proposal (jobProposalId)                         │
└──────────────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: Client Reviews Proposals                             │
├──────────────────────────────────────────────────────────────┤
│ GET /proposals?jobId=...                                      │
│                                                               │
│ Client sees:                                                  │
│ - All expert proposals for the job                           │
│ - Each proposal: expert, price, milestones, cover letter     │
│ - Can compare and choose best fit                            │
└──────────────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: Client Accepts Proposal → Creates Contract           │
├──────────────────────────────────────────────────────────────┤
│ POST /contracts                                               │
│ {                                                             │
│   jobProposalId: "...",                                       │
│   contractTitle: "...",                                       │
│   contractDescription: "...",                                 │
│   priceType: "fixed",                                         │
│   proposedPrice: 5000,                                        │
│   startDate: "2025-11-20"                                     │
│ }                                                             │
│                                                               │
│ Result:                                                       │
│ - Contract created with status: "pending"                    │
│ - Proposal updated: status = "accepted", contractId set      │
│ - All milestones updated: contractId set                     │
└──────────────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 5: Activate Contract                                    │
├──────────────────────────────────────────────────────────────┤
│ PATCH /contracts/:id                                          │
│ { status: "active" }                                          │
│                                                               │
│ Result:                                                       │
│ - Contract status: "active"                                   │
│ - Expert can start working                                   │
└──────────────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 6: Expert Works on Milestone 1                          │
├──────────────────────────────────────────────────────────────┤
│ Expert completes "Design Phase" milestone                     │
│ - Creates wireframes, mockups, etc.                          │
│ - Prepares deliverable files                                 │
└──────────────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 7: Expert Submits Work                                  │
├──────────────────────────────────────────────────────────────┤
│ POST /milestones/:id/submit-work                              │
│ {                                                             │
│   workLogDescription: "Completed wireframes and mockups...",  │
│   workLogFilesUrl: ["https://figma.com/...", "..."]         │
│ }                                                             │
│                                                               │
│ Result:                                                       │
│ - Milestone status: "work_submitted"                         │
│ - workSubmittedDate set                                      │
│ - Client notified for review                                 │
└──────────────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 8: Client Reviews Work                                  │
├──────────────────────────────────────────────────────────────┤
│ GET /milestones/:id                                           │
│                                                               │
│ Client:                                                       │
│ - Reviews workLogDescription                                 │
│ - Downloads/views workLogFilesUrl                            │
│ - Decides to approve or request changes                      │
└──────────────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 9: Client Approves & Releases Payment                   │
├──────────────────────────────────────────────────────────────┤
│ POST /milestones/:id/approve                                  │
│ { paymentIntentId: "pi_..." }  // optional                   │
│                                                               │
│ Backend:                                                      │
│ 1. Create/retrieve Payment Intent (charge client)            │
│ 2. Create Transfer to expert's Stripe account                │
│    stripe.createTransfer({                                    │
│      amount: 2000 * 100,  // RM 2,000 in cents               │
│      destination: expert.stripeAccountId                     │
│    })                                                          │
│ 3. Update Milestone:                                          │
│    - status: "approved"                                       │
│    - paymentIntentId: set                                    │
│ 4. Update Contract:                                           │
│    - paid += 2000                                             │
│                                                               │
│ Result:                                                       │
│ - RM 2,000 transferred to expert's Stripe account            │
│ - Milestone status: "approved"                                │
│ - Expert can withdraw to bank                                │
└──────────────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 10: Repeat for Remaining Milestones                     │
├──────────────────────────────────────────────────────────────┤
│ - Expert works on Milestone 2 ("Development Phase")          │
│ - Submits work → Client approves → Payment released          │
│ - Continue until all milestones completed                    │
└──────────────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 11: Contract Completion                                 │
├──────────────────────────────────────────────────────────────┤
│ PATCH /contracts/:id                                          │
│ { status: "completed" }                                       │
│                                                               │
│ Result:                                                       │
│ - Contract status: "completed"                                │
│ - All milestones paid                                         │
│ - Total paid: RM 5,000                                        │
└──────────────────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 12: Expert Withdraws Earnings                           │
├──────────────────────────────────────────────────────────────┤
│ 1. GET /users/:userId/balance                                 │
│    Result: { available: 500000 } // RM 5,000 in cents        │
│                                                               │
│ 2. POST /users/:userId/withdrawals                            │
│    {                                                          │
│      amount: 500000,  // RM 5,000                             │
│      currency: "MYR",                                         │
│      bankId: "ba_...",                                        │
│      sourceType: "bank_transfer"                              │
│    }                                                           │
│                                                               │
│ 3. Stripe creates Payout (status: pending)                   │
│ 4. 2-3 business days later: Payout status: paid              │
│ 5. Funds arrive in expert's bank account                     │
└──────────────────────────────────────────────────────────────┘
```

### Hourly Contract Workflow (Proposed)

**Current Status**: Models and schemas exist, but implementation incomplete

**Proposed Flow**:
```
1. Expert creates hourly proposal
   - hourlyProposedPrice: $50/hour
   - workingHours: 160 (estimated total)
   - Proposal shows total: $8,000

2. Client accepts → Creates contract
   - hourlyProposedPrice: $50
   - weeklyLimit: 40 hours
   - startDate: 2025-11-20

3. Expert logs work (WEEKLY)
   - Week 1: 40 hours worked
   - Submit timelog with:
     - Daily breakdown (date, start, end, hours, description)
     - Total: 40 hours

4. Weekly approval
   - Client reviews timelog
   - Approves 40 hours
   - Payment: 40 × $50 = $2,000

5. Payment processing
   - Create Payment Intent for $2,000
   - Transfer to expert's Stripe account
   - Update contract:
     - totalPaidHours: 40
     - escrowHours: 0 (approved)

6. Continue weekly until contract ends or hours cap reached

7. Terms can be updated mid-contract
   - Client requests: weeklyLimit 40 → 50, rate $50 → $60
   - Expert accepts
   - Takes effect on specified date
```

**Missing Implementation**:
- Timelog model
- Timelog submission API
- Weekly settlement logic
- Escrow hours tracking
- Terms update approval flow

---

## Missing Implementations

### 1. Controllers & Routes ❌

**Current Status**: Models and schemas exist, but NO controllers or routes

**Required Files**:

#### Proposal
- `src/controllers/proposal.controller.ts`
  - `createProposal(request, reply)`
  - `getProposals(request, reply)`
  - `getProposalById(request, reply)`
  - `updateProposal(request, reply)`
  - `withdrawProposal(request, reply)`

- `src/routes/proposal.routes.ts`
  - Register all proposal endpoints
  - Apply validation schemas
  - Add Swagger documentation

#### Contract
- `src/controllers/contract.controller.ts`
  - `createContract(request, reply)`
  - `getContracts(request, reply)`
  - `getContractById(request, reply)`
  - `updateContract(request, reply)`
  - `cancelContract(request, reply)`
  - `pauseContract(request, reply)`
  - `resumeContract(request, reply)`
  - `requestTermsUpdate(request, reply)`
  - `applyTermsUpdate(request, reply)`

- `src/routes/contract.routes.ts`
  - Register all contract endpoints
  - Apply validation schemas
  - Add Swagger documentation

#### Milestone
- `src/controllers/milestone.controller.ts`
  - `createMilestone(request, reply)`
  - `createMultipleMilestones(request, reply)`
  - `getMilestones(request, reply)`
  - `getMilestoneById(request, reply)`
  - `updateMilestone(request, reply)`
  - `deleteMilestone(request, reply)`
  - `submitWork(request, reply)`
  - `approveMilestone(request, reply)`
  - `getUpcomingMilestones(request, reply)`
  - `getOverdueMilestones(request, reply)`

- `src/routes/milestone.routes.ts`
  - Register all milestone endpoints
  - Apply validation schemas
  - Add Swagger documentation

---

### 2. Services (Business Logic) ⚠️

**Current Status**: Only Stripe service exists

**Required Files**:

#### Proposal Service
- `src/services/proposal.service.ts`
  - `createProposal(data, userId)` - Create with validation
  - `getProposals(filters)` - Query with pagination
  - `getProposalById(id)` - Single proposal
  - `updateProposal(id, data, userId)` - Update status/fields
  - `withdrawProposal(id, userId)` - Expert withdraws
  - `acceptProposal(id, userId)` - Client accepts (creates contract)
  - `rejectProposal(id, userId)` - Client rejects
  - `checkDuplicateProposal(jobId, expertId)` - Prevent duplicates

#### Contract Service
- `src/services/contract.service.ts`
  - `createContract(data, userId)` - Accept proposal → create contract
  - `getContracts(filters)` - Query with pagination
  - `getContractById(id)` - Single contract
  - `updateContract(id, data, userId)` - Update fields
  - `cancelContract(id, userId, reason?)` - Terminate contract
  - `pauseContract(id, userId, reason?)` - Pause work
  - `resumeContract(id, userId)` - Resume work
  - `requestTermsUpdate(id, data, userId)` - Hourly rate/limit change
  - `applyTermsUpdate(id, userId)` - Apply pending terms
  - `linkMilestonesToContract(contractId, proposalId)` - Set contractId on milestones

#### Milestone Service
- `src/services/milestone.service.ts`
  - `createMilestone(data, userId)` - Create single milestone
  - `createMultipleMilestones(data, userId)` - Bulk create
  - `getMilestones(filters)` - Query with pagination
  - `getMilestoneById(id)` - Single milestone
  - `updateMilestone(id, data, userId)` - Update with change tracking
  - `deleteMilestone(id, userId)` - Delete if allowed
  - `submitWork(id, data, userId)` - Expert submits work
  - `approveMilestone(id, data, userId)` - Client approves & pays
  - `getUpcomingMilestones(proposalId, daysAhead)` - Due soon
  - `getOverdueMilestones(proposalId)` - Past due
  - `calculateTotalAmount(proposalId)` - Sum milestone amounts

#### Milestone Payment Service
- `src/services/milestone-payment.service.ts`
  - `processPayment(milestoneId, clientId)` - Full payment flow
    - Create/retrieve Payment Intent
    - Charge client
    - Transfer to expert's Stripe account
    - Update milestone (status, paymentIntentId)
    - Update contract (paid amount)
  - `refundPayment(milestoneId, reason)` - Refund + reverse transfer
  - `calculatePlatformFee(amount)` - Platform commission

---

### 3. Timelog System for Hourly Contracts ❌

**Current Status**: Contract model supports hourly, but NO timelog tracking

**Required Files**:

#### Timelog Model
- `src/models/Timelog.ts`

```typescript
interface ITimelog extends Document {
  contractId: ObjectId;
  expertId: ObjectId;

  // Time tracking
  weekNumber: number;        // ISO week number
  year: number;              // Year

  // Daily entries
  entries: [{
    date: Date;              // Work date
    startTime: string;       // HH:MM (e.g., "09:00")
    endTime: string;         // HH:MM (e.g., "17:00")
    hoursWorked: number;     // Calculated duration
    description: string;     // What was done
    activities?: string[];   // Task breakdown
  }];

  // Weekly summary
  weeklyTotal: number;       // Sum of all hoursWorked
  weeklyLimit: number;       // Max allowed (from contract)
  isWithinLimit: boolean;    // weeklyTotal <= weeklyLimit

  // Status
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedDate?: Date;
  approvedDate?: Date;
  rejectedDate?: Date;
  rejectionReason?: string;

  // Payment
  paymentCalculation: {
    hours: number;           // Billable hours
    hourlyRate: number;      // Rate at time of work
    amount: number;          // hours × rate
    status: 'pending' | 'escrow' | 'paid';
  };

  paymentIntentId?: string;  // Stripe payment intent

  createdDate: Date;
  updatedDate: Date;
}
```

#### Timelog Schemas
- `src/schemas/timelog.schema.ts`
  - `createTimelogSchema`
  - `updateTimelogSchema`
  - `submitTimelogSchema`
  - `approveTimelogSchema`
  - `getTimelogsSchema`

#### Timelog Service
- `src/services/timelog.service.ts`
  - `createTimelog(contractId, data, expertId)`
  - `getTimelogs(contractId, filters)`
  - `updateTimelog(id, data, expertId)`
  - `submitTimelog(id, expertId)`
  - `approveTimelog(id, clientId)` - Approve + process payment
  - `rejectTimelog(id, clientId, reason)`
  - `calculateWeeklyTotal(entries)`
  - `validateWeeklyLimit(total, limit)`

#### Timelog Controller & Routes
- `src/controllers/timelog.controller.ts`
- `src/routes/timelog.routes.ts`

**Endpoints Needed**:
- `POST /timelogs` - Create weekly timelog
- `GET /timelogs?contractId=...` - Get timelogs for contract
- `GET /timelogs/:id` - Get single timelog
- `PATCH /timelogs/:id` - Update timelog (draft only)
- `POST /timelogs/:id/submit` - Submit for approval
- `POST /timelogs/:id/approve` - Approve & pay
- `POST /timelogs/:id/reject` - Reject with reason

---

### 4. Contract Detail Object ⚠️

**Current Status**: Defined in requirements but NOT in Contract model

**Required Fields** (to add to Contract model):

```typescript
contractDetail: {
  // Milestone tracking
  mileStones: ObjectId[];           // Array of milestone IDs
  lastMileStone?: ObjectId;         // Last completed
  remainingMileStone: number;       // Count of incomplete
  comingMileStone?: ObjectId;       // Next upcoming
  currentMileStone?: ObjectId;      // Currently active
  mileStoneStatus: 'pending' | 'in_progress' | 'completed';

  // Payment tracking
  paid: number;                     // Total amount paid
  escrow: number;                   // Amount in escrow (pending approval)

  // Hourly tracking
  totalPaidHours?: number;          // Hours already paid (hourly only)
  escrowHours?: number;             // Hours pending approval (hourly only)
}
```

**Implementation**:
- Add to `IContract` interface in `src/models/Contract.ts`
- Create subdocument schema
- Update on milestone/timelog approval
- Update on payment processing

---

### 5. Error Handling & Validation ⚠️

**Current Status**: Zod schemas exist, but no centralized error codes

**Required**:

#### Custom Error Classes
- `src/errors/proposal.errors.ts`
  - `ProposalNotFoundError`
  - `ProposalAlreadyExistsError`
  - `ProposalStatusError` (invalid status transition)
  - `ProposalNotWithdrawableError`
  - `ProposalNotAcceptableError`

- `src/errors/contract.errors.ts`
  - `ContractNotFoundError`
  - `ContractStatusError`
  - `ContractNotCancellableError`
  - `ContractNotPausableError`
  - `TermsUpdateNotAllowedError` (fixed price contracts)

- `src/errors/milestone.errors.ts`
  - `MilestoneNotFoundError`
  - `MilestoneNotEditableError`
  - `MilestoneNotDeletableError`
  - `MilestoneNotSubmittableError` (not in active status)
  - `MilestoneNotApprovableError` (not in work_submitted status)
  - `MilestoneOverdueError`

- `src/errors/payment.errors.ts`
  - `PaymentFailedError`
  - `InsufficientBalanceError`
  - `StripeAccountNotReadyError`
  - `TransferFailedError`

#### Error Response Format
```typescript
{
  "success": false,
  "error": {
    "code": "PROPOSAL_NOT_FOUND",
    "message": "Proposal with ID 507f1f77bcf86cd799439013 not found",
    "details": {
      "proposalId": "507f1f77bcf86cd799439013"
    }
  }
}
```

---

### 6. Notifications & Events ❌

**Current Status**: No notification system

**Required**:

#### Event Emitters
- Emit events on key actions
- Example: `eventEmitter.emit('proposal:created', proposal)`

**Events Needed**:
- `proposal:created` - Expert created proposal
- `proposal:accepted` - Client accepted proposal
- `proposal:rejected` - Client rejected proposal
- `proposal:withdrawn` - Expert withdrew proposal
- `contract:created` - Contract created
- `contract:activated` - Contract activated
- `contract:completed` - Contract completed
- `contract:cancelled` - Contract cancelled
- `milestone:work_submitted` - Expert submitted work
- `milestone:approved` - Client approved milestone
- `milestone:payment_released` - Payment transferred to expert
- `timelog:submitted` - Expert submitted weekly timelog
- `timelog:approved` - Client approved timelog
- `payout:requested` - Expert requested withdrawal
- `payout:paid` - Withdrawal successful

#### Notification Handlers
- Send email notifications
- Send in-app notifications
- Send push notifications (if mobile app)

---

### 7. Testing ❌

**Current Status**: No tests for proposal/contract/milestone features

**Required**:

#### Unit Tests
- `tests/unit/services/proposal.service.test.ts`
- `tests/unit/services/contract.service.test.ts`
- `tests/unit/services/milestone.service.test.ts`
- `tests/unit/services/milestone-payment.service.test.ts`

#### Integration Tests
- `tests/integration/routes/proposal.routes.test.ts`
- `tests/integration/routes/contract.routes.test.ts`
- `tests/integration/routes/milestone.routes.test.ts`

**Test Coverage Target**: 80%+

**Key Test Scenarios**:
- Proposal creation (fixed vs hourly)
- Duplicate proposal prevention
- Proposal acceptance → contract creation
- Milestone work submission
- Milestone approval → payment flow
- Contract status transitions
- Terms update for hourly contracts
- Error handling for all invalid states

---

### 8. Documentation ⚠️

**Current Status**: This analysis document exists, but no API docs

**Required**:

#### Swagger/OpenAPI Documentation
- Add Swagger docs to all route definitions
- Example response schemas
- Error response schemas
- Authentication requirements

#### Developer Guides
- `docs/guides/PROPOSAL-WORKFLOW.md` - Step-by-step guide
- `docs/guides/MILESTONE-PAYMENT.md` - Payment processing guide
- `docs/guides/HOURLY-CONTRACTS.md` - Hourly contract guide
- `docs/guides/STRIPE-INTEGRATION.md` - Stripe setup guide

---

## Implementation Roadmap

### Phase 1: Core API (Controllers & Routes) - Priority: HIGH

**Goal**: Get basic CRUD operations working

**Tasks**:
1. Create proposal controller + routes
   - POST /proposals ✅ Schema exists
   - GET /proposals ✅ Schema exists
   - GET /proposals/:id ✅ Schema exists
   - PATCH /proposals/:id ✅ Schema exists
   - DELETE /proposals/:id ✅ Schema exists

2. Create contract controller + routes
   - POST /contracts ✅ Schema exists
   - GET /contracts ✅ Schema exists
   - GET /contracts/:id ✅ Schema exists
   - PATCH /contracts/:id ✅ Schema exists
   - All status change endpoints ✅ Schemas exist

3. Create milestone controller + routes
   - All milestone endpoints ✅ Schemas exist
   - Submit work ✅ Schema exists
   - Approve ✅ Schema exists

4. Register routes in `src/app.ts`

**Estimated Time**: 3-5 days
**Blockers**: None (models & schemas ready)

---

### Phase 2: Business Logic Services - Priority: HIGH

**Goal**: Implement core business rules

**Tasks**:
1. Proposal service
   - Create, read, update, delete
   - Duplicate prevention
   - Status transitions
   - Accept/reject/withdraw

2. Contract service
   - Create from accepted proposal
   - Link milestones to contract
   - Status management
   - Terms update (hourly)

3. Milestone service
   - CRUD operations
   - Change tracking
   - Work submission
   - Approval logic (no payment yet)

**Estimated Time**: 5-7 days
**Blockers**: None

---

### Phase 3: Payment Integration - Priority: HIGH

**Goal**: Enable milestone payments

**Tasks**:
1. Milestone payment service
   - Create Payment Intent
   - Transfer to expert's Stripe account
   - Update milestone status
   - Update contract financials

2. Webhook handling
   - payment_intent.succeeded
   - transfer.created
   - payout.paid

3. Error handling for payment failures

**Estimated Time**: 3-4 days
**Blockers**: Stripe API keys, test accounts

---

### Phase 4: Timelog System (Hourly Contracts) - Priority: MEDIUM

**Goal**: Enable hourly contract time tracking

**Tasks**:
1. Create Timelog model
2. Create Timelog schemas
3. Create Timelog service
4. Create Timelog controller + routes
5. Weekly settlement logic
6. Integrate with contract payment flow

**Estimated Time**: 5-7 days
**Blockers**: None

---

### Phase 5: Notifications & Events - Priority: MEDIUM

**Goal**: Notify users of key actions

**Tasks**:
1. Set up event emitter
2. Emit events on all key actions
3. Create notification handlers
4. Email templates
5. In-app notification service

**Estimated Time**: 3-4 days
**Blockers**: Email service (SendGrid, etc.)

---

### Phase 6: Testing - Priority: HIGH

**Goal**: 80%+ test coverage

**Tasks**:
1. Unit tests for all services
2. Integration tests for all routes
3. E2E tests for complete workflows
4. Payment flow testing (Stripe test mode)

**Estimated Time**: 7-10 days
**Blockers**: None

---

### Phase 7: Documentation & Polish - Priority: MEDIUM

**Goal**: Complete API documentation

**Tasks**:
1. Swagger documentation for all endpoints
2. Developer guides
3. Postman collection
4. Error code reference

**Estimated Time**: 2-3 days
**Blockers**: None

---

## Summary

### What's Complete ✅

1. **Data Models** (100%)
   - JobProposal model with all fields
   - Contract model with hourly support
   - Milestone model with change tracking
   - StripeAccount model

2. **Validation Schemas** (100%)
   - All Zod schemas for proposals
   - All Zod schemas for contracts
   - All Zod schemas for milestones
   - Proper validation rules

3. **Stripe Service** (90%)
   - Connect account management
   - Bank account management
   - Payment processing
   - Transfers & payouts
   - Missing: Webhook handling in controllers

### What's Missing ❌

1. **Controllers & Routes** (0%)
   - No API endpoints implemented
   - Need all controllers
   - Need all route definitions

2. **Services** (10%)
   - Only Stripe service exists
   - Need proposal, contract, milestone services
   - Need payment processing service

3. **Timelog System** (0%)
   - Model doesn't exist
   - No hourly time tracking
   - No weekly settlement

4. **Notifications** (0%)
   - No event system
   - No email notifications
   - No in-app notifications

5. **Testing** (0%)
   - No unit tests
   - No integration tests
   - No E2E tests

6. **Documentation** (50%)
   - This analysis exists
   - No Swagger docs in code
   - No developer guides

### Next Immediate Steps

**For User**:
1. Review this comprehensive analysis
2. Confirm missing features are accurate
3. Approve implementation priority
4. Provide Stripe API keys for development

**For Development**:
1. Start Phase 1: Controllers & Routes
2. Implement proposal endpoints first (most foundational)
3. Then contract endpoints
4. Then milestone endpoints
5. Test basic CRUD before moving to payments

---

**End of Comprehensive Analysis**

This document should serve as the single source of truth for the proposal/contract/milestone system implementation.
