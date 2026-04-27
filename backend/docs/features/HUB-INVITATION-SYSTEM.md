# Hub Invitation System - V2 Implementation

## 📋 Overview

Hub invitation system allows hub owners and admins to invite team members to join their hub with specific roles and permissions.

**Key Features**:
- Email-based invitations with unique tokens
- Shareable invitation links
- Role-based access control (using existing Role/Permission system)
- No plan limits
- Simplified flow without email notifications

---

## 🏗️ V2 Architecture

### Existing Models (Already Implemented)

#### 1. HubMember Model (`src/models/HubMember.ts`)

**Purpose**: Tracks team members within a hub

**Key Fields**:
```typescript
{
  hubId: ObjectId;           // Reference to Hub
  userId: ObjectId;          // Reference to User
  roleId: ObjectId;          // Reference to Role (owner/admin/manager/staff/viewer)
  status: 'active' | 'invited' | 'suspended' | 'left';

  // Invitation tracking
  invitedBy?: ObjectId;      // Who invited them
  invitedAt?: Date;
  joinedAt?: Date;
  invitationToken?: string;  // Unique token for invitation link
  invitationExpiry?: Date;   // 30 days expiry

  // Metadata
  title?: string;            // Job title
  department?: string;
}
```

**Status Flow**:
```
invited → active (when invitation accepted)
active → suspended (temporarily disabled)
active → left (member leaves/removed)
```

#### 2. Role Model (`src/models/Role.ts`)

**Purpose**: Defines roles with permissions

**System Roles**:
- `owner` - Full hub control
- `admin` - Team & content management (no billing)
- `manager` - Content & booking management
- `staff` - Booking operations only
- `viewer` - Read-only access

**Key Fields**:
```typescript
{
  key: string;                    // 'owner', 'admin', etc.
  name: string;                   // 'Owner', 'Admin'
  description?: string;
  permissions: ObjectId[];        // Array of Permission IDs
  scope: 'system' | 'hub';       // System (global) or Hub-specific
  hubId?: ObjectId;              // If hub-specific role
  isSystemRole: boolean;         // Cannot be deleted
}
```

#### 3. Permission Model (`src/models/Permission.ts`)

**Purpose**: Granular permissions

**Permission Categories**:
- `content` - Experiences, services
- `booking` - Booking management
- `profile` - Hub profile editing
- `team` - Team member management
- `financial` - Financials, payouts
- `settings` - Integrations, analytics

**Example Permissions**:
- `canCreateExperiences`
- `canEditExperiences`
- `canViewBookings`
- `canInviteMembers`
- `canRemoveMembers`
- `canViewFinancials`

---

## 👥 Multi-Hub Membership

### How It Works

Users can be members of **multiple hubs simultaneously**. Each hub membership is tracked as a separate `HubMember` record.

### Database Structure

```typescript
// Unique compound index ensures one membership per hub
hubMemberSchema.index({ hubId: 1, userId: 1 }, { unique: true });
```

### Example Scenario

**User: john@example.com (userId: "user_123")**

```javascript
// Can have multiple HubMember records
[
  {
    hubId: "hub_creative",
    userId: "user_123",
    roleId: "role_admin",     // Admin in Creative Hub
    status: "active"
  },
  {
    hubId: "hub_tech",
    userId: "user_123",
    roleId: "role_staff",     // Staff in Tech Hub
    status: "active"
  },
  {
    hubId: "hub_design",
    userId: "user_123",
    roleId: "role_manager",   // Manager in Design Hub
    status: "active"
  }
]
```

### Invitation Rules

When inviting a user to a hub:

1. ✅ **Check membership in THIS hub only**
   ```typescript
   const existing = await HubMember.findOne({
     hubId: targetHubId,  // Only check THIS hub
     userId: userId
   });
   ```

2. ❌ **Don't check other hubs**
   - User being admin in Hub A doesn't prevent them from being staff in Hub B

3. **Handle existing membership by status**:
   - `active` → Already a member, reject invitation
   - `invited` → Pending invitation exists, reject duplicate
   - `left` → User left previously, allow re-invitation or reactivation
   - `suspended` → User is suspended, admin decision needed

### User's Hub List

To get all hubs a user is a member of:

```typescript
const userHubs = await HubMember.find({
  userId: userId,
  status: 'active'
})
.populate('hubId')
.populate('roleId');

// Returns: Array of hub memberships
[
  { hub: { name: "Creative Hub" }, role: { name: "Admin" } },
  { hub: { name: "Tech Hub" }, role: { name: "Staff" } },
  { hub: { name: "Design Hub" }, role: { name: "Manager" } }
]
```

---

## 🔄 Invitation Flow

### Email Invitation Flow

```
┌─────────────┐
│ Hub Admin   │
│ Enters      │
│ Emails &    │
│ Selects Role│
└──────┬──────┘
       │
       v
┌─────────────────────┐
│ Create HubMember    │
│ with status=invited │
│ Generate token      │
│ Set expiry (30 days)│
└──────┬──────────────┘
       │
       v
┌───────────────────────┐
│ Return invitation URL │
│ (No email sent)       │
└──────┬────────────────┘
       │
       v
┌──────────────────┐
│ User clicks link │
└──────┬───────────┘
       │
       v
┌────────────────────────┐
│ Verify token & expiry  │
│ Update status → active │
│ Set joinedAt timestamp │
└────────────────────────┘
```

### Link Invitation Flow

```
┌──────────────┐
│ Hub Admin    │
│ Creates Link │
│ Select Role  │
└──────┬───────┘
       │
       v
┌────────────────────┐
│ Generate unique    │
│ shareable token    │
│ Reusable by anyone │
└──────┬─────────────┘
       │
       v
┌───────────────────┐
│ Share link        │
│ (email/chat/etc)  │
└──────┬────────────┘
       │
       v
┌──────────────────┐
│ User clicks link │
└──────┬───────────┘
       │
       v
┌───────────────────────────┐
│ Create HubMember record   │
│ with status=active        │
│ Assign selected role      │
└───────────────────────────┘
```

---

## 🚀 API Endpoints

### 1. Create Email Invitations

**POST** `/api/v1/hubs/:hubId/members/invite`

**Purpose**: Invite users by email to join hub

**Request**:
```json
{
  "invitations": [
    {
      "email": "user@example.com",
      "roleKey": "admin",
      "title": "Community Manager"
    },
    {
      "email": "staff@example.com",
      "roleKey": "staff"
    }
  ]
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "created": 2,
    "invitations": [
      {
        "_id": "member_123",
        "hubId": "hub_456",
        "email": "user@example.com",
        "roleKey": "admin",
        "status": "invited",
        "invitationUrl": "https://mereka.io/invite/abc123xyz789",
        "expiresAt": "2025-12-14T10:00:00Z",
        "createdAt": "2025-11-14T10:00:00Z"
      }
    ]
  }
}
```

**Validations**:
- ✅ User has `canInviteMembers` permission
- ✅ Email not already invited
- ✅ Email not already a member
- ✅ Valid role key

**Business Logic**:
1. Find role by key
2. **Check if user already exists in THIS hub**:
   ```typescript
   // For email invitations (user not yet in system)
   const existingByEmail = await HubMember.findOne({
     hubId,
     // Find by email if user exists
   }).populate('userId');

   // Check status
   if (existingByEmail) {
     if (status === 'active') {
       throw new Error('User already a member');
     }
     if (status === 'invited') {
       throw new Error('Invitation already sent');
     }
     if (status === 'left') {
       // Option: Reactivate or create new invitation
     }
   }
   ```
3. Create HubMember with `status='invited'`
4. Generate unique invitation token (nanoid)
5. Set expiry to 30 days
6. Return invitation URLs

**Note**: User can be member of multiple hubs - we only check for membership in THIS specific hub.

---

### 2. Create Invitation Link

**POST** `/api/v1/hubs/:hubId/invitation-links`

**Purpose**: Create shareable invitation link

**Request**:
```json
{
  "roleKey": "staff",
  "maxUses": 10,
  "expiresInDays": 30
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "_id": "link_123",
    "hubId": "hub_456",
    "roleKey": "staff",
    "token": "abc123xyz789",
    "url": "https://mereka.io/join/abc123xyz789",
    "maxUses": 10,
    "usedCount": 0,
    "status": "active",
    "expiresAt": "2025-12-14T10:00:00Z",
    "createdAt": "2025-11-14T10:00:00Z"
  }
}
```

**Note**: Link invitations create a separate `InvitationLink` document, not HubMember records.

---

### 3. Accept Email Invitation

**POST** `/api/v1/invitations/:token/accept`

**Purpose**: Accept email invitation and join hub

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "member": {
      "_id": "member_123",
      "hubId": "hub_456",
      "userId": "user_789",
      "roleId": "role_abc",
      "status": "active",
      "joinedAt": "2025-11-14T10:00:00Z"
    },
    "hub": {
      "_id": "hub_456",
      "name": "Creative Hub",
      "slug": "creative-hub"
    },
    "role": {
      "_id": "role_abc",
      "key": "admin",
      "name": "Admin"
    }
  }
}
```

**Business Logic**:
1. Find HubMember by token
2. Verify status is 'invited'
3. Verify not expired
4. Verify authenticated user's email matches invitation
5. Update HubMember:
   - Set userId
   - Set status → 'active'
   - Set joinedAt timestamp
   - Clear invitationToken
6. Return member + hub + role details

---

### 4. Accept Link Invitation

**POST** `/api/v1/invitation-links/:token/join`

**Purpose**: Join hub via shareable link

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "member": {...},
    "hub": {...},
    "role": {...}
  }
}
```

**Business Logic**:
1. Find InvitationLink by token
2. Verify link active and not expired
3. Check maxUses limit (if set)
4. **Check user not already a member of THIS hub**:
   ```typescript
   const existingMember = await HubMember.findOne({
     hubId: link.hubId,
     userId: authenticatedUserId,
   });

   if (existingMember) {
     if (existingMember.status === 'active') {
       throw new Error('Already a member of this hub');
     }
     if (existingMember.status === 'invited') {
       // Activate existing invitation instead of creating new
       existingMember.status = 'active';
       existingMember.joinedAt = new Date();
       await existingMember.save();
       return existingMember;
     }
     if (existingMember.status === 'left') {
       // Reactivate
       existingMember.status = 'active';
       existingMember.joinedAt = new Date();
       await existingMember.save();
       return existingMember;
     }
   }
   ```
5. Create new HubMember:
   - Set userId from authenticated user
   - Set roleId from link
   - Set status → 'active'
   - Set joinedAt timestamp
6. Increment link usedCount
7. Return member + hub + role details

**Note**: Same user can join multiple different hubs using different invitation links.

---

### 5. List Hub Members

**GET** `/api/v1/hubs/:hubId/members`

**Query Params**:
- `status`: `active` | `invited` | `suspended` | `left`
- `roleKey`: `owner` | `admin` | `manager` | `staff` | `viewer`
- `search`: string (name/email)
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "_id": "member_123",
        "hubId": "hub_456",
        "user": {
          "_id": "user_789",
          "name": "John Doe",
          "email": "john@example.com",
          "profilePhoto": "https://..."
        },
        "role": {
          "_id": "role_abc",
          "key": "admin",
          "name": "Admin",
          "permissions": [...]
        },
        "status": "active",
        "title": "Community Manager",
        "invitedBy": {
          "_id": "user_000",
          "name": "Hub Owner"
        },
        "joinedAt": "2025-10-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 6. List Pending Invitations

**GET** `/api/v1/hubs/:hubId/invitations`

**Purpose**: List pending email invitations

**Response** (200):
```json
{
  "success": true,
  "data": {
    "invitations": [
      {
        "_id": "member_123",
        "email": "pending@example.com",
        "role": {
          "key": "admin",
          "name": "Admin"
        },
        "status": "invited",
        "invitedBy": {
          "name": "Hub Owner"
        },
        "invitedAt": "2025-11-14T10:00:00Z",
        "expiresAt": "2025-12-14T10:00:00Z"
      }
    ]
  }
}
```

---

### 7. Update Member Role

**PATCH** `/api/v1/hubs/:hubId/members/:memberId`

**Purpose**: Change member's role

**Request**:
```json
{
  "roleKey": "manager",
  "title": "Senior Manager"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "member": {...}
  }
}
```

**Validations**:
- ✅ User has `canEditMemberRoles` permission
- ✅ Cannot modify hub owner
- ✅ Valid role key

---

### 8. Remove Member

**DELETE** `/api/v1/hubs/:hubId/members/:memberId`

**Purpose**: Remove team member from hub

**Response** (200):
```json
{
  "success": true,
  "data": {
    "message": "Member removed successfully"
  }
}
```

**Validations**:
- ✅ User has `canRemoveMembers` permission
- ✅ Cannot remove hub owner
- ✅ Soft delete (status → 'left')

**Business Logic**:
1. Find member
2. Check permissions
3. Check not owner
4. Update status to 'left'
5. (Optional) Handle member's services/content

---

### 9. Cancel Invitation

**DELETE** `/api/v1/hubs/:hubId/invitations/:memberId`

**Purpose**: Cancel pending invitation

**Response** (200):
```json
{
  "success": true,
  "data": {
    "message": "Invitation cancelled"
  }
}
```

**Business Logic**:
1. Verify status is 'invited'
2. Delete HubMember record

---

## 🔐 Permission Checks

### Middleware: `requireHubPermission`

**Location**: `src/middlewares/hubPermission.middleware.ts`

```typescript
export async function requireHubPermission(
  permissionKey: string
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { hubId } = request.params;
    const userId = request.user.id;

    // Find member
    const member = await HubMember.findOne({
      hubId,
      userId,
      status: HubMemberStatus.ACTIVE
    }).populate('roleId');

    if (!member) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'NOT_HUB_MEMBER',
          message: 'Not a member of this hub'
        }
      });
    }

    // Check if role has permission
    const role = member.roleId as any;
    const hasPermission = await Permission.exists({
      _id: { $in: role.permissions },
      key: permissionKey,
      isActive: true
    });

    if (!hasPermission) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Missing permission: ${permissionKey}`
        }
      });
    }
  };
}
```

### Usage in Routes

```typescript
fastify.post('/hubs/:hubId/members/invite', {
  preHandler: [
    fastify.authenticate,
    requireHubPermission('canInviteMembers')
  ],
  handler: inviteMembers
});
```

---

## 📊 Database Schema Updates

### HubMember (Already Exists)

No changes needed - already has all required fields.

### New Model: InvitationLink

**File**: `src/models/InvitationLink.ts`

```typescript
export interface IInvitationLink extends Document {
  hubId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  token: string;
  maxUses?: number;
  usedCount: number;
  status: 'active' | 'expired' | 'disabled';
  createdBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `{ token: 1 }` (unique)
- `{ hubId: 1, status: 1 }`
- `{ expiresAt: 1 }`

---

## 🧪 Testing Strategy

### Unit Tests

**File**: `tests/unit/hubInvitation.service.test.ts`

- ✅ Create invitation with valid email
- ✅ Reject duplicate invitation
- ✅ Generate unique tokens
- ✅ Accept invitation updates status
- ✅ Reject expired invitations
- ✅ Remove member sets status to 'left'

### Integration Tests

**File**: `tests/integration/hubInvitation.routes.test.ts`

- ✅ Full email invitation flow
- ✅ Full link invitation flow
- ✅ Permission checks work
- ✅ Cannot modify owner
- ✅ Cannot invite existing member

---

## 📝 Implementation Checklist

### Phase 1: Core Invitation ✅
- [ ] Create InvitationLink model
- [ ] Create invitation service
- [ ] POST /hubs/:id/members/invite (email invite)
- [ ] POST /invitations/:token/accept
- [ ] Write unit tests

### Phase 2: Link Invitations ⏳
- [ ] POST /hubs/:id/invitation-links
- [ ] POST /invitation-links/:token/join
- [ ] GET /hubs/:id/invitation-links
- [ ] DELETE /hubs/:id/invitation-links/:id
- [ ] Write integration tests

### Phase 3: Member Management ⏳
- [ ] GET /hubs/:id/members
- [ ] GET /hubs/:id/invitations
- [ ] PATCH /hubs/:id/members/:id
- [ ] DELETE /hubs/:id/members/:id
- [ ] DELETE /hubs/:id/invitations/:id

### Phase 4: Permissions ⏳
- [ ] Create requireHubPermission middleware
- [ ] Apply to all routes
- [ ] Test permission checks

---

## 🚫 Out of Scope

Based on user requirements, the following are **NOT implemented**:

1. ❌ **Plan Limits** - No team member seat limits
2. ❌ **Email Notifications** - No email sending
3. ❌ **Member/Learner Role** - Only team roles (owner/admin/manager/staff/viewer)
4. ❌ **User.roles Array** - Using HubMember collection instead
5. ❌ **User.relatedHubs Array** - Using HubMember collection instead

---

**Documentation Version**: v2.0
**Last Updated**: 2025-11-14
**Status**: Ready for Implementation
