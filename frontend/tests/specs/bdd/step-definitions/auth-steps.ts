import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { TestContext } from '../world/test-context';
import {
  DEFAULT_TEST_USER,
  loginUser,
  registerUser,
  logoutUser,
  verifyLoggedIn,
} from '../../../e2e-test/fixtures/helpers/auth-e2e-helper';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

Given('I am authenticated', async function (this: TestContext) {
  await loginUser(this.page);
});

When('I enter a valid email and password', async function (this: TestContext) {
  this.setData('credentials', DEFAULT_TEST_USER);
});

When('I enter an invalid email', async function (this: TestContext) {
  this.setData('invalidEmail', 'invalid-email');
  const emailInput = this.page.locator('input[formcontrolname="email"][type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill('invalid-email');
});

When('I submit the login form', async function (this: TestContext) {
  const invalidEmail = this.getData<string>('invalidEmail');
  if (invalidEmail) {
    const continueButton = this.page.getByRole('button', { name: /Continue/i });
    await continueButton.waitFor({ state: 'visible', timeout: 10000 });
    await continueButton.click();
    return;
  }

  const credentials = this.getData('credentials') as { email: string; password: string } | undefined;
  await loginUser(this.page, credentials || DEFAULT_TEST_USER);
});

Then('I should be authenticated', async function (this: TestContext) {
  const isLoggedIn = await verifyLoggedIn(this.page);
  expect(isLoggedIn).toBe(true);
});

Then('I should be redirected to the home page', async function (this: TestContext) {
  await expect(this.page).toHaveURL(/mereka|dashboard|home/i);
});

Then('I should see an email validation error', async function (this: TestContext) {
  const errorText = this.page.getByText(/invalid|email|error|required/i);
  await expect(errorText.first()).toBeVisible({ timeout: 10000 });
});

When('I navigate to the registration form', async function (this: TestContext) {
  await this.page.goto(BASE_URL);
  await this.page.waitForLoadState('networkidle');
  const signUpLink = this.page.getByRole('link', { name: /Sign Up|Register|Sign up/i });
  await signUpLink.waitFor({ state: 'visible', timeout: 10000 });
  await signUpLink.click();
  await this.page.waitForLoadState('networkidle');
});

When('I enter valid registration details', async function (this: TestContext) {
  const uniqueEmail = `bdd-user-${Date.now()}@example.com`;
  this.setData('registrationEmail', uniqueEmail);
  await registerUser(this.page, uniqueEmail, 'SecurePassword123!', 'BDD User', '01/01/1990');
});

When('I submit the registration form', async function () {
  // registerUser handles the submit step.
});

Then('I should see a registration success state', async function (this: TestContext) {
  const isLoggedIn = await verifyLoggedIn(this.page);
  expect(isLoggedIn).toBe(true);
});

When('I log out', async function (this: TestContext) {
  await logoutUser(this.page);
});

Then('I should be unauthenticated', async function (this: TestContext) {
  const isLoggedIn = await verifyLoggedIn(this.page);
  expect(isLoggedIn).toBe(false);
});
