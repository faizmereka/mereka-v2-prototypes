/**
 * Expert Profile schemas - Native JSON Schema
 * For expert onboarding flow (separate from hub profile)
 */

const objectIdPattern = '^[a-f\\d]{24}$';

/**
 * Social links schema
 */
const socialLinksSchema = {
  type: 'object',
  properties: {
    website: { type: 'string', description: 'Website URL' },
    facebook: { type: 'string', description: 'Facebook URL' },
    linkedin: { type: 'string', description: 'LinkedIn URL' },
    instagram: { type: 'string', description: 'Instagram URL' },
    twitter: { type: 'string', description: 'Twitter URL' },
    email: { type: 'string', description: 'Email address' },
  },
} as const;

/**
 * Portfolio item schema
 */
const portfolioItemSchema = {
  type: 'object',
  required: ['title'],
  properties: {
    title: { type: 'string', minLength: 1, description: 'Project title' },
    description: { type: 'string', description: 'Project description' },
    images: {
      type: 'array',
      items: { type: 'string' },
      description: 'Project image URLs',
    },
    skills: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of Skill ObjectIds or names',
    },
    year: { type: 'string', description: 'Project year' },
    projectLink: { type: 'string', description: 'Project URL' },
    startDate: { type: 'string', description: 'Start date (YYYY-MM)' },
    endDate: { type: 'string', description: 'End date (YYYY-MM)' },
  },
} as const;

/**
 * Employment item schema
 */
const employmentItemSchema = {
  type: 'object',
  required: ['title', 'company'],
  properties: {
    title: { type: 'string', minLength: 1, description: 'Job title' },
    company: { type: 'string', minLength: 1, description: 'Company name' },
    city: { type: 'string', description: 'City' },
    country: { type: 'string', description: 'Country' },
    startDate: { type: 'string', description: 'Start date (YYYY-MM)' },
    endDate: { type: 'string', description: 'End date (YYYY-MM)' },
    isOngoing: { type: 'boolean', description: 'Currently working here' },
    duration: { type: 'string', description: 'Employment duration (legacy)' },
    description: { type: 'string', maxLength: 200, description: 'Job description' },
  },
} as const;

/**
 * Education item schema
 */
const educationItemSchema = {
  type: 'object',
  required: ['degree', 'institution'],
  properties: {
    degree: { type: 'string', minLength: 1, description: 'Degree name' },
    institution: { type: 'string', minLength: 1, description: 'Institution name' },
    fieldOfStudy: { type: 'string', description: 'Field of study' },
    startDate: { type: 'string', description: 'Start date (YYYY-MM)' },
    endDate: { type: 'string', description: 'End date (YYYY-MM)' },
    year: { type: 'string', description: 'Year (legacy)' },
    description: { type: 'string', maxLength: 200, description: 'Description' },
  },
} as const;

/**
 * Language item schema
 * languageId is optional - empty language entries are filtered in service
 */
const languageItemSchema = {
  type: 'object',
  properties: {
    languageId: {
      type: 'string',
      description: 'Language ObjectId reference (24 char hex)',
    },
    proficiency: {
      type: 'string',
      enum: [
        'Basic',
        'Conversational',
        'Proficient',
        'Fluent',
        'Native',
        'basic',
        'conversational',
        'proficient',
        'fluent',
        'native',
      ],
      description: 'Language proficiency level',
    },
  },
} as const;

/**
 * Location schema
 */
const locationSchema = {
  type: 'object',
  properties: {
    city: { type: 'string', description: 'City' },
    country: { type: 'string', description: 'Country' },
    lat: { type: 'number', description: 'Latitude' },
    lng: { type: 'number', description: 'Longitude' },
  },
} as const;

/**
 * Update expert profile schema
 * Used for expert onboarding - updates User model fields
 */
export const hubUpdateExpertProfileBodySchema = {
  body: {
    type: 'object',
    properties: {
      // Step 1: Profile
      name: { type: 'string', minLength: 2, maxLength: 100, description: 'Full name' },
      username: {
        type: 'string',
        minLength: 6,
        maxLength: 30,
        pattern: '^[a-z0-9_]+$',
        description: 'Username (lowercase alphanumeric)',
      },
      profilePhoto: { type: 'string', description: 'Profile photo URL' },
      coverPhoto: { type: 'string', description: 'Cover photo URL' },
      bio: { type: 'string', maxLength: 500, description: 'Short bio' },
      professionalTitle: { type: 'string', maxLength: 100, description: 'Professional title' },
      phoneNumber: { type: 'string', description: 'Phone number with country code' },
      location: locationSchema,
      socialLinks: socialLinksSchema,
      introVideo: { type: 'string', description: 'Intro video URL' },

      // Step 2: Skills
      skills: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of Skill ObjectIds or names',
      },
      languages: {
        type: 'array',
        items: languageItemSchema,
        description: 'Languages and proficiency',
      },
      focusAreaId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Primary FocusArea ObjectId',
      },
      jobPreferences: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of JobPreference ObjectIds or names',
      },
      hourlyRate: { type: 'number', minimum: 0, description: 'Hourly rate' },

      // Step 3: Background
      portfolio: {
        type: 'array',
        items: portfolioItemSchema,
        description: 'Portfolio/Projects',
      },
      employment: {
        type: 'array',
        items: employmentItemSchema,
        description: 'Work experience',
      },
      education: {
        type: 'array',
        items: educationItemSchema,
        description: 'Education/Qualifications',
      },

      // Onboarding tracking
      onboardingStep: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        description: 'Current onboarding step',
      },
    },
  },
} as const;

/**
 * TypeScript interfaces
 */
export interface ExpertSocialLinks {
  website?: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  email?: string;
}

export interface ExpertLocation {
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface ExpertPortfolioItem {
  title: string;
  description?: string;
  images?: string[];
  skills?: string[];
  year?: string;
  projectLink?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExpertEmploymentItem {
  title: string;
  company: string;
  city?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  isOngoing?: boolean;
  duration?: string;
  description?: string;
}

export interface ExpertEducationItem {
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  year?: string;
  description?: string;
}

export interface ExpertLanguageItem {
  languageId: string;
  proficiency: 'Basic' | 'Conversational' | 'Proficient' | 'Fluent' | 'Native';
}

export interface HubUpdateExpertProfileInput {
  // Profile
  name?: string;
  username?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  bio?: string;
  professionalTitle?: string;
  phoneNumber?: string;
  location?: ExpertLocation;
  socialLinks?: ExpertSocialLinks;
  introVideo?: string;

  // Skills
  skills?: string[];
  languages?: ExpertLanguageItem[];
  focusAreaId?: string;
  jobPreferences?: string[];
  hourlyRate?: number;

  // Background
  portfolio?: ExpertPortfolioItem[];
  employment?: ExpertEmploymentItem[];
  education?: ExpertEducationItem[];

  // Tracking
  onboardingStep?: number;
}
