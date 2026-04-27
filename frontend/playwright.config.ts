import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Mereka Frontend Workspace
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'e2e/reports' }], ['list']],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Web app tests (port 4200)
    {
      name: 'web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4200',
      },
      testMatch: ['**/web/**/*.spec.ts', '**/reviews/experience-reviews-e2e.spec.ts', '**/reviews/expertise-reviews-e2e.spec.ts', '**/reviews/hub-reviews-e2e.spec.ts'],
    },
    // Main app tests (port 4202)
    {
      name: 'app',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4202',
      },
      testMatch: ['**/app/**/*.spec.ts', '**/reviews/booking-detail-e2e.spec.ts', '**/reviews/booking-review-e2e.spec.ts', '**/reviews/hub-booking-detail-e2e.spec.ts', '**/reviews/contract-reviews-e2e.spec.ts'],
    },
    // Auth app tests (port 4201)
    {
      name: 'auth',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4201',
      },
      testMatch: '**/auth/**/*.spec.ts',
    },
    // Admin app tests (port 4204)
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4204',
      },
      testMatch: '**/admin/**/*.spec.ts',
    },
    // Checkout app tests (port 4203)
    {
      name: 'checkout',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4203',
      },
      testMatch: '**/checkout/**/*.spec.ts',
    },
    // Mobile viewport tests
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        baseURL: 'http://localhost:4200',
      },
      testMatch: '**/mobile/**/*.spec.ts',
    },
  ],

  // Development servers
  webServer: [
    {
      command: 'npm run dev:web',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev:app',
      url: 'http://localhost:4202',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
