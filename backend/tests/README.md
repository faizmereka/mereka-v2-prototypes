# Hub Profile API Test Suite

Comprehensive integration tests for the Hub Profile APIs with reusable authentication fixtures.

## 📁 Files Created

### 1. Test Fixtures

#### `tests/fixtures/auth.fixture.ts`

Reusable authentication helper with test user credentials.

**Features:**

- Pre-configured test users for each plan (Soar, Scale, Starter)
- Automatic subscription creation
- JWT token generation
- Auth header helper

**Usage:**

```typescript
import { AuthTestHelper, getAuthHeader } from '../fixtures/auth.fixture';

const authHelper = new AuthTestHelper();
const { token, userId } = await authHelper.createSoarUser();

const response = await app.inject({
  method: 'POST',
  url: '/api/v1/hub-profile',
  headers: getAuthHeader(token),
  payload: { ... },
});
```

#### `tests/fixtures/hub-profile.fixture.ts`

Test data for hub profile creation and updates.

**Features:**

- Valid hub creation data
- Valid update data (Soar and Scale plans)
- Invalid data for error testing
- Partial update data
- Duplicate slug scenarios

### 2. Integration Tests

#### `tests/integration/hub-profile.routes.test.ts`

Complete test suite with **22 passing tests** covering:

## ✅ Test Coverage

### POST /api/v1/hub-profile (6 tests)

- ✅ Create initial hub profile for Soar user
- ✅ Create initial hub profile for Scale user
- ✅ Return 401 when not authenticated
- ✅ Return 400 for missing required fields
- ✅ Return 400 for invalid slug format
- ✅ Return 409 for duplicate slug

### PATCH /api/v1/hub-profile (7 tests)

- ✅ Update hub profile for Soar user (hub fields only)
- ✅ Update hub and user profile for Scale user (both hub and user fields)
- ✅ NOT save Scale-specific user fields for Soar user (plan-aware)
- ✅ Support partial updates
- ✅ Create hub if not exists (upsert behavior)
- ✅ Update slug and slug history
- ✅ Return 401 when not authenticated
- ✅ Return 400 for invalid data

### GET /api/v1/hub-profile/me (3 tests)

- ✅ Get user hub profile
- ✅ Return 404 when user has no hub
- ✅ Return 401 when not authenticated

### POST /api/v1/hub-profile/publish (5 tests)

- ✅ Publish hub when all required fields are filled (Soar plan)
- ✅ Publish hub when all required fields are filled (Scale plan)
- ✅ Return 400 when required fields are missing (Soar plan)
- ✅ Return 400 when Scale-specific required fields are missing
- ✅ Return 401 when not authenticated

## 🚀 Running Tests

### Run all hub-profile tests

```bash
npm test -- hub-profile.routes.test.ts
```

### Run in watch mode

```bash
npm run test:watch -- hub-profile.routes.test.ts
```

### Run with coverage

```bash
npm run test:coverage -- hub-profile.routes.test.ts
```

### Run all integration tests

```bash
npm run test:integration
```

## 📊 Test Results

```
✅ Test Files  1 passed (1)
✅ Tests  22 passed (22)
⏱️  Duration  ~30s
```

## 🔑 Key Features Tested

### 1. **Plan-Aware Updates**

Tests verify that Scale-specific fields (professionalTitle, portfolio, employment, education) are only saved when user has Scale plan.

### 2. **Upsert Behavior**

PATCH endpoint creates hub if it doesn't exist, or updates existing hub.

### 3. **Slug Management**

Tests verify slug creation, updates, and history tracking.

### 4. **Validation**

- Required fields validation
- Slug format validation
- Slug uniqueness
- Plan-based required field validation (publish endpoint)

### 5. **Authentication**

All endpoints properly require authentication and return 401 when not provided.

### 6. **Data Isolation**

Each plan (Soar/Scale) stores data in appropriate collections:

- **Hub data** → `hubs` collection
- **User data (Scale only)** → `users` collection

## 🧪 Test Data

### Test Users

**Soar User:**

- Email: `soar-user@test.com`
- Plan: Soar ($49/month)
- Features: Hub profile only

**Scale User:**

- Email: `scale-user@test.com`
- Plan: Scale ($99/month)
- Features: Hub profile + Expert profile fields

### Sample Hub Data

**Create Hub:**

```json
{
  "agencyName": "Test Creative Hub",
  "slug": "test-creative-hub",
  "agencyLogo": "https://example.com/logo.png",
  "phoneNumber": "+60123456789",
  "location": {
    "city": "Kuala Lumpur",
    "state": "Federal Territory",
    "country": "Malaysia",
    "lat": "3.139",
    "lng": "101.6869"
  }
}
```

**Update Hub (Soar):**

```json
{
  "description": "We are a creative coworking space...",
  "companyType": "507f1f77bcf86cd799439011",
  "introVideo": "https://youtube.com/watch?v=test123",
  "gallery": ["https://example.com/photo1.jpg"],
  "operatingHours": {
    "monday": { "open": "09:00", "close": "18:00" }
  },
  "socialLinks": {
    "website": "https://testhub.com"
  },
  "amenities": ["507f1f77bcf86cd799439012"],
  "facilities": ["507f1f77bcf86cd799439013"],
  "focusAreas": ["507f1f77bcf86cd799439014"],
  "tags": ["coworking", "startup"],
  "onboardingStep": 4
}
```

**Update Hub (Scale - includes user fields):**

```json
{
  // ... all Soar fields above, plus:
  "professionalTitle": "Creative Director",
  "bio": "I am a creative professional...",
  "portfolio": [
    {
      "title": "Brand Identity for Tech Startup",
      "description": "Complete brand identity design...",
      "images": ["https://example.com/project1.jpg"],
      "year": "2024"
    }
  ],
  "employment": [
    {
      "title": "Senior Product Designer",
      "company": "Tech Corp",
      "duration": "2020-2024"
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Design",
      "institution": "University of Arts",
      "year": "2018"
    }
  ],
  "hourlyRate": 150
}
```

## 🔧 Extending Tests

### Add a new test

```typescript
it('should do something specific', async () => {
  const { token, userId } = await authHelper.createSoarUser();

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/hub-profile',
    headers: getAuthHeader(token),
    payload: { ... },
  });

  expect(response.statusCode).toBe(201);
});
```

### Test a different plan

```typescript
const { token } = await authHelper.createScaleUser();
// or
const { token } = await authHelper.createStarterUser();
```

### Create custom test user

```typescript
const user = await User.create({
  email: 'custom@test.com',
  name: 'Custom User',
  status: UserStatus.ACTIVE,
  authProviders: [AuthProvider.EMAIL],
});
const token = authHelper.generateToken(user);
```

## 📝 Notes

1. **Database Cleanup**: All tests use the same test database. `beforeEach` hook in `tests/setup.ts` cleans all collections before each test.

2. **Token Generation**: Tokens are generated using the actual `TokenService` with the JWT secret from environment.

3. **Subscription Data**: Test subscriptions include all required fields (stripeCustomerId, price, billingDates, etc.)

4. **Plan Codes**: Only 'scale' and 'soar' are valid planCode values per Subscription schema.

5. **Validation Format**: Fastify schema validation errors may have different format than application errors.

## 🎯 Next Steps

- Add unit tests for `HubProfileService`
- Add tests for edge cases (invalid ObjectIds, malformed data)
- Add performance tests for large payloads
- Add tests for concurrent updates
- Add tests for slug conflict resolution

---

**Created**: 2025-01-07
**Last Updated**: 2025-01-07
**Test Coverage**: 22/22 passing ✅
