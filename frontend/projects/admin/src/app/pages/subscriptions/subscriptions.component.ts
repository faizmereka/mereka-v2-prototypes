import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe, CurrencyPipe, TitleCasePipe } from '@angular/common';
import {
  SubscriptionsService,
  type Subscription,
  type SubscriptionStats,
  type SubscriptionStatus,
  type PlanCode,
} from './subscriptions.service';

interface SubscriptionProduct {
  id: string;
  name: string;
  code: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  isActive: boolean;
  stripeProductId: string;
  stripePriceId: string;
}

@Component({
  selector: 'app-subscriptions',
  imports: [RouterLink, FormsModule, DecimalPipe, DatePipe, CurrencyPipe, TitleCasePipe],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss',
})
export class SubscriptionsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private subscriptionsService = inject(SubscriptionsService);

  searchQuery = '';
  planFilter: PlanCode | 'all' = 'all';
  currentPage = signal(1);
  pageSize = 10;
  currentStatus = signal<SubscriptionStatus | 'all'>('all');
  activeView = signal<'subscriptions' | 'plans'>('subscriptions');
  showProductModal = signal(false);
  isLoading = signal(false);

  // Data from API
  items = signal<Subscription[]>([]);
  stats = signal<SubscriptionStats | null>(null);
  totalItems = signal(0);
  totalPages = signal(1);

  products = signal<SubscriptionProduct[]>([
    {
      id: 'prod_1',
      name: 'Scale Plan',
      code: 'scale',
      description: 'Perfect for small hubs getting started with Mereka',
      price: 4900,
      currency: 'USD',
      interval: 'month',
      features: ['Up to 5 experiences', 'Up to 3 spaces', 'Basic analytics', 'Email support'],
      isActive: true,
      stripeProductId: 'prod_scale123',
      stripePriceId: 'price_scale123',
    },
    {
      id: 'prod_2',
      name: 'Soar Plan',
      code: 'soar',
      description: 'For growing hubs that need more features and support',
      price: 9900,
      currency: 'USD',
      interval: 'month',
      features: [
        'Unlimited experiences',
        'Unlimited spaces',
        'Advanced analytics',
        'Priority support',
        'Custom branding',
        'API access',
      ],
      isActive: true,
      stripeProductId: 'prod_soar456',
      stripePriceId: 'price_soar456',
    },
    {
      id: 'prod_3',
      name: 'Enterprise Plan',
      code: 'enterprise',
      description: 'Custom solutions for large organizations',
      price: 29900,
      currency: 'USD',
      interval: 'month',
      features: [
        'Everything in Soar',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
        'White-label options',
      ],
      isActive: false,
      stripeProductId: 'prod_ent789',
      stripePriceId: 'price_ent789',
    },
  ]);

  statusTabs = [
    { label: 'All', value: 'all' as const },
    { label: 'Active', value: 'active' as const },
    { label: 'Trialing', value: 'trialing' as const },
    { label: 'Past Due', value: 'past_due' as const },
    { label: 'Cancelled', value: 'cancelled' as const },
  ];

  ngOnInit() {
    const tab = this.route.snapshot.data['tab'];
    if (tab === 'plans') {
      this.activeView.set('plans');
    } else {
      this.activeView.set('subscriptions');
    }
    this.loadStats();
    this.loadSubscriptions();
  }

  loadStats() {
    this.subscriptionsService.getStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.stats.set(response.data);
        }
      },
      error: (err) => {
        console.error('Error loading stats:', err);
      },
    });
  }

  loadSubscriptions() {
    this.isLoading.set(true);
    const params = {
      page: this.currentPage(),
      limit: this.pageSize,
      status: this.currentStatus() !== 'all' ? (this.currentStatus() as SubscriptionStatus) : undefined,
      planCode: this.planFilter !== 'all' ? (this.planFilter as PlanCode) : undefined,
      search: this.searchQuery || undefined,
    };

    this.subscriptionsService.listSubscriptions(params).subscribe({
      next: (response) => {
        if (response.success) {
          this.items.set(response.data.subscriptions);
          this.totalItems.set(response.data.total);
          this.totalPages.set(response.data.totalPages);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading subscriptions:', err);
        this.isLoading.set(false);
      },
    });
  }

  subscriptionStats = computed(() => {
    const s = this.stats();
    if (!s) {
      return [
        { label: 'Total Subscriptions', value: 0, icon: 'credit-card.svg', color: '#E3F2FD', isCurrency: false },
        { label: 'Active', value: 0, icon: 'check-circle.svg', color: '#E8F5E9', isCurrency: false },
        { label: 'Monthly Revenue', value: 0, icon: 'dollar.svg', color: '#FFF3E0', isCurrency: true, currency: 'USD' },
        { label: 'Churn Rate', value: 0, icon: 'trending-down.svg', color: '#FFEBEE', isCurrency: false },
      ];
    }
    return [
      { label: 'Total Subscriptions', value: s.total, icon: 'credit-card.svg', color: '#E3F2FD', isCurrency: false },
      { label: 'Active', value: s.byStatus.active, icon: 'check-circle.svg', color: '#E8F5E9', isCurrency: false },
      {
        label: 'Monthly Revenue',
        value: s.revenue.mrr,
        icon: 'dollar.svg',
        color: '#FFF3E0',
        isCurrency: true,
        currency: s.revenue.currency,
      },
      { label: 'Churn Rate', value: this.calculateChurnRate(), icon: 'trending-down.svg', color: '#FFEBEE', isCurrency: false },
    ];
  });

  calculateChurnRate(): number {
    const s = this.stats();
    if (!s || s.total === 0) return 0;
    return Math.round((s.byStatus.cancelled / s.total) * 100 * 10) / 10;
  }

  filteredItems = computed(() => this.items());

  paginatedItems = computed(() => this.items());

  getScaleCount(): number {
    return this.stats()?.byPlan.scale || 0;
  }

  getSoarCount(): number {
    return this.stats()?.byPlan.soar || 0;
  }

  getScaleRevenue(): number {
    // Estimate based on scale price ($49) * count
    return (this.stats()?.byPlan.scale || 0) * 49;
  }

  getSoarRevenue(): number {
    // Estimate based on soar price ($99) * count
    return (this.stats()?.byPlan.soar || 0) * 99;
  }

  getStatusCount(status: string): number {
    const s = this.stats();
    if (!s) return 0;
    if (status === 'all') return s.total;
    return s.byStatus[status as keyof typeof s.byStatus] || 0;
  }

  setStatus(status: SubscriptionStatus | 'all') {
    this.currentStatus.set(status);
    this.currentPage.set(1);
    this.loadSubscriptions();
  }

  filterItems() {
    this.currentPage.set(1);
    this.loadSubscriptions();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadSubscriptions();
  }

  exportData() {
    console.log('Exporting...');
  }

  viewSubscription(id: string) {
    if (!id) {
      console.error('Subscription ID is missing');
      return;
    }
    console.log('Navigating to subscription:', id);
    this.router.navigate(['/dashboard/subscriptions', id]);
  }

  manageSubscription(stripeId: string) {
    window.open(`https://dashboard.stripe.com/subscriptions/${stripeId}`, '_blank');
  }
}
