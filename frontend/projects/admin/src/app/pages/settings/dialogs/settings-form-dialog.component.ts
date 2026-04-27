import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '../../../shared/dialog';
import {
  SettingsService,
  SettingsItem,
  SettingsType,
  CreateSettingsInput,
} from '../../../core/services/settings.service';

/**
 * Data passed to the settings form dialog
 */
export interface SettingsFormDialogData {
  /** The settings type/endpoint */
  type: SettingsType;
  /** Item to edit (null for create) */
  item: SettingsItem | null;
  /** Label for the section (e.g., "Skill", "Amenity") */
  label: string;
}

/**
 * Result returned from the settings form dialog
 */
export interface SettingsFormDialogResult {
  /** Whether the item was saved */
  saved: boolean;
  /** The saved item (if successful) */
  item?: SettingsItem;
}

/**
 * Settings Form Dialog Component
 *
 * Dynamic form for creating/editing settings items.
 * Shows different fields based on the settings type.
 *
 * @example
 * ```typescript
 * const dialogRef = this.dialogService.open(SettingsFormDialogComponent, {
 *   data: {
 *     type: 'skills',
 *     item: existingSkill, // or null for new
 *     label: 'Skill',
 *   },
 *   width: 'md',
 * });
 *
 * dialogRef.afterClosed().subscribe(result => {
 *   if (result?.saved) {
 *     console.log('Saved:', result.item);
 *   }
 * });
 * ```
 */
@Component({
  selector: 'app-settings-form-dialog',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200">
      <h3 class="text-lg font-semibold text-gray-900">
        {{ isEditing() ? 'Edit' : 'Add' }} {{ data.label }}
      </h3>
      <button
        type="button"
        class="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
        (click)="cancel()"
        aria-label="Close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Body -->
    <div class="p-4">
      <div class="flex flex-col gap-4">
        <!-- Error message -->
        @if (error()) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {{ error() }}
          </div>
        }

        <!-- Name field - always shown -->
        <div>
          <label class="block text-sm font-medium mb-2">Name *</label>
          <input
            type="text"
            [(ngModel)]="formData.name"
            class="w-full px-3 py-3 border border-gray-200 rounded-md text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Enter name"
          />
        </div>

        <!-- Parent Theme dropdown - only for Experience Topics -->
        @if (isTopicsSection()) {
          <div>
            <label class="block text-sm font-medium mb-2">Parent Theme *</label>
            <select
              [(ngModel)]="formData.parentCategory"
              class="w-full px-3 py-3 border border-gray-200 rounded-md text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
            >
              <option value="">Select a theme</option>
              @for (theme of availableThemes(); track theme._id) {
                <option [value]="theme._id">{{ theme.name }}</option>
              }
            </select>
          </div>
        }

        <!-- Focus Area dropdown and Type - only for Skills -->
        @if (isSkillsSection()) {
          <div>
            <label class="block text-sm font-medium mb-2">Focus Area *</label>
            <select
              [(ngModel)]="formData.focusAreaId"
              class="w-full px-3 py-3 border border-gray-200 rounded-md text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
            >
              <option value="">Select a focus area</option>
              @for (focusArea of availableFocusAreas(); track focusArea._id) {
                <option [value]="focusArea._id">{{ focusArea.name }}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Skill Type *</label>
            <select
              [(ngModel)]="formData.type"
              class="w-full px-3 py-3 border border-gray-200 rounded-md text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
            >
              <option value="primary">Primary</option>
              <option value="additional">Additional</option>
            </select>
          </div>
        }

        <!-- Code field - only for Languages -->
        @if (isLanguagesSection()) {
          <div>
            <label class="block text-sm font-medium mb-2">ISO Code</label>
            <input
              type="text"
              [(ngModel)]="formData.code"
              class="w-full px-3 py-3 border border-gray-200 rounded-md text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary uppercase"
              placeholder="e.g., EN, MS, ZH"
              maxlength="5"
            />
            <p class="text-xs text-gray-500 mt-1">ISO language code (optional)</p>
          </div>
        }

        <!-- Description field - not for Amenities and Facilities -->
        @if (hasDescriptionField()) {
          <div>
            <label class="block text-sm font-medium mb-2">Description</label>
            <textarea
              [(ngModel)]="formData.description"
              class="w-full px-3 py-3 border border-gray-200 rounded-md text-base resize-vertical min-h-[80px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              rows="3"
              placeholder="Enter description (optional)"
            ></textarea>
          </div>
        }

        <!-- Icon field - only for Focus Areas and Experience Themes -->
        @if (hasIconField()) {
          <div>
            <label class="block text-sm font-medium mb-2">Icon URL</label>
            <input
              type="text"
              [(ngModel)]="formData.icon"
              class="w-full px-3 py-3 border border-gray-200 rounded-md text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="https://example.com/icon.png"
            />
          </div>
        }

        <!-- Priority field - always shown -->
        <div>
          <label class="block text-sm font-medium mb-2">Priority</label>
          <input
            type="number"
            [(ngModel)]="formData.priority"
            class="w-full px-3 py-3 border border-gray-200 rounded-md text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            min="0"
            placeholder="0"
          />
        </div>

        <!-- Active toggle - only when editing -->
        @if (isEditing()) {
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" [(ngModel)]="formData.isActive" class="cursor-pointer w-4 h-4" />
              <span class="text-sm font-medium">Active</span>
            </label>
          </div>
        }
      </div>
    </div>

    <!-- Footer -->
    <div class="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
      <button
        type="button"
        class="px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-sm font-medium"
        [disabled]="isSaving()"
        (click)="cancel()"
      >
        Cancel
      </button>
      <button
        type="button"
        class="px-4 py-2 bg-neutral-900 text-white border-none rounded-md cursor-pointer hover:opacity-90 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        [disabled]="isSaving()"
        (click)="save()"
      >
        @if (isSaving()) {
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Saving...
        } @else {
          Save
        }
      </button>
    </div>
  `,
})
export class SettingsFormDialogComponent implements OnInit {
  private readonly dialogRef = inject<DialogRef<SettingsFormDialogResult>>(DialogRef);
  readonly data = inject<SettingsFormDialogData>(DIALOG_DATA);
  private readonly settingsService = inject(SettingsService);

  // State
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  // Dropdown data
  readonly availableThemes = signal<SettingsItem[]>([]);
  readonly availableFocusAreas = signal<SettingsItem[]>([]);

  // Form data
  formData: CreateSettingsInput & { isActive: boolean } = {
    name: '',
    description: '',
    icon: '',
    priority: 0,
    isActive: true,
    code: '',
    focusAreaId: '',
    type: 'primary',
    parentCategory: '',
  };

  // Computed
  readonly isEditing = computed(() => this.data.item !== null);

  ngOnInit(): void {
    // Populate form if editing
    if (this.data.item) {
      const item = this.data.item;
      this.formData = {
        name: item.name,
        description: item.description || '',
        icon: item.icon || '',
        priority: item.priority || 0,
        isActive: item.isActive,
        code: item.code || '',
        focusAreaId: this.extractId(item.focusAreaId),
        type: item.type || 'primary',
        parentCategory: this.extractId(item.parentCategory),
      };
    }

    // Load related data
    this.loadRelatedData();
  }

  // Section type checks
  isTopicsSection(): boolean {
    return this.data.type === 'experience-topics';
  }

  isSkillsSection(): boolean {
    return this.data.type === 'skills';
  }

  isLanguagesSection(): boolean {
    return this.data.type === 'languages';
  }

  hasDescriptionField(): boolean {
    return !['amenities', 'facilities'].includes(this.data.type);
  }

  hasIconField(): boolean {
    return ['focus-areas', 'experience-themes'].includes(this.data.type);
  }

  /**
   * Save the item
   */
  async save(): Promise<void> {
    // Validation
    if (!this.formData.name.trim()) {
      this.error.set('Name is required');
      return;
    }

    if (this.isTopicsSection() && !this.formData.parentCategory) {
      this.error.set('Parent Theme is required');
      return;
    }

    if (this.isSkillsSection() && !this.formData.focusAreaId) {
      this.error.set('Focus Area is required');
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);

    try {
      const payload = this.buildPayload();
      let savedItem: SettingsItem;

      if (this.data.item) {
        // Update
        savedItem = await this.settingsService.updateAsync(
          this.data.type,
          this.data.item._id,
          { ...payload, isActive: this.formData.isActive }
        );
      } else {
        // Create
        savedItem = await this.settingsService.createAsync(this.data.type, payload);
      }

      this.dialogRef.close({ saved: true, item: savedItem });
    } catch (err: unknown) {
      const error = err as { error?: { message?: string } };
      this.error.set(error.error?.message || 'Failed to save item');
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Cancel and close dialog
   */
  cancel(): void {
    this.dialogRef.close({ saved: false });
  }

  /**
   * Load related data for dropdowns
   */
  private loadRelatedData(): void {
    if (this.isTopicsSection()) {
      this.loadThemes();
    } else if (this.isSkillsSection()) {
      this.loadFocusAreas();
    }
  }

  private loadThemes(): void {
    const cached = this.settingsService.getItemsForCollection('experience-themes');
    if (cached.length > 0) {
      this.availableThemes.set(cached.filter((t) => t.isActive));
      return;
    }

    this.settingsService.getAll('experience-themes', true).subscribe({
      next: (response) => {
        if (response.success) {
          this.availableThemes.set(response.data.filter((t) => t.isActive));
        }
      },
    });
  }

  private loadFocusAreas(): void {
    const cached = this.settingsService.getItemsForCollection('focus-areas');
    if (cached.length > 0) {
      this.availableFocusAreas.set(cached.filter((f) => f.isActive));
      return;
    }

    this.settingsService.getAll('focus-areas', true).subscribe({
      next: (response) => {
        if (response.success) {
          this.availableFocusAreas.set(response.data.filter((f) => f.isActive));
        }
      },
    });
  }

  /**
   * Build payload based on section type
   */
  private buildPayload(): CreateSettingsInput {
    const payload: CreateSettingsInput = {
      name: this.formData.name,
      priority: this.formData.priority,
    };

    if (this.hasDescriptionField()) {
      payload.description = this.formData.description || undefined;
    }

    if (this.hasIconField()) {
      payload.icon = this.formData.icon || undefined;
    }

    if (this.isLanguagesSection()) {
      payload.code = this.formData.code || undefined;
    }

    if (this.isSkillsSection()) {
      payload.focusAreaId = this.formData.focusAreaId;
      payload.type = this.formData.type;
    }

    if (this.isTopicsSection()) {
      payload.parentCategory = this.formData.parentCategory;
    }

    return payload;
  }

  /**
   * Extract ID from object or string
   */
  private extractId(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'object' && value !== null && '_id' in value) {
      return (value as { _id: string })._id;
    }
    return String(value);
  }
}

