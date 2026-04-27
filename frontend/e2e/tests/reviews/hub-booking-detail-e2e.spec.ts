import { test, expect } from '@playwright/test';
import { HubBookingDetailPage, HubBookingsListPage } from '../../fixtures/hub-booking-detail.page';
import { generateMockReview } from '../../helpers/reviews-e2e-helper';

/**
 * Hub Booking Detail E2E Tests
 *
 * Tests for AC-HBD-001 to AC-HBD-007 and AC-HRR-001 to AC-HRR-006
 */

test.describe('Hub Booking Detail', () => {
  let hubBookingDetailPage: HubBookingDetailPage;
  let hubBookingsListPage: HubBookingsListPage;

  test.beforeEach(async ({ page }) => {
    hubBookingDetailPage = new HubBookingDetailPage(page);
    hubBookingsListPage = new HubBookingsListPage(page);
  });

  test.describe('Opening Booking Detail', () => {
    test('AC-HBD-001: should open booking detail from action menu', async ({ page }) => {
      // Mock the bookings list API
      await page.route(/\/api\/hub\/bookings$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                _id: 'booking-123',
                status: 'completed',
                bookingDate: new Date().toISOString(),
                serviceTitle: 'Test Experience',
                booker: { name: 'John Doe', email: 'john@example.com' },
              },
            ],
          }),
        });
      });

      // Mock the booking detail API
      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'booking-123',
              status: 'completed',
              bookingDate: new Date().toISOString(),
              serviceTitle: 'Test Experience',
              booker: { name: 'John Doe', email: 'john@example.com', phone: '+601234567890' },
              participants: [],
              payment: { total: 100, currency: 'MYR', payout: 90 },
            },
          }),
        });
      });

      await hubBookingsListPage.goto();
      await hubBookingsListPage.waitForLoad();

      await hubBookingsListPage.openBookingDetail(0);
      await hubBookingDetailPage.waitForLoad();

      await expect(hubBookingDetailPage.modal).toBeVisible();
    });

    test('AC-HBD-002: should display booking date/time and status', async ({ page }) => {
      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'booking-123',
              status: 'completed',
              bookingDate: '2025-03-01T10:00:00Z',
              serviceTitle: 'Photography Workshop',
            },
          }),
        });
      });

      // Navigate directly to open modal (simulate after opening)
      await page.goto('/hub/bookings');
      await page.evaluate(() => {
        // Trigger modal open programmatically
        window.dispatchEvent(new CustomEvent('openBookingDetail', { detail: { id: 'booking-123' } }));
      });

      await hubBookingDetailPage.waitForLoad();

      await expect(hubBookingDetailPage.dateTime).toBeVisible();
      await expect(hubBookingDetailPage.status).toBeVisible();
    });

    test('AC-HBD-003: should show booker information', async ({ page }) => {
      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'booking-123',
              booker: {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+601234567890',
              },
            },
          }),
        });
      });

      await page.goto('/hub/bookings/booking-123');
      await hubBookingDetailPage.waitForLoad();

      await expect(hubBookingDetailPage.bookerInfo).toBeVisible();
      await expect(hubBookingDetailPage.bookerInfo).toContainText('John Doe');
    });

    test('AC-HBD-004: should list all participants', async ({ page }) => {
      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'booking-123',
              participants: [
                { name: 'Alice Smith', ticketType: 'Standard' },
                { name: 'Bob Jones', ticketType: 'VIP' },
              ],
            },
          }),
        });
      });

      await page.goto('/hub/bookings/booking-123');
      await hubBookingDetailPage.waitForLoad();

      await expect(hubBookingDetailPage.participantsList).toBeVisible();
      await expect(hubBookingDetailPage.getParticipant(0)).toContainText('Alice Smith');
      await expect(hubBookingDetailPage.getParticipant(1)).toContainText('Bob Jones');
    });

    test('AC-HBD-005: should show payment and payout details', async ({ page }) => {
      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'booking-123',
              payment: {
                total: 100,
                currency: 'MYR',
                payout: 90,
              },
            },
          }),
        });
      });

      await page.goto('/hub/bookings/booking-123');
      await hubBookingDetailPage.waitForLoad();

      await expect(hubBookingDetailPage.paymentDetails).toBeVisible();
      await expect(hubBookingDetailPage.payoutAmount).toContainText('90');
    });
  });

  test.describe('Learner Review Display', () => {
    test('AC-HBD-006: should display learner review when exists', async ({ page }) => {
      const mockReview = generateMockReview({
        rating: 5,
        content: 'Excellent workshop! Learned a lot.',
      });

      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'booking-123',
              review: mockReview,
            },
          }),
        });
      });

      await page.goto('/hub/bookings/booking-123');
      await hubBookingDetailPage.waitForLoad();

      await expect(hubBookingDetailPage.learnerReview).toBeVisible();
      await expect(hubBookingDetailPage.learnerReviewRating).toBeVisible();
      await expect(hubBookingDetailPage.learnerReviewContent).toContainText('Excellent workshop');
    });

    test('AC-HBD-007: should allow reply to learner review', async ({ page }) => {
      const mockReview = generateMockReview({
        rating: 4,
        content: 'Good experience overall.',
      });

      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              _id: 'booking-123',
              review: mockReview,
            },
          }),
        });
      });

      await page.goto('/hub/bookings/booking-123');
      await hubBookingDetailPage.waitForLoad();

      await expect(hubBookingDetailPage.replyButton).toBeVisible();
    });
  });

  test.describe('Hub Reply to Review', () => {
    test('AC-HRR-001: should show Reply button on learner review', async ({ page }) => {
      const mockReview = generateMockReview();

      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'booking-123', review: mockReview },
          }),
        });
      });

      await page.goto('/hub/bookings/booking-123');
      await hubBookingDetailPage.waitForLoad();

      await expect(hubBookingDetailPage.replyButton).toBeVisible();
    });

    test('AC-HRR-002: should validate reply length (max 500)', async ({ page }) => {
      const mockReview = generateMockReview();

      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'booking-123', review: mockReview },
          }),
        });
      });

      await page.goto('/hub/bookings/booking-123');
      await hubBookingDetailPage.waitForLoad();

      await hubBookingDetailPage.replyButton.click();
      await hubBookingDetailPage.replyInput.waitFor({ state: 'visible' });

      // Try to enter more than 500 characters
      const longText = 'a'.repeat(600);
      await hubBookingDetailPage.replyInput.fill(longText);

      // Input should be limited to 500 chars
      const inputValue = await hubBookingDetailPage.replyInput.inputValue();
      expect(inputValue.length).toBeLessThanOrEqual(500);
    });

    test('AC-HRR-003: should submit reply successfully', async ({ page }) => {
      const mockReview = generateMockReview();

      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'booking-123', review: mockReview },
          }),
        });
      });

      await page.route(/\/api\/hub\/bookings\/booking-123\/reply$/, (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                content: 'Thank you for your feedback!',
                createdAt: new Date().toISOString(),
              },
            }),
          });
        }
      });

      await page.goto('/hub/bookings/booking-123');
      await hubBookingDetailPage.waitForLoad();

      await hubBookingDetailPage.submitReply('Thank you for your feedback!');

      await expect(hubBookingDetailPage.existingReply).toBeVisible();
    });

    test('AC-HRR-004: should show existing reply with edit option', async ({ page }) => {
      const mockReview = generateMockReview({
        reply: {
          content: 'We appreciate your review!',
          createdAt: new Date().toISOString(),
        },
      });

      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'booking-123', review: mockReview },
          }),
        });
      });

      await page.goto('/hub/bookings/booking-123');
      await hubBookingDetailPage.waitForLoad();

      await expect(hubBookingDetailPage.existingReply).toBeVisible();
      await expect(hubBookingDetailPage.existingReply).toContainText('We appreciate');
      await expect(hubBookingDetailPage.editReplyButton).toBeVisible();
    });

    test('AC-HRR-005: should edit reply within 7 days', async ({ page }) => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

      const mockReview = generateMockReview({
        reply: {
          content: 'Original reply',
          createdAt: recentDate.toISOString(),
        },
      });

      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'booking-123', review: mockReview },
          }),
        });
      });

      await page.route(/\/api\/hub\/bookings\/booking-123\/reply$/, (route) => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                content: 'Updated reply content',
                createdAt: recentDate.toISOString(),
              },
            }),
          });
        }
      });

      await page.goto('/hub/bookings/booking-123');
      await hubBookingDetailPage.waitForLoad();

      // Edit button should be visible for recent replies
      await expect(hubBookingDetailPage.editReplyButton).toBeVisible();

      await hubBookingDetailPage.editReply('Updated reply content');

      await expect(hubBookingDetailPage.existingReply).toContainText('Updated reply');
    });

    test('AC-HRR-006: should delete reply with confirmation', async ({ page }) => {
      const mockReview = generateMockReview({
        reply: {
          content: 'Reply to delete',
          createdAt: new Date().toISOString(),
        },
      });

      await page.route(/\/api\/hub\/bookings\/booking-123$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { _id: 'booking-123', review: mockReview },
          }),
        });
      });

      await page.route(/\/api\/hub\/bookings\/booking-123\/reply$/, (route) => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

      await page.goto('/hub/bookings/booking-123');
      await hubBookingDetailPage.waitForLoad();

      await hubBookingDetailPage.deleteReplyButton.click();

      // Confirmation dialog should appear
      await expect(hubBookingDetailPage.deleteReplyConfirmDialog).toBeVisible();

      await hubBookingDetailPage.deleteReplyConfirmButton.click();

      // Reply should be removed
      await expect(hubBookingDetailPage.existingReply).not.toBeVisible();
      await expect(hubBookingDetailPage.replyButton).toBeVisible();
    });
  });
});
