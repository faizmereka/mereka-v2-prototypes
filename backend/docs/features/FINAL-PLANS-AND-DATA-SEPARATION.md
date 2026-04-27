# 🎯 Final Design: Scale vs Soar Plans - Data Separation

**Key Decision**: Only 2 plans - Scale and Soar
**Important**: Expert + Scale Hub onboarding are MERGED

---

## 📊 The Two Plans (Final)

### 1. Scale Plan

**Who**: Solo experts, consultants, small teams
**Creates**: Expert Profile + Hub
**Onboarding**: Merged (expert + hub fields together)

### 2. Soar Plan

**Who**: Organizations, makerspaces, coworking spaces
**Creates**: Hub only
**Onboarding**: Hub fields only

---

## 🗂️ Data Separation Rules

### Rule 1: Common/Business Data → Hub Collection

**Fields that describe the BUSINESS/ORGANIZATION:**

```typescript
Hub Collection {
  // Identity
  name,           // Business name
  slug,           // URL slug (via Slug collection)
  logo,           // Business logo
  phoneNumber,    // Business phone

  // Description
  title,          // Tagline
  description,    // About the business
  companyType,    // Type of company

  // Location & Hours
  location: {
    address, city, country, lat, lng, postcode
  },
  operatingHours: {
    monday: { open, close, isClosed },
    // ... rest of week
  },

  // Media
  coverImage,     // Business cover
  introVideo,     // Business intro
  gallery: [],    // Business/space photos

  // Features & Amenities
  amenities: [],  // WiFi, Parking, etc.
  facilities: [], // 3D Printer, Meeting rooms, etc.
  tags: [],       // Categories
  focusAreas: [], // Business focus
  services: [],   // Services offered

  // Portfolio (Business work)
  projects: [{
    title, description, images, tags
  }],

  // Plan & Status
  planCode: 'scale' | 'soar',
  status: 'DRAFT' | 'ACTIVE',

  // Ownership
  ownerId: ObjectId,  // User who owns this

  createdAt, updatedAt
}
```

### Rule 2: Expert/Personal Data → User Collection

**Fields that describe the INDIVIDUAL EXPERT:**

```typescript
User Collection {
  // ... existing user fields (name, email, etc.)

  // Expert Profile (Scale plan ONLY)
  expertProfile: {
    // Professional Identity
    title: string,          // "Senior Product Designer"
    overview: string,       // Professional bio
    video: string,          // Personal intro video

    // Skills & Expertise
    skills: string[],       // ["UI Design", "UX Research"]
    expertise: {
      category: string,     // "Design"
      subcategories: string[]
    },
    languages: [{
      language: string,
      proficiency: string
    }],

    // Portfolio (Personal work)
    portfolio: [{
      title, description, images, skills, year
    }],

    // Background
    education: [{
      degree, institution, year
    }],
    employment: [{
      title, company, duration, description
    }],

    // Rates & Preferences
    hourlyRate: number,     // For freelance jobs
    jobPreferences: string[], // Types of work interested in

    // Status
    expertStatus: 'PENDING' | 'APPROVED',
    isExpert: boolean
  }
}
```

---

## 🔄 Complete Onboarding Flows

### Scale Plan (Expert + Hub Merged)

```
1. User selects Scale plan
   ↓
2. Onboarding collects:

   Expert Section (goes to User.expertProfile):
   ├─ Title, overview, video
   ├─ Skills, expertise, languages
   ├─ Portfolio (personal work)
   ├─ Education, employment
   └─ Hourly rate, job preferences

   Hub Section (goes to Hub collection):
   ├─ Business name, logo, slug
   ├─ Location, operating hours
   ├─ Description, amenities, facilities
   ├─ Gallery (space photos)
   └─ Projects (company portfolio)
   ↓
3. Backend creates/updates:
   - User.expertProfile = {...expert data}
   - Hub = {...hub data, ownerId: userId}
   ↓
4. User has:
   - Expert profile: mereka.io/@expert-slug
   - Hub profile: mereka.io/hub/business-slug
```

### Soar Plan (Hub Only)

```
1. User selects Soar plan
   ↓
2. Onboarding collects:

   Hub Section only:
   ├─ Business name, logo, slug
   ├─ Location, operating hours
   ├─ Description, amenities, facilities
   ├─ Gallery, projects
   └─ (No expert fields!)
   ↓
3. Backend creates:
   - Hub = {...hub data, ownerId: userId}
   - NO User.expertProfile
   ↓
4. User has:
   - Hub profile only: mereka.io/hub/business-slug
```

---

## 📋 Field-by-Field Classification

| Field               | Scale (Expert) | Scale (Hub) | Soar (Hub) | Storage                       |
| ------------------- | -------------- | ----------- | ---------- | ----------------------------- |
| **Business name**   | -              | ✅          | ✅         | Hub.name                      |
| **Logo**            | -              | ✅          | ✅         | Hub.logo                      |
| **Slug**            | -              | ✅          | ✅         | Slug collection               |
| **Location**        | -              | ✅          | ✅         | Hub.location                  |
| **Operating hours** | -              | ✅          | ✅         | Hub.operatingHours            |
| **Description**     | -              | ✅          | ✅         | Hub.description               |
| **Amenities**       | -              | ✅          | ✅         | Hub.amenities                 |
| **Gallery**         | -              | ✅          | ✅         | Hub.gallery                   |
| **Projects**        | -              | ✅          | ✅         | Hub.projects                  |
| **Expert title**    | ✅             | -           | -          | User.expertProfile.title      |
| **Skills**          | ✅             | -           | -          | User.expertProfile.skills     |
| **Portfolio**       | ✅             | -           | -          | User.expertProfile.portfolio  |
| **Education**       | ✅             | -           | -          | User.expertProfile.education  |
| **Hourly rate**     | ✅             | -           | -          | User.expertProfile.hourlyRate |
| **Expertise**       | ✅             | -           | -          | User.expertProfile.expertise  |

---

## 🎯 API Design (Clean & Simple)

### For Scale Plan Users

**1. POST /api/v1/expert/profile**
**Purpose**: Create/update expert profile (personal data)

```json
{
  "title": "Senior Product Designer",
  "skills": ["UI Design", "UX Research"],
  "portfolio": [{...}],
  "hourlyRate": 50,
  "overview": "10 years experience..."
}
```

**Stores in**: User.expertProfile

**2. POST /api/v1/hub**
**Purpose**: Create hub (business data)

```json
{
  "name": "Design Studio",
  "slug": "design-studio",
  "planCode": "scale",
  "location": {...},
  "amenities": [...]
}
```

**Stores in**: Hub collection

### For Soar Plan Users

**1. POST /api/v1/hub** (Same endpoint!)

```json
{
  "name": "Maker Space",
  "slug": "maker-space",
  "planCode": "soar",
  "location": {...},
  "amenities": [...]
}
```

**Stores in**: Hub collection only (no expert profile)

---

## ✅ Clean Separation Summary

**User Collection:**

- Basic profile (everyone): name, email, phoneNumber, bio, profilePhoto
- Expert profile (Scale only): title, skills, portfolio, rates
- Learner profile fields: coverPhoto, location, socialLinks

**Hub Collection:**

- Business data (both plans): name, location, amenities, gallery
- Plan info: planCode, limits
- Ownership: ownerId

**Slug Collection:**

- Learner slugs: resourceType='learner'
- Expert slugs: resourceType='expert'
- Hub slugs: resourceType='hub'

---

## 🚀 Next Steps

**Phase 1: Expert Profile APIs** (Scale plan)

1. POST /expert/profile - Create/update expert profile
2. GET /expert/profile/me - Get my expert profile
3. POST /expert/portfolio - Add portfolio item

**Phase 2: Hub APIs** (Both plans)

1. POST /hub - Create hub
2. GET /hub/me - Get my hubs
3. PATCH /hub/:id - Update hub
4. GET /hub/:slug - Get hub by slug

**Phase 3: Subscription APIs** (Later)

1. GET /plans - List plans
2. POST /subscription - Create subscription (Stripe)

---

**This is the final, clean design!** Ready to implement? 🚀
