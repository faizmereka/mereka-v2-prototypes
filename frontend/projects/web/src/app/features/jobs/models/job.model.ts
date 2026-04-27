/**
 * Job Detail Models
 * Matches the backend WebJob schema response
 */

export interface JobServiceCategory {
  category: string;
  serviceType: string;
}

export interface JobBudget {
  pricingType: 'fixed' | 'hourly';
  fromAmount: number;
  upToAmount?: number;
}

export interface JobClient {
  name: string;
  email?: string; // Only for authenticated users
  organizationName?: string;
  organizationImage?: string;
  aboutOrganization?: string;
  hubId?: string;
  rating?: number;
  totalReviews?: number;
}

export interface JobHub {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
}

export interface JobDetail {
  _id: string;
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType: string;
  status: string;
  serviceCategory: JobServiceCategory;
  expertLevel?: string;
  jobLocation?: string;
  preferredLocation?: string[];
  jobBudget: JobBudget;
  jobCurrency: string;
  jobStartDate?: string;
  jobEndDate?: string;
  jobSkills: string[];
  jobUploads?: string[];

  // Client info (always included for public job postings)
  client: JobClient;

  // Hub info
  hub?: JobHub;

  // Timestamps
  createdDate?: Date;
  createdAt: Date;
}

export interface JobListItem {
  _id: string;
  jobTitle: string;
  jobSummary?: string;
  employmentType: string;
  expertLevel?: string;
  jobLocation?: string;
  jobBudget: JobBudget;
  jobCurrency: string;
  jobStartDate?: string;
  jobEndDate?: string;
  serviceCategory: JobServiceCategory;
  organizationName?: string;
  createdDate?: Date;
  createdAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data?: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Info item for display in the job detail page grid
 */
export interface JobInfoItem {
  icon: string;
  label: string;
  value: string;
}
