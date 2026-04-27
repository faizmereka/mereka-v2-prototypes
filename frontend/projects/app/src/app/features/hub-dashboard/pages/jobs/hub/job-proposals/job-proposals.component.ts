import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthStateService } from '../../../../../../core/services/auth-state.service';
import {
  HubJobsApiService,
  Proposal,
  JobPost,
} from '../../../../services/hub-jobs-api.service';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-hub-job-proposals',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './job-proposals.component.html',
})
export class HubJobProposalsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authState = inject(AuthStateService);
  private readonly jobsApi = inject(HubJobsApiService);

  // Loading states
  readonly loading = signal(false);
  readonly jobLoading = signal(false);

  // Pagination
  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(0);

  // Data
  readonly proposals = signal<Proposal[]>([]);
  readonly job = signal<JobPost | null>(null);

  // UI State
  readonly showActionsDropdown = signal<string | null>(null);

  // Computed
  readonly hubId = computed(() => this.authState.selectedHub()?.id || '');
  readonly jobId = computed(() => this.route.snapshot.paramMap.get('jobId') || '');

  // Table headers
  readonly tableHeaders = ['Expert', 'Proposed Price', 'Cover Letter', 'Submitted', 'Status', ''];

  ngOnInit(): void {
    this.loadJob();
    this.loadProposals();
  }

  async loadJob(): Promise<void> {
    const jobId = this.jobId();
    if (!jobId) return;

    this.jobLoading.set(true);
    try {
      const job = await this.jobsApi.getJob(jobId);
      this.job.set(job);
    } catch (error) {
      console.error('Error loading job:', error);
    } finally {
      this.jobLoading.set(false);
    }
  }

  async loadProposals(): Promise<void> {
    const hubId = this.hubId();
    const jobId = this.jobId();
    if (!hubId || !jobId) return;

    this.loading.set(true);
    try {
      const result = await this.jobsApi.getProposals({
        hubId,
        jobId,
        page: this.page(),
        limit: this.limit(),
      });
      this.proposals.set(result.items);
      this.total.set(result.pagination.total);
      this.totalPages.set(result.pagination.totalPages);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/hub/jobs/posts'], { queryParams: { tab: 'proposals' } });
  }

  viewJobPost(): void {
    const jobId = this.jobId();
    if (jobId) {
      window.open(`${environment.webUrl}/job/${jobId}`, '_blank');
    }
  }

  // Proposal Actions
  viewProposalDetail(proposal: Proposal): void {
    // Navigate to proposal review page
    const jobId = this.jobId();
    this.router.navigate(['/hub/jobs', jobId, 'proposals', proposal._id]);
  }

  sendOffer(proposal: Proposal): void {
    // Navigate directly to send offer page
    this.router.navigate(['/hub/jobs/offers/send', proposal._id]);
  }

  async rejectProposal(proposal: Proposal): Promise<void> {
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

  // Dropdown
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

  // Helpers
  getExpertName(proposal: Proposal): string {
    return proposal.asssignedExpertId?.name || '-';
  }

  getExpertEmail(proposal: Proposal): string {
    return proposal.asssignedExpertId?.email || '-';
  }

  getExpertImage(proposal: Proposal): string | undefined {
    return proposal.asssignedExpertId?.profileImage;
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

  getCoverLetterPreview(proposal: Proposal): string {
    const coverLetter = proposal.proposalDetails || '';
    if (coverLetter.length > 100) {
      return coverLetter.substring(0, 100) + '...';
    }
    return coverLetter || '-';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
  handlePageChange(newPage: number): void {
    this.page.set(newPage);
    this.loadProposals();
  }

  // Helper for template
  readonly Math = Math;
}
