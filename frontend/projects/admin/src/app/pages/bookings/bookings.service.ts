import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Booking types matching backend
export type BookingType = 'experience' | 'expertise' | 'space';
export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'withdrawn' | 'rejected' | 'expired';
export type StripePaymentStatus = 'pending' | 'succeeded' | 'failed' | 'canceled';

// Stats interfaces
export interface BookingStats {
  total: number;
  byType: {
    experience: number;
    expertise: number;
    space: number;
  };
  byStatus: {
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  byPaymentStatus: {
    succeeded: number;
    pending: number;
    failed: number;
    refunded: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    thisWeek: number;
    today: number;
  };
}

// Booking interface
export interface Booking {
  _id: string;
  bookingType: BookingType;
  serviceId: string;
  hubId: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  bookedBy?: {
    _id: string;
    name: string;
    email: string;
    profilePhoto?: string;
  };
  eventId?: {
    _id: string;
    startTime: Date;
    endTime: Date;
  };
  bookingStartDate: Date;
  bookingEndDate: Date;
  timeZone: string;
  learnerDetail: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string;
    attendance: boolean;
    isBooker: boolean;
  }>;
  selectedTickets: Array<{
    id: string;
    numberOfSelectedTickets: number;
    standardRate: number;
    ticketName: string;
    ticketType: string;
  }>;
  totalCost: number;
  currency: string;
  discountAmount?: number;
  platformFee: number;
  stripeFee: number;
  transferAmount: number;
  status: BookingStatus;
  stripeStatus: StripePaymentStatus;
  stripePaymentIntentId?: string;
  isRefunded: boolean;
  refundAmount?: number;
  serviceName?: string;
  serviceSlug?: string;
  serviceCoverPhoto?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Calendar event interface
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  bookingType: BookingType;
  status: BookingStatus;
  totalCost: number;
  currency: string;
  learnerCount: number;
  serviceName?: string;
  hubName?: string;
}

// Monthly trend interface
export interface MonthlyTrend {
  year: number;
  month: number;
  count: number;
  revenue: number;
}

// Top service interface
export interface TopService {
  serviceId: string;
  serviceName: string;
  bookingType: string;
  count: number;
  revenue: number;
}

// List params
export interface ListBookingsParams {
  page?: number;
  limit?: number;
  bookingType?: BookingType;
  status?: BookingStatus;
  stripeStatus?: StripePaymentStatus;
  startDate?: string;
  endDate?: string;
  hubId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  bookings: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class BookingsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/admin/bookings`;

  /**
   * Get booking statistics
   */
  getStats(): Observable<ApiResponse<BookingStats>> {
    return this.http.get<ApiResponse<BookingStats>>(`${this.baseUrl}/stats`);
  }

  /**
   * List bookings with pagination and filters
   */
  listBookings(params: ListBookingsParams = {}): Observable<ApiResponse<PaginatedResponse<Booking>>> {
    let httpParams = new HttpParams();

    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.bookingType) httpParams = httpParams.set('bookingType', params.bookingType);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.stripeStatus) httpParams = httpParams.set('stripeStatus', params.stripeStatus);
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params.hubId) httpParams = httpParams.set('hubId', params.hubId);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.http.get<ApiResponse<PaginatedResponse<Booking>>>(this.baseUrl, { params: httpParams });
  }

  /**
   * Get booking by ID
   */
  getBooking(id: string): Observable<ApiResponse<Booking>> {
    return this.http.get<ApiResponse<Booking>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get calendar events
   */
  getCalendarEvents(startDate: Date, endDate: Date, bookingType?: BookingType): Observable<ApiResponse<CalendarEvent[]>> {
    let httpParams = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    if (bookingType) {
      httpParams = httpParams.set('bookingType', bookingType);
    }

    return this.http.get<ApiResponse<CalendarEvent[]>>(`${this.baseUrl}/calendar`, { params: httpParams });
  }

  /**
   * Get monthly trends
   */
  getMonthlyTrends(months: number = 12): Observable<ApiResponse<MonthlyTrend[]>> {
    const params = new HttpParams().set('months', months.toString());
    return this.http.get<ApiResponse<MonthlyTrend[]>>(`${this.baseUrl}/trends`, { params });
  }

  /**
   * Get top services
   */
  getTopServices(limit: number = 10): Observable<ApiResponse<TopService[]>> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ApiResponse<TopService[]>>(`${this.baseUrl}/top-services`, { params });
  }
}
