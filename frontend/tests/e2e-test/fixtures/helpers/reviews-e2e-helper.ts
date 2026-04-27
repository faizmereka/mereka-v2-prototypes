/**
 * Reviews E2E Helper Functions
 *
 * Helper functions for reviews-related E2E tests
 * Provides common operations for Learner Reviews flows
 */

import { Page, expect } from '@playwright/test';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://app-staging.mereka.io'
  : 'https://app.mereka.dev';

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Navigate to Learner Reviews page
 */
export async function navigateToLearnerReviews(page: Page): Promise<void> {
  await page.goto(`${APP_URL}/dashboard/reviews`);
  await page.waitForLoadState('networkidle');

  // Wait for page to load
  const reviewsPage = page.locator('[data-testid="reviews-page"]');
  await expect(reviewsPage).toBeVisible({ timeout: 15000 });

  // Wait for loading states to complete
  await waitForReviewsLoaded(page);

  console.log('✅ Navigated to Learner reviews');
}

/**
 * Wait for reviews to finish loading
 */
export async function waitForReviewsLoaded(page: Page): Promise<void> {
  // Wait for all loading states to disappear
  const loadingSelectors = [
    '[data-testid="to-review-loading"]',
    '[data-testid="past-reviews-loading"]',
    '[data-testid="replies-loading"]',
    '[data-testid="mobile-loading"]',
  ];

  for (const selector of loadingSelectors) {
    await page.locator(selector).waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
}

/**
 * Verify reviews page is loaded correctly
 */
export async function verifyReviewsPageLoaded(page: Page): Promise<boolean> {
  const reviewsPage = page.locator('[data-testid="reviews-page"]');
  return await reviewsPage.isVisible({ timeout: 10000 });
}

// ============================================================================
// Desktop Section Helpers
// ============================================================================

/**
 * Get count of items pending review
 */
export async function getToReviewCount(page: Page): Promise<number> {
  return await page.locator('[data-testid^="to-review-item-"]').count();
}

/**
 * Get count of past reviews
 */
export async function getPastReviewsCount(page: Page): Promise<number> {
  return await page.locator('[data-testid^="past-review-item-"]').count();
}

/**
 * Get count of hub replies
 */
export async function getRepliesCount(page: Page): Promise<number> {
  return await page.locator('[data-testid^="reply-item-"]').count();
}

/**
 * Check if to-review section has items
 */
export async function hasItemsToReview(page: Page): Promise<boolean> {
  const count = await getToReviewCount(page);
  return count > 0;
}

/**
 * Check if user has past reviews
 */
export async function hasPastReviews(page: Page): Promise<boolean> {
  const count = await getPastReviewsCount(page);
  return count > 0;
}

/**
 * Check if user has replies from hubs
 */
export async function hasRepliesFromHubs(page: Page): Promise<boolean> {
  const count = await getRepliesCount(page);
  return count > 0;
}

/**
 * Click add review button for a specific to-review item
 */
export async function clickAddReview(page: Page, index: number = 0): Promise<void> {
  const addButton = page.locator('[data-testid="add-review-button"]').nth(index);
  await addButton.waitFor({ state: 'visible', timeout: 10000 });
  await addButton.click();
  await page.waitForTimeout(500);
  console.log(`✅ Clicked add review button for item ${index}`);
}

/**
 * Get experience title from to-review item
 */
export async function getToReviewExperienceTitle(page: Page, index: number = 0): Promise<string | null> {
  const title = page.locator('[data-testid^="to-review-item-"]').nth(index).locator('[data-testid="to-review-experience-title"]');
  return await title.textContent();
}

/**
 * Get experience title from past review item
 */
export async function getPastReviewExperienceTitle(page: Page, index: number = 0): Promise<string | null> {
  const title = page.locator('[data-testid^="past-review-item-"]').nth(index).locator('[data-testid="past-review-experience-title"]');
  return await title.textContent();
}

/**
 * Get rating value from past review item
 */
export async function getPastReviewRating(page: Page, index: number = 0): Promise<string | null> {
  const rating = page.locator('[data-testid^="past-review-item-"]').nth(index).locator('[data-testid="past-review-rating-value"]');
  return await rating.textContent();
}

/**
 * Get review content from past review item
 */
export async function getPastReviewContent(page: Page, index: number = 0): Promise<string | null> {
  const content = page.locator('[data-testid^="past-review-item-"]').nth(index).locator('[data-testid="past-review-content"]');
  return await content.textContent();
}

/**
 * Check if a reply item has hub response
 */
export async function replyHasHubResponse(page: Page, index: number = 0): Promise<boolean> {
  const hubReplyBox = page.locator('[data-testid^="reply-item-"]').nth(index).locator('[data-testid="hub-reply-box"]');
  return await hubReplyBox.isVisible().catch(() => false);
}

/**
 * Get hub reply message
 */
export async function getHubReplyMessage(page: Page, index: number = 0): Promise<string | null> {
  const message = page.locator('[data-testid^="reply-item-"]').nth(index).locator('[data-testid="hub-reply-message"]');
  return await message.textContent();
}

// ============================================================================
// Mobile Tab Helpers
// ============================================================================

/**
 * Switch to To Review tab (mobile)
 */
export async function switchToToReviewTab(page: Page): Promise<void> {
  const tab = page.locator('[data-testid="mobile-tab-to-review"]');
  await tab.waitFor({ state: 'visible', timeout: 10000 });
  await tab.click();
  await page.waitForTimeout(300);
  console.log('✅ Switched to To Review tab');
}

/**
 * Switch to Past Reviews tab (mobile)
 */
export async function switchToPastReviewsTab(page: Page): Promise<void> {
  const tab = page.locator('[data-testid="mobile-tab-past-reviews"]');
  await tab.waitFor({ state: 'visible', timeout: 10000 });
  await tab.click();
  await page.waitForTimeout(300);
  console.log('✅ Switched to Past Reviews tab');
}

/**
 * Switch to Replies tab (mobile)
 */
export async function switchToRepliesTab(page: Page): Promise<void> {
  const tab = page.locator('[data-testid="mobile-tab-replies"]');
  await tab.waitFor({ state: 'visible', timeout: 10000 });
  await tab.click();
  await page.waitForTimeout(300);
  console.log('✅ Switched to Replies tab');
}

/**
 * Get mobile to-review count
 */
export async function getMobileToReviewCount(page: Page): Promise<number> {
  return await page.locator('[data-testid^="mobile-to-review-item-"]').count();
}

/**
 * Get mobile past reviews count
 */
export async function getMobilePastReviewsCount(page: Page): Promise<number> {
  return await page.locator('[data-testid^="mobile-past-review-item-"]').count();
}

/**
 * Get mobile replies count
 */
export async function getMobileRepliesCount(page: Page): Promise<number> {
  return await page.locator('[data-testid^="mobile-reply-item-"]').count();
}

/**
 * Click mobile add review button
 */
export async function clickMobileAddReview(page: Page, index: number = 0): Promise<void> {
  const addButton = page.locator('[data-testid="mobile-add-review-button"]').nth(index);
  await addButton.waitFor({ state: 'visible', timeout: 10000 });
  await addButton.click();
  await page.waitForTimeout(500);
  console.log(`✅ Clicked mobile add review button for item ${index}`);
}

// ============================================================================
// Layout Detection Helpers
// ============================================================================

/**
 * Check if desktop layout is visible
 */
export async function isDesktopLayout(page: Page): Promise<boolean> {
  return await page.locator('[data-testid="reviews-desktop-layout"]').isVisible().catch(() => false);
}

/**
 * Check if mobile layout is visible
 */
export async function isMobileLayout(page: Page): Promise<boolean> {
  return await page.locator('[data-testid="reviews-mobile-layout"]').isVisible().catch(() => false);
}

// ============================================================================
// Empty State Helpers
// ============================================================================

/**
 * Check if to-review section is empty
 */
export async function isToReviewEmpty(page: Page): Promise<boolean> {
  const desktop = await page.locator('[data-testid="to-review-empty-state"]').isVisible().catch(() => false);
  const mobile = await page.locator('[data-testid="mobile-to-review-empty"]').isVisible().catch(() => false);
  return desktop || mobile;
}

/**
 * Check if past reviews section is empty
 */
export async function isPastReviewsEmpty(page: Page): Promise<boolean> {
  const desktop = await page.locator('[data-testid="past-reviews-empty-state"]').isVisible().catch(() => false);
  const mobile = await page.locator('[data-testid="mobile-past-reviews-empty"]').isVisible().catch(() => false);
  return desktop || mobile;
}

/**
 * Check if replies section is empty
 */
export async function isRepliesEmpty(page: Page): Promise<boolean> {
  const desktop = await page.locator('[data-testid="replies-empty-state"]').isVisible().catch(() => false);
  const mobile = await page.locator('[data-testid="mobile-replies-empty"]').isVisible().catch(() => false);
  return desktop || mobile;
}

// ============================================================================
// Badge Count Helpers
// ============================================================================

/**
 * Get badge count for to-review section
 */
export async function getToReviewBadgeCount(page: Page): Promise<number> {
  const badge = page.locator('[data-testid="to-review-count-badge"]');
  const isVisible = await badge.isVisible().catch(() => false);
  if (!isVisible) return 0;
  const text = await badge.textContent();
  return parseInt(text || '0', 10);
}

/**
 * Get badge count for replies section
 */
export async function getRepliesBadgeCount(page: Page): Promise<number> {
  const badge = page.locator('[data-testid="replies-count-badge"]');
  const isVisible = await badge.isVisible().catch(() => false);
  if (!isVisible) return 0;
  const text = await badge.textContent();
  return parseInt(text || '0', 10);
}

/**
 * Get mobile tab badge count for to-review
 */
export async function getMobileToReviewBadgeCount(page: Page): Promise<number> {
  const badge = page.locator('[data-testid="mobile-tab-to-review-badge"]');
  const isVisible = await badge.isVisible().catch(() => false);
  if (!isVisible) return 0;
  const text = await badge.textContent();
  return parseInt(text || '0', 10);
}

/**
 * Get mobile tab badge count for replies
 */
export async function getMobileRepliesBadgeCount(page: Page): Promise<number> {
  const badge = page.locator('[data-testid="mobile-tab-replies-badge"]');
  const isVisible = await badge.isVisible().catch(() => false);
  if (!isVisible) return 0;
  const text = await badge.textContent();
  return parseInt(text || '0', 10);
}
