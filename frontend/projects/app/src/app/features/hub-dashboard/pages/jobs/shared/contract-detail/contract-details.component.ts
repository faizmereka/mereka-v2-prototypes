import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent, ToastService } from '@mereka/ui';
import { AuthStateService } from '../../../../../../core/services/auth-state.service';
import {
  HubJobsApiService,
  Contract,
  Milestone,
  TimelogEntry,
  WeeklySummary,
  CreateTimelogInput,
  CreateMilestoneInput,
} from '../../../../services/hub-jobs-api.service';
import {
  ContractHeaderComponent,
  ContractTab,
  FinancialOverviewComponent,
  MilestoneTimelineComponent,
  FundMilestoneDialogComponent,
  ReleasePaymentDialogComponent,
  TransactionHistoryComponent,
  Transaction,
  ContractReviewComponent,
  AddPaymentMethodDialogComponent,
} from './components';

// Extended contract type that includes contract description and other details
type ContractWithDetails = Contract & {
  contractDescription?: string;
  hasMilestones?: boolean;
  acceptedAt?: string;
  acceptMessage?: string;
};

@Component({
  selector: 'app-hub-job-contract-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IconComponent,
    ContractHeaderComponent,
    FinancialOverviewComponent,
    MilestoneTimelineComponent,
    FundMilestoneDialogComponent,
    ReleasePaymentDialogComponent,
    TransactionHistoryComponent,
    ContractReviewComponent,
    AddPaymentMethodDialogComponent,
  ],
  templateUrl: './contract-details.component.html',
})
export class HubJobContractDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobsApi = inject(HubJobsApiService);
  private readonly authState = inject(AuthStateService);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly contract = signal<ContractWithDetails | null>(null);
  readonly milestones = signal<Milestone[]>([]);
  readonly activeTab = signal<ContractTab>('worklog');

  // Milestone action states
  readonly isSubmitting = signal(false);
  readonly isApproving = signal(false);
  readonly isFunding = signal(false);
  readonly isReleasing = signal(false);
  readonly showSubmitWorkModal = signal(false);
  readonly showApproveModal = signal(false);
  readonly showFundMilestoneDialog = signal(false);
  readonly showReleasePaymentDialog = signal(false);
  readonly selectedMilestone = signal<Milestone | null>(null);

  // Add milestone dialog state
  readonly showAddMilestoneDialog = signal(false);
  readonly isAddingMilestone = signal(false);
  addMilestoneForm = {
    taskName: '',
    taskDescription: '',
    amount: 0,
    dueDate: '',
  };

  // Contract payment state (multi-region Stripe)
  readonly contractPaymentMethods = signal<Array<{
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
  }>>([]);
  readonly contractCustomerId = signal<string | null>(null);
  readonly contractStripeRegion = signal<'malaysia' | 'atlas'>('atlas');
  readonly contractStripePublishableKey = signal<string | null>(null);
  readonly isLoadingPaymentMethods = signal(false);

  // Add payment method dialog state
  readonly showAddPaymentMethodDialog = signal(false);
  readonly addPaymentClientSecret = signal<string | null>(null);
  readonly isCreatingPaymentSetup = signal(false);

  // Form data
  submitWorkDescription = '';
  approvalFeedback = '';

  // Transaction history
  readonly transactions = signal<Transaction[]>([]);
  readonly isLoadingTransactions = signal(false);

  // Timelog State (Hourly Contracts)
  readonly timelogs = signal<TimelogEntry[]>([]);
  readonly weeklySummary = signal<WeeklySummary | null>(null);
  readonly isLoadingTimelogs = signal(false);
  readonly showLogTimeModal = signal(false);
  readonly showTimelogApproveModal = signal(false);
  readonly showTimelogRejectModal = signal(false);
  readonly selectedTimelog = signal<TimelogEntry | null>(null);
  readonly isSavingTimelog = signal(false);
  readonly isApprovingTimelog = signal(false);

  // Timelog form data
  timelogDate = '';
  timelogStartTime = '';
  timelogEndTime = '';
  timelogBreakDuration = 0;
  timelogDescription = '';
  timelogTasks: string[] = [];
  timelogRejectReason = '';

  // Complete contract state
  readonly showCompleteContractDialog = signal(false);
  readonly isCompleting = signal(false);
  completeContractReason = '';

  // Computed: Current user ID
  readonly currentUserId = computed(() => this.authState.user()?.id || '');

  // Computed: Current hub ID
  readonly currentHubId = computed(() => this.authState.selectedHub()?.id || '');

  // Computed: Check if current hub is the expert hub
  readonly isExpert = computed((): boolean => {
    const c = this.contract();
    const hubId = this.currentHubId();
    // Check if current hub is the expert hub
    return !!(c && hubId && c.expertHubId === hubId);
  });

  // Computed: Check if current hub is the client hub
  readonly isClient = computed((): boolean => {
    const c = this.contract();
    const hubId = this.currentHubId();
    // Check if current hub is the client hub
    return !!(c && hubId && c.clientHubId === hubId);
  });

  // Computed: Pending milestones (for fund dialog)
  readonly pendingMilestones = computed(() => {
    return this.milestones().filter(m => m.status === 'pending');
  });

  // Computed: Submitted milestones (for release dialog)
  readonly submittedMilestones = computed(() => {
    return this.milestones().filter(m =>
      m.status === 'work_submitted' || m.status === 'submitted'
    );
  });

  // Computed: Has any released/paid milestone (for review eligibility)
  readonly hasReleasedMilestone = computed(() => {
    return this.milestones().some(m =>
      ['released', 'approved', 'paid'].includes(m.status)
    );
  });

  // Computed: Hours this week
  readonly hoursThisWeek = computed(() => {
    return this.weeklySummary()?.totalHours || 0;
  });

  // Computed: Hours last week (placeholder - would need API)
  readonly hoursLastWeek = computed(() => {
    return 0; // TODO: Fetch from API
  });

  // Computed: Weekly charge
  readonly weeklyCharge = computed(() => {
    const summary = this.weeklySummary();
    const rate = this.contract()?.hourlyProposedPrice || 0;
    return (summary?.totalHours || 0) * rate;
  });

  // Computed: Total hours worked
  readonly totalHoursWorked = computed(() => {
    return this.timelogs()
      .filter(t => t.status === 'approved' || t.status === 'paid')
      .reduce((sum, t) => sum + (t.hoursWorked || 0), 0);
  });

  ngOnInit(): void {
    const contractId = this.route.snapshot.paramMap.get('contractId') ||
                       this.route.snapshot.paramMap.get('id');
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
      this.contract.set(contract as ContractWithDetails);

      // Load milestones for fixed price contracts
      if (contract.priceType === 'fixed') {
        await this.loadMilestones(contractId);
      }

      // Load timelogs for hourly contracts
      if (contract.priceType === 'hourly') {
        await this.loadTimelogs(contractId);
      }

      // Load transactions
      // await this.loadTransactions(contractId);
    } catch (error) {
      console.error('Error loading contract:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to load contract');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadMilestones(contractId: string): Promise<void> {
    try {
      const result = await this.jobsApi.getMilestones({ contractId, limit: 50 });
      // Sort milestones by order or dueDate
      const sorted = result.items.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      this.milestones.set(sorted);
    } catch (error) {
      console.error('Error loading milestones:', error);
    }
  }

  // Tab navigation
  onTabChange(tab: ContractTab): void {
    this.activeTab.set(tab);
  }

  goBack(): void {
    this.router.navigate(['/hub/jobs/applications']);
  }

  onMessage(): void {
    // TODO: Implement messaging
    console.log('Message clicked');
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getJobPostUrl(): string {
    const jobId = this.contract()?.jobId;
    if (!jobId) return '#';
    // In production, this would be mereka.io/job/:jobId
    // In development, use localhost:4200
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:4200'
      : 'https://mereka.io';
    return `${baseUrl}/job/${jobId}`;
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'paused':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-purple-100 text-purple-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'funded':
        return 'bg-blue-100 text-blue-700';
      case 'submitted':
      case 'work_submitted':
        return 'bg-orange-100 text-orange-700';
      case 'approved':
      case 'released':
      case 'paid':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  }

  // ============================================================
  // Milestone Actions
  // ============================================================

  // Computed: Default payment method for this contract's region
  readonly defaultPaymentMethod = computed(() => {
    const methods = this.contractPaymentMethods();
    return methods.find(m => m.isDefault) || methods[0] || null;
  });

  // Load payment methods for contract
  async loadContractPaymentMethods(): Promise<void> {
    const contractId = this.contract()?._id;
    const hubId = this.currentHubId();

    if (!contractId || !hubId) return;

    this.isLoadingPaymentMethods.set(true);
    try {
      const result = await this.jobsApi.getContractPaymentMethods(contractId, hubId);
      this.contractPaymentMethods.set(result.paymentMethods);
      this.contractCustomerId.set(result.customerId);
      this.contractStripeRegion.set(result.region);
      this.contractStripePublishableKey.set(result.stripePublishableKey);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      // Don't show error - just means no payment methods exist yet
    } finally {
      this.isLoadingPaymentMethods.set(false);
    }
  }

  // Open add payment method dialog
  async openAddPaymentMethodDialog(): Promise<void> {
    const contractId = this.contract()?._id;
    const hubId = this.currentHubId();

    if (!contractId || !hubId) return;

    this.isCreatingPaymentSetup.set(true);
    try {
      const result = await this.jobsApi.createContractPaymentSetup(contractId, hubId);
      this.addPaymentClientSecret.set(result.clientSecret);
      this.contractStripePublishableKey.set(result.stripePublishableKey);
      this.contractStripeRegion.set(result.region);
      this.showAddPaymentMethodDialog.set(true);
    } catch (error) {
      console.error('Error creating payment setup:', error);
      this.toastService.error('Failed to open payment form. Please try again.');
    } finally {
      this.isCreatingPaymentSetup.set(false);
    }
  }

  closeAddPaymentMethodDialog(): void {
    this.showAddPaymentMethodDialog.set(false);
    this.addPaymentClientSecret.set(null);
  }

  async onPaymentMethodAdded(): Promise<void> {
    this.toastService.success('Payment method added successfully');
    // Reload payment methods
    await this.loadContractPaymentMethods();
    this.closeAddPaymentMethodDialog();
  }

  // Fund milestone
  async openFundMilestoneDialog(milestone: Milestone): Promise<void> {
    this.selectedMilestone.set(milestone);
    // Load payment methods for regional Stripe
    await this.loadContractPaymentMethods();
    this.showFundMilestoneDialog.set(true);
  }

  closeFundMilestoneDialog(): void {
    this.showFundMilestoneDialog.set(false);
    this.selectedMilestone.set(null);
  }

  async onFundMilestones(event: { milestoneIds: string[]; option: string }): Promise<void> {
    this.isFunding.set(true);
    this.error.set(null);

    try {
      // Fund milestones using batch API
      await this.jobsApi.fundMilestones({ milestoneIds: event.milestoneIds });

      this.closeFundMilestoneDialog();
      this.toastService.success('Milestone funded successfully');
      // Reload milestones
      const contractId = this.contract()?._id;
      if (contractId) {
        await this.loadMilestones(contractId);
      }
    } catch (error) {
      console.error('Error funding milestones:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fund milestone';
      this.error.set(errorMessage);
      this.toastService.error(errorMessage);
    } finally {
      this.isFunding.set(false);
    }
  }

  // Submit work
  openSubmitWorkModal(milestone: Milestone): void {
    this.selectedMilestone.set(milestone);
    this.submitWorkDescription = '';
    this.showSubmitWorkModal.set(true);
  }

  closeSubmitWorkModal(): void {
    this.showSubmitWorkModal.set(false);
    this.selectedMilestone.set(null);
    this.submitWorkDescription = '';
  }

  async submitWork(): Promise<void> {
    const milestone = this.selectedMilestone();
    if (!milestone || !this.submitWorkDescription.trim()) {
      this.error.set('Please provide a work description');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      await this.jobsApi.submitWork(milestone._id, {
        workLogDescription: this.submitWorkDescription.trim(),
        workLogFilesUrl: [],
      });

      this.closeSubmitWorkModal();
      const contractId = this.contract()?._id;
      if (contractId) {
        await this.loadMilestones(contractId);
      }
    } catch (error) {
      console.error('Error submitting work:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to submit work');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Release payment
  openReleasePaymentDialog(milestone: Milestone): void {
    this.selectedMilestone.set(milestone);
    this.showReleasePaymentDialog.set(true);
  }

  closeReleasePaymentDialog(): void {
    this.showReleasePaymentDialog.set(false);
    this.selectedMilestone.set(null);
  }

  async onReleaseMilestones(event: { milestoneIds: string[]; option: string }): Promise<void> {
    this.isReleasing.set(true);
    this.error.set(null);

    try {
      // Release payment using batch API
      await this.jobsApi.releasePayment({ milestoneIds: event.milestoneIds });

      this.closeReleasePaymentDialog();
      this.toastService.success('Payment released successfully');
      const contractId = this.contract()?._id;
      if (contractId) {
        await this.loadMilestones(contractId);
      }
    } catch (error) {
      console.error('Error releasing payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to release payment';
      this.error.set(errorMessage);
      this.toastService.error(errorMessage);
    } finally {
      this.isReleasing.set(false);
    }
  }

  // View work
  onViewWork(milestone: Milestone): void {
    // TODO: Open work preview modal
    console.log('View work:', milestone.workLogDescription);
  }

  // Request change (client action - redirects to chat)
  onRequestChange(milestone: Milestone): void {
    // TODO: Navigate to chat with context about this milestone
    console.log('Request change for milestone:', milestone.taskName);
    // In v1 this navigates to the chat room with the expert
    this.onMessage();
  }

  // Remind to pay (expert action)
  async onRemindToPay(milestone: Milestone): Promise<void> {
    // TODO: Implement reminder notification
    console.log('Remind to pay for milestone:', milestone.taskName);
    // In v1 this would send a reminder notification to the client
  }

  // Add/manage milestones
  onAddMilestone(): void {
    // Reset form and show dialog
    this.addMilestoneForm = {
      taskName: '',
      taskDescription: '',
      amount: 0,
      dueDate: this.getDefaultDueDate(),
    };
    this.showAddMilestoneDialog.set(true);
  }

  closeAddMilestoneDialog(): void {
    this.showAddMilestoneDialog.set(false);
  }

  async saveNewMilestone(): Promise<void> {
    const contract = this.contract();
    if (!contract) return;

    const { taskName, amount, dueDate } = this.addMilestoneForm;
    if (!taskName || !amount || !dueDate) return;

    this.isAddingMilestone.set(true);
    try {
      const input: CreateMilestoneInput = {
        jobId: contract.jobId || '',
        jobProposalId: contract.jobProposalId || '',
        hubId: this.currentHubId(),
        contractId: contract._id,
        taskName: this.addMilestoneForm.taskName,
        taskDescription: this.addMilestoneForm.taskDescription,
        amount: this.addMilestoneForm.amount,
        dueDate: new Date(this.addMilestoneForm.dueDate).toISOString(),
        currency: contract.selectedCurrency,
      };
      await this.jobsApi.createMilestone(input);

      // Reload milestones
      await this.loadMilestones(contract._id);
      this.closeAddMilestoneDialog();
    } catch (error) {
      console.error('Error adding milestone:', error);
      alert('Failed to add milestone. Please try again.');
    } finally {
      this.isAddingMilestone.set(false);
    }
  }

  private getDefaultDueDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }

  onManageMilestones(): void {
    const contractId = this.contract()?._id;
    if (contractId) {
      this.router.navigate(['/hub/jobs/contracts', contractId, 'manage-milestones']);
    }
  }

  // Approve milestone (old modal)
  openApproveModal(milestone: Milestone): void {
    this.selectedMilestone.set(milestone);
    this.approvalFeedback = '';
    this.showApproveModal.set(true);
  }

  closeApproveModal(): void {
    this.showApproveModal.set(false);
    this.selectedMilestone.set(null);
    this.approvalFeedback = '';
  }

  async approveMilestone(): Promise<void> {
    const milestone = this.selectedMilestone();
    if (!milestone) return;

    this.isApproving.set(true);
    this.error.set(null);

    try {
      await this.jobsApi.approveMilestone(milestone._id, {
        feedback: this.approvalFeedback.trim() || undefined,
      });

      this.closeApproveModal();
      const contractId = this.contract()?._id;
      if (contractId) {
        await this.loadMilestones(contractId);
      }
    } catch (error) {
      console.error('Error approving milestone:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to approve milestone');
    } finally {
      this.isApproving.set(false);
    }
  }

  /**
   * Get milestone progress stats
   */
  getMilestoneStats(): { total: number; funded: number; submitted: number; released: number } {
    const ms = this.milestones();
    return {
      total: ms.length,
      funded: ms.filter(m => m.status === 'funded').length,
      submitted: ms.filter(m => m.status === 'submitted' || m.status === 'work_submitted').length,
      released: ms.filter(m => ['released', 'approved'].includes(m.status)).length,
    };
  }

  // ============================================================
  // Timelog Actions (Hourly Contracts)
  // ============================================================

  async loadTimelogs(contractId: string): Promise<void> {
    this.isLoadingTimelogs.set(true);
    try {
      const result = await this.jobsApi.getTimelogs({ contractId, limit: 50 });
      const sorted = result.items.sort((a, b) =>
        new Date(b.workDate).getTime() - new Date(a.workDate).getTime()
      );
      this.timelogs.set(sorted);
      await this.loadWeeklySummary(contractId);
    } catch (error) {
      console.error('Error loading timelogs:', error);
    } finally {
      this.isLoadingTimelogs.set(false);
    }
  }

  async loadWeeklySummary(contractId: string): Promise<void> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const weekNumber = this.getWeekNumber(now);
      const summary = await this.jobsApi.getWeeklySummary(contractId, year, weekNumber);
      this.weeklySummary.set(summary);
    } catch (error) {
      console.error('Error loading weekly summary:', error);
    }
  }

  /**
   * Get ISO week number for a date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  openLogTimeModal(): void {
    const today = new Date().toISOString().split('T')[0];
    this.timelogDate = today;
    this.timelogStartTime = '09:00';
    this.timelogEndTime = '17:00';
    this.timelogBreakDuration = 1;
    this.timelogDescription = '';
    this.timelogTasks = [];
    this.showLogTimeModal.set(true);
  }

  closeLogTimeModal(): void {
    this.showLogTimeModal.set(false);
    this.resetTimelogForm();
  }

  resetTimelogForm(): void {
    this.timelogDate = '';
    this.timelogStartTime = '';
    this.timelogEndTime = '';
    this.timelogBreakDuration = 0;
    this.timelogDescription = '';
    this.timelogTasks = [];
  }

  async saveTimelog(): Promise<void> {
    const c = this.contract();
    if (!c || !this.timelogDate || !this.timelogStartTime || !this.timelogEndTime || !this.timelogDescription.trim()) {
      this.error.set('Please fill in all required fields');
      return;
    }

    if (this.timelogDescription.length < 10) {
      this.error.set('Description must be at least 10 characters');
      return;
    }

    this.isSavingTimelog.set(true);
    this.error.set(null);

    try {
      const input: CreateTimelogInput = {
        contractId: c._id,
        workDate: this.timelogDate,
        startTime: this.timelogStartTime,
        endTime: this.timelogEndTime,
        breakDuration: this.timelogBreakDuration,
        description: this.timelogDescription.trim(),
        tasks: this.timelogTasks.filter(t => t.trim()),
      };

      await this.jobsApi.createTimelog(input);
      this.closeLogTimeModal();
      await this.loadTimelogs(c._id);
    } catch (error) {
      console.error('Error saving timelog:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to save timelog');
    } finally {
      this.isSavingTimelog.set(false);
    }
  }

  async submitTimelogForApproval(timelog: TimelogEntry): Promise<void> {
    const c = this.contract();
    if (!c) return;

    try {
      await this.jobsApi.submitTimelog(timelog._id);
      await this.loadTimelogs(c._id);
    } catch (error) {
      console.error('Error submitting timelog:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to submit timelog');
    }
  }

  async deleteTimelog(timelog: TimelogEntry): Promise<void> {
    const c = this.contract();
    if (!c || timelog.status !== 'draft') return;

    try {
      await this.jobsApi.deleteTimelog(timelog._id);
      await this.loadTimelogs(c._id);
    } catch (error) {
      console.error('Error deleting timelog:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to delete timelog');
    }
  }

  openTimelogApproveModal(timelog: TimelogEntry): void {
    this.selectedTimelog.set(timelog);
    this.showTimelogApproveModal.set(true);
  }

  closeTimelogApproveModal(): void {
    this.showTimelogApproveModal.set(false);
    this.selectedTimelog.set(null);
  }

  async approveTimelogEntry(): Promise<void> {
    const timelog = this.selectedTimelog();
    const c = this.contract();
    if (!timelog || !c) return;

    this.isApprovingTimelog.set(true);
    this.error.set(null);

    try {
      await this.jobsApi.approveTimelog(timelog._id);
      this.closeTimelogApproveModal();
      await this.loadTimelogs(c._id);
    } catch (error) {
      console.error('Error approving timelog:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to approve timelog');
    } finally {
      this.isApprovingTimelog.set(false);
    }
  }

  openTimelogRejectModal(timelog: TimelogEntry): void {
    this.selectedTimelog.set(timelog);
    this.timelogRejectReason = '';
    this.showTimelogRejectModal.set(true);
  }

  closeTimelogRejectModal(): void {
    this.showTimelogRejectModal.set(false);
    this.selectedTimelog.set(null);
    this.timelogRejectReason = '';
  }

  async rejectTimelogEntry(): Promise<void> {
    const timelog = this.selectedTimelog();
    const c = this.contract();
    if (!timelog || !c || !this.timelogRejectReason.trim()) {
      this.error.set('Please provide a rejection reason');
      return;
    }

    this.isApprovingTimelog.set(true);
    this.error.set(null);

    try {
      await this.jobsApi.rejectTimelog(timelog._id, this.timelogRejectReason.trim());
      this.closeTimelogRejectModal();
      await this.loadTimelogs(c._id);
    } catch (error) {
      console.error('Error rejecting timelog:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to reject timelog');
    } finally {
      this.isApprovingTimelog.set(false);
    }
  }

  canSubmitTimelog(timelog: TimelogEntry): boolean {
    return !!this.isExpert() && timelog.status === 'draft';
  }

  canDeleteTimelog(timelog: TimelogEntry): boolean {
    return !!this.isExpert() && timelog.status === 'draft';
  }

  canApproveTimelog(timelog: TimelogEntry): boolean {
    return !!this.isClient() && timelog.status === 'submitted';
  }

  getTimelogStats(): { total: number; draft: number; submitted: number; approved: number; totalHours: number; totalBillable: number } {
    const tl = this.timelogs();
    return {
      total: tl.length,
      draft: tl.filter(t => t.status === 'draft').length,
      submitted: tl.filter(t => t.status === 'submitted').length,
      approved: tl.filter(t => t.status === 'approved' || t.status === 'paid').length,
      totalHours: tl.reduce((sum, t) => sum + (t.hoursWorked || 0), 0),
      totalBillable: tl.filter(t => t.status === 'approved' || t.status === 'paid')
        .reduce((sum, t) => sum + (t.billableAmount || 0), 0),
    };
  }

  formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  // ============================================================
  // Complete Contract Actions (Client Only)
  // ============================================================

  openCompleteContractDialog(): void {
    this.completeContractReason = '';
    this.showCompleteContractDialog.set(true);
  }

  closeCompleteContractDialog(): void {
    this.showCompleteContractDialog.set(false);
    this.completeContractReason = '';
  }

  async confirmCompleteContract(): Promise<void> {
    const c = this.contract();
    if (!c) return;

    this.isCompleting.set(true);
    this.error.set(null);

    try {
      await this.jobsApi.completeContract(
        c._id,
        this.completeContractReason.trim() || undefined
      );

      this.closeCompleteContractDialog();
      this.toastService.success('Contract completed successfully');

      // Reload contract data
      await this.loadContract(c._id);
    } catch (error) {
      console.error('Error completing contract:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete contract';
      this.error.set(errorMessage);
      this.toastService.error(errorMessage);
    } finally {
      this.isCompleting.set(false);
    }
  }
}
