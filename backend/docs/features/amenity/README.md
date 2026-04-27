# Amenity Feature

## Overview

The Amenity feature defines comfort and convenience offerings available at Hub locations. Amenities represent the perks, services, and comforts that make a Hub attractive to learners and experts (e.g., WiFi, Coffee, Parking, Air Conditioning).

## Business Context

Amenities are crucial for:
- **Hub Differentiation** - Showcase what makes a hub unique
- **Learner Decision-Making** - Help learners choose hubs based on their needs
- **Hub Marketing** - Highlight amenities in listings and profiles
- **Filtering** - Allow learners to filter hubs by available amenities
- **Expectation Setting** - Clear communication of what's provided

Examples:
- **WiFi** - High-speed internet connectivity
- **Coffee/Tea** - Complimentary beverages
- **Parking** - Free or paid parking facilities
- **Air Conditioning** - Climate control
- **Prayer Room** - Religious facilities
- **Wheelchair Access** - Accessibility features
- **Lockers** - Secure storage
- **Power Outlets** - Charging stations
- **Whiteboard** - Presentation tools
- **Printing** - Document services

## Model Structure

**Location:** `src/models/Amenity.ts`

### Core Fields

#### Basic Information
- `name` (required, unique, indexed) - Amenity name (e.g., "WiFi")

#### Status
- `isActive` (boolean, indexed, default: true) - Whether amenity is visible and selectable

#### Metadata
- `priority` (number, default: 0) - Sort order for display (lower = higher priority)

#### Audit Fields
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `name` (unique) - Ensure unique amenity names
- `isActive` (standard) - Filter active amenities

### Compound Indexes
- `{ isActive: 1, priority: 1 }` - Get active amenities sorted by priority

## Relationships

### Referenced By
- **Hub** - Hubs reference amenities via `amenities` array
  - Hub can have multiple amenities
  - Stored as: `amenities: [ObjectId]` (array of Amenity IDs)
  - Populated on retrieval to show full amenity details

## API Endpoints

**Base Path:** `/api/v1/amenities`

### GET /
**Get All Amenities**
- **Auth:** None
- **Query:**
  - `includeInactive` (optional) - Include inactive amenities (true/false)
- **Returns:** Array of amenities sorted by priority
- **Default:** Returns only active amenities

### GET /:id
**Get Amenity by ID**
- **Auth:** None
- **Params:** `id` - Amenity ObjectId (must be valid 24-char hex)
- **Returns:** Single amenity object

### POST /
**Create Amenity**
- **Auth:** Required (Bearer token)
- **Body:**
  ```json
  {
    "name": "WiFi",
    "priority": 1
  }
  ```
- **Validation:** Uses `createReferenceDataSchema`
- **Returns:** Created amenity object

### PATCH /:id
**Update Amenity**
- **Auth:** Required (Bearer token)
- **Params:** `id` - Amenity ObjectId
- **Body:** Partial amenity object
  ```json
  {
    "priority": 5,
    "isActive": false
  }
  ```
- **Validation:** Uses `updateReferenceDataSchema`
- **Returns:** Updated amenity object

### DELETE /:id
**Delete Amenity (Soft Delete)**
- **Auth:** Required (Bearer token)
- **Params:** `id` - Amenity ObjectId
- **Action:** Sets `isActive: false`
- **Returns:** Success message
- **Note:** Soft delete only, document preserved

## Business Logic

### Naming Convention
- Clear, concise names
- Title Case recommended
- 1-2 words preferred
- Standard industry terms

### Priority System
- Lower numbers = higher priority (displayed first)
- Common/essential amenities get lower priority:
  - WiFi: 1
  - Parking: 2
  - Coffee: 3
- Nice-to-have amenities get higher priority
- Default: 0

### Soft Delete
- Amenities never hard-deleted
- `isActive: false` hides from selection
- Preserves historical data in hubs
- Can be re-activated

## Query Patterns

### Get Active Amenities for Selection
```typescript
const amenities = await Amenity.find({ isActive: true })
  .sort({ priority: 1, name: 1 })
  .select('name')
  .lean();
```

### Get Hub Amenities (Populated)
```typescript
const hub = await Hub.findById(hubId)
  .populate('amenities', 'name priority')
  .lean();
```

### Check Duplicate Name
```typescript
const existing = await Amenity.findOne({
  name: amenityName,
  _id: { $ne: currentAmenityId },
});

if (existing) {
  throw new Error('Amenity with this name already exists');
}
```

### Get Popular Amenities
```typescript
const amenities = await Amenity.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'hubs',
      localField: '_id',
      foreignField: 'amenities',
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

- **Model:** `src/models/Amenity.ts`
- **Schema:** `src/schemas/reference-data.schema.ts` (shared)
- **Controller:** `src/controllers/reference-data.controller.ts`
- **Service:** `src/services/reference-data.service.ts`
- **Routes:** `src/routes/reference-data.routes.ts`

## Related Documentation

- [Hub](../hub/README.md) - Primary user of amenities
- [Reference Data](../reference-data/README.md) - Overview of all reference data
- [Facility](../facility/README.md) - Similar but for equipment/features

## Migration Notes

### From Firebase
- Firebase collection: `amenities` or config array
- Check for duplicate names (case variations)
- Standardize naming
- Set initial priorities based on importance

## Usage Examples

### Create Amenity
```typescript
const amenity = await Amenity.create({
  name: "High-Speed WiFi",
  isActive: true,
  priority: 1,
});
```

### Get Active Amenities
```typescript
const amenities = await Amenity.find({ isActive: true })
  .sort({ priority: 1 })
  .lean();
```

### Add Amenities to Hub
```typescript
await Hub.findByIdAndUpdate(hubId, {
  $addToSet: {
    amenities: { $each: [amenityId1, amenityId2, amenityId3] },
  },
});
```

### Remove Amenity from Hub
```typescript
await Hub.findByIdAndUpdate(hubId, {
  $pull: { amenities: amenityId },
});
```

## Validation Rules

### Name
- Required
- Unique
- Trimmed
- Length: 2-50 characters

### Priority
- Default: 0
- Any integer
- Negative values allowed

### IsActive
- Boolean
- Default: true

## Performance Considerations

1. **Caching** - Cache amenities list (changes infrequently)
2. **Index Usage** - Queries use compound index
3. **Lean Queries** - Always use `.lean()` for reads
4. **Small Dataset** - Typically < 50 amenities total

## Common Operations

### Reorder Amenities
```typescript
const updates = [
  { id: 'amenity1', priority: 1 },
  { id: 'amenity2', priority: 2 },
];

for (const update of updates) {
  await Amenity.findByIdAndUpdate(update.id, { priority: update.priority });
}
```

### Bulk Create Amenities
```typescript
const amenitiesToCreate = [
  { name: "WiFi", priority: 1 },
  { name: "Parking", priority: 2 },
  { name: "Coffee/Tea", priority: 3 },
];

await Amenity.insertMany(amenitiesToCreate);
```

## Error Handling

### Duplicate Name
```typescript
try {
  await Amenity.create({ name: "WiFi" });
} catch (error) {
  if (error.code === 11000) {
    return "Amenity already exists";
  }
}
```

## Security Considerations

1. **Authorization** - POST/PATCH/DELETE require auth
2. **Input Sanitization** - Sanitize name input
3. **XSS Prevention** - Escape for display

## Testing

- **Unit Tests:** `tests/unit/amenity.service.test.ts`
- **Integration Tests:** `tests/integration/amenities.routes.test.ts`
- **Test Fixtures:** `tests/fixtures/amenity.fixture.ts`

## Typical Amenities

### Essential
- WiFi
- Parking
- Restrooms
- Air Conditioning

### Comfort
- Coffee/Tea
- Water
- Snacks
- Seating Areas

### Facilities
- Prayer Room
- Nursing Room
- Smoking Area
- Outdoor Space

### Accessibility
- Wheelchair Access
- Elevator
- Accessible Restrooms

### Services
- Printing
- Scanning
- Lockers
- Reception

## Distinction from Facilities

**Amenity** = Comfort/convenience (WiFi, Coffee, Parking)
**Facility** = Equipment/infrastructure (Projector, Studio, Whiteboard)

## Future Enhancements

1. Amenity icons/images
2. Amenity categories (Essential, Comfort, Accessibility)
3. Amenity descriptions
4. Cost indicators (free/paid)
5. Amenity ratings/reviews
6. Multi-language support
7. Amenity availability schedule
8. Amenity booking/reservation
