import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FinanceService, type WithdrawalStatus, type SourceType } from './finance.service';

interface WithdrawalDetail {
  _id: string;
  userId: string;
  stripeAccountId: string;
  stripePayoutId: string;
  amount: number;
  currency: string;
  bankAccountId: string;
  sourceType: SourceType;
  status: WithdrawalStatus;
  description?: string;
  requestedBy: string;
  approvedBy?: string;
  arrivalDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    stripeAccountId?: string;
  };
  bankAccount?: {
    bankName: string;
    accountLast4: string;
    accountHolderName: string;
    accountType?: string;
    currency?: string;
    routingNumber?: string;
  };
  relatedTransaction?: {
    _id: string;
    referenceId: string;
    amount: number;
    status: string;
    type: string;
  };
  requestedByUser?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedByUser?: {
    _id: string;
    name: string;
    email: string;
  };
  stripeDetails?: {
    payoutId: string;
    amount: number;
    currency: string;
    status: string;
    method?: string;
    destination?: string;
    arrivalDate?: number;
    failureCode?: string;
    failureMessage?: string;
  };
  stripeResponse?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    arrivalDate?: number;
    method?: string;
    sourceType?: string;
    destination?: string;
    failureCode?: string;
    failureMessage?: string;
  };
}

@Component({
  selector: 'app-withdrawal-detail',
  imports: [DatePipe, DecimalPipe, TitleCasePipe, UpperCasePipe],
  templateUrl: './withdrawal-detail.component.html',
  styleUrl: './withdrawal-detail.component.scss',
})
export class WithdrawalDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private financeService = inject(FinanceService);

  withdrawal = signal<WithdrawalDetail | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadWithdrawal(id);
    } else {
      this.error.set('Withdrawal ID not provided');
      this.isLoading.set(false);
    }
  }

  loadWithdrawal(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.financeService.getWithdrawalById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.withdrawal.set(response.data as WithdrawalDetail);
        } else {
          this.error.set('Failed to load withdrawal');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading withdrawal:', err);
        this.error.set('Failed to load withdrawal');
        this.isLoading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/finance/withdrawals']);
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_transit: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      canceled: 'bg-gray-100 text-gray-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getSourceTypeClass(type: string): string {
    const classes: Record<string, string> = {
      card: 'bg-purple-100 text-purple-700',
      fpx: 'bg-blue-100 text-blue-700',
      bank_transfer: 'bg-green-100 text-green-700',
    };
    return classes[type] || 'bg-gray-100 text-gray-700';
  }

  formatStatus(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      in_transit: 'In Transit',
      paid: 'Paid',
      failed: 'Failed',
      canceled: 'Canceled',
    };
    return labels[status] || status;
  }

  formatSourceType(type: string): string {
    const labels: Record<string, string> = {
      card: 'Card',
      fpx: 'FPX',
      bank_transfer: 'Bank Transfer',
    };
    return labels[type] || type;
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency || 'MYR',
    }).format(amount);
  }

  formatStripeAmount(amount: number, currency: string): string {
    // Stripe amounts are in cents
    return this.formatCurrency(amount / 100, currency?.toUpperCase() || 'MYR');
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }

  formatUnixTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }
}
