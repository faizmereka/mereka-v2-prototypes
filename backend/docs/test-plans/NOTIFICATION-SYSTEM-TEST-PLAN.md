# Notification System Test Plan

## Overview

This test plan covers end-to-end testing of the notification system including:
- Admin template management (Email, InApp, WhatsApp)
- User notification preferences
- Hub notification preferences
- Notification triggers and delivery
- Communication logs viewing

---

## Prerequisites

### Backend
```bash
npm run dev:k8s  # Running on http://localhost:3000
```

### Frontend
```bash
# Admin: http://localhost:4204
ng serve admin --port 4204

# App: http://localhost:4202
ng serve app --port 4202
```

### Test Accounts

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Admin | admin@mereka.io | Admin@123456 | Admin dashboard testing |
| User | testuser@test.com | Test@123456 | User dashboard testing |
| Hub Owner | hubowner@test.com | Test@123456 | Hub dashboard testing |

---

## Part 1: Admin Template Management

### 1.1 InApp Notification Templates

**URL:** `http://localhost:4204/dashboard/notifications`

#### Test Steps:

1. **Login to Admin**
   - Navigate to `http://localhost:4204`
   - Login with admin@mereka.io / Admin@123456

2. **View Templates Tab**
   - Click "Templates" tab
   - Verify templates list loads with columns: Name, Template ID, Category, Scope, Status

3. **Create New Template**
   - Click "Add Template" button
   - Fill form:
     ```
     Template ID: TEST_NOTIFICATION_001
     Name: Test Notification
     Title: Test Title
     Description: Test description
     Category: system
     Scope: user
     Target User Types: [learner, expert]
     Body: Hello {{userName}}, this is a test notification.
     Is Active: true
     ```
   - Save and verify success toast

4. **Edit Template**
   - Click edit on created template
   - Change title to "Updated Test Title"
   - Save and verify update

5. **Toggle Template Status**
   - Click status toggle to deactivate
   - Verify status changes to inactive
   - Toggle back to active

6. **Search Templates**
   - Use search box to filter by "WELCOME"
   - Verify WELCOME_USER template appears

7. **Filter by Category**
   - Filter by category "bookings"
   - Verify only booking templates shown

8. **Filter by Scope**
   - Filter by scope "hub"
   - Verify only hub-scoped templates shown

---

### 1.2 Email Templates

**URL:** `http://localhost:4204/dashboard/email`

#### Test Steps:

1. **View Email Logs Tab**
   - Navigate to Email page
   - Verify email logs display with: To, Type, Status, Sent At

2. **View Templates Tab**
   - Click "Templates" tab
   - Verify templates list with SendGrid template IDs

3. **Create Email Template**
   - Click "Add Template"
   - Fill form:
     ```
     Template ID: TEST_EMAIL_001
     Name: Test Email Template
     Title: Test Email
     Description: Test email description
     Category: system
     Scope: user
     SendGrid Template ID: d-test-template-id
     Is Active: true
     ```
   - Save and verify

4. **Filter Email Logs**
   - Filter by status: PENDING, SENT, FAILED
   - Filter by date range
   - Verify filters work correctly

---

### 1.3 WhatsApp Templates

**URL:** `http://localhost:4204/dashboard/whatsapp`

#### Test Steps:

1. **View WhatsApp Logs Tab**
   - Navigate to WhatsApp page
   - Verify logs display with: To, Template, Status, Sent At

2. **View Templates Tab**
   - Click "Templates" tab
   - Verify templates list

3. **Create WhatsApp Template**
   - Click "Add Template"
   - Fill form:
     ```
     Template ID: TEST_WHATSAPP_001
     Name: Test WhatsApp Template
     Title: Test WhatsApp
     Description: Test description
     Category: system
     WhatsApp Template Name: test_template
     Language Code: en
     Body Preview: Hello {{1}}, this is a test.
     Is Active: true
     ```
   - Save and verify

4. **Filter WhatsApp Logs**
   - Filter by status
   - Filter by date range

---

## Part 2: User Notification Preferences

### 2.1 Global User Preferences

**URL:** `http://localhost:4202/dashboard/settings/notifications`

#### Test Steps:

1. **Login as User**
   - Navigate to `http://localhost:4202`
   - Login with test user account

2. **Navigate to Notification Settings**
   - Go to Dashboard > Settings > Notifications

3. **View Preference Categories**
   - Verify categories displayed: System, Bookings, Jobs, Payments, etc.

4. **Toggle Email Preferences**
   - Turn OFF email for "Booking Confirmations"
   - Verify toggle saves (check network request)

5. **Toggle InApp Preferences**
   - Turn OFF inApp for "Payment Received"
   - Verify toggle saves

6. **Toggle WhatsApp Preferences**
   - Turn OFF whatsApp for "Booking Reminders"
   - Verify toggle saves

7. **Toggle All for Category**
   - Use "Toggle All" to disable entire category
   - Verify all preferences in category are OFF

8. **Verify Preferences Persist**
   - Refresh page
   - Verify preferences remain as set

---

### 2.2 Per-Hub User Preferences

**URL:** `http://localhost:4202/dashboard/settings/notifications/hubs/{hubId}`

#### Test Steps:

1. **View Hub-Specific Preferences**
   - Navigate to hub notification preferences
   - Select a hub from dropdown

2. **Override Global Preferences**
   - If global has email ON for bookings
   - Turn email OFF for this specific hub

3. **Inherit from Global**
   - Click "Reset to Global" button
   - Verify preferences match global settings

4. **Test Multiple Hubs**
   - Set different preferences for Hub A and Hub B
   - Verify each hub maintains its own settings

---

## Part 3: Hub Notification Preferences (Hub Owner)

### 3.1 Hub-Level Settings

**URL:** `http://localhost:4202/hub/{hubId}/settings/notifications`

#### Test Steps:

1. **Login as Hub Owner**
   - Login with hub owner account
   - Switch to Hub Dashboard

2. **Navigate to Hub Notification Settings**
   - Go to Settings > Notifications

3. **Configure Hub Defaults**
   - Set default notification preferences for hub members
   - Toggle booking notifications ON/OFF

4. **Verify Hub Settings Apply**
   - These settings affect what notifications hub sends to learners

---

## Part 4: Notification Triggers Testing

### 4.1 User Registration (WELCOME_USER)

#### Test Steps:

1. **Register New User**
   - Navigate to `http://localhost:4201/register`
   - Fill registration form
   - Submit

2. **Verify Notifications Created**
   - Check admin email logs for WELCOME_USER email
   - Check admin notification logs for WELCOME_USER inApp

3. **Verify User Sees Notification**
   - Login as new user
   - Check notification bell icon
   - Verify welcome notification appears

---

### 4.2 Booking Notifications

#### 4.2.1 Manual Booking Created (MANUAL_BOOKING_CREATED_LEARNER)

1. **Hub Owner Creates Manual Booking**
   - Login as hub owner
   - Go to Bookings > Create Manual Booking
   - Select learner, experience, date
   - Submit

2. **Verify Learner Notification**
   - Login as learner
   - Check notifications
   - Verify booking created notification

3. **Check Admin Logs**
   - Verify email log created
   - Verify inApp log created

#### 4.2.2 Booking Approved (BOOKING_APPROVED)

1. **Approve Pending Booking**
   - Hub owner approves a pending booking

2. **Verify Notifications**
   - Learner receives approval notification
   - Check email and inApp logs

#### 4.2.3 Booking Cancelled (BOOKING_CANCELLED_*)

1. **User Cancels Booking**
   - User cancels their booking

2. **Verify Notifications**
   - User receives cancellation confirmation
   - Hub owner receives cancellation notice

---

### 4.3 Preference-Based Delivery Testing

#### Test Scenario: Email Disabled

1. **Setup**
   - User disables email for BOOKING_CONFIRMED_LEARNER
   - Keep inApp enabled

2. **Trigger Booking**
   - Complete a booking flow

3. **Verify**
   - NO email log created for this user
   - InApp notification IS created
   - WhatsApp notification created (if enabled)

#### Test Scenario: All Channels Disabled

1. **Setup**
   - User disables all channels for a template

2. **Trigger Action**
   - Perform action that would trigger notification

3. **Verify**
   - No logs created for this user
   - Other users still receive notifications

---

## Part 5: Communication Logs Viewing

### 5.1 User Communication Logs

**URL:** `http://localhost:4202/dashboard/notifications/logs`

#### Test Steps:

1. **View All Logs**
   - Navigate to communication logs
   - Verify unified view of Email, InApp, WhatsApp

2. **Filter by Channel**
   - Filter by "Email Only"
   - Filter by "InApp Only"
   - Filter by "WhatsApp Only"

3. **Filter by Date**
   - Set date range
   - Verify filtered results

4. **View Log Details**
   - Click on a log entry
   - Verify details modal shows full information

---

### 5.2 Hub Communication Logs

**URL:** `http://localhost:4202/hub/{hubId}/settings/communication-logs`

#### Test Steps:

1. **View Hub Logs**
   - Navigate to hub communication logs
   - Verify logs show communications sent BY the hub

2. **Filter Hub Logs**
   - Filter by template type
   - Filter by recipient
   - Filter by date

---

## Part 6: Admin Notification Logs

### 6.1 View All System Logs

**URL:** `http://localhost:4204/dashboard/notifications` (Logs tab)

#### Test Steps:

1. **View All Notification Logs**
   - View paginated list of all inApp notifications
   - Verify columns: User, Title, Template, Status, Read, Created

2. **Filter Logs**
   - Filter by user ID
   - Filter by template ID
   - Filter by status (PENDING, SENT, DELIVERED, READ)
   - Filter by read status

3. **Search Logs**
   - Search by notification title
   - Search by message content

---

## Part 7: End-to-End Scenarios

### Scenario 1: Complete Booking Flow

```
1. User A browses experiences
2. User A books an experience
3. → BOOKING_CONFIRMED_LEARNER sent to User A (email + inApp)
4. → BOOKING_CONFIRMED_EXPERT sent to Hub Owner (email + inApp)
5. Hub Owner approves booking
6. → BOOKING_APPROVED sent to User A
7. User A cancels booking
8. → BOOKING_CANCELLED_LEARNER sent to User A
9. → BOOKING_CANCELLED_HOST sent to Hub Owner
```

### Scenario 2: Job/Contract Flow

```
1. Hub posts a job
2. Expert submits proposal
3. → PROPOSAL_RECEIVED sent to Hub
4. Hub accepts proposal
5. → PROPOSAL_ACCEPTED sent to Expert
6. Hub sends job offer
7. → JOB_OFFER_RECEIVED sent to Expert
8. Expert accepts
9. → JOB_OFFER_ACCEPTED sent to Hub
```

### Scenario 3: Preference Override

```
1. User sets global: email=ON, inApp=ON, whatsApp=OFF
2. User overrides for Hub X: email=OFF
3. Booking made on Hub X
4. → Only inApp notification sent (no email)
5. Booking made on Hub Y
6. → Both email and inApp sent
```

---

## Dev-Browser Automation Scripts

### Script 1: Admin Login and Template Creation

```typescript
import { connect, waitForPageLoad } from "@/client.js";

const client = await connect();
const page = await client.page("admin", { viewport: { width: 1920, height: 1080 } });

// Login
await page.goto("http://localhost:4204");
await waitForPageLoad(page);
await page.fill('input[type="email"]', 'admin@mereka.io');
await page.fill('input[type="password"]', 'Admin@123456');
await page.click('button[type="submit"]');
await waitForPageLoad(page);

// Navigate to notifications
await page.goto("http://localhost:4204/dashboard/notifications");
await waitForPageLoad(page);
await page.screenshot({ path: "tmp/admin-notifications.png" });

await client.disconnect();
```

### Script 2: User Preference Toggle

```typescript
import { connect, waitForPageLoad } from "@/client.js";

const client = await connect();
const page = await client.page("app", { viewport: { width: 1920, height: 1080 } });

// Login
await page.goto("http://localhost:4202");
await waitForPageLoad(page);
// ... login steps

// Navigate to notification settings
await page.goto("http://localhost:4202/dashboard/settings/notifications");
await waitForPageLoad(page);

// Toggle a preference
const emailToggle = await page.locator('[data-testid="email-toggle-BOOKING_CONFIRMED"]');
await emailToggle.click();

await page.screenshot({ path: "tmp/user-preferences.png" });
await client.disconnect();
```

### Script 3: Verify Notification Appeared

```typescript
import { connect, waitForPageLoad } from "@/client.js";

const client = await connect();
const page = await client.page("app");

// Click notification bell
await page.click('[data-testid="notification-bell"]');
await page.waitForSelector('[data-testid="notification-dropdown"]');

// Check for specific notification
const notification = await page.locator('text=Welcome to Mereka');
const isVisible = await notification.isVisible();
console.log("Welcome notification visible:", isVisible);

await page.screenshot({ path: "tmp/notifications-dropdown.png" });
await client.disconnect();
```

---

## Test Results Checklist

### Admin Templates
- [ ] InApp templates CRUD works
- [ ] Email templates CRUD works
- [ ] WhatsApp templates CRUD works
- [ ] Template filtering works
- [ ] Template search works

### User Preferences
- [ ] Global preferences save correctly
- [ ] Per-hub preferences override global
- [ ] Preferences persist after refresh
- [ ] Toggle all works for categories

### Hub Preferences
- [ ] Hub-level settings save
- [ ] Settings apply to outgoing notifications

### Notification Delivery
- [ ] WELCOME_USER triggers on registration
- [ ] BOOKING_* templates trigger correctly
- [ ] Preferences are respected (disabled = no delivery)
- [ ] Multi-channel delivery works

### Communication Logs
- [ ] User can view their logs
- [ ] Hub owner can view hub logs
- [ ] Admin can view all logs
- [ ] Filters work correctly

---

## Notes

- All timestamps should be in user's timezone
- Notification bell should show unread count
- Mark as read should update count
- Email status tracks SendGrid webhooks (if configured)
- WhatsApp status tracks delivery webhooks (if configured)
