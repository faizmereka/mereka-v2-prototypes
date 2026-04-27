import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

// Job types matching backend enums
export type JobStatus = 'DRAFT' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type EmploymentType = 'full-time' | 'freelance' | 'part-time';
export type PricingType = 'fixed' | 'hourly';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type ContractStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'paused';

export interface Job {
  _id: string;
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType: EmploymentType;
  status: JobStatus;
  serviceCategory: {
    category: string;
    serviceType: string;
  };
  expertLevel?: string;
  jobLocation?: string;
  preferredLocation?: string[];
  jobBudget: {
    pricingType: PricingType;
    fromAmount: number;
    upToAmount?: number;
  };
  jobCurrency: string;
  jobSkills: string[];
  jobUploads?: string[];
  accessMode?: 'PUBLIC' | 'PRIVATE';
  name: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;
  aboutOrganization?: string;
  organizationImage?: string;
  hubId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields from API
  hubName?: string;
  hub?: {
    _id: string;
    name: string;
    logo?: string;
  };
  creator?: {
    _id: string;
    name: string;
    email: string;
  };
  proposalsCount: number;
  hiresCount: number;
}

export interface Proposal {
  _id: string;
  jobId: string;
  proposalDetails: string;
  priceType: PricingType;
  proposedPrice?: number;
  hourlyProposedPrice?: number;
  workingHours?: number;
  selectedCurrency: string;
  files?: string[];
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  // Computed fields from API
  jobTitle?: string;
  organizationName?: string;
  expert?: {
    _id: string;
    name: string;
    email: string;
    profilePhoto?: string;
  };
  job?: {
    _id: string;
    jobTitle: string;
    organizationName?: string;
    status: JobStatus;
    hubId?: string;
    jobBudget?: {
      pricingType: PricingType;
      fromAmount: number;
      upToAmount?: number;
    };
    jobCurrency?: string;
  };
  hub?: {
    _id: string;
    name: string;
    logo?: string;
  };
  client?: {
    _id: string;
    name: string;
    email: string;
    profilePhoto?: string;
  };
}

export type MilestoneStatus = 'pending' | 'active' | 'funded' | 'work_submitted' | 'released' | 'approved' | 'completed' | 'cancelled';
export type TimelogStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

export interface Milestone {
  _id: string;
  jobId: string;
  jobProposalId: string;
  contractId?: string;
  hubId: string;
  taskName: string;
  taskDescription: string;
  amount: number;
  dueDate: string;
  currency: string;
  status: MilestoneStatus;
  workLogDescription?: string;
  workLogFilesUrl: string[];
  workSubmittedDate?: string;
  fundedDate?: string;
  releasedDate?: string;
  createdDate: string;
  updatedDate: string;
}

export interface TimelogEntry {
  _id: string;
  contractId: string;
  jobId: string;
  expertId: string;
  clientId: string;
  hubId: string;
  workDate: string;
  weekNumber: number;
  year: number;
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
  status: TimelogStatus;
  submittedDate?: string;
  approvedDate?: string;
  rejectedDate?: string;
  paidDate?: string;
  rejectionReason?: string;
  createdDate: string;
  updatedDate: string;
}

export interface Transaction {
  id: string;
  type: 'escrow' | 'release' | 'refund' | 'payment';
  amount: number;
  currency: string;
  description: string;
  date: string;
  status: string;
  referenceId: string;
  referenceType: 'milestone' | 'timelog';
  referenceName?: string;
}

export interface MilestoneStats {
  total: number;
  funded: number;
  completed: number;
  pending: number;
  workSubmitted?: number;
  cancelled?: number;
  totalAmount: number;
  fundedAmount: number;
  paidAmount?: number;
}

export interface TimelogStats {
  totalHours: number;
  totalBillable: number;
}

export interface ContractMilestonesResponse {
  success: boolean;
  data: Milestone[];
  stats: MilestoneStats;
}

export interface ContractTimelogsResponse {
  success: boolean;
  data: TimelogEntry[];
  stats: {
    hourlyRate: number;
    weeklyLimit: number;
    currency: string;
    thisWeek: {
      hours: number;
      billable: number;
      entries: number;
    };
    total: {
      hours: number;
      billable: number;
      entries: number;
      pending: number;
      approved: number;
      paid: number;
      rejected: number;
    };
  };
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ContractTransactionsResponse {
  success: boolean;
  data: Transaction[];
  summary: {
    totalEscrow: number;
    totalReleased: number;
    totalRefunded: number;
    totalPending: number;
    currency: string;
  };
}

export interface Contract {
  _id: string;
  jobId: string;
  jobProposalId: string;
  hubId: string;
  contractTitle: string;
  contractDescription: string;
  contractUploads?: string[];
  priceType: PricingType;
  proposedPrice?: number;
  hourlyProposedPrice?: number;
  weeklyLimit?: number;
  hasMilestones: boolean;
  selectedCurrency: string;
  startDate: string;
  endDate?: string;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
  // Computed fields from API
  job?: {
    _id: string;
    jobTitle: string;
    organizationName?: string;
    status: JobStatus;
  };
  expert?: {
    _id: string;
    name: string;
    email: string;
    profilePhoto?: string;
  };
  client?: {
    _id: string;
    name: string;
    email: string;
    profilePhoto?: string;
  };
  hub?: {
    _id: string;
    name: string;
    logo?: string;
  };
  proposal?: {
    proposalDetails: string;
    priceType: PricingType;
    proposedPrice?: number;
    hourlyProposedPrice?: number;
    workingHours?: number;
  };
  // Stats from API aggregation
  milestoneStats?: MilestoneStats;
  timelogStats?: TimelogStats;
}

export interface JobStats {
  total: number;
  byStatus: {
    DRAFT: number;
    ACTIVE: number;
    IN_PROGRESS: number;
    COMPLETED: number;
    CANCELLED: number;
    EXPIRED: number;
  };
  active: number;
  inProgress: number;
  totalProposals: number;
  proposalsByStatus: {
    pending: number;
    accepted: number;
    rejected: number;
    withdrawn: number;
  };
  totalContracts: number;
  contractsByStatus: {
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    paused: number;
  };
  // Contract Payments stats
  totalContractPayments: number;
  contractPaymentsByStatus: {
    pending: number;
    funded: number;
    processing: number;
    released: number;
    refunded: number;
    failed: number;
    cancelled: number;
  };
  contractPaymentsByType: {
    milestone: number;
    timelog: number;
  };
  // Pending Payments stats (retry queue)
  totalPendingPayments: number;
  pendingPaymentsByStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListJobsParams {
  page?: number;
  limit?: number;
  status?: JobStatus;
  search?: string;
  employmentType?: EmploymentType;
  hubId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListProposalsParams {
  page?: number;
  limit?: number;
  status?: ProposalStatus;
  search?: string;
  jobId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListContractsParams {
  page?: number;
  limit?: number;
  status?: ContractStatus;
  search?: string;
  jobId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Contract Payment types
export type ContractPaymentType = 'milestone' | 'timelog';
export type ContractPaymentStatus = 'pending' | 'funded' | 'processing' | 'released' | 'refunded' | 'failed' | 'cancelled';

export interface ContractPayment {
  _id: string;
  paymentType: ContractPaymentType;
  contractId: string;
  milestoneId?: string;
  timelogId?: string;
  amount: number;
  currency: string;
  platformFee: number;
  expertFee: number;
  transferAmount: number;
  status: ContractPaymentStatus;
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  fundedDate?: string;
  releasedDate?: string;
  refundedDate?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  contract?: {
    _id: string;
    contractTitle: string;
    expertId: string;
    clientId: string;
    hubId: string;
  };
  job?: {
    _id: string;
    jobTitle: string;
  };
  expert?: {
    _id: string;
    name: string;
    email: string;
    profilePhoto?: string;
  };
  client?: {
    _id: string;
    name: string;
    email: string;
  };
  hub?: {
    _id: string;
    name: string;
  };
  milestone?: {
    _id: string;
    taskName: string;
  };
  timelog?: {
    hoursWorked: number;
    weekNumber: number;
    year: number;
  };
}

export interface ContractPaymentStats {
  total: number;
  byStatus: Record<ContractPaymentStatus, number>;
  byType: {
    milestone: number;
    timelog: number;
  };
  totalAmount: number;
  totalPlatformFee: number;
  totalTransferred: number;
  currency: string;
}

export interface ListContractPaymentsParams {
  page?: number;
  limit?: number;
  status?: ContractPaymentStatus;
  paymentType?: ContractPaymentType;
  search?: string;
  contractId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Pending Payment types (Failed payment retry queue)
export type PendingPaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PendingPayment {
  _id: string;
  contractId: string;
  jobId: string;
  applicationId: string;
  hubId: string;
  expertId: string;
  learnerId: string;
  contractTitle?: string;
  description?: string;
  amount: number;
  currency: string;
  totalHours: number;
  startDateTime: string;
  endDateTime: string;
  status: PendingPaymentStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  lastError?: string;
  lastAttempt?: string;
  failedAt?: string;
  processedAt?: string;
  paymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  contract?: {
    _id: string;
    contractTitle: string;
  };
  job?: {
    _id: string;
    jobTitle: string;
  };
  expert?: {
    _id: string;
    name: string;
    email: string;
    profilePhoto?: string;
  };
  learner?: {
    _id: string;
    name: string;
    email: string;
  };
  hub?: {
    _id: string;
    name: string;
  };
}

export interface PendingPaymentStats {
  total: number;
  byStatus: Record<PendingPaymentStatus, number>;
  totalAmount: number;
  currency: string;
  retriesRemaining: number;
  overdue: number;
}

export interface ListPendingPaymentsParams {
  page?: number;
  limit?: number;
  status?: PendingPaymentStatus;
  search?: string;
  contractId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root',
})
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/jobs`;
  private readonly proposalsApiUrl = `${environment.apiUrl}/admin/proposals`;
  private readonly contractsApiUrl = `${environment.apiUrl}/admin/contracts`;
  private readonly contractPaymentsApiUrl = `${environment.apiUrl}/admin/contract-payments`;
  private readonly pendingPaymentsApiUrl = `${environment.apiUrl}/admin/pending-payments`;

  // Cache for stats to prevent refetching on tab changes
  private cachedStats: ApiResponse<JobStats> | null = null;

  // ==================== JOB METHODS ====================

  /**
   * Get job statistics (cached - only fetches once per session)
   */
  getStats(): Observable<ApiResponse<JobStats>> {
    // Return cached stats if available
    if (this.cachedStats) {
      return of(this.cachedStats);
    }

    return this.http.get<ApiResponse<JobStats>>(`${this.apiUrl}/stats`).pipe(
      tap((response) => {
        if (response.success) {
          this.cachedStats = response;
        }
      })
    );
  }

  /**
   * Force refresh stats (clears cache and fetches fresh data)
   */
  refreshStats(): Observable<ApiResponse<JobStats>> {
    this.cachedStats = null;
    return this.getStats();
  }

  /**
   * List jobs with filtering and pagination
   */
  listJobs(params?: ListJobsParams): Observable<ApiResponse<Job[]>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.search) queryParams['search'] = params.search;
    if (params?.employmentType) queryParams['employmentType'] = params.employmentType;
    if (params?.hubId) queryParams['hubId'] = params.hubId;
    if (params?.dateFrom) queryParams['dateFrom'] = params.dateFrom;
    if (params?.dateTo) queryParams['dateTo'] = params.dateTo;
    if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    return this.http.get<ApiResponse<Job[]>>(this.apiUrl, { params: queryParams });
  }

  /**
   * Get job by ID
   */
  getJobById(id: string): Observable<ApiResponse<Job>> {
    return this.http.get<ApiResponse<Job>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update job status
   */
  updateJobStatus(id: string, status: JobStatus, reason?: string): Observable<ApiResponse<Job>> {
    return this.http.patch<ApiResponse<Job>>(`${this.apiUrl}/${id}/status`, { status, reason });
  }

  /**
   * Delete job (soft delete)
   */
  deleteJob(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Bulk update job status
   */
  bulkUpdateJobStatus(jobIds: string[], status: JobStatus): Observable<ApiResponse<{ modifiedCount: number }>> {
    return this.http.post<ApiResponse<{ modifiedCount: number }>>(`${this.apiUrl}/bulk-status`, {
      jobIds,
      status,
    });
  }

  // ==================== PROPOSAL METHODS ====================

  /**
   * List proposals with filtering and pagination
   */
  listProposals(params?: ListProposalsParams): Observable<ApiResponse<Proposal[]>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.search) queryParams['search'] = params.search;
    if (params?.jobId) queryParams['jobId'] = params.jobId;
    if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    return this.http.get<ApiResponse<Proposal[]>>(this.proposalsApiUrl, { params: queryParams });
  }

  /**
   * Get proposal by ID
   */
  getProposalById(id: string): Observable<ApiResponse<Proposal>> {
    return this.http.get<ApiResponse<Proposal>>(`${this.proposalsApiUrl}/${id}`);
  }

  /**
   * Update proposal status
   */
  updateProposalStatus(id: string, status: ProposalStatus, reason?: string): Observable<ApiResponse<Proposal>> {
    return this.http.patch<ApiResponse<Proposal>>(`${this.proposalsApiUrl}/${id}/status`, { status, reason });
  }

  // ==================== CONTRACT METHODS ====================

  /**
   * List contracts with filtering and pagination
   */
  listContracts(params?: ListContractsParams): Observable<ApiResponse<Contract[]>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.search) queryParams['search'] = params.search;
    if (params?.jobId) queryParams['jobId'] = params.jobId;
    if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    return this.http.get<ApiResponse<Contract[]>>(this.contractsApiUrl, { params: queryParams });
  }

  /**
   * Get contract by ID
   */
  getContractById(id: string): Observable<ApiResponse<Contract>> {
    return this.http.get<ApiResponse<Contract>>(`${this.contractsApiUrl}/${id}`);
  }

  /**
   * Update contract status
   */
  updateContractStatus(id: string, status: ContractStatus, reason?: string): Observable<ApiResponse<Contract>> {
    return this.http.patch<ApiResponse<Contract>>(`${this.contractsApiUrl}/${id}/status`, { status, reason });
  }

  /**
   * Get contract milestones (for fixed price contracts only)
   */
  getContractMilestones(contractId: string): Observable<ContractMilestonesResponse> {
    return this.http.get<ContractMilestonesResponse>(`${this.contractsApiUrl}/${contractId}/milestones`);
  }

  /**
   * Get contract timelogs (for hourly contracts only)
   */
  getContractTimelogs(contractId: string, params?: { page?: number; limit?: number }): Observable<ContractTimelogsResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();

    return this.http.get<ContractTimelogsResponse>(`${this.contractsApiUrl}/${contractId}/timelogs`, { params: queryParams });
  }

  /**
   * Get contract transactions
   */
  getContractTransactions(contractId: string): Observable<ContractTransactionsResponse> {
    return this.http.get<ContractTransactionsResponse>(`${this.contractsApiUrl}/${contractId}/transactions`);
  }

  // ==================== CONTRACT PAYMENT METHODS ====================

  /**
   * Get contract payment statistics
   */
  getContractPaymentStats(): Observable<ApiResponse<ContractPaymentStats>> {
    return this.http.get<ApiResponse<ContractPaymentStats>>(`${this.contractPaymentsApiUrl}/stats`);
  }

  /**
   * List contract payments with filtering and pagination
   */
  listContractPayments(params?: ListContractPaymentsParams): Observable<ApiResponse<ContractPayment[]>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.paymentType) queryParams['paymentType'] = params.paymentType;
    if (params?.search) queryParams['search'] = params.search;
    if (params?.contractId) queryParams['contractId'] = params.contractId;
    if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    return this.http.get<ApiResponse<ContractPayment[]>>(this.contractPaymentsApiUrl, { params: queryParams });
  }

  /**
   * Get contract payment by ID
   */
  getContractPaymentById(id: string): Observable<ApiResponse<ContractPayment>> {
    return this.http.get<ApiResponse<ContractPayment>>(`${this.contractPaymentsApiUrl}/${id}`);
  }

  // ==================== PENDING PAYMENT METHODS ====================

  /**
   * Get pending payment statistics
   */
  getPendingPaymentStats(): Observable<ApiResponse<PendingPaymentStats>> {
    return this.http.get<ApiResponse<PendingPaymentStats>>(`${this.pendingPaymentsApiUrl}/stats`);
  }

  /**
   * List pending payments with filtering and pagination
   */
  listPendingPayments(params?: ListPendingPaymentsParams): Observable<ApiResponse<PendingPayment[]>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.search) queryParams['search'] = params.search;
    if (params?.contractId) queryParams['contractId'] = params.contractId;
    if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    return this.http.get<ApiResponse<PendingPayment[]>>(this.pendingPaymentsApiUrl, { params: queryParams });
  }

  /**
   * Get pending payment by ID
   */
  getPendingPaymentById(id: string): Observable<ApiResponse<PendingPayment>> {
    return this.http.get<ApiResponse<PendingPayment>>(`${this.pendingPaymentsApiUrl}/${id}`);
  }

  /**
   * Retry a pending payment
   */
  retryPendingPayment(id: string): Observable<ApiResponse<PendingPayment>> {
    return this.http.post<ApiResponse<PendingPayment>>(`${this.pendingPaymentsApiUrl}/${id}/retry`, {});
  }

  /**
   * Mark a pending payment as failed
   */
  markPendingPaymentFailed(id: string, reason: string): Observable<ApiResponse<PendingPayment>> {
    return this.http.post<ApiResponse<PendingPayment>>(`${this.pendingPaymentsApiUrl}/${id}/fail`, { reason });
  }
}
