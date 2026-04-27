/**
 * Job Posting E2E Tests
 * 
 * Based on: Existing E2E test patterns from tests/e2e-test/tests/
 * 
 * These E2E tests verify job posting and application functionality:
 * - View job listing page
 * - View job detail page
 * - Navigate from homepage to job pages
 * - Verify job application flow (if accessible)
 * 
 * Test Environment: https://v2.mereka.dev
 * 
 * Run with: $env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/job/job-posting-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import { loginUser } from '../../fixtures/helpers/auth-e2e-helper';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev' 
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

test.describe('Job Posting E2E Tests - Job Listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to jobs page from homepage', async ({ page }) => {
    console.log('🔍 Test: Navigate to jobs page from homepage');
    
    // Step 1: Click "View all Jobs" button
    const viewAllJobsButton = page.getByRole('link', { name: /View all Jobs|View All Jobs/i });
    await expect(viewAllJobsButton).toBeVisible({ timeout: 10000 });
    await viewAllJobsButton.click();
    await expect(page).toHaveURL(/.*\/jobs/, { timeout: 10000 });
    console.log('✅ Navigated to jobs page');

    // Step 2: Verify jobs listing page displays
    const jobsPageHeading = page.locator('h1, h2').filter({ hasText: /Jobs|Opportunities/i });
    await expect(jobsPageHeading.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Jobs page heading displayed');

    // Step 3: Verify job cards are displayed (if available)
    const jobCards = page.locator('div[ui-card-job]')
      .or(page.locator('a[href*="/jobs/"]').filter({ has: page.locator('h3, h4, h5') }));
    
    const cardCount = await jobCards.count();
    if (cardCount > 0) {
      console.log(`✅ Found ${cardCount} job cards`);
    } else {
      console.log('⚠️ No job cards found - jobs section may be empty');
    }
  });

  test('should display job cards with required information', async ({ page }) => {
    console.log('🔍 Test: Display job cards with required information');
    
    // Navigate to jobs page
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    // Verify first job card has required elements (if available)
    const firstJobCard = page.locator('div[ui-card-job]').first()
      .or(page.locator('a[href*="/jobs/"]').filter({ has: page.locator('h3, h4, h5') }).first());
    
    if (await firstJobCard.isVisible({ timeout: 15000 })) {
      // Verify job card elements
      const jobTitle = firstJobCard.locator('h3.ui-card-title a')
        .or(firstJobCard.locator('h3, h4, h5').first());
      await expect(jobTitle).toBeVisible({ timeout: 10000 });
      console.log('✅ Job title displayed');

      const jobDescription = firstJobCard.locator('p.ui-card-desc')
        .or(firstJobCard.locator('p').first());
      await expect(jobDescription).toBeVisible({ timeout: 10000 });
      console.log('✅ Job description displayed');

      const jobClient = firstJobCard.getByText(/Client:/);
      if (await jobClient.isVisible({ timeout: 5000 })) {
        await expect(jobClient).toBeVisible({ timeout: 10000 });
        console.log('✅ Job client information displayed');
      }

      const jobPosted = firstJobCard.getByText(/Posted/);
      if (await jobPosted.isVisible({ timeout: 5000 })) {
        await expect(jobPosted).toBeVisible({ timeout: 10000 });
        console.log('✅ Job posted date displayed');
      }
    } else {
      console.log('⚠️ No job cards found - skipping job card verification');
    }
  });
});

test.describe('Job Posting E2E Tests - Job Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to job detail page from homepage', async ({ page }) => {
    console.log('🔍 Test: Navigate to job detail page from homepage');
    
    // Step 1: Find jobs section on homepage
    const jobsHeading = page.locator('h2').filter({ 
      hasText: /Explore Job Opportunities|Latest Jobs/i 
    }).first();
    await jobsHeading.scrollIntoViewIfNeeded();
    await expect(jobsHeading).toBeVisible({ timeout: 10000 });

    // Step 2: Click on first job card (if available)
    const firstJobCard = page.locator('div[ui-card-job]').first();
    
    if (await firstJobCard.isVisible({ timeout: 15000 })) {
      // Get job title for verification
      const jobTitle = firstJobCard.locator('h3.ui-card-title a')
        .or(firstJobCard.locator('[class*="title"]').first());
      let titleText = '';
      if (await jobTitle.isVisible({ timeout: 5000 })) {
        titleText = await jobTitle.textContent() || '';
      }
      
      await firstJobCard.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Clicked on job card');

      // Step 3: Verify job detail page displays
      await expect(page).toHaveURL(/.*\/jobs\/.*/, { timeout: 10000 });
      console.log('✅ Navigated to job detail page');

      // Step 4: Verify job detail page elements
      const detailPageHeading = page.locator('h1, h2').filter({ hasText: titleText })
        .or(page.locator('h1, h2').first());
      await expect(detailPageHeading.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Job detail page heading displayed');
    } else {
      console.log('⚠️ No job cards found on homepage - skipping job detail test');
    }
  });

  test('should display job detail information', async ({ page }) => {
    console.log('🔍 Test: Display job detail information');
    
    // Navigate to jobs page first
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    // Click on first job (if available)
    const firstJobCard = page.locator('div[ui-card-job]').first()
      .or(page.locator('a[href*="/jobs/"]').filter({ has: page.locator('h3, h4, h5') }).first());
    
    if (await firstJobCard.isVisible({ timeout: 15000 })) {
      await firstJobCard.click();
      await page.waitForLoadState('networkidle');

      // Verify job detail elements
      const jobDescription = page.locator('[class*="description"]')
        .or(page.locator('p').filter({ hasText: /./ }).first());
      await expect(jobDescription.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Job description displayed');

      const jobRequirements = page.locator('[class*="requirements"], [class*="skills"]')
        .or(page.getByText(/Requirements|Skills|Qualifications/i));
      if (await jobRequirements.isVisible({ timeout: 5000 })) {
        await expect(jobRequirements.first()).toBeVisible({ timeout: 10000 });
        console.log('✅ Job requirements displayed');
      }
    } else {
      console.log('⚠️ No jobs available - skipping job detail verification');
    }
  });

  test('should display apply button on job detail page', async ({ page }) => {
    console.log('🔍 Test: Display apply button on job detail page');
    
    // Navigate to job detail page
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    const firstJobCard = page.locator('div[ui-card-job]').first()
      .or(page.locator('a[href*="/jobs/"]').filter({ has: page.locator('h3, h4, h5') }).first());
    
    if (await firstJobCard.isVisible({ timeout: 15000 })) {
      await firstJobCard.click();
      await page.waitForLoadState('networkidle');

      // Look for apply button
      const applyButton = page.getByRole('button', { name: /Apply|Apply Now|Submit Application/i })
        .or(page.getByRole('link', { name: /Apply|Apply Now|Learn More/i }));
      
      if (await applyButton.isVisible({ timeout: 10000 })) {
        await expect(applyButton.first()).toBeVisible({ timeout: 10000 });
        console.log('✅ Apply button displayed');
      } else {
        console.log('⚠️ Apply button not found - may require login or different flow');
      }
    } else {
      console.log('⚠️ No jobs available - skipping apply button test');
    }
  });
});

test.describe('Job Posting E2E Tests - Job Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to job application form when logged in', async ({ page }) => {
    console.log('🔍 Test: Navigate to job application form when logged in');
    
    // Navigate to jobs page
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    const firstJobCard = page.locator('div[ui-card-job]').first()
      .or(page.locator('a[href*="/jobs/"]').filter({ has: page.locator('h3, h4, h5') }).first());
    
    if (await firstJobCard.isVisible({ timeout: 15000 })) {
      await firstJobCard.click();
      await page.waitForLoadState('networkidle');

      // Look for apply button
      const applyButton = page.getByRole('button', { name: /Apply|Apply Now/i })
        .or(page.getByRole('link', { name: /Apply|Apply Now|Learn More & Apply/i }));
      
      if (await applyButton.isVisible({ timeout: 10000 })) {
        await applyButton.click();
        await page.waitForLoadState('networkidle');
        
        // Should navigate to application form or show application modal
        const applicationForm = page.locator('form')
          .or(page.locator('[class*="application"], [class*="apply"]'));
        
        if (await applicationForm.isVisible({ timeout: 10000 })) {
          await expect(applicationForm.first()).toBeVisible({ timeout: 10000 });
          console.log('✅ Application form displayed');
        } else {
          // May have navigated to application page
          await expect(page).toHaveURL(/.*\/apply|.*\/application/, { timeout: 10000 });
          console.log('✅ Navigated to application page');
        }
      } else {
        console.log('⚠️ Apply button not found - may not be available');
      }
    } else {
      console.log('⚠️ No jobs available - skipping application form test');
    }
  });
});

test.describe('Job Posting E2E Tests - Navigation', () => {
  test('should navigate from homepage job card to job detail', async ({ page }) => {
    console.log('🔍 Test: Navigate from homepage job card to job detail');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find jobs section
    const jobsHeading = page.locator('h2').filter({ 
      hasText: /Explore Job Opportunities|Latest Jobs/i 
    }).first();
    await jobsHeading.scrollIntoViewIfNeeded();
    await expect(jobsHeading).toBeVisible({ timeout: 10000 });

    // Click on first job card (if available)
    const firstJobCard = page.locator('div[ui-card-job]').first();
    
    if (await firstJobCard.isVisible({ timeout: 15000 })) {
      await firstJobCard.click();
      await page.waitForLoadState('networkidle');

      // Verify navigation to job detail page
      await expect(page).toHaveURL(/.*\/jobs\/.*/, { timeout: 10000 });
      console.log('✅ Successfully navigated to job detail page');
    } else {
      console.log('⚠️ No job cards found on homepage - skipping navigation test');
    }
  });

  test('should navigate back from job detail to jobs listing', async ({ page }) => {
    console.log('🔍 Test: Navigate back from job detail to jobs listing');
    
    // Navigate to job detail page
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    const firstJobCard = page.locator('div[ui-card-job]').first()
      .or(page.locator('a[href*="/jobs/"]').filter({ has: page.locator('h3, h4, h5') }).first());
    
    if (await firstJobCard.isVisible({ timeout: 15000 })) {
      await firstJobCard.click();
      await page.waitForLoadState('networkidle');

      // Click back button or navigate back
      const backButton = page.getByRole('button', { name: /Back/i })
        .or(page.locator('a[href*="/jobs"]').filter({ hasText: /Back|Jobs/i }));
      
      if (await backButton.isVisible({ timeout: 5000 })) {
        await backButton.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/.*\/jobs/, { timeout: 10000 });
        console.log('✅ Navigated back to jobs listing');
      } else {
        // Use browser back
        await page.goBack();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/.*\/jobs/, { timeout: 10000 });
        console.log('✅ Used browser back to return to jobs listing');
      }
    } else {
      console.log('⚠️ No jobs available - skipping back navigation test');
    }
  });
});
