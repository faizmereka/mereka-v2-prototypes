/**
 * Test data for hub-profile tests
 */

/**
 * Valid hub profile creation data
 */
export const VALID_HUB_CREATE_DATA = {
  agencyName: 'Test Creative Hub',
  slug: 'test-creative-hub',
  agencyLogo: 'https://example.com/logo.png',
  phoneNumber: '+60123456789',
  location: {
    city: 'Kuala Lumpur',
    state: 'Federal Territory',
    country: 'Malaysia',
    lat: '3.139',
    lng: '101.6869',
    streetAddress: '123 Test Street',
  },
} as const;

/**
 * Valid hub profile update data (Soar plan)
 */
export const VALID_HUB_UPDATE_SOAR = {
  description: 'We are a creative coworking space in the heart of KL.',
  companyType: '507f1f77bcf86cd799439011', // Mock ObjectId
  introVideo: 'https://youtube.com/watch?v=test123',
  gallery: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
  autoPopulateImages: false,
  operatingHours: {
    monday: { open: '09:00', close: '18:00', isClosed: false },
    tuesday: { open: '09:00', close: '18:00', isClosed: false },
    wednesday: { open: '09:00', close: '18:00', isClosed: false },
    thursday: { open: '09:00', close: '18:00', isClosed: false },
    friday: { open: '09:00', close: '17:00', isClosed: false },
    saturday: { isClosed: true },
    sunday: { isClosed: true },
  },
  socialLinks: {
    website: 'https://testhub.com',
    facebook: 'https://facebook.com/testhub',
    linkedin: 'https://linkedin.com/company/testhub',
    instagram: 'https://instagram.com/testhub',
  },
  amenities: ['507f1f77bcf86cd799439012'],
  facilities: ['507f1f77bcf86cd799439013'],
  focusAreas: ['507f1f77bcf86cd799439014'],
  spaceTypes: ['507f1f77bcf86cd799439015'],
  experienceTypes: ['507f1f77bcf86cd799439016'],
  tags: ['coworking', 'startup', 'creative'],
  services: ['Hot Desk', 'Private Office', 'Meeting Room'],
  displayFullAddress: false,
  onboardingStep: 4,
} as const;

/**
 * Valid hub profile update data (Scale plan with user fields)
 */
export const VALID_HUB_UPDATE_SCALE = {
  ...VALID_HUB_UPDATE_SOAR,
  // User-specific fields for Scale plan
  professionalTitle: 'Creative Director',
  userIntroVideo: 'https://youtube.com/watch?v=user123',
  bio: 'I am a creative professional with 10 years of experience.',
  skills: ['507f1f77bcf86cd799439017', '507f1f77bcf86cd799439018'],
  focusAreaId: '507f1f77bcf86cd799439019',
  jobPreferences: ['507f1f77bcf86cd79943901a', '507f1f77bcf86cd79943901b'],
  hourlyRate: 150,
  portfolio: [
    {
      title: 'Brand Identity for Tech Startup',
      description: 'Complete brand identity design including logo, colors, and guidelines.',
      images: ['https://example.com/project1.jpg'],
      skills: ['507f1f77bcf86cd799439017'],
      year: '2024',
    },
    {
      title: 'Mobile App UI/UX Design',
      description: 'Designed user interface and experience for a fintech mobile app.',
      images: ['https://example.com/project2.jpg', 'https://example.com/project2-2.jpg'],
      skills: ['507f1f77bcf86cd799439018'],
      year: '2023',
    },
  ],
  employment: [
    {
      title: 'Senior Product Designer',
      company: 'Tech Corp',
      duration: '2020-2024',
      description: 'Led design team and managed multiple product launches.',
    },
    {
      title: 'Product Designer',
      company: 'Startup Inc',
      duration: '2018-2020',
      description: 'Designed UI/UX for web and mobile applications.',
    },
  ],
  education: [
    {
      degree: 'Bachelor of Design',
      institution: 'University of Arts',
      year: '2018',
    },
  ],
  languages: [
    {
      languageId: '507f1f77bcf86cd79943901c',
      proficiency: 'Native',
    },
    {
      languageId: '507f1f77bcf86cd79943901d',
      proficiency: 'Fluent',
    },
  ],
  userLocation: {
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    lat: 3.139,
    lng: 101.6869,
  },
  userSocialLinks: {
    website: 'https://johndoe.com',
    linkedin: 'https://linkedin.com/in/johndoe',
    twitter: 'https://twitter.com/johndoe',
  },
} as const;

/**
 * Invalid hub data - missing required fields
 */
export const INVALID_HUB_MISSING_FIELDS = {
  agencyName: 'Test Hub',
  // Missing slug, logo, phoneNumber, location
} as const;

/**
 * Invalid hub data - invalid slug format
 */
export const INVALID_HUB_BAD_SLUG = {
  agencyName: 'Test Hub',
  slug: 'Invalid Slug With Spaces',
  agencyLogo: 'https://example.com/logo.png',
  phoneNumber: '+60123456789',
  location: {
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    lat: '3.139',
    lng: '101.6869',
  },
} as const;

/**
 * Partial update data for testing incremental updates
 */
export const PARTIAL_HUB_UPDATE = {
  description: 'Updated description',
  tags: ['new-tag'],
  onboardingStep: 2,
} as const;

/**
 * Hub data for slug conflict test
 */
export const DUPLICATE_SLUG_DATA = {
  agencyName: 'Another Hub',
  slug: 'test-creative-hub', // Same slug as VALID_HUB_CREATE_DATA
  agencyLogo: 'https://example.com/logo2.png',
  phoneNumber: '+60987654321',
  location: {
    city: 'Penang',
    country: 'Malaysia',
    lat: '5.414',
    lng: '100.3292',
  },
} as const;
