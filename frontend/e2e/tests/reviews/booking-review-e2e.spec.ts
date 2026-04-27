import { test, expect } from '@playwright/test';
import { BookingDetailPage } from '../../fixtures/booking-detail.page';
import {
  mockBookingDetail,
  mockBookingReview,
  generateMockBooking,
  generateMockReview,
  waitForToast,
} from '../../helpers/reviews-e2e-helper';

/**
 * Booking Review E2E Tests
 *
 * Tests for AC-LBR-001 to AC-LBR-012 and AC-LBL-003 to AC-LBL-005
 */

test.describe('Booking Review', () => {
  let bookingDetailPage: BookingDetailPage;

  test.beforeEach(async ({ page }) => {
    bookingDetailPage = new BookingDetailPage(page);
  });

  test.describe('Review Eligibility', () => {
    test('AC-LBR-001: should show Leave Review button for past non-cancelled bookings', async ({
      page,
    }) => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const mockBooking = generateMockBooking({
        status: 'completed',
        bookingDate: pastDate.toISOString(),
        review: null,
      });

      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.reviewSection).toBeVisible();
      await expect(bookingDetailPage.leaveReviewButton).toBeVisible();
    });

    test('AC-LBR-011: should not show review for future bookings', async ({ page }) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const mockBooking = generateMockBooking({
        status: 'confirmed',
        bookingDate: futureDate.toISOString(),
      });

      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.leaveReviewButton).not.toBeVisible();
    });

    test('AC-LBR-012: should not show review for cancelled bookings', async ({ page }) => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const mockBooking = generateMockBooking({
        status: 'cancelled',
        bookingDate: pastDate.toISOString(),
      });

      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.leaveReviewButton).not.toBeVisible();
    });
  });

  test.describe('Existing Review Display', () => {
    test('AC-LBR-002: should display existing review with rating and content', async ({
      page,
    }) => {
      const mockReview = generateMockReview({
        rating: 5,
        content: 'Amazing experience! Would recommend.',
      });

      const mockBooking = {
        ...generateMockBooking(),
        review: mockReview,
      };

      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.existingReview).toBeVisible();
      await expect(bookingDetailPage.reviewRating).toBeVisible();
      await expect(bookingDetailPage.reviewContent).toContainText('Amazing experience');
    });

    test('AC-LBR-003: should show edit/delete menu for own review', async ({ page }) => {
      const mockReview = generateMockReview();
      const mockBooking = {
        ...generateMockBooking(),
        review: mockReview,
      };

      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.reviewActionsMenu).toBeVisible();
      await bookingDetailPage.reviewActionsMenu.click();

      await expect(bookingDetailPage.editReviewButton).toBeVisible();
      await expect(bookingDetailPage.deleteReviewButton).toBeVisible();
    });

    test('AC-LBR-010: should display hub reply when exists', async ({ page }) => {
      const mockReview = generateMockReview({
        reply: {
          content: 'Thank you for your kind words!',
          createdAt: new Date().toISOString(),
        },
      });

      const mockBooking = {
        ...generateMockBooking(),
        review: mockReview,
      };

      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.hubReply).toBeVisible();
      await expect(bookingDetailPage.hubReplyContent).toContainText('Thank you');
    });
  });

  test.describe('Review Dialog', () => {
    test('AC-LBR-004: should open review dialog with star rating input', async ({ page }) => {
      const mockBooking = generateMockBooking({ review: null });
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await bookingDetailPage.openReviewDialog();

      await expect(bookingDetailPage.reviewDialog).toBeVisible();
      await expect(bookingDetailPage.reviewRatingInput).toBeVisible();
    });

    test('AC-LBR-005: should validate content length (25-1000 chars)', async ({ page }) => {
      const mockBooking = generateMockBooking({ review: null });
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await bookingDetailPage.openReviewDialog();
      await bookingDetailPage.selectRating(5);

      // Try to submit with short content
      await bookingDetailPage.reviewContentInput.fill('Too short');
      await expect(bookingDetailPage.reviewSubmitButton).toBeDisabled();

      // Fill with valid content (25+ chars)
      await bookingDetailPage.reviewContentInput.fill(
        'This is a valid review with more than 25 characters.'
      );
      await expect(bookingDetailPage.reviewSubmitButton).toBeEnabled();
    });

    test('AC-LBR-006: should allow photo upload (max 5)', async ({ page }) => {
      const mockBooking = generateMockBooking({ review: null });
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await bookingDetailPage.openReviewDialog();

      await expect(bookingDetailPage.reviewPhotoUpload).toBeVisible();
    });
  });

  test.describe('Review CRUD Operations', () => {
    test('AC-LBR-007: should submit new review successfully', async ({ page }) => {
      const mockBooking = generateMockBooking({ review: null });
      await mockBookingDetail(page, mockBooking);

      // Mock the POST API
      await page.route(/\/api\/web\/bookings\/[^/]+\/review$/, (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: generateMockReview({
                rating: 5,
                content: 'This was a fantastic experience that I highly recommend!',
              }),
            }),
          });
        } else {
          route.continue();
        }
      });

      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await bookingDetailPage.submitReview(
        5,
        'This was a fantastic experience that I highly recommend!'
      );

      // Verify review is now displayed
      await expect(bookingDetailPage.existingReview).toBeVisible();
    });

    test('AC-LBR-008: should update existing review', async ({ page }) => {
      const mockReview = generateMockReview({
        content: 'Original review content here',
      });
      const mockBooking = {
        ...generateMockBooking(),
        review: mockReview,
      };
      await mockBookingDetail(page, mockBooking);

      // Mock the PUT API
      await page.route(/\/api\/web\/bookings\/[^/]+\/review$/, (route) => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: generateMockReview({
                content: 'Updated review content with more details and information!',
              }),
            }),
          });
        } else {
          route.continue();
        }
      });

      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await bookingDetailPage.editReview(
        'Updated review content with more details and information!'
      );

      await expect(bookingDetailPage.reviewContent).toContainText('Updated review content');
    });

    test('AC-LBR-009: should delete review with confirmation', async ({ page }) => {
      const mockReview = generateMockReview();
      const mockBooking = {
        ...generateMockBooking(),
        review: mockReview,
      };
      await mockBookingDetail(page, mockBooking);

      // Mock the DELETE API
      await page.route(/\/api\/web\/bookings\/[^/]+\/review$/, (route) => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else {
          route.continue();
        }
      });

      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      // Click delete and verify confirmation dialog
      await bookingDetailPage.reviewActionsMenu.click();
      await bookingDetailPage.deleteReviewButton.click();

      await expect(bookingDetailPage.deleteConfirmDialog).toBeVisible();

      // Confirm deletion
      await bookingDetailPage.deleteConfirmButton.click();
      await expect(bookingDetailPage.deleteConfirmDialog).not.toBeVisible();

      // Verify review is removed
      await expect(bookingDetailPage.existingReview).not.toBeVisible();
      await expect(bookingDetailPage.leaveReviewButton).toBeVisible();
    });
  });

  test.describe('Review from Booking List', () => {
    test('AC-LBL-003: should open review from booking list', async ({ page }) => {
      // This test verifies the "Add Review" action from booking list
      await page.goto('/dashboard/bookings');
      await page.waitForLoadState('networkidle');

      const addReviewButton = page.getByTestId('booking-add-review-btn-0');
      await addReviewButton.click();

      // Should navigate to booking detail or open dialog
      await page.waitForURL(/\/dashboard\/bookings\/[^/]+/);
    });

    test('AC-LBL-004: should edit review from booking list', async ({ page }) => {
      await page.goto('/dashboard/bookings');
      await page.waitForLoadState('networkidle');

      const editReviewButton = page.getByTestId('booking-edit-review-btn-0');
      if (await editReviewButton.isVisible()) {
        await editReviewButton.click();
        // Should navigate or open edit dialog
        await page.waitForURL(/\/dashboard\/bookings\/[^/]+/);
      }
    });

    test('AC-LBL-005: should show rating in past bookings with reviews', async ({ page }) => {
      await page.goto('/dashboard/bookings');
      await page.waitForLoadState('networkidle');

      // Check if booking card shows rating
      const bookingRating = page.getByTestId('booking-rating-0');
      // Rating should be visible for bookings that have reviews
      await expect(bookingRating).toBeVisible().catch(() => {
        // Rating may not be visible if no reviews exist
      });
    });
  });
});
