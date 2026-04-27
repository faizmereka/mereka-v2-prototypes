# Hub Onboarding - Reference Data Analysis

## 📋 Overview

Based on the frontend onboarding forms analysis, here are all the **reference data collections** that need to be created in MongoDB. These replace the string arrays currently stored in Hub/User models with proper relational references.

---

## 🗄️ Reference Data Collections Needed

### 1. **Amenities** Collection

**Purpose**: What amenities are offered at a Hub (comforts and conveniences)

**Firebase Collection**: `amenities`

**Current Frontend Service**: `MaterialDataService.listActiveAmenities$()`

**Data Structure**:

```typescript
interface Amenity {
  _id: ObjectId;
  name: string; // e.g., "WiFi", "Coffee", "Parking"
  isActive: boolean;
  priority?: number; // For ordering
  createdAt: Date;
  updatedAt: Date;
}
```

**Examples**:

- WiFi
- Coffee/Tea
- Parking
- Air Conditioning
- Kitchen
- Lockers
- Printing
- Meeting Rooms
- Refreshments
- Prayer Room

**Used In**: Hub onboarding - About step

**Hub Model Change**:

```typescript
// Before
amenities: string[]

// After
amenities: ObjectId[]  // References to Amenity collection
```

---

### 2. **Facilities** Collection

**Purpose**: What facilities are present at a Hub (features and infrastructure)

**Firebase Collection**: `facilities`

**Current Frontend Service**: `MaterialDataService.listActiveFacilities$()`

**Data Structure**:

```typescript
interface Facility {
  _id: ObjectId;
  name: string; // e.g., "Projector", "Whiteboard", "Studio"
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Examples**:

- Projector
- Whiteboard
- Audio System
- Video Recording Studio
- Green Screen
- Photography Equipment
- 3D Printer
- Workshop Tools
- Conference Room
- Event Space

**Used In**: Hub onboarding - About step

**Hub Model Change**:

```typescript
// Before
facilities: string[]

// After
facilities: ObjectId[]  // References to Facility collection
```

---

### 3. **FocusAreas** Collection (Expert Categories)

**Purpose**: Primary focus areas for Hubs and Experts

**Firebase Collection**: `expertise_categories`

**Current Frontend Service**: `ExpertCategoryService.listActiveExpertCategory$()`

**Data Structure**:

```typescript
interface FocusArea {
  _id: ObjectId;
  name: string; // e.g., "Career & Business", "Tech & AI"
  icon?: string; // Icon name for UI
  description?: string;
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Examples** (from `SKILL_TAGS` constant):

- Career & Business
- Tech & AI
- Design & Branding
- ESG (Environmental, Social, Governance)
- Arts & Culture
- Health & Wellness

**Used In**:

- Hub onboarding - About step (focusAreas - required field)
- Expert onboarding - Expertise step

**Model Changes**:

```typescript
// Hub Model - Before
focusAreas: string[]

// Hub Model - After
focusAreas: ObjectId[]  // References to FocusArea collection (at least 1 required)

// User Model - Before
expertise: string[]

// User Model - After
expertise: ObjectId[]  // References to FocusArea collection
```

---

### 4. **Skills** Collection (with subcategories)

**Purpose**: Skills categorized by focus area

**Firebase Collection**: `expertise_subcategories` (has `parentCategory`, `skills` array)

**Current Frontend Service**: `ExpertCategoryService.listActiveSubCategory$(categoryId)`

**Data Structure**:

```typescript
interface Skill {
  _id: ObjectId;
  name: string; // e.g., "Project Management", "UI/UX Design"
  focusAreaId: ObjectId; // Parent focus area
  type: 'primary' | 'additional'; // Primary are specific to focus area
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Examples** (from `SKILL_TAGS` constant):

**Career & Business**:

- Business Analyst
- Financial Management
- HR Management
- Project Management
- Leadership
- Corporate Trainer
- SEO/SEM Specialist
- Business Writer
- Digital Marketer
- Sales Specialist
- Growth Specialist
- Social Media Manager

**Tech & AI**:

- Software Developer
- Cybersecurity
- Big Data
- Machine Learning
- AI Engineer
- DevOps Engineer
- Front-end Developer
- Back-end Developer
- Full-Stack Developer
- Generative AI

**Design & Branding**:

- Graphic Design
- UI/UX Design
- Video Production & Editing
- Animation
- Product Design
- Creative Writing
- Content Creator
- Industrial Design
- Branding

**ESG**:

- Sustainability Specialist
- Social Impact Analyst
- Compliance Specialist
- Governance Analyst
- Reporting Specialist
- Renewable Energy
- Diversity & Inclusion
- Human Rights
- Climate Change
- CSR Management

**Arts & Culture**:

- Visual Art
- Performing Art
- Literary Art
- Decorative Art
- Film & Cinema
- Interior & Architecture
- Installation Art
- Art Curation & Management
- Culinary
- Mixology

**Health & Wellness**:

- Fitness
- Nutrition & Diet
- Mental Health & Counselling
- Sexual Health
- Corporate Wellness
- Personal Coaching
- Personal Training
- Holistic Health
- Public Health
- Art Therapy

**Used In**: Expert onboarding - Skills step

**User Model Change**:

```typescript
// Before
skills: string[]

// After
skills: ObjectId[]  // References to Skill collection
```

---

### 5. **Languages** Collection

**Purpose**: Languages spoken by experts

**Firebase Collection**: `utils` > `availableLanguages` document

**Current Frontend Service**: `LanguageService.listActive()`

**Data Structure**:

```typescript
interface Language {
  _id: ObjectId;
  name: string; // e.g., "English", "Mandarin"
  code?: string; // ISO language code (optional)
  isActive: boolean;
  priority?: number; // For ordering
  createdAt: Date;
  updatedAt: Date;
}
```

**Examples** (from `ExpertFormOptionsService` defaults):

- English
- Mandarin
- Hindi
- Spanish
- French
- Arabic
- Bengali
- Russian
- Portuguese
- Indonesian
- Urdu
- German
- Japanese
- Swahili
- Malay
- Tamil
- Telugu
- Marathi
- Turkish
- Korean
- Italian
- Thai
- Persian
- Vietnamese
- Polish

**Used In**: Expert onboarding - Languages step

**User Model Change**:

```typescript
// Before
languages: Array<{
  name: string;
  proficiency: string;
}>;

// After
languages: Array<{
  languageId: ObjectId; // Reference to Language collection
  proficiency: 'Basic' | 'Conversational' | 'Proficient' | 'Fluent' | 'Native';
}>;
```

---

### 6. **JobPreferences** Collection

**Purpose**: Types of work an expert prefers

**Source**: Hardcoded in `ExpertFormOptionsService.getAllFormOptions()`

**Data Structure**:

```typescript
interface JobPreference {
  _id: ObjectId;
  name: string; // e.g., "Trainer", "Coach"
  description?: string;
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Examples**:

- Trainer
- Coach
- Consultant
- Project Manager
- Service Retainer

**Used In**:

- Expert onboarding - Job Preferences step
- Hub onboarding - About step (for Scale plan only)

**User Model Change**:

```typescript
// Before
jobPreferences: string[]

// After
jobPreferences: ObjectId[]  // References to JobPreference collection
```

---

### 7. **SpaceTypes** Collection

**Purpose**: Types of spaces offered by a Hub

**Firebase Collection**: `spaces_type`

**Current Frontend Service**: `SpaceCategoryService.listActiveCategory$()`

**Data Structure**:

```typescript
interface SpaceType {
  _id: ObjectId;
  name: string; // e.g., "Conference Room", "Desk", "Studio"
  description?: string;
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Examples** (from SVG icons registry):

- Arts Space
- Collaboration Space
- Conference Room
- Desk/Workstation
- Electronic Lab
- Entertainment Space
- Social Space
- Unusual Spaces
- Woodworking Shop
- Virtual/Zoom Space

**Used In**: Hub onboarding - About step (spaceTypes)

**Hub Model Change**:

```typescript
// Add new field to Hub model
spaceTypes: ObjectId[]  // References to SpaceType collection
```

---

### 8. **ExperienceTypes** Collection

**Purpose**: Types of experiences/events offered by a Hub

**Firebase Collection**: `experiences_types`

**Current Frontend Service**: `ExperienceCategoryService.listActiveExperienceCategory$()`

**Data Structure**:

```typescript
interface ExperienceType {
  _id: ObjectId;
  name: string; // e.g., "Workshop", "Seminar", "Training"
  description?: string;
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Examples**:

- Workshop
- Seminar
- Training Program
- Conference
- Networking Event
- Masterclass
- Bootcamp
- Hackathon
- Panel Discussion
- Webinar

**Used In**: Hub onboarding - About step (experienceTypes)

**Hub Model Change**:

```typescript
// Add new field to Hub model
experienceTypes: ObjectId[]  // References to ExperienceType collection
```

---

### 9. **CompanyTypes** Collection

**Purpose**: Type of company/organization

**Source**: Needs to be defined (currently stored as string)

**Data Structure**:

```typescript
interface CompanyType {
  _id: ObjectId;
  name: string; // e.g., "Startup", "Corporate", "NGO"
  description?: string;
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Examples** (to be confirmed):

- Startup
- SME (Small-Medium Enterprise)
- Corporate
- NGO (Non-Governmental Organization)
- Social Enterprise
- Freelancer/Solopreneur
- Agency
- Cooperative
- Government
- Educational Institution

**Used In**: Hub onboarding - About step (companyType)

**Hub Model Change**:

```typescript
// Before
companyType: string;

// After
companyType: ObjectId; // Reference to CompanyType collection
```

---

### 10. **Tags** Collection

**Purpose**: Generic tags for categorization

**Source**: Free-form user input (currently)

**Data Structure**:

```typescript
interface Tag {
  _id: ObjectId;
  name: string; // e.g., "Coworking", "Innovation", "Creative"
  category?: string; // 'hub', 'space', 'experience', 'user'
  usageCount: number; // Track popularity
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Notes**:

- This should be a **dynamic collection** that grows as users add tags
- Implement auto-complete/suggestions based on existing tags
- Can moderate/merge duplicate tags later

**Used In**: Hub onboarding - About step (tags)

**Hub Model Change**:

```typescript
// Before
tags: string[]

// After
tags: ObjectId[]  // References to Tag collection
```

---

## 📊 Summary Table

| Collection          | Used In             | Required? | Current Type | New Type       | Priority |
| ------------------- | ------------------- | --------- | ------------ | -------------- | -------- |
| **Amenities**       | Hub (About)         | No        | `string[]`   | `ObjectId[]`   | HIGH     |
| **Facilities**      | Hub (About)         | No        | `string[]`   | `ObjectId[]`   | HIGH     |
| **FocusAreas**      | Hub (About), Expert | Yes (Hub) | `string[]`   | `ObjectId[]`   | HIGH     |
| **Skills**          | Expert              | No        | `string[]`   | `ObjectId[]`   | HIGH     |
| **Languages**       | Expert              | No        | Complex      | `ObjectId` ref | MEDIUM   |
| **JobPreferences**  | Expert, Hub (Scale) | No        | `string[]`   | `ObjectId[]`   | MEDIUM   |
| **SpaceTypes**      | Hub (About)         | No        | N/A (new)    | `ObjectId[]`   | MEDIUM   |
| **ExperienceTypes** | Hub (About)         | No        | N/A (new)    | `ObjectId[]`   | MEDIUM   |
| **CompanyTypes**    | Hub (About)         | No        | `string`     | `ObjectId`     | LOW      |
| **Tags**            | Hub (About)         | No        | `string[]`   | `ObjectId[]`   | LOW      |

---

## 🎯 Implementation Priority

### Phase 1: Core Reference Data (Required for MVP)

1. **FocusAreas** - Required field, critical for matching
2. **Amenities** - Commonly used, enhances Hub profiles
3. **Facilities** - Commonly used, enhances Hub profiles
4. **Skills** - Core expert feature

### Phase 2: Expert Features

5. **JobPreferences** - Important for Scale plan
6. **Languages** - Useful for expert profiles

### Phase 3: Enhanced Features

7. **SpaceTypes** - Nice to have for Hub categorization
8. **ExperienceTypes** - Nice to have for Hub categorization
9. **CompanyTypes** - Simple categorization
10. **Tags** - Dynamic, can grow organically

---

## 🔄 Migration Strategy

### Option A: Start Fresh (Recommended for New System)

- Create all reference collections with seed data
- Update models to use ObjectId references
- Build APIs with proper population

### Option B: Hybrid Approach (If Existing Data)

- Keep string arrays for backward compatibility
- Add new ObjectId array fields (e.g., `amenityIds`)
- Gradually migrate data
- Eventually deprecate string arrays

### Option C: Dual Storage (Temporary)

- Store both string arrays AND ObjectId references
- Frontend can use either
- Provides safety net during migration

---

## 📝 Recommended Approach

**For New Backend (Current Situation):**

1. **Create all reference data models** (Phase 1 priority first)
2. **Seed collections** with data from frontend constants
3. **Update Hub/User models** to use ObjectId references
4. **Create CRUD APIs** for each reference collection (admin only)
5. **Update onboarding APIs** to accept ObjectIds instead of strings
6. **Frontend migration** happens gradually

---

## 🚀 Next Steps

1. ✅ **Review this analysis** - Confirm all reference data is captured
2. ⏭️ **Decide on priority** - Which collections to implement first?
3. ⏭️ **Create models** - Define Mongoose schemas
4. ⏭️ **Seed data** - Import initial data from frontend constants
5. ⏭️ **Build APIs** - CRUD endpoints for each collection
6. ⏭️ **Update Hub/User models** - Change string[] to ObjectId[]
7. ⏭️ **Update validation schemas** - Accept ObjectIds in onboarding
8. ⏭️ **Test** - Ensure onboarding works with new structure

---

**Should we proceed with Phase 1 (Core Reference Data)?**
