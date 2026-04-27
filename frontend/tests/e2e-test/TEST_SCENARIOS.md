# E2E Test Scenarios - Authentication

**Created**: January 12, 2026  
**Based on**: Browser testing observations on v2.mereka.dev  
**Total Scenarios**: 22

---

## 📋 Test Scenarios Overview

### 1. Login Flow (`auth-login.spec.ts`) - 9 Scenarios

#### ✅ Positive Cases
1. **Successful login with valid email and password**
   - Navigate to auth page
   - Click "Continue with Email"
   - Enter valid email
   - Select "Use password"
   - Enter valid password
   - Click "Sign In"
   - Verify redirect to homepage
   - Verify user is authenticated

#### ❌ Negative Cases
2. **Invalid email format**
   - Enter invalid email format
   - Verify button disabled or validation error shown

3. **Non-existent email**
   - Enter non-existent email
   - Verify appropriate error message

4. **Incorrect password**
   - Enter valid email but wrong password
   - Verify error message displayed
   - Verify still on auth page (not redirected)

#### 🔄 Navigation Cases
5. **Back button navigation**
   - Navigate through login flow
   - Use back button at each step
   - Verify correct page displayed

6. **Email persistence**
   - Enter email, navigate back, navigate forward
   - Verify email is still filled

#### 🔍 UI Validation Cases
7. **Social login options visibility**
   - Verify Google, Facebook, Apple login buttons visible
   - Verify "Continue with Email" button visible

8. **Empty email validation**
   - Try to continue without entering email
   - Verify button is disabled

9. **Empty password validation**
   - Try to sign in without entering password
   - Verify button is disabled

---

### 2. Registration Flow (`auth-registration.spec.ts`) - 5 Scenarios

#### ✅ Positive Cases
1. **Navigate to registration page**
   - Click "Sign up" link or navigate with mode parameter
   - Verify registration form is displayed

2. **Registration form fields visibility**
   - Verify email, password, name fields are visible
   - Verify submit button is visible

#### ❌ Validation Cases
3. **Email format validation**
   - Enter invalid email format
   - Verify validation error or button disabled

4. **Password strength validation**
   - Enter weak password
   - Verify password strength indicator or validation message

5. **Duplicate email prevention**
   - Try to register with existing email
   - Verify error message about duplicate email

---

### 3. Logout Flow (`auth-logout.spec.ts`) - 3 Scenarios

#### ✅ Positive Cases
1. **Successful logout**
   - Login first
   - Find and click logout button/menu
   - Verify redirect to homepage or auth page
   - Verify login button is visible

2. **Authentication tokens cleared**
   - Login first
   - Check authentication cookies/tokens
   - Perform logout
   - Verify tokens are cleared

3. **Protected pages require login after logout**
   - Login and navigate to protected page
   - Perform logout
   - Try to access protected page again
   - Verify redirect to login page

---

### 4. Password Reset Flow (`auth-password-reset.spec.ts`) - 5 Scenarios

#### ✅ Positive Cases
1. **Navigate to password reset page**
   - Click "Forgot password?" link
   - Verify reset form is displayed

2. **Request password reset for valid email**
   - Enter valid email
   - Submit reset request
   - Verify success message displayed

#### ❌ Validation Cases
3. **Invalid email format validation**
   - Enter invalid email format
   - Verify validation error or button disabled

4. **Non-existent email handling**
   - Enter non-existent email
   - Verify appropriate message (success for security or error)

#### 🔄 Navigation Cases
5. **Back button from password reset**
   - Navigate to password reset page
   - Click back button
   - Verify return to password input page

---

## 🎯 Test Coverage Summary

| Feature | Positive Tests | Negative Tests | Navigation Tests | Total |
|---------|---------------|----------------|------------------|-------|
| **Login** | 1 | 3 | 2 | 9 |
| **Registration** | 2 | 3 | 0 | 5 |
| **Logout** | 3 | 0 | 0 | 3 |
| **Password Reset** | 2 | 2 | 1 | 5 |
| **Total** | 8 | 8 | 3 | **22** |

---

## 🔑 Key Test Patterns

### Page Object Model
- Uses `AuthPage` class for all authentication interactions
- Encapsulates selectors and actions
- Makes tests maintainable and readable

### Test Data
- Uses environment variables for test credentials
- Generates unique emails for registration tests
- Supports multiple environments (dev, staging, production)

### Assertions
- Verifies URL changes (redirects)
- Verifies element visibility
- Verifies error messages
- Verifies form validation states

### Error Handling
- Uses `test.skip()` for features not yet implemented
- Handles optional UI elements gracefully
- Provides clear error messages

---

## 🚀 Running Tests

```bash
# Run all E2E tests
npx playwright test --config=tests/e2e-test/playwright.config.ts

# Run specific test file
npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/auth-login.spec.ts

# Run in headed mode (see browser)
npx playwright test --config=tests/e2e-test/playwright.config.ts --headed

# Run with UI mode
npx playwright test --config=tests/e2e-test/playwright.config.ts --ui
```

---

## 📝 Notes

- Tests are based on actual browser observations from v2.mereka.dev
- Some selectors may need adjustment based on actual UI implementation
- Tests use flexible selectors to handle UI variations
- Environment variables allow easy configuration for different test environments

---

**Last Updated**: January 12, 2026
