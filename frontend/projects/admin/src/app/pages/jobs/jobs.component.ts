import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe, TitleCasePipe, NgClass } from '@angular/common';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ToastService } from '../../shared/ui';
import {
  JobsService,
  type Job as ApiJob,
  type Proposal as ApiProposal,
  type Contract as ApiContract,
  type ContractPayment as ApiContractPayment,
  type PendingPayment as ApiPendingPayment,
  type JobStatus,
  type EmploymentType,
  type ProposalStatus,
  type ContractStatus as ApiContractStatus,
  type ContractPaymentStatus as ApiContractPaymentStatus,
  type PendingPaymentStatus as ApiPendingPaymentStatus,
  type JobStats,
  type MilestoneStats,
  type TimelogStats,
} from './jobs.service';

// Local interface for view (adapts API response)
interface Job {
  id: string;
  jobTitle: string;
  jobDescription: string;
  jobSummary: string;
  employmentType: EmploymentType;
  status: JobStatus;
  serviceCategory: { category: string; serviceType: string };
  expertLevel: string;
  jobLocation: string;
  jobBudget: { pricingType: 'fixed' | 'hourly'; fromAmount: number; upToAmount?: number };
  jobCurrency: string;
  jobSkills: string[];
  name: string;
  email: string;
  organizationName: string;
  hubId: string;
  hubName: string;
  createdBy: string;
  proposalsCount: number;
  hiresCount: number;
  createdAt: Date;
}

interface Proposal {
  id: string;
  jobId: string;
  jobTitle: string;
  expertId: string;
  expertName: string;
  expertAvatar: string;
  proposalDetails: string;
  priceType: 'fixed' | 'hourly';
  proposedPrice?: number;
  hourlyProposedPrice?: number;
  workingHours?: number;
  selectedCurrency: string;
  status: ProposalStatus;
  createdDate: Date;
}

type ContractStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'paused';
type MilestoneStatus =
  | 'pending'
  | 'active'
  | 'funded'
  | 'work_submitted'
  | 'released'
  | 'approved'
  | 'completed'
  | 'cancelled';

// Contract Payment types
type ContractPaymentType = 'milestone' | 'timelog';
type ContractPaymentStatus = 'pending' | 'funded' | 'processing' | 'released' | 'refunded' | 'failed' | 'cancelled';

// Pending Payment types (Failed payment retry queue)
type PendingPaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface Contract {
  id: string;
  jobId: string;
  contractTitle: string;
  expertId: string;
  expertName: string;
  expertAvatar: string;
  hubName: string;
  priceType: 'fixed' | 'hourly';
  proposedPrice?: number;
  hourlyProposedPrice?: number;
  weeklyLimit?: number;
  selectedCurrency: string;
  status: ContractStatus;
  hasMilestones: boolean;
  startDate: Date;
  // Milestone stats from API
  milestoneStats: MilestoneStats;
  // Timelog stats from API (for hourly contracts)
  timelogStats: TimelogStats;
}

interface ContractPayment {
  id: string;
  paymentType: ContractPaymentType;
  contractId: string;
  contractTitle: string;
  jobId: string;
  jobTitle: string;
  clientId: string;
  clientName: string;
  expertId: string;
  expertName: string;
  expertAvatar: string;
  hubName: string;
  amount: number;
  currency: string;
  platformFee: number;
  transferAmount: number;
  status: ContractPaymentStatus;
  // For milestone
  milestoneTitle?: string;
  // For timelog
  hoursWorked?: number;
  weekNumber?: number;
  year?: number;
  fundedDate?: Date;
  releasedDate?: Date;
  createdAt: Date;
}

// Pending Payment - tracks failed payments in retry queue
interface PendingPayment {
  id: string;
  contractId: string;
  jobId: string;
  applicationId: string;
  hubId: string;
  expertId: string;
  learnerId: string;
  expertName: string;
  learnerName: string;
  contractTitle: string;
  description?: string;
  amount: number; // in cents
  currency: string;
  totalHours: number;
  startDateTime: string;
  endDateTime: string;
  status: PendingPaymentStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date;
  lastError?: string;
  lastAttempt?: Date;
  failedAt?: Date;
  processedAt?: Date;
  paymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-jobs',
  imports: [RouterLink, FormsModule, DecimalPipe, DatePipe, TitleCasePipe, NgClass],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss',
})
export class JobsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobsService = inject(JobsService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  // Loading states
  isLoading = signal(false);
  isLoadingProposals = signal(false);
  isLoadingContracts = signal(false);
  isLoadingContractPayments = signal(false);
  isLoadingPendingPayments = signal(false);

  // Search and filters
  jobSearchQuery = '';
  proposalSearchQuery = '';
  contractSearchQuery = '';
  contractPaymentSearchQuery = '';
  pendingPaymentSearchQuery = '';
  employmentFilter: EmploymentType | 'all' = 'all';

  // Pagination
  currentPage = signal(1);
  pageSize = 10;
  totalJobs = signal(0);
  totalProposals = signal(0);
  totalContracts = signal(0);
  totalContractPayments = signal(0);
  totalPendingPayments = signal(0);

  // Active tabs
  activeTab = signal<'jobs' | 'proposals' | 'contracts' | 'payments' | 'pending'>('jobs');
  currentJobStatus = signal<JobStatus | 'all'>('all');
  currentProposalStatus = signal<ProposalStatus | 'all'>('all');
  currentContractStatus = signal<ContractStatus | 'all'>('all');
  currentContractPaymentStatus = signal<ContractPaymentStatus | 'all'>('all');
  currentPendingPaymentStatus = signal<PendingPaymentStatus | 'all'>('all');

  // Tab definitions
  mainTabs = [
    { label: 'All Jobs', value: 'jobs' as const },
    { label: 'Proposals', value: 'proposals' as const },
    { label: 'Contracts', value: 'contracts' as const },
    { label: 'Contract Payments', value: 'payments' as const },
    { label: 'Pending Payments', value: 'pending' as const },
  ];

  jobStatusTabs = [
    { label: 'All', value: 'all' as const },
    { label: 'Draft', value: 'DRAFT' as const },
    { label: 'Active', value: 'ACTIVE' as const },
    { label: 'In Progress', value: 'IN_PROGRESS' as const },
    { label: 'Completed', value: 'COMPLETED' as const },
    { label: 'Cancelled', value: 'CANCELLED' as const },
  ];

  proposalStatusTabs = [
    { label: 'All', value: 'all' as const },
    { label: 'Pending', value: 'pending' as const },
    { label: 'Accepted', value: 'accepted' as const },
    { label: 'Rejected', value: 'rejected' as const },
    { label: 'Withdrawn', value: 'withdrawn' as const },
  ];

  contractStatusTabs = [
    { label: 'All', value: 'all' as const },
    { label: 'Pending', value: 'pending' as const },
    { label: 'Active', value: 'active' as const },
    { label: 'Completed', value: 'completed' as const },
    { label: 'Cancelled', value: 'cancelled' as const },
  ];

  contractPaymentStatusTabs = [
    { label: 'All', value: 'all' as const },
    { label: 'Pending', value: 'pending' as const },
    { label: 'Funded', value: 'funded' as const },
    { label: 'Released', value: 'released' as const },
    { label: 'Refunded', value: 'refunded' as const },
    { label: 'Failed', value: 'failed' as const },
  ];

  pendingPaymentStatusTabs = [
    { label: 'All', value: 'all' as const },
    { label: 'Pending', value: 'pending' as const },
    { label: 'Processing', value: 'processing' as const },
    { label: 'Completed', value: 'completed' as const },
    { label: 'Failed', value: 'failed' as const },
  ];

  // Data from API
  jobs = signal<Job[]>([]);
  proposals = signal<Proposal[]>([]);
  stats = signal<JobStats | null>(null);

  // Contracts data from API
  contracts = signal<Contract[]>([]);

  // Contract Payments data
  contractPayments = signal<ContractPayment[]>([]);

  // Pending Payments data (failed payment retry queue)
  pendingPayments = signal<PendingPayment[]>([]);

  // Computed stats from API
  jobStats = computed(() => {
    const s = this.stats();
    if (s) {
      return [
        { label: 'Total Jobs', value: s.total, icon: 'briefcase.svg', color: '#E3F2FD', class: '' },
        { label: 'Active Jobs', value: s.active, icon: 'check-circle.svg', color: '#E8F5E9', class: '' },
        { label: 'Proposals', value: s.totalProposals, icon: 'document.svg', color: '#FFF3E0', class: '' },
        {
          label: 'Active Contracts',
          value: s.contractsByStatus?.active || 0,
          icon: 'handshake.svg',
          color: '#F3E5F5',
          class: '',
        },
      ];
    }
    return [
      { label: 'Total Jobs', value: this.jobs().length, icon: 'briefcase.svg', color: '#E3F2FD', class: '' },
      {
        label: 'Active Jobs',
        value: this.jobs().filter((j) => j.status === 'ACTIVE').length,
        icon: 'check-circle.svg',
        color: '#E8F5E9',
        class: '',
      },
      { label: 'Proposals', value: this.proposals().length, icon: 'document.svg', color: '#FFF3E0', class: '' },
      {
        label: 'Active Contracts',
        value: this.contracts().filter((c) => c.status === 'active').length,
        icon: 'handshake.svg',
        color: '#F3E5F5',
        class: '',
      },
    ];
  });

  // Jobs list (server-side filtered, but expose for template)
  filteredJobs = computed(() => this.jobs());
  paginatedJobs = computed(() => this.jobs());

  // Proposals list (server-side filtered, but expose for template)
  filteredProposals = computed(() => this.proposals());
  paginatedProposals = computed(() => this.proposals());

  // Contracts list (server-side filtered, but expose for template)
  filteredContracts = computed(() => this.contracts());

  // Contract Payments list
  filteredContractPayments = computed(() => this.contractPayments());
  paginatedContractPayments = computed(() => this.contractPayments());

  // Pending Payments list
  filteredPendingPayments = computed(() => this.pendingPayments());
  paginatedPendingPayments = computed(() => this.pendingPayments());

  // Pagination
  totalPages = computed(() => {
    if (this.activeTab() === 'jobs') {
      return Math.ceil(this.totalJobs() / this.pageSize) || 1;
    }
    if (this.activeTab() === 'proposals') {
      return Math.ceil(this.totalProposals() / this.pageSize) || 1;
    }
    if (this.activeTab() === 'contracts') {
      return Math.ceil(this.totalContracts() / this.pageSize) || 1;
    }
    if (this.activeTab() === 'payments') {
      return Math.ceil(this.totalContractPayments() / this.pageSize) || 1;
    }
    return Math.ceil(this.totalPendingPayments() / this.pageSize) || 1;
  });

  paginatedContracts = computed(() => this.contracts());

  ngOnInit() {
    // Read tab from route data
    const tab = this.route.snapshot.data['tab'];
    if (tab && ['jobs', 'proposals', 'contracts', 'payments', 'pending'].includes(tab)) {
      this.activeTab.set(tab);
    }

    // Setup debounced search
    this.searchSubject.pipe(debounceTime(300), takeUntil(this.destroy$)).subscribe(() => {
      this.currentPage.set(1);
      this.loadData();
    });

    // Load initial data
    this.loadStats();
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStats() {
    // Service caches stats - will only fetch from API once per session
    this.jobsService
      .getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.stats.set(response.data);
          }
        },
        error: (error) => {
          console.error('Failed to load stats:', error);
        },
      });
  }

  private loadData() {
    if (this.activeTab() === 'jobs') {
      this.loadJobs();
    } else if (this.activeTab() === 'proposals') {
      this.loadProposals();
    } else if (this.activeTab() === 'contracts') {
      this.loadContracts();
    } else if (this.activeTab() === 'payments') {
      this.loadContractPayments();
    } else if (this.activeTab() === 'pending') {
      this.loadPendingPayments();
    }
  }

  private loadJobs() {
    this.isLoading.set(true);

    const params: Record<string, unknown> = {
      page: this.currentPage(),
      limit: this.pageSize,
    };

    if (this.currentJobStatus() !== 'all') {
      params['status'] = this.currentJobStatus();
    }
    if (this.employmentFilter !== 'all') {
      params['employmentType'] = this.employmentFilter;
    }
    if (this.jobSearchQuery) {
      params['search'] = this.jobSearchQuery;
    }

    this.jobsService
      .listJobs(params as Parameters<typeof this.jobsService.listJobs>[0])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Transform API response to view model
            const transformedJobs: Job[] = response.data.map((j: ApiJob) => ({
              id: j._id,
              jobTitle: j.jobTitle,
              jobDescription: j.jobDescription,
              jobSummary: j.jobSummary || '',
              employmentType: j.employmentType,
              status: j.status,
              serviceCategory: j.serviceCategory,
              expertLevel: j.expertLevel || '',
              jobLocation: j.jobLocation || '',
              jobBudget: j.jobBudget,
              jobCurrency: j.jobCurrency,
              jobSkills: j.jobSkills,
              name: j.name,
              email: j.email,
              organizationName: j.organizationName || '',
              hubId: j.hubId,
              hubName: j.hubName || j.hub?.name || '',
              createdBy: j.createdBy,
              proposalsCount: j.proposalsCount,
              hiresCount: j.hiresCount,
              createdAt: new Date(j.createdAt),
            }));
            this.jobs.set(transformedJobs);
            this.totalJobs.set(response.meta?.total || response.data.length);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load jobs:', error);
          this.toast.error('Failed to load jobs');
          this.isLoading.set(false);
        },
      });
  }

  private loadProposals() {
    this.isLoadingProposals.set(true);

    const params: Record<string, unknown> = {
      page: this.currentPage(),
      limit: this.pageSize,
    };

    if (this.currentProposalStatus() !== 'all') {
      params['status'] = this.currentProposalStatus();
    }
    if (this.proposalSearchQuery) {
      params['search'] = this.proposalSearchQuery;
    }

    this.jobsService
      .listProposals(params as Parameters<typeof this.jobsService.listProposals>[0])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Transform API response to view model
            const transformedProposals: Proposal[] = response.data.map((p: ApiProposal) => ({
              id: p._id,
              jobId: p.jobId,
              jobTitle: p.jobTitle || p.job?.jobTitle || '',
              expertId: p.expert?._id || '',
              expertName: p.expert?.name || '',
              expertAvatar: p.expert?.profilePhoto || 'https://i.pravatar.cc/40?u=' + p.expert?._id,
              proposalDetails: p.proposalDetails,
              priceType: p.priceType,
              proposedPrice: p.proposedPrice,
              hourlyProposedPrice: p.hourlyProposedPrice,
              workingHours: p.workingHours,
              selectedCurrency: p.selectedCurrency,
              status: p.status,
              createdDate: new Date(p.createdAt),
            }));
            this.proposals.set(transformedProposals);
            this.totalProposals.set(response.meta?.total || response.data.length);
          }
          this.isLoadingProposals.set(false);
        },
        error: (error) => {
          console.error('Failed to load proposals:', error);
          this.toast.error('Failed to load proposals');
          this.isLoadingProposals.set(false);
        },
      });
  }

  private loadContracts() {
    this.isLoadingContracts.set(true);

    const params: Record<string, unknown> = {
      page: this.currentPage(),
      limit: this.pageSize,
    };

    if (this.currentContractStatus() !== 'all') {
      params['status'] = this.currentContractStatus();
    }
    if (this.contractSearchQuery) {
      params['search'] = this.contractSearchQuery;
    }

    this.jobsService
      .listContracts(params as Parameters<typeof this.jobsService.listContracts>[0])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Transform API response to view model
            const transformedContracts: Contract[] = response.data.map((c: ApiContract) => ({
              id: c._id,
              jobId: c.jobId,
              contractTitle: c.contractTitle,
              expertId: c.expert?._id || '',
              expertName: c.expert?.name || '',
              expertAvatar: c.expert?.profilePhoto || 'https://i.pravatar.cc/40?u=' + c.expert?._id,
              hubName: c.hub?.name || '',
              priceType: c.priceType,
              proposedPrice: c.proposedPrice,
              hourlyProposedPrice: c.hourlyProposedPrice,
              weeklyLimit: c.weeklyLimit,
              selectedCurrency: c.selectedCurrency,
              status: c.status as ContractStatus,
              hasMilestones: c.hasMilestones,
              startDate: new Date(c.startDate),
              milestoneStats: c.milestoneStats || { total: 0, funded: 0, completed: 0, pending: 0, totalAmount: 0, fundedAmount: 0 },
              timelogStats: c.timelogStats || { totalHours: 0, totalBillable: 0 },
            }));
            this.contracts.set(transformedContracts);
            this.totalContracts.set(response.meta?.total || response.data.length);
          }
          this.isLoadingContracts.set(false);
        },
        error: (error) => {
          console.error('Failed to load contracts:', error);
          this.toast.error('Failed to load contracts');
          this.isLoadingContracts.set(false);
        },
      });
  }

  private loadContractPayments() {
    this.isLoadingContractPayments.set(true);

    const params: Record<string, unknown> = {
      page: this.currentPage(),
      limit: this.pageSize,
    };

    if (this.currentContractPaymentStatus() !== 'all') {
      params['status'] = this.currentContractPaymentStatus();
    }
    if (this.contractPaymentSearchQuery) {
      params['search'] = this.contractPaymentSearchQuery;
    }

    this.jobsService
      .listContractPayments(params as Parameters<typeof this.jobsService.listContractPayments>[0])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Transform API response to view model
            const transformedPayments: ContractPayment[] = response.data.map((p: ApiContractPayment) => ({
              id: p._id,
              paymentType: p.paymentType,
              contractId: p.contractId,
              contractTitle: p.contract?.contractTitle || '',
              jobId: p.job?._id || '',
              jobTitle: p.job?.jobTitle || '',
              clientId: p.client?._id || '',
              clientName: p.client?.name || '',
              expertId: p.expert?._id || '',
              expertName: p.expert?.name || '',
              expertAvatar: p.expert?.profilePhoto || 'https://i.pravatar.cc/40?u=' + p.expert?._id,
              hubName: p.hub?.name || '',
              amount: p.amount,
              currency: p.currency,
              platformFee: p.platformFee,
              transferAmount: p.transferAmount,
              status: p.status,
              milestoneTitle: p.milestone?.taskName,
              hoursWorked: p.timelog?.hoursWorked,
              weekNumber: p.timelog?.weekNumber,
              year: p.timelog?.year,
              fundedDate: p.fundedDate ? new Date(p.fundedDate) : undefined,
              releasedDate: p.releasedDate ? new Date(p.releasedDate) : undefined,
              createdAt: new Date(p.createdAt),
            }));
            this.contractPayments.set(transformedPayments);
            this.totalContractPayments.set(response.meta?.total || response.data.length);
          }
          this.isLoadingContractPayments.set(false);
        },
        error: (error) => {
          console.error('Failed to load contract payments:', error);
          this.toast.error('Failed to load contract payments');
          this.isLoadingContractPayments.set(false);
        },
      });
  }

  private loadPendingPayments() {
    this.isLoadingPendingPayments.set(true);

    const params: Record<string, unknown> = {
      page: this.currentPage(),
      limit: this.pageSize,
    };

    if (this.currentPendingPaymentStatus() !== 'all') {
      params['status'] = this.currentPendingPaymentStatus();
    }
    if (this.pendingPaymentSearchQuery) {
      params['search'] = this.pendingPaymentSearchQuery;
    }

    this.jobsService
      .listPendingPayments(params as Parameters<typeof this.jobsService.listPendingPayments>[0])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Transform API response to view model
            const transformedPayments: PendingPayment[] = response.data.map((p: ApiPendingPayment) => ({
              id: p._id,
              contractId: p.contractId,
              jobId: p.jobId,
              applicationId: p.applicationId,
              hubId: p.hubId,
              expertId: p.expertId,
              learnerId: p.learnerId,
              expertName: p.expert?.name || '',
              learnerName: p.learner?.name || '',
              contractTitle: p.contractTitle || p.contract?.contractTitle || '',
              description: p.description,
              amount: p.amount,
              currency: p.currency,
              totalHours: p.totalHours,
              startDateTime: p.startDateTime,
              endDateTime: p.endDateTime,
              status: p.status,
              retryCount: p.retryCount,
              maxRetries: p.maxRetries,
              nextRetryAt: p.nextRetryAt ? new Date(p.nextRetryAt) : new Date(),
              lastError: p.lastError,
              lastAttempt: p.lastAttempt ? new Date(p.lastAttempt) : undefined,
              failedAt: p.failedAt ? new Date(p.failedAt) : undefined,
              processedAt: p.processedAt ? new Date(p.processedAt) : undefined,
              paymentIntentId: p.paymentIntentId,
              createdAt: new Date(p.createdAt),
              updatedAt: new Date(p.updatedAt),
            }));
            this.pendingPayments.set(transformedPayments);
            this.totalPendingPayments.set(response.meta?.total || response.data.length);
          }
          this.isLoadingPendingPayments.set(false);
        },
        error: (error) => {
          console.error('Failed to load pending payments:', error);
          this.toast.error('Failed to load pending payments');
          this.isLoadingPendingPayments.set(false);
        },
      });
  }

  // Tab counts
  getTabCount(tab: 'jobs' | 'proposals' | 'contracts' | 'payments' | 'pending'): number {
    const s = this.stats();
    switch (tab) {
      case 'jobs':
        return s?.total || this.totalJobs();
      case 'proposals':
        return s?.totalProposals || this.totalProposals();
      case 'contracts':
        return s?.totalContracts || this.totalContracts();
      case 'payments':
        return s?.totalContractPayments || this.totalContractPayments();
      case 'pending':
        return s?.totalPendingPayments || this.totalPendingPayments();
    }
  }

  // Tab actions
  setActiveTab(tab: 'jobs' | 'proposals' | 'contracts' | 'payments' | 'pending') {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.loadData();
    // Update URL without full navigation
    const path = tab === 'jobs' ? '/dashboard/jobs' : `/dashboard/jobs/${tab}`;
    this.router.navigate([path], { replaceUrl: true });
  }

  setJobStatus(status: JobStatus | 'all') {
    this.currentJobStatus.set(status);
    this.currentPage.set(1);
    this.loadJobs();
  }

  setProposalStatus(status: ProposalStatus | 'all') {
    this.currentProposalStatus.set(status);
    this.currentPage.set(1);
    this.loadProposals();
  }

  setContractStatus(status: ContractStatus | 'all') {
    this.currentContractStatus.set(status);
    this.currentPage.set(1);
    this.loadContracts();
  }

  setContractPaymentStatus(status: ContractPaymentStatus | 'all') {
    this.currentContractPaymentStatus.set(status);
    this.currentPage.set(1);
    this.loadContractPayments();
  }

  setPendingPaymentStatus(status: PendingPaymentStatus | 'all') {
    this.currentPendingPaymentStatus.set(status);
    this.currentPage.set(1);
    this.loadPendingPayments();
  }

  // Filter actions - trigger debounced search
  filterJobs() {
    this.searchSubject.next(this.jobSearchQuery);
  }

  filterProposals() {
    this.searchSubject.next(this.proposalSearchQuery);
  }

  filterContracts() {
    this.searchSubject.next(this.contractSearchQuery);
  }

  filterContractPayments() {
    this.searchSubject.next(this.contractPaymentSearchQuery);
  }

  filterPendingPayments() {
    this.searchSubject.next(this.pendingPaymentSearchQuery);
  }

  // Pagination actions
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadData();
    }
  }

  // View actions
  viewJob(id: string) {
    this.router.navigate(['/dashboard/jobs/detail', id]);
  }

  viewProposal(id: string) {
    this.router.navigate(['/dashboard/jobs/proposals', id]);
  }

  viewContract(id: string) {
    this.router.navigate(['/dashboard/jobs/contracts', id]);
  }

  messageExpert(expertId: string) {
    console.log('Message expert:', expertId);
  }

  // Payment status helpers
  getContractPaymentStatusClasses(status: ContractPaymentStatus): string {
    const classes: Record<ContractPaymentStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      funded: 'bg-blue-100 text-blue-700',
      processing: 'bg-cyan-100 text-cyan-700',
      released: 'bg-green-100 text-green-700',
      refunded: 'bg-orange-100 text-orange-700',
      failed: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-200 text-gray-600',
    };
    return classes[status];
  }

  // Contract Payment actions
  viewContractPayment(payment: ContractPayment) {
    console.log('View payment:', payment.id);
    // Navigate to contract detail with payment tab
    this.router.navigate(['/dashboard/jobs/contracts', payment.contractId]);
  }

  releasePayment(payment: ContractPayment) {
    console.log('Release payment:', payment.id);
    this.toast.success(`Payment of ${payment.currency} ${payment.amount} released`);
  }

  refundPayment(payment: ContractPayment) {
    console.log('Refund payment:', payment.id);
  }

  // Pending Payment status helpers
  getPendingPaymentStatusClasses(status: PendingPaymentStatus): string {
    const classes: Record<PendingPaymentStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    };
    return classes[status];
  }

  isPaymentOverdue(date: Date): boolean {
    return new Date(date) < new Date();
  }

  // Pending Payment actions
  retryPendingPayment(payment: PendingPayment) {
    this.jobsService
      .retryPendingPayment(payment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toast.success(`Retry queued for ${payment.contractTitle}`);
            this.loadPendingPayments(); // Refresh the list
          }
        },
        error: (error) => {
          console.error('Failed to retry payment:', error);
          this.toast.error('Failed to retry payment');
        },
      });
  }

  viewPendingPaymentDetails(payment: PendingPayment) {
    console.log('Viewing payment details:', payment.id);
    // Navigate to contract detail
    this.router.navigate(['/dashboard/jobs/contracts', payment.contractId]);
  }
}
