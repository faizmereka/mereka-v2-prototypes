import { Experience } from '@core/models/Experience';
import { ExperienceEvent } from '@core/models/ExperienceEvent';
import { Hub } from '@core/models/Hub';
import type { IUser } from '@core/models/User';

/**
 * Test fixture helper for booking transaction tests
 */

/**
 * Valid checkout session data for paid booking
 */
export const VALID_CHECKOUT_SESSION_DATA = {
  learnerDetail: [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      isBooker: true,
    },
  ],
  selectedTickets: [
    {
      id: 'ticket-paid',
      numberOfSelectedTickets: 2,
      standardRate: 50,
      ticketName: 'Standard Ticket',
    },
  ],
  bookingStartDate: '2025-12-01T10:00:00Z',
  bookingEndDate: '2025-12-01T12:00:00Z',
  timeZone: 'Asia/Kuala_Lumpur',
  totalCost: 100,
  currency: 'MYR',
  isMalaysian: true,
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
} as const;

/**
 * Valid free booking data
 */
export const VALID_FREE_BOOKING_DATA = {
  learnerDetail: [
    {
      id: 1,
      name: 'Jane Doe',
      email: 'jane@example.com',
      isBooker: true,
    },
  ],
  selectedTickets: [
    {
      id: 'ticket-free',
      numberOfSelectedTickets: 1,
      standardRate: 0,
      ticketName: 'Free Ticket',
    },
  ],
  bookingStartDate: '2025-12-01T10:00:00Z',
  bookingEndDate: '2025-12-01T12:00:00Z',
  timeZone: 'Asia/Kuala_Lumpur',
  isMalaysian: false,
} as const;

/**
 * Create test hub for booking tests
 */
export async function createTestHub(userId: string) {
  return await Hub.create({
    name: 'Test Hub',
    slug: 'test-hub',
    email: 'hub@example.com',
    phoneNumber: '+60123456789',
    logo: 'https://example.com/logo.png',
    location: {
      city: 'Kuala Lumpur',
      country: 'Malaysia',
      lat: '3.139',
      lng: '101.6869',
    },
    userId,
    ownerId: userId,
    createdBy: userId,
    lastUpdatedBy: userId,
    isActive: true,
    isApproved: true,
  });
}

/**
 * Create test experience with tickets
 */
export async function createTestExperience(hubId: string) {
  return await Experience.create({
    experienceTitle: 'Test Experience',
    slug: 'test-experience',
    experienceType: 'Physical',
    hubId,
    audienceType: 'Everyone',
    targetAudience: ['Adults'],
    canBookAsPrivate: false,
    feePaidBy: 'learner',
    currency: 'MYR',
    hostDetails: [
      {
        hubId,
        hubName: 'Test Hub',
        type: 'HOST',
      },
    ],
    noHost: false,
    ticket: [
      {
        id: 'ticket-paid',
        ticketType: 'Paid',
        ticketName: 'Standard Ticket',
        ticketPrice: 50,
        ticketQty: 10,
      },
      {
        id: 'ticket-free',
        ticketType: 'Free',
        ticketName: 'Free Ticket',
        ticketPrice: 0,
        ticketQty: 5,
      },
    ],
  });
}

/**
 * Create test experience event
 */
export async function createTestEvent(experienceId: string) {
  return await ExperienceEvent.create({
    experienceId,
    scheduleId: 'schedule-1',
    startTime: new Date('2025-12-01T10:00:00Z'),
    endTime: new Date('2025-12-01T12:00:00Z'),
    timeZone: 'Asia/Kuala_Lumpur',
    status: 'ACTIVE',
    isRecurring: false,
  });
}

/**
 * Setup complete booking test environment
 * Creates user, hub, experience, and event
 */
export async function setupBookingTestEnvironment(user: IUser) {
  const userId = String(user._id);

  const hub = await createTestHub(userId);
  const hubId = String(hub._id);

  const experience = await createTestExperience(hubId);
  const experienceId = String(experience._id);

  const event = await createTestEvent(experienceId);
  const eventId = String(event._id);

  return {
    userId,
    hubId,
    experienceId,
    eventId,
  };
}
