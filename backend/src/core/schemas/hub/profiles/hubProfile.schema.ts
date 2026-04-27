/**
 * Hub profile schemas - Native JSON Schema
 * Note: Slug lowercase transform, lat/lng union (number or string) handled in controller
 */

const objectIdPattern = '^[a-f\\d]{24}$';
const timePattern = '^\\d{2}:\\d{2}$';
const slugPattern = '^[a-z0-9-]+$';

/**
 * Operating hours schema for a single day
 */
const dayHoursSchema = {
  type: 'object',
  properties: {
    open: {
      type: 'string',
      pattern: timePattern,
      description: 'Opening time (HH:MM format)',
    },
    close: {
      type: 'string',
      pattern: timePattern,
      description: 'Closing time (HH:MM format)',
    },
    isClosed: {
      type: 'boolean',
      description: 'Whether the day is closed',
    },
  },
} as const;

/**
 * Social links schema
 */
const socialLinksSchema = {
  type: 'object',
  properties: {
    website: {
      type: 'string',
      description: 'Website URL',
    },
    facebook: {
      type: 'string',
      description: 'Facebook URL',
    },
    linkedin: {
      type: 'string',
      description: 'LinkedIn URL',
    },
    instagram: {
      type: 'string',
      description: 'Instagram URL',
    },
    twitter: {
      type: 'string',
      description: 'Twitter URL',
    },
    email: {
      type: 'string',
      description: 'Email address',
    },
  },
} as const;

/**
 * Portfolio/Project item schema
 */
const portfolioItemSchema = {
  type: 'object',
  required: ['title'],
  properties: {
    title: {
      type: 'string',
      minLength: 1,
      description: 'Project title',
    },
    description: {
      type: 'string',
      description: 'Project description',
    },
    images: {
      type: 'array',
      items: {
        type: 'string',
        format: 'uri',
      },
      description: 'Project image URLs',
    },
    skills: {
      type: 'array',
      items: {
        type: 'string',
        pattern: objectIdPattern,
      },
      description: 'Array of Skill ObjectIds',
    },
    year: {
      type: 'string',
      description: 'Project year',
    },
  },
} as const;

/**
 * Employment/Experience item schema
 */
const employmentItemSchema = {
  type: 'object',
  required: ['title', 'company'],
  properties: {
    title: {
      type: 'string',
      minLength: 1,
      description: 'Job title',
    },
    company: {
      type: 'string',
      minLength: 1,
      description: 'Company name',
    },
    duration: {
      type: 'string',
      description: 'Employment duration',
    },
    description: {
      type: 'string',
      description: 'Job description',
    },
  },
} as const;

/**
 * Education/Qualification item schema
 */
const educationItemSchema = {
  type: 'object',
  required: ['degree', 'institution', 'year'],
  properties: {
    degree: {
      type: 'string',
      minLength: 1,
      description: 'Degree name',
    },
    institution: {
      type: 'string',
      minLength: 1,
      description: 'Institution name',
    },
    year: {
      type: 'string',
      minLength: 1,
      description: 'Year',
    },
  },
} as const;

/**
 * Language item schema
 */
const languageItemSchema = {
  type: 'object',
  required: ['languageId', 'proficiency'],
  properties: {
    languageId: {
      type: 'string',
      pattern: objectIdPattern,
      description: 'Language ObjectId reference',
    },
    proficiency: {
      type: 'string',
      enum: ['Basic', 'Conversational', 'Proficient', 'Fluent', 'Native'],
      description: 'Language proficiency level',
    },
  },
} as const;

/**
 * Create hub profile schema (from /hub-onboard/form)
 * Note: Slug lowercase transform and lat/lng union (number or string) handled in controller
 */
export const hubCreateHubProfileBodySchema = {
  body: {
    type: 'object',
    required: ['agencyName', 'slug', 'agencyLogo', 'phoneNumber', 'location'],
    properties: {
      agencyName: {
        type: 'string',
        minLength: 2,
        maxLength: 40,
        description: 'Hub/Agency name',
      },
      slug: {
        type: 'string',
        minLength: 3,
        maxLength: 100,
        pattern: slugPattern,
        description: 'URL slug (will be converted to lowercase)',
      },
      agencyLogo: {
        type: 'string',
        format: 'uri',
        description: 'Hub logo URL',
      },
      phoneNumber: {
        type: 'string',
        minLength: 1,
        description: 'Phone number with country code',
      },
      location: {
        type: 'object',
        required: ['city', 'country', 'lat', 'lng'],
        properties: {
          city: {
            type: 'string',
            minLength: 1,
            description: 'City name',
          },
          state: {
            type: 'string',
            description: 'State/Province',
          },
          country: {
            type: 'string',
            minLength: 1,
            description: 'Country name',
          },
          lat: {
            type: ['number', 'string'],
            description: 'Latitude (number or string)',
          },
          lng: {
            type: ['number', 'string'],
            description: 'Longitude (number or string)',
          },
          streetAddress: {
            type: 'string',
            description: 'Street address',
          },
        },
        description: 'Hub location',
      },
    },
  },
} as const;

/**
 * Update hub profile schema (supports both Hub and User fields for multi-step onboarding)
 * Note: Slug lowercase transform and lat/lng union handled in controller
 */
export const hubUpdateHubProfileBodySchema = {
  body: {
    type: 'object',
    properties: {
      // Hub ID (optional - for users with multiple hubs)
      hubId: {
        type: 'string',
        description: 'Hub ID to update (for users with multiple hubs)',
      },
      // === HUB FIELDS ===
      agencyName: {
        type: 'string',
        minLength: 2,
        maxLength: 40,
        description: 'Hub/Agency name',
      },
      slug: {
        type: 'string',
        minLength: 3,
        maxLength: 100,
        pattern: slugPattern,
        description: 'URL slug (will be converted to lowercase)',
      },
      agencyLogo: {
        type: 'string',
        format: 'uri',
        description: 'Hub logo URL',
      },
      phoneNumber: {
        type: 'string',
        description: 'Phone number with country code',
      },
      coverImage: {
        type: 'string',
        format: 'uri',
        description: 'Hub cover image URL',
      },
      description: {
        type: 'string',
        maxLength: 1000,
        description: 'Hub description',
      },
      companyType: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'CompanyType ObjectId reference',
      },
      introVideo: {
        type: 'string',
        format: 'uri',
        description: 'Hub intro video URL (YouTube/Vimeo)',
      },
      gallery: {
        type: 'array',
        items: {
          type: 'string',
          format: 'uri',
        },
        description: 'Gallery image URLs',
      },
      autoPopulateImages: {
        type: 'boolean',
        description: 'Auto-populate gallery from services',
      },
      location: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Street address',
          },
          city: {
            type: 'string',
            minLength: 1,
            description: 'City name',
          },
          state: {
            type: 'string',
            description: 'State/Province',
          },
          country: {
            type: 'string',
            minLength: 1,
            description: 'Country name',
          },
          postcode: {
            type: 'string',
            description: 'Postal code',
          },
          lat: {
            type: ['number', 'string'],
            description: 'Latitude (number or string)',
          },
          lng: {
            type: ['number', 'string'],
            description: 'Longitude (number or string)',
          },
        },
        description: 'Hub location',
      },
      displayFullAddress: {
        type: 'boolean',
        description: 'Show full address or just city/country',
      },
      operatingHours: {
        type: 'object',
        properties: {
          monday: dayHoursSchema,
          tuesday: dayHoursSchema,
          wednesday: dayHoursSchema,
          thursday: dayHoursSchema,
          friday: dayHoursSchema,
          saturday: dayHoursSchema,
          sunday: dayHoursSchema,
        },
        description: 'Weekly operating hours',
      },
      socialLinks: socialLinksSchema,
      amenities: {
        type: 'array',
        items: {
          type: 'string',
          pattern: objectIdPattern,
        },
        description: 'Array of Amenity ObjectIds',
      },
      facilities: {
        type: 'array',
        items: {
          type: 'string',
          pattern: objectIdPattern,
        },
        description: 'Array of Facility ObjectIds',
      },
      focusAreas: {
        type: 'array',
        items: {
          type: 'string',
          pattern: objectIdPattern,
        },
        description: 'Array of FocusArea ObjectIds',
      },
      spaceTypes: {
        type: 'array',
        items: {
          type: 'string',
          pattern: objectIdPattern,
        },
        description: 'Array of SpaceType ObjectIds',
      },
      experienceTypes: {
        type: 'array',
        items: {
          type: 'string',
          pattern: objectIdPattern,
        },
        description: 'Array of ExperienceType ObjectIds',
      },
      tags: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'User-added tags',
      },
      services: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Services offered',
      },
      onboardingStep: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        description: 'Current onboarding step',
      },
      // === USER FIELDS (Scale plan only) ===
      professionalTitle: {
        type: 'string',
        description: 'Professional title (Scale plan only)',
      },
      userIntroVideo: {
        type: 'string',
        format: 'uri',
        description: 'User intro video URL (Scale plan only)',
      },
      skills: {
        type: 'array',
        items: {
          type: 'string',
          pattern: objectIdPattern,
        },
        description: 'Array of Skill ObjectIds',
      },
      focusAreaId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Primary FocusArea ObjectId for expert',
      },
      jobPreferences: {
        type: 'array',
        items: {
          type: 'string',
          // Accept both ObjectIds and string names (will be converted to ObjectIds in service)
        },
        description:
          'Array of JobPreference ObjectIds or names (Scale plan only). Names will be converted to ObjectIds.',
      },
      bio: {
        type: 'string',
        maxLength: 500,
        description: 'User bio',
      },
      userLocation: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City',
          },
          country: {
            type: 'string',
            description: 'Country',
          },
          lat: {
            type: 'number',
            description: 'Latitude',
          },
          lng: {
            type: 'number',
            description: 'Longitude',
          },
        },
        description: 'User location',
      },
      userSocialLinks: socialLinksSchema,
      portfolio: {
        type: 'array',
        items: portfolioItemSchema,
        description: 'Portfolio/Projects (Scale plan only)',
      },
      employment: {
        type: 'array',
        items: employmentItemSchema,
        description: 'Work experiences (Scale plan only)',
      },
      education: {
        type: 'array',
        items: educationItemSchema,
        description: 'Education/Qualifications (Scale plan only)',
      },
      languages: {
        type: 'array',
        items: languageItemSchema,
        description: 'Languages and proficiency',
      },
      hourlyRate: {
        type: 'number',
        minimum: 0.01,
        description: 'Hourly rate for job marketplace',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface DayHours {
  open?: string;
  close?: string;
  isClosed?: boolean;
}

export interface SocialLinks {
  website?: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  email?: string;
}

export interface PortfolioItem {
  title: string;
  description?: string;
  images?: string[];
  skills?: string[];
  year?: string;
}

export interface EmploymentItem {
  title: string;
  company: string;
  duration?: string;
  description?: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  year: string;
}

export interface LanguageItem {
  languageId: string;
  proficiency: 'Basic' | 'Conversational' | 'Proficient' | 'Fluent' | 'Native';
}

export interface HubLocation {
  city: string;
  state?: string;
  country: string;
  lat: number | string; // Can be number or string
  lng: number | string; // Can be number or string
  streetAddress?: string;
  address?: string;
  postcode?: string;
}

export interface HubCreateHubProfileInput {
  agencyName: string;
  slug: string; // Will be converted to lowercase in controller
  agencyLogo: string;
  phoneNumber: string;
  location: HubLocation;
}

export interface HubUpdateHubProfileInput {
  hubId?: string; // Hub ID to update (for users with multiple hubs)
  agencyName?: string;
  slug?: string; // Will be converted to lowercase in controller
  agencyLogo?: string;
  phoneNumber?: string;
  coverImage?: string;
  description?: string;
  companyType?: string;
  introVideo?: string;
  gallery?: string[];
  autoPopulateImages?: boolean;
  location?: HubLocation;
  displayFullAddress?: boolean;
  operatingHours?: {
    monday?: DayHours;
    tuesday?: DayHours;
    wednesday?: DayHours;
    thursday?: DayHours;
    friday?: DayHours;
    saturday?: DayHours;
    sunday?: DayHours;
  };
  socialLinks?: SocialLinks;
  amenities?: string[];
  facilities?: string[];
  focusAreas?: string[];
  spaceTypes?: string[];
  experienceTypes?: string[];
  tags?: string[];
  services?: string[];
  onboardingStep?: number;
  professionalTitle?: string;
  userIntroVideo?: string;
  skills?: string[];
  focusAreaId?: string;
  jobPreferences?: string[];
  bio?: string;
  userLocation?: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  userSocialLinks?: SocialLinks;
  portfolio?: PortfolioItem[];
  employment?: EmploymentItem[];
  education?: EducationItem[];
  languages?: LanguageItem[];
  hourlyRate?: number;
}
