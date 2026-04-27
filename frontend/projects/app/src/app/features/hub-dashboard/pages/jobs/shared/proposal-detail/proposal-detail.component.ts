import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthStateService } from '../../../../../../core/services/auth-state.service';
import {
  HubJobsApiService,
  Proposal,
} from '../../../../services/hub-jobs-api.service';
import { environment } from '../../../../../../../environments/environment';

/**
 * Shared Proposal Detail Component
 *
 * Works for both Hub (client) and Expert views:
 * - Hub route: /hub/jobs/:jobId/proposals/:proposalId
 * - Expert route: /hub/proposals/:proposalId
 *
 * The component detects the context based on:
 * 1. Route params (jobId present = Hub view)
 * 2. Proposal data (clientHubId vs expertHubId matching current hub)
 */
@Component({
  selector: 'app-proposal-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proposal-detail.component.html',
})
export class ProposalDetailComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authState = inject(AuthStateService);
  private readonly jobsApi = inject(HubJobsApiService);

  // Loading state
  readonly loading = signal(false);

  // Data
  readonly proposal = signal<Proposal | null>(null);

  // Route params
  readonly hubId = computed(() => this.authState.selectedHub()?.id || '');
  readonly jobId = computed(() => this.route.snapshot.paramMap.get('jobId') || '');
  readonly proposalId = computed(() => this.route.snapshot.paramMap.get('proposalId') || '');

  // Determine view context: 'hub' (client) or 'expert'
  readonly viewContext = computed(() => {
    // If jobId is in route, it's hub view
    if (this.jobId()) return 'hub';

    // Otherwise check proposal data
    const proposal = this.proposal();
    const currentHubId = this.hubId();

    if (!proposal || !currentHubId) return 'expert'; // Default to expert

    // If current hub is the client hub, it's hub view
    const clientHubId = typeof proposal.clientHubId === 'object'
      ? proposal.clientHubId._id
      : proposal.clientHubId;

    if (clientHubId === currentHubId) return 'hub';

    return 'expert';
  });

  readonly isHubView = computed(() => this.viewContext() === 'hub');
  readonly isExpertView = computed(() => this.viewContext() === 'expert');

  // Computed from proposal
  readonly job = computed(() => this.proposal()?.jobId || null);
  readonly expert = computed(() => this.proposal()?.asssignedExpertId || null);
  readonly milestones = computed(() => this.proposal()?.milestones || []);
  readonly clientHub = computed(() => this.proposal()?.clientHubId || null);
  readonly expertHub = computed(() => this.proposal()?.expertHubId || null);

  // Action visibility
  readonly canTakeAction = computed(() => this.proposal()?.status === 'pending');
  readonly hasOffer = computed(() => !!this.proposal()?.contractId);

  ngOnInit(): void {
    this.loadProposal();
  }

  async loadProposal(): Promise<void> {
    const hubId = this.hubId();
    const proposalId = this.proposalId();
    if (!hubId || !proposalId) return;

    this.loading.set(true);
    try {
      const proposal = await this.jobsApi.getProposal(hubId, proposalId);
      this.proposal.set(proposal);
    } catch (error) {
      console.error('Error loading proposal:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // Navigation
  goBack(): void {
    if (this.isHubView()) {
      const jobId = this.jobId() || this.job()?._id;
      if (jobId) {
        this.router.navigate(['/hub/jobs', jobId, 'proposals']);
      } else {
        this.router.navigate(['/hub/jobs/posts']);
      }
    } else {
      this.router.navigate(['/hub/jobs/applications'], { queryParams: { tab: 'proposed' } });
    }
  }

  viewJobPost(): void {
    const jobId = this.job()?._id || this.jobId();
    if (jobId) {
      window.open(`${environment.webUrl}/job/${jobId}`, '_blank');
    }
  }

  viewExpertProfile(): void {
    const expertId = this.expert()?._id;
    if (expertId) {
      window.open(`${environment.webUrl}/expert/${expertId}`, '_blank');
    }
  }

  viewContract(): void {
    const contractId = this.proposal()?.contractId;
    if (contractId) {
      this.router.navigate(['/hub/jobs/contracts', contractId]);
    }
  }

  viewOffer(): void {
    const contractId = this.proposal()?.contractId;
    if (contractId) {
      this.router.navigate(['/hub/jobs/offers/view', contractId]);
    }
  }

  // Hub Actions
  sendOffer(): void {
    const proposalId = this.proposalId();
    const contractId = this.proposal()?.contractId;

    if (contractId) {
      this.router.navigate(['/hub/jobs/offers/edit', proposalId, contractId]);
    } else {
      this.router.navigate(['/hub/jobs/offers/send', proposalId]);
    }
  }

  async messageExpert(): Promise<void> {
    // TODO: Implement chat room creation/navigation
    console.log('Message expert:', this.expert());
  }

  async rejectProposal(): Promise<void> {
    if (!confirm('Are you sure you want to reject this proposal?')) return;

    const hubId = this.hubId();
    const proposalId = this.proposalId();
    if (!hubId || !proposalId) return;

    try {
      await this.jobsApi.rejectProposal(hubId, proposalId);
      await this.loadProposal();
    } catch (error) {
      console.error('Error rejecting proposal:', error);
    }
  }

  // Expert Actions
  async withdrawProposal(): Promise<void> {
    if (!confirm('Are you sure you want to withdraw this proposal?')) return;

    const hubId = this.hubId();
    const proposalId = this.proposalId();
    if (!hubId || !proposalId) return;

    try {
      // TODO: Implement withdraw API
      console.log('Withdraw proposal:', proposalId);
      await this.loadProposal();
    } catch (error) {
      console.error('Error withdrawing proposal:', error);
    }
  }

  // Helpers
  getExpertImage(): string {
    return this.expert()?.profileImage || '/assets/images/default-avatar.png';
  }

  getExpertName(): string {
    return this.expert()?.name || 'Unknown Expert';
  }

  getExpertHubName(): string {
    const hub = this.expertHub();
    if (hub && typeof hub === 'object' && 'name' in hub) {
      return hub.name || '';
    }
    return '';
  }

  getClientHubName(): string {
    const hub = this.clientHub();
    if (hub && typeof hub === 'object' && 'name' in hub) {
      return hub.name || '';
    }
    return '';
  }

  formatPrice(): string {
    const proposal = this.proposal();
    if (!proposal) return '-';
    if (proposal.priceType === 'hourly' && proposal.hourlyProposedPrice) {
      return `${proposal.selectedCurrency} ${proposal.hourlyProposedPrice.toLocaleString()}/hr`;
    }
    if (proposal.priceType === 'fixed' && proposal.proposedPrice) {
      return `${proposal.selectedCurrency} ${proposal.proposedPrice.toLocaleString()}`;
    }
    return '-';
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getProposalStatus(status: string | undefined): { text: string; color: string } {
    switch (status) {
      case 'pending':
        return { text: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' };
      case 'accepted':
        return { text: 'Accepted', color: 'bg-green-100 text-green-800' };
      case 'rejected':
        return { text: 'Rejected', color: 'bg-red-100 text-red-800' };
      case 'withdrawn':
        return { text: 'Withdrawn', color: 'bg-neutral-100 text-neutral-600' };
      default:
        return { text: status || 'Unknown', color: 'bg-neutral-100 text-neutral-800' };
    }
  }

  getMilestoneTotal(): number {
    return this.milestones().reduce((sum, m) => sum + (m.amount || 0), 0);
  }

  getFileName(fileUrl: string): string {
    try {
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      return decodeURIComponent(pathParts[pathParts.length - 1] || 'Attachment');
    } catch {
      return fileUrl.split('/').pop() || 'Attachment';
    }
  }
}
