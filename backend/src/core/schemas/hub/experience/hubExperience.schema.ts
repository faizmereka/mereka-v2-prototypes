/**
 * Experience schemas - Native JSON Schema
 * Note: Preprocess transformations (experienceType 'Online'->'Virtual', status lowercase->uppercase)
 * and refine validations (conditional requirements) handled in controller
 */

/**
 * Location schema
 * Note: All fields optional for draft saving and express experiences
 */
const locationSchema = {
  type: 'object',
  properties: {
    addressAdditionalNote: {
      type: 'string',
      description: 'Additional address notes',
    },
    autofill: {
      type: 'boolean',
      description: 'Auto-fill flag',
    },
    address: {
      type: 'string',
      description: 'Street address',
    },
    country: {
      type: 'string',
      description: 'Country',
    },
    state: {
      type: 'string',
      description: 'State',
    },
    city: {
      type: 'string',
      description: 'City',
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
} as const;

/**
 * Topic reference schema
 */
const topicRefSchema = {
  type: 'object',
  properties: {
    theme: {
      type: 'string',
      description: 'Theme ID',
    },
    topic: {
      type: 'string',
      description: 'Topic ID',
    },
  },
} as const;

/**
 * Host details schema
 */
const hostSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'User ID',
    },
    name: {
      type: 'string',
      description: 'Host name',
    },
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address',
    },
    photoUrl: {
      oneOf: [
        { type: 'string', format: 'uri' },
        { type: 'string', maxLength: 0 },
      ],
      description: 'Photo URL (or empty string)',
    },
    roleId: {
      type: 'string',
      description: 'Role ID',
    },
    description: {
      type: 'string',
      description: 'Host description/bio',
    },
  },
} as const;

/**
 * Ticket schema
 */
const ticketSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Ticket ID',
    },
    ticketType: {
      type: 'string',
      description: 'Ticket type',
    },
    ticketName: {
      type: 'string',
      description: 'Ticket name',
    },
    ticketPrice: {
      type: 'number',
      minimum: 0,
      description: 'Ticket price (must be at least 0)',
    },
    ticketQty: {
      type: 'number',
      minimum: 1,
      description: 'Ticket quantity (must be at least 1)',
    },
    cutoffNumber: {
      type: 'number',
      description: 'Cutoff number',
    },
    cutoffTime: {
      type: 'string',
      description: 'Cutoff time',
    },
    cutoffBeforeAfter: {
      type: 'string',
      description: 'Cutoff before/after',
    },
    description: {
      type: 'string',
      description: 'Ticket description',
    },
    hasCutoffTime: {
      type: 'boolean',
      description: 'Has cutoff time',
    },
  },
} as const;

/**
 * Schedule schema
 * Note: startDate/endDate union (string or Date) handled in controller
 */
const scheduleSchema = {
  type: 'object',
  properties: {
    uid: {
      type: 'string',
      description: 'Unique identifier for the schedule',
    },
    recurringRule: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Recurring rule array',
    },
    startDate: {
      type: 'string',
      format: 'date-time',
      description: 'Start date (ISO 8601 string)',
    },
    endDate: {
      type: 'string',
      format: 'date-time',
      description: 'End date (ISO 8601 string, optional)',
    },
    recurringType: {
      type: 'string',
      description: 'Recurring type',
    },
  },
} as const;

/**
 * Custom question schema
 */
const customQuestionSchema = {
  type: 'object',
  properties: {
    questionLabel: {
      type: 'string',
      description: 'Question label',
    },
    questionType: {
      type: 'string',
      description: 'Question type',
    },
    saveStatus: {
      type: 'boolean',
      description: 'Save status',
    },
    dropDown: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Dropdown options',
    },
    checkBox: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Checkbox options',
    },
    multipleChoices: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Multiple choice options',
    },
  },
} as const;

/**
 * Create Experience Schema
 *
 * Supports two listing types:
 * - PLATFORM: Full-featured, searchable on mereka.io (requires category, description for ACTIVE status)
 * - EXPRESS: Minimal, direct-link only (no topics, location, audience details, gallery, etc.)
 *
 * Supports DRAFTED status (save & exit) - allows saving with minimal data.
 * Business validation for ACTIVE status requirements handled in controller/service layer.
 *
 * Note: Preprocess transformations and refine validations handled in controller
 */
export const hubCreateExperienceSchema = {
  body: {
    type: 'object',
    required: ['experienceTitle', 'slug', 'experienceType', 'hubId'],
    properties: {
      experienceTitle: {
        type: 'string',
        maxLength: 200,
        description: 'Experience title',
      },
      slug: {
        type: 'string',
        description: 'Slug (will be converted to lowercase)',
      },
      experienceDescription: {
        type: 'string',
        default: '',
        description: 'Experience description (optional for express experiences)',
      },
      experienceType: {
        type: 'string',
        enum: ['Physical', 'Virtual', 'Hybrid', 'Online'], // 'Online' will be transformed to 'Virtual'
        description: 'Experience type (will transform "Online" to "Virtual")',
      },
      hubId: {
        type: 'string',
        description: 'Hub ID',
      },
      experienceCategory: {
        type: 'string',
        description: 'Category (required for platform, not used in express)',
      },
      experienceTopics: {
        type: 'array',
        items: topicRefSchema,
        default: [],
        description: 'Experience topics (platform only, not used in express)',
      },
      location: locationSchema,
      timeZone: {
        type: 'string',
        description: 'Time zone',
      },
      meetingLink: {
        oneOf: [
          { type: 'string', format: 'uri' },
          { type: 'string', maxLength: 0 },
        ],
        description: 'Meeting link URL (or empty string)',
      },
      meetingLocation: {
        type: 'string',
        description: 'Meeting location',
      },
      zoomMeetingData: {
        type: 'object',
        additionalProperties: true,
        description: 'Zoom meeting data',
      },
      meetingLinkEditedDate: {
        type: 'string',
        format: 'date-time',
        description: 'Meeting link edited date (ISO 8601)',
      },
      hostDetails: {
        type: 'array',
        items: hostSchema,
        default: [],
        description: 'Host details array',
      },
      noHost: {
        type: 'boolean',
        default: false,
        description: 'No host flag',
      },
      hostType: {
        type: 'string',
        description: 'Host type',
      },
      audienceType: {
        type: 'string',
        enum: ['Everyone', 'Members Only', 'Hidden'],
        default: 'Everyone',
        description: 'Audience type',
      },
      maximumCapacity: {
        type: 'number',
        minimum: 1,
        description: 'Maximum capacity',
      },
      canBookAsPrivate: {
        type: 'boolean',
        default: false,
        description: 'Can book as private',
      },
      targetAudience: {
        type: 'array',
        items: {
          type: 'string',
        },
        default: [],
        description: 'Target audience array',
      },
      expertiseLevel: {
        type: 'string',
        description: 'Expertise level',
      },
      expertiseFields: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Expertise fields',
      },
      primaryLanguage: {
        type: 'string',
        default: 'English',
        description: 'Primary language (platform only, not used in express)',
      },
      secondaryLanguage: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Secondary languages',
      },
      feePaidBy: {
        type: 'string',
        enum: ['learner', 'hub'],
        default: 'learner',
        description: 'Fee paid by',
      },
      currency: {
        type: 'string',
        default: 'MYR',
        description: 'Currency',
      },
      currencyType: {
        type: 'string',
        description: 'Currency type',
      },
      ticket: {
        type: 'array',
        items: ticketSchema,
        description: 'Tickets array',
      },
      experienceDuration: {
        type: 'number',
        minimum: 0,
        description: 'Experience duration',
      },
      schedules: {
        type: 'array',
        items: scheduleSchema,
        description: 'Schedules array',
      },
      coverPhoto: {
        type: 'string',
        description: 'Cover photo URL (required for ACTIVE status platform experiences)',
      },
      gallery: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Gallery image URLs',
      },
      video: {
        oneOf: [
          { type: 'string', format: 'uri' },
          { type: 'string', maxLength: 0 },
        ],
        description: 'Video URL (or empty string)',
      },
      poster: {
        type: 'string',
        description: 'Poster URL',
      },
      sopPoster: {
        type: 'string',
        description: 'SOP poster URL',
      },
      showAutoImage: {
        type: 'boolean',
        description: 'Show auto image',
      },
      learnerOutcome: {
        type: 'string',
        description: 'Learner outcome',
      },
      instruction: {
        type: 'string',
        description: 'Instructions',
      },
      materialProvided: {
        type: 'string',
        description: 'Materials provided (frontend sends string, not array)',
      },
      materialNeedToBring: {
        type: 'string',
        description: 'Materials needed to bring (frontend sends string, not array)',
      },
      sopInformation: {
        type: 'string',
        description: 'SOP information',
      },
      customQuestions: {
        type: 'object',
        properties: {
          isQuestionMandatory: {
            type: 'boolean',
            description: 'Whether questions are mandatory',
          },
          questionArray: {
            type: 'array',
            items: customQuestionSchema,
            description: 'Array of custom questions',
          },
        },
        description: 'Custom questions',
      },
      customFormJSON: {
        type: 'object',
        additionalProperties: true,
        description: 'Custom form JSON',
      },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'DRAFTED', 'DELETED', 'EXPIRED', 'drafted', 'express'],
        default: 'DRAFTED',
        description: 'Status (will transform lowercase to uppercase, "express" to "ACTIVE")',
      },
      type: {
        type: 'string',
        default: 'platform',
        description: 'Experience type',
      },
      listingType: {
        type: 'string',
        enum: ['platform', 'express'],
        default: 'platform',
        description: 'Listing type',
      },
      priority: {
        type: 'number',
        default: 1000,
        description: 'Priority',
      },
      isFeatured: {
        type: 'boolean',
        default: false,
        description: 'Is featured',
      },
      isShowCaseOnProfile: {
        type: 'boolean',
        description: 'Show on profile',
      },
      views: {
        type: 'number',
        default: 0,
        description: 'View count',
      },
      rating: {
        type: 'number',
        minimum: 0,
        maximum: 5,
        description: 'Rating',
      },
      sessions: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Sessions array',
      },
      service: {
        type: 'object',
        properties: {
          $key: {
            type: 'string',
            description: 'Service key',
          },
        },
        description: 'Service reference',
      },
      createdBy: {
        type: 'string',
        description: 'Creator ID',
      },
    },
  },
} as const;

/**
 * Update Experience Schema (all fields optional except ID)
 * Note: Preprocess transformations handled in controller
 */
export const hubUpdateExperienceSchema = {
  params: {
    type: 'object',
    required: ['hubId', 'id'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      id: {
        type: 'string',
        minLength: 1,
        description: 'Experience ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      experienceTitle: {
        type: 'string',
        maxLength: 200,
        description: 'Experience title',
      },
      slug: {
        type: 'string',
        description: 'Slug (will be converted to lowercase)',
      },
      experienceDescription: {
        type: 'string',
        description: 'Experience description',
      },
      experienceType: {
        type: 'string',
        enum: ['Physical', 'Virtual', 'Hybrid', 'Online'],
        description: 'Experience type (will transform "Online" to "Virtual")',
      },
      hubId: {
        type: 'string',
        description: 'Hub ID',
      },
      experienceCategory: {
        type: 'string',
        description: 'Category',
      },
      experienceTopics: {
        type: 'array',
        items: topicRefSchema,
        description: 'Experience topics',
      },
      location: locationSchema,
      timeZone: {
        type: 'string',
        description: 'Time zone',
      },
      meetingLink: {
        oneOf: [
          { type: 'string', format: 'uri' },
          { type: 'string', maxLength: 0 },
        ],
        description: 'Meeting link URL (or empty string)',
      },
      meetingLocation: {
        type: 'string',
        description: 'Meeting location',
      },
      zoomMeetingData: {
        type: 'object',
        additionalProperties: true,
        description: 'Zoom meeting data',
      },
      meetingLinkEditedDate: {
        type: 'string',
        format: 'date-time',
        description: 'Meeting link edited date (ISO 8601)',
      },
      hostDetails: {
        type: 'array',
        items: hostSchema,
        description: 'Host details array',
      },
      noHost: {
        type: 'boolean',
        description: 'No host flag',
      },
      hostType: {
        type: 'string',
        description: 'Host type',
      },
      audienceType: {
        type: 'string',
        enum: ['Everyone', 'Members Only', 'Hidden'],
        description: 'Audience type',
      },
      maximumCapacity: {
        type: 'number',
        minimum: 1,
        description: 'Maximum capacity',
      },
      canBookAsPrivate: {
        type: 'boolean',
        description: 'Can book as private',
      },
      targetAudience: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Target audience array',
      },
      expertiseLevel: {
        type: 'string',
        description: 'Expertise level',
      },
      expertiseFields: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Expertise fields',
      },
      primaryLanguage: {
        type: 'string',
        description: 'Primary language',
      },
      secondaryLanguage: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Secondary languages',
      },
      feePaidBy: {
        type: 'string',
        enum: ['learner', 'hub'],
        description: 'Fee paid by',
      },
      currency: {
        type: 'string',
        description: 'Currency',
      },
      currencyType: {
        type: 'string',
        description: 'Currency type',
      },
      ticket: {
        type: 'array',
        items: ticketSchema,
        description: 'Tickets array',
      },
      experienceDuration: {
        type: 'number',
        minimum: 0,
        description: 'Experience duration',
      },
      schedules: {
        type: 'array',
        items: scheduleSchema,
        description: 'Schedules array',
      },
      coverPhoto: {
        type: 'string',
        description: 'Cover photo URL',
      },
      gallery: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Gallery image URLs',
      },
      video: {
        oneOf: [
          { type: 'string', format: 'uri' },
          { type: 'string', maxLength: 0 },
        ],
        description: 'Video URL (or empty string)',
      },
      poster: {
        type: 'string',
        description: 'Poster URL',
      },
      sopPoster: {
        type: 'string',
        description: 'SOP poster URL',
      },
      showAutoImage: {
        type: 'boolean',
        description: 'Show auto image',
      },
      learnerOutcome: {
        type: 'string',
        description: 'Learner outcome',
      },
      instruction: {
        type: 'string',
        description: 'Instructions',
      },
      materialProvided: {
        type: 'string',
        description: 'Materials provided (frontend sends string, not array)',
      },
      materialNeedToBring: {
        type: 'string',
        description: 'Materials needed to bring (frontend sends string, not array)',
      },
      sopInformation: {
        type: 'string',
        description: 'SOP information',
      },
      customQuestions: {
        type: 'object',
        properties: {
          isQuestionMandatory: {
            type: 'boolean',
            description: 'Whether questions are mandatory',
          },
          questionArray: {
            type: 'array',
            items: customQuestionSchema,
            description: 'Array of custom questions',
          },
        },
        description: 'Custom questions',
      },
      customFormJSON: {
        type: 'object',
        additionalProperties: true,
        description: 'Custom form JSON',
      },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'DRAFTED', 'DELETED', 'EXPIRED', 'drafted', 'express'],
        description: 'Status (will transform lowercase to uppercase, "express" to "ACTIVE")',
      },
      type: {
        type: 'string',
        description: 'Experience type',
      },
      listingType: {
        type: 'string',
        enum: ['platform', 'express'],
        description: 'Listing type',
      },
      priority: {
        type: 'number',
        description: 'Priority',
      },
      isFeatured: {
        type: 'boolean',
        description: 'Is featured',
      },
      isShowCaseOnProfile: {
        type: 'boolean',
        description: 'Show on profile',
      },
      views: {
        type: 'number',
        description: 'View count',
      },
      rating: {
        type: 'number',
        minimum: 0,
        maximum: 5,
        description: 'Rating',
      },
      service: {
        type: 'object',
        properties: {
          $key: {
            type: 'string',
            description: 'Service key',
          },
        },
        description: 'Service reference',
      },
      createdBy: {
        type: 'string',
        description: 'Creator ID',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface Location {
  addressAdditionalNote?: string;
  autofill?: boolean;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

export interface TopicRef {
  theme: string;
  topic: string;
}

export interface Host {
  userId?: string;
  name?: string;
  email?: string;
  photoUrl?: string;
  roleId?: string;
  description?: string;
}

export interface Ticket {
  id?: string;
  ticketType: string;
  ticketName: string;
  ticketPrice: number;
  ticketQty: number;
  cutoffNumber?: number;
  cutoffTime?: string;
  cutoffBeforeAfter?: string;
  description?: string;
  hasCutoffTime?: boolean;
}

export interface Schedule {
  uid: string;
  recurringRule: string[];
  startDate: string | Date; // Will be converted in controller
  endDate?: string | Date; // Will be converted in controller
  recurringType: string;
}

export interface CustomQuestion {
  questionLabel: string;
  questionType: string;
  saveStatus?: boolean;
  dropDown?: string[];
  checkBox?: string[];
  multipleChoices?: string[];
}

export interface HubCreateExperienceInput {
  experienceTitle: string;
  slug: string; // Will be converted to lowercase in controller
  experienceDescription?: string;
  experienceType: 'Physical' | 'Virtual' | 'Hybrid' | 'Online'; // 'Online' will be transformed to 'Virtual'
  hubId: string;
  experienceCategory?: string;
  experienceTopics?: TopicRef[];
  location?: Location;
  timeZone?: string;
  meetingLink?: string; // Can be URL or empty string
  meetingLocation?: string;
  zoomMeetingData?: Record<string, unknown>;
  meetingLinkEditedDate?: string; // ISO 8601
  hostDetails?: Host[];
  noHost?: boolean;
  hostType?: string;
  audienceType?: 'Everyone' | 'Members Only' | 'Hidden';
  maximumCapacity?: number;
  canBookAsPrivate?: boolean;
  targetAudience?: string[];
  expertiseLevel?: string;
  expertiseFields?: string[];
  primaryLanguage?: string;
  secondaryLanguage?: string[];
  feePaidBy?: 'learner' | 'hub';
  currency?: string;
  currencyType?: string;
  ticket?: Ticket[];
  experienceDuration?: number;
  schedules?: Schedule[];
  coverPhoto?: string; // Required for ACTIVE status platform experiences
  gallery?: string[];
  video?: string; // Can be URL or empty string
  poster?: string;
  sopPoster?: string;
  showAutoImage?: boolean;
  learnerOutcome?: string;
  instruction?: string;
  materialProvided?: string; // Frontend sends string, not array
  materialNeedToBring?: string; // Frontend sends string, not array
  sopInformation?: string;
  customQuestions?: {
    isQuestionMandatory?: boolean;
    questionArray?: CustomQuestion[];
  };
  customFormJSON?: Record<string, unknown>;
  status?: 'ACTIVE' | 'DRAFTED' | 'DELETED' | 'EXPIRED' | 'drafted' | 'express'; // Will be transformed
  type?: string;
  listingType?: 'platform' | 'express';
  priority?: number;
  isFeatured?: boolean;
  isShowCaseOnProfile?: boolean;
  views?: number;
  rating?: number;
  sessions?: string[];
  service?: {
    $key: string;
  };
  createdBy?: string;
}

export interface HubUpdateExperienceInput {
  experienceTitle?: string;
  slug?: string; // Will be converted to lowercase in controller
  experienceDescription?: string;
  experienceType?: 'Physical' | 'Virtual' | 'Hybrid' | 'Online'; // 'Online' will be transformed to 'Virtual'
  hubId?: string;
  experienceCategory?: string;
  experienceTopics?: TopicRef[];
  location?: Location;
  timeZone?: string;
  meetingLink?: string; // Can be URL or empty string
  meetingLocation?: string;
  zoomMeetingData?: Record<string, unknown>;
  meetingLinkEditedDate?: string; // ISO 8601
  hostDetails?: Host[];
  noHost?: boolean;
  hostType?: string;
  audienceType?: 'Everyone' | 'Members Only' | 'Hidden';
  maximumCapacity?: number;
  canBookAsPrivate?: boolean;
  targetAudience?: string[];
  expertiseLevel?: string;
  expertiseFields?: string[];
  primaryLanguage?: string;
  secondaryLanguage?: string[];
  feePaidBy?: 'learner' | 'hub';
  currency?: string;
  currencyType?: string;
  ticket?: Ticket[];
  experienceDuration?: number;
  schedules?: Schedule[];
  coverPhoto?: string;
  gallery?: string[];
  video?: string; // Can be URL or empty string
  poster?: string;
  sopPoster?: string;
  showAutoImage?: boolean;
  learnerOutcome?: string;
  instruction?: string;
  materialProvided?: string; // Frontend sends string, not array
  materialNeedToBring?: string; // Frontend sends string, not array
  sopInformation?: string;
  customQuestions?: {
    isQuestionMandatory?: boolean;
    questionArray?: CustomQuestion[];
  };
  customFormJSON?: Record<string, unknown>;
  status?: 'ACTIVE' | 'DRAFTED' | 'DELETED' | 'EXPIRED' | 'drafted' | 'express'; // Will be transformed
  type?: string;
  listingType?: 'platform' | 'express';
  priority?: number;
  isFeatured?: boolean;
  isShowCaseOnProfile?: boolean;
  views?: number;
  rating?: number;
  service?: {
    $key: string;
  };
  createdBy?: string;
}
