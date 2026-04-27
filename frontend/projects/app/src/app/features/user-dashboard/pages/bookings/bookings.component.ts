import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  UserBookingService,
  type ServiceType,
  type BookingStatus,
  type UserBooking,
} from '../../services/user-booking.service';

@Component({
  selector: 'app-user-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe, TitleCasePipe],
  templateUrl: './bookings.component.html',
})
export class UserBookingsComponent implements OnInit {
  private readonly bookingService = inject(UserBookingService);
  private readonly router = inject(Router);

  // Service signals exposed to template
  readonly loading = this.bookingService.loading;
  readonly error = this.bookingService.error;
  readonly filteredBookings = this.bookingService.bookings;
  readonly selectedServiceType = this.bookingService.serviceType;
  readonly selectedTab = this.bookingService.statusFilter;
  readonly currentStatusTabs = this.bookingService.statusTabs;

  // Local UI state
  private readonly mobileFilterOpen = signal(false);

  readonly serviceTypes: ServiceType[] = ['experience', 'space', 'expertise'];

  ngOnInit(): void {
    void this.bookingService.loadBookings();
  }

  setServiceType(type: ServiceType): void {
    this.bookingService.setServiceType(type);
  }

  setTab(tab: BookingStatus): void {
    this.bookingService.setStatusFilter(tab);
  }

  toggleMobileFilter(): void {
    this.mobileFilterOpen.update((v) => !v);
  }

  isMobileFilterOpen(): boolean {
    return this.mobileFilterOpen();
  }

  getServiceTypeLabel(type: ServiceType): string {
    return this.bookingService.getServiceTypeLabel(type);
  }

  getStatusClass(status: BookingStatus): string {
    return this.bookingService.getStatusClass(status);
  }

  viewReservation(booking: UserBooking): void {
    void this.router.navigate(['/dashboard/bookings', booking.id]);
  }

  addReview(booking: UserBooking): void {
    // Navigate to booking detail with review action
    void this.router.navigate(['/dashboard/bookings', booking.id], {
      queryParams: { action: 'review' },
    });
  }

  editReview(booking: UserBooking): void {
    // Navigate to booking detail with edit review action
    void this.router.navigate(['/dashboard/bookings', booking.id], {
      queryParams: { action: 'edit-review' },
    });
  }

  async cancelBooking(booking: UserBooking): Promise<void> {
    const reason = prompt('Please enter the reason for cancellation:');
    if (!reason) {
      return;
    }

    const success = await this.bookingService.cancelBooking(booking.id, reason);
    if (success) {
      alert('Booking cancelled successfully');
    } else {
      alert('Failed to cancel booking');
    }
  }
}
