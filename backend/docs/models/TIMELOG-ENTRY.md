# TimelogEntry Model Documentation

**Location**: `src/models/TimelogEntry.ts`
**Collection**: `timelogentries`
**Purpose**: Daily work logs for hourly contracts

---

## Overview

TimelogEntry tracks daily work hours for hourly contracts. Each work day is a separate document. Experts log daily hours, submit for approval, and get paid based on approved time.

---

## Key Design Decision

**Separate Documents**: Each work day = one MongoDB document (NOT arrays).
- Better scalability
- Simpler queries
- Atomic operations per day

---

## Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `contractId` | ObjectId | Reference to Contract |
| `expertId` | ObjectId | Expert who worked |
| `clientId` | ObjectId | Client who approves |
| `hubId` | ObjectId | Reference to Hub |
| `workDate` | Date | Date of work |
| `startTime` | String | Start time (HH:MM format) |
| `endTime` | String | End time (HH:MM format) |
| `breakDuration` | Number | Break hours (0-4) |
| `hoursWorked` | Number | Calculated work hours |
| `description` | String | What was accomplished |
| `tasks` | String[] | Task list (max 20) |
| `hourlyRate` | Number | Rate at time of work |
| `weeklyLimit` | Number | Max hours/week (from contract) |
| `billableAmount` | Number | hoursWorked × hourlyRate |
| `currency` | String | Currency code |
| `status` | Enum | Timelog status |
| `submittedDate` | Date | When submitted |
| `approvedDate` | Date | When approved |
| `rejectedDate` | Date | When rejected |
| `rejectionReason` | String | Why rejected |
| `paymentIntentId` | String | Stripe payment intent ID |
| `weekNumber` | Number | ISO week (1-53) |
| `year` | Number | Year |
| `monthNumber` | Number | Month (1-12) |

---

## Enums

### TimelogStatus
- `draft` - Expert is editing
- `submitted` - Submitted for approval
- `approved` - Client approved, payment processing
- `rejected` - Client rejected
- `paid` - Payment completed

### PaymentStatus
- `pending` - Not yet processed
- `processing` - Payment in progress
- `paid` - Payment completed
- `failed` - Payment failed

---

## Auto-Calculated Fields

These are calculated automatically in pre-save hook:

### hoursWorked
```typescript
// Calculated from startTime, endTime, breakDuration
hoursWorked = (endTime - startTime - breakDuration)
// Handles overnight work
// Rounded to 2 decimals
```

### billableAmount
```typescript
billableAmount = hoursWorked × hourlyRate
```

### weekNumber, year, monthNumber
Extracted from `workDate` using ISO week calculation.

---

## Unique Constraint

```typescript
{ contractId: 1, expertId: 1, workDate: 1 } // UNIQUE
```

**One timelog entry per contract per expert per day.**

---

## Instance Methods

- `canBeEdited()` - Check if editable (draft only)
- `canBeSubmitted()` - Check if can submit (draft only)
- `canBeApproved()` - Check if can approve (submitted only)
- `canBeRejected()` - Check if can reject (submitted only)
- `submit(userId)` - Submit for approval
- `approve(clientId, paymentIntentId?)` - Approve and process payment
- `reject(clientId, reason)` - Reject with reason

---

## Static Methods

- `findByContractId(contractId, status?)` - Timelogs by contract
- `findByExpertId(expertId, status?)` - Expert's timelogs
- `findByWeek(contractId, year, weekNumber)` - Week's timelogs
- `calculateWeeklyTotal(contractId, year, weekNumber)` - Total hours for week
- `calculateTotalBillable(contractId, status?)` - Total amount
- `checkWeeklyLimit(contractId, year, weekNumber, limit)` - Check if over limit

---

## API Endpoints

- `POST /api/v1/timelogs` - Create timelog
- `GET /api/v1/timelogs` - List timelogs
- `GET /api/v1/timelogs/weekly-summary` - Weekly summary
- `GET /api/v1/timelogs/:id` - Get details
- `PATCH /api/v1/timelogs/:id` - Update (draft only)
- `DELETE /api/v1/timelogs/:id` - Delete (draft only)
- `POST /api/v1/timelogs/:id/submit` - Submit for approval
- `POST /api/v1/timelogs/:id/approve` - Approve
- `POST /api/v1/timelogs/:id/reject` - Reject

---

## Workflow

```
1. Expert creates timelog → Status: DRAFT
   - Enter workDate, startTime, endTime, breakDuration
   - hoursWorked auto-calculated
   - Can edit/delete while DRAFT

2. Expert submits → Status: SUBMITTED
   - Checks weekly limit not exceeded
   - No longer editable

3a. Client approves → Status: APPROVED
   - Payment processing (Stripe)
   - paymentIntentId set

3b. Client rejects → Status: REJECTED
   - rejectionReason required
   - Expert can create new entry

4. Payment completed → Status: PAID
```

---

## Weekly Limit Enforcement

```typescript
// Check before submission
const check = await TimelogEntry.checkWeeklyLimit(
  contractId,
  year,
  weekNumber,
  weeklyLimit
);

if (check.isExceeded) {
  throw new Error(`Weekly limit exceeded: ${check.total}/${weeklyLimit} hours`);
}
```

---

## Usage Examples

### Create Timelog

```typescript
const timelog = await TimelogEntry.create({
  contractId,
  expertId,
  clientId,
  hubId,
  workDate: new Date('2025-11-20'),
  startTime: "09:00",
  endTime: "17:30",
  breakDuration: 1,  // 1 hour lunch
  description: "Implemented user authentication module",
  tasks: ["Auth API", "Login UI", "Unit tests"],
  hourlyRate: 150,
  weeklyLimit: 40,
  currency: "MYR",
  status: TimelogStatus.DRAFT
});
// hoursWorked = 7.5 hours (17:30 - 09:00 - 1:00)
// billableAmount = 1125 (7.5 × 150)
```

### Get Weekly Summary

```typescript
const summary = await timelogService.getWeeklySummary({
  contractId,
  year: 2025,
  weekNumber: 47
});

// Returns:
{
  contractId,
  year: 2025,
  weekNumber: 47,
  totalHours: 37.5,
  totalAmount: 5625,
  weeklyLimit: 40,
  isOverLimit: false,
  remainingHours: 2.5,
  entriesCount: 5,
  byStatus: {
    draft: 1,
    submitted: 2,
    approved: 2,
    rejected: 0,
    paid: 0
  },
  entries: [...]
}
```

---

## Related Models

- **Contract**: Hourly contract this timelog belongs to
- **User**: Expert and client

---

## Best Practices

1. Log hours daily for accuracy
2. Include detailed descriptions
3. Submit weekly for regular payment
4. Keep within weekly limits
5. If rejected, review reason and resubmit

---

**Last Updated**: 2025-11-20
