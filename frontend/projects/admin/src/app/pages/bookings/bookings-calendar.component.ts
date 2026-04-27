import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CardComponent } from '../../shared/ui';
import { BookingsService, type CalendarEvent, type BookingStatus } from './bookings.service';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  bookings: CalendarEvent[];
}

@Component({
  selector: 'app-bookings-calendar',
  imports: [DatePipe, CardComponent],
  templateUrl: './bookings-calendar.component.html',
  styleUrl: './bookings-calendar.component.scss'
})
export class BookingsCalendarComponent implements OnInit {
  private bookingsService = inject(BookingsService);
  private router = inject(Router);

  currentDate = signal(new Date());
  viewMode = signal<'month' | 'week'>('month');
  selectedDay = signal<CalendarDay | null>(null);
  isLoading = signal(false);

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar events from API
  calendarEvents = signal<CalendarEvent[]>([]);

  // Month view days
  calendarDays = computed(() => {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const days: CalendarDay[] = [];
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      const date = new Date(current);
      date.setHours(0, 0, 0, 0);

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.getTime() === today.getTime(),
        bookings: this.getBookingsForDate(current)
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  });

  // Week view days
  weekViewDays = computed(() => {
    const current = new Date(this.currentDate());
    const dayOfWeek = current.getDay();

    // Get start of week (Sunday)
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      days.push({
        date: new Date(date),
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        bookings: this.getBookingsForDate(date)
      });
    }

    return days;
  });

  // Week date range for header
  weekDateRange = computed(() => {
    const days = this.weekViewDays();
    if (days.length === 0) return '';
    const start = days[0].date;
    const end = days[6].date;
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
  });

  // Time slots for week view (hourly)
  timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return { hour, label: `${displayHour} ${ampm}` };
  });

  constructor() {
    // Re-compute calendar days when events change
    effect(() => {
      this.calendarEvents();
      // Force re-computation of calendarDays
    });
  }

  ngOnInit() {
    this.loadCalendarEvents();
  }

  loadCalendarEvents() {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();

    // Get first day of month minus 7 days (for previous month days shown)
    const startDate = new Date(year, month, 1);
    startDate.setDate(startDate.getDate() - 7);

    // Get last day of month plus 7 days (for next month days shown)
    const endDate = new Date(year, month + 1, 0);
    endDate.setDate(endDate.getDate() + 7);

    this.isLoading.set(true);

    this.bookingsService.getCalendarEvents(startDate, endDate).subscribe({
      next: (response) => {
        if (response.success) {
          this.calendarEvents.set(response.data);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading calendar events:', err);
        this.isLoading.set(false);
      }
    });
  }

  getBookingsForDate(date: Date): CalendarEvent[] {
    return this.calendarEvents().filter(event => {
      const eventDate = new Date(event.start);
      eventDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === checkDate.getTime();
    });
  }

  previousMonth() {
    const current = this.currentDate();
    this.currentDate.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    this.selectedDay.set(null);
    this.loadCalendarEvents();
  }

  nextMonth() {
    const current = this.currentDate();
    this.currentDate.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    this.selectedDay.set(null);
    this.loadCalendarEvents();
  }

  previousWeek() {
    const current = this.currentDate();
    const newDate = new Date(current);
    newDate.setDate(current.getDate() - 7);
    this.currentDate.set(newDate);
    this.selectedDay.set(null);
    this.loadCalendarEvents();
  }

  nextWeek() {
    const current = this.currentDate();
    const newDate = new Date(current);
    newDate.setDate(current.getDate() + 7);
    this.currentDate.set(newDate);
    this.selectedDay.set(null);
    this.loadCalendarEvents();
  }

  previous() {
    if (this.viewMode() === 'week') {
      this.previousWeek();
    } else {
      this.previousMonth();
    }
  }

  next() {
    if (this.viewMode() === 'week') {
      this.nextWeek();
    } else {
      this.nextMonth();
    }
  }

  getBookingsForHour(day: CalendarDay, hour: number): CalendarEvent[] {
    return day.bookings.filter(booking => {
      const bookingHour = new Date(booking.start).getHours();
      return bookingHour === hour;
    });
  }

  goToToday() {
    this.currentDate.set(new Date());
    this.loadCalendarEvents();
    const todayDay = this.calendarDays().find(d => d.isToday);
    if (todayDay) {
      this.selectedDay.set(todayDay);
    }
  }

  selectDay(day: CalendarDay) {
    this.selectedDay.set(day);
  }

  getStatusClass(status: BookingStatus): string {
    const classes: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getStatusBorderClass(status: BookingStatus): string {
    const classes: Record<string, string> = {
      pending: 'border-l-orange-500 bg-orange-50',
      active: 'border-l-blue-500 bg-blue-50',
      completed: 'border-l-green-500 bg-green-50',
      cancelled: 'border-l-red-500 bg-red-50',
    };
    return classes[status] || 'border-l-gray-500 bg-gray-50';
  }

  formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency || 'MYR',
    }).format(amount);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/bookings']);
  }

  viewBookingDetail(booking: CalendarEvent, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/bookings', booking.id]);
  }
}
