# Expert Onboarding Implementation Plan (V2)

## Overview

This document outlines the implementation plan for Expert Onboarding in the V2 frontend, covering two distinct user flows:

1. **Invited Experts (Search Plan context)**: Experts invited to join a Hub who need to complete their profile
2. **Scale Plan Experts (Hub Owners)**: Hub owners who already complete expert profile fields during Hub Onboarding

---

## User Flows Analysis

### Flow 1: Invited Expert (Search Plan)

```
Invitation Email/Link → Auth App (Login/Signup) → Accept Invitation → Expert Onboarding → Hub Dashboard
```

**Steps:**
1. Expert receives invitation (email or shareable link)
2. Opens `auth.mereka.io/join/invite/{token}` or `auth.mereka.io/join/link/{token}`
3. Login (existing user) or Signup (new user)
4. Accept invitation → User becomes a hub member with assigned role
5. **Redirect to Expert Onboarding** (if profile incomplete)
6. Complete onboarding → Redirect to Hub Dashboard

### Flow 2: Scale Plan Expert (Hub Owner)

```
Sign Up → Welcome → Hub Onboarding → Hub Dashboard
```

**Steps:**
1. User signs up at `auth.mereka.io`
2. Welcome page prompts to create hub
3. **Hub Onboarding** includes expert profile fields within the flow:
   - `/onboarding/hub/profile` - Business profile + Personal expert fields
   - `/onboarding/hub/about` - Business about
   - `/onboarding/hub/details` - Business details
4. Complete → Redirect to Hub Dashboard

---

## Current V2 Implementation Status

### Hub Onboarding (✅ Complete)
Located: `projects/app/src/app/features/onboarding/hub/`

| Step | Route | Component | Status |
|------|-------|-----------|--------|
| 1 | `/form` | `HubFormComponent` | ✅ Complete |
| 2 | `/pricing` | `HubPricingComponent` | ✅ Complete |
| 3 | `/payment-loader` | `HubPaymentLoaderComponent` | ✅ Complete |
| 4 | `/setup` | `HubSetupComponent` | ✅ Complete |
| 5 | `/profile` | `HubProfileComponent` | ✅ Complete |
| 6 | `/about` | `HubAboutComponent` | ✅ Complete |
| 7 | `/details` | `HubDetailsComponent` | ✅ Complete |
| 8 | `/confirm` | `HubConfirmComponent` | ✅ Complete |

### Expert Onboarding (⚠️ Partially Implemented)
Located: `projects/app/src/app/features/onboarding/expert/`

| Step | Route | Component | Status |
|------|-------|-----------|--------|
| 1 | `/your-profile` | `ExpertProfileComponent` | ⚠️ Basic UI only |
| 2 | `/your-skills` | `ExpertSkillsComponent` | ⚠️ Basic UI only |
| 3 | `/your-background` | `ExpertBackgroundComponent` | ⚠️ Basic UI only |
| 4 | `/confirmation` | `ExpertConfirmationComponent` | 🔴 Not implemented |

**Issues with Current Implementation:**
- No service layer for form state management
- No API integration (saves to localStorage only)
- Missing validation
- No navigation tracking/step sync with URL
- No "Save and Exit" functionality
- Confirmation step not implemented

---

## V1 Reference Analysis (mereka-web)

### Form Service Structure
Located: `mereka-web/src/app/pages/user/expert-onboarding/`

**Files:**
- `expert-form.service.ts` - Form state management
- `expert-form-options.service.ts` - Dropdown options (categories, languages, countries)

**Form Groups:**
1. `yourProfileForm`: `title` (professional title)
2. `yourExpertiseForm`: `expertise`, `subExpertise`, `skills`, `jobPreference`, `video`
3. `yourProjectForm`: `portfolio` (array)
4. `yourBackgroundForm`: `employment` (array), `education` (array)

### Portfolio Item Fields (V1)
```typescript
{
  title: string;           // Required
  skills: string[];        // Tags
  startYear: Date;         // Required
  endYear: Date;           // Required
  description: string;     // Required
  attachedFiles: string[]; // File URLs
  projectLink: string;     // Optional URL
  image: string;           // Required - cover image
}
```

### Employment Item Fields (V1)
```typescript
{
  name: string;        // Company name (max 70 chars)
  city: string;        // Required
  country: string;     // Required (dropdown)
  role: string;        // Job title (max 50 chars)
  startYear: Date;     // Required
  endYear: Date;       // Required (unless ongoing)
  description: string; // Max 200 chars
  isOnGoing: boolean;  // Currently employed here
}
```

### Education Item Fields (V1)
```typescript
{
  name: string;        // Institution name (max 70 chars)
  courseName: string;  // Degree/Course (max 70 chars)
  startYear: Date;     // Required
  endYear: Date;       // Required
  description: string; // Max 200 chars
}
```

---

## Backend Data Model (V2)

### User Model - Expert Fields
Located: `src/core/models/User.ts`

```typescript
// Expert Fields (Scale plan only - flattened)
professionalTitle?: string;         // "Senior Product Designer"
introVideo?: string;                // Expert intro video URL
skills?: ObjectId[];                // References to Skill collection
focusAreaId?: ObjectId;             // Reference to FocusArea collection
languages?: Array<{
  languageId: ObjectId;             // Reference to Language collection
  proficiency: string;              // "Basic", "Conversational", "Proficient", "Fluent", "Native"
}>;
portfolio?: Array<{
  title: string;
  description?: string;
  images?: string[];
  skills?: ObjectId[];              // References to Skill collection
  year?: string;
}>;
education?: Array<{
  degree: string;
  institution: string;
  year: string;
}>;
employment?: Array<{
  title: string;
  company: string;
  duration?: string;
  description?: string;
}>;
hourlyRate?: number;                // For job marketplace
jobPreferences?: ObjectId[];        // References to JobPreference collection
```

---

## Implementation Plan

### Phase 1: Create Expert Onboarding Service

**File:** `projects/app/src/app/features/onboarding/expert/services/expert-onboarding.service.ts`

```typescript
// Service responsibilities:
// 1. Form state management with Signals
// 2. Step validation
// 3. API integration
// 4. Save draft / Save and exit
// 5. Load existing data
```

### Phase 2: Step Components Refactoring

#### Step 1: Your Profile (`/your-profile`)
**Fields:**
- Profile photo (upload)
- Cover photo (upload)
- Display name (required)
- Username/slug (unique check)
- Location (autocomplete)
- Phone number
- Bio/About me

#### Step 2: Your Skills (`/your-skills`)
**Fields:**
- Professional title (required)
- Focus area/Category (dropdown)
- Skills (chip input, references Skill collection)
- Languages (multi-select with proficiency)
- Intro video (URL input for YouTube/Vimeo)
- Job preferences (multi-select)

#### Step 3: Your Background (`/your-background`)
**Fields:**
- Portfolio items (dynamic form array)
- Employment history (dynamic form array)
- Education history (dynamic form array)

#### Step 4: Confirmation (`/confirmation`)
**Features:**
- Profile preview card
- All entered data summary
- Edit buttons to go back to specific steps
- Submit button

### Phase 3: API Integration

**Endpoints:**
- `GET /hub/profile/me` - Get current user's expert profile
- `PATCH /hub/profile/me` - Update expert profile (upsert)

**Reference Data:**
- `GET /reference-data/skills` - Skills list
- `GET /reference-data/languages` - Languages list
- `GET /reference-data/categories` - Focus areas
- `GET /reference-data/job-preferences` - Job preference options

### Phase 4: Route Integration

**Add redirect logic in Auth App:**
1. After accepting invitation, check if profile is complete
2. If incomplete → redirect to `/onboarding/expert/your-profile`
3. Store return URL for post-onboarding redirect

**File to modify:** `projects/auth/src/app/features/join/`

---

## Folder Structure (Updated)

```
projects/app/src/app/features/onboarding/expert/
├── expert-onboarding.component.ts      # Main wizard controller (needs refactor)
├── expert-onboarding.component.html    # Template (needs refactor)
├── expert-onboarding.routes.ts         # Routes (OK)
├── index.ts
├── services/
│   ├── expert-onboarding.service.ts    # NEW - Form state management
│   ├── expert-onboarding-api.service.ts # NEW - API calls
│   └── index.ts
├── models/
│   ├── expert-onboarding.model.ts      # NEW - TypeScript interfaces
│   └── index.ts
├── steps/
│   ├── profile/
│   │   ├── profile.component.ts        # REFACTOR - Use service
│   │   ├── profile.component.html      # REFACTOR - Add all fields
│   │   └── profile.component.scss      # OK
│   ├── skills/
│   │   ├── skills.component.ts         # REFACTOR - Use service
│   │   ├── skills.component.html       # REFACTOR - Add all fields
│   │   └── skills.component.scss       # OK
│   ├── background/
│   │   ├── background.component.ts     # REFACTOR - Use service
│   │   ├── background.component.html   # REFACTOR - Dynamic arrays
│   │   └── background.component.scss   # OK
│   ├── confirmation/
│   │   ├── confirmation.component.ts   # NEW - Implement
│   │   ├── confirmation.component.html # NEW - Implement
│   │   └── index.ts
│   └── title/
│       └── ...                         # Keep as helper component
└── components/
    ├── expert-preview-card/            # NEW - For confirmation page
    │   ├── expert-preview-card.component.ts
    │   ├── expert-preview-card.component.html
    │   └── index.ts
    └── index.ts
```

---

## Form Data Interface

```typescript
export interface ExpertOnboardingData {
  // Step 1: Profile
  profilePhoto?: string;
  coverPhoto?: string;
  name: string;
  username?: string;
  location?: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  phoneNumber?: string;
  bio?: string;

  // Step 2: Skills
  professionalTitle?: string;
  focusAreaId?: string;
  skills?: string[];                    // Skill IDs
  languages?: Array<{
    languageId: string;
    proficiency: string;
  }>;
  introVideo?: string;
  jobPreferences?: string[];            // JobPreference IDs

  // Step 3: Background
  portfolio?: Array<{
    title: string;
    description?: string;
    images?: string[];
    skills?: string[];
    year?: string;
  }>;
  employment?: Array<{
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
}
```

---

## Validation Rules

### Step 1: Profile
- `name`: Required
- `username`: Optional but unique if provided (6-30 chars, alphanumeric + . _ -)
- `phoneNumber`: Optional, valid format
- `bio`: Optional, max 500 chars

### Step 2: Skills
- `professionalTitle`: Required for experts
- `focusAreaId`: Optional
- `skills`: Optional, max 20
- `languages`: Optional
- `introVideo`: Optional, valid YouTube/Vimeo URL

### Step 3: Background
- All sections optional but if adding item:
  - Portfolio: `title` required
  - Employment: `company`, `title` required
  - Education: `institution`, `degree` required

---

## UI Components to Use

From `@mereka/ui`:
- `UiInputComponent` - Text inputs
- `UiTextareaComponent` - Bio, descriptions
- `UiSelectComponent` - Category, country dropdowns
- `UiChipInputComponent` - Skills tags
- `UiUploadImageComponent` - Profile/cover photo
- `UiPhoneInputComponent` - Phone number
- `UiLocationAutocompleteComponent` - Location
- `UiButtonComponent` - Actions
- `UiPanelComponent` - Form sections

---

## Implementation Order

1. **Week 1: Service Layer**
   - [ ] Create `expert-onboarding.service.ts`
   - [ ] Create `expert-onboarding-api.service.ts`
   - [ ] Create models/interfaces

2. **Week 2: Step Components**
   - [ ] Refactor `profile.component.ts`
   - [ ] Refactor `skills.component.ts`
   - [ ] Refactor `background.component.ts`
   - [ ] Implement `confirmation.component.ts`

3. **Week 3: Main Component & Navigation**
   - [ ] Refactor `expert-onboarding.component.ts` (follow job onboarding pattern)
   - [ ] Add URL-based step tracking
   - [ ] Add validation indicators
   - [ ] Test complete flow

4. **Week 4: Integration & Testing**
   - [ ] Add invitation acceptance redirect logic
   - [ ] Test invited expert flow end-to-end
   - [ ] Test Scale plan expert profile editing

---

## API Routes Needed (Backend)

### Existing Routes (Hub Module)
- `PATCH /api/hub/profile/me` - Update expert profile

### May Need to Add
- `GET /api/reference-data/job-preferences` - Job preference list (if not exists)
- `GET /api/reference-data/focus-areas` - Focus area/category list

---

## Notes

1. **Hub Onboarding vs Expert Onboarding**:
   - Hub Onboarding = Business profile + Expert profile fields
   - Expert Onboarding = Personal expert profile only (for invited users)

2. **Data Storage**:
   - Expert fields stored directly on User model
   - No separate ExpertProfile model

3. **Scale Plan Detection**:
   - Check if user has active hub membership
   - Check membership role (owner vs invited member)

4. **Return URL Handling**:
   - Store in query param or service
   - Redirect after completion

---

## Summary

| Expert Type | Flow | Onboarding Used | Profile Fields Location |
|-------------|------|-----------------|-------------------------|
| Hub Owner (Scale) | Signup → Hub Onboarding | Hub Onboarding | User model + Hub model |
| Invited Expert | Invitation → Expert Onboarding | Expert Onboarding | User model only |

The main implementation work is:
1. Complete the Expert Onboarding service layer
2. Refactor step components to use service
3. Implement confirmation step
4. Add invitation acceptance → onboarding redirect logic
