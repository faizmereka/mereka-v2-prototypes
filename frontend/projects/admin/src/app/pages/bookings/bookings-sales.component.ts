import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { CardComponent } from '../../shared/ui';

interface SaleTransaction {
    id: string;
    bookingId: string;
    serviceName: string;
    hubName: string;
    customerName: string;
    date: Date;
    amount: number;
    commission: number;
    netAmount: number;
    status: 'completed' | 'pending' | 'refunded';
    paymentMethod: 'card' | 'bank_transfer' | 'ewallet';
}

interface SalesSummary {
    totalSales: number;
    totalCommission: number;
    totalTransactions: number;
    avgTransactionValue: number;
}

@Component({
    selector: 'app-bookings-sales',
    imports: [FormsModule, DecimalPipe, CurrencyPipe, DatePipe, CardComponent],
    templateUrl: './bookings-sales.component.html',
    styleUrl: './bookings-sales.component.scss'
})
export class BookingsSalesComponent {
    dateRange = 'month';
    statusFilter = 'all';
    paymentFilter = 'all';
    searchQuery = '';
    currentPage = signal(1);
    pageSize = 10;

    transactions = signal<SaleTransaction[]>([
        {
            id: 'TXN001',
            bookingId: 'BK001',
            serviceName: 'Pottery Workshop',
            hubName: 'Creative Hub KL',
            customerName: 'John Doe',
            date: new Date('2024-11-20'),
            amount: 150,
            commission: 15,
            netAmount: 135,
            status: 'completed',
            paymentMethod: 'card'
        },
        {
            id: 'TXN002',
            bookingId: 'BK002',
            serviceName: 'Conference Room A',
            hubName: 'Business Hub',
            customerName: 'Jane Smith',
            date: new Date('2024-11-21'),
            amount: 200,
            commission: 20,
            netAmount: 180,
            status: 'completed',
            paymentMethod: 'bank_transfer'
        },
        {
            id: 'TXN003',
            bookingId: 'BK003',
            serviceName: 'Yoga Class',
            hubName: 'Wellness Center',
            customerName: 'Alice Wong',
            date: new Date('2024-11-22'),
            amount: 80,
            commission: 8,
            netAmount: 72,
            status: 'pending',
            paymentMethod: 'ewallet'
        },
        {
            id: 'TXN004',
            bookingId: 'BK004',
            serviceName: 'Photography Studio',
            hubName: 'Media House',
            customerName: 'Bob Lee',
            date: new Date('2024-11-23'),
            amount: 400,
            commission: 40,
            netAmount: 360,
            status: 'completed',
            paymentMethod: 'card'
        },
        {
            id: 'TXN005',
            bookingId: 'BK005',
            serviceName: 'Marketing Workshop',
            hubName: 'Tech Academy',
            customerName: 'Charlie Brown',
            date: new Date('2024-11-24'),
            amount: 299,
            commission: 30,
            netAmount: 269,
            status: 'refunded',
            paymentMethod: 'card'
        },
    ]);

    summary = computed<SalesSummary>(() => {
        const txs = this.filteredTransactions();
        const total = txs.reduce((sum, tx) => sum + tx.amount, 0);
        const commission = txs.reduce((sum, tx) => sum + tx.commission, 0);
        return {
            totalSales: total,
            totalCommission: commission,
            totalTransactions: txs.length,
            avgTransactionValue: txs.length > 0 ? total / txs.length : 0
        };
    });

    filteredTransactions = computed(() => {
        let result = this.transactions();

        if (this.statusFilter !== 'all') {
            result = result.filter(tx => tx.status === this.statusFilter);
        }

        if (this.paymentFilter !== 'all') {
            result = result.filter(tx => tx.paymentMethod === this.paymentFilter);
        }

        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            result = result.filter(tx =>
                tx.serviceName.toLowerCase().includes(query) ||
                tx.hubName.toLowerCase().includes(query) ||
                tx.customerName.toLowerCase().includes(query) ||
                tx.id.toLowerCase().includes(query)
            );
        }

        return result;
    });

    totalPages = computed(() => Math.ceil(this.filteredTransactions().length / this.pageSize));

    paginatedTransactions = computed(() => {
        const start = (this.currentPage() - 1) * this.pageSize;
        return this.filteredTransactions().slice(start, start + this.pageSize);
    });

    pageStart = computed(() => (this.currentPage() - 1) * this.pageSize + 1);
    pageEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.filteredTransactions().length));

    filterData() {
        this.currentPage.set(1);
    }

    getPaymentLabel(method: string): string {
        const labels: Record<string, string> = {
            card: 'Card',
            bank_transfer: 'Bank',
            ewallet: 'E-Wallet'
        };
        return labels[method] || method;
    }

    exportData() {
        console.log('Exporting sales data...');
    }
}
