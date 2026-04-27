---
title: Booking Reviews API
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
  - specs/reviews/reviews-aggregation_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

API endpoints for learners to create, read, update, and delete reviews for their completed bookings (Experience and Expertise).

## Key Features

- Create review for completed booking
- Edit own review (within 30 days)
- Delete own review
- Get review by booking ID
- List reviews for experience/expertise/hub (public)

## Important Notes

- Hub CANNOT respond to reviews (simplified from v1)
- Only COMPLETED bookings can be reviewed
- One review per booking (enforced by unique index)

---

# Agent Contract

## Scope

## Non-goals

- Hub response/reply to reviews (simplified from v1)
- Review reporting/flagging system (future enhancement)
- Advanced moderation workflow (basic hide/delete only via admin)

## In Scope

- User review CRUD endpoints
- Hub review read endpoints (view only)
- Public review list endpoints
- Review validation rules
- Permission checks

### Out of Scope

- Contract reviews (see reviews-contract-api_spec)
- Aggregation logic (see reviews-aggregation_spec)
- Admin moderation (see reviews-admin-api_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Create Review

- [ ] AC-BR-001: POST `/api/v1/user/reviews` MUST create review for booking
- [ ] AC-BR-002: Request body MUST require `bookingId`, `rating`, `content`
- [ ] AC-BR-003: Request body MAY include `photos` array (max 5 URLs)
- [ ] AC-BR-004: MUST return 400 if booking not found
- [ ] AC-BR-005: MUST return 400 if booking not owned by user
- [ ] AC-BR-006: MUST return 400 if booking status != `completed`
- [ ] AC-BR-007: MUST return 400 if review already exists for booking
- [ ] AC-BR-008: MUST return 400 if rating not between 1-5
- [ ] AC-BR-009: MUST return 400 if content < 25 or > 2000 characters
- [ ] AC-BR-010: MUST return 400 if photos > 5 items
- [ ] AC-BR-011: On success, MUST trigger aggregation update for service and hub
- [ ] AC-BR-012: MUST return 201 with created review

### Get Review by Booking

- [ ] AC-BR-020: GET `/api/v1/user/bookings/:bookingId/review` MUST return review if exists
- [ ] AC-BR-021: MUST return 404 if review not found
- [ ] AC-BR-022: MUST verify user owns the booking

### Update Review

- [ ] AC-BR-030: PUT `/api/v1/user/reviews/:reviewId` MUST update own review
- [ ] AC-BR-031: MUST return 404 if review not found
- [ ] AC-BR-032: MUST return 403 if user doesn't own review
- [ ] AC-BR-033: MUST return 400 if review older than 30 days
- [ ] AC-BR-034: MUST set `isEdited: true` and `editedAt` on update
- [ ] AC-BR-035: On success, MUST trigger aggregation update if rating changed
- [ ] AC-BR-036: MUST return 200 with updated review

### Delete Review

- [ ] AC-BR-040: DELETE `/api/v1/user/reviews/:reviewId` MUST soft-delete review
- [ ] AC-BR-041: MUST set `status: 'deleted'` (not hard delete)
- [ ] AC-BR-042: MUST return 404 if review not found
- [ ] AC-BR-043: MUST return 403 if user doesn't own review
- [ ] AC-BR-044: On success, MUST trigger aggregation update
- [ ] AC-BR-045: MUST return 200 with success message

### List Experience Reviews (Public)

- [ ] AC-BR-050: GET `/api/v1/experiences/:experienceId/reviews` MUST return public reviews
- [ ] AC-BR-051: MUST only return reviews with `status: 'active'`
- [ ] AC-BR-052: MUST support `sort` query param: `newest`, `highest`, `lowest`
- [ ] AC-BR-053: MUST support `rating` query param filter (1-5)
- [ ] AC-BR-054: MUST support cursor-based pagination
- [ ] AC-BR-055: Response MUST include reviewer name and avatar
- [ ] AC-BR-056: Response MUST NOT include reviewer email

### List Expertise Reviews (Public)

- [ ] AC-BR-060: GET `/api/v1/expertises/:expertiseId/reviews` MUST return public reviews
- [ ] AC-BR-061: Same requirements as experience reviews (AC-BR-051 through AC-BR-056)

### List Hub Reviews (Public)

- [ ] AC-BR-070: GET `/api/v1/hubs/:hubId/reviews` MUST return all hub reviews
- [ ] AC-BR-071: MUST include both booking reviews AND contract reviews
- [ ] AC-BR-072: MUST support `type` query param: `booking`, `contract`, `all`
- [ ] AC-BR-073: Same filtering/pagination as experience reviews

### Hub View Reviews (Hub Dashboard)

- [ ] AC-BR-080: GET `/api/v1/hub/:hubId/reviews` MUST return reviews for hub
- [ ] AC-BR-081: MUST verify user is hub member
- [ ] AC-BR-082: MUST support filters: `serviceType`, `rating`, `serviceId`
- [ ] AC-BR-083: Response MUST include service name and date
- [ ] AC-BR-084: Hub CANNOT respond to reviews (no response endpoint)

---

## API Endpoints

### Create Review

```http
POST /api/v1/user/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookingId": "booking_123",
  "rating": 5,
  "content": "Amazing experience! The host was very knowledgeable and helpful. I learned so much in just 2 hours.",
  "photos": [
    "https://storage.googleapis.com/..../review1.jpg",
    "https://storage.googleapis.com/..../review2.jpg"
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "review_abc",
    "bookingId": "booking_123",
    "serviceId": "exp_456",
    "serviceType": "experience",
    "hubId": "hub_789",
    "reviewerId": "user_123",
    "rating": 5,
    "content": "Amazing experience! The host was very knowledgeable...",
    "photos": ["https://..."],
    "status": "active",
    "isEdited": false,
    "createdAt": "2026-02-24T10:00:00Z",
    "updatedAt": "2026-02-24T10:00:00Z"
  }
}
```

### Get Review by Booking

```http
GET /api/v1/user/bookings/:bookingId/review
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "review_abc",
    "rating": 5,
    "content": "Amazing experience!...",
    "photos": [],
    "isEdited": false,
    "createdAt": "2026-02-24T10:00:00Z"
  }
}
```

**Response (404 Not Found - no review):**
```json
{
  "success": true,
  "data": null
}
```

### Update Review

```http
PUT /api/v1/user/reviews/:reviewId
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 4,
  "content": "Updated review content with more details...",
  "photos": ["https://..."]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "review_abc",
    "rating": 4,
    "content": "Updated review content...",
    "isEdited": true,
    "editedAt": "2026-02-25T10:00:00Z",
    "createdAt": "2026-02-24T10:00:00Z",
    "updatedAt": "2026-02-25T10:00:00Z"
  }
}
```

### Delete Review

```http
DELETE /api/v1/user/reviews/:reviewId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Review deleted successfully"
  }
}
```

### List Experience Reviews (Public)

```http
GET /api/v1/experiences/:experienceId/reviews?sort=newest&rating=5&cursor=&limit=20
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
        "reviewer": {
          "name": "John D.",
          "avatar": "https://..."
        },
        "isEdited": false,
        "createdAt": "2026-02-24T10:00:00Z"
      }
    ],
    "stats": {
      "averageRating": 4.5,
      "totalReviews": 25,
      "ratingDistribution": {
        "1": 1,
        "2": 2,
        "3": 3,
        "4": 8,
        "5": 11
      }
    },
    "pagination": {
      "cursor": "review_last",
      "hasMore": true
    }
  }
}
```

### Hub Reviews List (Dashboard)

```http
GET /api/v1/hub/:hubId/reviews?serviceType=experience&rating=5&page=1&limit=20
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "review_abc",
        "serviceName": "Python Masterclass",
        "serviceType": "experience",
        "serviceId": "exp_456",
        "rating": 5,
        "content": "Amazing experience!...",
        "photos": ["https://..."],
        "reviewer": {
          "name": "John Doe",
          "avatar": "https://..."
        },
        "createdAt": "2026-02-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/schemas/web/reviews/userReview.schema.ts` | JSON schemas for user review endpoints |
| `src/core/services/reviews/review.service.ts` | Review business logic |
| `src/modules/web/controllers/reviews/userReview.controller.ts` | User review controller |
| `src/modules/web/routes/reviews/userReview.routes.ts` | User review routes |
| `src/modules/web/controllers/reviews/publicReview.controller.ts` | Public review controller |
| `src/modules/web/routes/reviews/publicReview.routes.ts` | Public review routes |
| `src/core/schemas/hub/reviews/hubReview.schema.ts` | Hub review schemas |
| `src/modules/hub/controllers/reviews/hubReview.controller.ts` | Hub review controller |
| `src/modules/hub/routes/reviews/hubReview.routes.ts` | Hub review routes |

---

## Business Rules

| Rule | Implementation |
|------|----------------|
| One review per booking | Unique index on `bookingId` |
| Only completed bookings | Check `booking.status === 'completed'` |
| Edit within 30 days | Compare `createdAt` with current date |
| Soft delete | Set `status: 'deleted'`, don't remove |
| Privacy | Hide reviewer email in public responses |

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| BOOKING_NOT_FOUND | 400 | Booking doesn't exist |
| BOOKING_NOT_OWNED | 403 | User doesn't own booking |
| BOOKING_NOT_COMPLETED | 400 | Booking status != `completed` |
| REVIEW_EXISTS | 400 | Review already exists for booking |
| REVIEW_NOT_FOUND | 404 | Review doesn't exist |
| REVIEW_NOT_OWNED | 403 | User doesn't own review |
| REVIEW_EDIT_EXPIRED | 400 | Cannot edit after 30 days |
| INVALID_RATING | 400 | Rating not 1-5 |
| CONTENT_TOO_SHORT | 400 | Content < 25 chars |
| CONTENT_TOO_LONG | 400 | Content > 2000 chars |
| TOO_MANY_PHOTOS | 400 | More than 5 photos |

---

## Edge Cases

- Booking with no service reference: Return 400 with `INVALID_BOOKING` error
- Booking for space (BookingType.SPACE): Return 400 with `SPACE_BOOKING_NOT_REVIEWABLE`
- Reviewer account deleted: Review remains with anonymized reviewer info
- Service/Hub deleted: Review remains but service/hub info may be missing
- Multiple rapid submissions: Unique index prevents duplicates
- Empty photos array: Allowed, defaults to `[]`

## Observability

- Log all review create/update/delete operations
- Track review creation rate per user (detect spam patterns)
- Monitor failed validation attempts
- Alert on unusual review patterns (bulk reviews, rating manipulation)

## Rollout & Rollback

- Feature flag: `REVIEWS_BOOKING_ENABLED` controls API availability
- Rollback: Disable flag, existing reviews remain but APIs return 503
- Database changes are additive (no migrations needed for rollback)

## Open Questions

- None at this time

---

## Verification

### Automated Tests

```bash
# Test file: tests/modules/web/controllers/userReview.controller.test.ts
# @covers AC-BR-001 through AC-BR-045

# Test file: tests/modules/web/controllers/publicReview.controller.test.ts
# @covers AC-BR-050 through AC-BR-073

# Test file: tests/modules/hub/controllers/hubReview.controller.test.ts
# @covers AC-BR-080 through AC-BR-084
```

### Manual Verification

1. Create review for completed booking
2. Try creating duplicate review (should fail)
3. Edit review within 30 days
4. Edit review after 30 days (should fail)
5. Delete review and verify soft delete
6. List reviews with filters and pagination
