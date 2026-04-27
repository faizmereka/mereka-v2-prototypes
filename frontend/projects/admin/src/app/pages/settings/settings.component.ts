import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  SettingsService,
  SettingsItem,
  SettingsType,
  SettingsStats,
} from '../../core/services/settings.service';
import { DialogService } from '../../shared/dialog';
import { ToastService } from '../../shared/ui';
import {
  SettingsFormDialogComponent,
  SettingsFormDialogData,
  SettingsFormDialogResult,
} from './dialogs/settings-form-dialog.component';

/**
 * Section configuration with display labels and API endpoint mappings
 */
interface Section {
  key: SectionKey;
  apiEndpoint: SettingsType;
  label: string;
  labelSingular: string;
  icon: string;
}

/**
 * Local section keys (camelCase for internal use)
 */
type SectionKey =
  | 'amenities'
  | 'facilities'
  | 'focusAreas'
  | 'skills'
  | 'spaceTypes'
  | 'experienceTypes'
  | 'experienceTopics'
  | 'experienceThemes'
  | 'languages'
  | 'companyTypes'
  | 'targetAudiences'
  | 'jobPreferences';

/**
 * Settings Component
 *
 * Manages all settings collections via the backend API.
 * Uses DialogService for form dialogs and confirmations.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly dialogService = inject(DialogService);
  private readonly toast = inject(ToastService);

  // UI State
  searchQuery = '';
  showInactive = true;
  activeSection = signal<SectionKey>('amenities');

  /**
   * Section configuration - maps local keys to API endpoints
   */
  readonly sections: Section[] = [
    { key: 'amenities', apiEndpoint: 'amenities', label: 'Amenities', labelSingular: 'Amenity', icon: 'amenity.svg' },
    { key: 'facilities', apiEndpoint: 'facilities', label: 'Facilities', labelSingular: 'Facility', icon: 'facility.svg' },
    { key: 'focusAreas', apiEndpoint: 'focus-areas', label: 'Focus Areas', labelSingular: 'Focus Area', icon: 'focus.svg' },
    { key: 'skills', apiEndpoint: 'skills', label: 'Skills', labelSingular: 'Skill', icon: 'skill.svg' },
    { key: 'spaceTypes', apiEndpoint: 'space-types', label: 'Space Types', labelSingular: 'Space Type', icon: 'space.svg' },
    { key: 'experienceTypes', apiEndpoint: 'experience-types', label: 'Experience Types', labelSingular: 'Experience Type', icon: 'experience.svg' },
    { key: 'experienceThemes', apiEndpoint: 'experience-themes', label: 'Experience Themes', labelSingular: 'Experience Theme', icon: 'experience.svg' },
    { key: 'experienceTopics', apiEndpoint: 'experience-topics', label: 'Experience Topics', labelSingular: 'Experience Topic', icon: 'experience.svg' },
    { key: 'languages', apiEndpoint: 'languages', label: 'Languages', labelSingular: 'Language', icon: 'language.svg' },
    { key: 'companyTypes', apiEndpoint: 'company-types', label: 'Company Types', labelSingular: 'Company Type', icon: 'company.svg' },
    { key: 'targetAudiences', apiEndpoint: 'target-audiences', label: 'Target Audiences', labelSingular: 'Target Audience', icon: 'audience.svg' },
    { key: 'jobPreferences', apiEndpoint: 'job-preferences', label: 'Job Preferences', labelSingular: 'Job Preference', icon: 'briefcase.svg' },
  ];

  // Computed: current API endpoint
  readonly currentEndpoint = computed(() => {
    const section = this.sections.find((s) => s.key === this.activeSection());
    return section?.apiEndpoint || 'amenities';
  });

  // Computed: check section types for conditional display
  readonly isTopicsSection = computed(
    () => this.currentEndpoint() === 'experience-topics'
  );

  readonly isSkillsSection = computed(
    () => this.currentEndpoint() === 'skills'
  );

  readonly isLanguagesSection = computed(
    () => this.currentEndpoint() === 'languages'
  );

  // Computed: loading state from service
  readonly loading = computed(() => {
    return this.settingsService.isLoadingCollection(this.currentEndpoint());
  });

  // Computed: error from service
  readonly error = computed(() => {
    const errorMap = this.settingsService['_error']();
    return errorMap.get(this.currentEndpoint()) || null;
  });

  // Computed: items for current section
  readonly items = computed(() => {
    return this.settingsService.getItemsForCollection(this.currentEndpoint());
  });

  // Stats from service
  readonly stats = this.settingsService.stats;
  readonly statsLoading = this.settingsService.statsLoading;

  // Track which endpoints have been loaded
  private readonly loadedEndpoints = new Set<SettingsType>();

  ngOnInit(): void {
    this.loadStats();
    this.loadSectionIfNeeded(this.currentEndpoint());
  }

  /**
   * Load settings stats
   */
  private loadStats(): void {
    this.settingsService.getStats().subscribe({
      error: (err) => console.error('Failed to load stats:', err),
    });
  }

  /**
   * Load data only if not already loaded
   */
  private loadSectionIfNeeded(endpoint: SettingsType): void {
    if (this.loadedEndpoints.has(endpoint)) return;
    this.loadedEndpoints.add(endpoint);
    this.loadData(endpoint);
  }

  /**
   * Load data for a specific endpoint
   */
  private loadData(endpoint: SettingsType): void {
    this.settingsService.getAll(endpoint, true).subscribe({
      error: (err) => console.error(`Failed to load ${endpoint}:`, err),
    });
  }

  /**
   * Reload current section data (force refresh)
   */
  refreshData(): void {
    const endpoint = this.currentEndpoint();
    this.loadedEndpoints.delete(endpoint);
    this.loadSectionIfNeeded(endpoint);
  }

  /**
   * Get active section config
   */
  getActiveSection(): Section | undefined {
    return this.sections.find((s) => s.key === this.activeSection());
  }

  /**
   * Get item count for a section from stats API
   */
  getItemCount(key: SectionKey): number {
    const currentStats = this.stats();
    if (!currentStats) return 0;

    const statsData = currentStats[key as keyof SettingsStats];
    if (statsData && typeof statsData === 'object' && 'total' in statsData) {
      return statsData.total;
    }
    return 0;
  }

  /**
   * Filter items based on search and active status
   */
  filteredItems(): SettingsItem[] {
    let items = this.items();

    if (!this.showInactive) {
      items = items.filter((i) => i.isActive);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.slug?.toLowerCase().includes(query) ||
          i.description?.toLowerCase().includes(query)
      );
    }

    return items;
  }

  /**
   * Open dialog to add new item
   */
  openAddDialog(): void {
    const section = this.getActiveSection();
    if (!section) return;

    const dialogRef = this.dialogService.open<
      SettingsFormDialogComponent,
      SettingsFormDialogData,
      SettingsFormDialogResult
    >(SettingsFormDialogComponent, {
      data: {
        type: section.apiEndpoint,
        item: null,
        label: section.labelSingular,
      },
      width: 'md',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.saved) {
        // Refresh stats after adding
        this.loadStats();
        this.toast.success(`${section.labelSingular} created successfully`);
      }
    });
  }

  /**
   * Open dialog to edit existing item
   */
  editItem(item: SettingsItem): void {
    const section = this.getActiveSection();
    if (!section) return;

    const dialogRef = this.dialogService.open<
      SettingsFormDialogComponent,
      SettingsFormDialogData,
      SettingsFormDialogResult
    >(SettingsFormDialogComponent, {
      data: {
        type: section.apiEndpoint,
        item: item,
        label: section.labelSingular,
      },
      width: 'md',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.saved) {
        this.toast.success(`${section.labelSingular} updated successfully`);
      }
    });
  }

  /**
   * Toggle item active status
   */
  async toggleActive(item: SettingsItem): Promise<void> {
    try {
      await this.settingsService.toggleActiveAsync(
        this.currentEndpoint(),
        item._id,
        !item.isActive
      );
      this.toast.success(`${item.name} ${!item.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Failed to toggle status:', error);
      this.toast.error('Failed to update status');
    }
  }

  /**
   * Delete item with confirmation
   */
  async deleteItem(item: SettingsItem): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      try {
        await this.settingsService.deleteAsync(this.currentEndpoint(), item._id);
        // Refresh stats after deleting
        this.loadStats();
        this.toast.success(`${item.name} deleted successfully`);
      } catch (error) {
        console.error('Failed to delete item:', error);
        this.toast.error('Failed to delete item');
      }
    }
  }

  /**
   * Change active section and load data
   */
  selectSection(key: SectionKey): void {
    this.activeSection.set(key);
    this.searchQuery = '';

    const section = this.sections.find((s) => s.key === key);
    if (section) {
      this.loadSectionIfNeeded(section.apiEndpoint);
      // Note: parentCategory and focusAreaId are populated by backend,
      // so no need to fetch themes/focusAreas separately for display
    }
  }

  /**
   * Get parent theme name for a topic (populated by backend)
   */
  getParentThemeName(item: SettingsItem): string {
    if (!item.parentCategory) return '';
    if (typeof item.parentCategory === 'object') {
      return item.parentCategory.name;
    }
    return ''; // ID only - shouldn't happen if backend populates
  }

  /**
   * Get focus area name for a skill (populated by backend)
   */
  getFocusAreaName(item: SettingsItem): string {
    if (!item.focusAreaId) return '';
    if (typeof item.focusAreaId === 'object') {
      return (item.focusAreaId as { name: string; }).name;
    }
    return ''; // ID only - shouldn't happen if backend populates
  }
}
