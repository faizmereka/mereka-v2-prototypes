import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService, type JobFilters } from '../../services';
import { JobCardComponent } from '../../../../shared/components/job-card';
import { HeaderComponent } from '../../../../shared/components/header';
import { UiFooterComponent } from '@mereka/ui';

interface FilterOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CommonModule, FormsModule, JobCardComponent, HeaderComponent, UiFooterComponent],
  template: `
    <web-header />
    <main class="min-h-screen bg-gray-50">
      <!-- Hero Section -->
      <div class="bg-gradient-to-r from-[#FD87A5] to-[#EE53B1] py-12 lg:py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="text-3xl lg:text-4xl font-bold text-white text-center">
            Job Opportunities
          </h1>
          <p class="mt-3 text-lg text-white/90 text-center max-w-2xl mx-auto">
            Discover opportunities from businesses looking for experts like you
          </p>
        </div>
      </div>

      <!-- Filter Section -->
      <div class="bg-white border-b border-gray-200 sticky top-[70px] lg:top-20 z-40">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex flex-col lg:flex-row lg:items-center gap-4">
            <!-- Search Input -->
            <div class="relative flex-1 max-w-md">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
                placeholder="Search jobs..."
                class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <!-- Filter Buttons -->
            <div class="flex flex-wrap items-center gap-3">
              <!-- Employment Type -->
              <div class="relative">
                <button
                  (click)="toggleFilter('employment')"
                  class="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  [class.border-primary]="selectedEmploymentType()"
                  [class.text-primary]="selectedEmploymentType()"
                >
                  {{ selectedEmploymentType() ? getEmploymentLabel(selectedEmploymentType()!) : 'Employment Type' }}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                @if (showEmploymentFilter()) {
                  <div class="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    @for (option of employmentTypes; track option.id) {
                      <button
                        (click)="setEmploymentType(option.id)"
                        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                        [class.text-primary]="selectedEmploymentType() === option.id"
                        [class.font-medium]="selectedEmploymentType() === option.id"
                      >
                        {{ option.label }}
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Expert Level -->
              <div class="relative">
                <button
                  (click)="toggleFilter('level')"
                  class="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  [class.border-primary]="selectedExpertLevel()"
                  [class.text-primary]="selectedExpertLevel()"
                >
                  {{ selectedExpertLevel() ? getExpertLevelLabel(selectedExpertLevel()!) : 'Expert Level' }}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                @if (showLevelFilter()) {
                  <div class="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    @for (option of expertLevels; track option.id) {
                      <button
                        (click)="setExpertLevel(option.id)"
                        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                        [class.text-primary]="selectedExpertLevel() === option.id"
                        [class.font-medium]="selectedExpertLevel() === option.id"
                      >
                        {{ option.label }}
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Location -->
              <div class="relative">
                <button
                  (click)="toggleFilter('location')"
                  class="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  [class.border-primary]="selectedLocation()"
                  [class.text-primary]="selectedLocation()"
                >
                  {{ selectedLocation() ? getLocationLabel(selectedLocation()!) : 'Location' }}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                @if (showLocationFilter()) {
                  <div class="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    @for (option of locations; track option.id) {
                      <button
                        (click)="setLocation(option.id)"
                        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                        [class.text-primary]="selectedLocation() === option.id"
                        [class.font-medium]="selectedLocation() === option.id"
                      >
                        {{ option.label }}
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Clear Filters -->
              @if (hasActiveFilters()) {
                <button
                  (click)="clearFilters()"
                  class="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                  Clear filters
                </button>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Results Section -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Results Count -->
        <div class="flex items-center justify-between mb-6">
          <p class="text-sm text-gray-600">
            @if (jobService.listLoading()) {
              Loading jobs...
            } @else {
              {{ jobService.pagination().total }} jobs found
            }
          </p>
        </div>

        <!-- Loading State -->
        @if (jobService.listLoading()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div class="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div class="flex items-start gap-3">
                  <div class="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div class="flex-1">
                    <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div class="mt-3 pt-3 border-t border-gray-100">
                  <div class="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div class="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            }
          </div>
        } @else if (jobService.hasJobs()) {
          <!-- Job Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (job of jobService.jobs(); track job._id) {
              <web-job-card [job]="job" />
            }
          </div>

          <!-- Pagination -->
          @if (jobService.pagination().totalPages > 1) {
            <div class="mt-12 flex justify-center">
              <nav class="flex items-center gap-2">
                <button
                  [disabled]="currentPage() === 1"
                  (click)="goToPage(currentPage() - 1)"
                  class="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                @for (page of visiblePages(); track page) {
                  @if (page === '...') {
                    <span class="px-3 py-2 text-gray-400">...</span>
                  } @else {
                    <button
                      (click)="goToPage(+page)"
                      [class.bg-primary]="currentPage() === +page"
                      [class.text-white]="currentPage() === +page"
                      [class.border-gray-200]="currentPage() !== +page"
                      class="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      {{ page }}
                    </button>
                  }
                }

                <button
                  [disabled]="currentPage() === jobService.pagination().totalPages"
                  (click)="goToPage(currentPage() + 1)"
                  class="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </nav>
            </div>
          }
        } @else {
          <!-- Empty State -->
          <div class="text-center py-16">
            <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p class="text-gray-600 mb-6">Try adjusting your filters or check back later for new opportunities</p>
            @if (hasActiveFilters()) {
              <button
                (click)="clearFilters()"
                class="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                Clear all filters
              </button>
            }
          </div>
        }
      </div>
    </main>
    <ui-footer />

    <!-- Click outside to close filters -->
    @if (showEmploymentFilter() || showLevelFilter() || showLocationFilter()) {
      <div class="fixed inset-0 z-30" (click)="closeAllFilters()"></div>
    }
  `,
})
export class JobListPage implements OnInit {
  readonly jobService = inject(JobService);

  searchQuery = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly employmentTypes: FilterOption[] = [
    { id: '', label: 'All types' },
    { id: 'full-time', label: 'Full-time' },
    { id: 'part-time', label: 'Part-time' },
    { id: 'freelance', label: 'Freelance' },
  ];

  readonly expertLevels: FilterOption[] = [
    { id: '', label: 'All levels' },
    { id: 'entry', label: 'Entry Level' },
    { id: 'intermediate', label: 'Intermediate' },
    { id: 'expert', label: 'Expert' },
  ];

  readonly locations: FilterOption[] = [
    { id: '', label: 'All locations' },
    { id: 'remote', label: 'Remote' },
    { id: 'onSite', label: 'On-site' },
    { id: 'hybrid', label: 'Hybrid' },
  ];

  readonly selectedEmploymentType = signal<string | null>(null);
  readonly selectedExpertLevel = signal<string | null>(null);
  readonly selectedLocation = signal<string | null>(null);
  readonly currentPage = signal(1);

  readonly showEmploymentFilter = signal(false);
  readonly showLevelFilter = signal(false);
  readonly showLocationFilter = signal(false);

  readonly hasActiveFilters = computed(() => {
    return (
      !!this.selectedEmploymentType() ||
      !!this.selectedExpertLevel() ||
      !!this.selectedLocation() ||
      !!this.searchQuery
    );
  });

  readonly visiblePages = computed(() => {
    const total = this.jobService.pagination().totalPages;
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (current < total - 2) pages.push('...');
      pages.push(total);
    }

    return pages;
  });

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    const filters: JobFilters = {
      page: this.currentPage(),
      limit: 12,
    };

    if (this.selectedEmploymentType()) {
      filters.employmentType = this.selectedEmploymentType()!;
    }
    if (this.selectedExpertLevel()) {
      filters.expertLevel = this.selectedExpertLevel()!;
    }
    if (this.selectedLocation()) {
      filters.jobLocation = this.selectedLocation()!;
    }
    if (this.searchQuery) {
      filters.search = this.searchQuery;
    }

    this.jobService.getJobs(filters).subscribe();
  }

  onSearchChange(value: string): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadJobs();
    }, 300);
  }

  toggleFilter(filter: 'employment' | 'level' | 'location'): void {
    this.closeAllFilters();
    switch (filter) {
      case 'employment':
        this.showEmploymentFilter.set(true);
        break;
      case 'level':
        this.showLevelFilter.set(true);
        break;
      case 'location':
        this.showLocationFilter.set(true);
        break;
    }
  }

  closeAllFilters(): void {
    this.showEmploymentFilter.set(false);
    this.showLevelFilter.set(false);
    this.showLocationFilter.set(false);
  }

  setEmploymentType(type: string): void {
    this.selectedEmploymentType.set(type || null);
    this.closeAllFilters();
    this.currentPage.set(1);
    this.loadJobs();
  }

  setExpertLevel(level: string): void {
    this.selectedExpertLevel.set(level || null);
    this.closeAllFilters();
    this.currentPage.set(1);
    this.loadJobs();
  }

  setLocation(location: string): void {
    this.selectedLocation.set(location || null);
    this.closeAllFilters();
    this.currentPage.set(1);
    this.loadJobs();
  }

  clearFilters(): void {
    this.selectedEmploymentType.set(null);
    this.selectedExpertLevel.set(null);
    this.selectedLocation.set(null);
    this.searchQuery = '';
    this.currentPage.set(1);
    this.loadJobs();
  }

  getEmploymentLabel(id: string): string {
    return this.employmentTypes.find((t) => t.id === id)?.label || id;
  }

  getExpertLevelLabel(id: string): string {
    return this.expertLevels.find((l) => l.id === id)?.label || id;
  }

  getLocationLabel(id: string): string {
    return this.locations.find((l) => l.id === id)?.label || id;
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadJobs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
