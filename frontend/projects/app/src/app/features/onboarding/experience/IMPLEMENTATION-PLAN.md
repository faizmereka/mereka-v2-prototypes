# Experience Upload Feature - Implementation Plan

## Overview

Implement full experience upload feature in v2 with both Express and Platform flows, edit mode, and complete feature set including host collaboration, custom questions, and event generation.

---

## Table of Contents

1. [Scope & Features](#scope--features)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Foundation](#phase-1-foundation)
4. [Phase 2: Platform Flow Components](#phase-2-platform-flow-components)
5. [Phase 3: Express Flow](#phase-3-express-flow)
6. [Phase 4: Edit Mode](#phase-4-edit-mode)
7. [Event Generation System](#event-generation-system)
8. [API Endpoints](#api-endpoints)
9. [Form Field Mapping](#form-field-mapping)
10. [File Structure](#file-structure)

---

## Scope & Features

### Flows
- **Express Flow**: Quick listing with minimal fields (title, slug, external link, cover photo)
- **Platform Flow**: Full 7-step wizard with comprehensive fields

### Features Included
- Core experience creation/editing
- Custom registration questions
- Host collaboration (invite hosts, manage access)
- Multi-ticket support
- Recurring schedules with RRULE
- Event generation from schedules
- Edit mode for existing experiences

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Experience Onboarding                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  Shell Component │    │  ExperienceOnboardingService     │  │
│  │  (Router Outlet) │◄───│  - Form state (6 reactive forms) │  │
│  └────────┬─────────┘    │  - Save/Publish logic            │  │
│           │              │  - Edit mode loading             │  │
│           ▼              └──────────────┬───────────────────┘  │
│  ┌────────────────────┐                 │                       │
│  │   Step Components  │                 ▼                       │
│  │  1. Select Type    │      ┌──────────────────────────┐      │
│  │  2. Basic Info     │      │  ExperienceApiService    │      │
│  │  3. Audience       │      │  - CRUD operations       │      │
│  │  4. Booking        │      │  - Slug check            │      │
│  │  5. Tickets        │      └──────────────┬───────────┘      │
│  │  6. Page           │                     │                   │
│  │  7. Details        │                     ▼                   │
│  │  8. Confirm        │      ┌──────────────────────────┐      │
│  │  9. Express        │      │  Backend API             │      │
│  └────────────────────┘      │  POST/PATCH /experiences │      │
│                              └──────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation

### 1.1 Models (PENDING)
**File**: `models/experience.models.ts`

TypeScript interfaces to create:
- `ExperienceLocation` - Venue address details
- `ExperienceTopic` - Theme + topic reference
- `ExperienceHost` - Host/collaborator details
- `ExperienceTicket` - Ticket configuration
- `ExperienceSchedule` - Schedule with RRULE
- `CustomQuestion` - Registration form questions
- `Experience` - Main experience interface
- `ExperienceEvent` - Generated event occurrence
- `CreateExperienceInput` / `UpdateExperienceInput` - API payloads
- Reference data types (Theme, Topic, Audience, Language, Skill)

### 1.2 ExperienceApiService
**File**: `services/experience-api.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class ExperienceApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/experiences`;

  // CRUD Operations
  create(data: CreateExperienceInput): Observable<ApiResponse<Experience>>;
  update(id: string, data: UpdateExperienceInput): Observable<ApiResponse<Experience>>;
  getById(id: string): Observable<ApiResponse<Experience>>;
  getBySlug(slug: string): Observable<ApiResponse<Experience>>;

  // Validation
  checkSlugAvailability(slug: string, excludeId?: string): Observable<ApiResponse<boolean>>;
}
```

### 1.3 ReferenceDataService Updates
**File**: `features/onboarding/services/reference-data.service.ts`

Add methods for experience-specific reference data:
```typescript
// Experience reference data
loadExperienceThemes(): Observable<ExperienceTheme[]>;
loadExperienceTopics(): Observable<ExperienceTopicItem[]>;
loadTargetAudiences(): Observable<TargetAudience[]>;
loadLanguages(): Observable<Language[]>;
loadSkills(): Observable<Skill[]>;
```

### 1.4 ExperienceOnboardingService
**File**: `services/experience-onboarding.service.ts`

Central state management service:

```typescript
@Injectable({ providedIn: 'root' })
export class ExperienceOnboardingService {
  // State signals
  readonly experienceId = signal<string | null>(null);
  readonly hubId = signal<string>('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly listingType = signal<'platform' | 'express'>('platform');
  readonly isEditMode = computed(() => !!this.experienceId());

  // 6 Reactive Form Groups
  readonly basicInfoForm: FormGroup;    // Title, slug, category, topics, type, location, hosts
  readonly audienceForm: FormGroup;     // Access, audience, expertise, languages
  readonly bookingForm: FormGroup;      // Duration, timezone, schedules, cutoff
  readonly ticketsForm: FormGroup;      // Fee paid by, tickets array
  readonly pageForm: FormGroup;         // Description, cover, gallery, video
  readonly detailsForm: FormGroup;      // Outcomes, instructions, materials, custom questions

  // Methods
  loadExperience(id: string): Promise<void>;      // Load for edit mode
  saveDraft(): Promise<Experience>;               // Save as DRAFTED
  publish(): Promise<Experience>;                 // Save as ACTIVE
  reset(): void;                                  // Clear all forms
  validateStep(step: number): boolean;            // Per-step validation
  getMergedPayload(): CreateExperienceInput;      // Combine all forms
}
```

---

## Phase 2: Platform Flow Components

### Step 1: Select Type
**File**: `steps/select-type/select-type.component.ts`

- Choose between Express or Platform flow
- Sets `listingType` in service
- Routes to appropriate next step

### Step 2: Basic Info
**File**: `steps/basic-info/basic-info.component.ts`

Fields:
| Field | Type | Validation |
|-------|------|------------|
| experienceTitle | text | Required, max 100 chars |
| slug | text | Required, unique, auto-generated |
| experienceCategory | select | Required (from themes) |
| experienceTopics | multi-select | Required, max 5 |
| experienceType | radio | Required (Physical/Virtual/Hybrid) |
| location | address | Required if Physical/Hybrid |
| meetingLink | url | Required if Virtual/Hybrid |
| hostDetails | array | Optional, host management |
| noHost | boolean | Default false |

Features:
- Auto-slug generation from title
- Slug availability check (debounced)
- Google Maps integration for location
- Host invitation system

### Step 3: Audience
**File**: `steps/audience/audience.component.ts`

Fields:
| Field | Type | Validation |
|-------|------|------------|
| audienceType | select | Required (Everyone/Members Only/Hidden) |
| targetAudience | multi-select | Required |
| expertiseLevel | select | Optional |
| expertiseFields | multi-select | Optional |
| primaryLanguage | select | Required |
| secondaryLanguage | multi-select | Optional |

### Step 4: Booking
**File**: `steps/booking/booking.component.ts`

Fields:
| Field | Type | Validation |
|-------|------|------------|
| experienceDuration | number | Required (hours + minutes → ms) |
| timeZone | select | Required |
| isMultiDay | boolean | Default false |
| schedules | array | At least 1 required |
| cutOffTime | number | Optional |
| cutOffTimeUnit | select | hours/days/weeks |

Features:
- Schedule builder with recurring options
- RRULE generation (see Event Generation section)
- Multi-day event support
- Timezone-aware date/time pickers

### Step 5: Tickets
**File**: `steps/tickets/tickets.component.ts`

Fields:
| Field | Type | Validation |
|-------|------|------------|
| feePaidBy | radio | learner/hub |
| ticket | array | At least 1 required |

Ticket Fields:
- ticketType: Paid/Free
- ticketName: string
- ticketPrice: number (0 if Free)
- ticketQty: number
- cutoff settings (optional)
- description (optional)

### Step 6: Page
**File**: `steps/page/page.component.ts`

Fields:
| Field | Type | Validation |
|-------|------|------------|
| experienceDescription | rich text | Required |
| coverPhoto | image upload | Required |
| gallery | image array | Optional, max 10 |
| video | url | Optional (YouTube/Vimeo) |

Features:
- Rich text editor (Quill/TipTap)
- Image upload with preview
- Video URL validation and embed preview

### Step 7: Details
**File**: `steps/details/details.component.ts`

Fields:
| Field | Type | Validation |
|-------|------|------------|
| learnerOutcome | rich text | Optional |
| instruction | rich text | Optional |
| materialProvided | text | Optional |
| materialNeedToBring | text | Optional |
| poster | image upload | Optional |
| customQuestions | array | Optional |

Custom Question Builder:
- questionLabel: string
- questionType: text/dropdown/checkbox/multiple_choice
- options array for dropdown/checkbox/multiple_choice
- isQuestionMandatory flag

### Step 8: Confirm
**File**: `steps/confirm/confirm.component.ts`

Features:
- Summary display of all collected data
- Validation warnings for incomplete sections
- "Save as Draft" button → status: DRAFTED
- "Publish" button → status: ACTIVE
- Success redirect to hub dashboard

---

## Phase 3: Express Flow

**File**: `steps/express/express.component.ts`

Minimal fields for quick external listing:
- experienceTitle (required)
- slug (required, auto-generated)
- externalLink (required - off-platform URL)
- coverPhoto (optional)
- experienceDescription (optional, brief)
- Direct publish flow

Sets `listingType: 'express'` and bypasses detailed steps.

---

## Phase 4: Edit Mode

### Route Configuration
```typescript
// experience-onboarding.routes.ts
{
  path: 'platform/:id',  // Edit existing experience
  loadComponent: () => ExperienceOnboardingComponent,
  children: [...steps]
}
```

### Edit Mode Flow
1. Route activated with `:id` param
2. Shell component detects edit mode
3. Calls `service.loadExperience(id)`
4. Service fetches experience from API
5. Populates all 6 form groups with existing data
6. Components display pre-filled forms
7. Save calls PATCH instead of POST
8. Preserves existing event bookings

---

## Event Generation System

### Overview

Events are generated server-side when an experience is saved with schedules. The backend handles:
1. Parsing RRULE strings from schedules
2. Generating event occurrences (up to 500 per schedule, 3-year window)
3. Creating ExperienceEvent documents
4. Protecting events with existing bookings during updates

### Schedule Structure

```typescript
interface ExperienceSchedule {
  uid: string;                    // Unique identifier
  recurringRule: string[];        // RRULE format (2 elements)
  startDate: string | Date;       // First occurrence
  endDate?: string | Date;        // For multi-day or bounded recurrence
  recurringType: string;          // daily/weekly/monthly/once/no_repeat
}
```

### RRULE Format

The `recurringRule` array contains 2 elements:

```
[
  "DTSTART:20250120T093000",                        // Start datetime
  "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=12"      // Recurrence rule
]
```

### Recurring Types

| Type | RRULE Example | Behavior |
|------|---------------|----------|
| no_repeat | No RRULE | Single event only |
| daily | FREQ=DAILY;COUNT=30 | Every day for 30 days |
| weekly | FREQ=WEEKLY;BYDAY=MO,WE,FR | Specific days each week |
| monthly | FREQ=MONTHLY;BYMONTHDAY=15 | Same day each month |
| Custom | Any valid RRULE | User-defined pattern |

### Event Generation Logic (Backend)

```
┌─────────────────────────────────────────────────────────────┐
│                    Experience Saved                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              For Each Schedule in schedules[]               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │  recurringType check  │
          └───────────┬───────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   no_repeat      recurring      Custom
        │             │             │
        ▼             ▼             ▼
┌───────────┐  ┌─────────────┐  ┌─────────────┐
│  Create   │  │ Parse RRULE │  │ Parse RRULE │
│  Single   │  │ Generate up │  │ Generate up │
│  Event    │  │ to 500      │  │ to 500      │
└───────────┘  │ occurrences │  │ occurrences │
               └─────────────┘  └─────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Create ExperienceEvent Documents               │
│  - experienceId: parent experience                          │
│  - scheduleId: schedule.uid                                 │
│  - startTime: occurrence datetime                           │
│  - endTime: startTime + experienceDuration                  │
│  - timeZone: experience.timeZone                            │
│  - ticket availability from experience.ticket[]             │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Schedule Builder

The frontend needs to generate valid RRULE strings:

```typescript
// Example: Weekly on Mon, Wed, Fri starting Jan 20, 2025 at 9:30 AM
function buildRRule(schedule: ScheduleFormValue): string[] {
  const dtstart = `DTSTART:${format(schedule.startDate, 'yyyyMMdd')}T${format(schedule.startTime, 'HHmmss')}`;

  let rrule = `RRULE:FREQ=${schedule.frequency.toUpperCase()}`;

  if (schedule.frequency === 'weekly' && schedule.weekdays?.length) {
    rrule += `;BYDAY=${schedule.weekdays.join(',')}`;
  }

  if (schedule.endType === 'count') {
    rrule += `;COUNT=${schedule.count}`;
  } else if (schedule.endType === 'until') {
    rrule += `;UNTIL=${format(schedule.endDate, 'yyyyMMdd')}`;
  }

  return [dtstart, rrule];
}
```

### Update Behavior (Booking Protection)

When schedules are updated:

1. **Schedule timing changed**:
   - Delete events WITHOUT bookings
   - Regenerate new events
   - Keep events WITH bookings (marked as locked)

2. **Metadata only changed** (title, capacity, tickets):
   - Update events in place
   - Skip events marked `isOverridden`

3. **Schedule deleted**:
   - Soft-delete events without bookings
   - Keep events with bookings as locked
   - Store locked IDs in `schedule.lockedEvents`

---

## API Endpoints

### Experience CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/experiences | Create new experience |
| PATCH | /api/v1/experiences/:id | Update experience |
| GET | /api/v1/experiences/:id | Get by ID |
| GET | /api/v1/experiences/slug/:slug | Get by slug |
| GET | /api/v1/experiences/check/slug | Check slug availability |

### Reference Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/experience-themes | Get all themes |
| GET | /api/v1/experience-topics | Get all topics |
| GET | /api/v1/target-audiences | Get all audiences |
| GET | /api/v1/languages | Get all languages |
| GET | /api/v1/skills | Get all skills |

---

## Form Field Mapping

### Basic Info → API

| Form Field | API Field |
|------------|-----------|
| experienceTitle | experienceTitle |
| slug | slug |
| experienceCategory | experienceCategory |
| experienceTopics | experienceTopics[] |
| experienceType | experienceType |
| location | location |
| meetingLink | meetingLink |
| hostDetails | hostDetails[] |
| noHost | noHost |

### Audience → API

| Form Field | API Field |
|------------|-----------|
| accessType | audienceType |
| targetAudience | targetAudience[] |
| expertiseLevel | expertiseLevel |
| expertiseFields | expertiseFields[] |
| primaryLanguage | primaryLanguage |
| secondaryLanguage | secondaryLanguage[] |

### Booking → API

| Form Field | API Field |
|------------|-----------|
| durationHours + durationMinutes | experienceDuration (ms) |
| timezone | timeZone |
| schedules | schedules[] |
| isMultiDay | isMultiDay |
| cutOffTime | cutOffTime |
| cutOffTimeUnit | cutOffTimeUnit |

### Tickets → API

| Form Field | API Field |
|------------|-----------|
| feePaidBy | feePaidBy |
| tickets[] | ticket[] |

### Page → API

| Form Field | API Field |
|------------|-----------|
| description | experienceDescription |
| coverPhoto | coverPhoto |
| galleryPhotos | gallery[] |
| videoUrl | video |

### Details → API

| Form Field | API Field |
|------------|-----------|
| learningOutcomes | learnerOutcome |
| instructions | instruction |
| materials | materialProvided |
| bringItems | materialNeedToBring |
| poster | poster |
| customQuestions | customQuestions |

---

## File Structure

### New Files to Create

```
features/onboarding/experience/
├── models/
│   ├── experience.models.ts        ⏳ PENDING
│   └── index.ts                    ⏳ PENDING
├── services/
│   ├── experience-api.service.ts   ⏳ PENDING
│   ├── experience-onboarding.service.ts  ⏳ PENDING
│   └── index.ts                    ⏳ PENDING
├── utils/
│   ├── rrule-builder.ts            ⏳ PENDING (RRULE string generation)
│   ├── slug-generator.ts           ⏳ PENDING
│   ├── fee-calculator.ts           ⏳ PENDING
│   └── index.ts                    ⏳ PENDING
└── IMPLEMENTATION-PLAN.md          ✅ THIS FILE
```

### Files to Modify

```
features/onboarding/experience/
├── experience-onboarding.component.ts   ⏳ PENDING
├── experience-onboarding.routes.ts      ⏳ PENDING
├── steps/
│   ├── select-type/                     ⏳ PENDING
│   ├── express/                         ⏳ PENDING
│   ├── basic-info/                      ⏳ PENDING
│   ├── audience/                        ⏳ PENDING
│   ├── booking/                         ⏳ PENDING
│   ├── tickets/                         ⏳ PENDING
│   ├── page/                            ⏳ PENDING
│   ├── details/                         ⏳ PENDING
│   └── confirm/                         ⏳ PENDING

features/onboarding/services/
├── reference-data.service.ts            ⏳ PENDING
```

---

## Implementation Order

1. ⏳ **Models** - TypeScript interfaces
2. ⏳ **Utils** - Slug generator, fee calculator, RRULE builder
3. ⏳ **ExperienceApiService** - API layer
4. ⏳ **ReferenceDataService** - Add experience data loading
5. ⏳ **ExperienceOnboardingService** - Core form management
6. ⏳ **Shell Component** - Service integration, edit mode
7. ⏳ **Basic Info** - First step, establishes patterns
8. ⏳ **Audience** - Reference data integration
9. ⏳ **Booking** - Schedule complexity, RRULE generation
10. ⏳ **Tickets** - Ticket management with fee calculations
11. ⏳ **Page** - Media uploads
12. ⏳ **Details** - Custom questions builder
13. ⏳ **Confirm** - Final review, share dialog
14. ⏳ **Express** - Minimal flow
15. ⏳ **Edit Mode** - Route params and loading

---

## Notes

### Backend Event Generation
- Events are generated SERVER-SIDE after experience is saved
- Frontend only builds schedule objects with RRULE strings
- Backend parses RRULE using `rrule` library
- Maximum 500 events per schedule (3-year window)
- Events with bookings are protected from deletion

### Multi-day Events
- When `isMultiDay: true`, endTime uses schedule.endDate
- Otherwise, endTime = startTime + experienceDuration

### Timezone Handling
- All dates stored in UTC
- Display converted using experience.timeZone
- RRULE DTSTART includes local time, parsed with timezone

---

## Booking Protection (Events with Existing Bookings)

### Overview

When an experience has events with existing bookings, those events are **protected** from deletion or modification to preserve booking integrity.

### Protection Flow

```
Schedule Update/Delete Request
            │
            ▼
    ┌───────────────────┐
    │ Query bookings    │
    │ for all events    │
    └─────────┬─────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
NO BOOKINGS        HAS BOOKINGS
    │                   │
    ▼                   ▼
Delete/Update      ┌─────────────────────┐
freely             │ 1. Lock booked      │
                   │    events           │
                   │ 2. Delete only      │
                   │    non-booked       │
                   │ 3. Store lockedIDs  │
                   │ 4. Mark readOnly    │
                   └─────────────────────┘
```

### Locked Event Properties

| Property | Description |
|----------|-------------|
| `event.isLocked` | Event won't be auto-updated on metadata changes |
| `event.isOverridden` | Event was manually customized, skip batch updates |
| `schedule.lockedEvents[]` | Array of protected event IDs |
| `schedule.readOnly` | Prevents RRULE regeneration for this schedule |

### Scenarios

#### 1. Schedule Timing Changed
- Events WITHOUT bookings → Deleted and regenerated
- Events WITH bookings → Kept as-is, marked locked
- New events generated alongside locked ones

#### 2. Schedule Deleted
- Events WITHOUT bookings → Hard deleted
- Events WITH bookings → Soft deleted (`isDeleted: true`)
- Schedule marked `isDeleted: true` with `lockedEvents` preserved

#### 3. Experience Deleted/Expired
- All events with bookings preserved
- Status changed to CANCELLED
- Booking transaction records maintained

### Frontend Edit Mode Handling

When editing experience with bookings:

1. **Detect locked schedules**: Check `schedule.lockedEvents?.length > 0`
2. **Show warning banner**: "Some events have bookings and cannot be modified"
3. **Disable schedule editing**: For schedules with locked events
4. **Allow safe updates**: Title, description, capacity, ticket quantities
5. **Display locked dates**: Show which specific dates are protected

```typescript
// Example: Check if schedule can be edited
canEditSchedule(schedule: ExperienceSchedule): boolean {
  return !schedule.readOnly && (!schedule.lockedEvents || schedule.lockedEvents.length === 0);
}

// Example: Get locked event dates for display
getLockedEventDates(experienceId: string): Observable<Date[]> {
  return this.experienceApi.getLockedEvents(experienceId).pipe(
    map(events => events.map(e => new Date(e.startTime)))
  );
}
```

### API Considerations

The backend should return:
- `experience.schedules[].lockedEvents` - Array of locked event IDs
- `experience.schedules[].readOnly` - Boolean flag
- Endpoint to fetch locked event details if needed

---

## Additional Features (From Codebase Review)

### Host Invitation System

#### Host Types
| Type | Description | Email Template |
|------|-------------|----------------|
| Internal Host | Has `expertId` - existing expert on platform | Internal host email |
| External Host | No `expertId` - invited via email | External host email |
| Collaborator | `type: 'COLLABORATOR'` | Filtered out from certain emails |

#### Host Access Levels
```typescript
type HostAccess = 'FULL_ACCESS' | 'EXPORT_ONLY' | 'VIEW_ONLY';
```

#### Host Invitation Flow
1. Hub owner adds host by email
2. If expert exists → Link directly
3. If new → Send invitation email with 30-day expiry
4. Track invitation status: pending/accepted/expired
5. On acceptance → Add to `hostDetails[]`

#### Host Object Structure
```typescript
interface ExperienceHost {
  hubId?: string;
  hubName?: string;
  expertId?: string;
  expertName?: string;
  fullName?: string;
  email: string;           // Required for invitations
  access: HostAccess;
  description?: string;
  profileUrl?: string;
  type: 'HOST' | 'COLLABORATOR';
  isNew?: boolean;         // Frontend tracking
  isEditing?: boolean;     // Frontend tracking
  isDeleted?: boolean;     // Soft delete flag
}
```

#### Backend Triggers
- Host added → Send host email (internal vs external template)
- Host removed → Send removal email
- Different email if same hub vs different hub (collaborator removal)

---

### Custom Questions Builder (Detailed)

#### Question Types
| Type | UI Component | Storage |
|------|--------------|---------|
| `short_answer` | Text input | N/A |
| `paragraph` | Textarea | N/A |
| `dropdown` | Select with options | `dropDown[]` |
| `multiple_choice` | Radio buttons | `multipleChoices[]` |
| `checkbox` | Checkboxes | `checkBox[]` |

#### Custom Question Structure
```typescript
interface CustomQuestion {
  questionLabel: string;
  questionType: 'short_answer' | 'paragraph' | 'dropdown' | 'multiple_choice' | 'checkbox';
  saveStatus?: boolean;        // Track if saved
  dropDown?: string[];         // Options for dropdown
  checkBox?: string[];         // Options for checkbox
  multipleChoices?: string[];  // Options for multiple choice
}

interface CustomQuestionsConfig {
  isQuestionMandatory: boolean;  // Global mandatory flag
  questionArray: CustomQuestion[];
}
```

#### Features
- Drag-and-drop reordering (CDK DragDrop)
- Add/Edit/Delete questions
- Dynamic options management for dropdown/checkbox/multiple_choice
- Save status tracking per question

---

### Ticket Management (Detailed)

#### Ticket Types
| Type | Price | Description |
|------|-------|-------------|
| `Paid` | > 0 | Standard paid ticket |
| `Free` | 0 | Free admission |

#### Ticket Structure (Full)
```typescript
interface ExperienceTicket {
  id?: string;
  ticketType: 'Paid' | 'Free';
  ticketName: string;
  ticketPrice: number;           // Called 'standardRate' in old code
  ticketQty: number;
  description?: string;

  // Cutoff settings
  hasCutoffTime?: boolean;
  cutoffNumber?: number;
  cutoffTime?: 'Hour(s)' | 'Day(s)' | 'Week(s)';
  cutoffBeforeAfter?: 'Before Experience starts' | 'Before Experience ends';
}
```

#### Fee Calculations
```typescript
// Service fee structure (Malaysia)
const SERVICE_FEE_PERCENT = 0.03;  // 3%
const SERVICE_FEE_FIXED = 1;       // RM 1

// Mereka fee
const MEREKA_FEE_PERCENT = 0.035;  // 3.5%

// Calculate buyer total (if learner pays fees)
function calculateBuyerTotal(rate: number, feePaidBy: 'learner' | 'hub'): number {
  if (feePaidBy === 'hub') return rate;
  return (rate + SERVICE_FEE_FIXED) / (1 - SERVICE_FEE_PERCENT - MEREKA_FEE_PERCENT);
}

// Cutoff time to milliseconds
function cutoffToMs(number: number, unit: string): number {
  switch (unit) {
    case 'Hour(s)': return number * 60 * 60 * 1000;
    case 'Day(s)': return number * 24 * 60 * 60 * 1000;
    case 'Week(s)': return number * 7 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}
```

#### UI Features
- Drag-and-drop ticket reordering
- Duplicate ticket functionality
- Fee breakdown dialog
- Per-ticket cutoff settings

---

### Slug Generation & Management

#### Auto-Generation
```typescript
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')     // Remove special chars
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens
    .substring(0, 50);             // Limit length
}
```

#### Slug Validation
- Check uniqueness via API (debounced, 300ms)
- Exclude current experience ID when editing
- Show availability status (available/taken)
- Copy-to-clipboard functionality

---

### Image Upload Handling

#### Cover Photo
- Single image required
- Preview before upload
- Base64 encoding for API

#### Gallery
- Multiple images (max 10)
- Individual remove buttons
- Drag-and-drop reordering
- Base64 encoding

#### Implementation
```typescript
// Convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Image structure for API
interface ImageUpload {
  data: string;      // Base64 or URL
  isBase64: boolean; // Flag for backend processing
}
```

---

### Video URL Validation

#### Supported Platforms
- YouTube (youtube.com, youtu.be)
- Vimeo (vimeo.com)

#### Validation Regex
```typescript
const VIDEO_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)[a-zA-Z0-9_-]+/;
```

---

### Meeting Link Handling

#### Stored Fields
```typescript
{
  meetingLink: string;              // The URL
  meetingLocation?: string;         // Optional description
  zoomMeetingData?: {               // Zoom API integration data
    meetingId: string;
    password?: string;
    joinUrl: string;
  };
  meetingLinkEditedDate?: Date;     // Track last edit
}
```

#### Backend Triggers on Meeting Link Change
1. Update Google Calendar event
2. Resend booking confirmation emails (only for future bookings)
3. Update WhatsApp scheduled messages
4. Only triggers for ACTIVE Online/Virtual experiences

---

### Currency Handling

#### Auto-Detection
```typescript
// Based on hub location
const COUNTRY_CURRENCY: Record<string, string> = {
  'Malaysia': 'MYR',
  'Singapore': 'SGD',
  'United States': 'USD',
  // ... etc
};

function getCurrencyForHub(hub: Hub): string {
  return COUNTRY_CURRENCY[hub.country] || 'USD';
}
```

---

### Auto-Save & Draft Functionality

#### Save Logic
```typescript
async function saveExperience(status: 'ACTIVE' | 'DRAFTED'): Promise<void> {
  // Determine final status
  let finalStatus = status;

  if (status === 'ACTIVE') {
    // Check if form is complete
    if (!isFormComplete()) {
      finalStatus = 'DRAFTED';
      showToast('Saved as draft - some required fields are missing');
    }
    // Check if hub is approved
    if (!hub.isApproved) {
      finalStatus = 'DRAFTED';
      showDialog('Hub approval required before publishing');
    }
  }

  // Save to API
  const payload = getMergedPayload();
  payload.status = finalStatus;

  if (experienceId) {
    await experienceApi.update(experienceId, payload);
  } else {
    await experienceApi.create(payload);
  }
}
```

#### Save on Exit
- Prompt to save when navigating away
- Auto-save as DRAFTED if leaving

---

### Share Dialog (Post-Publish)

#### Social Platforms
- Facebook
- X (Twitter)
- LinkedIn
- Copy Link

#### Features
- Copy link with tooltip feedback
- Track share counts (PageStatistics)
- Google Analytics event tracking

---

### Step Navigation

#### Desktop Route Sequence
```typescript
const STEPS = [
  'select-type',
  'basic-info',
  'audience',
  'booking',
  'tickets',
  'page',
  'details',
  'confirm'
];
```

#### Progress Tracking
```typescript
// Calculate progress percentage
const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

// Track visited steps
const visitedSteps = signal<Set<string>>(new Set());

// Mark step as visited
function markStepVisited(step: string): void {
  visitedSteps.update(set => new Set([...set, step]));
}
```

---

### Backend Email Triggers (For Reference)

| Trigger | Email Type | Recipients |
|---------|------------|------------|
| Experience created with hosts | Host invitation | Hosts (not collaborators) |
| Experience status → ACTIVE | Approval notification | Hosts |
| Experience status → REJECTED | Rejection notification | Hosts |
| Host removed | Removal notification | Removed host |
| Meeting link changed | Updated confirmation | Learners with future bookings |
| Post-experience (1 day) | Review request | Attendees |
| Post-experience (7 days) | Review reminder | Attendees |
| Post-experience (14 days) | Final review reminder | Attendees |
| Any status change | Admin notification | All platform admins |

---

### Stripe Integration (Backend)

When experience is saved:
1. Create/update Stripe Product (experience)
2. Create/update Stripe Prices (tickets)
3. Product ID = Experience ID
4. Price lookup_key = Ticket ID
5. Currency = 'myr' (hardcoded for Malaysia)

---

## Excluded Features (NOT in v2)

The following features from the old codebase are **NOT** included in v2:

| Feature | Reason |
|---------|--------|
| Discovery Pass | Not required in v2 |
| Learner Pass | Not required in v2 |
| Scholarship Slots | Tied to pass system |
| `isDiscoveryPassAvailable` | Removed |
| `isLearnerPassAvailable` | Removed |
| `numberOfDiscoveryPass` | Removed |
| `numberOfLearnerPass` | Removed |

---

## Dependencies & Libraries

### Required
- `@angular/cdk` - Drag-drop, clipboard
- `@angular/forms` - Reactive forms
- `dayjs` or `date-fns` - Date handling with timezone
- Rich text editor (TipTap recommended for Angular)

### Optional
- `ngx-image-cropper` - Image cropping
- `ngx-image-compress` - Image compression
- Google Maps API - Location selection

---

## Models Update Required

Add these fields to `experience.models.ts`:

```typescript
// Add to ExperienceSchedule
interface ExperienceSchedule {
  // ... existing fields
  slotNo?: number;           // For ordering
  isNew?: boolean;           // Frontend tracking
  history?: unknown[];       // Edit history
  lockedEvents?: string[];   // Protected event IDs
  readOnly?: boolean;        // Prevent modifications
  isDeleted?: boolean;       // Soft delete
}

// Add to ExperienceHost
interface ExperienceHost {
  // ... existing fields
  isNew?: boolean;           // Frontend tracking
  isEditing?: boolean;       // Frontend tracking
  isDeleted?: boolean;       // Soft delete
}
```

---

*Last Updated: December 2024*
