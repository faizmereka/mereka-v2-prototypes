---
title: Contract Reviews API
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

API endpoints for Client Hub and Expert Hub to review each other after a Job/Contract is completed.

## Key Features

- Two-way reviews (client reviews expert, expert reviews client)
- Criteria-based ratings (quality, communication, professionalism, timeliness)
- Edit review within 30 days
- Both reviews shown on contract detail page

## Review Flow

```
Contract completed
       │
       ▼
┌──────────────────────────────────────┐
│  Client Hub                          │
│  Reviews: Expert Hub                 │
│  Rating: Quality, Communication, etc.│
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Expert Hub                          │
│  Reviews: Client Hub                 │
│  Rating: Quality, Communication, etc.│
└──────────────────────────────────────┘
       │
       ▼
Both reviews visible on contract detail
Both reviews affect Hub.reviewStats
```

---

# Agent Contract

## Scope

## Non-goals

- Review response/reply system (hub cannot respond to contract reviews)
- Review reporting/flagging system (future enhancement)
- Advanced moderation workflow (basic hide/delete only via admin)

## In Scope

- Contract review CRUD endpoints
- Two-way review system (client ↔ expert)
- Criteria-based rating
- Contract detail review display

### Out of Scope

- Booking reviews (see reviews-booking-api_spec)
- Aggregation logic (see reviews-aggregation_spec)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### Create Contract Review

- [ ] AC-CR-001: POST `/api/v1/hub/:hubId/contracts/:contractId/reviews` MUST create review
- [ ] AC-CR-002: Request body MUST require `rating`, `criteriaRatings`, `content`
- [ ] AC-CR-003: `criteriaRatings` MUST include: quality, communication, professionalism, timeliness
- [ ] AC-CR-004: Each criteria rating MUST be 1-5
- [ ] AC-CR-005: MUST return 400 if contract not found
- [ ] AC-CR-006: MUST return 400 if hub not party to contract
- [ ] AC-CR-007: MUST return 400 if contract status != `completed`
- [ ] AC-CR-008: MUST return 400 if review already exists from this party
- [ ] AC-CR-009: MUST auto-determine `reviewType` based on hub's role:
  - If hub === clientHubId → `client_to_expert`
  - If hub === expertHubId → `expert_to_client`
- [ ] AC-CR-010: MUST auto-set `revieweeHubId` to the other party
- [ ] AC-CR-011: On success, MUST trigger aggregation update for reviewee hub
- [ ] AC-CR-012: MUST return 201 with created review

### Get Contract Reviews

- [ ] AC-CR-020: GET `/api/v1/hub/:hubId/contracts/:contractId/reviews` MUST return all reviews for contract
- [ ] AC-CR-021: Response MUST include reviews from both parties (if they exist)
- [ ] AC-CR-022: MUST verify hub is party to contract
- [ ] AC-CR-023: Response MUST indicate which review is `mine` vs `other`

### Update Contract Review

- [ ] AC-CR-030: PUT `/api/v1/hub/:hubId/contracts/:contractId/reviews/:reviewId` MUST update own review
- [ ] AC-CR-031: MUST return 404 if review not found
- [ ] AC-CR-032: MUST return 403 if review not owned by this hub
- [ ] AC-CR-033: MUST return 400 if review older than 30 days
- [ ] AC-CR-034: MUST set `isEdited: true` and `editedAt` on update
- [ ] AC-CR-035: On success, MUST trigger aggregation update if rating changed
- [ ] AC-CR-036: MUST return 200 with updated review

### Check Review Status

- [ ] AC-CR-040: GET `/api/v1/hub/:hubId/contracts/:contractId/review-status` MUST return status
- [ ] AC-CR-041: Response MUST include:
  - `canReview`: boolean (contract completed and no review yet)
  - `hasReviewed`: boolean (this hub has reviewed)
  - `hasReceivedReview`: boolean (other party has reviewed)
  - `myReview`: review object if exists
  - `receivedReview`: other party's review if exists

### Hub Profile Reviews (Received)

- [ ] AC-CR-050: GET `/api/v1/hubs/:hubId/contract-reviews` MUST return reviews hub received
- [ ] AC-CR-051: MUST only return reviews where `revieweeHubId` === hubId
- [ ] AC-CR-052: MUST support pagination and sorting
- [ ] AC-CR-053: Response MUST include reviewer hub name and logo

---

## API Endpoints

### Create Contract Review

```http
POST /api/v1/hub/:hubId/contracts/:contractId/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "criteriaRatings": {
    "quality": 5,
    "communication": 5,
    "professionalism": 4,
    "timeliness": 5
  },
  "content": "Excellent work! The expert delivered high-quality results on time. Communication was clear throughout the project. Would definitely work with them again."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "cr_abc",
    "contractId": "contract_123",
    "jobId": "job_456",
    "reviewerHubId": "hub_client",
    "revieweeHubId": "hub_expert",
    "reviewType": "client_to_expert",
    "rating": 5,
    "criteriaRatings": {
      "quality": 5,
      "communication": 5,
      "professionalism": 4,
      "timeliness": 5
    },
    "content": "Excellent work! The expert delivered...",
    "status": "active",
    "isEdited": false,
    "createdAt": "2026-02-24T10:00:00Z",
    "updatedAt": "2026-02-24T10:00:00Z"
  }
}
```

### Get Contract Reviews

```http
GET /api/v1/hub/:hubId/contracts/:contractId/reviews
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "myReview": {
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
      "isEdited": false,
      "createdAt": "2026-02-24T10:00:00Z"
    },
    "receivedReview": {
      "_id": "cr_def",
      "reviewType": "expert_to_client",
      "rating": 5,
      "criteriaRatings": {
        "quality": 5,
        "communication": 4,
        "professionalism": 5,
        "timeliness": 5
      },
      "content": "Great client to work with!...",
      "reviewerHub": {
        "name": "Expert Solutions",
        "logo": "https://..."
      },
      "isEdited": false,
      "createdAt": "2026-02-25T10:00:00Z"
    }
  }
}
```

### Check Review Status

```http
GET /api/v1/hub/:hubId/contracts/:contractId/review-status
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "contractStatus": "completed",
    "canReview": false,
    "hasReviewed": true,
    "hasReceivedReview": true,
    "myReviewId": "cr_abc",
    "receivedReviewId": "cr_def"
  }
}
```

### Update Contract Review

```http
PUT /api/v1/hub/:hubId/contracts/:contractId/reviews/:reviewId
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 4,
  "criteriaRatings": {
    "quality": 4,
    "communication": 5,
    "professionalism": 4,
    "timeliness": 4
  },
  "content": "Updated review with more accurate assessment..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "cr_abc",
    "rating": 4,
    "criteriaRatings": {...},
    "content": "Updated review...",
    "isEdited": true,
    "editedAt": "2026-02-25T10:00:00Z"
  }
}
```

### Hub Profile Contract Reviews

```http
GET /api/v1/hubs/:hubId/contract-reviews?page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "cr_abc",
        "rating": 5,
        "criteriaRatings": {...},
        "content": "Excellent work!...",
        "reviewerHub": {
          "_id": "hub_client",
          "name": "Tech Corp",
          "logo": "https://..."
        },
        "job": {
          "_id": "job_456",
          "title": "Web Development Project"
        },
        "createdAt": "2026-02-24T10:00:00Z"
      }
    ],
    "stats": {
      "averageRating": 4.7,
      "totalReviews": 15,
      "criteriaAverages": {
        "quality": 4.8,
        "communication": 4.6,
        "professionalism": 4.7,
        "timeliness": 4.7
      }
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/schemas/hub/contracts/contractReview.schema.ts` | JSON schemas |
| `src/core/services/reviews/contractReview.service.ts` | Contract review logic |
| `src/modules/hub/controllers/contracts/contractReview.controller.ts` | Controller |
| `src/modules/hub/routes/contracts/contractReview.routes.ts` | Routes |

---

## Business Rules

| Rule | Implementation |
|------|----------------|
| One review per party | Unique index on `(contractId, reviewType)` |
| Only completed contracts | Check `contract.status === 'completed'` |
| Auto-determine reviewee | Based on reviewer's role (client/expert) |
| Edit within 30 days | Compare `createdAt` with current date |
| Both parties independent | Each party's review doesn't depend on other |

---

## Criteria Rating Guidelines

| Criteria | Client Reviews Expert | Expert Reviews Client |
|----------|----------------------|----------------------|
| Quality | Quality of deliverables | Clarity of requirements |
| Communication | Response time, clarity | Response time, clarity |
| Professionalism | Behavior, reliability | Behavior, payment |
| Timeliness | Met deadlines | Timely feedback/approvals |

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| CONTRACT_NOT_FOUND | 400 | Contract doesn't exist |
| NOT_CONTRACT_PARTY | 403 | Hub not client or expert |
| CONTRACT_NOT_COMPLETED | 400 | Contract status != `completed` |
| REVIEW_EXISTS | 400 | Already reviewed this contract |
| REVIEW_NOT_FOUND | 404 | Review doesn't exist |
| REVIEW_NOT_OWNED | 403 | Review belongs to other party |
| REVIEW_EDIT_EXPIRED | 400 | Cannot edit after 30 days |
| INVALID_RATING | 400 | Rating not 1-5 |
| INVALID_CRITERIA | 400 | Missing or invalid criteria ratings |

---

## Edge Cases

- Contract with no expert hub: Should not happen (validation at contract level)
- Hub deleted after review: Review remains with hub snapshot data
- Contract cancelled after completion: Reviews still valid
- Both parties submit review at same time: Both succeed (unique index on reviewType)
- Criteria ratings missing one field: Return 400 with `INVALID_CRITERIA`
- Overall rating differs from criteria average: Allowed (user's discretion)

## Observability

- Log all contract review create/update/delete operations
- Track review creation time after contract completion
- Monitor criteria rating patterns per hub
- Alert on unusual patterns (retaliatory reviews, coordinated ratings)

## Rollout & Rollback

- Feature flag: `REVIEWS_CONTRACT_ENABLED` controls API availability
- Rollback: Disable flag, existing reviews remain but APIs return 503
- Database changes are additive (no migrations needed for rollback)

## Open Questions

- None at this time

---

## Verification

### Automated Tests

```bash
# Test file: tests/modules/hub/controllers/contractReview.controller.test.ts
# @covers AC-CR-001 through AC-CR-053
```

### Manual Verification

1. Complete a contract
2. Create review as client hub
3. Create review as expert hub
4. View both reviews on contract detail
5. Try editing review after 30 days (should fail)
6. View reviews on hub profile
