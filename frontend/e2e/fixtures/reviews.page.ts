import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for Hub Detail Reviews Tab
 */
export class HubReviewsPage {
  readonly page: Page;

  // Tab
  readonly reviewsTab: Locator;
  readonly reviewsTabCount: Locator;

  // Stats section
  readonly statsSection: Locator;
  readonly avgRating: Locator;
  readonly totalCount: Locator;
  readonly distribution: Locator;

  // Filters
  readonly typeFilter: Locator;
  readonly typeAll: Locator;
  readonly typeExperiences: Locator;
  readonly typeExpertise: Locator;
  readonly typeJobs: Locator;
  readonly ratingFilter: Locator;

  // Reviews list
  readonly reviewsList: Locator;
  readonly pagination: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tab
    this.reviewsTab = page.getByTestId('hub-reviews-tab');
    this.reviewsTabCount = page.getByTestId('hub-reviews-tab-count');

    // Stats
    this.statsSection = page.getByTestId('hub-reviews-stats');
    this.avgRating = page.getByTestId('hub-reviews-avg-rating');
    this.totalCount = page.getByTestId('hub-reviews-total-count');
    this.distribution = page.getByTestId('hub-reviews-distribution');

    // Filters
    this.typeFilter = page.getByTestId('hub-reviews-type-filter');
    this.typeAll = page.getByTestId('hub-reviews-type-all');
    this.typeExperiences = page.getByTestId('hub-reviews-type-experiences');
    this.typeExpertise = page.getByTestId('hub-reviews-type-expertise');
    this.typeJobs = page.getByTestId('hub-reviews-type-jobs');
    this.ratingFilter = page.getByTestId('hub-reviews-rating-filter');

    // List
    this.reviewsList = page.getByTestId('hub-reviews-list');
    this.pagination = page.getByTestId('hub-reviews-pagination');
    this.emptyState = page.getByTestId('hub-reviews-empty');
    this.loadingState = page.getByTestId('hub-reviews-loading');
  }

  /**
   * Navigate to hub detail and select reviews tab
   */
  async goto(hubSlug: string) {
    await this.page.goto(`/hub/${hubSlug}`);
    await this.page.waitForLoadState('networkidle');
    await this.reviewsTab.click();
  }

  /**
   * Wait for reviews to load
   */
  async waitForLoad() {
    await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Get review card by ID
   */
  getReviewCard(reviewId: string): Locator {
    return this.page.getByTestId(`hub-review-card-${reviewId}`);
  }

  /**
   * Get service name from review card
   */
  getReviewServiceName(reviewId: string): Locator {
    return this.getReviewCard(reviewId).getByTestId('hub-review-service-name');
  }

  /**
   * Filter by rating
   */
  async filterByRating(rating: number) {
    const ratingButton = this.page.getByTestId(`hub-reviews-rating-${rating}`);
    await ratingButton.click();
    await this.waitForLoad();
  }

  /**
   * Filter by type
   */
  async filterByType(type: 'all' | 'experiences' | 'expertise' | 'jobs') {
    const filterMap = {
      all: this.typeAll,
      experiences: this.typeExperiences,
      expertise: this.typeExpertise,
      jobs: this.typeJobs,
    };
    await filterMap[type].click();
    await this.waitForLoad();
  }

  /**
   * Get all review cards
   */
  getAllReviewCards(): Locator {
    return this.reviewsList.locator('[data-testid^="hub-review-card-"]');
  }
}

/**
 * Page Object for Experience Detail Reviews Section
 */
export class ExperienceReviewsPage {
  readonly page: Page;

  // Section
  readonly reviewsSection: Locator;
  readonly statsSection: Locator;
  readonly filterSection: Locator;
  readonly reviewsList: Locator;
  readonly loadingState: Locator;
  readonly emptyState: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;

    this.reviewsSection = page.getByTestId('experience-reviews-section');
    this.statsSection = page.getByTestId('experience-reviews-stats');
    this.filterSection = page.getByTestId('experience-reviews-filter');
    this.reviewsList = page.getByTestId('experience-reviews-list');
    this.loadingState = page.getByTestId('experience-reviews-loading');
    this.emptyState = page.getByTestId('experience-reviews-empty');
    this.pagination = page.getByTestId('experience-reviews-pagination');
  }

  /**
   * Navigate to experience detail page
   */
  async goto(experienceId: string) {
    await this.page.goto(`/experience/${experienceId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Scroll to reviews section
   */
  async scrollToReviews() {
    await this.reviewsSection.scrollIntoViewIfNeeded();
  }

  /**
   * Wait for reviews to load
   */
  async waitForLoad() {
    await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Get review card by ID
   */
  getReviewCard(reviewId: string): Locator {
    return this.page.getByTestId(`experience-review-card-${reviewId}`);
  }

  /**
   * Filter by rating
   */
  async filterByRating(rating: number) {
    const ratingButton = this.filterSection.getByTestId(`filter-rating-${rating}`);
    await ratingButton.click();
    await this.waitForLoad();
  }

  /**
   * Get all review cards
   */
  getAllReviewCards(): Locator {
    return this.reviewsList.locator('[data-testid^="experience-review-card-"]');
  }
}

/**
 * Page Object for Expertise Detail Reviews Section
 */
export class ExpertiseReviewsPage {
  readonly page: Page;

  // Section
  readonly reviewsSection: Locator;
  readonly statsSection: Locator;
  readonly filterSection: Locator;
  readonly reviewsList: Locator;
  readonly loadingState: Locator;
  readonly emptyState: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;

    this.reviewsSection = page.getByTestId('expertise-reviews-section');
    this.statsSection = page.getByTestId('expertise-reviews-stats');
    this.filterSection = page.getByTestId('expertise-reviews-filter');
    this.reviewsList = page.getByTestId('expertise-reviews-list');
    this.loadingState = page.getByTestId('expertise-reviews-loading');
    this.emptyState = page.getByTestId('expertise-reviews-empty');
    this.pagination = page.getByTestId('expertise-reviews-pagination');
  }

  /**
   * Navigate to expertise detail page
   */
  async goto(expertiseSlug: string) {
    await this.page.goto(`/expertise/${expertiseSlug}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Scroll to reviews section
   */
  async scrollToReviews() {
    await this.reviewsSection.scrollIntoViewIfNeeded();
  }

  /**
   * Wait for reviews to load
   */
  async waitForLoad() {
    await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Get review card by ID
   */
  getReviewCard(reviewId: string): Locator {
    return this.page.getByTestId(`expertise-review-card-${reviewId}`);
  }

  /**
   * Filter by rating
   */
  async filterByRating(rating: number) {
    const ratingButton = this.filterSection.getByTestId(`filter-rating-${rating}`);
    await ratingButton.click();
    await this.waitForLoad();
  }

  /**
   * Get all review cards
   */
  getAllReviewCards(): Locator {
    return this.reviewsList.locator('[data-testid^="expertise-review-card-"]');
  }
}

/**
 * Page Object for Job Detail Client Reviews Section
 */
export class JobClientReviewsPage {
  readonly page: Page;

  // Section
  readonly clientSection: Locator;
  readonly hubName: Locator;
  readonly hubLogo: Locator;
  readonly rating: Locator;
  readonly contractsCount: Locator;
  readonly reviewSnippets: Locator;
  readonly viewAllLink: Locator;
  readonly reviewsSection: Locator;

  constructor(page: Page) {
    this.page = page;

    this.clientSection = page.getByTestId('job-client-section');
    this.hubName = page.getByTestId('job-client-hub-name');
    this.hubLogo = page.getByTestId('job-client-hub-logo');
    this.rating = page.getByTestId('job-client-rating');
    this.contractsCount = page.getByTestId('job-client-contracts-count');
    this.reviewSnippets = page.getByTestId('job-client-review-snippets');
    this.viewAllLink = page.getByTestId('job-client-view-all-link');
    this.reviewsSection = page.getByTestId('job-client-reviews-section');
  }

  /**
   * Navigate to job detail page
   */
  async goto(jobId: string) {
    await this.page.goto(`/job/${jobId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Scroll to client section
   */
  async scrollToClientSection() {
    await this.clientSection.scrollIntoViewIfNeeded();
  }

  /**
   * Click view all reviews link
   */
  async viewAllReviews() {
    await this.viewAllLink.click();
  }
}
