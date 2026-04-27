import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';

// ============================================================================
// Types
// ============================================================================

export type CalendarEventType = 'experience' | 'expertise';
export type BookingStatus = 'no-bookings' | 'partially-booked' | 'mostly-booked' | 'fully-booked';
export type CalendarView = 'month' | 'week';
export type EventTypeFilter = 'all' | 'experience' | 'expertise';

/**
 * Calendar event summary for list view
 */
export interface CalendarEventSummary {
  id: string;
  title: string;
  type: CalendarEventType;
  startTime: string;
  endTime: string;
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  maxCapacity: number;
  bookingStatus: BookingStatus;
  status: string;
}

/**
 * Learner info for booking details
 */
export interface CalendarLearner {
  name: string;
  email: string;
  phone?: string;
}

/**
 * Ticket detail for booking
 */
export interface CalendarTicketDetail {
  ticketName: string;
  quantity: number;
  price: number;
}

/**
 * Booking summary for event details
 */
export interface CalendarBookingSummary {
  id: string;
  learner: CalendarLearner;
  ticketDetails: CalendarTicketDetail[];
  totalCost: number;
  status: string;
  createdAt: string;
}

/**
 * Event statistics
 */
export interface CalendarEventStats {
  totalBookings: number;
  totalLearners: number;
  totalRevenue: number;
  attendanceCount?: number;
}

/**
 * Calendar event detail response
 */
export interface CalendarEventDetail {
  event: CalendarEventSummary & {
    experienceType?: string;
    expertiseMode?: string;
    location?: {
      address?: string;
      city?: string;
      country?: string;
    };
    coverPhoto?: string;
    hostDetails?: Array<{
      fullName?: string;
      profileUrl?: string;
    }>;
    tickets?: Array<{
      id: string;
      ticketName: string;
      ticketPrice: number;
      ticketQty: number;
    }>;
    host?: {
      name?: string;
      profileUrl?: string;
    };
    ticket?: {
      ticketName: string;
      standardRate: number;
      sessionDuration?: number;
    };
  };
  bookings: CalendarBookingSummary[];
  stats: CalendarEventStats;
}

/**
 * Calendar events response
 */
export interface CalendarEventsResponse {
  events: CalendarEventSummary[];
  meta: {
    startDate: string;
    endDate: string;
    totalEvents: number;
    experienceCount: number;
    expertiseCount: number;
  };
}

/**
 * Calendar date events response
 */
export interface CalendarDateEventsResponse {
  date: string;
  events: CalendarEventSummary[];
  totalEvents: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Hub Calendar Service
// ============================================================================

/**
 * Hub Calendar Service - Handles calendar data with signal-based state
 */
@Injectable({ providedIn: 'root' })
export class HubCalendarService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  // Base URL pattern: /hub/:hubId/calendar
  private getApiUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/calendar`;
  }

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _events = signal<CalendarEventSummary[]>([]);
  private readonly _selectedDateEvents = signal<CalendarEventSummary[]>([]);
  private readonly _selectedEventDetail = signal<CalendarEventDetail | null>(null);
  private readonly _loading = signal(false);
  private readonly _loadingDetail = signal(false);
  private readonly _error = signal<string | null>(null);

  // View state
  private readonly _currentDate = signal(new Date());
  private readonly _selectedDate = signal<Date | null>(null);
  private readonly _viewMode = signal<CalendarView>('month');
  private readonly _eventTypeFilter = signal<EventTypeFilter>('all');

  // Meta
  private readonly _meta = signal<CalendarEventsResponse['meta'] | null>(null);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly events = this._events.asReadonly();
  readonly selectedDateEvents = this._selectedDateEvents.asReadonly();
  readonly selectedEventDetail = this._selectedEventDetail.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingDetail = this._loadingDetail.asReadonly();
  readonly error = this._error.asReadonly();

  readonly currentDate = this._currentDate.asReadonly();
  readonly selectedDate = this._selectedDate.asReadonly();
  readonly viewMode = this._viewMode.asReadonly();
  readonly eventTypeFilter = this._eventTypeFilter.asReadonly();
  readonly meta = this._meta.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly currentMonth = computed(() => this._currentDate().getMonth());
  readonly currentYear = computed(() => this._currentDate().getFullYear());

  readonly experienceEvents = computed(() =>
    this._events().filter((e) => e.type === 'experience')
  );

  readonly expertiseEvents = computed(() =>
    this._events().filter((e) => e.type === 'expertise')
  );

  readonly filteredEvents = computed(() => {
    const filter = this._eventTypeFilter();
    if (filter === 'all') return this._events();
    return this._events().filter((e) => e.type === filter);
  });

  readonly todayEvents = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this._events().filter((e) => {
      const eventDate = new Date(e.startTime);
      return eventDate >= today && eventDate < tomorrow;
    });
  });

  // ============================================================================
  // Public Methods - View State
  // ============================================================================

  setCurrentDate(date: Date): void {
    this._currentDate.set(date);
  }

  setSelectedDate(date: Date | null): void {
    this._selectedDate.set(date);
    if (date) {
      this.loadEventsByDate(date);
    } else {
      this._selectedDateEvents.set([]);
    }
  }

  setViewMode(mode: CalendarView): void {
    this._viewMode.set(mode);
  }

  setEventTypeFilter(filter: EventTypeFilter): void {
    this._eventTypeFilter.set(filter);
  }

  previousMonth(): void {
    this._currentDate.update((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1));
  }

  nextMonth(): void {
    this._currentDate.update((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1));
  }

  // ============================================================================
  // Public Methods - Data Fetching
  // ============================================================================

  /**
   * Load calendar events for the current month/week view
   */
  async loadCalendarEvents(): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return;
    }

    const currentDate = this._currentDate();
    const viewMode = this._viewMode();

    // Calculate date range based on view mode
    let startDate: Date;
    let endDate: Date;

    if (viewMode === 'month') {
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else {
      // Week view
      const dayOfWeek = currentDate.getDay();
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - dayOfWeek);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    }

    await this.fetchEvents(hubId, startDate, endDate);
  }

  /**
   * Load events for a specific date
   */
  async loadEventsByDate(date: Date): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return;

    try {
      const dateStr = this.formatDate(date);
      const filter = this._eventTypeFilter();

      let params = new HttpParams();
      if (filter !== 'all') {
        params = params.set('type', filter);
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<CalendarDateEventsResponse>>(
          `${this.getApiUrl(hubId)}/date/${dateStr}`,
          { params, withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._selectedDateEvents.set(response.data.events);
      }
    } catch (error) {
      console.error('Failed to fetch events for date:', error);
    }
  }

  /**
   * Load detailed event information with bookings
   */
  async loadEventDetail(eventId: string, eventType: CalendarEventType): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return;

    this._loadingDetail.set(true);

    try {
      const params = new HttpParams().set('type', eventType);

      const response = await firstValueFrom(
        this.http.get<ApiResponse<CalendarEventDetail>>(
          `${this.getApiUrl(hubId)}/event/${eventId}`,
          { params, withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._selectedEventDetail.set(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch event detail:', error);
    } finally {
      this._loadingDetail.set(false);
    }
  }

  /**
   * Clear selected event detail
   */
  clearEventDetail(): void {
    this._selectedEventDetail.set(null);
  }

  /**
   * Refresh calendar data
   */
  async refresh(): Promise<void> {
    await this.loadCalendarEvents();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async fetchEvents(hubId: string, startDate: Date, endDate: Date): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const params = new HttpParams()
        .set('startDate', this.formatDate(startDate))
        .set('endDate', this.formatDate(endDate))
        .set('view', this._viewMode())
        .set('type', this._eventTypeFilter());

      const response = await firstValueFrom(
        this.http.get<ApiResponse<CalendarEventsResponse>>(
          `${this.getApiUrl(hubId)}/events`,
          { params, withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._events.set(response.data.events);
        this._meta.set(response.data.meta);
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      this._error.set('Failed to load calendar events');
    } finally {
      this._loading.set(false);
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if a date has events
   */
  hasEventsOnDate(date: Date): boolean {
    const dateStr = this.formatDate(date);
    return this._events().some((e) => {
      const eventDate = this.formatDate(new Date(e.startTime));
      return eventDate === dateStr;
    });
  }

  /**
   * Get events for a specific date from cached events
   */
  getEventsForDate(date: Date): CalendarEventSummary[] {
    const dateStr = this.formatDate(date);
    const filter = this._eventTypeFilter();

    return this._events().filter((e) => {
      const eventDate = this.formatDate(new Date(e.startTime));
      const matchesDate = eventDate === dateStr;
      const matchesFilter = filter === 'all' || e.type === filter;
      return matchesDate && matchesFilter;
    });
  }

  /**
   * Get CSS class for booking status
   */
  getBookingStatusClass(status: BookingStatus): string {
    switch (status) {
      case 'no-bookings':
        return 'bg-neutral-100 text-neutral-600';
      case 'partially-booked':
        return 'bg-yellow-100 text-yellow-800';
      case 'mostly-booked':
        return 'bg-orange-100 text-orange-800';
      case 'fully-booked':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  }

  /**
   * Get CSS class for event type
   */
  getEventTypeClass(type: CalendarEventType): string {
    switch (type) {
      case 'experience':
        return 'bg-blue-100 text-blue-800';
      case 'expertise':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  /**
   * Get dot color for calendar
   */
  getEventDotColor(type: CalendarEventType): string {
    return type === 'experience' ? 'bg-blue-500' : 'bg-purple-500';
  }

  /**
   * Format time from ISO string
   */
  formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
