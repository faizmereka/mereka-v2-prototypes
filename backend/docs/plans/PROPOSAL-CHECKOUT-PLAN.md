# Proposal Submission Feature - V2 Implementation Plan

## Overview

Implement the Proposal Submission page in v2 checkout site (`mereka-frontend-workspace/projects/checkout`) allowing experts to submit proposals for jobs.

**Route**: `/proposal/:jobId` on checkout.mereka.io

**Key Insight**: The v2 backend already has complete proposal APIs in the hub module. We need:
1. A checkout-specific wrapper endpoint for initialization
2. Frontend checkout page following existing patterns

---

## V1 Feature Reference

| Section | Description |
|---------|-------------|
| **Job Detail** | Job title, category, budget, "View Job Post" link |
| **Proposal Details** | Cover letter textarea (max 2000 chars) |
| **File Upload** | Optional attachments (max 1 file, 100MB) |
| **Budget** | Currency, price type (hourly/fixed), amounts |
| **Milestones** | Optional for fixed pricing (task name, due date, amount) |
| **Expert Selection** | Dropdown to select expert (hub plan dependent) |

---

## Backend Implementation

### Existing APIs (No Changes Needed)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/hub/proposals` | POST | Create proposal |
| `GET /api/hub/proposals` | GET | List proposals |
| `GET /api/jobs/:id` | GET | Get job details |

### New Checkout Endpoints

**Location**: `src/modules/shared/checkout/`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/checkout/proposal/:jobId` | GET | Initialize proposal checkout |
| `POST /api/checkout/proposal` | POST | Submit proposal |

### 1. Schema (`src/core/schemas/checkout/proposal/checkoutProposal.schema.ts`)

```typescript
export interface CheckoutProposalInitResponse {
  job: {
    _id: string;
    jobTitle: string;
    jobDescription: string;
    jobSummary?: string;
    employmentType: string;
    serviceCategory: { category: string; serviceType: string };
    expertLevel?: string;
    jobLocation?: string;
    jobBudget: { pricingType: 'fixed' | 'hourly'; fromAmount: number; upToAmount?: number };
    jobCurrency: string;
    jobSkills: string[];
    client: { name: string; organizationName?: string; organizationImage?: string };
  };
  expert: { _id: string; name: string; email: string; profileUrl?: string };
  hasExistingProposal: boolean;
}

export interface SubmitProposalInput {
  jobId: string;
  proposalDetails: string; // max 2000 chars
  priceType: 'fixed' | 'hourly';
  proposedPrice?: number; // for fixed
  hourlyProposedPrice?: number; // for hourly
  workingHours?: number; // for hourly
  selectedCurrency: string;
  files?: string[];
  milestones?: Array<{
    taskName: string; // max 150 chars
    taskDescription?: string; // max 200 chars
    amount: number;
    dueDate: string; // ISO date
  }>;
}

export const checkoutProposalInitSchema = {
  params: {
    type: 'object',
    required: ['jobId'],
    properties: {
      jobId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
    }
  }
} as const;

export const submitProposalSchema = {
  body: {
    type: 'object',
    required: ['jobId', 'proposalDetails', 'priceType', 'selectedCurrency'],
    properties: {
      jobId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
      proposalDetails: { type: 'string', minLength: 10, maxLength: 2000 },
      priceType: { type: 'string', enum: ['fixed', 'hourly'] },
      proposedPrice: { type: 'number', minimum: 0 },
      hourlyProposedPrice: { type: 'number', minimum: 0 },
      workingHours: { type: 'number', minimum: 1 },
      selectedCurrency: { type: 'string', minLength: 3, maxLength: 3 },
      files: { type: 'array', items: { type: 'string' }, default: [] },
      milestones: {
        type: 'array',
        items: {
          type: 'object',
          required: ['taskName', 'amount', 'dueDate'],
          properties: {
            taskName: { type: 'string', maxLength: 150 },
            taskDescription: { type: 'string', maxLength: 200 },
            amount: { type: 'number', minimum: 0 },
            dueDate: { type: 'string', format: 'date-time' }
          }
        },
        default: []
      }
    }
  }
} as const;
```

### 2. Service (`src/core/services/checkout/proposal/checkoutProposal.service.ts`)

```typescript
export class CheckoutProposalService {
  /**
   * Initialize proposal checkout - get job details and check for existing proposal
   */
  async initProposalCheckout(jobId: string, userId: string): Promise<CheckoutProposalInitResponse>;

  /**
   * Submit proposal - delegates to hubProposalService.createProposal
   */
  async submitProposal(data: SubmitProposalInput, userId: string): Promise<{ proposalId: string }>;
}
```

### 3. Controller (`src/modules/shared/checkout/controllers/proposal/checkoutProposal.controller.ts`)

```typescript
// GET /checkout/proposal/:jobId - Requires auth
export async function initProposalCheckout(request, reply) {
  const { jobId } = request.params;
  const userId = request.user.sub;
  const result = await checkoutProposalService.initProposalCheckout(jobId, userId);
  return reply.send({ success: true, data: result });
}

// POST /checkout/proposal - Requires auth
export async function submitProposal(request, reply) {
  const userId = request.user.sub;
  const result = await checkoutProposalService.submitProposal(request.body, userId);
  return reply.status(201).send({ success: true, data: result });
}
```

### 4. Routes (`src/modules/shared/checkout/routes/proposal/checkoutProposal.routes.ts`)

```typescript
export async function checkoutProposalRoutes(fastify: FastifyInstance) {
  // Initialize proposal checkout (requires auth)
  fastify.get('/:jobId', {
    schema: { ...checkoutProposalInitSchema, tags: ['Checkout - Proposal'] },
    preHandler: [fastify.authenticate]
  }, initProposalCheckout);

  // Submit proposal (requires auth)
  fastify.post('/', {
    schema: { ...submitProposalSchema, tags: ['Checkout - Proposal'] },
    preHandler: [fastify.authenticate]
  }, submitProposal);
}
```

### Backend File Structure

```
src/core/schemas/checkout/proposal/
├── checkoutProposal.schema.ts
└── index.ts

src/core/services/checkout/proposal/
├── checkoutProposal.service.ts
└── index.ts

src/modules/shared/checkout/controllers/proposal/
├── checkoutProposal.controller.ts
└── index.ts

src/modules/shared/checkout/routes/proposal/
├── checkoutProposal.routes.ts
└── index.ts
```

### Files to Modify

- `src/core/schemas/checkout/index.ts` - Export proposal schemas
- `src/core/services/checkout/index.ts` - Export proposal service
- `src/modules/shared/checkout/index.ts` - Register proposal routes

---

## Frontend Implementation

### Route Configuration

**File**: `projects/checkout/src/app/app.routes.ts`

```typescript
{
  path: 'proposal/:jobId',
  loadComponent: () =>
    import('./features/proposal/pages/proposal-checkout.page').then(m => m.ProposalCheckoutPage),
},
{
  path: 'proposal/success/:proposalId',
  loadComponent: () =>
    import('./features/proposal/pages/proposal-success.page').then(m => m.ProposalSuccessPage),
},
```

### Frontend File Structure

```
projects/checkout/src/app/features/proposal/
├── index.ts
├── models/
│   ├── proposal.model.ts
│   └── index.ts
├── pages/
│   ├── proposal-checkout.page.ts
│   ├── proposal-checkout.page.html
│   ├── proposal-success.page.ts
│   └── proposal-success.page.html
└── components/
    ├── job-summary/
    │   ├── job-summary.component.ts
    │   └── job-summary.component.html
    ├── proposal-details-form/
    │   ├── proposal-details-form.component.ts
    │   └── proposal-details-form.component.html
    ├── budget-form/
    │   ├── budget-form.component.ts
    │   └── budget-form.component.html
    └── milestone-form/
        ├── milestone-form.component.ts
        └── milestone-form.component.html
```

### Multi-Step Flow (3 Steps)

**Step 1: Review Job**
- Display job details (title, description, budget range, skills)
- Show client info (name, organization)
- Expert profile preview
- Check for existing proposal (show error if duplicate)
- Button: "Continue to Proposal"

**Step 2: Create Proposal**
- Proposal Details section:
  - Cover letter textarea (max 2000 chars with counter)
  - File upload (optional)
- Budget section:
  - Price type toggle (hourly/fixed)
  - For hourly: hourly rate + estimated hours + calculated total
  - For fixed: proposed price
  - Currency display
- Milestones section (only for fixed pricing):
  - Toggle to enable milestones
  - Add/remove milestone rows
  - Validation: total <= proposed price
- Button: "Review & Submit"

**Step 3: Review & Submit**
- Summary card with all entered data
- Job details recap
- Proposal details recap
- Budget breakdown
- Milestones (if any)
- Submit button
- Redirect to success page

### API Service Updates

**File**: `projects/checkout/src/app/core/services/checkout-api.service.ts`

```typescript
// Add proposal types
export interface ProposalCheckoutData {
  job: JobSummary;
  expert: ExpertInfo;
  hasExistingProposal: boolean;
}

export interface SubmitProposalRequest {
  jobId: string;
  proposalDetails: string;
  priceType: 'fixed' | 'hourly';
  proposedPrice?: number;
  hourlyProposedPrice?: number;
  workingHours?: number;
  selectedCurrency: string;
  files?: string[];
  milestones?: MilestoneInput[];
}

// Add proposal methods
async getProposalCheckout(jobId: string): Promise<ProposalCheckoutData> {
  const response = await firstValueFrom(
    this.http.get<ApiResponse<ProposalCheckoutData>>(
      `${this.apiUrl}/checkout/proposal/${jobId}`,
      { withCredentials: true }
    )
  );
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to load job');
  }
  return response.data;
}

async submitProposal(data: SubmitProposalRequest): Promise<{ proposalId: string }> {
  const response = await firstValueFrom(
    this.http.post<ApiResponse<{ proposalId: string }>>(
      `${this.apiUrl}/checkout/proposal`,
      data,
      { withCredentials: true }
    )
  );
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to submit proposal');
  }
  return response.data;
}
```

### Component Patterns (Following Existing Checkout Style)

**Standalone Components with Signals**:
```typescript
@Component({
  selector: 'app-proposal-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, ...],
  templateUrl: './proposal-checkout.page.html',
})
export class ProposalCheckoutPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly checkoutApi = inject(CheckoutApiService);
  private readonly authService = inject(AuthService);

  // Signals
  readonly step = signal(1);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly checkoutData = signal<ProposalCheckoutData | null>(null);

  // Form data
  readonly proposalDetails = signal('');
  readonly priceType = signal<'fixed' | 'hourly'>('fixed');
  readonly proposedPrice = signal<number | null>(null);
  readonly hourlyRate = signal<number | null>(null);
  readonly workingHours = signal<number | null>(null);
  readonly milestones = signal<MilestoneInput[]>([]);
  readonly enableMilestones = signal(false);

  // Computed
  readonly canContinueStep1 = computed(() => !!this.checkoutData() && !this.checkoutData()?.hasExistingProposal);
  readonly canContinueStep2 = computed(() => this.validateProposalForm());
  readonly totalPrice = computed(() => this.calculateTotalPrice());
}
```

---

## Authentication Handling

**Important**: Proposals require authentication (no guest checkout).

```typescript
async ngOnInit(): Promise<void> {
  await this.authService.init();

  if (!this.authService.isLoggedIn()) {
    const returnUrl = window.location.href;
    this.authService.redirectToLogin(returnUrl);
    return;
  }

  await this.loadCheckoutData();
}
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| proposalDetails | Required, 10-2000 chars |
| priceType | Required, enum: 'fixed' \| 'hourly' |
| proposedPrice | Required if fixed, min 0 |
| hourlyProposedPrice | Required if hourly, min 0 |
| workingHours | Required if hourly, min 1 |
| selectedCurrency | Required, 3 chars |
| milestones.taskName | Required, max 150 chars |
| milestones.amount | Required, min 0 |
| milestones.dueDate | Required, must be future date |
| milestones total | Must not exceed proposedPrice |
| duplicate check | One proposal per expert per job |

---

## Critical Files to Modify

### Backend
| File | Change |
|------|--------|
| `src/modules/shared/checkout/index.ts` | Register proposal routes |
| `src/core/schemas/checkout/index.ts` | Export proposal schemas |
| `src/core/services/checkout/index.ts` | Export proposal service |

### Frontend
| File | Change |
|------|--------|
| `projects/checkout/src/app/app.routes.ts` | Add proposal routes |
| `projects/checkout/src/app/core/services/checkout-api.service.ts` | Add proposal API methods |

---

## Verification Steps

1. **Backend**:
   ```bash
   cd mereka-backend-v2-elevate-ref
   npm run build && npm run check
   ```

2. **Frontend**:
   ```bash
   cd mereka-frontend-workspace
   npm run build:checkout && npm run lint
   ```

3. **Manual Testing**:
   - Navigate to `http://localhost:4201/proposal/[job-id]`
   - Verify auth redirect if not logged in
   - Test step navigation
   - Test form validation
   - Test milestone calculations
   - Test duplicate proposal prevention
   - Test successful submission and redirect

4. **API Testing**:
   ```bash
   # Get proposal checkout (requires auth header)
   curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/checkout/proposal/[job-id]

   # Submit proposal
   curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"jobId":"...","proposalDetails":"...","priceType":"fixed","proposedPrice":1000,"selectedCurrency":"MYR"}' \
     http://localhost:3000/api/checkout/proposal
   ```

---

## File Count Summary

| Category | Files | Notes |
|----------|-------|-------|
| Backend schema | 2 | Schema + index |
| Backend service | 2 | Service + index |
| Backend controller | 2 | Controller + index |
| Backend routes | 2 | Routes + index |
| Frontend model | 2 | Model + index |
| Frontend pages | 4 | Checkout + Success (ts + html) |
| Frontend components | 8 | 4 components (ts + html each) |
| **Total** | **~22 files** | |

---

## Summary

This implementation creates the Proposal Submission feature in v2:
- **Backend**: New checkout endpoints that wrap existing hub proposal service
- **Frontend**: Standalone Angular components following checkout patterns
- **Auth**: Required authentication (redirect to login if not logged in)
- **Flow**: 3-step multi-step form (Review Job → Create Proposal → Review & Submit)
- **Validation**: Comprehensive validation for all fields and business rules
- **Reuse**: Leverages existing hub proposal service for core logic
