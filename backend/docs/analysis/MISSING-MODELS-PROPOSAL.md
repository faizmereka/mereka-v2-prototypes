# Missing Models Implementation Proposal

**Date**: 2025-11-19
**Status**: ✅ **IMPLEMENTED** (2025-11-20)
**Implementation**: Complete job/proposal/contract/milestone/timelog system

---

## Summary

Based on the comprehensive analysis, we needed:
- **1 NEW model** to create (TimelogEntry) - ✅ **IMPLEMENTED**
- Services, Controllers, Routes for all models - ✅ **IMPLEMENTED**

**Note**: The `contractDetail` subdocument was **deferred** as decided during implementation.

---

## 1. NEW MODEL: TimelogEntry ✅ (IMPLEMENTED)

### Purpose
Track work hours for **hourly contracts**. Experts submit weekly timelogs with daily breakdowns, clients approve, and payments are processed based on hours worked.

### File Location
`src/models/Timelog.ts` (NEW FILE)

### Model Structure

```typescript
interface ITimelog extends Document {
  // References
  contractId: mongoose.Types.ObjectId;  // Reference to Contract
  expertId: mongoose.Types.ObjectId;    // Expert who worked

  // Time tracking
  weekNumber: number;        // ISO week number (1-52)
  year: number;              // Year (e.g., 2025)

  // Daily work entries
  entries: [{
    date: Date;              // Work date
    startTime: string;       // HH:MM format (e.g., "09:00")
    endTime: string;         // HH:MM format (e.g., "17:00")
    hoursWorked: number;     // Calculated duration in hours
    description: string;     // What was accomplished
    activities?: string[];   // Optional task breakdown
  }];

  // Weekly summary
  weeklyTotal: number;       // Sum of all hoursWorked
  weeklyLimit: number;       // Max hours allowed (from contract)
  isWithinLimit: boolean;    // weeklyTotal <= weeklyLimit

  // Status workflow
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedDate?: Date;
  approvedDate?: Date;
  rejectedDate?: Date;
  rejectionReason?: string;

  // Payment calculation
  paymentCalculation: {
    hours: number;           // Billable hours
    hourlyRate: number;      // Rate at time of work
    amount: number;          // hours × rate (in main currency)
    status: 'pending' | 'escrow' | 'paid';
  };

  paymentIntentId?: string;  // Stripe payment intent ID

  // Timestamps
  createdDate: Date;
  updatedDate: Date;
}
```

### Enums

```typescript
export enum TimelogStatus {
  DRAFT = 'draft',           // Expert is still editing
  SUBMITTED = 'submitted',   // Submitted for client review
  APPROVED = 'approved',     // Client approved, payment processing
  REJECTED = 'rejected',     // Client rejected
}

export enum PaymentStatus {
  PENDING = 'pending',       // Not yet processed
  ESCROW = 'escrow',        // Payment held, awaiting approval
  PAID = 'paid',            // Payment released to expert
}
```

### Indexes

```typescript
// Query by contract
{ contractId: 1, status: 1 }
{ contractId: 1, weekNumber: 1, year: 1 } // Unique per contract/week/year

// Query by expert
{ expertId: 1, status: 1 }

// Query by week
{ year: 1, weekNumber: 1 }

// Payment tracking
{ paymentIntentId: 1 }
```

### Instance Methods

```typescript
canBeEdited(): boolean {
  return this.status === 'draft';
}

canBeSubmitted(): boolean {
  return this.status === 'draft' && this.entries.length > 0;
}

canBeApproved(): boolean {
  return this.status === 'submitted';
}

canBeRejected(): boolean {
  return this.status === 'submitted';
}

calculateWeeklyTotal(): number {
  return this.entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
}

isWithinWeeklyLimit(): boolean {
  return this.weeklyTotal <= this.weeklyLimit;
}
```

### Static Methods

```typescript
findByContractId(contractId, status?) {
  const query = { contractId };
  if (status) query.status = status;
  return this.find(query).sort({ year: -1, weekNumber: -1 });
}

findByExpertId(expertId, status?) {
  const query = { expertId };
  if (status) query.status = status;
  return this.find(query).sort({ year: -1, weekNumber: -1 });
}

findByWeek(year, weekNumber) {
  return this.find({ year, weekNumber });
}

calculateTotalHours(contractId): Promise<number> {
  // Aggregate total approved hours for a contract
}

calculateTotalPaid(contractId): Promise<number> {
  // Aggregate total payment amount for a contract
}
```

### Status Flow

```
DRAFT (expert editing)
  ↓ (expert submits)
SUBMITTED (awaiting client review)
  ↓ (client approves)
APPROVED (payment processing)
  ↓ (payment completed)
  (status remains APPROVED, paymentCalculation.status → 'paid')

OR

SUBMITTED
  ↓ (client rejects)
REJECTED (expert can edit and resubmit)
  ↓ (expert resubmits)
SUBMITTED
```

---

## 2. UPDATE EXISTING MODEL: Contract ⚠️

### Current Status
Contract model exists but is **missing** the `contractDetail` subdocument.

### File Location
`src/models/Contract.ts` (EXISTING FILE - NEEDS UPDATE)

### What to Add

Add new field `contractDetail` to `IContract` interface:

```typescript
// ADD THIS TO IContract interface
contractDetail?: IContractDetail;  // Make optional for backward compatibility
```

### New Interface: IContractDetail

```typescript
/**
 * Contract detail tracking subdocument
 */
export interface IContractDetail {
  // Milestone tracking (for fixed price contracts)
  mileStones: mongoose.Types.ObjectId[];     // Array of milestone IDs
  lastMileStone?: mongoose.Types.ObjectId;   // Last completed milestone
  remainingMileStone: number;                // Count of incomplete milestones
  comingMileStone?: mongoose.Types.ObjectId; // Next upcoming milestone
  currentMileStone?: mongoose.Types.ObjectId;// Currently active milestone
  mileStoneStatus: 'pending' | 'in_progress' | 'completed';

  // Payment tracking
  paid: number;                              // Total amount paid to expert
  escrow: number;                            // Amount in escrow (pending approval)

  // Hourly tracking (for hourly contracts)
  totalPaidHours?: number;                   // Total hours already paid
  escrowHours?: number;                      // Hours pending approval
}
```

### Schema Definition

```typescript
/**
 * Contract detail schema
 */
const contractDetailSchema = new Schema<IContractDetail>(
  {
    mileStones: {
      type: [Schema.Types.ObjectId],
      ref: 'Milestone',
      default: [],
    },
    lastMileStone: {
      type: Schema.Types.ObjectId,
      ref: 'Milestone',
    },
    remainingMileStone: {
      type: Number,
      default: 0,
      min: 0,
    },
    comingMileStone: {
      type: Schema.Types.ObjectId,
      ref: 'Milestone',
    },
    currentMileStone: {
      type: Schema.Types.ObjectId,
      ref: 'Milestone',
    },
    mileStoneStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    paid: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    escrow: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalPaidHours: {
      type: Number,
      min: 0,
    },
    escrowHours: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);
```

### Add to Contract Schema

```typescript
// In contractSchema definition, add:
contractDetail: {
  type: contractDetailSchema,
  default: () => ({
    mileStones: [],
    remainingMileStone: 0,
    mileStoneStatus: 'pending',
    paid: 0,
    escrow: 0,
  }),
}
```

### Why This Update Is Needed

1. **Track milestone progress** - Know which milestones are complete, current, upcoming
2. **Track payments** - Know total paid vs. in escrow
3. **Track hourly work** - For hourly contracts, track paid hours vs. pending hours
4. **Support frontend UI** - Display contract progress, payment status, etc.

### Backward Compatibility

- Field is **optional** (`contractDetail?`)
- Default value provided for new contracts
- Existing contracts without this field will still work

---

## Implementation Order

### Phase 1: Timelog Model (HIGH Priority for Hourly Contracts)

**Why first?**
- Required for hourly contract functionality
- Independent model (doesn't depend on Contract update)
- Can be implemented and tested separately

**Tasks**:
1. Create `src/models/Timelog.ts`
2. Create `src/schemas/timelog.schema.ts`
3. Add indexes
4. Add instance/static methods
5. Test model creation and queries

**Estimated Time**: 2-3 hours

---

### Phase 2: Update Contract Model (MEDIUM Priority)

**Why second?**
- Can be added incrementally
- Doesn't break existing functionality
- Services/controllers can update this field as needed

**Tasks**:
1. Add `IContractDetail` interface to `Contract.ts`
2. Add `contractDetailSchema` subdocument
3. Add `contractDetail` field to Contract model
4. Set default values for new contracts
5. Test backward compatibility with existing contracts

**Estimated Time**: 1-2 hours

---

## Questions for Approval

### 1. Timelog Model

**Q**: Should we implement the Timelog model now, or defer it?

**Options**:
- ✅ **Implement now** - Full hourly contract support from day 1
- ⏸️ **Defer** - Focus on fixed-price milestones first, add hourly later

**Recommendation**: **Implement now** if hourly contracts are a core feature. The model is well-defined and won't change much.

---

### 2. Contract Detail Field

**Q**: Should we add `contractDetail` to the Contract model?

**Options**:
- ✅ **Add now** - Track payments and progress properly
- ⏸️ **Defer** - Calculate on-the-fly from milestones/timelogs (slower, more complex queries)

**Recommendation**: **Add now** with default values. It's optional, backward compatible, and will make services much simpler.

---

### 3. Additional Fields to Contract Detail?

**Q**: The current spec includes milestone tracking fields. Should we also add:
- Last updated date for contractDetail?
- Payment history array?
- Milestone completion percentage?

**Recommendation**: Start with the spec as-is. Can add more fields later if needed.

---

## Summary Table

| Item | Type | Priority | Status | Estimated Time |
|------|------|----------|--------|----------------|
| **Timelog Model** | New Model | HIGH | ❌ Not implemented | 2-3 hours |
| **Contract.contractDetail** | Model Update | MEDIUM | ⚠️ Partially defined | 1-2 hours |
| Timelog Schemas | New Schemas | HIGH | ❌ Not implemented | 1 hour |
| Contract Schema Update | Schema Update | MEDIUM | ❌ Not implemented | 30 mins |

**Total Estimated Time**: 4-6 hours for complete model implementation

---

## Next Steps

**Option 1: Implement Both** (Recommended)
1. Create Timelog model
2. Update Contract model
3. Create validation schemas
4. Test both models
5. Commit and push

**Option 2: Implement Timelog Only**
1. Create Timelog model first
2. Test thoroughly
3. Defer Contract update to later

**Option 3: Implement Contract Update Only**
1. Update Contract model with contractDetail
2. Defer Timelog to Phase 4 (hourly contracts)

---

## Awaiting Your Decision

Please confirm:
1. ✅ Proceed with Timelog model?
2. ✅ Proceed with Contract.contractDetail update?
3. Any modifications to the proposed structures?

Once approved, I'll implement immediately! 🚀
