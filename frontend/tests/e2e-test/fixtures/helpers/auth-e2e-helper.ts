/**
 * Authentication Helper for E2E Tests
 * 
 * Provides helper functions for authentication flows in E2E tests
 */

import { Page, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev' 
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

export interface LoginCredentials {
  email: string;
  password: string;
}

export const DEFAULT_TEST_USER: LoginCredentials = {
  email: 'testingmereka01@gmail.com',
  password: 'merekamereka',
};

/**
 * Login user via UI
 */
export async function loginUser(page: Page, credentials?: LoginCredentials): Promise<void> {
  const user = credentials || DEFAULT_TEST_USER;
  
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  
  // Click login link - use first() to avoid strict mode violation
  const loginLink = page.getByRole('link', { name: /Log In|Login/i })
    .or(page.locator('a[href*="login"], a[href*="auth"]'));
  await loginLink.first().waitFor({ state: 'visible', timeout: 10000 });
  await loginLink.first().click();
  await page.waitForLoadState('networkidle');

  // Select email login method
  const emailButton = page.getByRole('button', { name: /Continue with Email|Email/i });
  if (await emailButton.isVisible({ timeout: 5000 })) {
    await emailButton.click();
    await page.waitForLoadState('networkidle');
  }

  // Enter email
  const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(user.email);
  
  const continueButton = page.getByRole('button', { name: /Continue/i });
  await continueButton.waitFor({ state: 'visible', timeout: 10000 });
  await continueButton.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Check if password field appears directly, or if method selection screen appears
  const passwordInput = page.locator('input[formcontrolname="password"][type="password"]');
  const passwordVisible = await passwordInput.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (!passwordVisible) {
    // Method selection screen might appear (OTP vs Password)
    const methodSelectionHeader = page.locator('h2').filter({ hasText: /How would you like to sign in/i });
    const hasMethodSelection = await methodSelectionHeader.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasMethodSelection) {
      const passwordMethodButton = page.getByRole('button', { name: /Use password/i });
      await expect(passwordMethodButton).toBeVisible({ timeout: 10000 });
      await passwordMethodButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
  }
  
  // Enter password
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(user.password);
  
  const signInButton = page.getByRole('button', { name: /Sign In|Login/i });
  await signInButton.waitFor({ state: 'visible', timeout: 10000 });
  await signInButton.click();
  await page.waitForLoadState('networkidle');

  // Verify login success
  const loginSuccessIndicators = page.locator('[class*="profile"], [class*="user"], [class*="menu"], [class*="avatar"]')
    .or(page.getByText('Welcome'))
    .or(page.getByText('Dashboard'));
  await loginSuccessIndicators.first().waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Register new user via UI
 */
export async function registerUser(
  page: Page,
  email: string,
  password: string = 'SecurePassword123!',
  name: string = 'Test User',
  birthDate: string = '01/01/1990'
): Promise<void> {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  
  // Click sign up link
  const signUpLink = page.getByRole('link', { name: /Sign Up|Register|Sign up/i });
  await signUpLink.waitFor({ state: 'visible', timeout: 10000 });
  await signUpLink.click();
  await page.waitForLoadState('networkidle');

  // Fill registration form
  const nameInput = page.locator('input[formcontrolname="name"]');
  const emailInput = page.locator('input[formcontrolname="email"][type="email"]');
  const passwordInput = page.locator('input[formcontrolname="password"][type="password"]');
  const confirmPasswordInput = page.locator('input[formcontrolname="confirmPassword"][type="password"]');
  const birthDateInput = page.locator('input[formcontrolname="birthDate"]');

  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput.fill(name);
  
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(email);
  
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(password);
  
  if (await confirmPasswordInput.isVisible({ timeout: 5000 })) {
    await confirmPasswordInput.fill(password);
  }
  
  if (await birthDateInput.isVisible({ timeout: 5000 })) {
    await birthDateInput.fill(birthDate);
  }

  // Submit registration
  const submitButton = page.getByRole('button', { name: /Sign Up|Register|Create Account/i });
  await submitButton.waitFor({ state: 'visible', timeout: 10000 });
  await submitButton.click();
  await page.waitForLoadState('networkidle');

  // Verify registration success
  const loginSuccessIndicators = page.locator('[class*="profile"], [class*="user"], [class*="menu"], [class*="avatar"]')
    .or(page.getByText('Welcome'))
    .or(page.getByText('Dashboard'));
  await loginSuccessIndicators.first().waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Navigate to user profile
 */
export async function navigateToProfile(page: Page): Promise<void> {
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
}

/**
 * Verify user is logged in
 */
export async function verifyLoggedIn(page: Page): Promise<boolean> {
  const loginIndicators = page.locator('[class*="profile"], [class*="user"], [class*="menu"], [class*="avatar"]')
    .or(page.getByText('Welcome'))
    .or(page.getByText('Dashboard'));
  
  return await loginIndicators.first().isVisible({ timeout: 5000 }).catch(() => false);
}

/**
 * Logout user (if logout functionality exists)
 */
export async function logoutUser(page: Page): Promise<void> {
  // Click profile menu
  const profileMenu = page.locator('[class*="profile"], [class*="user"], [class*="avatar"]').first();
  if (await profileMenu.isVisible({ timeout: 5000 })) {
    await profileMenu.click();
    await page.waitForTimeout(1000);
    
    // Click logout option
    const logoutOption = page.getByRole('button', { name: /Logout|Sign Out|Log out/i })
      .or(page.getByRole('link', { name: /Logout|Sign Out/i }));
    
    if (await logoutOption.isVisible({ timeout: 5000 })) {
      await logoutOption.click();
      await page.waitForLoadState('networkidle');
    }
  }
}
