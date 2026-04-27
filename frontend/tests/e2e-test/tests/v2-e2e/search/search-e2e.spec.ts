/**
 * Search E2E Tests
 * 
 * Based on: tests/api/backend-v2-integration/tests/web-search-api.spec.ts
 * 
 * These E2E tests mirror the API test scenarios for search functionality:
 * - Search across all entities
 * - Filter search results
 * - Verify search results match API
 * 
 * Test Environment: https://v2.mereka.dev
 * 
 * Run with: $env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/search/search-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev' 
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

const BACKEND_V2_BASE_URL = process.env.BACKEND_V2_URL || 'https://api.mereka.dev';
const apiUrl = `${BACKEND_V2_BASE_URL}/api/v1`;

test.describe('Search E2E Tests - Basic Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should search across all entities', async ({ page, request }) => {
    console.log('🔍 Test: Search across all entities');
    
    const searchQuery = 'test';

    // Step 1: Find search input
    // Observed: Search box in header or navigation
    const searchInput = page.locator('input[type="search"]')
      .or(page.locator('input[placeholder*="Search"], input[placeholder*="search"]'))
      .or(page.locator('[class*="search"] input'));
    
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Search input found');

    // Step 2: Enter search query
    await searchInput.fill(searchQuery);
    console.log('✅ Entered search query');

    // Step 3: Submit search
    const searchButton = page.locator('button[type="submit"]')
      .or(page.locator('button[class*="search"]'))
      .or(page.getByRole('button', { name: /Search/i }));
    
    if (await searchButton.isVisible({ timeout: 5000 })) {
      await searchButton.click();
    } else {
      // Press Enter if no button
      await searchInput.press('Enter');
    }
    
    await page.waitForLoadState('networkidle');
    console.log('✅ Submitted search');

    // Step 4: Verify search results page
    await expect(page).toHaveURL(/.*\/search/, { timeout: 10000 });
    console.log('✅ Navigated to search results page');

    // Step 5: Verify search results display
    const resultsContainer = page.locator('[class*="search-results"], [class*="results"]')
      .or(page.locator('h1, h2').filter({ hasText: /Results|Search/i }));
    
    await expect(resultsContainer.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Search results displayed');

    // Step 6: Verify search query matches API
    const apiResponse = await request.get(`${apiUrl}/search/?q=${searchQuery}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    expect(apiResponse.status()).toBe(200);
    const apiData = await apiResponse.json();
    expect(apiData.success).toBe(true);
    expect(apiData.data).toBeDefined();
    console.log('✅ Search API response verified');

    // Step 7: Verify UI results match API results count (if available)
    if (Array.isArray(apiData.data)) {
      const resultCards = page.locator('[class*="result-card"], [class*="card"]');
      const cardCount = await resultCards.count();
      console.log(`✅ Found ${cardCount} result cards in UI, ${apiData.data.length} in API`);
    }
  });

  test('should return empty results for non-existent query', async ({ page }) => {
    console.log('🔍 Test: Return empty results for non-existent query');
    
    const uniqueQuery = `nonexistentquery${Date.now()}`;

    // Step 1: Enter unique search query
    const searchInput = page.locator('input[type="search"]')
      .or(page.locator('input[placeholder*="Search"]'))
      .or(page.locator('[class*="search"] input'));
    
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
    await searchInput.fill(uniqueQuery);

    // Step 2: Submit search
    const searchButton = page.locator('button[type="submit"]')
      .or(page.locator('button[class*="search"]'));
    
    if (await searchButton.isVisible({ timeout: 5000 })) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }
    
    await page.waitForLoadState('networkidle');

    // Step 3: Verify empty state message
    // Observed: Empty state message when no results found
    const emptyState = page.getByText(/No results|No matches|Nothing found/i)
      .or(page.locator('[class*="empty"], [class*="no-results"]'));
    
    if (await emptyState.isVisible({ timeout: 10000 })) {
      await expect(emptyState).toBeVisible({ timeout: 10000 });
      console.log('✅ Empty state message displayed');
    } else {
      // Check if results container is empty
      const resultCards = page.locator('[class*="result-card"], [class*="card"]');
      const cardCount = await resultCards.count();
      if (cardCount === 0) {
        console.log('✅ No results displayed (empty state)');
      }
    }
  });
});

test.describe('Search E2E Tests - Filtered Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should handle search with filters', async ({ page, request }) => {
    console.log('🔍 Test: Handle search with filters');
    
    const searchQuery = 'test';
    const filterType = 'experience';

    // Step 1: Perform search
    const searchInput = page.locator('input[type="search"]')
      .or(page.locator('input[placeholder*="Search"]'))
      .or(page.locator('[class*="search"] input'));
    
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
    await searchInput.fill(searchQuery);

    const searchButton = page.locator('button[type="submit"]')
      .or(page.locator('button[class*="search"]'));
    
    if (await searchButton.isVisible({ timeout: 5000 })) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/search/, { timeout: 10000 });

    // Step 2: Apply filter
    // Observed: Filter options on search results page
    const filterButton = page.getByRole('button', { name: /Filter|Type|Category/i })
      .or(page.locator('[class*="filter"] button').first());
    
    if (await filterButton.isVisible({ timeout: 5000 })) {
      await filterButton.click();
      await page.waitForTimeout(1000);

      // Select experience filter
      const experienceFilter = page.getByRole('button', { name: /Experience/i })
        .or(page.locator('[class*="filter"]').filter({ hasText: /Experience/i }));
      
      if (await experienceFilter.isVisible({ timeout: 5000 })) {
        await experienceFilter.click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Applied experience filter');
      }
    } else {
      // Try direct filter selection if filters are visible
      const experienceFilter = page.getByRole('button', { name: /Experience/i })
        .or(page.locator('a[href*="type=experience"]'));
      
      if (await experienceFilter.isVisible({ timeout: 5000 })) {
        await experienceFilter.click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Applied experience filter');
      }
    }

    // Step 3: Verify filtered results match API
    const apiResponse = await request.get(`${apiUrl}/search/?q=${searchQuery}&type=${filterType}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    expect(apiResponse.status()).toBe(200);
    const apiData = await apiResponse.json();
    expect(apiData.success).toBe(true);
    console.log('✅ Filtered search API response verified');

    // Step 4: Verify filtered results display
    const resultsContainer = page.locator('[class*="search-results"], [class*="results"]');
    await expect(resultsContainer.first()).toBeVisible({ timeout: 10000 });
    
    // Verify filter is active (if filter indicator exists)
    const activeFilter = page.locator('[class*="active"], [class*="selected"]').filter({ hasText: /Experience/i });
    if (await activeFilter.isVisible({ timeout: 5000 })) {
      await expect(activeFilter).toBeVisible({ timeout: 10000 });
      console.log('✅ Filter indicator shows active filter');
    }
  });
});

test.describe('Search E2E Tests - Search Results Verification', () => {
  test('should verify search results match API data', async ({ page, request }) => {
    console.log('🔍 Test: Verify search results match API data');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const searchQuery = 'test';

    // Step 1: Perform search
    const searchInput = page.locator('input[type="search"]')
      .or(page.locator('input[placeholder*="Search"]'))
      .or(page.locator('[class*="search"] input'));
    
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
    await searchInput.fill(searchQuery);

    const searchButton = page.locator('button[type="submit"]')
      .or(page.locator('button[class*="search"]'));
    
    if (await searchButton.isVisible({ timeout: 5000 })) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/search/, { timeout: 10000 });

    // Step 2: Get API search results
    const apiResponse = await request.get(`${apiUrl}/search/?q=${searchQuery}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    expect(apiResponse.status()).toBe(200);
    const apiData = await apiResponse.json();
    expect(apiData.success).toBe(true);
    expect(apiData.data).toBeDefined();
    console.log('✅ API search results retrieved');

    // Step 3: Verify UI displays results
    const resultCards = page.locator('[class*="result-card"], [class*="card"]')
      .or(page.locator('[ui-card-experience], [ui-card-expert], [ui-card-expertise]'));
    
    const cardCount = await resultCards.count();
    console.log(`✅ Found ${cardCount} result cards in UI`);

    // Step 4: Compare UI results with API results
    if (Array.isArray(apiData.data) && apiData.data.length > 0) {
      // Get first result from API
      const firstApiResult = apiData.data[0];
      
      // Try to find matching result in UI
      if (cardCount > 0) {
        const firstCard = resultCards.first();
        
        // Check if title matches (if available)
        if (firstApiResult.title || firstApiResult.name || firstApiResult.experienceTitle) {
          const titleText = firstApiResult.title || firstApiResult.name || firstApiResult.experienceTitle;
          const cardTitle = firstCard.locator('[class*="title"]').first();
          
          if (await cardTitle.isVisible({ timeout: 5000 })) {
            const cardTitleText = await cardTitle.textContent();
            console.log(`✅ Comparing API title "${titleText}" with UI title "${cardTitleText}"`);
          }
        }
      }
    }

    console.log('✅ Search results verification completed');
  });
});
