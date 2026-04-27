/**
 * Navigation Flow E2E Tests
 * 
 * Based on: Existing E2E test patterns from tests/e2e-test/tests/
 * 
 * These E2E tests verify comprehensive navigation flows:
 * - Cross-page navigation
 * - Breadcrumb navigation
 * - Menu navigation
 * - Search navigation
 * 
 * Test Environment: https://v2.mereka.dev
 * 
 * Run with: $env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/navigation/navigation-flow-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev' 
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

test.describe('Navigation Flow E2E Tests - Cross-Page Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate from homepage to all main sections', async ({ page }) => {
    console.log('🔍 Test: Navigate from homepage to all main sections');
    
    // Navigate to Experts
    const expertsLink = page.getByRole('link', { name: /View all Experts/i });
    if (await expertsLink.isVisible({ timeout: 5000 })) {
      await expertsLink.click();
      await expect(page).toHaveURL(/.*\/experts/, { timeout: 10000 });
      console.log('✅ Navigated to Experts');
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to Expertise
    const expertiseLink = page.getByRole('link', { name: /View all Expertise/i });
    if (await expertiseLink.isVisible({ timeout: 5000 })) {
      await expertiseLink.click();
      await expect(page).toHaveURL(/.*\/expertise/, { timeout: 10000 });
      console.log('✅ Navigated to Expertise');
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to Experiences
    const experiencesLink = page.getByRole('link', { name: /View all Experiences/i });
    if (await experiencesLink.isVisible({ timeout: 5000 })) {
      await experiencesLink.click();
      await expect(page).toHaveURL(/.*\/experiences/, { timeout: 10000 });
      console.log('✅ Navigated to Experiences');
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to Jobs
    const jobsLink = page.getByRole('link', { name: /View all Jobs/i });
    if (await jobsLink.isVisible({ timeout: 5000 })) {
      await jobsLink.click();
      await expect(page).toHaveURL(/.*\/jobs/, { timeout: 10000 });
      console.log('✅ Navigated to Jobs');
    }
  });

  test('should navigate using main navigation menu', async ({ page }) => {
    console.log('🔍 Test: Navigate using main navigation menu');
    
    // Look for main navigation menu
    const navMenu = page.locator('nav').first()
      .or(page.locator('[class*="navbar"], [class*="navigation"]').first());
    
    if (await navMenu.isVisible({ timeout: 5000 })) {
      // Look for menu items
      const menuItems = navMenu.locator('a[href*="/experts"], a[href*="/expertise"], a[href*="/experiences"], a[href*="/jobs"]');
      const itemCount = await menuItems.count();
      
      if (itemCount > 0) {
        // Click first menu item
        await menuItems.first().click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Navigated via main menu');
      } else {
        console.log('⚠️ Menu items not found in expected format');
      }
    } else {
      console.log('⚠️ Main navigation menu not found');
    }
  });
});

test.describe('Navigation Flow E2E Tests - Search Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to search results page', async ({ page }) => {
    console.log('🔍 Test: Navigate to search results page');
    
    // Find search input
    const searchInput = page.locator('input[type="search"]')
      .or(page.locator('input[placeholder*="Search"]'))
      .or(page.locator('[class*="search"] input'));
    
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test');
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');
      
      // Should navigate to search results
      await expect(page).toHaveURL(/.*\/search/, { timeout: 10000 });
      console.log('✅ Navigated to search results page');
    } else {
      console.log('⚠️ Search input not found');
    }
  });

  test('should navigate from search results to detail pages', async ({ page }) => {
    console.log('🔍 Test: Navigate from search results to detail pages');
    
    // Navigate to search results
    await page.goto(`${BASE_URL}/search?q=test`);
    await page.waitForLoadState('networkidle');

    // Look for result cards
    const resultCards = page.locator('a[href*="/experts/"], a[href*="/expertise/"], a[href*="/experience/"]').first();
    
    if (await resultCards.isVisible({ timeout: 10000 })) {
      await resultCards.click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/.*\/(experts|expertise|experience)\/.*/, { timeout: 10000 });
      console.log('✅ Navigated from search results to detail page');
    } else {
      console.log('⚠️ No search results found');
    }
  });
});

test.describe('Navigation Flow E2E Tests - Breadcrumb Navigation', () => {
  test('should navigate using breadcrumbs', async ({ page }) => {
    console.log('🔍 Test: Navigate using breadcrumbs');
    
    // Navigate to a detail page
    await page.goto(`${BASE_URL}/experts`);
    await page.waitForLoadState('networkidle');

    const firstExpertCard = page.locator('a[href*="/experts/"]').filter({ has: page.locator('img') }).first();
    
    if (await firstExpertCard.isVisible({ timeout: 15000 })) {
      await firstExpertCard.click();
      await page.waitForLoadState('networkidle');

      // Look for breadcrumbs
      const breadcrumbs = page.locator('[class*="breadcrumb"]')
        .or(page.locator('nav[aria-label*="breadcrumb"]'));
      
      if (await breadcrumbs.isVisible({ timeout: 5000 })) {
        // Click on breadcrumb link
        const breadcrumbLink = breadcrumbs.locator('a').first();
        if (await breadcrumbLink.isVisible({ timeout: 5000 })) {
          await breadcrumbLink.click();
          await page.waitForLoadState('networkidle');
          console.log('✅ Navigated using breadcrumbs');
        }
      } else {
        console.log('⚠️ Breadcrumbs not found');
      }
    } else {
      console.log('⚠️ No expert cards found - skipping breadcrumb test');
    }
  });
});
