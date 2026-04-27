import { Component, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Transaction {
  id: string;
  experienceName: string;
  experienceType: 'Online' | 'Physical';
  hostName: string;
  date: string;
  time: string;
  ticketCount: number;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  paymentMethod: string;
  paymentBrand?: string;
  paymentLast4?: string;
}

@Component({
  selector: 'app-user-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './transactions.component.html',
})
export class UserTransactionsComponent {
  readonly loading = signal(false);
  readonly searchText = signal('');
  readonly showFilter = signal(false);

  // Mock data - will be replaced with API call
  readonly transactions = signal<Transaction[]>([
    {
      id: '1',
      experienceName: 'Photography Workshop',
      experienceType: 'Physical',
      hostName: 'Creative Studios',
      date: 'Dec 15, 2024',
      time: '10:00 AM',
      ticketCount: 2,
      amount: 200,
      currency: 'RM',
      status: 'completed',
      paymentMethod: 'Card',
      paymentBrand: 'Visa',
      paymentLast4: '4242',
    },
    {
      id: '2',
      experienceName: 'Cooking Class - Italian Cuisine',
      experienceType: 'Physical',
      hostName: 'Chef Marco',
      date: 'Dec 10, 2024',
      time: '2:00 PM',
      ticketCount: 1,
      amount: 150,
      currency: 'RM',
      status: 'completed',
      paymentMethod: 'Card',
      paymentBrand: 'Mastercard',
      paymentLast4: '5555',
    },
    {
      id: '3',
      experienceName: 'Online Yoga Session',
      experienceType: 'Online',
      hostName: 'Zen Wellness',
      date: 'Dec 8, 2024',
      time: '7:00 AM',
      ticketCount: 1,
      amount: 50,
      currency: 'RM',
      status: 'pending',
      paymentMethod: 'FPX',
    },
    {
      id: '4',
      experienceName: 'Art Workshop',
      experienceType: 'Physical',
      hostName: 'Art Gallery KL',
      date: 'Dec 5, 2024',
      time: '3:00 PM',
      ticketCount: 1,
      amount: 120,
      currency: 'RM',
      status: 'refunded',
      paymentMethod: 'Card',
      paymentBrand: 'Visa',
      paymentLast4: '4242',
    },
  ]);

  readonly filteredTransactions = computed(() => {
    let result = this.transactions();

    const search = this.searchText().toLowerCase();
    if (search) {
      result = result.filter(
        (t) =>
          t.experienceName.toLowerCase().includes(search) ||
          t.hostName.toLowerCase().includes(search)
      );
    }

    return result;
  });

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  toggleFilter() {
    this.showFilter.update((v) => !v);
  }

  viewDetails(transaction: Transaction) {
    console.log('View details', transaction);
  }

  printReceipt(transaction: Transaction) {
    console.log('Print receipt', transaction);
  }
}
