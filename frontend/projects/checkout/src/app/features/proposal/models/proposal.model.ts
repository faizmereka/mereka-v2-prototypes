/**
 * Proposal Checkout Models
 */

// ============================================================================
// Job Summary
// ============================================================================

export interface JobSummary {
  _id: string;
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType: string;
  serviceCategory: {
    category: string;
    serviceType: string;
  };
  expertLevel?: string;
  jobLocation?: string;
  jobBudget: {
    pricingType: 'fixed' | 'hourly';
    fromAmount: number;
    upToAmount?: number;
  };
  jobCurrency: string;
  jobSkills: string[];
  client: {
    name: string;
    organizationName?: string;
    organizationImage?: string;
  };
}

// ============================================================================
// Expert Info
// ============================================================================

export interface ExpertInfo {
  _id: string;
  name: string;
  email: string;
  profilePhoto?: string;
  professionalTitle?: string;
}

/**
 * Hub expert for selection dropdown
 */
export interface HubExpert {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
}

// ============================================================================
// Proposal Checkout Data
// ============================================================================

export interface ProposalCheckoutData {
  job: JobSummary;
  expert: ExpertInfo;
  hubExperts: HubExpert[]; // List of experts from user's hub for selection
  hubPlan?: string; // Hub subscription plan (starter = only self, others = dropdown)
  hasExistingProposal: boolean;
  existingProposalId?: string;
}

// ============================================================================
// Submit Proposal
// ============================================================================

export interface MilestoneInput {
  taskName: string;
  taskDescription?: string;
  amount: number;
  dueDate: string; // ISO date string
}

export interface SubmitProposalRequest {
  jobId: string;
  asssignedExpertId?: string; // Expert to assign (from hubExperts list). Defaults to current user
  proposalDetails: string;
  priceType: 'fixed' | 'hourly';
  proposedPrice?: number;
  hourlyProposedPrice?: number;
  workingHours?: number;
  selectedCurrency: string;
  files?: string[];
  milestones?: MilestoneInput[];
}

export interface SubmitProposalResponse {
  proposalId: string;
  status: string;
}

// ============================================================================
// Proposal Success
// ============================================================================

export interface ProposalSuccessData {
  proposal: {
    _id: string;
    status: string;
    proposalDetails: string;
    priceType: 'fixed' | 'hourly';
    proposedPrice?: number;
    hourlyProposedPrice?: number;
    workingHours?: number;
    selectedCurrency: string;
    createdAt: string;
  };
  job: {
    _id: string;
    jobTitle: string;
    client: {
      name: string;
      organizationName?: string;
    };
  } | null;
}

// ============================================================================
// Form State
// ============================================================================

export interface ProposalFormData {
  asssignedExpertId: string | null; // Selected expert from hubExperts
  proposalDetails: string;
  priceType: 'fixed' | 'hourly';
  proposedPrice: number | null;
  hourlyProposedPrice: number | null;
  workingHours: number | null;
  files: string[];
  enableMilestones: boolean;
  milestones: MilestoneInput[];
}

export const DEFAULT_PROPOSAL_FORM_DATA: ProposalFormData = {
  asssignedExpertId: null,
  proposalDetails: '',
  priceType: 'fixed',
  proposedPrice: null,
  hourlyProposedPrice: null,
  workingHours: null,
  files: [],
  enableMilestones: false,
  milestones: [],
};
