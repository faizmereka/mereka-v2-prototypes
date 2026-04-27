import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { OperatingHours, OperatingDay, ExpertiseDateSlots } from '../../models';

export interface SelectedDate {
  date: Date;
  dayKey: string; // 'monday', 'tuesday', etc.
  operatingDay: OperatingDay | null;
  dateSlots?: ExpertiseDateSlots; // API slots for this date
}

@Component({
  selector: 'app-expertise-date-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expertise-date-picker.component.html',
})
export class ExpertiseDatePickerComponent {
  readonly operatingHours = input<OperatingHours | null>(null);
  readonly availableDates = input<ExpertiseDateSlots[]>([]); // API slots data
  readonly dateSelected = output<SelectedDate>();

  readonly currentMonth = signal(new Date());
  readonly selectedDate = signal<Date | null>(null);

  private readonly dayKeyMap: Record<number, string> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  readonly monthLabel = computed(() => {
    const date = this.currentMonth();
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  readonly weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  readonly calendarDays = computed(() => {
    const date = this.currentMonth();
    const year = date.getFullYear();
    const month = date.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    const days: Array<{ date: Date | null; dayNum: number | null; isToday: boolean; isPast: boolean; isAvailable: boolean }> = [];

    // Empty slots for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, dayNum: null, isToday: false, isPast: false, isAvailable: false });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Actual days of the month
    for (let d = 1; d <= totalDays; d++) {
      const dayDate = new Date(year, month, d);
      const isToday = dayDate.getTime() === today.getTime();
      const isPast = dayDate < today;
      const isAvailable = this.isDayAvailable(dayDate);

      days.push({
        date: dayDate,
        dayNum: d,
        isToday,
        isPast,
        isAvailable: !isPast && isAvailable,
      });
    }

    return days;
  });

  readonly canGoBack = computed(() => {
    const current = this.currentMonth();
    const today = new Date();
    return (
      current.getFullYear() > today.getFullYear() ||
      (current.getFullYear() === today.getFullYear() && current.getMonth() > today.getMonth())
    );
  });

  private isDayAvailable(date: Date): boolean {
    const apiDates = this.availableDates();

    // If we have API dates, use them for availability check
    if (apiDates.length > 0) {
      const dateStr = this.formatDateToYMD(date);
      const dateSlot = apiDates.find((d) => d.date === dateStr);
      // Available if date exists in API response and has at least one available slot
      return dateSlot ? dateSlot.slots.some((s) => s.available) : false;
    }

    // Fall back to operating hours-based availability
    const opHours = this.operatingHours();
    if (!opHours) return true; // If no operating hours, assume all days available

    const dayOfWeek = date.getDay();
    const dayKey = this.dayKeyMap[dayOfWeek];

    // Find the operating day config
    const operatingDay = opHours.days?.find((d) => d.key === dayKey);

    // If no config for this day or day is not active, it's not available
    if (!operatingDay) return true; // If no explicit config, assume available
    return operatingDay.isActive;
  }

  private formatDateToYMD(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getDateSlots(date: Date): ExpertiseDateSlots | undefined {
    const apiDates = this.availableDates();
    const dateStr = this.formatDateToYMD(date);
    return apiDates.find((d) => d.date === dateStr);
  }

  private getOperatingDay(date: Date): OperatingDay | null {
    const opHours = this.operatingHours();
    if (!opHours?.days) return null;

    const dayOfWeek = date.getDay();
    const dayKey = this.dayKeyMap[dayOfWeek];
    return opHours.days.find((d) => d.key === dayKey) || null;
  }

  previousMonth(): void {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  selectDate(day: { date: Date | null; isAvailable: boolean }): void {
    if (!day.date || !day.isAvailable) return;

    this.selectedDate.set(day.date);

    const dayOfWeek = day.date.getDay();
    const dayKey = this.dayKeyMap[dayOfWeek];
    const operatingDay = this.getOperatingDay(day.date);
    const dateSlots = this.getDateSlots(day.date);

    this.dateSelected.emit({
      date: day.date,
      dayKey,
      operatingDay,
      dateSlots,
    });
  }

  isSelected(date: Date | null): boolean {
    if (!date) return false;
    const selected = this.selectedDate();
    if (!selected) return false;
    return date.getTime() === selected.getTime();
  }
}
