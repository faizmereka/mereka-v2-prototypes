import type { ISchedule } from '@core/models/Experience';
import { ExperienceEvent, type IExperienceEvent } from '@core/models/ExperienceEvent';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import type { Types } from 'mongoose';
import pkg from 'rrule';

const { RRule } = pkg;

dayjs.extend(utc);
dayjs.extend(timezone);

export class HubExperienceEventService {
  /**
   * Generate experienceEvents from a schedule's recurring rule
   */
  generateExperienceEvents(
    experienceId: string,
    schedule: ISchedule,
    experienceDuration: number,
    tz: string,
    limit = 500,
  ): Partial<IExperienceEvent>[] {
    // Handle non-repeating events
    if (
      schedule.recurringType === 'no_repeat' ||
      !schedule.recurringRule ||
      schedule.recurringRule.length === 0
    ) {
      return this.generateNonRepeatExperienceEvent(experienceId, schedule, experienceDuration, tz);
    }

    // Parse RRule string
    const rruleStr = schedule.recurringRule;
    if (rruleStr.length < 2) {
      throw new Error('Invalid recurringRule format');
    }

    // Extract DTSTART
    const dtstartLine = rruleStr[0];
    if (!dtstartLine) {
      throw new Error('Missing DTSTART in recurringRule');
    }
    const dtstartStr = dtstartLine.replace('DTSTART:', '');
    const startDate = dayjs.tz(dtstartStr, 'YYYYMMDDTHHmmss', tz);

    if (!startDate.isValid()) {
      throw new Error(`Invalid DTSTART: ${dtstartStr}`);
    }

    // Parse RRULE
    const rruleLine = rruleStr[1];
    if (!rruleLine) {
      throw new Error('Missing RRULE in recurringRule');
    }
    const rruleString = rruleLine.replace('RRULE:', '');
    const rruleOptions = {
      ...RRule.fromString(rruleString).origOptions,
      dtstart: startDate.toDate(),
      tzid: tz,
    };

    const rule = new RRule(rruleOptions);

    // Generate occurrences for 3 years or until limit
    const fromDate = startDate.toDate();
    const endDate = startDate.add(3, 'year').toDate();
    const allOccurrences = rule.between(fromDate, endDate, true);

    // Limit occurrences
    const occurrences = allOccurrences.slice(0, limit);

    // Create experienceEvent objects
    const experienceEvents: Partial<IExperienceEvent>[] = [];

    for (const occurrence of occurrences) {
      const startTime = dayjs(occurrence).utc().toDate();
      const endTime = dayjs(occurrence).add(experienceDuration, 'millisecond').utc().toDate();

      experienceEvents.push({
        experienceId: experienceId as unknown as Types.ObjectId,
        scheduleId: schedule.uid,
        startTime,
        endTime,
        timeZone: tz,
        isRecurring: true,
        status: 'ACTIVE',
        isLocked: false,
        createdAt: new Date(),
      });
    }

    return experienceEvents;
  }

  /**
   * Generate a single non-repeating experienceEvent
   */
  private generateNonRepeatExperienceEvent(
    experienceId: string,
    schedule: ISchedule,
    experienceDuration: number,
    tz: string,
  ): Partial<IExperienceEvent>[] {
    const startTime = dayjs.tz(schedule.startDate, 'YYYY-MM-DD hh:mmA', tz);

    let endTime: dayjs.Dayjs;

    if (schedule.endDate) {
      // Multi-day event
      endTime = dayjs.tz(schedule.endDate, 'YYYY-MM-DD hh:mmA', tz);
    } else {
      // Single event with duration
      endTime = startTime.add(experienceDuration, 'millisecond');
    }

    return [
      {
        experienceId: experienceId as unknown as Types.ObjectId,
        scheduleId: schedule.uid,
        startTime: startTime.utc().toDate(),
        endTime: endTime.utc().toDate(),
        timeZone: tz,
        isRecurring: false,
        status: 'ACTIVE',
        isLocked: false,
        createdAt: new Date(),
      },
    ];
  }

  /**
   * Create experienceEvents in database
   */
  async createExperienceEvents(events: Partial<IExperienceEvent>[]): Promise<IExperienceEvent[]> {
    if (events.length === 0) return [];
    const createdEvents = await ExperienceEvent.insertMany(events);
    return createdEvents as IExperienceEvent[];
  }

  /**
   * Update experienceEvents for a schedule
   */
  async updateExperienceEventsForSchedule(
    experienceId: string,
    scheduleId: string,
    newSchedule: ISchedule,
    experienceDuration: number,
    tz: string,
  ): Promise<void> {
    // Delete non-locked future events for this schedule
    await ExperienceEvent.updateMany(
      {
        experienceId,
        scheduleId,
        isLocked: false,
        status: { $ne: 'DELETED' },
      },
      {
        $set: { status: 'DELETED', updatedAt: new Date() },
      },
    );

    // Generate new events
    const newEvents = this.generateExperienceEvents(
      experienceId,
      newSchedule,
      experienceDuration,
      tz,
    );

    // Create new events
    await this.createExperienceEvents(newEvents);
  }

  /**
   * Delete all experienceEvents for a schedule
   */
  async deleteExperienceEventsForSchedule(experienceId: string, scheduleId: string): Promise<void> {
    await ExperienceEvent.updateMany(
      {
        experienceId,
        scheduleId,
        isLocked: false, // Don't delete locked events
      },
      {
        $set: { status: 'DELETED', updatedAt: new Date() },
      },
    );
  }
}
