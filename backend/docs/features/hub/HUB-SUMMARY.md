# 🏢 Hub Feature - Complete Analysis

**Frontend Source**: app.mereka.dev/hub-onboard
**Status**: Analysis Complete - Ready for API Design

---

## 📊 What is a Hub?

A **Hub** is a business/organization/space that:

- Has a profile (like a company page)
- Can offer experiences, services
- Has team members
- Has projects/portfolio
- Can be searched/discovered by learners

**Examples**: Maker spaces, coworking spaces, training centers, consulting firms

---

## 🎯 Hub Plans & Customization

### Plan Types

1. **Starter** - Solo expert/freelancer
   - Full onboarding
   - Can add experiences, qualifications
   - Job preferences

2. **Scale** - Small team/business
   - (Custom features)

3. **Soar** / **Hub** - Organization
   - Simplified onboarding
   - No experiences/qualifications needed
   - Focus on space/services

---

## 📝 Hub Onboarding Steps

### Step 1: Your Hub (Profile)

**Fields:**

- Hub name (required)
- Logo (required)
- Slug/Username (required, unique)
- Phone number (required)
- Cover image (optional)
- Social links (website, LinkedIn, Facebook, Instagram, Twitter, Email)

### Step 2: Hub Details

**Fields:**

- **Location**: Address, city, country, lat/lng, postcode
- **Operating Hours**: Mon-Sun with open/close times
- **Services**: Array of services offered
- **Intro Video**: YouTube/Vimeo URL
- **Gallery**: Array of images
- **Projects**: Portfolio items (title, description, images)
- **Experiences**: (Starter plan only)
- **Qualifications**: (Starter plan only)

### Step 3: About

**Fields:**

- Title (tagline)
- Description (max 500 chars)
- Company type (for non-Starter plans)
- Amenities: Array (WiFi, Parking, etc.)
- Facilities: Array (3D Printer, Meeting rooms, etc.)
- Focus areas: String or array
- Tags: Array
- Job preferences: Array (Starter plan)

### Step 4: Confirm

- Review all data
- Submit for approval

---

## 🗄️ Recommended MongoDB Design

### Hub Collection

```typescript
{
  _id: ObjectId,

  // Basic Info (Required)
  name: string,
  slug: string,  // Managed by Slug collection
  logo: string,
  phoneNumber: string,

  // Description
  title: string,
  description: string,
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
    // ... rest of week
  },

  // Social Links
  socialLinks: {
    website, facebook, linkedin, instagram, twitter, email
  },

  // Lists
  amenities: string[],
  facilities: string[],
  tags: string[],
  focusAreas: string[],
  services: string[],
  jobPreferences: string[],

  // Plan & Features
  planCode: string,  // 'starter', 'scale', 'soar'

  // Status & Workflow
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ACTIVE' | 'REJECTED',
  isActive: boolean,
  isFeatured: boolean,
  onboardingStep: number,  // Track progress 1-4

  // Ownership
  ownerId: ObjectId,  // User who owns this hub
  createdBy: ObjectId,
  lastUpdatedBy: ObjectId,

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Separate Collections (For Complex Nested Data)

**HubProject** - Portfolio/past projects
**HubExperience** - Experiences offered (reference to Experience collection)
**HubQualification** - Certifications, awards
**HubTeam** - Team members and roles

---

## 🎯 Recommended APIs (Phase 1 - Essential)

### Core Hub Management

1. **POST /api/v1/hub** - Create new hub
2. **GET /api/v1/hub/me** - Get my hubs (user can have multiple)
3. **GET /api/v1/hub/:hubId** - Get specific hub
4. **PATCH /api/v1/hub/:hubId** - Update hub (all onboarding steps)
5. **POST /api/v1/hub/:hubId/publish** - Submit for approval
6. **DELETE /api/v1/hub/:hubId** - Delete/deactivate hub

### Slug Management

7. **POST /api/v1/slug/check** - Already exists! (reuse from learner)

---

## 💡 Key Design Decisions

### 1. Multiple Hubs Per User

**Decision**: User can own multiple hubs

- GET /hub/me returns array
- Each hub has ownerId

### 2. Plan-Based Fields

**Decision**: All fields optional in backend

- Store planCode
- Frontend shows/requires based on plan
- Backend validates format only

### 3. Nested Resources

**Decision**: Start simple

- Embed projects/qualifications in hub document
- Separate collections later if needed
- Experiences reference existing Experience collection

### 4. Slug System

**Decision**: Reuse existing Slug collection

- resourceType: 'hub'
- Same redirect logic as learner
- URL: mereka.io/hub/makerslab

---

## 📋 Comparison

| Feature     | Learner         | Hub                            |
| ----------- | --------------- | ------------------------------ |
| Ownership   | Self (1:1)      | Can have multiple              |
| Complexity  | Simple          | Complex (multi-step)           |
| Nested Data | None            | Projects, team, qualifications |
| Approval    | No              | Yes (pending review)           |
| Plans       | No              | Yes (starter/scale/soar)       |
| Collection  | User (extended) | Hub (separate)                 |

---

## ✅ Summary

**Hub is significantly more complex than learner profile:**

- Multi-step onboarding (4 steps)
- Plan-based customization
- Nested resources
- Team management
- Approval workflow
- Multiple hubs per user

**Recommended Approach:**

1. Start with Core Hub CRUD (6 APIs)
2. Keep it flexible (plan-based validation)
3. Add nested resources later
4. Reuse Slug system

**Ready to design Hub APIs with this understanding?** 🚀
