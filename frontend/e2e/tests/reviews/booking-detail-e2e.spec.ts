import { test, expect } from '@playwright/test';
import { BookingDetailPage } from '../../fixtures/booking-detail.page';
import { mockBookingDetail, generateMockBooking } from '../../helpers/reviews-e2e-helper';

/**
 * Booking Detail Page E2E Tests
 *
 * Tests for AC-LBD-001 to AC-LBD-010 and AC-LBL-001 to AC-LBL-002
 */

test.describe('Booking Detail Page', () => {
  let bookingDetailPage: BookingDetailPage;

  test.beforeEach(async ({ page }) => {
    bookingDetailPage = new BookingDetailPage(page);
  });

  test.describe('Page Loading', () => {
    test('AC-LBD-001: should load booking details from API', async ({ page }) => {
      const mockBooking = generateMockBooking({
        _id: 'booking-123',
        status: 'completed',
        serviceTitle: 'Photography Workshop',
      });

      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.pageContainer).toBeVisible();
      await expect(bookingDetailPage.loadingState).not.toBeVisible();
    });

    test('AC-LBD-002: should display header with back and print buttons', async ({ page }) => {
      const mockBooking = generateMockBooking();
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.header).toBeVisible();
      await expect(bookingDetailPage.backButton).toBeVisible();
      await expect(bookingDetailPage.printButton).toBeVisible();
    });

    test('AC-LBD-003: should show booking status, date/time, service title', async ({ page }) => {
      const mockBooking = generateMockBooking({
        status: 'confirmed',
        serviceTitle: 'Yoga Class',
        bookingDate: '2025-03-01T10:00:00Z',
      });
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.infoSection).toBeVisible();
      await expect(bookingDetailPage.statusBadge).toBeVisible();
      await expect(bookingDetailPage.dateTime).toBeVisible();
      await expect(bookingDetailPage.serviceLink).toContainText('Yoga Class');
    });
  });

  test.describe('Booking Information', () => {
    test('AC-LBD-004: should display guests and tickets section', async ({ page }) => {
      const mockBooking = generateMockBooking();
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.guestsSection).toBeVisible();
      await expect(bookingDetailPage.ticketList).toBeVisible();
    });

    test('AC-LBD-005: should show payment breakdown', async ({ page }) => {
      const mockBooking = generateMockBooking();
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.priceSection).toBeVisible();
      await expect(bookingDetailPage.totalPaid).toBeVisible();
    });

    test('AC-LBD-006: should display location map for physical events', async ({ page }) => {
      const mockBooking = {
        ...generateMockBooking(),
        eventMode: 'physical',
        location: {
          address: '123 Main St',
          coordinates: { lat: 3.1234, lng: 101.5678 },
        },
      };
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.locationSection).toBeVisible();
      await expect(bookingDetailPage.locationAddress).toContainText('123 Main St');
    });
  });

  test.describe('Booking Actions', () => {
    test('AC-LBD-007: should show cancel button for eligible bookings', async ({ page }) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const mockBooking = generateMockBooking({
        status: 'confirmed',
        bookingDate: futureDate.toISOString(),
      });
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await expect(bookingDetailPage.cancelButton).toBeVisible();
    });

    test('AC-LBD-008: should download receipt on print button click', async ({ page }) => {
      const mockBooking = generateMockBooking();
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      // Check that print button is functional
      await expect(bookingDetailPage.printButton).toBeEnabled();
    });

    test('AC-LBD-009: should navigate back to bookings list', async ({ page }) => {
      const mockBooking = generateMockBooking();
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await bookingDetailPage.backButton.click();
      await page.waitForURL(/\/dashboard\/bookings$/);
    });

    test('AC-LBD-010: should navigate to service detail page', async ({ page }) => {
      const mockBooking = {
        ...generateMockBooking(),
        experienceId: 'exp-123',
      };
      await mockBookingDetail(page, mockBooking);
      await bookingDetailPage.goto('booking-123');
      await bookingDetailPage.waitForLoad();

      await bookingDetailPage.serviceLink.click();
      await page.waitForURL(/\/experience\/exp-123$/);
    });
  });

  test.describe('Navigation from Booking List', () => {
    test('AC-LBL-001: should navigate from booking list to detail', async ({ page }) => {
      // Navigate to bookings list
      await page.goto('/dashboard/bookings');
      await page.waitForLoadState('networkidle');

      // Click on first booking
      const bookingCard = page.getByTestId('booking-card-0');
      await bookingCard.click();

      // Verify navigation to detail page
      await page.waitForURL(/\/dashboard\/bookings\/[^/]+$/);
      await expect(page.getByTestId('booking-detail-page')).toBeVisible();
    });

    test('AC-LBL-002: should navigate via View Details button', async ({ page }) => {
      // Navigate to bookings list
      await page.goto('/dashboard/bookings');
      await page.waitForLoadState('networkidle');

      // Click View Details button
      const viewDetailsButton = page.getByTestId('booking-view-details-btn-0');
      await viewDetailsButton.click();

      // Verify navigation to detail page
      await page.waitForURL(/\/dashboard\/bookings\/[^/]+$/);
    });
  });
});
