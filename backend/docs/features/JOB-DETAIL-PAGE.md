# Job Detail Page - V2 Implementation Plan

## Overview

Implement the public Job Detail page in v2 (`mereka-frontend-workspace/projects/web`) matching the v1 UI exactly at `https://mereka.io/job/:id`.

**Route**: `/job/:id` on mereka.io (v2 web project)

---

## V1 UI Reference (Screenshots Captured)

| Section | Description |
|---------|-------------|
| **Title** | Job title + "Posted X ago" |
| **Info Grid** | Experience Level, Location, Timeline, Starts, Budget (with icons) |
| **Sidebar Widget** | Category + Service Type icons, CTA buttons |
| **About the Job** | Rich text description |
| **Required Skills** | Skill chips |
| **Meet the Client** | Client info (blurred for non-experts) |
| **Similar Jobs** | Grid of related job cards |

---

## Implementation Scope

### Backend (mereka-backend-v2-elevate-ref)

**New files to create**:
```
src/core/services/web/jobs/
├── webJob.service.ts
└── index.ts

src/core/schemas/web/jobs/
├── webJob.schema.ts
└── index.ts

src/modules/web/controllers/jobs/
├── webJob.controller.ts
└── index.ts

src/modules/web/routes/jobs/
├── webJob.routes.ts
└── index.ts
```

**Files to modify**:
- `src/modules/web/routes/index.ts` - Add jobs routes
- `src/core/schemas/web/index.ts` - Export job schemas

### Frontend (mereka-frontend-workspace/projects/web)

**New files to create**:
```
src/app/features/jobs/
├── index.ts
├── jobs.routes.ts
├── models/
│   ├── job.model.ts
│   └── index.ts
├── services/
│   ├── job.service.ts
│   └── index.ts
└── pages/
    └── job-detail/
        └── job-detail.page.ts
```

**Files to modify**:
- `src/app/app.routes.ts` - Add job routes

---

## Backend Implementation

### 1. Job Schema (`src/core/schemas/web/jobs/webJob.schema.ts`)

```typescript
// Response interfaces
export interface WebJobDetailResponse {
  _id: string;
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType: string;
  status: string;
  serviceCategory: {
    category: string;
    serviceType: string;
  };
  expertLevel?: string;
  jobLocation?: string;
  preferredLocation?: string[];
  jobBudget: {
    pricingType: string;
    fromAmount: number;
    upToAmount?: number;
  };
  jobCurrency: string;
  jobStartDate?: string;
  jobEndDate?: string;
  jobSkills: string[];
  jobUploads?: string[];

  // Client info (hidden for guests)
  client?: {
    name: string;
    email: string;
    organizationName?: string;
    organizationImage?: string;
    aboutOrganization?: string;
    profileUrl?: string;
  };

  // Hub info
  hub?: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  };

  createdDate?: Date;
  createdAt: Date;
}

export interface WebJobListItem {
  _id: string;
  jobTitle: string;
  jobSummary?: string;
  employmentType: string;
  expertLevel?: string;
  jobLocation?: string;
  jobBudget: { fromAmount: number; upToAmount?: number; pricingType: string };
  jobCurrency: string;
  jobStartDate?: string;
  jobEndDate?: string;
  organizationName?: string;
  createdDate?: Date;
}

// Schema definitions for Fastify routes
export const getJobByIdSchema = {
  tags: ['Web Jobs'],
  summary: 'Get job detail by ID',
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } }
  },
  response: { 200: { /* ... */ } }
};

export const listJobsSchema = { /* ... */ };
export const getSimilarJobsSchema = { /* ... */ };
```

### 2. Job Service (`src/core/services/web/jobs/webJob.service.ts`)

```typescript
export class WebJobService {
  /**
   * Get job by ID - Returns full detail for public ACTIVE jobs
   * Client info is only included if user is authenticated (expert)
   */
  async getJobById(options: { id: string; userId?: string; userType?: string }): Promise<WebJobDetailResponse | null>;

  /**
   * List public jobs with filtering
   */
  async listJobs(options: WebJobListOptions): Promise<WebJobListResult>;

  /**
   * Get similar jobs by category/skills
   */
  async getSimilarJobs(jobId: string, limit?: number): Promise<WebJobListItem[]>;
}
```

**Key logic**:
- Only return ACTIVE jobs (not DRAFT, EXPIRED, etc.)
- Only return PUBLIC jobs (not PRIVATE access mode)
- Client info (name, email, org) shown only to authenticated expert users
- For guests/basic users: client section is hidden (handled in frontend)

### 3. Job Controller (`src/modules/web/controllers/jobs/webJob.controller.ts`)

```typescript
// GET /jobs/:id
export async function getJobById(request, reply) {
  const { id } = request.params;
  const user = request.user; // optional auth
  const job = await webJobService.getJobById({ id, userId: user?.sub, userType: user?.type });
  // ...
}

// GET /jobs
export async function listJobs(request, reply) { /* ... */ }

// GET /jobs/:id/similar
export async function getSimilarJobs(request, reply) { /* ... */ }
```

### 4. Job Routes (`src/modules/web/routes/jobs/webJob.routes.ts`)

```typescript
export async function webJobRoutes(fastify: FastifyInstance) {
  // GET /jobs - List public jobs
  fastify.get('/', { schema: listJobsSchema }, listJobs);

  // GET /jobs/:id - Get job detail (with optional auth for client info)
  fastify.get('/:id', { schema: getJobByIdSchema, preHandler: optionalAuth }, getJobById);

  // GET /jobs/:id/similar - Get similar jobs
  fastify.get('/:id/similar', { schema: getSimilarJobsSchema }, getSimilarJobs);
}
```

---

## Frontend Implementation

### 1. Job Model (`features/jobs/models/job.model.ts`)

```typescript
export interface JobDetail {
  _id: string;
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType: string;
  status: string;
  serviceCategory: { category: string; serviceType: string };
  expertLevel?: string;
  jobLocation?: string;
  preferredLocation?: string[];
  jobBudget: { pricingType: string; fromAmount: number; upToAmount?: number };
  jobCurrency: string;
  jobStartDate?: string;
  jobEndDate?: string;
  jobSkills: string[];
  jobUploads?: string[];

  // Client info (only for experts)
  client?: {
    name: string;
    email: string;
    organizationName?: string;
    organizationImage?: string;
    aboutOrganization?: string;
    profileUrl?: string;
  };

  hub?: { _id: string; name: string; slug: string; logo?: string };
  createdDate?: Date;
  createdAt: Date;

  // For display
  isClientVisible?: boolean; // True if user is expert
}

export interface JobListItem { /* ... */ }
export interface JobFilters { /* ... */ }
```

### 2. Job Service (`features/jobs/services/job.service.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly apiUrl = `${environment.apiUrl}/jobs`;

  // Signals
  private readonly _job = signal<JobDetail | null>(null);
  private readonly _loading = signal(false);
  private readonly _similarJobs = signal<JobListItem[]>([]);

  // Public readonly
  readonly job = this._job.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly similarJobs = this._similarJobs.asReadonly();

  // TransferState for SSR
  getJobById(id: string): Observable<JobDetail | null>;
  getSimilarJobs(id: string): Promise<JobListItem[]>;

  // Computed values
  readonly infoItems = computed(() => this.buildInfoItems(this._job()));
  readonly budgetText = computed(() => this.formatBudget(this._job()));
  readonly postedAgo = computed(() => this.formatPostedDate(this._job()));
}
```

### 3. Job Detail Page (`features/jobs/pages/job-detail/job-detail.page.ts`)

**Standalone component with inline template** (following expert-detail pattern)

```typescript
@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [RouterLink, HeaderComponent, UiFooterComponent],
  template: `
    <web-header />
    <main class="min-h-screen bg-white">
      @if (jobService.loading()) {
        <!-- Loading skeleton -->
      } @else if (jobService.hasJob()) {
        @let job = jobService.job()!;

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 py-8 lg:py-12">
          <div class="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-12">

            <!-- Left Column: Job Content -->
            <div class="space-y-8">
              <!-- Title Section -->
              <header>
                <h1 class="text-3xl font-bold text-[#1a1623]">{{ job.jobTitle }}</h1>
                <p class="text-gray-500 mt-2">{{ jobService.postedAgo() }}</p>
              </header>

              <!-- Info Section (Card with icons) -->
              <section class="p-5 rounded-xl border border-gray-200 bg-[#FBFAFB]">
                <div class="grid grid-cols-2 gap-5">
                  @for (item of jobService.infoItems(); track item.label) {
                    <div class="flex gap-3">
                      <span class="material-icons text-gray-500">{{ item.icon }}</span>
                      <div>
                        <span class="text-xs uppercase text-gray-500">{{ item.label }}</span>
                        <p class="font-bold">{{ item.value }}</p>
                      </div>
                    </div>
                  }
                </div>
              </section>

              <!-- About Section -->
              <section>
                <h2 class="text-xl font-bold text-[#1a1623] mb-4">About the Job</h2>
                <div class="prose" [innerHTML]="job.jobDescription"></div>
              </section>

              <!-- Skills Section -->
              @if (job.jobSkills?.length) {
                <section>
                  <h2 class="text-xl font-bold text-[#1a1623] mb-4">Required Skills</h2>
                  <div class="flex flex-wrap gap-2">
                    @for (skill of job.jobSkills; track skill) {
                      <span class="px-4 py-1 bg-[#ececf1] rounded-full text-sm">{{ skill }}</span>
                    }
                  </div>
                </section>
              }

              <!-- Client Section -->
              <section>
                <h2 class="text-xl font-bold text-[#1a1623] mb-4">Meet the Client</h2>
                @if (job.client) {
                  <!-- Client visible (expert user) -->
                  <div class="flex items-start gap-4">
                    <img [src]="job.client.organizationImage" class="w-16 h-16 rounded-full"/>
                    <div>
                      <h3 class="font-semibold">{{ job.client.name }}</h3>
                      <p class="text-gray-600">{{ job.client.aboutOrganization }}</p>
                    </div>
                  </div>
                } @else {
                  <!-- Client hidden (guest) - Blur overlay with unlock modal -->
                  <div class="relative">
                    <div class="blur-[15px] select-none">
                      <!-- Placeholder client content -->
                    </div>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <div class="bg-white p-8 rounded-xl border text-center">
                        <h3 class="font-semibold text-xl">Unlock Full Access</h3>
                        <p class="text-gray-600 mt-2">Subscribe for full access...</p>
                        <button class="mt-4 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full">
                          Upgrade to unlock
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </section>
            </div>

            <!-- Right Column: Sidebar Widget (sticky) -->
            <div class="lg:sticky lg:top-24 h-fit">
              <div class="p-6 rounded-xl border shadow-md bg-white">
                <!-- Category & Service Type -->
                <div class="space-y-2 mb-6">
                  <div class="flex items-center gap-2">
                    <span class="material-icons">code</span>
                    {{ job.serviceCategory.category }}
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="material-icons">work</span>
                    {{ job.serviceCategory.serviceType }}
                  </div>
                </div>

                <!-- CTA Buttons -->
                @if (isExpert()) {
                  <button (click)="sendProposal()" class="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium">
                    Send Proposal
                  </button>
                } @else {
                  <button (click)="signUp()" class="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium">
                    Sign up to apply
                  </button>
                }
                <button (click)="share()" class="w-full py-3 mt-2 border rounded-lg font-medium">
                  Refer to network
                </button>

                <p class="text-center text-gray-500 text-sm mt-4">
                  Not an Expert yet? Join us to view client details...
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Similar Jobs Section (gray background) -->
        <section class="bg-[#FBFAFB] py-12">
          <div class="max-w-7xl mx-auto px-4">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold">Similar Jobs</h2>
              <a routerLink="/jobs" class="underline">View all</a>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (job of jobService.similarJobs(); track job._id) {
                <!-- Job card -->
              }
            </div>
          </div>
        </section>
      }
    </main>
    <ui-footer />
  `,
})
export class JobDetailPage implements OnInit, OnDestroy {
  readonly jobService = inject(JobService);
  readonly authService = inject(AuthService);

  // Check if user is expert
  readonly isExpert = computed(() => this.authService.userType() === 'expert');

  sendProposal() { /* Navigate to checkout */ }
  signUp() { /* Navigate to signup */ }
  share() { /* Open share dialog */ }
}
```

### 4. Routes (`features/jobs/jobs.routes.ts`)

```typescript
export const JOBS_ROUTES: Routes = [
  { path: '', component: JobListPage },           // /jobs
  { path: ':id', component: JobDetailPage },      // /job/:id
];
```

### 5. App Routes Update (`app.routes.ts`)

```typescript
import { JOBS_ROUTES } from './features/jobs/jobs.routes';

export const routes: Routes = [
  // ... existing routes
  { path: 'jobs', children: JOBS_ROUTES },
  { path: 'job', children: JOBS_ROUTES },
];
```

---

## UI Layout (v1 Match)

### Desktop Layout
```
+---------------------------+------------------+
|  Job Title                |  [Sidebar]       |
|  Posted X ago             |  Category icon   |
+---------------------------+  Service icon    |
|  +-Info Card-----------+  |                  |
|  | Level | Location    |  |  [Sign up btn]   |
|  | Timeline | Starts   |  |  [Refer btn]     |
|  | Budget              |  |                  |
|  +---------------------+  |  Helper text     |
|                           +------------------+
|  About the Job                              |
|  [Rich text description]                    |
|                                             |
|  Required Skills                            |
|  [chip] [chip] [chip]                       |
|                                             |
|  Meet the Client                            |
|  [Avatar] Name                              |
|  [About text]                               |
+---------------------------------------------+
|  Similar Jobs           View all            |
|  [Card] [Card] [Card]                       |
+---------------------------------------------+
```

### Mobile Layout
- Sidebar moves above content
- CTA buttons fixed at bottom
- Single column layout

---

## Styling (TailwindCSS)

Match v1 CSS variables:
- `--surface-secondary: #FBFAFB` - Info card, similar jobs bg
- `--border-solid: #DDDCDE` - Borders
- `--content-secondary: #7B7B7B` - Secondary text
- `--heading-2: 2rem` - Job title
- `--heading-4: 1.25rem` - Section titles

---

## Critical Files to Modify

### Backend
| File | Change |
|------|--------|
| `src/modules/web/routes/index.ts` | Register `/jobs` routes |
| `src/core/schemas/web/index.ts` | Export job schemas |

### Frontend
| File | Change |
|------|--------|
| `projects/web/src/app/app.routes.ts` | Add job routes |

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
   npm run build:web && npm run lint
   ```

3. **Manual Testing**:
   - Navigate to `http://localhost:4200/job/[valid-job-id]`
   - Verify all sections render correctly
   - Test as guest (client section blurred)
   - Test as expert (client section visible)
   - Verify mobile responsive layout
   - Check SSR hydration (no blink)

4. **API Testing**:
   ```bash
   curl http://localhost:3000/api/v1/jobs/[job-id]
   curl http://localhost:3000/api/v1/jobs/[job-id]/similar
   ```

---

## File Count Summary

| Category | Files | Notes |
|----------|-------|-------|
| Backend service | 2 | Service + index |
| Backend schema | 2 | Schema + index |
| Backend controller | 2 | Controller + index |
| Backend routes | 2 | Routes + index |
| Frontend model | 2 | Model + index |
| Frontend service | 2 | Service + index |
| Frontend page | 1 | Job detail page |
| Frontend routes | 1 | Jobs routes |
| **Total** | **~14 files** | |

---

## Summary

This implementation creates the Job Detail page in v2:
- **Backend**: New web API endpoints for public job data with optional auth
- **Frontend**: Standalone Angular component with inline template (following expert-detail pattern)
- **UI**: Exact match of v1 layout using TailwindCSS
- **Auth**: Guest users see blurred client section, experts see full info
- **SSR**: TransferState support for server-side rendering
