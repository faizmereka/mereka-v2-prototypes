# Facility Feature

## Overview

The Facility feature defines equipment, infrastructure, and physical features available at Hub locations. Facilities represent the tools and resources that enable learning and work activities (e.g., Projector, Whiteboard, Studio, Sound System).

## Business Context

Facilities are essential for:
- **Hub Capabilities** - Showcase what equipment/infrastructure is available
- **Experience Planning** - Ensure hub has necessary facilities for activities
- **Learner Expectations** - Know what tools will be available
- **Space Booking** - Match facility needs with available spaces
- **Hub Differentiation** - Highlight specialized equipment
- **Filtering** - Allow users to search hubs by available facilities

Examples:
- **Projector** - Visual presentation equipment
- **Whiteboard** - Writing/brainstorming surfaces
- **Sound System** - Audio equipment
- **Studio** - Recording or production space
- **Kitchen** - Food preparation area
- **Stage** - Performance area
- **Video Equipment** - Cameras, lighting
- **Musical Instruments** - Pianos, guitars, etc.
- **Lab Equipment** - Scientific instruments
- **Art Supplies** - Creative materials

## Model Structure

**Location:** `src/models/Facility.ts`

### Core Fields

#### Basic Information
- `name` (required, unique, indexed) - Facility name (e.g., "Projector & Screen")

#### Status
- `isActive` (boolean, indexed, default: true) - Whether facility is visible and selectable

#### Metadata
- `priority` (number, default: 0) - Sort order for display (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `name` (unique) - Ensure unique facility names
- `isActive` (standard) - Filter active facilities

### Compound Indexes
- `{ isActive: 1, priority: 1 }` - Get active facilities sorted by priority

## Relationships

### Referenced By
- **Hub** - Hubs reference facilities via `facilities` array
  - Hub can have multiple facilities
  - Stored as: `facilities: [ObjectId]` (array of Facility IDs)
  - Populated on retrieval to show full facility details

### Future Usage
- **Space** (when implemented) - Spaces within hubs may have specific facilities
- **Experience** (potential) - Experiences may require specific facilities

## API Endpoints

**Base Path:** `/api/v1/facilities`

### GET /
**Get All Facilities**
- **Auth:** None
- **Query:**
  - `includeInactive` (optional) - Include inactive facilities (true/false)
- **Returns:** Array of facilities sorted by priority
- **Default:** Returns only active facilities

### GET /:id
**Get Facility by ID**
- **Auth:** None
- **Params:** `id` - Facility ObjectId (must be valid 24-char hex)
- **Returns:** Single facility object

### POST /
**Create Facility**
- **Auth:** Required (Bearer token)
- **Body:**
  ```json
  {
    "name": "Projector & Screen",
    "priority": 1
  }
  ```
- **Validation:** Uses `createReferenceDataSchema`
- **Returns:** Created facility object

### PATCH /:id
**Update Facility**
- **Auth:** Required (Bearer token)
- **Params:** `id` - Facility ObjectId
- **Body:** Partial facility object
  ```json
  {
    "priority": 5,
    "isActive": false
  }
  ```
- **Validation:** Uses `updateReferenceDataSchema`
- **Returns:** Updated facility object

### DELETE /:id
**Delete Facility (Soft Delete)**
- **Auth:** Required (Bearer token)
- **Params:** `id` - Facility ObjectId
- **Action:** Sets `isActive: false`
- **Returns:** Success message
- **Note:** Soft delete only, document preserved

## Business Logic

### Naming Convention
- Clear, descriptive names
- Include key details (e.g., "HD Projector & Screen" not just "Projector")
- Title Case recommended
- 2-5 words typical

### Priority System
- Lower numbers = higher priority (displayed first)
- Essential facilities get lower priority:
  - Projector: 1
  - Whiteboard: 2
  - Sound System: 3
- Specialized facilities get higher priority
- Default: 0

### Soft Delete
- Facilities never hard-deleted
- `isActive: false` hides from selection
- Preserves historical data in hubs
- Can be re-activated

## Query Patterns

### Get Active Facilities for Selection
```typescript
const facilities = await Facility.find({ isActive: true })
  .sort({ priority: 1, name: 1 })
  .select('name')
  .lean();
```

### Get Hub Facilities (Populated)
```typescript
const hub = await Hub.findById(hubId)
  .populate('facilities', 'name priority')
  .lean();
```

### Check Duplicate Name
```typescript
const existing = await Facility.findOne({
  name: facilityName,
  _id: { $ne: currentFacilityId },
});

if (existing) {
  throw new Error('Facility with this name already exists');
}
```

### Get Popular Facilities
```typescript
const facilities = await Facility.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'hubs',
      localField: '_id',
      foreignField: 'facilities',
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
  { $limit: 10 },
]);
```

## File References

- **Model:** `src/models/Facility.ts`
- **Schema:** `src/schemas/reference-data.schema.ts` (shared)
- **Controller:** `src/controllers/facility.controller.ts`
- **Service:** `src/services/facility.service.ts`
- **Routes:** `src/routes/facility.routes.ts`

## Related Documentation

- [Hub](../hub/README.md) - Primary user of facilities
- [Amenity](../amenity/README.md) - Similar but for comforts/conveniences
- [SpaceType](../space-type/README.md) - Types of spaces

## Migration Notes

### From Firebase
- Firebase collection: `facilities` or config array
- Check for duplicate names
- Standardize naming conventions
- Set priorities based on essentialness

## Usage Examples

### Create Facility
```typescript
const facility = await Facility.create({
  name: "4K Projector & 100\" Screen",
  isActive: true,
  priority: 1,
});
```

### Get Active Facilities
```typescript
const facilities = await Facility.find({ isActive: true })
  .sort({ priority: 1 })
  .lean();
```

### Add Facilities to Hub
```typescript
await Hub.findByIdAndUpdate(hubId, {
  $addToSet: {
    facilities: { $each: [facilityId1, facilityId2] },
  },
});
```

### Remove Facility from Hub
```typescript
await Hub.findByIdAndUpdate(hubId, {
  $pull: { facilities: facilityId },
});
```

## Validation Rules

### Name
- Required
- Unique
- Trimmed
- Length: 2-100 characters

### Priority
- Default: 0
- Any integer
- Negative values allowed

### IsActive
- Boolean
- Default: true

## Performance Considerations

1. **Caching** - Cache facilities list (changes infrequently)
2. **Index Usage** - Queries use compound index
3. **Lean Queries** - Always use `.lean()` for reads
4. **Small Dataset** - Typically < 100 facilities total

## Common Operations

### Reorder Facilities
```typescript
const updates = [
  { id: 'facility1', priority: 1 },
  { id: 'facility2', priority: 2 },
];

for (const update of updates) {
  await Facility.findByIdAndUpdate(update.id, { priority: update.priority });
}
```

### Bulk Create Facilities
```typescript
const facilitiesToCreate = [
  { name: "HD Projector & Screen", priority: 1 },
  { name: "Whiteboard & Markers", priority: 2 },
  { name: "Sound System", priority: 3 },
];

await Facility.insertMany(facilitiesToCreate);
```

## Error Handling

### Duplicate Name
```typescript
try {
  await Facility.create({ name: "Projector" });
} catch (error) {
  if (error.code === 11000) {
    return "Facility already exists";
  }
}
```

## Security Considerations

1. **Authorization** - POST/PATCH/DELETE require auth
2. **Input Sanitization** - Sanitize name input
3. **XSS Prevention** - Escape for display

## Testing

- **Unit Tests:** `tests/unit/facility.service.test.ts`
- **Integration Tests:** `tests/integration/facilities.routes.test.ts`
- **Test Fixtures:** `tests/fixtures/facility.fixture.ts`

## Typical Facilities by Category

### Presentation
- Projector & Screen
- Whiteboard & Markers
- Flip Chart
- TV Screen
- Laser Pointer

### Audio/Visual
- Sound System
- Microphones
- Video Camera
- Lighting Equipment
- Recording Studio

### Workspace
- Desks & Chairs
- Standing Desks
- Ergonomic Chairs
- Meeting Tables
- Breakout Areas

### Technology
- High-Speed Internet
- Video Conferencing Setup
- Computer Lab
- 3D Printer
- VR Equipment

### Creative
- Art Studio
- Music Studio
- Dance Studio
- Photography Studio
- Maker Space

### Food & Beverage
- Kitchen
- Microwave & Fridge
- Coffee Machine
- Vending Machine

### Specialized
- Science Lab
- Workshop Tools
- Sports Equipment
- Library
- Prayer Room

## Distinction from Amenities

**Facility** = Equipment/infrastructure (Projector, Studio, Lab)
**Amenity** = Comfort/convenience (WiFi, Coffee, Parking)

**Key Difference:**
- Facilities are **actively used** in activities
- Amenities are **passively enjoyed** as conveniences

## Future Enhancements

1. Facility quantity tracking (e.g., "5 Projectors")
2. Facility booking/scheduling
3. Facility maintenance logs
4. Facility specifications (detailed specs)
5. Facility images/photos
6. Facility categories/grouping
7. Facility availability calendar
8. Facility usage analytics
9. Facility condition/quality ratings
10. Cost per facility (rental fees)
