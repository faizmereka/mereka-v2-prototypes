// =============================================================================
// Types for Create Job Wizard
// =============================================================================

export type EmploymentType = 'full-time' | 'freelance';
export type JobLocation = 'remote' | 'on-site';
export type AccessMode = 'public' | 'private';
export type StartDateType = 'asap' | 'flexible' | 'specific';
export type JobDuration = 'less-than-1-month' | '1-6-months' | 'more-than-6-months' | 'ongoing';
export type PricingType = 'fixed' | 'hourly';
export type CreateJobStep = 'overview' | 'requirements' | 'timeline-budget' | 'your-detail' | 'confirmation';

export interface ServiceCategory {
  id: string;
  name: string;
  serviceTypes: ServiceType[];
}

export interface ServiceType {
  id: string;
  name: string;
}

export interface ExpertLevel {
  id: string;
  name: string;
  description?: string;
}

export interface JobBudget {
  pricingType: PricingType;
  fromAmount: number;
  upToAmount?: number;
}

export interface OrganizationDetails {
  name?: string;
  logo?: string;
  about?: string;
}

export interface CreateJobFormData {
  // Step 1: Overview
  jobTitle: string;
  employmentType: EmploymentType;
  categoryId: string;
  serviceTypeId: string;
  expertLevelId: string;
  jobLocation: JobLocation;
  accessMode: AccessMode;

  // Step 2: Requirements
  jobDescription: string;
  jobSummary: string;
  attachments: JobAttachment[];
  skills: string[];

  // Step 3: Timeline & Budget
  startDateType: StartDateType;
  startDate?: Date;
  duration: JobDuration;
  currency: string;
  budget: JobBudget;

  // Step 4: Your Detail
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  phoneCountryCode?: string;
  organization: OrganizationDetails;
}

export interface JobAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface CreateJobPayload {
  title: string;
  employmentType: EmploymentType;
  categoryId: string;
  serviceTypeId: string;
  expertLevelId: string;
  location: JobLocation;
  accessMode: AccessMode;
  description: string;
  summary: string;
  attachments: JobAttachment[];
  skills: string[];
  startDateType: StartDateType;
  startDate?: string;
  duration: JobDuration;
  currency: string;
  pricingType: PricingType;
  budgetFrom: number;
  budgetTo?: number;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  organizationName?: string;
  organizationLogo?: string;
  aboutOrganization?: string;
  hubId: string;
  status: 'draft' | 'published';
}

export interface Job {
  _id: string;
  title: string;
  employmentType: EmploymentType;
  categoryId: string;
  serviceTypeId: string;
  expertLevelId: string;
  location: JobLocation;
  accessMode: AccessMode;
  description: string;
  summary: string;
  attachments: JobAttachment[];
  skills: string[];
  startDateType: StartDateType;
  startDate?: string;
  duration: JobDuration;
  currency: string;
  pricingType: PricingType;
  budgetFrom: number;
  budgetTo?: number;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  organizationName?: string;
  organizationLogo?: string;
  aboutOrganization?: string;
  hubId: string;
  status: 'draft' | 'published' | 'closed';
  applicantsCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Default values
export const DEFAULT_CREATE_JOB_FORM: CreateJobFormData = {
  // Step 1
  jobTitle: '',
  employmentType: 'freelance',
  categoryId: '',
  serviceTypeId: '',
  expertLevelId: '',
  jobLocation: 'remote',
  accessMode: 'public',

  // Step 2
  jobDescription: '',
  jobSummary: '',
  attachments: [],
  skills: [],

  // Step 3
  startDateType: 'asap',
  duration: '1-6-months',
  currency: 'MYR',
  budget: {
    pricingType: 'fixed',
    fromAmount: 0,
  },

  // Step 4
  contactName: '',
  contactEmail: '',
  organization: {},
};

// Reference data for dropdowns
export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full-time', label: 'Full-time', description: 'Includes salary, benefits, and long-term commitment' },
  { value: 'freelance', label: 'Freelance', description: 'Project-based, independent contract work' },
];

export const JOB_LOCATION_OPTIONS = [
  { value: 'remote', label: 'Remote', description: 'Work from anywhere' },
  { value: 'on-site', label: 'On-site', description: 'Work at a specific location' },
];

export const ACCESS_MODE_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone can view and apply' },
  { value: 'private', label: 'Private', description: 'Only invited experts can apply' },
];

export const START_DATE_OPTIONS = [
  { value: 'asap', label: 'As soon as possible' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'specific', label: 'Specific date' },
];

export const DURATION_OPTIONS = [
  { value: 'less-than-1-month', label: 'Less than 1 month' },
  { value: '1-6-months', label: '1 - 6 months' },
  { value: 'more-than-6-months', label: 'More than 6 months' },
  { value: 'ongoing', label: 'Ongoing' },
];

export const PRICING_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed price' },
  { value: 'hourly', label: 'Hourly rate' },
];

export const CURRENCY_OPTIONS = [
  { value: 'MYR', label: 'MYR - Malaysian Ringgit', symbol: 'RM' },
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'SGD', label: 'SGD - Singapore Dollar', symbol: 'S$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
];

export const EXPERT_LEVEL_OPTIONS: ExpertLevel[] = [
  { id: 'entry', name: 'Entry Level', description: '0-2 years of experience' },
  { id: 'intermediate', name: 'Intermediate', description: '2-5 years of experience' },
  { id: 'expert', name: 'Expert', description: '5+ years of experience' },
];
