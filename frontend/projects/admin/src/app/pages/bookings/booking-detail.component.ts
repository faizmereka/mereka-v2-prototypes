import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardComponent } from '../../shared/ui';
import { BookingsService, type Booking } from './bookings.service';

@Component({
  selector: 'app-booking-detail',
  imports: [DatePipe, TitleCasePipe, CardComponent],
  templateUrl: './booking-detail.component.html',
  styleUrl: './booking-detail.component.scss'
})
export class BookingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookingsService = inject(BookingsService);

  booking = signal<Booking | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBooking(id);
    } else {
      this.error.set('Booking ID not provided');
      this.isLoading.set(false);
    }
  }

  loadBooking(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.bookingsService.getBooking(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.booking.set(response.data);
        } else {
          this.error.set(response.error?.message || 'Failed to load booking');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading booking:', err);
        this.error.set('Failed to load booking');
        this.isLoading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/bookings']);
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      withdrawn: 'bg-gray-100 text-gray-700',
      rejected: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getPaymentStatusClass(status: string): string {
    const classes: Record<string, string> = {
      succeeded: 'bg-green-100 text-green-700',
      pending: 'bg-orange-100 text-orange-700',
      failed: 'bg-red-100 text-red-700',
      canceled: 'bg-gray-100 text-gray-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency || 'MYR',
    }).format(amount);
  }

  formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  getBookingTypeBadgeClass(type: string): string {
    const classes: Record<string, string> = {
      experience: 'bg-purple-100 text-purple-700',
      expertise: 'bg-blue-100 text-blue-700',
      space: 'bg-green-100 text-green-700',
    };
    return classes[type] || 'bg-gray-100 text-gray-700';
  }
}
