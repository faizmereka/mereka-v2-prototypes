import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardComponent } from '../../shared/ui';
import { SubscriptionsService, type Subscription, type Plan } from './subscriptions.service';

@Component({
  selector: 'app-subscription-detail',
  imports: [DatePipe, CardComponent],
  templateUrl: './subscription-detail.component.html',
  styleUrl: './subscription-detail.component.scss'
})
export class SubscriptionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private subscriptionsService = inject(SubscriptionsService);

  subscription = signal<Subscription | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSubscription(id);
    } else {
      this.error.set('Subscription ID not provided');
      this.isLoading.set(false);
    }
  }

  loadSubscription(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.subscriptionsService.getSubscription(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.subscription.set(response.data);
        } else {
          this.error.set(response.error?.message || 'Failed to load subscription');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading subscription:', err);
        const errorMessage = err.error?.error?.message || err.message || 'Failed to load subscription';
        this.error.set(errorMessage);
        this.isLoading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/subscriptions']);
  }

  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      trialing: 'bg-blue-100 text-blue-700',
      past_due: 'bg-amber-100 text-amber-700',
      cancelled: 'bg-gray-100 text-gray-700',
      expired: 'bg-red-100 text-red-700',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-700';
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount / 100); // Convert cents to dollars
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  openStripeDashboard(stripeId: string): void {
    window.open(`https://dashboard.stripe.com/subscriptions/${stripeId}`, '_blank');
  }

  // Helper method to safely access plan
  getPlan(sub: Subscription | null): Plan | undefined {
    return sub?.plan;
  }

  // Helper method to safely access plan features
  getPlanFeatures(sub: Subscription | null): string[] {
    return sub?.plan?.features || [];
  }
}

