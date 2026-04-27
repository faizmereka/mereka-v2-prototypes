# 📖 Learner Profile API Documentation

**Version**: 1.0
**Last Updated**: November 3, 2025

---

## 📋 API Endpoints (3 Total)

### 1. GET /api/v1/learner/profile/me

**Purpose**: Get current logged-in user's learner profile

**Authentication**: Required (Bearer token or Cookie)

**Request**:

```bash
GET /api/v1/learner/profile/me
Authorization: Bearer <accessToken>
# OR cookies automatically sent
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "69084ea99afd240125bebbd1",
    "email": "final@mereka.io",
    "name": "Final Test User",
    "birthDate": "1995-12-24T18:15:00.000Z",
    "phoneNumber": "+60123456789",
    "bio": "Designer passionate about UX",
    "profilePhoto": "https://...",
    "coverPhoto": "https://...",
    "location": {
      "city": "Kuala Lumpur",
      "country": "Malaysia",
      "lat": 3.139,
      "lng": 101.6869
    },
    "socialLinks": {
      "website": "https://hira.design",
      "linkedin": "https://linkedin.com/in/hira"
    },
    "slug": "hira123",
    "status": "active",
    "emailVerified": false
  }
}
```

---

### 2. PATCH /api/v1/learner/profile/me

**Purpose**: Update learner profile and optionally set/change slug

**Authentication**: Required

**Request**:

```bash
PATCH /api/v1/learner/profile/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "slug": "hira123",
  "phoneNumber": "+60123456789",
  "bio": "Product designer passionate about creating amazing user experiences!",
  "coverPhoto": "https://storage.../cover.jpg",
  "location": {
    "city": "Kuala Lumpur",
    "country": "Malaysia",
    "lat": 3.139,
    "lng": 101.6869
  },
  "socialLinks": {
    "website": "https://hira.design",
    "facebook": "https://facebook.com/hiradesigner",
    "instagram": "https://instagram.com/hiradesigner",
    "twitter": "https://twitter.com/hiradesigner",
    "linkedin": "https://linkedin.com/in/hiradesigner"
  }
}
```

**All fields optional** - only send what you want to update

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "name": "...",
    "phoneNumber": "+60123456789",
    "bio": "Product designer...",
    "profilePhoto": "https://...",
    "coverPhoto": "https://...",
    "location": { ... },
    "socialLinks": { ... },
    "slug": "hira123"
  },
  "message": "Profile and slug updated successfully"
}
```

**Errors**:

- `401` - Not authenticated
- `409` - Slug already taken by another user
- `400` - Validation error (invalid slug format)

---

### 3. POST /api/v1/learner/slug/check

**Purpose**: Check if slug is available

**Authentication**: Not required

**Request**:

```bash
POST /api/v1/learner/slug/check
Content-Type: application/json

{
  "slug": "hira123",
  "resourceType": "learner"
}
```

**Response (Available)**:

```json
{
  "success": true,
  "data": {
    "available": true,
    "slug": "hira123"
  }
}
```

**Response (Taken)**:

```json
{
  "success": true,
  "data": {
    "available": false,
    "slug": "hira123",
    "suggestions": ["hira1234", "hira_123", "hira.456", "hira_2025"]
  }
}
```

---

## 🔄 Complete Onboarding Flow

```
1. User completes signup
   ↓
2. Navigate to /learner-onboard
   ↓
3. Frontend calls: GET /learner/profile/me
   - Pre-fill form if profile exists
   ↓
4. User types username: "hira123"
   ↓
5. Frontend calls: POST /slug/check
   - Shows ✓ available or ✗ taken
   ↓
6. User fills: bio, phone, location, social links
   ↓
7. User clicks Continue
   ↓
8. Frontend calls: PATCH /learner/profile/me
   Body: { slug, bio, phoneNumber, location, socialLinks }
   ↓
9. Profile saved + slug created
   ↓
10. User can now be found at: mereka.io/@hira123
```

---

## 🧪 Testing

### cURL Examples

```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.data.tokens.accessToken')

# Get profile
curl http://localhost:3000/api/v1/learner/profile/me \
  -H "Authorization: Bearer $TOKEN"

# Update profile
curl -X PATCH http://localhost:3000/api/v1/learner/profile/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "myusername",
    "bio": "Hello world!",
    "phoneNumber": "+60123456789"
  }'

# Check slug
curl -X POST http://localhost:3000/api/v1/learner/slug/check \
  -H "Content-Type: application/json" \
  -d '{"slug":"testslug","resourceType":"learner"}'
```

---

## 📊 Field Mapping

| Form Field    | Database Field      | Location        |
| ------------- | ------------------- | --------------- |
| Display name  | `User.name`         | User collection |
| Username      | `Slug.slugHistory`  | Slug collection |
| Phone         | `User.phoneNumber`  | User collection |
| About Me      | `User.bio`          | User collection |
| Profile photo | `User.profilePhoto` | User collection |
| Cover photo   | `User.coverPhoto`   | User collection |
| Location      | `User.location`     | User collection |
| Social links  | `User.socialLinks`  | User collection |

---

## 🔒 Security

- ✅ Authentication required for profile operations
- ✅ Users can only update their own profile
- ✅ Slug uniqueness enforced
- ✅ Input validation with Zod
- ✅ URL validation for social links

---

**Complete and tested!** ✅
