/**
 * Authentication Page Object Model
 *
 * Provides page object methods for interacting with the authentication pages
 * Based on the actual UI flow observed at v2.auth.mereka.dev
 */

import { Page, Locator, expect } from '@playwright/test';

export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly continueButton: Locator;
  readonly signInButton: Locator;
  readonly continueWithEmailButton: Locator;
  readonly usePasswordButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly backButton: Locator;
  readonly formBackButton: Locator;
  readonly backToSignInButton: Locator;
  readonly googleLoginButton: Locator;
  readonly facebookLoginButton: Locator;
  readonly appleLoginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initial login page elements
    this.continueWithEmailButton = page.getByRole('button', { name: /continue with email/i });
    this.googleLoginButton = page.getByRole('button', { name: /continue with google/i });
    this.facebookLoginButton = page.getByRole('button', { name: /continue with facebook/i });
    this.appleLoginButton = page.getByRole('button', { name: /continue with apple/i });
    
    // Email input page
    this.emailInput = page.getByPlaceholder(/email/i).or(page.getByLabel(/email address/i));
    this.continueButton = page.getByRole('button', { name: /continue/i });
    
    // Password input page
    this.passwordInput = page.getByPlaceholder(/enter your password/i).or(page.getByLabel(/password/i));
    this.signInButton = page.getByRole('button', { name: /sign in/i });
    this.usePasswordButton = page.getByRole('button', { name: /use password/i });
    this.forgotPasswordLink = page.getByRole('button', { name: /forgot password/i });
    
    // Common elements
    // Navigation bar back button (always present)
    this.backButton = page.locator('nav').getByRole('button', { name: /^back$/i });
    // Form back button (only on email input page)
    this.formBackButton = page.locator('form').getByRole('button', { name: /^back$/i });
    // "Back to sign in" button (on password reset page)
    this.backToSignInButton = page.getByRole('button', { name: /back to sign in/i });
  }

  /**
   * Navigate to the authentication page
   */
  async goto() {
    await this.page.goto('/');
    // Wait for page to load
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate directly to auth page
   */
  async gotoAuth() {
    const AUTH_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
      ? 'https://v2.auth.mereka.dev' 
      : process.env.TEST_ENV === 'staging'
      ? 'https://v2-staging-auth.mereka.io'
      : process.env.AUTH_URL || 'https://v2.auth.mereka.dev';
    await this.page.goto(AUTH_URL);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click "Continue with Email" button
   */
  async clickContinueWithEmail() {
    await this.continueWithEmailButton.click();
    await this.page.waitForTimeout(500); // Wait for transition
  }

  /**
   * Enter email address
   */
  async enterEmail(email: string) {
    await this.emailInput.fill(email);
    await this.page.waitForTimeout(300); // Wait for validation
  }

  /**
   * Click Continue button after entering email
   */
  async clickContinue() {
    await this.continueButton.click();
    await this.page.waitForTimeout(1000); // Wait for email check
  }

  /**
   * Select "Use password" option
   */
  async clickUsePassword() {
    await this.usePasswordButton.click();
    await this.page.waitForTimeout(500); // Wait for transition
  }

  /**
   * Enter password
   */
  async enterPassword(password: string) {
    await this.passwordInput.fill(password);
    await this.page.waitForTimeout(300); // Wait for validation
  }

  /**
   * Click Sign In button
   */
  async clickSignIn() {
    await this.signInButton.click();
    await this.page.waitForTimeout(2000); // Wait for login to complete
  }

  /**
   * Complete full login flow
   */
  async login(email: string, password: string) {
    await this.gotoAuth();
    await this.clickContinueWithEmail();
    await this.enterEmail(email);
    await this.clickContinue();
    await this.clickUsePassword();
    await this.enterPassword(password);
    await this.clickSignIn();
  }

  /**
   * Verify user is redirected to homepage after login
   */
  async verifyLoggedIn() {
    // Should be redirected to v2.mereka.dev
    await expect(this.page).toHaveURL(/v2\.mereka\.dev/);
    // Should not be on auth page
    await expect(this.page).not.toHaveURL(/v2\.auth\.mereka\.dev/);
  }

  /**
   * Verify user is on auth page
   */
  async verifyOnAuthPage() {
    await expect(this.page).toHaveURL(/v2\.auth\.mereka\.dev/);
  }

  /**
   * Verify error message is displayed
   */
  async verifyErrorMessage(expectedMessage: string) {
    const errorElement = this.page.getByText(expectedMessage, { exact: false });
    await expect(errorElement).toBeVisible();
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click navigation back button (top navigation bar)
   */
  async clickBack() {
    await this.backButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click form back button (inside form, on email input page)
   */
  async clickFormBack() {
    await this.formBackButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click "Back to sign in" button (on password reset page)
   */
  async clickBackToSignIn() {
    await this.backToSignInButton.click();
    await this.page.waitForTimeout(500);
  }
}
