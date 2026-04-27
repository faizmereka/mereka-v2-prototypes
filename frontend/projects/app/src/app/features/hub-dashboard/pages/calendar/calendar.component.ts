import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HubCalendarService,
  type CalendarEventSummary,
  type CalendarEventType,
  type EventTypeFilter,
  type BookingStatus,
} from '../../services';

interface CalendarDay {
  date: number;
  isCurrentMonth: boolean;
  fullDate: Date;
  events: CalendarEventSummary[];
}

@Component({
  selector: 'app-hub-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
})
export class HubCalendarComponent implements OnInit {
  private readonly calendarService = inject(HubCalendarService);

  // View state
  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Service signals
  readonly loading = this.calendarService.loading;
  readonly error = this.calendarService.error;
  readonly events = this.calendarService.events;
  readonly selectedDate = this.calendarService.selectedDate;
  readonly selectedDateEvents = this.calendarService.selectedDateEvents;
  readonly selectedEventDetail = this.calendarService.selectedEventDetail;
  readonly loadingDetail = this.calendarService.loadingDetail;
  readonly eventTypeFilter = this.calendarService.eventTypeFilter;
  readonly meta = this.calendarService.meta;
  readonly todayEvents = this.calendarService.todayEvents;

  // Local state
  readonly showEventDetail = signal(false);

  // Computed values
  readonly currentMonth = computed(() => this.calendarService.currentDate().getMonth());
  readonly currentYear = computed(() => this.calendarService.currentDate().getFullYear());
  readonly monthName = computed(() => this.months[this.currentMonth()]);

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    const allEvents = this.events();

    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const fullDate = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: prevMonthLastDay - i,
        isCurrentMonth: false,
        fullDate,
        events: this.getEventsForDate(fullDate, allEvents),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const fullDate = new Date(year, month, i);
      days.push({
        date: i,
        isCurrentMonth: true,
        fullDate,
        events: this.getEventsForDate(fullDate, allEvents),
      });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const fullDate = new Date(year, month + 1, i);
      days.push({
        date: i,
        isCurrentMonth: false,
        fullDate,
        events: this.getEventsForDate(fullDate, allEvents),
      });
    }

    return days;
  });

  constructor() {
    // Reload events when month changes
    effect(() => {
      const month = this.currentMonth();
      const year = this.currentYear();
      // Trigger reload
      void this.calendarService.loadCalendarEvents();
    });
  }

  async ngOnInit(): Promise<void> {
    await this.calendarService.loadCalendarEvents();
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  previousMonth(): void {
    this.calendarService.previousMonth();
  }

  nextMonth(): void {
    this.calendarService.nextMonth();
  }

  goToToday(): void {
    this.calendarService.setCurrentDate(new Date());
  }

  // ============================================================================
  // Date Selection
  // ============================================================================

  selectDate(date: Date): void {
    this.calendarService.setSelectedDate(date);
    this.showEventDetail.set(false);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  isSelected(date: Date): boolean {
    const selected = this.selectedDate();
    if (!selected) return false;
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  }

  // ============================================================================
  // Filters
  // ============================================================================

  setFilter(filter: EventTypeFilter): void {
    this.calendarService.setEventTypeFilter(filter);
    void this.calendarService.loadCalendarEvents();
  }

  // ============================================================================
  // Event Selection
  // ============================================================================

  async selectEvent(event: CalendarEventSummary): Promise<void> {
    this.showEventDetail.set(true);
    await this.calendarService.loadEventDetail(event.id, event.type);
  }

  closeEventDetail(): void {
    this.showEventDetail.set(false);
    this.calendarService.clearEventDetail();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private getEventsForDate(date: Date, allEvents: CalendarEventSummary[]): CalendarEventSummary[] {
    const dateStr = this.formatDateStr(date);
    const filter = this.eventTypeFilter();

    return allEvents.filter((e) => {
      const eventDate = this.formatDateStr(new Date(e.startTime));
      const matchesDate = eventDate === dateStr;
      const matchesFilter = filter === 'all' || e.type === filter;
      return matchesDate && matchesFilter;
    });
  }

  private formatDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  getEventTypeClass(type: CalendarEventType): string {
    return type === 'experience'
      ? 'bg-blue-100 text-blue-800 border-l-blue-500'
      : 'bg-purple-100 text-purple-800 border-l-purple-500';
  }

  getEventDotClass(type: CalendarEventType): string {
    return type === 'experience' ? 'bg-blue-500' : 'bg-purple-500';
  }

  getBookingStatusClass(status: BookingStatus): string {
    switch (status) {
      case 'no-bookings':
        return 'border-l-neutral-400';
      case 'partially-booked':
        return 'border-l-yellow-500';
      case 'mostly-booked':
        return 'border-l-orange-500';
      case 'fully-booked':
        return 'border-l-green-500';
      default:
        return 'border-l-neutral-400';
    }
  }

  getBookingStatusBadgeClass(status: BookingStatus): string {
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

  getBookingStatusLabel(status: BookingStatus): string {
    switch (status) {
      case 'no-bookings':
        return 'No bookings';
      case 'partially-booked':
        return 'Partial';
      case 'mostly-booked':
        return 'Mostly booked';
      case 'fully-booked':
        return 'Full';
      default:
        return status;
    }
  }

  trackByEventId(index: number, event: CalendarEventSummary): string {
    return event.id;
  }

  trackByDay(index: number, day: CalendarDay): number {
    return day.fullDate.getTime();
  }
}
