import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, TitleCasePipe, DecimalPipe } from '@angular/common';
import { AvatarComponent, ImageComponent } from '../../../shared/ui';
import { JobsService, type PricingType, type ProposalStatus } from '../jobs.service';

type MilestoneStatus = 'pending' | 'active' | 'funded' | 'work_submitted' | 'released' | 'approved' | 'completed' | 'cancelled';

interface Proposal {
  id: string;
  jobId: string;
  jobTitle: string;
  expertId: string;
  expertName: string;
  expertEmail: string;
  expertAvatar: string;
  proposalDetails: string;
  priceType: PricingType;
  proposedPrice?: number;
  hourlyProposedPrice?: number;
  workingHours?: number;
  selectedCurrency: string;
  status: ProposalStatus;
  files: string[];
  hubId: string;
  hubName: string;
  hubLogo?: string;
  createdDate: Date;
  updatedDate: Date;
}

interface Milestone {
  id: string;
  taskName: string;
  taskDescription: string;
  amount: number;
  dueDate: Date;
  currency: string;
  status: MilestoneStatus;
}

@Component({
  selector: 'app-proposal-detail',
  imports: [RouterLink, DatePipe, TitleCasePipe, DecimalPipe, AvatarComponent, ImageComponent],
  templateUrl: './proposal-detail.component.html',
  styleUrl: './proposal-detail.component.scss'
})
export class ProposalDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobsService = inject(JobsService);

  isLoading = signal(true);
  proposal = signal<Proposal | null>(null);
  milestones = signal<Milestone[]>([]);

  totalMilestoneAmount = computed(() => this.milestones().reduce((sum, m) => sum + m.amount, 0));

  ngOnInit() {
    const proposalId = this.route.snapshot.paramMap.get('id');
    if (proposalId) this.loadProposalDetails(proposalId);
  }

  getStatusClasses(status: ProposalStatus): string {
    const classes: Record<ProposalStatus, string> = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'accepted': 'bg-green-100 text-green-700',
      'rejected': 'bg-red-100 text-red-700',
      'withdrawn': 'bg-gray-100 text-gray-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getMilestoneStatusClasses(status: MilestoneStatus): string {
    const classes: Record<MilestoneStatus, string> = {
      'pending': 'bg-gray-100 text-gray-700',
      'active': 'bg-blue-100 text-blue-700',
      'funded': 'bg-purple-100 text-purple-700',
      'work_submitted': 'bg-yellow-100 text-yellow-700',
      'released': 'bg-green-100 text-green-700',
      'approved': 'bg-green-100 text-green-700',
      'completed': 'bg-green-100 text-green-700',
      'cancelled': 'bg-red-100 text-red-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  loadProposalDetails(proposalId: string) {
    this.isLoading.set(true);

    this.jobsService.getProposalById(proposalId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const p = response.data;
          this.proposal.set({
            id: p._id,
            jobId: p.jobId || p.job?._id || '',
            jobTitle: p.jobTitle || p.job?.jobTitle || 'Unknown Job',
            expertId: p.expert?._id || '',
            expertName: p.expert?.name || 'Unknown Expert',
            expertEmail: p.expert?.email || '',
            expertAvatar: p.expert?.profilePhoto || '',
            proposalDetails: p.proposalDetails,
            priceType: p.priceType,
            proposedPrice: p.proposedPrice,
            hourlyProposedPrice: p.hourlyProposedPrice,
            workingHours: p.workingHours,
            selectedCurrency: p.selectedCurrency,
            status: p.status,
            files: p.files || [],
            hubId: p.hub?._id || p.job?.hubId || '',
            hubName: p.hub?.name || '',
            hubLogo: p.hub?.logo,
            createdDate: this.parseDate(p.createdAt),
            updatedDate: this.parseDate(p.updatedAt),
          });

          // Clear milestones for now (proposal milestones would need separate API)
          this.milestones.set([]);
        } else {
          this.proposal.set(null);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading proposal details:', err);
        this.proposal.set(null);
        this.isLoading.set(false);
      },
    });
  }

  private parseDate(dateValue: string | Date | undefined): Date {
    if (!dateValue) return new Date();
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  goBack() { this.router.navigate(['/dashboard/jobs/proposals']); }
  getFileName(url: string): string { return url.split('/').pop() || 'File'; }
}
