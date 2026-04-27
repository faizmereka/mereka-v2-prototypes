# ExperienceEvent Feature

## Overview

The ExperienceEvent feature represents individual event instances generated from Experience schedules. While an Experience defines the template and recurring rules, ExperienceEvents are the actual datetime occurrences that learners can book.

## Business Context

ExperienceEvents solve the recurring event problem:
- An Experience might repeat "Every Monday at 3 PM"
- ExperienceEvents are the concrete instances: "Monday Jan 8, 2024 at 3 PM", "Monday Jan 15, 2024 at 3 PM", etc.
- Learners book specific ExperienceEvents, not the Experience itself
- Events can be individually cancelled or modified without affecting the parent Experience

## Model Structure

**Location:** `src/models/ExperienceEvent.ts`

### Core Fields

#### References
- `experienceId` (required, indexed) - Reference to parent Experience (ObjectId)
- `scheduleId` (required, indexed) - UID of the schedule in `Experience.schedules[]` that generated this event

#### Event Details
- `startTime` (required, indexed) - When the event starts (Date)
- `endTime` (required) - When the event ends (Date)
- `timeZone` (required) - Timezone for this event (string)

#### Recurrence
- `isRecurring` (boolean, default: false) - If this event is part of a recurring series

#### Status
- `status` (required, indexed) - ACTIVE | CANCELLED | DELETED (default: ACTIVE)
- `isLocked` (boolean, indexed, default: false) - Locked events won't be auto-updated by schedule changes

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `experienceId` (standard)
- `scheduleId` (standard)
- `startTime` (standard)
- `status` (standard)
- `isLocked` (standard)

### Compound Indexes
- `{ experienceId: 1, startTime: 1 }` - Get all events for an experience in chronological order
- `{ scheduleId: 1, status: 1 }` - Get events by schedule and status
- `{ startTime: 1, status: 1 }` - Query events by date range and status

## Relationships

### Parent
- **Experience** - `experienceId` references Experience collection
  - ExperienceEvent belongs to one Experience
  - Experience has many ExperienceEvents

### Related
- **Booking** (future) - Bookings will reference ExperienceEvent
- **Schedule** - `scheduleId` links to specific schedule UID in Experience.schedules array

## Data Flow

### Event Generation
```
Experience.schedules[] → ExperienceEvent Generation Service → ExperienceEvent documents
```

1. Experience has schedules with recurring rules
2. System generates ExperienceEvents based on rules
3. Events created with `isLocked: false` (can be auto-updated)
4. Manual edits set `isLocked: true` (prevent auto-updates)

### Event Lifecycle
1. **ACTIVE** - Available for booking
2. **CANCELLED** - Event cancelled but kept in history
3. **DELETED** - Soft deleted (not shown)

## Business Logic

### Event Generation Rules

#### One-Time Events
```typescript
Schedule: {
  recurringType: "once",
  startDate: "2024-01-15T15:00:00Z",
  // No endDate or recurringRule
}
→ Creates 1 ExperienceEvent
```

#### Recurring Events
```typescript
Schedule: {
  recurringType: "weekly",
  startDate: "2024-01-15T15:00:00Z",
  endDate: "2024-03-15T15:00:00Z",
  recurringRule: ["Monday", "Wednesday"]
}
→ Creates ExperienceEvents for every Monday and Wednesday between start and end dates
```

#### Multi-Day Events
```typescript
Experience: {
  isMultiDay: true,
  schedules: [{
    startDate: "2024-01-15T09:00:00Z",
    endDate: "2024-01-17T17:00:00Z"
  }]
}
→ Creates 1 ExperienceEvent spanning 3 days
```

### Locking Mechanism

**Unlocked Events** (`isLocked: false`)
- Auto-regenerated when parent Experience schedule changes
- Can be bulk-cancelled if schedule is removed
- Always reflect latest schedule configuration

**Locked Events** (`isLocked: true`)
- Set when manually edited by user
- Not affected by schedule changes
- Preserved even if parent schedule is deleted
- Used for exceptions (one-off time changes, special occurrences)

### Status Management

#### ACTIVE
- Default state for new events
- Visible to learners
- Bookable (if capacity available)

#### CANCELLED
- Event cancelled but history preserved
- Not bookable
- Existing bookings notified
- Shown in admin views with "cancelled" label

#### DELETED
- Soft deleted
- Not shown anywhere (admin or public)
- Cannot be re-activated (create new event instead)

### Timezone Handling
- Events inherit timezone from parent Experience
- `startTime` and `endTime` stored in UTC
- `timeZone` field stores IANA timezone (e.g., "Asia/Kuala_Lumpur")
- Display always converts to appropriate timezone

## API Endpoints

**Note:** ExperienceEvents are typically managed through the Experience API, not directly exposed.

### Internal Usage
Events are included in Experience GET responses:
```
GET /api/v1/experiences/:id
→ Returns experience with experienceEvents array
```

## Query Patterns

### Get Upcoming Events for Experience
```typescript
const events = await ExperienceEvent.find({
  experienceId: experienceId,
  startTime: { $gte: new Date() },
  status: 'ACTIVE',
})
  .sort({ startTime: 1 })
  .limit(10)
  .lean();
```

### Get Events in Date Range
```typescript
const events = await ExperienceEvent.find({
  startTime: { $gte: startDate, $lte: endDate },
  status: 'ACTIVE',
})
  .sort({ startTime: 1 })
  .lean();
```

### Get Events by Schedule
```typescript
const events = await ExperienceEvent.find({
  scheduleId: scheduleUid,
  status: { $ne: 'DELETED' },
})
  .sort({ startTime: 1 })
  .lean();
```

### Get Locked Events
```typescript
const lockedEvents = await ExperienceEvent.find({
  experienceId: experienceId,
  isLocked: true,
})
  .sort({ startTime: 1 })
  .lean();
```

## File References

- **Model:** `src/models/ExperienceEvent.ts`
- **Service:** `src/services/experience-event.service.ts` (if exists)
- **Related:** `src/services/experience.service.ts` (event generation logic)

## Related Documentation

- [Experience](../experience/README.md) - Parent experience
- [Recurring Events System](../../architecture/RECURRING-EVENTS-SYSTEM.md) - System architecture

## Migration Notes

### From Firebase
- Firebase may have stored events inline with experiences
- Or in separate `experienceEvents` collection
- Check for `isLocked` equivalent field
- Timezone data may need conversion

## Usage Examples

### Create Event Manually
```typescript
const event = await ExperienceEvent.create({
  experienceId: new Types.ObjectId(experienceId),
  scheduleId: "schedule-uuid",
  startTime: new Date("2024-01-15T15:00:00Z"),
  endTime: new Date("2024-01-15T17:00:00Z"),
  timeZone: "Asia/Kuala_Lumpur",
  isRecurring: false,
  status: "ACTIVE",
  isLocked: false,
});
```

### Cancel Event
```typescript
await ExperienceEvent.findByIdAndUpdate(eventId, {
  status: "CANCELLED",
  isLocked: true, // Prevent regeneration
});
```

### Lock Event (Prevent Auto-Updates)
```typescript
await ExperienceEvent.findByIdAndUpdate(eventId, {
  isLocked: true,
});
```

### Delete Events for Removed Schedule
```typescript
await ExperienceEvent.updateMany(
  {
    scheduleId: removedScheduleUid,
    isLocked: false, // Only delete unlocked events
    startTime: { $gte: new Date() }, // Only future events
  },
  {
    status: "DELETED",
  }
);
```

## Performance Considerations

1. **Compound Indexes** - Query by experience and time range is indexed
2. **Lean Queries** - Always use `.lean()` for read operations
3. **Pagination** - Paginate large date ranges
4. **Limit Results** - Limit upcoming events to reasonable number (10-50)
5. **Background Jobs** - Generate events in background for long recurring series

## Event Generation Strategy

### Immediate Generation
- Generate next 3-6 months of events on schedule creation
- Generate next batch when current events are 2 months from end

### On-Demand Generation
- Generate on-the-fly when querying if not found
- Cache generated events

### Batch Regeneration
- Nightly job to ensure all active experiences have events
- Regenerate unlocked events if schedule changed

## Edge Cases

### Schedule Changes
1. **Unlocked Events**: Regenerate all future events
2. **Locked Events**: Keep unchanged (user intended exception)
3. **Past Events**: Never regenerate (history preserved)

### Experience Deletion
1. **Soft Delete Experience**: Set all events to DELETED
2. **Keep History**: Events remain for reporting

### Timezone Changes
1. **Update unlocked events** with new timezone
2. **Keep locked events** unchanged
3. **Recalculate display times**

### Capacity Management
- ExperienceEvent doesn't store capacity
- Capacity calculated from parent Experience.maximumCapacity
- Check bookings count against capacity

## Security Considerations

1. **No Direct API** - Events managed through Experience API
2. **Lock Validation** - Prevent unlocking system-locked events
3. **Status Transitions** - Validate allowed transitions
4. **Timezone Validation** - Ensure valid IANA timezone

## Testing

- **Unit Tests:** `tests/unit/experience-event.service.test.ts`
- **Integration Tests:** `tests/integration/experience.routes.test.ts` (includes events)
- **Test Fixtures:** `tests/fixtures/experience-event.fixture.ts`

## Monitoring & Observability

### Key Metrics
- Events generated per day
- Locked vs unlocked event ratio
- Cancelled event rate
- Events without bookings
- Event generation errors

### Alerts
- Failed event generation
- Negative event count for experience
- Events in the past still ACTIVE
- Missing events for active schedules

## Future Enhancements

1. Event reminders/notifications
2. Event capacity override per event
3. Event-specific pricing
4. Event waitlist
5. Event feedback/ratings
6. Event analytics dashboard
