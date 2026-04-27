import type { Page } from '@playwright/test';

/**
 * Helper functions for reviews E2E tests
 */

/**
 * Wait for API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.waitForResponse((response) => {
    const url = response.url();
    if (typeof urlPattern === 'string') {
      return url.includes(urlPattern);
    }
    return urlPattern.test(url);
  });
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  responseData: unknown,
  status = 200
): Promise<void> {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: responseData,
      }),
    });
  });
}

/**
 * Mock booking detail API
 */
export async function mockBookingDetail(page: Page, bookingData: Record<string, unknown>): Promise<void> {
  await mockApiResponse(page, /\/api\/web\/bookings\/[^/]+$/, bookingData);
}

/**
 * Mock booking review API
 */
export async function mockBookingReview(page: Page, reviewData: Record<string, unknown> | null): Promise<void> {
  await mockApiResponse(page, /\/api\/web\/bookings\/[^/]+\/review$/, reviewData);
}

/**
 * Mock experience reviews API
 */
export async function mockExperienceReviews(
  page: Page,
  reviews: Array<Record<string, unknown>>,
  meta?: { total: number; page: number; limit: number }
): Promise<void> {
  await page.route(/\/api\/web\/experiences\/[^/]+\/reviews/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: reviews,
        meta: meta || { total: reviews.length, page: 1, limit: 10 },
      }),
    });
  });
}

/**
 * Mock expertise reviews API
 */
export async function mockExpertiseReviews(
  page: Page,
  reviews: Array<Record<string, unknown>>,
  meta?: { total: number; page: number; limit: number }
): Promise<void> {
  await page.route(/\/api\/web\/expertise\/[^/]+\/reviews/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: reviews,
        meta: meta || { total: reviews.length, page: 1, limit: 10 },
      }),
    });
  });
}

/**
 * Mock hub reviews API
 */
export async function mockHubReviews(
  page: Page,
  reviews: Array<Record<string, unknown>>,
  stats?: { avgRating: number; totalReviews: number }
): Promise<void> {
  await page.route(/\/api\/web\/hubs\/[^/]+\/reviews/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: reviews,
        stats: stats || { avgRating: 4.5, totalReviews: reviews.length },
      }),
    });
  });
}

/**
 * Mock contract reviews API
 */
export async function mockContractReviews(
  page: Page,
  reviews: Array<Record<string, unknown>>
): Promise<void> {
  await page.route(/\/api\/hub\/contracts\/[^/]+\/reviews/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: reviews,
      }),
    });
  });
}

/**
 * Generate mock review data
 */
export function generateMockReview(overrides: Partial<{
  _id: string;
  rating: number;
  content: string;
  createdAt: string;
  reviewer: { _id: string; name: string; profileImage?: string };
  reply?: { content: string; createdAt: string };
}> = {}): Record<string, unknown> {
  return {
    _id: overrides._id || `review-${Date.now()}`,
    rating: overrides.rating || 5,
    content: overrides.content || 'This was an excellent experience. Highly recommended!',
    createdAt: overrides.createdAt || new Date().toISOString(),
    reviewer: overrides.reviewer || {
      _id: 'reviewer-1',
      name: 'Test Reviewer',
      profileImage: 'https://via.placeholder.com/50',
    },
    reply: overrides.reply,
  };
}

/**
 * Generate mock booking data with review eligibility
 */
export function generateMockBooking(overrides: Partial<{
  _id: string;
  status: string;
  bookingDate: string;
  serviceTitle: string;
  review?: Record<string, unknown>;
}> = {}): Record<string, unknown> {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 7);

  return {
    _id: overrides._id || `booking-${Date.now()}`,
    status: overrides.status || 'completed',
    bookingDate: overrides.bookingDate || pastDate.toISOString(),
    serviceTitle: overrides.serviceTitle || 'Test Experience',
    confirmationCode: 'BOOK123',
    totalAmount: 100,
    currency: 'MYR',
    tickets: [
      { ticketType: 'Standard', quantity: 2, price: 50 },
    ],
    hub: {
      _id: 'hub-1',
      name: 'Test Hub',
      logo: 'https://via.placeholder.com/50',
    },
    review: overrides.review || null,
  };
}

/**
 * Generate mock contract review data
 */
export function generateMockContractReview(overrides: Partial<{
  _id: string;
  rating: number;
  content: string;
  criteriaRatings: { quality: number; communication: number; professionalism: number; timeliness: number };
  reviewerHub: { _id: string; name: string; logo?: string };
  revieweeHub: { _id: string; name: string; logo?: string };
  reply?: { content: string; createdAt: string };
}> = {}): Record<string, unknown> {
  return {
    _id: overrides._id || `contract-review-${Date.now()}`,
    rating: overrides.rating || 5,
    content: overrides.content || 'Excellent work on the project!',
    createdAt: new Date().toISOString(),
    criteriaRatings: overrides.criteriaRatings || {
      quality: 5,
      communication: 5,
      professionalism: 5,
      timeliness: 4,
    },
    reviewerHub: overrides.reviewerHub || {
      _id: 'hub-1',
      name: 'Client Hub',
      logo: 'https://via.placeholder.com/50',
    },
    revieweeHub: overrides.revieweeHub || {
      _id: 'hub-2',
      name: 'Expert Hub',
      logo: 'https://via.placeholder.com/50',
    },
    reply: overrides.reply,
  };
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, message?: string): Promise<void> {
  const toastLocator = page.locator('[data-testid="toast-notification"]');
  await toastLocator.waitFor({ state: 'visible' });
  if (message) {
    await page.waitForFunction(
      (msg) => {
        const toast = document.querySelector('[data-testid="toast-notification"]');
        return toast?.textContent?.includes(msg);
      },
      message,
      { timeout: 5000 }
    );
  }
}

/**
 * Take a screenshot for debugging
 */
export async function debugScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `e2e/screenshots/debug-${name}-${Date.now()}.png` });
}
