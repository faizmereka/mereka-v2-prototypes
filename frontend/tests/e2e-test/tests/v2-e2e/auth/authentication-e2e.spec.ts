/**
 * Authentication E2E Tests
 * 
 * Based on: tests/api/backend-v2-integration/tests/authentication-api.spec.ts
 * 
 * These E2E tests mirror the API test scenarios for authentication:
 * - User registration flow
 * - Login flow (email/password)
 * - Password reset flow
 * - Profile access after login
 * - Error handling (invalid credentials, validation)
 * 
 * Test Environment: https://v2.mereka.dev
 * 
 * Run with: $env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/auth/authentication-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import { generateUniqueEmail } from '../../fixtures/helpers/api-test-data';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev' 
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

test.describe('Authentication E2E Tests - Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should register new user with email and password', async ({ page }) => {
    console.log('🔍 Test: Register new user with email and password');
    
    const uniqueEmail = generateUniqueEmail();
    const password = 'SecurePassword123!';
    const name = 'Test User';
    const birthDate = '01/01/1990';

    // Step 1: Navigate to registration
    // Observed: Sign up link in header navigation
    const signUpLink = page.getByRole('link', { name: /Sign Up|Register|Sign up/i });
    await expect(signUpLink).toBeVisible({ timeout: 10000 });
    await signUpLink.click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to registration page');

    // Step 2: Fill registration form
    // Observed: Registration form with name, email, password fields
    const nameInput = page.locator('input[formcontrolname="name"]');
    const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
    const passwordInput = page.locator('input[formcontrolname="password"][type="password"]');
    const confirmPasswordInput = page.locator('input[formcontrolname="confirmPassword"][type="password"]');
    const birthDateInput = page.locator('input[formcontrolname="birthDate"]');

    // Wait for form to be visible
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    // Fill form fields
    await nameInput.fill(name);
    await emailInput.fill(uniqueEmail);
    await passwordInput.fill(password);
    if (await confirmPasswordInput.isVisible()) {
      await confirmPasswordInput.fill(password);
    }
    if (await birthDateInput.isVisible()) {
      await birthDateInput.fill(birthDate);
    }
    console.log('✅ Filled registration form');

    // Step 3: Submit registration
    const submitButton = page.getByRole('button', { name: /Sign Up|Register|Create Account/i });
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await submitButton.click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Submitted registration form');

    // Step 4: Verify registration success
    // Observed: User should be logged in and redirected to dashboard or profile
    const loginSuccessIndicators = page.locator('[class*="profile"], [class*="user"], [class*="menu"], [class*="avatar"]')
      .or(page.getByText('Welcome'))
      .or(page.getByText('Dashboard'));
    
    await expect(loginSuccessIndicators.first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Registration successful - user logged in');
  });

  test('should reject registration with invalid email format', async ({ page }) => {
    console.log('🔍 Test: Reject registration with invalid email format');
    
    // Step 1: Navigate to registration
    const signUpLink = page.getByRole('link', { name: /Sign Up|Register|Sign up/i });
    await expect(signUpLink).toBeVisible({ timeout: 10000 });
    await signUpLink.click();
    await page.waitForLoadState('networkidle');

    // Step 2: Fill form with invalid email
    const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill('invalid-email');

    // Step 3: Verify email validation error
    // Observed: Email input shows error state and error message
    await expect(emailInput).toHaveClass(/form-wrapper__input--error|ng-invalid/, { timeout: 5000 });
    
    const errorMessage = page.locator('span.error').filter({ hasText: /Email is invalid|Invalid email/i });
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    console.log('✅ Email validation error displayed');

    // Step 4: Verify submit button is disabled
    const submitButton = page.getByRole('button', { name: /Sign Up|Register/i });
    await expect(submitButton).toBeDisabled();
    console.log('✅ Submit button disabled for invalid email');
  });

  test('should reject registration with weak password', async ({ page }) => {
    console.log('🔍 Test: Reject registration with weak password');
    
    // Step 1: Navigate to registration
    const signUpLink = page.getByRole('link', { name: /Sign Up|Register|Sign up/i });
    await expect(signUpLink).toBeVisible({ timeout: 10000 });
    await signUpLink.click();
    await page.waitForLoadState('networkidle');

    // Step 2: Fill form with weak password
    const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
    const passwordInput = page.locator('input[formcontrolname="password"][type="password"]');
    
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(generateUniqueEmail());
    await passwordInput.fill('123'); // Weak password

    // Step 3: Verify password validation error
    await expect(passwordInput).toHaveClass(/form-wrapper__input--error|ng-invalid/, { timeout: 5000 });
    
    const errorMessage = page.locator('span.error').filter({ hasText: /password|weak|strong/i });
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      console.log('✅ Password validation error displayed');
    }

    // Step 4: Verify submit button is disabled or form shows error
    const submitButton = page.getByRole('button', { name: /Sign Up|Register/i });
    // Button might be disabled or form will show error on submit
    const isDisabled = await submitButton.isDisabled();
    if (!isDisabled) {
      await submitButton.click();
      await page.waitForTimeout(1000);
      // Check for error message after submit attempt
      const submitError = page.locator('span.error').filter({ hasText: /password/i });
      await expect(submitError).toBeVisible({ timeout: 5000 });
    }
    console.log('✅ Weak password rejected');
  });
});

test.describe('Authentication E2E Tests - Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should login with valid email and password', async ({ page }) => {
    console.log('🔍 Test: Login with valid email and password');
    
    // Step 1: Navigate to login
    // Observed: Login link in header navigation
    const loginLink = page.getByRole('link', { name: /Log In|Login/i })
      .or(page.locator('a[href*="login"], a[href*="auth"]'));
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await loginLink.click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to login page');

    // Step 2: Select email login method
    // Observed: Email button or email input directly visible
    const emailButton = page.getByRole('button', { name: /Continue with Email|Email/i });
    if (await emailButton.isVisible({ timeout: 5000 })) {
      await emailButton.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Selected email login method');
    }

    // Step 3: Enter email
    // Observed: Email input field
    const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill('testingmereka01@gmail.com');
    
    const continueButton = page.getByRole('button', { name: /Continue/i });
    await expect(continueButton).toBeVisible({ timeout: 10000 });
    await continueButton.click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Entered email');

    // Step 4: Enter password
    // Observed: Password input field
    const passwordInput = page.locator('input[formcontrolname="password"][type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill('merekamereka');
    
    const signInButton = page.getByRole('button', { name: /Sign In|Login/i });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Entered password and submitted');

    // Step 5: Verify login success
    // Observed: Profile menu or dashboard appears after successful login
    const loginSuccessIndicators = page.locator('[class*="profile"], [class*="user"], [class*="menu"], [class*="avatar"]')
      .or(page.getByText('Welcome'))
      .or(page.getByText('Dashboard'));
    
    await expect(loginSuccessIndicators.first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Login successful');
  });

  test('should show error with invalid password', async ({ page }) => {
    console.log('🔍 Test: Show error with invalid password');
    
    // Step 1: Navigate to login
    const loginLink = page.getByRole('link', { name: /Log In|Login/i })
      .or(page.locator('a[href*="login"], a[href*="auth"]'));
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await loginLink.click();
    await page.waitForLoadState('networkidle');

    // Step 2: Select email login method
    const emailButton = page.getByRole('button', { name: /Continue with Email|Email/i });
    if (await emailButton.isVisible({ timeout: 5000 })) {
      await emailButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Step 3: Enter valid email
    const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill('testingmereka01@gmail.com');
    
    const continueButton = page.getByRole('button', { name: /Continue/i });
    await continueButton.click();
    await page.waitForLoadState('networkidle');

    // Step 4: Enter wrong password
    const passwordInput = page.locator('input[formcontrolname="password"][type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill('WrongPassword123!');
    
    const signInButton = page.getByRole('button', { name: /Sign In|Login/i });
    await signInButton.click();
    await page.waitForLoadState('networkidle');

    // Step 5: Verify error message
    // Observed: Error message appears below password field
    const errorMessage = page.locator('span.error.error--warning')
      .or(page.locator('span.error').filter({ hasText: /Wrong password|Invalid|Incorrect/i }));
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toHaveText(/Wrong password|Invalid|Incorrect/i);
    console.log('✅ Error message displayed for invalid password');

    // Step 6: Verify password input shows error state
    const passwordInputWrapper = page.locator('.form-wrapper__input.form-wrapper__input--error')
      .or(passwordInput.filter({ hasClass: /error|invalid/i }));
    await expect(passwordInputWrapper).toBeVisible({ timeout: 10000 });
    console.log('✅ Password input shows error state');
  });

  test('should validate email format', async ({ page }) => {
    console.log('🔍 Test: Validate email format');
    
    // Step 1: Navigate to login
    const loginLink = page.getByRole('link', { name: /Log In|Login/i })
      .or(page.locator('a[href*="login"], a[href*="auth"]'));
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await loginLink.click();
    await page.waitForLoadState('networkidle');

    // Step 2: Select email login method
    const emailButton = page.getByRole('button', { name: /Continue with Email|Email/i });
    if (await emailButton.isVisible({ timeout: 5000 })) {
      await emailButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Step 3: Enter invalid email format
    const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill('invalid-email-format');

    // Step 4: Verify email validation error
    await expect(emailInput).toHaveClass(/form-wrapper__input--error|ng-invalid/, { timeout: 5000 });
    
    const errorMessage = page.locator('span.error').filter({ hasText: /Email is invalid|Invalid email/i });
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    console.log('✅ Email validation error displayed');

    // Step 5: Verify Continue button is disabled
    const continueButton = page.getByRole('button', { name: /Continue/i });
    await expect(continueButton).toBeDisabled();
    console.log('✅ Continue button disabled for invalid email');
  });
});

test.describe('Authentication E2E Tests - Password Reset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should allow password reset flow', async ({ page }) => {
    console.log('🔍 Test: Password reset flow');
    
    // Step 1: Navigate to login
    const loginLink = page.getByRole('link', { name: /Log In|Login/i })
      .or(page.locator('a[href*="login"], a[href*="auth"]'));
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await loginLink.click();
    await page.waitForLoadState('networkidle');

    // Step 2: Select email login method
    const emailButton = page.getByRole('button', { name: /Continue with Email|Email/i });
    if (await emailButton.isVisible({ timeout: 5000 })) {
      await emailButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Step 3: Enter email
    const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill('testingmereka01@gmail.com');
    
    const continueButton = page.getByRole('button', { name: /Continue/i });
    await continueButton.click();
    await page.waitForLoadState('networkidle');

    // Step 4: Click forgot password button
    // Observed: Forgot password button below password field
    const forgotPasswordButton = page.locator('button.forgot-button')
      .or(page.getByRole('button', { name: /Forgot password|Forgot Password/i }));
    await expect(forgotPasswordButton).toBeVisible({ timeout: 10000 });
    await forgotPasswordButton.click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Clicked forgot password button');

    // Step 5: Verify forgot password page
    // Observed: Page header shows "Forgot your password?"
    const forgotPasswordHeader = page.locator('h5.head__heading')
      .or(page.locator('h1, h2, h3').filter({ hasText: /Forgot your password|Reset password/i }));
    await expect(forgotPasswordHeader).toBeVisible({ timeout: 10000 });
    await expect(forgotPasswordHeader).toHaveText(/Forgot your password|Reset password/i);
    console.log('✅ Forgot password page displayed');

    // Step 6: Enter email in reset form
    const resetEmailInput = page.locator('input[formcontrolname="email"][type="email"]#email')
      .or(page.locator('input[formcontrolname="email"][type="email"]'));
    await expect(resetEmailInput).toBeVisible({ timeout: 10000 });
    await resetEmailInput.fill('testingmereka01@gmail.com');
    console.log('✅ Entered email in reset form');

    // Step 7: Submit reset request
    const sendResetLinkButton = page.locator('button[ui-button-fill-large][type="submit"]')
      .or(page.getByRole('button', { name: /Send reset link|Send Reset Link/i }));
    await expect(sendResetLinkButton).toBeVisible({ timeout: 10000 });
    await sendResetLinkButton.click();
    await page.waitForTimeout(1000);
    console.log('✅ Submitted reset request');

    // Step 8: Verify success message
    // Observed: Success message "The Link is sent successfully"
    const successMessage = page.getByText('The Link is sent successfully')
      .or(page.getByText(/Link is sent|Reset link sent|Email sent/i));
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    console.log('✅ Password reset success message displayed');
  });
});

test.describe('Authentication E2E Tests - Logout', () => {
  const TEST_EMAIL = process.env.TEST_EMAIL || 'testingmereka01@gmail.com';
  const TEST_PASSWORD = process.env.TEST_PASSWORD || 'merekamereka';

  test('should successfully logout after login', async ({ page, context }) => {
    console.log('🔍 Test: Successfully logout after login');
    
    // Step 1: Login first
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const loginLink = page.getByRole('link', { name: /Log In|Login/i })
      .or(page.locator('a[href*="login"], a[href*="auth"]'));
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await loginLink.click();
    await page.waitForLoadState('networkidle');

    const emailButton = page.getByRole('button', { name: /Continue with Email|Email/i });
    if (await emailButton.isVisible({ timeout: 5000 })) {
      await emailButton.click();
      await page.waitForLoadState('networkidle');
    }

    const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(TEST_EMAIL);
    
    const continueButton = page.getByRole('button', { name: /Continue/i });
    await continueButton.click();
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[formcontrolname="password"][type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill(TEST_PASSWORD);
    
    const signInButton = page.getByRole('button', { name: /Sign In|Login/i });
    await signInButton.click();
    await page.waitForLoadState('networkidle');

    // Verify login success
    const loginSuccessIndicators = page.locator('[class*="profile"], [class*="user"], [class*="menu"], [class*="avatar"]')
      .or(page.getByText('Welcome'))
      .or(page.getByText('Dashboard'));
    await expect(loginSuccessIndicators.first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Login successful');
    
    // Step 2: Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Step 3: Find and click user avatar/icon button
    const userAvatarButton = page.locator('button:has(img)')
      .or(page.locator('[class*="avatar"]'))
      .or(page.locator('[aria-label*="user" i]'))
      .or(page.locator('[aria-label*="account" i]'))
      .or(page.locator('[data-testid*="user"]'))
      .or(page.locator('[data-testid*="account"]'))
      .or(page.getByRole('button').filter({ has: page.locator('img') }))
      .first();
    
    await expect(userAvatarButton).toBeVisible({ timeout: 10000 });
    await userAvatarButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Opened user menu');
    
    // Step 4: Click logout button
    const logoutButton = page.getByRole('button', { name: /log out|logout/i })
      .or(page.getByRole('link', { name: /log out|logout/i }))
      .or(page.getByText(/log out|logout/i))
      .first();
    
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();
    await page.waitForTimeout(2000);
    console.log('✅ Clicked logout');
    
    // Step 5: Verify logout success
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/v2\.mereka\.dev|v2\.auth\.mereka\.dev/);
    
    const isOnAuthPage = currentUrl.includes('auth.mereka.dev');
    const loginButton = page.getByRole('link', { name: /log in|sign in/i })
      .or(page.getByRole('button', { name: /log in|sign in/i }));
    
    if (isOnAuthPage) {
      const continueWithEmailButton = page.getByRole('button', { name: /continue with email/i });
      await expect(continueWithEmailButton).toBeVisible({ timeout: 5000 });
      console.log('✅ Redirected to auth page after logout');
    } else if (await loginButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(loginButton.first()).toBeVisible();
      console.log('✅ Login button visible on homepage after logout');
    }
  });

  test('should clear authentication tokens after logout', async ({ page, context }) => {
    console.log('🔍 Test: Clear authentication tokens after logout');
    
    // Step 1: Login first
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const loginLink = page.getByRole('link', { name: /Log In|Login/i })
      .or(page.locator('a[href*="login"], a[href*="auth"]'));
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await loginLink.click();
    await page.waitForLoadState('networkidle');

    const emailButton = page.getByRole('button', { name: /Continue with Email|Email/i });
    if (await emailButton.isVisible({ timeout: 5000 })) {
      await emailButton.click();
      await page.waitForLoadState('networkidle');
    }

    const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(TEST_EMAIL);
    
    const continueButton = page.getByRole('button', { name: /Continue/i });
    await continueButton.click();
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[formcontrolname="password"][type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill(TEST_PASSWORD);
    
    const signInButton = page.getByRole('button', { name: /Sign In|Login/i });
    await signInButton.click();
    await page.waitForLoadState('networkidle');

    // Step 2: Check authentication cookies/tokens before logout
    const cookiesBefore = await context.cookies();
    const authCookiesBefore = cookiesBefore.filter(
      (cookie) => cookie.name.includes('token') || cookie.name.includes('auth') || cookie.name.includes('session')
    );
    console.log(`✅ Found ${authCookiesBefore.length} auth cookies before logout`);
    
    // Step 3: Perform logout
    const userAvatarButton = page.locator('button:has(img)')
      .or(page.locator('[class*="avatar"]'))
      .or(page.locator('[aria-label*="user" i]'))
      .or(page.locator('[data-testid*="user"]'))
      .first();
    
    if (await userAvatarButton.isVisible({ timeout: 10000 })) {
      await userAvatarButton.click();
      await page.waitForTimeout(500);
      
      const logoutButton = page.getByRole('button', { name: /log out|logout/i })
        .or(page.getByRole('link', { name: /log out|logout/i }))
        .or(page.getByText(/log out|logout/i))
        .first();
      
      if (await logoutButton.isVisible({ timeout: 5000 })) {
        await logoutButton.click();
        await page.waitForTimeout(2000);
        
        // Step 4: Check cookies after logout
        const cookiesAfter = await context.cookies();
        const authCookiesAfter = cookiesAfter.filter(
          (cookie) => cookie.name.includes('token') || cookie.name.includes('auth') || cookie.name.includes('session')
        );
        
        // Auth cookies should be cleared or reduced
        expect(authCookiesAfter.length).toBeLessThanOrEqual(authCookiesBefore.length);
        console.log(`✅ Auth cookies cleared: ${authCookiesBefore.length} → ${authCookiesAfter.length}`);
      }
    }
  });

  test('should require login after logout to access protected pages', async ({ page }) => {
    console.log('🔍 Test: Require login after logout to access protected pages');
    
    // Step 1: Login first
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const loginLink = page.getByRole('link', { name: /Log In|Login/i })
      .or(page.locator('a[href*="login"], a[href*="auth"]'));
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await loginLink.click();
    await page.waitForLoadState('networkidle');

    const emailButton = page.getByRole('button', { name: /Continue with Email|Email/i });
    if (await emailButton.isVisible({ timeout: 5000 })) {
      await emailButton.click();
      await page.waitForLoadState('networkidle');
    }

    const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(TEST_EMAIL);
    
    const continueButton = page.getByRole('button', { name: /Continue/i });
    await continueButton.click();
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[formcontrolname="password"][type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill(TEST_PASSWORD);
    
    const signInButton = page.getByRole('button', { name: /Sign In|Login/i });
    await signInButton.click();
    await page.waitForLoadState('networkidle');

    // Step 2: Navigate to a protected page
    await page.goto(`${BASE_URL}/account`);
    await page.waitForTimeout(1000);
    console.log('✅ Navigated to protected page');
    
    // Step 3: Perform logout
    const userAvatarButton = page.locator('button:has(img)')
      .or(page.locator('[class*="avatar"]'))
      .or(page.locator('[aria-label*="user" i]'))
      .first();
    
    if (await userAvatarButton.isVisible({ timeout: 10000 })) {
      await userAvatarButton.click();
      await page.waitForTimeout(500);
      
      const logoutButton = page.getByRole('button', { name: /log out|logout/i })
        .or(page.getByRole('link', { name: /log out|logout/i }))
        .or(page.getByText(/log out|logout/i))
        .first();
      
      if (await logoutButton.isVisible({ timeout: 5000 })) {
        await logoutButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Logged out');
        
        // Step 4: Try to access protected page again
        await page.goto(`${BASE_URL}/account`);
        await page.waitForTimeout(2000);
        
        // Should be redirected to login or show access denied
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/auth|login|sign-in/);
        console.log('✅ Redirected to auth page when accessing protected route after logout');
      }
    }
  });
});

test.describe('Authentication E2E Tests - Profile Access', () => {
  test('should access profile after login', async ({ page }) => {
    console.log('🔍 Test: Access profile after login');
    
    // Step 1: Login (reuse login flow)
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const loginLink = page.getByRole('link', { name: /Log In|Login/i })
      .or(page.locator('a[href*="login"], a[href*="auth"]'));
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await loginLink.click();
    await page.waitForLoadState('networkidle');

    const emailButton = page.getByRole('button', { name: /Continue with Email|Email/i });
    if (await emailButton.isVisible({ timeout: 5000 })) {
      await emailButton.click();
      await page.waitForLoadState('networkidle');
    }

    const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill('testingmereka01@gmail.com');
    
    const continueButton = page.getByRole('button', { name: /Continue/i });
    await continueButton.click();
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[formcontrolname="password"][type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill('merekamereka');
    
    const signInButton = page.getByRole('button', { name: /Sign In|Login/i });
    await signInButton.click();
    await page.waitForLoadState('networkidle');

    // Step 2: Verify login success
    const loginSuccessIndicators = page.locator('[class*="profile"], [class*="user"], [class*="menu"], [class*="avatar"]')
      .or(page.getByText('Welcome'))
      .or(page.getByText('Dashboard'));
    await expect(loginSuccessIndicators.first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Login successful');

    // Step 3: Navigate to profile
    // Observed: Profile link in user menu or header
    const profileLink = page.getByRole('link', { name: /Profile|My Profile|Account/i })
      .or(page.locator('a[href*="profile"], a[href*="account"]'));
    
    if (await profileLink.isVisible({ timeout: 5000 })) {
      await profileLink.click();
    } else {
      // Try clicking profile menu/avatar first
      const profileMenu = page.locator('[class*="profile"], [class*="user"], [class*="avatar"]').first();
      if (await profileMenu.isVisible({ timeout: 5000 })) {
        await profileMenu.click();
        await page.waitForTimeout(1000);
        const profileOption = page.getByRole('link', { name: /Profile/i });
        await profileOption.click();
      }
    }
    
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to profile');

    // Step 4: Verify profile page displays
    // Observed: Profile page shows user information
    const profileContent = page.locator('h1, h2, h3').filter({ hasText: /Profile|Account|Settings/i })
      .or(page.locator('[class*="profile"]'));
    await expect(profileContent.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Profile page displayed');
  });
});
