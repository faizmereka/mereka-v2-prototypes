import type { FastifySchema } from 'fastify';

// ============================================================================
// Types - Response Interfaces for Web Home Page
// ============================================================================

export interface WebHomeExpertiseItem {
  _id: string;
  expertiseTitle: string;
  slug: string;
  expertiseSummary?: string;
  coverPhoto?: string;
  currency: string;
  rating?: number;
  ticket?: Array<{
    ticketType: string;
    standardRate: number;
  }>;
  host?: {
    name?: string;
    profileUrl?: string;
  };
  location?: {
    city?: string;
    country?: string;
  };
}

export interface WebHomeExperienceItem {
  _id: string;
  experienceTitle: string;
  slug: string;
  experienceDescription?: string;
  experienceType: 'Physical' | 'Virtual' | 'Hybrid';
  coverPhoto?: string;
  currency: string;
  rating?: number;
  ticket?: Array<{
    ticketType: string;
    ticketPrice: number;
  }>;
  hostDetails?: Array<{
    name?: string;
    photoUrl?: string;
  }>;
  location?: {
    city?: string;
    country?: string;
  };
}

export interface WebHomeDataResponse {
  expertises: WebHomeExpertiseItem[];
  experiences: WebHomeExperienceItem[];
}

export interface WebHomeReviewItem {
  reviewRating: number;
  reviewDescription: string;
  reviewerName: string;
  serviceName: string;
  serviceSlug?: string;
  serviceType?: 'experience' | 'expertise';
  hubLogo: string;
  hubName: string;
  hubLocation: string;
  hubSlug: string;
  reviewPhoto?: string;
  hostType: 'hub' | 'expert';
}

// ============================================================================
// Fastify Route Schemas
// ============================================================================

export const getHomeDataSchema: FastifySchema = {
  tags: ['Web - Home'],
  summary: 'Get home page data',
  description:
    'Retrieves top 3 active expertises and experiences for the home page, sorted by creation date (newest first)',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            expertises: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  expertiseTitle: { type: 'string' },
                  slug: { type: 'string' },
                  expertiseSummary: { type: 'string' },
                  coverPhoto: { type: 'string' },
                  currency: { type: 'string' },
                  rating: { type: 'number' },
                  ticket: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        ticketType: { type: 'string' },
                        standardRate: { type: 'number' },
                      },
                    },
                  },
                  host: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      profileUrl: { type: 'string' },
                    },
                  },
                  location: {
                    type: 'object',
                    properties: {
                      city: { type: 'string' },
                      country: { type: 'string' },
                    },
                  },
                },
              },
            },
            experiences: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  experienceTitle: { type: 'string' },
                  slug: { type: 'string' },
                  experienceDescription: { type: 'string' },
                  experienceType: { type: 'string', enum: ['Physical', 'Virtual', 'Hybrid'] },
                  coverPhoto: { type: 'string' },
                  currency: { type: 'string' },
                  rating: { type: 'number' },
                  ticket: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        ticketType: { type: 'string' },
                        ticketPrice: { type: 'number' },
                      },
                    },
                  },
                  hostDetails: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        photoUrl: { type: 'string' },
                      },
                    },
                  },
                  location: {
                    type: 'object',
                    properties: {
                      city: { type: 'string' },
                      country: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const getHomeReviewsSchema: FastifySchema = {
  tags: ['Web - Home'],
  summary: 'Get featured reviews for home page',
  description:
    'Retrieves featured high-rated reviews from booking reviews for display on the home page',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              reviewRating: { type: 'number' },
              reviewDescription: { type: 'string' },
              reviewerName: { type: 'string' },
              serviceName: { type: 'string' },
              serviceSlug: { type: 'string' },
              serviceType: { type: 'string', enum: ['experience', 'expertise'] },
              hubLogo: { type: 'string' },
              hubName: { type: 'string' },
              hubLocation: { type: 'string' },
              hubSlug: { type: 'string' },
              reviewPhoto: { type: 'string' },
              hostType: { type: 'string', enum: ['hub', 'expert'] },
            },
          },
        },
      },
    },
  },
};
