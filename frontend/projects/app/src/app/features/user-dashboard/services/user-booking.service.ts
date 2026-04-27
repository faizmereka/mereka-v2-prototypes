import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export type ServiceType = 'experience' | 'space' | 'expertise';
export type BookingStatus = 'upcoming' | 'past' | 'cancelled' | 'pending' | 'rejected';

export interface Ticket {
  name: string;
  quantity: number;
  duration?: string;
}

export interface UserBooking {
  id: string;
  serviceType: ServiceType;
  serviceName: string;
  serviceSlug?: string;
  hubId: string;
  hubName: string;
  hostName?: string;
  location: string;
  locationType: 'Online' | 'Physical';
  bookingDate: string;
  bookingTime: string;
  timezone: string;
  tickets: Ticket[];
  totalPaid: number;
  currency: string;
  status: BookingStatus;
  cancelledBy?: 'learner' | 'hub';
  cancellationReason?: string;
  rating?: number;
  hasReview?: boolean;
  createdAt: string;
}

export interface BookingPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: BookingPagination;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// User Booking Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class UserBookingService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/me/bookings`;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _bookings = signal<UserBooking[]>([]);
  private readonly _pagination = signal<BookingPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _serviceType = signal<ServiceType>('experience');
  private readonly _statusFilter = signal<BookingStatus>('upcoming');

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly bookings = this._bookings.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly serviceType = this._serviceType.asReadonly();
  readonly statusFilter = this._statusFilter.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly hasBookings = computed(() => this._bookings().length > 0);
  readonly totalBookings = computed(() => this._pagination().total);

  // Status tabs based on service type
  readonly statusTabs = computed(() => {
    return this._serviceType() === 'expertise'
      ? ['upcoming', 'pending', 'past', 'cancelled', 'rejected'] as BookingStatus[]
      : ['upcoming', 'past', 'cancelled'] as BookingStatus[];
  });

  // ============================================================================
  // Filter Methods
  // ============================================================================

  setServiceType(type: ServiceType): void {
    this._serviceType.set(type);
    // Reset to first available tab for the service type
    const tabs = type === 'expertise'
      ? ['upcoming', 'pending', 'past', 'cancelled', 'rejected']
      : ['upcoming', 'past', 'cancelled'];
    this._statusFilter.set(tabs[0] as BookingStatus);
    this._pagination.update((p) => ({ ...p, page: 1 }));
    void this.loadBookings();
  }

  setStatusFilter(status: BookingStatus): void {
    this._statusFilter.set(status);
    this._pagination.update((p) => ({ ...p, page: 1 }));
    void this.loadBookings();
  }

  // ============================================================================
  // Data Fetching
  // ============================================================================

  async loadBookings(): Promise<void> {
    if (this._loading()) {
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const params = new HttpParams()
        .set('serviceType', this._serviceType())
        .set('status', this._statusFilter())
        .set('page', this._pagination().page.toString())
        .set('limit', this._pagination().limit.toString());

      const response = await firstValueFrom(
        this.http.get<ApiResponse<UserBooking[]>>(this.apiUrl, {
          params,
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._bookings.set(response.data);
        if (response.meta) {
          this._pagination.set(response.meta);
        }
      } else {
        this._error.set(response.error?.message ?? 'Failed to load bookings');
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      this._error.set('Failed to load bookings');
    } finally {
      this._loading.set(false);
    }
  }

  async loadNextPage(): Promise<void> {
    const pagination = this._pagination();
    if (pagination.page >= pagination.totalPages) {
      return;
    }
    this._pagination.update((p) => ({ ...p, page: p.page + 1 }));
    await this.loadBookings();
  }

  // ============================================================================
  // Cancel Booking
  // ============================================================================

  async cancelBooking(bookingId: string, reason: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ success: boolean }>>(
          `${this.apiUrl}/${bookingId}/cancel`,
          { reason },
          { withCredentials: true }
        )
      );

      if (response.success) {
        // Reload bookings after cancellation
        await this.loadBookings();
        return true;
      }

      this._error.set(response.error?.message ?? 'Failed to cancel booking');
      return false;
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      this._error.set('Failed to cancel booking');
      return false;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  getServiceTypeLabel(type: ServiceType): string {
    switch (type) {
      case 'experience':
        return 'Experiences';
      case 'space':
        return 'Spaces';
      case 'expertise':
        return 'Expertise';
    }
  }

  getStatusClass(status: BookingStatus): string {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'past':
        return 'bg-neutral-100 text-neutral-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
    }
  }
}
