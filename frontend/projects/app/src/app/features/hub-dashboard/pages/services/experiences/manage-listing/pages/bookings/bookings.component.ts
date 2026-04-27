import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  ExperienceApiService,
  type ExperienceBooking,
} from '../../../../../../../onboarding/experience/services/experience-api.service';

type BookingFilter = 'upcoming' | 'past' | 'cancelled' | 'all';

interface BookingDisplay {
  id: string;
  bookerName: string;
  bookerEmail: string;
  date: Date;
  ticketCount: number;
  ticketSummary: string;
  amount: number;
  currency: string;
  isFree: boolean;
  status: string;
  learners: Array<{
    name: string;
    email: string;
    ticketName?: string;
  }>;
}

@Component({
  selector: 'app-manage-experience-bookings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bookings.component.html',
})
export class ManageExperienceBookingsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly experienceApi = inject(ExperienceApiService);

  readonly filter = signal<BookingFilter>('upcoming');
  readonly bookings = signal<BookingDisplay[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPages = signal(0);

  private experienceId = '';
  private eventId: string | null = null;

  ngOnInit(): void {
    // Get experienceId from parent route
    this.experienceId = this.route.parent?.snapshot.paramMap.get('experienceId') || '';

    // Get optional eventId from query params (for filtering by session)
    this.route.queryParams.subscribe((params) => {
      this.eventId = params['eventId'] || null;
      this.loadBookings();
    });
  }

  async loadBookings(): Promise<void> {
    if (!this.experienceId) return;

    this.loading.set(true);
    try {
      const response = await this.experienceApi.getBookings(this.experienceId, {
        eventId: this.eventId || undefined,
        status: this.filter(),
        page: this.page(),
        limit: 20,
      });

      // Map API response to display format
      const displayBookings = response.bookings.map((b) => this.mapToDisplay(b));
      this.bookings.set(displayBookings);
      this.total.set(response.total);
      this.totalPages.set(response.totalPages);
    } catch (error) {
      console.error('Error loading bookings:', error);
      this.bookings.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private mapToDisplay(booking: ExperienceBooking): BookingDisplay {
    // Create ticket summary from learners' tickets
    const ticketNames = [...new Set(booking.learners.map((l) => l.ticketName).filter(Boolean))];
    const ticketSummary = ticketNames.length > 0 ? ticketNames.join(', ') : `${booking.ticketCount} ticket(s)`;

    return {
      id: booking._id,
      bookerName: booking.bookerName,
      bookerEmail: booking.bookerEmail,
      date: new Date(booking.bookingStartDate),
      ticketCount: booking.ticketCount,
      ticketSummary,
      amount: booking.totalCost,
      currency: booking.currency,
      isFree: booking.isFree,
      status: booking.status,
      learners: booking.learners,
    };
  }

  setFilter(filter: BookingFilter): void {
    this.filter.set(filter);
    this.page.set(1);
    this.loadBookings();
  }

  clearEventFilter(): void {
    this.eventId = null;
    this.loadBookings();
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.loadBookings();
    }
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.loadBookings();
    }
  }

  getFilterTitle(): string {
    let title = '';
    switch (this.filter()) {
      case 'upcoming':
        title = 'Upcoming Bookings';
        break;
      case 'past':
        title = 'Past Bookings';
        break;
      case 'cancelled':
        title = 'Cancelled Bookings';
        break;
      default:
        title = 'All Bookings';
    }
    if (this.eventId) {
      title += ' (Session Filtered)';
    }
    return title;
  }

  getEmptyMessage(): string {
    switch (this.filter()) {
      case 'upcoming':
        return 'No upcoming bookings';
      case 'past':
        return 'No past bookings';
      case 'cancelled':
        return 'No cancelled bookings';
      default:
        return 'No bookings';
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-MY', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
  }

  formatAmount(amount: number, currency: string, isFree: boolean): string {
    if (isFree || amount === 0) return 'Free';
    return `${currency} ${amount.toFixed(2)}`;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'withdrawn':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  hasEventFilter(): boolean {
    return !!this.eventId;
  }

  getShowingEnd(): number {
    return Math.min(this.page() * 20, this.total());
  }
}
