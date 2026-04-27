# Notification System End-to-End Test Plan

## Overview

This document outlines the comprehensive test plan for testing all notification types in the Mereka v2 system. The test will cover **76 notification templates** across **8 categories** with **3 delivery channels** (In-App, Email, WhatsApp).

**Test User:** testingmereka09@gmail.com (Both Learner and Hub Owner)

---

## Notification Categories Summary

| Category | Total Templates | Learner-Facing | Hub-Facing |
|----------|-----------------|----------------|------------|
| System | 7 | 7 | 0 |
| Bookings | 15 | 9 | 6 |
| Jobs & Contracts | 14 | 0 | 14 |
| Payments | 14 | 1 | 13 |
| Members | 6 | 0 | 6 |
| Experiences | 4 | 0 | 4 |
| Chats | 3 | 3 | 0 |
| Subscriptions | 4 | 0 | 4 |
| **TOTAL** | **76** | **20** | **56** |

---

## Test Execution Phases

### Phase 1: Learner Dashboard - Notification Preferences UI
**Goal:** Verify notification preference settings are visible and toggleable

1. Navigate to `/dashboard/notification-settings`
2. Verify categories displayed:
   - [ ] Bookings (should show learner templates)
   - [ ] Chats
   - [ ] System
3. For each template, verify:
   - [ ] In-App toggle visible only if channel available
   - [ ] Email toggle visible only if channel available
   - [ ] WhatsApp toggle visible only if channel available
4. Toggle each preference and verify saved correctly

---

### Phase 2: Hub Dashboard - Notification Preferences UI
**Goal:** Verify hub notification preference settings

1. Switch to Hub mode via "Switch to Hub" button
2. Navigate to Hub Settings → Notification Preferences
3. Verify categories displayed:
   - [ ] Bookings
   - [ ] Jobs
   - [ ] Payments
   - [ ] Members
   - [ ] Experiences
4. Verify toggles work correctly

---

### Phase 3: System Notifications Testing

| Template ID | Trigger Action | Channels | How to Test |
|-------------|----------------|----------|-------------|
| `WELCOME_USER` | New user registration | Email, InApp | Create new test account |
| `EMAIL_VERIFICATION` | Registration | Email | Check email during registration |
| `OTP_LOGIN_CODE` | Login with OTP | Email, WhatsApp | ✅ Already tested during login |
| `LOGIN_SUCCESS` | New device login | InApp | Login from different session |
| `PASSWORD_RESET_LINK` | Forgot password | Email | Use forgot password flow |
| `PASSWORD_RESET_SUCCESS` | Password reset completed | Email, InApp | Complete password reset |
| `PASSWORD_CHANGED` | Change password in settings | Email, InApp | Change password from account settings |

---

### Phase 4: Booking Notifications Testing

#### 4.1 Learner-Side Booking Notifications

| Template ID | Trigger Action | Channels | How to Test |
|-------------|----------------|----------|-------------|
| `BOOKING_CONFIRMED_LEARNER` | Make a booking | Email, InApp, WhatsApp | Book an experience |
| `BOOKING_APPROVED` | Hub approves booking | Email, InApp, WhatsApp | Create pending booking, approve from hub |
| `BOOKING_REJECTED` | Hub rejects booking | Email, InApp | Create pending booking, reject from hub |
| `BOOKING_CANCELLED_LEARNER` | Learner cancels | Email, InApp, WhatsApp | Cancel own booking |
| `BOOKING_CANCELLED_BY_HOST` | Hub cancels | Email, InApp, WhatsApp | Cancel from hub side |
| `BOOKING_COMPLETED_LEARNER` | Session completed | Email, InApp | Mark booking as completed |
| `BOOKING_REMINDER` | Auto before booking | Email, WhatsApp | Schedule booking, wait for reminder |
| `BOOKING_REMINDER_1_HOUR` | 1 hour before | Email, InApp, WhatsApp | Manual trigger or wait |
| `BOOKING_REMINDER_1_DAY` | 1 day before | Email, WhatsApp | Manual trigger or wait |
| `MANUAL_BOOKING_CREATED_LEARNER` | Hub creates manual booking | Email, InApp | Create manual booking from hub |

#### 4.2 Hub-Side Booking Notifications

| Template ID | Trigger Action | Channels | How to Test |
|-------------|----------------|----------|-------------|
| `BOOKING_CONFIRMED_EXPERT` | New booking received | Email, InApp | When learner books |
| `BOOKING_CANCELLED_HOST` | Learner cancels | Email, InApp | Learner cancels booking |
| `BOOKING_COMPLETED_EXPERT` | Session completed | Email, InApp | Mark booking completed |
| `BOOKING_REMINDER_HOST` | Before session | Email, InApp | Auto trigger |
| `MANUAL_BOOKING_CREATED_EXPERT` | Manual booking assigned | Email, InApp | Create manual booking |
| `NEW_INQUIRY_RECEIVED` | Learner sends inquiry | Email, InApp | Send inquiry from learner |

---

### Phase 5: Jobs & Proposals Testing

**Prerequisites:** Hub must have at least one active job posting

| Template ID | Trigger Action | Channels | Target |
|-------------|----------------|----------|--------|
| `PROPOSAL_RECEIVED` | Expert submits proposal | Email, InApp | Hub |
| `PROPOSAL_WITHDRAWN` | Expert withdraws | InApp | Hub |
| `PROPOSAL_ACCEPTED` | Hub accepts proposal | Email, InApp, WhatsApp | Expert |
| `PROPOSAL_REJECTED` | Hub rejects proposal | Email, InApp | Expert |
| `JOB_OFFER_RECEIVED` | Hub sends offer | Email, InApp, WhatsApp | Expert |
| `JOB_OFFER_ACCEPTED` | Expert accepts | Email, InApp | Hub |
| `JOB_OFFER_DECLINED` | Expert declines | Email, InApp | Hub |

---

### Phase 6: Contract Notifications Testing

**Prerequisites:** Active contract between hub and expert

| Template ID | Trigger Action | Channels | Target |
|-------------|----------------|----------|--------|
| `CONTRACT_CREATED` | Create contract | Email, InApp | Both |
| `CONTRACT_CANCELLED_EXPERT` | Hub cancels | Email, InApp, WhatsApp | Expert |
| `CONTRACT_CANCELLED_CLIENT` | Expert cancels | Email, InApp | Hub |
| `CONTRACT_PAUSED` | Pause contract | InApp | Both |
| `CONTRACT_RESUMED` | Resume contract | InApp | Both |
| `TERMS_UPDATE_REQUESTED` | Request terms change | InApp | Other party |
| `TERMS_UPDATE_APPLIED` | Terms updated | Email, InApp | Both |
| `CONTRACT_COMPLETED` | Complete contract | Email, InApp | Both |

---

### Phase 7: Timelog & Milestone Testing

**Prerequisites:** Active hourly or milestone-based contract

#### 7.1 Timelog Notifications (Hourly Contracts)

| Template ID | Trigger Action | Channels | Target |
|-------------|----------------|----------|--------|
| `TIMELOG_SUBMITTED` | Expert submits hours | InApp | Hub |
| `TIMELOG_APPROVED` | Hub approves timelog | Email, InApp | Expert |
| `TIMELOG_REJECTED` | Hub rejects timelog | Email, InApp | Expert |
| `TIMELOG_PAYMENT_RECEIVED` | Payment processed | Email, InApp, WhatsApp | Expert |

#### 7.2 Milestone Notifications (Fixed-Price Contracts)

| Template ID | Trigger Action | Channels | Target |
|-------------|----------------|----------|--------|
| `MILESTONE_FUNDED` | Hub funds milestone | Email, InApp | Expert |
| `MILESTONE_SUBMITTED` | Expert submits work | Email, InApp | Hub |
| `MILESTONE_APPROVED` | Hub approves | Email, InApp | Expert |
| `MILESTONE_REJECTED` | Hub requests changes | Email, InApp | Expert |
| `MILESTONE_AUTO_RELEASED` | Auto-release after 7 days | Email, InApp | Both |

---

### Phase 8: Payment Notifications Testing

| Template ID | Trigger Action | Channels | Target |
|-------------|----------------|----------|--------|
| `PAYMENT_TRANSFERRED` | Payment to expert | Email, InApp, WhatsApp | Expert |
| `BOOKING_REFUNDED` | Booking refund | Email, InApp, WhatsApp | Learner |
| `WITHDRAWAL_INITIATED` | Request withdrawal | Email, InApp | Expert/Hub Owner |
| `WITHDRAWAL_CANCELLED` | Cancel withdrawal | Email, InApp | Expert/Hub Owner |
| `WITHDRAWAL_COMPLETED` | Withdrawal success | Email, InApp, WhatsApp | Expert/Hub Owner |
| `WITHDRAWAL_FAILED` | Withdrawal failure | Email, InApp, WhatsApp | Expert/Hub Owner |
| `WEEKLY_PAYOUT_PROCESSED` | Weekly payout | Email, InApp | Expert |
| `WEEKLY_PAYOUT_FAILED` | Payout failed | Email, InApp | Expert |
| `STRIPE_VERIFICATION_REQUIRED` | Stripe needs verification | Email, InApp | Hub |
| `PAYOUT_AVAILABLE` | Funds available | Email, InApp | Expert |

---

### Phase 9: Team/Member Notifications Testing

| Template ID | Trigger Action | Channels | Target |
|-------------|----------------|----------|--------|
| `HUB_INVITATION_EMAIL` | Invite team member | Email | Invitee |
| `HUB_MEMBER_JOINED` | Member accepts invite | InApp | Hub Admins |
| `INVITATION_CANCELLED` | Cancel invitation | Email | Invitee |
| `ROLE_CHANGED` | Change member role | Email, InApp | Member |
| `MEMBER_REMOVED` | Remove member | Email, InApp | Member |
| `OWNERSHIP_TRANSFERRED` | Transfer ownership | Email, InApp | Both |

---

### Phase 10: Experience Notifications Testing

| Template ID | Trigger Action | Channels | Target |
|-------------|----------------|----------|--------|
| `EXPERIENCE_SUBMITTED` | Submit for review | Email, InApp | Hub |
| `EXPERIENCE_APPROVED` | Admin approves | Email, InApp | Hub |
| `EXPERIENCE_REJECTED` | Admin rejects | Email, InApp | Hub |
| `EXPERIENCE_EXPIRING` | Near expiry | Email, InApp | Hub |

---

### Phase 11: Review & Feedback Testing

| Template ID | Trigger Action | Channels | Target |
|-------------|----------------|----------|--------|
| `REVIEW_REQUEST_LEARNER` | After booking completion | Email, InApp | Learner |
| `REVIEW_REMINDER_LEARNER` | 1 week after completion | Email | Learner |
| `NEW_REVIEW_RECEIVED` | Learner leaves review | Email, InApp | Hub |

---

### Phase 12: Chat/Messaging Testing

| Template ID | Trigger Action | Channels | Target |
|-------------|----------------|----------|--------|
| `NEW_CHAT_MESSAGE` | Receive message | InApp | Recipient |
| `UNREAD_MESSAGES_DIGEST` | Daily digest | Email | User with unread |

---

### Phase 13: Subscription Notifications Testing

| Template ID | Trigger Action | Channels | Target |
|-------------|----------------|----------|--------|
| `SUBSCRIPTION_RENEWED` | Auto-renew | Email, InApp | Hub Owner |
| `SUBSCRIPTION_PAYMENT_FAILED` | Payment fails | Email, InApp | Hub Owner |
| `SUBSCRIPTION_CANCELLED` | Cancel subscription | Email, InApp | Hub Owner |
| `SUBSCRIPTION_EXPIRING` | Near expiry | Email, InApp | Hub Owner |

---

## Test Execution Order (Recommended)

### Round 1: Basic Flow Testing

1. **Login & System** (5 min)
   - [x] Login with OTP → `OTP_LOGIN_CODE` ✅
   - [ ] Verify notification settings page loads

2. **Booking Flow** (15 min)
   - [ ] Make a booking as learner → `BOOKING_CONFIRMED_LEARNER`
   - [ ] Switch to hub, see booking → `BOOKING_CONFIRMED_EXPERT`
   - [ ] Complete the booking → `BOOKING_COMPLETED_*`

3. **Review Flow** (5 min)
   - [ ] Submit review as learner → `REVIEW_REQUEST_LEARNER`
   - [ ] Hub receives review → `NEW_REVIEW_RECEIVED`

4. **Job/Contract Flow** (15 min)
   - [ ] Create job posting from hub
   - [ ] Submit proposal as expert → `PROPOSAL_RECEIVED`
   - [ ] Accept proposal → `PROPOSAL_ACCEPTED`, `CONTRACT_CREATED`
   - [ ] Submit timelog/milestone
   - [ ] Approve and process payment

5. **Team Management** (10 min)
   - [ ] Invite team member → `HUB_INVITATION_EMAIL`
   - [ ] Accept invitation → `HUB_MEMBER_JOINED`
   - [ ] Change role → `ROLE_CHANGED`

### Round 2: Edge Cases & Error States

1. **Cancellations**
   - [ ] Cancel booking (learner side)
   - [ ] Cancel booking (hub side)
   - [ ] Cancel contract

2. **Rejections**
   - [ ] Reject proposal
   - [ ] Reject milestone
   - [ ] Reject timelog

3. **Payment Failures**
   - [ ] Withdrawal failed scenario
   - [ ] Subscription payment failed

---

## Verification Checklist

For each notification, verify:

### In-App Notifications
- [ ] Notification appears in notification bell
- [ ] Correct title and message
- [ ] Action button works (if applicable)
- [ ] Mark as read works
- [ ] Appears in notification history

### Email Notifications
- [ ] Email received (check backend logs for SendGrid call)
- [ ] Correct subject line
- [ ] Correct recipient
- [ ] Template renders correctly
- [ ] Links work

### WhatsApp Notifications
- [ ] WhatsApp message sent (check backend logs for Twilio call)
- [ ] Correct template used
- [ ] Variables substituted correctly

---

## Test Report Template

```
NOTIFICATION TEST REPORT
========================
Date: [DATE]
Tester: Claude Agent
Run #: [1/2]

SUMMARY
-------
Total Templates: 76
Tested: X
Passed: X
Failed: X
Skipped: X (with reason)

DETAILED RESULTS
----------------
[Category]: [Template ID]
  - In-App: ✅/❌/⏭️
  - Email: ✅/❌/⏭️
  - WhatsApp: ✅/❌/⏭️
  - Notes: [Any issues]

ISSUES FOUND
------------
1. [Issue description]
   - Template: [ID]
   - Channel: [channel]
   - Expected: [behavior]
   - Actual: [behavior]

RECOMMENDATIONS
---------------
[Any recommendations for fixes or improvements]
```

---

## Prerequisites Checklist

Before starting tests:

- [x] Backend server running on localhost:4000
- [x] Frontend app running on localhost:4202
- [x] Auth app running on localhost:4201
- [ ] MongoDB connected
- [ ] SendGrid configured (or mock mode)
- [ ] Twilio configured (or mock mode)
- [ ] Test user exists: testingmereka09@gmail.com
- [ ] Test hub exists with experiences
- [ ] Test job postings exist

---

## Notes

1. **OTP codes are logged in backend console** - Use these for login
2. **Email/WhatsApp may be mocked in dev** - Check backend logs for notification sends
3. **Some notifications are time-based** (reminders) - May need to trigger manually or mock time
4. **Same user can act as both learner and hub owner** - Use "Switch to Hub" button
