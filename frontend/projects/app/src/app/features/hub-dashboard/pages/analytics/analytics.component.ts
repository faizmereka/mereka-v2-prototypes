import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StatCard {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: string;
}

interface TopService {
  name: string;
  type: 'experience' | 'expertise';
  bookings: number;
  revenue: number;
  rating: number;
}

interface RecentActivity {
  id: string;
  type: 'booking' | 'review' | 'payout' | 'member';
  title: string;
  description: string;
  time: string;
}

@Component({
  selector: 'app-hub-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
})
export class HubAnalyticsComponent {
  readonly loading = signal(false);
  readonly selectedPeriod = signal<'7d' | '30d' | '90d' | '12m'>('30d');
  readonly currency = signal('RM');

  readonly periods: { value: '7d' | '30d' | '90d' | '12m'; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '12m', label: 'Last 12 months' },
  ];

  readonly statCards = signal<StatCard[]>([
    {
      label: 'Total Revenue',
      value: 'RM 45,680.00',
      change: 12.5,
      changeLabel: 'vs last period',
      icon: 'wallet',
    },
    {
      label: 'Total Bookings',
      value: '328',
      change: 8.3,
      changeLabel: 'vs last period',
      icon: 'calendar',
    },
    {
      label: 'Active Services',
      value: '24',
      change: 4.2,
      changeLabel: 'vs last period',
      icon: 'briefcase',
    },
    {
      label: 'Average Rating',
      value: '4.8',
      change: 0.2,
      changeLabel: 'vs last period',
      icon: 'star',
    },
  ]);

  readonly monthlyRevenue = signal([
    { month: 'Jan', value: 3200 },
    { month: 'Feb', value: 2800 },
    { month: 'Mar', value: 3500 },
    { month: 'Apr', value: 4100 },
    { month: 'May', value: 3800 },
    { month: 'Jun', value: 4500 },
    { month: 'Jul', value: 5200 },
    { month: 'Aug', value: 4800 },
    { month: 'Sep', value: 5500 },
    { month: 'Oct', value: 6200 },
    { month: 'Nov', value: 5800 },
    { month: 'Dec', value: 4680 },
  ]);

  readonly bookingsByType = signal([
    { type: 'Experiences', count: 215, percentage: 65.5 },
    { type: 'Expertise', count: 113, percentage: 34.5 },
  ]);

  readonly topServices = signal<TopService[]>([
    {
      name: 'Photography Workshop - Beginner to Pro',
      type: 'experience',
      bookings: 48,
      revenue: 12000,
      rating: 4.9,
    },
    {
      name: 'Business Strategy Consultation',
      type: 'expertise',
      bookings: 42,
      revenue: 14700,
      rating: 4.8,
    },
    {
      name: 'Cooking Class: Malaysian Cuisine',
      type: 'experience',
      bookings: 38,
      revenue: 6840,
      rating: 4.9,
    },
    {
      name: 'Career Mentoring Session',
      type: 'expertise',
      bookings: 35,
      revenue: 7000,
      rating: 4.7,
    },
    {
      name: 'Pottery Making Masterclass',
      type: 'experience',
      bookings: 32,
      revenue: 6400,
      rating: 4.8,
    },
  ]);

  readonly recentActivity = signal<RecentActivity[]>([
    {
      id: '1',
      type: 'booking',
      title: 'New Booking',
      description: 'Ahmad Ibrahim booked Photography Workshop',
      time: '5 minutes ago',
    },
    {
      id: '2',
      type: 'review',
      title: 'New Review',
      description: 'Lisa Chen left a 5-star review for Business Strategy Consultation',
      time: '15 minutes ago',
    },
    {
      id: '3',
      type: 'payout',
      title: 'Payout Completed',
      description: 'RM 3,500.00 has been transferred to your bank account',
      time: '1 hour ago',
    },
    {
      id: '4',
      type: 'booking',
      title: 'New Booking',
      description: 'Priya Kumar booked Cooking Class: Malaysian Cuisine',
      time: '2 hours ago',
    },
    {
      id: '5',
      type: 'member',
      title: 'New Team Member',
      description: 'David Tan accepted your invitation',
      time: '3 hours ago',
    },
    {
      id: '6',
      type: 'review',
      title: 'New Review',
      description: 'Kevin Ooi left a 4-star review for Career Mentoring Session',
      time: '5 hours ago',
    },
  ]);

  readonly maxRevenueValue = computed(() => {
    return Math.max(...this.monthlyRevenue().map((m) => m.value));
  });

  setPeriod(period: '7d' | '30d' | '90d' | '12m'): void {
    this.selectedPeriod.set(period);
  }

  getBarHeight(value: number): number {
    const max = this.maxRevenueValue();
    return (value / max) * 100;
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'booking':
        return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
      case 'review':
        return 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z';
      case 'payout':
        return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z';
      case 'member':
        return 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getActivityIconBgClass(type: string): string {
    switch (type) {
      case 'booking':
        return 'bg-blue-100 text-blue-600';
      case 'review':
        return 'bg-yellow-100 text-yellow-600';
      case 'payout':
        return 'bg-green-100 text-green-600';
      case 'member':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  }

  getServiceTypeClass(type: string): string {
    switch (type) {
      case 'experience':
        return 'bg-blue-100 text-blue-800';
      case 'expertise':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }
}
