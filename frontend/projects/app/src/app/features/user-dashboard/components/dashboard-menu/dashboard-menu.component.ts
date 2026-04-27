import { Component, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { IconComponent, type IconName } from '@mereka/ui';
import { AuthStateService } from '../../../../core/services/auth-state.service';

export interface MenuItem {
  label: string;
  path: string;
  icon: IconName;
  section?: string;
  isExternal?: boolean;
  badge?: number;
}

@Component({
  selector: 'app-dashboard-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './dashboard-menu.component.html',
})
export class DashboardMenuComponent {
  private readonly router = inject(Router);
  private readonly authStateService = inject(AuthStateService);

  readonly menuItems = input<MenuItem[]>([]);
  readonly isMobile = input<boolean>(false);

  readonly mobileContentToggle = output<void>();

  // User info from auth state
  readonly userName = this.authStateService.userName;
  readonly userEmail = this.authStateService.userEmail;
  readonly userProfilePhoto = this.authStateService.userProfilePhoto;
  readonly userInitials = computed(() => {
    const name = this.userName();
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  });

  readonly showHubDropdown = signal(false);
  readonly reviewsCount = signal(3);

  getSectionItems(section: string): MenuItem[] {
    return this.menuItems().filter((item) => item.section === section);
  }

  getUniqueSections(): string[] {
    const sections = this.menuItems().map((item) => item.section).filter(Boolean) as string[];
    return [...new Set(sections)];
  }

  getItemsWithoutSection(): MenuItem[] {
    return this.menuItems().filter((item) => !item.section);
  }

  onMenuClick(item: MenuItem) {
    if (this.isMobile()) {
      this.mobileContentToggle.emit();
    }
    if (item.isExternal) {
      this.router.navigate([item.path]);
    }
  }

  logout(event: Event) {
    event.preventDefault();
    console.log('User dashboard menu logout clicked');
    this.authStateService.logout();
  }
}

