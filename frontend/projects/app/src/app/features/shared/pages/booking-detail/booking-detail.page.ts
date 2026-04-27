import { Component, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingDetailService, type BookingDetail, type BookingViewMode } from './booking-detail.service';
import { BookingHeaderComponent } from './components/booking-header.component';
import { BookingInfoComponent } from './components/booking-info.component';
import { BookingGuestsComponent } from './components/booking-guests.component';
import { BookingPriceComponent } from './components/booking-price.component';
import { BookingReviewComponent } from './components/booking-review.component';
import { BookingLocationComponent } from './components/booking-location.component';
import { BookingActionsComponent } from './components/booking-actions.component';
import { AuthStateService } from '../../../../core/services/auth-state.service';

@Component({
  selector: 'app-booking-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BookingHeaderComponent,
    BookingInfoComponent,
    BookingGuestsComponent,
    BookingPriceComponent,
    BookingReviewComponent,
    BookingLocationComponent,
    BookingActionsComponent,
  ],
  template: `
    <div class="min-h-screen bg-neutral-50" data-testid="booking-detail-page">
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex items-center justify-center min-h-[400px]" data-testid="booking-detail-loading">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p class="text-neutral-600">Loading booking details...</p>
          </div>
        </div>
      }

      <!-- Error State -->
      @else if (error()) {
        <div class="flex items-center justify-center min-h-[400px]" data-testid="booking-detail-error">
          <div class="text-center max-w-md mx-auto px-4">
            <div class="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-neutral-900 mb-2">Error Loading Booking</h2>
            <p class="text-neutral-600 mb-4">{{ error() }}</p>
            <button
              (click)="retry()"
              class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      }

      <!-- Content -->
      @else if (booking()) {
        <app-booking-header
          [booking]="booking()!"
          [mode]="mode()"
          (goBack)="onGoBack()"
          (print)="onPrint()"
          data-testid="booking-header"
        />

        <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <app-booking-info
            [booking]="booking()!"
            [mode]="mode()"
            data-testid="booking-info-section"
          />

          <app-booking-guests
            [booking]="booking()!"
            data-testid="booking-guests-section"
          />

          <app-booking-price
            [booking]="booking()!"
            [mode]="mode()"
            data-testid="booking-price-section"
          />

          <app-booking-review
            [booking]="booking()!"
            [mode]="mode()"
            [canReview]="canLeaveReview()"
            (reviewSubmitted)="onReviewSubmitted()"
            data-testid="booking-review-section"
          />

          @if (booking()!.location && booking()!.experienceType === 'Physical') {
            <app-booking-location
              [location]="booking()!.location!"
              data-testid="booking-location-section"
            />
          }

          <app-booking-actions
            [booking]="booking()!"
            [mode]="mode()"
            [canCancel]="canCancelBooking()"
            (cancel)="onCancelBooking()"
            data-testid="booking-actions-section"
          />
        </div>
      }
    </div>
  `,
})
export class BookingDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingDetailService);
  private readonly authState = inject(AuthStateService);

  readonly isLoading = this.bookingService.loading;
  readonly error = this.bookingService.error;
  readonly booking = this.bookingService.booking;
  readonly mode = this.bookingService.mode;

  // Check if user can leave a review (learner mode only)
  readonly canLeaveReview = computed(() => {
    const b = this.booking();
    const m = this.mode();
    if (!b || m !== 'learner') return false;

    // Can review if: past booking, not cancelled, no existing review
    const isPast = new Date(b.bookingEndDate) < new Date();
    const notCancelled = b.status !== 'cancelled';
    const noReview = !b.review;

    return isPast && notCancelled && noReview;
  });

  // Check if booking can be cancelled
  readonly canCancelBooking = computed(() => {
    const b = this.booking();
    if (!b) return false;

    // Can cancel if: upcoming, not already cancelled
    const isUpcoming = new Date(b.bookingStartDate) > new Date();
    const notCancelled = b.status !== 'cancelled';

    return isUpcoming && notCancelled;
  });

  ngOnInit(): void {
    const bookingId = this.route.snapshot.paramMap.get('bookingId');
    const routeData = this.route.snapshot.data;

    // Determine mode from route data (set in route config)
    const mode: BookingViewMode = routeData['mode'] ?? 'learner';
    const hubId = this.authState.selectedHub()?.id;

    // Set mode in service
    this.bookingService.setMode(mode, hubId ?? undefined);

    if (bookingId) {
      void this.bookingService.loadBooking(bookingId);
    } else {
      this.bookingService.setError('No booking ID provided');
    }
  }

  ngOnDestroy(): void {
    this.bookingService.reset();
  }

  retry(): void {
    const bookingId = this.route.snapshot.paramMap.get('bookingId');
    if (bookingId) {
      void this.bookingService.loadBooking(bookingId);
    }
  }

  onGoBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Navigate to appropriate bookings list based on mode
      const m = this.mode();
      if (m === 'hub') {
        this.router.navigate(['/hub/bookings']);
      } else {
        this.router.navigate(['/dashboard/bookings']);
      }
    }
  }

  onPrint(): void {
    window.print();
  }

  onReviewSubmitted(): void {
    // Reload booking to get updated review
    const bookingId = this.route.snapshot.paramMap.get('bookingId');
    if (bookingId) {
      void this.bookingService.loadBooking(bookingId);
    }
  }

  onCancelBooking(): void {
    // Handled by booking-actions component
  }
}
