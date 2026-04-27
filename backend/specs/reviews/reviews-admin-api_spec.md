---
title: Admin Reviews API
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
  - specs/reviews/reviews-booking-api_spec.md
  - specs/reviews/reviews-contract-api_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

Admin dashboard APIs for viewing and moderating reviews across the platform.

## Key Features

- View all booking reviews
- View all contract reviews
- Combined review list with filters
- Moderation actions (hide/unhide)
- Review statistics and analytics

## Admin Capabilities

- Read all reviews (booking + contract)
- Filter by type, status, rating, date
- Moderate reviews (hide problematic content)
- View review analytics

---

# Agent Contract

## Scope

## Non-goals

- Automated content moderation (manual only)
- Review editing by admin (can only hide/delete)
- Bulk moderation actions (one at a time)
- Review appeals workflow (future enhancement)

## In Scope

- Admin review list endpoints (booking + contract)
- Admin review moderation endpoints
- Review statistics for admin dashboard

### Out of Scope

- User review CRUD (see reviews-booking-api_spec)
- Hub review endpoints (see reviews-contract-api_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### List All Reviews

- [ ] AC-AR-001: GET `/api/v1/admin/reviews` MUST return combined booking + contract reviews
- [ ] AC-AR-002: MUST support `type` filter: `booking | contract | all` (default: all)
- [ ] AC-AR-003: MUST support `status` filter: `active | hidden | deleted | all` (default: all)
- [ ] AC-AR-004: MUST support `rating` filter: 1-5
- [ ] AC-AR-005: MUST support `serviceType` filter: `experience | expertise` (for booking only)
- [ ] AC-AR-006: MUST support `dateFrom` and `dateTo` filters
- [ ] AC-AR-007: MUST support `hubId` filter (reviews for specific hub)
- [ ] AC-AR-008: MUST support `search` query (reviewer name, content)
- [ ] AC-AR-009: MUST support pagination (page, limit)
- [ ] AC-AR-010: MUST support sorting: `newest | oldest | highest | lowest`
- [ ] AC-AR-011: Response MUST include review type indicator (`booking` or `contract`)
- [ ] AC-AR-012: Response MUST include reviewer info (name, email for admin)
- [ ] AC-AR-013: Response MUST include service/contract info

### List Booking Reviews

- [ ] AC-AR-020: GET `/api/v1/admin/reviews/bookings` MUST return booking reviews only
- [ ] AC-AR-021: Same filter support as combined list
- [ ] AC-AR-022: Response MUST include service name and type

### List Contract Reviews

- [ ] AC-AR-030: GET `/api/v1/admin/reviews/contracts` MUST return contract reviews only
- [ ] AC-AR-031: Same filter support as combined list
- [ ] AC-AR-032: Response MUST include reviewer hub and reviewee hub names
- [ ] AC-AR-033: Response MUST include job title and contract ID

### Get Review Detail

- [ ] AC-AR-040: GET `/api/v1/admin/reviews/:reviewId` MUST return full review details
- [ ] AC-AR-041: MUST include `reviewType` to indicate booking or contract
- [ ] AC-AR-042: For booking: include service, hub, booking details
- [ ] AC-AR-043: For contract: include job, contract, both hub details

### Moderate Review

- [ ] AC-AR-050: PATCH `/api/v1/admin/reviews/:reviewId/moderate` MUST update review status
- [ ] AC-AR-051: Request body MUST accept `action`: `hide | unhide | delete`
- [ ] AC-AR-052: Request body MAY include `reason` for moderation action
- [ ] AC-AR-053: MUST work for both booking and contract reviews
- [ ] AC-AR-054: On hide/delete, MUST trigger aggregation update
- [ ] AC-AR-055: MUST log moderation action with admin ID and reason

### Review Statistics

- [ ] AC-AR-060: GET `/api/v1/admin/reviews/stats` MUST return platform-wide stats
- [ ] AC-AR-061: MUST include total booking reviews count
- [ ] AC-AR-062: MUST include total contract reviews count
- [ ] AC-AR-063: MUST include average rating (combined)
- [ ] AC-AR-064: MUST include rating distribution
- [ ] AC-AR-065: MUST include reviews by status (active, hidden, deleted)
- [ ] AC-AR-066: MUST include reviews by month (last 12 months)

### Review Trends

- [ ] AC-AR-070: GET `/api/v1/admin/reviews/trends` MUST return review trends
- [ ] AC-AR-071: MUST support `period` param: `week | month | year`
- [ ] AC-AR-072: MUST include review count per period
- [ ] AC-AR-073: MUST include average rating per period

---

## API Endpoints

### List All Reviews (Combined)

```http
GET /api/v1/admin/reviews?type=all&status=active&page=1&limit=20&sort=newest
Authorization: Bearer <admin-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "review_abc",
        "reviewType": "booking",
        "rating": 5,
        "content": "Amazing experience!...",
        "photos": ["https://..."],
        "status": "active",
        "isEdited": false,
        "createdAt": "2026-02-24T10:00:00Z",
        "reviewer": {
          "_id": "user_123",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "service": {
          "_id": "exp_456",
          "name": "Python Masterclass",
          "type": "experience"
        },
        "hub": {
          "_id": "hub_789",
          "name": "Code Academy"
        }
      },
      {
        "_id": "cr_def",
        "reviewType": "contract",
        "rating": 4,
        "criteriaRatings": {
          "quality": 5,
          "communication": 4,
          "professionalism": 4,
          "timeliness": 4
        },
        "content": "Great work on the project...",
        "status": "active",
        "isEdited": false,
        "createdAt": "2026-02-23T10:00:00Z",
        "reviewerHub": {
          "_id": "hub_client",
          "name": "Tech Corp"
        },
        "revieweeHub": {
          "_id": "hub_expert",
          "name": "Dev Solutions"
        },
        "job": {
          "_id": "job_123",
          "title": "Web Development Project"
        },
        "contract": {
          "_id": "contract_456"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### List Booking Reviews

```http
GET /api/v1/admin/reviews/bookings?serviceType=experience&status=active&page=1&limit=20
Authorization: Bearer <admin-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "review_abc",
        "rating": 5,
        "content": "Amazing experience!...",
        "photos": ["https://..."],
        "status": "active",
        "serviceType": "experience",
        "createdAt": "2026-02-24T10:00:00Z",
        "reviewer": {
          "_id": "user_123",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "service": {
          "_id": "exp_456",
          "name": "Python Masterclass"
        },
        "hub": {
          "_id": "hub_789",
          "name": "Code Academy"
        },
        "booking": {
          "_id": "booking_999",
          "bookingDate": "2026-02-20T10:00:00Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### List Contract Reviews

```http
GET /api/v1/admin/reviews/contracts?status=active&page=1&limit=20
Authorization: Bearer <admin-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "cr_abc",
        "reviewType": "client_to_expert",
        "rating": 5,
        "criteriaRatings": {
          "quality": 5,
          "communication": 5,
          "professionalism": 4,
          "timeliness": 5
        },
        "content": "Excellent work!...",
        "status": "active",
        "createdAt": "2026-02-24T10:00:00Z",
        "reviewerHub": {
          "_id": "hub_client",
          "name": "Tech Corp",
          "logo": "https://..."
        },
        "revieweeHub": {
          "_id": "hub_expert",
          "name": "Dev Solutions",
          "logo": "https://..."
        },
        "job": {
          "_id": "job_123",
          "title": "Web Development Project"
        },
        "contract": {
          "_id": "contract_456",
          "status": "completed"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### Get Review Detail

```http
GET /api/v1/admin/reviews/:reviewId?type=booking
Authorization: Bearer <admin-token>
```

**Response (200 OK) - Booking Review:**
```json
{
  "success": true,
  "data": {
    "_id": "review_abc",
    "reviewType": "booking",
    "rating": 5,
    "content": "Amazing experience! The host was very knowledgeable...",
    "photos": ["https://..."],
    "status": "active",
    "isEdited": false,
    "createdAt": "2026-02-24T10:00:00Z",
    "updatedAt": "2026-02-24T10:00:00Z",
    "reviewer": {
      "_id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://..."
    },
    "service": {
      "_id": "exp_456",
      "name": "Python Masterclass",
      "type": "experience",
      "slug": "python-masterclass"
    },
    "hub": {
      "_id": "hub_789",
      "name": "Code Academy",
      "logo": "https://..."
    },
    "booking": {
      "_id": "booking_999",
      "bookingDate": "2026-02-20T10:00:00Z",
      "status": "completed",
      "totalPaid": 100,
      "currency": "MYR"
    }
  }
}
```

### Moderate Review

```http
PATCH /api/v1/admin/reviews/:reviewId/moderate
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "hide",
  "reason": "Contains inappropriate content"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "review_abc",
    "status": "hidden",
    "moderatedBy": "admin_123",
    "moderatedAt": "2026-02-25T10:00:00Z",
    "moderationReason": "Contains inappropriate content"
  }
}
```

### Review Statistics

```http
GET /api/v1/admin/reviews/stats
Authorization: Bearer <admin-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totals": {
      "bookingReviews": 1500,
      "contractReviews": 350,
      "totalReviews": 1850
    },
    "averageRating": 4.3,
    "ratingDistribution": {
      "1": 50,
      "2": 80,
      "3": 200,
      "4": 600,
      "5": 920
    },
    "byStatus": {
      "active": 1750,
      "hidden": 80,
      "deleted": 20
    },
    "byMonth": [
      { "month": "2026-02", "count": 150, "avgRating": 4.5 },
      { "month": "2026-01", "count": 180, "avgRating": 4.3 },
      { "month": "2025-12", "count": 160, "avgRating": 4.4 }
    ]
  }
}
```

### Review Trends

```http
GET /api/v1/admin/reviews/trends?period=month
Authorization: Bearer <admin-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "trends": [
      {
        "date": "2026-02",
        "bookingReviews": 120,
        "contractReviews": 30,
        "total": 150,
        "avgRating": 4.5
      },
      {
        "date": "2026-01",
        "bookingReviews": 150,
        "contractReviews": 30,
        "total": 180,
        "avgRating": 4.3
      }
    ]
  }
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/schemas/admin/reviews/adminReview.schema.ts` | JSON schemas |
| `src/core/services/admin/reviews/adminReview.service.ts` | Admin review logic |
| `src/modules/admin/controllers/reviews/adminReview.controller.ts` | Controller |
| `src/modules/admin/routes/reviews/adminReview.routes.ts` | Routes |

---

## Admin Dashboard UI Requirements

### Reviews List Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ Reviews Management                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ [All] [Booking Reviews] [Contract Reviews]                          │
│                                                                     │
│ Filters: [Status ▼] [Rating ▼] [Date Range] [Hub ▼] [Search...]    │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Type  │ Rating │ Reviewer        │ Content      │ Date    │ ⋮  │ │
│ ├───────┼────────┼─────────────────┼──────────────┼─────────┼────┤ │
│ │ 📦    │ ★★★★★  │ John Doe        │ Amazing...   │ Feb 24  │ ⋮  │ │
│ │ 📄    │ ★★★★☆  │ Tech Corp → Dev │ Great work...│ Feb 23  │ ⋮  │ │
│ │ 📦    │ ★★★☆☆  │ Jane Smith      │ Could be...  │ Feb 22  │ ⋮  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [◀ Prev] Page 1 of 10 [Next ▶]                                     │
└─────────────────────────────────────────────────────────────────────┘

Legend: 📦 = Booking Review, 📄 = Contract Review
```

### Review Detail Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│ Review Details                                              [×]     │
├─────────────────────────────────────────────────────────────────────┤
│ Type: Booking Review (Experience)                                   │
│ Status: ● Active                                                    │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ Rating: ★★★★★ 5/5                                                   │
│                                                                     │
│ "Amazing experience! The host was very knowledgeable and           │
│  helped me understand Python concepts clearly..."                   │
│                                                                     │
│ 📷 [img] [img]                                                      │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ Reviewer: John Doe (john@example.com)                               │
│ Service: Python Masterclass (Experience)                            │
│ Hub: Code Academy                                                   │
│ Booking Date: Feb 20, 2026                                          │
│ Review Date: Feb 24, 2026                                           │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ [Hide Review] [Delete Review]                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases

- Review not found: Return 404 with clear message
- Invalid review type in query param: Default to `all`
- Moderating already hidden review: No-op, return current state
- Moderating deleted review: Allow (can unhide/undelete)
- Large date range filter: Limit to 1 year max
- Search query too short: Require minimum 3 characters

## Observability

- Log all moderation actions with admin ID, review ID, action, reason
- Track moderation rate per admin
- Monitor review stats endpoint latency
- Alert on unusual moderation patterns

## Rollout & Rollback

- Feature flag: `REVIEWS_ADMIN_ENABLED` controls admin APIs
- Rollback: Disable flag, admin pages show error state
- No data migrations needed for rollback

## Open Questions

- None at this time

---

## Verification

### Automated Tests

```bash
# Test file: tests/modules/admin/controllers/adminReview.controller.test.ts
# @covers AC-AR-001 through AC-AR-073
```

### Manual Verification

1. List all reviews with filters
2. List booking reviews only
3. List contract reviews only
4. View review detail
5. Moderate review (hide/unhide/delete)
6. Verify stats endpoint
7. Verify trends endpoint
