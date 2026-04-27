import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Transaction {
  _id: string;
  description: string;
  weekRange?: string;
  date: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'in_escrow' | 'paid';
  paymentMethod?: {
    brand?: string;
    last4?: string;
  };
  type: 'milestone_funded' | 'milestone_released' | 'timelog_payment' | 'refund';
}

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-neutral-200">
      <div class="p-6 border-b border-neutral-200">
        <h3 class="text-lg font-semibold text-neutral-900">Transaction history</h3>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      } @else if (transactions().length === 0) {
        <div class="p-6 text-center text-neutral-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
          </svg>
          <p>No transactions yet</p>
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-neutral-200 bg-neutral-50">
                <th class="text-left px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Service Details
                </th>
                <th class="text-left px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Date
                </th>
                <th class="text-right px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Amount
                </th>
                <th class="text-left px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Payment Method
                </th>
              </tr>
            </thead>
            <tbody>
              @for (tx of transactions(); track tx._id) {
                <tr class="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td class="px-6 py-4">
                    <p class="font-medium text-neutral-900">{{ tx.description }}</p>
                    @if (tx.weekRange) {
                      <p class="text-sm text-neutral-500">{{ tx.weekRange }}</p>
                    }
                  </td>
                  <td class="px-6 py-4 text-neutral-600">
                    {{ formatDate(tx.date) }}
                  </td>
                  <td class="px-6 py-4 text-right">
                    <p class="font-medium text-neutral-900">
                      {{ tx.currency }} {{ tx.amount | number:'1.2-2' }}
                    </p>
                    <span
                      class="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded"
                      [ngClass]="getStatusClasses(tx.status)"
                    >
                      {{ getStatusLabel(tx.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    @if (tx.paymentMethod) {
                      <div class="flex items-center gap-2">
                        <span class="text-neutral-700 capitalize">{{ tx.paymentMethod.brand }}</span>
                        <span class="text-neutral-500">**** **** **** {{ tx.paymentMethod.last4 }}</span>
                      </div>
                    } @else {
                      <span class="text-neutral-400">-</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class TransactionHistoryComponent {
  transactions = input<Transaction[]>([]);
  isLoading = input<boolean>(false);

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusClasses(status: string): Record<string, boolean> {
    return {
      'bg-green-100 text-green-700': status === 'success' || status === 'paid',
      'bg-blue-100 text-blue-700': status === 'in_escrow',
      'bg-yellow-100 text-yellow-700': status === 'pending',
      'bg-red-100 text-red-700': status === 'failed',
    };
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      success: 'Paid',
      paid: 'Paid',
      in_escrow: 'In Escrow',
      pending: 'Pending',
      failed: 'Failed',
    };
    return labels[status] || status;
  }
}
