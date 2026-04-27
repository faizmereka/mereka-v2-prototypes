import { Component, signal, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent, type IconName } from '@mereka/ui';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { environment } from '../../../../../environments/environment';

interface SettingsMenuItem {
  label: string;
  path?: string;
  fullPath?: string;  // For absolute paths outside settings
  externalUrl?: string;
  icon: IconName;
}

@Component({
  selector: 'app-hub-settings',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './settings.component.html',
})
export class HubSettingsComponent {
  private readonly authState = inject(AuthStateService);

  readonly loading = signal(false);
  readonly showMobileSidebar = signal(false);

  readonly screenWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);
  readonly isMobile = computed(() => this.screenWidth() < 1024);

  readonly hubSlug = computed(() => this.authState.selectedHub()?.slug || '');
  readonly hubProfileUrl = computed(() => `${environment.webUrl}/hub/${this.hubSlug()}?edit=true`);

  readonly settingsMenuItems = computed<SettingsMenuItem[]>(() => [
    { label: 'Account', path: 'account', icon: 'home' },
    { label: 'Business Profile', externalUrl: this.hubProfileUrl(), icon: 'briefcase' },
    { label: 'Team Members', path: 'members', icon: 'users' },
    { label: 'Reviews', path: 'reviews', icon: 'star' },
    { label: 'Engagement', path: 'engagement', icon: 'heart' },
    { label: 'Transactions', path: 'transactions', icon: 'wallet' },
    { label: 'Subscription', path: 'subscription', icon: 'credit-card' },
    { label: 'Notifications', path: 'notifications', icon: 'bell' },
    { label: 'Communication History', path: 'communication-logs', icon: 'email' },
  ]);

  @HostListener('window:resize')
  onResize() {
    this.screenWidth.set(window.innerWidth);
  }

  toggleMobileSidebar() {
    this.showMobileSidebar.update((v) => !v);
  }

  closeMobileSidebar() {
    this.showMobileSidebar.set(false);
  }
}
