---
title: Reviews Frontend Overview
type: feature_spec
status: draft
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-24'
depends_on: []
links:
  related_specs:
  - specs/reviews/reviews-fe-booking-detail_spec.md
  - specs/reviews/reviews-fe-components_spec.md
  - specs/reviews/reviews-fe-contract-reviews_spec.md
  - specs/reviews/reviews-fe-admin_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

Frontend implementation for the review system across multiple apps:
- **App (app.mereka.io)** - Learner booking detail + reviews, Hub review management
- **Web (mereka.io)** - Public review display on experience/expertise/hub pages
- **Admin (admin.mereka.io)** - Admin review moderation

## Key Features

### Learner (User Dashboard)
- View booking detail with review section
- Write review for completed booking
- Edit/delete own review

### Hub (Hub Dashboard)
- View reviews received (read-only)
- Contract reviews (write/view)

### Public Pages
- View reviews on experience/expertise detail
- View reviews on hub profile

### Admin
- List all reviews (booking + contract)
- Moderate reviews

---

# Agent Contract

## Scope

## In Scope

- All frontend pages and components for reviews
- Services for API integration
- Shared components (star rating, review card, etc.)

### Out of Scope

- Backend implementation (separate specs)

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      REVIEW COMPONENTS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SHARED COMPONENTS (projects/app/src/app/shared/components/review/) │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐          │
│  │ StarRatingInput │ │ StarRating     │ │ ReviewCard     │          │
│  │ (interactive)   │ │ (display only) │ │ (single review)│          │
│  └────────────────┘ └────────────────┘ └────────────────┘          │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐          │
│  │ ReviewDialog   │ │ ReviewList     │ │ CriteriaRating │          │
│  │ (create/edit)  │ │ (with filters) │ │ (contract)     │          │
│  └────────────────┘ └────────────────┘ └────────────────┘          │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LEARNER PAGES (projects/app/features/user-dashboard/)              │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ booking-detail/                                         │        │
│  │   └── Shows booking + review section                    │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  HUB PAGES (projects/app/features/hub-dashboard/)                   │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ contract-detail/                                        │        │
│  │   └── Add review section for completed contracts        │        │
│  ├────────────────────────────────────────────────────────┤        │
│  │ reviews/                                                │        │
│  │   └── Hub reviews page (all reviews received)           │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PUBLIC PAGES (projects/web/)                                       │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ experience-detail/                                      │        │
│  │   └── Reviews tab/section                               │        │
│  ├────────────────────────────────────────────────────────┤        │
│  │ expertise-detail/                                       │        │
│  │   └── Reviews tab/section                               │        │
│  ├────────────────────────────────────────────────────────┤        │
│  │ hub-profile/                                            │        │
│  │   └── Reviews tab                                       │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ADMIN PAGES (projects/admin/)                                      │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ reviews/                                                │        │
│  │   ├── reviews-list.component.ts                         │        │
│  │   └── review-detail-dialog.component.ts                 │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Services

### Shared Review Service

```typescript
// projects/app/src/app/shared/services/review.service.ts

@Injectable({ providedIn: 'root' })
export class ReviewService {
  // Booking Reviews (Learner)
  getBookingReview(bookingId: string): Promise<BookingReview | null>;
  createBookingReview(data: CreateBookingReviewInput): Promise<BookingReview>;
  updateBookingReview(reviewId: string, data: UpdateBookingReviewInput): Promise<BookingReview>;
  deleteBookingReview(reviewId: string): Promise<void>;

  // Public Reviews
  getExperienceReviews(experienceId: string, options: ListOptions): Promise<ReviewListResponse>;
  getExpertiseReviews(expertiseId: string, options: ListOptions): Promise<ReviewListResponse>;
  getHubReviews(hubId: string, options: ListOptions): Promise<ReviewListResponse>;
}
```

### Hub Contract Review Service

```typescript
// projects/app/src/app/features/hub-dashboard/services/contract-review.service.ts

@Injectable({ providedIn: 'root' })
export class ContractReviewService {
  getContractReviews(contractId: string): Promise<ContractReviewsResponse>;
  getReviewStatus(contractId: string): Promise<ReviewStatusResponse>;
  createContractReview(contractId: string, data: CreateContractReviewInput): Promise<ContractReview>;
  updateContractReview(contractId: string, reviewId: string, data: UpdateContractReviewInput): Promise<ContractReview>;
}
```

### Admin Review Service

```typescript
// projects/admin/src/app/services/admin-review.service.ts

@Injectable({ providedIn: 'root' })
export class AdminReviewService {
  getAllReviews(options: AdminReviewListOptions): Promise<AdminReviewListResponse>;
  getBookingReviews(options: AdminReviewListOptions): Promise<AdminReviewListResponse>;
  getContractReviews(options: AdminReviewListOptions): Promise<AdminReviewListResponse>;
  getReviewDetail(reviewId: string, type: 'booking' | 'contract'): Promise<ReviewDetail>;
  moderateReview(reviewId: string, action: ModerationAction): Promise<void>;
  getReviewStats(): Promise<ReviewStats>;
  getReviewTrends(period: 'week' | 'month' | 'year'): Promise<ReviewTrends>;
}
```

---

## Files to Create

### Shared Components

| File | Description |
|------|-------------|
| `shared/components/review/star-rating-input/` | Interactive star rating |
| `shared/components/review/star-rating/` | Read-only star display |
| `shared/components/review/review-card/` | Single review display |
| `shared/components/review/review-dialog/` | Create/edit booking review |
| `shared/components/review/contract-review-dialog/` | Create/edit contract review |
| `shared/components/review/review-list/` | List with filters |
| `shared/components/review/criteria-rating/` | Contract review criteria display |
| `shared/components/review/index.ts` | Exports |

### Learner Pages

| File | Description |
|------|-------------|
| `user-dashboard/pages/booking-detail/` | Booking detail with review |

### Hub Pages

| File | Description |
|------|-------------|
| `hub-dashboard/pages/reviews/` | Hub reviews list page |
| `hub-dashboard/pages/jobs/shared/contract-detail/` | Update with review section |

### Admin Pages

| File | Description |
|------|-------------|
| `pages/reviews/reviews-list.component.ts` | Admin reviews list |
| `pages/reviews/review-detail-dialog.component.ts` | Review detail modal |

### Services

| File | Description |
|------|-------------|
| `shared/services/review.service.ts` | Booking review service |
| `hub-dashboard/services/contract-review.service.ts` | Contract review service |
| `services/admin-review.service.ts` | Admin review service |

---

## Implementation Phases

### Phase 1: Shared Components
1. Star rating components
2. Review card component
3. Review dialog component
4. Contract review dialog

### Phase 2: Booking Detail + Review
1. Learner booking detail page
2. Review section in booking detail
3. Create/edit review flow

### Phase 3: Contract Reviews
1. Contract detail review section
2. Contract review dialog
3. Two-way review display

### Phase 4: Public Pages
1. Experience reviews section
2. Expertise reviews section
3. Hub profile reviews tab

### Phase 5: Admin
1. Admin reviews list
2. Review detail modal
3. Moderation actions

---

## Related Specs

| Spec | Description |
|------|-------------|
| reviews-fe-booking-detail_spec.md | Booking detail page with reviews |
| reviews-fe-components_spec.md | Shared review components |
| reviews-fe-contract-reviews_spec.md | Contract review UI |
| reviews-fe-admin_spec.md | Admin review management |
