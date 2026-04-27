import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import type { Types } from 'mongoose';

/**
 * Valid expertise data for testing
 */
export const VALID_EXPERTISE_DATA = {
  expertiseTitle: 'Professional Photography Workshop',
  expertiseDescription:
    'Learn professional photography techniques from industry experts. This comprehensive workshop covers lighting, composition, and post-processing.',
  expertiseSummary: 'A comprehensive photography workshop for beginners and intermediates',
  host: {
    id: 'host-123',
    name: 'John Doe',
    profileUrl: 'https://example.com/john-doe',
    description: 'Professional photographer with 10+ years of experience',
  },
  expertiseTypes: ['workshop', 'photography'],
  primaryLanguage: 'English',
  secondaryLanguages: ['Malay', 'Mandarin'],
  slug: 'professional-photography-workshop-2025',
  location: {
    streetAddress: '123 Main Street',
    country: 'Malaysia',
    state: 'Kuala Lumpur',
    city: 'Kuala Lumpur',
    postcode: '50000',
    location: 'Downtown KL',
    lat: 3.139,
    lng: 101.6869,
    addressAdditionalNote: 'Near KLCC',
    autofill: false,
  },
  linkMode: 'send',
  expertiseLink: 'https://meet.google.com/abc-defg-hij',
  displayFullAddress: false,
  coverPhoto: 'https://example.com/cover-photo.jpg',
  gallery: ['https://example.com/gallery1.jpg', 'https://example.com/gallery2.jpg'],
  infoForBooker: 'Please bring your own camera and laptop',
  expertiseInstructions: 'Arrive 15 minutes early for setup',
  customQuestions: {
    isQuestionMandatory: true,
    questionArray: [
      {
        questionLabel: 'What is your photography experience level?',
        questionType: 'multiple_choice',
        saveStatus: true,
        multipleChoices: ['Beginner', 'Intermediate', 'Advanced'],
      },
    ],
  },
  feePaidBy: 'learner',
  operatingHours: {
    autofill: false,
    sameOperatingHoursForAll: true,
    allOperatingHours: true,
    allOperatingStartTime: '09:00',
    allOperatingEndTime: '18:00',
    days: [
      {
        key: 'monday',
        fullTitle: 'Monday',
        title: 'Mon',
        isActive: true,
        fullDay: false,
        startTime: '09:00',
        endTime: '18:00',
      },
      {
        key: 'tuesday',
        fullTitle: 'Tuesday',
        title: 'Tue',
        isActive: true,
        fullDay: false,
        startTime: '09:00',
        endTime: '18:00',
      },
    ],
  },
  availabilityType: 'manual',
  ticket: [
    {
      id: 'ticket-standard',
      ticketName: 'Standard Ticket',
      ticketType: 'Paid',
      standardRate: 150,
      ticketQty: 20,
      description: 'Standard access to the workshop',
      expertiseMode: 'physical',
      sessionDuration: '3 hours',
      estimatedDuration: '3 hours',
      hours: '3',
      minutes: '0',
      duration: '180',
      hasBufferTime: false,
      flexibleBooking: false,
      instantBooking: 'yes',
      canRequestForSession: false,
      hasCutoffTime: true,
      cutoffTime: '24 hours',
      cutoffNumber: 24,
    },
  ],
  audienceType: 'adults',
  currency: 'MYR',
  rating: 4.5,
  isDisabled: false,
  mandatoryQuestionsForBooking: true,
  materialProvided: ['Camera', 'Tripod', 'Lighting equipment'],
  materialNeedToBring: ['Laptop', 'Memory card'],
};

/**
 * Setup test environment for expertise tests
 */
export async function setupExpertiseTestEnvironment(user?: any) {
  // Create user if not provided
  if (!user) {
    user = await User.create({
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      authProvider: 'soar',
      uid: `uid-${Date.now()}`,
      role: 'admin',
    });
  }

  // Create hub
  const hub = await Hub.create({
    name: 'Test Hub',
    email: `hub-${Date.now()}@example.com`,
    phoneNumber: '+60123456789',
    slug: `test-hub-${Date.now()}`,
    createdBy: user._id,
    lastUpdatedBy: user._id,
    ownerId: user._id,
    location: {
      country: 'Malaysia',
      city: 'Kuala Lumpur',
      state: 'Federal Territory',
      postcode: '50000',
      address: '123 Test Street',
    },
    logo: 'https://example.com/logo.jpg',
    status: 'active',
  });

  return {
    userId: String(user._id),
    hubId: String(hub._id),
    user,
    hub,
  };
}

/**
 * Create minimal expertise data
 */
export function createMinimalExpertiseData(
  hubId: string | Types.ObjectId,
  createdBy: string | Types.ObjectId,
) {
  return {
    expertiseTitle: 'Test Expertise',
    expertiseDescription: 'Test description',
    expertiseSummary: 'Test summary',
    host: {
      id: String(createdBy),
      name: 'Test Host',
      profileUrl: 'https://example.com/host',
      description: 'Test host description',
    },
    expertiseTypes: ['workshop'],
    primaryLanguage: 'English',
    secondaryLanguages: [],
    slug: `test-expertise-${Date.now()}`,
    coverPhoto: 'https://example.com/cover.jpg',
    gallery: [],
    ticket: [
      {
        id: 'ticket-1',
        ticketName: 'Test Ticket',
        ticketType: 'Free',
        standardRate: 0,
        ticketQty: 10,
        expertiseMode: 'online',
        sessionDuration: '1 hour',
      },
    ],
    hubId: String(hubId),
    createdBy: String(createdBy),
    status: 'draft',
    currency: 'MYR',
    availabilityType: 'manual',
    feePaidBy: 'learner',
    displayFullAddress: false,
  };
}
