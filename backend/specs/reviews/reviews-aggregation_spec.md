---
title: Reviews Aggregation
type: feature_spec
status: draft
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-24'
depends_on:
- specs/reviews/reviews-data-models_spec.md
links:
  related_specs:
  - specs/reviews/reviews-overview_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

Service to calculate and update rating statistics whenever reviews are created, updated, or deleted.

## Key Features

- Calculate average rating from all active reviews
- Update rating distribution (count per star)
- Update reviewStats on Hub, Experience, Expertise models
- Support both BookingReview and ContractReview aggregation

## Why

Rating aggregation must be accurate and performant. Users see average ratings on:
- Hub profile pages
- Experience detail pages
- Expertise detail pages
- Search results

---

# Agent Contract

## Scope

## Non-goals

- Real-time streaming aggregation (batch recalculation is sufficient)
- Historical rating snapshots (only current stats stored)
- Weighted averages (all reviews count equally)

## In Scope

- ReviewAggregationService
- Hub review stats (booking + contract reviews)
- Experience review stats (booking reviews only)
- Expertise review stats (booking reviews only)

### Out of Scope

- Review CRUD (see reviews-booking-api_spec, reviews-contract-api_spec)
- Data models (see reviews-data-models_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Trigger Conditions

- [ ] AC-AG-001: Aggregation MUST run after BookingReview create
- [ ] AC-AG-002: Aggregation MUST run after BookingReview update (if rating changed)
- [ ] AC-AG-003: Aggregation MUST run after BookingReview delete (soft delete)
- [ ] AC-AG-004: Aggregation MUST run after ContractReview create
- [ ] AC-AG-005: Aggregation MUST run after ContractReview update (if rating changed)
- [ ] AC-AG-006: Aggregation MUST run after ContractReview delete (soft delete)

### BookingReview Aggregation

- [ ] AC-AG-010: MUST update Experience.reviewStats for experience reviews
- [ ] AC-AG-011: MUST update Expertise.reviewStats for expertise reviews
- [ ] AC-AG-012: MUST update Hub.reviewStats for all booking reviews
- [ ] AC-AG-013: MUST only count reviews with `status: 'active'`
- [ ] AC-AG-014: averageRating MUST be rounded to 1 decimal place
- [ ] AC-AG-015: ratingDistribution MUST show count for each star (1-5)
- [ ] AC-AG-016: totalReviews MUST count only active reviews
- [ ] AC-AG-017: lastReviewAt MUST be set to most recent review's createdAt

### ContractReview Aggregation

- [ ] AC-AG-020: MUST update revieweeHub.reviewStats for contract reviews
- [ ] AC-AG-021: MUST only count reviews with `status: 'active'`
- [ ] AC-AG-022: Hub.reviewStats MUST include BOTH booking AND contract reviews

### Aggregation Pipeline

- [ ] AC-AG-030: MUST use MongoDB aggregation pipeline for accuracy
- [ ] AC-AG-031: MUST handle zero reviews (averageRating: 0)
- [ ] AC-AG-032: MUST be atomic (use $set with full stats object)
- [ ] AC-AG-033: MUST be idempotent (same result if run multiple times)

### Performance

- [ ] AC-AG-040: Aggregation MUST complete within 1 second
- [ ] AC-AG-041: MAY run asynchronously (non-blocking)
- [ ] AC-AG-042: MUST log errors but not fail the review operation

---

## Service Methods

### ReviewAggregationService

```typescript
// src/core/services/reviews/reviewAggregation.service.ts

class ReviewAggregationService {
  /**
   * Recalculate stats for a specific service (Experience/Expertise)
   */
  async recalculateServiceStats(
    serviceId: string,
    serviceType: 'experience' | 'expertise'
  ): Promise<void>;

  /**
   * Recalculate stats for a hub (includes both booking and contract reviews)
   */
  async recalculateHubStats(hubId: string): Promise<void>;

  /**
   * Called after BookingReview create/update/delete
   */
  async onBookingReviewChange(review: IBookingReview): Promise<void>;

  /**
   * Called after ContractReview create/update/delete
   */
  async onContractReviewChange(review: IContractReview): Promise<void>;

  /**
   * Get current stats (reads from model, doesn't recalculate)
   */
  async getServiceStats(serviceId: string): Promise<IReviewStats | null>;
  async getHubStats(hubId: string): Promise<IReviewStats | null>;
}
```

---

## Aggregation Pipeline Example

### Service Stats Aggregation

```typescript
async recalculateServiceStats(serviceId: string, serviceType: string): Promise<void> {
  const stats = await BookingReview.aggregate([
    {
      $match: {
        serviceId: new ObjectId(serviceId),
        serviceType: serviceType,
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        lastReviewAt: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        _id: 0,
        averageRating: { $round: ['$averageRating', 1] },
        totalReviews: 1,
        ratingDistribution: {
          '1': '$rating1',
          '2': '$rating2',
          '3': '$rating3',
          '4': '$rating4',
          '5': '$rating5'
        },
        lastReviewAt: 1
      }
    }
  ]);

  const reviewStats = stats[0] || {
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    lastReviewAt: null
  };

  // Update the service model
  const Model = serviceType === 'experience' ? Experience : Expertise;
  await Model.findByIdAndUpdate(serviceId, { $set: { reviewStats } });
}
```

### Hub Stats Aggregation (Combined)

```typescript
async recalculateHubStats(hubId: string): Promise<void> {
  // Get booking review stats
  const bookingStats = await BookingReview.aggregate([
    { $match: { hubId: new ObjectId(hubId), status: 'active' } },
    { $group: {
        _id: null,
        count: { $sum: 1 },
        sum: { $sum: '$rating' },
        r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        lastAt: { $max: '$createdAt' }
    }}
  ]);

  // Get contract review stats (reviews received by this hub)
  const contractStats = await ContractReview.aggregate([
    { $match: { revieweeHubId: new ObjectId(hubId), status: 'active' } },
    { $group: {
        _id: null,
        count: { $sum: 1 },
        sum: { $sum: '$rating' },
        r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        lastAt: { $max: '$createdAt' }
    }}
  ]);

  // Combine stats
  const b = bookingStats[0] || { count: 0, sum: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, lastAt: null };
  const c = contractStats[0] || { count: 0, sum: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, lastAt: null };

  const totalReviews = b.count + c.count;
  const totalSum = b.sum + c.sum;
  const averageRating = totalReviews > 0 ? Math.round((totalSum / totalReviews) * 10) / 10 : 0;
  const lastReviewAt = [b.lastAt, c.lastAt].filter(Boolean).sort((a, b) => b - a)[0] || null;

  const reviewStats = {
    averageRating,
    totalReviews,
    ratingDistribution: {
      1: b.r1 + c.r1,
      2: b.r2 + c.r2,
      3: b.r3 + c.r3,
      4: b.r4 + c.r4,
      5: b.r5 + c.r5,
    },
    lastReviewAt
  };

  await Hub.findByIdAndUpdate(hubId, { $set: { reviewStats } });
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/services/reviews/reviewAggregation.service.ts` | Aggregation service |
| `src/core/services/reviews/index.ts` | Export all review services |

---

## Integration Points

### Called From

| Location | When |
|----------|------|
| `bookingReview.service.ts` | After create/update/delete |
| `contractReview.service.ts` | After create/update/delete |

### Updates

| Model | Field |
|-------|-------|
| Experience | `reviewStats` |
| Expertise | `reviewStats` |
| Hub | `reviewStats` |

---

## Error Handling

- Log errors but don't fail the review operation
- Aggregation errors should not affect user experience
- Consider retry mechanism for failed aggregations

```typescript
async onBookingReviewChange(review: IBookingReview): Promise<void> {
  try {
    await this.recalculateServiceStats(
      review.serviceId.toString(),
      review.serviceType
    );
    await this.recalculateHubStats(review.hubId.toString());
  } catch (error) {
    logger.error('Failed to recalculate review stats', {
      error,
      reviewId: review._id,
      serviceId: review.serviceId,
      hubId: review.hubId
    });
    // Don't throw - aggregation failure shouldn't fail the review operation
  }
}
```

---

## Edge Cases

- Zero reviews: `averageRating` MUST be 0, `totalReviews` MUST be 0
- All reviews deleted: Reset to zero state
- Rating of exactly 0: Not allowed (min 1, max 5)
- Concurrent review submissions: Aggregation pipeline is atomic
- Service/Hub not found during aggregation: Log error, skip update
- Decimal ratings in source: Round to 1 decimal in average

## Observability

- Log all aggregation runs with timing
- Track aggregation failures per service/hub
- Monitor aggregation queue depth (if async)
- Alert on aggregation latency > 1 second

## Rollout & Rollback

- Feature flag: `REVIEWS_AGGREGATION_ENABLED` controls aggregation
- Rollback: Disable flag, stats become stale but don't break
- Recovery: Admin endpoint to recalculate all stats manually

## Open Questions

- None at this time

---

## Verification

### Automated Tests

```bash
# Test file: tests/core/services/reviewAggregation.service.test.ts
# @covers AC-AG-001 through AC-AG-042
```

### Manual Verification

1. Create review → verify stats updated
2. Update review rating → verify stats recalculated
3. Delete review → verify stats recalculated
4. Verify hub stats include both booking and contract reviews
5. Verify zero reviews shows averageRating: 0
