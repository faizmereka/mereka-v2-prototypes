import { test, expect } from '@playwright/test';
import { ExperienceReviewsPage } from '../../fixtures/reviews.page';
import { mockExperienceReviews, generateMockReview } from '../../helpers/reviews-e2e-helper';

/**
 * Experience Reviews E2E Tests
 *
 * Tests for AC-EDR-001 to AC-EDR-008
 */

test.describe('Experience Detail Reviews', () => {
  let experienceReviewsPage: ExperienceReviewsPage;

  test.beforeEach(async ({ page }) => {
    experienceReviewsPage = new ExperienceReviewsPage(page);
  });

  test.describe('Reviews Section Display', () => {
    test('AC-EDR-001: should display reviews section', async ({ page }) => {
      // Mock experience detail API
      await page.route(/\/api\/web\/experiences\/exp-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'exp-123',
              title: 'Photography Workshop',
              rating: 4.8,
              totalReviews: 15,
            },
          }),
        });
      });

      await mockExperienceReviews(page, [generateMockReview()]);

      await experienceReviewsPage.goto('exp-123');
      await experienceReviewsPage.scrollToReviews();

      await expect(experienceReviewsPage.reviewsSection).toBeVisible();
    });

    test('AC-EDR-002: should fetch reviews from API', async ({ page }) => {
      const reviews = [
        generateMockReview({ _id: 'review-1', content: 'Amazing workshop!' }),
        generateMockReview({ _id: 'review-2', content: 'Learned so much!' }),
      ];

      await page.route(/\/api\/web\/experiences\/exp-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'exp-123', title: 'Photography Workshop' },
          }),
        });
      });

      await mockExperienceReviews(page, reviews);

      await experienceReviewsPage.goto('exp-123');
      await experienceReviewsPage.scrollToReviews();
      await experienceReviewsPage.waitForLoad();

      const reviewCards = experienceReviewsPage.getAllReviewCards();
      await expect(reviewCards).toHaveCount(2);
    });

    test('AC-EDR-003: should display review stats header', async ({ page }) => {
      const reviews = [
        generateMockReview({ _id: 'review-1', rating: 5 }),
        generateMockReview({ _id: 'review-2', rating: 4 }),
        generateMockReview({ _id: 'review-3', rating: 5 }),
      ];

      await page.route(/\/api\/web\/experiences\/exp-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'exp-123',
              title: 'Photography Workshop',
              rating: 4.7,
              totalReviews: 3,
            },
          }),
        });
      });

      await mockExperienceReviews(page, reviews, { total: 3, page: 1, limit: 10 });

      await experienceReviewsPage.goto('exp-123');
      await experienceReviewsPage.scrollToReviews();
      await experienceReviewsPage.waitForLoad();

      await expect(experienceReviewsPage.statsSection).toBeVisible();
    });

    test('AC-EDR-006: should show review card details', async ({ page }) => {
      const review = generateMockReview({
        _id: 'detailed-review',
        rating: 5,
        content: 'Best photography workshop I have ever attended!',
        reviewer: {
          _id: 'user-1',
          name: 'Jane Smith',
          profileImage: 'https://via.placeholder.com/50',
        },
      });

      await page.route(/\/api\/web\/experiences\/exp-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'exp-123', title: 'Photography Workshop' },
          }),
        });
      });

      await mockExperienceReviews(page, [review]);

      await experienceReviewsPage.goto('exp-123');
      await experienceReviewsPage.scrollToReviews();
      await experienceReviewsPage.waitForLoad();

      const reviewCard = experienceReviewsPage.getReviewCard('detailed-review');
      await expect(reviewCard).toBeVisible();
      await expect(reviewCard).toContainText('Jane Smith');
      await expect(reviewCard).toContainText('Best photography workshop');
    });

    test('AC-EDR-008: should show empty state', async ({ page }) => {
      await page.route(/\/api\/web\/experiences\/exp-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'exp-123',
              title: 'New Workshop',
              rating: 0,
              totalReviews: 0,
            },
          }),
        });
      });

      await mockExperienceReviews(page, []);

      await experienceReviewsPage.goto('exp-123');
      await experienceReviewsPage.scrollToReviews();
      await experienceReviewsPage.waitForLoad();

      await expect(experienceReviewsPage.emptyState).toBeVisible();
    });
  });

  test.describe('Filters and Pagination', () => {
    test('AC-EDR-004: should filter by rating', async ({ page }) => {
      const reviews = [
        generateMockReview({ _id: 'review-5', rating: 5 }),
        generateMockReview({ _id: 'review-4', rating: 4 }),
        generateMockReview({ _id: 'review-3', rating: 3 }),
      ];

      await page.route(/\/api\/web\/experiences\/exp-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'exp-123', title: 'Photography Workshop' },
          }),
        });
      });

      await mockExperienceReviews(page, reviews);

      await experienceReviewsPage.goto('exp-123');
      await experienceReviewsPage.scrollToReviews();
      await experienceReviewsPage.waitForLoad();

      // Filter by 5-star
      await page.route(/\/api\/web\/experiences\/exp-123\/reviews\?.*rating=5/, (route) => {
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

      await experienceReviewsPage.filterByRating(5);

      const reviewCards = experienceReviewsPage.getAllReviewCards();
      await expect(reviewCards).toHaveCount(1);
    });

    test('AC-EDR-005: should paginate reviews', async ({ page }) => {
      const reviews = Array.from({ length: 20 }, (_, i) =>
        generateMockReview({ _id: `review-${i}` })
      );

      await page.route(/\/api\/web\/experiences\/exp-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'exp-123', title: 'Photography Workshop' },
          }),
        });
      });

      await mockExperienceReviews(page, reviews.slice(0, 10), { total: 20, page: 1, limit: 10 });

      await experienceReviewsPage.goto('exp-123');
      await experienceReviewsPage.scrollToReviews();
      await experienceReviewsPage.waitForLoad();

      await expect(experienceReviewsPage.pagination).toBeVisible();

      // First page should have 10 reviews
      const reviewCards = experienceReviewsPage.getAllReviewCards();
      await expect(reviewCards).toHaveCount(10);
    });

    test('AC-EDR-007: should show loading state', async ({ page }) => {
      await page.route(/\/api\/web\/experiences\/exp-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'exp-123', title: 'Photography Workshop' },
          }),
        });
      });

      // Delay the reviews response
      await page.route(/\/api\/web\/experiences\/exp-123\/reviews/, async (route) => {
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

      await experienceReviewsPage.goto('exp-123');
      await experienceReviewsPage.scrollToReviews();

      // Loading state should be visible initially
      await expect(experienceReviewsPage.loadingState).toBeVisible();

      // After loading, it should be hidden
      await experienceReviewsPage.waitForLoad();
      await expect(experienceReviewsPage.loadingState).not.toBeVisible();
    });
  });
});
