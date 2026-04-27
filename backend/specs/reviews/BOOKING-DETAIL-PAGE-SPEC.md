# Booking Detail Page Specification

## Overview

This specification defines the implementation of the Booking Detail Page for learners in the v2 frontend. The page displays comprehensive booking information, payment details, and allows learners to manage their reviews.

**Reference**: v1 `mereka-web/src/app/pages/reservation/`

---

## 1. Page Structure

### 1.1 File Location
```
projects/app/src/app/features/user-dashboard/pages/booking-detail/
├── booking-detail.page.ts
├── booking-detail.page.html
├── booking-detail.page.scss
├── components/
│   ├── booking-header/
│   │   ├── booking-header.component.ts
│   │   └── booking-header.component.html
│   ├── booking-info/
│   │   ├── booking-info.component.ts
│   │   └── booking-info.component.html
│   ├── booking-guests/
│   │   ├── booking-guests.component.ts
│   │   └── booking-guests.component.html
│   ├── booking-price/
│   │   ├── booking-price.component.ts
│   │   └── booking-price.component.html
│   ├── booking-review/
│   │   ├── booking-review.component.ts
│   │   └── booking-review.component.html
│   └── booking-location/
│       ├── booking-location.component.ts
│       └── booking-location.component.html
└── services/
    └── booking-detail.service.ts
```

### 1.2 Routing
```typescript
// user-dashboard.routes.ts
{
  path: 'bookings/:bookingId',
  loadComponent: () => import('./pages/booking-detail/booking-detail.page')
    .then(m => m.BookingDetailPage),
  data: { title: 'Booking Details' }
}
```

---

## 2. Component Specifications

### 2.1 BookingDetailPage (Main Container)

#### AC-BDP-001: Page Layout
```html
<div class="min-h-screen bg-neutral-50" data-testid="booking-detail-page">
  <!-- Loading State -->
  @if (isLoading()) {
    <div class="page-loader" data-testid="booking-detail-loading">
      <spinner />
    </div>
  }

  <!-- Error State -->
  @else if (error()) {
    <div class="error-state" data-testid="booking-detail-error">
      <error-message [message]="error()" />
      <button (click)="retry()">Retry</button>
    </div>
  }

  <!-- Content -->
  @else if (booking()) {
    <app-booking-header [booking]="booking()" />
    <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <app-booking-info [booking]="booking()" />
      <app-booking-guests [booking]="booking()" />
      <app-booking-price [booking]="booking()" />
      <app-booking-review [booking]="booking()" />
      <app-booking-location [booking]="booking()" />
      <app-booking-actions [booking]="booking()" />
    </div>
  }
</div>
```

#### AC-BDP-002: Data Loading
- Fetch booking by ID: `GET /api/web/bookings/:bookingId`
- Include populated fields: experience/expertise, hub, review, hubReply
- Handle 404 with "Booking not found" state
- Handle unauthorized with redirect to login

#### AC-BDP-003: Responsive Design
- Desktop: Max width 1000px, centered
- Mobile: Full width with padding
- Consistent with v1 design patterns

---

### 2.2 BookingHeader Component

#### AC-BDH-001: Header Structure
```html
<div class="booking-header" data-testid="booking-header">
  <!-- Back Button -->
  <button (click)="goBack()" data-testid="booking-back-btn">
    <icon name="arrow-left" />
  </button>

  <!-- Title -->
  <h1 data-testid="booking-header-title">
    {{ booking.status !== 'cancelled' ? 'Booking Details' : 'Cancellation Details' }}
  </h1>

  <!-- Print Button -->
  <button (click)="downloadReceipt()" data-testid="booking-print-btn">
    <icon name="print" />
  </button>
</div>
```

#### AC-BDH-002: Navigation
- Back button returns to previous page or /dashboard/bookings
- Print button downloads PDF receipt

---

### 2.3 BookingInfo Component

#### AC-BDI-001: Information Display
```html
<div class="booking-info" data-testid="booking-info">
  <!-- Status Badge -->
  <div class="status-badge" [class]="getStatusClass()" data-testid="booking-status">
    {{ booking.status | titlecase }}
  </div>

  <!-- Date & Time -->
  <div class="datetime" data-testid="booking-datetime">
    <p>{{ formatDate(booking.bookingStartDate) }}, {{ formatTime(booking.bookingStartDate) }}</p>
    <p>Confirmation Code: {{ booking._id }}</p>
  </div>

  <!-- Service Title -->
  <button (click)="navigateToService()" data-testid="booking-service-title">
    {{ booking.serviceTitle }}
    <span *ngIf="booking.serviceType === 'expertise'">With {{ booking.hostName }}</span>
    <icon name="external-link" />
  </button>

  <!-- Service Type & Location -->
  <div class="service-meta" data-testid="booking-meta">
    <span class="service-type">
      <icon [name]="serviceTypeIcon" />
      {{ booking.experienceType || 'Online' }}
    </span>
    <span class="location" *ngIf="isPhysical">
      <icon name="location" />
      {{ booking.locationCity }}
    </span>
    <span class="host" *ngIf="booking.hostName">
      Host: {{ booking.hostName }}
    </span>
  </div>
</div>
```

#### AC-BDI-002: Status Classes
| Status | Class | Color |
|--------|-------|-------|
| confirmed | `bg-green-100 text-green-800` | Green |
| pending | `bg-yellow-100 text-yellow-800` | Yellow |
| cancelled | `bg-red-100 text-red-800` | Red |
| completed | `bg-blue-100 text-blue-800` | Blue |

---

### 2.4 BookingGuests Component

#### AC-BDG-001: Guests Section (Experiences)
```html
<div class="booking-guests" data-testid="booking-guests-section">
  <div class="section-header">
    <h2>Guests & Tickets</h2>
    <div class="actions" *ngIf="canAddGuests">
      <button (click)="addGuest()" data-testid="add-guest-btn">Add guest details</button>
      <button (click)="downloadTickets()" data-testid="download-tickets-btn">Download tickets</button>
    </div>
  </div>

  <div class="ticket-list" data-testid="ticket-list">
    @for (ticket of groupedTickets; track ticket.ticketId) {
      <div class="ticket-group" data-testid="ticket-group-{{ $index }}">
        <div class="ticket-title">
          {{ ticket.quantity }} x {{ ticket.ticketName }}
        </div>
        @for (guest of ticket.guests; track $index) {
          <div class="guest-info" data-testid="guest-info-{{ $index }}">
            <span class="guest-name">{{ guest.name }}</span>
            <span class="guest-email">{{ guest.email }}</span>
          </div>
        }
      </div>
    }
  </div>
</div>
```

#### AC-BDG-002: Package Section (Expertise)
```html
<div class="booking-package" data-testid="booking-package-section">
  <div class="section-header">
    <h2>Package</h2>
  </div>

  <div class="package-list" data-testid="package-list">
    @for (ticket of booking.selectedTickets; track $index) {
      <div class="package-item">
        <span class="package-name">{{ ticket.ticketName }}</span>
        @if (booking.availabilityType !== 'flexible') {
          <span class="package-duration">
            <icon name="clock" />
            {{ ticket.sessionDuration }}
          </span>
        }
      </div>
    }
  </div>

  <div class="booked-by" data-testid="booked-by">
    <h3>Booked by</h3>
    <p class="name">{{ booking.bookerName }}</p>
    <p class="email">{{ booking.bookerEmail }}</p>
  </div>
</div>
```

---

### 2.5 BookingPrice Component

#### AC-BDP-001: Payment Breakdown Section
```html
<div class="booking-price" data-testid="booking-price-section">
  <div class="section-header">
    <h3>Payment Breakdown</h3>
    <p class="status">
      Status:
      <span [class]="statusClass" data-testid="payment-status">
        {{ getPaymentStatus() | uppercase }}
      </span>
    </p>
  </div>

  <!-- Ticket Details -->
  <div class="ticket-prices" data-testid="ticket-prices">
    @for (ticket of booking.selectedTickets; track $index) {
      <div class="price-row">
        <span>{{ ticket.quantity }} x {{ ticket.ticketName }}</span>
        <span>{{ formatCurrency(ticket.totalPrice) }}</span>
      </div>
    }
  </div>

  <!-- Service Fee -->
  @if (booking.serviceFee > 0 && booking.serviceFeePayBy === 'learner') {
    <div class="price-row service-fee" data-testid="service-fee">
      <span>
        Service Fee (Paid by User)
        <tooltip text="3% + RM1 per booking" />
      </span>
      <span>{{ formatCurrency(booking.serviceFee) }}</span>
    </div>
  }

  <!-- Membership Discount -->
  @if (booking.membershipDiscount > 0) {
    <div class="price-row discount" data-testid="membership-discount">
      <span>Hub Member Discount ({{ booking.membershipDiscount }}%)</span>
      <span class="text-green-600">-{{ formatCurrency(booking.membershipDiscountAmount) }}</span>
    </div>
  }

  <!-- Voucher -->
  @if (booking.promotionCode) {
    <div class="price-row voucher" data-testid="voucher-applied">
      <span>
        <icon name="coupon" />
        {{ booking.promotionCode }}
      </span>
      <span class="text-red-600">-{{ formatCurrency(booking.discountAmount) }}</span>
    </div>
  }

  <!-- Total -->
  <div class="price-row total" data-testid="total-paid">
    <span>Total Paid</span>
    <span>
      @if (booking.isFree) {
        FREE
      } @else {
        {{ formatCurrency(booking.totalAmount) }}
      }
    </span>
  </div>
</div>
```

#### AC-BDP-002: Cancellation Policy Section
```html
<div class="cancellation-policy" data-testid="cancellation-policy" *ngIf="booking.status !== 'cancelled'">
  <h4>Cancellation Policy</h4>
  <p>
    If you wish to cancel your booking, please bear in mind Mereka's cancellation policy.
    <a href="https://help.mereka.io/hc/policies/mereka-cancellation-policy" target="_blank">
      Learn more
    </a>
  </p>
</div>
```

#### AC-BDP-003: Refund Details (Cancelled Bookings)
```html
<div class="refund-details" data-testid="refund-details" *ngIf="booking.status === 'cancelled'">
  <h3>Refund Details</h3>
  <p class="cancelled-by" data-testid="cancelled-by">
    Status: CANCELLED BY {{ booking.cancelledBy | uppercase }}
  </p>

  <div class="price-row">
    <span>Total Paid</span>
    <span>{{ formatCurrency(booking.totalPaid) }}</span>
  </div>

  <div class="price-row">
    <span>Service Fee (Non-refundable)</span>
    <span>{{ formatCurrency(booking.serviceFee) }}</span>
  </div>

  <div class="price-row">
    <span>{{ booking.refundPercentage }}% Refund</span>
    <span>{{ formatCurrency(booking.refundAmount) }}</span>
  </div>

  <div class="price-row total">
    <span>Total Refund</span>
    <span>{{ formatCurrency(booking.refundAmount) }}</span>
  </div>
</div>
```

---

### 2.6 BookingReview Component (KEY COMPONENT)

#### AC-BDR-001: Review Section Container
```html
<div class="booking-review" data-testid="booking-review-section">
  <!-- Loading State -->
  @if (isLoadingReview()) {
    <div data-testid="review-loading">
      <spinner />
    </div>
  }

  <!-- Has Review -->
  @else if (review()) {
    <div class="existing-review" data-testid="existing-review">
      <div class="review-header">
        <h2>Your Review</h2>

        <!-- Menu Options -->
        <div class="review-actions" data-testid="review-actions">
          <menu-dropdown>
            <button (click)="editReview()" data-testid="edit-review-btn">
              Edit Review
            </button>
            <button (click)="deleteReview()" data-testid="delete-review-btn">
              Delete Review
            </button>
          </menu-dropdown>
        </div>
      </div>

      <!-- Star Rating -->
      <div class="review-rating" data-testid="review-rating">
        @for (star of [1,2,3,4,5]; track star) {
          <icon
            name="star"
            [class]="star <= review().rating ? 'text-yellow-400' : 'text-neutral-300'"
            data-testid="star-{{ star }}"
          />
        }
      </div>

      <!-- Review Content -->
      <p class="review-content" data-testid="review-content">
        {{ review().content }}
      </p>

      <!-- Review Photos -->
      @if (review().photos?.length) {
        <div class="review-photos" data-testid="review-photos">
          @for (photo of review().photos; track photo) {
            <img [src]="photo" alt="Review photo" />
          }
        </div>
      }

      <!-- Hub Reply -->
      @if (review().hubReply) {
        <div class="hub-reply" data-testid="hub-reply">
          <div class="reply-header">
            <img [src]="booking().hub.logo" [alt]="booking().hub.name" />
            <span>{{ booking().hub.name }}</span>
          </div>
          <p class="reply-content" data-testid="hub-reply-content">
            {{ review().hubReply.content }}
          </p>
          <span class="reply-date">
            {{ formatDate(review().hubReply.createdAt) }}
          </span>
        </div>
      }
    </div>
  }

  <!-- No Review Yet -->
  @else if (canLeaveReview()) {
    <div class="no-review" data-testid="no-review">
      <button
        (click)="openReviewDialog()"
        class="btn-primary"
        data-testid="leave-review-btn"
      >
        Leave a Review
      </button>
    </div>
  }
</div>

<!-- Review Dialog -->
<app-booking-review-dialog
  [isOpen]="showReviewDialog()"
  [booking]="booking()"
  [existingReview]="review()"
  [mode]="reviewDialogMode()"
  (close)="closeReviewDialog()"
  (submit)="onReviewSubmit($event)"
/>

<!-- Delete Confirmation Dialog -->
<app-confirm-dialog
  [isOpen]="showDeleteDialog()"
  title="Delete Review"
  message="Are you sure you want to delete your review? This action cannot be undone."
  confirmText="Delete"
  confirmClass="btn-danger"
  (confirm)="confirmDelete()"
  (cancel)="cancelDelete()"
/>
```

#### AC-BDR-002: Review Eligibility
Review button shown when:
- `booking.status === 'confirmed'` or `booking.status === 'completed'`
- `booking.bookingEndDate` is in the past
- `booking.status !== 'cancelled'`
- No existing review OR review was deleted

#### AC-BDR-003: Review Dialog Data
```typescript
interface BookingReviewFormData {
  rating: number;        // 1-5
  content: string;       // 25-1000 characters
  photos?: string[];     // Optional, max 5
}
```

#### AC-BDR-004: Review Actions
| Action | API Call | Condition |
|--------|----------|-----------|
| Create | `POST /api/web/bookings/:id/review` | No existing review |
| Edit | `PUT /api/web/bookings/:id/review` | Within 7 days of creation |
| Delete | `DELETE /api/web/bookings/:id/review` | Owner only |

---

### 2.7 BookingLocation Component

#### AC-BDL-001: Location Display (Physical Events)
```html
<div class="booking-location" data-testid="booking-location" *ngIf="isPhysical">
  <h2>Location</h2>
  <p data-testid="location-address">
    {{ location.streetAddress }}<br/>
    {{ location.city }}, {{ location.state }}, {{ location.country }}
  </p>

  <!-- Map -->
  <div class="map-container" data-testid="location-map">
    <google-map
      [center]="{ lat: location.lat, lng: location.lng }"
      [zoom]="14"
      [height]="400"
    >
      <map-marker [position]="{ lat: location.lat, lng: location.lng }" />
    </google-map>
  </div>
</div>
```

---

### 2.8 BookingActions Component

#### AC-BDA-001: Action Links
```html
<div class="booking-actions" data-testid="booking-actions">
  <!-- Transaction History Link -->
  <a routerLink="/dashboard/transactions" data-testid="transaction-history-link">
    View Transaction History
  </a>

  <!-- Cancel Booking (if eligible) -->
  @if (canCancel) {
    <button (click)="openCancelDialog()" data-testid="cancel-booking-btn">
      Cancel Booking
    </button>
  }

  <!-- Help Center -->
  <a href="https://help.mereka.io/hc/" target="_blank" data-testid="help-center-link">
    Help Center
  </a>
</div>
```

---

## 3. Booking Review Dialog Component

### 3.1 File Location
```
projects/app/src/app/shared/components/review/booking-review-dialog/
├── booking-review-dialog.component.ts
└── booking-review-dialog.component.html
```

### 3.2 Component Structure

#### AC-BRDL-001: Dialog Template
```html
@if (isDialogOpen()) {
  <div class="dialog-backdrop" (click)="onBackdropClick($event)" data-testid="review-dialog-backdrop">
    <div class="dialog-content" (click)="$event.stopPropagation()" data-testid="review-dialog">
      <!-- Header -->
      <div class="dialog-header" data-testid="review-dialog-header">
        <h2>{{ mode() === 'create' ? 'Write a Review' : 'Edit Review' }}</h2>
        <button (click)="close.emit()" data-testid="review-dialog-close">
          <icon name="x" />
        </button>
      </div>

      <!-- Service Info -->
      <div class="service-info" data-testid="review-service-info">
        <p>How was your experience with:</p>
        <div class="service-card">
          <img [src]="booking().serviceCover" [alt]="booking().serviceTitle" />
          <span>{{ booking().serviceTitle }}</span>
        </div>
      </div>

      <!-- Rating Input -->
      <div class="rating-section" data-testid="review-rating-section">
        <label>Your Rating</label>
        <app-star-rating-input
          [value]="rating()"
          (valueChange)="onRatingChange($event)"
          size="lg"
          data-testid="review-rating-input"
        />
      </div>

      <!-- Content Input -->
      <div class="content-section" data-testid="review-content-section">
        <label>Your Review</label>
        <textarea
          [value]="content()"
          (input)="onContentChange($event)"
          placeholder="Share your experience..."
          maxlength="1000"
          rows="4"
          data-testid="review-content-input"
        ></textarea>
        <div class="char-count">
          <span [class]="contentValidClass()">{{ contentValidationMessage() }}</span>
          <span>{{ content().length }}/1000</span>
        </div>
      </div>

      <!-- Photo Upload -->
      <div class="photo-section" data-testid="review-photo-section">
        <label>Add Photos (Optional)</label>
        <div class="photo-grid">
          @for (photo of photos(); track photo) {
            <div class="photo-preview">
              <img [src]="photo" />
              <button (click)="removePhoto($index)" data-testid="remove-photo-{{ $index }}">
                <icon name="x" />
              </button>
            </div>
          }
          @if (photos().length < 5) {
            <button class="add-photo" (click)="addPhoto()" data-testid="add-photo-btn">
              <icon name="camera" />
              Add Photo
            </button>
          }
        </div>
      </div>

      <!-- Actions -->
      <div class="dialog-actions" data-testid="review-dialog-actions">
        <button (click)="close.emit()" class="btn-secondary" data-testid="review-cancel-btn">
          Cancel
        </button>
        <button
          (click)="onSubmit()"
          [disabled]="!isValid() || submitting()"
          class="btn-primary"
          data-testid="review-submit-btn"
        >
          @if (submitting()) {
            <spinner size="sm" />
            Submitting...
          } @else {
            {{ mode() === 'create' ? 'Submit Review' : 'Save Changes' }}
          }
        </button>
      </div>
    </div>
  </div>
}
```

#### AC-BRDL-002: Validation Rules
```typescript
// Rating: Required, 1-5
// Content: Required, 25-1000 characters
// Photos: Optional, max 5, max 5MB each

readonly isValid = computed(() => {
  return (
    this.rating() >= 1 &&
    this.rating() <= 5 &&
    this.content().length >= 25 &&
    this.content().length <= 1000
  );
});
```

---

## 4. Data Interfaces

### 4.1 Booking Detail Response
```typescript
interface BookingDetailResponse {
  _id: string;
  confirmationCode: string;
  serviceId: string;
  serviceType: 'experience' | 'expertise';
  serviceTitle: string;
  serviceCover: string;
  experienceType?: 'Online' | 'Physical' | 'Hybrid';

  hubId: string;
  hub: {
    _id: string;
    name: string;
    logo?: string;
  };

  hostName?: string;
  hostDetails?: Array<{ fullName: string }>;

  bookingStartDate: Date;
  bookingEndDate: Date;
  timeZone: string;

  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  cancelledBy?: 'learner' | 'hub';
  cancellationReason?: string;
  cancelledDate?: Date;

  selectedTickets: Array<{
    ticketId: string;
    ticketName: string;
    quantity: number;
    standardRate: number;
    totalPrice: number;
    sessionDuration?: string;
    guests?: Array<{ name: string; email: string }>;
  }>;

  bookerName: string;
  bookerEmail: string;
  phoneNumber?: string;

  totalCost: number;
  totalAmount: number;
  currency: string;
  serviceFee: number;
  serviceFeePayBy: 'learner' | 'hub';
  membershipDiscount?: number;
  membershipDiscountAmount?: number;
  promotionCode?: string;
  discountAmount?: number;
  isFree: boolean;

  paymentMethod?: {
    type: 'card' | 'fpx' | 'grabpay';
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  };

  refundAmount?: number;
  refundPercentage?: number;

  location?: {
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    lat: number;
    lng: number;
  };

  review?: BookingReview;
}

interface BookingReview {
  _id: string;
  rating: number;
  content: string;
  photos?: string[];
  createdAt: Date;
  updatedAt: Date;
  hubReply?: {
    content: string;
    createdAt: Date;
  };
}
```

---

## 5. API Endpoints

### 5.1 Backend Endpoints (Already Exist)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/web/bookings/:bookingId` | Get booking details |
| POST | `/api/web/bookings/:bookingId/review` | Submit review |
| PUT | `/api/web/bookings/:bookingId/review` | Update review |
| DELETE | `/api/web/bookings/:bookingId/review` | Delete review |
| POST | `/api/web/bookings/:bookingId/cancel` | Cancel booking |

---

## 6. Data Test IDs Summary

### Page Container
```
data-testid="booking-detail-page"
data-testid="booking-detail-loading"
data-testid="booking-detail-error"
```

### Header
```
data-testid="booking-header"
data-testid="booking-back-btn"
data-testid="booking-header-title"
data-testid="booking-print-btn"
```

### Booking Info
```
data-testid="booking-info"
data-testid="booking-status"
data-testid="booking-datetime"
data-testid="booking-service-title"
data-testid="booking-meta"
```

### Guests/Package
```
data-testid="booking-guests-section"
data-testid="ticket-list"
data-testid="ticket-group-{index}"
data-testid="guest-info-{index}"
data-testid="add-guest-btn"
data-testid="download-tickets-btn"
data-testid="booking-package-section"
data-testid="package-list"
data-testid="booked-by"
```

### Price
```
data-testid="booking-price-section"
data-testid="payment-status"
data-testid="ticket-prices"
data-testid="service-fee"
data-testid="membership-discount"
data-testid="voucher-applied"
data-testid="total-paid"
data-testid="cancellation-policy"
data-testid="refund-details"
data-testid="cancelled-by"
```

### Review
```
data-testid="booking-review-section"
data-testid="review-loading"
data-testid="existing-review"
data-testid="review-actions"
data-testid="edit-review-btn"
data-testid="delete-review-btn"
data-testid="review-rating"
data-testid="star-{n}"
data-testid="review-content"
data-testid="review-photos"
data-testid="hub-reply"
data-testid="hub-reply-content"
data-testid="no-review"
data-testid="leave-review-btn"
```

### Review Dialog
```
data-testid="review-dialog-backdrop"
data-testid="review-dialog"
data-testid="review-dialog-header"
data-testid="review-dialog-close"
data-testid="review-service-info"
data-testid="review-rating-section"
data-testid="review-rating-input"
data-testid="review-content-section"
data-testid="review-content-input"
data-testid="review-photo-section"
data-testid="add-photo-btn"
data-testid="remove-photo-{index}"
data-testid="review-dialog-actions"
data-testid="review-cancel-btn"
data-testid="review-submit-btn"
```

### Location
```
data-testid="booking-location"
data-testid="location-address"
data-testid="location-map"
```

### Actions
```
data-testid="booking-actions"
data-testid="transaction-history-link"
data-testid="cancel-booking-btn"
data-testid="help-center-link"
```

---

## 7. Acceptance Criteria Summary

| Code | Description |
|------|-------------|
| AC-BDP-001 | Page layout with loading/error/content states |
| AC-BDP-002 | Data loading from API |
| AC-BDP-003 | Responsive design |
| AC-BDH-001 | Header structure with back/print buttons |
| AC-BDH-002 | Navigation behavior |
| AC-BDI-001 | Booking information display |
| AC-BDI-002 | Status styling |
| AC-BDG-001 | Guests section (experiences) |
| AC-BDG-002 | Package section (expertise) |
| AC-BDP-001 | Payment breakdown |
| AC-BDP-002 | Cancellation policy |
| AC-BDP-003 | Refund details |
| AC-BDR-001 | Review section container |
| AC-BDR-002 | Review eligibility rules |
| AC-BDR-003 | Review dialog data |
| AC-BDR-004 | Review CRUD actions |
| AC-BDL-001 | Location display with map |
| AC-BDA-001 | Action links |
| AC-BRDL-001 | Review dialog template |
| AC-BRDL-002 | Review validation rules |

**Total: 20 Acceptance Criteria**

---

## 8. Implementation Priority

1. **Phase 1**: Core Page Structure
   - BookingDetailPage container
   - BookingHeader component
   - BookingInfo component
   - Routing setup

2. **Phase 2**: Content Sections
   - BookingGuests component
   - BookingPrice component
   - BookingLocation component

3. **Phase 3**: Review Integration
   - BookingReview component
   - BookingReviewDialogComponent
   - API integration

4. **Phase 4**: Actions & Polish
   - BookingActions component
   - Cancel booking flow
   - PDF receipt download
   - E2E tests

---

_Last updated: 2025-02-25_
