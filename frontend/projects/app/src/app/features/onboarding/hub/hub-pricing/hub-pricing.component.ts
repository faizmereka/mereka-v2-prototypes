import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@mereka/ui';
import { SubscriptionService } from '../../services';
import { AuthStateService } from '../../../../core/services';

interface PlanFeature {
  text: string;
  isLink?: boolean;
  linkText?: string;
  linkUrl?: string;
}

interface DisplayPlan {
  id: string;
  planCode: 'scale' | 'soar';
  name: string;
  nameColor: string;
  description: string;
  monthlyPrice: number;
  currency: string;
  features: PlanFeature[];
  buttonColor: string;
}

@Component({
  selector: 'app-hub-pricing',
  imports: [CommonModule, IconComponent],
  templateUrl: './hub-pricing.component.html',
})
export class HubPricingComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly authState = inject(AuthStateService);

  isLoading = signal(false);
  loadingMessage = signal('');
  error = signal('');

  // Hardcoded plans as fallback (API plans may not have full feature lists)
  plans: DisplayPlan[] = [
    {
      id: 'scale',
      planCode: 'scale',
      name: 'Scale',
      nameColor: 'text-blue-600',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      description:
        'For individuals looking to grow their services through a robust set of SAAS features, learning pathways and community resources.',
      monthlyPrice: 20,
      currency: '$',
      features: [
        { text: 'Unlimited Express Experience listings' },
        { text: '3 Platform Experience listings (visible in collections and searches)' },
        { text: 'Unlimited Expertise listings' },
        { text: 'Up to 3 ticket/package tiers per service listing' },
        { text: 'Monthly unlimited withdrawals' },
        { text: 'Learning pathways & space rentals' },
        {
          text: 'Access to',
          isLink: true,
          linkText: 'Mereka Academy resources',
          linkUrl: '#',
        },
        {
          text: 'Discounts to',
          isLink: true,
          linkText: 'Mereka Space bookings resources',
          linkUrl: '#',
        },
      ],
    },
    {
      id: 'soar',
      planCode: 'soar',
      name: 'Soar',
      nameColor: 'text-teal-500',
      buttonColor: 'bg-teal-500 hover:bg-teal-600',
      description:
        'For teams looking for a suite of enterprise-grade tools and support to supercharge your business and streamline how you manage your services.',
      monthlyPrice: 40,
      currency: '$',
      features: [
        { text: 'Unlimited Express & Platform Experience listings, Expertise listings, & Space listings' },
        { text: 'Unlimited ticket/package tiers per service listing' },
        { text: 'Unlimited Hub members' },
        { text: 'Unlimited Team Members with user permissions management' },
        { text: 'Customer success manager' },
        { text: 'Learning pathways & space rentals' },
        {
          text: 'Access to',
          isLink: true,
          linkText: 'Mereka Academy resources',
          linkUrl: '#',
        },
        {
          text: 'Discounts to',
          isLink: true,
          linkText: 'Mereka Space bookings resources',
          linkUrl: '#',
        },
      ],
    },
  ];

  ngOnInit(): void {
    // Try to fetch plans from API and update prices if available
    this.loadPlansFromApi();
  }

  private async loadPlansFromApi(): Promise<void> {
    try {
      const apiPlans = await this.subscriptionService.getPlans();

      // Update prices from API plans
      for (const apiPlan of apiPlans) {
        const displayPlan = this.plans.find(p => p.planCode === apiPlan.planCode);
        if (displayPlan) {
          // Update price from API (API price is in cents)
          displayPlan.monthlyPrice = apiPlan.price / 100;
          displayPlan.currency = apiPlan.currency === 'USD' ? '$' : apiPlan.currency;
        }
      }
    } catch (error) {
      // Use fallback hardcoded plans if API fails
      console.log('Using fallback plans');
    }
  }

  async selectPlan(plan: DisplayPlan): Promise<void> {
    this.isLoading.set(true);
    this.loadingMessage.set('Creating checkout session...');
    this.error.set('');

    try {
      // Get hubId from AuthStateService (selected hub)
      const hubId = this.authState.selectedHub()?.id;

      const currentUrl = window.location.origin;
      const successUrl = `${currentUrl}/onboarding/hub/payment-loader?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${currentUrl}/onboarding/hub/pricing`;

      this.loadingMessage.set('Redirecting to payment page...');

      const session = await this.subscriptionService.createCheckoutSession({
        planCode: plan.planCode,
        successUrl,
        cancelUrl,
        hubId: hubId || undefined,
      });

      // Redirect to Stripe checkout
      window.location.href = session.checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to create checkout session');
      this.isLoading.set(false);
    }
  }

}
