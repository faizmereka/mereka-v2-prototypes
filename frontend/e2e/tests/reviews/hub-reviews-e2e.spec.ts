import { test, expect } from '@playwright/test';
import { HubReviewsPage } from '../../fixtures/reviews.page';
import { mockHubReviews, generateMockReview } from '../../helpers/reviews-e2e-helper';

/**
 * Hub Detail Reviews E2E Tests
 *
 * Tests for AC-HDR-001 to AC-HDR-010
 */

test.describe('Hub Detail Reviews', () => {
  let hubReviewsPage: HubReviewsPage;

  test.beforeEach(async ({ page }) => {
    hubReviewsPage = new HubReviewsPage(page);
  });

  test.describe('Reviews Tab', () => {
    test('AC-HDR-001: should display Reviews tab in hub detail', async ({ page }) => {
      // Mock hub detail API
      await page.route(/\/api\/web\/hubs\/test-hub$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'hub-123',
              slug: 'test-hub',
              name: 'Test Hub',
              totalReviews: 25,
              rating: 4.5,
            },
          }),
        });
      });

      await mockHubReviews(page, []);

      await page.goto('/hub/test-hub');
      await page.waitForLoadState('networkidle');

      await expect(hubReviewsPage.reviewsTab).toBeVisible();
    });

    test('AC-HDR-010: should show empty state when no reviews', async ({ page }) => {
      await page.route(/\/api\/web\/hubs\/test-hub$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'hub-123', slug: 'test-hub', name: 'Test Hub' },
          }),
        });
      });

      await mockHubReviews(page, []);

      await hubReviewsPage.goto('test-hub');
      await hubReviewsPage.waitForLoad();

      await expect(hubReviewsPage.emptyState).toBeVisible();
    });
  });

  test.describe('Reviews Display', () => {
    test('AC-HDR-002: should aggregate reviews from all sources', async ({ page }) => {
      const reviews = [
        generateMockReview({ _id: 'review-1', content: 'Experience review' }),
        generateMockReview({ _id: 'review-2', content: 'Expertise review' }),
        generateMockReview({ _id: 'review-3', content: 'Contract review' }),
      ];

      await page.route(/\/api\/web\/hubs\/test-hub$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'hub-123', slug: 'test-hub', name: 'Test Hub' },
          }),
        });
      });

      await mockHubReviews(page, reviews, { avgRating: 4.7, totalReviews: 3 });

      await hubReviewsPage.goto('test-hub');
      await hubReviewsPage.waitForLoad();

      const reviewCards = hubReviewsPage.getAllReviewCards();
      await expect(reviewCards).toHaveCount(3);
    });

    test('AC-HDR-003: should display review stats card', async ({ page }) => {
      const reviews = [
        generateMockReview({ _id: 'review-1', rating: 5 }),
        generateMockReview({ _id: 'review-2', rating: 4 }),
      ];

      await page.route(/\/api\/web\/hubs\/test-hub$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'hub-123', slug: 'test-hub', name: 'Test Hub' },
          }),
        });
      });

      await mockHubReviews(page, reviews, { avgRating: 4.5, totalReviews: 2 });

      await hubReviewsPage.goto('test-hub');
      await hubReviewsPage.waitForLoad();

      await expect(hubReviewsPage.statsSection).toBeVisible();
      await expect(hubReviewsPage.avgRating).toContainText('4.5');
      await expect(hubReviewsPage.totalCount).toContainText('2');
    });

    test('AC-HDR-007: should show review card with all details', async ({ page }) => {
      const review = generateMockReview({
        _id: 'detailed-review',
        rating: 5,
        content: 'Fantastic experience! Highly recommend this hub.',
        reviewer: {
          _id: 'reviewer-1',
          name: 'John Doe',
          profileImage: 'https://via.placeholder.com/50',
        },
      });

      await page.route(/\/api\/web\/hubs\/test-hub$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'hub-123', slug: 'test-hub', name: 'Test Hub' },
          }),
        });
      });

      await mockHubReviews(page, [review]);

      await hubReviewsPage.goto('test-hub');
      await hubReviewsPage.waitForLoad();

      const reviewCard = hubReviewsPage.getReviewCard('detailed-review');
      await expect(reviewCard).toBeVisible();
      await expect(reviewCard).toContainText('John Doe');
      await expect(reviewCard).toContainText('Fantastic experience');
    });

    test('AC-HDR-008: should display service name on review', async ({ page }) => {
      const review = {
        ...generateMockReview({ _id: 'service-review' }),
        serviceName: 'Photography Workshop',
        serviceType: 'experience',
      };

      await page.route(/\/api\/web\/hubs\/test-hub$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'hub-123', slug: 'test-hub', name: 'Test Hub' },
          }),
        });
      });

      await mockHubReviews(page, [review]);

      await hubReviewsPage.goto('test-hub');
      await hubReviewsPage.waitForLoad();

      const serviceName = hubReviewsPage.getReviewServiceName('service-review');
      await expect(serviceName).toContainText('Photography Workshop');
    });

    test('AC-HDR-009: should show hub reply when exists', async ({ page }) => {
      const reviewWithReply = generateMockReview({
        _id: 'review-with-reply',
        reply: {
          content: 'Thank you for your wonderful feedback!',
          createdAt: new Date().toISOString(),
        },
      });

      await page.route(/\/api\/web\/hubs\/test-hub$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'hub-123', slug: 'test-hub', name: 'Test Hub' },
          }),
        });
      });

      await mockHubReviews(page, [reviewWithReply]);

      await hubReviewsPage.goto('test-hub');
      await hubReviewsPage.waitForLoad();

      const reviewCard = hubReviewsPage.getReviewCard('review-with-reply');
      await expect(reviewCard).toContainText('Thank you for your wonderful feedback');
    });
  });

  test.describe('Filters', () => {
    test('AC-HDR-004: should filter reviews by type', async ({ page }) => {
      const reviews = [
        { ...generateMockReview({ _id: 'exp-review' }), serviceType: 'experience' },
        { ...generateMockReview({ _id: 'expertise-review' }), serviceType: 'expertise' },
        { ...generateMockReview({ _id: 'contract-review' }), serviceType: 'contract' },
      ];

      await page.route(/\/api\/web\/hubs\/test-hub$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'hub-123', slug: 'test-hub', name: 'Test Hub' },
          }),
        });
      });

      // Initially return all reviews
      await mockHubReviews(page, reviews);

      await hubReviewsPage.goto('test-hub');
      await hubReviewsPage.waitForLoad();

      // Filter by experiences
      await page.route(/\/api\/web\/hubs\/test-hub\/reviews\?.*type=experience/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [reviews[0]],
          }),
        });
      });

      await hubReviewsPage.filterByType('experiences');

      const reviewCards = hubReviewsPage.getAllReviewCards();
      await expect(reviewCards).toHaveCount(1);
    });

    test('AC-HDR-005: should filter reviews by rating', async ({ page }) => {
      const reviews = [
        generateMockReview({ _id: 'review-5star', rating: 5 }),
        generateMockReview({ _id: 'review-4star', rating: 4 }),
        generateMockReview({ _id: 'review-3star', rating: 3 }),
      ];

      await page.route(/\/api\/web\/hubs\/test-hub$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'hub-123', slug: 'test-hub', name: 'Test Hub' },
          }),
        });
      });

      await mockHubReviews(page, reviews);

      await hubReviewsPage.goto('test-hub');
      await hubReviewsPage.waitForLoad();

      // Filter by 5-star
      await page.route(/\/api\/web\/hubs\/test-hub\/reviews\?.*rating=5/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [reviews[0]],
          }),
        });
      });

      await hubReviewsPage.filterByRating(5);

      // Should only show 5-star reviews
      await expect(hubReviewsPage.getReviewCard('review-5star')).toBeVisible();
    });

    test('AC-HDR-006: should paginate reviews', async ({ page }) => {
      // Generate 15 reviews
      const reviews = Array.from({ length: 15 }, (_, i) =>
        generateMockReview({ _id: `review-${i}` })
      );

      await page.route(/\/api\/web\/hubs\/test-hub$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'hub-123', slug: 'test-hub', name: 'Test Hub' },
          }),
        });
      });

      // First page (10 reviews)
      await page.route(/\/api\/web\/hubs\/test-hub\/reviews(?:\?|$)/, (route) => {
        const url = route.request().url();
        if (!url.includes('page=2')) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: reviews.slice(0, 10),
              meta: { total: 15, page: 1, limit: 10, totalPages: 2 },
            }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: reviews.slice(10),
              meta: { total: 15, page: 2, limit: 10, totalPages: 2 },
            }),
          });
        }
      });

      await hubReviewsPage.goto('test-hub');
      await hubReviewsPage.waitForLoad();

      // Pagination should be visible
      await expect(hubReviewsPage.pagination).toBeVisible();

      // First page should have 10 reviews
      const reviewCards = hubReviewsPage.getAllReviewCards();
      await expect(reviewCards).toHaveCount(10);
    });
  });
});
