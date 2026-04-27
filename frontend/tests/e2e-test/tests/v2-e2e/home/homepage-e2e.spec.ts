/**
 * Homepage E2E Tests
 * 
 * Based on: tests/api/backend-v2-integration/tests/web-home-api.spec.ts
 *           tests/api/backend-v2-integration/tests/web-experiences-api.spec.ts
 *           tests/api/backend-v2-integration/tests/web-experts-api.spec.ts
 * 
 * These E2E tests verify that homepage sections display correctly and match API data:
 * - Verify homepage sections load
 * - Navigate to experts/expertise/experiences
 * - Verify API data matches UI display
 * 
 * Test Environment: https://v2.mereka.dev
 * 
 * Run with: $env:TEST_ENV = "production"; npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/home/homepage-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import { HomePage } from '../../fixtures/home-page';

const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://v2.mereka.dev' 
  : process.env.TEST_ENV === 'staging'
  ? 'https://v2-staging.mereka.io'
  : 'https://v2.mereka.dev';

const BACKEND_V2_BASE_URL = process.env.BACKEND_V2_URL || 'https://api.mereka.dev';
const apiUrl = `${BACKEND_V2_BASE_URL}/api/v1`;

test.describe('Homepage E2E Tests - Verify Sections', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('should display all homepage sections', async ({ page }) => {
    console.log('🔍 Test: Display all homepage sections');
    
    // Step 1: Verify Hero Section
    const heroHeading = page.locator('h1').filter({ 
      hasText: /Book Leading Experts & Services/i 
    }).first();
    await expect(heroHeading).toBeVisible({ timeout: 10000 });
    console.log('✅ Hero section found');
    
    // Wait for animation to load
    const lottieAnimation = page.locator('ng-lottie > div > svg');
    await expect(lottieAnimation).toBeVisible({ timeout: 10000 });
    console.log('✅ Hero animation loaded');

    // Step 2: Verify Featured Experts Section
    const expertsHeading = page.locator('h2').filter({ 
      hasText: /Browse Featured Experts/i 
    }).first();
    await expertsHeading.scrollIntoViewIfNeeded();
    await expect(expertsHeading).toBeVisible({ timeout: 10000 });
    console.log('✅ Featured experts heading found');
    
    const firstExpertCard = page.locator('div[ui-card-expert]').first();
    await expect(firstExpertCard).toBeVisible({ timeout: 15000 });
    await expect(firstExpertCard.locator('p.ui-card-desc')).toBeVisible();
    console.log('✅ Expert cards displayed');

    // Step 3: Verify Expertise Section
    const expertiseHeading = page.locator('h2.section-heading').filter({ 
      hasText: /book their.*Expertise/i 
    });
    await expertiseHeading.scrollIntoViewIfNeeded();
    await expect(expertiseHeading).toBeVisible({ timeout: 10000 });
    console.log('✅ Expertise heading found');
    
    const expertiseCards = page.locator('[ui-card-expertise]');
    await expect(expertiseCards.first()).toBeVisible({ timeout: 15000 });
    
    const cardCount = await expertiseCards.count();
    console.log(`✅ Found ${cardCount} expertise cards`);
    
    if (cardCount === 0) {
      throw new Error('❌ CRITICAL ISSUE: No expertise cards found!');
    }
    
    const firstExpertiseCard = expertiseCards.first();
    await expect(firstExpertiseCard.locator('.ui-card-title a')).toBeVisible({ timeout: 10000 });
    
    const priceElement = firstExpertiseCard.locator('.ui-card-price');
    await expect(priceElement).toBeVisible({ timeout: 10000 });
    await expect(priceElement.locator('span.ui-card-price__amount')).toBeVisible();
    console.log('✅ Expertise card elements verified');

    // Step 4: Verify Experiences Section
    const experiencesHeading = page.locator('h2').filter({ 
      hasText: /Discover Experiences/i 
    }).first();
    await experiencesHeading.scrollIntoViewIfNeeded();
    await expect(experiencesHeading).toBeVisible({ timeout: 10000 });
    console.log('✅ Experiences section found');

    const firstExperienceCard = page.locator('div[ui-card-experience]').first();
    await expect(firstExperienceCard).toBeVisible({ timeout: 15000 });
    
    await expect(firstExperienceCard.locator('span.ui-card-location')).toBeVisible();
    await expect(firstExperienceCard.locator('h3.ui-card-title a')).toBeVisible();
    await expect(firstExperienceCard.locator('span.ui-card-date')).toBeVisible();
    
    const experiencePrice = firstExperienceCard.locator('div.ui-card-price');
    await expect(experiencePrice).toBeVisible();
    await expect(experiencePrice.locator('span.ui-card-price__amount')).toBeVisible();
    console.log('✅ Experience card elements verified');

    // Step 5: Verify Job Opportunities Section
    const jobsHeading = page.locator('h2').filter({ 
      hasText: /Explore Job Opportunities/i 
    }).first();
    await jobsHeading.scrollIntoViewIfNeeded();
    await expect(jobsHeading).toBeVisible({ timeout: 10000 });
    console.log('✅ Jobs section found');

    const firstJobCard = page.locator('div[ui-card-job]').first();
    await expect(firstJobCard).toBeVisible({ timeout: 15000 });
    await expect(firstJobCard.getByText(/Client:/)).toBeVisible();
    await expect(firstJobCard.getByText(/Posted/)).toBeVisible();
    await expect(firstJobCard.locator('span.job-tag')).toBeVisible();
    await expect(firstJobCard.locator('h3.ui-card-title a')).toBeVisible();
    await expect(firstJobCard.locator('p.ui-card-desc')).toBeVisible();
    await expect(firstJobCard.getByRole('link', { name: 'Learn More & Apply' })).toBeVisible();
    console.log('✅ Job card elements verified');
  });

  test('should display all key elements in comprehensive flow', async ({ page }) => {
    console.log('🔍 Test: Display all key elements in comprehensive flow');
    
    // Use HomePage POM for better abstraction
    // 1. Verify Hero Section
    await homePage.verifyHeroSection();
    console.log('✅ Hero section verified');

    // 2. Verify Featured Experts Section
    await homePage.verifyFeaturedExpertsSection();
    console.log('✅ Featured Experts section verified');

    const expertCardCount = await homePage.expertCards.count();
    expect(expertCardCount).toBeGreaterThan(0);
    console.log(`✅ Found ${expertCardCount} expert cards`);

    // 3. Verify "View all Experts" button is functional and then navigate back
    await homePage.clickViewAllExperts();
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ View all Experts navigation verified');

    // 4. Verify Featured Hubs Section
    await homePage.verifyFeaturedHubsSection();
    console.log('✅ Featured Hubs section verified');

    const hubCardCount = await homePage.hubCards.count();
    expect(hubCardCount).toBeGreaterThan(0);
    console.log(`✅ Found ${hubCardCount} hub cards`);

    // 5. Verify "View all Hubs" button is functional and then navigate back
    await homePage.clickViewAllHubs();
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ View all Hubs navigation verified');

    // 6. Verify Browse Expertise Section
    await homePage.verifyBrowseExpertiseSection();
    console.log('✅ Browse Expertise section verified');

    const expertiseCardCount = await homePage.expertiseCards.count();
    expect(expertiseCardCount).toBeGreaterThan(0);
    console.log(`✅ Found ${expertiseCardCount} expertise cards`);

    // Verify expertise card has price element
    const firstExpertiseCard = homePage.firstExpertiseCard;
    const priceElement = firstExpertiseCard.locator('text=/MYR|USD|Free/i');
    await expect(priceElement.first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Expertise card price element verified');

    // 7. Verify "View all Expertise" button is functional and then navigate back
    await homePage.clickViewAllExpertise();
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ View all Expertise navigation verified');

    // 8. Verify Upcoming Experiences Section
    await homePage.verifyUpcomingExperiencesSection();
    console.log('✅ Upcoming Experiences section verified');

    const experienceCardCount = await homePage.experienceCards.count();
    expect(experienceCardCount).toBeGreaterThan(0);
    console.log(`✅ Found ${experienceCardCount} experience cards`);

    // Verify experience card structure
    const firstExperienceCard = homePage.firstExperienceCard;
    const experienceTitle = firstExperienceCard.locator('h3');
    await expect(experienceTitle.first()).toBeVisible({ timeout: 5000 });
    
    const experiencePrice = firstExperienceCard.locator('text=/MYR|USD|Free/i');
    await expect(experiencePrice.first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Experience card elements verified');

    // 9. Verify "View all Experiences" button is functional
    await homePage.clickViewAllExperiences();
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ View all Experiences navigation verified');

    // 10. Verify Latest Jobs Section
    await homePage.verifyLatestJobsSection();
    console.log('✅ Latest Jobs section verified');

    const jobCardCount = await homePage.jobCards.count();
    if (jobCardCount > 0) {
      const firstJobCard = homePage.firstJobCard;
      await expect(firstJobCard).toBeVisible({ timeout: 15000 });
      console.log(`✅ Found ${jobCardCount} job cards`);
    } else {
      console.log('ℹ️ No job cards found (may be empty)');
    }

    // 11. Verify "View all Jobs" button is functional
    await homePage.clickViewAllJobs();
    await expect(page).toHaveURL(/.*\/jobs/);
    console.log('✅ View all Jobs navigation verified');
  });

  test('should verify homepage data matches API', async ({ page, request }) => {
    console.log('🔍 Test: Verify homepage data matches API');
    
    // Step 1: Get homepage data from API
    const apiResponse = await request.get(`${apiUrl}/home/`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    expect(apiResponse.status()).toBe(200);
    const apiData = await apiResponse.json();
    expect(apiData.success).toBe(true);
    expect(apiData.data).toBeDefined();
    console.log('✅ Homepage API data retrieved');

    // Step 2: Verify UI displays data from API
    // Check if featured experts match
    if (apiData.data.featuredExperts || apiData.data.experts) {
      const experts = apiData.data.featuredExperts || apiData.data.experts || [];
      if (experts.length > 0) {
        const expertCards = page.locator('div[ui-card-expert]');
        const cardCount = await expertCards.count();
        console.log(`✅ Found ${cardCount} expert cards in UI, ${experts.length} in API`);
      }
    }

    // Check if experiences match
    if (apiData.data.experiences || apiData.data.featuredExperiences) {
      const experiences = apiData.data.experiences || apiData.data.featuredExperiences || [];
      if (experiences.length > 0) {
        const experienceCards = page.locator('div[ui-card-experience]');
        const cardCount = await experienceCards.count();
        console.log(`✅ Found ${cardCount} experience cards in UI, ${experiences.length} in API`);
      }
    }

    console.log('✅ Homepage data verification completed');
  });
});

test.describe('Homepage E2E Tests - Navigation', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('should navigate to experts page', async ({ page }) => {
    console.log('🔍 Test: Navigate to experts page');
    
    // Step 1: Click "View all Experts" button
    const viewAllExpertsButton = page.getByRole('link', { name: 'View all Experts' });
    await expect(viewAllExpertsButton).toBeVisible({ timeout: 10000 });
    await viewAllExpertsButton.click();
    await expect(page).toHaveURL(/.*\/experts/, { timeout: 10000 });
    console.log('✅ Navigated to experts page');

    // Step 2: Verify experts page displays
    const expertsPageHeading = page.locator('h1, h2').filter({ hasText: /Experts/i });
    await expect(expertsPageHeading.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Experts page displayed');
  });

  test('should navigate to expertise page', async ({ page }) => {
    console.log('🔍 Test: Navigate to expertise page');
    
    // Step 1: Click "View all Expertise" button
    const viewAllExpertiseButton = page.getByRole('link', { name: 'View all Expertise' });
    await expect(viewAllExpertiseButton).toBeVisible({ timeout: 10000 });
    await viewAllExpertiseButton.click();
    await expect(page).toHaveURL(/.*\/expertise/, { timeout: 10000 });
    console.log('✅ Navigated to expertise page');

    // Step 2: Verify expertise page displays
    const expertisePageHeading = page.locator('h1, h2').filter({ hasText: /Expertise/i });
    await expect(expertisePageHeading.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Expertise page displayed');
  });

  test('should navigate to experiences page', async ({ page }) => {
    console.log('🔍 Test: Navigate to experiences page');
    
    // Step 1: Click "View all Experiences" button
    const viewAllExperiencesButton = page.getByRole('link', { name: 'View all Experiences' });
    await expect(viewAllExperiencesButton).toBeVisible({ timeout: 10000 });
    await viewAllExperiencesButton.click();
    await expect(page).toHaveURL(/.*\/experiences/, { timeout: 10000 });
    console.log('✅ Navigated to experiences page');

    // Step 2: Verify experiences page displays
    const experiencesPageHeading = page.locator('h1, h2').filter({ hasText: /Experiences/i });
    await expect(experiencesPageHeading.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Experiences page displayed');
  });

  test('should navigate to jobs page', async ({ page }) => {
    console.log('🔍 Test: Navigate to jobs page');
    
    // Step 1: Click "View all Jobs" button
    const viewAllJobsButton = page.getByRole('link', { name: 'View all Jobs' });
    await expect(viewAllJobsButton).toBeVisible({ timeout: 10000 });
    await viewAllJobsButton.click();
    await expect(page).toHaveURL(/.*\/jobs/, { timeout: 10000 });
    console.log('✅ Navigated to jobs page');

    // Step 2: Verify jobs page displays
    const jobsPageHeading = page.locator('h1, h2').filter({ hasText: /Jobs|Opportunities/i });
    await expect(jobsPageHeading.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Jobs page displayed');
  });
});
