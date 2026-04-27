# 👥 Hub Member System - Multi-Hub Membership with Roles & Permissions

**Status**: ✅ Implementation Ready
**Date**: 2025-11-11

---

## 📋 Overview

This system allows users to be members of multiple hubs with different roles and permissions in each hub.

### Key Features

✅ **Multi-hub support** - One user can be part of many hubs
✅ **Role-based access** - Owner, Admin, Manager, Staff, Viewer
✅ **Fine-grained permissions** - Optional per-member permission overrides
✅ **Invitation system** - Invite users via email with tokens
✅ **Audit trail** - Track who invited whom and when
✅ **Member limits** - Enforce subscription plan limits

---

## 🏗️ Architecture

### Database Design

```
┌─────────┐         ┌──────────────┐         ┌──────┐
│  User   │────────▶│  HubMember   │◀────────│ Hub  │
└─────────┘         └──────────────┘         └──────┘
                    (Junction Table)
```

**HubMember Collection** - Manages many-to-many relationship:
- One user → many hubs
- One hub → many users
- Each membership has a role + permissions

---

## 👥 Roles & Permissions

### Built-in Roles

| Role      | Description                                      | Use Case                        |
| --------- | ------------------------------------------------ | ------------------------------- |
| `OWNER`   | Full control (delete hub, billing, ownership)    | Founder, CEO                    |
| `ADMIN`   | Manage members, content, settings (no billing)   | Operations Manager              |
| `MANAGER` | Create/edit experiences, bookings, content       | Content Manager, Program Lead   |
| `STAFF`   | View/manage bookings, limited editing            | Front desk, Support             |
| `VIEWER`  | Read-only access                                 | Accountant, Consultant, Auditor |

### Permission Matrix

| Permission                | Owner | Admin | Manager | Staff | Viewer |
| ------------------------- | ----- | ----- | ------- | ----- | ------ |
| **Content Management**    |       |       |         |       |        |
| `canCreateExperiences`    | ✅     | ✅     | ✅       | ❌     | ❌      |
| `canEditExperiences`      | ✅     | ✅     | ✅       | ❌     | ❌      |
| `canDeleteExperiences`    | ✅     | ✅     | ❌       | ❌     | ❌      |
| `canPublishExperiences`   | ✅     | ✅     | ✅       | ❌     | ❌      |
| **Booking Management**    |       |       |         |       |        |
| `canViewBookings`         | ✅     | ✅     | ✅       | ✅     | ❌      |
| `canManageBookings`       | ✅     | ✅     | ✅       | ✅     | ❌      |
| `canRefundBookings`       | ✅     | ✅     | ❌       | ❌     | ❌      |
| **Hub Profile**           |       |       |         |       |        |
| `canEditProfile`          | ✅     | ✅     | ❌       | ❌     | ❌      |
| `canManageMedia`          | ✅     | ✅     | ✅       | ❌     | ❌      |
| **Team Management**       |       |       |         |       |        |
| `canInviteMembers`        | ✅     | ✅     | ❌       | ❌     | ❌      |
| `canRemoveMembers`        | ✅     | ✅     | ❌       | ❌     | ❌      |
| `canEditMemberRoles`      | ✅     | ✅     | ❌       | ❌     | ❌      |
| **Financial**             |       |       |         |       |        |
| `canViewFinancials`       | ✅     | ❌     | ❌       | ❌     | ❌      |
| `canManagePayouts`        | ✅     | ❌     | ❌       | ❌     | ❌      |
| **Settings**              |       |       |         |       |        |
| `canManageIntegrations`   | ✅     | ✅     | ❌       | ❌     | ❌      |
| `canViewAnalytics`        | ✅     | ✅     | ✅       | ❌     | ❌      |

---

## 🔧 Usage Examples

### 1. Protect Route with Role Check

```typescript
// routes/experience.routes.ts
import { requireHubRole } from '@middlewares/hubMember.middleware';
import { HubMemberRole } from '@models/HubMember';

fastify.post(
  '/hubs/:hubId/experiences',
  {
    preHandler: [
      authenticateUser, // First check user is logged in
      requireHubRole([HubMemberRole.OWNER, HubMemberRole.ADMIN, HubMemberRole.MANAGER]), // Then check role
    ],
  },
  createExperience,
);
```

### 2. Protect Route with Permission Check

```typescript
// routes/booking.routes.ts
import { requireHubPermission } from '@middlewares/hubMember.middleware';

fastify.post(
  '/hubs/:hubId/bookings/:bookingId/refund',
  {
    preHandler: [
      authenticateUser,
      requireHubPermission('canRefundBookings'), // Check specific permission
    ],
  },
  refundBooking,
);
```

### 3. Check Access in Service

```typescript
// services/experience.service.ts
import { checkHubPermission } from '@middlewares/hubMember.middleware';

async function createExperience(hubId: string, userId: string, data: any) {
  // Programmatic permission check
  const canCreate = await checkHubPermission(hubId, userId, 'canCreateExperiences');

  if (!canCreate) {
    throw new Error('You do not have permission to create experiences');
  }

  // Continue with business logic
  const experience = await Experience.create({ ...data, hubId });
  return experience;
}
```

### 4. Get User's Hubs

```typescript
// Get all hubs the user is a member of
const userHubs = await hubMemberService.getUserHubs(userId, {
  status: HubMemberStatus.ACTIVE,
  includeHubDetails: true,
});

// Response:
[
  {
    _id: '...',
    hubId: {
      name: 'Makers Lab',
      slug: 'makerslab',
      logo: 'https://...',
      status: 'active',
    },
    role: 'owner',
    joinedAt: '2025-01-15T...',
  },
  {
    _id: '...',
    hubId: {
      name: 'Creative Coworking',
      slug: 'creative-co',
      logo: 'https://...',
      status: 'active',
    },
    role: 'staff',
    joinedAt: '2025-02-20T...',
  },
];
```

### 5. Invite User to Hub

```typescript
// controllers/hubMember.controller.ts
const membership = await hubMemberService.inviteUser({
  hubId: req.params.hubId,
  email: 'john@example.com',
  role: HubMemberRole.STAFF,
  invitedBy: req.user.id,
  title: 'Community Manager',
  department: 'Operations',
});

// Email sent to john@example.com with invitation link
// Link: https://app.mereka.io/hub/invite/{invitationToken}
```

### 6. Handle Hub Creation (Auto-add Owner)

```typescript
// services/hub.service.ts
import { hubMemberService } from '@services/hubMember.service';

async function createHub(data: CreateHubInput, userId: string) {
  // Create hub
  const hub = await Hub.create({
    ...data,
    ownerId: userId, // Still keep ownerId for quick reference
    createdBy: userId,
    lastUpdatedBy: userId,
  });

  // IMPORTANT: Add creator as owner in HubMember
  await hubMemberService.addOwner(hub._id, userId);

  return hub;
}
```

---

## 📡 Recommended API Endpoints

### Team Management

```typescript
// Get hub members
GET    /api/v1/hubs/:hubId/members
// Query params: ?status=active&role=staff&includeUserDetails=true

// Invite member
POST   /api/v1/hubs/:hubId/members/invite
// Body: { email, role, title?, department? }
// Requires: Owner or Admin role

// Accept invitation
POST   /api/v1/hub-invitations/:token/accept
// No auth required (uses token)

// Update member role
PATCH  /api/v1/hubs/:hubId/members/:userId/role
// Body: { role: 'manager' }
// Requires: Owner or Admin role

// Update member permissions (fine-grained)
PATCH  /api/v1/hubs/:hubId/members/:userId/permissions
// Body: { canEditExperiences: true, canRefundBookings: false }
// Requires: Owner or Admin role

// Remove member
DELETE /api/v1/hubs/:hubId/members/:userId
// Requires: Owner or Admin role

// Suspend member
POST   /api/v1/hubs/:hubId/members/:userId/suspend
// Requires: Owner or Admin role

// Reactivate member
POST   /api/v1/hubs/:hubId/members/:userId/reactivate
// Requires: Owner or Admin role

// Transfer ownership
POST   /api/v1/hubs/:hubId/transfer-ownership
// Body: { newOwnerId }
// Requires: Owner role only

// Get my hubs (all hubs I'm a member of)
GET    /api/v1/my-hubs
// Returns array of hubs with role info
```

---

## 🔐 Security Best Practices

### 1. Always Check Membership Before Hub Operations

```typescript
// ❌ BAD - Only checks ownership
const hub = await Hub.findOne({ _id: hubId, ownerId: userId });

// ✅ GOOD - Checks membership
await requireHubMember(request, reply);
// Now req.hubMember contains role and permissions
```

### 2. Prevent Removing Last Owner

```typescript
// Automatically handled in service
await hubMemberService.removeMember(hubId, userId);
// Throws error if trying to remove last owner
```

### 3. Validate Member Limits (Subscription Plans)

```typescript
// Before inviting new member
const canAdd = await hubMemberService.canAddMember(hubId, maxMembers);

if (!canAdd) {
  throw new Error('Member limit reached for your plan. Upgrade to add more members.');
}
```

---

## 📊 Common Queries

### Find all hubs a user manages (owner/admin)

```typescript
const managedHubs = await HubMember.find({
  userId,
  role: { $in: [HubMemberRole.OWNER, HubMemberRole.ADMIN] },
  status: HubMemberStatus.ACTIVE,
})
  .populate('hubId')
  .lean();
```

### Find all active staff in a hub

```typescript
const staff = await HubMember.find({
  hubId,
  role: HubMemberRole.STAFF,
  status: HubMemberStatus.ACTIVE,
})
  .populate('userId', 'name email profilePhoto')
  .lean();
```

### Check if user has any role in hub

```typescript
const isMember = await HubMember.exists({
  hubId,
  userId,
  status: HubMemberStatus.ACTIVE,
});
```

---

## 🚀 Migration Strategy

### Step 1: Create HubMember records for existing hubs

```typescript
// migration script
const hubs = await Hub.find({});

for (const hub of hubs) {
  // Check if owner membership exists
  const ownerExists = await HubMember.findOne({
    hubId: hub._id,
    userId: hub.ownerId,
  });

  if (!ownerExists) {
    // Create owner membership
    await HubMember.create({
      hubId: hub._id,
      userId: hub.ownerId,
      role: HubMemberRole.OWNER,
      status: HubMemberStatus.ACTIVE,
      permissions: getDefaultPermissionsByRole(HubMemberRole.OWNER),
      joinedAt: hub.createdAt,
    });

    console.log(`Added owner for hub: ${hub.name}`);
  }
}
```

### Step 2: Update existing routes to use middleware

```typescript
// Before (old)
fastify.post('/hubs/:hubId/experiences', createExperience);

// After (new)
fastify.post(
  '/hubs/:hubId/experiences',
  {
    preHandler: [authenticateUser, requireHubRole([HubMemberRole.OWNER, HubMemberRole.ADMIN])],
  },
  createExperience,
);
```

---

## 📝 Testing Checklist

- [ ] User can be member of multiple hubs
- [ ] User has different roles in different hubs
- [ ] Owner can invite members
- [ ] Admin can invite members
- [ ] Staff cannot invite members
- [ ] Last owner cannot be removed
- [ ] Owner can transfer ownership
- [ ] Permissions are checked correctly
- [ ] Suspended members lose access
- [ ] Expired invitations are rejected
- [ ] Member limit is enforced

---

## 🎯 Next Steps

1. **Implement Hub Member APIs** (see recommended endpoints above)
2. **Update existing Hub routes** to use `requireHubMember` middleware
3. **Run migration** to create HubMember records for existing hubs
4. **Add invitation email** integration
5. **Frontend integration** for team management UI
6. **Add member activity logs** (optional)

---

**Ready to implement the APIs?** 🚀
