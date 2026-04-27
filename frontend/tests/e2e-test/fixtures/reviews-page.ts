/**
 * Reviews Page Object for E2E Tests
 *
 * Page object model for Learner Reviews page
 * Provides locators and actions for reviews-related E2E tests
 */

import { Page, Locator } from '@playwright/test';

export class ReviewsPage {
  readonly page: Page;

  // Page container
  readonly reviewsPage: Locator;
  readonly pageTitle: Locator;

  // Desktop layout
  readonly desktopLayout: Locator;

  // Replies Section (Desktop)
  readonly repliesSection: Locator;
  readonly repliesSectionTitle: Locator;
  readonly repliesCountBadge: Locator;
  readonly repliesLoading: Locator;
  readonly repliesEmptyState: Locator;
  readonly repliesList: Locator;
  readonly replyItems: Locator;

  // To Review Section (Desktop)
  readonly toReviewSection: Locator;
  readonly toReviewSectionTitle: Locator;
  readonly toReviewCountBadge: Locator;
  readonly toReviewLoading: Locator;
  readonly toReviewEmptyState: Locator;
  readonly toReviewList: Locator;
  readonly toReviewItems: Locator;
  readonly addReviewButtons: Locator;

  // Past Reviews Section (Desktop)
  readonly pastReviewsSection: Locator;
  readonly pastReviewsSectionTitle: Locator;
  readonly pastReviewsLoading: Locator;
  readonly pastReviewsEmptyState: Locator;
  readonly pastReviewsList: Locator;
  readonly pastReviewItems: Locator;

  // Mobile layout
  readonly mobileLayout: Locator;
  readonly mobileTabNavigation: Locator;
  readonly mobileTabToReview: Locator;
  readonly mobileTabPastReviews: Locator;
  readonly mobileTabReplies: Locator;
  readonly mobileLoading: Locator;

  // Mobile content sections
  readonly mobileToReviewContent: Locator;
  readonly mobileToReviewEmpty: Locator;
  readonly mobileToReviewList: Locator;
  readonly mobileAddReviewButton: Locator;

  readonly mobilePastReviewsContent: Locator;
  readonly mobilePastReviewsEmpty: Locator;
  readonly mobilePastReviewsList: Locator;

  readonly mobileRepliesContent: Locator;
  readonly mobileRepliesEmpty: Locator;
  readonly mobileRepliesList: Locator;

  // Hub reply box
  readonly hubReplyBox: Locator;
  readonly mobileHubReplyBox: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page container
    this.reviewsPage = page.locator('[data-testid="reviews-page"]');
    this.pageTitle = page.locator('[data-testid="reviews-page-title"]');

    // Desktop layout
    this.desktopLayout = page.locator('[data-testid="reviews-desktop-layout"]');

    // Replies Section (Desktop)
    this.repliesSection = page.locator('[data-testid="replies-section"]');
    this.repliesSectionTitle = page.locator('[data-testid="replies-section-title"]');
    this.repliesCountBadge = page.locator('[data-testid="replies-count-badge"]');
    this.repliesLoading = page.locator('[data-testid="replies-loading"]');
    this.repliesEmptyState = page.locator('[data-testid="replies-empty-state"]');
    this.repliesList = page.locator('[data-testid="replies-list"]');
    this.replyItems = page.locator('[data-testid^="reply-item-"]');

    // To Review Section (Desktop)
    this.toReviewSection = page.locator('[data-testid="to-review-section"]');
    this.toReviewSectionTitle = page.locator('[data-testid="to-review-section-title"]');
    this.toReviewCountBadge = page.locator('[data-testid="to-review-count-badge"]');
    this.toReviewLoading = page.locator('[data-testid="to-review-loading"]');
    this.toReviewEmptyState = page.locator('[data-testid="to-review-empty-state"]');
    this.toReviewList = page.locator('[data-testid="to-review-list"]');
    this.toReviewItems = page.locator('[data-testid^="to-review-item-"]');
    this.addReviewButtons = page.locator('[data-testid="add-review-button"]');

    // Past Reviews Section (Desktop)
    this.pastReviewsSection = page.locator('[data-testid="past-reviews-section"]');
    this.pastReviewsSectionTitle = page.locator('[data-testid="past-reviews-section-title"]');
    this.pastReviewsLoading = page.locator('[data-testid="past-reviews-loading"]');
    this.pastReviewsEmptyState = page.locator('[data-testid="past-reviews-empty-state"]');
    this.pastReviewsList = page.locator('[data-testid="past-reviews-list"]');
    this.pastReviewItems = page.locator('[data-testid^="past-review-item-"]');

    // Mobile layout
    this.mobileLayout = page.locator('[data-testid="reviews-mobile-layout"]');
    this.mobileTabNavigation = page.locator('[data-testid="mobile-tab-navigation"]');
    this.mobileTabToReview = page.locator('[data-testid="mobile-tab-to-review"]');
    this.mobileTabPastReviews = page.locator('[data-testid="mobile-tab-past-reviews"]');
    this.mobileTabReplies = page.locator('[data-testid="mobile-tab-replies"]');
    this.mobileLoading = page.locator('[data-testid="mobile-loading"]');

    // Mobile content sections
    this.mobileToReviewContent = page.locator('[data-testid="mobile-to-review-content"]');
    this.mobileToReviewEmpty = page.locator('[data-testid="mobile-to-review-empty"]');
    this.mobileToReviewList = page.locator('[data-testid="mobile-to-review-list"]');
    this.mobileAddReviewButton = page.locator('[data-testid="mobile-add-review-button"]');

    this.mobilePastReviewsContent = page.locator('[data-testid="mobile-past-reviews-content"]');
    this.mobilePastReviewsEmpty = page.locator('[data-testid="mobile-past-reviews-empty"]');
    this.mobilePastReviewsList = page.locator('[data-testid="mobile-past-reviews-list"]');

    this.mobileRepliesContent = page.locator('[data-testid="mobile-replies-content"]');
    this.mobileRepliesEmpty = page.locator('[data-testid="mobile-replies-empty"]');
    this.mobileRepliesList = page.locator('[data-testid="mobile-replies-list"]');

    // Hub reply box
    this.hubReplyBox = page.locator('[data-testid="hub-reply-box"]');
    this.mobileHubReplyBox = page.locator('[data-testid="mobile-hub-reply-box"]');
  }

  // =========================================================================
  // Navigation Actions
  // =========================================================================

  /**
   * Navigate to Learner Reviews page
   */
  async gotoReviews(): Promise<void> {
    await this.page.goto('/dashboard/reviews');
    await this.page.waitForLoadState('networkidle');
  }

  // =========================================================================
  // Desktop Actions
  // =========================================================================

  /**
   * Get count of items in to-review list
   */
  async getToReviewCount(): Promise<number> {
    return await this.toReviewItems.count();
  }

  /**
   * Get count of past reviews
   */
  async getPastReviewsCount(): Promise<number> {
    return await this.pastReviewItems.count();
  }

  /**
   * Get count of replies from hubs
   */
  async getRepliesCount(): Promise<number> {
    return await this.replyItems.count();
  }

  /**
   * Click add review button for a specific item
   */
  async clickAddReview(index: number = 0): Promise<void> {
    const button = this.addReviewButtons.nth(index);
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get review item by index
   */
  async getToReviewItem(index: number = 0): Promise<Locator> {
    return this.toReviewItems.nth(index);
  }

  /**
   * Get past review item by index
   */
  async getPastReviewItem(index: number = 0): Promise<Locator> {
    return this.pastReviewItems.nth(index);
  }

  /**
   * Get reply item by index
   */
  async getReplyItem(index: number = 0): Promise<Locator> {
    return this.replyItems.nth(index);
  }

  // =========================================================================
  // Mobile Actions
  // =========================================================================

  /**
   * Switch to To Review tab (mobile)
   */
  async switchToToReviewTab(): Promise<void> {
    await this.mobileTabToReview.waitFor({ state: 'visible', timeout: 10000 });
    await this.mobileTabToReview.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to Past Reviews tab (mobile)
   */
  async switchToPastReviewsTab(): Promise<void> {
    await this.mobileTabPastReviews.waitFor({ state: 'visible', timeout: 10000 });
    await this.mobileTabPastReviews.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to Replies tab (mobile)
   */
  async switchToRepliesTab(): Promise<void> {
    await this.mobileTabReplies.waitFor({ state: 'visible', timeout: 10000 });
    await this.mobileTabReplies.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get mobile to-review items count
   */
  async getMobileToReviewCount(): Promise<number> {
    return await this.page.locator('[data-testid^="mobile-to-review-item-"]').count();
  }

  /**
   * Get mobile past reviews count
   */
  async getMobilePastReviewsCount(): Promise<number> {
    return await this.page.locator('[data-testid^="mobile-past-review-item-"]').count();
  }

  /**
   * Get mobile replies count
   */
  async getMobileRepliesCount(): Promise<number> {
    return await this.page.locator('[data-testid^="mobile-reply-item-"]').count();
  }

  /**
   * Click mobile add review button
   */
  async clickMobileAddReview(index: number = 0): Promise<void> {
    const button = this.mobileAddReviewButton.nth(index);
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    await this.page.waitForTimeout(500);
  }

  // =========================================================================
  // Verification Helpers
  // =========================================================================

  /**
   * Check if page is loaded
   */
  async isPageLoaded(): Promise<boolean> {
    return await this.reviewsPage.isVisible();
  }

  /**
   * Check if desktop layout is visible
   */
  async isDesktopLayout(): Promise<boolean> {
    return await this.desktopLayout.isVisible();
  }

  /**
   * Check if mobile layout is visible
   */
  async isMobileLayout(): Promise<boolean> {
    return await this.mobileLayout.isVisible();
  }

  /**
   * Check if to-review section has empty state
   */
  async isToReviewEmpty(): Promise<boolean> {
    const desktop = await this.toReviewEmptyState.isVisible().catch(() => false);
    const mobile = await this.mobileToReviewEmpty.isVisible().catch(() => false);
    return desktop || mobile;
  }

  /**
   * Check if past reviews section has empty state
   */
  async isPastReviewsEmpty(): Promise<boolean> {
    const desktop = await this.pastReviewsEmptyState.isVisible().catch(() => false);
    const mobile = await this.mobilePastReviewsEmpty.isVisible().catch(() => false);
    return desktop || mobile;
  }

  /**
   * Check if replies section has empty state
   */
  async isRepliesEmpty(): Promise<boolean> {
    const desktop = await this.repliesEmptyState.isVisible().catch(() => false);
    const mobile = await this.mobileRepliesEmpty.isVisible().catch(() => false);
    return desktop || mobile;
  }

  /**
   * Check if loading state is visible
   */
  async isLoading(): Promise<boolean> {
    const toReviewLoading = await this.toReviewLoading.isVisible().catch(() => false);
    const pastReviewsLoading = await this.pastReviewsLoading.isVisible().catch(() => false);
    const repliesLoading = await this.repliesLoading.isVisible().catch(() => false);
    const mobileLoading = await this.mobileLoading.isVisible().catch(() => false);
    return toReviewLoading || pastReviewsLoading || repliesLoading || mobileLoading;
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(): Promise<void> {
    await this.toReviewLoading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.pastReviewsLoading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.repliesLoading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.mobileLoading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  /**
   * Get rating value from a review item
   */
  async getRatingValue(itemLocator: Locator): Promise<string | null> {
    const ratingValue = itemLocator.locator('[data-testid$="-rating-value"]').first();
    return await ratingValue.textContent();
  }

  /**
   * Get experience title from a review item
   */
  async getExperienceTitle(itemLocator: Locator): Promise<string | null> {
    const title = itemLocator.locator('[data-testid$="-experience-title"]').first();
    return await title.textContent();
  }

  /**
   * Check if hub reply exists on a review
   */
  async hasHubReply(itemLocator: Locator): Promise<boolean> {
    const hubReply = itemLocator.locator('[data-testid="hub-reply-box"], [data-testid="mobile-hub-reply-box"]');
    return await hubReply.isVisible().catch(() => false);
  }
}
