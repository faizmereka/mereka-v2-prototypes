# V2 E2E Tests

**End-to-end tests for v2.mereka.dev based on API test scenarios**

## Overview

This directory contains E2E tests that mirror the API test scenarios from `tests/api/backend-v2-integration/tests/`. These tests verify that UI interactions correctly trigger API calls and that API responses are properly displayed in the UI.

**Consolidation Note**: These tests have been consolidated from both API-based test scenarios and existing UI-focused tests. They combine:
- API test scenario coverage (from `tests/api/backend-v2-integration/tests/`)
- Page Object Model patterns (from `tests/auth/`, `tests/experience/`, `tests/home/`)
- Helper function utilities (from `tests/e2e-test/fixtures/helpers/`)
- Standardized BASE_URL environment variable logic

## Directory Structure

```
v2-e2e/
├── auth/                          # Authentication E2E tests
│   └── authentication-e2e.spec.ts
├── user-profile/                  # User profile E2E tests
│   └── user-profile-e2e.spec.ts
├── experience/                    # Experience E2E tests
│   ├── experience-creation-e2e.spec.ts
│   └── experience-detail-e2e.spec.ts
├── home/                          # Homepage E2E tests
│   └── homepage-e2e.spec.ts
├── search/                        # Search E2E tests
│   └── search-e2e.spec.ts
├── expert/                        # Expert profile E2E tests
│   └── expert-profile-e2e.spec.ts
├── expertise/                     # Expertise collection E2E tests
│   └── expertise-collection-e2e.spec.ts
├── job/                           # Job posting E2E tests
│   └── job-posting-e2e.spec.ts
├── navigation/                    # Navigation flow E2E tests
│   └── navigation-flow-e2e.spec.ts
└── README.md                      # This file
```

## Test Files

### Authentication E2E Tests (`auth/authentication-e2e.spec.ts`)

**Based on**: `tests/api/backend-v2-integration/tests/authentication-api.spec.ts`

**Test Scenarios**:
- ✅ Register new user with email and password
- ✅ Reject registration with invalid email format
- ✅ Reject registration with weak password
- ✅ Login with valid email and password
- ✅ Show error with invalid password
- ✅ Validate email format
- ✅ Password reset flow
- ✅ Logout after login
- ✅ Clear authentication tokens after logout
- ✅ Require login after logout to access protected pages
- ✅ Access profile after login

**Run**:
```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/auth/authentication-e2e.spec.ts --headed
```

### User Profile E2E Tests (`user-profile/user-profile-e2e.spec.ts`)

**Based on**: `tests/api/backend-v2-integration/tests/user-api.spec.ts`

**Test Scenarios**:
- ✅ Get user profile
- ✅ Return 401 when not authenticated
- ✅ Update user profile
- ✅ Support partial updates
- ✅ Check username availability
- ✅ Return 400 for missing username parameter

**Run**:
```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/user-profile/user-profile-e2e.spec.ts --headed
```

### Experience E2E Tests (`experience/experience-creation-e2e.spec.ts`)

**Based on**: 
- `tests/api/backend-v2-integration/tests/platform-experience-api.spec.ts`
- `tests/api/backend-v2-integration/tests/express-experience-api.spec.ts`

**Test Scenarios**:
- ✅ Navigate to experience creation page after login
- ✅ Verify experience creation page elements are accessible
- ✅ Create platform experience with minimal fields
- ✅ Create express experience
- ✅ Update experience
- ✅ View experience detail by slug
- ✅ Delete experience

**Run**:
```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/experience/experience-creation-e2e.spec.ts --headed
```

### Homepage E2E Tests (`home/homepage-e2e.spec.ts`)

**Based on**: 
- `tests/api/backend-v2-integration/tests/web-home-api.spec.ts`
- `tests/api/backend-v2-integration/tests/web-experiences-api.spec.ts`
- `tests/api/backend-v2-integration/tests/web-experts-api.spec.ts`

**Test Scenarios**:
- ✅ Display all homepage sections
- ✅ Display all key elements in comprehensive flow (Hero, Experts, Hubs, Expertise, Experiences, Jobs)
- ✅ Verify homepage data matches API
- ✅ Navigate to experts page
- ✅ Navigate to expertise page
- ✅ Navigate to experiences page
- ✅ Navigate to jobs page

**Run**:
```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/home/homepage-e2e.spec.ts --headed
```

### Search E2E Tests (`search/search-e2e.spec.ts`)

**Based on**: `tests/api/backend-v2-integration/tests/web-search-api.spec.ts`

**Test Scenarios**:
- ✅ Search across all entities
- ✅ Return empty results for non-existent query
- ✅ Handle search with filters
- ✅ Verify search results match API data

**Run**:
```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/search/search-e2e.spec.ts --headed
```

### Expert Profile E2E Tests (`expert/expert-profile-e2e.spec.ts`)

**Based on**: Existing E2E test patterns from `tests/e2e-test/tests/`

**Test Scenarios**:
- ✅ Navigate to experts page from homepage
- ✅ Display expert cards with required information
- ✅ Filter experts by category or search
- ✅ Navigate to expert detail page from homepage
- ✅ Display expert profile information
- ✅ Display expert services section
- ✅ Navigate to expertise from expert profile
- ✅ Navigate from homepage expert card to expert detail
- ✅ Navigate back from expert detail to experts listing

**Run**:
```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/expert/expert-profile-e2e.spec.ts --headed
```

### Expertise Collection E2E Tests (`expertise/expertise-collection-e2e.spec.ts`)

**Based on**: Existing E2E test patterns from `tests/e2e-test/tests/`

**Test Scenarios**:
- ✅ Navigate to expertise page from homepage
- ✅ Display expertise cards with pricing information
- ✅ Navigate to expertise detail page from homepage
- ✅ Display expertise detail information
- ✅ Display booking button or call-to-action
- ✅ Navigate from homepage expertise card to expertise detail
- ✅ Navigate back from expertise detail to expertise listing

**Run**:
```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/expertise/expertise-collection-e2e.spec.ts --headed
```

### Job Posting E2E Tests (`job/job-posting-e2e.spec.ts`)

**Based on**: Existing E2E test patterns from `tests/e2e-test/tests/`

**Test Scenarios**:
- ✅ Navigate to jobs page from homepage
- ✅ Display job cards with required information
- ✅ Navigate to job detail page from homepage
- ✅ Display job detail information
- ✅ Display apply button on job detail page
- ✅ Navigate to job application form when logged in
- ✅ Navigate from homepage job card to job detail
- ✅ Navigate back from job detail to jobs listing

**Run**:
```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/job/job-posting-e2e.spec.ts --headed
```

### Experience Detail E2E Tests (`experience/experience-detail-e2e.spec.ts`)

**Based on**: Existing E2E test patterns from `tests/e2e-test/tests/`

**Test Scenarios**:
- ✅ Display experience detail information
- ✅ Display experience images and media
- ✅ Display booking button or call-to-action
- ✅ Navigate from homepage experience card to experience detail (after login)
- ✅ Navigate from homepage experience card to experience detail (without login)
- ✅ Navigate from homepage experience card to experience detail
- ✅ Navigate back from experience detail to experiences listing

**Run**:
```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/experience/experience-detail-e2e.spec.ts --headed
```

### Navigation Flow E2E Tests (`navigation/navigation-flow-e2e.spec.ts`)

**Based on**: Existing E2E test patterns from `tests/e2e-test/tests/`

**Test Scenarios**:
- ✅ Navigate from homepage to all main sections
- ✅ Navigate using main navigation menu
- ✅ Navigate to search results page
- ✅ Navigate from search results to detail pages
- ✅ Navigate using breadcrumbs

**Run**:
```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/navigation/navigation-flow-e2e.spec.ts --headed
```

## Test Helpers

### Authentication Helpers (`tests/e2e-test/fixtures/helpers/auth-e2e-helper.ts`)

- `loginUser(page, credentials?)` - Login user via UI
- `registerUser(page, email, password, name, birthDate)` - Register new user via UI
- `navigateToProfile(page)` - Navigate to user profile
- `verifyLoggedIn(page)` - Verify user is logged in
- `logoutUser(page)` - Logout user

### Page Helpers (`tests/e2e-test/fixtures/helpers/page-helpers.ts`)

- `waitForElement(page, selector, timeout)` - Wait for element to be visible
- `scrollIntoViewIfNeeded(page, selector)` - Scroll element into view
- `fillFormField(page, selector, value)` - Fill form field safely
- `clickWithRetry(page, selector, maxRetries)` - Click button with retry
- `verifyTextContains(page, selector, expectedText)` - Verify element text
- `isElementVisible(page, selector, timeout)` - Check if element is visible
- `waitForNavigation(page, urlPattern)` - Wait for navigation
- `verifyFormError(page, fieldSelector, errorMessage?)` - Verify form validation error

### API Helpers (`tests/e2e-test/fixtures/helpers/api-e2e-helper.ts`)

- `getHomepageData(request)` - Get homepage data from API
- `searchApi(request, query, type?)` - Search API endpoint
- `getExperienceBySlug(request, slug)` - Get experience by slug
- `getExpertBySlug(request, slug)` - Get expert by slug
- `getUserProfile(request, accessToken)` - Get user profile via API
- `compareApiWithUI(apiData, uiData, fields)` - Compare API data with UI data

## Running Tests

### Run All V2 E2E Tests

```bash
# Windows PowerShell
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e

# Linux/Mac
export TEST_ENV=production && npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e
```

### Run Specific Test Suite

```bash
# Authentication tests
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/auth

# Experience tests
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/experience
```

### Run with UI Mode

```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e --ui
```

### Run in Debug Mode

```bash
$env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e --debug
```

## Test Environment

Tests run against:
- **Production**: `https://v2.mereka.dev` (default)
- **Staging**: `https://v2-staging.mereka.io`
- **Dev**: `http://localhost:5173`

Set `TEST_ENV` environment variable to switch environments.

## Test Data

Test data is managed in:
- `tests/e2e-test/fixtures/helpers/api-test-data.ts` - API test data utilities
- `tests/e2e-test/fixtures/helpers/auth-e2e-helper.ts` - Default test user credentials

## Browser-Observed Test Methodology

These tests follow the browser-observed test methodology:
1. **Observe** actual UI elements and interactions
2. **Document** selectors and flows
3. **Verify** API calls match UI interactions
4. **Assert** UI displays API responses correctly

## API Test Mapping

Each E2E test mirrors corresponding API test scenarios:

| API Test | E2E Test | Coverage |
|----------|----------|----------|
| `authentication-api.spec.ts` | `authentication-e2e.spec.ts` | ✅ Complete |
| `user-api.spec.ts` | `user-profile-e2e.spec.ts` | ✅ Complete |
| `platform-experience-api.spec.ts` | `experience-creation-e2e.spec.ts` | ✅ Complete |
| `express-experience-api.spec.ts` | `experience-creation-e2e.spec.ts` | ✅ Complete |
| `web-home-api.spec.ts` | `homepage-e2e.spec.ts` | ✅ Complete |
| `web-search-api.spec.ts` | `search-e2e.spec.ts` | ✅ Complete |
| N/A (UI-based) | `expert-profile-e2e.spec.ts` | ✅ Complete |
| N/A (UI-based) | `expertise-collection-e2e.spec.ts` | ✅ Complete |
| N/A (UI-based) | `job-posting-e2e.spec.ts` | ✅ Complete |
| N/A (UI-based) | `experience-detail-e2e.spec.ts` | ✅ Complete |
| N/A (UI-based) | `navigation-flow-e2e.spec.ts` | ✅ Complete |

## Best Practices

1. **Use Helpers**: Leverage helper functions for common operations
2. **Wait Properly**: Always wait for elements and network idle
3. **Verify API**: Compare UI data with API responses when possible
4. **Handle Errors**: Test both success and error scenarios
5. **Document Observations**: Comment on observed UI elements
6. **Use Flexible Selectors**: Support multiple selector patterns
7. **Log Progress**: Use console.log for test progress tracking

---

## Test Consolidation

### Migration from Existing Tests

The following test files have been consolidated into `v2-e2e/`:

| Original Location | Consolidated Into | Status |
|-------------------|------------------|--------|
| `tests/auth/auth-login.spec.ts` | `v2-e2e/auth/authentication-e2e.spec.ts` | ✅ Merged |
| `tests/auth/auth-registration.spec.ts` | `v2-e2e/auth/authentication-e2e.spec.ts` | ✅ Merged |
| `tests/auth/auth-logout.spec.ts` | `v2-e2e/auth/authentication-e2e.spec.ts` | ✅ Merged |
| `tests/auth/auth-password-reset.spec.ts` | `v2-e2e/auth/authentication-e2e.spec.ts` | ✅ Merged |
| `tests/home/home-page-elements.spec.ts` | `v2-e2e/home/homepage-e2e.spec.ts` | ✅ Merged |
| `tests/experience/create-physical-experience.spec.ts` | `v2-e2e/experience/experience-creation-e2e.spec.ts` | ✅ Merged |
| `tests/experience/home-to-experience-redirection.spec.ts` | `v2-e2e/experience/experience-detail-e2e.spec.ts` | ✅ Merged |

**Note**: Original test files remain in their locations but are now considered deprecated. All new test development should use the `v2-e2e/` structure.

### Test Patterns Used

- **Page Object Model**: Uses `AuthPage` and `HomePage` fixtures for better abstraction
- **Helper Functions**: Uses `loginUser`, `generateUniqueEmail` from helpers
- **Environment Variables**: All tests use `BASE_URL` logic for environment flexibility
- **API Integration**: Some tests verify UI data matches API responses

---

**Created**: January 27, 2026  
**Last Updated**: January 27, 2026  
**Status**: ✅ Complete  
**Total Test Files**: 9  
**Total Test Scenarios**: 70+
