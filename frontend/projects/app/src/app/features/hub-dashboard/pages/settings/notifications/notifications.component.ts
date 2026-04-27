import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HubNotificationPreferenceService,
  type HubPreferenceCategory,
  type HubPreferenceItem,
  type HubSummaryFrequency,
} from '../../../services/hub-notification-preference.service';

@Component({
  selector: 'app-hub-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.component.html',
})
export class HubNotificationSettingsComponent implements OnInit {
  private readonly preferenceService = inject(HubNotificationPreferenceService);

  // Service state
  readonly loading = this.preferenceService.loading;
  readonly saving = this.preferenceService.saving;
  readonly error = this.preferenceService.error;
  readonly categories = this.preferenceService.categories;
  readonly notifyOwner = this.preferenceService.notifyOwner;
  readonly notifyAdmins = this.preferenceService.notifyAdmins;
  readonly summaryFrequency = this.preferenceService.summaryFrequency;

  // Expanded categories
  readonly expandedCategories = signal<Set<string>>(new Set());

  // Summary frequency options
  readonly frequencyOptions: { value: HubSummaryFrequency; label: string }[] = [
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
    item: HubPreferenceItem,
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
   * Toggle notify owner setting
   */
  async toggleNotifyOwner(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    await this.preferenceService.updateNotifyOwner(checkbox.checked);
  }

  /**
   * Toggle notify admins setting
   */
  async toggleNotifyAdmins(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    await this.preferenceService.updateNotifyAdmins(checkbox.checked);
  }

  /**
   * Update summary frequency
   */
  async updateFrequency(event: Event) {
    const select = event.target as HTMLSelectElement;
    await this.preferenceService.updateSummaryFrequency(select.value as HubSummaryFrequency);
  }
}
