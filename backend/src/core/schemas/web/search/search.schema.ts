/**
 * Schema for unified search API
 */

export const searchQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      q: { type: 'string', minLength: 1, description: 'Search query' },
      limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
    },
    required: ['q'],
  },
} as const;

export interface SearchQuery {
  q: string;
  limit?: number;
}

export interface SearchResultItem {
  id: string;
  type: 'experts' | 'hubs' | 'expertise' | 'experiences' | 'jobs';
  title: string;
  image?: string;
  slug?: string;
}

export interface SearchResponse {
  success: boolean;
  data: {
    results: SearchResultItem[];
    total: number;
  };
}
