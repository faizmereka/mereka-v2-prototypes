import {
  AvailabilityType,
  ExpertiseMode,
  ExpertiseStatus,
  LinkMode,
  QuestionType,
  TicketType,
} from '@core/models/Expertise';

/**
 * Expertise schemas - Native JSON Schema
 * Note: Slug lowercase transform and boolean/number coercion handled in controller
 */

/**
 * Location schema - relaxed for draft saving
 */
const locationSchema = {
  type: 'object',
  properties: {
    locationType: {
      type: 'string',
      enum: ['hub', 'new', 'other'],
      description: 'Location type',
    },
    venueName: {
      type: 'string',
      description: 'Venue name',
    },
    addressAdditionalNote: {
      type: 'string',
      description: 'Additional address notes',
    },
    autofill: {
      type: 'boolean',
      default: false,
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
    location: {
      type: 'string',
      description: 'Location name',
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
 * Operating day schema - relaxed for draft saving
 */
const operatingDaySchema = {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      description: 'Day key',
    },
    fullTitle: {
      type: 'string',
      description: 'Full day title',
    },
    title: {
      type: 'string',
      description: 'Day title',
    },
    isActive: {
      type: 'boolean',
      default: false,
      description: 'Whether day is active',
    },
    fullDay: {
      type: 'boolean',
      default: true,
      description: 'Whether it is a full day',
    },
    startTime: {
      type: 'string',
      default: '',
      description: 'Start time',
    },
    endTime: {
      type: 'string',
      default: '',
      description: 'End time',
    },
  },
} as const;

/**
 * Operating hours schema - relaxed for draft saving
 */
const operatingHoursSchema = {
  type: 'object',
  properties: {
    autofill: {
      type: 'boolean',
      default: false,
      description: 'Auto-fill flag',
    },
    sameOperatingHoursForAll: {
      type: 'boolean',
      default: false,
      description: 'Same hours for all days',
    },
    allOperatingHours: {
      type: 'boolean',
      default: false,
      description: 'All operating hours flag',
    },
    allOperatingStartTime: {
      type: 'string',
      description: 'All days start time',
    },
    allOperatingEndTime: {
      type: 'string',
      description: 'All days end time',
    },
    days: {
      type: 'array',
      items: operatingDaySchema,
      default: [],
      description: 'Operating days',
    },
  },
} as const;

/**
 * Ticket schema - relaxed for draft saving
 */
const ticketSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Ticket ID',
    },
    ticketName: {
      type: 'string',
      description: 'Ticket name',
    },
    ticketType: {
      type: 'string',
      enum: Object.values(TicketType),
      description: 'Ticket type',
    },
    standardRate: {
      type: 'number',
      minimum: 0,
      description: 'Standard rate (must be non-negative)',
    },
    ticketQty: {
      type: 'number',
      minimum: 0,
      description: 'Ticket quantity (must be non-negative)',
    },
    description: {
      type: 'string',
      description: 'Ticket description',
    },
    expertiseMode: {
      type: 'string',
      enum: Object.values(ExpertiseMode),
      description: 'Expertise mode',
    },
    sessionDuration: {
      type: 'string',
      description: 'Session duration',
    },
    estimatedDuration: {
      type: 'string',
      description: 'Estimated duration',
    },
    hours: {
      type: 'string',
      description: 'Hours',
    },
    minutes: {
      type: 'string',
      description: 'Minutes',
    },
    duration: {
      type: 'string',
      description: 'Duration',
    },
    hasBufferTime: {
      type: 'boolean',
      default: false,
      description: 'Has buffer time',
    },
    bufferTime: {
      type: 'string',
      description: 'Buffer time',
    },
    flexibleBooking: {
      type: 'boolean',
      default: false,
      description: 'Flexible booking',
    },
    instantBooking: {
      type: 'string',
      description: 'Instant booking',
    },
    canRequestForSession: {
      type: 'boolean',
      default: false,
      description: 'Can request for session',
    },
    privateGroup: {
      type: 'string',
      description: 'Private group',
    },
    bookPrivateGroup: {
      type: 'string',
      description: 'Book private group',
    },
    hasCutoffTime: {
      type: 'boolean',
      default: false,
      description: 'Has cutoff time',
    },
    cutoffTime: {
      type: 'string',
      description: 'Cutoff time',
    },
    cutoffNumber: {
      type: 'number',
      description: 'Cutoff number',
    },
    cutOffTimeBooking: {
      type: 'string',
      description: 'Cutoff time for booking',
    },
    cutoffBeforeAfter: {
      type: 'string',
      description: 'Cutoff before/after',
    },
    maxCutoffTime: {
      type: 'string',
      description: 'Max cutoff time',
    },
    specificBookingStartTime: {
      type: 'string',
      format: 'date-time',
      description: 'Specific booking start time (ISO 8601)',
    },
    specificBookingEndTime: {
      type: 'string',
      format: 'date-time',
      description: 'Specific booking end time (ISO 8601)',
    },
    ticketPeriod: {
      type: 'string',
      description: 'Ticket period',
    },
    guestsDuration: {
      type: 'string',
      description: 'Guests duration',
    },
    guestsCutoffTime: {
      type: 'string',
      description: 'Guests cutoff time',
    },
    specialRate: {
      type: 'string',
      description: 'Special rate',
    },
    bookingDuration: {
      type: 'string',
      description: 'Booking duration',
    },
  },
} as const;

/**
 * Custom question schema - relaxed for draft saving
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
      enum: Object.values(QuestionType),
      description: 'Question type',
    },
    saveStatus: {
      type: 'boolean',
      default: false,
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
 * Custom questions schema
 */
const customQuestionsSchema = {
  type: 'object',
  properties: {
    isQuestionMandatory: {
      type: 'boolean',
      default: false,
      description: 'Whether questions are mandatory',
    },
    questionArray: {
      type: 'array',
      items: customQuestionSchema,
      default: [],
      description: 'Array of custom questions',
    },
  },
} as const;

/**
 * Host schema - relaxed for draft saving
 */
const hostSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Host ID',
    },
    name: {
      type: 'string',
      description: 'Host name',
    },
    email: {
      type: 'string',
      description: 'Host email',
    },
    profileUrl: {
      type: 'string',
      description: 'Host profile URL',
    },
    roleId: {
      type: 'string',
      description: 'Host role ID',
    },
    description: {
      type: 'string',
      description: 'Host description',
    },
  },
} as const;

/**
 * Create/Update Expertise Schema - relaxed for draft saving
 * Note: Slug lowercase transform handled in controller
 * Validation for required fields should be done in publish API
 */
export const hubUpsertExpertiseSchema = {
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Expertise ID (optional, for update)',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      expertiseTitle: {
        type: 'string',
        maxLength: 200,
        description: 'Expertise title',
      },
      expertiseDescription: {
        type: 'string',
        description: 'Expertise description',
      },
      expertiseSummary: {
        type: 'string',
        maxLength: 200,
        description: 'Expertise summary',
      },
      host: hostSchema,
      tags: {
        type: 'array',
        items: {
          type: 'string',
        },
        default: [],
        description: 'Tags',
      },
      expertiseTypes: {
        type: 'array',
        items: {
          type: 'string',
        },
        default: [],
        description: 'Expertise types',
      },
      primaryLanguage: {
        type: 'string',
        default: 'English',
        description: 'Primary language',
      },
      secondaryLanguages: {
        type: 'array',
        items: {
          type: 'string',
        },
        default: [],
        description: 'Secondary languages',
      },
      slug: {
        type: 'string',
        description: 'Slug (will be converted to lowercase)',
      },
      location: locationSchema,
      linkMode: {
        type: 'string',
        enum: Object.values(LinkMode),
        default: LinkMode.SEND,
        description: 'Link mode',
      },
      expertiseLink: {
        type: 'string',
        description: 'Expertise link URL',
      },
      displayFullAddress: {
        type: 'boolean',
        default: false,
        description: 'Display full address',
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
        default: [],
        description: 'Gallery image URLs',
      },
      infoForBooker: {
        type: 'string',
        maxLength: 500,
        description: 'Info for booker',
      },
      expertiseInstructions: {
        type: 'string',
        maxLength: 500,
        description: 'Expertise instructions',
      },
      customQuestions: customQuestionsSchema,
      feePaidBy: {
        type: 'string',
        default: 'learner',
        description: 'Fee paid by',
      },
      operatingHours: operatingHoursSchema,
      availabilityType: {
        type: 'string',
        enum: Object.values(AvailabilityType),
        default: AvailabilityType.MANUAL,
        description: 'Availability type',
      },
      ticket: {
        type: 'array',
        items: ticketSchema,
        default: [],
        description: 'Tickets',
      },
      audienceType: {
        type: 'string',
        description: 'Audience type',
      },
      hubId: {
        type: 'string',
        description: 'Hub ID',
      },
      createdBy: {
        type: 'string',
        description: 'Creator ID',
      },
      status: {
        type: 'string',
        enum: Object.values(ExpertiseStatus),
        default: ExpertiseStatus.DRAFT,
        description: 'Expertise status',
      },
      currency: {
        type: 'string',
        default: 'MYR',
        description: 'Currency',
      },
      rating: {
        type: 'number',
        minimum: 0,
        maximum: 5,
        description: 'Rating',
      },
      isDisabled: {
        type: 'boolean',
        default: false,
        description: 'Whether expertise is disabled',
      },
      mandatoryQuestionsForBooking: {
        type: 'boolean',
        default: false,
        description: 'Mandatory questions for booking',
      },
      materialProvided: {
        type: 'array',
        items: {
          type: 'string',
        },
        default: [],
        description: 'Materials provided',
      },
      materialNeedToBring: {
        type: 'array',
        items: {
          type: 'string',
        },
        default: [],
        description: 'Materials needed to bring',
      },
    },
  },
} as const;

/**
 * Get Expertise by ID Schema
 */
export const hubGetExpertiseByIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        description: 'Expertise ID',
      },
    },
  },
} as const;

/**
 * Query Expertises Schema
 * Note: Boolean/number coercion handled by Fastify coerceTypes
 */
export const hubQueryExpertisesSchema = {
  querystring: {
    type: 'object',
    properties: {
      hubId: {
        type: 'string',
        description: 'Hub ID filter',
      },
      createdBy: {
        type: 'string',
        description: 'Created by user ID filter',
      },
      status: {
        type: 'string',
        enum: Object.values(ExpertiseStatus),
        description: 'Status filter',
      },
      isDisabled: {
        type: 'boolean',
        description: 'Disabled status filter',
      },
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Items per page',
      },
      sortBy: {
        type: 'string',
        default: 'createdAt',
        description: 'Sort field',
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        default: 'desc',
        description: 'Sort order',
      },
    },
  },
} as const;

/**
 * Delete Expertise Schema
 */
export const hubDeleteExpertiseSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        description: 'Expertise ID',
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
  address: string;
  country: string;
  state?: string;
  city: string;
  lat?: number;
  lng?: number;
}

export interface OperatingDay {
  key: string;
  fullTitle: string;
  title: string;
  isActive?: boolean;
  fullDay?: boolean;
  startTime?: string;
  endTime?: string;
}

export interface OperatingHours {
  autofill?: boolean;
  sameOperatingHoursForAll?: boolean;
  allOperatingHours?: boolean;
  allOperatingStartTime?: string;
  allOperatingEndTime?: string;
  days: OperatingDay[];
}

export interface Ticket {
  id?: string; // Frontend-generated ID, stripped by backend - Mongoose generates _id
  ticketName: string;
  ticketType: TicketType;
  standardRate: number;
  ticketQty: number;
  description?: string;
  expertiseMode: ExpertiseMode;
  sessionDuration?: string;
  estimatedDuration?: string;
  hours?: string;
  minutes?: string;
  duration?: string;
  hasBufferTime?: boolean;
  bufferTime?: string;
  flexibleBooking?: boolean;
  instantBooking?: string;
  canRequestForSession?: boolean;
  privateGroup?: string;
  bookPrivateGroup?: string;
  hasCutoffTime?: boolean;
  cutoffTime?: string;
  cutoffNumber?: number;
  cutOffTimeBooking?: string;
  cutoffBeforeAfter?: string;
  maxCutoffTime?: string;
  specificBookingStartTime?: string;
  specificBookingEndTime?: string;
  ticketPeriod?: string;
  guestsDuration?: string;
  guestsCutoffTime?: string;
  specialRate?: string;
  bookingDuration?: string;
}

export interface CustomQuestion {
  questionLabel: string;
  questionType: QuestionType;
  saveStatus?: boolean;
  dropDown?: string[];
  checkBox?: string[];
  multipleChoices?: string[];
}

export interface CustomQuestions {
  isQuestionMandatory?: boolean;
  questionArray?: CustomQuestion[];
}

export interface Host {
  id: string;
  name: string;
  profileUrl: string;
  description: string;
}

export interface HubUpsertExpertiseInput {
  expertiseTitle: string;
  expertiseDescription: string;
  expertiseSummary: string;
  host: Host;
  expertiseTypes?: string[];
  primaryLanguage: string;
  secondaryLanguages?: string[];
  slug: string; // Will be converted to lowercase in controller
  location?: Location;
  linkMode?: LinkMode;
  expertiseLink?: string;
  displayFullAddress?: boolean;
  coverPhoto: string;
  gallery?: string[];
  infoForBooker?: string;
  expertiseInstructions?: string;
  customQuestions?: CustomQuestions;
  feePaidBy?: string;
  operatingHours?: OperatingHours;
  availabilityType?: AvailabilityType;
  ticket: Ticket[];
  audienceType?: string;
  hubId: string;
  createdBy: string;
  status?: ExpertiseStatus;
  currency?: string;
  rating?: number;
  isDisabled?: boolean;
  mandatoryQuestionsForBooking?: boolean;
  materialProvided?: string[];
  materialNeedToBring?: string[];
}

export interface HubUpsertExpertiseParams {
  id?: string;
}

export interface HubGetExpertiseByIdInput {
  id: string;
}

export interface HubQueryExpertisesInput {
  hubId?: string;
  createdBy?: string;
  status?: ExpertiseStatus;
  isDisabled?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface HubDeleteExpertiseInput {
  id: string;
}
