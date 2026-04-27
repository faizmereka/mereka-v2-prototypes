import { Component, input, output, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Schedule {
  uid: string;
  slotNo: number;
  recurringType: RecurringType;
  startDate: string; // Format: YYYY-MM-DD HH:mmAM/PM
  endDate: string; // Format: YYYY-MM-DD HH:mmAM/PM (for multi-day)
  recurringRule: string[]; // RRULE array: ['DTSTART:...', 'RRULE:...']
  isNew?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
  history?: Schedule[];
}

export type RecurringType = 'no_repeat' | 'daily' | 'weekly' | 'monthly' | 'every_weekday' | 'custom' | '';
export type RecurringFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
export type EndMode = 'Never' | 'On date' | 'After';

export interface CustomRecurringData {
  interval: number;
  frequency: RecurringFrequency;
  weeklyDays: string[]; // ['Mon', 'Tue', etc.]
  endMode: EndMode;
  endDate: string; // YYYY-MM-DD
  endAfterOccurrences: number;
}

export interface ScheduleFormData {
  isMultiDay: boolean;
  experienceDuration: number; // in milliseconds
  timezone: string;
  schedules: Schedule[];
}

@Component({
  selector: 'ui-schedule-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule-form.component.html',
})
export class UiScheduleFormComponent implements OnInit {
  // Inputs
  readonly serviceType = input<'Experience' | 'Expertise'>('Experience');
  readonly initialData = input<Partial<ScheduleFormData>>({});

  // Outputs
  readonly dataChange = output<ScheduleFormData>();

  // State
  readonly isMultiDay = signal(false);
  readonly durationHours = signal(0);
  readonly durationMinutes = signal(0);
  readonly timezone = signal('Asia/Kuala_Lumpur');
  readonly schedules = signal<Schedule[]>([]);
  readonly activeSlotTab = signal<'upcoming' | 'recurring' | 'past'>('upcoming');
  readonly editingIndex = signal(-1); // -1 means not editing

  // Custom Recurring State
  readonly customInterval = signal(1);
  readonly customFrequency = signal<RecurringFrequency>('Daily');
  readonly customWeeklyDays = signal<string[]>([]);
  readonly customEndMode = signal<EndMode>('Never');
  readonly customEndDate = signal('');
  readonly customEndAfterOccurrences = signal(1);

  // Min date for date picker (today's date in YYYY-MM-DD format)
  readonly minDate = computed(() => new Date().toISOString().substring(0, 10));

  // Track if data has been initialized to avoid re-applying same data
  private dataInitialized = false;

  constructor() {
    // Watch for initialData changes (for edit mode where data loads async)
    effect(() => {
      const initial = this.initialData();
      // Only apply if we have meaningful data (schedules with content)
      if (initial.schedules && initial.schedules.length > 0 && !this.dataInitialized) {
        this.applyInitialData(initial);
        this.dataInitialized = true;
      }
    });
  }

  // Computed
  readonly experienceDuration = computed(
    () => this.durationHours() * 60 * 60 * 1000 + this.durationMinutes() * 60 * 1000
  );

  readonly filteredSchedules = computed(() => {
    const all = this.schedules();
    const now = new Date();
    const tab = this.activeSlotTab();

    return all.filter((schedule) => {
      if (schedule.isDeleted) return false;

      const startDate = this.parseScheduleDate(schedule.startDate);
      const isPast = startDate ? startDate < now : false;
      const isRecurring = schedule.recurringType !== 'no_repeat' && schedule.recurringType !== '';

      if (tab === 'past') return isPast;
      if (tab === 'recurring') return isRecurring && !isPast;
      return !isPast && !isRecurring; // upcoming
    });
  });

  readonly canAddSlot = computed(() => this.editingIndex() === -1);

  readonly isCustomRecurring = computed(() => {
    const schedule = this.currentEditingSchedule();
    return schedule?.recurringType === 'custom';
  });

  readonly computedEndDate = computed(() => {
    if (!this.isCustomRecurring()) return '';
    const schedule = this.currentEditingSchedule();
    if (!schedule?.startDate) return '';

    const endMode = this.customEndMode();
    if (endMode === 'Never') return 'No end date';
    if (endMode === 'On date') return this.customEndDate() || '';
    if (endMode === 'After') {
      // Calculate end date based on occurrences
      const startDate = this.parseScheduleDate(schedule.startDate);
      if (!startDate) return '';

      const interval = this.customInterval();
      const frequency = this.customFrequency();
      const occurrences = this.customEndAfterOccurrences();

      const endDate = new Date(startDate);
      const totalDays = (occurrences - 1) * interval;

      switch (frequency) {
        case 'Daily':
          endDate.setDate(endDate.getDate() + totalDays);
          break;
        case 'Weekly':
          endDate.setDate(endDate.getDate() + totalDays * 7);
          break;
        case 'Monthly':
          endDate.setMonth(endDate.getMonth() + totalDays);
          break;
        case 'Yearly':
          endDate.setFullYear(endDate.getFullYear() + totalDays);
          break;
      }

      return endDate.toISOString().substring(0, 10);
    }
    return '';
  });

  readonly currentEditingSchedule = computed(() => {
    const index = this.editingIndex();
    if (index === -1) return null;
    return this.schedules()[index] || null;
  });

  // Options
  readonly hoursOptions = Array.from({ length: 25 }, (_, i) => i);
  readonly minutesOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  readonly hourSelectOptions = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  readonly minuteSelectOptions = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  readonly timezones = [
    { value: 'Asia/Kuala_Lumpur', label: 'Malaysia (GMT+8)' },
    { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
    { value: 'Asia/Jakarta', label: 'Indonesia (GMT+7)' },
    { value: 'Asia/Bangkok', label: 'Thailand (GMT+7)' },
    { value: 'Asia/Manila', label: 'Philippines (GMT+8)' },
    { value: 'Asia/Tokyo', label: 'Japan (GMT+9)' },
    { value: 'Australia/Sydney', label: 'Australia (GMT+11)' },
    { value: 'Europe/London', label: 'UK (GMT+0)' },
    { value: 'America/New_York', label: 'US Eastern (GMT-5)' },
    { value: 'America/Los_Angeles', label: 'US Pacific (GMT-8)' },
  ];

  readonly recurringOptions = [
    { label: 'Does not repeat', value: 'no_repeat' },
    { label: 'Daily', value: 'daily' },
    { label: 'Every weekday (Monday to Friday)', value: 'every_weekday' },
    { label: 'Custom', value: 'custom' },
  ];

  readonly frequencyOptions: { label: string; value: RecurringFrequency }[] = [
    { label: 'Days', value: 'Daily' },
    { label: 'Weeks', value: 'Weekly' },
    { label: 'Month', value: 'Monthly' },
    { label: 'Year', value: 'Yearly' },
  ];

  readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  ngOnInit(): void {
    const initial = this.initialData();
    this.applyInitialData(initial);
  }

  private applyInitialData(initial: Partial<ScheduleFormData>): void {
    if (initial.isMultiDay !== undefined) this.isMultiDay.set(initial.isMultiDay);
    if (initial.experienceDuration !== undefined) {
      const hours = Math.floor(initial.experienceDuration / (60 * 60 * 1000));
      const minutes = Math.floor((initial.experienceDuration % (60 * 60 * 1000)) / (60 * 1000));
      this.durationHours.set(hours);
      this.durationMinutes.set(minutes);
    }
    if (initial.timezone) this.timezone.set(initial.timezone);
    if (initial.schedules && initial.schedules.length > 0) {
      this.schedules.set(initial.schedules);
      this.dataInitialized = true;

      // Auto-select the appropriate tab based on which has data
      this.autoSelectTab(initial.schedules);
    }
    // Don't auto-add slot - let user click "Add Slot" button
  }

  /**
   * Auto-select the tab that has data (upcoming > recurring > past)
   */
  private autoSelectTab(schedules: Schedule[]): void {
    const now = new Date();

    // Categorize schedules
    const upcoming: Schedule[] = [];
    const recurring: Schedule[] = [];
    const past: Schedule[] = [];

    schedules.forEach(schedule => {
      if (schedule.isDeleted) return;

      const startDate = this.parseScheduleDate(schedule.startDate);
      const isPast = startDate ? startDate < now : false;
      const isRecurring = schedule.recurringType !== 'no_repeat' && schedule.recurringType !== '';

      if (isPast) {
        past.push(schedule);
      } else if (isRecurring) {
        recurring.push(schedule);
      } else {
        upcoming.push(schedule);
      }
    });

    // Select the first tab that has data
    if (upcoming.length > 0) {
      this.activeSlotTab.set('upcoming');
    } else if (recurring.length > 0) {
      this.activeSlotTab.set('recurring');
    } else if (past.length > 0) {
      this.activeSlotTab.set('past');
    }
    // If all empty, default to 'upcoming' (already set by default)
  }

  private generateUid(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseScheduleDate(dateStr: string | Date): Date | null {
    if (!dateStr) return null;

    // If already a Date object, return it
    if (dateStr instanceof Date) {
      return isNaN(dateStr.getTime()) ? null : dateStr;
    }

    // Try ISO format first (e.g., "2025-12-12T08:15:00.000Z")
    if (dateStr.includes('T')) {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    }

    // Try format: YYYY-MM-DD HH:mmAM/PM
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})(AM|PM)$/);
    if (match) {
      const [, date, hours, minutes, period] = match;
      let hour = parseInt(hours, 10);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return new Date(`${date}T${hour.toString().padStart(2, '0')}:${minutes}:00`);
    }

    return null;
  }

  onMultiDayChange(value: boolean): void {
    this.isMultiDay.set(value);
    // Reset schedules when switching mode
    this.schedules.set([]);
    this.editingIndex.set(-1);
    this.addSlot();
    this.emitChanges();
  }

  onDurationHoursChange(value: number): void {
    this.durationHours.set(value);
    this.emitChanges();
  }

  onDurationMinutesChange(value: number): void {
    this.durationMinutes.set(value);
    this.emitChanges();
  }

  onTimezoneChange(value: string): void {
    this.timezone.set(value);
    this.emitChanges();
  }

  filterSlots(tab: 'upcoming' | 'recurring' | 'past'): void {
    this.activeSlotTab.set(tab);
  }

  addSlot(): void {
    const currentSchedules = this.schedules();
    const slotNo = currentSchedules.length > 0 ? Math.max(...currentSchedules.map((s) => s.slotNo)) + 1 : 1;

    const newSchedule: Schedule = {
      uid: this.generateUid(),
      slotNo,
      recurringType: '',
      startDate: '',
      endDate: '',
      recurringRule: [],
      isNew: true,
    };

    this.schedules.update((s) => [...s, newSchedule]);
    this.editingIndex.set(currentSchedules.length);
  }

  editSlot(index: number): void {
    this.editingIndex.set(index);
  }

  saveSlot(schedule: Schedule): void {
    const index = this.editingIndex();
    if (index === -1) return;

    // Build the RRULE array based on the schedule data
    const recurringRule = this.buildRecurringRule(schedule);

    this.schedules.update((schedules) => {
      const updated = [...schedules];
      updated[index] = { ...schedule, recurringRule, isNew: false };
      return updated;
    });

    this.editingIndex.set(-1);
    this.emitChanges();

    // Auto-navigate to the correct tab based on recurring type
    const isRecurring = schedule.recurringType !== 'no_repeat' && schedule.recurringType !== '';
    if (isRecurring) {
      this.activeSlotTab.set('recurring');
    } else {
      this.activeSlotTab.set('upcoming');
    }
  }

  /**
   * Build RRULE array from schedule data
   * Returns: ['DTSTART:YYYYMMDDTHHmmss', 'RRULE:FREQ=...'] or just ['DTSTART:...'] for no_repeat
   */
  private buildRecurringRule(schedule: Schedule): string[] {
    const startDate = this.parseScheduleDate(schedule.startDate);
    if (!startDate) return [];

    // Build DTSTART
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const day = String(startDate.getDate()).padStart(2, '0');
    const hours = String(startDate.getHours()).padStart(2, '0');
    const minutes = String(startDate.getMinutes()).padStart(2, '0');
    const dtstart = `DTSTART:${year}${month}${day}T${hours}${minutes}00`;

    // For non-recurring events, just return DTSTART
    if (schedule.recurringType === 'no_repeat' || schedule.recurringType === '') {
      return [dtstart];
    }

    // Build RRULE string based on recurring type
    let rrule = 'RRULE:';

    switch (schedule.recurringType) {
      case 'daily':
        rrule += 'FREQ=DAILY';
        break;
      case 'weekly':
        rrule += 'FREQ=WEEKLY';
        break;
      case 'every_weekday':
        rrule += 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
        break;
      case 'monthly':
        rrule += 'FREQ=MONTHLY';
        break;
      case 'custom':
        rrule += this.buildCustomRRule();
        break;
      default:
        rrule += 'FREQ=DAILY';
    }

    // Add end date if specified for multi-day or bounded recurring
    if (schedule.endDate) {
      const endDate = this.parseScheduleDate(schedule.endDate);
      if (endDate) {
        const endYear = endDate.getFullYear();
        const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
        const endDay = String(endDate.getDate()).padStart(2, '0');
        rrule += `;UNTIL=${endYear}${endMonth}${endDay}`;
      }
    }

    return [dtstart, rrule];
  }

  /**
   * Build custom RRULE string from custom recurring settings
   */
  private buildCustomRRule(): string {
    const interval = this.customInterval();
    const frequency = this.customFrequency();
    const endMode = this.customEndMode();
    const parts: string[] = [];

    // Frequency
    switch (frequency) {
      case 'Daily': parts.push('FREQ=DAILY'); break;
      case 'Weekly': parts.push('FREQ=WEEKLY'); break;
      case 'Monthly': parts.push('FREQ=MONTHLY'); break;
      case 'Yearly': parts.push('FREQ=YEARLY'); break;
    }

    // Interval
    if (interval > 1) {
      parts.push(`INTERVAL=${interval}`);
    }

    // Weekly days
    if (frequency === 'Weekly' && this.customWeeklyDays().length > 0) {
      const dayMap: Record<string, string> = {
        Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA', Sun: 'SU',
      };
      const days = this.customWeeklyDays().map((d) => dayMap[d] || d).join(',');
      parts.push(`BYDAY=${days}`);
    }

    // End mode
    if (endMode === 'On date' && this.customEndDate()) {
      const endDate = new Date(this.customEndDate());
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      parts.push(`UNTIL=${year}${month}${day}`);
    } else if (endMode === 'After') {
      parts.push(`COUNT=${this.customEndAfterOccurrences()}`);
    }

    return parts.join(';');
  }

  cancelSlot(): void {
    const index = this.editingIndex();
    if (index === -1) return;

    const schedule = this.schedules()[index];
    if (schedule.isNew) {
      // Remove new unsaved slot
      this.schedules.update((s) => s.filter((_, i) => i !== index));
    }

    this.editingIndex.set(-1);
  }

  deleteSlot(uid: string): void {
    this.schedules.update((s) => s.filter((schedule) => schedule.uid !== uid));
    this.emitChanges();
  }

  getSlotDisplayDate(schedule: Schedule): string {
    if (!schedule.startDate) return '';

    if (this.isMultiDay()) {
      const startDate = this.parseScheduleDate(schedule.startDate);
      const endDate = this.parseScheduleDate(schedule.endDate);
      if (!startDate || !endDate) return '';

      const startStr = this.formatDisplayDate(startDate);
      const endStr = this.formatDisplayDate(endDate);
      const startTime = this.formatDisplayTime(startDate);
      const endTime = this.formatDisplayTime(endDate);

      return `${startStr} - ${endStr}\n${startTime} - ${endTime}`;
    } else {
      const date = this.parseScheduleDate(schedule.startDate);
      if (!date) return '';
      return `${this.formatDisplayDate(date)} at ${this.formatDisplayTime(date)}`;
    }
  }

  private formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  private formatDisplayTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  formatMinute(value: number): string {
    return value.toString().padStart(2, '0');
  }

  private emitChanges(): void {
    this.dataChange.emit({
      isMultiDay: this.isMultiDay(),
      experienceDuration: this.experienceDuration(),
      timezone: this.timezone(),
      schedules: this.schedules().filter((s) => !s.isNew && !s.isDeleted),
    });
  }

  // Set schedules from parent
  setData(data: Partial<ScheduleFormData>): void {
    if (data.isMultiDay !== undefined) this.isMultiDay.set(data.isMultiDay);
    if (data.experienceDuration !== undefined) {
      const hours = Math.floor(data.experienceDuration / (60 * 60 * 1000));
      const minutes = Math.floor((data.experienceDuration % (60 * 60 * 1000)) / (60 * 1000));
      this.durationHours.set(hours);
      this.durationMinutes.set(minutes);
    }
    if (data.timezone) this.timezone.set(data.timezone);
    if (data.schedules) this.schedules.set(data.schedules);
  }

  getData(): ScheduleFormData {
    return {
      isMultiDay: this.isMultiDay(),
      experienceDuration: this.experienceDuration(),
      timezone: this.timezone(),
      schedules: this.schedules().filter((s) => !s.isNew && !s.isDeleted),
    };
  }

  // Helper methods for template
  getTimeFromDate(dateStr: string): string {
    if (!dateStr) return '09:00AM';
    const match = dateStr.match(/(\d{2}:\d{2}[AP]M)$/);
    return match ? match[1] : '09:00AM';
  }

  getHourFromDate(dateStr: string): string {
    if (!dateStr) return '09';
    const match = dateStr.match(/(\d{2}):(\d{2})([AP]M)$/);
    return match ? match[1] : '09';
  }

  getMinuteFromDate(dateStr: string): string {
    if (!dateStr) return '00';
    const match = dateStr.match(/(\d{2}):(\d{2})([AP]M)$/);
    return match ? match[2] : '00';
  }

  getAmPmFromDate(dateStr: string): 'AM' | 'PM' {
    if (!dateStr) return 'AM';
    const match = dateStr.match(/(\d{2}):(\d{2})([AP]M)$/);
    return match ? (match[3] as 'AM' | 'PM') : 'AM';
  }

  getDatePart(dateStr: string): string {
    if (!dateStr || dateStr.length < 10) return '';
    return dateStr.substring(0, 10);
  }

  updateScheduleField(field: keyof Schedule, value: string): void {
    const index = this.editingIndex();
    if (index === -1) return;

    this.schedules.update((schedules) => {
      const updated = [...schedules];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  updateScheduleTime(field: 'startDate' | 'endDate', hour: string, minute: string, ampm: 'AM' | 'PM'): void {
    const index = this.editingIndex();
    if (index === -1) return;

    const schedule = this.schedules()[index];
    const currentDateStr = schedule[field];
    const datePart = currentDateStr ? currentDateStr.substring(0, 10) : new Date().toISOString().substring(0, 10);
    const newDateStr = `${datePart} ${hour}:${minute}${ampm}`;

    this.updateScheduleField(field, newDateStr);
  }

  isSlotValid(schedule: Schedule): boolean {
    if (!schedule.startDate || schedule.startDate.length < 10) return false;

    if (this.isMultiDay()) {
      if (!schedule.endDate || schedule.endDate.length < 10) return false;
    }

    return true;
  }

  // Custom Recurring Methods
  onRecurringTypeChange(value: string): void {
    this.updateScheduleField('recurringType', value);
    if (value === 'custom') {
      // Reset custom values when switching to custom
      this.customInterval.set(1);
      this.customFrequency.set('Daily');
      this.customWeeklyDays.set([]);
      this.customEndMode.set('Never');
      this.customEndDate.set('');
      this.customEndAfterOccurrences.set(1);
    }
  }

  incrementInterval(): void {
    this.customInterval.update((v) => v + 1);
  }

  decrementInterval(): void {
    this.customInterval.update((v) => (v > 1 ? v - 1 : 1));
  }

  onFrequencyChange(value: RecurringFrequency): void {
    this.customFrequency.set(value);
    if (value !== 'Weekly') {
      this.customWeeklyDays.set([]);
    }
  }

  toggleWeekDay(day: string): void {
    this.customWeeklyDays.update((days) => {
      if (days.includes(day)) {
        return days.filter((d) => d !== day);
      }
      return [...days, day];
    });
  }

  isWeekDaySelected(day: string): boolean {
    return this.customWeeklyDays().includes(day);
  }

  setEndMode(mode: EndMode): void {
    this.customEndMode.set(mode);
  }

  onEndDateChange(date: string): void {
    this.customEndDate.set(date);
  }

  incrementOccurrences(): void {
    this.customEndAfterOccurrences.update((v) => v + 1);
  }

  decrementOccurrences(): void {
    this.customEndAfterOccurrences.update((v) => (v > 1 ? v - 1 : 1));
  }

  getRecurringRuleString(): string {
    if (!this.isCustomRecurring()) return '';

    const interval = this.customInterval();
    const frequency = this.customFrequency();
    const endMode = this.customEndMode();

    let rule = `Every ${interval} ${frequency.toLowerCase()}`;

    if (frequency === 'Weekly' && this.customWeeklyDays().length > 0) {
      rule += ` on ${this.customWeeklyDays().join(', ')}`;
    }

    if (endMode === 'On date' && this.customEndDate()) {
      rule += ` until ${this.customEndDate()}`;
    } else if (endMode === 'After') {
      rule += ` for ${this.customEndAfterOccurrences()} occurrences`;
    }

    return rule;
  }

  formatComputedEndDate(): string {
    const endDate = this.computedEndDate();
    if (!endDate || endDate === 'No end date') return endDate;

    const date = new Date(endDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
