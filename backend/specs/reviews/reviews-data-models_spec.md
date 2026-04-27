---
title: Reviews Data Models
type: feature_spec
status: draft
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-24'
depends_on:
- specs/reviews/reviews-overview_spec.md
links:
  related_specs:
  - specs/reviews/reviews-booking-api_spec.md
  - specs/reviews/reviews-contract-api_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

Two data models for the review system:
- **BookingReview** - For booking reviews (learner → hub)
- **ContractReview** - For contract reviews (hub ↔ hub)

Plus schema updates to existing models for `reviewStats`.

## Why

Solid data models are the foundation for all review features.

## Success looks like

- Models created with proper Mongoose schemas
- Indexes optimized for common queries
- TypeScript interfaces exported for type safety
- Validation rules enforced at model level

---

# Agent Contract

## Scope

## Non-goals

- Review response/reply system (hub cannot respond to booking reviews)
- Review reporting/flagging system (future enhancement)
- Review moderation workflow (basic hide/delete only)

## In Scope

- BookingReview Mongoose model and schema
- ContractReview Mongoose model and schema
- reviewStats schema updates for Hub, Experience, Expertise
- TypeScript interfaces for all models
- Database indexes for performance
- Validation rules

### Out of Scope

- Service layer (see reviews-booking-api_spec, reviews-contract-api_spec)
- API endpoints
- Aggregation logic (see reviews-aggregation_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### BookingReview Model

- [ ] AC-BRM-001: BookingReview MUST have `bookingId` (ObjectId, required, unique index)
- [ ] AC-BRM-002: BookingReview MUST have `serviceId` (ObjectId, required) - Experience or Expertise
- [ ] AC-BRM-003: BookingReview MUST have `serviceType` enum: `experience | expertise`
- [ ] AC-BRM-004: BookingReview MUST have `hubId` (ObjectId, required) - Hub being reviewed
- [ ] AC-BRM-005: BookingReview MUST have `reviewerId` (ObjectId, required) - User who wrote review
- [ ] AC-BRM-006: BookingReview MUST have `rating` (number, required, min: 1, max: 5)
- [ ] AC-BRM-007: BookingReview MUST have `content` (string, required, minLength: 25, maxLength: 2000)
- [ ] AC-BRM-008: BookingReview MUST have `photos` array (string[], maxItems: 5) - Firebase Storage URLs
- [ ] AC-BRM-009: BookingReview MUST have `status` enum: `active | hidden | deleted` (default: active)
- [ ] AC-BRM-010: BookingReview MUST have `isEdited` (boolean, default: false)
- [ ] AC-BRM-011: BookingReview MUST have `editedAt` (Date, optional)
- [ ] AC-BRM-012: BookingReview MUST have `createdAt`, `updatedAt` timestamps

**Note**: Space bookings (`BookingType.SPACE`) are out of scope for reviews.

### ContractReview Model

- [ ] AC-CRM-001: ContractReview MUST have `contractId` (ObjectId, required)
- [ ] AC-CRM-002: ContractReview MUST have `jobId` (ObjectId, required)
- [ ] AC-CRM-003: ContractReview MUST have `reviewerHubId` (ObjectId, required) - Hub writing review
- [ ] AC-CRM-004: ContractReview MUST have `revieweeHubId` (ObjectId, required) - Hub being reviewed
- [ ] AC-CRM-005: ContractReview MUST have `reviewType` enum: `client_to_expert | expert_to_client`
- [ ] AC-CRM-006: ContractReview MUST have `rating` (number, required, min: 1, max: 5) - Overall rating
- [ ] AC-CRM-007: ContractReview MUST have `criteriaRatings` object with:
  - `quality` (number, 1-5) - Quality of work/requirements
  - `communication` (number, 1-5) - Communication
  - `professionalism` (number, 1-5) - Professionalism
  - `timeliness` (number, 1-5) - Meeting deadlines
- [ ] AC-CRM-008: ContractReview MUST have `content` (string, required, minLength: 25, maxLength: 1000)
- [ ] AC-CRM-009: ContractReview MUST have `status` enum: `active | hidden | deleted` (default: active)
- [ ] AC-CRM-010: ContractReview MUST have `isEdited` (boolean, default: false)
- [ ] AC-CRM-011: ContractReview MUST have `editedAt` (Date, optional)
- [ ] AC-CRM-012: ContractReview MUST have `createdAt`, `updatedAt` timestamps
- [ ] AC-CRM-013: ContractReview MUST have unique compound index on `(contractId, reviewType)`

### ReviewStats Schema (Add to Hub, Experience, Expertise)

- [ ] AC-RS-001: reviewStats MUST have `averageRating` (number, 1 decimal precision)
- [ ] AC-RS-002: reviewStats MUST have `totalReviews` (number, default: 0)
- [ ] AC-RS-003: reviewStats MUST have `ratingDistribution` object:
  - `1` (number) - Count of 1-star reviews
  - `2` (number) - Count of 2-star reviews
  - `3` (number) - Count of 3-star reviews
  - `4` (number) - Count of 4-star reviews
  - `5` (number) - Count of 5-star reviews
- [ ] AC-RS-004: reviewStats MUST have `lastReviewAt` (Date, optional)
- [ ] AC-RS-005: Hub.reviewStats MUST aggregate both booking AND contract reviews
- [ ] AC-RS-006: Experience.reviewStats MUST aggregate only experience booking reviews
- [ ] AC-RS-007: Expertise.reviewStats MUST aggregate only expertise booking reviews
- [ ] AC-RS-008: Existing `rating` field in Experience/Expertise SHOULD be deprecated in favor of `reviewStats.averageRating`

### Indexes

- [ ] AC-IX-001: BookingReview MUST have unique index on `bookingId`
- [ ] AC-IX-002: BookingReview MUST have index on `(serviceId, serviceType, status)`
- [ ] AC-IX-003: BookingReview MUST have index on `(hubId, status, createdAt)`
- [ ] AC-IX-004: BookingReview MUST have index on `(reviewerId, createdAt)`
- [ ] AC-IX-005: BookingReview MUST have index on `rating`
- [ ] AC-IX-006: ContractReview MUST have unique compound index on `(contractId, reviewType)`
- [ ] AC-IX-007: ContractReview MUST have index on `(revieweeHubId, status, createdAt)`
- [ ] AC-IX-008: ContractReview MUST have index on `(reviewerHubId, createdAt)`

---

## Data Model (Complete Schema)

### BookingReview

```typescript
// src/core/models/BookingReview.ts

import type { ObjectId } from 'mongoose';

export type BookingReviewServiceType = 'experience' | 'expertise';
export type BookingReviewStatus = 'active' | 'hidden' | 'deleted';

export interface IBookingReview {
  _id: ObjectId;

  // Core References
  bookingId: ObjectId;          // Required - verified purchase
  serviceId: ObjectId;          // Experience/Expertise ID
  serviceType: BookingReviewServiceType;
  hubId: ObjectId;              // Hub being reviewed
  reviewerId: ObjectId;         // User who wrote review (learner)

  // Content
  rating: number;               // 1-5 stars
  content: string;              // 25-2000 chars
  photos: string[];             // Firebase Storage URLs (max 5)

  // Status
  status: BookingReviewStatus;

  // Metadata
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### ContractReview

```typescript
// src/core/models/ContractReview.ts

import type { ObjectId } from 'mongoose';

export type ContractReviewType = 'client_to_expert' | 'expert_to_client';
export type ContractReviewStatus = 'active' | 'hidden' | 'deleted';

export interface ICriteriaRatings {
  quality: number;              // 1-5: Quality of work/requirements
  communication: number;        // 1-5: Communication
  professionalism: number;      // 1-5: Professionalism
  timeliness: number;           // 1-5: Meeting deadlines
}

export interface IContractReview {
  _id: ObjectId;

  // Core References
  contractId: ObjectId;         // Required
  jobId: ObjectId;              // Job reference

  // Reviewer & Reviewee (Hub-to-Hub)
  reviewerHubId: ObjectId;      // Hub writing the review
  revieweeHubId: ObjectId;      // Hub being reviewed
  reviewType: ContractReviewType;

  // Content
  rating: number;               // 1-5 overall rating
  criteriaRatings: ICriteriaRatings;
  content: string;              // 25-1000 chars

  // Status
  status: ContractReviewStatus;

  // Metadata
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### ReviewStats (Embedded Schema)

```typescript
// Add to Hub, Experience, Expertise models

export interface IReviewStats {
  averageRating: number;        // 1 decimal (e.g., 4.5)
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  lastReviewAt?: Date;
}

// Default value
const defaultReviewStats: IReviewStats = {
  averageRating: 0,
  totalReviews: 0,
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/models/BookingReview.ts` | BookingReview Mongoose model |
| `src/core/models/ContractReview.ts` | ContractReview Mongoose model |

## Files to Modify

| File | Change |
|------|--------|
| `src/core/models/Hub.ts` | Add `reviewStats` field |
| `src/core/models/Experience.ts` | Add `reviewStats` field (deprecate existing `rating`) |
| `src/core/models/Expertise.ts` | Add `reviewStats` field (deprecate existing `rating`) |

**Note on existing `rating` field**: Experience and Expertise models currently have a simple `rating?: number` field. This will be deprecated in favor of `reviewStats.averageRating` which provides more comprehensive statistics. During transition:
1. Keep `rating` field for backward compatibility
2. Aggregation service updates both `rating` and `reviewStats.averageRating`
3. Frontend should migrate to use `reviewStats.averageRating`
4. After migration complete, remove deprecated `rating` field

---

## Mongoose Schema Examples

### BookingReview Schema

```typescript
const bookingReviewSchema = new Schema<IBookingReview>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    serviceType: {
      type: String,
      enum: ['experience', 'expertise'],
      required: true,
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    content: {
      type: String,
      required: true,
      minlength: 25,
      maxlength: 2000,
      trim: true,
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 5,
        message: 'Maximum 5 photos allowed',
      },
    },
    status: {
      type: String,
      enum: ['active', 'hidden', 'deleted'],
      default: 'active',
      index: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bookingReviewSchema.index({ serviceId: 1, serviceType: 1, status: 1, createdAt: -1 });
bookingReviewSchema.index({ hubId: 1, status: 1, createdAt: -1 });
bookingReviewSchema.index({ reviewerId: 1, createdAt: -1 });
bookingReviewSchema.index({ rating: 1 });
```

### ContractReview Schema

```typescript
const contractReviewSchema = new Schema<IContractReview>(
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
    },
    reviewerHubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    revieweeHubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    reviewType: {
      type: String,
      enum: ['client_to_expert', 'expert_to_client'],
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    criteriaRatings: {
      quality: { type: Number, required: true, min: 1, max: 5 },
      communication: { type: Number, required: true, min: 1, max: 5 },
      professionalism: { type: Number, required: true, min: 1, max: 5 },
      timeliness: { type: Number, required: true, min: 1, max: 5 },
    },
    content: {
      type: String,
      required: true,
      minlength: 25,
      maxlength: 1000,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'hidden', 'deleted'],
      default: 'active',
      index: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index - one review per party per contract
contractReviewSchema.index({ contractId: 1, reviewType: 1 }, { unique: true });
contractReviewSchema.index({ revieweeHubId: 1, status: 1, createdAt: -1 });
contractReviewSchema.index({ reviewerHubId: 1, createdAt: -1 });
```

---

## Edge Cases

- Zero reviews: `averageRating` MUST be 0, `totalReviews` MUST be 0
- Review deletion: Soft delete with status change, triggers re-aggregation
- Duplicate review attempt: Unique index prevents, return 400 error
- Contract review before completion: Validation in service layer, not model

## Observability

- Log all review create/update/delete operations
- Track review count per hub/service for analytics
- Monitor for unusual patterns (bulk reviews, rating manipulation)

## Rollout & Rollback

- Feature flag: `REVIEWS_ENABLED` controls API availability
- Database migrations are additive (new fields with defaults)
- Rollback: Disable flag, existing reviews remain but hidden

## Open Questions

- None at this time

## Verification

### Automated Tests

```bash
# Test file: tests/core/models/BookingReview.test.ts
# @covers AC-BRM-001 through AC-BRM-012, AC-IX-001 through AC-IX-005

# Test file: tests/core/models/ContractReview.test.ts
# @covers AC-CRM-001 through AC-CRM-013, AC-IX-006 through AC-IX-008

# Test file: tests/core/models/ReviewStats.test.ts
# @covers AC-RS-001 through AC-RS-008
```

### Manual Verification

1. Create BookingReview with all required fields
2. Verify unique constraint on bookingId
3. Create ContractReview for both review types
4. Verify unique constraint on (contractId, reviewType)
5. Verify indexes exist in MongoDB
