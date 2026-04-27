# Recurring Events System Documentation

## Overview

The Mereka platform supports **recurring experiences** where hosts can schedule experiences that repeat on a schedule (daily, weekly, monthly, custom, etc.). The system generates **child events** (experienceEvents) from a parent experience's recurring rules.

## Table of Contents

1. [Frontend UI - Booking Details](#frontend-ui---booking-details)
2. [Data Model](#data-model)
3. [Recurring Rules (RRule Format)](#recurring-rules-rrule-format)
4. [Legacy Firebase Implementation](#legacy-firebase-implementation)
5. [New Backend Architecture](#new-backend-architecture)
6. [Implementation Guide](#implementation-guide)

---

## Frontend UI - Booking Details

The frontend provides a comprehensive scheduling interface in the "Booking Details" tab of the experience upload flow.

### Recurring Options Available:

```
┌─────────────────────────────────────────────────┐
│ When will you be hosting your Experience?      │
├─────────────────────────────────────────────────┤
│ ⚪ Does not repeat                              │
│ ⚪ Daily                                        │
│ ⚪ Weekly on Monday                             │
│ ⚪ Monthly on the 10                            │
│ ⚪ Monthly on the second Monday                 │
│ ⚪ Annually on November 10                      │
│ ⚪ Every weekday (Monday to Friday)             │
│ ⚫ Custom                                       │
└─────────────────────────────────────────────────┘
```

### Custom Recurring Settings:

When "Custom" is selected, users can configure:

```
Set recurring for every: [1] ▼[Days/Weeks/Months/Years]

Ends:
⚪ Never
⚫ On: [Nov 10, 2025] 📅
⚪ After: [1] occurrences
```

### Time Settings:

```
Time: [12:00] ⚪ AM ⚫ PM
```

---

## Data Model

### Experience Schema (schedules field)

```typescript
interface Schedule {
  uid: string;                  // Unique identifier for this schedule
  recurringRule: string[];      // RRule format: ["DTSTART:...", "RRULE:..."]
  startDate: string;            // ISO date string or formatted date
  recurringType: string;        // "no_repeat", "daily", "weekly", "monthly", "custom", etc.
  eventId?: string;             // Legacy field
  readOnly?: boolean;           // If true, schedule cannot be edited
  isDeleted?: boolean;          // Soft delete flag
  history?: any[];              // Audit trail of changes
  lockedEvents?: string[];      // Event IDs that should not be updated
  endDate?: string;             // For non-repeating or multi-day events
}
```

### Experience Event (Child Event)

Child events are generated from schedules and stored separately.

```typescript
interface ExperienceEvent {
  scheduleId: string;           // References parent schedule.uid
  experienceId: string;         // References parent experience._id
  title: string;                // "Experience | {experienceTitle}"
  startTime: string;            // ISO date string (UTC)
  endTime: string;              // ISO date string (UTC)
  timeZone: string;             // e.g., "America/Los_Angeles"
  hubId: string;                // Hub reference

  // Capacity tracking
  isRecurring: boolean;         // True for recurring, false for one-time
  maximumCapacity: number;      // Total seats
  normalSeat: number;           // Regular bookable seats
  totalAvailableQty: number;    // Total tickets available

  // Pass availability
  numberOfDiscoveryPass: number;
  numberOfLearnerPass: number;

  // Ticket information
  ticket: Array<{
    id: string;
    ticketType: string;         // "Paid" | "Free"
    ticketName: string;
    ticketQty: number;
    specialRate?: any;
  }>;

  // Ticket quantity tracking
  ticketQty: {
    [ticketId: string]: {
      max: number;              // Original quantity
      available: number;        // Remaining quantity
    };
  };

  // Metadata
  createdAt: string;            // ISO date string
  isDeleted?: boolean;          // Soft delete flag
}
```

---

## Recurring Rules (RRule Format)

The system uses the **RRule** library standard for recurring events.

### RRule String Format

```typescript
recurringRule: [
  "DTSTART:20251115T100000",    // Start date in YYYYMMDDTHHmmss format
  "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=20"  // Recurrence rule
]
```

### Common RRule Patterns

#### 1. Does Not Repeat
```typescript
recurringType: "no_repeat"
recurringRule: []  // Empty or no RRULE component
```

#### 2. Daily
```typescript
recurringType: "daily"
recurringRule: [
  "DTSTART:20251115T100000",
  "RRULE:FREQ=DAILY;UNTIL=20251231T235959"
]
```

#### 3. Weekly on Specific Days
```typescript
recurringType: "weekly"
recurringRule: [
  "DTSTART:20251115T100000",
  "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"  // Monday, Wednesday, Friday
]
```

**Day Codes:**
- `MO` = Monday
- `TU` = Tuesday
- `WE` = Wednesday
- `TH` = Thursday
- `FR` = Friday
- `SA` = Saturday
- `SU` = Sunday

#### 4. Every Weekday (Monday to Friday)
```typescript
recurringType: "weekday"
recurringRule: [
  "DTSTART:20251115T100000",
  "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
]
```

#### 5. Monthly on Specific Date
```typescript
recurringType: "monthly"
recurringRule: [
  "DTSTART:20251110T100000",
  "RRULE:FREQ=MONTHLY;BYMONTHDAY=10"  // 10th of every month
]
```

#### 6. Monthly on Specific Week Day
```typescript
recurringType: "monthly"
recurringRule: [
  "DTSTART:20251115T100000",
  "RRULE:FREQ=MONTHLY;BYDAY=2MO"  // Second Monday of every month
]
```

**Position Prefixes:**
- `1MO` = First Monday
- `2MO` = Second Monday
- `3MO` = Third Monday
- `4MO` = Fourth Monday
- `-1MO` = Last Monday

#### 7. Annually
```typescript
recurringType: "yearly"
recurringRule: [
  "DTSTART:20251110T100000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYMONTHDAY=10"  // November 10 every year
]
```

#### 8. Custom - Every N Days/Weeks/Months
```typescript
recurringType: "custom"

// Every 2 days
"RRULE:FREQ=DAILY;INTERVAL=2"

// Every 3 weeks
"RRULE:FREQ=WEEKLY;INTERVAL=3"

// Every 6 months
"RRULE:FREQ=MONTHLY;INTERVAL=6"
```

#### 9. Ending Rules

**Never ends:**
```
RRULE:FREQ=WEEKLY;BYDAY=MO
```

**End by date:**
```
RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20251231T235959
```

**End after N occurrences:**
```
RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=20
```

---

## Legacy Firebase Implementation

### Architecture Overview

The Firebase backend used Cloud Functions to automatically generate child events when experiences were created or updated.

#### Key Components:

1. **onWriteExperience** - Firestore trigger on `/experiences/{experienceId}`
   - Runs when experience is created or updated
   - Generates events for all schedules

2. **onUpdateExperience** - Firestore trigger on experience updates
   - Detects schedule changes
   - Creates, updates, or deletes events accordingly

3. **createEventForExperience** - Event generation logic
   - Routes to `createRecurringEventForExperience` or `createNonRepeatEventForExperience`

4. **ExperienceEventService** - Core event generation service
   - Uses **RRule library** to parse recurring rules
   - Generates up to **500 occurrences** or **3 years** worth of events
   - Stores events in `experience_events` collection

### Event Generation Flow

```
┌──────────────────┐
│   Create/Update  │
│   Experience     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  onWriteExperience│
│  Firestore Trigger│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ For each schedule│
└────────┬─────────┘
         │
         ├─────────────────┬──────────────────┐
         ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ no_repeat    │  │  recurring   │  │   custom     │
│ Create 1     │  │  Parse RRule │  │  Parse RRule │
│ event        │  │  Generate    │  │  Generate    │
│              │  │  500 events  │  │  N events    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       └─────────────────┼──────────────────┘
                         ▼
                ┌────────────────┐
                │ Save events to │
                │ experience_    │
                │ events         │
                │ collection     │
                └────────────────┘
```

### Code References

**Location:** `/Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-cloudfunctions/functions/src/`

Key files:
- `controllers/experience/onWriteExperience.ts` - Main trigger (line 17-19)
- `controllers/experience/onUpdateExperience.ts` - Update handler (line 59-118)
- `controllers/calender/experience/createEventForExperience/createRecurringEventForExperience.ts` - Event generation (line 59)
- `services/experienceEvent.service.ts` - RRule parsing (line 137-165)

### Event Generation Logic

```typescript
// From experienceEvent.service.ts:137-165

generateEvents(
  rruleStr: string[],           // ["DTSTART:...", "RRULE:..."]
  duration: number,              // Experience duration in milliseconds
  timezone: string,              // e.g., "America/Los_Angeles"
  eventMetadata = {},            // Common fields (scheduleId, experienceId, etc.)
  limit = 500                    // Max events to generate
): ExperienceEvent[] {

  // Parse start date from DTSTART
  let startDate = moment.tz(
    rruleStr[0].split(':')[1],   // Extract "20251115T100000"
    'YYYYMMDDTHHmmss',
    true,
    timezone
  );

  // Parse RRule options
  const rruleOptions = {
    ...RRule.fromString(rruleStr[1].replace('RRULE:', '')).origOptions,
    dtstart: startDate.toDate(),
    tzid: timezone
  };

  // Create RRule instance
  const rule = new RRule(rruleOptions);

  // Generate occurrences for 3 years
  const fromDate = startDate.toDate();
  const endDate = startDate.clone().add(3, 'year').toDate();
  const allOccurrence = rule.between(fromDate, endDate, true);

  // Limit to 500 events
  const allRrule = allOccurrence.slice(0, limit);

  // Create event objects
  const events = [];
  for (const occurrence of allRrule) {
    events.push({
      ...eventMetadata,
      startTime: moment(occurrence).toDate().toISOString(),
      endTime: moment(occurrence)
        .add(duration, 'milliseconds')
        .toISOString()
    });
  }

  return events;
}
```

### Update Strategy

When schedules are updated:

1. **New schedule added** → Create all events
2. **Schedule modified** → Delete old events, create new ones
3. **Schedule deleted** → Soft delete all events (`isDeleted: true`)
4. **Individual event locked** → Preserve via `lockedEvents` array

---

## New Backend Architecture

### Differences from Firebase

| Aspect | Firebase | New Backend |
|--------|----------|-------------|
| Trigger | Firestore Cloud Functions | API endpoints + background jobs |
| Storage | Firestore `experience_events` | MongoDB `experienceEvents` collection |
| Library | RRule (in Cloud Functions) | RRule (in backend service) |
| Execution | On document write | On API call + cron job |
| Real-time | Yes (triggers immediately) | Scheduled or on-demand |

### Proposed Architecture

```
┌──────────────────────────────────────────────────┐
│                API Layer                         │
├──────────────────────────────────────────────────┤
│  POST /api/v1/experiences                        │
│  PATCH /api/v1/experiences/:id                   │
│  - Validate schedules                            │
│  - Queue experienceEvent generation job                  │
└────────────┬─────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────┐
│           ExperienceEvent Generation Service             │
├──────────────────────────────────────────────────┤
│  - Parse RRule from schedule.recurringRule       │
│  - Generate N occurrences (500 or 3 years)       │
│  - Create ExperienceEvent documents                      │
│  - Link to parent Experience via experienceEvents[]      │
└────────────┬─────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────┐
│              MongoDB Collections                 │
├──────────────────────────────────────────────────┤
│  experiences { schedules[], experienceEvents[] }         │
│  experienceEvents { experienceId, scheduleId, ... }      │
└──────────────────────────────────────────────────┘
```

### ExperienceEvent Model (MongoDB)

```typescript
// File: src/models/ExperienceEvent.ts

interface IExperienceEvent extends Document {
  // References
  experienceId: Types.ObjectId;      // Parent experience
  scheduleId: string;                 // Schedule UID from experience.schedules[]
  hubId: Types.ObjectId;              // Hub reference

  // Event details
  title: string;                      // "Experience | {experienceTitle}"
  startTime: Date;                    // ExperienceEvent start (UTC)
  endTime: Date;                      // ExperienceEvent end (UTC)
  timeZone: string;                   // Timezone for display

  // Capacity
  isRecurring: boolean;               // True if part of recurring schedule
  maximumCapacity: number;            // Total seats
  normalSeat: number;                 // Regular bookable seats
  totalAvailableQty: number;          // Total tickets across all types

  // Passes
  numberOfDiscoveryPass: number;      // Discovery pass slots
  numberOfLearnerPass: number;        // Learner pass slots

  // Tickets
  ticket: Array<{
    id: string;
    ticketType: 'Paid' | 'Free';
    ticketName: string;
    ticketQty: number;
    specialRate?: any;
  }>;

  // Availability tracking
  ticketQty: Map<string, {
    max: number;                      // Original quantity
    available: number;                // Remaining after bookings
  }>;

  // Bookings
  bookings: Types.ObjectId[];         // References to Booking documents

  // Status
  isDeleted: boolean;                 // Soft delete
  isCancelled: boolean;               // Host cancelled
  isLocked: boolean;                  // Cannot be auto-updated

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Implementation Guide

### Step 1: Install RRule Dependency

```bash
npm install rrule
npm install --save-dev @types/rrule
```

### Step 2: Create ExperienceEvent Model

Create `src/models/ExperienceEvent.ts` following the interface above.

### Step 3: Create ExperienceEvent Service

```typescript
// File: src/services/experienceEvent.service.ts

import { RRule } from 'rrule';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export class ExperienceEventService {
  /**
   * Generate experience events from a schedule's recurring rule
   *
   * @param experienceId - Parent experience ID
   * @param schedule - Schedule object with recurringRule
   * @param experienceDuration - Duration in milliseconds
   * @param timezone - Timezone string (e.g., "America/Los_Angeles")
   * @param metadata - Additional fields (tickets, capacity, etc.)
   * @param limit - Max experience events to generate (default: 500)
   */
  generateExperienceEvents(
    experienceId: string,
    schedule: ISchedule,
    experienceDuration: number,
    timezone: string,
    metadata: Partial<IExperienceEvent>,
    limit: number = 500
  ): Partial<IExperienceEvent>[] {

    // Handle non-repeating events
    if (schedule.recurringType === 'no_repeat') {
      return this.generateNonRepeatExperienceEvent(
        experienceId,
        schedule,
        experienceDuration,
        timezone,
        metadata
      );
    }

    // Parse RRule string
    const rruleStr = schedule.recurringRule;
    if (!rruleStr || rruleStr.length < 2) {
      throw new Error('Invalid recurringRule format');
    }

    // Extract DTSTART
    const dtstartStr = rruleStr[0].replace('DTSTART:', '');
    const startDate = dayjs.tz(
      dtstartStr,
      'YYYYMMDDTHHmmss',
      timezone
    );

    if (!startDate.isValid()) {
      throw new Error(`Invalid DTSTART: ${dtstartStr}`);
    }

    // Parse RRULE
    const rruleString = rruleStr[1].replace('RRULE:', '');
    const rruleOptions = {
      ...RRule.fromString(rruleString).origOptions,
      dtstart: startDate.toDate(),
      tzid: timezone,
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
      const endTime = dayjs(occurrence)
        .add(experienceDuration, 'millisecond')
        .utc()
        .toDate();

      experienceEvents.push({
        experienceId,
        scheduleId: schedule.uid,
        startTime,
        endTime,
        timeZone: timezone,
        isRecurring: true,
        isDeleted: false,
        isCancelled: false,
        isLocked: false,
        bookings: [],
        createdAt: new Date(),
        ...metadata,
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
    timezone: string,
    metadata: Partial<IExperienceEvent>
  ): Partial<IExperienceEvent>[] {

    const startTime = dayjs.tz(
      schedule.startDate,
      'YYYY-MM-DD hh:mmA',
      timezone
    );

    let endTime: dayjs.Dayjs;

    if (schedule.endDate) {
      // Multi-day event
      endTime = dayjs.tz(schedule.endDate, 'YYYY-MM-DD hh:mmA', timezone);
    } else {
      // Single event with duration
      endTime = startTime.add(experienceDuration, 'millisecond');
    }

    return [{
      experienceId,
      scheduleId: schedule.uid,
      startTime: startTime.utc().toDate(),
      endTime: endTime.utc().toDate(),
      timeZone: timezone,
      isRecurring: false,
      isDeleted: false,
      isCancelled: false,
      isLocked: false,
      bookings: [],
      createdAt: new Date(),
      ...metadata,
    }];
  }

  /**
   * Create experience events in database
   */
  async createExperienceEvents(experienceEvents: Partial<IExperienceEvent>[]): Promise<IExperienceEvent[]> {
    // Batch insert
    const createdExperienceEvents = await ExperienceEvent.insertMany(sessions);
    return createdExperienceEvents;
  }

  /**
   * Update experience events when schedule changes
   */
  async updateExperienceEventsForSchedule(
    experienceId: string,
    scheduleId: string,
    newSchedule: ISchedule,
    experienceDuration: number,
    timezone: string,
    metadata: Partial<IExperienceEvent>
  ): Promise<void> {

    // Get existing sessions
    const existingExperienceEvents = await ExperienceEvent.find({
      experienceId,
      scheduleId,
      isDeleted: false,
      isLocked: false,
    });

    // Delete non-locked sessions
    await ExperienceEvent.updateMany(
      {
        experienceId,
        scheduleId,
        isLocked: false,
      },
      {
        isDeleted: true,
        updatedAt: new Date(),
      }
    );

    // Generate new sessions
    const newExperienceEvents = this.generateExperienceEvents(
      experienceId,
      newSchedule,
      experienceDuration,
      timezone,
      metadata
    );

    // Create new sessions
    await this.createExperienceEvents(newExperienceEvents);
  }

  /**
   * Delete all experience events for a schedule
   */
  async deleteExperienceEventsForSchedule(
    experienceId: string,
    scheduleId: string
  ): Promise<void> {

    await ExperienceEvent.updateMany(
      {
        experienceId,
        scheduleId,
        isLocked: false, // Don't delete locked sessions
      },
      {
        isDeleted: true,
        updatedAt: new Date(),
      }
    );
  }
}
```

### Step 4: Integrate with Experience Controller

```typescript
// File: src/controllers/experience.controller.ts

import { ExperienceEventService } from '@services/experienceEvent.service';

const experienceEventService = new ExperienceEventService();

export async function createExperience(
  request: FastifyRequest<{ Body: CreateExperienceInput }>,
  reply: FastifyReply
) {
  try {
    const data = request.body;

    // Create experience document
    const experience = await experienceService.createExperience(data);

    // Generate experience events for each schedule (async, don't block response)
    if (experience.schedules && experience.schedules.length > 0) {
      // Queue experienceEvent generation job
      void generateExperienceEventsForExperience(experience);
    }

    return reply.status(201).send({
      success: true,
      data: experience,
    });
  } catch (error) {
    // Error handling...
  }
}

async function generateExperienceEventsForExperience(experience: IExperience) {
  try {
    const allExperienceEventIds: string[] = [];

    for (const schedule of experience.schedules || []) {
      // Prepare metadata
      const metadata = {
        hubId: experience.hubId,
        title: `Experience | ${experience.experienceTitle}`,
        maximumCapacity: experience.maximumCapacity || 0,
        normalSeat: experience.maximumCapacity || 0,
        totalAvailableQty: calculateTotalTicketQty(experience.ticket),
        numberOfDiscoveryPass: experience.isDiscoveryPassAvailable
          ? experience.numberOfDiscoveryPass || 0
          : 0,
        numberOfLearnerPass: experience.isLearnerPassAvailable
          ? experience.numberOfLearnerPass || 0
          : 0,
        ticket: experience.ticket,
        ticketQty: buildTicketQtyMap(experience.ticket),
      };

      // Generate experienceEvents
      const experience events = experienceEventService.generateExperienceEvents(
        experience._id.toString(),
        schedule,
        experience.experienceDuration,
        experience.timeZone,
        metadata
      );

      // Create experience events in DB
      const createdExperienceEvents = await experienceEventService.createExperienceEvents(sessions);

      // Collect experienceEvent IDs
      allExperienceEventIds.push(...createdExperienceEvents.map(s => s._id.toString()));
    }

    // Update experience with experienceEvent references
    await Experience.findByIdAndUpdate(experience._id, {
      experienceEvents: allExperienceEventIds,
      updatedAt: new Date(),
    });

  } catch (error) {
    // Log error but don't throw (background job)
    console.error('Error generating experienceEvents:', error);
  }
}

function calculateTotalTicketQty(tickets: ITicket[]): number {
  return tickets.reduce((sum, ticket) => sum + (ticket.ticketQty || 0), 0);
}

function buildTicketQtyMap(tickets: ITicket[]): Map<string, { max: number; available: number }> {
  const map = new Map();
  tickets.forEach(ticket => {
    map.set(ticket.id, {
      max: ticket.ticketQty || 0,
      available: ticket.ticketQty || 0,
    });
  });
  return map;
}
```

### Step 5: Handle Schedule Updates

```typescript
export async function updateExperience(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateExperienceInput }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const data = request.body;

    // Get existing experience
    const existingExperience = await Experience.findById(id);
    if (!existingExperience) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Experience not found' },
      });
    }

    // Update experience
    const updatedExperience = await experienceService.updateExperience(id, data);

    // Check if schedules changed
    if (data.schedules) {
      void handleScheduleChanges(existingExperience, updatedExperience);
    }

    return reply.status(200).send({
      success: true,
      data: updatedExperience,
    });
  } catch (error) {
    // Error handling...
  }
}

async function handleScheduleChanges(
  oldExperience: IExperience,
  newExperience: IExperience
) {
  try {
    const oldSchedules = oldExperience.schedules || [];
    const newSchedules = newExperience.schedules || [];

    // Detect changes
    for (const newSchedule of newSchedules) {
      const oldSchedule = oldSchedules.find(s => s.uid === newSchedule.uid);

      if (!oldSchedule) {
        // New schedule added - generate experienceEvents
        await generateExperienceEventsForSchedule(newExperience, newSchedule);
      } else if (hasScheduleChanged(oldSchedule, newSchedule)) {
        // Schedule modified - regenerate experienceEvents
        await experienceEventService.updateExperienceEventsForSchedule(
          newExperience._id.toString(),
          newSchedule.uid,
          newSchedule,
          newExperience.experienceDuration,
          newExperience.timeZone,
          buildExperienceEventMetadata(newExperience)
        );
      }
    }

    // Detect deleted schedules
    for (const oldSchedule of oldSchedules) {
      const stillExists = newSchedules.find(s => s.uid === oldSchedule.uid);
      if (!stillExists) {
        // Schedule removed - soft delete experienceEvents
        await experienceEventService.deleteExperienceEventsForSchedule(
          newExperience._id.toString(),
          oldSchedule.uid
        );
      }
    }
  } catch (error) {
    console.error('Error handling schedule changes:', error);
  }
}

function hasScheduleChanged(old: ISchedule, current: ISchedule): boolean {
  return (
    old.startDate !== current.startDate ||
    old.endDate !== current.endDate ||
    old.recurringType !== current.recurringType ||
    JSON.stringify(old.recurringRule) !== JSON.stringify(current.recurringRule)
  );
}
```

### Step 6: Add ExperienceEvent Routes

```typescript
// File: src/routes/experienceEvent.routes.ts

export async function experienceEventRoutes(fastify: FastifyInstance) {
  // Get experienceEvents for an experience
  fastify.get('/experiences/:experienceId/experience-events', {
    schema: {
      tags: ['ExperienceEvents'],
      summary: 'Get all experienceEvents for an experience',
      params: z.object({
        experienceId: z.string(),
      }),
      querystring: z.object({
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        limit: z.number().optional(),
      }),
    },
    handler: getExperienceEventsForExperience,
  });

  // Get upcoming experienceEvents
  fastify.get('/experience-events/upcoming', {
    schema: {
      tags: ['ExperienceEvents'],
      summary: 'Get upcoming experienceEvents',
    },
    handler: getUpcomingExperienceEvents,
  });

  // Lock an experienceEvent (prevent auto-updates)
  fastify.patch('/experience-events/:experienceEventId/lock', {
    schema: {
      tags: ['ExperienceEvents'],
      summary: 'Lock an experienceEvent to prevent automatic updates',
    },
    handler: lockExperienceEvent,
  });
}
```

### Step 7: Testing

Create comprehensive tests:

```typescript
// File: tests/integration/experienceEvent.routes.test.ts

describe('ExperienceEvent Generation', () => {
  it('should generate 500 experience events for weekly recurring schedule', async () => {
    const experience = await createTestExperience({
      schedules: [{
        uid: 'schedule1',
        recurringType: 'weekly',
        recurringRule: [
          'DTSTART:20251115T100000',
          'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'
        ],
        startDate: '2025-11-15T10:00:00Z',
      }],
    });

    // Wait for background job
    await wait(2000);

    const experienceEvents = await ExperienceEvent.find({ experienceId: experience._id });
    expect(experienceEvents.length).toBeLessThanOrEqual(500);
    expect(experienceEvents[0].startTime).toBeDefined();
  });

  it('should generate 1 experienceEvent for non-repeating schedule', async () => {
    // Test non-repeat logic
  });

  it('should update experience events when schedule changes', async () => {
    // Test update logic
  });

  it('should soft delete experience events when schedule is removed', async () => {
    // Test delete logic
  });
});
```

---

## Best Practices

### 1. Performance Considerations

- **Batch inserts**: Use `insertMany()` instead of individual `create()` calls
- **Background jobs**: Don't block API responses waiting for experienceEvent generation
- **Indexing**: Add indexes on `experienceId`, `scheduleId`, `startTime`, `hubId`
- **Limit occurrences**: Cap at 500 or 3 years to prevent database bloat

### 2. Data Integrity

- **Transactions**: Use MongoDB transactions when updating experience + experienceEvents
- **Locked experienceEvents**: Respect `isLocked` flag for experienceEvents with bookings
- **Soft deletes**: Never hard delete experienceEvents with bookings

### 3. Frontend Sync

- **RRule format**: Ensure frontend sends RRule in the correct format
- **Timezone handling**: Always use experience's timezone for generation
- **Validation**: Validate RRule strings before saving

### 4. Monitoring

- **Log generation time**: Track how long experienceEvent generation takes
- **Alert on failures**: Monitor failed background jobs
- **Audit trail**: Keep history of schedule changes

---

## Advanced Features & Flexibility

### 1. Dynamic Event Generation Strategies

The v2 backend supports flexible event generation with multiple strategies:

#### A. On-Demand Generation
Generate experienceEvents only when needed (e.g., user views calendar):

```typescript
export class ExperienceEventService {
  async getUpcomingEvents(
    experienceId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<IExperienceEvent[]> {
    // Check if events exist in DB
    let events = await ExperienceEvent.find({
      experienceId,
      startTime: { $gte: fromDate, $lte: toDate },
      isDeleted: false,
    });

    // If no events found, generate on-the-fly
    if (events.length === 0) {
      const experience = await Experience.findById(experienceId);
      if (experience?.schedules) {
        events = await this.generateAndSaveEvents(
          experience,
          fromDate,
          toDate
        );
      }
    }

    return events;
  }
}
```

#### B. Progressive Generation
Generate events in batches to avoid overwhelming the database:

```typescript
async generateProgressively(
  experience: IExperience,
  batchSize: number = 100
): Promise<void> {
  const schedules = experience.schedules || [];

  for (const schedule of schedules) {
    let generated = 0;
    const totalLimit = 500;

    while (generated < totalLimit) {
      const events = this.generateExperienceEvents(
        experience._id.toString(),
        schedule,
        experience.experienceDuration,
        experience.timeZone,
        metadata,
        Math.min(batchSize, totalLimit - generated)
      );

      await this.createExperienceEvents(events);
      generated += events.length;

      if (events.length < batchSize) break; // No more events
    }
  }
}
```

#### C. Rolling Window Generation
Only generate events for a specific time window (e.g., next 6 months):

```typescript
async maintainRollingWindow(
  windowMonths: number = 6
): Promise<void> {
  const now = new Date();
  const windowEnd = dayjs(now).add(windowMonths, 'month').toDate();

  const experiences = await Experience.find({
    status: { $in: ['ACTIVE', 'DRAFTED'] },
  });

  for (const experience of experiences) {
    // Find the latest event
    const latestEvent = await ExperienceEvent
      .findOne({ experienceId: experience._id })
      .sort({ startTime: -1 });

    if (!latestEvent || dayjs(latestEvent.startTime).isBefore(windowEnd)) {
      // Generate more events to fill the window
      await this.fillWindow(experience, windowEnd);
    }
  }
}
```

### 2. Intelligent Schedule Conflict Detection

Prevent double-booking and scheduling conflicts:

```typescript
async detectConflicts(
  hubId: string,
  newSchedule: ISchedule,
  experienceDuration: number,
  timezone: string
): Promise<{ hasConflict: boolean; conflicts: IExperienceEvent[] }> {
  // Generate proposed events
  const proposedEvents = this.generateExperienceEvents(
    'temp',
    newSchedule,
    experienceDuration,
    timezone,
    {}
  );

  // Check for existing events in the same time slots
  const conflicts: IExperienceEvent[] = [];

  for (const proposed of proposedEvents) {
    const overlap = await ExperienceEvent.findOne({
      hubId,
      isDeleted: false,
      $or: [
        {
          // New event starts during existing event
          startTime: { $lte: proposed.startTime },
          endTime: { $gt: proposed.startTime },
        },
        {
          // New event ends during existing event
          startTime: { $lt: proposed.endTime },
          endTime: { $gte: proposed.endTime },
        },
        {
          // New event encompasses existing event
          startTime: { $gte: proposed.startTime },
          endTime: { $lte: proposed.endTime },
        },
      ],
    });

    if (overlap) conflicts.push(overlap);
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}
```

### 3. Smart Capacity Management

Track and update capacity across experienceEvents:

```typescript
async updateCapacityForSchedule(
  scheduleId: string,
  capacityChanges: {
    maximumCapacity?: number;
    numberOfDiscoveryPass?: number;
    numberOfLearnerPass?: number;
  }
): Promise<void> {
  // Only update future events that haven't been booked
  const futureEvents = await ExperienceEvent.find({
    scheduleId,
    startTime: { $gte: new Date() },
    isDeleted: false,
    'bookings.0': { $exists: false }, // No bookings
  });

  const updates: any = {};

  if (capacityChanges.maximumCapacity !== undefined) {
    updates.maximumCapacity = capacityChanges.maximumCapacity;
    updates.normalSeat = capacityChanges.maximumCapacity;
  }

  if (capacityChanges.numberOfDiscoveryPass !== undefined) {
    updates.numberOfDiscoveryPass = capacityChanges.numberOfDiscoveryPass;
  }

  if (capacityChanges.numberOfLearnerPass !== undefined) {
    updates.numberOfLearnerPass = capacityChanges.numberOfLearnerPass;
  }

  await ExperienceEvent.updateMany(
    { _id: { $in: futureEvents.map(e => e._id) } },
    { $set: updates }
  );
}
```

### 4. Event Override System

Allow hosts to customize individual occurrences:

```typescript
interface IExperienceEventOverride {
  experienceEventId: Types.ObjectId;
  overrides: {
    startTime?: Date;
    endTime?: Date;
    maximumCapacity?: number;
    customPrice?: number;
    customNote?: string;
    isCancelled?: boolean;
  };
  reason?: string;
  createdAt: Date;
}

async overrideEvent(
  experienceEventId: string,
  overrides: any
): Promise<IExperienceEvent> {
  const event = await ExperienceEvent.findById(experienceEventId);

  if (!event) {
    throw new Error('ExperienceEvent not found');
  }

  // Lock the event to prevent auto-updates
  event.isLocked = true;

  // Apply overrides
  Object.assign(event, overrides);

  // Save override history
  if (!event.overrideHistory) {
    event.overrideHistory = [];
  }

  event.overrideHistory.push({
    timestamp: new Date(),
    changes: overrides,
  });

  await event.save();
  return event;
}
```

### 5. Flexible Recurrence Patterns

Support complex recurrence beyond basic RRule:

```typescript
// Example: Every 2nd and 4th Monday of the month
const complexPattern = {
  recurringRule: [
    'DTSTART:20251110T100000',
    'RRULE:FREQ=MONTHLY;BYDAY=2MO,4MO'
  ]
};

// Example: Custom pattern - First weekday of each month
const customPattern = {
  recurringRule: [
    'DTSTART:20251201T090000',
    'RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=1'
  ]
};

// Example: Specific dates
const specificDates = {
  recurringType: 'specific_dates',
  dates: [
    '2025-12-25T10:00:00Z',
    '2025-12-26T10:00:00Z',
    '2026-01-01T10:00:00Z'
  ]
};
```

### 6. Event Cleanup & Archival

Automatically clean up old events:

```typescript
// Run as a cron job
async cleanupOldEvents(): Promise<void> {
  const sixMonthsAgo = dayjs().subtract(6, 'month').toDate();

  // Soft delete old events with no bookings
  await ExperienceEvent.updateMany(
    {
      endTime: { $lt: sixMonthsAgo },
      'bookings.0': { $exists: false },
      isDeleted: false,
    },
    {
      $set: { isDeleted: true, deletedAt: new Date() },
    }
  );

  // Archive events older than 1 year (move to archive collection)
  const oneYearAgo = dayjs().subtract(1, 'year').toDate();

  const oldEvents = await ExperienceEvent.find({
    endTime: { $lt: oneYearAgo },
    isDeleted: true,
  });

  if (oldEvents.length > 0) {
    await ExperienceEventArchive.insertMany(oldEvents);
    await ExperienceEvent.deleteMany({
      _id: { $in: oldEvents.map(e => e._id) },
    });
  }
}
```

### 7. Real-time Event Availability

WebSocket support for real-time capacity updates:

```typescript
// When a booking is made
async onBookingCreated(booking: IBooking): Promise<void> {
  const event = await ExperienceEvent.findById(booking.experienceEventId);

  if (!event) return;

  // Update ticket quantities
  for (const bookedTicket of booking.tickets) {
    const ticketQty = event.ticketQty.get(bookedTicket.ticketId);
    if (ticketQty) {
      ticketQty.available -= bookedTicket.quantity;
      event.ticketQty.set(bookedTicket.ticketId, ticketQty);
    }
  }

  // Add booking reference
  event.bookings.push(booking._id);
  event.totalAvailableQty -= booking.totalQuantity;

  await event.save();

  // Emit real-time update via WebSocket
  websocketService.emit('experienceEvent:updated', {
    experienceEventId: event._id,
    availableSeats: event.totalAvailableQty,
    ticketQty: Object.fromEntries(event.ticketQty),
  });
}
```

---

## API Endpoints Summary

### ExperienceEvent Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/experiences/:id/experience-events` | Get all experienceEvents for an experience |
| GET | `/api/v1/experience-events/upcoming` | Get upcoming experienceEvents across all experiences |
| GET | `/api/v1/experience-events/:id` | Get experienceEvent by ID |
| PATCH | `/api/v1/experience-events/:id/lock` | Lock experienceEvent to prevent auto-updates |
| DELETE | `/api/v1/experience-events/:id` | Soft delete an experienceEvent |

### Experience Endpoints (ExperienceEvent Aware)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/experiences` | Create experience + generate experience events |
| PATCH | `/api/v1/experiences/:id` | Update experience + sync experience events |
| DELETE | `/api/v1/experiences/:id` | Delete experience + soft delete experience events |

---

## Related Documentation

- [RRule Documentation](https://github.com/jakubroztocil/rrule)
- [Experience Model](../database/MIGRATION-GUIDE.md)
- [Booking System](./EXPERIENCE-BOOKING-SYSTEM.md)
- [Frontend Integration](./FRONTEND-INTEGRATION.md)

---

## Future Enhancements

### 1. Smart ExperienceEvent Pruning

Automatically archive or delete experience events that are:
- More than 6 months in the past
- Have no bookings
- Are part of inactive experiences

### 2. ExperienceEvent Override

Allow hosts to override individual experienceEvent details:
- Change time for specific occurrence
- Adjust capacity for high-demand dates
- Add special pricing for holidays

### 3. Bulk Operations

Admin tools to:
- Cancel all experience events for a date range
- Update capacity across multiple experienceEvents
- Reschedule experience events en masse

### 4. Calendar Sync

Export experience events to:
- Google Calendar
- iCal format
- Outlook Calendar

---

**Last Updated:** 2025-11-10
**Status:** Ready for Implementation
**Priority:** High (Core booking feature)
