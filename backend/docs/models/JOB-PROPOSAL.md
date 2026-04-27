# JobProposal Model Documentation

**Location**: `src/models/JobProposal.ts`
**Collection**: `jobproposals`
**Purpose**: Expert proposals submitted for job postings

---

## Overview

The JobProposal model represents proposals submitted by experts in response to job postings. Each proposal includes pricing, timeline estimates, milestones, and a cover letter.

---

## Model Structure

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jobId` | ObjectId | Yes | Reference to Job |
| `proposalDetails` | String | Yes | Cover letter/description (max 2000 chars) |
| `priceType` | Enum | Yes | 'fixed' or 'hourly' |
| `selectedCurrency` | String | Yes | Currency code (default: 'MYR') |
| `files` | String[] | No | Uploaded file URLs |
| `status` | Enum | Yes | Proposal status |

### Pricing Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `proposedPrice` | Number | Conditional | For fixed price (required if priceType='fixed') |
| `hourlyProposedPrice` | Number | Conditional | For hourly rate (required if priceType='hourly') |
| `workingHours` | Number | Conditional | Estimated hours (required if priceType='hourly') |

### User References

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `createdBy` | ObjectId | Yes | Job poster/client (who receives proposal) |
| `asssignedExpertId` | ObjectId | Yes | Expert who submitted proposal |
| `expertId` | ObjectId | Yes | Same as asssignedExpertId (for consistency) |
| `contractId` | ObjectId | No | Reference to Contract (when accepted) |

### Review Tracking

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isReviewFromClient` | Boolean | Yes | Has client reviewed (default: false) |
| `isReviewFromExpert` | Boolean | Yes | Has expert reviewed after contract (default: false) |

---

## Enums

### ProposalStatus
- `pending` - Submitted, awaiting client review
- `accepted` - Client accepted, contract created
- `rejected` - Client rejected proposal
- `withdrawn` - Expert withdrew proposal

### PriceType
- `fixed` - Fixed project price
- `hourly` - Hourly rate

---

## Indexes

```typescript
{ jobId: 1, status: 1 }                    // Proposals by job
{ asssignedExpertId: 1, status: 1 }        // Expert's proposals
{ createdBy: 1, status: 1 }                // Client's received proposals
{ jobId: 1, asssignedExpertId: 1 }         // Unique: prevent duplicate proposals
```

---

## Instance Methods

### `getTotalPrice(): number`
Calculate total price for hourly proposals (hourlyRate × workingHours).

### `canBeWithdrawn(): boolean`
Check if proposal can be withdrawn (only PENDING proposals).

### `canBeAccepted(): boolean`
Check if proposal can be accepted (only PENDING proposals).

---

## Static Methods

### `findByJobId(jobId, status?)`
Find all proposals for a specific job.

### `findByExpertId(expertId, status?)`
Find all proposals submitted by an expert.

### `findByClientId(clientId, status?)`
Find all proposals received by a client.

### `hasExistingProposal(jobId, expertId): Promise<boolean>`
Check if expert already submitted a proposal for this job.

---

## Usage Examples

### Create Proposal (Fixed Price)

```typescript
const proposal = await JobProposal.create({
  jobId: job._id,
  proposalDetails: "I am experienced in UI/UX design...",
  priceType: PriceType.FIXED,
  proposedPrice: 6000,
  selectedCurrency: "MYR",
  files: ["https://example.com/portfolio.pdf"],
  asssignedExpertId: expert._id,
  expertId: expert._id,
  createdBy: job.createdBy,
  status: ProposalStatus.PENDING
});
```

### Create Proposal (Hourly)

```typescript
const proposal = await JobProposal.create({
  jobId: job._id,
  proposalDetails: "I can complete this in 40 hours...",
  priceType: PriceType.HOURLY,
  hourlyProposedPrice: 150,
  workingHours: 40,
  selectedCurrency: "MYR",
  asssignedExpertId: expert._id,
  expertId: expert._id,
  createdBy: job.createdBy,
  status: ProposalStatus.PENDING
});
```

### Check for Duplicate

```typescript
const exists = await JobProposal.hasExistingProposal(jobId, expertId);
if (exists) {
  throw new Error("Already submitted proposal for this job");
}
```

### Withdraw Proposal

```typescript
const proposal = await JobProposal.findById(proposalId);
if (proposal.canBeWithdrawn()) {
  proposal.status = ProposalStatus.WITHDRAWN;
  await proposal.save();
}
```

---

## Validation Rules

- **Pricing**: If `priceType='fixed'`, `proposedPrice` is required
- **Hourly**: If `priceType='hourly'`, both `hourlyProposedPrice` and `workingHours` are required
- **Uniqueness**: Expert can only submit one proposal per job (enforced by index)
- **proposalDetails**: 1-2000 characters

---

## Workflow

```
1. Expert submits proposal → Status: PENDING
2a. Client accepts → Status: ACCEPTED (Contract created, contractId set)
2b. Client rejects → Status: REJECTED
2c. Expert withdraws → Status: WITHDRAWN (only if still PENDING)
```

---

## Related Models

- **Job**: The job posting this proposal is for
- **Contract**: Created when proposal is accepted
- **Milestone**: Can be included with proposal (created when proposal accepted)
- **User**: Expert and client

---

## API Endpoints

- `POST /api/v1/proposals` - Create proposal
- `GET /api/v1/proposals` - List proposals with filters
- `GET /api/v1/proposals/:id` - Get proposal details
- `PATCH /api/v1/proposals/:id` - Update proposal
- `POST /api/v1/proposals/:id/withdraw` - Withdraw proposal
- `POST /api/v1/proposals/:id/reject` - Reject proposal (client)

---

## Best Practices

1. Include detailed proposal to stand out
2. Price competitively based on market rates
3. Attach portfolio/relevant work samples
4. For hourly work, provide realistic hour estimates
5. Don't submit multiple proposals to same job (will fail)

---

## Security Considerations

- Only the expert can withdraw their own proposal
- Only the client can accept/reject proposals for their job
- Proposals cannot be accepted/rejected once status changes

---

**Last Updated**: 2025-11-20
