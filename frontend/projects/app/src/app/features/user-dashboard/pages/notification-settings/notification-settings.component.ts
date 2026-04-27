import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UserNotificationPreferenceService,
  type PreferenceCategory,
  type PreferenceItem,
  type SummaryFrequency,
} from '../../services/notification-preference.service';

@Component({
  selector: 'app-user-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-settings.component.html',
})
export class UserNotificationSettingsComponent implements OnInit {
  private readonly preferenceService = inject(UserNotificationPreferenceService);

  // User preferences service state
  readonly loading = this.preferenceService.loading;
  readonly saving = this.preferenceService.saving;
  readonly error = this.preferenceService.error;
  readonly categories = this.preferenceService.categories;
  readonly globalMute = this.preferenceService.globalMute;
  readonly summaryFrequency = this.preferenceService.summaryFrequency;

  // Expanded categories
  readonly expandedCategories = signal<Set<string>>(new Set());

  // Summary frequency options
  readonly frequencyOptions: { value: SummaryFrequency; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'never', label: 'Never' },
  ];

  // Computed
  readonly hasCategories = computed(() => this.categories().length > 0);

  async ngOnInit() {
    await this.preferenceService.loadPreferences();
    // Expand first category by default
    if (this.categories().length > 0) {
      this.expandedCategories.set(new Set([this.categories()[0].category]));
    }
  }

  /**
   * Toggle category expansion
   */
  toggleCategory(category: string) {
    this.expandedCategories.update((set) => {
      const newSet = new Set(set);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }

  /**
   * Check if category is expanded
   */
  isCategoryExpanded(category: string): boolean {
    return this.expandedCategories().has(category);
  }

  /**
   * Toggle a specific notification preference
   */
  async togglePreference(
    item: PreferenceItem,
    channel: 'inApp' | 'email' | 'whatsApp',
    event: Event
  ) {
    const checkbox = event.target as HTMLInputElement;
    const enabled = checkbox.checked;

    await this.preferenceService.togglePreference({
      templateId: item.templateId,
      channel,
      enabled,
    });
  }

  /**
   * Toggle global mute
   */
  async toggleGlobalMute(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    await this.preferenceService.updateGlobalMute(checkbox.checked);
  }

  /**
   * Update summary frequency
   */
  async updateFrequency(event: Event) {
    const select = event.target as HTMLSelectElement;
    await this.preferenceService.updateSummaryFrequency(select.value as SummaryFrequency);
  }

  /**
   * Get icon for channel
   */
  getChannelIcon(channel: 'inApp' | 'email' | 'whatsApp'): string {
    switch (channel) {
      case 'inApp':
        return 'bell';
      case 'email':
        return 'mail';
      case 'whatsApp':
        return 'message-circle';
      default:
        return 'bell';
    }
  }

  /**
   * Get channel label
   */
  getChannelLabel(channel: 'inApp' | 'email' | 'whatsApp'): string {
    switch (channel) {
      case 'inApp':
        return 'In-App';
      case 'email':
        return 'Email';
      case 'whatsApp':
        return 'WhatsApp';
      default:
        return channel;
    }
  }
}
