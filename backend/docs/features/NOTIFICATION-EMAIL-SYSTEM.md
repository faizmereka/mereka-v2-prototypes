# Notification & Email System

## Overview

This document describes the comprehensive notification and email system for Mereka v2, including:
- User & Hub notification preferences with granular control per notification type
- In-App Notification, Email, and WhatsApp templates with categories
- Role-based notification visibility for hub members/collaborators
- Email and WhatsApp logging and statistics

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Models](#data-models)
3. [Role-Based Notification Visibility](#role-based-notification-visibility)
4. [User Preferences - How It Works](#user-preferences---how-it-works)
5. [Backend API Endpoints](#backend-api-endpoints)
6. [Frontend Changes Required](#frontend-changes-required)
7. [Complete List of Notification Types](#complete-list-of-notification-types)
8. [Implementation Order](#implementation-order)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRIGGER EVENT                                   │
│                (booking, job offer, message, etc.)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CommunicationTriggerService                            │
│               triggerCommunication(templateId, data, userId)                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ In-App Notif.    │    │     Email        │    │    WhatsApp      │
└──────────────────┘    └──────────────────┘    └──────────────────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Check Preference │    │ Check Preference │    │ Check Preference │
│ + Role/Permission│    │ + Role/Permission│    │ + Role/Permission│
└──────────────────┘    └──────────────────┘    └──────────────────┘
        │                           │                           │
    allowed?                    allowed?                    allowed?
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Create In-App    │    │ Log to Email     │    │ Log to WhatsApp  │
│ Notification Log │    │ collection       │    │ collection       │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## Data Models

### 1. InAppNotificationTemplate (RENAMED from NotificationTemplate)

Renamed for clarity - this is for in-app notifications only.

**File:** `src/core/models/InAppNotificationTemplate.ts`

```typescript
import mongoose from 'mongoose';

/**
 * In-App Notification Template Schema
 * Stores templates for in-app notifications shown to users
 */
const inAppNotificationTemplateSchema = new mongoose.Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Title shown in preference settings UI
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Description shown in preference settings UI
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // Category for grouping in settings UI
    category: {
      type: String,
      enum: ['chats', 'bookings', 'jobs', 'promotions', 'system', 'experiences', 'members', 'payments'],
      required: true,
      index: true,
    },
    // Template body with {{placeholders}}
    body: {
      type: String,
      required: true,
    },
    // Optional action button configuration
    actions: [{
      label: { type: String, required: true },
      type: { type: String, enum: ['primary', 'secondary'], default: 'primary' },
      url: { type: String },
      actionType: { type: String }, // e.g., 'navigate', 'dismiss', 'accept', 'decline'
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'inAppNotificationTemplates',
  }
);

export interface IInAppNotificationTemplate extends mongoose.Document {
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: string;
  body: string;
  actions?: Array<{
    label: string;
    type: 'primary' | 'secondary';
    url?: string;
    actionType?: string;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const InAppNotificationTemplate = mongoose.model<IInAppNotificationTemplate>(
  'InAppNotificationTemplate',
  inAppNotificationTemplateSchema
);
```

**Example Template:**
```json
{
  "templateId": "BOOKING_CONFIRMATION",
  "name": "Booking Confirmation Notification",
  "title": "Booking Confirmations",
  "description": "Receive notifications when your booking is confirmed",
  "category": "bookings",
  "body": "Your booking for {{experienceName}} has been confirmed for {{date}} at {{time}}!",
  "actions": [
    { "label": "View Booking", "type": "primary", "url": "/bookings/{{bookingId}}" }
  ],
  "isActive": true
}
```

### 2. InAppNotificationLog (RENAMED from Notification)

Renamed for clarity - this stores the actual notification instances sent to users.

**File:** `src/core/models/InAppNotificationLog.ts`

```typescript
import mongoose from 'mongoose';

export enum InAppNotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

const inAppNotificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Optional: For hub-context notifications
    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      index: true,
    },
    templateId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    // Optional image/avatar for notification
    image: {
      type: String,
    },
    // Action buttons (populated from template or custom)
    actions: [{
      label: { type: String, required: true },
      type: { type: String, enum: ['primary', 'secondary'], default: 'primary' },
      url: { type: String },
      actionType: { type: String },
    }],
    // Additional data payload
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: Object.values(InAppNotificationStatus),
      default: InAppNotificationStatus.PENDING,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'inAppNotificationLogs',
  }
);

// Indexes
inAppNotificationLogSchema.index({ userId: 1, createdAt: -1 });
inAppNotificationLogSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
inAppNotificationLogSchema.index({ hubId: 1, createdAt: -1 });

export interface IInAppNotificationLog extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  hubId?: mongoose.Types.ObjectId;
  templateId?: string;
  title: string;
  message: string;
  image?: string;
  actions?: Array<{
    label: string;
    type: 'primary' | 'secondary';
    url?: string;
    actionType?: string;
  }>;
  data?: Record<string, unknown>;
  status: InAppNotificationStatus;
  isRead: boolean;
  readAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const InAppNotificationLog = mongoose.model<IInAppNotificationLog>(
  'InAppNotificationLog',
  inAppNotificationLogSchema
);
```

### 3. EmailTemplate (MODIFY)

Add `category`, `title`, and `description` fields.

**File:** `src/core/models/EmailTemplate.ts`

```typescript
// Add these fields to existing schema:
title: {
  type: String,
  required: true,
  trim: true,
},
description: {
  type: String,
  required: true,
  trim: true,
},
category: {
  type: String,
  enum: ['chats', 'bookings', 'jobs', 'promotions', 'system', 'experiences', 'members', 'payments'],
  required: true,
  index: true,
},
```

### 4. WhatsAppTemplate (NEW)

**File:** `src/core/models/WhatsAppTemplate.ts`

```typescript
import mongoose from 'mongoose';

const whatsAppTemplateSchema = new mongoose.Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['chats', 'bookings', 'jobs', 'promotions', 'system', 'experiences', 'members', 'payments'],
      required: true,
      index: true,
    },
    // WhatsApp Business API template name (from Meta)
    whatsAppTemplateName: {
      type: String,
      required: true,
      trim: true,
    },
    // Template language code
    languageCode: {
      type: String,
      default: 'en',
      trim: true,
    },
    // Preview of message body with {{placeholders}}
    bodyPreview: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'whatsAppTemplates',
  }
);

export interface IWhatsAppTemplate extends mongoose.Document {
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: string;
  whatsAppTemplateName: string;
  languageCode: string;
  bodyPreview: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const WhatsAppTemplate = mongoose.model<IWhatsAppTemplate>(
  'WhatsAppTemplate',
  whatsAppTemplateSchema
);
```

### 5. WhatsAppLog (NEW)

**File:** `src/core/models/WhatsAppLog.ts`

```typescript
import mongoose from 'mongoose';

export enum WhatsAppStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

const whatsAppLogSchema = new mongoose.Schema(
  {
    toPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    templateId: {
      type: String,
      required: true,
      index: true,
    },
    whatsAppTemplateName: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: Object.values(WhatsAppStatus),
      default: WhatsAppStatus.PENDING,
      index: true,
    },
    providerMessageId: {
      type: String,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      index: true,
    },
    error: {
      type: String,
    },
    sentAt: {
      type: Date,
      index: true,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'whatsAppLogs',
  }
);

// Indexes
whatsAppLogSchema.index({ toPhone: 1, createdAt: -1 });
whatsAppLogSchema.index({ templateId: 1, status: 1 });
whatsAppLogSchema.index({ userId: 1, createdAt: -1 });
whatsAppLogSchema.index({ hubId: 1, createdAt: -1 });

export interface IWhatsAppLog extends mongoose.Document {
  toPhone: string;
  templateId: string;
  whatsAppTemplateName: string;
  data: Record<string, unknown>;
  status: WhatsAppStatus;
  providerMessageId?: string;
  userId?: mongoose.Types.ObjectId;
  hubId?: mongoose.Types.ObjectId;
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const WhatsAppLog = mongoose.model<IWhatsAppLog>('WhatsAppLog', whatsAppLogSchema);
```

### 6. UserNotificationPreference (NEW)

**File:** `src/core/models/UserNotificationPreference.ts`

```typescript
import mongoose from 'mongoose';

const preferenceItemSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const userNotificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Per-template preferences for each channel
    inApp: { type: [preferenceItemSchema], default: [] },
    email: { type: [preferenceItemSchema], default: [] },
    whatsApp: { type: [preferenceItemSchema], default: [] },

    summaryFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'none'],
      default: 'weekly',
    },
    globalMute: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'userNotificationPreferences',
  }
);

export interface IPreferenceItem {
  templateId: string;
  enabled: boolean;
}

export interface IUserNotificationPreference extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  inApp: IPreferenceItem[];
  email: IPreferenceItem[];
  whatsApp: IPreferenceItem[];
  summaryFrequency: 'daily' | 'weekly' | 'monthly' | 'none';
  globalMute: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const UserNotificationPreference = mongoose.model<IUserNotificationPreference>(
  'UserNotificationPreference',
  userNotificationPreferenceSchema
);
```

### 7. HubNotificationPreference (NEW)

**File:** `src/core/models/HubNotificationPreference.ts`

```typescript
import mongoose from 'mongoose';

const preferenceItemSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const hubNotificationPreferenceSchema = new mongoose.Schema(
  {
    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      unique: true,
      index: true,
    },
    // Per-template preferences for each channel
    inApp: { type: [preferenceItemSchema], default: [] },
    email: { type: [preferenceItemSchema], default: [] },
    whatsApp: { type: [preferenceItemSchema], default: [] },

    // Who receives hub notifications
    notifyOwner: { type: Boolean, default: true },
    notifyAdmins: { type: Boolean, default: true },

    summaryFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'none'],
      default: 'weekly',
    },
  },
  {
    timestamps: true,
    collection: 'hubNotificationPreferences',
  }
);

export interface IHubNotificationPreference extends mongoose.Document {
  hubId: mongoose.Types.ObjectId;
  inApp: IPreferenceItem[];
  email: IPreferenceItem[];
  whatsApp: IPreferenceItem[];
  notifyOwner: boolean;
  notifyAdmins: boolean;
  summaryFrequency: 'daily' | 'weekly' | 'monthly' | 'none';
  createdAt: Date;
  updatedAt: Date;
}

export const HubNotificationPreference = mongoose.model<IHubNotificationPreference>(
  'HubNotificationPreference',
  hubNotificationPreferenceSchema
);
```

---

## Role-Based Notification Visibility

### Current Role System (v2 Backend)

| Role | Key | Permissions | Notification Visibility |
|------|-----|-------------|------------------------|
| **Owner** | `owner` | ALL permissions | All hub notifications |
| **Admin** | `admin` | Most permissions (except financial/security) | All hub notifications |
| **Expert** | `expert` | Content creation, booking management | Own + assigned experience notifications |
| **Member** | `member` | View-only access | Own notifications only |
| **Collaborator** | `collaborator` | Assigned experience management only | Assigned experience notifications only |

### New Permissions to Seed

Add these permissions to the system for notification control:

**File:** `src/core/constants/permissions.ts` (MODIFY)

```typescript
// Add to PERMISSIONS constant
export const NOTIFICATION_PERMISSIONS = {
  // View notifications
  NOTIFICATION_VIEW_OWN: 'notification.viewOwn',           // View own notifications
  NOTIFICATION_VIEW_HUB: 'notification.viewHub',           // View all hub notifications

  // Receive notifications by type
  NOTIFICATION_RECEIVE_BOOKING: 'notification.receiveBooking',
  NOTIFICATION_RECEIVE_EXPERIENCE: 'notification.receiveExperience',
  NOTIFICATION_RECEIVE_JOB: 'notification.receiveJob',
  NOTIFICATION_RECEIVE_MEMBER: 'notification.receiveMember',
  NOTIFICATION_RECEIVE_PAYMENT: 'notification.receivePayment',
  NOTIFICATION_RECEIVE_SYSTEM: 'notification.receiveSystem',

  // Manage notifications
  NOTIFICATION_MANAGE_PREFERENCES: 'notification.managePreferences',  // Manage hub notification settings
};

// Add to ROLE_PERMISSIONS mapping
export const ROLE_NOTIFICATION_PERMISSIONS = {
  owner: [
    'notification.viewOwn',
    'notification.viewHub',
    'notification.receiveBooking',
    'notification.receiveExperience',
    'notification.receiveJob',
    'notification.receiveMember',
    'notification.receivePayment',
    'notification.receiveSystem',
    'notification.managePreferences',
  ],
  admin: [
    'notification.viewOwn',
    'notification.viewHub',
    'notification.receiveBooking',
    'notification.receiveExperience',
    'notification.receiveJob',
    'notification.receiveMember',
    'notification.receiveSystem',  // No payment notifications for admin
    'notification.managePreferences',
  ],
  expert: [
    'notification.viewOwn',
    'notification.receiveBooking',
    'notification.receiveExperience',
    'notification.receiveJob',
  ],
  member: [
    'notification.viewOwn',
  ],
  collaborator: [
    'notification.viewOwn',
    'notification.receiveExperience',  // Only assigned experiences
  ],
};
```

### Seed Script for New Permissions

**File:** `scripts/db/seed-notification-permissions.ts` (NEW)

```typescript
import { Permission, PermissionCategory } from '@core/models/Permission';
import { Role } from '@core/models/Role';

const notificationPermissions = [
  {
    key: 'notification.viewOwn',
    name: 'View Own Notifications',
    description: 'Can view own notifications',
    category: PermissionCategory.COMMUNICATION,
  },
  {
    key: 'notification.viewHub',
    name: 'View Hub Notifications',
    description: 'Can view all hub-level notifications',
    category: PermissionCategory.COMMUNICATION,
  },
  {
    key: 'notification.receiveBooking',
    name: 'Receive Booking Notifications',
    description: 'Receives notifications for booking events',
    category: PermissionCategory.COMMUNICATION,
  },
  {
    key: 'notification.receiveExperience',
    name: 'Receive Experience Notifications',
    description: 'Receives notifications for experience events',
    category: PermissionCategory.COMMUNICATION,
  },
  {
    key: 'notification.receiveJob',
    name: 'Receive Job Notifications',
    description: 'Receives notifications for job events',
    category: PermissionCategory.COMMUNICATION,
  },
  {
    key: 'notification.receiveMember',
    name: 'Receive Member Notifications',
    description: 'Receives notifications for team member events',
    category: PermissionCategory.COMMUNICATION,
  },
  {
    key: 'notification.receivePayment',
    name: 'Receive Payment Notifications',
    description: 'Receives notifications for payment events',
    category: PermissionCategory.COMMUNICATION,
  },
  {
    key: 'notification.receiveSystem',
    name: 'Receive System Notifications',
    description: 'Receives system-level notifications',
    category: PermissionCategory.COMMUNICATION,
  },
  {
    key: 'notification.managePreferences',
    name: 'Manage Notification Preferences',
    description: 'Can manage hub notification settings',
    category: PermissionCategory.COMMUNICATION,
  },
];

// Seed function
export async function seedNotificationPermissions() {
  for (const perm of notificationPermissions) {
    await Permission.findOneAndUpdate(
      { key: perm.key },
      { ...perm, isSystemPermission: true, isActive: true },
      { upsert: true }
    );
  }

  // Update role permissions...
}
```

### Notification Visibility Logic

```typescript
// In CommunicationTriggerService
async getHubNotificationRecipients(
  hubId: string,
  templateId: string,
  category: string
): Promise<string[]> {
  // 1. Get hub notification preferences
  const hubPrefs = await HubNotificationPreference.findOne({ hubId });

  // 2. Check if this notification type is enabled for hub
  const templatePref = hubPrefs?.inApp.find(p => p.templateId === templateId);
  if (templatePref && !templatePref.enabled) {
    return []; // Hub disabled this notification
  }

  // 3. Get the required permission for this category
  const requiredPermission = `notification.receive${capitalize(category)}`;

  // 4. Get all active hub members with the required permission
  const members = await HubMember.find({
    hubId,
    status: HubMemberStatus.ACTIVE,
  }).populate('roleIds');

  const recipients: string[] = [];

  for (const member of members) {
    // Check if member has required permission
    const hasPermission = member.roleIds.some(role =>
      role.permissions.some(p => p.key === requiredPermission)
    );

    if (!hasPermission) continue;

    // For collaborators, check if they're assigned to the relevant experience
    if (member.roleIds.some(r => r.key === 'collaborator')) {
      const isAssigned = await checkCollaboratorAssignment(member.userId, context);
      if (!isAssigned) continue;
    }

    // Check user's personal preferences
    const userPrefs = await UserNotificationPreference.findOne({ userId: member.userId });
    const userPref = userPrefs?.inApp.find(p => p.templateId === templateId);

    // Default to enabled if no preference set
    if (!userPref || userPref.enabled) {
      recipients.push(member.userId.toString());
    }
  }

  return recipients;
}
```

---

## User Preferences - How It Works

### Default Behavior

1. **No preference stored = Enabled** - If a templateId is not in the user's preference array, it defaults to enabled
2. **Explicit disable** - User must explicitly add `{ templateId: 'X', enabled: false }` to disable
3. **Lazy creation** - Preference document created on first access

### API Response Structure for Settings UI

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "category": "bookings",
        "label": "Bookings",
        "items": [
          {
            "templateId": "BOOKING_CONFIRMATION",
            "title": "Booking Confirmations",
            "description": "Receive notifications when your booking is confirmed",
            "inApp": { "enabled": true },
            "email": { "enabled": true },
            "whatsApp": { "enabled": false }
          },
          {
            "templateId": "BOOKING_REMINDER",
            "title": "Booking Reminders",
            "description": "Get reminded before your booking starts",
            "inApp": { "enabled": true },
            "email": { "enabled": true },
            "whatsApp": { "enabled": true }
          }
        ]
      },
      {
        "category": "jobs",
        "label": "Jobs",
        "items": [...]
      }
    ],
    "summaryFrequency": "weekly",
    "globalMute": false
  }
}
```

---

## Backend API Endpoints

### User Notification Preferences

| Method | Path | Description |
|--------|------|-------------|
| GET | `/account/notification-preferences` | Get user preferences grouped by category |
| PATCH | `/account/notification-preferences` | Update specific preferences |

### Hub Notification Preferences

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hubs/:hubId/settings/notification-preferences` | Get hub preferences |
| PATCH | `/hubs/:hubId/settings/notification-preferences` | Update hub preferences |

**Required Permission:** `notification.managePreferences`

### Statistics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hubs/:hubId/stats/communications` | Combined email + WhatsApp stats |
| GET | `/dashboard/communication-stats` | Learner communication stats |

### Admin Templates

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/admin/communications/in-app-templates` | In-App Notification Templates |
| GET/POST/PUT/DELETE | `/admin/communications/email-templates` | Email Templates |
| GET/POST/PUT/DELETE | `/admin/communications/whatsapp-templates` | WhatsApp Templates |

### Admin Logs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/communications/in-app-logs` | In-App Notification Logs |
| GET | `/admin/communications/email-logs` | Email Logs |
| GET | `/admin/communications/whatsapp-logs` | WhatsApp Logs |

---

## Frontend Changes Required

### 1. Notification Settings Page (Learner Dashboard)

**Location:** `mereka-frontend-workspace/projects/app/src/app/features/user-dashboard/pages/notifications/`

**UI Structure - Grouped by Category:**

```html
<div class="notification-settings">
  <!-- Global Controls -->
  <div class="global-controls">
    <div class="mute-all">
      <span>Mute all notifications</span>
      <toggle [(ngModel)]="globalMute"></toggle>
    </div>
  </div>

  <!-- Grouped by Category -->
  @for (category of categories) {
    <div class="category-section">
      <h3>{{ category.label }}</h3>

      @for (item of category.items) {
        <div class="preference-item">
          <div class="preference-info">
            <h4>{{ item.title }}</h4>
            <p>{{ item.description }}</p>
          </div>

          <div class="preference-toggles">
            <div class="toggle-group">
              <label>In-App</label>
              <toggle [(ngModel)]="item.inApp.enabled"></toggle>
            </div>
            <div class="toggle-group">
              <label>Email</label>
              <toggle [(ngModel)]="item.email.enabled"></toggle>
            </div>
            <div class="toggle-group">
              <label>WhatsApp</label>
              <toggle [(ngModel)]="item.whatsApp.enabled"></toggle>
            </div>
          </div>
        </div>
      }
    </div>
  }

  <!-- Summary Frequency -->
  <div class="summary-section">
    <h3>Summary Emails</h3>
    <select [(ngModel)]="summaryFrequency">
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
      <option value="none">Never</option>
    </select>
  </div>
</div>
```

### 2. Hub Notification Settings

Same structure with:
- Hub-specific categories (experiences, members, payments)
- `notifyOwner` and `notifyAdmins` toggles
- Role-based visibility (only shown to users with `notification.managePreferences` permission)

### 3. Admin Templates Management

Add tabs for:
- In-App Notification Templates (renamed from Notification Templates)
- Email Templates
- WhatsApp Templates

Each with: templateId, name, title, description, category, body/preview, actions, isActive

---

## Complete List of Notification Types

### From V1 Firebase (to migrate to v2)

#### In-App Notification Types (39 total)

**User Account & Authentication (6)**
| templateId | title | description | category |
|------------|-------|-------------|----------|
| LEARNER_VERIFY | Email Verification | Verify your email address | system |
| LEARNER_WELCOME | Welcome | Welcome to Mereka | system |
| CHANGE_PASSWORD | Password Change | Password change initiated | system |
| CHANGE_PASSWORD_SUCCESS | Password Changed | Password changed successfully | system |
| CHANGE_EMAIL | Email Change | Email change initiated | system |
| CHANGE_EMAIL_SUCCESS | Email Changed | Email changed successfully | system |

**Profile Management (3)**
| templateId | title | description | category |
|------------|-------|-------------|----------|
| CREATE_USER_PROFILE | Profile Created | Complete your profile | system |
| COMPLETE_USER_PROFILE | Complete Profile | Reminder to complete profile | system |
| COMPLETE_HUB_PROFILE | Complete Hub Profile | Reminder to complete hub profile | system |

**Hub & Team (3)**
| templateId | title | description | category |
|------------|-------|-------------|----------|
| HUB_INVITATION_SEND | Hub Invitation | Invitation to join a hub | members |
| HUB_INVITATION_JOINED | Member Joined | Someone joined your hub | members |
| LEARNER_JOINED_INVITATION | Invitation Accepted | Learner accepted invitation | members |

**Bookings (8)**
| templateId | title | description | category |
|------------|-------|-------------|----------|
| LEARNER_SEND_RECEIPT | Booking Receipt | Payment receipt for booking | bookings |
| LEARNER_SEND_CONFIRMATION | Booking Confirmation | Booking confirmed | bookings |
| LEARNER_SEND_CONFIRMATION_NON_BOOKER_PHYSICAL | Non-Booker Confirmation (Physical) | Confirmation for physical experience | bookings |
| LEARNER_SEND_CONFIRMATION_NON_BOOKER_ONLINE | Non-Booker Confirmation (Online) | Confirmation for online experience | bookings |
| LEARNER_SEND_CONFIRMATION_NON_BOOKER_SPACE | Non-Booker Confirmation (Space) | Confirmation for space booking | bookings |
| BOOKING_SEND_EMAIL_ADMIN | New Booking (Admin) | New booking notification | bookings |
| BOOKING_SEND_HOST | New Booking (Host) | New booking for your experience | bookings |
| EXPERIENCE_OPEN_FOR_INQUIRY | Experience Available | Experience open for booking | experiences |

**Booking Cancellations (4)**
| templateId | title | description | category |
|------------|-------|-------------|----------|
| BOOKING_CANCELLED_LEARNER_TO_LEARNER | Booking Cancelled | Your booking was cancelled | bookings |
| BOOKING_CANCELLED_LEARNER_TO_HUB | Booking Cancelled by Learner | Learner cancelled booking | bookings |
| BOOKING_CANCELLED_HUB_TO_HUB | Booking Cancelled (Hub) | Hub cancelled booking | bookings |
| BOOKING_CANCELLED_HUB_TO_LEARNER | Booking Cancelled by Hub | Hub cancelled your booking | bookings |

**Chat (1)**
| templateId | title | description | category |
|------------|-------|-------------|----------|
| NEW_CHAT_MESSAGE | New Message | You have a new message | chats |

**Expertise Bookings (4)**
| templateId | title | description | category |
|------------|-------|-------------|----------|
| EXPERTISE_BOOKING_REQUEST_HUB_TO_LEARNER | Expertise Request | Hub sent expertise request | bookings |
| EXPERTISE_BOOKING_REQUEST_LEARNER_TO_HUB | Expertise Request | Learner sent expertise request | bookings |
| EXPERTISE_BOOKING_HUB_EXPIRED | Request Expired (Hub) | Expertise request expired | bookings |
| EXPERTISE_BOOKING_LEARNER_EXPIRED | Request Expired (Learner) | Expertise request expired | bookings |

**Jobs & Contracts (6)**
| templateId | title | description | category |
|------------|-------|-------------|----------|
| JOB_BOOKING_EXPERT | Job Assigned | You've been assigned to a job | jobs |
| JOB_PROPOSAL_NOTIFICATION_TO_ADMIN | New Proposal | New job proposal submitted | jobs |
| JOB_OFFER_SENT_TO_USER | Job Offer | You received a job offer | jobs |
| JOB_OFFER_CANCELLED_BY_USER | Offer Cancelled | Job offer was cancelled | jobs |
| JOB_OFFER_DECLINED_BY_USER | Offer Declined | Job offer was declined | jobs |
| JOB_OFFER_ACCEPT_BY_USER | Offer Accepted | Job offer was accepted | jobs |

**Payments (2)**
| templateId | title | description | category |
|------------|-------|-------------|----------|
| PAYMENT_LINK_NOTIFICATION_TO_ADMIN | Payment Link | Payment link created | payments |
| PAYMENT_SUCCESS_NOTIFICATION_TO_USER | Payment Successful | Payment completed | payments |

#### Email Types (64 total)

**Team & Collaboration (5)**
- ADD_TEAM_MEMBER, ADD_COLLABORATOR_TO_EXPERIENCE, INVITE_COLLABORATOR_TO_EXPERIENCE
- REMOVE_HOST_FROM_EXPERIENCE, REMOVE_COLLABORATOR_FROM_EXPERIENCE

**Subscriptions & Payments (5)**
- SUBSCRIBE_NEWSLETTER, SUBSCRIPTION_RENEW, SUBSCRIPTION_PAYMENT_FAILED
- SUBSCRIPTION_PAYMENT_RECEIPT, HUB_STRIPE_NEW_POLICY_VERIFICATION

**Communication (1)**
- UNREAD_MESSAGE_DAILY

**Hub Management (3)**
- WITHDRAWAL_REMINDER_EMAIL_TO_HUB, INVITE_NEW_USER_AS_HUB_MEMBER, HUB_EXPERIENCE_CANCELLATION

**Experience Reminders (9)**
- EXPERIENCE_REMAINDER_USER, EXPERIENCE_REMAINDER_HUB_ONLINE, EXPERIENCE_REMAINDER_HUB_PHYSICAL
- EXPERIENCE_ONE_HOUR_REMAINDER, SPACE_BOOKING_EMAIL_FOR_NON_BOOKERS, SPACE_BOOKING_REMINDER_ONE_HOUR
- SPACE_FEEDBACK_EMAIL_ONE_WEEK, SPACE_FEEDBACK_EMAIL_TWO_WEEKS

**Booking Emails (9)**
- BOOKING_CANCEL_CONFIRMATION_TO_LEARNER, BOOKING_CANCELLED_HUB_TO_LEARNER
- BOOKING_CONFIRMATION_RECEIPT, BOOKING_CONFIRMATION_FOR_HUB
- LEARNER_SEND_CONFIRMATION_ONLINE, LEARNER_SEND_CONFIRMATION_PHYSICAL
- LEARNER_SEND_CONFIRMATION_NON_BOOKER_ONLINE, LEARNER_SEND_CONFIRMATION_NON_BOOKER_PHYSICAL
- LEARNER_SEND_CONFIRMATION_ONLINE_MEETING_LINK_CHANGED

**Experience (2)**
- EXPERIENCE_CANCELLATION_BY_LEARNER, REVIEW_REMAINDER_EMAIL

**Expertise (3)**
- EXPERTISE_BOOKING_CONFIRMATION_LEARNER, EXPERTISE_BOOKING_RECEIPT, EXPERTISE_BOOKING_CONFIRMATION_EXPERT

**Admin (2)**
- ADMIN_EDIT_EXPERIENCE_STATUS, JOB_LIVE_EMAIL

**Jobs & Contracts (12)**
- JOB_PROPOSAL_EMAIL_TO_ADMIN, PAYMENT_LINK_EMAIL_TO_ADMIN
- PAYMENT_SUCCESS_EMAIL_TO_ADMIN, PAYMENT_SUCCESS_EMAIL_TO_JOB_POSTER, PAYMENT_SUCCESS_EMAIL_TO_USER
- JOB_MATCH_EMAIL_TO_EXPERT, PROPOSAL_WITHDRAWAL_EMAIL_TO_JOB_POSTER
- JOB_OFFER_EMAIL_TO_EXPERT, OFFER_ACCEPTANCE_EMAIL_TO_JOBPOSTER
- FIXED_PRICE_ACCEPTANCE_EMAIL_TO_EXPERT, HOURLY_ACCEPTANCE_EMAIL_TO_EXPERT, OFFER_DECLINE_EMAIL_TO_JOBPOSTER

**Work & Milestones (3)**
- WORK_SUBMITTED_EMAIL_TO_CLIENT, MILESTONE_FUNDED_EMAIL_TO_EXPERT, PAYMENT_RECEIVED_EMAIL_TO_EXPERT

**Timesheet & Payout (3)**
- WEEKLY_TIMESHEET_EMAIL_TO_JOBPOSTER, WEEKLY_PAYOUT_EMAIL_TO_JOBPOSTER, PAYMENT_FAILURE_EMAIL_TO_JOBPOSTER

**Onboarding (3)**
- SCALE_PLAN_ONBOARDING_EMAIL, SOAR_PLAN_ONBOARDING_EMAIL, BASIC_PLAN_ONBOARDING_EMAIL

#### WhatsApp Types (4 total)

| templateId | title | description | category |
|------------|-------|-------------|----------|
| EXPERIENCE_REMINDER_BOOKER_1_HOUR | 1-Hour Reminder (Booker) | Reminder 1 hour before experience | bookings |
| EXPERIENCE_REMINDER_BOOKER_1_DAY | 1-Day Reminder (Booker) | Reminder 1 day before experience | bookings |
| EXPERIENCE_REMINDER_HOST_1_HOUR | 1-Hour Reminder (Host) | Reminder 1 hour before experience | experiences |
| EXPERIENCE_REMINDER_HOST_1_DAY | 1-Day Reminder (Host) | Reminder 1 day before experience | experiences |

---

## Implementation Order

### Backend (Phase 1-10)

1. **Phase 1:** Rename NotificationTemplate → InAppNotificationTemplate, add fields
2. **Phase 2:** Rename Notification → InAppNotificationLog, add hubId field
3. **Phase 3:** Add category, title, description to EmailTemplate
4. **Phase 4:** Create WhatsAppTemplate model
5. **Phase 5:** Create WhatsAppLog model
6. **Phase 6:** Create UserNotificationPreference model
7. **Phase 7:** Create HubNotificationPreference model
8. **Phase 8:** Seed notification permissions
9. **Phase 9:** Create preference services with role-based logic
10. **Phase 10:** Create controllers, routes, and schemas

### Frontend (Phase 11-15)

11. **Phase 11:** Create notification preferences service
12. **Phase 12:** Build learner notification settings (grouped by category)
13. **Phase 13:** Build hub notification settings (with role check)
14. **Phase 14:** Update admin templates (rename to In-App, add WhatsApp)
15. **Phase 15:** Update communication stats widget

---

## File Structure Summary

### Backend Files

```
src/core/
├── models/
│   ├── InAppNotificationTemplate.ts       # RENAMED from NotificationTemplate
│   ├── InAppNotificationLog.ts            # RENAMED from Notification
│   ├── EmailTemplate.ts                   # MODIFY - add category, title, description
│   ├── WhatsAppTemplate.ts                # NEW
│   ├── WhatsAppLog.ts                     # NEW
│   ├── UserNotificationPreference.ts      # NEW
│   └── HubNotificationPreference.ts       # NEW
├── constants/
│   └── permissions.ts                     # MODIFY - add notification permissions
├── services/
│   ├── shared/communications/
│   │   ├── inAppNotification.service.ts   # RENAMED
│   │   ├── userNotificationPreference.service.ts
│   │   ├── whatsApp.service.ts
│   │   └── email.service.ts               # MODIFY
│   ├── admin/communications/
│   │   ├── adminInAppNotificationTemplate.service.ts  # RENAMED
│   │   ├── adminEmailTemplate.service.ts  # MODIFY
│   │   └── adminWhatsAppTemplate.service.ts # NEW
│   └── hub/
│       └── hubNotificationPreference.service.ts

scripts/db/
└── seed-notification-permissions.ts       # NEW
```

---

## Notes

- **No actual sending for now** - Emails and WhatsApp messages are logged only
- **Per-template control** - Users can enable/disable each specific notification type
- **Grouped by category** - UI groups preferences by category for better UX
- **Default = Enabled** - If no explicit preference, notifications are enabled
- **Role-based visibility** - Hub notifications filtered by user role/permissions
- **Collaborator-specific** - Collaborators only see assigned experience notifications

---

## Related Documentation

- [MULTI-APP-ARCHITECTURE.md](../architecture/MULTI-APP-ARCHITECTURE.md)
- [SERVICE-ARCHITECTURE.md](../architecture/SERVICE-ARCHITECTURE.md)
- [ADMIN-FRONTEND-UI.md](../dev/ADMIN-FRONTEND-UI.md)

---

_Last updated: 2025-02-07_
