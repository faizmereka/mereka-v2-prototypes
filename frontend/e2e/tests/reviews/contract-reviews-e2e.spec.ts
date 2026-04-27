import { test, expect } from '@playwright/test';
import { ContractReviewsPage } from '../../fixtures/contract-reviews.page';
import { generateMockContractReview, mockContractReviews } from '../../helpers/reviews-e2e-helper';

/**
 * Contract Reviews E2E Tests
 *
 * Tests for AC-CDR-001 to AC-CDR-010
 */

test.describe('Contract Reviews', () => {
  let contractReviewsPage: ContractReviewsPage;

  test.beforeEach(async ({ page }) => {
    contractReviewsPage = new ContractReviewsPage(page);
  });

  test.describe('Reviews Tab Display', () => {
    test('AC-CDR-001: should display Reviews tab in contract header', async ({ page }) => {
      // Mock contract detail API
      await page.route(/\/api\/hub\/contracts\/contract-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'contract-123',
              status: 'completed',
              title: 'Web Development Project',
            },
          }),
        });
      });

      await mockContractReviews(page, []);

      await page.goto('/hub/contracts/contract-123');
      await page.waitForLoadState('networkidle');

      await expect(contractReviewsPage.reviewsTab).toBeVisible();
    });

    test('AC-CDR-009: should show empty state when no reviews', async ({ page }) => {
      await page.route(/\/api\/hub\/contracts\/contract-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'contract-123', status: 'completed' },
          }),
        });
      });

      await mockContractReviews(page, []);

      await contractReviewsPage.goto('contract-123');
      await contractReviewsPage.waitForLoad();

      await expect(contractReviewsPage.emptyState).toBeVisible();
    });
  });

  test.describe('Review Display', () => {
    test('AC-CDR-002: should show review from Expert about Client', async ({ page }) => {
      const expertReview = generateMockContractReview({
        _id: 'review-expert',
        reviewerHub: { _id: 'expert-hub', name: 'Expert Hub' },
        revieweeHub: { _id: 'client-hub', name: 'Client Hub' },
        content: 'Great client to work with!',
      });

      await page.route(/\/api\/hub\/contracts\/contract-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'contract-123', status: 'completed' },
          }),
        });
      });

      await mockContractReviews(page, [expertReview]);

      await contractReviewsPage.goto('contract-123');
      await contractReviewsPage.waitForLoad();

      const reviewCard = contractReviewsPage.getReviewCard('review-expert');
      await expect(reviewCard).toBeVisible();
      await expect(contractReviewsPage.getReviewContent('review-expert')).toContainText(
        'Great client'
      );
    });

    test('AC-CDR-003: should show review from Client about Expert', async ({ page }) => {
      const clientReview = generateMockContractReview({
        _id: 'review-client',
        reviewerHub: { _id: 'client-hub', name: 'Client Hub' },
        revieweeHub: { _id: 'expert-hub', name: 'Expert Hub' },
        content: 'Excellent developer, delivered on time!',
      });

      await page.route(/\/api\/hub\/contracts\/contract-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'contract-123', status: 'completed' },
          }),
        });
      });

      await mockContractReviews(page, [clientReview]);

      await contractReviewsPage.goto('contract-123');
      await contractReviewsPage.waitForLoad();

      const reviewCard = contractReviewsPage.getReviewCard('review-client');
      await expect(reviewCard).toBeVisible();
      await expect(contractReviewsPage.getReviewContent('review-client')).toContainText(
        'Excellent developer'
      );
    });

    test('AC-CDR-005: should display criteria ratings in review', async ({ page }) => {
      const reviewWithCriteria = generateMockContractReview({
        _id: 'review-with-criteria',
        criteriaRatings: {
          quality: 5,
          communication: 4,
          professionalism: 5,
          timeliness: 4,
        },
      });

      await page.route(/\/api\/hub\/contracts\/contract-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'contract-123', status: 'completed' },
          }),
        });
      });

      await mockContractReviews(page, [reviewWithCriteria]);

      await contractReviewsPage.goto('contract-123');
      await contractReviewsPage.waitForLoad();

      const criteriaSection = contractReviewsPage.getReviewCriteria('review-with-criteria');
      await expect(criteriaSection).toBeVisible();
    });
  });

  test.describe('Write Review', () => {
    test('AC-CDR-004: should show Write Review button when eligible', async ({ page }) => {
      await page.route(/\/api\/hub\/contracts\/contract-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'contract-123',
              status: 'completed',
              canReview: true,
            },
          }),
        });
      });

      await mockContractReviews(page, []);

      await contractReviewsPage.goto('contract-123');
      await contractReviewsPage.waitForLoad();

      await expect(contractReviewsPage.writeReviewButton).toBeVisible();
    });

    test('AC-CDR-010: should enable review when contract completed', async ({ page }) => {
      await page.route(/\/api\/hub\/contracts\/contract-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'contract-123',
              status: 'completed',
              canReview: true,
            },
          }),
        });
      });

      await mockContractReviews(page, []);

      // Mock POST review API
      await page.route(/\/api\/hub\/contracts\/contract-123\/reviews$/, (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: generateMockContractReview(),
            }),
          });
        } else {
          route.continue();
        }
      });

      await contractReviewsPage.goto('contract-123');
      await contractReviewsPage.waitForLoad();

      await contractReviewsPage.submitReview({
        overallRating: 5,
        quality: 5,
        communication: 4,
        professionalism: 5,
        timeliness: 4,
        content: 'Outstanding work on this project! Very professional.',
      });

      // Review should now be displayed
      await expect(contractReviewsPage.emptyState).not.toBeVisible();
    });
  });

  test.describe('Edit/Delete Review', () => {
    test('AC-CDR-007: should edit own review within 7 days', async ({ page }) => {
      const ownReview = generateMockContractReview({
        _id: 'review-own',
        content: 'Original content here',
      });

      await page.route(/\/api\/hub\/contracts\/contract-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'contract-123',
              status: 'completed',
              currentHubId: 'expert-hub',
            },
          }),
        });
      });

      await mockContractReviews(page, [ownReview]);

      await page.route(/\/api\/hub\/contracts\/contract-123\/reviews\/review-own$/, (route) => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                ...ownReview,
                content: 'Updated review content here',
              },
            }),
          });
        }
      });

      await contractReviewsPage.goto('contract-123');
      await contractReviewsPage.waitForLoad();

      await contractReviewsPage.editReview('review-own', 'Updated review content here');

      await expect(contractReviewsPage.getReviewContent('review-own')).toContainText('Updated');
    });

    test('AC-CDR-008: should delete own review with confirmation', async ({ page }) => {
      const ownReview = generateMockContractReview({
        _id: 'review-to-delete',
      });

      await page.route(/\/api\/hub\/contracts\/contract-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'contract-123',
              status: 'completed',
              currentHubId: 'expert-hub',
            },
          }),
        });
      });

      await mockContractReviews(page, [ownReview]);

      await page.route(/\/api\/hub\/contracts\/contract-123\/reviews\/review-to-delete$/, (route) => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

      await contractReviewsPage.goto('contract-123');
      await contractReviewsPage.waitForLoad();

      await contractReviewsPage.deleteReview('review-to-delete');

      // Review should be removed
      await expect(contractReviewsPage.getReviewCard('review-to-delete')).not.toBeVisible();
    });
  });

  test.describe('Reply to Review', () => {
    test('AC-CDR-006: should allow reply to received review', async ({ page }) => {
      const receivedReview = generateMockContractReview({
        _id: 'received-review',
        reviewerHub: { _id: 'client-hub', name: 'Client Hub' },
        revieweeHub: { _id: 'expert-hub', name: 'Expert Hub' }, // Current user's hub
      });

      await page.route(/\/api\/hub\/contracts\/contract-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'contract-123',
              status: 'completed',
              currentHubId: 'expert-hub', // Current user is the reviewee
            },
          }),
        });
      });

      await mockContractReviews(page, [receivedReview]);

      await page.route(/\/api\/hub\/contracts\/contract-123\/reviews\/received-review\/reply$/, (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                content: 'Thank you for the kind words!',
                createdAt: new Date().toISOString(),
              },
            }),
          });
        }
      });

      await contractReviewsPage.goto('contract-123');
      await contractReviewsPage.waitForLoad();

      // Reply button should be visible on received reviews
      await expect(contractReviewsPage.getReplyButton('received-review')).toBeVisible();

      await contractReviewsPage.replyToReview('received-review', 'Thank you for the kind words!');

      // Reply should be displayed
      await expect(contractReviewsPage.getReply('received-review')).toBeVisible();
    });
  });
});
