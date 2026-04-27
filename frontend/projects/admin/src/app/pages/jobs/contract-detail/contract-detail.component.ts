import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, TitleCasePipe, DecimalPipe, PercentPipe } from '@angular/common';
import {
  JobsService,
  type PricingType,
  type ContractStatus,
  type MilestoneStatus,
  type Milestone as ApiMilestone,
  type TimelogEntry as ApiTimelogEntry,
  type Transaction as ApiTransaction,
  type MilestoneStats,
} from '../jobs.service';
import { AvatarComponent } from '../../../shared/ui';

interface Contract {
  id: string;
  jobId: string;
  jobTitle: string;
  jobProposalId: string;
  hubId: string;
  hubName: string;
  contractTitle: string;
  contractDescription: string;
  contractUploads: string[];
  priceType: PricingType;
  proposedPrice?: number;
  hourlyProposedPrice?: number;
  weeklyLimit?: number;
  hasMilestones: boolean;
  selectedCurrency: string;
  startDate: Date;
  endDate?: Date;
  status: ContractStatus;
  expertId: string;
  expertName: string;
  expertAvatar: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  pendingTermsUpdate?: {
    weeklyLimit: number;
    hourlyRate: number;
    effectiveDate: Date;
    status: string;
  };
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
  workLogDescription?: string;
  workLogFilesUrl: string[];
  workSubmittedDate?: Date;
  fundedDate?: Date;
  releasedDate?: Date;
}

interface Transaction {
  id: string;
  type: 'escrow' | 'release' | 'refund' | 'payment';
  amount: number;
  currency: string;
  description: string;
  date: Date;
  status: string;
  referenceId: string;
  referenceType: 'milestone' | 'timelog';
  referenceName?: string;
}

interface TransactionSummary {
  totalEscrow: number;
  totalReleased: number;
  totalRefunded: number;
  totalPending: number;
  currency: string;
}

interface TimelogEntry {
  id: string;
  date: Date;
  hours: number;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  rate: number;
  amount: number;
  startTime: string;
  endTime: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

interface TimelogStats {
  hourlyRate: number;
  weeklyLimit: number;
  currency: string;
  thisWeek: {
    hours: number;
    billable: number;
    entries: number;
  };
  total: {
    hours: number;
    billable: number;
    entries: number;
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
  };
}

@Component({
  selector: 'app-contract-detail',
  imports: [RouterLink, DatePipe, TitleCasePipe, DecimalPipe, PercentPipe, AvatarComponent],
  templateUrl: './contract-detail.component.html',
  styleUrl: './contract-detail.component.scss'
})
export class ContractDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobsService = inject(JobsService);

  isLoading = signal(true);
  contract = signal<Contract | null>(null);
  milestones = signal<Milestone[]>([]);
  milestoneStats = signal<MilestoneStats | null>(null);
  transactions = signal<Transaction[]>([]);
  transactionSummary = signal<TransactionSummary | null>(null);
  timelogs = signal<TimelogEntry[]>([]);
  timelogStats = signal<TimelogStats | null>(null);
  activeTab = signal<'overview' | 'milestones' | 'timelogs' | 'transactions'>('overview');

  // Loading states for each tab
  isMilestonesLoading = signal(false);
  isTimelogsLoading = signal(false);
  isTransactionsLoading = signal(false);

  // Track which tabs have been loaded
  milestonesLoaded = signal(false);
  timelogsLoaded = signal(false);
  transactionsLoaded = signal(false);

  // Dynamic tabs based on contract type
  tabs = computed(() => {
    const c = this.contract();
    const baseTabs: { id: 'overview' | 'milestones' | 'timelogs' | 'transactions'; label: string }[] = [
      { id: 'overview', label: 'Overview' },
    ];

    if (c?.priceType === 'fixed') {
      baseTabs.push({ id: 'milestones', label: 'Milestones' });
    } else if (c?.priceType === 'hourly') {
      baseTabs.push({ id: 'timelogs', label: 'Time Logs' });
    }

    baseTabs.push({ id: 'transactions', label: 'Transactions' });

    return baseTabs;
  });

  financialSummary = computed(() => {
    const c = this.contract();
    const summary = this.transactionSummary();

    if (summary) {
      return {
        totalContractValue: c?.proposedPrice || 0,
        totalInEscrow: summary.totalEscrow,
        totalPaid: summary.totalReleased,
        totalRemaining: (c?.proposedPrice || 0) - summary.totalEscrow - summary.totalReleased,
        currency: summary.currency,
      };
    }

    // Fallback to milestone-based calculation
    const ms = this.milestones();
    const totalValue = ms.reduce((sum, m) => sum + m.amount, 0) || c?.proposedPrice || 0;
    const funded = ms.filter(m => ['funded', 'work_submitted'].includes(m.status)).reduce((sum, m) => sum + m.amount, 0);
    const paid = ms.filter(m => ['released', 'approved', 'completed'].includes(m.status)).reduce((sum, m) => sum + m.amount, 0);

    return {
      totalContractValue: totalValue,
      totalInEscrow: funded,
      totalPaid: paid,
      totalRemaining: totalValue - funded - paid,
      currency: c?.selectedCurrency || 'MYR',
    };
  });

  progressPercent = computed(() => {
    const summary = this.financialSummary();
    if (summary.totalContractValue === 0) return 0;
    return summary.totalPaid / summary.totalContractValue;
  });

  ngOnInit() {
    const contractId = this.route.snapshot.paramMap.get('id');
    if (contractId) {
      this.loadContractDetails(contractId);
    }
  }

  loadContractDetails(contractId: string) {
    this.isLoading.set(true);

    this.jobsService.getContractById(contractId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const c = response.data;
          this.contract.set({
            id: c._id,
            jobId: c.jobId,
            jobTitle: c.job?.jobTitle || 'Unknown Job',
            jobProposalId: c.jobProposalId,
            hubId: c.hubId,
            hubName: c.hub?.name || 'Unknown Hub',
            contractTitle: c.contractTitle,
            contractDescription: c.contractDescription,
            contractUploads: c.contractUploads || [],
            priceType: c.priceType,
            proposedPrice: c.proposedPrice,
            hourlyProposedPrice: c.hourlyProposedPrice,
            weeklyLimit: c.weeklyLimit,
            hasMilestones: c.hasMilestones,
            selectedCurrency: c.selectedCurrency,
            startDate: this.parseDate(c.startDate),
            endDate: c.endDate ? this.parseDate(c.endDate) : undefined,
            status: c.status,
            expertId: c.expert?._id || '',
            expertName: c.expert?.name || 'Unknown Expert',
            expertAvatar: c.expert?.profilePhoto || '',
            clientId: c.client?._id || '',
            clientName: c.client?.name || 'Unknown Client',
            clientAvatar: c.client?.profilePhoto || '',
            createdDate: this.parseDate(c.createdAt),
            updatedDate: this.parseDate(c.updatedAt),
          });

          // Map milestones from API response if available
          // Note: Milestones may need a separate API endpoint
          this.milestones.set([]);

          // Transactions would need separate API endpoint
          this.transactions.set([]);

          // Timelogs would need separate API endpoint
          this.timelogs.set([]);
        } else {
          this.contract.set(null);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading contract details:', err);
        this.contract.set(null);
        this.isLoading.set(false);
      },
    });
  }

  goBack() {
    this.router.navigate(['/dashboard/jobs/contracts']);
  }

  setActiveTab(tab: 'overview' | 'milestones' | 'timelogs' | 'transactions') {
    this.activeTab.set(tab);

    // Lazy load data when tab is clicked
    const contractId = this.contract()?.id;
    if (!contractId) return;

    if (tab === 'milestones' && !this.milestonesLoaded()) {
      this.loadMilestones(contractId);
    } else if (tab === 'timelogs' && !this.timelogsLoaded()) {
      this.loadTimelogs(contractId);
    } else if (tab === 'transactions' && !this.transactionsLoaded()) {
      this.loadTransactions(contractId);
    }
  }

  private loadMilestones(contractId: string) {
    this.isMilestonesLoading.set(true);

    this.jobsService.getContractMilestones(contractId).subscribe({
      next: (response) => {
        if (response.success) {
          this.milestones.set(
            response.data.map((m) => ({
              id: m._id,
              taskName: m.taskName,
              taskDescription: m.taskDescription,
              amount: m.amount,
              dueDate: this.parseDate(m.dueDate),
              currency: m.currency,
              status: m.status,
              workLogDescription: m.workLogDescription,
              workLogFilesUrl: m.workLogFilesUrl || [],
              workSubmittedDate: m.workSubmittedDate ? this.parseDate(m.workSubmittedDate) : undefined,
              fundedDate: m.fundedDate ? this.parseDate(m.fundedDate) : undefined,
              releasedDate: m.releasedDate ? this.parseDate(m.releasedDate) : undefined,
            }))
          );
          this.milestoneStats.set(response.stats);
          this.milestonesLoaded.set(true);
        }
        this.isMilestonesLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading milestones:', err);
        this.isMilestonesLoading.set(false);
      },
    });
  }

  private loadTimelogs(contractId: string) {
    this.isTimelogsLoading.set(true);

    this.jobsService.getContractTimelogs(contractId).subscribe({
      next: (response) => {
        if (response.success) {
          this.timelogs.set(
            response.data.map((t) => ({
              id: t._id,
              date: this.parseDate(t.workDate),
              hours: t.hoursWorked,
              description: t.description,
              status: t.status,
              rate: t.hourlyRate,
              amount: t.billableAmount,
              startTime: t.startTime,
              endTime: t.endTime,
              approvedAt: t.approvedDate ? this.parseDate(t.approvedDate) : undefined,
              rejectionReason: t.rejectionReason,
            }))
          );
          this.timelogStats.set(response.stats);
          this.timelogsLoaded.set(true);
        }
        this.isTimelogsLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading timelogs:', err);
        this.isTimelogsLoading.set(false);
      },
    });
  }

  private loadTransactions(contractId: string) {
    this.isTransactionsLoading.set(true);

    this.jobsService.getContractTransactions(contractId).subscribe({
      next: (response) => {
        if (response.success) {
          this.transactions.set(
            response.data.map((t) => ({
              id: t.id,
              type: t.type,
              amount: t.amount,
              currency: t.currency,
              description: t.description,
              date: this.parseDate(t.date),
              status: t.status,
              referenceId: t.referenceId,
              referenceType: t.referenceType,
              referenceName: t.referenceName,
            }))
          );
          this.transactionSummary.set(response.summary);
          this.transactionsLoaded.set(true);
        }
        this.isTransactionsLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading transactions:', err);
        this.isTransactionsLoading.set(false);
      },
    });
  }

  getMilestoneStatusLabel(status: MilestoneStatus): string {
    const labels: Record<MilestoneStatus, string> = {
      pending: 'Not Funded',
      active: 'Active',
      funded: 'Funded - In Progress',
      work_submitted: 'Work Submitted',
      released: 'Payment Released',
      approved: 'Approved',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  }

  getFileName(url: string): string {
    return url.split('/').pop() || 'File';
  }

  getStatusClasses(status: ContractStatus): string {
    const classes: Record<ContractStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-red-100 text-red-700',
      paused: 'bg-orange-100 text-orange-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getMilestoneCardClasses(status: MilestoneStatus): string {
    const classes: Record<MilestoneStatus, string> = {
      pending: 'border-gray-200 bg-white',
      active: 'border-blue-200 bg-blue-50',
      funded: 'border-blue-300 bg-blue-50',
      work_submitted: 'border-purple-300 bg-purple-50',
      released: 'border-green-300 bg-green-50',
      approved: 'border-green-300 bg-green-50',
      completed: 'border-green-300 bg-green-50',
      cancelled: 'border-red-200 bg-red-50',
    };
    return classes[status] || 'border-gray-200 bg-white';
  }

  getMilestoneNumberClasses(status: MilestoneStatus): string {
    const classes: Record<MilestoneStatus, string> = {
      pending: 'bg-gray-200 text-gray-600',
      active: 'bg-blue-500 text-white',
      funded: 'bg-blue-500 text-white',
      work_submitted: 'bg-purple-500 text-white',
      released: 'bg-green-500 text-white',
      approved: 'bg-green-500 text-white',
      completed: 'bg-green-500 text-white',
      cancelled: 'bg-red-500 text-white',
    };
    return classes[status] || 'bg-gray-200 text-gray-600';
  }

  getMilestoneStatusClasses(status: MilestoneStatus): string {
    const classes: Record<MilestoneStatus, string> = {
      pending: 'bg-gray-100 text-gray-600',
      active: 'bg-blue-100 text-blue-700',
      funded: 'bg-blue-100 text-blue-700',
      work_submitted: 'bg-purple-100 text-purple-700',
      released: 'bg-green-100 text-green-700',
      approved: 'bg-green-100 text-green-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-600';
  }

  getTransactionIconClasses(type: 'escrow' | 'release' | 'refund' | 'payment'): string {
    const classes: Record<string, string> = {
      escrow: 'bg-blue-100 text-blue-600',
      release: 'bg-green-100 text-green-600',
      refund: 'bg-orange-100 text-orange-600',
      payment: 'bg-green-100 text-green-600',
    };
    return classes[type] || 'bg-gray-100 text-gray-600';
  }

  getTransactionAmountClasses(type: 'escrow' | 'release' | 'refund' | 'payment'): string {
    const classes: Record<string, string> = {
      escrow: 'text-blue-600',
      release: 'text-green-600',
      refund: 'text-orange-600',
      payment: 'text-green-600',
    };
    return classes[type] || 'text-gray-900';
  }

  // Timelog helper methods
  getTimelogCardClasses(status: TimelogEntry['status']): string {
    const classes: Record<TimelogEntry['status'], string> = {
      draft: 'border-gray-200 bg-white',
      submitted: 'border-yellow-200 bg-yellow-50',
      approved: 'border-green-200 bg-green-50',
      rejected: 'border-red-200 bg-red-50',
      paid: 'border-blue-200 bg-blue-50',
    };
    return classes[status] || 'border-gray-200 bg-white';
  }

  getTimelogStatusClasses(status: TimelogEntry['status']): string {
    const classes: Record<TimelogEntry['status'], string> = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      paid: 'bg-blue-100 text-blue-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getTotalLoggedHours(): number {
    const stats = this.timelogStats();
    return stats?.total.hours || this.timelogs().reduce((sum, log) => sum + log.hours, 0);
  }

  getTotalLoggedAmount(): number {
    const stats = this.timelogStats();
    return stats?.total.billable || this.timelogs().reduce((sum, log) => sum + log.amount, 0);
  }

  getPendingHours(): number {
    const stats = this.timelogStats();
    if (stats) {
      // 'submitted' status in backend = 'pending' in UI terms
      return this.timelogs()
        .filter(log => log.status === 'submitted')
        .reduce((sum, log) => sum + log.hours, 0);
    }
    return this.timelogs()
      .filter(log => log.status === 'submitted')
      .reduce((sum, log) => sum + log.hours, 0);
  }

  getApprovedHours(): number {
    const stats = this.timelogStats();
    if (stats) {
      return this.timelogs()
        .filter(log => log.status === 'approved')
        .reduce((sum, log) => sum + log.hours, 0);
    }
    return this.timelogs()
      .filter(log => log.status === 'approved')
      .reduce((sum, log) => sum + log.hours, 0);
  }

  getPaidHours(): number {
    const stats = this.timelogStats();
    if (stats) {
      return this.timelogs()
        .filter(log => log.status === 'paid')
        .reduce((sum, log) => sum + log.hours, 0);
    }
    return this.timelogs()
      .filter(log => log.status === 'paid')
      .reduce((sum, log) => sum + log.hours, 0);
  }

  private parseDate(dateValue: string | Date | undefined): Date {
    if (!dateValue) return new Date();
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

}

