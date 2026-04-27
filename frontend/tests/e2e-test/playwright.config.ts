/**
 * Playwright Configuration for E2E Tests
 *
 * This configuration is specifically for E2E tests that use Playwright
 * to test the frontend application via browser automation.
 *
 * Separate from QA API tests which test backend APIs directly.
 */

import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

// Frontend URL configuration
const environments = {
  dev: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    apiURL: process.env.BACKEND_V2_URL || 'http://localhost:3000',
    timeout: 30000,
  },
  staging: {
    baseURL: process.env.FRONTEND_URL || 'https://v2-staging.mereka.io',
    apiURL: process.env.BACKEND_V2_URL || 'https://api-staging.mereka.io',
    timeout: 30000,
  },
  production: {
    baseURL: process.env.FRONTEND_URL || 'https://v2.mereka.dev',
    apiURL: process.env.BACKEND_V2_URL || 'https://api.mereka.dev',
    timeout: 30000,
  },
};

// Default to production environment for consistent test results
const ENV = process.env.TEST_ENV || 'production';
const envConfig = environments[ENV as keyof typeof environments] || environments.production;

// Generate timestamped report folder
// Use a single timestamp generated once to ensure all workers write to the same report
const getReportTimestamp = () => {
  // If REPORT_TIMESTAMP is set, use it (for consistency across workers)
  if (process.env.REPORT_TIMESTAMP) {
    return process.env.REPORT_TIMESTAMP;
  }
  // Otherwise generate a new timestamp
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
};

const timestamp = getReportTimestamp();
const reportFolder =
  process.env.TIMESTAMPED_REPORTS === 'false'
    ? '../../artifacts/playwright-report-e2e'
    : `../../artifacts/playwright-report-e2e-${timestamp}`;
const markdownReporter = path.resolve(__dirname, './reporters/e2e-md-reporter.js');
const markdownReportOptions = {
  projectRoot: path.resolve(__dirname, '..', '..'),
  outputDir: path.resolve(__dirname, '../../docs/testing'),
};
const bddFeaturesDir = path.resolve(__dirname, '../specs/bdd/features');
const bddCucumberConfig = path.resolve(__dirname, '../specs/bdd/config/cucumber.config.ts');

console.log(`🚀 Running E2E tests against: ${ENV.toUpperCase()} environment (${envConfig.baseURL})`);
console.log(`📊 Reports will be saved to: ${reportFolder}`);

export default defineConfig({
  testDir: './tests', // Look for tests in the 'tests' directory
  metadata: {
    bddFeaturesDir,
    bddCucumberConfig,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  // Global setup: Authenticate once and save state for reuse
  globalSetup: './global-setup.ts',
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: reportFolder }],
        ['junit', { outputFile: '../../artifacts/test-results/junit-e2e.xml' }],
        [markdownReporter, markdownReportOptions],
        ['list'],
      ]
    : [
        [
          'html',
          {
            open: (process.env.OPEN_REPORT as 'always' | 'never' | 'on-failure') || 'never',
            outputFolder: reportFolder,
          },
        ],
        ['junit', { outputFile: '../../artifacts/test-results/junit-e2e.xml' }],
        ['json', { outputFile: '../../artifacts/test-results/test-results-e2e.json' }],
        [markdownReporter, markdownReportOptions],
        ['list'],
      ],
  timeout: envConfig.timeout,
  use: {
    baseURL: envConfig.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    // Viewport settings
    viewport: { width: 1920, height: 1080 },
    // Use saved authentication state (saves ~20 seconds per test)
    storageState: './.auth/user.json',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  globalTimeout: 600000, // 10 minutes
});
