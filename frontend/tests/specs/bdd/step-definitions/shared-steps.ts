import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { TestContext } from '../world/test-context';
import { loginUser } from '../../../e2e-test/fixtures/helpers/auth-e2e-helper';
import {
  navigateToExperienceCreation,
  navigateToJobCreation,
  goToNextStep,
} from '../../../e2e-test/fixtures/helpers/creation-flow-helpers';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

Given('I am authenticated as a hub owner', async function (this: TestContext) {
  await loginUser(this.page);
});

Given('I am authenticated as an expert', async function (this: TestContext) {
  await loginUser(this.page);
});

Given('I am authenticated', async function (this: TestContext) {
  await loginUser(this.page);
});

Given('I am on the authentication page', async function (this: TestContext) {
  await this.page.goto(BASE_URL);
  await this.page.waitForLoadState('networkidle');
  const loginLink = this.page.getByRole('link', { name: /Log In|Login/i })
    .or(this.page.locator('a[href*="login"], a[href*="auth"]'));
  await loginLink.first().click();
  await this.page.waitForLoadState('networkidle');
});

Given('I navigate to the experience creation flow', async function (this: TestContext) {
  await navigateToExperienceCreation(this.page);
});

Given('I navigate to the job creation flow', async function (this: TestContext) {
  await navigateToJobCreation(this.page);
});

When('I go to the next step', async function (this: TestContext) {
  await goToNextStep(this.page);
});

When('I proceed to the next step', async function (this: TestContext) {
  await goToNextStep(this.page);
});

When('I attempt to continue without filling required fields', async function (this: TestContext) {
  const nextButton = this.page.getByRole('button', { name: /Next|Continue/i });
  if (await nextButton.isVisible({ timeout: 5000 })) {
    await nextButton.click();
  }
});

When('I attempt to continue without filling job overview required fields', async function (this: TestContext) {
  const nextButton = this.page.getByRole('button', { name: /Next|Continue/i });
  if (await nextButton.isVisible({ timeout: 5000 })) {
    await nextButton.click();
  }
});

Then('I should see validation errors on the basic info step', async function (this: TestContext) {
  const errorText = this.page.getByText(/required|error|invalid/i);
  await expect(errorText.first()).toBeVisible({ timeout: 10000 });
});

Then('I should see validation errors on the job overview step', async function (this: TestContext) {
  const errorText = this.page.getByText(/required|error|invalid/i);
  await expect(errorText.first()).toBeVisible({ timeout: 10000 });
});
