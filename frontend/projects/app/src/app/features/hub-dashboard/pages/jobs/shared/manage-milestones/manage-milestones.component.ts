import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@mereka/ui';
import { AuthStateService } from '../../../../../../core/services/auth-state.service';
import {
  HubJobsApiService,
  Contract,
  Milestone,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '../../../../services/hub-jobs-api.service';

interface MilestoneWithChanges extends Milestone {
  isNew?: boolean;
  isDeleted?: boolean;
  hasChanges?: boolean;
  previousTaskName?: string;
  previousAmount?: number;
  previousDueDate?: string;
  previousTaskDescription?: string;
}

@Component({
  selector: 'app-hub-job-manage-milestones',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './manage-milestones.component.html',
})
export class HubJobManageMilestonesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly jobsApi = inject(HubJobsApiService);

  // State
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly contract = signal<Contract | null>(null);
  readonly milestones = signal<MilestoneWithChanges[]>([]);
  readonly showChanges = signal(false);

  // Dialog state
  readonly showDialog = signal(false);
  readonly editingMilestone = signal<MilestoneWithChanges | null>(null);
  readonly dialogForm = signal({
    taskName: '',
    taskDescription: '',
    amount: 0,
    dueDate: '',
  });

  // Route params
  readonly hubId = computed(() => this.authState.selectedHub()?.id || '');
  readonly contractId = computed(() => this.route.snapshot.paramMap.get('id') || '');

  // Computed
  readonly visibleMilestones = computed(() =>
    this.milestones().filter((m) => !m.isDeleted)
  );

  readonly totalAmount = computed(() =>
    this.visibleMilestones().reduce((sum, m) => sum + (m.amount || 0), 0)
  );

  readonly hasAnyChanges = computed(() => {
    const milestones = this.milestones();
    return milestones.some((m) => m.isNew || m.isDeleted || m.hasChanges);
  });

  // Determine view context
  readonly isHubView = computed(() => {
    const contract = this.contract();
    const currentHubId = this.hubId();
    if (!contract || !currentHubId) return true;
    return contract.clientHubId === currentHubId;
  });

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    const contractId = this.contractId();
    if (!contractId) return;

    this.isLoading.set(true);
    try {
      // Load contract
      const contract = await this.jobsApi.getContract(contractId);
      this.contract.set(contract);

      // Load milestones
      const result = await this.jobsApi.getMilestones({ contractId, limit: 100 });
      this.milestones.set(result.items.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Navigation
  goBack(): void {
    const contractId = this.contractId();
    this.router.navigate(['/hub/jobs/contracts', contractId]);
  }

  // Dialog methods
  openAddDialog(): void {
    this.editingMilestone.set(null);
    this.dialogForm.set({
      taskName: '',
      taskDescription: '',
      amount: 0,
      dueDate: this.getDefaultDueDate(),
    });
    this.showDialog.set(true);
  }

  openEditDialog(milestone: MilestoneWithChanges): void {
    if (!this.canEditMilestone(milestone)) return;

    this.editingMilestone.set(milestone);
    this.dialogForm.set({
      taskName: milestone.taskName,
      taskDescription: milestone.taskDescription || '',
      amount: milestone.amount,
      dueDate: milestone.dueDate ? milestone.dueDate.split('T')[0] : '',
    });
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.editingMilestone.set(null);
  }

  saveDialogMilestone(): void {
    const form = this.dialogForm();
    if (!form.taskName || !form.amount || !form.dueDate) return;

    const editing = this.editingMilestone();

    if (editing) {
      // Update existing milestone
      const milestones = [...this.milestones()];
      const index = milestones.findIndex((m) => m._id === editing._id);
      if (index !== -1) {
        const original = milestones[index];
        milestones[index] = {
          ...original,
          taskName: form.taskName,
          taskDescription: form.taskDescription,
          amount: form.amount,
          dueDate: new Date(form.dueDate).toISOString(),
          hasChanges:
            original.taskName !== form.taskName ||
            original.amount !== form.amount ||
            original.taskDescription !== form.taskDescription ||
            original.dueDate?.split('T')[0] !== form.dueDate,
          previousTaskName: original.previousTaskName || original.taskName,
          previousAmount: original.previousAmount ?? original.amount,
          previousDueDate: original.previousDueDate || original.dueDate,
          previousTaskDescription: original.previousTaskDescription || original.taskDescription,
        };
        this.milestones.set(milestones);
      }
    } else {
      // Add new milestone
      const contract = this.contract();
      const newMilestone: MilestoneWithChanges = {
        _id: `temp-${Date.now()}`,
        contractId: contract?._id || '',
        jobId: contract?.jobId,
        jobProposalId: contract?.jobProposalId,
        hubId: this.hubId(),
        taskName: form.taskName,
        taskDescription: form.taskDescription,
        amount: form.amount,
        currency: contract?.selectedCurrency || 'MYR',
        dueDate: new Date(form.dueDate).toISOString(),
        status: 'pending',
        order: this.milestones().length,
        isNew: true,
      };
      this.milestones.set([...this.milestones(), newMilestone]);
    }

    this.closeDialog();
  }

  deleteMilestone(milestone: MilestoneWithChanges): void {
    if (!this.canEditMilestone(milestone)) return;

    if (!confirm('Are you sure you want to delete this milestone?')) return;

    if (milestone.isNew) {
      // Remove new milestone entirely
      this.milestones.set(this.milestones().filter((m) => m._id !== milestone._id));
    } else {
      // Mark existing milestone as deleted
      const milestones = [...this.milestones()];
      const index = milestones.findIndex((m) => m._id === milestone._id);
      if (index !== -1) {
        milestones[index] = { ...milestones[index], isDeleted: true };
        this.milestones.set(milestones);
      }
    }
  }

  async saveChanges(): Promise<void> {
    if (!this.hasAnyChanges()) return;

    const contract = this.contract();
    if (!contract) return;

    this.isSaving.set(true);
    try {
      const milestones = this.milestones();

      // Process new milestones
      const newMilestones = milestones.filter((m) => m.isNew && !m.isDeleted);
      for (const milestone of newMilestones) {
        const input: CreateMilestoneInput = {
          jobId: contract.jobId || '',
          jobProposalId: contract.jobProposalId || '',
          hubId: this.hubId(),
          contractId: contract._id,
          taskName: milestone.taskName,
          taskDescription: milestone.taskDescription,
          amount: milestone.amount,
          dueDate: milestone.dueDate,
          currency: milestone.currency,
        };
        await this.jobsApi.createMilestone(input);
      }

      // Process updated milestones
      const updatedMilestones = milestones.filter((m) => m.hasChanges && !m.isNew && !m.isDeleted);
      for (const milestone of updatedMilestones) {
        const input: UpdateMilestoneInput = {
          taskName: milestone.taskName,
          taskDescription: milestone.taskDescription,
          amount: milestone.amount,
          dueDate: milestone.dueDate,
        };
        await this.jobsApi.updateMilestone(milestone._id, input);
      }

      // Process deleted milestones
      const deletedMilestones = milestones.filter((m) => m.isDeleted && !m.isNew);
      for (const milestone of deletedMilestones) {
        await this.jobsApi.deleteMilestone(milestone._id);
      }

      // Reload data
      await this.loadData();
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  cancel(): void {
    if (this.hasAnyChanges()) {
      if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) return;
    }
    this.goBack();
  }

  // Helpers
  canEditMilestone(milestone: MilestoneWithChanges): boolean {
    // Can only edit pending or active milestones (not funded/work_submitted/released)
    return (milestone.status === 'pending' || milestone.status === 'active') && !milestone.isDeleted;
  }

  getMilestoneStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      active: 'Active',
      funded: 'Funded',
      work_submitted: 'Work Submitted',
      submitted: 'Submitted',
      approved: 'Approved',
      released: 'Released',
      paid: 'Paid',
      disputed: 'Disputed',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
      case 'funded':
        return 'bg-blue-100 text-blue-800';
      case 'work_submitted':
      case 'submitted':
        return 'bg-purple-100 text-purple-800';
      case 'approved':
      case 'released':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'disputed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-neutral-100 text-neutral-600';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
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

  formatCurrency(amount: number): string {
    const contract = this.contract();
    const currency = contract?.selectedCurrency || 'MYR';
    return `${currency} ${amount.toLocaleString()}`;
  }

  private getDefaultDueDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Default to 1 week from now
    return date.toISOString().split('T')[0];
  }

  updateFormField(field: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = field === 'amount' ? parseFloat(target.value) || 0 : target.value;
    this.dialogForm.set({ ...this.dialogForm(), [field]: value });
  }

  toggleShowChanges(): void {
    this.showChanges.set(!this.showChanges());
  }
}
