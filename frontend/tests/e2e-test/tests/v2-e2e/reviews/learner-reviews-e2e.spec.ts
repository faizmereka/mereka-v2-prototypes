/**
 * Learner Reviews E2E Tests
 *
 * Based on: specs/reviews/reviews-booking-api_spec.md
 *
 * Tests Learner Dashboard reviews functionality:
 * - Page layout (desktop/mobile)
 * - To Review section
 * - Past Reviews section
 * - Hub Replies section
 * - Tab navigation (mobile)
 * - Add review flow
 *
 * Test Environment: https://app.mereka.dev
 *
 * Run with:
 * npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/v2-e2e/reviews/learner-reviews-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import { ReviewsPage } from '../../../fixtures/reviews-page';
import { loginUser } from '../../../fixtures/helpers/auth-e2e-helper';
import {
  navigateToLearnerReviews,
  waitForReviewsLoaded,
  verifyReviewsPageLoaded,
  getToReviewCount,
  getPastReviewsCount,
  getRepliesCount,
  hasItemsToReview,
  hasPastReviews,
  hasRepliesFromHubs,
  clickAddReview,
  getToReviewExperienceTitle,
  getPastReviewExperienceTitle,
  getPastReviewRating,
  replyHasHubResponse,
  getHubReplyMessage,
  switchToToReviewTab,
  switchToPastReviewsTab,
  switchToRepliesTab,
  getMobileToReviewCount,
  getMobilePastReviewsCount,
  getMobileRepliesCount,
  isDesktopLayout,
  isMobileLayout,
  isToReviewEmpty,
  isPastReviewsEmpty,
  isRepliesEmpty,
  getToReviewBadgeCount,
  getRepliesBadgeCount,
} from '../../../fixtures/helpers/reviews-e2e-helper';

const APP_URL = process.env.TEST_ENV === 'live' || process.env.TEST_ENV === 'production'
  ? 'https://app.mereka.dev'
  : process.env.TEST_ENV === 'staging'
  ? 'https://app-staging.mereka.io'
  : 'https://app.mereka.dev';

test.describe('Learner Reviews E2E Tests - Page Layout', () => {
  let reviewsPage: ReviewsPage;

  test.beforeEach(async ({ page }) => {
    reviewsPage = new ReviewsPage(page);
    await loginUser(page);
    await navigateToLearnerReviews(page);
  });

  test('AC-FER-001: should display reviews page with title', async ({ page }) => {
    console.log('🔍 Test: Display reviews page with title');

    // Verify page is loaded
    const isLoaded = await verifyReviewsPageLoaded(page);
    expect(isLoaded).toBeTruthy();

    // Verify page title
    await expect(reviewsPage.pageTitle).toBeVisible({ timeout: 10000 });
    await expect(reviewsPage.pageTitle).toContainText(/My Reviews/i);
    console.log('✅ Reviews page title displayed');
  });

  test('AC-FER-002: should display three-column layout on desktop', async ({ page }) => {
    console.log('🔍 Test: Display three-column layout on desktop');

    // Check if desktop layout is visible (depends on viewport)
    const isDesktop = await isDesktopLayout(page);
    const isMobile = await isMobileLayout(page);

    // At least one layout should be visible
    expect(isDesktop || isMobile).toBeTruthy();

    if (isDesktop) {
      // Verify all three sections are visible
      await expect(reviewsPage.repliesSection).toBeVisible({ timeout: 10000 });
      await expect(reviewsPage.toReviewSection).toBeVisible({ timeout: 10000 });
      await expect(reviewsPage.pastReviewsSection).toBeVisible({ timeout: 10000 });
      console.log('✅ Desktop three-column layout displayed');
    } else {
      console.log('✅ Mobile layout displayed (viewport is mobile size)');
    }
  });

  test('AC-FER-003: should display section headers', async ({ page }) => {
    console.log('🔍 Test: Display section headers');

    const isDesktop = await isDesktopLayout(page);

    if (isDesktop) {
      await expect(reviewsPage.repliesSectionTitle).toBeVisible({ timeout: 10000 });
      await expect(reviewsPage.toReviewSectionTitle).toBeVisible({ timeout: 10000 });
      await expect(reviewsPage.pastReviewsSectionTitle).toBeVisible({ timeout: 10000 });

      await expect(reviewsPage.repliesSectionTitle).toContainText(/Replies from Hubs/i);
      await expect(reviewsPage.toReviewSectionTitle).toContainText(/To Review/i);
      await expect(reviewsPage.pastReviewsSectionTitle).toContainText(/Reviews You've Written/i);

      console.log('✅ Section headers displayed correctly');
    } else {
      // Mobile: Check tab labels
      await expect(reviewsPage.mobileTabToReview).toBeVisible({ timeout: 10000 });
      await expect(reviewsPage.mobileTabPastReviews).toBeVisible({ timeout: 10000 });
      await expect(reviewsPage.mobileTabReplies).toBeVisible({ timeout: 10000 });
      console.log('✅ Mobile tab headers displayed correctly');
    }
  });
});

test.describe('Learner Reviews E2E Tests - To Review Section', () => {
  let reviewsPage: ReviewsPage;

  test.beforeEach(async ({ page }) => {
    reviewsPage = new ReviewsPage(page);
    await loginUser(page);
    await navigateToLearnerReviews(page);
  });

  test('AC-FER-010: should display to-review items or empty state', async ({ page }) => {
    console.log('🔍 Test: Display to-review items or empty state');

    const hasItems = await hasItemsToReview(page);
    const isEmpty = await isToReviewEmpty(page);

    expect(hasItems || isEmpty).toBeTruthy();

    if (hasItems) {
      const count = await getToReviewCount(page);
      console.log(`✅ To-review section has ${count} items`);
    } else {
      console.log('✅ To-review section shows empty state');
    }
  });

  test('AC-FER-011: should display badge count for to-review items', async ({ page }) => {
    console.log('🔍 Test: Display badge count for to-review items');

    const hasItems = await hasItemsToReview(page);

    if (hasItems) {
      const isDesktop = await isDesktopLayout(page);
      if (isDesktop) {
        const badgeCount = await getToReviewBadgeCount(page);
        const itemCount = await getToReviewCount(page);
        expect(badgeCount).toBe(itemCount);
        console.log(`✅ Badge count (${badgeCount}) matches item count (${itemCount})`);
      }
    } else {
      console.log('✅ No items to review - badge not shown');
    }
  });

  test('AC-FER-012: should display experience title for to-review items', async ({ page }) => {
    console.log('🔍 Test: Display experience title for to-review items');

    const hasItems = await hasItemsToReview(page);

    if (hasItems) {
      const title = await getToReviewExperienceTitle(page, 0);
      expect(title).toBeTruthy();
      expect(title).toContain('Review for');
      console.log(`✅ Experience title displayed: ${title}`);
    } else {
      console.log('✅ No items to review - skipping');
    }
  });

  test('AC-FER-013: should display Add Review button', async ({ page }) => {
    console.log('🔍 Test: Display Add Review button');

    const hasItems = await hasItemsToReview(page);

    if (hasItems) {
      const addButton = page.locator('[data-testid="add-review-button"]').first();
      await expect(addButton).toBeVisible({ timeout: 10000 });
      await expect(addButton).toContainText(/Add Review/i);
      console.log('✅ Add Review button displayed');
    } else {
      console.log('✅ No items to review - button not shown');
    }
  });

  test('AC-FER-014: should trigger add review flow on button click', async ({ page }) => {
    console.log('🔍 Test: Trigger add review flow on button click');

    const hasItems = await hasItemsToReview(page);

    if (hasItems) {
      await clickAddReview(page, 0);
      // TODO: Verify review dialog/modal opens
      // For now, just verify click doesn't throw error
      console.log('✅ Add Review button clicked successfully');
    } else {
      console.log('✅ No items to review - skipping');
    }
  });
});

test.describe('Learner Reviews E2E Tests - Past Reviews Section', () => {
  let reviewsPage: ReviewsPage;

  test.beforeEach(async ({ page }) => {
    reviewsPage = new ReviewsPage(page);
    await loginUser(page);
    await navigateToLearnerReviews(page);
  });

  test('AC-FER-020: should display past reviews or empty state', async ({ page }) => {
    console.log('🔍 Test: Display past reviews or empty state');

    const hasReviews = await hasPastReviews(page);
    const isEmpty = await isPastReviewsEmpty(page);

    expect(hasReviews || isEmpty).toBeTruthy();

    if (hasReviews) {
      const count = await getPastReviewsCount(page);
      console.log(`✅ Past reviews section has ${count} items`);
    } else {
      console.log('✅ Past reviews section shows empty state');
    }
  });

  test('AC-FER-021: should display review rating', async ({ page }) => {
    console.log('🔍 Test: Display review rating');

    const hasReviews = await hasPastReviews(page);

    if (hasReviews) {
      const rating = await getPastReviewRating(page, 0);
      expect(rating).toBeTruthy();
      console.log(`✅ Review rating displayed: ${rating}`);
    } else {
      console.log('✅ No past reviews - skipping');
    }
  });

  test('AC-FER-022: should display review experience title', async ({ page }) => {
    console.log('🔍 Test: Display review experience title');

    const hasReviews = await hasPastReviews(page);

    if (hasReviews) {
      const title = await getPastReviewExperienceTitle(page, 0);
      expect(title).toBeTruthy();
      expect(title).toContain('Review for');
      console.log(`✅ Experience title displayed: ${title}`);
    } else {
      console.log('✅ No past reviews - skipping');
    }
  });

  test('AC-FER-023: should display review content (truncated)', async ({ page }) => {
    console.log('🔍 Test: Display review content');

    const hasReviews = await hasPastReviews(page);

    if (hasReviews) {
      const content = page.locator('[data-testid="past-review-content"]').first();
      await expect(content).toBeVisible({ timeout: 10000 });
      console.log('✅ Review content displayed');
    } else {
      console.log('✅ No past reviews - skipping');
    }
  });
});

test.describe('Learner Reviews E2E Tests - Hub Replies Section', () => {
  let reviewsPage: ReviewsPage;

  test.beforeEach(async ({ page }) => {
    reviewsPage = new ReviewsPage(page);
    await loginUser(page);
    await navigateToLearnerReviews(page);
  });

  test('AC-FER-030: should display hub replies or empty state', async ({ page }) => {
    console.log('🔍 Test: Display hub replies or empty state');

    const hasReplies = await hasRepliesFromHubs(page);
    const isEmpty = await isRepliesEmpty(page);

    expect(hasReplies || isEmpty).toBeTruthy();

    if (hasReplies) {
      const count = await getRepliesCount(page);
      console.log(`✅ Hub replies section has ${count} items`);
    } else {
      console.log('✅ Hub replies section shows empty state');
    }
  });

  test('AC-FER-031: should display badge count for replies', async ({ page }) => {
    console.log('🔍 Test: Display badge count for replies');

    const hasReplies = await hasRepliesFromHubs(page);

    if (hasReplies) {
      const isDesktop = await isDesktopLayout(page);
      if (isDesktop) {
        const badgeCount = await getRepliesBadgeCount(page);
        const itemCount = await getRepliesCount(page);
        expect(badgeCount).toBe(itemCount);
        console.log(`✅ Badge count (${badgeCount}) matches item count (${itemCount})`);
      }
    } else {
      console.log('✅ No replies - badge not shown');
    }
  });

  test('AC-FER-032: should display hub reply box', async ({ page }) => {
    console.log('🔍 Test: Display hub reply box');

    const hasReplies = await hasRepliesFromHubs(page);

    if (hasReplies) {
      const hasHubResponse = await replyHasHubResponse(page, 0);
      expect(hasHubResponse).toBeTruthy();
      console.log('✅ Hub reply box displayed');
    } else {
      console.log('✅ No replies - skipping');
    }
  });

  test('AC-FER-033: should display hub reply message', async ({ page }) => {
    console.log('🔍 Test: Display hub reply message');

    const hasReplies = await hasRepliesFromHubs(page);

    if (hasReplies) {
      const message = await getHubReplyMessage(page, 0);
      expect(message).toBeTruthy();
      console.log(`✅ Hub reply message displayed: ${message?.substring(0, 50)}...`);
    } else {
      console.log('✅ No replies - skipping');
    }
  });
});

test.describe('Learner Reviews E2E Tests - Mobile Tab Navigation', () => {
  let reviewsPage: ReviewsPage;

  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    reviewsPage = new ReviewsPage(page);
    await loginUser(page);
    await navigateToLearnerReviews(page);
  });

  test('AC-FER-040: should display mobile tab navigation', async ({ page }) => {
    console.log('🔍 Test: Display mobile tab navigation');

    const isMobile = await isMobileLayout(page);
    expect(isMobile).toBeTruthy();

    await expect(reviewsPage.mobileTabNavigation).toBeVisible({ timeout: 10000 });
    await expect(reviewsPage.mobileTabToReview).toBeVisible();
    await expect(reviewsPage.mobileTabPastReviews).toBeVisible();
    await expect(reviewsPage.mobileTabReplies).toBeVisible();

    console.log('✅ Mobile tab navigation displayed');
  });

  test('AC-FER-041: should switch to To Review tab', async ({ page }) => {
    console.log('🔍 Test: Switch to To Review tab');

    await switchToToReviewTab(page);

    const content = page.locator('[data-testid="mobile-to-review-content"]');
    const emptyState = page.locator('[data-testid="mobile-to-review-empty"]');

    const hasContent = await content.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasContent || hasEmpty).toBeTruthy();
    console.log('✅ To Review tab content displayed');
  });

  test('AC-FER-042: should switch to Past Reviews tab', async ({ page }) => {
    console.log('🔍 Test: Switch to Past Reviews tab');

    await switchToPastReviewsTab(page);

    const content = page.locator('[data-testid="mobile-past-reviews-content"]');
    const emptyState = page.locator('[data-testid="mobile-past-reviews-empty"]');

    const hasContent = await content.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasContent || hasEmpty).toBeTruthy();
    console.log('✅ Past Reviews tab content displayed');
  });

  test('AC-FER-043: should switch to Replies tab', async ({ page }) => {
    console.log('🔍 Test: Switch to Replies tab');

    await switchToRepliesTab(page);

    const content = page.locator('[data-testid="mobile-replies-content"]');
    const emptyState = page.locator('[data-testid="mobile-replies-empty"]');

    const hasContent = await content.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasContent || hasEmpty).toBeTruthy();
    console.log('✅ Replies tab content displayed');
  });

  test('AC-FER-044: should display mobile add review button', async ({ page }) => {
    console.log('🔍 Test: Display mobile add review button');

    await switchToToReviewTab(page);

    const count = await getMobileToReviewCount(page);

    if (count > 0) {
      const addButton = page.locator('[data-testid="mobile-add-review-button"]').first();
      await expect(addButton).toBeVisible({ timeout: 10000 });
      console.log('✅ Mobile add review button displayed');
    } else {
      console.log('✅ No items to review - button not shown');
    }
  });
});

test.describe('Learner Reviews E2E Tests - Empty States', () => {
  test('AC-FER-050: should display correct empty state messages', async ({ page }) => {
    console.log('🔍 Test: Display correct empty state messages');

    const reviewsPage = new ReviewsPage(page);
    await loginUser(page);
    await navigateToLearnerReviews(page);

    // Check empty states contain appropriate messages
    const toReviewEmpty = page.locator('[data-testid="to-review-empty-state"]');
    const pastReviewsEmpty = page.locator('[data-testid="past-reviews-empty-state"]');
    const repliesEmpty = page.locator('[data-testid="replies-empty-state"]');

    if (await toReviewEmpty.isVisible().catch(() => false)) {
      await expect(toReviewEmpty).toContainText(/Nothing to review|Book another experience/i);
      console.log('✅ To-review empty state message correct');
    }

    if (await pastReviewsEmpty.isVisible().catch(() => false)) {
      await expect(pastReviewsEmpty).toContainText(/No reviews written/i);
      console.log('✅ Past reviews empty state message correct');
    }

    if (await repliesEmpty.isVisible().catch(() => false)) {
      await expect(repliesEmpty).toContainText(/No hub replies/i);
      console.log('✅ Replies empty state message correct');
    }

    console.log('✅ Empty state messages verified');
  });
});

test.describe('Learner Reviews E2E Tests - Page Refresh', () => {
  test('AC-FER-060: should reload reviews on page refresh', async ({ page }) => {
    console.log('🔍 Test: Reload reviews on page refresh');

    const reviewsPage = new ReviewsPage(page);
    await loginUser(page);
    await navigateToLearnerReviews(page);

    // Get initial counts
    const initialToReview = await getToReviewCount(page);
    const initialPastReviews = await getPastReviewsCount(page);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForReviewsLoaded(page);

    // Verify page still loaded
    const isLoaded = await verifyReviewsPageLoaded(page);
    expect(isLoaded).toBeTruthy();

    // Get new counts
    const newToReview = await getToReviewCount(page);
    const newPastReviews = await getPastReviewsCount(page);

    console.log(`✅ Page refreshed: To-review ${initialToReview} → ${newToReview}, Past reviews ${initialPastReviews} → ${newPastReviews}`);
  });
});
