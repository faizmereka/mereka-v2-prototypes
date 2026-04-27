# Job Proposal System - API Requirements Analysis

## Overview

This document details the backend API requirements for the Job Proposal system based on frontend analysis. The system handles job proposals, milestones, and contract creation for both **fixed-price** and **hourly** engagements.

---

## Frontend Analysis Summary

### Source Files Analyzed

1. **Models**:
   - `/mereka-web/src/app/_models/jobProposal.ts`
   - `/mereka-web/src/app/_models/milestone.model.ts`
   - `/mereka-web/src/app/_models/jobContract.model.ts`

2. **Services**:
   - `/mereka-web/src/app/_services/job-proposal.service.ts`
   - `/mereka-web/src/app/_services/milestone.service.ts`
   - `/mereka-web/src/app/_services/contract.service.ts`
   - `/mereka-web/projects/checkout/src/app/_services/jobproposal.service.ts`

3. **Components**:
   - `/mereka-web/projects/checkout/src/app/features/proposal/` (send proposal flow)
   - `/mereka-web/src/app/pages/job/hub-job-offer/hub-job-send-offer/` (contract creation)

---

## System Flow

```
1. Expert creates Job Proposal
   ├─ Includes: pricing, description, files, optional milestones
   └─ Saved to jobProposals collection

2. Client reviews proposals
   └─ Views all proposals for their job posting

3. Client accepts proposal (sends offer)
   ├─ Creates Contract with terms
   ├─ Updates proposal with offerId
   └─ Associates milestones with contract

4. Contract execution
   ├─ Fixed Price: Milestone-based payments
   └─ Hourly: Time tracking with work logs
```

---

## Required Backend APIs

### 1. Job Proposal APIs

#### 1.1 Create Proposal
- **Endpoint**: `POST /api/v1/proposals`
- **Description**: Expert submits a proposal for a job posting
- **Request Body**:
```typescript
{
  jobId: string;                      // Job posting ID
  proposalDetails: string;            // Cover letter (max 2000 chars)
  priceType: 'fixed' | 'hourly';      // Pricing model

  // For fixed price
  proposedPrice?: number;             // Total project cost

  // For hourly
  hourlyProposedPrice?: number;       // Hourly rate
  workingHours?: number;              // Estimated hours

  selectedCurrency: string;           // e.g., 'MYR', 'USD'
  files?: string[];                   // Uploaded file URLs
  asssignedExpertId: string;          // Expert user ID (from auth)

  // Optional milestones for fixed price
  milestones?: [{
    taskName: string;                 // max 150 chars
    taskDescription?: string;         // max 200 chars
    amount: number;                   // milestone payment amount
    dueDate: Date;                    // completion deadline
  }]
}
```
- **Response**:
```typescript
{
  success: true,
  data: {
    id: string;
    jobId: string;
    proposalDetails: string;
    priceType: string;
    proposedPrice?: number;
    hourlyProposedPrice?: number;
    workingHours?: number;
    selectedCurrency: string;
    files: string[];
    asssignedExpertId: string;
    createdBy: string;
    status: 'pending';
    createdDate: Date;
    milestones?: Milestone[];
  }
}
```
- **Status Codes**: 201 (Created), 400 (Validation Error), 401 (Unauthorized)

---

#### 1.2 Get Proposals by Job ID
- **Endpoint**: `GET /api/v1/proposals?jobId={jobId}`
- **Description**: Get all proposals for a specific job posting
- **Query Params**:
  - `jobId` (required): Job posting ID
  - `status` (optional): Filter by status (pending, accepted, rejected)
- **Response**:
```typescript
{
  success: true,
  data: [{
    id: string;
    jobId: string;
    proposalDetails: string;
    priceType: string;
    proposedPrice?: number;
    hourlyProposedPrice?: number;
    creator: {                        // Populated expert info
      userId: string;
      name: string;
      email: string;
      profileUrl: string;
    };
    status: string;
    offerId?: string;                 // If accepted
    createdDate: Date;
  }]
}
```

---

#### 1.3 Get Proposal by ID
- **Endpoint**: `GET /api/v1/proposals/{proposalId}`
- **Description**: Get detailed proposal information
- **Response**:
```typescript
{
  success: true,
  data: {
    id: string;
    jobId: string;
    jobData: Job;                     // Populated job info
    proposalDetails: string;
    priceType: string;
    proposedPrice?: number;
    hourlyProposedPrice?: number;
    workingHours?: number;
    files: string[];
    creator: User;                    // Populated expert info
    asssignedExpertId: string;
    status: string;
    offerId?: string;
    contract?: Contract;              // If accepted
    contractDetail?: {
      mileStones: Milestone[];
      paid: number;
      escrow: number;
      totalPaidHours: number;
      escrowHours: number;
    };
    createdDate: Date;
  }
}
```

---

#### 1.4 Get Proposals by Expert ID
- **Endpoint**: `GET /api/v1/proposals?createdBy={expertId}`
- **Description**: Get all proposals created by an expert
- **Query Params**:
  - `createdBy` (required): Expert user ID
  - `status` (optional): Filter by status

---

#### 1.5 Get Proposals by Assigned Expert ID
- **Endpoint**: `GET /api/v1/proposals?asssignedExpertId={expertId}`
- **Description**: Get all proposals where expert is assigned (accepted proposals)
- **Query Params**:
  - `asssignedExpertId` (required): Expert user ID

---

#### 1.6 Update Proposal
- **Endpoint**: `PATCH /api/v1/proposals/{proposalId}`
- **Description**: Update proposal (status changes, add offerId when accepted)
- **Request Body**:
```typescript
{
  status?: 'pending' | 'accepted' | 'rejected';
  offerId?: string;                   // Contract ID when accepted
}
```

---

### 2. Milestone APIs

#### 2.1 Create Milestone
- **Endpoint**: `POST /api/v1/milestones`
- **Description**: Create a milestone (usually part of proposal creation)
- **Request Body**:
```typescript
{
  jobId: string;
  jobProposalId: string;
  taskName: string;                   // max 150 chars
  taskDescription?: string;           // max 200 chars
  amount: number;
  dueDate: Date;
  status: 'active';                   // initial status
  createdBy: string;                  // User ID
  hubId: string;
  currency: {
    label: string;
    value: string;
  };
}
```

---

#### 2.2 Create Multiple Milestones
- **Endpoint**: `POST /api/v1/milestones/bulk`
- **Description**: Create multiple milestones at once
- **Request Body**:
```typescript
{
  milestones: Milestone[];
}
```

---

#### 2.3 Get Milestones by Proposal ID
- **Endpoint**: `GET /api/v1/milestones?jobProposalId={proposalId}`
- **Description**: Get all milestones for a proposal
- **Query Params**:
  - `jobProposalId` (required): Proposal ID
- **Response**:
```typescript
{
  success: true,
  data: [{
    id: string;
    jobId: string;
    jobProposalId: string;
    taskName: string;
    taskDescription: string;
    amount: number;
    dueDate: Date;
    status: string;                   // active, completed, cancelled
    currency: { label: string; value: string; };
    workLogDescription?: string;      // When work is submitted
    workLogFilesUrl?: string[];
    workSubmittedDate?: Date;
    paymentIntentId?: string;         // Stripe payment ID
    createdDate: Date;

    // Change tracking
    oldValues?: MilestoneOldValues;
    changeHistory?: MilestoneChange[];
    lastModifiedBy?: string;
    lastModifiedDate?: Date;
  }]
}
```

---

#### 2.4 Get Milestones by Contract ID
- **Endpoint**: `GET /api/v1/milestones?contractId={contractId}`
- **Description**: Get all milestones for a contract (uses offerId field)

---

#### 2.5 Update Milestone
- **Endpoint**: `PATCH /api/v1/milestones/{milestoneId}`
- **Description**: Update milestone (with change tracking)
- **Request Body**:
```typescript
{
  taskName?: string;
  taskDescription?: string;
  amount?: number;
  dueDate?: Date;
  status?: string;
  workLogDescription?: string;        // Expert submits work
  workLogFilesUrl?: string[];
  workSubmittedDate?: Date;
  paymentIntentId?: string;
}
```
- **Note**: Backend should automatically track changes (oldValues, changeHistory)

---

#### 2.6 Delete Milestone
- **Endpoint**: `DELETE /api/v1/milestones/{milestoneId}`
- **Description**: Delete a milestone

---

### 3. Contract APIs

#### 3.1 Create Contract
- **Endpoint**: `POST /api/v1/contracts`
- **Description**: Create a contract when accepting a proposal
- **Request Body**:
```typescript
{
  jobId: string;
  jobProposalId: string;
  contractTitle: string;              // max 70 chars
  contractDescription: string;        // max 5000 chars
  contractUploads: string[];          // File URLs
  priceType: 'fixed' | 'hourly';

  // For fixed price
  proposedPrice?: number;
  hasMilestones: boolean;

  // For hourly
  hourlyProposedPrice?: number;
  weeklyLimit?: number;               // max 168 hours

  startDate: Date;
  selectedCurrency: {
    value: string;
    label: string;
  };
  asssignedExpertId: string;
  createdBy: string;                  // Client user ID
  expertId: string;                   // Expert user ID
  hubId: string;

  // Stripe payment info (optional for now)
  stripeCustomerId?: string;
  stripeAccount?: string;
  paymentMethodId?: string;
  fundingOption?: string;             // 'direct' | 'escrow'
}
```
- **Response**:
```typescript
{
  success: true,
  data: {
    id: string;
    jobId: string;
    jobProposalId: string;
    contractTitle: string;
    contractDescription: string;
    contractUploads: string[];
    priceType: string;
    proposedPrice?: number;
    hourlyProposedPrice?: number;
    weeklyLimit?: number;
    hasMilestones: boolean;
    startDate: Date;
    selectedCurrency: { value: string; label: string; };
    status: 'pending';                // pending, active, completed, cancelled
    asssignedExpertId: string;
    createdBy: string;
    expertId: string;
    hubId: string;
    createdDate: Date;
    contractDetail: {
      mileStones: Milestone[];
      paid: 0;
      escrow: 0;
      escrowHours: 0;
      mileStoneStatus: 'pending';
    };
  }
}
```

---

#### 3.2 Get Contract by ID
- **Endpoint**: `GET /api/v1/contracts/{contractId}`
- **Description**: Get contract details with populated data
- **Response**:
```typescript
{
  success: true,
  data: {
    id: string;
    jobId: string;
    jobProposalId: string;
    contractTitle: string;
    contractDescription: string;
    contractUploads: string[];
    priceType: string;
    proposedPrice?: number;
    hourlyProposedPrice?: number;
    weeklyLimit?: number;
    hasMilestones: boolean;
    startDate: Date;
    endDate?: Date;
    selectedCurrency: { value: string; label: string; };
    status: string;
    expertProfile: User;              // Populated
    hubDetail: Agency;                // Populated
    proposalDetail: JobProposal;      // Populated
    contractDetail: {
      mileStones: Milestone[];
      paid: number;
      escrow: number;
      lastMileStone: Milestone;
      remainingMileStone: number;
      totalPaidHours: number;
      comingMileStone: Milestone;
      currentMileStone: Milestone;
      escrowHours: number;
      mileStoneStatus: string;
    };
    pendingTermsUpdate?: {            // For hourly rate/limit changes
      weeklyLimit: number;
      hourlyRate: number;
      requestedDate: Date;
      effectiveDate: Date;
      requestedBy: string;
      status: 'pending' | 'applied' | 'cancelled';
    };
    createdDate: Date;
  }
}
```

---

#### 3.3 Get Contracts by Hub ID
- **Endpoint**: `GET /api/v1/contracts?hubId={hubId}`
- **Description**: Get all contracts for a hub
- **Query Params**:
  - `hubId` (required)
  - `status` (optional): Filter by status
  - `limit` (optional): Number of results

---

#### 3.4 Update Contract
- **Endpoint**: `PATCH /api/v1/contracts/{contractId}`
- **Description**: Update contract details
- **Request Body**:
```typescript
{
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
  contractTitle?: string;
  contractDescription?: string;
  endDate?: Date;
  contractDetail?: {
    paid?: number;
    escrow?: number;
    totalPaidHours?: number;
    escrowHours?: number;
    mileStoneStatus?: string;
  };
  pendingTermsUpdate?: PendingTermsUpdate;
}
```

---

## Data Models Required

### 1. JobProposal Model

**Collection**: `jobProposals`

**Fields**:
```typescript
{
  _id: ObjectId;
  jobId: ObjectId;                    // ref: Job
  proposalDetails: string;
  priceType: 'fixed' | 'hourly';
  proposedPrice?: number;             // For fixed
  hourlyProposedPrice?: number;       // For hourly
  workingHours?: number;              // For hourly
  selectedCurrency: string;
  files: string[];
  createdBy: ObjectId;                // ref: User (client/job poster)
  asssignedExpertId: ObjectId;        // ref: User (expert)
  expertId: ObjectId;                 // ref: User (same as asssignedExpertId)
  status: string;                     // pending, accepted, rejected
  offerId?: ObjectId;                 // ref: Contract (when accepted)

  // Reviews
  isReviewFromClient: boolean;
  isReviewFromExpert: boolean;

  // Booking/Payment tracking
  lastBookingTransactionId?: string;
  lastPaymentLinkId?: string;
  lastPaymentLinkUrl?: string;

  createdDate: Date;
  updatedDate: Date;
}
```

**Indexes**:
- `jobId` (for querying proposals by job)
- `createdBy` (for expert's proposals)
- `asssignedExpertId` (for assigned contracts)
- `status`
- `offerId` (when accepted)

---

### 2. Milestone Model

**Collection**: `milestones`

**Fields**:
```typescript
{
  _id: ObjectId;
  jobId: ObjectId;                    // ref: Job
  jobProposalId: ObjectId;            // ref: JobProposal
  offerId?: ObjectId;                 // ref: Contract (when associated)
  hubId: ObjectId;                    // ref: Agency/Hub

  taskName: string;                   // max 150 chars
  taskDescription: string;            // max 200 chars
  amount: number;
  dueDate: Date;
  currency: {
    label: string;
    value: string;
  };
  status: string;                     // active, completed, cancelled, work_submitted, approved

  // Work submission
  workLogDescription?: string;
  workLogFilesUrl: string[];
  workSubmittedDate?: Date;

  // Payment
  paymentIntentId?: string;           // Stripe payment ID

  // Change tracking
  oldValues?: {
    amount?: number;
    taskName?: string;
    taskDescription?: string;
    dueDate?: Date;
    workLogDescription?: string;
  };
  changeHistory?: [{
    fieldName: string;
    oldValue: any;
    newValue: any;
    changedBy: ObjectId;              // ref: User
    changedDate: Date;
    changeReason?: string;
  }];
  lastModifiedBy?: ObjectId;          // ref: User
  lastModifiedDate?: Date;

  createdBy: ObjectId;                // ref: User
  createdDate: Date;
  updatedDate: Date;
}
```

**Indexes**:
- `jobProposalId` (get milestones by proposal)
- `offerId` (get milestones by contract)
- `jobId`
- `status`
- `dueDate`

---

### 3. Contract Model

**Collection**: `contracts`

**Fields**:
```typescript
{
  _id: ObjectId;
  jobId: ObjectId;                    // ref: Job
  jobProposalId: ObjectId;            // ref: JobProposal
  hubId: ObjectId;                    // ref: Agency/Hub

  contractTitle: string;              // max 70 chars
  contractDescription: string;        // max 5000 chars
  contractUploads: string[];          // File URLs

  priceType: 'fixed' | 'hourly';
  proposedPrice?: number;             // For fixed
  hourlyProposedPrice?: number;       // For hourly
  weeklyLimit?: number;               // For hourly (max 168)
  hasMilestones: boolean;

  selectedCurrency: {
    value: string;
    label: string;
  };

  startDate: Date;
  endDate?: Date;
  status: string;                     // pending, active, completed, cancelled

  // User references
  asssignedExpertId: ObjectId;        // ref: User (expert)
  createdBy: ObjectId;                // ref: User (client)
  expertId: ObjectId;                 // ref: User (expert, same as asssignedExpertId)

  // Stripe payment info
  stripeCustomerId?: string;
  stripeAccount?: string;
  paymentMethodId?: string;
  paymentIntentId?: string;
  stripeResponse?: any;
  fundingOption?: string;             // direct, escrow

  // Contract financial tracking
  contractDetail: {
    mileStones?: ObjectId[];          // ref: Milestone[]
    paid: number;
    escrow: number;
    lastMileStone?: ObjectId;         // ref: Milestone
    remainingMileStone: number;
    totalPaidHours?: number;          // For hourly
    comingMileStone?: ObjectId;       // ref: Milestone
    currentMileStone?: ObjectId;      // ref: Milestone
    escrowHours: number;              // For hourly
    mileStoneStatus: string;          // pending, in_progress, completed
  };

  // Terms update (for hourly contracts)
  pendingTermsUpdate?: {
    weeklyLimit: number;
    hourlyRate: number;
    requestedDate: Date;
    effectiveDate: Date;
    requestedBy: ObjectId;            // ref: User
    status: 'pending' | 'applied' | 'cancelled';
    appliedDate?: Date;
  };

  createdDate: Date;
  updatedDate: Date;
}
```

**Indexes**:
- `jobId`
- `jobProposalId`
- `hubId`
- `asssignedExpertId`
- `createdBy`
- `status`
- `priceType`

---

## Business Logic Requirements

### Proposal Creation
1. **Validation**:
   - If `priceType` = 'fixed': `proposedPrice` is required
   - If `priceType` = 'hourly': `hourlyProposedPrice` and `workingHours` are required
   - If milestones provided: total milestone amounts must NOT exceed `proposedPrice`
   - Maximum 2000 characters for `proposalDetails`

2. **Milestone Creation**:
   - If proposal includes milestones, create them in `milestones` collection
   - Link milestones to proposal via `jobProposalId`

3. **Status**:
   - Initial status: `pending`
   - Cannot create duplicate proposal for same job by same expert

---

### Contract Creation (Accept Proposal)
1. **Validation**:
   - Proposal must exist and be in `pending` status
   - Contract title max 70 chars
   - Contract description max 5000 chars
   - For hourly: weeklyLimit max 168 hours

2. **Update Proposal**:
   - Set proposal `status` to `accepted`
   - Set proposal `offerId` to new contract ID

3. **Link Milestones**:
   - Update all milestones with `offerId` (contract ID)

4. **Initialize Contract Detail**:
   - Set `paid` = 0
   - Set `escrow` = 0
   - Set `escrowHours` = 0
   - Set `mileStoneStatus` = 'pending'

---

### Milestone Updates
1. **Change Tracking**:
   - When milestone is updated, store old values in `oldValues`
   - Append change to `changeHistory` array with:
     - Field name
     - Old value
     - New value
     - Changed by user ID
     - Change date
     - Optional reason

2. **Status Transitions**:
   - `active` → `work_submitted` (expert submits work)
   - `work_submitted` → `approved` (client approves)
   - `approved` → `completed` (payment processed)

---

## API Response Standards

All responses follow the standard format:

**Success**:
```typescript
{
  success: true,
  data: any,
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  }
}
```

**Error**:
```typescript
{
  success: false,
  error: {
    code: string;
    message: string;
    details?: any;
  }
}
```

---

## Next Steps

1. Create Mongoose models for:
   - JobProposal
   - Milestone
   - Contract

2. Create Zod validation schemas for all operations

3. Implement services with business logic

4. Create controllers for HTTP handling

5. Define routes with Swagger documentation

6. Write comprehensive tests (80%+ coverage)

---

## Related Documentation

- **Job Posting**: `/docs/models/JOB-POSTING.md` (to be created)
- **User Model**: `/docs/models/USER.md`
- **Agency/Hub Model**: `/docs/models/AGENCY.md`
- **Payment Integration**: `/docs/architecture/STRIPE-PAYMENT-FLOW.md` (to be created)

---

_Analysis completed: 2025-11-19_
_Frontend source: mereka-web repository_
_Backend target: mereka-backend-v2_
