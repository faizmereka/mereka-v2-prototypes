# Contract Model Documentation

**Location**: `src/models/Contract.ts`
**Collection**: `contracts`
**Purpose**: Formal agreements created when proposals are accepted

---

## Overview

Contracts are created when a client accepts an expert's proposal. They formalize the work agreement and track payment, milestones, and work progress.

---

## Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `jobId` | ObjectId | Reference to Job |
| `jobProposalId` | ObjectId | Reference to accepted JobProposal (unique) |
| `hubId` | ObjectId | Reference to Agency/Hub |
| `contractTitle` | String | Contract title (max 70 chars) |
| `contractDescription` | String | Contract description (max 5000 chars) |
| `contractUploads` | String[] | Contract file URLs |
| `priceType` | Enum | 'fixed' or 'hourly' |
| `proposedPrice` | Number | For fixed price contracts |
| `hourlyProposedPrice` | Number | Hourly rate for hourly contracts |
| `weeklyLimit` | Number | Max hours/week (1-168) for hourly contracts |
| `hasMilestones` | Boolean | Whether contract has milestones |
| `selectedCurrency` | String | Currency code |
| `startDate` | Date | Contract start date |
| `endDate` | Date | Contract completion date |
| `status` | Enum | Contract status |
| `asssignedExpertId` | ObjectId | Expert assigned to contract |
| `createdBy` | ObjectId | Client who created contract |
| `expertId` | ObjectId | Same as asssignedExpertId |
| `stripeCustomerId` | String | Stripe customer ID |
| `stripeAccount` | String | Stripe connected account ID |
| `paymentMethodId` | String | Stripe payment method ID |
| `pendingTermsUpdate` | Object | Pending hourly rate/limit changes |

---

## Enums

### ContractStatus
- `pending` - Contract created, not yet started
- `active` - Contract is active and ongoing
- `completed` - Contract finished successfully
- `cancelled` - Contract cancelled by either party
- `paused` - Contract temporarily paused

### TermsUpdateStatus
- `pending` - Terms update requested, awaiting approval
- `applied` - Terms update approved and applied
- `cancelled` - Terms update request cancelled

---

## Pending Terms Update (for Hourly Contracts)

```typescript
pendingTermsUpdate?: {
  weeklyLimit: number;       // New weekly hour limit
  hourlyRate: number;        // New hourly rate
  requestedDate: Date;       // When requested
  effectiveDate: Date;       // When change takes effect
  requestedBy: ObjectId;     // Who requested (client or expert)
  status: TermsUpdateStatus; // Status of request
  appliedDate?: Date;        // When approved
}
```

---

## Instance Methods

- `isActive()` - Check if contract is active
- `canBeCancelled()` - Check if can be cancelled
- `canBePaused()` - Check if can be paused
- `canBeResumed()` - Check if can be resumed

---

## Static Methods

- `findByHubId(hubId, status?, limit?)` - Hub's contracts
- `findByExpertId(expertId, status?)` - Expert's contracts
- `findByClientId(clientId, status?)` - Client's contracts
- `findByJobId(jobId, status?)` - Job's contracts

---

## API Endpoints

- `POST /api/v1/contracts` - Create contract (from proposal)
- `GET /api/v1/contracts` - List contracts
- `GET /api/v1/contracts/:id` - Get contract details
- `PATCH /api/v1/contracts/:id` - Update contract
- `POST /api/v1/contracts/:id/cancel` - Cancel contract
- `POST /api/v1/contracts/:id/pause` - Pause contract
- `POST /api/v1/contracts/:id/resume` - Resume contract
- `POST /api/v1/contracts/:id/terms-update/request` - Request rate/limit change
- `POST /api/v1/contracts/:id/terms-update/apply` - Approve terms change

---

## Workflow

```
1. Proposal accepted → Contract created (status: PENDING)
2. Contract starts → Status: ACTIVE
3. Work proceeds:
   - Fixed: Milestones completed
   - Hourly: Timelogs submitted
4. Contract ends → Status: COMPLETED
```

### Terms Update Workflow (Hourly Only)

```
1. Party A requests change → pendingTermsUpdate.status = PENDING
2. Party B approves → pendingTermsUpdate.status = APPLIED
   → weeklyLimit and hourlyProposedPrice updated
```

---

## Related Models

- **Job**: Original job posting
- **JobProposal**: Accepted proposal
- **Milestone**: For fixed price contracts
- **TimelogEntry**: For hourly contracts
- **User**: Expert and client

---

**Last Updated**: 2025-11-20
