# Notification Implementation Plan

## Overview

Implementing remaining notifications (excluding chat module) in 4 phases.

**Date:** 2026-02-11
**Status:** In Progress

---

## Phase 1: Service-based (Quick Wins)

| # | Template ID | Trigger Point | Status |
|---|-------------|---------------|--------|
| 1 | `NEW_REVIEW_RECEIVED` | When user submits a review | Skipped (needs Review model) |
| 2 | `EXPERIENCE_SUBMITTED` | When hub submits experience for approval | Pending (needs approval workflow) |
| 3 | `BOOKING_REFUNDED` | When booking is refunded | ✅ Done |

---

## Phase 2: Cron Jobs (Scheduled Notifications)

| # | Template ID | Schedule | Description | Status |
|---|-------------|----------|-------------|--------|
| 4 | `BOOKING_REMINDER_1_DAY` | Daily at 9:00 AM | Remind learner 1 day before | ✅ Done |
| 5 | `BOOKING_REMINDER_1_HOUR` | Every hour | Remind learner 1 hour before | ✅ Done |
| 6 | `BOOKING_REMINDER_HOST` | Daily at 9:00 AM | Remind host of upcoming bookings | ✅ Done |
| 7 | `REVIEW_REMINDER_LEARNER` | Daily at 10:00 AM | Remind to review completed bookings | ✅ Done |
| 8 | `SUBSCRIPTION_EXPIRING` | Daily at 8:00 AM | Warn about expiring subscriptions | ✅ Done |

---

## Phase 3: Stripe Webhooks

| # | Template ID | Stripe Event | Description | Status |
|---|-------------|--------------|-------------|--------|
| 9 | `SUBSCRIPTION_RENEWED` | `invoice.paid` | Subscription payment successful | ✅ Done |
| 10 | `SUBSCRIPTION_PAYMENT_FAILED` | `invoice.payment_failed` | Subscription payment failed | ✅ Done |
| 11 | `STRIPE_VERIFICATION_REQUIRED` | `account.updated` | Connect account needs verification | ✅ Done |
| 12 | `PAYOUT_AVAILABLE` | `payout.paid` | Payout completed | ✅ Done |

---

## Phase 4: Additional Flows

| # | Template ID | Trigger Point | Description | Status |
|---|-------------|---------------|-------------|--------|
| 13 | `EMAIL_VERIFICATION` | User registration | Verify email address | ✅ Done |
| 14 | `LOGIN_SUCCESS` | User login | Track successful logins | ✅ Done |

---

## Implementation Details

### Phase 1 Implementation

#### 1.1 NEW_REVIEW_RECEIVED
- **File:** `src/core/services/web/reviews/review.service.ts`
- **Trigger:** When `createReview()` is called
- **Recipient:** Hub owner (expert who received the review)
- **Data:** reviewerName, rating, comment, serviceName, hubName

#### 1.2 EXPERIENCE_SUBMITTED
- **File:** `src/core/services/hub/experiences/hubExperience.service.ts`
- **Trigger:** When experience status changes to require approval
- **Recipient:** Admin users
- **Data:** experienceName, hubName, submittedBy

#### 1.3 BOOKING_REFUNDED
- **File:** `src/core/services/shared/payments/booking.service.ts`
- **Trigger:** When refund is processed
- **Recipient:** Learner who was refunded
- **Data:** bookingId, amount, serviceName, hubName

---

### Phase 2 Implementation

#### 2.1 Booking Reminder Jobs
- **New File:** `src/jobs/notifications/booking-reminders.ts`
- **Schedule:**
  - 1-day: Daily at 9:00 AM UTC
  - 1-hour: Every hour at :00
  - Host: Daily at 9:00 AM UTC

#### 2.2 Review Reminder Job
- **New File:** `src/jobs/notifications/review-reminders.ts`
- **Schedule:** Daily at 10:00 AM UTC
- **Query:** Bookings completed > 24h ago, no review submitted

#### 2.3 Subscription Expiring Job
- **New File:** `src/jobs/notifications/subscription-expiring.ts`
- **Schedule:** Daily at 8:00 AM UTC
- **Query:** Subscriptions expiring in 7 days, 3 days, 1 day

---

### Phase 3 Implementation

#### 3.1 Update Stripe Webhook Handler
- **File:** `src/modules/hub/controllers/subscription/hubSubscription.controller.ts`
- **Add handlers for:**
  - `invoice.paid` → SUBSCRIPTION_RENEWED
  - `invoice.payment_failed` → SUBSCRIPTION_PAYMENT_FAILED
  - `account.updated` → STRIPE_VERIFICATION_REQUIRED
  - `payout.paid` → PAYOUT_AVAILABLE

---

### Phase 4 Implementation

#### 4.1 EMAIL_VERIFICATION
- **File:** `src/core/services/shared/auth/auth.service.ts`
- **Trigger:** After user registration (if email verification enabled)

#### 4.2 LOGIN_SUCCESS
- **File:** `src/core/services/shared/auth/auth.service.ts`
- **Trigger:** After successful login (optional, configurable)

---

## File Structure

```
src/jobs/notifications/
├── booking-reminders.ts      # BOOKING_REMINDER_1_DAY, 1_HOUR, HOST
├── review-reminders.ts       # REVIEW_REMINDER_LEARNER
└── subscription-expiring.ts  # SUBSCRIPTION_EXPIRING
```

---

## Progress Tracking

- [ ] Phase 1: Service-based (Requires new services/models)
  - [ ] NEW_REVIEW_RECEIVED - Needs Review model and service (Skipped)
  - [ ] EXPERIENCE_SUBMITTED - Needs approval workflow
  - [x] BOOKING_REFUNDED ✅ Added to booking.service.ts
- [x] Phase 2: Cron Jobs ✅ COMPLETED
  - [x] BOOKING_REMINDER_1_DAY
  - [x] BOOKING_REMINDER_1_HOUR
  - [x] BOOKING_REMINDER_HOST
  - [x] REVIEW_REMINDER_LEARNER
  - [x] SUBSCRIPTION_EXPIRING
- [x] Phase 3: Stripe Webhooks ✅ COMPLETED
  - [x] SUBSCRIPTION_RENEWED
  - [x] SUBSCRIPTION_PAYMENT_FAILED
  - [x] STRIPE_VERIFICATION_REQUIRED
  - [x] PAYOUT_AVAILABLE ✅ Added to hubSubscription.controller.ts
- [x] Phase 4: Additional Flows ✅ COMPLETED
  - [x] EMAIL_VERIFICATION ✅ Added verification link flow with dashboard banner
  - [x] LOGIN_SUCCESS ✅ Added to auth.service.ts

---

_Last updated: 2026-02-11_
