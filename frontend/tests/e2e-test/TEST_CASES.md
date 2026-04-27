# E2E Test Cases Inventory

**Last Updated**: January 12, 2026  
**Total Test Cases**: 26  
**Test Framework**: Playwright  
**Test Environment**: Production (https://v2.mereka.dev)

---

## Test Coverage Overview

| Feature Area | Test Files | Test Cases | Status |
|--------------|------------|------------|--------|
| **Authentication** | 4 files | 21 tests | ✅ Active |
| **Home Page** | 1 file | 1 test | ✅ Active |
| **Experience** | 2 files | 4 tests | ✅ Active |
| **Total** | **7 files** | **26 tests** | ✅ Active |

---

## Authentication Tests (21 test cases)

### Login Flow (`tests/auth/auth-login.spec.ts`) - 8 tests

1. **should successfully login with valid email and password**
   - Description: Verifies complete login flow with valid credentials
   - Steps: Navigate to auth → Continue with Email → Enter email → Use password → Enter password → Sign in
   - Expected: User redirected to homepage, authenticated state verified

2. **should show error for invalid email format**
   - Description: Validates email format validation
   - Steps: Enter invalid email format → Attempt to continue
   - Expected: Button disabled or validation error shown

3. **should show error for non-existent email**
   - Description: Tests handling of non-existent email addresses
   - Steps: Enter non-existent email → Continue
   - Expected: Message indicating email doesn't exist or registration option

4. **should show error for incorrect password**
   - Description: Tests password validation
   - Steps: Enter valid email → Enter wrong password → Sign in
   - Expected: Error message shown, remains on auth page

5. **should display all social login options**
   - Description: Verifies social login buttons are visible
   - Steps: Navigate to auth page
   - Expected: Google, Facebook, Apple, and Email options visible

6. **should handle empty email submission**
   - Description: Tests form validation for empty email
   - Steps: Click continue with email → Try to continue without entering email
   - Expected: Continue button disabled

7. **should handle empty password submission**
   - Description: Tests form validation for empty password
   - Steps: Complete email step → Try to sign in without password
   - Expected: Sign in button disabled

8. **should show forgot password option**
   - Description: Verifies forgot password link is accessible
   - Steps: Complete email step → Select password option
   - Expected: Forgot password link visible

### Registration Flow (`tests/auth/auth-registration.spec.ts`) - 5 tests

9. **should navigate to registration page**
   - Description: Tests navigation to registration flow
   - Steps: Navigate to auth → Click sign up link or use register mode
   - Expected: Registration page/form accessible

10. **should show registration form fields**
    - Description: Verifies registration form structure
    - Steps: Navigate to registration page → Click continue with email
    - Expected: Email input and registration fields visible

11. **should validate email format during registration**
    - Description: Tests email validation in registration
    - Steps: Enter invalid email format → Attempt to submit
    - Expected: Validation error or button disabled

12. **should validate password strength during registration**
    - Description: Tests password strength requirements
    - Steps: Enter weak password
    - Expected: Password strength indicator or validation message shown

13. **should prevent registration with duplicate email**
    - Description: Tests duplicate email prevention
    - Steps: Enter existing email → Attempt to register
    - Expected: Error message indicating email already exists

### Logout Flow (`tests/auth/auth-logout.spec.ts`) - 3 tests

14. **should successfully logout after login**
    - Description: Tests complete logout flow
    - Steps: Login → Click user avatar → Click logout
    - Expected: Redirected to homepage or auth page, logged out state

15. **should clear authentication tokens after logout**
    - Description: Verifies session cleanup
    - Steps: Login → Logout → Check cookies/tokens
    - Expected: Authentication cookies/tokens cleared

16. **should require login after logout to access protected pages**
    - Description: Tests protected route access after logout
    - Steps: Login → Access protected page → Logout → Try to access protected page again
    - Expected: Redirected to login/auth page

### Password Reset Flow (`tests/auth/auth-password-reset.spec.ts`) - 5 tests

17. **should navigate to password reset page**
    - Description: Tests navigation to password reset
    - Steps: Complete email step → Select password → Click forgot password
    - Expected: Password reset form/page displayed

18. **should request password reset for valid email**
    - Description: Tests password reset request submission
    - Steps: Navigate to reset page → Enter valid email → Submit
    - Expected: Success message indicating reset link sent

19. **should show error for invalid email format in password reset**
    - Description: Tests email validation in password reset
    - Steps: Enter invalid email → Attempt to submit
    - Expected: Validation error or button disabled

20. **should handle password reset for non-existent email gracefully**
    - Description: Tests handling of non-existent email in reset flow
    - Steps: Enter non-existent email → Submit
    - Expected: Appropriate message (success for security or error)

21. **should allow navigation back from password reset**
    - Description: Tests back navigation from reset page
    - Steps: Navigate to reset page → Click back to sign in
    - Expected: Returns to password input page

---

## Home Page Tests (1 test case)

### Home Page Elements (`tests/home/home-page-elements.spec.ts`) - 1 test

22. **should display all key elements in a single flow**
    - Description: Comprehensive homepage element verification
    - Verifies:
      - Hero section
      - Featured Experts section (with expert cards)
      - "View all Experts" button functionality
      - Featured Hubs section (with hub cards)
      - "View all Hubs" button functionality
      - Browse Expertise section (with expertise cards and pricing)
      - "View all Expertise" button functionality
      - Upcoming Experiences section (with experience cards)
      - "View all Experiences" button functionality
      - Latest Jobs section (with job cards if available)
      - "View all Jobs" button functionality
    - Expected: All sections visible and navigation buttons functional

---

## Experience Tests (4 test cases)

### Experience Creation (`tests/experience/create-physical-experience.spec.ts`) - 2 tests

23. **should navigate to experience creation page after login**
    - Description: Tests navigation to experience creation flow
    - Steps: Login → Navigate to hub dashboard or experience creation area
    - Expected: Successfully navigated to experience creation/dashboard page
    - Notes: Handles popups and various navigation paths

24. **should verify experience creation page elements are accessible**
    - Description: Verifies experience creation functionality is accessible
    - Steps: Login → Verify user menu → Check for experience-related elements
    - Expected: User authenticated, experience creation elements accessible
    - Notes: Placeholder for full form testing once UI structure is known

### Experience Redirection (`tests/experience/home-to-experience-redirection.spec.ts`) - 2 tests

25. **should successfully navigate to experience detail page after login**
    - Description: Tests experience detail page navigation for logged-in users
    - Steps: Login → Navigate to homepage → Click first experience card
    - Expected: Successfully navigated to experience detail page (`/experience/{id}`)

26. **should navigate to experience detail page without login**
    - Description: Tests experience detail page navigation for anonymous users
    - Steps: Navigate to homepage → Click first experience card
    - Expected: Successfully navigated to experience detail page (`/experience/{id}`)
    - Notes: Verifies public access to experience details

---

## Test Execution

### Running All Tests

```bash
cd tests/e2e-test
npm test
```

### Running by Feature

```bash
# Authentication tests only
npm test -- tests/auth/

# Home page tests only
npm test -- tests/home/

# Experience tests only
npm test -- tests/experience/
```

### Running Specific Test File

```bash
npm test -- tests/auth/auth-login.spec.ts
```

---

## Test Environment

- **Default Environment**: Production (`https://v2.mereka.dev`)
- **Backend API**: `https://api.mereka.dev`
- **Test Credentials**: Configurable via environment variables
  - `TEST_EMAIL`: Test user email (default: `testingmereka01@gmail.com`)
  - `TEST_PASSWORD`: Test user password (default: `merekamereka`)

### Environment Variables

- `FRONTEND_URL`: Override frontend URL
- `BACKEND_V2_URL`: Override backend API URL
- `TEST_ENV`: Set environment (`dev`, `staging`, `production`)
- `TEST_EMAIL`: Test user email
- `TEST_PASSWORD`: Test user password

---

## Test Results

### Current Status (Last Run: January 12, 2026)

- **Total Tests**: 26
- **Passed**: 16 (61.5%)
- **Failed**: 6 (23.1%)
- **Skipped**: 1 (3.8%)
- **Execution Time**: ~1.4 minutes

### Known Issues

1. **Login Flow**:
   - Navigation back test fails (multiple back buttons)
   - Email persistence test fails (selector issue)

2. **Password Reset Flow**:
   - Success message detection needs improvement
   - Non-existent email handling needs refinement

3. **Registration Flow**:
   - Form field visibility test needs selector updates

4. **Logout Flow**:
   - Logout button detection skipped (UI structure may differ)

---

## Test Maintenance

### Adding New Tests

1. Create test file in appropriate feature directory (`tests/{feature}/`)
2. Follow existing test structure and naming conventions
3. Use Page Object Model pattern (see `fixtures/`)
4. Update this inventory document
5. Update `tests/e2e-test/README.md` if needed

### Test File Structure

```
tests/
├── auth/
│   ├── auth-login.spec.ts
│   ├── auth-registration.spec.ts
│   ├── auth-logout.spec.ts
│   └── auth-password-reset.spec.ts
├── home/
│   └── home-page-elements.spec.ts
└── experience/
    ├── create-physical-experience.spec.ts
    └── home-to-experience-redirection.spec.ts
```

---

## Related Documentation

- **Test Execution Guide**: [README.md](README.md)
- **Report Guide**: [REPORT_GUIDE.md](REPORT_GUIDE.md)
- **Test Scenarios**: [TEST_SCENARIOS.md](TEST_SCENARIOS.md)
- **Test Report**: [E2E_TEST_REPORT_2026-01-12.md](E2E_TEST_REPORT_2026-01-12.md)

---

**Note**: This inventory is maintained alongside the test suite. Update this document when adding, modifying, or removing test cases.
