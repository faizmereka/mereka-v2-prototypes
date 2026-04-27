import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LottieComponent, AnimationOptions } from 'ngx-lottie';
import { IconComponent } from '@mereka/ui';
import { HubService } from '../../services';
import { AuthStateService } from '../../../../core/services';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-hub-setup',
  imports: [CommonModule, IconComponent, LottieComponent],
  templateUrl: './hub-setup.component.html',
})
export class HubSetupComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly hubService = inject(HubService);
  private readonly authState = inject(AuthStateService);

  selection = signal<'profile' | 'dashboard' | ''>('');
  shareUrl = signal('');
  copied = signal(false);
  isLoading = signal(true);
  planType = signal<'scale' | 'soar' | ''>('');

  completeProfileOptions: AnimationOptions = {
    path: '/assets/lottie/complete-profile.json',
    loop: true,
    autoplay: true,
  };

  dashboardOptions: AnimationOptions = {
    path: '/assets/lottie/dashboard.json',
    loop: true,
    autoplay: true,
  };

  ngOnInit(): void {
    this.loadUserData();
  }

  private async loadUserData(): Promise<void> {
    this.isLoading.set(true);
    try {
      // Get selected hub ID from AuthStateService
      const selectedHubId = this.authState.selectedHub()?.id;

      // Fetch hub profile with subscription
      const data = await this.hubService.getHubProfile({
        hubId: selectedHubId,
        includeSubscription: true,
      });

      const slug = data.hub?.slug || '';
      const planCode = data.subscription?.planCode || '';

      this.planType.set(planCode as 'scale' | 'soar');

      // Build URL based on plan type
      // scale = expert, soar = hub
      if (slug) {
        const webUrl = environment.webUrl;
        if (planCode === 'soar') {
          this.shareUrl.set(`${webUrl}/hub/${slug}`);
        } else {
          // Default to expert for scale plan or any other
          this.shareUrl.set(`${webUrl}/expert/${slug}`);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  selectOption(option: 'profile' | 'dashboard'): void {
    this.selection.set(option);
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.shareUrl());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  navigateToPage(): void {
    const selected = this.selection();
    if (selected === 'profile') {
      this.router.navigate(['/onboarding/hub/profile']);
    } else if (selected === 'dashboard') {
      this.router.navigate(['/hub']);
    }
  }
}
