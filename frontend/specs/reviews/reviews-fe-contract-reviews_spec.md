---
title: Contract Reviews Frontend
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
  - specs/reviews/reviews-contract-api_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

Contract review UI for the hub dashboard - allowing both Client Hub and Expert Hub to review each other after contract completion.

## Key Features

- Review section in contract detail page
- Write review for other party
- View review received from other party
- Criteria-based ratings (quality, communication, professionalism, timeliness)

---

# Agent Contract

## Scope

## Non-goals

- Review response/reply system (hub cannot respond)
- Review reporting/flagging (future enhancement)
- Bulk review operations

## In Scope

- Contract review section in contract detail page
- Contract review dialog
- Two-way review display
- Hub reviews page (all reviews received)

### Out of Scope

- Contract detail page structure (already exists)
- Booking reviews (separate spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Contract Review Section

- [ ] AC-CV-001: Review section MUST appear after "Milestones" or "Timelogs" tab
- [ ] AC-CV-002: Review section MUST only show if contract status is `completed`
- [ ] AC-CV-003: Section MUST show "Write a Review" if user hasn't reviewed yet
- [ ] AC-CV-004: Section MUST show user's review if already submitted
- [ ] AC-CV-005: Section MUST show other party's review (if received)
- [ ] AC-CV-006: Section MUST clearly label "Your Review" vs "Their Review"
- [ ] AC-CV-007: User MUST be able to edit their review (within 30 days)

### Contract Review Dialog

- [ ] AC-CV-010: Dialog MUST show who is being reviewed (hub name + logo)
- [ ] AC-CV-011: Dialog MUST have overall star rating (1-5)
- [ ] AC-CV-012: Dialog MUST have 4 criteria ratings:
  - Quality of work/requirements
  - Communication
  - Professionalism
  - Timeliness
- [ ] AC-CV-013: Each criteria MUST have label and star rating
- [ ] AC-CV-014: Dialog MUST have textarea (25-1000 chars)
- [ ] AC-CV-015: All fields MUST be required
- [ ] AC-CV-016: Submit MUST be disabled until all fields valid
- [ ] AC-CV-017: On submit, MUST show loading state
- [ ] AC-CV-018: On success, MUST close and refresh review section

### Review Display (Contract)

- [ ] AC-CV-020: Each review MUST show overall rating
- [ ] AC-CV-021: Each review MUST show criteria breakdown
- [ ] AC-CV-022: Each review MUST show review content
- [ ] AC-CV-023: Each review MUST show date posted
- [ ] AC-CV-024: Each review MUST show "Edited" if applicable
- [ ] AC-CV-025: User's own review MUST have Edit button
- [ ] AC-CV-026: Other party's review MUST be read-only

### Hub Reviews Page

- [ ] AC-CV-030: Page MUST be accessible at `/hub/:hubId/reviews`
- [ ] AC-CV-031: Page MUST show all reviews received by hub
- [ ] AC-CV-032: Page MUST filter by type: Booking, Contract, All
- [ ] AC-CV-033: Page MUST show aggregate stats
- [ ] AC-CV-034: Reviews MUST be paginated
- [ ] AC-CV-035: Reviews MUST be sortable (newest, highest, lowest)

---

## UI Design

### Contract Detail - Review Section

```
┌─────────────────────────────────────────────────────────────────────┐
│ CONTRACT REVIEWS                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ (If can review - contract completed, hasn't reviewed)              │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 💬 How was your experience working with [Expert Solutions]?    │ │
│ │                                                                 │ │
│ │ Your feedback helps others make informed decisions.            │ │
│ │                                                                 │ │
│ │                                        [Write a Review]         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ YOUR REVIEW                                            [Edit]       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Overall: ★★★★★ 5/5                                              │ │
│ │                                                                 │ │
│ │ Quality          ★★★★★     Communication  ★★★★☆                 │ │
│ │ Professionalism  ★★★★★     Timeliness     ★★★★★                 │ │
│ │                                                                 │ │
│ │ "Excellent work! The expert delivered high-quality results on  │ │
│ │  time. Communication was clear throughout the project."        │ │
│ │                                                                 │ │
│ │ Posted on Feb 24, 2026                                          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ REVIEW FROM EXPERT SOLUTIONS                                        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [Logo] Expert Solutions                                         │ │
│ │                                                                 │ │
│ │ Overall: ★★★★★ 5/5                                              │ │
│ │                                                                 │ │
│ │ Quality          ★★★★★     Communication  ★★★★★                 │ │
│ │ Professionalism  ★★★★★     Timeliness     ★★★★☆                 │ │
│ │                                                                 │ │
│ │ "Great client to work with! Clear requirements and timely      │ │
│ │  feedback. Would love to work together again."                  │ │
│ │                                                                 │ │
│ │ Posted on Feb 25, 2026                                          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Contract Review Dialog

```
┌─────────────────────────────────────────────────────────────────────┐
│ Write a Review                                               [×]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ How was your experience working with:                               │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [Logo] Expert Solutions                                         │ │
│ │        Web Development Project                                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ OVERALL RATING *                                                    │
│            ☆     ☆     ☆     ☆     ☆                               │
│          (Click to rate 1-5 stars)                                  │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ DETAILED RATINGS *                                                  │
│                                                                     │
│ Quality of Work                    ☆ ☆ ☆ ☆ ☆                       │
│ Communication                      ☆ ☆ ☆ ☆ ☆                       │
│ Professionalism                    ☆ ☆ ☆ ☆ ☆                       │
│ Timeliness                         ☆ ☆ ☆ ☆ ☆                       │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ Your feedback *                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                                                                 │ │
│ │ Share your experience working with this hub...                  │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ Minimum 25 characters                                    10/1000    │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ [Cancel]                                         [Submit Review]    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Hub Reviews Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ Reviews                                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌───────────────────────────────────┬───────────────────────────┐  │
│ │         4.7                       │ ★★★★★ ████████████████ 45 │  │
│ │       out of 5                    │ ★★★★☆ ████████████  30    │  │
│ │                                   │ ★★★☆☆ ████  10            │  │
│ │     ★★★★☆                         │ ★★☆☆☆ ██  5              │  │
│ │   Based on 92 reviews             │ ★☆☆☆☆ █  2               │  │
│ └───────────────────────────────────┴───────────────────────────┘  │
│                                                                     │
│ [All Reviews] [Booking (70)] [Contract (22)]        [Sort: Newest]  │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 📄 Contract Review                                    ★★★★★ 5/5 │ │
│ │                                                                 │ │
│ │ From: Tech Corp                                                 │ │
│ │ Project: Web Development Project                                │ │
│ │                                                                 │ │
│ │ "Excellent work! Delivered on time with great quality..."      │ │
│ │                                                                 │ │
│ │ Quality ★★★★★  Communication ★★★★☆  Professionalism ★★★★★     │ │
│ │                                                                 │ │
│ │ Feb 24, 2026                                                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 📦 Booking Review                                     ★★★★☆ 4/5 │ │
│ │                                                                 │ │
│ │ From: John D.                                                   │ │
│ │ Service: Python Masterclass (Experience)                        │ │
│ │                                                                 │ │
│ │ "Good session but room was a bit crowded..."                   │ │
│ │                                                                 │ │
│ │ Feb 20, 2026                                                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [◀ Prev] Page 1 of 5 [Next ▶]                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

| File | Description |
|------|-------------|
| `hub-dashboard/pages/reviews/hub-reviews.component.ts` | Reviews list page |
| `hub-dashboard/pages/reviews/hub-reviews.component.html` | Template |
| `hub-dashboard/services/contract-review.service.ts` | Contract review API |

## Files to Modify

| File | Change |
|------|--------|
| `contract-details.component.ts` | Add review section signals |
| `contract-details.component.html` | Add review section UI |
| `hub-dashboard.routes.ts` | Add reviews route |

---

## Service Implementation

```typescript
// contract-review.service.ts

@Injectable({ providedIn: 'root' })
export class ContractReviewService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  async getContractReviews(contractId: string): Promise<ContractReviewsResponse> {
    const hubId = this.authState.selectedHub()?.id;
    const response = await firstValueFrom(
      this.http.get<ApiResponse<ContractReviewsResponse>>(
        `${environment.apiUrl}/hub/${hubId}/contracts/${contractId}/reviews`,
        { withCredentials: true }
      )
    );
    return response.data!;
  }

  async getReviewStatus(contractId: string): Promise<ReviewStatusResponse> {
    const hubId = this.authState.selectedHub()?.id;
    const response = await firstValueFrom(
      this.http.get<ApiResponse<ReviewStatusResponse>>(
        `${environment.apiUrl}/hub/${hubId}/contracts/${contractId}/review-status`,
        { withCredentials: true }
      )
    );
    return response.data!;
  }

  async createContractReview(
    contractId: string,
    data: CreateContractReviewInput
  ): Promise<ContractReview> {
    const hubId = this.authState.selectedHub()?.id;
    const response = await firstValueFrom(
      this.http.post<ApiResponse<ContractReview>>(
        `${environment.apiUrl}/hub/${hubId}/contracts/${contractId}/reviews`,
        data,
        { withCredentials: true }
      )
    );
    return response.data!;
  }

  async updateContractReview(
    contractId: string,
    reviewId: string,
    data: UpdateContractReviewInput
  ): Promise<ContractReview> {
    const hubId = this.authState.selectedHub()?.id;
    const response = await firstValueFrom(
      this.http.put<ApiResponse<ContractReview>>(
        `${environment.apiUrl}/hub/${hubId}/contracts/${contractId}/reviews/${reviewId}`,
        data,
        { withCredentials: true }
      )
    );
    return response.data!;
  }
}
```

---

## Edge Cases

- Contract not completed: Hide review section entirely
- Review API fails: Show error toast, keep dialog open
- Other party hasn't reviewed: Show "Awaiting review" state
- Edit after 30 days: Disable edit button, show tooltip explaining why
- Both parties submit simultaneously: Both succeed (handled by backend)
- Hub deleted after review: Show review with "Hub no longer exists" note

## Observability

- Track review section visibility
- Log review creation/edit events
- Monitor criteria rating patterns
- Track time between contract completion and review

## Rollout & Rollback

- Feature flag: `REVIEWS_CONTRACT_UI_ENABLED` controls review section visibility
- Rollback: Disable flag, review section hidden in contract detail
- No data migrations needed

## Open Questions

- None at this time

---

## Verification

### Automated Tests

```bash
# Test file: projects/app/src/app/features/hub-dashboard/services/contract-review.service.spec.ts
# Test file: projects/app/src/app/features/hub-dashboard/pages/reviews/hub-reviews.component.spec.ts
```

### Manual Verification

1. Complete a contract
2. Write review as client hub
3. Write review as expert hub
4. View both reviews on contract detail
5. Edit review within 30 days
6. View hub reviews page
7. Filter by review type
