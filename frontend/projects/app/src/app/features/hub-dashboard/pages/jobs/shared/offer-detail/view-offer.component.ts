import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@mereka/ui';
import { AuthStateService } from '../../../../../../core/services/auth-state.service';
import { HubJobsApiService, Contract } from '../../../../services/hub-jobs-api.service';

// Extended contract type for view-offer page
type ContractWithMilestones = Contract & {
  contractDescription?: string;
  hasMilestones?: boolean;
};

@Component({
  selector: 'app-hub-job-view-offer',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './view-offer.component.html',
})
export class HubJobViewOfferComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobsApi = inject(HubJobsApiService);
  private readonly authState = inject(AuthStateService);

  readonly isLoading = signal(false);
  readonly isAccepting = signal(false);
  readonly isDeclining = signal(false);
  readonly error = signal<string | null>(null);
  readonly showDeclineModal = signal(false);
  readonly showStripeSetupModal = signal(false);
  readonly stripeSetupMessage = signal<string>('');

  readonly contract = signal<ContractWithMilestones | null>(null);
  declineReasonText = ''; // Regular property for ngModel binding

  // Computed: Current user ID
  readonly currentUserId = computed(() => this.authState.user()?.id || '');

  // Computed: Check if current user is the assigned expert
  readonly isExpert = computed(() => {
    const c = this.contract();
    const userId = this.currentUserId();
    return c && userId && c.asssignedExpertId === userId;
  });

  // Computed: Check if offer is still pending
  readonly isPending = computed(() => {
    const c = this.contract();
    return c?.status === 'pending';
  });

  ngOnInit(): void {
    const contractId = this.route.snapshot.paramMap.get('contractId');
    if (contractId) {
      this.loadContract(contractId);
    } else {
      this.error.set('No contract ID provided');
    }
  }

  async loadContract(contractId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const contract = await this.jobsApi.getContract(contractId);
      this.contract.set(contract as ContractWithMilestones);
    } catch (error) {
      console.error('Error loading contract:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to load contract');
    } finally {
      this.isLoading.set(false);
    }
  }

  async acceptOffer(): Promise<void> {
    const c = this.contract();
    if (!c) return;

    this.isAccepting.set(true);
    this.error.set(null);

    try {
      await this.jobsApi.acceptOffer(c._id);
      // Navigate to contract details on success
      this.router.navigate(['/hub/jobs/contracts', c._id]);
    } catch (error) {
      console.error('Error accepting offer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept offer';

      // Check if it's a Stripe/payout setup error
      if (
        errorMessage.includes('payout') ||
        errorMessage.includes('Stripe') ||
        errorMessage.includes('Settings > Payments')
      ) {
        this.stripeSetupMessage.set(errorMessage);
        this.showStripeSetupModal.set(true);
      } else {
        this.error.set(errorMessage);
      }
    } finally {
      this.isAccepting.set(false);
    }
  }

  closeStripeSetupModal(): void {
    this.showStripeSetupModal.set(false);
    this.stripeSetupMessage.set('');
  }

  goToPaymentSettings(): void {
    this.closeStripeSetupModal();
    // Navigate to Transactions page with expert view and auto-start setup
    this.router.navigate(['/hub/settings/transactions'], { queryParams: { view: 'expert', setup: 'true' } });
  }

  openDeclineModal(): void {
    this.showDeclineModal.set(true);
    this.declineReasonText = '';
  }

  closeDeclineModal(): void {
    this.showDeclineModal.set(false);
    this.declineReasonText = '';
  }

  async declineOffer(): Promise<void> {
    const c = this.contract();
    const reason = this.declineReasonText;

    if (!c || !reason || reason.length < 10) {
      this.error.set('Please provide a reason for declining (at least 10 characters)');
      return;
    }

    this.isDeclining.set(true);
    this.error.set(null);

    try {
      await this.jobsApi.declineOffer(c._id, { declineReason: reason });
      this.closeDeclineModal();
      // Navigate back to applications list
      this.router.navigate(['/hub/jobs/applications']);
    } catch (error) {
      console.error('Error declining offer:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to decline offer');
    } finally {
      this.isDeclining.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/hub/jobs/applications']);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
