import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent, DialogService, ToastService } from '@mereka/ui';
import { AuthStateService } from '../../../../../../core/services/auth-state.service';
import { HubJobsApiService, Proposal, SendOfferInput, OfferMilestone } from '../../../../services/hub-jobs-api.service';
import {
  PaymentMethodDialogComponent,
  PaymentMethodDialogData,
  PaymentMethodDialogResult,
} from './components/payment-method-dialog';
import { firstValueFrom, Subscription } from 'rxjs';

@Component({
  selector: 'app-hub-job-send-offer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './send-offer.component.html',
})
export class HubJobSendOfferComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly jobsApi = inject(HubJobsApiService);
  private readonly authState = inject(AuthStateService);
  private readonly dialogService = inject(DialogService);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly proposalData = signal<Proposal | null>(null);
  readonly proposalId = signal<string | null>(null);

  readonly offerForm: FormGroup;

  // Computed: Current hub ID from auth state
  readonly hubId = computed(() => this.authState.selectedHub()?.id || '');

  // Total milestone amount (updated via subscription to form changes)
  readonly totalMilestoneAmount = signal(0);

  // Subscription tracking for cleanup
  private readonly subscriptions: Subscription[] = [];

  constructor() {
    this.offerForm = this.fb.group({
      contractTitle: ['', [Validators.required, Validators.maxLength(70)]],
      contractDescription: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(5000)]],
      contractUploads: [[]],
      proposedPrice: [null],
      hourlyProposedPrice: [null],
      weeklyLimit: [40, [Validators.min(1), Validators.max(168)]],
      startDate: ['', Validators.required],
      priceType: ['', Validators.required],
      hasMilestones: [false],
      selectedCurrency: ['USD', Validators.required],
      milestones: this.fb.array([]),
      offerMessage: [''],
    });

    // Watch priceType to adjust validation
    this.offerForm.get('priceType')?.valueChanges.subscribe((priceType) => {
      const proposedPrice = this.offerForm.get('proposedPrice');
      const hourlyProposedPrice = this.offerForm.get('hourlyProposedPrice');
      const weeklyLimit = this.offerForm.get('weeklyLimit');
      const hasMilestones = this.offerForm.get('hasMilestones');

      if (priceType === 'fixed') {
        proposedPrice?.setValidators([Validators.required, Validators.min(1)]);
        hourlyProposedPrice?.clearValidators();
        weeklyLimit?.clearValidators();
        // Auto-enable milestones for fixed price contracts
        hasMilestones?.setValue(true);
        // Add a default milestone if none exist
        if (this.milestonesArray.length === 0) {
          this.addMilestone();
        }
      } else if (priceType === 'hourly') {
        hourlyProposedPrice?.setValidators([Validators.required, Validators.min(1)]);
        weeklyLimit?.setValidators([Validators.required, Validators.min(1), Validators.max(168)]);
        proposedPrice?.clearValidators();
        // Disable milestones for hourly contracts
        hasMilestones?.setValue(false);
      }

      proposedPrice?.updateValueAndValidity();
      hourlyProposedPrice?.updateValueAndValidity();
      weeklyLimit?.updateValueAndValidity();
    });

    // Subscribe to milestones form array changes to update total
    this.subscriptions.push(
      this.offerForm.get('milestones')!.valueChanges.subscribe((milestones: { amount: number }[]) => {
        const total = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
        this.totalMilestoneAmount.set(total);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get milestonesArray(): FormArray {
    return this.offerForm.get('milestones') as FormArray;
  }

  /** Recalculate milestone total from current form values */
  private recalculateMilestoneTotal(): void {
    const milestones = this.milestonesArray.value as { amount: number }[];
    const total = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    this.totalMilestoneAmount.set(total);
  }

  ngOnInit(): void {
    const proposalId = this.route.snapshot.paramMap.get('proposalId');

    if (proposalId) {
      this.proposalId.set(proposalId);
      this.loadProposal(proposalId);
    } else {
      this.error.set('No proposal ID provided');
    }
  }

  async loadProposal(proposalId: string): Promise<void> {
    const hubId = this.hubId();
    if (!hubId) {
      this.error.set('No hub selected');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const proposal = await this.jobsApi.getProposal(hubId, proposalId);
      this.proposalData.set(proposal);

      // Pre-populate milestones BEFORE setting priceType to avoid race condition
      // (priceType valueChanges auto-adds empty milestone when length === 0)
      if (proposal.priceType === 'fixed' && proposal.hasMilestones && proposal.milestones && proposal.milestones.length > 0) {
        for (const m of proposal.milestones) {
          const milestone = this.fb.group({
            taskName: [m.taskName, [Validators.required, Validators.maxLength(150)]],
            taskDescription: [m.taskDescription || '', Validators.maxLength(200)],
            amount: [m.amount, [Validators.required, Validators.min(1)]],
            dueDate: [m.dueDate ? new Date(m.dueDate).toISOString().split('T')[0] : '', Validators.required],
          });
          this.milestonesArray.push(milestone);
        }
        this.offerForm.get('hasMilestones')?.setValue(true);
        // Recalculate total after loading milestones
        this.recalculateMilestoneTotal();
      }

      // Pre-fill form with proposal data
      // Note: priceType is set AFTER milestones are populated to avoid auto-adding empty milestone
      this.offerForm.patchValue({
        contractTitle: proposal.jobId?.jobTitle || '',
        contractDescription: proposal.proposalDetails || '',
        priceType: proposal.priceType,
        proposedPrice: proposal.proposedPrice,
        hourlyProposedPrice: proposal.hourlyProposedPrice,
        selectedCurrency: proposal.selectedCurrency || 'USD',
        startDate: new Date().toISOString().split('T')[0], // Default to today
      });

      // For fixed price without milestones, add a default empty one
      if (proposal.priceType === 'fixed' && this.milestonesArray.length === 0) {
        this.offerForm.get('hasMilestones')?.setValue(true);
        this.addMilestone();
      }
    } catch (error) {
      console.error('Error loading proposal:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to load proposal');
    } finally {
      this.isLoading.set(false);
    }
  }

  addMilestone(): void {
    const milestone = this.fb.group({
      taskName: ['', [Validators.required, Validators.maxLength(150)]],
      taskDescription: ['', Validators.maxLength(200)],
      amount: [null, [Validators.required, Validators.min(1)]],
      dueDate: ['', Validators.required],
    });
    this.milestonesArray.push(milestone);
  }

  removeMilestone(index: number): void {
    this.milestonesArray.removeAt(index);
  }

  async onSubmit(): Promise<void> {
    if (!this.offerForm.valid) {
      this.offerForm.markAllAsTouched();
      return;
    }

    const proposal = this.proposalData();
    const hubId = this.hubId();

    if (!proposal || !hubId) {
      this.error.set('Missing proposal or hub data');
      return;
    }

    // Validate milestone amounts match proposedPrice for fixed price with milestones
    const formValue = this.offerForm.value;
    if (formValue.priceType === 'fixed' && formValue.hasMilestones && formValue.milestones?.length > 0) {
      const total = this.totalMilestoneAmount();
      if (Math.abs(total - formValue.proposedPrice) > 0.01) {
        this.error.set(`Milestone amounts ($${total}) must equal proposed price ($${formValue.proposedPrice})`);
        return;
      }
    }

    // Payment method is only required for fixed price contracts with milestones
    // For hourly contracts, payment is handled differently (weekly invoicing)
    let paymentResult: PaymentMethodDialogResult | null | undefined = null;

    if (formValue.priceType === 'fixed' && formValue.hasMilestones && formValue.milestones?.length > 0) {
      const firstMilestoneAmount = formValue.milestones[0].amount;

      // Open payment method selection dialog
      const dialogData: PaymentMethodDialogData = {
        currency: formValue.selectedCurrency,
        amount: formValue.proposedPrice,
        firstMilestoneAmount,
      };

      const dialogRef = this.dialogService.open<
        PaymentMethodDialogComponent,
        PaymentMethodDialogData,
        PaymentMethodDialogResult | null
      >(PaymentMethodDialogComponent, {
        data: dialogData,
        width: 'md',
        closeOnBackdrop: false,
      });

      paymentResult = await firstValueFrom(dialogRef.afterClosed());

      if (!paymentResult) {
        // User cancelled
        return;
      }
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      // Build milestones array if has milestones
      const milestones: OfferMilestone[] = formValue.hasMilestones && formValue.milestones?.length > 0
        ? formValue.milestones.map((m: { taskName: string; taskDescription?: string; amount: number; dueDate: string }, index: number) => ({
            taskName: m.taskName,
            taskDescription: m.taskDescription || '',
            amount: m.amount,
            dueDate: new Date(m.dueDate).toISOString(),
            order: index,
          }))
        : undefined;

      const input: SendOfferInput = {
        jobId: proposal.jobId._id,
        jobProposalId: proposal._id,
        clientHubId: hubId,
        expertHubId: proposal.expertHubId?._id,
        contractTitle: formValue.contractTitle,
        contractDescription: formValue.contractDescription,
        contractUploads: formValue.contractUploads || [],
        priceType: formValue.priceType,
        proposedPrice: formValue.priceType === 'fixed' ? formValue.proposedPrice : undefined,
        hasMilestones: formValue.priceType === 'fixed' && formValue.hasMilestones,
        milestones,
        hourlyProposedPrice: formValue.priceType === 'hourly' ? formValue.hourlyProposedPrice : undefined,
        weeklyLimit: formValue.priceType === 'hourly' ? formValue.weeklyLimit : undefined,
        startDate: new Date(formValue.startDate).toISOString(),
        selectedCurrency: formValue.selectedCurrency,
        asssignedExpertId: proposal.asssignedExpertId._id,
        offerMessage: formValue.offerMessage || undefined,
        // Payment method info (only for fixed price with milestones)
        paymentMethodId: paymentResult?.paymentMethodId,
        stripeCustomerId: paymentResult?.stripeCustomerId,
      };

      const result = await this.jobsApi.sendOffer(input);

      this.toastService.success('Offer sent successfully');

      // Navigate to contract details on success
      this.router.navigate(['/hub/jobs/contracts', result.contract._id]);
    } catch (error) {
      console.error('Error sending offer:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to send offer');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onCancel(): void {
    this.router.navigate(['/hub/jobs/applications']);
  }
}
