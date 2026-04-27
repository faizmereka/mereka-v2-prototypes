import { Component, signal, computed, inject, OnInit, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthStateService } from '../../../../../../core/services/auth-state.service';
import {
  HubJobsApiService,
  JobPost,
  Contract,
  Proposal,
  HubJobsStats,
} from '../../../../services/hub-jobs-api.service';
import { environment } from '../../../../../../../environments/environment';

type TabType = 'jobs' | 'proposals' | 'hires';
type JobStatus = 'published' | 'draft' | 'closed';
type SortField = 'jobTitle' | 'serviceType' | 'createdAt' | 'proposalCount' | 'status';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-hub-job-posts',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './posts.component.html',
})
export class HubJobPostsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authState = inject(AuthStateService);
  private readonly jobsApi = inject(HubJobsApiService);
  private readonly platformId = inject(PLATFORM_ID);

  // Track which tabs have been loaded (for lazy loading)
  private readonly loadedTabs = signal<Set<TabType>>(new Set());
  private autoTabSelected = false;

  constructor() {
    console.log('[HubJobPostsComponent] V1-style design loaded');

    // Effect to handle tab changes and lazy loading
    effect(() => {
      const tab = this.activeTab();
      const loaded = this.loadedTabs();

      // Lazy load data for tab if not already loaded
      if (!loaded.has(tab)) {
        this.loadTabData(tab);
      }
    });
  }

  // Tab state
  readonly activeTab = signal<TabType>('jobs');

  // Loading states
  readonly loading = signal(false);
  readonly jobsLoading = signal(false);
  readonly proposalsLoading = signal(false);
  readonly contractsLoading = signal(false);

  // Search and filters
  readonly searchText = signal('');
  readonly statusFilter = signal<'all' | JobStatus>('all');

  // Sorting
  readonly sortBy = signal<SortField>('createdAt');
  readonly sortType = signal<SortDirection>('desc');

  // UI state
  readonly showActionsDropdown = signal<string | null>(null);

  // Pagination for jobs
  readonly jobsPage = signal(1);
  readonly jobsLimit = signal(10);
  readonly jobsTotal = signal(0);
  readonly jobsTotalPages = signal(0);

  // Pagination for proposals
  readonly proposalsPage = signal(1);
  readonly proposalsLimit = signal(10);
  readonly proposalsTotal = signal(0);
  readonly proposalsTotalPages = signal(0);

  // Pagination for contracts
  readonly contractsPage = signal(1);
  readonly contractsLimit = signal(10);
  readonly contractsTotal = signal(0);
  readonly contractsTotalPages = signal(0);

  // Data
  readonly jobs = signal<JobPost[]>([]);
  readonly proposals = signal<Proposal[]>([]);
  readonly contracts = signal<Contract[]>([]);

  // Stats (counts from API)
  readonly stats = signal<HubJobsStats | null>(null);
  readonly statsLoading = signal(false);

  // Computed
  readonly hubId = computed(() => this.authState.selectedHub()?.id || '');
  readonly hasProposals = computed(() => this.proposals().length > 0);
  readonly hasContracts = computed(() => this.contracts().length > 0);

  // Table menus matching v1
  readonly jobMenus = ['Job Details', 'Service Type', 'Posted On', 'Proposals', 'Status', ''];
  readonly proposalsMenus = ['Expert', 'Job', 'Proposed Price', 'Submitted', 'Status', ''];
  readonly hiresMenus = ['Expert Information', 'Job Detail', 'In Escrow', 'Paid to Date', 'Status', ''];

  // Tab labels - always show all tabs for URL-based navigation
  // Uses stats API for counts (fast), falls back to pagination totals when loaded
  readonly tabs = computed(() => {
    const stats = this.stats();
    const tabList: { key: TabType; label: string; count?: number }[] = [
      { key: 'jobs', label: 'All Job Posts', count: stats?.jobs ?? this.jobsTotal() },
      { key: 'proposals', label: 'All Proposals', count: stats?.proposals ?? this.proposalsTotal() },
      { key: 'hires', label: 'All Hires', count: stats?.contracts ?? this.contractsTotal() },
    ];
    return tabList;
  });

  ngOnInit(): void {
    // Read tab from query params on init
    const tabParam = this.route.snapshot.queryParamMap.get('tab') as TabType | null;
    if (tabParam && ['jobs', 'proposals', 'hires'].includes(tabParam)) {
      this.activeTab.set(tabParam);
      this.autoTabSelected = true; // User explicitly selected tab via URL
    }

    // Load stats immediately for tab counts
    this.loadStats();
    // The effect will trigger lazy loading for the active tab data
  }

  /**
   * Load stats (counts) for all tabs
   */
  async loadStats(): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    this.statsLoading.set(true);
    try {
      const stats = await this.jobsApi.getStats(hubId);
      this.stats.set(stats);

      // Auto-select tab based on data availability (only if not explicitly set by URL)
      if (!this.autoTabSelected) {
        this.autoSelectTab(stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      this.statsLoading.set(false);
    }
  }

  /**
   * Auto-select the first tab that has data
   * Priority: jobs > proposals > hires
   */
  private autoSelectTab(stats: HubJobsStats): void {
    if (stats.jobs > 0) {
      this.activeTab.set('jobs');
    } else if (stats.proposals > 0) {
      this.activeTab.set('proposals');
    } else if (stats.contracts > 0) {
      this.activeTab.set('hires');
    }
    // If all are 0, keep default 'jobs' tab
  }

  /**
   * Load data for a specific tab (lazy loading)
   */
  private loadTabData(tab: TabType): void {
    switch (tab) {
      case 'jobs':
        this.loadJobs();
        break;
      case 'proposals':
        this.loadProposals();
        break;
      case 'hires':
        this.loadContracts();
        break;
    }
    // Mark tab as loaded
    this.loadedTabs.update((set) => new Set([...set, tab]));
  }

  async loadJobs(): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    this.jobsLoading.set(true);
    try {
      const statusFilter = this.statusFilter();
      const result = await this.jobsApi.getJobs({
        hubId,
        page: this.jobsPage(),
        limit: this.jobsLimit(),
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: this.searchText() || undefined,
      });
      this.jobs.set(result.items);
      this.jobsTotal.set(result.pagination.total);
      this.jobsTotalPages.set(result.pagination.totalPages);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      this.jobsLoading.set(false);
    }
  }

  async loadProposals(): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    this.proposalsLoading.set(true);
    try {
      const result = await this.jobsApi.getProposals({
        hubId,
        page: this.proposalsPage(),
        limit: this.proposalsLimit(),
      });
      this.proposals.set(result.items);
      this.proposalsTotal.set(result.pagination.total);
      this.proposalsTotalPages.set(result.pagination.totalPages);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      this.proposalsLoading.set(false);
    }
  }

  async loadContracts(): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    this.contractsLoading.set(true);
    try {
      const result = await this.jobsApi.getContracts({
        hubId,
        page: this.contractsPage(),
        limit: this.contractsLimit(),
      });
      this.contracts.set(result.items);
      this.contractsTotal.set(result.pagination.total);
      this.contractsTotalPages.set(result.pagination.totalPages);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      this.contractsLoading.set(false);
    }
  }

  setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
    this.autoTabSelected = true; // User explicitly selected tab
    this.closeActionsDropdown();

    // Update URL query param without navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  setStatusFilter(status: 'all' | JobStatus): void {
    this.statusFilter.set(status);
    this.jobsPage.set(1);
    this.loadJobs();
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.jobsPage.set(1);
    this.loadJobs();
  }

  sortData(field: SortField): void {
    if (!field) return;
    if (this.sortBy() === field) {
      this.sortType.update((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(field);
      this.sortType.set('asc');
    }
  }

  toggleActionsDropdown(id: string): void {
    if (this.showActionsDropdown() === id) {
      this.showActionsDropdown.set(null);
    } else {
      this.showActionsDropdown.set(id);
    }
  }

  closeActionsDropdown(): void {
    this.showActionsDropdown.set(null);
  }

  // Navigation
  createJob(): void {
    this.router.navigate(['/onboarding/job']);
  }

  viewJobPost(jobId: string): void {
    if (isPlatformBrowser(this.platformId)) {
      window.open(`${environment.webUrl}/job/${jobId}`, '_blank');
    }
  }

  editJob(job: JobPost): void {
    this.router.navigate(['/onboarding/job', 'edit', job._id]);
  }

  viewProposals(job: JobPost): void {
    this.router.navigate(['/hub/jobs', job._id, 'proposals']);
  }

  viewContract(contract: Contract): void {
    if (contract.status === 'pending') {
      // Pending contracts go to offer detail page
      this.router.navigate(['/hub/jobs/offers/view', contract._id]);
    } else {
      this.router.navigate(['/hub/jobs/contracts', contract._id]);
    }
  }

  // Job Actions
  async markAsClosed(job: JobPost): Promise<void> {
    try {
      await this.jobsApi.updateJobStatus(job._id, 'closed');
      await this.loadJobs();
    } catch (error) {
      console.error('Error closing job:', error);
    }
  }

  async reusePost(job: JobPost): Promise<void> {
    // Navigate to create job with job data pre-filled
    this.router.navigate(['/create-job'], { queryParams: { reuse: job._id } });
  }

  async deleteJob(job: JobPost): Promise<void> {
    if (!confirm('Are you sure you want to delete this job post?')) return;

    try {
      await this.jobsApi.deleteJob(job._id);
      await this.loadJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  }

  shareJob(job: JobPost): void {
    const url = `${window.location.origin}/jobs/${job._id}`;
    navigator.clipboard.writeText(url);
    // TODO: Show toast notification
  }

  // Contract Actions
  messageExpert(contract: Contract): void {
    // TODO: Open messaging
    console.log('Message expert:', contract.asssignedExpertId);
  }

  markContractAsClosed(contract: Contract): void {
    // TODO: Implement contract close
    console.log('Mark contract as closed:', contract._id);
  }

  reviewWork(contract: Contract): void {
    // Navigate to contract details page (only for active contracts)
    if (contract.status === 'pending') {
      this.router.navigate(['/hub/jobs/offers/view', contract._id]);
    } else {
      this.router.navigate(['/hub/jobs/contracts', contract._id]);
    }
  }

  fundMilestone(contract: Contract): void {
    // Navigate to contract details page where the fund milestone dialog can be opened
    // Only active contracts can have milestones funded
    if (contract.status === 'pending') {
      this.router.navigate(['/hub/jobs/offers/view', contract._id]);
    } else {
      this.router.navigate(['/hub/jobs/contracts', contract._id]);
    }
  }

  // Proposal Actions
  viewProposalDetail(proposal: Proposal): void {
    // Navigate to proposal detail page
    if (proposal.jobId?._id) {
      this.router.navigate(['/hub/jobs', proposal.jobId._id, 'proposals', proposal._id]);
    }
  }

  sendOffer(proposal: Proposal): void {
    // Navigate to send offer page
    this.router.navigate(['/hub/jobs/offers/send', proposal._id]);
  }

  async rejectProposalItem(proposal: Proposal): Promise<void> {
    if (!confirm('Are you sure you want to reject this proposal?')) return;

    const hubId = this.hubId();
    if (!hubId) return;

    try {
      await this.jobsApi.rejectProposal(hubId, proposal._id);
      await this.loadProposals();
    } catch (error) {
      console.error('Error rejecting proposal:', error);
    }
  }

  // Proposal helpers
  getExpertName(proposal: Proposal): string {
    return proposal.asssignedExpertId?.name || '-';
  }

  getExpertEmail(proposal: Proposal): string {
    return proposal.asssignedExpertId?.email || '-';
  }

  getExpertImage(proposal: Proposal): string | undefined {
    return proposal.asssignedExpertId?.profileImage;
  }

  getJobTitle(proposal: Proposal): string {
    return proposal.jobId?.jobTitle || '-';
  }

  formatProposalPrice(proposal: Proposal): string {
    if (proposal.priceType === 'hourly' && proposal.hourlyProposedPrice) {
      return `${proposal.selectedCurrency} ${proposal.hourlyProposedPrice.toLocaleString()}/hr`;
    }
    if (proposal.priceType === 'fixed' && proposal.proposedPrice) {
      return `${proposal.selectedCurrency} ${proposal.proposedPrice.toLocaleString()}`;
    }
    return '-';
  }

  getProposalStatus(status: string): { text: string; color: string } {
    switch (status) {
      case 'pending':
        return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
      case 'accepted':
        return { text: 'Accepted', color: 'bg-green-100 text-green-800' };
      case 'rejected':
        return { text: 'Rejected', color: 'bg-red-100 text-red-800' };
      case 'withdrawn':
        return { text: 'Withdrawn', color: 'bg-neutral-100 text-neutral-600' };
      default:
        return { text: status, color: 'bg-neutral-100 text-neutral-800' };
    }
  }

  // Pagination
  handleJobsPageChange(page: number): void {
    this.jobsPage.set(page);
    this.loadJobs();
  }

  handleProposalsPageChange(page: number): void {
    this.proposalsPage.set(page);
    this.loadProposals();
  }

  handleContractsPageChange(page: number): void {
    this.contractsPage.set(page);
    this.loadContracts();
  }

  // Status helpers
  getJobStatus(status: string): { text: string; color: string } {
    switch (status) {
      case 'published':
      case 'active':
        return { text: 'Open', color: 'bg-green-100 text-green-800' };
      case 'draft':
      case 'drafted':
        return { text: 'Draft', color: 'bg-yellow-100 text-yellow-800' };
      case 'closed':
      case 'archived':
        return { text: 'Closed', color: 'bg-neutral-100 text-neutral-600' };
      default:
        return { text: status, color: 'bg-neutral-100 text-neutral-800' };
    }
  }

  getContractStatus(contract: Contract): { text: string; color: string } {
    const status = contract.status;
    switch (status) {
      case 'active':
        return { text: 'In Progress', color: 'bg-blue-100 text-blue-800' };
      case 'pending':
        return { text: 'Offer Sent', color: 'bg-yellow-100 text-yellow-800' };
      case 'paused':
        return { text: 'Paused', color: 'bg-orange-100 text-orange-800' };
      case 'completed':
        return { text: 'Completed', color: 'bg-green-100 text-green-800' };
      case 'cancelled':
        return { text: 'Cancelled', color: 'bg-red-100 text-red-800' };
      default:
        return { text: status, color: 'bg-neutral-100 text-neutral-800' };
    }
  }

  // Formatting helpers
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatCurrency(amount: number | undefined, currency: string): string {
    if (amount === undefined || amount === null) return '-';
    return `${currency} ${amount.toLocaleString()}`;
  }

  // Helper for template
  readonly Math = Math;
}
