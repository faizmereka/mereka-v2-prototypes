# Detail Pages Reviews Specification

## Overview

This specification defines the implementation of reviews display and actions on various detail pages across the Mereka v2 platform. Reviews should be accessible based on viewer context (hub vs learner) with appropriate actions available.

---

## Reference: v1 Reservation Review (UI Pattern)

Based on v1 `reservation-review.component.html`:

### UI Elements:
1. **Section Title**: "Your Review" (when review exists) or "Leave a Review" button
2. **Star Rating Display**: 5 stars with visual indicator
3. **Review Content**: Text paragraph showing `reviewDescription`
4. **Menu Options**: Edit Review, Delete Review (via dropdown)
5. **Loading State**: Show loader while fetching
6. **Empty State**: "Leave a Review" button when no review exists

### Behavior:
- Review shown only if booking is NOT cancelled and date is NOT before booking date
- Edit opens dialog with existing data pre-filled
- Delete shows confirmation dialog before soft-delete (status: DELETED)
- After add/edit, updates both review and booking transaction

---

## 1. Contract Detail Page Reviews

**Location**: Hub Dashboard > Jobs > Contract Detail
**File**: `projects/app/src/app/features/hub-dashboard/pages/jobs/shared/contract-detail/`

### 1.1 Requirements

#### AC-CDR-001: Display Reviews Tab in Contract Header
- Add "Reviews" tab after existing tabs (Worklog, Transaction, Details)
- Show badge count for unread/pending reviews
- Tab only visible for active or completed contracts

#### AC-CDR-002: Reviews Section Content
- Show review from Expert about Client Hub
- Show review from Client about Expert Hub
- Each review displays:
  - Reviewer hub name and logo
  - Overall rating (1-5 stars)
  - Criteria ratings (Quality, Communication, Professionalism, Timeliness)
  - Review content text
  - Date submitted
  - Reply (if exists)

#### AC-CDR-003: Write Review Action (Expert View)
- Show "Write Review" button if:
  - Contract is completed OR active with milestones released
  - Expert has NOT yet reviewed the Client Hub
- Opens `ContractReviewDialogComponent` with Client Hub as reviewee
- On submit: POST `/api/hub/contracts/:contractId/reviews`

#### AC-CDR-004: Write Review Action (Client View)
- Show "Write Review" button if:
  - Contract is completed OR active with milestones released
  - Client has NOT yet reviewed the Expert Hub
- Opens `ContractReviewDialogComponent` with Expert Hub as reviewee
- On submit: POST `/api/hub/contracts/:contractId/reviews`

#### AC-CDR-005: Reply to Review Action
- Hub can reply to review received
- Show "Reply" button on reviews received
- Reply limited to 500 characters
- POST `/api/hub/contracts/:contractId/reviews/:reviewId/reply`

#### AC-CDR-006: Edit/Delete Own Review
- Owner can edit review within 7 days
- Owner can soft-delete own review
- Confirmation dialog for delete

### 1.2 Data Structures

```typescript
interface ContractReviewDisplay {
  _id: string;
  contractId: string;
  reviewerHub: {
    _id: string;
    name: string;
    logo?: string;
  };
  revieweeHub: {
    _id: string;
    name: string;
    logo?: string;
  };
  rating: number;
  criteriaRatings: {
    quality: number;
    communication: number;
    professionalism: number;
    timeliness: number;
  };
  content: string;
  reply?: {
    content: string;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.3 API Endpoints (Already Exist)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/hub/contracts/:contractId/reviews` | Get reviews for contract |
| POST | `/api/hub/contracts/:contractId/reviews` | Submit review |
| PUT | `/api/hub/contracts/:contractId/reviews/:reviewId` | Update review |
| DELETE | `/api/hub/contracts/:contractId/reviews/:reviewId` | Delete review |
| POST | `/api/hub/contracts/:contractId/reviews/:reviewId/reply` | Reply to review |

---

## 2. Booking Detail Page Reviews

**Location**: Learner Dashboard > Bookings > Booking Detail (NEW PAGE)
**Reference**: v1 `reservation/` folder structure

### 2.1 Create Booking Detail Page

Create new page similar to v1 reservation page:
- `user-dashboard/pages/booking-detail/booking-detail.page.ts`

#### AC-BDR-001: Page Structure
- Header: Back button, "Booking Details" title, Print/Download button
- Sections:
  1. Booking Introduction (title, date/time, confirmation code, status)
  2. Experience/Expertise details
  3. Guests & Tickets (for experiences)
  4. Price breakdown
  5. **Reviews Section** (NEW)
  6. Location (if physical)
  7. Help links

#### AC-BDR-002: Reviews Section Display
- Title: "Your Review"
- Show existing review if submitted:
  - Star rating (1-5)
  - Review text
  - Photos (if any)
  - Edit/Delete menu
- Show "Leave a Review" button if:
  - Booking is past
  - Status is NOT cancelled
  - No review exists

#### AC-BDR-003: Write Review Action
- Opens review dialog with:
  - Experience/Expertise/Hub name
  - Star rating selector (1-5)
  - Review text input (25-1000 chars)
  - Photo upload (optional, max 5)
- On submit: POST `/api/web/bookings/:bookingId/review`

#### AC-BDR-004: Edit Review
- Pre-fills dialog with existing data
- PUT `/api/web/bookings/:bookingId/review`

#### AC-BDR-005: Delete Review
- Confirmation dialog
- Soft delete (status: DELETED)
- DELETE `/api/web/bookings/:bookingId/review`

#### AC-BDR-006: View Hub Reply
- If hub has replied to review, show:
  - Hub name and logo
  - Reply text
  - Reply date

### 2.2 API Endpoints (Already Exist)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/web/bookings/:bookingId` | Get booking with review |
| POST | `/api/web/bookings/:bookingId/review` | Submit review |
| PUT | `/api/web/bookings/:bookingId/review` | Update review |
| DELETE | `/api/web/bookings/:bookingId/review` | Delete review |

---

## 3. Hub Detail Page Reviews

**Location**: Web Public > Hub Detail
**File**: `projects/web/src/app/features/hubs/pages/hub-detail/`

### 3.1 Requirements

#### AC-HDR-001: Add Reviews Tab
- Add "Reviews" tab in hub detail tabs
- Show total review count in tab

#### AC-HDR-002: Aggregated Reviews Display
- Show combined reviews from:
  - BookingReviews (experiences, expertise)
  - ContractReviews (jobs)
- Sort by most recent
- Pagination: 10 per page

#### AC-HDR-003: Review Stats Card
- Average rating (combined)
- Total review count
- Rating distribution (5-star breakdown)
- Individual averages: Experiences, Expertise, Jobs

#### AC-HDR-004: Filter Reviews
- Filter by type: All, Experiences, Expertise, Jobs
- Filter by rating: All, 5★, 4★, 3★, 2★, 1★

#### AC-HDR-005: Review Card Display
- Reviewer name (or "Anonymous" if private)
- Reviewer avatar
- Rating stars
- Review content (expandable if long)
- Photos (if any)
- Date
- Hub reply (if exists)
- Service name (experience/expertise/job title)

### 3.2 API Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/web/hubs/:hubId/reviews` | Get all hub reviews (aggregated) |

---

## 4. Experience Detail Page Reviews

**Location**: Web Public > Experience Detail
**File**: `projects/web/src/app/features/experience/pages/experience-detail/`
**Existing Component**: `experience-reviews.component.ts` (needs API connection)

### 4.1 Requirements

#### AC-EDR-001: Connect to Real API
- Replace mock data with API call
- GET `/api/web/experiences/:experienceId/reviews`

#### AC-EDR-002: Review Stats Header
- Average rating
- Total reviews count
- Rating breakdown chart

#### AC-EDR-003: Filter by Rating
- Tabs: All, 5★, 4★, 3★, 2★, 1★
- Dynamic count per rating

#### AC-EDR-004: Review List
- Paginated (10 per page)
- Each review shows: reviewer, rating, content, photos, date, hub reply

### 4.2 API Endpoint (Already Exists)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/web/experiences/:experienceId/reviews` | Get experience reviews |

---

## 5. Expertise Detail Page Reviews

**Location**: Web Public > Expertise Detail
**File**: `projects/web/src/app/features/expertise/pages/expertise-detail/`

### 5.1 Requirements

#### AC-XDR-001: Add Reviews Section
- Create new component: `expertise-reviews.component.ts`
- Place after expertise details, before booking widget

#### AC-XDR-002: Review Stats
- Average rating
- Total reviews count
- Rating breakdown

#### AC-XDR-003: Review List
- Paginated reviews
- Filter by rating

### 5.2 API Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/web/expertise/:expertiseId/reviews` | Get expertise reviews |

---

## 6. Job Detail Page Reviews

**Location**: Web Public > Job Detail
**File**: `projects/web/src/app/features/jobs/pages/job-detail/`

### 6.1 Requirements

#### AC-JDR-001: Add Reviews Section
- Title: "About the Client"
- Show client hub's review summary
- Link to view full hub reviews

#### AC-JDR-002: Client Hub Stats
- Average rating from contract reviews
- Number of contracts completed
- Recent review snippets (2-3)

### 6.2 API Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/web/hubs/:hubId/reviews/summary` | Get hub review summary |

---

## 7. Shared Components

### 7.1 Existing Components (Reuse)

| Component | Location | Purpose |
|-----------|----------|---------|
| `ReviewCardComponent` | `app/shared/components/review/review-card/` | Display single review |
| `ContractReviewDialogComponent` | `app/shared/components/review/contract-review-dialog/` | Contract review form |
| `ReviewStatsComponent` | `app/shared/components/review/review-stats/` | Review statistics |
| `StarRatingComponent` | `app/shared/components/review/star-rating/` | Star display |
| `StarRatingInputComponent` | `app/shared/components/review/star-rating-input/` | Star input |

### 7.2 New Components Needed

| Component | Purpose |
|-----------|---------|
| `BookingReviewDialogComponent` | Booking review form (simpler than contract) |
| `ExpertiseReviewsComponent` | Expertise page reviews section |
| `HubReviewsTabComponent` | Hub detail reviews tab |
| `ReviewFilterComponent` | Reusable rating filter tabs |
| `BookingDetailPageComponent` | Full booking detail page (learner) |

---

## 8. Data Test IDs

### Contract Detail Reviews Tab
```
data-testid="contract-reviews-tab"
data-testid="contract-reviews-section"
data-testid="contract-review-card-{id}"
data-testid="contract-write-review-btn"
data-testid="contract-review-reply-btn"
```

### Booking Detail Reviews Section
```
data-testid="booking-review-section"
data-testid="booking-review-card"
data-testid="booking-leave-review-btn"
data-testid="booking-edit-review-btn"
data-testid="booking-delete-review-btn"
data-testid="booking-hub-reply"
```

### Hub Detail Reviews Tab
```
data-testid="hub-reviews-tab"
data-testid="hub-reviews-stats"
data-testid="hub-reviews-filter"
data-testid="hub-reviews-list"
data-testid="hub-review-card-{id}"
```

### Experience/Expertise Reviews
```
data-testid="experience-reviews-section"
data-testid="experience-reviews-stats"
data-testid="experience-reviews-filter"
data-testid="experience-review-card-{id}"
data-testid="expertise-reviews-section"
data-testid="expertise-reviews-stats"
data-testid="expertise-review-card-{id}"
```

---

## 9. Implementation Tasks

### Phase 1: Booking Detail Page (Priority)
1. Create `booking-detail.page.ts` with routing
2. Create `BookingReviewDialogComponent`
3. Implement review display/actions
4. Add data-testid attributes
5. Write E2E tests

### Phase 2: Contract Detail Reviews Tab
1. Add Reviews tab to contract header
2. Create reviews tab content component
3. Integrate `ContractReviewDialogComponent`
4. Implement reply functionality
5. Add data-testid attributes
6. Write E2E tests

### Phase 3: Hub Detail Reviews Tab
1. Create `HubReviewsTabComponent`
2. Add aggregation API call
3. Implement filters
4. Add data-testid attributes
5. Write E2E tests

### Phase 4: Experience Reviews API Connection
1. Update `experience-reviews.component.ts`
2. Replace mock data with API
3. Add loading/error states
4. Write E2E tests

### Phase 5: Expertise Reviews Section
1. Create `ExpertiseReviewsComponent`
2. Add to expertise detail page
3. Connect to API
4. Write E2E tests

### Phase 6: Job Detail Client Reviews
1. Add "About the Client" section
2. Show hub review summary
3. Write E2E tests

---

## 10. Acceptance Criteria Summary

| Section | AC Count | Description |
|---------|----------|-------------|
| Contract Detail Reviews | 6 | AC-CDR-001 to AC-CDR-006 |
| Booking Detail Reviews | 6 | AC-BDR-001 to AC-BDR-006 |
| Hub Detail Reviews | 5 | AC-HDR-001 to AC-HDR-005 |
| Experience Detail Reviews | 4 | AC-EDR-001 to AC-EDR-004 |
| Expertise Detail Reviews | 3 | AC-XDR-001 to AC-XDR-003 |
| Job Detail Reviews | 2 | AC-JDR-001 to AC-JDR-002 |
| **Total** | **26** | |

---

## 11. Dependencies

### Backend (Already Complete)
- ✅ BookingReview model and service
- ✅ ContractReview model and service
- ✅ Review aggregation service
- ✅ Hub reviews endpoint
- ✅ Experience/Expertise reviews endpoints

### Frontend (Existing)
- ✅ `ContractReviewDialogComponent`
- ✅ `ReviewCardComponent`
- ✅ `StarRatingComponent`
- ✅ `StarRatingInputComponent`
- ✅ `ReviewStatsComponent`

### Frontend (To Create)
- ❌ `BookingDetailPageComponent`
- ❌ `BookingReviewDialogComponent`
- ❌ `ExpertiseReviewsComponent`
- ❌ `HubReviewsTabComponent`
- ❌ Contract Reviews Tab integration

---

_Last updated: 2025-02-25_
