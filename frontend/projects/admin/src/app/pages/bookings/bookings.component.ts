import { Component, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../shared/ui';

type ChartType = 'pie' | 'line';
type ViewMode = 'overview' | 'detailed';
type TimePeriod = 'today' | 'week' | 'month' | 'year';

interface ChartData {
    label: string;
    value: number;
    color: string;
}

interface BreakdownData {
    totalBookings: number;
    physical: number;
    online: number;
    free: number;
    paid: number;
}

interface PaymentStatus {
    succeeded: number;
    incomplete: number;
    failed: number;
    refunded: number;
    uncaptured: number;
}

interface ServiceBooking {
    name: string;
    count: number;
    icon: string;
}

interface HubBooking {
    name: string;
    logo: string;
    count: number;
    revenue: string;
}

@Component({
    selector: 'app-bookings',
    imports: [RouterLink, RouterLinkActive, FormsModule, CardComponent],
    templateUrl: './bookings.component.html',
    styleUrl: './bookings.component.scss'
})
export class BookingsComponent {
    // State
    viewMode = signal<ViewMode>('overview');
    chartType = signal<ChartType>('pie');
    selectedPeriod: TimePeriod = 'month';

    // Mock Data
    breakdown = signal<BreakdownData>({
        totalBookings: 1234,
        physical: 456,
        online: 778,
        free: 234,
        paid: 1000
    });

    paymentStatus = signal<PaymentStatus>({
        succeeded: 980,
        incomplete: 120,
        failed: 45,
        refunded: 34,
        uncaptured: 55
    });

    topServices = signal<ServiceBooking[]>([
        { name: 'Experiences', count: 450, icon: 'icons/directions-run.svg' },
        { name: 'Spaces', count: 380, icon: 'icons/meeting_room.svg' },
        { name: 'Workshops', count: 220, icon: 'icons/laptop.svg' },
        { name: 'Consultations', count: 184, icon: 'icons/person.svg' },
    ]);

    topHubs = signal<HubBooking[]>([
        { name: 'REXKL', logo: 'imgs/Ellipse 51.png', count: 234, revenue: 'RM 12,500' },
        { name: 'TDIH Miri', logo: 'imgs/Ellipse 51 (1).png', count: 189, revenue: 'RM 9,800' },
        { name: 'TDIH Kuching', logo: 'imgs/Ellipse 52 (1).png', count: 156, revenue: 'RM 7,200' },
    ]);

    bookingsChartData = signal<ChartData[]>([
        { label: 'Experiences', value: 450, color: '#1A1623' },
        { label: 'Spaces', value: 380, color: '#4A4453' },
        { label: 'Workshops', value: 220, color: '#7B7B7C' },
        { label: 'Other', value: 184, color: '#B8B8B9' },
    ]);

    salesChartData = signal<ChartData[]>([
        { label: 'Experiences', value: 12500, color: '#1A1623' },
        { label: 'Spaces', value: 9800, color: '#4A4453' },
        { label: 'Workshops', value: 7200, color: '#7B7B7C' },
        { label: 'Other', value: 3500, color: '#B8B8B9' },
    ]);

    // Computed
    bookingsChartTotal = computed(() =>
        this.bookingsChartData().reduce((sum, d) => sum + d.value, 0)
    );

    salesChartTotal = computed(() =>
        this.salesChartData().reduce((sum, d) => sum + d.value, 0).toLocaleString()
    );

    // Methods
    setViewMode(mode: ViewMode) {
        this.viewMode.set(mode);
    }

    setChartType(type: ChartType) {
        this.chartType.set(type);
    }

    onPeriodChange(period: TimePeriod) {
        console.log('Period changed:', period);
        // TODO: Fetch data for selected period
    }

    pieGradient(data: ChartData[]): string {
        const total = data.reduce((sum, d) => sum + d.value, 0);
        let currentAngle = 0;
        const gradientParts: string[] = [];

        for (const item of data) {
            const percentage = (item.value / total) * 100;
            const nextAngle = currentAngle + (percentage * 3.6); // 3.6 = 360/100
            gradientParts.push(`${item.color} ${currentAngle}deg ${nextAngle}deg`);
            currentAngle = nextAngle;
        }

        return `conic-gradient(${gradientParts.join(', ')})`;
    }
}
