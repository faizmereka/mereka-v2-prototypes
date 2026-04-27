import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../shared/ui';
import { BookingsService, type Booking, type BookingStats, type BookingType, type BookingStatus, type StripePaymentStatus } from './bookings.service';

@Component({
  selector: 'app-bookings-list',
  imports: [FormsModule, DatePipe, RouterLink, CardComponent],
  templateUrl: './bookings-list.component.html',
  styleUrl: './bookings-list.component.scss'
})
export class BookingsListComponent implements OnInit {
  private bookingsService = inject(BookingsService);

  // Loading and error states
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Stats
  stats = signal<BookingStats | null>(null);

  // Bookings list
  bookings = signal<Booking[]>([]);
  totalBookings = signal(0);
  currentPage = signal(1);
  pageSize = signal(20);
  totalPages = signal(0);

  // Filters
  searchQuery = signal('');
  bookingTypeFilter = signal<BookingType | ''>('');
  statusFilter = signal<BookingStatus | ''>('');
  paymentFilter = signal<StripePaymentStatus | ''>('');
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Computed
  pageStart = computed(() => (this.currentPage() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.currentPage() * this.pageSize(), this.totalBookings()));

  ngOnInit() {
    this.loadStats();
    this.loadBookings();
  }

  loadStats() {
    this.bookingsService.getStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.stats.set(response.data);
        }
      },
      error: (err) => {
        console.error('Error loading stats:', err);
      }
    });
  }

  loadBookings() {
    this.isLoading.set(true);
    this.error.set(null);

    const params = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery() || undefined,
      bookingType: this.bookingTypeFilter() || undefined,
      status: this.statusFilter() || undefined,
      stripeStatus: this.paymentFilter() || undefined,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    };

    this.bookingsService.listBookings(params).subscribe({
      next: (response) => {
        if (response.success) {
          this.bookings.set(response.data.bookings);
          this.totalBookings.set(response.data.total);
          this.totalPages.set(response.data.totalPages);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
        this.error.set('Failed to load bookings');
        this.isLoading.set(false);
      }
    });
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadBookings();
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadBookings();
  }

  onSortChange(field: string) {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('desc');
    }
    this.loadBookings();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadBookings();
    }
  }

  previousPage() {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage() {
    this.goToPage(this.currentPage() + 1);
  }

  getStatusClass(status: BookingStatus): string {
    const classes: Record<BookingStatus, string> = {
      pending: 'bg-orange-100 text-orange-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      withdrawn: 'bg-gray-100 text-gray-700',
      rejected: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-500',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getPaymentStatusClass(status: StripePaymentStatus): string {
    const classes: Record<StripePaymentStatus, string> = {
      succeeded: 'bg-green-100 text-green-700',
      pending: 'bg-orange-100 text-orange-700',
      failed: 'bg-red-100 text-red-700',
      canceled: 'bg-gray-100 text-gray-500',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getBookingTypeLabel(type: BookingType): string {
    const labels: Record<BookingType, string> = {
      experience: 'Experience',
      expertise: 'Expertise',
      space: 'Space',
    };
    return labels[type] || type;
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency || 'MYR',
    }).format(amount);
  }
}
