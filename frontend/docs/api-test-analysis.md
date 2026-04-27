# API Test Analysis Report

## Overview

This document analyzes the existing API tests in `tests/api/backend-v2-integration/tests/` to map endpoints, scenarios, and flows for creating corresponding E2E tests.

**Analysis Date**: January 27, 2026  
**Total API Test Files**: 24 files  
**Total Test Scenarios**: 140+ tests

---

## API Test Coverage Summary

### 1. Authentication API (`authentication-api.spec.ts`)

**Endpoints Covered**:
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - Email/password login
- `POST /api/v1/auth/login/social` - Social login (Firebase)
- `POST /api/v1/auth/refresh` - Token refresh
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token
- `GET /api/v1/auth/user-status` - Check if user exists

**Test Scenarios**:
- ✅ Register new user with email/password
- ✅ Reject duplicate email registration
- ✅ Reject invalid email format
- ✅ Reject weak password
- ✅ Reject missing required fields
- ✅ Login with valid credentials
- ✅ Reject invalid password
- ✅ Reject nonexistent email
- ✅ Reject invalid email format
- ✅ Get current user with valid token
- ✅ Reject request without token
- ✅ Reject request with invalid token
- ✅ Refresh access token
- ✅ Reject invalid refresh token
- ✅ Request password reset
- ✅ Reset password with token

**E2E Test Requirements**:
- Registration form flow
- Login form flow
- Password reset flow
- Profile access after login
- Error message display
- Form validation

---

### 2. User Profile API (`user-api.spec.ts`)

**Endpoints Covered**:
- `GET /api/v1/users/me/profile` - Get user profile
- `PUT /api/v1/users/me/profile` - Update user profile
- `GET /api/v1/users/check-username` - Check username availability

**Test Scenarios**:
- ✅ Get user profile
- ✅ Return 401 when not authenticated
- ✅ Update user profile
- ✅ Support partial updates
- ✅ Check username availability
- ✅ Return 400 for missing username parameter

**E2E Test Requirements**:
- Profile page display
- Profile edit form
- Username availability check
- Profile update success/error handling

---

### 3. Platform Experience API (`platform-experience-api.spec.ts`)

**Endpoints Covered**:
- `POST /api/v1/hub/{hubId}/experiences/` - Create platform experience
- `PATCH /api/v1/hub/{hubId}/experiences/{experienceId}` - Update experience
- `GET /api/v1/hub/{hubId}/experiences/{experienceId}` - Get by ID
- `DELETE /api/v1/hub/{hubId}/experiences/{experienceId}` - Soft delete

**Test Scenarios**:
- ✅ Create full platform experience with all fields
- ✅ Create platform experience with minimal fields
- ✅ Update platform experience
- ✅ Get platform experience by ID
- ✅ Soft delete platform experience

**E2E Test Requirements**:
- Experience creation form (full/minimal)
- Experience update form
- Experience detail page
- Experience deletion confirmation
- Form field validation
- Success/error messages

---

### 4. Express Experience API (`express-experience-api.spec.ts`)

**Endpoints Covered**:
- `POST /api/v1/hub/{hubId}/experiences/` - Create express experience
- `PATCH /api/v1/hub/{hubId}/experiences/{experienceId}` - Update express experience
- `GET /api/v1/hub/{hubId}/experiences/{experienceId}` - Get by ID
- `DELETE /api/v1/hub/{hubId}/experiences/{experienceId}` - Soft delete

**Test Scenarios**:
- ✅ Create express experience (full/minimal)
- ✅ Update experience title and duration
- ✅ Update tickets
- ✅ Retrieve experience by ID
- ✅ Soft delete express experience

**E2E Test Requirements**:
- Express experience creation form
- Express experience update form
- Ticket management UI
- Schedule management UI
- Experience detail view

---

### 5. Hub Profile API (`hub-profile-api.spec.ts`)

**Endpoints Covered**:
- `POST /api/v1/hub-profile` - Create hub profile
- `PATCH /api/v1/hub-profile` - Update hub profile
- `GET /api/v1/hub-profile/me` - Get hub profile
- `POST /api/v1/hub-profile/publish` - Publish hub

**Test Scenarios**:
- ✅ Create initial hub profile
- ✅ Return 401 when not authenticated
- ✅ Return 400 for missing required fields
- ✅ Return 400 for invalid slug format
- ✅ Update hub profile
- ✅ Support partial updates
- ✅ Update slug and slug history
- ✅ Get hub profile
- ✅ Return 409 for duplicate slug

**E2E Test Requirements**:
- Hub creation form
- Hub profile edit form
- Slug validation UI
- Hub publish flow
- Plan-aware field handling (Soar/Scale)

---

### 6. Web Home API (`web-home-api.spec.ts`)

**Endpoints Covered**:
- `GET /api/v1/home/` - Get home page data

**Test Scenarios**:
- ✅ Get home page data
- ✅ Return valid response structure

**E2E Test Requirements**:
- Homepage sections display
- Featured experts section
- Expertise collection section
- Experience listings section
- Job opportunities section
- Navigation elements

---

### 7. Web Experiences API (`web-experiences-api.spec.ts`)

**Endpoints Covered**:
- `GET /api/v1/experiences/` - List public experiences
- `GET /api/v1/experiences/{slug}` - Get experience by slug
- `GET /api/v1/experiences/{slug}/events` - Get upcoming events
- `GET /api/v1/experiences/{slug}/featured` - Get featured experiences
- `GET /api/v1/experiences/{slug}/slots` - Get experience slots

**Test Scenarios**:
- ✅ List public experiences
- ✅ Support pagination
- ✅ Support filtering
- ✅ Get experience detail by slug
- ✅ Return 404 for non-existent slug
- ✅ Get upcoming events
- ✅ Get featured experiences
- ✅ Get experience slots

**E2E Test Requirements**:
- Experience listing page
- Experience detail page
- Pagination controls
- Filter UI
- Event calendar display
- Featured experiences section
- Booking slots display

---

### 8. Web Experts API (`web-experts-api.spec.ts`)

**Endpoints Covered**:
- `GET /api/v1/experts/` - List public experts
- `GET /api/v1/experts/{slug}` - Get expert by slug
- `GET /api/v1/experts/{slug}/services` - Get expert services

**Test Scenarios**:
- ✅ List public experts
- ✅ Support pagination
- ✅ Get expert detail by slug
- ✅ Return 404 for non-existent slug
- ✅ Get expert services

**E2E Test Requirements**:
- Expert listing page
- Expert detail page
- Expert services display
- Pagination controls

---

### 9. Web Search API (`web-search-api.spec.ts`)

**Endpoints Covered**:
- `GET /api/v1/search/?q={query}` - Search across all entities
- `GET /api/v1/search/?q={query}&type={type}` - Search with filters

**Test Scenarios**:
- ✅ Search across all entities
- ✅ Return empty results for non-existent query
- ✅ Handle search with filters
- ✅ Return 400 for missing query parameter

**E2E Test Requirements**:
- Search input field
- Search results page
- Filter options
- Empty state display
- Search result cards

---

## Authentication Flow Mapping

### Registration Flow
1. User fills registration form
2. Submit → `POST /api/v1/auth/register`
3. Success → User logged in, redirect to dashboard
4. Error → Display validation errors

### Login Flow
1. User clicks login link
2. Select email login method
3. Enter email → Continue
4. Enter password → Sign In
5. Submit → `POST /api/v1/auth/login`
6. Success → Redirect to dashboard
7. Error → Display error message

### Password Reset Flow
1. User clicks "Forgot password"
2. Enter email → Submit
3. Submit → `POST /api/v1/auth/forgot-password`
4. Success → Show "Link sent" message
5. User clicks reset link in email
6. Enter new password → Submit
7. Submit → `POST /api/v1/auth/reset-password`
8. Success → Redirect to login

---

## Data Requirements

### Test Data Patterns
- **Unique Emails**: Use `generateUniqueEmail()` helper
- **Unique Slugs**: Use timestamp + random string
- **Test Hub IDs**: Created dynamically via `createTestHub()`
- **Test User IDs**: Retrieved from registration/login response
- **Test Category/Topic IDs**: Hardcoded test IDs

### Authentication Requirements
- Most endpoints require `Authorization: Bearer {token}` header
- Tokens obtained via registration or login
- Token refresh available for expired tokens

---

## Error Handling Patterns

### Status Codes
- `200` - Success (GET, PATCH, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate slug/email)
- `422` - Unprocessable Entity (validation errors)

### Error Response Structure
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

---

## E2E Test Mapping Strategy

### 1. Authentication Tests
- Map API registration → E2E registration form
- Map API login → E2E login form
- Map API password reset → E2E password reset flow
- Verify UI matches API responses

### 2. User Profile Tests
- Map API get profile → E2E profile page
- Map API update profile → E2E profile edit form
- Verify profile data displays correctly

### 3. Experience Tests
- Map API create → E2E experience creation form
- Map API update → E2E experience edit form
- Map API get → E2E experience detail page
- Verify form data matches API payloads

### 4. Homepage Tests
- Map API home data → E2E homepage sections
- Verify featured content displays
- Verify navigation links work

### 5. Search Tests
- Map API search → E2E search functionality
- Verify search results match API response
- Verify filters work correctly

---

## Next Steps

1. ✅ Complete API test analysis
2. ✅ Explore v2.mereka.dev website
3. ✅ Create E2E test cases
4. ✅ Create test helpers
5. ✅ Update documentation

---

**Generated**: January 27, 2026
