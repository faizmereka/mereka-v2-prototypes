import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { IconComponent } from '@mereka/ui';
import { AuthStateService } from '../../../../../../core/services/auth-state.service';
import {
  HubJobsApiService,
  Proposal,
  Contract,
  HubExpertStats,
} from '../../../../services/hub-jobs-api.service';

type TabType = 'contracted' | 'proposed';

@Component({
  selector: 'app-hub-job-applications',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './applications.component.html',
})
export class HubJobApplicationsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authState = inject(AuthStateService);
  private readonly jobsApi = inject(HubJobsApiService);

  // Track loaded tabs for lazy loading
  private readonly loadedTabs = signal<Set<TabType>>(new Set());
  private autoTabSelected = false;

  constructor() {
    // Effect for lazy loading - only load data when tab changes
    effect(() => {
      const tab = this.activeTab();
      const loaded = this.loadedTabs();
      if (!loaded.has(tab)) {
        this.loadTabData(tab);
      }
    });
  }

  // Tab state
  readonly activeTab = signal<TabType>('contracted');

  // Loading states
  readonly statsLoading = signal(false);
  readonly contractsLoading = signal(false);
  readonly proposalsLoading = signal(false);

  // Stats (counts from API)
  readonly stats = signal<HubExpertStats | null>(null);

  // Pagination - Contracts
  readonly contractsPage = signal(1);
  readonly contractsLimit = signal(10);
  readonly contractsTotal = signal(0);
  readonly contractsTotalPages = signal(0);

  // Pagination - Proposals
  readonly proposalsPage = signal(1);
  readonly proposalsLimit = signal(10);
  readonly proposalsTotal = signal(0);
  readonly proposalsTotalPages = signal(0);

  // Data
  readonly contracts = signal<Contract[]>([]);
  readonly proposals = signal<Proposal[]>([]);

  // Computed
  readonly hubId = computed(() => this.authState.selectedHub()?.id || '');

  // Table headers
  readonly contractMenus = ['Client Information', 'Job Details', 'Payment Due', 'Earning to Date', 'Status', ''];
  readonly proposalMenus = ['Client Information', 'Job Details', 'Proposed Price', 'Offer Price', 'Status', ''];

  // Tabs with counts from stats API (fast) or fallback to pagination totals
  readonly tabs = computed(() => {
    const stats = this.stats();
    return [
      { key: 'contracted' as TabType, label: 'Contracted', count: stats?.contracts ?? this.contractsTotal() },
      { key: 'proposed' as TabType, label: 'Proposed', count: stats?.proposals ?? this.proposalsTotal() },
    ];
  });

  // Check if there's any data
  readonly hasAnyData = computed(() => {
    const stats = this.stats();
    if (stats) {
      return stats.contracts > 0 || stats.proposals > 0;
    }
    return this.contractsTotal() > 0 || this.proposalsTotal() > 0;
  });

  ngOnInit(): void {
    // Read tab from query params
    const tabParam = this.route.snapshot.queryParamMap.get('tab') as TabType | null;
    if (tabParam && ['contracted', 'proposed'].includes(tabParam)) {
      this.activeTab.set(tabParam);
      this.autoTabSelected = true; // User explicitly selected tab via URL
    }

    // Load stats first for tab counts, then auto-select tab
    this.loadStats();
  }

  /**
   * Load stats (counts) for all tabs - fast API call
   */
  async loadStats(): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    this.statsLoading.set(true);
    try {
      const stats = await this.jobsApi.getExpertStats(hubId);
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
   */
  private autoSelectTab(stats: HubExpertStats): void {
    // Priority: contracted (active work) > proposed (pending applications)
    if (stats.contracts > 0) {
      this.activeTab.set('contracted');
    } else if (stats.proposals > 0) {
      this.activeTab.set('proposed');
    }
    // If both are 0, keep default 'contracted' tab
  }

  private loadTabData(tab: TabType): void {
    switch (tab) {
      case 'contracted':
        this.loadContracts();
        break;
      case 'proposed':
        this.loadProposals();
        break;
    }
    this.loadedTabs.update((set) => new Set([...set, tab]));
  }

  setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
    this.autoTabSelected = true; // User explicitly selected tab
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  async loadContracts(): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    this.contractsLoading.set(true);
    try {
      // Filter by expertHubId to get contracts where experts FROM this hub are assigned
      const result = await this.jobsApi.getContracts({
        hubId,
        expertHubId: hubId, // Expert perspective - contracts assigned to this hub's experts
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

  async loadProposals(): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) return;

    this.proposalsLoading.set(true);
    try {
      // Filter by expertHubId to get proposals submitted BY experts FROM this hub
      const result = await this.jobsApi.getProposals({
        hubId,
        expertHubId: hubId, // Expert perspective - proposals submitted by this hub's experts
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

  // Pagination handlers
  onContractsPageChange(page: number): void {
    this.contractsPage.set(page);
    this.loadContracts();
  }

  onProposalsPageChange(page: number): void {
    this.proposalsPage.set(page);
    this.loadProposals();
  }

  // Status helpers
  getContractStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-neutral-100 text-neutral-600';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  getContractStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'In Progress';
      case 'pending':
        return 'Offer Received';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  getProposalStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'withdrawn':
        return 'bg-neutral-100 text-neutral-600';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  // Format helpers
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatCurrency(amount: number | undefined, currency: string | undefined): string {
    if (amount === undefined) return '-';
    return `${currency || 'MYR'} ${amount.toLocaleString()}`;
  }

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  // Navigation helpers
  viewContract(contractId: string, status?: string): void {
    // For pending offers, navigate to the view-offer page (accept/decline)
    // For active/completed contracts, navigate to contract details
    if (status === 'pending') {
      this.router.navigate(['/hub/jobs/offers/view', contractId]);
    } else {
      this.router.navigate(['/hub/jobs/contracts', contractId]);
    }
  }

  viewProposal(proposalId: string): void {
    this.router.navigate(['/hub/proposals', proposalId]);
  }

  browseJobs(): void {
    window.open('/jobs', '_blank');
  }

  // Actions
  async withdrawProposal(proposal: Proposal): Promise<void> {
    if (!confirm('Are you sure you want to withdraw this proposal?')) return;

    const hubId = this.hubId();
    if (!hubId) return;

    try {
      // TODO: Implement withdraw API
      console.log('Withdraw proposal:', proposal._id);
      // Reload proposals after withdrawal
      this.loadProposals();
    } catch (error) {
      console.error('Error withdrawing proposal:', error);
    }
  }
}
