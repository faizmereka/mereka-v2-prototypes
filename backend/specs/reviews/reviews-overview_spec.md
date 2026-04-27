---
title: Reviews System Overview
type: feature_spec
status: draft
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-24'
depends_on: []
links:
  related_specs:
  - specs/reviews/reviews-data-models_spec.md
  - specs/reviews/reviews-booking-api_spec.md
  - specs/reviews/reviews-contract-api_spec.md
  - specs/reviews/reviews-aggregation_spec.md
  - specs/reviews/reviews-admin-api_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

A comprehensive review system for the Mereka marketplace with two distinct review types:

1. **Booking Reviews** - Learners review Hubs after completing Experience/Expertise bookings
2. **Contract Reviews** - Client Hub and Expert Hub review each other after Job/Contract completion

## Why

Reviews are critical for marketplace trust and quality:
- Help learners choose quality experiences/expertise
- Help hubs find reliable experts for jobs
- Provide feedback for hubs to improve
- Build reputation and credibility

## Success looks like

- Learners can review completed bookings
- Both parties can review after contract completion
- Average ratings displayed on hub/experience/expertise pages
- Rating aggregation is accurate and real-time

---

# Agent Contract

## Scope

This spec defines the overall review system architecture and serves as the entry point to detailed specs.

## In Scope

- Review types and their differences
- High-level data flow
- System components overview

### Out of Scope

- Detailed data models (see reviews-data-models_spec)
- API endpoints (see reviews-booking-api_spec, reviews-contract-api_spec)
- Rating aggregation logic (see reviews-aggregation_spec)

---

## Review Types

### 1. Booking Reviews

| Aspect | Detail |
|--------|--------|
| **Who reviews** | Learner (user who booked) |
| **Who is reviewed** | Hub (service provider) |
| **When** | After booking status = `completed` |
| **Where shown** | Booking detail page, Experience/Expertise public page, Hub profile |
| **Hub response** | NOT allowed (simplified from v1) |

### 2. Contract Reviews

| Aspect | Detail |
|--------|--------|
| **Who reviews** | Both parties: Client Hub AND Expert Hub |
| **Who is reviewed** | Each party reviews the other |
| **When** | After contract status = `completed` |
| **Where shown** | Contract detail page, Hub profile |
| **Two-way** | Yes - each party gives separate review |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REVIEW SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐          ┌─────────────────────┐          │
│  │   BOOKING REVIEWS   │          │  CONTRACT REVIEWS   │          │
│  │                     │          │                     │          │
│  │  Learner → Hub      │          │  ClientHub ↔ ExpertHub │       │
│  │  (one-way)          │          │  (two-way)          │          │
│  │                     │          │                     │          │
│  │  For: Experience,   │          │  For: Jobs/Contracts│          │
│  │       Expertise     │          │                     │          │
│  └──────────┬──────────┘          └──────────┬──────────┘          │
│             │                                 │                     │
│             ▼                                 ▼                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    REVIEW SERVICE                            │   │
│  │  - Create/Update/Delete reviews                              │   │
│  │  - Validation (completed booking/contract)                   │   │
│  │  - Permission checks                                         │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 AGGREGATION SERVICE                          │   │
│  │  - Calculate average rating                                  │   │
│  │  - Update reviewStats on Hub/Experience/Expertise            │   │
│  │  - Rating distribution                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Booking Review Flow

```
1. Learner completes booking
2. System sends REVIEW_REQUEST notification (via auto-complete job)
3. Learner opens booking detail page
4. Learner writes review (rating + text + optional photos)
5. Review saved to database
6. Aggregation service updates:
   - Hub.reviewStats
   - Experience/Expertise.reviewStats
7. Review visible on public pages
```

### Contract Review Flow

```
1. Contract marked as completed
2. Both parties can now review
3. Client Hub opens contract detail → Reviews section
4. Client Hub writes review for Expert Hub
5. Expert Hub opens contract detail → Reviews section
6. Expert Hub writes review for Client Hub
7. Both reviews saved independently
8. Aggregation service updates Hub.reviewStats for both
```

---

## Key Business Rules

### Booking Reviews

| Rule | Description |
|------|-------------|
| BR-001 | One review per booking |
| BR-002 | Only bookedBy user can review |
| BR-003 | Only `completed` bookings can be reviewed |
| BR-004 | Review can be edited within 30 days |
| BR-005 | Hub cannot respond to reviews |
| BR-006 | Deleted reviews excluded from aggregation |

### Contract Reviews

| Rule | Description |
|------|-------------|
| BR-010 | Each party gives one review to the other |
| BR-011 | Only `completed` contracts can be reviewed |
| BR-012 | Client Hub reviews Expert Hub |
| BR-013 | Expert Hub reviews Client Hub |
| BR-014 | Reviews can be edited within 30 days |
| BR-015 | Contract reviews use criteria-based rating |

---

## Components

### Backend Components

| Component | Spec |
|-----------|------|
| Review Model | reviews-data-models_spec.md |
| ContractReview Model | reviews-data-models_spec.md |
| Booking Review API | reviews-booking-api_spec.md |
| Contract Review API | reviews-contract-api_spec.md |
| Aggregation Service | reviews-aggregation_spec.md |

### Frontend Components

| Component | Spec |
|-----------|------|
| Booking Detail Page | reviews-fe-booking-detail_spec.md |
| Contract Review UI | reviews-fe-contract-reviews_spec.md |
| Shared Components | reviews-fe-components_spec.md |

---

## Migration from V1

### What's Different

| Aspect | V1 | V2 |
|--------|----|----|
| Hub Response | Yes | No (removed) |
| Review Photos | Up to 5 | Up to 5 (same) |
| Contract Reviews | Job-specific criteria | Standardized criteria |
| Aggregation | Cloud Functions | MongoDB service |
| Moderation | Basic flags | Simplified (no admin workflow initially) |

### Migration Steps

1. Reviews migrated from Firestore `reviews` collection
2. Set `isVerifiedPurchase: true` for all migrated reviews
3. Set `status: 'active'` for all migrated reviews
4. Recalculate all reviewStats after migration

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Review creation latency | < 500ms |
| Aggregation update latency | < 1s |
| Review fetch latency | < 200ms |
| Test coverage | 80%+ |

---

## Open Questions

None at this time.
