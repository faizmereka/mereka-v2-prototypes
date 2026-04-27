# SpaceType Feature

## Overview

The SpaceType feature defines categories of physical spaces that hubs can offer. Space types help learners understand what kind of environment is available for their learning experiences and help hubs organize their physical offerings.

## Business Context

Space Types are essential for:
- **Hub Space Organization** - Categorize different areas within a hub
- **Booking & Scheduling** - Match space requirements with availability
- **Experience Planning** - Ensure appropriate space for activities
- **Filtering** - Search hubs by available space types
- **Pricing** - Different space types may have different rates
- **Capacity Planning** - Space types have typical capacity ranges

Examples: Conference Room, Studio, Classroom, Workshop Area, Coworking Space, Event Hall, Meeting Room, Private Office, Creative Space

## Model Structure

**Location:** `src/models/SpaceType.ts`

### Core Fields

#### Basic Information
- `name` (required, unique, indexed) - Space type name (e.g., "Conference Room")
- `description` (optional) - Detailed explanation of this space type

#### Status
- `isActive` (boolean, indexed, default: true) - Whether space type is visible and selectable

#### Metadata
- `priority` (number, default: 0) - Sort order for display (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `name` (unique) - Ensure unique space type names
- `isActive` (standard) - Filter active space types

### Compound Indexes
- `{ isActive: 1, priority: 1 }` - Get active space types sorted by priority

## Relationships

### Referenced By
- **Hub** - Hubs reference space types via `spaceTypes` array
  - Hub can have multiple space types
  - Stored as: `spaceTypes: [ObjectId]` (array of SpaceType IDs)
  - Populated to show full details

### Future Usage
- **Space** (when implemented) - Individual space bookings will reference space types
- **Experience** (potential) - Experiences may specify required space type

## API Endpoints

**Base Path:** `/api/v1/space-types`

### GET /
**Get All Space Types**
- **Auth:** None
- **Query:** `includeInactive` (optional) - Include inactive space types
- **Returns:** Array of space types sorted by priority

### GET /:id
**Get Space Type by ID**
- **Auth:** None
- **Params:** `id` - SpaceType ObjectId
- **Returns:** Single space type object

### POST /
**Create Space Type**
- **Auth:** Required
- **Body:**
  ```json
  {
    "name": "Conference Room",
    "description": "Professional meeting space with presentation equipment",
    "priority": 1
  }
  ```
- **Returns:** Created space type object

### PATCH /:id
**Update Space Type**
- **Auth:** Required
- **Params:** `id` - SpaceType ObjectId
- **Body:** Partial space type object
- **Returns:** Updated space type object

### DELETE /:id
**Delete Space Type (Soft Delete)**
- **Auth:** Required
- **Params:** `id` - SpaceType ObjectId
- **Action:** Sets `isActive: false`
- **Returns:** Success message

## Business Logic

### Naming Convention
- Clear, descriptive names
- Title Case
- 1-3 words typical
- Use common industry terms

### Description Guidelines
- 1-2 sentences explaining the space
- Mention typical features or uses
- Clarify capacity range if relevant
- Examples:
  - **Conference Room:** Professional meeting space with presentation equipment and seating for 10-50 people
  - **Studio:** Specialized space for creative work, recording, or production
  - **Workshop Area:** Hands-on learning space with workbenches and tools

### Priority System
- Lower numbers = higher priority
- Order by commonality:
  - Conference Room: 1
  - Classroom: 2
  - Meeting Room: 3
- Default: 0

## Query Patterns

### Get Active Space Types for Selection
```typescript
const spaceTypes = await SpaceType.find({ isActive: true })
  .sort({ priority: 1, name: 1 })
  .select('name description')
  .lean();
```

### Get Hub Space Types (Populated)
```typescript
const hub = await Hub.findById(hubId)
  .populate('spaceTypes', 'name description')
  .lean();
```

### Get Popular Space Types
```typescript
const popularSpaceTypes = await SpaceType.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'hubs',
      localField: '_id',
      foreignField: 'spaceTypes',
      as: 'hubs',
    },
  },
  {
    $project: {
      name: 1,
      hubCount: { $size: '$hubs' },
    },
  },
  { $sort: { hubCount: -1 } },
]);
```

## File References

- **Model:** `src/models/SpaceType.ts`
- **Schema:** `src/schemas/reference-data.schema.ts`
- **Controller:** `src/controllers/space-type.controller.ts`
- **Service:** `src/services/space-type.service.ts`
- **Routes:** `src/routes/space-type.routes.ts`

## Related Documentation

- [Hub](../hub/README.md) - Hubs have space types
- [Facility](../facility/README.md) - Facilities available in spaces
- [Amenity](../amenity/README.md) - Amenities available in spaces

## Usage Examples

### Create Space Type
```typescript
const spaceType = await SpaceType.create({
  name: "Creative Studio",
  description: "Open space for creative work with natural lighting and flexible layout",
  isActive: true,
  priority: 5,
});
```

### Add Space Type to Hub
```typescript
await Hub.findByIdAndUpdate(hubId, {
  $addToSet: { spaceTypes: spaceTypeId },
});
```

## Validation Rules

### Name
- Required, unique, trimmed
- Length: 2-50 characters

### Description
- Optional, trimmed
- Length: 10-200 characters

### Priority
- Default: 0
- Any integer

## Typical Space Types by Category

### Meeting & Conference
- **Conference Room** - Large formal meeting space (10-50 people)
- **Meeting Room** - Small meeting space (4-10 people)
- **Boardroom** - Executive meeting space
- **Seminar Room** - Training/presentation space

### Learning & Training
- **Classroom** - Traditional learning environment with desks
- **Training Room** - Flexible space for instruction
- **Lecture Hall** - Large auditorium-style space (50+ people)
- **Workshop Area** - Hands-on learning with equipment

### Creative & Production
- **Studio** - Recording, photography, or production space
- **Creative Space** - Open area for artistic work
- **Maker Space** - DIY workshop with tools and equipment
- **Art Studio** - Space for visual arts

### Collaborative Work
- **Coworking Space** - Shared workspace with hot desks
- **Private Office** - Enclosed individual workspace
- **Team Room** - Dedicated team workspace
- **Breakout Area** - Informal collaboration space

### Events
- **Event Hall** - Large space for events and gatherings
- **Ballroom** - Formal event space
- **Exhibition Space** - Display and exhibition area
- **Auditorium** - Performance or presentation venue

### Specialized
- **Lab** - Scientific or technical laboratory
- **Kitchen** - Cooking and food preparation space
- **Gym/Fitness Studio** - Exercise and wellness space
- **Theater** - Performance space with stage

## Typical Characteristics by Space Type

### Conference Room
- Capacity: 10-50 people
- Setup: Boardroom, U-shape, theater
- Equipment: Projector, whiteboard, video conferencing
- Usage: Meetings, presentations, workshops

### Studio
- Capacity: 5-20 people
- Setup: Flexible, open layout
- Equipment: Recording equipment, lighting, backdrops
- Usage: Recording, production, creative work

### Classroom
- Capacity: 20-40 people
- Setup: Rows of desks facing front
- Equipment: Whiteboard, projector, desks
- Usage: Teaching, training, lectures

## Space Type vs Facility

**Space Type** = Category of physical space (Conference Room, Studio)
**Facility** = Equipment/features within the space (Projector, Sound System)

A Conference Room (space type) may have a Projector and Whiteboard (facilities).

## Future Enhancements

1. Space type capacity ranges
2. Typical setup configurations
3. Standard facility packages per space type
4. Space type pricing models
5. Space type booking rules
6. 360° virtual tours per space type
7. Space type availability calendars
8. Space type reviews/ratings
9. Space type images/galleries
10. Space layout templates
