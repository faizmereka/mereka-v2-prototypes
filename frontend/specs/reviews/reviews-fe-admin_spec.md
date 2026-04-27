---
title: Admin Reviews Frontend
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
  - specs/reviews/reviews-admin-api_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

Admin dashboard for managing and moderating reviews across the platform.

## Key Features

- View all booking reviews
- View all contract reviews
- Combined review list with filters
- Review detail modal
- Moderation actions (hide/unhide/delete)
- Review statistics dashboard

---

# Agent Contract

## Scope

## Non-goals

- Automated content moderation (manual only)
- Bulk moderation actions (one review at a time)
- Review editing by admin (can only hide/delete)
- Real-time review notifications (batch refresh only)

## In Scope

- Admin reviews list page (all reviews)
- Admin booking reviews list
- Admin contract reviews list
- Review detail dialog
- Moderation confirmation dialogs
- Review statistics widgets

### Out of Scope

- User review creation (learner side)
- Hub review creation (contract reviews)
- Public review display

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Reviews List Page

- [ ] AC-AR-001: Page MUST be accessible at `/admin/reviews`
- [ ] AC-AR-002: Page MUST have tabs: All Reviews, Booking Reviews, Contract Reviews
- [ ] AC-AR-003: Page MUST display review table with columns:
  - Type (booking/contract icon)
  - Rating (stars)
  - Reviewer name
  - Content preview
  - Date
  - Status
  - Actions
- [ ] AC-AR-004: Page MUST support filtering by:
  - Status (active, hidden, deleted, all)
  - Rating (1-5)
  - Date range
  - Hub
  - Search text
- [ ] AC-AR-005: Page MUST support sorting (newest, oldest, highest, lowest)
- [ ] AC-AR-006: Page MUST support pagination
- [ ] AC-AR-007: Each row MUST have actions menu (view, hide, unhide, delete)

### Booking Reviews Tab

- [ ] AC-AR-010: Tab MUST show booking reviews only
- [ ] AC-AR-011: MUST show service name and type (experience/expertise)
- [ ] AC-AR-012: MUST show hub name being reviewed
- [ ] AC-AR-013: MUST show reviewer name and email
- [ ] AC-AR-014: MUST filter by service type (experience, expertise)

### Contract Reviews Tab

- [ ] AC-AR-020: Tab MUST show contract reviews only
- [ ] AC-AR-021: MUST show reviewer hub name
- [ ] AC-AR-022: MUST show reviewee hub name
- [ ] AC-AR-023: MUST show review direction (Client→Expert or Expert→Client)
- [ ] AC-AR-024: MUST show job title
- [ ] AC-AR-025: MUST show criteria ratings breakdown

### Review Detail Dialog

- [ ] AC-AR-030: Dialog MUST open on row click or "View" action
- [ ] AC-AR-031: Dialog MUST show full review content
- [ ] AC-AR-032: Dialog MUST show rating (overall + criteria for contracts)
- [ ] AC-AR-033: Dialog MUST show photos if present (for booking reviews)
- [ ] AC-AR-034: Dialog MUST show reviewer details
- [ ] AC-AR-035: Dialog MUST show review date and edited status
- [ ] AC-AR-036: Dialog MUST show current status with badge
- [ ] AC-AR-037: Dialog MUST have moderation actions
- [ ] AC-AR-038: For booking reviews, MUST show service and booking info
- [ ] AC-AR-039: For contract reviews, MUST show job and contract info

### Moderation Actions

- [ ] AC-AR-040: "Hide Review" MUST show confirmation dialog
- [ ] AC-AR-041: Hide confirmation MUST require reason input
- [ ] AC-AR-042: "Unhide Review" MUST show confirmation dialog
- [ ] AC-AR-043: "Delete Review" MUST show confirmation dialog
- [ ] AC-AR-044: Delete confirmation MUST warn about permanent action
- [ ] AC-AR-045: On action success, MUST refresh list and show toast
- [ ] AC-AR-046: On action error, MUST show error toast

### Review Statistics

- [ ] AC-AR-050: Stats MUST show on dashboard or reviews page header
- [ ] AC-AR-051: Stats MUST include total booking reviews
- [ ] AC-AR-052: Stats MUST include total contract reviews
- [ ] AC-AR-053: Stats MUST include combined total
- [ ] AC-AR-054: Stats MUST include average rating
- [ ] AC-AR-055: Stats MUST include rating distribution chart
- [ ] AC-AR-056: Stats MUST include status breakdown (active, hidden, deleted)
- [ ] AC-AR-057: Stats MUST include reviews trend (by month)

---

## UI Design

### Reviews List Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ Reviews                                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Total Reviews    Avg Rating    Booking    Contract    Hidden    │ │
│ │     1,850          4.3          1,500        350         80     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [All Reviews] [Booking Reviews] [Contract Reviews]                  │
│                                                                     │
│ Filters: [Status ▼] [Rating ▼] [Date Range] [Hub ▼] [Search...]   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ ┌───────┬────────┬─────────────────┬───────────────┬────────┬────┐ │
│ │ Type  │ Rating │ Reviewer        │ Content       │ Date   │ ⋮  │ │
│ ├───────┼────────┼─────────────────┼───────────────┼────────┼────┤ │
│ │ 📦    │ ★★★★★  │ John Doe        │ Amazing...    │ Feb 24 │ ⋮  │ │
│ │       │        │ john@email.com  │               │        │    │ │
│ ├───────┼────────┼─────────────────┼───────────────┼────────┼────┤ │
│ │ 📄    │ ★★★★☆  │ Tech Corp       │ Great work... │ Feb 23 │ ⋮  │ │
│ │       │        │ → Dev Solutions │               │        │    │ │
│ ├───────┼────────┼─────────────────┼───────────────┼────────┼────┤ │
│ │ 📦    │ ★★☆☆☆  │ Jane Smith      │ Could be...   │ Feb 22 │ ⋮  │ │
│ │ ⚠️    │        │ jane@email.com  │               │ HIDDEN │    │ │
│ └───────┴────────┴─────────────────┴───────────────┴────────┴────┘ │
│                                                                     │
│ Showing 1-20 of 1,850 reviews                                       │
│                                                                     │
│ [◀ Prev] Page 1 of 93 [Next ▶]                                     │
└─────────────────────────────────────────────────────────────────────┘

Legend: 📦 = Booking Review, 📄 = Contract Review, ⚠️ = Hidden/Moderated
```

### Booking Reviews Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ Booking Reviews                                          [Export ▼] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ [Experience (1,200)] [Expertise (300)]                              │
│                                                                     │
│ Filters: [Status ▼] [Rating ▼] [Date Range] [Hub ▼] [Search...]   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ ┌────────┬────────┬───────────────┬────────────┬────────┬────────┐ │
│ │ Rating │ Review │ Service       │ Hub        │ Date   │ Status │ │
│ ├────────┼────────┼───────────────┼────────────┼────────┼────────┤ │
│ │ ★★★★★  │ John D │ Python Master │ Code Acad  │ Feb 24 │ Active │ │
│ │        │ Amazi… │ (Experience)  │            │        │        │ │
│ ├────────┼────────┼───────────────┼────────────┼────────┼────────┤ │
│ │ ★★★★☆  │ Jane S │ Career Coach  │ Pro Coach  │ Feb 23 │ Active │ │
│ │        │ Very … │ (Expertise)   │            │        │        │ │
│ └────────┴────────┴───────────────┴────────────┴────────┴────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Contract Reviews Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ Contract Reviews                                         [Export ▼] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Filters: [Status ▼] [Rating ▼] [Date Range] [Hub ▼] [Search...]   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ ┌────────┬────────────────────────┬────────────┬────────┬────────┐ │
│ │ Rating │ Direction              │ Job        │ Date   │ Status │ │
│ ├────────┼────────────────────────┼────────────┼────────┼────────┤ │
│ │ ★★★★★  │ Tech Corp → DevSol    │ Web Dev    │ Feb 24 │ Active │ │
│ │        │ (Client → Expert)      │ Project    │        │        │ │
│ │        │ Q:5 C:5 P:4 T:5        │            │        │        │ │
│ ├────────┼────────────────────────┼────────────┼────────┼────────┤ │
│ │ ★★★★☆  │ DevSol → Tech Corp    │ Web Dev    │ Feb 24 │ Active │ │
│ │        │ (Expert → Client)      │ Project    │        │        │ │
│ │        │ Q:4 C:4 P:5 T:4        │            │        │        │ │
│ └────────┴────────────────────────┴────────────┴────────┴────────┘ │
│                                                                     │
│ Q=Quality, C=Communication, P=Professionalism, T=Timeliness        │
└─────────────────────────────────────────────────────────────────────┘
```

### Review Detail Dialog (Booking)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Review Details                                              [×]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Type: 📦 Booking Review (Experience)                                │
│ Status: ● Active                                                    │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ REVIEW                                                              │
│                                                                     │
│ Rating: ★★★★★ 5/5                                                   │
│                                                                     │
│ "Amazing experience! The host was very knowledgeable and helped    │
│ me understand Python concepts clearly. The venue was comfortable    │
│ and everything was well-organized. Would definitely recommend       │
│ this to anyone interested in learning Python."                      │
│                                                                     │
│ 📷 [img] [img] [img]                                                │
│                                                                     │
│ Posted: Feb 24, 2026 10:30 AM                                       │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ REVIEWER                                                            │
│                                                                     │
│ 👤 John Doe                                                         │
│ ✉️  john.doe@example.com                                            │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ SERVICE & BOOKING                                                   │
│                                                                     │
│ Service: Python Masterclass (Experience)                            │
│ Hub: Code Academy                                                   │
│ Booking Date: Feb 20, 2026                                          │
│ Booking ID: #BK-2026-0001234                                        │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ MODERATION                                                          │
│                                                                     │
│ [Hide Review]                              [Delete Review]          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Review Detail Dialog (Contract)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Review Details                                              [×]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Type: 📄 Contract Review                                            │
│ Direction: Client → Expert                                          │
│ Status: ● Active                                                    │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ RATINGS                                                             │
│                                                                     │
│ Overall: ★★★★★ 5/5                                                  │
│                                                                     │
│ Quality of Work      ★★★★★  5/5                                     │
│ Communication        ★★★★☆  4/5                                     │
│ Professionalism      ★★★★★  5/5                                     │
│ Timeliness           ★★★★★  5/5                                     │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ REVIEW CONTENT                                                      │
│                                                                     │
│ "Excellent work on the web development project! The team was        │
│ very professional and delivered high-quality code. Communication    │
│ could have been slightly more frequent, but overall a great         │
│ experience working together."                                       │
│                                                                     │
│ Posted: Feb 24, 2026 10:30 AM                                       │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ PARTIES                                                             │
│                                                                     │
│ Reviewer (Client): Tech Corp                                        │
│ Reviewee (Expert): Dev Solutions                                    │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ JOB & CONTRACT                                                      │
│                                                                     │
│ Job: Web Development Project                                        │
│ Contract ID: #CT-2026-0000456                                       │
│ Contract Status: Completed                                          │
│ Completion Date: Feb 20, 2026                                       │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ MODERATION                                                          │
│                                                                     │
│ [Hide Review]                              [Delete Review]          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Moderation Confirmation Dialog

```
┌─────────────────────────────────────────────────────────────────────┐
│ Hide Review                                                 [×]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Are you sure you want to hide this review?                          │
│                                                                     │
│ Hidden reviews will not be visible to users but can be restored.    │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ Reason for hiding *                                                 │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [Inappropriate content           ▼]                             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Additional notes (optional)                                         │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                                                                 │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ [Cancel]                                         [Hide Review]      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Reason options:
- Inappropriate content
- Contains personal information
- Fake/spam review
- Offensive language
- Irrelevant to service
- Other
```

### Review Statistics Widget

```
┌─────────────────────────────────────────────────────────────────────┐
│ Review Statistics                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│ │    1,850    │ │    4.3      │ │    1,500    │ │     350     │    │
│ │   Total     │ │  Avg Rating │ │   Booking   │ │   Contract  │    │
│ │  Reviews    │ │     ★★★★☆   │ │   Reviews   │ │   Reviews   │    │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │
│                                                                     │
│ ┌───────────────────────────────┬───────────────────────────────┐  │
│ │ Rating Distribution           │ Status Breakdown              │  │
│ ├───────────────────────────────┼───────────────────────────────┤  │
│ │ 5★ ████████████████████ 920   │ ● Active    1,750 (94.6%)    │  │
│ │ 4★ ████████████  600          │ ● Hidden       80 (4.3%)     │  │
│ │ 3★ ████  200                  │ ● Deleted      20 (1.1%)     │  │
│ │ 2★ ██  80                     │                               │  │
│ │ 1★ █  50                      │                               │  │
│ └───────────────────────────────┴───────────────────────────────┘  │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Reviews Trend (Last 12 Months)                                  │ │
│ │                                                                 │ │
│ │  180 ─┼─────────────────────────────────────────────────────   │ │
│ │       │                 ╱╲                                     │ │
│ │  150 ─┼────────────────╱──╲────╱╲───────────────────────────   │ │
│ │       │      ╱╲       ╱    ╲  ╱  ╲  ╱╲                        │ │
│ │  120 ─┼─────╱──╲─────╱──────╲╱────╲╱──╲────────────────────   │ │
│ │       │    ╱    ╲   ╱                  ╲                       │ │
│ │   90 ─┼───╱──────╲─╱────────────────────╲──────────────────   │ │
│ │       │                                                        │ │
│ │       └───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───        │ │
│ │          Mar Apr May Jun Jul Aug Sep Oct Nov Dec Jan Feb       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

| File | Description |
|------|-------------|
| `pages/reviews/admin-reviews-list.component.ts` | Main reviews list page |
| `pages/reviews/admin-reviews-list.component.html` | List template |
| `pages/reviews/admin-review-detail-dialog.component.ts` | Review detail modal |
| `pages/reviews/admin-review-detail-dialog.component.html` | Detail template |
| `pages/reviews/admin-review-moderation-dialog.component.ts` | Moderation confirmation |
| `pages/reviews/admin-reviews-stats.component.ts` | Statistics widget |
| `services/admin-review.service.ts` | Admin review API service |

## Files to Modify

| File | Change |
|------|--------|
| `admin.routes.ts` | Add reviews route |
| `admin-sidebar.component.ts` | Add reviews menu item |

---

## Component Structure

```typescript
// admin-reviews-list.component.ts

@Component({
  selector: 'app-admin-reviews-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    // Table components
    // Filter components
    // Pagination
    AdminReviewDetailDialogComponent,
    AdminReviewModerationDialogComponent,
    AdminReviewsStatsComponent,
  ],
  templateUrl: './admin-reviews-list.component.html',
})
export class AdminReviewsListComponent implements OnInit {
  // State
  readonly reviews = signal<AdminReview[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly stats = signal<ReviewStats | null>(null);

  // Filters
  readonly activeTab = signal<'all' | 'booking' | 'contract'>('all');
  readonly filters = signal<ReviewFilters>({
    status: 'all',
    rating: null,
    dateFrom: null,
    dateTo: null,
    hubId: null,
    search: '',
  });

  // Pagination
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly total = signal(0);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));

  // Dialog state
  readonly selectedReview = signal<AdminReview | null>(null);
  readonly showDetailDialog = signal(false);
  readonly showModerationDialog = signal(false);
  readonly moderationAction = signal<'hide' | 'unhide' | 'delete'>('hide');

  // Methods
  ngOnInit(): void;
  loadReviews(): Promise<void>;
  loadStats(): Promise<void>;
  onTabChange(tab: 'all' | 'booking' | 'contract'): void;
  onFilterChange(filters: ReviewFilters): void;
  onPageChange(page: number): void;
  openDetailDialog(review: AdminReview): void;
  openModerationDialog(review: AdminReview, action: 'hide' | 'unhide' | 'delete'): void;
  onModerate(data: { action: string; reason?: string }): Promise<void>;
}
```

---

## Service Implementation

```typescript
// admin-review.service.ts

@Injectable({ providedIn: 'root' })
export class AdminReviewService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  async getAllReviews(options: AdminReviewListOptions): Promise<AdminReviewListResponse> {
    const params = this.buildQueryParams(options);
    const response = await firstValueFrom(
      this.http.get<ApiResponse<AdminReviewListResponse>>(
        `${this.apiUrl}/admin/reviews?${params}`,
        { withCredentials: true }
      )
    );
    return response.data!;
  }

  async getBookingReviews(options: AdminReviewListOptions): Promise<AdminReviewListResponse> {
    const params = this.buildQueryParams(options);
    const response = await firstValueFrom(
      this.http.get<ApiResponse<AdminReviewListResponse>>(
        `${this.apiUrl}/admin/reviews/bookings?${params}`,
        { withCredentials: true }
      )
    );
    return response.data!;
  }

  async getContractReviews(options: AdminReviewListOptions): Promise<AdminReviewListResponse> {
    const params = this.buildQueryParams(options);
    const response = await firstValueFrom(
      this.http.get<ApiResponse<AdminReviewListResponse>>(
        `${this.apiUrl}/admin/reviews/contracts?${params}`,
        { withCredentials: true }
      )
    );
    return response.data!;
  }

  async getReviewDetail(reviewId: string, type: 'booking' | 'contract'): Promise<ReviewDetail> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<ReviewDetail>>(
        `${this.apiUrl}/admin/reviews/${reviewId}?type=${type}`,
        { withCredentials: true }
      )
    );
    return response.data!;
  }

  async moderateReview(
    reviewId: string,
    action: 'hide' | 'unhide' | 'delete',
    reason?: string
  ): Promise<void> {
    await firstValueFrom(
      this.http.patch<ApiResponse<void>>(
        `${this.apiUrl}/admin/reviews/${reviewId}/moderate`,
        { action, reason },
        { withCredentials: true }
      )
    );
  }

  async getStats(): Promise<ReviewStats> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<ReviewStats>>(
        `${this.apiUrl}/admin/reviews/stats`,
        { withCredentials: true }
      )
    );
    return response.data!;
  }

  async getTrends(period: 'week' | 'month' | 'year'): Promise<ReviewTrends> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<ReviewTrends>>(
        `${this.apiUrl}/admin/reviews/trends?period=${period}`,
        { withCredentials: true }
      )
    );
    return response.data!;
  }

  private buildQueryParams(options: AdminReviewListOptions): string {
    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page.toString());
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.status && options.status !== 'all') params.set('status', options.status);
    if (options.rating) params.set('rating', options.rating.toString());
    if (options.dateFrom) params.set('dateFrom', options.dateFrom);
    if (options.dateTo) params.set('dateTo', options.dateTo);
    if (options.hubId) params.set('hubId', options.hubId);
    if (options.search) params.set('search', options.search);
    if (options.sort) params.set('sort', options.sort);
    if (options.serviceType) params.set('serviceType', options.serviceType);
    return params.toString();
  }
}
```

---

## Interfaces

```typescript
// Admin review types

export interface AdminReview {
  _id: string;
  reviewType: 'booking' | 'contract';
  rating: number;
  content: string;
  status: 'active' | 'hidden' | 'deleted';
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;

  // For booking reviews
  photos?: string[];
  reviewer?: {
    _id: string;
    name: string;
    email: string;
  };
  service?: {
    _id: string;
    name: string;
    type: 'experience' | 'expertise';
  };
  hub?: {
    _id: string;
    name: string;
  };
  booking?: {
    _id: string;
    bookingDate: string;
  };

  // For contract reviews
  criteriaRatings?: {
    quality: number;
    communication: number;
    professionalism: number;
    timeliness: number;
  };
  reviewerHub?: {
    _id: string;
    name: string;
    logo?: string;
  };
  revieweeHub?: {
    _id: string;
    name: string;
    logo?: string;
  };
  job?: {
    _id: string;
    title: string;
  };
  contract?: {
    _id: string;
    status: string;
  };
}

export interface AdminReviewListOptions {
  page?: number;
  limit?: number;
  status?: 'active' | 'hidden' | 'deleted' | 'all';
  rating?: number;
  dateFrom?: string;
  dateTo?: string;
  hubId?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
  serviceType?: 'experience' | 'expertise';
}

export interface AdminReviewListResponse {
  reviews: AdminReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReviewStats {
  totals: {
    bookingReviews: number;
    contractReviews: number;
    totalReviews: number;
  };
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  byStatus: {
    active: number;
    hidden: number;
    deleted: number;
  };
  byMonth: Array<{
    month: string;
    count: number;
    avgRating: number;
  }>;
}

export interface ReviewTrends {
  period: 'week' | 'month' | 'year';
  trends: Array<{
    date: string;
    bookingReviews: number;
    contractReviews: number;
    total: number;
    avgRating: number;
  }>;
}

export interface ModerationReason {
  code: string;
  label: string;
}

export const MODERATION_REASONS: ModerationReason[] = [
  { code: 'inappropriate', label: 'Inappropriate content' },
  { code: 'personal_info', label: 'Contains personal information' },
  { code: 'fake_spam', label: 'Fake/spam review' },
  { code: 'offensive', label: 'Offensive language' },
  { code: 'irrelevant', label: 'Irrelevant to service' },
  { code: 'other', label: 'Other' },
];
```

---

## Edge Cases

- Empty reviews list: Show "No reviews found" message
- API error: Show error toast and retry button
- Very long review content: Truncate with "Read more" in list, show full in dialog
- Review with deleted hub/service: Show placeholder data
- Search with special characters: Escape and handle gracefully
- Date range spanning future: Cap at current date

## Observability

- Track page views and filter usage
- Log moderation actions with admin ID
- Monitor API call latency
- Track error rates by endpoint

## Rollout & Rollback

- Feature flag: `ADMIN_REVIEWS_UI_ENABLED` controls page visibility
- Rollback: Disable flag, admin sidebar hides reviews link
- No data migrations needed

## Open Questions

- None at this time

---

## Verification

### Automated Tests

```bash
# Test file: projects/admin/src/app/pages/reviews/admin-reviews-list.component.spec.ts
# @covers AC-AR-001 through AC-AR-057
```

### Manual Verification

1. Navigate to /admin/reviews
2. Verify stats display correctly
3. Switch between tabs (All, Booking, Contract)
4. Test filters (status, rating, date, search)
5. Click on review to open detail dialog
6. Test hide/unhide moderation with reason
7. Test delete moderation
8. Verify pagination works
9. Verify sorting works
10. Test with no reviews (empty state)
