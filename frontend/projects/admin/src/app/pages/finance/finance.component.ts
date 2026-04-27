import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import {
  FinanceService,
  Transaction,
  Withdrawal,
  TransactionStats,
  WithdrawalStats,
  TransactionStatus,
  TransactionType,
  WithdrawalStatus,
  ListTransactionsParams,
  ListWithdrawalsParams,
} from './finance.service';
import { ToastService } from '../../shared/ui/toast.service';

@Component({
  selector: 'app-finance',
  imports: [FormsModule, DatePipe, DecimalPipe, TitleCasePipe],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.scss',
})
export class FinanceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private financeService = inject(FinanceService);
  private toastService = inject(ToastService);

  activeTab = signal<'withdrawals' | 'transactions'>('transactions');
  searchQuery = signal('');
  withdrawalFilter = signal<'all' | WithdrawalStatus>('all');
  transactionFilter = signal<'all' | TransactionType>('all');

  withdrawalStatuses: ('all' | WithdrawalStatus)[] = ['all', 'pending', 'in_transit', 'paid', 'failed', 'canceled'];
  transactionTypes: ('all' | TransactionType)[] = [
    'all',
    'booking_payment',
    'milestone_fund',
    'timelog_payment',
    'milestone_release',
    'expert_transfer',
    'withdrawal',
    'refund',
    'transfer_reversal',
    'platform_fee',
  ];

  tabs = computed(() => [
    { id: 'transactions' as const, label: 'All Transactions', badge: this.transactionStats()?.total || 0 },
    {
      id: 'withdrawals' as const,
      label: 'Withdrawals',
      badge: (this.withdrawalStats()?.byStatus?.pending || 0) + (this.withdrawalStats()?.byStatus?.in_transit || 0),
    },
  ]);

  // Loading states
  isLoadingTransactions = signal(false);
  isLoadingWithdrawals = signal(false);
  isLoadingStats = signal(false);

  // Track if data has been loaded (for lazy loading)
  private transactionsLoaded = false;
  private withdrawalsLoaded = false;

  // Stats
  transactionStats = signal<TransactionStats | null>(null);
  withdrawalStats = signal<WithdrawalStats | null>(null);

  // Data
  transactions = signal<Transaction[]>([]);
  withdrawals = signal<Withdrawal[]>([]);

  // Pagination
  transactionPage = signal(1);
  transactionLimit = signal(20);
  transactionTotal = signal(0);
  transactionTotalPages = signal(0);

  withdrawalPage = signal(1);
  withdrawalLimit = signal(20);
  withdrawalTotal = signal(0);
  withdrawalTotalPages = signal(0);

  // Computed stats
  totalRevenue = computed(() => this.transactionStats()?.totalVolume || 0);
  totalPlatformFees = computed(() => this.transactionStats()?.totalPlatformFees || 0);
  pendingWithdrawalsCount = computed(
    () => (this.withdrawalStats()?.byStatus?.pending || 0) + (this.withdrawalStats()?.byStatus?.in_transit || 0)
  );
  completedWithdrawalsAmount = computed(() => this.withdrawalStats()?.completedAmount || 0);

  // Filtered withdrawals (client-side search)
  filteredWithdrawals = computed(() => {
    let result = this.withdrawals();
    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(
        (w) =>
          w.user?.name?.toLowerCase().includes(query) ||
          w.user?.email?.toLowerCase().includes(query) ||
          w.stripePayoutId?.toLowerCase().includes(query)
      );
    }
    return result;
  });

  ngOnInit() {
    const tab = this.route.snapshot.data['tab'];
    if (tab === 'withdrawals') this.activeTab.set('withdrawals');
    else if (tab === 'transactions') this.activeTab.set('transactions');

    // Load stats
    this.loadStats();

    // Load only the active tab's data
    if (this.activeTab() === 'transactions') {
      this.loadTransactions();
    } else {
      this.loadWithdrawals();
    }
  }

  setActiveTab(tab: 'withdrawals' | 'transactions') {
    this.activeTab.set(tab);

    // Load data for the tab if not already loaded
    if (tab === 'transactions' && !this.transactionsLoaded) {
      this.loadTransactions();
    } else if (tab === 'withdrawals' && !this.withdrawalsLoaded) {
      this.loadWithdrawals();
    }
  }

  loadStats() {
    this.isLoadingStats.set(true);

    // Load transaction stats
    this.financeService.getTransactionStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.transactionStats.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading transaction stats:', error);
        this.toastService.error('Failed to load transaction statistics');
      },
    });

    // Load withdrawal stats
    this.financeService.getWithdrawalStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.withdrawalStats.set(response.data);
        }
        this.isLoadingStats.set(false);
      },
      error: (error) => {
        console.error('Error loading withdrawal stats:', error);
        this.toastService.error('Failed to load withdrawal statistics');
        this.isLoadingStats.set(false);
      },
    });
  }

  loadTransactions() {
    this.isLoadingTransactions.set(true);

    const params: ListTransactionsParams = {
      page: this.transactionPage(),
      limit: this.transactionLimit(),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    if (this.transactionFilter() !== 'all') {
      params.type = this.transactionFilter() as TransactionType;
    }

    this.financeService.listTransactions(params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.transactions.set(response.data.items || []);
          if (response.data.pagination) {
            this.transactionTotal.set(response.data.pagination.total);
            this.transactionTotalPages.set(response.data.pagination.totalPages);
          }
          this.transactionsLoaded = true;
        }
        this.isLoadingTransactions.set(false);
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
        this.toastService.error('Failed to load transactions');
        this.isLoadingTransactions.set(false);
      },
    });
  }

  loadWithdrawals() {
    this.isLoadingWithdrawals.set(true);

    const params: ListWithdrawalsParams = {
      page: this.withdrawalPage(),
      limit: this.withdrawalLimit(),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    if (this.withdrawalFilter() !== 'all') {
      params.status = this.withdrawalFilter() as WithdrawalStatus;
    }

    this.financeService.listWithdrawals(params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.withdrawals.set(response.data.items || []);
          if (response.data.pagination) {
            this.withdrawalTotal.set(response.data.pagination.total);
            this.withdrawalTotalPages.set(response.data.pagination.totalPages);
          }
          this.withdrawalsLoaded = true;
        }
        this.isLoadingWithdrawals.set(false);
      },
      error: (error) => {
        console.error('Error loading withdrawals:', error);
        this.toastService.error('Failed to load withdrawals');
        this.isLoadingWithdrawals.set(false);
      },
    });
  }

  onWithdrawalFilterChange(status: 'all' | WithdrawalStatus) {
    this.withdrawalFilter.set(status);
    this.withdrawalPage.set(1);
    this.loadWithdrawals();
  }

  onTransactionFilterChange(type: 'all' | TransactionType) {
    this.transactionFilter.set(type);
    this.transactionPage.set(1);
    this.loadTransactions();
  }

  onTransactionPageChange(page: number) {
    this.transactionPage.set(page);
    this.loadTransactions();
  }

  onWithdrawalPageChange(page: number) {
    this.withdrawalPage.set(page);
    this.loadWithdrawals();
  }

  getWithdrawalStatusClasses(status: WithdrawalStatus): string {
    const classes: Record<WithdrawalStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_transit: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      canceled: 'bg-gray-100 text-gray-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getTransactionTypeClasses(type: TransactionType): string {
    const classes: Record<string, string> = {
      booking_payment: 'bg-green-100 text-green-700',
      milestone_fund: 'bg-blue-100 text-blue-700',
      timelog_payment: 'bg-blue-100 text-blue-700',
      milestone_release: 'bg-purple-100 text-purple-700',
      expert_transfer: 'bg-indigo-100 text-indigo-700',
      withdrawal: 'bg-orange-100 text-orange-700',
      refund: 'bg-red-100 text-red-700',
      transfer_reversal: 'bg-red-100 text-red-700',
      platform_fee: 'bg-gray-100 text-gray-700',
    };
    return classes[type] || 'bg-gray-100 text-gray-700';
  }

  getTransactionStatusClasses(status: TransactionStatus): string {
    const classes: Record<TransactionStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      succeeded: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-orange-100 text-orange-700',
      partially_refunded: 'bg-orange-100 text-orange-700',
      cancelled: 'bg-gray-100 text-gray-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getTransactionDirectionIcon(type: TransactionType): string {
    const outboundTypes = ['withdrawal', 'refund', 'expert_transfer', 'transfer_reversal'];
    return outboundTypes.includes(type) ? '-' : '+';
  }

  getTransactionAmountClass(type: TransactionType): string {
    const outboundTypes = ['withdrawal', 'refund', 'transfer_reversal'];
    return outboundTypes.includes(type) ? 'text-red-600' : 'text-green-600';
  }

  formatTransactionType(type: TransactionType): string {
    const labels: Record<TransactionType, string> = {
      booking_payment: 'Booking',
      milestone_fund: 'Milestone Job',
      timelog_payment: 'Weekly Job',
      milestone_release: 'Milestone Release',
      expert_transfer: 'Expert Transfer',
      withdrawal: 'Withdrawal',
      refund: 'Refund',
      transfer_reversal: 'Reversal',
      platform_fee: 'Platform Fee',
    };
    return labels[type] || type;
  }

  viewTransactionDetails(transaction: Transaction) {
    this.router.navigate(['/dashboard/finance/transactions', transaction._id]);
  }

  viewWithdrawalDetails(withdrawal: Withdrawal) {
    this.router.navigate(['/dashboard/finance/withdrawals', withdrawal._id]);
  }
}
