import { test as base, type Page } from '@playwright/test';

/**
 * Authentication Fixture
 * Provides helper methods for authentication in E2E tests
 */
export interface AuthFixtures {
  authenticatedPage: Page;
  hubAuthenticatedPage: Page;
  learnerEmail: string;
  learnerPassword: string;
  hubEmail: string;
  hubPassword: string;
}

// Test user credentials (from backend seed data)
const TEST_LEARNER = {
  email: 'test-learner@mereka.io',
  password: 'Test@123456',
};

const TEST_HUB = {
  email: 'test-hub@mereka.io',
  password: 'Test@123456',
};

/**
 * Logs in a user via the auth app
 */
async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('http://localhost:4201/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-btn"]');

  // Wait for redirect after successful login
  await page.waitForURL(/localhost:420[0-9]/);
}

export const test = base.extend<AuthFixtures>({
  learnerEmail: TEST_LEARNER.email,
  learnerPassword: TEST_LEARNER.password,
  hubEmail: TEST_HUB.email,
  hubPassword: TEST_HUB.password,

  authenticatedPage: async ({ page }, use) => {
    await loginUser(page, TEST_LEARNER.email, TEST_LEARNER.password);
    await use(page);
  },

  hubAuthenticatedPage: async ({ page }, use) => {
    await loginUser(page, TEST_HUB.email, TEST_HUB.password);
    await use(page);
  },
});

export { expect } from '@playwright/test';
