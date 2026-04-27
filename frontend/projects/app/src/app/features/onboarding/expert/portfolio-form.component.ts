import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UiButtonComponent,
  UiInputComponent,
  UiTextareaComponent,
  UiPanelComponent,
  UiPanelHeaderComponent,
  UiPanelRowComponent,
  UiPanelRowTitleComponent,
  UiPanelRowDescComponent,
  UiPanelSidebarComponent,
  UiPanelSidebarTitleComponent,
  UiFormOptionalComponent,
  UiChipInputComponent,
  UiUploadImageComponent,
} from '@mereka/ui';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  skills: string[];
  startYear: string;
  endYear: string;
  projectLink: string;
  images: string[];
}

@Component({
  selector: 'app-portfolio-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiButtonComponent,
    UiInputComponent,
    UiTextareaComponent,
    UiPanelComponent,
    UiPanelHeaderComponent,
    UiPanelRowComponent,
    UiPanelRowTitleComponent,
    UiPanelRowDescComponent,
    UiPanelSidebarComponent,
    UiPanelSidebarTitleComponent,
    UiFormOptionalComponent,
    UiChipInputComponent,
    UiUploadImageComponent,
  ],
  template: `
    <div class="space-y-6">
      <ui-panel>
        <ui-panel-header>
          Portfolio
          <button
            headerActions
            type="button"
            (click)="openAddDialog()"
            class="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            + Add Project
          </button>
        </ui-panel-header>
        <ui-panel-row last>
          <ui-panel-row-title>
            Showcase your work <ui-form-optional />
          </ui-panel-row-title>
          <ui-panel-row-desc>
            Add your best projects to show potential clients what you can do.
          </ui-panel-row-desc>

          @if (portfolioItems().length === 0) {
            <!-- Empty State -->
            <div class="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 class="text-gray-900 font-medium mb-1">No projects yet</h3>
              <p class="text-gray-500 text-sm mb-4">Add your first project to showcase your work.</p>
              <ui-button variant="outline" (click)="openAddDialog()">
                Add Project
              </ui-button>
            </div>
          } @else {
            <!-- Portfolio Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for (item of portfolioItems(); track item.id) {
                <div class="bg-white rounded-lg border border-gray-200 overflow-hidden group">
                  <div class="aspect-video bg-gray-100 relative">
                    @if (item.images.length > 0) {
                      <img [src]="item.images[0]" alt="{{ item.title }}" class="w-full h-full object-cover" />
                    } @else {
                      <div class="w-full h-full flex items-center justify-center text-gray-400">
                        <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    }
                    <!-- Overlay Actions -->
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        (click)="editItem(item)"
                        class="p-2 bg-white rounded-full hover:bg-gray-100"
                      >
                        <svg class="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        (click)="deleteItem(item.id)"
                        class="p-2 bg-white rounded-full hover:bg-gray-100"
                      >
                        <svg class="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div class="p-4">
                    <h4 class="font-medium text-gray-900 mb-1 truncate">{{ item.title }}</h4>
                    <p class="text-sm text-gray-500 mb-2">{{ item.startYear }} - {{ item.endYear || 'Present' }}</p>
                    @if (item.skills.length > 0) {
                      <div class="flex flex-wrap gap-1">
                        @for (skill of item.skills.slice(0, 3); track skill) {
                          <span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {{ skill }}
                          </span>
                        }
                        @if (item.skills.length > 3) {
                          <span class="px-2 py-0.5 text-gray-400 text-xs">
                            +{{ item.skills.length - 3 }} more
                          </span>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <ui-panel-sidebar>
            <ui-panel-sidebar-title>
              <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707z" />
              </svg>
              Tips
            </ui-panel-sidebar-title>
            <ul class="text-sm text-gray-600 space-y-2">
              <li>Include high-quality images</li>
              <li>Add relevant skills used</li>
              <li>Link to live projects when possible</li>
              <li>Show your best and most recent work</li>
            </ul>
          </ui-panel-sidebar>
        </ui-panel-row>
      </ui-panel>

      <!-- Add/Edit Dialog -->
      @if (showDialog()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ editingItem() ? 'Edit Project' : 'Add Project' }}
              </h3>
              <button
                type="button"
                (click)="closeDialog()"
                class="text-gray-400 hover:text-gray-600"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Project Title</label>
                <ui-input
                  [(ngModel)]="formData.title"
                  placeholder="Enter project title"
                  [maxLength]="70"
                />
                <p class="mt-1 text-xs text-gray-400 text-right">{{ formData.title.length }} / 70</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Skills Used</label>
                <ui-chip-input
                  [(ngModel)]="formData.skills"
                  placeholder="Type skill and press Enter"
                  [maxChips]="10"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Start Year</label>
                  <ui-input
                    [(ngModel)]="formData.startYear"
                    type="text"
                    placeholder="YYYY"
                    [maxLength]="4"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">End Year</label>
                  <ui-input
                    [(ngModel)]="formData.endYear"
                    type="text"
                    placeholder="YYYY or leave empty"
                    [maxLength]="4"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <ui-textarea
                  [(ngModel)]="formData.description"
                  placeholder="Describe your project..."
                  [rows]="4"
                  [maxLength]="500"
                />
                <p class="mt-1 text-xs text-gray-400 text-right">{{ formData.description.length }} / 500</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Project Link (Optional)</label>
                <ui-input
                  [(ngModel)]="formData.projectLink"
                  type="url"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Images</label>
                <ui-upload-image
                  [multiple]="true"
                  displayType="cover"
                  (loadedMultiple)="onImagesUploaded($event)"
                >
                  <ui-button variant="outline" size="sm">Upload Images</ui-button>
                </ui-upload-image>
              </div>
            </div>

            <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <ui-button variant="outline" (click)="closeDialog()">Cancel</ui-button>
              <ui-button (click)="saveProject()">Save</ui-button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PortfolioFormComponent {
  portfolioItems = signal<PortfolioItem[]>([]);
  showDialog = signal(false);
  editingItem = signal<PortfolioItem | null>(null);

  formData = {
    title: '',
    description: '',
    skills: [] as string[],
    startYear: '',
    endYear: '',
    projectLink: '',
    images: [] as string[],
  };

  openAddDialog() {
    this.resetForm();
    this.editingItem.set(null);
    this.showDialog.set(true);
  }

  editItem(item: PortfolioItem) {
    this.editingItem.set(item);
    this.formData = { ...item };
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.resetForm();
  }

  deleteItem(id: string) {
    this.portfolioItems.update((items) => items.filter((i) => i.id !== id));
  }

  saveProject() {
    const editing = this.editingItem();
    if (editing) {
      this.portfolioItems.update((items) =>
        items.map((item) =>
          item.id === editing.id ? { ...item, ...this.formData } : item
        )
      );
    } else {
      const newItem: PortfolioItem = {
        id: Date.now().toString(),
        ...this.formData,
      };
      this.portfolioItems.update((items) => [...items, newItem]);
    }
    this.closeDialog();
  }

  onImagesUploaded(files: { preview: string }[]) {
    this.formData.images = files.map((f) => f.preview);
  }

  private resetForm() {
    this.formData = {
      title: '',
      description: '',
      skills: [],
      startYear: '',
      endYear: '',
      projectLink: '',
      images: [],
    };
  }
}
