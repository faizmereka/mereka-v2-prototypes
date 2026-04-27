# Create Job Feature - V2 Frontend Implementation Plan

## Overview

Implement the multi-step "Create Job" wizard in v2 frontend (`mereka-frontend-workspace`), replicating the v1 UI from `app.mereka.io/create-job/*` using existing generic components from `@mereka/ui`.

---

## V1 UI Screenshots Captured

| Step | URL | Screenshot |
|------|-----|------------|
| 1. Overview | `/create-job/overview` | `job-step1-overview.png` |
| 2. Requirements | `/create-job/requirements` | `job-step2-requirements.png` |
| 3. Timeline & Budget | `/create-job/timeline-budget` | `job-step3-timeline-budget.png` |
| 4. Your Detail | `/create-job/your-detail` | `job-step4-your-detail.png` |
| 5. Confirmation | `/create-job/confirmation` | `job-step5-confirmation.png` |

---

## Complete Field Mapping (V1 → V2)

### Step 1: Overview

| Field | Type | Validation | Component |
|-------|------|------------|-----------|
| Job Title | Text input | Required, max 70 chars | `<ui-input>` |
| Employment Type | Radio group | Required (Full-time, Freelance) | `<ui-radio-group>` |
| Category | Dropdown | Required | `<ui-select>` |
| Service Type | Dropdown | Required, depends on category | `<ui-select>` |
| Expert Level | Dropdown | Required | `<ui-select>` |
| Job Location | Radio group | Required (Remote, On-site) | `<ui-radio-group>` |
| Access Mode | Radio group | Required (Public, Private) | `<ui-radio-group>` |

### Step 2: Requirements

| Field | Type | Validation | Component |
|-------|------|------------|-----------|
| Job Description | Rich text editor | Required, max 2000 chars | `<ui-textarea>` with toolbar |
| Job Summary | Textarea | Max 150 chars | `<ui-textarea>` |
| AI Summary Button | Button | Optional | `<ui-button>` |
| Attachment | File upload | Optional, max 100MB | `<ui-upload-file>` |
| Skills | Tags/chips | 3-5 keywords | `<ui-chip-input>` |

### Step 3: Timeline & Budget

| Field | Type | Validation | Component |
|-------|------|------------|-----------|
| Start Date | Radio + Date picker | Required (ASAP, Flexible, Specific) | `<ui-radio-group>` + date input |
| Duration | Radio group | Required (< 1 month, 1-6 months, > 6 months, Ongoing) | `<ui-radio-group>` |
| Currency | Dropdown | Required (MYR default) | `<ui-select>` |
| Pricing Type | Radio group | Required (Fixed price, Hourly rate) | `<ui-radio-group>` |
| Budget From | Number input | Required | `<ui-input type="number">` |
| Budget Up To | Number input | Optional | `<ui-input type="number">` |

### Step 4: Your Detail

| Field | Type | Validation | Component |
|-------|------|------------|-----------|
| Name | Text input | Required | `<ui-input>` |
| Email | Email input | Required, email format | `<ui-input type="email">` |
| Phone Number | Phone input | Optional, with country code | `<ui-phone-input>` |
| Organization Logo | Image upload | Optional | `<ui-upload-image>` |
| Organization Name | Text input | Optional | `<ui-input>` |
| About Organization | Textarea | Max 2000 chars | `<ui-textarea>` |

### Step 5: Confirmation

| Element | Type | Component |
|---------|------|-----------|
| Job Preview Card | Display | Custom component |
| Experience Level | Badge | `<ui-badge>` |
| Location | Badge | `<ui-badge>` |
| Timeline | Badge | `<ui-badge>` |
| Start Date | Badge | `<ui-badge>` |
| Budget | Badge | `<ui-badge>` |
| About the Job | Section | `<div>` |
| Required Skills | Chips | `<ui-chip>` |
| Meet the Client | Section | Custom component |
| Action Buttons | Buttons | `<ui-button>` |

---

## Folder Structure

```
projects/app/src/app/features/hub-dashboard/pages/jobs/
├── posts/                              # Existing
├── applications/                       # Existing
├── offers/                             # Existing
├── contracts/                          # Existing
└── create/                             # NEW
    ├── create-job.component.ts         # Main wizard controller
    ├── create-job.component.html       # Multi-step layout
    ├── create-job.component.scss       # Styles (if needed)
    ├── create-job.routes.ts            # Child routes
    ├── services/
    │   ├── create-job.service.ts       # Form state management
    │   ├── create-job-api.service.ts   # API calls
    │   └── index.ts
    ├── models/
    │   ├── create-job.model.ts         # TypeScript interfaces
    │   └── index.ts
    ├── steps/
    │   ├── overview/
    │   │   ├── overview.component.ts
    │   │   ├── overview.component.html
    │   │   └── index.ts
    │   ├── requirements/
    │   │   ├── requirements.component.ts
    │   │   ├── requirements.component.html
    │   │   └── index.ts
    │   ├── timeline-budget/
    │   │   ├── timeline-budget.component.ts
    │   │   ├── timeline-budget.component.html
    │   │   └── index.ts
    │   ├── your-detail/
    │   │   ├── your-detail.component.ts
    │   │   ├── your-detail.component.html
    │   │   └── index.ts
    │   ├── confirmation/
    │   │   ├── confirmation.component.ts
    │   │   ├── confirmation.component.html
    │   │   └── index.ts
    │   └── index.ts
    ├── components/                     # Shared step components
    │   ├── job-preview-card/
    │   │   ├── job-preview-card.component.ts
    │   │   ├── job-preview-card.component.html
    │   │   └── index.ts
    │   └── index.ts
    └── index.ts
```

---

## Assets to Copy

### Illustration Image (Left Panel)

The v1 UI shows an illustration on the left panel with a person climbing a question mark.

**Source (v1):** `/Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-web/src/assets/imgs/add-job-sidebar.png`
**Target (v2):** `projects/app/src/assets/images/jobs/add-job-sidebar.png`

```bash
# Copy command
cp /Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-web/src/assets/imgs/add-job-sidebar.png \
   /Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-frontend-workspace/projects/app/src/assets/images/jobs/
```

### Icons Needed

| Icon | Purpose | Source |
|------|---------|--------|
| Calendar | Timeline section | `@mereka/ui` or Heroicons |
| Location pin | Location section | `@mereka/ui` or Heroicons |
| Dollar/Currency | Budget section | `@mereka/ui` or Heroicons |
| Clock | Start date section | `@mereka/ui` or Heroicons |
| User | Expert level | `@mereka/ui` or Heroicons |

---

## Reusable Components from @mereka/ui

| Component | Import Path | Usage |
|-----------|-------------|-------|
| `UiInputComponent` | `@mereka/ui` | Text, email, number inputs |
| `UiTextareaComponent` | `@mereka/ui` | Description, about org |
| `UiSelectComponent` | `@mereka/ui` | Category, service type, currency, expert level |
| `UiRadioGroupComponent` | `@mereka/ui` | Employment type, location, pricing type |
| `UiRadioButtonComponent` | `@mereka/ui` | Individual radio options |
| `UiChipInputComponent` | `@mereka/ui` | Skills tags |
| `UiPhoneInputComponent` | `@mereka/ui` | Phone with country code |
| `UiUploadFileComponent` | `@mereka/ui` | Attachment upload |
| `UiUploadImageComponent` | `@mereka/ui` | Organization logo |
| `UiButtonComponent` | `@mereka/ui` | Back, Continue, Save buttons |
| `UiFormPageComponent` | `@mereka/ui` | Form container |
| `UiFormPageHeaderComponent` | `@mereka/ui` | Step header |
| `UiFormPageBodyComponent` | `@mereka/ui` | Form content |
| `UiFormPageFooterComponent` | `@mereka/ui` | Footer with buttons |
| `UiCharacterCountComponent` | `@mereka/ui` | Character count display |
| `UiBadgeComponent` | `@mereka/ui` | Preview badges |
| `UiChipComponent` | `@mereka/ui` | Skills display |

---

## Implementation Steps

### Phase 1: Setup (Files to Create)

1. **Create folder structure** as shown above
2. **Create models** (`create-job.model.ts`):
   ```typescript
   export interface CreateJobFormData {
     // Step 1: Overview
     jobTitle: string;
     employmentType: 'full-time' | 'freelance';
     serviceCategory: { category: string; serviceType: string };
     expertLevel: string;
     jobLocation: 'remote' | 'on-site';
     accessMode: 'public' | 'private';

     // Step 2: Requirements
     jobDescription: string;
     jobSummary: string;
     jobUploads: File[];
     jobSkills: string[];

     // Step 3: Timeline & Budget
     jobStartDate: 'asap' | 'flexible' | Date;
     jobDuration: '<1' | '1-6' | '>6' | 'ongoing';
     jobCurrency: string;
     jobBudget: {
       pricingType: 'fixed' | 'hourly';
       fromAmount: number;
       upToAmount?: number;
     };

     // Step 4: Your Detail
     name: string;
     email: string;
     phoneNumber?: string;
     organizationName?: string;
     organizationImage?: File;
     aboutOrganization?: string;
   }
   ```

3. **Create services**:
   - `create-job.service.ts` - Form state with Signals
   - `create-job-api.service.ts` - HTTP calls to backend

### Phase 2: Main Wizard Component

1. **Create `create-job.component.ts`** following `experience-onboarding` pattern:
   - Step navigation (5 steps)
   - Progress tracking
   - Form state management with Signals
   - Save draft functionality

2. **Create routes** (`create-job.routes.ts`):
   ```typescript
   export const CREATE_JOB_ROUTES: Routes = [
     {
       path: '',
       component: CreateJobComponent,
       children: [
         { path: '', redirectTo: 'overview', pathMatch: 'full' },
         { path: 'overview', component: OverviewComponent },
         { path: 'requirements', component: RequirementsComponent },
         { path: 'timeline-budget', component: TimelineBudgetComponent },
         { path: 'your-detail', component: YourDetailComponent },
         { path: 'confirmation', component: ConfirmationComponent },
       ],
     },
   ];
   ```

### Phase 3: Step Components

#### Step 1: Overview (`overview.component.ts`)
- Job title input with character count (0/70)
- Employment type radio group
- Category + Service Type cascading dropdowns
- Expert level dropdown
- Job location radio group
- Access mode radio group

#### Step 2: Requirements (`requirements.component.ts`)
- Rich text description with formatting toolbar
- Job summary textarea with "Write with AI" button
- File upload component
- Skills chip input (3-5 tags)

#### Step 3: Timeline & Budget (`timeline-budget.component.ts`)
- Start date selection (ASAP/Flexible/Specific with date picker)
- Duration radio group
- Currency dropdown
- Budget type radio (Fixed/Hourly)
- Budget range inputs (From / Up to)

#### Step 4: Your Detail (`your-detail.component.ts`)
- Name, Email, Phone inputs (3-column layout)
- Organization card with:
  - Logo upload
  - Organization name
  - About organization textarea

#### Step 5: Confirmation (`confirmation.component.ts`)
- Job preview card with all details
- Edit buttons to go back to specific steps
- "Post this job" button
- "Save and Exit" button

### Phase 4: Layout & Styling

1. **Two-column layout** (desktop):
   - Left: Dark panel with illustration and text
   - Right: Form content

2. **Mobile responsive**:
   - Stack vertically
   - Hide illustration on mobile

3. **Header navigation**:
   - Step tabs: Overview | Requirements | Timeline & Budget | Your Detail | Confirmation
   - Active step highlighted

4. **Footer**:
   - Back button (left)
   - Save and Exit (center)
   - Continue button (right, primary)

### Phase 5: API Integration

1. **Connect to backend endpoints**:
   - `POST /hub/jobs` - Create job
   - `PATCH /hub/jobs/:id` - Update job (draft)
   - `GET /hub/jobs/:id` - Load existing job for edit

2. **Reference data**:
   - `GET /reference-data/categories` - Categories list
   - `GET /reference-data/skills` - Skills list

---

## Files to Modify

| File | Change |
|------|--------|
| `projects/app/src/app/features/hub-dashboard/hub-dashboard.routes.ts` | Add route for `/jobs/create/**` |
| `projects/app/src/app/features/hub-dashboard/pages/jobs/posts/posts.component.html` | Add "Create Job" button |

---

## Reference Implementation

Use `experience-onboarding` as the primary reference:
- **Path:** `projects/app/src/app/features/onboarding/experience/`
- **Pattern:** Multi-step wizard with child routes
- **State:** Signals-based state management
- **Layout:** `ui-form-page` components

---

## Verification Steps

1. **Build check:** `npm run build` in workspace
2. **Lint check:** `npm run lint`
3. **Manual testing:**
   - Navigate to `/hub/jobs/create/overview`
   - Fill each step and click Continue
   - Verify form validation
   - Test Back navigation
   - Test Save and Exit
   - Submit and verify API call
4. **Responsive testing:**
   - Test on desktop (1920px)
   - Test on tablet (768px)
   - Test on mobile (375px)

---

## Estimated File Count

| Category | Files | Notes |
|----------|-------|-------|
| Main component | 3 | Component, template, routes |
| Services | 3 | State, API, index |
| Models | 2 | Interfaces, index |
| Step components | 10 | 5 steps × 2 files each |
| Shared components | 2 | Preview card |
| Assets | 1 | Illustration SVG |
| **Total** | **~21 files** | |

---

## Summary

This plan replicates the v1 Create Job UI in v2 frontend using:
- Existing `@mereka/ui` generic components (no new UI components needed)
- `experience-onboarding` as the reference pattern for multi-step wizard
- Signals for reactive state management
- Standalone Angular components
- Tailwind CSS for styling

The backend API already exists (`/hub/jobs` endpoints), so this is purely a frontend implementation.
