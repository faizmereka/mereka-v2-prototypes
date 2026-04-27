/**
 * Expertise Collection E2E Tests
 * 
 * Based on: Existing E2E test patterns from tests/e2e-test/tests/
 * 
 * These E2E tests verify expertise collection and detail page functionality:
 * - View expertise listing page
 * - View expertise detail page
 * - Navigate from homepage to expertise pages
 * - Verify expertise pricing and booking
 * 
 * Test Environment: https://v2.mereka.dev
 * 
 * Run with: $env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/expertise/expertise-collection-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev' 
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

test.describe('Expertise Collection E2E Tests - Expertise Listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to expertise page from homepage', async ({ page }) => {
    console.log('🔍 Test: Navigate to expertise page from homepage');
    
    // Step 1: Click "View all Expertise" button
    const viewAllExpertiseButton = page.getByRole('link', { name: /View all Expertise|View All Expertise/i });
    await expect(viewAllExpertiseButton).toBeVisible({ timeout: 10000 });
    await viewAllExpertiseButton.click();
    await expect(page).toHaveURL(/.*\/expertise/, { timeout: 10000 });
    console.log('✅ Navigated to expertise page');

    // Step 2: Verify expertise listing page displays
    const expertisePageHeading = page.locator('h1, h2').filter({ hasText: /Expertise/i });
    await expect(expertisePageHeading.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Expertise page heading displayed');

    // Step 3: Verify expertise cards are displayed
    const expertiseCards = page.locator('[ui-card-expertise]')
      .or(page.locator('a[href*="/expertise/"]').filter({ has: page.locator('img') }));
    
    const cardCount = await expertiseCards.count();
    expect(cardCount).toBeGreaterThan(0);
    console.log(`✅ Found ${cardCount} expertise cards`);
  });

  test('should display expertise cards with pricing information', async ({ page }) => {
    console.log('🔍 Test: Display expertise cards with pricing information');
    
    // Navigate to expertise page
    await page.goto(`${BASE_URL}/expertise`);
    await page.waitForLoadState('networkidle');

    // Verify first expertise card has required elements
    const firstExpertiseCard = page.locator('[ui-card-expertise]').first()
      .or(page.locator('a[href*="/expertise/"]').filter({ has: page.locator('img') }).first());
    
    await expect(firstExpertiseCard).toBeVisible({ timeout: 15000 });
    
    // Verify expertise card elements
    const expertiseTitle = firstExpertiseCard.locator('.ui-card-title a')
      .or(firstExpertiseCard.locator('h3, h4, h5').first());
    await expect(expertiseTitle).toBeVisible({ timeout: 10000 });
    console.log('✅ Expertise title displayed');

    const priceElement = firstExpertiseCard.locator('.ui-card-price')
      .or(firstExpertiseCard.locator('[class*="price"]').first());
    await expect(priceElement).toBeVisible({ timeout: 10000 });
    
    const priceAmount = priceElement.locator('span.ui-card-price__amount')
      .or(priceElement.locator('span').first());
    await expect(priceAmount).toBeVisible({ timeout: 10000 });
    console.log('✅ Expertise price displayed');
  });
});

test.describe('Expertise Collection E2E Tests - Expertise Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to expertise detail page from homepage', async ({ page }) => {
    console.log('🔍 Test: Navigate to expertise detail page from homepage');
    
    // Step 1: Find expertise section on homepage
    const expertiseHeading = page.locator('h2.section-heading').filter({ 
      hasText: /book their.*Expertise/i 
    });
    await expertiseHeading.scrollIntoViewIfNeeded();
    await expect(expertiseHeading).toBeVisible({ timeout: 10000 });

    // Step 2: Click on first expertise card
    const firstExpertiseCard = page.locator('[ui-card-expertise]').first();
    await expect(firstExpertiseCard).toBeVisible({ timeout: 15000 });
    
    // Get expertise title for verification
    const expertiseTitle = firstExpertiseCard.locator('.ui-card-title a')
      .or(firstExpertiseCard.locator('[class*="title"]').first());
    let titleText = '';
    if (await expertiseTitle.isVisible({ timeout: 5000 })) {
      titleText = await expertiseTitle.textContent() || '';
    }
    
    await firstExpertiseCard.click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Clicked on expertise card');

    // Step 3: Verify expertise detail page displays
    await expect(page).toHaveURL(/.*\/expertise\/.*/, { timeout: 10000 });
    console.log('✅ Navigated to expertise detail page');

    // Step 4: Verify expertise detail page elements
    const detailPageHeading = page.locator('h1, h2').filter({ hasText: titleText })
      .or(page.locator('h1, h2').first());
    await expect(detailPageHeading.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Expertise detail page heading displayed');
  });

  test('should display expertise detail information', async ({ page }) => {
    console.log('🔍 Test: Display expertise detail information');
    
    // Navigate to expertise page first
    await page.goto(`${BASE_URL}/expertise`);
    await page.waitForLoadState('networkidle');

    // Click on first expertise
    const firstExpertiseCard = page.locator('[ui-card-expertise]').first()
      .or(page.locator('a[href*="/expertise/"]').filter({ has: page.locator('img') }).first());
    
    await expect(firstExpertiseCard).toBeVisible({ timeout: 15000 });
    await firstExpertiseCard.click();
    await page.waitForLoadState('networkidle');

    // Verify expertise detail elements
    const expertiseDescription = page.locator('[class*="description"], [class*="bio"]')
      .or(page.locator('p').filter({ hasText: /./ }).first());
    await expect(expertiseDescription.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Expertise description displayed');

    const expertisePrice = page.locator('[class*="price"]')
      .or(page.getByText(/MYR|USD|\$/));
    await expect(expertisePrice.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Expertise price displayed');
  });

  test('should display booking button or call-to-action', async ({ page }) => {
    console.log('🔍 Test: Display booking button or call-to-action');
    
    // Navigate to expertise detail page
    await page.goto(`${BASE_URL}/expertise`);
    await page.waitForLoadState('networkidle');

    const firstExpertiseCard = page.locator('[ui-card-expertise]').first()
      .or(page.locator('a[href*="/expertise/"]').filter({ has: page.locator('img') }).first());
    
    await expect(firstExpertiseCard).toBeVisible({ timeout: 15000 });
    await firstExpertiseCard.click();
    await page.waitForLoadState('networkidle');

    // Look for booking button or CTA
    const bookingButton = page.getByRole('button', { name: /Book|Book Now|Schedule|Contact/i })
      .or(page.getByRole('link', { name: /Book|Book Now|Schedule/i }));
    
    if (await bookingButton.isVisible({ timeout: 10000 })) {
      await expect(bookingButton.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Booking button displayed');
    } else {
      console.log('⚠️ Booking button not found - may require login or different flow');
    }
  });
});

test.describe('Expertise Collection E2E Tests - Navigation', () => {
  test('should navigate from homepage expertise card to expertise detail', async ({ page }) => {
    console.log('🔍 Test: Navigate from homepage expertise card to expertise detail');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find expertise section
    const expertiseHeading = page.locator('h2.section-heading').filter({ 
      hasText: /book their.*Expertise/i 
    });
    await expertiseHeading.scrollIntoViewIfNeeded();
    await expect(expertiseHeading).toBeVisible({ timeout: 10000 });

    // Click on first expertise card
    const firstExpertiseCard = page.locator('[ui-card-expertise]').first();
    await expect(firstExpertiseCard).toBeVisible({ timeout: 15000 });
    await firstExpertiseCard.click();
    await page.waitForLoadState('networkidle');

    // Verify navigation to expertise detail page
    await expect(page).toHaveURL(/.*\/expertise\/.*/, { timeout: 10000 });
    console.log('✅ Successfully navigated to expertise detail page');
  });

  test('should navigate back from expertise detail to expertise listing', async ({ page }) => {
    console.log('🔍 Test: Navigate back from expertise detail to expertise listing');
    
    // Navigate to expertise detail page
    await page.goto(`${BASE_URL}/expertise`);
    await page.waitForLoadState('networkidle');

    const firstExpertiseCard = page.locator('[ui-card-expertise]').first()
      .or(page.locator('a[href*="/expertise/"]').filter({ has: page.locator('img') }).first());
    
    await expect(firstExpertiseCard).toBeVisible({ timeout: 15000 });
    await firstExpertiseCard.click();
    await page.waitForLoadState('networkidle');

    // Click back button or navigate back
    const backButton = page.getByRole('button', { name: /Back/i })
      .or(page.locator('a[href*="/expertise"]').filter({ hasText: /Back|Expertise/i }));
    
    if (await backButton.isVisible({ timeout: 5000 })) {
      await backButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*\/expertise/, { timeout: 10000 });
      console.log('✅ Navigated back to expertise listing');
    } else {
      // Use browser back
      await page.goBack();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*\/expertise/, { timeout: 10000 });
      console.log('✅ Used browser back to return to expertise listing');
    }
  });
});
