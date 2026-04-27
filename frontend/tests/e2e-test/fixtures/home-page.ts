/**
 * Home Page Object Model
 *
 * Provides page object methods for interacting with the homepage
 * Based on the actual UI structure at v2.mereka.dev
 */

import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  
  // Hero Section
  readonly heroHeading: Locator;
  readonly heroDescription: Locator;
  readonly exploreJobOpportunitiesLink: Locator;
  
  // Featured Experts Section
  readonly featuredExpertsHeading: Locator;
  readonly featuredExpertsDescription: Locator;
  readonly viewAllExpertsLink: Locator;
  readonly expertCards: Locator;
  readonly firstExpertCard: Locator;
  
  // Featured Hubs Section
  readonly featuredHubsHeading: Locator;
  readonly featuredHubsDescription: Locator;
  readonly viewAllHubsLink: Locator;
  readonly hubCards: Locator;
  readonly firstHubCard: Locator;
  
  // Browse Expertise Section
  readonly browseExpertiseHeading: Locator;
  readonly browseExpertiseDescription: Locator;
  readonly viewAllExpertiseLink: Locator;
  readonly expertiseCards: Locator;
  readonly firstExpertiseCard: Locator;
  
  // Upcoming Experiences Section
  readonly upcomingExperiencesHeading: Locator;
  readonly upcomingExperiencesDescription: Locator;
  readonly viewAllExperiencesLink: Locator;
  readonly experienceCards: Locator;
  readonly firstExperienceCard: Locator;
  
  // Latest Jobs Section
  readonly latestJobsHeading: Locator;
  readonly latestJobsDescription: Locator;
  readonly viewAllJobsLink: Locator;
  readonly jobCards: Locator;
  readonly firstJobCard: Locator;
  
  // Search
  readonly searchInput: Locator;
  
  // Navigation
  readonly loginLink: Locator;
  readonly corporateLink: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Hero Section
    this.heroHeading = page.getByRole('heading', { name: /book leading experts & services/i }).first();
    this.heroDescription = page.getByText(/mereka connects you to leading experts/i).first();
    this.exploreJobOpportunitiesLink = page.getByRole('link', { name: /explore job opportunities/i });
    
    // Featured Experts Section
    this.featuredExpertsHeading = page.getByRole('heading', { name: /featured experts/i }).first();
    this.featuredExpertsDescription = page.getByText(/book 1-on-1 sessions with leading professionals/i).first();
    this.viewAllExpertsLink = page.getByRole('link', { name: /view all experts/i });
    this.expertCards = page.locator('a[href*="/experts/"]').filter({ has: page.locator('img') });
    this.firstExpertCard = this.expertCards.first();
    
    // Featured Hubs Section
    this.featuredHubsHeading = page.getByRole('heading', { name: /featured hubs/i }).first();
    this.featuredHubsDescription = page.getByText(/organizations offering resources/i).first();
    this.viewAllHubsLink = page.getByRole('link', { name: /view all hubs/i });
    this.hubCards = page.locator('a[href*="/hubs/"]').filter({ has: page.locator('img') });
    this.firstHubCard = this.hubCards.first();
    
    // Browse Expertise Section
    this.browseExpertiseHeading = page.getByRole('heading', { name: /browse expertise/i }).first();
    this.browseExpertiseDescription = page.getByText(/services offered by our vetted experts/i).first();
    this.viewAllExpertiseLink = page.getByRole('link', { name: /view all expertise/i });
    this.expertiseCards = page.locator('a[href*="/expertise/"]').filter({ has: page.locator('img') });
    this.firstExpertiseCard = this.expertiseCards.first();
    
    // Upcoming Experiences Section
    this.upcomingExperiencesHeading = page.getByRole('heading', { name: /upcoming experiences/i }).first();
    this.upcomingExperiencesDescription = page.getByText(/workshops, events and activities/i).first();
    this.viewAllExperiencesLink = page.getByRole('link', { name: /view all experiences/i });
    this.experienceCards = page.locator('a[href*="/experience/"]').filter({ has: page.locator('img') });
    this.firstExperienceCard = this.experienceCards.first();
    
    // Latest Jobs Section
    this.latestJobsHeading = page.getByRole('heading', { name: /latest jobs/i }).first();
    this.latestJobsDescription = page.getByText(/opportunities posted by businesses/i).first();
    this.viewAllJobsLink = page.getByRole('link', { name: /view all jobs/i });
    this.jobCards = page.locator('a[href*="/jobs/"]');
    this.firstJobCard = this.jobCards.first();
    
    // Search
    this.searchInput = page.getByPlaceholder(/what are you looking for/i);
    
    // Navigation
    this.loginLink = page.getByRole('link', { name: /log in/i });
    this.corporateLink = page.getByRole('link', { name: /corporate/i });
  }

  /**
   * Navigate to the homepage
   */
  async goto() {
    const BASE_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
      ? 'https://v2.mereka.dev' 
      : process.env.TEST_ENV === 'staging'
      ? 'https://v2-staging.mereka.io'
      : process.env.FRONTEND_URL || 'https://v2.mereka.dev';
    await this.page.goto(BASE_URL);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify hero section is visible
   */
  async verifyHeroSection() {
    await expect(this.heroHeading).toBeVisible({ timeout: 10000 });
    await expect(this.heroDescription).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify Featured Experts section is visible
   */
  async verifyFeaturedExpertsSection() {
    await this.featuredExpertsHeading.scrollIntoViewIfNeeded();
    await expect(this.featuredExpertsHeading).toBeVisible({ timeout: 10000 });
    await expect(this.featuredExpertsDescription).toBeVisible({ timeout: 5000 });
    await expect(this.firstExpertCard).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click View All Experts link and verify navigation
   */
  async clickViewAllExperts() {
    await expect(this.viewAllExpertsLink).toBeVisible();
    await this.viewAllExpertsLink.click();
    await expect(this.page).toHaveURL(/.*\/experts/);
  }

  /**
   * Verify Featured Hubs section is visible
   */
  async verifyFeaturedHubsSection() {
    await this.featuredHubsHeading.scrollIntoViewIfNeeded();
    await expect(this.featuredHubsHeading).toBeVisible({ timeout: 10000 });
    await expect(this.featuredHubsDescription).toBeVisible({ timeout: 5000 });
    await expect(this.firstHubCard).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click View All Hubs link and verify navigation
   */
  async clickViewAllHubs() {
    await expect(this.viewAllHubsLink).toBeVisible();
    await this.viewAllHubsLink.click();
    await expect(this.page).toHaveURL(/.*\/hubs/);
  }

  /**
   * Verify Browse Expertise section is visible
   */
  async verifyBrowseExpertiseSection() {
    await this.browseExpertiseHeading.scrollIntoViewIfNeeded();
    await expect(this.browseExpertiseHeading).toBeVisible({ timeout: 10000 });
    await expect(this.browseExpertiseDescription).toBeVisible({ timeout: 5000 });
    await expect(this.firstExpertiseCard).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click View All Expertise link and verify navigation
   */
  async clickViewAllExpertise() {
    await expect(this.viewAllExpertiseLink).toBeVisible();
    await this.viewAllExpertiseLink.click();
    await expect(this.page).toHaveURL(/.*\/expertise/);
  }

  /**
   * Verify Upcoming Experiences section is visible
   */
  async verifyUpcomingExperiencesSection() {
    await this.upcomingExperiencesHeading.scrollIntoViewIfNeeded();
    await expect(this.upcomingExperiencesHeading).toBeVisible({ timeout: 10000 });
    await expect(this.upcomingExperiencesDescription).toBeVisible({ timeout: 5000 });
    await expect(this.firstExperienceCard).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click View All Experiences link and verify navigation
   */
  async clickViewAllExperiences() {
    await expect(this.viewAllExperiencesLink).toBeVisible();
    await this.viewAllExperiencesLink.click();
    await expect(this.page).toHaveURL(/.*\/experiences/);
  }

  /**
   * Verify Latest Jobs section is visible
   */
  async verifyLatestJobsSection() {
    await this.latestJobsHeading.scrollIntoViewIfNeeded();
    await expect(this.latestJobsHeading).toBeVisible({ timeout: 10000 });
    await expect(this.latestJobsDescription).toBeVisible({ timeout: 5000 });
  }

  /**
   * Click View All Jobs link and verify navigation
   */
  async clickViewAllJobs() {
    await expect(this.viewAllJobsLink).toBeVisible();
    await this.viewAllJobsLink.click();
    await expect(this.page).toHaveURL(/.*\/jobs/);
  }

  /**
   * Click on first experience card
   */
  async clickFirstExperienceCard() {
    await this.firstExperienceCard.scrollIntoViewIfNeeded();
    await expect(this.firstExperienceCard).toBeVisible({ timeout: 15000 });
    await this.firstExperienceCard.click();
    await expect(this.page).toHaveURL(/.*\/experience\//);
  }
}
