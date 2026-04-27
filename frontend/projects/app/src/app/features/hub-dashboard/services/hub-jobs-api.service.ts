import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface JobPost {
  _id: string;
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType: string;
  status: 'draft' | 'published' | 'closed';
  serviceCategory: {
    category: string;
    serviceType: string;
  };
  expertLevel?: string;
  jobLocation?: string;
  preferredLocation?: string[];
  jobBudget: {
    pricingType: 'fixed' | 'hourly';
    fromAmount: number;
    upToAmount?: number;
  };
  jobCurrency: string;
  jobStartDate?: string;
  startDateType?: 'asap' | 'flexible' | 'specific';
  jobEndDate?: string;
  duration?: string;
  jobSkills?: string[];
  jobUploads?: Array<{
    id?: string;
    url: string;
    name: string;
    size?: number;
    type?: string;
  }>;
  accessMode?: 'public' | 'private';
  name: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;
  aboutOrganization?: string;
  organizationImage?: string;
  hubId: string;
  proposalCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  _id: string;
  contractTitle: string;
  asssignedExpertId: string; // Expert assigned to contract
  createdBy: string; // Client who created contract
  clientHubId: string; // Hub that posted the job (employer)
  expertHubId?: string; // Hub the expert belongs to
  jobId?: string;
  jobProposalId?: string;
  priceType: 'fixed' | 'hourly';
  proposedPrice?: number;
  hourlyProposedPrice?: number;
  weeklyLimit?: number;
  selectedCurrency: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  // Payment tracking (computed from contract payments)
  escrowAmount?: number;
  escrowHours?: number;
  paidAmount?: number;
  paidHours?: number;
  milestones?: Array<{
    _id: string;
    taskName: string;
    taskDescription?: string;
    amount: number;
    status: string;
    dueDate?: string;
    order?: number;
  }>;
  milestonesCount?: number;
  completedMilestonesCount?: number;
  // Populated fields
  expert?: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  client?: {
    _id: string;
    name: string;
    email: string;
  };
  clientHub?: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  expertHub?: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  // Stripe payment details
  stripeCustomerId?: string;
  stripeAccount?: string; // Expert's connected account
  paymentMethodId?: string;
  // Payment method details (populated from Stripe)
  paymentMethod?: {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  // Connected account details (populated for expert)
  connectedAccount?: {
    id: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Backend response format
export interface BackendPaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Frontend-friendly format used by components
export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface JobsQuery {
  page?: number;
  limit?: number;
  status?: 'draft' | 'published' | 'closed';
  hubId?: string;
  search?: string;
  category?: string;
  skills?: string;
}

export interface ContractsQuery {
  page?: number;
  limit?: number;
  hubId: string; // Required - hub-scoped route path param
  clientHubId?: string; // Filter by client hub (employer)
  expertHubId?: string; // Filter by expert hub
  asssignedExpertId?: string;
  createdBy?: string;
  jobId?: string;
  status?: string;
  priceType?: 'fixed' | 'hourly';
}

export interface ProposalMilestone {
  taskName: string;
  taskDescription?: string;
  amount: number;
  dueDate?: string;
  order: number;
}

export interface Proposal {
  _id: string;
  jobId: {
    _id: string;
    jobTitle: string;
    serviceCategory?: {
      category: string;
      serviceType: string;
    };
    jobBudget?: {
      pricingType: 'fixed' | 'hourly';
      fromAmount: number;
      upToAmount?: number;
    };
    jobCurrency?: string;
    status: string;
  };
  proposalDetails: string;
  priceType: 'fixed' | 'hourly';
  proposedPrice?: number;
  hourlyProposedPrice?: number;
  workingHours?: number;
  hasMilestones?: boolean;
  milestones?: ProposalMilestone[];
  selectedCurrency: string;
  files?: string[];
  createdBy: string;
  asssignedExpertId: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  clientHubId?: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  }; // Hub that posted the job (employer)
  expertHubId?: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  }; // Hub the expert belongs to
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  contractId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalsQuery {
  page?: number;
  limit?: number;
  hubId?: string; // Used for hub-scoped route path param
  clientHubId?: string; // Filter by client hub (employer)
  expertHubId?: string; // Filter by expert hub
  jobId?: string;
  createdBy?: string;
  asssignedExpertId?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
}

export interface HubJobsStats {
  jobs: number;
  proposals: number;
  contracts: number;
}

export interface HubExpertStats {
  proposals: number;
  contracts: number;
}

// ============================================================
// Offer-Related Interfaces
// ============================================================

export interface OfferMilestone {
  taskName: string;
  taskDescription?: string;
  amount: number;
  dueDate: string; // ISO 8601
  order?: number;
}

export interface SendOfferInput {
  jobId: string;
  jobProposalId: string;
  clientHubId: string;
  expertHubId?: string;
  contractTitle: string;
  contractDescription: string;
  contractUploads?: string[];
  priceType: 'fixed' | 'hourly';
  // Fixed price
  proposedPrice?: number;
  hasMilestones?: boolean;
  milestones?: OfferMilestone[];
  // Hourly
  hourlyProposedPrice?: number;
  weeklyLimit?: number;
  // Common
  startDate: string; // ISO 8601
  selectedCurrency: string;
  asssignedExpertId: string;
  stripeCustomerId?: string;
  paymentMethodId?: string;
  offerMessage?: string;
}

export interface SendOfferResult {
  contract: Contract;
  milestones: Array<{
    _id: string;
    taskName: string;
    taskDescription?: string;
    amount: number;
    dueDate: string;
    status: string;
    order: number;
  }>;
}

export interface AcceptOfferInput {
  acceptMessage?: string;
}

export interface DeclineOfferInput {
  declineReason: string;
}

export interface PendingOffer extends Contract {
  // Contract already has milestones with proper type
  job?: {
    _id: string;
    title: string;
    description?: string;
  };
}

// ============================================================
// Milestone Interfaces
// ============================================================

export interface Milestone {
  _id: string;
  contractId: string;
  jobId?: string;
  jobProposalId?: string;
  hubId?: string;
  taskName: string;
  taskDescription?: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'pending' | 'active' | 'funded' | 'submitted' | 'work_submitted' | 'approved' | 'released' | 'disputed' | 'cancelled';
  order?: number;
  // Work submission fields
  workLogDescription?: string;
  workLogFilesUrl?: string[];
  workSubmittedDate?: string;
  // Payment fields
  paymentIntentId?: string;
  transferId?: string;
  paidDate?: string;
  // Tracking
  createdBy?: string;
  createdDate?: string;
  updatedDate?: string;
}

export interface SubmitWorkInput {
  workLogDescription: string;
  workLogFilesUrl?: string[];
}

export interface ApproveMilestoneInput {
  feedback?: string;
}

export interface FundMilestonesInput {
  milestoneIds: string[];
  stripeCustomerId?: string;
  paymentMethodId?: string;
}

export interface ReleasePaymentInput {
  milestoneIds: string[];
}

export interface MilestonesQuery {
  contractId?: string;
  jobId?: string;
  jobProposalId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateMilestoneInput {
  jobId: string;
  jobProposalId: string;
  hubId: string;
  contractId: string;
  taskName: string;
  taskDescription?: string;
  amount: number;
  dueDate: string; // ISO 8601
  currency?: string;
}

export interface UpdateMilestoneInput {
  taskName?: string;
  taskDescription?: string;
  amount?: number;
  dueDate?: string; // ISO 8601
}

// ============================================================
// Timelog Interfaces
// ============================================================

export interface TimelogEntry {
  _id: string;
  contractId: string;
  jobId: string;
  expertId: string;
  clientId: string;
  clientHubId: string;
  expertHubId: string;
  hubId: string;
  workDate: string;
  weekNumber: number;
  year: number;
  monthNumber: number;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  breakDuration?: number;
  description: string;
  tasks: string[];
  hourlyRate: number;
  weeklyLimit: number;
  currency: string;
  billableAmount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  submittedDate?: string;
  approvedDate?: string;
  rejectedDate?: string;
  paidDate?: string;
  rejectionReason?: string;
  paymentIntentId?: string;
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  createdBy?: string;
  createdDate?: string;
  updatedDate?: string;
}

export interface CreateTimelogInput {
  contractId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  description: string;
  tasks?: string[];
}

export interface UpdateTimelogInput {
  workDate?: string;
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  description?: string;
  tasks?: string[];
}

export interface TimelogsQuery {
  contractId?: string;
  expertId?: string;
  status?: string;
  year?: number;
  weekNumber?: number;
  monthNumber?: number;
  page?: number;
  limit?: number;
}

export interface WeeklySummary {
  weekNumber: number;
  year: number;
  totalHours: number;
  totalBillable: number;
  weeklyLimit: number;
  remaining: number;
  isExceeded: boolean;
  entries: TimelogEntry[];
}

@Injectable({ providedIn: 'root' })
export class HubJobsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/hub/jobs`;
  private readonly contractsUrl = `${environment.apiUrl}/contracts`;
  private readonly milestonesUrl = `${environment.apiUrl}/milestones`;

  /**
   * List jobs with optional filters
   */
  async getJobs(query: JobsQuery = {}): Promise<PaginatedResult<JobPost>> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());
    if (query.status) params.set('status', query.status);
    if (query.hubId) params.set('hubId', query.hubId);
    if (query.search) params.set('search', query.search);
    if (query.category) params.set('category', query.category);
    if (query.skills) params.set('skills', query.skills);

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl;
    const response = await firstValueFrom(
      this.http.get<BackendPaginatedResponse<JobPost>>(url)
    );
    // Transform backend response to frontend-friendly format
    return {
      items: response.data,
      pagination: response.meta,
    };
  }

  /**
   * Get a single job by ID
   */
  async getJob(id: string): Promise<JobPost> {
    const response = await firstValueFrom(
      this.http.get<{ success: boolean; data: JobPost }>(`${this.baseUrl}/${id}`)
    );
    return response.data;
  }

  /**
   * Update job status
   */
  async updateJobStatus(id: string, status: 'draft' | 'published' | 'closed'): Promise<JobPost> {
    const response = await firstValueFrom(
      this.http.patch<{ success: boolean; data: JobPost }>(`${this.baseUrl}/${id}`, { status })
    );
    return response.data;
  }

  /**
   * Delete a job
   */
  async deleteJob(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
  }

  /**
   * List contracts with optional filters
   * Route: /hub/:hubId/contracts
   *
   * Default: Returns contracts where hubId is the CLIENT (employer)
   * With expertHubId: Returns contracts where experts from this hub are assigned (expert perspective)
   */
  async getContracts(query: ContractsQuery): Promise<PaginatedResult<Contract>> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());
    if (query.expertHubId) params.set('expertHubId', query.expertHubId);
    if (query.clientHubId) params.set('clientHubId', query.clientHubId);
    if (query.asssignedExpertId) params.set('asssignedExpertId', query.asssignedExpertId);
    if (query.createdBy) params.set('createdBy', query.createdBy);
    if (query.jobId) params.set('jobId', query.jobId);
    if (query.status) params.set('status', query.status);
    if (query.priceType) params.set('priceType', query.priceType);

    const baseUrl = `${environment.apiUrl}/hub/${query.hubId}/contracts`;
    const url = params.toString() ? `${baseUrl}?${params}` : baseUrl;
    const response = await firstValueFrom(
      this.http.get<BackendPaginatedResponse<Contract>>(url)
    );
    // Transform backend response to frontend-friendly format
    return {
      items: response.data,
      pagination: response.meta,
    };
  }

  /**
   * Get a single contract by ID
   */
  async getContract(id: string): Promise<Contract> {
    const response = await firstValueFrom(
      this.http.get<{ success: boolean; data: Contract }>(`${this.contractsUrl}/${id}`)
    );
    return response.data;
  }

  /**
   * List proposals with optional filters
   * Route: /hub/:hubId/proposals
   *
   * Default: Returns proposals where hubId is the CLIENT (job poster/employer)
   * With expertHubId: Returns proposals submitted by experts from this hub (expert perspective)
   */
  async getProposals(query: ProposalsQuery = {}): Promise<PaginatedResult<Proposal>> {
    if (!query.hubId) {
      throw new Error('hubId is required for getProposals');
    }

    const params = new URLSearchParams();
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());
    if (query.expertHubId) params.set('expertHubId', query.expertHubId);
    if (query.clientHubId) params.set('clientHubId', query.clientHubId);
    if (query.asssignedExpertId) params.set('asssignedExpertId', query.asssignedExpertId);
    if (query.createdBy) params.set('createdBy', query.createdBy);
    if (query.jobId) params.set('jobId', query.jobId);
    if (query.status) params.set('status', query.status);

    const baseUrl = `${environment.apiUrl}/hub/${query.hubId}/proposals`;
    const url = params.toString() ? `${baseUrl}?${params}` : baseUrl;
    const response = await firstValueFrom(
      this.http.get<BackendPaginatedResponse<Proposal>>(url)
    );
    // Transform backend response to frontend-friendly format
    return {
      items: response.data,
      pagination: response.meta,
    };
  }

  /**
   * Reject a proposal
   * Route: /hub/:hubId/proposals/:proposalId/reject
   */
  async rejectProposal(hubId: string, proposalId: string): Promise<Proposal> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; data: Proposal }>(
        `${environment.apiUrl}/hub/${hubId}/proposals/${proposalId}/reject`,
        {}
      )
    );
    return response.data;
  }

  /**
   * Get stats for hub jobs page (counts for jobs, proposals, contracts)
   * Route: /hub/:hubId/stats
   * Employer/Client perspective
   */
  async getStats(hubId: string): Promise<HubJobsStats> {
    const response = await firstValueFrom(
      this.http.get<{ success: boolean; data: HubJobsStats }>(
        `${environment.apiUrl}/hub/${hubId}/stats`
      )
    );
    return response.data;
  }

  /**
   * Get stats for applications page (counts for proposals, contracts)
   * Route: /hub/:hubId/stats/expert
   * Expert perspective - proposals submitted and contracts assigned
   */
  async getExpertStats(hubId: string): Promise<HubExpertStats> {
    const response = await firstValueFrom(
      this.http.get<{ success: boolean; data: HubExpertStats }>(
        `${environment.apiUrl}/hub/${hubId}/stats/expert`
      )
    );
    return response.data;
  }

  // ============================================================
  // Offer API Methods - Contract Offer Flow
  // ============================================================

  /**
   * Send Offer - Client creates a contract offer for an expert
   * Creates contract in PENDING status with optional milestones
   * Route: POST /contracts/offers
   */
  async sendOffer(input: SendOfferInput): Promise<SendOfferResult> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; data: SendOfferResult; message: string }>(
        `${this.contractsUrl}/offers`,
        input
      )
    );
    return response.data;
  }

  /**
   * Accept Offer - Expert accepts the contract offer
   * Validates payout setup and transitions contract to ACTIVE
   * Route: POST /contracts/:contractId/accept
   */
  async acceptOffer(contractId: string, input?: AcceptOfferInput): Promise<Contract> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; data: Contract; error?: { message: string } }>(
          `${this.contractsUrl}/${contractId}/accept`,
          input || {}
        )
      );
      if (!response.success && response.error?.message) {
        throw new Error(response.error.message);
      }
      return response.data;
    } catch (error) {
      // Extract error message from HttpErrorResponse or API response
      if (error && typeof error === 'object') {
        const httpError = error as { error?: { error?: { message?: string }; message?: string }; message?: string };
        const message = httpError.error?.error?.message || httpError.error?.message || httpError.message || 'Failed to accept offer';
        throw new Error(message);
      }
      throw error;
    }
  }

  /**
   * Decline Offer - Expert declines the contract offer
   * Refunds any funded milestones and transitions contract to CANCELLED
   * Route: POST /contracts/:contractId/decline
   */
  async declineOffer(contractId: string, input: DeclineOfferInput): Promise<Contract> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; data: Contract; error?: { message: string } }>(
          `${this.contractsUrl}/${contractId}/decline`,
          input
        )
      );
      if (!response.success && response.error?.message) {
        throw new Error(response.error.message);
      }
      return response.data;
    } catch (error) {
      // Extract error message from HttpErrorResponse or API response
      if (error && typeof error === 'object') {
        const httpError = error as { error?: { error?: { message?: string }; message?: string }; message?: string };
        const message = httpError.error?.error?.message || httpError.error?.message || httpError.message || 'Failed to decline offer';
        throw new Error(message);
      }
      throw error;
    }
  }

  /**
   * Complete Contract - Client marks the contract as completed
   * Only the client can complete a contract. The contract must be active or paused.
   * Route: POST /contracts/:contractId/complete
   */
  async completeContract(contractId: string, reason?: string): Promise<Contract> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; data: Contract; message?: string; error?: { message: string } }>(
          `${this.contractsUrl}/${contractId}/complete`,
          reason ? { reason } : {}
        )
      );
      if (!response.success && response.error?.message) {
        throw new Error(response.error.message);
      }
      return response.data;
    } catch (error) {
      // Extract error message from HttpErrorResponse or API response
      if (error && typeof error === 'object') {
        const httpError = error as { error?: { error?: { message?: string }; message?: string }; message?: string };
        const message = httpError.error?.error?.message || httpError.error?.message || httpError.message || 'Failed to complete contract';
        throw new Error(message);
      }
      throw error;
    }
  }

  /**
   * Get Pending Offers - Returns pending contract offers for the current expert
   * Route: GET /contracts/offers/pending
   */
  async getPendingOffers(query: { page?: number; limit?: number } = {}): Promise<PaginatedResult<PendingOffer>> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());

    const baseUrl = `${this.contractsUrl}/offers/pending`;
    const url = params.toString() ? `${baseUrl}?${params}` : baseUrl;
    const response = await firstValueFrom(
      this.http.get<BackendPaginatedResponse<PendingOffer>>(url)
    );
    return {
      items: response.data,
      pagination: response.meta,
    };
  }

  /**
   * Get a single proposal by ID
   * Route: GET /hub/:hubId/proposals/:proposalId
   */
  async getProposal(hubId: string, proposalId: string): Promise<Proposal> {
    const response = await firstValueFrom(
      this.http.get<{ success: boolean; data: Proposal }>(
        `${environment.apiUrl}/hub/${hubId}/proposals/${proposalId}`
      )
    );
    return response.data;
  }

  // ============================================================
  // Milestone API Methods
  // ============================================================

  /**
   * Get milestones with optional filters
   * Route: GET /milestones
   */
  async getMilestones(query: MilestonesQuery = {}): Promise<PaginatedResult<Milestone>> {
    const params = new URLSearchParams();
    if (query.contractId) params.set('contractId', query.contractId);
    if (query.jobId) params.set('jobId', query.jobId);
    if (query.jobProposalId) params.set('jobProposalId', query.jobProposalId);
    if (query.status) params.set('status', query.status);
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());

    const url = params.toString() ? `${this.milestonesUrl}?${params}` : this.milestonesUrl;
    const response = await firstValueFrom(
      this.http.get<BackendPaginatedResponse<Milestone>>(url)
    );
    return {
      items: response.data,
      pagination: response.meta,
    };
  }

  /**
   * Get a single milestone by ID
   * Route: GET /milestones/:milestoneId
   */
  async getMilestone(milestoneId: string): Promise<Milestone> {
    const response = await firstValueFrom(
      this.http.get<{ success: boolean; data: Milestone }>(`${this.milestonesUrl}/${milestoneId}`)
    );
    return response.data;
  }

  /**
   * Submit work for a milestone (Expert)
   * Route: POST /milestones/:milestoneId/submit-work
   */
  async submitWork(milestoneId: string, input: SubmitWorkInput): Promise<Milestone> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; data: Milestone; message: string }>(
        `${this.milestonesUrl}/${milestoneId}/submit-work`,
        input
      )
    );
    return response.data;
  }

  /**
   * Approve milestone and release payment (Client)
   * Route: POST /milestones/:milestoneId/approve
   */
  async approveMilestone(milestoneId: string, input?: ApproveMilestoneInput): Promise<Milestone> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; data: Milestone; message: string }>(
        `${this.milestonesUrl}/${milestoneId}/approve`,
        input || {}
      )
    );
    return response.data;
  }

  /**
   * Fund milestone(s) - Create escrow
   * Route: POST /milestones/fund
   */
  async fundMilestones(input: FundMilestonesInput): Promise<{ milestones: Milestone[]; paymentIntent?: unknown }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; data: { milestones: Milestone[]; paymentIntent?: unknown }; message: string; error?: { message: string } }>(
          `${this.milestonesUrl}/fund`,
          input
        )
      );
      if (!response.success && response.error?.message) {
        throw new Error(response.error.message);
      }
      return response.data;
    } catch (error) {
      // Extract error message from HttpErrorResponse or API response
      if (error && typeof error === 'object') {
        const httpError = error as { error?: { error?: { message?: string }; message?: string }; message?: string };
        const message = httpError.error?.error?.message || httpError.error?.message || httpError.message || 'Failed to fund milestones';
        throw new Error(message);
      }
      throw error;
    }
  }

  /**
   * Release payment for milestone(s)
   * Route: POST /milestones/release-payment
   */
  async releasePayment(input: ReleasePaymentInput): Promise<{ milestones: Milestone[]; transfers?: unknown[] }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; data: { milestones: Milestone[]; transfers?: unknown[] }; message: string; error?: { message: string } }>(
          `${this.milestonesUrl}/release-payment`,
          input
        )
      );
      if (!response.success && response.error?.message) {
        throw new Error(response.error.message);
      }
      return response.data;
    } catch (error) {
      // Extract error message from HttpErrorResponse or API response
      if (error && typeof error === 'object') {
        const httpError = error as { error?: { error?: { message?: string }; message?: string }; message?: string };
        const message = httpError.error?.error?.message || httpError.error?.message || httpError.message || 'Failed to release payment';
        throw new Error(message);
      }
      throw error;
    }
  }

  /**
   * Create a new milestone
   * Route: POST /milestones
   */
  async createMilestone(input: CreateMilestoneInput): Promise<Milestone> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; data: Milestone; message: string }>(
        this.milestonesUrl,
        input
      )
    );
    return response.data;
  }

  /**
   * Update a milestone
   * Route: PATCH /milestones/:milestoneId
   */
  async updateMilestone(milestoneId: string, input: UpdateMilestoneInput): Promise<Milestone> {
    const response = await firstValueFrom(
      this.http.patch<{ success: boolean; data: Milestone; message: string }>(
        `${this.milestonesUrl}/${milestoneId}`,
        input
      )
    );
    return response.data;
  }

  /**
   * Delete a milestone
   * Route: DELETE /milestones/:milestoneId
   */
  async deleteMilestone(milestoneId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<{ success: boolean; message: string }>(`${this.milestonesUrl}/${milestoneId}`)
    );
  }

  // ============================================================
  // Timelog API Methods (Hourly Contracts)
  // ============================================================

  private readonly timelogsUrl = `${environment.apiUrl}/timelogs`;

  /**
   * Get timelogs with optional filters
   * Route: GET /timelogs
   */
  async getTimelogs(query: TimelogsQuery = {}): Promise<PaginatedResult<TimelogEntry>> {
    const params = new URLSearchParams();
    if (query.contractId) params.set('contractId', query.contractId);
    if (query.expertId) params.set('expertId', query.expertId);
    if (query.status) params.set('status', query.status);
    if (query.year) params.set('year', query.year.toString());
    if (query.weekNumber) params.set('weekNumber', query.weekNumber.toString());
    if (query.monthNumber) params.set('monthNumber', query.monthNumber.toString());
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());

    const url = params.toString() ? `${this.timelogsUrl}?${params}` : this.timelogsUrl;
    const response = await firstValueFrom(
      this.http.get<BackendPaginatedResponse<TimelogEntry>>(url)
    );
    return {
      items: response.data,
      pagination: response.meta,
    };
  }

  /**
   * Get a single timelog by ID
   * Route: GET /timelogs/:timelogId
   */
  async getTimelog(timelogId: string): Promise<TimelogEntry> {
    const response = await firstValueFrom(
      this.http.get<{ success: boolean; data: TimelogEntry }>(`${this.timelogsUrl}/${timelogId}`)
    );
    return response.data;
  }

  /**
   * Get weekly summary for a contract
   * Route: GET /timelogs/weekly-summary
   */
  async getWeeklySummary(contractId: string, year?: number, weekNumber?: number): Promise<WeeklySummary> {
    const params = new URLSearchParams();
    params.set('contractId', contractId);
    if (year) params.set('year', year.toString());
    if (weekNumber) params.set('weekNumber', weekNumber.toString());

    const response = await firstValueFrom(
      this.http.get<{ success: boolean; data: WeeklySummary }>(`${this.timelogsUrl}/weekly-summary?${params}`)
    );
    return response.data;
  }

  /**
   * Create a new timelog entry (Expert)
   * Route: POST /timelogs
   */
  async createTimelog(input: CreateTimelogInput): Promise<TimelogEntry> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; data: TimelogEntry; message: string }>(
        this.timelogsUrl,
        input
      )
    );
    return response.data;
  }

  /**
   * Update a timelog entry (Expert, draft only)
   * Route: PATCH /timelogs/:timelogId
   */
  async updateTimelog(timelogId: string, input: UpdateTimelogInput): Promise<TimelogEntry> {
    const response = await firstValueFrom(
      this.http.patch<{ success: boolean; data: TimelogEntry; message: string }>(
        `${this.timelogsUrl}/${timelogId}`,
        input
      )
    );
    return response.data;
  }

  /**
   * Delete a timelog entry (Expert, draft only)
   * Route: DELETE /timelogs/:timelogId
   */
  async deleteTimelog(timelogId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<{ success: boolean; message: string }>(`${this.timelogsUrl}/${timelogId}`)
    );
  }

  /**
   * Submit timelog for approval (Expert)
   * Route: POST /timelogs/:timelogId/submit
   */
  async submitTimelog(timelogId: string): Promise<TimelogEntry> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; data: TimelogEntry; message: string }>(
        `${this.timelogsUrl}/${timelogId}/submit`,
        {}
      )
    );
    return response.data;
  }

  /**
   * Approve timelog entry (Client)
   * Route: POST /timelogs/:timelogId/approve
   */
  async approveTimelog(timelogId: string): Promise<TimelogEntry> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; data: TimelogEntry; message: string }>(
        `${this.timelogsUrl}/${timelogId}/approve`,
        {}
      )
    );
    return response.data;
  }

  /**
   * Reject timelog entry (Client)
   * Route: POST /timelogs/:timelogId/reject
   */
  async rejectTimelog(timelogId: string, reason: string): Promise<TimelogEntry> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; data: TimelogEntry; message: string }>(
        `${this.timelogsUrl}/${timelogId}/reject`,
        { reason }
      )
    );
    return response.data;
  }

  // ============================================================
  // Contract Payment Setup (Multi-Region Stripe)
  // ============================================================

  /**
   * Get contract payment region and Stripe publishable key
   * Route: GET /contracts/:contractId/payment-region
   */
  async getContractPaymentRegion(contractId: string): Promise<{
    region: 'malaysia' | 'atlas';
    stripePublishableKey: string;
  }> {
    const response = await firstValueFrom(
      this.http.get<{
        success: boolean;
        data: { region: 'malaysia' | 'atlas'; stripePublishableKey: string };
      }>(`${this.contractsUrl}/${contractId}/payment-region`)
    );
    return response.data;
  }

  /**
   * Get payment methods for a contract's regional platform
   * Route: GET /contracts/:contractId/payment-methods?hubId=xxx
   */
  async getContractPaymentMethods(contractId: string, hubId: string): Promise<{
    paymentMethods: Array<{
      id: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
      isDefault: boolean;
    }>;
    customerId: string | null;
    region: 'malaysia' | 'atlas';
    stripePublishableKey: string;
  }> {
    const response = await firstValueFrom(
      this.http.get<{
        success: boolean;
        data: {
          paymentMethods: Array<{
            id: string;
            brand: string;
            last4: string;
            expMonth: number;
            expYear: number;
            isDefault: boolean;
          }>;
          customerId: string | null;
          region: 'malaysia' | 'atlas';
          stripePublishableKey: string;
        };
      }>(`${this.contractsUrl}/${contractId}/payment-methods?hubId=${hubId}`)
    );
    return response.data;
  }

  /**
   * Create setup intent for adding payment method on contract's regional platform
   * Route: POST /contracts/:contractId/payment-setup
   */
  async createContractPaymentSetup(contractId: string, hubId: string): Promise<{
    clientSecret: string;
    customerId: string;
    region: 'malaysia' | 'atlas';
    stripePublishableKey: string;
  }> {
    const response = await firstValueFrom(
      this.http.post<{
        success: boolean;
        data: {
          clientSecret: string;
          customerId: string;
          region: 'malaysia' | 'atlas';
          stripePublishableKey: string;
        };
      }>(`${this.contractsUrl}/${contractId}/payment-setup`, { hubId })
    );
    return response.data;
  }
}
