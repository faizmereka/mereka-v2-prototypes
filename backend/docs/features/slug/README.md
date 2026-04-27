# Slug Feature

## Overview

The Slug feature provides a centralized system for managing human-readable URL identifiers (slugs) across different resource types in the Mereka platform. It maintains slug history, handles slug changes, and ensures uniqueness across the platform.

## Business Context

Slugs are critical for:
- **SEO** - Clean, readable URLs improve search rankings
- **User Experience** - Easy-to-remember and share URLs
- **Branding** - Professional-looking links
- **Permanence** - Old slugs redirect to new ones (no broken links)
- **Uniqueness** - Prevent slug conflicts across resources

Example URLs:
- `/learner/john-doe` (learner profile)
- `/experience/intro-to-photography` (experience page)
- `/hub/creative-learning-center` (hub page)

## Model Structure

**Location:** `src/models/Slug.ts`

### Core Fields

#### Resource Identification
- `resourceType` (required, enum) - Type of resource
  - `learner` - User/Learner profiles
  - `experience` - Experiences
  - `service` - Services (future)
  - `space` - Spaces (future)
  - `hub` - Hubs
  - `expert` - Experts (future)
- `resourceId` (required) - The resource's database ID (e.g., User._id, Experience._id)

#### Slug History
- `slugHistory` (array) - All slugs used by this resource over time
  ```typescript
  slugHistory: [{
    slug: string;           // The slug value (lowercase, trimmed)
    isActive: boolean;      // Only one active slug per resource
    usedFrom: Date;         // When this slug became active
    usedUntil?: Date;       // When this slug was replaced (null if currently active)
  }]
  ```

#### Audit Fields
- `createdBy` (required) - User ID who created the slug
- `lastUpdatedBy` (required) - User ID who last updated
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Indexes

### Single Field Indexes
- `createdBy` - Track slug creators

### Compound Indexes
- `{ resourceId: 1, resourceType: 1 }` (unique) - One slug document per resource
- `{ 'slugHistory.slug': 1 }` - Look up any slug (current or historical)
- `{ 'slugHistory.isActive': 1 }` - Find active slugs

## Key Design Principles

### One Document Per Resource
- Each resource has ONE slug document
- Multiple slugs stored in `slugHistory` array
- Only ONE slug in the array has `isActive: true`

### Historical Tracking
- All previous slugs are preserved
- Enables redirects from old URLs
- Audit trail of slug changes

### Uniqueness Across Platform
- Slugs must be unique within a resource type
- Same slug CAN exist for different resource types
  - Example: `/learner/john` and `/hub/john` are both valid
- Enforced at application level (not database constraint)

## Resource Types

### ResourceType Enum
```typescript
enum ResourceType {
  LEARNER = 'learner',
  EXPERIENCE = 'experience',
  SERVICE = 'service',
  SPACE = 'space',
  HUB = 'hub',
  EXPERT = 'expert',
}
```

### Currently Used
- **learner** - Learner profiles (User model)
- **experience** - Experiences

### Future Use
- **service** - Services offered by hubs
- **space** - Physical/virtual spaces
- **hub** - Hub profiles
- **expert** - Expert profiles

## Business Logic

### Slug Creation
1. Resource created with desired slug
2. System checks slug availability
3. If available:
   - Create Slug document
   - Add entry to `slugHistory` with `isActive: true`
4. If unavailable:
   - Return error or auto-generate alternative

### Slug Change
1. User requests slug change
2. System validates new slug is available
3. Update Slug document:
   - Find active entry in `slugHistory`
   - Set `isActive: false` and `usedUntil: now`
   - Add new entry with `isActive: true` and `usedFrom: now`
4. Old slug still works (redirects to new)

### Slug Lookup
1. Frontend requests `/learner/john-doe`
2. Backend looks up slug in `slugHistory` array
3. If found:
   - If active: serve resource
   - If inactive: redirect to active slug (301)
4. If not found: 404

### Slug Availability Check
```typescript
// Check if slug is available for resource type
const existing = await Slug.findOne({
  resourceType: 'learner',
  'slugHistory.slug': 'john-doe',
});

if (existing && existing.resourceId !== currentResourceId) {
  // Slug taken by different resource
  return { available: false };
}

return { available: true };
```

## API Endpoints

**Base Path:** `/api/v1/slugs`

### GET /check/:slug
**Check Slug Availability**
- **Auth:** Required (Bearer token)
- **Params:** `slug` - Slug to check
- **Query:**
  - `resourceType` (required) - learner | experience | hub | etc.
  - `excludeResourceId` (optional) - Exclude this resource (for updates)
- **Returns:**
  ```json
  {
    "success": true,
    "data": {
      "available": true,
      "slug": "john-doe"
    }
  }
  ```

### Usage in Other Endpoints
Slug checks are typically called from resource-specific endpoints:
- `GET /experiences/check/slug?slug=intro-photography`
- `GET /learner-profile/check-slug?slug=john-doe`

## Query Patterns

### Find Resource by Slug
```typescript
const slugDoc = await Slug.findOne({
  resourceType: 'experience',
  'slugHistory.slug': requestedSlug,
});

if (!slugDoc) {
  throw new Error('Resource not found');
}

// Get the resource
const experience = await Experience.findById(slugDoc.resourceId);

// Check if slug is active
const activeSlug = slugDoc.slugHistory.find((h) => h.isActive);
if (activeSlug.slug !== requestedSlug) {
  // Redirect to active slug
  return redirect(`/experience/${activeSlug.slug}`);
}
```

### Get Active Slug for Resource
```typescript
const slugDoc = await Slug.findOne({
  resourceId: resourceId,
  resourceType: 'learner',
});

const activeEntry = slugDoc.slugHistory.find((h) => h.isActive);
const currentSlug = activeEntry.slug;
```

### Check Slug Availability
```typescript
const slugDoc = await Slug.findOne({
  resourceType: resourceType,
  'slugHistory.slug': desiredSlug,
});

const isAvailable =
  !slugDoc || slugDoc.resourceId.toString() === currentResourceId;
```

### Get Slug History
```typescript
const slugDoc = await Slug.findOne({
  resourceId: resourceId,
  resourceType: 'experience',
});

const history = slugDoc.slugHistory.map((h) => ({
  slug: h.slug,
  isActive: h.isActive,
  usedFrom: h.usedFrom,
  usedUntil: h.usedUntil,
}));
```

## File References

- **Model:** `src/models/Slug.ts`
- **Schema:** `src/schemas/slug.schema.ts`
- **Controller:** `src/controllers/slug.controller.ts`
- **Service:** `src/services/slug.service.ts`
- **Routes:** `src/routes/slug.routes.ts`

## Related Documentation

- [Experience](../experience/README.md) - Uses slugs
- [Learner Profile](../learner-profile/README.md) - Uses slugs
- [Hub](../hub/README.md) - Uses slugs (future)

## Migration Notes

### From Firebase
- Firebase may store slugs directly in resource documents
- Need to extract and create Slug documents
- Initial slug history will have single entry
- Set `usedFrom` to resource creation date

### Migration Script
```typescript
// For each experience
for (const exp of experiences) {
  await Slug.create({
    resourceType: 'experience',
    resourceId: exp._id,
    slugHistory: [
      {
        slug: exp.slug,
        isActive: true,
        usedFrom: exp.createdAt,
      },
    ],
    createdBy: exp.createdBy,
    lastUpdatedBy: exp.createdBy,
  });
}
```

## Usage Examples

### Create Slug for New Resource
```typescript
await Slug.create({
  resourceType: 'experience',
  resourceId: experienceId,
  slugHistory: [
    {
      slug: 'intro-to-photography',
      isActive: true,
      usedFrom: new Date(),
    },
  ],
  createdBy: userId,
  lastUpdatedBy: userId,
});
```

### Update Slug
```typescript
const slugDoc = await Slug.findOne({
  resourceId: experienceId,
  resourceType: 'experience',
});

// Deactivate current slug
const activeIndex = slugDoc.slugHistory.findIndex((h) => h.isActive);
slugDoc.slugHistory[activeIndex].isActive = false;
slugDoc.slugHistory[activeIndex].usedUntil = new Date();

// Add new active slug
slugDoc.slugHistory.push({
  slug: 'advanced-photography-workshop',
  isActive: true,
  usedFrom: new Date(),
});

slugDoc.lastUpdatedBy = userId;
await slugDoc.save();
```

### Check Availability
```typescript
const available = await checkSlugAvailability(
  'new-slug',
  'experience',
  excludeExperienceId // optional
);

if (!available) {
  throw new Error('Slug already in use');
}
```

## Slug Generation Rules

### Format
- Lowercase only
- Alphanumeric and hyphens
- No spaces (replaced with hyphens)
- No special characters (removed or replaced)
- No leading/trailing hyphens
- No consecutive hyphens

### Generation Algorithm
```typescript
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Multiple hyphens to single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}
```

### Collision Handling
If slug already exists:
1. Append number: `photography-2`, `photography-3`
2. Append random string: `photography-a8f3`
3. Suggest alternatives to user

## Performance Considerations

1. **Index on slug** - Fast lookups via `slugHistory.slug` index
2. **Cache Active Slugs** - Cache resource → slug mapping
3. **Lean Queries** - Use `.lean()` for read operations
4. **Avoid N+1** - Fetch slugs in batch for multiple resources

## Common Operations

### Batch Create Slugs
```typescript
const slugDocs = resources.map((resource) => ({
  resourceType: 'experience',
  resourceId: resource._id,
  slugHistory: [
    {
      slug: generateSlug(resource.title),
      isActive: true,
      usedFrom: new Date(),
    },
  ],
  createdBy: resource.createdBy,
  lastUpdatedBy: resource.createdBy,
}));

await Slug.insertMany(slugDocs);
```

### Get Resources with Slugs
```typescript
const experiences = await Experience.find({ status: 'ACTIVE' }).lean();

const slugDocs = await Slug.find({
  resourceType: 'experience',
  resourceId: { $in: experiences.map((e) => e._id) },
}).lean();

// Map slugs to experiences
const experiencesWithSlugs = experiences.map((exp) => {
  const slugDoc = slugDocs.find(
    (s) => s.resourceId.toString() === exp._id.toString()
  );
  const activeSlug = slugDoc?.slugHistory.find((h) => h.isActive);
  return {
    ...exp,
    slug: activeSlug?.slug,
  };
});
```

### Clean Up Old Slugs (Data Retention)
```typescript
// Remove inactive slugs older than 2 years
const cutoffDate = new Date();
cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);

await Slug.updateMany(
  {},
  {
    $pull: {
      slugHistory: {
        isActive: false,
        usedUntil: { $lt: cutoffDate },
      },
    },
  }
);
```

## Error Handling

### Slug Already Taken
```typescript
const existing = await Slug.findOne({
  resourceType: 'learner',
  'slugHistory.slug': slug,
});

if (existing && existing.resourceId !== currentResourceId) {
  return reply.status(400).send({
    success: false,
    error: {
      code: 'SLUG_TAKEN',
      message: 'This slug is already in use',
    },
  });
}
```

### Resource Not Found by Slug
```typescript
const slugDoc = await Slug.findOne({
  resourceType: 'experience',
  'slugHistory.slug': slug,
});

if (!slugDoc) {
  return reply.status(404).send({
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: 'Experience not found',
    },
  });
}
```

## Security Considerations

1. **Authorization** - Verify user can modify resource before changing slug
2. **Reserved Slugs** - Prevent using reserved words (admin, api, auth, etc.)
3. **Rate Limiting** - Limit slug change frequency per resource
4. **Input Validation** - Sanitize and validate slug format
5. **XSS Prevention** - Slugs should be safe for URLs

### Reserved Slugs
```typescript
const RESERVED_SLUGS = [
  'admin',
  'api',
  'auth',
  'login',
  'logout',
  'register',
  'signup',
  'profile',
  'settings',
  'dashboard',
  'explore',
  'search',
];

function isReserved(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug);
}
```

## Testing

- **Unit Tests:** `tests/unit/slug.service.test.ts`
- **Integration Tests:** `tests/integration/slug.routes.test.ts`
- **Test Fixtures:** `tests/fixtures/slug.fixture.ts`

### Test Cases
- Create slug for new resource
- Check slug availability
- Update slug (maintain history)
- Look up resource by current slug
- Look up resource by old slug (redirect)
- Handle duplicate slug attempts
- Reserved slug rejection
- Invalid slug format rejection

## Monitoring & Observability

### Key Metrics
- Slug changes per day
- Slug conflicts/collisions
- Old slug redirects (301s)
- Average slug history length
- Reserved slug attempts

### Alerts
- High rate of slug changes (potential abuse)
- Excessive slug collisions
- Unusual slug patterns

## Future Enhancements

1. **Custom Slug Rules** - Per resource type slug rules
2. **Slug Suggestions** - AI-powered slug suggestions
3. **Vanity URLs** - Premium/verified users get priority slugs
4. **Slug Marketplace** - Trade/sell valuable slugs (!)
5. **Slug Analytics** - Track which slugs drive most traffic
6. **Multi-language Slugs** - Localized slugs per language
7. **Slug Preview** - Preview URL before committing
8. **Slug Patterns** - Templates for generating consistent slugs
9. **Slug Validation Rules** - Per-resource-type validation
10. **Slug Change Notifications** - Notify followers of slug changes
