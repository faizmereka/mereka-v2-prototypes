/**
 * RRULE Builder Utility
 * Handles RRULE string generation for recurring schedules
 */

// =============================================================================
// TYPES
// =============================================================================

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
export type RecurringType = 'no_repeat' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ScheduleInput {
  startDate: Date;
  startTime: string;
  recurringType: RecurringType;
  weekdays?: Weekday[];
  monthDay?: number;
  endType?: 'count' | 'until' | 'never';
  count?: number;
  endDate?: Date;
  interval?: number;
}

export interface ParsedRRule {
  dtstart: Date;
  freq?: string;
  interval?: number;
  count?: number;
  until?: Date;
  byday?: Weekday[];
  bymonthday?: number;
}

// =============================================================================
// RRULE BUILDER
// =============================================================================

export function buildRRule(input: ScheduleInput): string[] {
  const { startDate, startTime, recurringType } = input;
  const dtstart = buildDTSTART(startDate, startTime);
  if (recurringType === 'no_repeat') return [dtstart];
  return [dtstart, buildRRULEString(input)];
}

function buildDTSTART(date: Date, time: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const [h, min] = time.split(':').map(n => n.padStart(2, '0'));
  return `DTSTART:${y}${m}${d}T${h}${min}00`;
}

function buildRRULEString(input: ScheduleInput): string {
  const { recurringType, weekdays, monthDay, endType, count, endDate, interval } = input;
  const parts: string[] = ['RRULE:'];

  switch (recurringType) {
    case 'daily': parts.push('FREQ=DAILY'); break;
    case 'weekly': case 'custom': parts.push('FREQ=WEEKLY'); break;
    case 'monthly': parts.push('FREQ=MONTHLY'); break;
    default: parts.push('FREQ=DAILY');
  }

  if (interval && interval > 1) parts.push(`;INTERVAL=${interval}`);
  if ((recurringType === 'weekly' || recurringType === 'custom') && weekdays?.length) {
    parts.push(`;BYDAY=${weekdays.join(',')}`);
  }
  if (recurringType === 'monthly' && monthDay) parts.push(`;BYMONTHDAY=${monthDay}`);
  if (endType === 'count' && count) parts.push(`;COUNT=${count}`);
  else if (endType === 'until' && endDate) {
    const y = endDate.getFullYear();
    const m = String(endDate.getMonth() + 1).padStart(2, '0');
    const d = String(endDate.getDate()).padStart(2, '0');
    parts.push(`;UNTIL=${y}${m}${d}`);
  }

  return parts.join('');
}

// =============================================================================
// RRULE PARSER
// =============================================================================

export function parseRRule(rruleArray: string[]): ParsedRRule {
  const result: ParsedRRule = { dtstart: new Date() };
  if (!rruleArray?.length) return result;

  const dtstartStr = rruleArray[0];
  if (dtstartStr?.startsWith('DTSTART:')) {
    result.dtstart = parseDTSTART(dtstartStr.replace('DTSTART:', ''));
  }

  if (rruleArray.length > 1 && rruleArray[1]?.startsWith('RRULE:')) {
    const parts = rruleArray[1].replace('RRULE:', '').split(';');
    for (const part of parts) {
      const [key, value] = part.split('=');
      switch (key) {
        case 'FREQ': result.freq = value; break;
        case 'INTERVAL': result.interval = parseInt(value, 10); break;
        case 'COUNT': result.count = parseInt(value, 10); break;
        case 'UNTIL': result.until = parseUntil(value); break;
        case 'BYDAY': result.byday = value.split(',') as Weekday[]; break;
        case 'BYMONTHDAY': result.bymonthday = parseInt(value, 10); break;
      }
    }
  }
  return result;
}

function parseDTSTART(str: string): Date {
  return new Date(
    parseInt(str.substring(0, 4), 10),
    parseInt(str.substring(4, 6), 10) - 1,
    parseInt(str.substring(6, 8), 10),
    parseInt(str.substring(9, 11), 10),
    parseInt(str.substring(11, 13), 10),
    parseInt(str.substring(13, 15), 10) || 0
  );
}

function parseUntil(str: string): Date {
  return new Date(
    parseInt(str.substring(0, 4), 10),
    parseInt(str.substring(4, 6), 10) - 1,
    parseInt(str.substring(6, 8), 10), 23, 59, 59
  );
}

// =============================================================================
// HELPERS
// =============================================================================

export function generateScheduleUid(): string {
  return `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday', SA: 'Saturday', SU: 'Sunday'
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun'
};

export const ALL_WEEKDAYS: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export function getWeekdayFromDate(date: Date): Weekday {
  const days: Weekday[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return days[date.getDay()];
}

export function formatTime12Hour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

export const RECURRING_TYPE_LABELS: Record<RecurringType, string> = {
  no_repeat: 'Does not repeat', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', custom: 'Custom'
};

/**
 * Build RRULE array from a Date and recurring type
 * Simpler version that takes a Date directly instead of separate date/time strings
 */
export function buildRRuleFromDate(
  startDate: Date,
  recurringType: string,
  endDate?: Date
): string[] {
  // Build DTSTART from Date
  const year = startDate.getFullYear();
  const month = String(startDate.getMonth() + 1).padStart(2, '0');
  const day = String(startDate.getDate()).padStart(2, '0');
  const hours = String(startDate.getHours()).padStart(2, '0');
  const minutes = String(startDate.getMinutes()).padStart(2, '0');
  const dtstart = `DTSTART:${year}${month}${day}T${hours}${minutes}00`;

  // For non-recurring events, just return DTSTART
  if (!recurringType || recurringType === 'once' || recurringType === 'no_repeat') {
    return [dtstart];
  }

  // Build RRULE string based on recurring type
  const parts: string[] = ['RRULE:'];

  switch (recurringType) {
    case 'daily':
      parts.push('FREQ=DAILY');
      break;
    case 'weekly':
      parts.push('FREQ=WEEKLY');
      break;
    case 'monthly':
      parts.push('FREQ=MONTHLY');
      break;
    case 'every_weekday':
      parts.push('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
      break;
    case 'custom':
      parts.push('FREQ=WEEKLY');
      break;
    default:
      parts.push('FREQ=DAILY');
  }

  // Add UNTIL if endDate is provided (for bounded recurring)
  if (endDate) {
    const endY = endDate.getFullYear();
    const endM = String(endDate.getMonth() + 1).padStart(2, '0');
    const endD = String(endDate.getDate()).padStart(2, '0');
    parts.push(`;UNTIL=${endY}${endM}${endD}`);
  }

  return [dtstart, parts.join('')];
}
