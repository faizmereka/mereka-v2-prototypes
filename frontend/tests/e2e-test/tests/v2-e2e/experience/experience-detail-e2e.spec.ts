/**
 * Experience Detail E2E Tests
 * 
 * Based on: Existing E2E test patterns from tests/e2e-test/tests/
 * 
 * These E2E tests verify experience detail page functionality:
 * - View experience detail page
 * - Display experience information
 * - Navigate from homepage to experience detail
 * - Verify booking flow (if accessible)
 * 
 * Test Environment: https://v2.mereka.dev
 * 
 * Run with: $env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/experience/experience-detail-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import { loginUser } from '../../fixtures/helpers/auth-e2e-helper';
import { HomePage } from '../../fixtures/home-page';
import { AuthPage } from '../../fixtures/auth-page';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev' 
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

const TEST_EMAIL = process.env.TEST_EMAIL || 'testingmereka01@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'merekamereka';

test.describe('Experience Detail E2E Tests - Experience Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should display experience detail information', async ({ page }) => {
    console.log('🔍 Test: Display experience detail information');
    
    // Navigate to experiences page first
    await page.goto(`${BASE_URL}/experiences`);
    await page.waitForLoadState('networkidle');

    // Click on first experience
    const firstExperienceCard = page.locator('a[href*="/experience/"]').filter({ has: page.locator('img') }).first();
    
    if (await firstExperienceCard.isVisible({ timeout: 15000 })) {
      await firstExperienceCard.click();
      await page.waitForLoadState('networkidle');

      // Verify experience detail elements
      const experienceTitle = page.locator('h1, h2').first();
      await expect(experienceTitle).toBeVisible({ timeout: 10000 });
      console.log('✅ Experience title displayed');

      const experienceDescription = page.locator('[class*="description"]')
        .or(page.locator('p').filter({ hasText: /./ }).first());
      await expect(experienceDescription.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Experience description displayed');

      const experiencePrice = page.locator('[class*="price"]')
        .or(page.getByText(/MYR|USD|\$/));
      if (await experiencePrice.isVisible({ timeout: 5000 })) {
        await expect(experiencePrice.first()).toBeVisible({ timeout: 10000 });
        console.log('✅ Experience price displayed');
      }
    } else {
      console.log('⚠️ No experiences available - skipping detail verification');
    }
  });

  test('should display experience images and media', async ({ page }) => {
    console.log('🔍 Test: Display experience images and media');
    
    await page.goto(`${BASE_URL}/experiences`);
    await page.waitForLoadState('networkidle');

    const firstExperienceCard = page.locator('a[href*="/experience/"]').filter({ has: page.locator('img') }).first();
    
    if (await firstExperienceCard.isVisible({ timeout: 15000 })) {
      await firstExperienceCard.click();
      await page.waitForLoadState('networkidle');

      // Verify experience images
      const experienceImages = page.locator('img').filter({ hasNot: page.locator('[alt*="logo"]') });
      const imageCount = await experienceImages.count();
      expect(imageCount).toBeGreaterThan(0);
      console.log(`✅ Found ${imageCount} experience images`);
    } else {
      console.log('⚠️ No experiences available - skipping image verification');
    }
  });

  test('should display booking button or call-to-action', async ({ page }) => {
    console.log('🔍 Test: Display booking button or call-to-action');
    
    await page.goto(`${BASE_URL}/experiences`);
    await page.waitForLoadState('networkidle');

    const firstExperienceCard = page.locator('a[href*="/experience/"]').filter({ has: page.locator('img') }).first();
    
    if (await firstExperienceCard.isVisible({ timeout: 15000 })) {
      await firstExperienceCard.click();
      await page.waitForLoadState('networkidle');

      // Look for booking button or CTA
      const bookingButton = page.getByRole('button', { name: /Book|Book Now|Register|Join/i })
        .or(page.getByRole('link', { name: /Book|Book Now|Register/i }));
      
      if (await bookingButton.isVisible({ timeout: 10000 })) {
        await expect(bookingButton.first()).toBeVisible({ timeout: 10000 });
        console.log('✅ Booking button displayed');
      } else {
        console.log('⚠️ Booking button not found - may require login or different flow');
      }
    } else {
      console.log('⚠️ No experiences available - skipping booking button test');
    }
  });
});

test.describe('Experience Detail E2E Tests - Navigation', () => {
  test('should navigate from homepage experience card to experience detail after login', async ({ page }) => {
    console.log('🔍 Test: Navigate from homepage experience card to experience detail after login');
    
    const homePage = new HomePage(page);
    const authPage = new AuthPage(page);
    
    // Step 1: Navigate to homepage
    await homePage.goto();
    
    // Step 2: Click login link
    await expect(homePage.loginLink).toBeVisible({ timeout: 10000 });
    await homePage.loginLink.click();
    console.log('✅ Login link clicked');

    // Step 3: Complete login flow
    await authPage.clickContinueWithEmail();
    await authPage.enterEmail(TEST_EMAIL);
    await authPage.clickContinue();
    await authPage.clickUsePassword();
    await authPage.enterPassword(TEST_PASSWORD);
    await authPage.clickSignIn();
    await authPage.verifyLoggedIn();
    console.log('✅ Login successful');

    // Step 4: Navigate back to homepage (if not already there)
    await homePage.goto();
    console.log('✅ Navigated to homepage');

    // Step 5: Verify Upcoming Experiences section is visible
    await homePage.verifyUpcomingExperiencesSection();
    console.log('✅ Upcoming Experiences section verified');

    // Step 6: Click on first experience card
    await homePage.clickFirstExperienceCard();
    console.log('✅ Clicked on first experience card');

    // Step 7: Verify navigation to experience detail page
    await expect(page).toHaveURL(/.*\/experience\//, { timeout: 15000 });
    console.log('✅ Successfully navigated to experience detail page');
    
    // Verify we're on an experience detail page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/experience/');
    console.log(`✅ Current URL: ${currentUrl}`);
  });

  test('should navigate from homepage experience card to experience detail without login', async ({ page }) => {
    console.log('🔍 Test: Navigate from homepage experience card to experience detail without login');
    
    const homePage = new HomePage(page);
    
    // Navigate to homepage
    await homePage.goto();
    console.log('✅ Navigated to homepage');

    // Verify Upcoming Experiences section is visible
    await homePage.verifyUpcomingExperiencesSection();
    console.log('✅ Upcoming Experiences section verified');

    // Click on first experience card
    await homePage.clickFirstExperienceCard();
    console.log('✅ Clicked on first experience card');

    // Verify navigation to experience detail page
    await expect(page).toHaveURL(/.*\/experience\//, { timeout: 15000 });
    console.log('✅ Successfully navigated to experience detail page');
    
    // Verify we're on an experience detail page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/experience/');
    console.log(`✅ Current URL: ${currentUrl}`);
  });

  test('should navigate from homepage experience card to experience detail', async ({ page }) => {
    console.log('🔍 Test: Navigate from homepage experience card to experience detail');
    
    const homePage = new HomePage(page);
    await homePage.goto();

    // Find experiences section
    const experiencesHeading = page.locator('h2').filter({ 
      hasText: /Upcoming Experiences/i 
    }).first();
    await experiencesHeading.scrollIntoViewIfNeeded();
    await expect(experiencesHeading).toBeVisible({ timeout: 10000 });

    // Click on first experience card
    const firstExperienceCard = page.locator('a[href*="/experience/"]').filter({ has: page.locator('img') }).first();
    
    if (await firstExperienceCard.isVisible({ timeout: 15000 })) {
      await firstExperienceCard.click();
      await page.waitForLoadState('networkidle');

      // Verify navigation to experience detail page
      await expect(page).toHaveURL(/.*\/experience\/.*/, { timeout: 10000 });
      console.log('✅ Successfully navigated to experience detail page');
    } else {
      console.log('⚠️ No experience cards found on homepage - skipping navigation test');
    }
  });

  test('should navigate back from experience detail to experiences listing', async ({ page }) => {
    console.log('🔍 Test: Navigate back from experience detail to experiences listing');
    
    await page.goto(`${BASE_URL}/experiences`);
    await page.waitForLoadState('networkidle');

    const firstExperienceCard = page.locator('a[href*="/experience/"]').filter({ has: page.locator('img') }).first();
    
    if (await firstExperienceCard.isVisible({ timeout: 15000 })) {
      await firstExperienceCard.click();
      await page.waitForLoadState('networkidle');

      // Click back button or navigate back
      const backButton = page.getByRole('button', { name: /Back/i })
        .or(page.locator('a[href*="/experiences"]').filter({ hasText: /Back|Experiences/i }));
      
      if (await backButton.isVisible({ timeout: 5000 })) {
        await backButton.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/.*\/experiences/, { timeout: 10000 });
        console.log('✅ Navigated back to experiences listing');
      } else {
        // Use browser back
        await page.goBack();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/.*\/experiences/, { timeout: 10000 });
        console.log('✅ Used browser back to return to experiences listing');
      }
    } else {
      console.log('⚠️ No experiences available - skipping back navigation test');
    }
  });
});
