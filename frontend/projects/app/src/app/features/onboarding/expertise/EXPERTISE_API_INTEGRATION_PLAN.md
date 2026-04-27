# Expertise Onboarding - API Integration Plan

## Overview

This document outlines the complete API integration plan for migrating the Expertise Onboarding feature from v1 (Firebase-based) to v2 (REST API-based) in the Angular 21+ workspace.

---

## V1 Analysis Summary (Based on Live Screenshots)

### Tab Structure (4 Steps)
1. **Your Expertise** - Basic info, description, expert, tags, language
2. **Availability & Rates** - Access, availability, service fee, packages
3. **Booking Details** - Link, instructions, photos, custom form
4. **Confirmation** - Preview of listing

### Key Findings from V1

| Feature | V1 Behavior | Notes for V2 |
|---------|-------------|--------------|
| Session Mode | Per-package (Package Mode: Online/Physical) | NOT a global setting |
| Location Picker | Does NOT exist in v1 | Do NOT implement |
| Custom Questions | In Booking Details > Custom Form | Use `@mereka/ui` shared component |
| "Write with AI" | Button in Summary section | AI integration needed |
| "Generate with AI" | Button in Photos section | AI image generation |
| Autofill Hours | "Autofill from profile operating hours" option | Hub profile integration |
| Ticket Naming | Called "Service Package" in v1 | Rename component to `UiExpertisePackageComponent` |

---

## Current State Analysis

### V1 Implementation (mereka-web)
- **Location**: `/mereka-web/src/app/pages/expertise/add-expertise`
- **Backend**: Firebase Firestore (AngularFirestore)
- **Services**: `ExpertiseService`, `SlugService`, `UploadService`
- **Form Service**: `AddExpertiseFormService`

### V2 Implementation (mereka-frontend-workspace)
- **Location**: `/projects/app/src/app/features/onboarding/expertise`
- **Backend**: REST API (to be implemented)
- **Form Service**: `ExpertiseOnboardingService` (localStorage only)
- **Status**: UI partially complete, API integration pending

---

## V1 Tab-by-Tab Analysis

### Tab 1: Your Expertise

| Section | Fields | Required | V2 Status |
|---------|--------|----------|-----------|
| **Title** | Expertise Title (0/100) | Yes | Done |
| | Expertise Link (slug) + Copy button | Yes | Done |
| **Description** | Rich Text Editor (Bold, Italic, Underline, Link, Lists) | Yes | Done |
| | Expertise Summary (0/200) | Yes | Done |
| | **"Write with AI" button** | No | **MISSING** |
| **Expert** | "Choose Your Expert" dropdown | Yes | **MISSING** - needs host selector |
| **Visibility** | Tags input ("Type Tags" + Add button) | Optional | Done (as expertiseTypes) |
| **Language** | Primary language dropdown | Yes | Done |
| | Secondary languages dropdown | Optional | Done |

### Tab 2: Availability & Rates

| Section | Fields | Required | V2 Status |
|---------|--------|----------|-----------|
| **Expertise Access** | Everyone / Hidden radio | Yes | Done |
| **Availability** | Flexible radio | No | Done |
| | **Autofill from profile operating hours** radio | No | **MISSING** |
| | Manually fill available hours radio | Yes | Done |
| | Operating Days (S M T W Th F S) checkboxes | Yes | Done |
| | Apply same hours to all checkbox | No | Done |
| **Service Fee** | Client bears fee / Expert absorbs fee radio | Yes | Done |
| **Pricing** | Paid/Free toggle | Yes | Done |
| | Service package name (0/40) | Yes | Done |
| | Rate + Currency | For Paid | Done |
| | Session Duration dropdown | Yes | Done |
| | Description (0/200) | Optional | Done |
| | **Package Mode** (Online/Physical) radio | Yes | **UPDATE NEEDED** - not global |
| | ASAP bookings checkbox | Optional | **MISSING** |
| | Buffer time after sessions checkbox | Optional | Done |
| | Save Package button | Yes | Done |

### Tab 3: Booking Details

| Section | Fields | Required | V2 Status |
|---------|--------|----------|-----------|
| **Link** | "Add link now" / "Send link later" radio | Yes | Done |
| | Meeting link input (if add now) | Conditional | Done |
| **Instructions** | Rich Text Editor (0/500) | Optional | **PARTIAL** - using plain textarea |
| **Photos** | **"Generate with AI" button** | Optional | **MISSING** |
| | Cover photo upload + drag/drop | Yes | Done (local only) |
| | Gallery photos (Optional) | Optional | Done (local only) |
| **Custom Form** | "Add a question" button (up to 5) | Optional | Done |
| | Question types: Text, Dropdown, Checkbox, Multiple Choice | Optional | Done |

**V2 Has Extra Fields NOT in V1:**
- Session Mode (online/physical/both) - **REMOVE** (it's per-package in v1)
- Location Picker - **REMOVE** (doesn't exist in v1)
- Display Full Address toggle - **REMOVE**
- Material Provided - Keep (might be in Instructions)
- Material to Bring - Keep (might be in Instructions)

### Tab 4: Confirmation

| Feature | V1 Behavior | V2 Status |
|---------|-------------|-----------|
| Preview Banner | "Preview of your Expertise page to users" | **MISSING** |
| Listing Preview | Shows title, mode, duration, language, description | **MISSING** |
| Package Selection | Shows package cards with pricing | **MISSING** |
| Save/Share Buttons | Top right | **MISSING** |
| Continue/Message | Booking simulation | **MISSING** |
| Confirm Button | Final publish action | Done |

---

## Step-by-Step Implementation Plan

### Phase 1: API Service Creation

#### 1.1 Create Expertise API Service
**File**: `projects/app/src/app/features/onboarding/expertise/services/expertise-api.service.ts`

```typescript
// Required endpoints:
POST   /api/expertise              // Create new expertise
PUT    /api/expertise/:id          // Update expertise
GET    /api/expertise/:id          // Get single expertise
GET    /api/expertise/hub/:hubId   // List expertise by hub
DELETE /api/expertise/:id          // Delete expertise
POST   /api/expertise/:id/publish  // Publish expertise
```

#### 1.2 Create Slug API Service
**File**: `projects/app/src/app/features/onboarding/expertise/services/slug-api.service.ts`

```typescript
// Required endpoints:
GET    /api/slug/check/:slug       // Check slug availability
POST   /api/slug                   // Create slug
PUT    /api/slug/:id               // Update slug
```

#### 1.3 Create Upload Service
**File**: `projects/mereka/core/src/lib/services/upload.service.ts`

```typescript
// Required endpoints:
POST   /api/upload/image           // Upload single image
POST   /api/upload/images          // Upload multiple images (gallery)
DELETE /api/upload/:id             // Delete uploaded file
```

---

### Phase 2: Data Model Updates

#### 2.1 Create/Update Expertise Interface
**File**: `projects/mereka/models/src/lib/expertise.model.ts`

```typescript
export interface Expertise {
  id?: string;
  hubId: string;
  status: 'drafted' | 'pending' | 'active' | 'deleted';

  // Basic Info (Your Expertise tab)
  expertiseTitle: string;
  slug: string;
  expertiseDescription: string;
  expertiseSummary: string;
  host: ExpertiseHost;
  expertiseTypes: string[];  // Tags
  primaryLanguage: string;
  secondaryLanguages: string[];

  // Availability & Rates tab
  audienceType: 'Everyone' | 'Hidden';
  availabilityType: 'manual' | 'flexible' | 'autofill';
  operatingHours?: OperatingHours;
  feePaidBy: 'learner' | 'expert';
  ticket: ExpertisePackage[];  // Service Packages

  // Booking Details tab
  linkMode: 'send' | 'input';
  expertiseLink?: string;
  infoForBooker?: string;  // Rich text instructions
  coverPhoto: string;
  gallery: string[];
  customQuestions?: CustomQuestions;

  // Metadata
  currency: string;
  createdDate: Date;
  lastModified: number;
}

export interface ExpertiseHost {
  userId: string;
  name: string;
  email: string;
  photoUrl?: string;
  roleId?: string;
  description?: string;
}

export interface OperatingHours {
  sameOperatingHoursForAll?: boolean;
  allOperatingStartTime?: string;
  allOperatingEndTime?: string;
  days: DaySchedule[];
}

export interface DaySchedule {
  day: string;
  isActive: boolean;
  fullDay?: boolean;
  startTime?: string;
  endTime?: string;
}

// Renamed from ExpertiseTicket to ExpertisePackage
export interface ExpertisePackage {
  id: string;
  ticketType: 'Free' | 'Paid';
  ticketName: string;  // Service package name
  sessionDuration: number;
  durationUnit: 'minutes' | 'hours';
  ticketPrice: number;  // standardRate
  ticketQty: number;
  description?: string;
  expertiseMode: 'online' | 'physical';  // Package Mode (per-package!)
  hasAsapBooking?: boolean;  // ASAP bookings checkbox
  hasBufferTime?: boolean;
  bufferTime?: number;
  estimatedDuration?: string;  // For flexible availability only
}

export interface CustomQuestions {
  isQuestionMandatory: boolean;
  questionArray: CustomQuestion[];
}

export interface CustomQuestion {
  questionLabel: string;
  questionType: 'text' | 'dropdown' | 'checkbox' | 'multiple_choice';
  saveStatus: boolean;
  dropDown?: string[];
  checkBox?: string[];
  multipleChoices?: string[];
}
```

---

### Phase 3: UI Components to Create in @mereka/ui

#### 3.1 Expertise Package Component (NEW)
**Create**: `projects/mereka/ui/src/lib/components/expertise-package/`

This replaces the inline ticket editing in v2. Name: `UiExpertisePackageComponent`

```typescript
// Features:
- Paid/Free toggle tabs
- Service package name input (0/40 char)
- Rate input with currency (for Paid)
- Session Duration dropdown (30 mins, 45 mins, 1 hour, etc.)
- Description textarea (0/200 char)
- Package Mode radio (Online / Physical)
- ASAP bookings checkbox with description
- Buffer time checkbox with duration input
- Save Package button
- Edit/Delete/Duplicate actions
```

**Selector**: `ui-expertise-package`

#### 3.2 Custom Question Component (Use Existing or Create)
**Check if exists**: `projects/mereka/ui/src/lib/components/custom-question/`

If not, create `UiCustomQuestionComponent`:
```typescript
// Features:
- Question label input
- Question type dropdown (Text, Dropdown, Checkbox, Multiple Choice)
- Options list management (for dropdown/checkbox/multiple choice)
- Save/Edit/Delete actions
```

**Selector**: `ui-custom-question`

#### 3.3 DO NOT CREATE
- ~~Location Picker~~ - Not in v1
- ~~Session Mode Selector~~ - It's per-package, not global

---

### Phase 4: Component Updates

#### 4.1 Basic Info Component (Your Expertise Tab)
**File**: `steps/basic-info/basic-info.component.ts`

**Changes Required:**
- [ ] Add "Write with AI" button next to Summary field
- [ ] Integrate host selection dropdown (fetch from API)
- [ ] Add slug validation API call (debounced)
- [ ] Ensure Tags input matches v1 UI (Type Tags + Add button)

#### 4.2 Availability & Rates Component
**File**: `steps/availability-rates/availability-rates.component.ts`

**Changes Required:**
- [ ] Add "Autofill from profile operating hours" option
- [ ] Replace inline ticket form with `UiExpertisePackageComponent`
- [ ] Add ASAP bookings checkbox to package form
- [ ] Package Mode (Online/Physical) is per-package, not global

#### 4.3 Booking Details Component
**File**: `steps/booking-details/booking-details.component.ts`

**Changes Required:**
- [ ] **REMOVE** Session Mode section (it's per-package)
- [ ] **REMOVE** Location section (doesn't exist in v1)
- [ ] **REMOVE** Display Full Address toggle
- [ ] Add "Generate with AI" button for photos
- [ ] Use rich text editor for Instructions (not plain textarea)
- [ ] Integrate `UiCustomQuestionComponent` from shared UI
- [ ] Connect upload API for cover photo and gallery

#### 4.4 Confirmation Component
**File**: `steps/confirm/confirm.component.ts`

**Changes Required:**
- [ ] Add preview banner: "Preview of your Expertise page to users"
- [ ] Create listing preview layout matching v1
- [ ] Show package cards with pricing
- [ ] Add Save/Share buttons
- [ ] Show validation errors if form incomplete

---

### Phase 5: Service Updates

#### 5.1 Update ExpertiseOnboardingService
**File**: `services/expertise-onboarding.service.ts`

**Remove from bookingForm:**
```typescript
// REMOVE these fields:
sessionMode: ['online', Validators.required],  // Per-package now
location: [null],  // Doesn't exist
displayFullAddress: [false],  // Doesn't exist
```

**Add to pricingForm:**
```typescript
// Already has tickets, but ensure package structure matches v1
```

**Add new methods:**
```typescript
// Autofill operating hours from hub profile
async autofillFromHubProfile(hubId: string): Promise<void>

// AI integration for summary
async generateSummaryWithAI(title: string, description: string): Promise<string>

// AI integration for photos
async generatePhotoWithAI(prompt: string): Promise<string>
```

---

### Phase 6: Field Mapping (V1 to V2)

| V1 Field | V2 Field | Notes |
|----------|----------|-------|
| `expertiseTitle` | `expertiseTitle` | Same |
| `slug` | `slug` | Same |
| `expertiseDescription` | `expertiseDescription` | Rich text |
| `expertiseSummary` | `expertiseSummary` | Same |
| `host` | `host` | Same structure |
| Tags (Visibility) | `expertiseTypes` | Array of strings |
| Primary language | `primaryLanguage` | Same |
| Secondary languages | `secondaryLanguages` | Same |
| Expertise Access | `audienceType` | 'Everyone' or 'Hidden' |
| Availability | `availabilityType` | 'manual', 'flexible', 'autofill' |
| Operating hours | `operatingHours` | Same structure |
| Service fee | `feePaidBy` | 'learner' or 'expert' |
| Service packages | `ticket` | Array of ExpertisePackage |
| Link mode | `linkMode` | 'send' or 'input' |
| Meeting link | `expertiseLink` | Same |
| Instructions | `infoForBooker` | Rich text |
| Cover photo | `coverPhoto` | URL string |
| Gallery | `gallery` | Array of URLs |
| Custom questions | `customQuestions` | Same structure |

---

## API Endpoints Required (Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expertise` | Create new expertise (draft) |
| PUT | `/api/expertise/:id` | Update expertise |
| GET | `/api/expertise/:id` | Get expertise by ID |
| GET | `/api/expertise/hub/:hubId` | List expertise by hub |
| DELETE | `/api/expertise/:id` | Soft delete expertise |
| POST | `/api/expertise/:id/publish` | Publish expertise |
| GET | `/api/slug/check` | Check slug availability |
| POST | `/api/slug` | Create/update slug |
| GET | `/api/hub/:hubId/members` | Get hub team members (for host selection) |
| GET | `/api/hub/:hubId/operating-hours` | Get hub operating hours (for autofill) |
| POST | `/api/upload/image` | Upload single image |
| POST | `/api/upload/images` | Upload multiple images |
| POST | `/api/ai/generate-summary` | AI summary generation |
| POST | `/api/ai/generate-image` | AI image generation |

---

## Task Checklist

### High Priority - Core Functionality
- [ ] Create `expertise-api.service.ts`
- [ ] Create `slug-api.service.ts`
- [ ] Create/update `upload.service.ts`
- [ ] Create `expertise.model.ts` in `@mereka/models`
- [ ] Implement publish API call in confirmation step

### High Priority - UI Component Updates
- [ ] **REMOVE** Session Mode section from Booking Details
- [ ] **REMOVE** Location section from Booking Details
- [ ] Create `UiExpertisePackageComponent` in `@mereka/ui`
- [ ] Add Package Mode (Online/Physical) to package component
- [ ] Add ASAP bookings checkbox to package component

### Medium Priority - Missing Features
- [ ] Add "Autofill from profile operating hours" option
- [ ] Add host selector dropdown with API integration
- [ ] Add slug validation API call
- [ ] Add "Write with AI" button for summary
- [ ] Add "Generate with AI" button for photos
- [ ] Use `UiCustomQuestionComponent` from shared UI (or create if missing)

### Medium Priority - Confirmation Tab
- [ ] Create listing preview layout
- [ ] Add package cards display
- [ ] Add Save/Share buttons
- [ ] Add validation summary

### Lower Priority - Polish
- [ ] Add loading states/skeletons
- [ ] Add toast notifications
- [ ] Add unsaved changes guard
- [ ] Rich text editor for Instructions (replace textarea)

---

## Files to Modify

### Remove/Update
- `steps/booking-details/booking-details.component.ts` - Remove session mode, location
- `steps/booking-details/booking-details.component.html` - Remove sections
- `services/expertise-onboarding.service.ts` - Update form structure

### Create New
- `projects/mereka/ui/src/lib/components/expertise-package/` - New package component
- `projects/mereka/models/src/lib/expertise.model.ts` - Data models
- `services/expertise-api.service.ts` - API service
- `services/slug-api.service.ts` - Slug service

---

## Notes

- **Session Mode** is NOT a global setting - each service package has its own mode (Online/Physical)
- **Location Picker** does NOT exist in v1 - do not implement
- **Custom Questions** should use shared UI component from `@mereka/ui`
- **AI Features** ("Write with AI", "Generate with AI") are nice-to-have, can be added later
- The v1 "Ticket" is called "Service Package" in the UI - rename accordingly

---

*Last Updated: December 2024*
*Based on v1 analysis at: https://app.mereka.dev/create-expertise/*

---

## Backend Implementation Guidelines

### Backend Project Structure

```
mereka-backend-v2-elevate-ref/
├── src/
│   ├── core/
│   │   ├── models/          # MongoDB/Mongoose models
│   │   │   └── Expertise.ts
│   │   ├── schemas/         # Validation schemas (JSON Schema)
│   │   │   └── hub/
│   │   │       └── expertise/
│   │   │           ├── hubExpertise.schema.ts
│   │   │           └── index.ts
│   │   └── services/        # Business logic services
│   │       └── hub/
│   │           └── expertises/
│   │               ├── hubExpertise.service.ts
│   │               └── index.ts
│   └── modules/
│       └── hub/
│           ├── controllers/
│           │   └── expertises/
│           │       ├── hubExpertise.controller.ts
│           │       └── index.ts
│           └── routes/
│               └── expertises/
│                   ├── hubExpertise.routes.ts
│                   └── index.ts
```

### Naming Conventions (MANDATORY)

| Type | Pattern | Example |
|------|---------|---------|
| **Model** | PascalCase | `Expertise.ts` |
| **Schema** | hub{Feature}.schema.ts | `hubExpertise.schema.ts` |
| **Service** | hub{Feature}.service.ts | `hubExpertise.service.ts` |
| **Controller** | hub{Feature}.controller.ts | `hubExpertise.controller.ts` |
| **Routes** | hub{Feature}.routes.ts | `hubExpertise.routes.ts` |
| **Route Function** | hub{Feature}Routes | `hubExpertiseRoutes` |

### API Route Structure

All expertise routes are under the hub module with hubId prefix:

```
/api/hub/:hubId/expertises
├── GET    /                    # queryExpertises
├── POST   /                    # upsertExpertise (create)
├── GET    /:id                 # getExpertiseById
├── PUT    /:id                 # upsertExpertise (update)
├── DELETE /:id                 # deleteExpertise
├── PATCH  /:id/publish         # publishExpertise
└── PATCH  /:id/archive         # archiveExpertise
```

### Schema Naming (Validation)

```typescript
// File: hubExpertise.schema.ts

// Export names follow pattern: hub{Action}{Feature}Schema
export const hubQueryExpertisesSchema = { ... };
export const hubUpsertExpertiseSchema = { ... };
export const hubGetExpertiseByIdSchema = { ... };
export const hubDeleteExpertiseSchema = { ... };
```

### Controller Function Names

```typescript
// File: hubExpertise.controller.ts

// Function names are action-based (no hub prefix)
export async function queryExpertises(request, reply) { ... }
export async function upsertExpertise(request, reply) { ... }
export async function getExpertiseById(request, reply) { ... }
export async function deleteExpertise(request, reply) { ... }
export async function publishExpertise(request, reply) { ... }
export async function archiveExpertise(request, reply) { ... }
```

### Service Function Names

```typescript
// File: hubExpertise.service.ts

// Class-based service with hub prefix
export class HubExpertiseService {
  async query(hubId: string, filters: QueryFilters) { ... }
  async findById(hubId: string, id: string) { ... }
  async create(hubId: string, data: ExpertiseInput) { ... }
  async update(hubId: string, id: string, data: ExpertiseInput) { ... }
  async delete(hubId: string, id: string) { ... }
  async publish(hubId: string, id: string) { ... }
  async archive(hubId: string, id: string) { ... }
}
```

### Index File Exports

Each folder must have an `index.ts` that exports all public items:

```typescript
// controllers/expertises/index.ts
export * from './hubExpertise.controller';

// routes/expertises/index.ts
export * from './hubExpertise.routes';

// schemas/hub/expertise/index.ts
export * from './hubExpertise.schema';

// services/hub/expertises/index.ts
export * from './hubExpertise.service';
```

### Middleware Chain (Routes)

```typescript
// Required middleware for hub routes:
const expertisePreHandlers = [
  requireAuth,           // Verify JWT token
  loadHubContext,        // Load hub data into request
  requireHubAccess,      // Verify user has hub access
];

// With permission check:
preHandler: [...expertisePreHandlers, requireHubPermission('canViewExpertises')]
preHandler: [...expertisePreHandlers, requireHubPermission('canEditExpertises')]
```

### Permission Names

| Action | Permission Key |
|--------|---------------|
| View/List | `canViewExpertises` |
| Create/Update/Delete | `canEditExpertises` |

### Backend Files to Create/Update

#### New Files Required

| File Path | Description |
|-----------|-------------|
| `src/core/models/Expertise.ts` | Already exists - verify schema |
| `src/core/schemas/hub/expertise/hubExpertise.schema.ts` | Already exists - may need updates |
| `src/core/services/hub/expertises/hubExpertise.service.ts` | Already exists - verify methods |
| `src/modules/hub/controllers/expertises/hubExpertise.controller.ts` | Already exists - verify handlers |
| `src/modules/hub/routes/expertises/hubExpertise.routes.ts` | Already exists - verify routes |

#### Files to Update (if needed)

| File | Changes |
|------|---------|
| `src/core/schemas/hub/index.ts` | Export expertise schemas |
| `src/core/services/hub/index.ts` | Export expertise service |
| `src/modules/hub/controllers/index.ts` | Export expertise controller |
| `src/modules/hub/routes/index.ts` | Register expertise routes |
| `src/modules/hub/index.ts` | Ensure routes are mounted |

### Existing Backend Endpoints (Already Implemented)

Based on `hubExpertise.routes.ts`, these routes exist:

```typescript
// Base: /api/hub/:hubId/expertises

GET    /                  // Query expertises with filters
POST   /                  // Create new expertise
GET    /:id               // Get expertise by ID
PUT    /:id               // Update expertise by ID
DELETE /:id               // Delete expertise by ID
PATCH  /:id/publish       // Publish expertise
PATCH  /:id/archive       // Archive expertise
```

### Frontend API Service Integration

Map frontend service calls to backend routes:

```typescript
// Frontend API Service
@Injectable({ providedIn: 'root' })
export class ExpertiseApiService {
  private readonly baseUrl = `${environment.apiUrl}/hub`;

  // List all expertises for a hub
  getAll(hubId: string): Observable<Expertise[]> {
    return this.http.get<Expertise[]>(`${this.baseUrl}/${hubId}/expertises`);
  }

  // Get single expertise
  getById(hubId: string, id: string): Observable<Expertise> {
    return this.http.get<Expertise>(`${this.baseUrl}/${hubId}/expertises/${id}`);
  }

  // Create new expertise
  create(hubId: string, data: Partial<Expertise>): Observable<Expertise> {
    return this.http.post<Expertise>(`${this.baseUrl}/${hubId}/expertises`, data);
  }

  // Update expertise
  update(hubId: string, id: string, data: Partial<Expertise>): Observable<Expertise> {
    return this.http.put<Expertise>(`${this.baseUrl}/${hubId}/expertises/${id}`, data);
  }

  // Delete expertise
  delete(hubId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${hubId}/expertises/${id}`);
  }

  // Publish expertise
  publish(hubId: string, id: string): Observable<Expertise> {
    return this.http.patch<Expertise>(`${this.baseUrl}/${hubId}/expertises/${id}/publish`, {});
  }

  // Archive expertise
  archive(hubId: string, id: string): Observable<Expertise> {
    return this.http.patch<Expertise>(`${this.baseUrl}/${hubId}/expertises/${id}/archive`, {});
  }
}
```

---

## Summary

This plan provides complete coverage for:
1. **Frontend** - Component updates, service integration, UI changes
2. **Backend** - Naming conventions, file structure, route patterns
3. **API** - Endpoint mapping between frontend and backend
4. **Data Models** - Consistent interfaces across both projects

Follow the naming conventions strictly to maintain consistency with the existing codebase.
