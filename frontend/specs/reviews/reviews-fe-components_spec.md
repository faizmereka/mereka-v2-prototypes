---
title: Review Shared Components
type: feature_spec
status: draft
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-24'
depends_on:
- specs/reviews/reviews-fe-overview_spec.md
links:
  related_specs:
  - specs/reviews/reviews-fe-booking-detail_spec.md
  - specs/reviews/reviews-fe-contract-reviews_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What we're building

Shared UI components for the review system used across multiple pages.

## Components

1. **StarRatingInput** - Interactive star rating selector (1-5)
2. **StarRating** - Read-only star display
3. **ReviewCard** - Display single review
4. **ReviewDialog** - Create/edit booking review
5. **ContractReviewDialog** - Create/edit contract review
6. **CriteriaRating** - Display criteria-based ratings
7. **ReviewStats** - Rating summary with distribution

---

# Agent Contract

## Scope

## Non-goals

- Animation library dependencies (use CSS transitions only)
- Complex photo editing (crop, filter, etc.)
- Rich text editor for review content

## In Scope

- All shared review components
- Component interfaces and props
- Styling and responsiveness

### Out of Scope

- Page-level components
- API integration (handled by parent components)

## Requirements

System MUST implement all acceptance criteria defined below.

## Acceptance Criteria

### StarRatingInput Component

- [ ] AC-SR-001: Component MUST display 5 stars
- [ ] AC-SR-002: Component MUST accept `value` input (1-5)
- [ ] AC-SR-003: Component MUST emit `valueChange` on selection
- [ ] AC-SR-004: Stars MUST be clickable
- [ ] AC-SR-005: Hover state MUST preview selection
- [ ] AC-SR-006: Selected stars MUST be filled (gold color)
- [ ] AC-SR-007: Unselected stars MUST be empty (gray)
- [ ] AC-SR-008: Component MUST support disabled state
- [ ] AC-SR-009: Component MUST be keyboard accessible

### StarRating Component (Display)

- [ ] AC-SD-001: Component MUST accept `rating` input (number)
- [ ] AC-SD-002: Component MUST display partial stars (e.g., 4.5)
- [ ] AC-SD-003: Component MUST accept `size` input (sm, md, lg)
- [ ] AC-SD-004: Component MAY accept `showValue` input (boolean)
- [ ] AC-SD-005: If `showValue` true, MUST display numeric rating
- [ ] AC-SD-006: Stars MUST be gold color (#FFC043)

### ReviewCard Component

- [ ] AC-RC-001: Component MUST display reviewer name
- [ ] AC-RC-002: Component MUST display reviewer avatar (or initials)
- [ ] AC-RC-003: Component MUST display star rating
- [ ] AC-RC-004: Component MUST display review date
- [ ] AC-RC-005: Component MUST display review content
- [ ] AC-RC-006: Content MUST be expandable if > 250 chars
- [ ] AC-RC-007: Component MUST display photos if present
- [ ] AC-RC-008: Photos MUST open in lightbox on click
- [ ] AC-RC-009: Component MUST show "Edited" badge if isEdited
- [ ] AC-RC-010: Component MAY show actions menu (edit/delete)

### ReviewDialog Component

- [ ] AC-RD-001: Dialog MUST have title ("Write a Review" or "Edit Review")
- [ ] AC-RD-002: Dialog MUST include StarRatingInput
- [ ] AC-RD-003: Dialog MUST include textarea for content
- [ ] AC-RD-004: Textarea MUST show character count
- [ ] AC-RD-005: Textarea MUST validate min 25 characters
- [ ] AC-RD-006: Textarea MUST validate max 2000 characters
- [ ] AC-RD-007: Dialog MUST include photo upload section
- [ ] AC-RD-008: Photo upload MUST limit to 5 photos
- [ ] AC-RD-009: Dialog MUST have Cancel button
- [ ] AC-RD-010: Dialog MUST have Submit button
- [ ] AC-RD-011: Submit MUST be disabled if form invalid
- [ ] AC-RD-012: Dialog MUST show loading state on submit
- [ ] AC-RD-013: Dialog MUST emit save event with review data
- [ ] AC-RD-014: For edit mode, MUST pre-fill existing data

### ContractReviewDialog Component

- [ ] AC-CD-001: Dialog MUST show overall rating (StarRatingInput)
- [ ] AC-CD-002: Dialog MUST show 4 criteria ratings:
  - Quality (1-5)
  - Communication (1-5)
  - Professionalism (1-5)
  - Timeliness (1-5)
- [ ] AC-CD-003: Each criteria MUST have label and star input
- [ ] AC-CD-004: Dialog MUST include textarea for content
- [ ] AC-CD-005: Content MUST be 25-1000 characters
- [ ] AC-CD-006: Dialog MUST show who is being reviewed
- [ ] AC-CD-007: All fields MUST be required
- [ ] AC-CD-008: Submit MUST validate all criteria selected

### CriteriaRating Component

- [ ] AC-CR-001: Component MUST display 4 criteria with ratings
- [ ] AC-CR-002: Each criteria MUST show label and stars
- [ ] AC-CR-003: Component MUST accept `criteriaRatings` input
- [ ] AC-CR-004: Display MUST be read-only

### ReviewStats Component

- [ ] AC-RS-001: Component MUST display average rating (large)
- [ ] AC-RS-002: Component MUST display total review count
- [ ] AC-RS-003: Component MUST display rating distribution bars
- [ ] AC-RS-004: Distribution bars MUST be proportional
- [ ] AC-RS-005: Each bar MUST show star level and count

---

## Component Designs

### StarRatingInput

```
Interactive (editable):
☆ ☆ ☆ ☆ ☆  (unselected)
★ ★ ★ ★ ☆  (4 selected, hovering)
★ ★ ★ ★ ★  (5 selected)
```

### StarRating (Display)

```
Small:   ★★★★☆ 4.0
Medium:  ★★★★☆ 4.5 (25 reviews)
Large:   ★★★★☆
         4.5 out of 5
```

### ReviewCard

```
┌─────────────────────────────────────────────────────────────────┐
│ [Avatar] John D.                                     ★★★★★ 5/5 │
│          Feb 24, 2026                                          │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ "Amazing experience! The host was very knowledgeable and       │
│ explained everything clearly. I learned so much in just 2      │
│ hours. Highly recommended for anyone wanting to learn..."      │
│                                                    [Read more] │
│                                                                 │
│ 📷 [img] [img] [img]                                            │
│                                                                 │
│                                                    Edited ✎    │
└─────────────────────────────────────────────────────────────────┘
```

### CriteriaRating

```
┌─────────────────────────────────────────┐
│ Quality          ★★★★★                  │
│ Communication    ★★★★☆                  │
│ Professionalism  ★★★★★                  │
│ Timeliness       ★★★★☆                  │
└─────────────────────────────────────────┘
```

### ReviewStats

```
┌─────────────────────────────────────────────────────────────────┐
│     4.5          ★★★★☆                                          │
│   out of 5       Based on 125 reviews                           │
│ ─────────────────────────────────────────────────────────────── │
│ 5 ★ ████████████████████████████████████ 80                     │
│ 4 ★ ████████████████████  30                                    │
│ 3 ★ ████████  10                                                │
│ 2 ★ ███  4                                                      │
│ 1 ★ █  1                                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

```
shared/components/review/
├── star-rating-input/
│   ├── star-rating-input.component.ts
│   ├── star-rating-input.component.html
│   └── star-rating-input.component.spec.ts
├── star-rating/
│   ├── star-rating.component.ts
│   ├── star-rating.component.html
│   └── star-rating.component.spec.ts
├── review-card/
│   ├── review-card.component.ts
│   ├── review-card.component.html
│   └── review-card.component.spec.ts
├── review-dialog/
│   ├── review-dialog.component.ts
│   ├── review-dialog.component.html
│   └── review-dialog.component.spec.ts
├── contract-review-dialog/
│   ├── contract-review-dialog.component.ts
│   ├── contract-review-dialog.component.html
│   └── contract-review-dialog.component.spec.ts
├── criteria-rating/
│   ├── criteria-rating.component.ts
│   ├── criteria-rating.component.html
│   └── criteria-rating.component.spec.ts
├── review-stats/
│   ├── review-stats.component.ts
│   ├── review-stats.component.html
│   └── review-stats.component.spec.ts
└── index.ts
```

---

## Component Interfaces

```typescript
// Star Rating Input
export interface StarRatingInputProps {
  value: number;          // 0-5
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Star Rating Display
export interface StarRatingProps {
  rating: number;         // 0-5, supports decimals
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  reviewCount?: number;
}

// Review Card
export interface ReviewCardProps {
  review: {
    _id: string;
    rating: number;
    content: string;
    photos?: string[];
    isEdited?: boolean;
    createdAt: string;
    reviewer: {
      name: string;
      avatar?: string;
    };
  };
  showActions?: boolean;
  maxContentLength?: number;
}

// Review Dialog
export interface ReviewDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  bookingId: string;
  existingReview?: {
    _id: string;
    rating: number;
    content: string;
    photos?: string[];
  };
}

// Contract Review Dialog
export interface ContractReviewDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  contractId: string;
  revieweeHub: {
    _id: string;
    name: string;
    logo?: string;
  };
  existingReview?: {
    _id: string;
    rating: number;
    criteriaRatings: CriteriaRatings;
    content: string;
  };
}

// Criteria Ratings
export interface CriteriaRatings {
  quality: number;
  communication: number;
  professionalism: number;
  timeliness: number;
}

// Review Stats
export interface ReviewStatsProps {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
```

---

## Styling Guidelines

### Colors
- Star filled: `#FFC043` (gold)
- Star empty: `#E5E7EB` (gray-200)
- Star hover: `#FFD700` (brighter gold)

### Sizes
- Small: 16px stars
- Medium: 24px stars (default)
- Large: 32px stars

### Animations
- Star selection: scale bounce (0.9 → 1.1 → 1.0)
- Hover: slight grow (1.0 → 1.1)

---

## Edge Cases

- Zero rating: Display empty stars (no selection)
- Decimal ratings in display: Round to nearest 0.5 for partial stars
- Very long review content: Truncate with "Read more" toggle
- Missing reviewer avatar: Show initials fallback
- Photo load failure: Show placeholder image
- Dialog opened with no data: Handle null gracefully

## Observability

- Track component render performance
- Log dialog open/close events
- Monitor photo upload success rate

## Rollout & Rollback

- Components are standalone, no feature flags needed
- Rollback: Revert component code changes
- No data migrations

## Open Questions

- None at this time

---

## Verification

### Automated Tests

```bash
# Unit tests for each component
npm test -- --include "**/review/**/*.spec.ts"
```

### Manual Verification

1. Test star rating selection
2. Test keyboard navigation
3. Test review card expand/collapse
4. Test photo lightbox
5. Test dialog validation
6. Test responsive layouts
