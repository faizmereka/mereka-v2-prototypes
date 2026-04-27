import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FinanceService, type TransactionType, type TransactionStatus } from './finance.service';

interface TransactionDetail {
  _id: string;
  type: TransactionType;
  direction: string;
  sourceModel: string;
  sourceId: string;
  referenceId: string;
  amount: number;
  currency: string;
  platformFee: number;
  platformFeeRate: number;
  stripeFee: number;
  transferAmount: number;
  status: TransactionStatus;
  stripeStatus?: string;
  serviceType?: string;
  description?: string;
  notes?: string;
  errorCode?: string;
  errorMessage?: string;
  transferredAt?: string;
  refundedAmount?: number;
  refundedAt?: string;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeTransferId?: string;
  stripePayoutId?: string;
  stripeRefundId?: string;
  fromUser?: { _id: string; name: string; email: string; phone?: string };
  toUser?: { _id: string; name: string; email: string; phone?: string };
  hub?: { _id: string; name: string; logo?: string };
  processedByUser?: { _id: string; name: string; email: string };
  refundedByUser?: { _id: string; name: string; email: string };
  booking?: {
    _id: string;
    bookingType: string;
    status: string;
    bookingStartDate: string;
    bookingEndDate: string;
    totalCost: number;
    service?: { _id: string; title?: string; name?: string };
    bookedBy?: { _id: string; name: string; email: string };
  };
  milestone?: {
    _id: string;
    taskName: string;
    taskDescription?: string;
    amount: number;
    currency: string;
    status: string;
    dueDate?: string;
    workSubmittedDate?: string;
    job?: { _id: string; title: string };
    contract?: { _id: string; contractTitle: string };
  };
  timelog?: {
    _id: string;
    workDate: string;
    weekNumber: number;
    year: number;
    startTime: string;
    endTime: string;
    hoursWorked: number;
    hourlyRate: number;
    billableAmount: number;
    description?: string;
    tasks?: string[];
    status: string;
    job?: { _id: string; title: string };
    contract?: { _id: string; contractTitle: string };
  };
  withdrawal?: {
    _id: string;
    stripePayoutId: string;
    bankAccountId: string;
    sourceType: string;
    status: string;
    arrivalDate?: string;
    completedDate?: string;
  };
  contractPayment?: {
    _id: string;
    paymentType: string;
    status: string;
    weekStartDate?: string;
    weekEndDate?: string;
    amount: number;
    currency: string;
    contract?: { _id: string; contractTitle: string };
    job?: { _id: string; title: string };
    milestone?: { _id: string; taskName: string };
  };
}

@Component({
  selector: 'app-transaction-detail',
  imports: [DatePipe, DecimalPipe, TitleCasePipe],
  templateUrl: './transaction-detail.component.html',
  styleUrl: './transaction-detail.component.scss',
})
export class TransactionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private financeService = inject(FinanceService);

  transaction = signal<TransactionDetail | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTransaction(id);
    } else {
      this.error.set('Transaction ID not provided');
      this.isLoading.set(false);
    }
  }

  loadTransaction(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.financeService.getTransactionById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.transaction.set(response.data as TransactionDetail);
        } else {
          this.error.set('Failed to load transaction');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading transaction:', err);
        this.error.set('Failed to load transaction');
        this.isLoading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/finance/transactions']);
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
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

  getTypeClass(type: string): string {
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

  getDirectionClass(direction: string): string {
    const classes: Record<string, string> = {
      inbound: 'bg-green-100 text-green-700',
      outbound: 'bg-red-100 text-red-700',
      internal: 'bg-blue-100 text-blue-700',
    };
    return classes[direction] || 'bg-gray-100 text-gray-700';
  }

  formatType(type: string): string {
    const labels: Record<string, string> = {
      booking_payment: 'Booking Payment',
      milestone_fund: 'Milestone Job Payment',
      timelog_payment: 'Weekly Job Payment',
      milestone_release: 'Milestone Release',
      expert_transfer: 'Expert Transfer',
      withdrawal: 'Withdrawal',
      refund: 'Refund',
      transfer_reversal: 'Transfer Reversal',
      platform_fee: 'Platform Fee',
    };
    return labels[type] || type;
  }

  formatDirection(direction: string): string {
    const labels: Record<string, string> = {
      inbound: 'Inbound (Received)',
      outbound: 'Outbound (Sent)',
      internal: 'Internal Transfer',
    };
    return labels[direction] || direction;
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency || 'MYR',
    }).format(amount);
  }

  formatPercentage(rate: number): string {
    return `${(rate * 100).toFixed(1)}%`;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }
}
