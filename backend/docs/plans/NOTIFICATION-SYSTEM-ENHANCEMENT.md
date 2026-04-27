# Notification System Enhancement Plan

## Overview

Enhance the notification system to support:
1. **Template Scoping** - User-level vs Hub-level templates
2. **Target User Types** - Define which user types receive each notification
3. **User-Per-Hub Preferences** - Users can customize preferences per hub they belong to

---

## Progress

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Template Enhancements (enums, models, seed, schemas, services) | ✅ Complete |
| Phase 2 | User-Per-Hub Preferences Model | ⏳ Pending |
| Phase 3 | API Endpoints | ⏳ Pending |
| Phase 4 | Admin Frontend | ⏳ Pending |
| Phase 5 | User Dashboard Frontend | ⏳ Pending |

**Last Updated:** 2024-02-09

---

## Current State

### Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `InAppNotificationTemplate` | In-app notification templates | templateId, category, body |
| `EmailTemplate` | Email templates | templateId, sendGridTemplateId |
| `WhatsAppTemplate` | WhatsApp templates | templateId, whatsAppTemplateName |
| `UserNotificationPreference` | User's personal preferences | userId, channels, globalMute |
| `HubNotificationPreference` | Hub-level settings | hubId, notifyOwner, notifyAdmins |
| `InAppNotificationLog` | Log of sent in-app notifications | userId, hubId, templateId |
| `Email` | Log of sent emails | userId, hubId, templateId |
| `WhatsAppLog` | Log of sent WhatsApp messages | userId, hubId, templateId |

### Current Limitations

1. Templates don't specify WHO should receive them (user types)
2. Templates don't specify SCOPE (user-level vs hub-level)
3. Users can't have different preferences per hub they belong to
4. Admin can't configure target audience when creating templates

---

## Proposed Changes

### Phase 1: Template Enhancements

#### 1.1 New Enums

```typescript
// src/core/models/enums/NotificationEnums.ts

/**
 * Notification Scope
 * - user: Personal notifications (password reset, welcome, etc.)
 * - hub: Hub-related notifications (bookings, payments, members, etc.)
 */
export enum NotificationScope {
  USER = 'user',
  HUB = 'hub',
}

/**
 * Target User Types
 * Defines which user types can receive this notification
 */
export enum TargetUserType {
  LEARNER = 'learner',
  EXPERT = 'expert',
  HUB_OWNER = 'hub_owner',
  HUB_ADMIN = 'hub_admin',
  HUB_COLLABORATOR = 'hub_collaborator',
}
```

#### 1.2 Template Model Updates

Add to all template models (InAppNotificationTemplate, EmailTemplate, WhatsAppTemplate):

```typescript
{
  // Existing fields...

  /**
   * Scope: user-level or hub-level notification
   * - user: Personal notifications (sent to individual users)
   * - hub: Hub-related notifications (sent to hub members based on roles)
   */
  scope: {
    type: String,
    enum: ['user', 'hub'],
    default: 'user',
    index: true,
  },

  /**
   * Target user types who should receive this notification
   * Empty array = all user types (backward compatible)
   */
  targetUserTypes: [{
    type: String,
    enum: ['learner', 'expert', 'hub_owner', 'hub_admin', 'hub_collaborator'],
  }],
}
```

#### 1.3 Template Categorization

| Category | Scope | Typical Target User Types |
|----------|-------|---------------------------|
| `system` | user | learner, expert, hub_owner |
| `bookings` | hub | learner (as recipient), hub_owner/admin (as provider) |
| `jobs` | hub | expert (as applicant), hub_owner/admin (as poster) |
| `payments` | hub | expert, hub_owner |
| `members` | hub | hub_owner, hub_admin, hub_collaborator |
| `promotions` | user | learner, expert |
| `chats` | both | all |
| `experiences` | hub | hub_owner, hub_admin |

---

### Phase 2: User-Per-Hub Preferences

#### 2.1 New Model: UserHubNotificationPreference

```typescript
// src/core/models/UserHubNotificationPreference.ts

/**
 * User Hub Notification Preference
 * Allows users to customize notification preferences per hub they belong to
 *
 * Use Cases:
 * - User is member of 3 hubs, wants to mute notifications from 1 hub
 * - User wants email for Hub A, but only in-app for Hub B
 */
const userHubNotificationPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  hubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hub',
    required: true,
    index: true,
  },

  // Channel preferences for this hub
  inApp: [{
    templateId: String,
    enabled: Boolean,
  }],
  email: [{
    templateId: String,
    enabled: Boolean,
  }],
  whatsApp: [{
    templateId: String,
    enabled: Boolean,
  }],

  // Mute all notifications from this hub
  muteAll: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  collection: 'userHubNotificationPreferences',
});

// Compound unique index
userHubNotificationPreferenceSchema.index({ userId: 1, hubId: 1 }, { unique: true });
```

#### 2.2 Preference Resolution Order

When sending a notification:

```
1. Check Template
   └── Is template active? Is user in targetUserTypes?

2. Check Hub Preferences (if scope = 'hub')
   └── HubNotificationPreference: Is template enabled for hub?

3. Check User-Hub Preferences (if scope = 'hub')
   └── UserHubNotificationPreference: Did user mute this hub?

4. Check User Preferences
   └── UserNotificationPreference: Is user's globalMute on?

5. Send via enabled channels
```

---

### Phase 3: API Endpoints

#### 3.1 Template Endpoints (Admin)

```
GET    /api/admin/templates/inapp           - List all with scope & targetUserTypes
POST   /api/admin/templates/inapp           - Create with scope & targetUserTypes
PUT    /api/admin/templates/inapp/:id       - Update scope & targetUserTypes
DELETE /api/admin/templates/inapp/:id       - Delete template

# Same for email and whatsapp templates
```

#### 3.2 User-Hub Preferences Endpoints

```
GET    /api/user/notification-preferences/hubs
       - List user's preferences for all hubs they belong to

GET    /api/user/notification-preferences/hubs/:hubId
       - Get preferences for specific hub

PUT    /api/user/notification-preferences/hubs/:hubId
       - Update preferences for specific hub
       - Body: { muteAll: boolean, inApp: [...], email: [...], whatsApp: [...] }

DELETE /api/user/notification-preferences/hubs/:hubId
       - Reset to defaults (delete custom preferences)
```

---

### Phase 4: Admin Frontend

#### 4.1 Template Form Enhancements

Update admin template forms to include:

```html
<!-- Scope Selection -->
<div class="form-group">
  <label>Notification Scope</label>
  <select formControlName="scope">
    <option value="user">User (Personal notifications)</option>
    <option value="hub">Hub (Hub-related notifications)</option>
  </select>
  <p class="hint">User scope: sent to individual users. Hub scope: sent to hub members.</p>
</div>

<!-- Target User Types -->
<div class="form-group">
  <label>Target User Types</label>
  <div class="checkbox-group">
    <label><input type="checkbox" value="learner"> Learner</label>
    <label><input type="checkbox" value="expert"> Expert</label>
    <label><input type="checkbox" value="hub_owner"> Hub Owner</label>
    <label><input type="checkbox" value="hub_admin"> Hub Admin</label>
    <label><input type="checkbox" value="hub_collaborator"> Collaborator</label>
  </div>
  <p class="hint">Select which user types should receive this notification.</p>
</div>
```

#### 4.2 Template List View

Add columns:
- **Scope**: Badge showing "User" or "Hub"
- **Target**: Comma-separated user types

---

### Phase 5: User Dashboard Frontend

#### 5.1 Per-Hub Notification Settings

In user dashboard notifications page, add a section:

```
┌─────────────────────────────────────────────────────┐
│ Hub Notification Settings                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Creative Studios                          [Mute] │ │
│ │ ○ All notifications  ● Customize               │ │
│ │   ☑ In-App  ☑ Email  ☐ WhatsApp               │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Tech Academy                              [Mute] │ │
│ │ ● All notifications  ○ Customize               │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Design Co                            [🔇 Muted] │ │
│ │ All notifications from this hub are muted       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Order

### Week 1: Backend - Template Enhancements

| Task | File | Description | Status |
|------|------|-------------|--------|
| 1.1 | `models/enums/NotificationEnums.ts` | Create new enums | ✅ Done |
| 1.2 | `models/InAppNotificationTemplate.ts` | Add scope, targetUserTypes | ✅ Done |
| 1.3 | `models/EmailTemplate.ts` | Add scope, targetUserTypes | ✅ Done |
| 1.4 | `models/WhatsAppTemplate.ts` | Add scope, targetUserTypes | ✅ Done |
| 1.5 | `scripts/db/seed-notification-templates.ts` | Update seed with scope & types | ✅ Done |
| 1.6 | `schemas/admin/communications/` | Update API schemas | ✅ Done |
| 1.7 | `services/admin/communications/` | Update template services | ✅ Done |

### Week 2: Backend - User-Hub Preferences

| Task | File | Description |
|------|------|-------------|
| 2.1 | `models/UserHubNotificationPreference.ts` | Create new model |
| 2.2 | `schemas/user/notification-preferences/` | API schemas |
| 2.3 | `services/user/notification-preferences/` | Preference service |
| 2.4 | `modules/web/routes/notification-preferences/` | API routes |
| 2.5 | `services/shared/communications/` | Update trigger service |

### Week 3: Admin Frontend

| Task | File | Description |
|------|------|-------------|
| 3.1 | Template form component | Add scope dropdown |
| 3.2 | Template form component | Add user type checkboxes |
| 3.3 | Template list component | Add scope & target columns |
| 3.4 | Template service | Update API calls |

### Week 4: User Dashboard Frontend

| Task | File | Description |
|------|------|-------------|
| 4.1 | User notification settings | Add hub preferences section |
| 4.2 | Hub preference card component | Create component |
| 4.3 | Notification preference service | Add hub preference methods |
| 4.4 | Testing & polish | End-to-end testing |

---

## Database Migration

### Migration Script

```typescript
// scripts/db/migrate-notification-templates.ts

async function migrateTemplates() {
  // Add default scope and targetUserTypes to existing templates

  // InApp Templates
  await InAppNotificationTemplate.updateMany(
    { scope: { $exists: false } },
    {
      $set: {
        scope: 'user',
        targetUserTypes: [],  // Empty = all types (backward compatible)
      }
    }
  );

  // Email Templates
  await EmailTemplate.updateMany(
    { scope: { $exists: false } },
    {
      $set: {
        scope: 'user',
        targetUserTypes: [],
      }
    }
  );

  // WhatsApp Templates
  await WhatsAppTemplate.updateMany(
    { scope: { $exists: false } },
    {
      $set: {
        scope: 'user',
        targetUserTypes: [],
      }
    }
  );
}
```

---

## Testing Checklist

### Unit Tests

- [ ] Template model validation with new fields
- [ ] Preference resolution logic
- [ ] User-hub preference CRUD operations

### Integration Tests

- [ ] Create template with scope and targetUserTypes via API
- [ ] Update template scope via API
- [ ] Send notification respects scope and targetUserTypes
- [ ] User-hub preference overrides work correctly

### E2E Tests

- [ ] Admin creates template with scope and user types
- [ ] User sets per-hub preferences
- [ ] Notifications respect all preference levels

---

## Rollback Plan

If issues arise:
1. All new fields have defaults (scope: 'user', targetUserTypes: [])
2. Empty targetUserTypes = all users (backward compatible)
3. Communication service falls back to current behavior if new fields missing

---

## Success Metrics

- [ ] All templates have correct scope and targetUserTypes assigned
- [ ] Admin can configure scope/types for new templates
- [ ] Users can customize preferences per hub
- [ ] Notification logs show correct scoping
- [ ] No regression in existing notification delivery

---

_Created: 2024-02-09_
_Status: Draft - Pending Approval_
