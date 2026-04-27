/**
 * Global Setup for Playwright E2E Tests
 * 
 * This script runs once before all tests to authenticate and save the authentication state.
 * The saved state is then reused across all tests, eliminating the need to login for each test.
 * 
 * This saves ~20 seconds per test run.
 */

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { loginUser } from './fixtures/helpers/auth-e2e-helper';

async function globalSetup(config: FullConfig) {
  // Determine the app URL (where tests will run)
  // This should match the APP_URL used in test files
  const TEST_ENV = process.env.TEST_ENV || 'production';
  const APP_URL = TEST_ENV === 'live' || TEST_ENV === 'production'
    ? 'https://v2.app.mereka.dev'
    : TEST_ENV === 'staging'
    ? 'https://v2-staging.app.mereka.io'
    : 'https://v2.app.mereka.dev';

  // Ensure .auth directory exists
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const authFile = path.join(authDir, 'user.json');

  console.log('🔐 Authenticating user for storageState...');
  console.log(`🌐 App URL: ${APP_URL}`);
  console.log(`📁 Auth file will be saved to: ${authFile}`);
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login using the helper function (it will navigate to v2.mereka.dev and authenticate)
    // The authentication state will be shared across subdomains (v2.mereka.dev and v2.app.mereka.dev)
    await loginUser(page);
    
    // Verify we're authenticated by checking if we can access the app
    // Navigate to app URL to ensure cookies/storage are set for the correct domain
    await page.goto(`${APP_URL}/hub/overview`);
    await page.waitForLoadState('networkidle');
    
    // Check if we're authenticated (look for user profile indicators)
    const isAuthenticated = await page.locator('[class*="profile"], [class*="user"], [class*="menu"], [class*="avatar"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    
    if (!isAuthenticated) {
      throw new Error('Authentication verification failed - user profile indicators not found');
    }
    
    // Save authentication state
    await context.storageState({ path: authFile });
    
    console.log('✅ Authentication state saved successfully');
    console.log(`📁 Saved to: ${authFile}`);
  } catch (error) {
    console.error('❌ Failed to authenticate:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
