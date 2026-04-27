# 🏢 Hub Onboarding - Analysis & API Design

**Analyzed from**: `mereka-web/src/app/pages/hub/hub-onboard/`

---

## 📊 Current Frontend Flow

```
User creates a hub → Navigate to /hub-onboard

Step 1: Profile (/hub-onboard/profile)
  • Agency name, logo, slug
  • Phone number
  • Social links (website, LinkedIn, Facebook, Instagram, Email, Twitter)

Step 2: Details (/hub-onboard/details)
  • Location (address, city, country, lat/lng)
  • Operating hours
  • Intro video (YouTube/Vimeo)
  • Gallery (images)
  • Projects
  • Experiences
  • Qualifications

Step 3: About (/hub-onboard/about)
  • Title
  • Description (max 500 chars)
  • Amenities (array)
  • Facilities (array)
  • Focus areas
  • Tags (array)
  • Company type
  • Job preferences

Step 4: Confirm
  • Review and submit
```

---

## 📦 Current Firebase Data Model (iAgency)

```typescript
{
  // Basic Info
  agencyName: string,
  agencyLogo: string,
  slug: string,
  phoneNumber: string,
  coverImage: string,

  // Description
  title: string,
  agencyDescription: string,
  companyType: string,

  // Media
  introVideo: string,
  gallery: string[],

  // Location & Hours
  location: {
    city, state, country,
    streetAddress, postcode,
    lat, lng, url
  },
  operatingHours: {},

  // Social Links
  webUrl, fbUrl, linkedinUrl, instaUrl, emailUrl, twitterUrl,

  // Lists
  amenities: string[],
  facilities: string[],
  tags: string[],
  focusAreas: string,
  jobPreference: string[],

  // Nested Resources
  projects: [],
  experiences: [],
  qualifications: [],

  // Team
  experts: [],
  expertsInvitations: [],
  memberRequests: [],
  agencyMembers: [],

  // Status & Settings
  isCompleted: boolean,
  isActive: boolean,
  isApproved: boolean,
  isFeatured: boolean,
  completedSteps: number,
  autoPopulateImages: boolean,

  // Payment (Stripe)
  stripeCustomerId, stripeAccountId,
  bankDetails: {},

  // Subscription
  subscriptionId, planId, plan,

  // Metadata
  timestamp, expertUid, etc.
}
```

---

## 💡 Recommended MongoDB Design (Clean & Scalable)

### 1. Hub Collection (Core Data)

```typescript
{
  _id: ObjectId,

  // Basic (Required)
  name: string,
  slug: string,  // Use Slug collection for history
  logo: string,
  phoneNumber: string,

  // Description
  title: string,
  description: string,  // renamed from agencyDescription
  companyType: string,

  // Media
  coverImage: string,
  introVideo: string,
  gallery: string[],

  // Location
  location: {
    address: string,
    city: string,
    state: string,
    country: string,
    postcode: string,
    lat: number,
    lng: number
  },

  // Operating Hours
  operatingHours: {
    monday: { open: string, close: string, isClosed: boolean },
    tuesday: { ... },
    // etc
  },

  // Social Links
  socialLinks: {
    website, facebook, linkedin, instagram, twitter, email
  },

  // Arrays
  amenities: string[],
  facilities: string[],
  tags: string[],
  focusAreas: string[],
  jobPreferences: string[],

  // Status
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED',
  isActive: boolean,
  isFeatured: boolean,
  onboardingStep: number,  // 1-4, tracks progress

  // Ownership
  ownerId: ObjectId,  // User who created
  createdBy: ObjectId,
  lastUpdatedBy: ObjectId,

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Separate Collections (For Complex Data)

**HubProject Collection:**

```typescript
{
  _id: ObjectId,
  hubId: ObjectId,
  title: string,
  description: string,
  images: string[],
  tags: string[],
  createdAt: Date
}
```

**HubExperience Collection:**

```typescript
{
  _id: ObjectId,
  hubId: ObjectId,
  // Experience data
}
```

**HubQualification Collection:**

```typescript
{
  _id: ObjectId,
  hubId: ObjectId,
  // Qualification data
}
```

**HubTeam Collection:**

```typescript
{
  _id: ObjectId,
  hubId: ObjectId,
  userId: ObjectId,
  role: 'owner' | 'admin' | 'member',
  joinedAt: Date
}
```

---

## 🎯 Recommended API Design

### Core Hub APIs (Essential)

#### 1. POST /api/v1/hub

**Create new hub** (Step 1: Profile)

```json
{
  "name": "Makers Lab",
  "slug": "makerslab",
  "logo": "https://...",
  "phoneNumber": "+60123456789",
  "socialLinks": {
    "website": "https://makerslab.com",
    "linkedin": "https://linkedin.com/company/makerslab"
  }
}
```

#### 2. GET /api/v1/hub/me

**Get all hubs owned by current user**

#### 3. GET /api/v1/hub/:hubId

**Get specific hub**

#### 4. PATCH /api/v1/hub/:hubId

**Update hub** (All onboarding steps)

```json
{
  "description": "A creative space...",
  "location": {
    "address": "123 Main St",
    "city": "KL",
    "country": "Malaysia"
  },
  "operatingHours": { ... },
  "amenities": ["WiFi", "3D Printer"],
  "onboardingStep": 2  // Track progress
}
```

#### 5. POST /api/v1/hub/:hubId/publish

**Submit for review** (Complete onboarding)

---

### Nested Resource APIs (Optional - Can add later)

```
POST   /api/v1/hub/:hubId/projects
GET    /api/v1/hub/:hubId/projects
DELETE /api/v1/hub/:hubId/projects/:projectId

POST   /api/v1/hub/:hubId/team
GET    /api/v1/hub/:hubId/team
DELETE /api/v1/hub/:hubId/team/:memberId
```

---

## 🔄 Simplified Onboarding Flow

```
1. User clicks "Create Hub"
   ↓
2. POST /api/v1/hub
   Body: { name, slug, logo, phoneNumber }
   Returns: { hubId, status: "DRAFT" }
   ↓
3. User fills details
   PATCH /api/v1/hub/:hubId
   Body: { location, operatingHours, gallery }
   ↓
4. User fills about
   PATCH /api/v1/hub/:hubId
   Body: { description, amenities, facilities, tags }
   ↓
5. User confirms
   POST /api/v1/hub/:hubId/publish
   Status changes: DRAFT → PENDING_REVIEW
```

---

## 📋 Comparison with Learner Profile

| Feature    | Learner         | Hub                        |
| ---------- | --------------- | -------------------------- |
| Collection | User (extended) | Hub (separate)             |
| Slug       | Slug collection | Slug collection (same!)    |
| Ownership  | Self            | ownerId                    |
| Complexity | Simple          | Complex (nested resources) |
| Status     | None            | DRAFT/APPROVED/ACTIVE      |

**Key Differences:**

- Hub is a **separate resource** (not part of User)
- Hub can have **team members** (many users)
- Hub has **nested resources** (projects, experiences)
- Hub needs **approval workflow**
- Hub is **more complex**

---

## 🎯 Recommended Approach

### Phase 1: Core Hub CRUD (Essential)

1. ✅ Create Hub model
2. ✅ POST /hub - Create hub
3. ✅ GET /hub/me - Get my hubs
4. ✅ GET /hub/:hubId - Get hub
5. ✅ PATCH /hub/:hubId - Update hub
6. ✅ POST /hub/:hubId/publish - Submit for review

### Phase 2: Nested Resources (Later)

- Projects, Experiences, Qualifications
- Team management
- Can add when needed

---

## 💭 Design Decisions to Make

### 1. Slug System

**Question**: Use same Slug collection as learner?
**Recommendation**: ✅ YES - Same Slug collection, resourceType='hub'

### 2. Projects/Experiences Storage

**Question**: Embed in Hub or separate collection?
**Options:**

- **Embed**: Simple, but hub document gets large
- **Separate**: Cleaner, more flexible
  **Recommendation**: Start with embed, separate later if needed

### 3. Team Management

**Question**: Store in Hub or separate HubTeam collection?
**Recommendation**: Separate HubTeam collection (cleaner queries)

---

## 📖 Summary

**Hub is MORE complex than learner profile:**

- Separate collection (not in User)
- Multiple steps of onboarding
- Nested resources (projects, team, etc.)
- Approval workflow
- Team management

**Start with:**

- Core Hub model
- Basic CRUD APIs
- Slug integration
- Simple onboarding (save as DRAFT)

**Add later:**

- Nested resources
- Team management
- Approval workflow

---

**Want me to design the Hub APIs now?**

(Keeping it simpler than Firebase version, focusing on essentials first) 🚀
