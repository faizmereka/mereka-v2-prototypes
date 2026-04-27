# ✅ Role & Permission System - Implementation Complete

**Date**: 2025-11-11
**Status**: ✅ Models & Core Logic Ready | 🚧 APIs Pending

---

## 📊 What We Built

### ✅ Completed

1. **Separate Collections Approach**
   - `Permission` collection - Stores all available permissions
   - `Role` collection - Stores roles (system + custom per-hub)
   - `HubMember` collection - Junction table with `roleId` reference

2. **Models Created**
   - `/src/models/Permission.ts` - 16 default permissions across 6 categories
   - `/src/models/Role.ts` - 5 system roles (Owner, Admin, Manager, Staff, Viewer)
   - `/src/models/HubMember.ts` - Updated to reference `roleId` instead of inline role

3. **Schemas Created**
   - `/src/schemas/permission.schema.ts` - CRUD validation for permissions
   - `/src/schemas/role.schema.ts` - CRUD validation for roles

4. **Services**
   - `/src/services/hubMember.service.ts` - Team member management (existing)
   - `/src/middlewares/hubMember.middleware.ts` - Permission checking middleware

5. **Hub Integration**
   - ✅ Updated `/src/services/hub-profile.service.ts`
   - ✅ Auto-adds creator as owner in `HubMember` when hub is created

6. **Seed Script**
   - `/src/scripts/seedPermissionsAndRoles.ts` - Initialize permissions & roles

7. **Documentation**
   - `/docs/features/hub/HUB-MEMBER-SYSTEM.md` - Complete usage guide

---

## 🏗️ Architecture

### Database Structure

```
┌─────────────┐
│ Permission  │  (16 default permissions)
│ _id         │
│ key         │  "canEditExperiences"
│ name        │  "Edit Experiences"
│ category    │  "content"
└─────────────┘
       ↑
       │
       │ references (array)
       │
┌─────────────┐
│ Role        │  (5 system roles + custom hub roles)
│ _id         │
│ key         │  "admin"
│ name        │  "Admin"
│ permissions │  [ObjectId, ObjectId, ...]
│ scope       │  "system" | "hub"
│ hubId       │  ObjectId (if scope=hub)
└─────────────┘
       ↑
       │
       │ references roleId
       │
┌─────────────┐
│ HubMember   │  (Junction table)
│ _id         │
│ hubId       │  → Hub
│ userId      │  → User
│ roleId      │  → Role
│ status      │  "active"
└─────────────┘
```

---

## 🚀 Setup Instructions

### 1. Run Seed Script (REQUIRED)

Before using the system, seed the default permissions and roles:

```bash
# Add script to package.json
"scripts": {
  "seed:permissions": "tsx src/scripts/seedPermissionsAndRoles.ts"
}

# Run it
npm run seed:permissions
```

**Output:**
```
🌱 Seeding Permissions and Roles...

📝 Seeding Permissions...
   + Created permission: canCreateExperiences
   + Created permission: canEditExperiences
   ...

✅ 16 permissions seeded

👥 Seeding System Roles...
   + Created role: owner
   + Created role: admin
   ...

✅ 5 system roles seeded
```

### 2. Test Hub Creation

Create a hub to verify auto-owner assignment:

```bash
POST /api/v1/hub-profile
{
  "agencyName": "Test Hub",
  "slug": "test-hub",
  "agencyLogo": "https://...",
  "phoneNumber": "+1234567890",
  "location": {
    "city": "Kuala Lumpur",
    "country": "Malaysia",
    "lat": 3.139,
    "lng": 101.687
  }
}
```

**Expected result:**
- Hub created
- Slug created
- **HubMember record created** with:
  - `hubId`: new hub ID
  - `userId`: current user ID
  - `roleId`: owner role ID
  - `status`: "active"

Verify:
```bash
# Check HubMember collection
db.hubmembers.findOne({ hubId: ObjectId("...") })
```

---

## 📋 Next Steps (To Implement)

### 1. Create Permission CRUD APIs

**File**: `src/controllers/permission.controller.ts`
**File**: `src/routes/permission.routes.ts`

```typescript
// Required endpoints
GET    /api/v1/admin/permissions       // List all permissions
GET    /api/v1/admin/permissions/:id   // Get permission by ID
POST   /api/v1/admin/permissions       // Create new permission
PATCH  /api/v1/admin/permissions/:id   // Update permission
DELETE /api/v1/admin/permissions/:id   // Delete permission (soft delete if referenced)
```

**Implementation tip**: Follow existing pattern in `src/controllers/experience.controller.ts`

### 2. Create Role CRUD APIs

**File**: `src/controllers/role.controller.ts`
**File**: `src/routes/role.routes.ts`

```typescript
// Required endpoints
GET    /api/v1/admin/roles             // List all roles (system + hub-specific)
GET    /api/v1/admin/roles/:id         // Get role by ID
POST   /api/v1/admin/roles             // Create new role
PATCH  /api/v1/admin/roles/:id         // Update role
DELETE /api/v1/admin/roles/:id         // Delete role (prevent if in use)

// Hub-specific roles
GET    /api/v1/hubs/:hubId/roles       // List roles available for this hub
POST   /api/v1/hubs/:hubId/roles       // Create custom role for hub
```

**Implementation tip**: Follow existing pattern + add permission middleware

### 3. Create HubMember APIs (When Ready)

You mentioned not creating these now, but here's what you'll need:

```typescript
GET    /api/v1/hubs/:hubId/members            // List members
POST   /api/v1/hubs/:hubId/members/invite     // Invite member
PATCH  /api/v1/hubs/:hubId/members/:userId/role  // Update role
DELETE /api/v1/hubs/:hubId/members/:userId    // Remove member
```

### 4. Update Existing Hub Routes with Permission Checks

Example: Protect experience creation with role check

```typescript
// routes/experience.routes.ts
import { requireHubRole } from '@middlewares/hubMember.middleware';
import { HubMemberRole } from '@models/HubMember';

fastify.post(
  '/hubs/:hubId/experiences',
  {
    preHandler: [
      authenticateUser,
      requireHubRole([HubMemberRole.OWNER, HubMemberRole.ADMIN, HubMemberRole.MANAGER]),
    ],
  },
  createExperience,
);
```

### 5. Migrate Existing Hubs (One-time Script)

Create migration script to add HubMember records for existing hubs:

```typescript
// scripts/migrateExistingHubsToHubMember.ts
const hubs = await Hub.find({});
const ownerRole = await Role.findOne({ key: 'owner', scope: 'system' });

for (const hub of hubs) {
  const existingMembership = await HubMember.findOne({
    hubId: hub._id,
    userId: hub.ownerId,
  });

  if (!existingMembership) {
    await HubMember.create({
      hubId: hub._id,
      userId: hub.ownerId,
      roleId: ownerRole._id,
      status: 'active',
      joinedAt: new Date(),
    });
  }
}
```

---

## 🔑 Key Features

### 1. System Roles (Global)

| Role      | Permissions                                             | Use Case        |
| --------- | ------------------------------------------------------- | --------------- |
| `owner`   | All permissions (16/16)                                 | Founder, CEO    |
| `admin`   | All except financial (14/16)                            | Operations Lead |
| `manager` | Content + bookings + analytics (7/16)                   | Program Manager |
| `staff`   | View and manage bookings only (2/16)                    | Front desk      |
| `viewer`  | Read-only (0/16)                                        | Accountant      |

### 2. Custom Hub Roles

Hub owners can create custom roles:

```typescript
// Example: Create "Content Creator" role
POST /api/v1/hubs/{hubId}/roles
{
  "key": "content-creator",
  "name": "Content Creator",
  "description": "Can create and publish experiences",
  "permissionIds": [
    "{canCreateExperiences_id}",
    "{canEditExperiences_id}",
    "{canPublishExperiences_id}",
    "{canManageMedia_id}"
  ],
  "scope": "hub",
  "hubId": "{hub_id}"
}
```

### 3. Permission Categories

```typescript
enum PermissionCategory {
  CONTENT = 'content',      // Experiences, services
  BOOKING = 'booking',      // Booking management
  PROFILE = 'profile',      // Hub profile editing
  TEAM = 'team',            // Team management
  FINANCIAL = 'financial',  // Financials, payouts
  SETTINGS = 'settings',    // Integrations, analytics
}
```

---

## 🎯 Usage Examples

### Example 1: Check if User Has Permission

```typescript
import { checkHubPermission } from '@middlewares/hubMember.middleware';

async function createExperience(hubId: string, userId: string, data: any) {
  // Check permission
  const canCreate = await checkHubPermission(hubId, userId, 'canCreateExperiences');

  if (!canCreate) {
    throw new Error('You do not have permission to create experiences');
  }

  // Continue with logic
  const experience = await Experience.create({ ...data, hubId });
  return experience;
}
```

### Example 2: Get User's Hubs with Roles

```typescript
import { HubMember } from '@models/HubMember';

const memberships = await HubMember.find({ userId })
  .populate('hubId', 'name slug logo')
  .populate('roleId', 'name key permissions')
  .lean();

// Response:
[
  {
    hubId: {
      name: 'Makers Lab',
      slug: 'makerslab',
    },
    roleId: {
      name: 'Owner',
      key: 'owner',
      permissions: [...],
    },
    status: 'active',
    joinedAt: '2025-01-15T...',
  },
];
```

### Example 3: Protect Route with Middleware

```typescript
import { requireHubPermission } from '@middlewares/hubMember.middleware';

fastify.delete(
  '/hubs/:hubId/experiences/:id',
  {
    preHandler: [
      authenticateUser,
      requireHubPermission('canDeleteExperiences'), // Checks if user has this permission
    ],
  },
  deleteExperience,
);
```

---

## 📊 Default Permissions (16 Total)

| Category      | Permission Key            | Description                           |
| ------------- | ------------------------- | ------------------------------------- |
| **Content**   | canCreateExperiences      | Can create new experiences            |
|               | canEditExperiences        | Can edit existing experiences         |
|               | canDeleteExperiences      | Can delete experiences permanently    |
|               | canPublishExperiences     | Can publish/unpublish experiences     |
| **Booking**   | canViewBookings           | Can view all bookings                 |
|               | canManageBookings         | Can create, edit, manage bookings     |
|               | canRefundBookings         | Can issue refunds                     |
| **Profile**   | canEditProfile            | Can edit hub profile                  |
|               | canManageMedia            | Can upload/delete media               |
| **Team**      | canInviteMembers          | Can invite team members               |
|               | canRemoveMembers          | Can remove team members               |
|               | canEditMemberRoles        | Can change member roles               |
| **Financial** | canViewFinancials         | Can view financial reports            |
|               | canManagePayouts          | Can manage payout settings            |
| **Settings**  | canManageIntegrations     | Can connect third-party services      |
|               | canViewAnalytics          | Can access analytics and reports      |

---

## ✅ Testing Checklist

- [ ] Run seed script successfully
- [ ] Create new hub → verify HubMember record created
- [ ] Query permissions → returns 16 permissions
- [ ] Query system roles → returns 5 roles
- [ ] Create custom role for a hub
- [ ] Assign custom role to a member
- [ ] Check permission with middleware
- [ ] Prevent last owner from being removed
- [ ] Test permission inheritance (owner has all permissions)

---

## 🎯 Summary

**What you have now:**
✅ Flexible role & permission system with separate collections
✅ 16 pre-defined permissions across 6 categories
✅ 5 system roles (Owner, Admin, Manager, Staff, Viewer)
✅ Auto-add creator as owner when hub is created
✅ Permission checking middleware
✅ Seed script for initialization

**What's next:**
🚧 Create Permission CRUD APIs (admin endpoints)
🚧 Create Role CRUD APIs (admin + hub-specific endpoints)
🚧 Create HubMember APIs (when ready - not urgent)
🚧 Update existing routes with permission checks
🚧 Run migration for existing hubs

---

**Ready to implement the APIs!** 🚀

Follow the patterns in existing controllers and you're good to go!
