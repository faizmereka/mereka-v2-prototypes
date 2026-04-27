# Milestone Model Documentation

**Location**: `src/models/Milestone.ts`
**Collection**: `milestones`
**Purpose**: Payment milestones for fixed-price contracts

---

## Overview

Milestones break down fixed-price contracts into smaller deliverables. Experts submit work for each milestone, clients approve, and payments are released progressively.

---

## Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `jobId` | ObjectId | Reference to Job |
| `jobProposalId` | ObjectId | Reference to JobProposal |
| `contractId` | ObjectId | Reference to Contract (when accepted) |
| `hubId` | ObjectId | Reference to Agency/Hub |
| `taskName` | String | Milestone name (max 150 chars) |
| `taskDescription` | String | Task description (max 200 chars) |
| `amount` | Number | Payment amount for milestone |
| `dueDate` | Date | Milestone due date |
| `currency` | String | Currency code (default: 'MYR') |
| `status` | Enum | Milestone status |
| `workLogDescription` | String | Work log when submitting |
| `workLogFilesUrl` | String[] | Submitted work file URLs |
| `workSubmittedDate` | Date | When work was submitted |
| `paymentIntentId` | String | Stripe payment intent ID |
| `oldValues` | Object | Previous values (change tracking) |
| `changeHistory` | Array | History of all changes |
| `lastModifiedBy` | ObjectId | Last user who modified |
| `createdBy` | ObjectId | User who created milestone |

---

## Enums

### MilestoneStatus
- `active` - Milestone is current, work not yet submitted
- `work_submitted` - Expert submitted work, awaiting approval
- `approved` - Client approved work, payment processing
- `completed` - Milestone fully completed and paid
- `cancelled` - Milestone cancelled

---

## Change Tracking

### oldValues (Subdocument)
```typescript
{
  amount?: number;
  taskName?: string;
  taskDescription?: string;
  dueDate?: Date;
  workLogDescription?: string;
}
```

### changeHistory (Array)
```typescript
[{
  fieldName: string;           // Which field changed
  oldValue: any;               // Previous value
  newValue: any;               // New value
  changedBy: ObjectId;         // User who made change
  changedDate: Date;           // When changed
  changeReason?: string;       // Why changed
}]
```

---

## Instance Methods

- `canBeEdited()` - Check if editable (active or work_submitted)
- `canBeDeleted()` - Check if can delete (active, no work submitted)
- `canSubmitWork()` - Check if work can be submitted (active)
- `canBeApproved()` - Check if can be approved (work_submitted)
- `isOverdue()` - Check if past due date (active only)

---

## Static Methods

- `findByProposalId(proposalId, status?)` - Milestones by proposal
- `findByContractId(contractId, status?)` - Milestones by contract
- `findByJobId(jobId, status?)` - Milestones by job
- `findUpcoming(proposalId, daysAhead=7)` - Upcoming milestones
- `findOverdue(proposalId)` - Overdue milestones
- `calculateTotalAmount(proposalId)` - Total milestone amount

---

## API Endpoints

- `POST /api/v1/milestones` - Create milestone
- `POST /api/v1/milestones/bulk` - Create multiple
- `GET /api/v1/milestones` - List milestones
- `GET /api/v1/milestones/upcoming` - Get upcoming
- `GET /api/v1/milestones/overdue` - Get overdue
- `GET /api/v1/milestones/total-amount/:proposalId` - Calculate total
- `GET /api/v1/milestones/:id` - Get details
- `PATCH /api/v1/milestones/:id` - Update milestone
- `PATCH /api/v1/milestones/:id/tracked` - Update with change tracking
- `DELETE /api/v1/milestones/:id` - Delete milestone
- `POST /api/v1/milestones/:id/submit-work` - Submit work
- `POST /api/v1/milestones/:id/approve` - Approve and pay

---

## Workflow

```
1. Milestones created with proposal or contract → Status: ACTIVE
2. Expert works on milestone
3. Expert submits work → Status: WORK_SUBMITTED
   - workLogDescription required
   - workLogFilesUrl optional
4. Client reviews and approves → Status: APPROVED
   - Payment processed (Stripe)
   - paymentIntentId set
5. Payment completed → Status: COMPLETED
```

---

## Change Tracking Workflow

When using update with tracking:
1. Old values saved to `oldValues`
2. Change details added to `changeHistory`
3. New values applied
4. `lastModifiedBy` and `lastModifiedDate` updated

Use for important changes that need audit trail (amount, due date, etc.)

---

## Usage Examples

### Create Milestones

```typescript
const milestones = await Milestone.insertMany([
  {
    jobId, jobProposalId, hubId,
    taskName: "Initial Design",
    taskDescription: "Wireframes and mockups",
    amount: 2000,
    dueDate: new Date('2025-12-01'),
    currency: "MYR",
    createdBy: userId
  },
  {
    jobId, jobProposalId, hubId,
    taskName: "Development",
    taskDescription: "Frontend implementation",
    amount: 4000,
    dueDate: new Date('2025-12-15'),
    currency: "MYR",
    createdBy: userId
  }
]);
```

### Submit Work

```typescript
milestone.workLogDescription = "Completed all wireframes...";
milestone.workLogFilesUrl = ["https://example.com/designs.pdf"];
milestone.workSubmittedDate = new Date();
milestone.status = MilestoneStatus.WORK_SUBMITTED;
await milestone.save();
```

### Approve Milestone

```typescript
if (milestone.canBeApproved()) {
  milestone.status = MilestoneStatus.APPROVED;
  milestone.paymentIntentId = "pi_xxxxx"; // From Stripe
  await milestone.save();
  // Process payment...
}
```

---

## Related Models

- **JobProposal**: Milestones included with proposal
- **Contract**: Milestones belong to contract
- **User**: Creator, expert, client

---

**Last Updated**: 2025-11-20
