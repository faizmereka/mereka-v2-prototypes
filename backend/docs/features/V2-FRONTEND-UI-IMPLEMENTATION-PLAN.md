# V2 Frontend UI Implementation Plan

## Overview

This document provides a detailed UI implementation plan based on analysis of v1 deployed screens and source code. The goal is to achieve feature parity with v1 in the Jobs/Contracts module.

---

## V1 UI Screenshots Summary

### 1. Hub Dashboard - Job Posts Tab
![Job Posts](./screenshots/v1-job-posts.png)

**URL**: `/hub/:hubId/dashboard/job-post`

**UI Elements**:
- **Tabs**: "All job posts" | "All hires"
- **Header**: Title "All Job Post" + "Create job post" button (pink)
- **Table Columns**:
  - JOB DETAILS (title, created by)
  - SERVICE TYPE
  - POSTED ON (date)
  - PROPOSALS (count)
  - STATUS (badge: Draft, Published, Closed)
  - ACTIONS (Edit draft, menu)
- **Pagination**: Items per page dropdown, page navigation

**V2 Status**: ✅ Implemented

---

### 2. Hub Dashboard - All Hires Tab (Contracts List)
![All Hires](./screenshots/v1-all-hires.png)

**URL**: `/hub/:hubId/dashboard/job-post` (All hires tab)

**UI Elements**:
- **Table Columns**:
  - EXPERT INFORMATION (profile image, name, hub)
  - JOB DETAIL (job title, price, dates)
  - IN ESCROW (amount)
  - PAID TO DATE (amount)
  - STATUS (CLOSED, ACTIVE-FUNDED, ACTIVE - color coded)
  - ACTION buttons:
    - "Leave a review" (for closed)
    - "Mark as closed"
    - "Fund milestone" (for unfunded)
    - "Message"
    - Menu icon

**V2 Status**: ⚠️ Partial - Missing IN ESCROW, PAID TO DATE columns, status-based actions

---

### 3. Contract Detail - Fixed Price (Client View)
![Fixed Price Contract](./screenshots/v1-fixed-contract-detail.png)

**URL**: `/offer/contract-detail/:contractId`

**UI Elements**:

#### Header Section
- Back arrow
- Status badge (ACTIVE, green)
- Contract title (large)
- Three profile cards:
  - CONTRACTED TO: Expert name + hub info
  - EXPERT: Expert profile image + name
  - CLIENT: Client hub name + PIC name
- "Message Expert" button (pink)

#### Tabs
- Work log | Transaction history | Contract details

#### Financial Overview Card
- PROJECT PRICE: MYR X.XX + "FIXED PRICE" label
- IN ESCROW: MYR X.XX
- MILESTONE REMAINING (X/Y): MYR X.XX
- PAID TO DATE: MYR X.XX

#### Milestone Timeline Section
- Section title "Milestone timeline"
- Visual timeline with:
  - Checkmark icon (✓) for completed milestones
  - Number circle for pending
  - Vertical connector line
- Each milestone shows:
  - Task name
  - Amount + PAID/PENDING badge
  - Due date
  - Status text ("Work is done")
- "+ Add a new milestone" link
- "Manage milestones" button

#### Transaction History Section
- Table with: Service Details, Date, Amount, Payment Method
- Shows weekly entries with FAILED/SUCCESS badges

#### Contract Details Section
- Project price
- Milestones count
- Description text
- Start date
- Links: "View job post", "View proposal"

**V2 Status**: ❌ Missing most UI components - only basic card exists

---

### 4. Contract Detail - Hourly (Client View)
![Hourly Contract](./screenshots/v1-hourly-contract-detail.png)

**URL**: `/offer/contract-detail/:contractId`

**UI Elements**:

#### Financial Overview Card (Hourly specific)
- TOTAL CHARGED THIS WEEK: MYR X
- HOURS LOGGED THIS WEEK: X of Y hrs (circular progress)
- HOURS LOGGED LAST WEEK: X of Y hrs (circular progress)
- PAID TO DATE: MYR X (Y hrs)

#### Work Log Section
- Status badge (ACTIVE)
- Date range picker (Jan 19 - Jan 25)
- Empty state illustration with message
- "Message Expert" button

#### Transaction History Table
- Service Details (job name, week range)
- Date
- Amount + FAILED/SUCCESS badge
- Payment Method (card brand, last 4)

#### Contract Details Section
- Contracted rate: MYR X/hr (edit icon)
- Weekly limit: X hrs/week (edit icon)
- Start date
- Description
- Links: View job post, View proposal

**V2 Status**: ⚠️ Partial - Timelog exists but UI needs enhancement

---

### 5. Contract Detail - Expert View (Hourly)
![Expert Hourly Contract](./screenshots/v1-expert-contract.png)

**URL**: `/offer/contract/:contractId`

**UI Elements**:

#### Financial Overview (Expert perspective)
- TOTAL TO BE EARNED THIS WEEK: MYR X
- HOURS LOGGED THIS WEEK: X of Y hrs
- HOURS LOGGED LAST WEEK: X of Y hrs
- SINCE START: MYR X (Y hrs)

#### Work Log Entry Form
- Day-by-day breakdown (Monday - Friday tabs)
- Each day has:
  - Task field
  - From/To time pickers (HH:MM AM/PM)
  - Description (optional) textarea
  - Attachment (Optional): Select File button
  - "Save entry" button
  - "Add entry" link for multiple entries
- Week calendar strip at bottom
- Weekly summary: Hours logged, Total charged

#### Transaction History (same as client)

#### Contract Details (same as client)

**V2 Status**: ⚠️ Partial - Timelog CRUD exists but day-by-day UI missing

---

### 6. Expert Applications - Contracted Tab
![Applications Contracted](./screenshots/v1-job-applications.png)

**URL**: `/hub/:hubId/dashboard/job-application`

**UI Elements**:
- **Header**: "All Job Applications" + "Browse Jobs" button
- **Tabs**: Contracted | Proposed
- **Table Columns**:
  - CLIENT INFORMATION (profile, hub name)
  - JOB DETAILS (title, rate/price, dates)
  - PAYMENT DUE (for hourly)
  - EARNING TO DATE
  - STATUS (ACTIVE, ACTIVE-FUNDED, COMPLETE, CLOSED)
  - ACTIONS:
    - "Fill work log" (hourly)
    - "Mark as closed"
    - "Leave a review" (closed)
- Shows milestone progress "Milestone: X/Y"

**V2 Status**: ✅ Implemented

---

### 7. Expert Applications - Proposed Tab
![Applications Proposed](./screenshots/v1-proposed.png)

**URL**: `/hub/:hubId/dashboard/job-application` (Proposed tab)

**UI Elements**:
- **Table Columns**:
  - CLIENT INFORMATION (profile, hub, contact)
  - JOB DETAILS (title, date)
  - PROPOSED PRICE
  - OFFER PRICE
  - STATUS:
    - PROPOSAL SENT (blue)
    - CANCELLED (gray)
    - OFFER DECLINED (brown)
    - OFFER PENDING (yellow)
  - ACTIONS:
    - "View proposal"
    - "View offer" (declined)
    - "Review Offer" (pink, pending)

**V2 Status**: ✅ Implemented

---

### 8. Review Offer Page (Expert)
![Review Offer](./screenshots/v1-review-offer.png)

**URL**: `/offer/view/:contractId`

**UI Elements**:
- Back arrow + "Review Offer" title
- **Contract Terms Card**:
  - CONTRACTED RATE: MYR X
  - **Milestone Breakdown**:
    - Numbered list (1, 2, 3, 4...)
    - Timeline connector line
    - Task name, Amount, Due date
  - Start date
- **Contract Details Card**:
  - Contract title
  - Description
  - Job link
- **Actions**:
  - "Request Changes" (outline button)
  - "Accept" (pink button)
  - "Or decline" (text link)

**V2 Status**: ✅ Implemented

---

## V1 Dialog Components

### Fund Milestone Dialog
```html
<div ui-dialog-container>
  <div ui-dialog-header>Fund Milestone</div>

  <div ui-dialog-content>
    <!-- Radio options -->
    <button ui-radio-button>Fund <strong>{{milestone.taskName}}</strong></button>
    <!-- Commented out: Fund all remaining, Choose specific -->

    <!-- Total amount -->
    <div class="amount__container">
      <span>Total amount:</span>
      <h6>{{currency}} {{totalAmount}}</h6>
    </div>

    <!-- Payment method display -->
    <div class="payment__container">
      <span>Your payment will be charged to:</span>
      <div class="payment__item">
        <img src="bank.jpeg" />
        <p>{{card.brand}}</p>
        <p>**** **** **** {{card.last4}}</p>
        <span class="label">Default</span>
      </div>
    </div>
  </div>

  <div ui-dialog-actions>
    <button ui-button-outline>Cancel</button>
    <button ui-button-flat>Fund milestone(s)</button>
  </div>
</div>
```

**V2 Status**: ❌ Not implemented

---

### Release Payment Dialog
```html
<div ui-dialog-container>
  <div ui-dialog-header>Confirm Payment Release</div>

  <div ui-dialog-content>
    <p>Once released, the funds will be sent to the Expert.</p>

    <!-- Radio options -->
    <button ui-radio-button>Release payment for <strong>{{milestone.taskName}}</strong> only</button>
    <button ui-radio-button>Release all pending payments ({{count}})</button>
    <button ui-radio-button>Choose specific milestones</button>

    <!-- Specific milestone selection (checkbox list) -->

    <!-- Total amount -->
    <div class="amount__container">
      <span>Total amount:</span>
      <h6>{{currency}} {{totalAmount}}</h6>
    </div>
  </div>

  <div ui-dialog-actions>
    <button ui-button-outline>Cancel</button>
    <button ui-button-flat>Release payment</button>
  </div>
</div>
```

**V2 Status**: ❌ Not implemented

---

### Submit Work Dialog (Expert)
```html
<div ui-dialog-container>
  <div ui-dialog-header>Submit work</div>

  <div ui-dialog-content>
    <!-- Payment to be released section -->
    <div class="milestone-timeline">
      <h5>Payment to be released</h5>
      <div class="milestone__item">
        <div class="milestone__circle">1</div>
        <div class="milestone__info">
          <h6>{{milestone.taskName}}</h6>
          <h6 class="milestone__amount">{{currency}} {{amount}}</h6>
          <span class="milestone__due-date">Due {{dueDate}}</span>
        </div>
      </div>
    </div>

    <!-- Work log form -->
    <div class="submit-work__work-log">
      <h5>Work log</h5>
      <p>Description</p>
      <textarea [(ngModel)]="workLogDescription" rows="4" maxlength="500"></textarea>

      <p>Attachment (Optional):</p>
      <ui-upload-file></ui-upload-file>
      <file-upload-preview></file-upload-preview>
    </div>
  </div>

  <div ui-dialog-actions>
    <button ui-button-outline>Cancel</button>
    <button ui-button-flat [disabled]="!workLogDescription">Submit</button>
  </div>
</div>
```

**V2 Status**: ⚠️ Basic implementation exists

---

## Implementation Priorities

### Phase 1: Contract Details UI (HIGH PRIORITY)

#### 1.1 Contract Details Header Component
```typescript
// contract-details-header.component.ts
@Component({
  selector: 'app-contract-details-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="contract-header">
      <button class="back-btn" (click)="goBack()">
        <span class="icon">←</span>
      </button>

      <div class="header-content">
        <span class="status-badge" [class]="contract()?.status">
          {{ contract()?.status }}
        </span>
        <h1>{{ contract()?.contractTitle }}</h1>

        <div class="profile-cards">
          <div class="profile-card">
            <span class="label">CONTRACTED TO</span>
            <img [src]="expert()?.profileImage" />
            <h3>{{ expert()?.name }}</h3>
            <p>{{ expertHub()?.name }}</p>
          </div>
          <div class="profile-card">
            <span class="label">EXPERT</span>
            <img [src]="expert()?.profileImage" />
            <h3>{{ expert()?.name }}</h3>
          </div>
          <div class="profile-card">
            <span class="label">CLIENT</span>
            <h3>{{ clientHub()?.name }}</h3>
            <p>PIC: {{ client()?.name }}</p>
          </div>
        </div>
      </div>

      <button class="message-btn" (click)="messageExpert()">
        Message Expert
      </button>
    </div>
  `
})
export class ContractDetailsHeaderComponent {
  contract = input<Contract>();
  expert = input<User>();
  expertHub = input<Hub>();
  client = input<User>();
  clientHub = input<Hub>();

  goBack = output<void>();
  onMessage = output<void>();
}
```

#### 1.2 Financial Overview Component
```typescript
// contract-details-financial.component.ts
@Component({
  selector: 'app-contract-details-financial',
  standalone: true,
  template: `
    <div class="financial-overview">
      @if (priceType() === 'fixed') {
        <div class="stat">
          <span class="label">PROJECT PRICE</span>
          <span class="value">{{ currency() }} {{ projectPrice() | number:'1.2-2' }}</span>
          <span class="badge">FIXED PRICE</span>
        </div>
        <div class="stat">
          <span class="label">IN ESCROW</span>
          <span class="value">{{ currency() }} {{ inEscrow() | number:'1.2-2' }}</span>
        </div>
        <div class="stat">
          <span class="label">MILESTONE REMAINING ({{ pendingCount() }}/{{ totalCount() }})</span>
          <span class="value">{{ currency() }} {{ remaining() | number:'1.2-2' }}</span>
        </div>
        <div class="stat">
          <span class="label">PAID TO DATE</span>
          <span class="value">{{ currency() }} {{ paidToDate() | number:'1.2-2' }}</span>
        </div>
      } @else {
        <!-- Hourly contract view -->
        <div class="stat">
          <span class="label">TOTAL CHARGED THIS WEEK</span>
          <span class="value">{{ currency() }} {{ weeklyCharge() }}</span>
        </div>
        <div class="stat circular">
          <span class="label">HOURS LOGGED THIS WEEK</span>
          <app-circular-progress [value]="hoursThisWeek()" [max]="weeklyLimit()" />
          <span class="value">{{ hoursThisWeek() }} of {{ weeklyLimit() }} hrs</span>
        </div>
        <div class="stat circular">
          <span class="label">HOURS LOGGED LAST WEEK</span>
          <app-circular-progress [value]="hoursLastWeek()" [max]="weeklyLimit()" />
          <span class="value">{{ hoursLastWeek() }} of {{ weeklyLimit() }} hrs</span>
        </div>
        <div class="stat">
          <span class="label">PAID TO DATE</span>
          <span class="value">{{ currency() }} {{ paidToDate() }} ({{ totalHours() }} hrs)</span>
        </div>
      }
    </div>
  `
})
```

#### 1.3 Milestone Timeline Component (CRITICAL)
```typescript
// contract-details-milestone-timeline.component.ts
@Component({
  selector: 'app-milestone-timeline',
  standalone: true,
  template: `
    <div class="milestone-timeline">
      <h3>Milestone timeline</h3>

      <div class="timeline">
        @for (milestone of milestones(); track milestone._id; let i = $index) {
          <div class="milestone-item" [class]="milestone.status">
            <div class="timeline-connector"></div>

            <div class="milestone-circle" [class]="milestone.status">
              @if (milestone.status === 'released') {
                <span class="checkmark">✓</span>
              } @else {
                <span>{{ i + 1 }}</span>
              }
            </div>

            <div class="milestone-info">
              <h4>{{ milestone.taskName }}</h4>
              <div class="amount">
                {{ contract()?.selectedCurrency }} {{ milestone.amount | number:'1.2-2' }}
                <span class="status-badge" [class]="milestone.status">
                  {{ getStatusLabel(milestone.status) }}
                </span>
              </div>
              <span class="due-date">Due: {{ milestone.dueDate | date:'MMM d, yyyy' }}</span>

              @if (milestone.workDescription) {
                <p class="work-desc">{{ milestone.workDescription }}</p>
              }

              <!-- Action buttons based on status and user role -->
              <div class="actions">
                @switch (milestone.status) {
                  @case ('pending') {
                    @if (!isExpert()) {
                      <button class="btn-primary" (click)="fundMilestone(milestone)">
                        Fund milestone
                      </button>
                    }
                  }
                  @case ('funded') {
                    @if (isExpert()) {
                      <button class="btn-primary" (click)="submitWork(milestone)">
                        Submit work
                      </button>
                    }
                  }
                  @case ('work_submitted') {
                    @if (!isExpert()) {
                      <button class="btn-primary" (click)="releasePayment(milestone)">
                        Release payment
                      </button>
                    }
                    <button class="btn-outline" (click)="viewWork(milestone)">
                      View work
                    </button>
                  }
                }
              </div>
            </div>
          </div>
        }
      </div>

      @if (!isExpert()) {
        <a class="add-milestone" (click)="addMilestone()">
          <span class="icon">+</span> Add a new milestone
        </a>
        <button class="btn-outline" (click)="manageMilestones()">
          Manage milestones
        </button>
      }
    </div>
  `
})
```

### Phase 2: Dialog Components (HIGH PRIORITY)

#### 2.1 Fund Milestone Dialog
```typescript
// dialog-fund-milestone.component.ts
@Component({
  selector: 'app-dialog-fund-milestone',
  standalone: true,
  template: `
    <app-dialog>
      <h2 dialog-header>Fund Milestone</h2>

      <div dialog-content>
        <div class="radio-options">
          <label class="radio-option" [class.selected]="selectedOption() === 'single'">
            <input type="radio" name="option" value="single"
                   [checked]="selectedOption() === 'single'"
                   (change)="selectOption('single')" />
            Fund <strong>{{ milestone()?.taskName }}</strong>
          </label>

          <!-- Future: Fund all, Choose specific -->
        </div>

        <div class="amount-display">
          <span>Total amount:</span>
          <h3>{{ currency() }} {{ totalAmount() | number:'1.2-2' }}</h3>
        </div>

        @if (paymentMethod()) {
          <div class="payment-method">
            <span>Your payment will be charged to:</span>
            <div class="card-display">
              <img src="/assets/icons/bank.svg" />
              <span class="brand">{{ paymentMethod()?.card?.brand }}</span>
              <span class="last4">**** **** **** {{ paymentMethod()?.card?.last4 }}</span>
              <span class="badge">Default</span>
            </div>
          </div>
        } @else {
          <div class="no-payment">
            <p>No payment method on file.</p>
            <button (click)="addPaymentMethod()">Add Payment Method</button>
          </div>
        }
      </div>

      <div dialog-actions>
        <button class="btn-outline" (click)="close()">Cancel</button>
        <button class="btn-primary" (click)="fund()" [disabled]="isLoading() || !paymentMethod()">
          Fund milestone
        </button>
      </div>
    </app-dialog>
  `
})
```

#### 2.2 Release Payment Dialog
```typescript
// dialog-release-payment.component.ts
@Component({
  selector: 'app-dialog-release-payment',
  standalone: true,
  template: `
    <app-dialog>
      <h2 dialog-header>Confirm Payment Release</h2>

      <div dialog-content>
        <p class="info-text">Once released, the funds will be sent to the Expert.</p>

        <div class="radio-options">
          <label class="radio-option" [class.selected]="selectedOption() === 'single'">
            <input type="radio" name="option" value="single"
                   (change)="selectOption('single')" />
            Release payment for <strong>{{ milestone()?.taskName }}</strong> only
          </label>

          <label class="radio-option" [class.selected]="selectedOption() === 'all'">
            <input type="radio" name="option" value="all"
                   (change)="selectOption('all')" />
            Release all pending payments ({{ workSubmittedCount() }})
          </label>

          <label class="radio-option" [class.selected]="selectedOption() === 'specific'">
            <input type="radio" name="option" value="specific"
                   (change)="selectOption('specific')" />
            Choose specific milestones
          </label>
        </div>

        @if (selectedOption() === 'specific') {
          <div class="milestone-selection">
            @for (m of workSubmittedMilestones(); track m._id) {
              <label class="checkbox-option">
                <input type="checkbox" [checked]="isSelected(m)" (change)="toggleMilestone(m)" />
                <span>{{ m.taskName }}</span>
                <span class="amount">{{ currency() }} {{ m.amount | number:'1.2-2' }}</span>
              </label>
            }
          </div>
        }

        <div class="amount-display">
          <span>Total amount:</span>
          <h3>{{ currency() }} {{ totalAmount() | number:'1.2-2' }}</h3>
        </div>
      </div>

      <div dialog-actions>
        <button class="btn-outline" (click)="close()">Cancel</button>
        <button class="btn-primary" (click)="release()" [disabled]="isLoading() || totalAmount() === 0">
          Release payment
        </button>
      </div>
    </app-dialog>
  `
})
```

#### 2.3 Submit Work Dialog
```typescript
// dialog-submit-work.component.ts
@Component({
  selector: 'app-dialog-submit-work',
  standalone: true,
  template: `
    <app-dialog>
      <h2 dialog-header>Submit work</h2>

      <div dialog-content>
        <div class="payment-preview">
          <h4>Payment to be released</h4>
          <div class="milestone-preview">
            <div class="circle">1</div>
            <div class="info">
              <h5>{{ milestone()?.taskName }}</h5>
              <span class="amount">{{ currency() }} {{ milestone()?.amount | number:'1.2-2' }}</span>
              <span class="due-date">Due {{ milestone()?.dueDate | date:'dd/MM/yyyy' }}</span>
            </div>
          </div>
        </div>

        <div class="work-log-form">
          <h4>Work log</h4>

          <div class="form-group">
            <label>Description</label>
            <textarea [(ngModel)]="description" rows="4" maxlength="500"
                      placeholder="Describe the work completed..."></textarea>
          </div>

          <div class="form-group">
            <label>Attachment (Optional)</label>
            <app-file-upload (filesChange)="onFilesChange($event)" [maxFiles]="1" />
          </div>
        </div>
      </div>

      <div dialog-actions>
        <button class="btn-outline" (click)="close()">Cancel</button>
        <button class="btn-primary" (click)="submit()" [disabled]="isLoading() || !description()">
          Submit
        </button>
      </div>
    </app-dialog>
  `
})
```

---

## File Structure

```
projects/app/src/app/features/hub-dashboard/
├── pages/jobs/
│   ├── contracts/
│   │   └── contract-details/
│   │       ├── components/
│   │       │   ├── contract-details-header/
│   │       │   │   ├── contract-details-header.component.ts
│   │       │   │   └── contract-details-header.component.scss
│   │       │   ├── contract-details-financial/
│   │       │   │   ├── contract-details-financial.component.ts
│   │       │   │   └── contract-details-financial.component.scss
│   │       │   ├── contract-details-milestone-timeline/
│   │       │   │   ├── contract-details-milestone-timeline.component.ts
│   │       │   │   └── contract-details-milestone-timeline.component.scss
│   │       │   ├── contract-details-transactions/
│   │       │   │   ├── contract-details-transactions.component.ts
│   │       │   │   └── contract-details-transactions.component.scss
│   │       │   └── contract-details-summary/
│   │       │       └── contract-details-summary.component.ts
│   │       ├── dialogs/
│   │       │   ├── dialog-fund-milestone/
│   │       │   │   └── dialog-fund-milestone.component.ts
│   │       │   ├── dialog-release-payment/
│   │       │   │   └── dialog-release-payment.component.ts
│   │       │   └── dialog-submit-work/
│   │       │       └── dialog-submit-work.component.ts
│   │       ├── contract-details.component.ts
│   │       └── contract-details.component.scss
│   └── ...
└── services/
    └── hub-contracts-api.service.ts
```

---

## CSS Variables (Design Tokens)

Based on v1 screenshots, use these design tokens:

```scss
// Status colors
--status-active: #10B981;        // Green
--status-active-funded: #6366F1; // Indigo
--status-pending: #F59E0B;       // Amber
--status-closed: #6B7280;        // Gray
--status-failed: #EF4444;        // Red

// UI colors
--primary: #EC4899;              // Pink (buttons)
--primary-hover: #DB2777;
--outline: #E5E7EB;              // Gray border
--text-primary: #111827;
--text-secondary: #6B7280;
--bg-card: #FFFFFF;
--bg-section: #F9FAFB;

// Milestone timeline
--timeline-line: #E5E7EB;
--milestone-circle-pending: #FFFFFF;
--milestone-circle-complete: #10B981;
--milestone-circle-border: #D1D5DB;
```

---

## API Integration Points

### Existing APIs (Backend Ready)
- `GET /api/v1/hub/:hubId/contracts/:contractId` - Contract details
- `GET /api/v1/hub/milestones?contractId=:id` - Milestones for contract
- `POST /api/v1/hub/milestones/:id/fund` - Fund milestone
- `POST /api/v1/hub/milestones/:id/submit-work` - Submit work
- `POST /api/v1/hub/milestones/:id/approve` - Approve work
- `POST /api/v1/hub/milestones/:id/release` - Release payment

### APIs Needed
- `GET /api/v1/hub/:hubId/contracts/:contractId/transactions` - Transaction history
- `POST /api/v1/hub/milestones/fund-multiple` - Fund multiple milestones
- `POST /api/v1/hub/milestones/release-multiple` - Release multiple payments

---

## Implementation Timeline

| Week | Tasks |
|------|-------|
| Week 1 | Contract details header, Financial overview, Basic milestone list |
| Week 2 | Milestone timeline with visual design, Status-based actions |
| Week 3 | Fund milestone dialog, Submit work dialog |
| Week 4 | Release payment dialog, Transaction history |
| Week 5 | Testing, polish, edge cases |

---

_Document Version: 1.0_
_Last Updated: January 23, 2026_
