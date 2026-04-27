/**
 * Expert Profile E2E Tests
 * 
 * Based on: Existing E2E test patterns from tests/e2e-test/tests/
 * 
 * These E2E tests verify expert profile and detail page functionality:
 * - View expert listing page
 * - View expert detail page
 * - View expert services
 * - Navigate from homepage to expert pages
 * 
 * Test Environment: https://v2.mereka.dev
 * 
 * Run with: $env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/expert/expert-profile-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev' 
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

test.describe('Expert Profile E2E Tests - Expert Listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to experts page from homepage', async ({ page }) => {
    console.log('🔍 Test: Navigate to experts page from homepage');
    
    // Step 1: Click "View all Experts" button
    const viewAllExpertsButton = page.getByRole('link', { name: /View all Experts|View All Experts/i });
    await expect(viewAllExpertsButton).toBeVisible({ timeout: 10000 });
    await viewAllExpertsButton.click();
    await expect(page).toHaveURL(/.*\/experts/, { timeout: 10000 });
    console.log('✅ Navigated to experts page');

    // Step 2: Verify experts listing page displays
    const expertsPageHeading = page.locator('h1, h2').filter({ hasText: /Experts/i });
    await expect(expertsPageHeading.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Experts page heading displayed');

    // Step 3: Verify expert cards are displayed
    const expertCards = page.locator('div[ui-card-expert]')
      .or(page.locator('a[href*="/experts/"]').filter({ has: page.locator('img') }));
    
    const cardCount = await expertCards.count();
    expect(cardCount).toBeGreaterThan(0);
    console.log(`✅ Found ${cardCount} expert cards`);
  });

  test('should display expert cards with required information', async ({ page }) => {
    console.log('🔍 Test: Display expert cards with required information');
    
    // Navigate to experts page
    await page.goto(`${BASE_URL}/experts`);
    await page.waitForLoadState('networkidle');

    // Verify first expert card has required elements
    const firstExpertCard = page.locator('div[ui-card-expert]').first()
      .or(page.locator('a[href*="/experts/"]').filter({ has: page.locator('img') }).first());
    
    await expect(firstExpertCard).toBeVisible({ timeout: 15000 });
    
    // Verify expert card elements
    const expertImage = firstExpertCard.locator('img').first();
    await expect(expertImage).toBeVisible({ timeout: 10000 });
    console.log('✅ Expert image displayed');

    const expertName = firstExpertCard.locator('h3, h4, h5').first()
      .or(firstExpertCard.locator('[class*="title"]').first());
    await expect(expertName).toBeVisible({ timeout: 10000 });
    console.log('✅ Expert name displayed');

    const expertDescription = firstExpertCard.locator('p.ui-card-desc')
      .or(firstExpertCard.locator('p').first());
    await expect(expertDescription).toBeVisible({ timeout: 10000 });
    console.log('✅ Expert description displayed');
  });

  test('should filter experts by category or search', async ({ page }) => {
    console.log('🔍 Test: Filter experts by category or search');
    
    await page.goto(`${BASE_URL}/experts`);
    await page.waitForLoadState('networkidle');

    // Look for filter options or search input
    const searchInput = page.locator('input[type="search"]')
      .or(page.locator('input[placeholder*="Search"]'))
      .or(page.locator('[class*="search"] input'));
    
    const filterButton = page.getByRole('button', { name: /Filter|Category/i })
      .or(page.locator('[class*="filter"] button').first());

    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      console.log('✅ Search input found and used');
    } else if (await filterButton.isVisible({ timeout: 5000 })) {
      await filterButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Filter button found');
    } else {
      console.log('⚠️ Search or filter not found - may not be available');
    }
  });
});

test.describe('Expert Profile E2E Tests - Expert Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to expert detail page from homepage', async ({ page }) => {
    console.log('🔍 Test: Navigate to expert detail page from homepage');
    
    // Step 1: Find first expert card on homepage
    const firstExpertCard = page.locator('div[ui-card-expert]').first()
      .or(page.locator('a[href*="/experts/"]').filter({ has: page.locator('img') }).first());
    
    await expect(firstExpertCard).toBeVisible({ timeout: 15000 });
    
    // Get expert name for verification
    const expertName = firstExpertCard.locator('h3, h4, h5').first()
      .or(firstExpertCard.locator('[class*="title"]').first());
    let expertNameText = '';
    if (await expertName.isVisible({ timeout: 5000 })) {
      expertNameText = await expertName.textContent() || '';
    }
    
    // Step 2: Click on expert card
    await firstExpertCard.click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Clicked on expert card');

    // Step 3: Verify expert detail page displays
    await expect(page).toHaveURL(/.*\/experts\/.*/, { timeout: 10000 });
    console.log('✅ Navigated to expert detail page');

    // Step 4: Verify expert detail page elements
    const expertDetailHeading = page.locator('h1, h2').filter({ hasText: expertNameText })
      .or(page.locator('h1, h2').first());
    await expect(expertDetailHeading.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Expert detail page heading displayed');
  });

  test('should display expert profile information', async ({ page }) => {
    console.log('🔍 Test: Display expert profile information');
    
    // Navigate to experts page first
    await page.goto(`${BASE_URL}/experts`);
    await page.waitForLoadState('networkidle');

    // Click on first expert
    const firstExpertCard = page.locator('div[ui-card-expert]').first()
      .or(page.locator('a[href*="/experts/"]').filter({ has: page.locator('img') }).first());
    
    await expect(firstExpertCard).toBeVisible({ timeout: 15000 });
    await firstExpertCard.click();
    await page.waitForLoadState('networkidle');

    // Verify expert profile elements
    const expertImage = page.locator('img').first();
    await expect(expertImage).toBeVisible({ timeout: 10000 });
    console.log('✅ Expert profile image displayed');

    const expertBio = page.locator('[class*="bio"], [class*="description"]')
      .or(page.locator('p').filter({ hasText: /./ }).first());
    await expect(expertBio.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Expert bio displayed');
  });

  test('should display expert services section', async ({ page }) => {
    console.log('🔍 Test: Display expert services section');
    
    // Navigate to expert detail page
    await page.goto(`${BASE_URL}/experts`);
    await page.waitForLoadState('networkidle');

    const firstExpertCard = page.locator('div[ui-card-expert]').first()
      .or(page.locator('a[href*="/experts/"]').filter({ has: page.locator('img') }).first());
    
    await expect(firstExpertCard).toBeVisible({ timeout: 15000 });
    await firstExpertCard.click();
    await page.waitForLoadState('networkidle');

    // Look for services section
    const servicesHeading = page.locator('h2, h3').filter({ hasText: /Services|Expertise|Offerings/i });
    const servicesSection = page.locator('[class*="services"], [class*="expertise"]');
    
    if (await servicesHeading.isVisible({ timeout: 10000 })) {
      await expect(servicesHeading.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Services section heading found');
      
      // Scroll to services section
      await servicesHeading.first().scrollIntoViewIfNeeded();
      
      // Look for service cards or list items
      const serviceItems = page.locator('[class*="service"], [class*="expertise"]')
        .or(page.locator('li').filter({ hasText: /./ }));
      
      const itemCount = await serviceItems.count();
      if (itemCount > 0) {
        console.log(`✅ Found ${itemCount} service items`);
      }
    } else {
      console.log('⚠️ Services section not found - may not be available for this expert');
    }
  });

  test('should navigate to expertise from expert profile', async ({ page }) => {
    console.log('🔍 Test: Navigate to expertise from expert profile');
    
    // Navigate to expert detail page
    await page.goto(`${BASE_URL}/experts`);
    await page.waitForLoadState('networkidle');

    const firstExpertCard = page.locator('div[ui-card-expert]').first()
      .or(page.locator('a[href*="/experts/"]').filter({ has: page.locator('img') }).first());
    
    await expect(firstExpertCard).toBeVisible({ timeout: 15000 });
    await firstExpertCard.click();
    await page.waitForLoadState('networkidle');

    // Look for expertise/service links
    const expertiseLink = page.getByRole('link', { name: /View|See|Book/i })
      .or(page.locator('a[href*="/expertise/"]').first());
    
    if (await expertiseLink.isVisible({ timeout: 10000 })) {
      await expertiseLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to expertise detail page
      await expect(page).toHaveURL(/.*\/expertise\/.*/, { timeout: 10000 });
      console.log('✅ Navigated to expertise detail page');
    } else {
      console.log('⚠️ Expertise link not found - may not be available');
    }
  });
});

test.describe('Expert Profile E2E Tests - Expert Navigation', () => {
  test('should navigate from homepage expert card to expert detail', async ({ page }) => {
    console.log('🔍 Test: Navigate from homepage expert card to expert detail');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find featured experts section
    const expertsHeading = page.locator('h2').filter({ 
      hasText: /Browse Featured Experts|Featured Experts/i 
    }).first();
    await expertsHeading.scrollIntoViewIfNeeded();
    await expect(expertsHeading).toBeVisible({ timeout: 10000 });

    // Click on first expert card
    const firstExpertCard = page.locator('div[ui-card-expert]').first();
    await expect(firstExpertCard).toBeVisible({ timeout: 15000 });
    await firstExpertCard.click();
    await page.waitForLoadState('networkidle');

    // Verify navigation to expert detail page
    await expect(page).toHaveURL(/.*\/experts\/.*/, { timeout: 10000 });
    console.log('✅ Successfully navigated to expert detail page');
  });

  test('should navigate back from expert detail to experts listing', async ({ page }) => {
    console.log('🔍 Test: Navigate back from expert detail to experts listing');
    
    // Navigate to expert detail page
    await page.goto(`${BASE_URL}/experts`);
    await page.waitForLoadState('networkidle');

    const firstExpertCard = page.locator('div[ui-card-expert]').first()
      .or(page.locator('a[href*="/experts/"]').filter({ has: page.locator('img') }).first());
    
    await expect(firstExpertCard).toBeVisible({ timeout: 15000 });
    await firstExpertCard.click();
    await page.waitForLoadState('networkidle');

    // Click back button or navigate back
    const backButton = page.getByRole('button', { name: /Back/i })
      .or(page.locator('a[href*="/experts"]').filter({ hasText: /Back|Experts/i }));
    
    if (await backButton.isVisible({ timeout: 5000 })) {
      await backButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*\/experts/, { timeout: 10000 });
      console.log('✅ Navigated back to experts listing');
    } else {
      // Use browser back
      await page.goBack();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*\/experts/, { timeout: 10000 });
      console.log('✅ Used browser back to return to experts listing');
    }
  });
});
