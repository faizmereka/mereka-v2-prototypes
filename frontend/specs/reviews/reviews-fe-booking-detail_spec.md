---
title: Booking Detail Page with Reviews
type: feature_spec
status: draft
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-24'
depends_on:
- specs/reviews/reviews-fe-overview_spec.md
- specs/reviews/reviews-fe-components_spec.md
links:
  related_specs:
  - specs/reviews/reviews-booking-api_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

Booking detail page for learners to view their booking information and write reviews for completed bookings.

## Key Features

- View booking details (service, date, tickets, payment)
- View participants
- Write review for completed booking
- Edit/delete existing review
- Cancel upcoming booking

---

# Agent Contract

## Scope

## Non-goals

- Hub response to reviews (simplified from v1)
- Review reporting/flagging
- Photo editing/cropping within dialog

## In Scope

- Booking detail page (learner side)
- Review section within booking detail
- Create/edit/delete review flow
- Hub booking detail page (view review only)

### Out of Scope

- Public review pages (separate spec)
- Admin review management (separate spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Learner Booking Detail Page

- [ ] AC-BD-001: Route MUST be `/dashboard/bookings/:bookingId`
- [ ] AC-BD-002: Page MUST show service info (name, image, type)
- [ ] AC-BD-003: Page MUST show hub info (name, logo)
- [ ] AC-BD-004: Page MUST show booking date and time
- [ ] AC-BD-005: Page MUST show location (or "Online" for virtual)
- [ ] AC-BD-006: Page MUST show booking status badge
- [ ] AC-BD-007: Page MUST show tickets with quantities and prices
- [ ] AC-BD-008: Page MUST show total paid amount
- [ ] AC-BD-009: Page MUST show participants list
- [ ] AC-BD-010: Page MUST have back button to bookings list

### Review Section (Learner)

- [ ] AC-BD-020: Review section MUST show if booking status is `completed`
- [ ] AC-BD-021: If no review exists, MUST show "Write a Review" button
- [ ] AC-BD-022: If review exists, MUST show the review with rating, content, photos
- [ ] AC-BD-023: If review exists, MUST show "Edit Review" button
- [ ] AC-BD-024: "Edit Review" MUST be hidden if review > 30 days old
- [ ] AC-BD-025: Clicking "Write a Review" MUST open ReviewDialog
- [ ] AC-BD-026: Clicking "Edit Review" MUST open ReviewDialog with pre-filled data
- [ ] AC-BD-027: After saving review, page MUST refresh to show new review

### Create Review Flow

- [ ] AC-BD-030: ReviewDialog MUST show star rating input (1-5)
- [ ] AC-BD-031: ReviewDialog MUST show textarea for review content
- [ ] AC-BD-032: ReviewDialog MUST show character count (25-2000)
- [ ] AC-BD-033: ReviewDialog MUST validate minimum 25 characters
- [ ] AC-BD-034: ReviewDialog MUST allow adding up to 5 photos
- [ ] AC-BD-035: Submit button MUST be disabled until valid
- [ ] AC-BD-036: On submit, MUST show loading state
- [ ] AC-BD-037: On success, MUST close dialog and refresh review
- [ ] AC-BD-038: On error, MUST show error message

### Edit Review Flow

- [ ] AC-BD-040: Edit dialog MUST pre-fill existing rating
- [ ] AC-BD-041: Edit dialog MUST pre-fill existing content
- [ ] AC-BD-042: Edit dialog MUST show existing photos
- [ ] AC-BD-043: User MUST be able to change rating
- [ ] AC-BD-044: User MUST be able to update content
- [ ] AC-BD-045: User MUST be able to add/remove photos

### Delete Review

- [ ] AC-BD-050: Review section MUST have delete option (menu or button)
- [ ] AC-BD-051: Delete MUST show confirmation dialog
- [ ] AC-BD-052: On confirm, MUST delete review and refresh page
- [ ] AC-BD-053: After delete, MUST show "Write a Review" button again

### Cancel Booking (Upcoming)

- [ ] AC-BD-060: Cancel button MUST show for UPCOMING bookings only
- [ ] AC-BD-061: Cancel MUST show confirmation dialog with reason input
- [ ] AC-BD-062: On confirm, MUST call cancel API and refresh

### Hub Booking Detail Page

- [ ] AC-BD-070: Route MUST be `/hub/:hubId/bookings/:bookingId`
- [ ] AC-BD-071: Page MUST show same booking info as learner
- [ ] AC-BD-072: Page MUST show booker contact info
- [ ] AC-BD-073: Review section MUST show learner's review (read-only)
- [ ] AC-BD-074: Hub CANNOT respond to review

---

## UI Design

### Learner Booking Detail

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to Bookings                              Booking #ABC123     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [Service Image]                                                  │ │
│ │                                                                  │ │
│ │ Python Masterclass                                               │ │
│ │ by Code Academy                                                  │ │
│ │                                                                  │ │
│ │ 📅 Saturday, February 20, 2026 • 10:00 AM - 12:00 PM            │ │
│ │ 📍 Level 10, Menara XYZ, Kuala Lumpur                           │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ BOOKING STATUS                                                   │ │
│ │                                                                  │ │
│ │ Status: ● COMPLETED                                              │ │
│ │                                                                  │ │
│ │ ┌───────────────────────────────────────────────────────┐       │ │
│ │ │ Tickets                                               │       │ │
│ │ │ 2× Standard Ticket                        RM 50/each  │       │ │
│ │ │                                                       │       │ │
│ │ │ Total Paid                                    RM 100  │       │ │
│ │ └───────────────────────────────────────────────────────┘       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ PARTICIPANTS                                                     │ │
│ │                                                                  │ │
│ │ 👤 John Doe (john@example.com) - Standard                       │ │
│ │ 👤 Jane Doe (jane@example.com) - Standard                       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ YOUR REVIEW                                                      │ │
│ │                                                                  │ │
│ │ (If no review)                                                   │ │
│ │ Share your experience with others!                               │ │
│ │                                        [Write a Review]          │ │
│ │                                                                  │ │
│ │ ──────────────────────────────────────────────────────────────  │ │
│ │                                                                  │ │
│ │ (If has review)                                                  │ │
│ │ ★★★★★ 5/5                                                       │ │
│ │                                                                  │ │
│ │ "Amazing experience! The host was very knowledgeable and        │ │
│ │  explained everything clearly. Highly recommended!"              │ │
│ │                                                                  │ │
│ │ 📷 [img] [img]                                                   │ │
│ │                                                                  │ │
│ │ Posted on Feb 24, 2026                      [Edit] [Delete]      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [Contact Hub]                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Review Dialog

```
┌─────────────────────────────────────────────────────────────────────┐
│ Write a Review                                               [×]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ How would you rate this experience?                                 │
│                                                                     │
│            ☆     ☆     ☆     ☆     ☆                               │
│          (Click to rate 1-5 stars)                                  │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ Share your experience                                               │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                                                                 │ │
│ │ Tell others about your experience with this service...          │ │
│ │                                                                 │ │
│ │                                                                 │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ Minimum 25 characters                                    15/2000    │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ Add photos (optional)                                               │
│ ┌─────┐ ┌─────┐ ┌─────┐                                            │
│ │ +   │ │     │ │     │  Max 5 photos                              │
│ └─────┘ └─────┘ └─────┘                                            │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ [Cancel]                                         [Submit Review]    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

| File | Description |
|------|-------------|
| `user-dashboard/pages/booking-detail/booking-detail.component.ts` | Main component |
| `user-dashboard/pages/booking-detail/booking-detail.component.html` | Template |
| `user-dashboard/services/booking-detail.service.ts` | API service |

## Files to Modify

| File | Change |
|------|--------|
| `user-dashboard/user-dashboard.routes.ts` | Add booking detail route |
| `user-dashboard/pages/bookings/bookings.component.ts` | Wire up navigation |

---

## Component Structure

```typescript
// booking-detail.component.ts

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StarRatingComponent,
    ReviewDialogComponent,
    // ...
  ],
  templateUrl: './booking-detail.component.html',
})
export class BookingDetailComponent implements OnInit {
  // State
  readonly booking = signal<UserBooking | null>(null);
  readonly review = signal<BookingReview | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showReviewDialog = signal(false);
  readonly showDeleteConfirm = signal(false);

  // Computed
  readonly canReview = computed(() => {
    const b = this.booking();
    return b?.status === 'past' && !this.review();
  });

  readonly canEditReview = computed(() => {
    const r = this.review();
    if (!r) return false;
    const daysSinceCreated = dayjs().diff(dayjs(r.createdAt), 'day');
    return daysSinceCreated <= 30;
  });

  // Methods
  ngOnInit(): void;
  loadBooking(bookingId: string): Promise<void>;
  loadReview(): Promise<void>;
  openReviewDialog(): void;
  onReviewSaved(review: BookingReview): void;
  confirmDelete(): void;
  deleteReview(): Promise<void>;
}
```

---

## API Integration

```typescript
// booking-detail.service.ts

@Injectable({ providedIn: 'root' })
export class BookingDetailService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  async getBooking(bookingId: string): Promise<UserBooking> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<UserBooking>>(
        `${this.apiUrl}/me/bookings/${bookingId}`,
        { withCredentials: true }
      )
    );
    if (!response.success) throw new Error(response.error?.message);
    return response.data!;
  }

  async getReview(bookingId: string): Promise<BookingReview | null> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<BookingReview | null>>(
        `${this.apiUrl}/user/bookings/${bookingId}/review`,
        { withCredentials: true }
      )
    );
    return response.data ?? null;
  }

  async createReview(data: CreateReviewInput): Promise<BookingReview> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<BookingReview>>(
        `${this.apiUrl}/user/reviews`,
        data,
        { withCredentials: true }
      )
    );
    if (!response.success) throw new Error(response.error?.message);
    return response.data!;
  }

  async updateReview(reviewId: string, data: UpdateReviewInput): Promise<BookingReview> {
    const response = await firstValueFrom(
      this.http.put<ApiResponse<BookingReview>>(
        `${this.apiUrl}/user/reviews/${reviewId}`,
        data,
        { withCredentials: true }
      )
    );
    if (!response.success) throw new Error(response.error?.message);
    return response.data!;
  }

  async deleteReview(reviewId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<ApiResponse<void>>(
        `${this.apiUrl}/user/reviews/${reviewId}`,
        { withCredentials: true }
      )
    );
  }
}
```

---

## Edge Cases

- Booking not found: Show 404 page
- API error loading booking: Show error state with retry button
- Booking cancelled: Still show details but disable review section
- Review API fails: Show error toast, keep dialog open
- Photo upload fails: Show error, allow removing failed photo
- Network timeout: Show timeout error with retry option

## Observability

- Track page views
- Log review creation/edit/delete events
- Monitor review submission success rate
- Track photo upload success rate

## Rollout & Rollback

- Feature flag: `REVIEWS_BOOKING_DETAIL_ENABLED` controls review section visibility
- Rollback: Disable flag, review section hidden
- No data migrations needed

## Open Questions

- None at this time

---

## Verification

### Automated Tests

```bash
# Test file: projects/app/src/app/features/user-dashboard/pages/booking-detail/booking-detail.component.spec.ts
# @covers AC-BD-001 through AC-BD-074
```

### Manual Verification

1. Navigate to booking detail from list
2. Verify all booking info displays correctly
3. Write review for completed booking
4. Edit existing review
5. Delete review
6. Verify review section updates correctly
7. Test on mobile viewport
