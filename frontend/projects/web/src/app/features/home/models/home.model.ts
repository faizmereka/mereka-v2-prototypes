/**
 * Home Page Models
 * Matches the backend WebHome schema response
 */

export interface HomeExpertiseHost {
  name?: string;
  profileUrl?: string;
}

export interface HomeExpertiseLocation {
  city?: string;
  country?: string;
}

export interface HomeExpertiseTicket {
  ticketType: string;
  standardRate: number;
}

export interface HomeExpertiseItem {
  _id: string;
  expertiseTitle: string;
  slug: string;
  expertiseSummary?: string;
  coverPhoto?: string;
  currency: string;
  rating?: number;
  ticket?: HomeExpertiseTicket[];
  host?: HomeExpertiseHost;
  location?: HomeExpertiseLocation;
}

export interface HomeExperienceHost {
  name?: string;
  photoUrl?: string;
}

export interface HomeExperienceLocation {
  city?: string;
  country?: string;
}

export interface HomeExperienceTicket {
  ticketType: string;
  ticketPrice: number;
}

export interface HomeExperienceItem {
  _id: string;
  experienceTitle: string;
  slug: string;
  experienceDescription?: string;
  experienceType: 'Physical' | 'Virtual' | 'Hybrid';
  coverPhoto?: string;
  currency: string;
  rating?: number;
  ticket?: HomeExperienceTicket[];
  hostDetails?: HomeExperienceHost[];
  location?: HomeExperienceLocation;
}

export interface HomeData {
  expertises: HomeExpertiseItem[];
  experiences: HomeExperienceItem[];
}

/**
 * Featured review item for the home page reviews section.
 * TODO: Add a v2 backend endpoint `/home/reviews` (or similar) and a ReviewService
 *   to fetch these. Wire up in home.resolver.ts and pass via input() from HomePage.
 */
export interface HomeReviewItem {
  reviewRating: number;
  reviewDescription: string;
  reviewerName: string;
  serviceName: string;
  serviceSlug?: string;
  /** e.g. 'experience', 'expertise' — used for routerLink path */
  serviceType?: string;
  hubLogo: string;
  hubName: string;
  hubLocation: string;
  hubSlug: string;
  reviewPhoto?: string;
  hostType: 'hub' | 'expert';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
