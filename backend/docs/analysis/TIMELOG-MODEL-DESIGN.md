# Timelog Model Design - Separate Documents Approach

**Date**: 2025-11-19
**Status**: Proposed for Approval

---

## Design Philosophy

**Each day's work = One document**

Instead of storing multiple daily entries in an array within a weekly document, each work session is its own document. This provides:
- ✅ Better scalability
- ✅ Easier querying per day
- ✅ Simpler updates (no array manipulation)
- ✅ Better audit trail
- ✅ Atomic operations per work session

---

## Model: TimelogEntry

**Collection**: `timelogentries`
**File**: `src/models/TimelogEntry.ts`

### Interface

```typescript
import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Timelog entry status enum
 */
export enum TimelogStatus {
  DRAFT = 'draft',           // Expert is editing
  SUBMITTED = 'submitted',   // Submitted for approval
  APPROVED = 'approved',     // Client approved, payment processing
  REJECTED = 'rejected',     // Client rejected
  PAID = 'paid',            // Payment completed
}

/**
 * Timelog entry document interface
 */
export interface ITimelogEntry extends Document {
  // References
  contractId: mongoose.Types.ObjectId;  // Reference to Contract
  jobId: mongoose.Types.ObjectId;       // Reference to Job
  expertId: mongoose.Types.ObjectId;    // Expert who worked
  clientId: mongoose.Types.ObjectId;    // Client who will approve
  hubId: mongoose.Types.ObjectId;       // Hub/agency reference

  // Date tracking
  workDate: Date;            // Date of work (YYYY-MM-DD)
  weekNumber: number;        // ISO week number (1-52)
  year: number;              // Year (e.g., 2025)
  monthNumber: number;       // Month (1-12)

  // Time tracking
  startTime: string;         // HH:MM format (e.g., "09:00")
  endTime: string;           // HH:MM format (e.g., "17:00")
  hoursWorked: number;       // Calculated duration in hours
  breakDuration?: number;    // Break time in hours (optional)

  // Work details
  description: string;       // What was accomplished (required)
  tasks: string[];           // Array of specific tasks completed

  // Contract terms at time of work
  hourlyRate: number;        // Rate at time of work (locked from contract)
  weeklyLimit: number;       // Weekly limit at time of work
  currency: string;          // Currency code (MYR, USD, etc.)

  // Payment calculation
  billableAmount: number;    // hoursWorked × hourlyRate (calculated)

  // Status workflow
  status: TimelogStatus;     // Current status
  submittedDate?: Date;      // When submitted
  approvedDate?: Date;       // When approved
  rejectedDate?: Date;       // When rejected
  paidDate?: Date;           // When payment completed
  rejectionReason?: string;  // Why rejected (if applicable)

  // Payment processing
  paymentIntentId?: string;  // Stripe payment intent ID
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';

  // Approval tracking
  approvedBy?: mongoose.Types.ObjectId;  // User who approved
  rejectedBy?: mongoose.Types.ObjectId;  // User who rejected

  // Metadata
  createdBy: mongoose.Types.ObjectId;    // Expert who created
  createdDate: Date;
  updatedDate: Date;
}
```

---

## Schema Definition

```typescript
/**
 * Timelog Entry Schema
 */
const timelogEntrySchema = new Schema<ITimelogEntry>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    expertId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
      index: true,
    },

    // Date tracking
    workDate: {
      type: Date,
      required: true,
      index: true,
    },
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 53,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      min: 2020,
      max: 2100,
      index: true,
    },
    monthNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },

    // Time tracking
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,  // HH:MM format
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,  // HH:MM format
    },
    hoursWorked: {
      type: Number,
      required: true,
      min: 0.25,  // Minimum 15 minutes
      max: 24,    // Maximum 24 hours
    },
    breakDuration: {
      type: Number,
      min: 0,
      max: 4,  // Max 4 hours break
    },

    // Work details
    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000,
      trim: true,
    },
    tasks: {
      type: [String],
      default: [],
      validate: {
        validator: (tasks: string[]) => tasks.length <= 20,
        message: 'Maximum 20 tasks allowed',
      },
    },

    // Contract terms
    hourlyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    weeklyLimit: {
      type: Number,
      required: true,
      min: 1,
      max: 168,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      length: 3,
      default: 'MYR',
    },

    // Payment calculation
    billableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Status
    status: {
      type: String,
      enum: Object.values(TimelogStatus),
      default: TimelogStatus.DRAFT,
      index: true,
    },
    submittedDate: {
      type: Date,
    },
    approvedDate: {
      type: Date,
    },
    rejectedDate: {
      type: Date,
    },
    paidDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
    },

    // Payment
    paymentIntentId: {
      type: String,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed'],
      default: 'pending',
      index: true,
    },

    // Approval tracking
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' },
    toJSON: {
      transform: (_doc, ret) => {
        const { __v, ...rest } = ret;
        return rest;
      },
    },
  },
);
```

---

## Indexes

```typescript
/**
 * Compound Indexes for efficient queries
 */

// Query by contract and date range
timelogEntrySchema.index({ contractId: 1, workDate: -1 });
timelogEntrySchema.index({ contractId: 1, status: 1 });

// Query by expert
timelogEntrySchema.index({ expertId: 1, workDate: -1 });
timelogEntrySchema.index({ expertId: 1, status: 1 });

// Query by client
timelogEntrySchema.index({ clientId: 1, status: 1 });

// Query by week/month/year
timelogEntrySchema.index({ contractId: 1, year: 1, weekNumber: 1 });
timelogEntrySchema.index({ contractId: 1, year: 1, monthNumber: 1 });

// Query by date and status
timelogEntrySchema.index({ workDate: -1, status: 1 });

// Payment tracking
timelogEntrySchema.index({ paymentIntentId: 1 });
timelogEntrySchema.index({ paymentStatus: 1 });

// UNIQUE constraint: One entry per contract per date per expert
// (Expert can only have one timelog entry per day per contract)
timelogEntrySchema.index(
  { contractId: 1, expertId: 1, workDate: 1 },
  { unique: true }
);
```

---

## Pre-save Hook

```typescript
/**
 * Pre-save hook to calculate derived fields
 */
timelogEntrySchema.pre('save', function (next) {
  // Calculate hoursWorked from startTime and endTime if not provided
  if (!this.hoursWorked && this.startTime && this.endTime) {
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let durationMinutes = endMinutes - startMinutes;

    // Handle overnight work (endTime < startTime)
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }

    // Subtract break duration
    if (this.breakDuration) {
      durationMinutes -= this.breakDuration * 60;
    }

    this.hoursWorked = Number((durationMinutes / 60).toFixed(2));
  }

  // Calculate billableAmount
  this.billableAmount = Number((this.hoursWorked * this.hourlyRate).toFixed(2));

  // Extract weekNumber, year, monthNumber from workDate if not provided
  if (this.workDate) {
    const date = new Date(this.workDate);

    if (!this.year) {
      this.year = date.getFullYear();
    }

    if (!this.monthNumber) {
      this.monthNumber = date.getMonth() + 1;
    }

    if (!this.weekNumber) {
      // Calculate ISO week number
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      this.weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
  }

  next();
});
```

---

## Instance Methods

```typescript
/**
 * Check if entry can be edited
 */
timelogEntrySchema.methods.canBeEdited = function (): boolean {
  return this.status === TimelogStatus.DRAFT;
};

/**
 * Check if entry can be submitted
 */
timelogEntrySchema.methods.canBeSubmitted = function (): boolean {
  return this.status === TimelogStatus.DRAFT && this.hoursWorked > 0;
};

/**
 * Check if entry can be approved
 */
timelogEntrySchema.methods.canBeApproved = function (): boolean {
  return this.status === TimelogStatus.SUBMITTED;
};

/**
 * Check if entry can be rejected
 */
timelogEntrySchema.methods.canBeRejected = function (): boolean {
  return this.status === TimelogStatus.SUBMITTED;
};

/**
 * Check if entry can be deleted
 */
timelogEntrySchema.methods.canBeDeleted = function (): boolean {
  return this.status === TimelogStatus.DRAFT;
};

/**
 * Submit entry for approval
 */
timelogEntrySchema.methods.submit = function (expertId: mongoose.Types.ObjectId) {
  if (!this.canBeSubmitted()) {
    throw new Error('Timelog entry cannot be submitted');
  }

  this.status = TimelogStatus.SUBMITTED;
  this.submittedDate = new Date();
  this.createdBy = expertId;

  return this.save();
};

/**
 * Approve entry
 */
timelogEntrySchema.methods.approve = function (clientId: mongoose.Types.ObjectId) {
  if (!this.canBeApproved()) {
    throw new Error('Timelog entry cannot be approved');
  }

  this.status = TimelogStatus.APPROVED;
  this.approvedDate = new Date();
  this.approvedBy = clientId;

  return this.save();
};

/**
 * Reject entry
 */
timelogEntrySchema.methods.reject = function (
  clientId: mongoose.Types.ObjectId,
  reason: string,
) {
  if (!this.canBeRejected()) {
    throw new Error('Timelog entry cannot be rejected');
  }

  this.status = TimelogStatus.REJECTED;
  this.rejectedDate = new Date();
  this.rejectedBy = clientId;
  this.rejectionReason = reason;

  return this.save();
};
```

---

## Static Methods

```typescript
/**
 * Find entries by contract
 */
timelogEntrySchema.statics.findByContractId = function (
  contractId: mongoose.Types.ObjectId | string,
  status?: TimelogStatus,
) {
  const query: Record<string, unknown> = { contractId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ workDate: -1 });
};

/**
 * Find entries by expert
 */
timelogEntrySchema.statics.findByExpertId = function (
  expertId: mongoose.Types.ObjectId | string,
  status?: TimelogStatus,
) {
  const query: Record<string, unknown> = { expertId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ workDate: -1 });
};

/**
 * Find entries by date range
 */
timelogEntrySchema.statics.findByDateRange = function (
  contractId: mongoose.Types.ObjectId | string,
  startDate: Date,
  endDate: Date,
) {
  return this.find({
    contractId,
    workDate: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ workDate: 1 });
};

/**
 * Find entries by week
 */
timelogEntrySchema.statics.findByWeek = function (
  contractId: mongoose.Types.ObjectId | string,
  year: number,
  weekNumber: number,
) {
  return this.find({
    contractId,
    year,
    weekNumber,
  }).sort({ workDate: 1 });
};

/**
 * Find entries by month
 */
timelogEntrySchema.statics.findByMonth = function (
  contractId: mongoose.Types.ObjectId | string,
  year: number,
  monthNumber: number,
) {
  return this.find({
    contractId,
    year,
    monthNumber,
  }).sort({ workDate: 1 });
};

/**
 * Calculate total hours for a week
 */
timelogEntrySchema.statics.calculateWeeklyTotal = async function (
  contractId: mongoose.Types.ObjectId | string,
  year: number,
  weekNumber: number,
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        contractId: new mongoose.Types.ObjectId(contractId as string),
        year,
        weekNumber,
        status: { $in: [TimelogStatus.SUBMITTED, TimelogStatus.APPROVED, TimelogStatus.PAID] },
      },
    },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hoursWorked' },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalHours : 0;
};

/**
 * Calculate total billable amount for a contract
 */
timelogEntrySchema.statics.calculateTotalBillable = async function (
  contractId: mongoose.Types.ObjectId | string,
  status?: TimelogStatus,
): Promise<number> {
  const matchQuery: Record<string, unknown> = {
    contractId: new mongoose.Types.ObjectId(contractId as string),
  };

  if (status) {
    matchQuery.status = status;
  } else {
    matchQuery.status = { $in: [TimelogStatus.APPROVED, TimelogStatus.PAID] };
  }

  const result = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$billableAmount' },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalAmount : 0;
};

/**
 * Check if weekly limit is exceeded
 */
timelogEntrySchema.statics.checkWeeklyLimit = async function (
  contractId: mongoose.Types.ObjectId | string,
  year: number,
  weekNumber: number,
  weeklyLimit: number,
): Promise<{ total: number; isExceeded: boolean; remaining: number }> {
  const total = await this.calculateWeeklyTotal(contractId, year, weekNumber);

  return {
    total,
    isExceeded: total > weeklyLimit,
    remaining: Math.max(0, weeklyLimit - total),
  };
};
```

---

## Export Model

```typescript
/**
 * Export TimelogEntry model
 */
export const TimelogEntry = mongoose.model<ITimelogEntry>(
  'TimelogEntry',
  timelogEntrySchema,
);
```

---

## Usage Examples

### 1. Create a Daily Entry

```typescript
const entry = await TimelogEntry.create({
  contractId: '507f1f77bcf86cd799439014',
  jobId: '507f1f77bcf86cd799439011',
  expertId: '507f1f77bcf86cd799439012',
  clientId: '507f1f77bcf86cd799439010',
  hubId: '507f1f77bcf86cd799439020',
  workDate: new Date('2025-11-19'),
  startTime: '09:00',
  endTime: '17:00',
  breakDuration: 1,  // 1 hour lunch break
  description: 'Implemented user authentication module',
  tasks: [
    'Setup JWT authentication',
    'Created login/logout endpoints',
    'Added password hashing',
    'Wrote unit tests'
  ],
  hourlyRate: 50,
  weeklyLimit: 40,
  currency: 'MYR',
  createdBy: '507f1f77bcf86cd799439012',
});

// Pre-save hook calculates:
// - hoursWorked: 7 hours (8 hours - 1 hour break)
// - billableAmount: 350 (7 × 50)
// - weekNumber, year, monthNumber from workDate
```

### 2. Submit for Approval

```typescript
const entry = await TimelogEntry.findById(entryId);
await entry.submit(expertId);
// status: 'draft' → 'submitted'
// submittedDate: set to now
```

### 3. Approve Entry

```typescript
const entry = await TimelogEntry.findById(entryId);
await entry.approve(clientId);
// status: 'submitted' → 'approved'
// approvedDate: set to now
// approvedBy: clientId
```

### 4. Query Weekly Hours

```typescript
const weekTotal = await TimelogEntry.calculateWeeklyTotal(
  contractId,
  2025,
  47  // Week 47
);

console.log(`Total hours this week: ${weekTotal}`);
```

### 5. Check Weekly Limit

```typescript
const limitCheck = await TimelogEntry.checkWeeklyLimit(
  contractId,
  2025,
  47,
  40  // 40 hours limit
);

console.log(`Hours worked: ${limitCheck.total}`);
console.log(`Limit exceeded: ${limitCheck.isExceeded}`);
console.log(`Remaining hours: ${limitCheck.remaining}`);
```

### 6. Get All Entries for a Week

```typescript
const weekEntries = await TimelogEntry.findByWeek(contractId, 2025, 47);

weekEntries.forEach(entry => {
  console.log(`${entry.workDate}: ${entry.hoursWorked} hours`);
});
```

---

## Benefits of This Approach

### ✅ Scalability
- Each work day is independent
- No array size limits
- Better indexing performance

### ✅ Simpler Queries
```typescript
// Find a specific day
await TimelogEntry.findOne({ contractId, workDate: '2025-11-19' });

// Update a specific day
await TimelogEntry.updateOne(
  { contractId, workDate: '2025-11-19' },
  { status: 'approved' }
);
```

### ✅ Atomic Operations
- Edit one day without affecting others
- No array manipulation complexity
- Easier transaction handling

### ✅ Better Audit Trail
- Each document has its own timestamps
- Track who approved/rejected each day
- Individual payment tracking per day

### ✅ Flexible Aggregations
```typescript
// Group by week
await TimelogEntry.aggregate([
  { $match: { contractId } },
  { $group: {
      _id: { year: '$year', week: '$weekNumber' },
      totalHours: { $sum: '$hoursWorked' },
      totalAmount: { $sum: '$billableAmount' }
    }
  }
]);

// Group by month
await TimelogEntry.aggregate([
  { $match: { contractId } },
  { $group: {
      _id: { year: '$year', month: '$monthNumber' },
      totalHours: { $sum: '$hoursWorked' },
      totalAmount: { $sum: '$billableAmount' }
    }
  }
]);
```

---

## Status Flow

```
DRAFT (expert editing)
  ↓
SUBMITTED (expert submits for approval)
  ↓
APPROVED (client approves) → Payment processing
  ↓
PAID (payment completed)

OR

SUBMITTED
  ↓
REJECTED (client rejects with reason)
  ↓
DRAFT (expert can edit and resubmit)
```

---

## Constraints & Validations

1. **Unique per day**: One entry per contract per expert per day
2. **Time format**: HH:MM (24-hour format)
3. **Hours range**: 0.25 to 24 hours
4. **Description**: 10-1000 characters
5. **Tasks**: Maximum 20 tasks
6. **Weekly limit**: Enforced via aggregation queries

---

## Next Steps

1. ✅ Review this design
2. ✅ Approve structure
3. ✅ Create the model file
4. ✅ Create validation schemas
5. ✅ Test with sample data

Ready to implement when you approve! 🚀
