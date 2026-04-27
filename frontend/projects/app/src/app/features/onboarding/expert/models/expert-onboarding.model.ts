/**
 * Expert Onboarding Data Models
 * Based on User model expert fields from backend
 */

export type ExpertOnboardingStep = 'your-profile' | 'your-skills' | 'your-background' | 'confirmation';

export interface ExpertLocation {
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  address?: string;
  state?: string;
  postcode?: string;
}

export interface ExpertLanguage {
  languageId: string;
  languageName?: string; // For display
  proficiency: 'basic' | 'conversational' | 'proficient' | 'fluent' | 'native';
}

export interface ExpertPortfolioItem {
  id: string; // Client-side ID for tracking
  title: string;
  description?: string;
  images?: string[];
  skills?: string[]; // Skill IDs
  skillNames?: string[]; // For display
  year?: string;
  projectLink?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExpertEmploymentItem {
  id: string; // Client-side ID for tracking
  title: string; // Job title/role
  company: string;
  city?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  description?: string;
  isOngoing?: boolean;
}

export interface ExpertEducationItem {
  id: string; // Client-side ID for tracking
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  year?: string;
  description?: string;
}

export interface ExpertSocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  email?: string;
}

/**
 * Complete Expert Onboarding Form Data
 */
export interface ExpertOnboardingData {
  // Step 1: Profile
  profilePhoto?: string;
  coverPhoto?: string;
  name: string;
  username?: string;
  location?: ExpertLocation;
  phoneNumber?: string;
  bio?: string;
  socialLinks?: ExpertSocialLinks;

  // Step 2: Skills
  professionalTitle?: string;
  focusAreaId?: string;
  focusAreaName?: string; // For display
  skills?: string[]; // Skill IDs
  skillNames?: string[]; // For display
  languages?: ExpertLanguage[];
  introVideo?: string;
  jobPreferences?: string[]; // JobPreference IDs
  jobPreferenceNames?: string[]; // For display
  hourlyRate?: number;
  currency?: string;

  // Step 3: Background
  portfolio?: ExpertPortfolioItem[];
  employment?: ExpertEmploymentItem[];
  education?: ExpertEducationItem[];
}

/**
 * API Response for Expert Profile
 */
export interface ExpertProfileResponse {
  _id: string;
  email: string;
  name: string;
  username?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  bio?: string;
  phoneNumber?: string;
  location?: ExpertLocation;
  socialLinks?: ExpertSocialLinks;
  professionalTitle?: string;
  focusAreaId?: string;
  skills?: Array<{ _id: string; name: string }>;
  languages?: Array<{
    languageId: { _id: string; name: string };
    proficiency: string;
  }>;
  introVideo?: string;
  jobPreferences?: Array<{ _id: string; name: string }>;
  hourlyRate?: number;
  currency?: string;
  portfolio?: ExpertPortfolioItem[];
  employment?: ExpertEmploymentItem[];
  education?: ExpertEducationItem[];
}

/**
 * API Request for updating Expert Profile
 */
export interface UpdateExpertProfileRequest {
  // Profile fields
  name?: string;
  username?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  bio?: string;
  phoneNumber?: string;
  location?: ExpertLocation;
  socialLinks?: ExpertSocialLinks;

  // Expert fields
  professionalTitle?: string;
  focusAreaId?: string;
  skills?: string[];
  languages?: Array<{
    languageId: string;
    proficiency: string;
  }>;
  introVideo?: string;
  jobPreferences?: string[];
  hourlyRate?: number;
  currency?: string;

  // Background
  portfolio?: Array<Omit<ExpertPortfolioItem, 'id' | 'skillNames'>>;
  employment?: Array<Omit<ExpertEmploymentItem, 'id'>>;
  education?: Array<Omit<ExpertEducationItem, 'id'>>;
}

/**
 * Validation Error
 */
export interface ExpertValidationError {
  step: ExpertOnboardingStep;
  field: string;
  message: string;
}

/**
 * Reference Data Types
 */
export interface Skill {
  _id: string;
  name: string;
  category?: string;
}

export interface Language {
  _id: string;
  name: string;
  code?: string;
}

export interface FocusArea {
  _id: string;
  name: string;
  description?: string;
}

export interface JobPreference {
  _id: string;
  name: string;
  description?: string;
}

export const LANGUAGE_PROFICIENCY_LEVELS = [
  { value: 'basic', label: 'Basic' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'proficient', label: 'Proficient' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'native', label: 'Native' },
] as const;

export const DEFAULT_CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'MYR', label: 'MYR (RM)' },
  { value: 'SGD', label: 'SGD (S$)' },
  { value: 'EUR', label: 'EUR (\u20ac)' },
  { value: 'GBP', label: 'GBP (\u00a3)' },
] as const;
