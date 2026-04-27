import { test, expect } from '@playwright/test';
import { ExpertiseReviewsPage } from '../../fixtures/reviews.page';
import { mockExpertiseReviews, generateMockReview } from '../../helpers/reviews-e2e-helper';

/**
 * Expertise Reviews E2E Tests
 *
 * Tests for AC-XDR-001 to AC-XDR-008
 */

test.describe('Expertise Detail Reviews', () => {
  let expertiseReviewsPage: ExpertiseReviewsPage;

  test.beforeEach(async ({ page }) => {
    expertiseReviewsPage = new ExpertiseReviewsPage(page);
  });

  test.describe('Reviews Section Display', () => {
    test('AC-XDR-001: should display reviews section', async ({ page }) => {
      // Mock expertise detail API
      await page.route(/\/api\/web\/expertise\/coaching-session$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'expertise-123',
              slug: 'coaching-session',
              expertiseTitle: 'Business Coaching Session',
              rating: 4.9,
              totalReviews: 25,
            },
          }),
        });
      });

      await mockExpertiseReviews(page, [generateMockReview()]);

      await expertiseReviewsPage.goto('coaching-session');
      await expertiseReviewsPage.scrollToReviews();

      await expect(expertiseReviewsPage.reviewsSection).toBeVisible();
    });

    test('AC-XDR-002: should fetch reviews from API', async ({ page }) => {
      const reviews = [
        generateMockReview({ _id: 'review-1', content: 'Very insightful session!' }),
        generateMockReview({ _id: 'review-2', content: 'Great advice for my business!' }),
        generateMockReview({ _id: 'review-3', content: 'Highly professional!' }),
      ];

      await page.route(/\/api\/web\/expertise\/coaching-session$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'expertise-123',
              slug: 'coaching-session',
              expertiseTitle: 'Business Coaching Session',
            },
          }),
        });
      });

      await mockExpertiseReviews(page, reviews);

      await expertiseReviewsPage.goto('coaching-session');
      await expertiseReviewsPage.scrollToReviews();
      await expertiseReviewsPage.waitForLoad();

      const reviewCards = expertiseReviewsPage.getAllReviewCards();
      await expect(reviewCards).toHaveCount(3);
    });

    test('AC-XDR-003: should display review stats header', async ({ page }) => {
      const reviews = [
        generateMockReview({ _id: 'review-1', rating: 5 }),
        generateMockReview({ _id: 'review-2', rating: 5 }),
        generateMockReview({ _id: 'review-3', rating: 4 }),
      ];

      await page.route(/\/api\/web\/expertise\/coaching-session$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'expertise-123',
              slug: 'coaching-session',
              expertiseTitle: 'Business Coaching Session',
              rating: 4.7,
              totalReviews: 3,
            },
          }),
        });
      });

      await mockExpertiseReviews(page, reviews, { total: 3, page: 1, limit: 10 });

      await expertiseReviewsPage.goto('coaching-session');
      await expertiseReviewsPage.scrollToReviews();
      await expertiseReviewsPage.waitForLoad();

      await expect(expertiseReviewsPage.statsSection).toBeVisible();
    });

    test('AC-XDR-006: should show review card details', async ({ page }) => {
      const review = generateMockReview({
        _id: 'detailed-review',
        rating: 5,
        content: 'The coaching session was transformative! Highly recommend to anyone.',
        reviewer: {
          _id: 'user-1',
          name: 'Sarah Johnson',
          profileImage: 'https://via.placeholder.com/50',
        },
      });

      await page.route(/\/api\/web\/expertise\/coaching-session$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'expertise-123',
              slug: 'coaching-session',
              expertiseTitle: 'Business Coaching Session',
            },
          }),
        });
      });

      await mockExpertiseReviews(page, [review]);

      await expertiseReviewsPage.goto('coaching-session');
      await expertiseReviewsPage.scrollToReviews();
      await expertiseReviewsPage.waitForLoad();

      const reviewCard = expertiseReviewsPage.getReviewCard('detailed-review');
      await expect(reviewCard).toBeVisible();
      await expect(reviewCard).toContainText('Sarah Johnson');
      await expect(reviewCard).toContainText('coaching session was transformative');
    });

    test('AC-XDR-008: should show empty state', async ({ page }) => {
      await page.route(/\/api\/web\/expertise\/new-expertise$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'expertise-new',
              slug: 'new-expertise',
              expertiseTitle: 'New Expertise Service',
              rating: 0,
              totalReviews: 0,
            },
          }),
        });
      });

      await mockExpertiseReviews(page, []);

      await expertiseReviewsPage.goto('new-expertise');
      await expertiseReviewsPage.scrollToReviews();
      await expertiseReviewsPage.waitForLoad();

      await expect(expertiseReviewsPage.emptyState).toBeVisible();
    });
  });

  test.describe('Filters and Pagination', () => {
    test('AC-XDR-004: should filter by rating', async ({ page }) => {
      const reviews = [
        generateMockReview({ _id: 'review-5', rating: 5 }),
        generateMockReview({ _id: 'review-4', rating: 4 }),
        generateMockReview({ _id: 'review-3', rating: 3 }),
      ];

      await page.route(/\/api\/web\/expertise\/coaching-session$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'expertise-123',
              slug: 'coaching-session',
              expertiseTitle: 'Business Coaching Session',
            },
          }),
        });
      });

      await mockExpertiseReviews(page, reviews);

      await expertiseReviewsPage.goto('coaching-session');
      await expertiseReviewsPage.scrollToReviews();
      await expertiseReviewsPage.waitForLoad();

      // Filter by 5-star
      await page.route(/\/api\/web\/expertise\/[^/]+\/reviews\?.*rating=5/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [reviews[0]],
            meta: { total: 1, page: 1, limit: 10 },
          }),
        });
      });

      await expertiseReviewsPage.filterByRating(5);

      const reviewCards = expertiseReviewsPage.getAllReviewCards();
      await expect(reviewCards).toHaveCount(1);
    });

    test('AC-XDR-005: should paginate reviews', async ({ page }) => {
      const reviews = Array.from({ length: 25 }, (_, i) =>
        generateMockReview({ _id: `review-${i}` })
      );

      await page.route(/\/api\/web\/expertise\/coaching-session$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'expertise-123',
              slug: 'coaching-session',
              expertiseTitle: 'Business Coaching Session',
            },
          }),
        });
      });

      await mockExpertiseReviews(page, reviews.slice(0, 10), { total: 25, page: 1, limit: 10 });

      await expertiseReviewsPage.goto('coaching-session');
      await expertiseReviewsPage.scrollToReviews();
      await expertiseReviewsPage.waitForLoad();

      await expect(expertiseReviewsPage.pagination).toBeVisible();

      // First page should have 10 reviews
      const reviewCards = expertiseReviewsPage.getAllReviewCards();
      await expect(reviewCards).toHaveCount(10);
    });

    test('AC-XDR-007: should show loading state', async ({ page }) => {
      await page.route(/\/api\/web\/expertise\/coaching-session$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'expertise-123',
              slug: 'coaching-session',
              expertiseTitle: 'Business Coaching Session',
            },
          }),
        });
      });

      // Delay the reviews response
      await page.route(/\/api\/web\/expertise\/[^/]+\/reviews/, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [generateMockReview()],
          }),
        });
      });

      await expertiseReviewsPage.goto('coaching-session');
      await expertiseReviewsPage.scrollToReviews();

      // Loading state should be visible initially
      await expect(expertiseReviewsPage.loadingState).toBeVisible();

      // After loading, it should be hidden
      await expertiseReviewsPage.waitForLoad();
      await expect(expertiseReviewsPage.loadingState).not.toBeVisible();
    });
  });
});
