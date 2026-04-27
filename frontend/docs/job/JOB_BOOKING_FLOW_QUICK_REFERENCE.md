# Job Booking Flow - Quick Reference

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEB APP (mereka.io)                          │
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │  Job Listing │ ──────> │ Job Detail   │                    │
│  │   (/jobs)    │         │ (/jobs/:id)   │                    │
│  └──────────────┘         └──────┬───────┘                    │
│                                    │                            │
│                                    │ [Job Booking Widget]       │
│                                    │                            │
│                                    ├─ Logged In?               │
│                                    │                            │
│                    ┌───────────────┴───────────────┐          │
│                    │                               │          │
│              ┌─────▼─────┐                  ┌──────▼──────┐   │
│              │ Send      │                  │ Sign up to  │   │
│              │ Proposal  │                  │ apply       │   │
│              └─────┬──────┘                  └──────┬─────┘   │
│                    │                                │         │
└────────────────────┼────────────────────────────────┼─────────┘
                     │                                │
                     │                                │
        ┌────────────▼────────────┐    ┌─────────────▼──────────┐
        │                         │    │                         │
        │  CHECKOUT APP           │    │  APP APP                │
        │  (checkout.mereka.io)   │    │  (app.mereka.io)        │
        │                         │    │                         │
        │  /proposal/:jobId       │    │  /welcome/expert        │
        │                         │    │                         │
        │  ┌──────────────────┐  │    │  [Signup/Onboarding]    │
        │  │ Step 1: Review   │  │    │                         │
        │  │ Job               │  │    │  After signup ──────┐   │
        │  └────────┬─────────┘  │    │                    │   │
        │           │             │    └────────────────────┼───┘
        │           │ Continue    │                         │
        │           ▼             │                         │
        │  ┌──────────────────┐  │                         │
        │  │ Step 2: Create   │  │                         │
        │  │ Proposal         │  │                         │
        │  │                  │  │                         │
        │  │ - Details        │  │                         │
        │  │ - Pricing       │  │                         │
        │  │ - Milestones    │  │                         │
        │  └────────┬─────────┘  │                         │
        │           │             │                         │
        │           │ Continue    │                         │
        │           ▼             │                         │
        │  ┌──────────────────┐  │                         │
        │  │ Step 3: Review   │  │                         │
        │  │ & Submit         │  │                         │
        │  └────────┬─────────┘  │                         │
        │           │             │                         │
        │           │ Submit      │                         │
        │           ▼             │                         │
        │  ┌──────────────────┐  │                         │
        │  │ Success Page     │  │                         │
        │  │ /proposal/       │  │                         │
        │  │ success/:id      │  │                         │
        │  └──────────────────┘  │                         │
        │                         │                         │
        └─────────────────────────┘                         │
                                                             │
                                                             │
        ┌───────────────────────────────────────────────────┘
        │
        │ [Return to job and apply]
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│              APP APP (app.mereka.io)                      │
│                                                            │
│  /hub/jobs/applications?tab=proposed                     │
│  [View submitted proposals]                              │
└───────────────────────────────────────────────────────────┘
```

## Step-by-Step Flow

### For Logged-In Expert

1. **Browse Jobs** → `/jobs` (Web App)
2. **View Job** → `/jobs/:id` (Web App)
3. **Click "Send Proposal"** → Redirects to checkout app
4. **Step 1: Review Job** → `/proposal/:jobId` (Checkout App)
   - Shows job details
   - Checks for existing proposal
   - Click "Continue"
5. **Step 2: Create Proposal** → (Checkout App)
   - Fill proposal details (10-2000 chars)
   - Select price type (Fixed/Hourly)
   - Enter pricing
   - Optionally add milestones
   - Click "Continue"
6. **Step 3: Review & Submit** → (Checkout App)
   - Review all details
   - Click "Submit Proposal"
7. **Success Page** → `/proposal/success/:proposalId` (Checkout App)
   - Confirmation message
   - Links to view proposals or browse more jobs

### For Non-Logged-In User

1. **Browse Jobs** → `/jobs` (Web App)
2. **View Job** → `/jobs/:id` (Web App)
3. **Click "Sign up to apply"** → Redirects to app app
4. **Signup/Onboarding** → `/welcome/expert` (App App)
5. **After signup** → Can return to job and apply (follows logged-in flow)

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `JobListPage` | `web/features/jobs/pages/job-list/` | Display job listing with filters |
| `JobDetailPage` | `web/features/jobs/pages/job-detail/` | Display job details |
| `JobBookingWidgetComponent` | `web/features/jobs/components/job-booking-widget/` | Booking widget with CTA buttons |
| `ProposalCheckoutPage` | `checkout/features/proposal/pages/proposal-checkout/` | 3-step proposal form |
| `ProposalSuccessPage` | `checkout/features/proposal/pages/proposal-success/` | Success confirmation |

## Form Fields Summary

### Step 2: Create Proposal

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Expert Selection | Dropdown | No* | Only if hub has multiple experts |
| Proposal Details | Textarea | Yes | 10-2000 characters |
| Price Type | Radio | Yes | 'fixed' or 'hourly' |
| Proposed Price | Number | Yes** | > 0 (if fixed) |
| Hourly Rate | Number | Yes** | > 0 (if hourly) |
| Working Hours | Number | Yes** | > 0 (if hourly) |
| Milestones | Toggle + Array | No | If enabled, all fields required |

*Required only for hub owners with multiple experts  
**Required based on selected price type

## API Calls

1. **Get Checkout Data**
   - `GET /api/v1/checkout/proposal/:jobId`
   - Returns: Job, Expert, HubExperts, ExistingProposal check

2. **Submit Proposal**
   - `POST /api/v1/checkout/proposal`
   - Body: ProposalFormData
   - Returns: `{ proposalId, status }`

3. **Get Success Data**
   - `GET /api/v1/checkout/proposal/:proposalId/success`
   - Returns: Proposal and Job details

## Validation Rules

### Proposal Details
- Minimum: 10 characters
- Maximum: 2000 characters
- Character counter displayed

### Pricing
- **Fixed Price:** Must be > 0
- **Hourly Rate:** Rate > 0 AND Hours > 0
- Total calculated automatically for hourly

### Milestones (if enabled)
- All milestones must have:
  - Task name (required)
  - Amount > 0 (required)
  - Due date (required)
- Total milestone amounts ≤ Proposed price (for fixed price)

## Special Cases

### Hub Owners
- Can assign proposals to experts in their hub
- Expert selection dropdown shown if `hubExperts.length > 1`
- Hub subscription plan determines capabilities

### Existing Proposals
- System checks if user already has proposal for job
- If exists, shows message and prevents new submission
- `hasExistingProposal: true` blocks Step 1 continuation

### Authentication
- Proposal submission requires login
- Non-logged-in users redirected to signup
- Return URL preserved for post-signup redirect

## URLs Reference

### Web App
- Job Listing: `/jobs`
- Job Detail: `/jobs/:id`

### Checkout App
- Proposal Checkout: `/proposal/:jobId`
- Proposal Success: `/proposal/success/:proposalId`

### App App
- Expert Welcome: `/welcome/expert`
- View Proposals: `/hub/jobs/applications?tab=proposed`

## Environment Variables

```typescript
environment.appUrls = {
  web: 'http://localhost:4200',      // or https://mereka.io
  checkout: 'http://localhost:4203',  // or https://checkout.mereka.io
  app: 'http://localhost:4202',       // or https://app.mereka.io
  auth: 'http://localhost:4201',      // or https://auth.mereka.io
}
```
