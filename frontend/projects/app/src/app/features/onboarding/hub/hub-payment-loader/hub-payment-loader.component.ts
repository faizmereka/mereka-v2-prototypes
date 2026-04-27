import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LottieComponent, AnimationOptions } from 'ngx-lottie';
import { IconComponent } from '@mereka/ui';
import { SubscriptionService } from '../../services';

@Component({
  selector: 'app-hub-payment-loader',
  imports: [CommonModule, IconComponent, LottieComponent],
  templateUrl: './hub-payment-loader.component.html',
})
export class HubPaymentLoaderComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly platformId = inject(PLATFORM_ID);

  status = signal<'processing' | 'success' | 'error'>('processing');
  message = signal('Saving your payment details ...');
  errorMessage = signal('');

  lottieOptions: AnimationOptions = {
    path: '/assets/lottie/saving-payment.json',
    loop: true,
    autoplay: true,
  };

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.verifyPayment();
    }
  }

  private async verifyPayment(): Promise<void> {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');

    if (!sessionId) {
      this.status.set('error');
      this.message.set('Payment verification failed');
      this.errorMessage.set('No session ID found. Please try again.');
      return;
    }

    // Retry configuration: 10 seconds total (5 attempts * 2 seconds), then force create
    const maxAttempts = 5;
    const retryDelay = 2000; // 2 seconds between retries

    this.message.set('Verifying payment details...');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const isLastAttempt = attempt === maxAttempts;
        const elapsedSeconds = (attempt - 1) * 2;

        // Update message
        if (attempt > 1) {
          this.message.set(`Confirming your subscription... (${elapsedSeconds}s)`);
        } else {
          this.message.set('Confirming your subscription...');
        }

        // On last attempt, force create subscription from Stripe
        const subscription = await this.subscriptionService.verifyCheckoutSession(
          sessionId,
          isLastAttempt // forceCreate on last attempt
        );

        if (subscription) {
          // Success!
          this.status.set('success');
          this.message.set('Payment successful!');

          // Clear session_id from URL
          window.history.replaceState({}, '', '/onboarding/hub/payment-loader');

          // Redirect to setup page after brief success message
          await this.delay(2000);
          this.router.navigate(['/onboarding/hub/setup']);
          return;
        }

        // Subscription not found, wait before retrying (unless last attempt)
        if (!isLastAttempt) {
          await this.delay(retryDelay);
        }
      } catch (error) {
        console.error(`Payment verification attempt ${attempt} failed:`, error);

        // On last attempt, show error
        if (attempt === maxAttempts) {
          this.status.set('error');
          this.message.set('Payment verification failed');
          this.errorMessage.set(
            error instanceof Error ? error.message : 'An error occurred while verifying your payment.'
          );
          return;
        }

        // Wait before retrying
        await this.delay(retryDelay);
      }
    }

    // All attempts exhausted
    this.status.set('error');
    this.message.set('Payment verification timed out');
    this.errorMessage.set(
      'Could not verify your payment after 10 seconds. Please contact support if you were charged.'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  retryPayment(): void {
    this.router.navigate(['/onboarding/hub/pricing']);
  }
}
