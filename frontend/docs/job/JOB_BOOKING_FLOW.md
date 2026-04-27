# Job Booking Flow Summary

## Overview
The job booking flow allows experts (or hub owners) to submit proposals for job opportunities posted by clients. The flow spans multiple applications in the Mereka platform ecosystem.

## Flow Architecture

### Applications Involved
1. **Web App** (`mereka.io` / `localhost:4200`) - Public job listing and detail pages
2. **Checkout App** (`checkout.mereka.io` / `localhost:4203`) - Proposal submission form
3. **App** (`app.mereka.io` / `localhost:4202`) - Expert dashboard and proposal management
4. **Auth App** (`auth.mereka.io` / `localhost:4201`) - Authentication

---

## Complete Flow Breakdown

### 1. **Job Discovery** (Web App)
**Location:** `projects/web/src/app/features/jobs/`

#### 1.1 Job Listing Page (`/jobs`)
- **Component:** `JobListPage`
- **Features:**
  - Hero section with "Job Opportunities" heading
  - Search functionality
  - Filters: Employment Type, Expert Level, Location
  - Job cards grid display
  - Pagination
  - Results count

#### 1.2 Job Detail Page (`/jobs/:id`)
- **Component:** `JobDetailPage`
- **Features:**
  - Job title and posted date
  - Info section (employment type, location, budget, etc.)
  - "About the Job" section with description
  - Required Skills section
  - "Meet the Client" section
  - Similar Jobs section
  - **Job Booking Widget** (sidebar on desktop, fixed bottom on mobile)

---

### 2. **Job Booking Widget** (Web App)
**Location:** `projects/web/src/app/features/jobs/components/job-booking-widget/`

#### 2.1 Component Structure
- **Component:** `JobBookingWidgetComponent`
- **Template:** `job-booking-widget.component.html`

#### 2.2 Display Logic

**For Logged-In Users:**
- Shows **"Send Proposal"** button
- Shows **"Refer to network"** button
- Displays category and service type

**For Non-Logged-In Users:**
- Shows **"Sign up to apply"** button
- Shows **"Refer to network"** button
- Displays "Not an Expert yet? Join us" link

#### 2.3 Actions

**`sendProposal()` Method:**
```typescript
// Redirects to checkout app
window.location.href = `${environment.appUrls.checkout}/proposal/${job._id}`
// Example: http://localhost:4203/proposal/6978de9c90ae205b8091bcf5
```

**`signUp()` Method:**
```typescript
// Redirects to expert welcome/onboarding
window.location.href = `${environment.appUrls.app}/welcome/expert`
// Example: http://localhost:4202/welcome/expert
```

**`share()` Method:**
- Uses native Web Share API (if available)
- Shares job title, summary, and URL

---

### 3. **Proposal Checkout Flow** (Checkout App)
**Location:** `projects/checkout/src/app/features/proposal/`

#### 3.1 Entry Point
- **URL Pattern:** `/proposal/:jobId`
- **Component:** `ProposalCheckoutPage`
- **Route:** Defined in checkout app routes

#### 3.2 Authentication Check
- **Requirement:** User MUST be logged in
- **Behavior:** If not logged in, redirects to login with return URL
- **Auth Service:** Uses `AuthService` to check login status

#### 3.3 Step 1: Review Job
**Purpose:** Display job details and check for existing proposals

**Data Loaded:**
- Job information (title, description, budget, client)
- Expert information (current user)
- Hub experts list (if user is hub owner)
- Existing proposal check

**Display:**
- Job title and badges (category, employment type, expert level)
- Client information
- Budget details
- Job description
- Required skills

**Validation:**
- Checks if user already has a proposal for this job
- If existing proposal found, shows message (cannot continue)

**Action:**
- "Continue" button → Proceeds to Step 2

---

#### 3.4 Step 2: Create Proposal
**Purpose:** Collect proposal details, pricing, and optional milestones

**Form Fields:**

1. **Expert Selection** (if hub owner with multiple experts)
   - Dropdown to select expert from hub
   - Only shown if `hubExperts.length > 1`
   - Default: First expert or current user

2. **Proposal Details** (Required)
   - Textarea for proposal description
   - Min: 10 characters
   - Max: 2000 characters
   - Character counter displayed

3. **Price Type** (Required)
   - Radio buttons: "Fixed Price" or "Hourly Rate"
   - Default: Based on job budget `pricingType`

4. **Pricing** (Required)
   - **Fixed Price:**
     - Single amount input
     - Must be > 0
   - **Hourly Rate:**
     - Hourly rate input
     - Working hours input
     - Both must be > 0
     - Total calculated: `hourlyRate × workingHours`

5. **Milestones** (Optional)
   - Toggle to enable milestones
   - If enabled, can add multiple milestones:
     - Task name (required)
     - Task description (optional)
     - Amount (required, > 0)
     - Due date (required, ISO format)
   - Validation: Total milestone amounts ≤ proposed price (for fixed)

**Validation Rules:**
- Proposal details: 10-2000 characters
- Budget: Must have valid price based on type
- Milestones: All fields required if enabled, total ≤ proposed price

**Actions:**
- "Continue" button → Proceeds to Step 3 (Review)
- "Back" button → Returns to Step 1

---

#### 3.5 Step 3: Review & Submit
**Purpose:** Review all proposal details before submission

**Display:**
- Job summary
- Proposal details
- Pricing breakdown
- Milestones (if any)
- Expert assignment (if hub)

**Actions:**
- "Submit Proposal" button → Submits proposal
- "Back" button → Returns to Step 2

**Submission Process:**
1. Validates all form data
2. Calls API: `checkoutApi.submitProposal()`
3. Payload includes:
   - `jobId`
   - `asssignedExpertId` (optional, for hub experts)
   - `proposalDetails`
   - `priceType` ('fixed' | 'hourly')
   - `proposedPrice` (if fixed)
   - `hourlyProposedPrice` (if hourly)
   - `workingHours` (if hourly)
   - `selectedCurrency`
   - `files` (optional, array of file IDs)
   - `milestones` (optional, array of milestone objects)

4. On success → Redirects to success page
5. On error → Displays error message

---

### 4. **Proposal Success Page** (Checkout App)
**Location:** `projects/checkout/src/app/features/proposal/pages/proposal-success.page.ts`

#### 4.1 Entry Point
- **URL Pattern:** `/proposal/success/:proposalId`
- **Component:** `ProposalSuccessPage`

#### 4.2 Display
- Success confirmation message
- Proposal details summary
- Job information
- Total price calculation
- Links to:
  - View proposals: `/hub/jobs/applications?tab=proposed`
  - Browse more jobs: `/jobs`

---

## Data Models

### ProposalCheckoutData
```typescript
{
  job: JobSummary;
  expert: ExpertInfo;
  hubExperts: HubExpert[]; // For hub owners
  hubPlan?: string; // Subscription plan
  hasExistingProposal: boolean;
  existingProposalId?: string;
}
```

### ProposalFormData
```typescript
{
  asssignedExpertId: string | null;
  proposalDetails: string;
  priceType: 'fixed' | 'hourly';
  proposedPrice: number | null;
  hourlyProposedPrice: number | null;
  workingHours: number | null;
  files: string[];
  enableMilestones: boolean;
  milestones: MilestoneInput[];
}
```

### MilestoneInput
```typescript
{
  taskName: string;
  taskDescription?: string;
  amount: number;
  dueDate: string; // ISO date
}
```

---

## User Flows

### Flow 1: Logged-In Expert (Individual)
1. Browse jobs on `/jobs`
2. Click job card → Navigate to `/jobs/:id`
3. Review job details
4. Click "Send Proposal" button
5. Redirected to `/proposal/:jobId` (checkout app)
6. Step 1: Review job → Click "Continue"
7. Step 2: Fill proposal form → Click "Continue"
8. Step 3: Review → Click "Submit Proposal"
9. Redirected to `/proposal/success/:proposalId`

### Flow 2: Non-Logged-In User
1. Browse jobs on `/jobs`
2. Click job card → Navigate to `/jobs/:id`
3. Review job details
4. Click "Sign up to apply" button
5. Redirected to `/welcome/expert` (app app)
6. Complete signup/onboarding
7. After onboarding, can return to job and apply

### Flow 3: Hub Owner (Multiple Experts)
1. Same as Flow 1, but:
   - Step 2 includes expert selection dropdown
   - Can assign proposal to any expert in their hub
   - Hub plan determines if multiple experts available

### Flow 4: User with Existing Proposal
1. Navigate to job detail page
2. Click "Send Proposal"
3. Redirected to checkout
4. Step 1 shows: "You already have a proposal for this job"
5. Cannot proceed (no continue button)

---

## Key Features

### 1. Authentication Required
- Proposal submission requires login
- Non-logged-in users redirected to signup

### 2. Hub Support
- Hub owners can assign proposals to experts in their hub
- Expert selection dropdown shown if multiple experts available
- Hub subscription plan determines capabilities

### 3. Flexible Pricing
- Supports both fixed price and hourly rate
- Default pricing type matches job budget type
- Total price calculated automatically

### 4. Milestones (Optional)
- Can break down fixed-price proposals into milestones
- Each milestone has task name, description, amount, due date
- Total milestone amounts must not exceed proposed price

### 5. Duplicate Prevention
- Checks for existing proposals before allowing submission
- Prevents multiple proposals from same user for same job

### 6. Multi-Step Form
- Step progress indicator
- Can navigate back to previous steps
- Validation at each step
- Clear error messages

---

## API Endpoints (Inferred)

### Get Proposal Checkout Data
```
GET /api/v1/checkout/proposal/:jobId
Response: ProposalCheckoutData
```

### Submit Proposal
```
POST /api/v1/checkout/proposal
Body: SubmitProposalRequest
Response: SubmitProposalResponse { proposalId, status }
```

### Get Proposal Success Data
```
GET /api/v1/checkout/proposal/:proposalId/success
Response: ProposalSuccessData
```

---

## Environment URLs

### Development
- Web: `http://localhost:4200`
- Checkout: `http://localhost:4203`
- App: `http://localhost:4202`
- Auth: `http://localhost:4201`

### Production
- Web: `https://mereka.io`
- Checkout: `https://checkout.mereka.io`
- App: `https://app.mereka.io`
- Auth: `https://auth.mereka.io`

---

## Error Handling

### Checkout Page Errors
- Invalid job ID → Shows error message
- Not logged in → Redirects to login
- Failed to load data → Shows error with "Go Back" button
- Submission failure → Shows error message, allows retry

### Validation Errors
- Displayed inline on form fields
- Prevents progression to next step
- Clear error messages for each field

---

## Mobile vs Desktop

### Desktop
- Booking widget in sidebar (sticky)
- Full-width checkout form
- Step progress at top

### Mobile
- Booking widget fixed at bottom
- Full-screen checkout form
- Step progress at top
- Optimized touch targets

---

## Summary

The job booking flow is a **multi-application, multi-step process** that:

1. **Starts** on the public web app (`mereka.io`) where users browse jobs
2. **Redirects** to checkout app (`checkout.mereka.io`) for proposal submission
3. **Requires** authentication (redirects to signup if not logged in)
4. **Collects** proposal details through a 3-step form:
   - Step 1: Review job
   - Step 2: Create proposal (details, pricing, milestones)
   - Step 3: Review & submit
5. **Ends** on success page with confirmation and links to manage proposals

The flow supports both individual experts and hub owners (who can assign proposals to experts in their hub), with flexible pricing options and optional milestone breakdowns.
