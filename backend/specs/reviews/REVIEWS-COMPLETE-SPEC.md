# Reviews System Complete Specification

## Overview

This comprehensive specification covers the implementation of reviews across all detail pages, booking detail page creation, and integration with existing listing pages.

---

## Table of Contents

1. [Booking Detail Page (Learner)](#1-booking-detail-page-learner)
2. [Booking Detail View (Hub)](#2-booking-detail-view-hub)
3. [Contract Detail Reviews Tab](#3-contract-detail-reviews-tab)
4. [Hub Detail Reviews Tab](#4-hub-detail-reviews-tab)
5. [Experience Detail Reviews](#5-experience-detail-reviews)
6. [Expertise Detail Reviews](#6-expertise-detail-reviews)
7. [Job Detail Client Reviews](#7-job-detail-client-reviews)
8. [Listing Page Integration](#8-listing-page-integration)
9. [Test Mapping](#9-test-mapping)
10. [Data Test IDs](#10-data-test-ids)

---

## 1. Booking Detail Page (Learner)

### 1.1 Location & Routing

```
projects/app/src/app/features/user-dashboard/pages/booking-detail/
├── booking-detail.page.ts
├── booking-detail.page.html
├── components/
│   ├── booking-header.component.ts
│   ├── booking-info.component.ts
│   ├── booking-guests.component.ts
│   ├── booking-price.component.ts
│   ├── booking-review.component.ts
│   └── booking-location.component.ts
└── booking-detail.service.ts
```

**Route**: `/dashboard/bookings/:bookingId`

### 1.2 Acceptance Criteria

| AC Code | Description | Priority |
|---------|-------------|----------|
| AC-LBD-001 | Page loads with booking data from API | P0 |
| AC-LBD-002 | Header shows back button, title, print button | P0 |
| AC-LBD-003 | Booking info displays status, date/time, service title | P0 |
| AC-LBD-004 | Guests section shows ticket types and guest details | P1 |
| AC-LBD-005 | Price section shows payment breakdown | P1 |
| AC-LBD-006 | Location section shows map for physical events | P2 |
| AC-LBD-007 | Cancel booking available for eligible bookings | P1 |
| AC-LBD-008 | Print/download receipt functionality | P2 |
| AC-LBD-009 | Navigate back to bookings list | P0 |
| AC-LBD-010 | Navigate to service detail page | P1 |

### 1.3 Review Section (within Booking Detail)

| AC Code | Description | Priority |
|---------|-------------|----------|
| AC-LBR-001 | Show "Leave a Review" button for past non-cancelled bookings | P0 |
| AC-LBR-002 | Show existing review with rating and content | P0 |
| AC-LBR-003 | Edit/Delete menu for own review | P0 |
| AC-LBR-004 | Review dialog opens with rating input (1-5 stars) | P0 |
| AC-LBR-005 | Review dialog content input (25-1000 chars) | P0 |
| AC-LBR-006 | Review dialog photo upload (optional, max 5) | P2 |
| AC-LBR-007 | Submit review calls POST API | P0 |
| AC-LBR-008 | Edit review calls PUT API | P0 |
| AC-LBR-009 | Delete review shows confirmation, calls DELETE API | P0 |
| AC-LBR-010 | Show hub reply if exists | P1 |
| AC-LBR-011 | Review not available if booking date is future | P0 |
| AC-LBR-012 | Review not available for cancelled bookings | P0 |

### 1.4 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/web/bookings/:bookingId` | Get booking details |
| POST | `/api/web/bookings/:bookingId/review` | Create review |
| PUT | `/api/web/bookings/:bookingId/review` | Update review |
| DELETE | `/api/web/bookings/:bookingId/review` | Delete review |
| POST | `/api/web/bookings/:bookingId/cancel` | Cancel booking |

---

## 2. Booking Detail View (Hub)

### 2.1 Location

**Option A: Modal/Slide-over** (Recommended for quick view)
```
projects/app/src/app/features/hub-dashboard/pages/bookings/components/
├── booking-detail-modal/
│   ├── booking-detail-modal.component.ts
│   └── booking-detail-modal.component.html
```

**Option B: Separate Page**
```
projects/app/src/app/features/hub-dashboard/pages/bookings/booking-detail/
├── booking-detail.page.ts
└── booking-detail.page.html
```

### 2.2 Acceptance Criteria

| AC Code | Description | Priority |
|---------|-------------|----------|
| AC-HBD-001 | View booking details from booking list action menu | P0 |
| AC-HBD-002 | Display booking date/time, service, status | P0 |
| AC-HBD-003 | Show booker information (name, email, phone) | P0 |
| AC-HBD-004 | Show all guests/participants list | P0 |
| AC-HBD-005 | Show payment details and hub payout | P1 |
| AC-HBD-006 | Show learner's review if exists | P1 |
| AC-HBD-007 | Reply to learner review functionality | P1 |
| AC-HBD-008 | Cancel booking with reason | P1 |
| AC-HBD-009 | Send message to booker | P2 |
| AC-HBD-010 | Download booking details | P2 |

### 2.3 Hub Reply to Review

| AC Code | Description | Priority |
|---------|-------------|----------|
| AC-HRR-001 | Show "Reply" button on learner review | P0 |
| AC-HRR-002 | Reply input (max 500 characters) | P0 |
| AC-HRR-003 | Submit reply calls API | P0 |
| AC-HRR-004 | Show existing reply with edit option | P1 |
| AC-HRR-005 | Edit reply within 7 days | P1 |
| AC-HRR-006 | Delete reply with confirmation | P1 |

### 2.4 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/hub/bookings/:bookingId` | Get booking details |
| POST | `/api/hub/bookings/:bookingId/reply` | Reply to review |
| PUT | `/api/hub/bookings/:bookingId/reply` | Update reply |
| DELETE | `/api/hub/bookings/:bookingId/reply` | Delete reply |
| POST | `/api/hub/bookings/:bookingId/cancel` | Cancel booking |

---

## 3. Contract Detail Reviews Tab

### 3.1 Location

```
projects/app/src/app/features/hub-dashboard/pages/jobs/shared/contract-detail/
├── contract-details.component.ts (modify - add Reviews tab)
└── components/
    └── contract-reviews-tab/
        ├── contract-reviews-tab.component.ts
        └── contract-reviews-tab.component.html
```

### 3.2 Acceptance Criteria

| AC Code | Description | Priority |
|---------|-------------|----------|
| AC-CDR-001 | Reviews tab visible in contract header | P0 |
| AC-CDR-002 | Show review from Expert about Client | P0 |
| AC-CDR-003 | Show review from Client about Expert | P0 |
| AC-CDR-004 | "Write Review" button for eligible users | P0 |
| AC-CDR-005 | Review includes criteria ratings | P0 |
| AC-CDR-006 | Reply to received review | P1 |
| AC-CDR-007 | Edit own review within 7 days | P1 |
| AC-CDR-008 | Delete own review with confirmation | P1 |
| AC-CDR-009 | Empty state when no reviews | P0 |
| AC-CDR-010 | Review eligibility: contract completed or milestones released | P0 |

### 3.3 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/hub/contracts/:contractId/reviews` | Get contract reviews |
| POST | `/api/hub/contracts/:contractId/reviews` | Create review |
| PUT | `/api/hub/contracts/:contractId/reviews/:id` | Update review |
| DELETE | `/api/hub/contracts/:contractId/reviews/:id` | Delete review |
| POST | `/api/hub/contracts/:contractId/reviews/:id/reply` | Reply to review |

---

## 4. Hub Detail Reviews Tab

### 4.1 Location

```
projects/web/src/app/features/hubs/pages/hub-detail/
├── hub-detail.page.ts (modify - add Reviews tab)
└── components/
    └── hub-reviews-tab/
        ├── hub-reviews-tab.component.ts
        └── hub-reviews-tab.component.html
```

### 4.2 Acceptance Criteria

| AC Code | Description | Priority |
|---------|-------------|----------|
| AC-HDR-001 | Reviews tab in hub detail navigation | P0 |
| AC-HDR-002 | Aggregate reviews from experiences, expertise, contracts | P0 |
| AC-HDR-003 | Review stats card (avg rating, total count, distribution) | P0 |
| AC-HDR-004 | Filter by type: All, Experiences, Expertise, Jobs | P1 |
| AC-HDR-005 | Filter by rating: All, 5★, 4★, 3★, 2★, 1★ | P1 |
| AC-HDR-006 | Pagination (10 per page) | P1 |
| AC-HDR-007 | Review card shows reviewer, rating, content, date | P0 |
| AC-HDR-008 | Review card shows service name | P0 |
| AC-HDR-009 | Review card shows hub reply if exists | P0 |
| AC-HDR-010 | Empty state when no reviews | P0 |

### 4.3 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/web/hubs/:hubId/reviews` | Get aggregated hub reviews |
| GET | `/api/web/hubs/:hubId/reviews/stats` | Get review statistics |

---

## 5. Experience Detail Reviews

### 5.1 Location

```
projects/web/src/app/features/experience/components/experience-reviews/
├── experience-reviews.component.ts (modify - connect to API)
└── experience-reviews.component.html
```

### 5.2 Acceptance Criteria

| AC Code | Description | Priority |
|---------|-------------|----------|
| AC-EDR-001 | Reviews section visible on experience detail | P0 |
| AC-EDR-002 | Fetch reviews from API (replace mock data) | P0 |
| AC-EDR-003 | Review stats header (avg, total, breakdown) | P0 |
| AC-EDR-004 | Filter tabs by rating | P1 |
| AC-EDR-005 | Pagination | P1 |
| AC-EDR-006 | Review card with all details | P0 |
| AC-EDR-007 | Loading state while fetching | P0 |
| AC-EDR-008 | Empty state when no reviews | P0 |

### 5.3 API Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/web/experiences/:experienceId/reviews` | Get experience reviews |

---

## 6. Expertise Detail Reviews

### 6.1 Location

```
projects/web/src/app/features/expertise/pages/expertise-detail/
├── expertise-detail.page.ts (modify - add reviews section)
└── components/
    └── expertise-reviews/
        ├── expertise-reviews.component.ts
        └── expertise-reviews.component.html
```

### 6.2 Acceptance Criteria

| AC Code | Description | Priority |
|---------|-------------|----------|
| AC-XDR-001 | Reviews section visible on expertise detail | P0 |
| AC-XDR-002 | Fetch reviews from API | P0 |
| AC-XDR-003 | Review stats header | P0 |
| AC-XDR-004 | Filter tabs by rating | P1 |
| AC-XDR-005 | Pagination | P1 |
| AC-XDR-006 | Review card with all details | P0 |
| AC-XDR-007 | Loading state | P0 |
| AC-XDR-008 | Empty state | P0 |

### 6.3 API Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/web/expertise/:expertiseId/reviews` | Get expertise reviews |

---

## 7. Job Detail Client Reviews

### 7.1 Location

```
projects/web/src/app/features/jobs/pages/job-detail/
├── job-detail.page.ts (modify - add client section)
└── components/
    └── job-client-reviews/
        ├── job-client-reviews.component.ts
        └── job-client-reviews.component.html
```

### 7.2 Acceptance Criteria

| AC Code | Description | Priority |
|---------|-------------|----------|
| AC-JDR-001 | "About the Client" section visible | P0 |
| AC-JDR-002 | Show client hub name and logo | P0 |
| AC-JDR-003 | Show average contract review rating | P0 |
| AC-JDR-004 | Show completed contracts count | P0 |
| AC-JDR-005 | Show 2-3 recent review snippets | P1 |
| AC-JDR-006 | "View all reviews" link to hub reviews | P1 |

### 7.3 API Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/web/hubs/:hubId/reviews/summary` | Get hub review summary |

---

## 8. Listing Page Integration

### 8.1 Learner Bookings List

**File**: `user-dashboard/pages/bookings/bookings.component.ts`

| AC Code | Description | Priority |
|---------|-------------|----------|
| AC-LBL-001 | Click service name navigates to booking detail | P0 |
| AC-LBL-002 | "View Details" button navigates to booking detail | P0 |
| AC-LBL-003 | "Add Review" opens review dialog (or navigates to booking detail) | P0 |
| AC-LBL-004 | "Edit Review" opens review dialog | P0 |
| AC-LBL-005 | Show rating star for past bookings with reviews | P0 |

**Implementation**:
```typescript
// bookings.component.ts
viewReservation(booking: UserBooking): void {
  this.router.navigate(['/dashboard/bookings', booking.id]);
}

addReview(booking: UserBooking): void {
  // Option A: Navigate to booking detail with review mode
  this.router.navigate(['/dashboard/bookings', booking.id], {
    queryParams: { action: 'review' }
  });

  // Option B: Open dialog directly
  // this.openReviewDialog(booking);
}
```

### 8.2 Hub Bookings List

**File**: `hub-dashboard/pages/bookings/bookings.component.ts`

| AC Code | Description | Priority |
|---------|-------------|----------|
| AC-HBL-001 | "View Details" in action menu opens booking detail | P0 |
| AC-HBL-002 | Row click opens booking detail (optional) | P2 |
| AC-HBL-003 | Reply to review accessible from booking detail | P1 |

**Implementation**:
```typescript
// bookings.component.ts
openBookingDetail(booking: HubBookingItem): void {
  // Option A: Modal
  this.showBookingDetailModal(booking);

  // Option B: Navigate
  this.router.navigate(['/hub/bookings', booking._id]);
}
```

---

## 9. Test Mapping

### 9.1 Test File Structure

```
tests/e2e-test/tests/v2-e2e/
├── reviews/
│   ├── learner-reviews-e2e.spec.ts          (existing)
│   ├── booking-detail-e2e.spec.ts           (new)
│   ├── booking-review-e2e.spec.ts           (new)
│   ├── hub-booking-detail-e2e.spec.ts       (new)
│   ├── contract-reviews-e2e.spec.ts         (new)
│   ├── hub-reviews-e2e.spec.ts              (new)
│   ├── experience-reviews-e2e.spec.ts       (new)
│   └── expertise-reviews-e2e.spec.ts        (new)
└── fixtures/
    ├── reviews-page.ts                       (existing)
    ├── booking-detail.page.ts               (new)
    ├── hub-booking-detail.page.ts           (new)
    └── helpers/
        ├── reviews-e2e-helper.ts            (existing)
        └── booking-detail-helper.ts         (new)
```

### 9.2 AC to Test Mapping

#### Booking Detail Page (Learner)

| AC Code | Test File | Test Case |
|---------|-----------|-----------|
| AC-LBD-001 | booking-detail-e2e.spec.ts | `should load booking details from API` |
| AC-LBD-002 | booking-detail-e2e.spec.ts | `should display header with back and print buttons` |
| AC-LBD-003 | booking-detail-e2e.spec.ts | `should show booking status, date/time, service title` |
| AC-LBD-004 | booking-detail-e2e.spec.ts | `should display guests and tickets section` |
| AC-LBD-005 | booking-detail-e2e.spec.ts | `should show payment breakdown` |
| AC-LBD-006 | booking-detail-e2e.spec.ts | `should display location map for physical events` |
| AC-LBD-007 | booking-detail-e2e.spec.ts | `should show cancel button for eligible bookings` |
| AC-LBD-008 | booking-detail-e2e.spec.ts | `should download receipt on print button click` |
| AC-LBD-009 | booking-detail-e2e.spec.ts | `should navigate back to bookings list` |
| AC-LBD-010 | booking-detail-e2e.spec.ts | `should navigate to service detail page` |

#### Booking Review (Learner)

| AC Code | Test File | Test Case |
|---------|-----------|-----------|
| AC-LBR-001 | booking-review-e2e.spec.ts | `should show Leave Review button for past bookings` |
| AC-LBR-002 | booking-review-e2e.spec.ts | `should display existing review with rating` |
| AC-LBR-003 | booking-review-e2e.spec.ts | `should show edit/delete menu for own review` |
| AC-LBR-004 | booking-review-e2e.spec.ts | `should open review dialog with star rating input` |
| AC-LBR-005 | booking-review-e2e.spec.ts | `should validate content length (25-1000 chars)` |
| AC-LBR-006 | booking-review-e2e.spec.ts | `should allow photo upload (max 5)` |
| AC-LBR-007 | booking-review-e2e.spec.ts | `should submit new review successfully` |
| AC-LBR-008 | booking-review-e2e.spec.ts | `should update existing review` |
| AC-LBR-009 | booking-review-e2e.spec.ts | `should delete review with confirmation` |
| AC-LBR-010 | booking-review-e2e.spec.ts | `should display hub reply when exists` |
| AC-LBR-011 | booking-review-e2e.spec.ts | `should not show review for future bookings` |
| AC-LBR-012 | booking-review-e2e.spec.ts | `should not show review for cancelled bookings` |

#### Hub Booking Detail

| AC Code | Test File | Test Case |
|---------|-----------|-----------|
| AC-HBD-001 | hub-booking-detail-e2e.spec.ts | `should open booking detail from action menu` |
| AC-HBD-002 | hub-booking-detail-e2e.spec.ts | `should display booking date/time and status` |
| AC-HBD-003 | hub-booking-detail-e2e.spec.ts | `should show booker information` |
| AC-HBD-004 | hub-booking-detail-e2e.spec.ts | `should list all participants` |
| AC-HBD-005 | hub-booking-detail-e2e.spec.ts | `should show payment and payout details` |
| AC-HBD-006 | hub-booking-detail-e2e.spec.ts | `should display learner review when exists` |
| AC-HBD-007 | hub-booking-detail-e2e.spec.ts | `should allow reply to learner review` |

#### Hub Reply to Review

| AC Code | Test File | Test Case |
|---------|-----------|-----------|
| AC-HRR-001 | hub-booking-detail-e2e.spec.ts | `should show Reply button on learner review` |
| AC-HRR-002 | hub-booking-detail-e2e.spec.ts | `should validate reply length (max 500)` |
| AC-HRR-003 | hub-booking-detail-e2e.spec.ts | `should submit reply successfully` |
| AC-HRR-004 | hub-booking-detail-e2e.spec.ts | `should show existing reply with edit option` |
| AC-HRR-005 | hub-booking-detail-e2e.spec.ts | `should edit reply within 7 days` |
| AC-HRR-006 | hub-booking-detail-e2e.spec.ts | `should delete reply with confirmation` |

#### Contract Reviews

| AC Code | Test File | Test Case |
|---------|-----------|-----------|
| AC-CDR-001 | contract-reviews-e2e.spec.ts | `should display Reviews tab in contract header` |
| AC-CDR-002 | contract-reviews-e2e.spec.ts | `should show review from Expert about Client` |
| AC-CDR-003 | contract-reviews-e2e.spec.ts | `should show review from Client about Expert` |
| AC-CDR-004 | contract-reviews-e2e.spec.ts | `should show Write Review button when eligible` |
| AC-CDR-005 | contract-reviews-e2e.spec.ts | `should display criteria ratings in review` |
| AC-CDR-006 | contract-reviews-e2e.spec.ts | `should allow reply to received review` |
| AC-CDR-007 | contract-reviews-e2e.spec.ts | `should edit own review within 7 days` |
| AC-CDR-008 | contract-reviews-e2e.spec.ts | `should delete own review with confirmation` |
| AC-CDR-009 | contract-reviews-e2e.spec.ts | `should show empty state when no reviews` |
| AC-CDR-010 | contract-reviews-e2e.spec.ts | `should enable review when milestones released` |

#### Hub Detail Reviews

| AC Code | Test File | Test Case |
|---------|-----------|-----------|
| AC-HDR-001 | hub-reviews-e2e.spec.ts | `should display Reviews tab in hub detail` |
| AC-HDR-002 | hub-reviews-e2e.spec.ts | `should aggregate reviews from all sources` |
| AC-HDR-003 | hub-reviews-e2e.spec.ts | `should display review stats card` |
| AC-HDR-004 | hub-reviews-e2e.spec.ts | `should filter reviews by type` |
| AC-HDR-005 | hub-reviews-e2e.spec.ts | `should filter reviews by rating` |
| AC-HDR-006 | hub-reviews-e2e.spec.ts | `should paginate reviews` |
| AC-HDR-007 | hub-reviews-e2e.spec.ts | `should show review card with all details` |
| AC-HDR-008 | hub-reviews-e2e.spec.ts | `should display service name on review` |
| AC-HDR-009 | hub-reviews-e2e.spec.ts | `should show hub reply when exists` |
| AC-HDR-010 | hub-reviews-e2e.spec.ts | `should show empty state when no reviews` |

#### Experience Reviews

| AC Code | Test File | Test Case |
|---------|-----------|-----------|
| AC-EDR-001 | experience-reviews-e2e.spec.ts | `should display reviews section` |
| AC-EDR-002 | experience-reviews-e2e.spec.ts | `should fetch reviews from API` |
| AC-EDR-003 | experience-reviews-e2e.spec.ts | `should display review stats header` |
| AC-EDR-004 | experience-reviews-e2e.spec.ts | `should filter by rating` |
| AC-EDR-005 | experience-reviews-e2e.spec.ts | `should paginate reviews` |
| AC-EDR-006 | experience-reviews-e2e.spec.ts | `should show review card details` |
| AC-EDR-007 | experience-reviews-e2e.spec.ts | `should show loading state` |
| AC-EDR-008 | experience-reviews-e2e.spec.ts | `should show empty state` |

#### Expertise Reviews

| AC Code | Test File | Test Case |
|---------|-----------|-----------|
| AC-XDR-001 | expertise-reviews-e2e.spec.ts | `should display reviews section` |
| AC-XDR-002 | expertise-reviews-e2e.spec.ts | `should fetch reviews from API` |
| AC-XDR-003 | expertise-reviews-e2e.spec.ts | `should display review stats header` |
| AC-XDR-004 | expertise-reviews-e2e.spec.ts | `should filter by rating` |
| AC-XDR-005 | expertise-reviews-e2e.spec.ts | `should paginate reviews` |
| AC-XDR-006 | expertise-reviews-e2e.spec.ts | `should show review card details` |
| AC-XDR-007 | expertise-reviews-e2e.spec.ts | `should show loading state` |
| AC-XDR-008 | expertise-reviews-e2e.spec.ts | `should show empty state` |

#### Listing Page Integration

| AC Code | Test File | Test Case |
|---------|-----------|-----------|
| AC-LBL-001 | booking-detail-e2e.spec.ts | `should navigate from booking list to detail` |
| AC-LBL-002 | booking-detail-e2e.spec.ts | `should navigate via View Details button` |
| AC-LBL-003 | booking-review-e2e.spec.ts | `should open review from booking list` |
| AC-LBL-004 | booking-review-e2e.spec.ts | `should edit review from booking list` |
| AC-LBL-005 | learner-reviews-e2e.spec.ts | `should show rating in past bookings` |
| AC-HBL-001 | hub-booking-detail-e2e.spec.ts | `should open detail from action menu` |

---

## 10. Data Test IDs

### 10.1 Booking Detail Page (Learner)

```
// Page container
data-testid="booking-detail-page"
data-testid="booking-detail-loading"
data-testid="booking-detail-error"

// Header
data-testid="booking-detail-header"
data-testid="booking-back-btn"
data-testid="booking-title"
data-testid="booking-print-btn"

// Info section
data-testid="booking-info-section"
data-testid="booking-status-badge"
data-testid="booking-datetime"
data-testid="booking-confirmation-code"
data-testid="booking-service-link"
data-testid="booking-service-type"
data-testid="booking-location-info"

// Guests section
data-testid="booking-guests-section"
data-testid="booking-ticket-list"
data-testid="booking-ticket-item-{index}"
data-testid="booking-guest-item-{index}"
data-testid="booking-add-guest-btn"
data-testid="booking-download-tickets-btn"

// Price section
data-testid="booking-price-section"
data-testid="booking-payment-status"
data-testid="booking-ticket-prices"
data-testid="booking-service-fee"
data-testid="booking-discount"
data-testid="booking-total-paid"
data-testid="booking-refund-details"

// Review section
data-testid="booking-review-section"
data-testid="booking-review-loading"
data-testid="booking-existing-review"
data-testid="booking-review-rating"
data-testid="booking-review-content"
data-testid="booking-review-photos"
data-testid="booking-review-actions-menu"
data-testid="booking-edit-review-btn"
data-testid="booking-delete-review-btn"
data-testid="booking-leave-review-btn"
data-testid="booking-hub-reply"
data-testid="booking-hub-reply-content"

// Review dialog
data-testid="booking-review-dialog"
data-testid="booking-review-dialog-close"
data-testid="booking-review-rating-input"
data-testid="booking-review-content-input"
data-testid="booking-review-photo-upload"
data-testid="booking-review-submit-btn"
data-testid="booking-review-cancel-btn"

// Location section
data-testid="booking-location-section"
data-testid="booking-location-address"
data-testid="booking-location-map"

// Actions
data-testid="booking-actions-section"
data-testid="booking-cancel-btn"
data-testid="booking-help-link"
data-testid="booking-transaction-history-link"
```

### 10.2 Hub Booking Detail

```
// Modal/Page
data-testid="hub-booking-detail"
data-testid="hub-booking-close-btn"

// Content
data-testid="hub-booking-info"
data-testid="hub-booking-datetime"
data-testid="hub-booking-status"
data-testid="hub-booking-service"
data-testid="hub-booking-booker-info"
data-testid="hub-booking-participants-list"
data-testid="hub-booking-participant-{index}"
data-testid="hub-booking-payment-details"
data-testid="hub-booking-payout-amount"

// Learner Review
data-testid="hub-booking-learner-review"
data-testid="hub-booking-learner-review-rating"
data-testid="hub-booking-learner-review-content"
data-testid="hub-booking-reply-btn"
data-testid="hub-booking-reply-input"
data-testid="hub-booking-reply-submit"
data-testid="hub-booking-existing-reply"
data-testid="hub-booking-edit-reply-btn"
data-testid="hub-booking-delete-reply-btn"

// Actions
data-testid="hub-booking-cancel-btn"
data-testid="hub-booking-message-btn"
```

### 10.3 Contract Reviews Tab

```
// Tab
data-testid="contract-reviews-tab"
data-testid="contract-reviews-tab-badge"

// Content
data-testid="contract-reviews-section"
data-testid="contract-reviews-loading"
data-testid="contract-reviews-empty"
data-testid="contract-review-card-{id}"
data-testid="contract-review-rating"
data-testid="contract-review-criteria"
data-testid="contract-review-content"
data-testid="contract-review-date"
data-testid="contract-review-reviewer"
data-testid="contract-review-reply"

// Actions
data-testid="contract-write-review-btn"
data-testid="contract-edit-review-btn"
data-testid="contract-delete-review-btn"
data-testid="contract-reply-btn"
```

### 10.4 Hub Detail Reviews Tab

```
// Tab
data-testid="hub-reviews-tab"
data-testid="hub-reviews-tab-count"

// Stats
data-testid="hub-reviews-stats"
data-testid="hub-reviews-avg-rating"
data-testid="hub-reviews-total-count"
data-testid="hub-reviews-distribution"

// Filters
data-testid="hub-reviews-type-filter"
data-testid="hub-reviews-type-all"
data-testid="hub-reviews-type-experiences"
data-testid="hub-reviews-type-expertise"
data-testid="hub-reviews-type-jobs"
data-testid="hub-reviews-rating-filter"
data-testid="hub-reviews-rating-{n}"

// List
data-testid="hub-reviews-list"
data-testid="hub-review-card-{id}"
data-testid="hub-review-service-name"
data-testid="hub-reviews-pagination"
data-testid="hub-reviews-empty"
```

### 10.5 Experience/Expertise Reviews

```
// Experience
data-testid="experience-reviews-section"
data-testid="experience-reviews-stats"
data-testid="experience-reviews-filter"
data-testid="experience-reviews-list"
data-testid="experience-review-card-{id}"
data-testid="experience-reviews-loading"
data-testid="experience-reviews-empty"
data-testid="experience-reviews-pagination"

// Expertise
data-testid="expertise-reviews-section"
data-testid="expertise-reviews-stats"
data-testid="expertise-reviews-filter"
data-testid="expertise-reviews-list"
data-testid="expertise-review-card-{id}"
data-testid="expertise-reviews-loading"
data-testid="expertise-reviews-empty"
data-testid="expertise-reviews-pagination"
```

### 10.6 Job Detail Client Reviews

```
data-testid="job-client-section"
data-testid="job-client-hub-name"
data-testid="job-client-hub-logo"
data-testid="job-client-rating"
data-testid="job-client-contracts-count"
data-testid="job-client-review-snippets"
data-testid="job-client-view-all-link"
```

---

## 11. Summary

### Total Acceptance Criteria: 94

| Section | Count |
|---------|-------|
| Booking Detail Page (Learner) | 10 |
| Booking Review (Learner) | 12 |
| Booking Detail View (Hub) | 10 |
| Hub Reply to Review | 6 |
| Contract Reviews Tab | 10 |
| Hub Detail Reviews Tab | 10 |
| Experience Reviews | 8 |
| Expertise Reviews | 8 |
| Job Detail Client Reviews | 6 |
| Listing Integration (Learner) | 5 |
| Listing Integration (Hub) | 3 |
| **Total** | **94** |

### Test Files: 8

| Test File | Test Cases |
|-----------|------------|
| booking-detail-e2e.spec.ts | 12 |
| booking-review-e2e.spec.ts | 14 |
| hub-booking-detail-e2e.spec.ts | 13 |
| contract-reviews-e2e.spec.ts | 10 |
| hub-reviews-e2e.spec.ts | 10 |
| experience-reviews-e2e.spec.ts | 8 |
| expertise-reviews-e2e.spec.ts | 8 |
| learner-reviews-e2e.spec.ts | (existing, add 1) |
| **Total Test Cases** | **76** |

---

_Last updated: 2025-02-25_
