# 👤 Learner Profile Feature

**Version**: 1.0
**Status**: Production Ready
**Endpoints**: 3

---

## Overview

Learner profile management with slug-based URLs and redirect support. Stores profile data in User collection and manages slugs separately for flexibility and SEO.

---

## Features

- ✅ Learner Profile Management
- ✅ Slug System with Redirect Support
- ✅ Username Availability Check
- ✅ Multi-Domain Cookie + Bearer Token Support
- ✅ Profile Photos, Location, Social Links

---

## API Endpoints

| Endpoint              | Method | Auth | Purpose                 |
| --------------------- | ------ | ---- | ----------------------- |
| `/learner/profile/me` | GET    | Yes  | Get own profile         |
| `/learner/profile/me` | PATCH  | Yes  | Update profile + slug   |
| `/learner/slug/check` | POST   | No   | Check slug availability |

---

## Data Storage

### User Collection (Extended)

Stores main profile data using existing fields:

- `name` - Display name
- `phoneNumber` - Phone with country code
- `bio` - About me (max 1000 chars)
- `profilePhoto` - Profile image (avatar)
- `coverPhoto` - Cover image
- `location` - { city, country, lat, lng }
- `socialLinks` - { website, facebook, instagram, twitter, linkedin }

### Slug Collection (NEW)

Manages slugs with redirect history:

- `resourceType` - "learner", "experience", "service", etc.
- `resourceId` - User.\_id for learners
- `slugHistory` - Array of all slugs with isActive flag
- `createdBy`, `lastUpdatedBy` - Audit tracking

---

## Quick Start

```bash
# Check slug availability
POST /api/v1/learner/slug/check
{
  "slug": "hira123",
  "resourceType": "learner"
}

# Update profile with slug
PATCH /api/v1/learner/profile/me
Authorization: Bearer <token>
{
  "slug": "hira123",
  "bio": "Product designer...",
  "phoneNumber": "+60123456789",
  "location": {
    "city": "Kuala Lumpur",
    "country": "Malaysia"
  },
  "socialLinks": {
    "website": "https://hira.design",
    "linkedin": "https://linkedin.com/in/hira"
  }
}

# Get profile
GET /api/v1/learner/profile/me
Authorization: Bearer <token>
```

---

## Documentation

- **[API-REQUIREMENTS.md](./API-REQUIREMENTS.md)** - Complete API reference
- **[SLUG-FIREBASE-ANALYSIS.md](./SLUG-FIREBASE-ANALYSIS.md)** - Slug system design
- **[FINAL-DESIGN.md](./FINAL-DESIGN.md)** - Architecture decisions

---

## Implementation Files

```
src/
├── controllers/
│   └── learner-profile.controller.ts
├── services/
│   ├── learner-profile.service.ts
│   └── slug.service.ts
├── schemas/
│   └── learner-profile.schema.ts
├── models/
│   ├── User.ts (extended)
│   └── Slug.ts (new)
└── routes/
    └── learner-profile.routes.ts
```

---

## Slug System

**How it works:**

1. User sets slug: "hira123"
2. Stored in Slug collection with isActive=true
3. User changes to: "hira.designer"
4. Old slug marked isActive=false
5. New slug added with isActive=true
6. Both URLs work (old redirects to new)

**Future-ready** for:

- Experiences: `/exp/pottery-workshop`
- Services: `/service/design-consultation`
- Spaces: `/space/coworking-kl`

---

## Testing

**Test File**: `../../../test-auth.http`
**Swagger**: http://localhost:3000/docs

---

**Production ready!** 🚀
