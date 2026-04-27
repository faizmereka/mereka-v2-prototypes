/**
 * Search result item from combined search
 */
export interface SearchResultItem {
  id: string;
  type: SearchType;
  title: string;
  image?: string;
  slug?: string;
}

/**
 * Search types available in the platform
 */
export type SearchType =
  | 'experts'
  | 'hubs'
  | 'expertise'
  | 'experiences'
  | 'jobs';

/**
 * API response for combined search
 */
export interface SearchApiResponse {
  success: boolean;
  data: {
    results: SearchResultItem[];
    total: number;
  };
}

/**
 * Quick link item shown when search is empty
 */
export interface QuickLinkItem {
  title: string;
  description: string;
  icon: string;
  route: string;
}
