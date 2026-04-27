import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import {
  ServicesService,
  Experience,
  Expertise,
  ExperienceStats,
  ExpertiseStats,
  ExperienceStatus,
  ExpertiseStatus,
  ServicesTabStats,
} from './services.service';
import { DialogService } from '../../shared/dialog';
import { ToastService, AvatarComponent } from '../../shared/ui';

type ServiceTab = 'experiences' | 'expertise';
type ExperienceFilterTab = 'all' | ExperienceStatus;
type ExpertiseFilterTab = 'all' | ExpertiseStatus;

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule, DatePipe, NgClass, AvatarComponent],
  templateUrl: './services.component.html',
})
export class ServicesComponent implements OnInit {
  private readonly servicesService = inject(ServicesService);
  private readonly dialogService = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  // Active tab (experiences or expertise)
  activeServiceTab = signal<ServiceTab>('experiences');

  // Tab stats for counts
  tabStats = signal<ServicesTabStats | null>(null);
  tabStatsLoaded = signal(false); // Lazy loading flag for tab stats

  // Experience state
  experiences = signal<Experience[]>([]);
  experienceStats = signal<ExperienceStats | null>(null);
  experienceLoading = signal(false);
  experienceFilter = signal<ExperienceFilterTab>('all');
  experiencePage = signal(1);
  experienceStatsLoaded = signal(false); // Lazy loading flag

  // Expertise state
  expertises = signal<Expertise[]>([]);
  expertiseStats = signal<ExpertiseStats | null>(null);
  expertiseLoading = signal(false);
  expertiseFilter = signal<ExpertiseFilterTab>('all');
  expertisePage = signal(1);
  expertiseStatsLoaded = signal(false); // Lazy loading flag

  // Common state
  searchQuery = signal('');
  pageSize = signal(20);
  totalPages = signal(1);
  totalItems = signal(0);
  showActionsMenu = signal(false);
  activeRowMenu = signal<string | null>(null);
  showFilters = signal(false);
  dateFrom = signal<string>('');
  dateTo = signal<string>('');

  // Selection
  selectedIds = signal<Set<string>>(new Set());

  // Filter tabs
  experienceFilterTabs: { label: string; value: ExperienceFilterTab; color?: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'ACTIVE', color: 'text-green-600' },
    { label: 'Draft', value: 'DRAFTED', color: 'text-amber-600' },
    { label: 'Expired', value: 'EXPIRED', color: 'text-gray-500' },
  ];

  expertiseFilterTabs: { label: string; value: ExpertiseFilterTab; color?: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Published', value: 'published', color: 'text-green-600' },
    { label: 'Draft', value: 'draft', color: 'text-amber-600' },
    { label: 'Archived', value: 'archived', color: 'text-gray-500' },
  ];

  // Computed
  hasSelection = computed(() => this.selectedIds().size > 0);
  allSelected = computed(() => {
    const items =
      this.activeServiceTab() === 'experiences' ? this.experiences() : this.expertises();
    const ids = items.map((i) => i._id);
    return ids.length > 0 && ids.every((id) => this.selectedIds().has(id));
  });
  paginationStart = computed(() =>
    this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1,
  );
  paginationEnd = computed(() => Math.min(this.currentPage() * this.pageSize(), this.totalItems()));
  hasActiveFilters = computed(() => this.dateFrom() || this.dateTo());
  currentPage = computed(() =>
    this.activeServiceTab() === 'experiences' ? this.experiencePage() : this.expertisePage(),
  );

  ngOnInit() {
    // Load tab stats first (for tab counts)
    this.loadTabStats();

    // Subscribe to route data changes to handle tab switching via URL
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      const routeTab = data['tab'] as ServiceTab | undefined;
      if (routeTab && routeTab !== this.activeServiceTab()) {
        this.activeServiceTab.set(routeTab);
        this.selectedIds.set(new Set());
        this.searchQuery.set('');
      }
      this.loadDataForCurrentTab();
    });

    // Setup debounced search
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.resetPage();
        this.loadCurrentTab();
      });
  }

  loadTabStats(force = false) {
    // Skip if already loaded unless forced (e.g., after status change)
    if (this.tabStatsLoaded() && !force) {
      return;
    }

    this.servicesService.getTabStats().subscribe({
      next: (response) => {
        this.tabStats.set(response.data);
        this.tabStatsLoaded.set(true);
      },
      error: (err) => {
        console.error('Failed to load tab stats:', err);
      },
    });
  }

  private loadDataForCurrentTab() {
    if (this.activeServiceTab() === 'expertise') {
      if (!this.expertiseStatsLoaded()) {
        this.loadExpertiseStats();
        this.expertiseStatsLoaded.set(true);
      }
      this.loadExpertises();
    } else {
      if (!this.experienceStatsLoaded()) {
        this.loadExperienceStats();
        this.experienceStatsLoaded.set(true);
      }
      this.loadExperiences();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setServiceTab(tab: ServiceTab) {
    // Navigate to the tab route - the route subscription will handle data loading
    this.router.navigate(['/dashboard/services', tab === 'experiences' ? 'experiences' : 'expertise'], {
      replaceUrl: true,
    });
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  loadExperienceStats() {
    this.servicesService.getExperienceStats().subscribe({
      next: (response) => {
        this.experienceStats.set(response.data);
      },
      error: (err) => {
        console.error('Failed to load experience stats:', err);
      },
    });
  }

  loadExpertiseStats() {
    this.servicesService.getExpertiseStats().subscribe({
      next: (response) => {
        this.expertiseStats.set(response.data);
      },
      error: (err) => {
        console.error('Failed to load expertise stats:', err);
      },
    });
  }

  loadExperiences() {
    this.experienceLoading.set(true);
    const filter = this.experienceFilter();

    this.servicesService
      .listExperiences({
        page: this.experiencePage(),
        limit: this.pageSize(),
        status: filter === 'all' ? undefined : (filter as ExperienceStatus),
        search: this.searchQuery() || undefined,
        dateFrom: this.dateFrom() || undefined,
        dateTo: this.dateTo() || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      .subscribe({
        next: (response) => {
          this.experiences.set(response.data);
          this.totalPages.set(response.meta?.totalPages || 1);
          this.totalItems.set(response.meta?.total || 0);
          this.experienceLoading.set(false);
        },
        error: (err) => {
          this.experienceLoading.set(false);
          this.toast.error('Failed to load experiences');
          console.error('Failed to load experiences:', err);
        },
      });
  }

  loadExpertises() {
    this.expertiseLoading.set(true);
    const filter = this.expertiseFilter();

    this.servicesService
      .listExpertises({
        page: this.expertisePage(),
        limit: this.pageSize(),
        status: filter === 'all' ? undefined : (filter as ExpertiseStatus),
        search: this.searchQuery() || undefined,
        dateFrom: this.dateFrom() || undefined,
        dateTo: this.dateTo() || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      .subscribe({
        next: (response) => {
          this.expertises.set(response.data);
          this.totalPages.set(response.meta?.totalPages || 1);
          this.totalItems.set(response.meta?.total || 0);
          this.expertiseLoading.set(false);
        },
        error: (err) => {
          this.expertiseLoading.set(false);
          this.toast.error('Failed to load expertises');
          console.error('Failed to load expertises:', err);
        },
      });
  }

  loadCurrentTab() {
    if (this.activeServiceTab() === 'experiences') {
      this.loadExperiences();
    } else {
      this.loadExpertises();
    }
  }

  setExperienceFilter(filter: ExperienceFilterTab) {
    this.experienceFilter.set(filter);
    this.experiencePage.set(1);
    this.selectedIds.set(new Set());
    this.loadExperiences();
  }

  setExpertiseFilter(filter: ExpertiseFilterTab) {
    this.expertiseFilter.set(filter);
    this.expertisePage.set(1);
    this.selectedIds.set(new Set());
    this.loadExpertises();
  }

  setDateRange(from: string, to: string) {
    this.dateFrom.set(from);
    this.dateTo.set(to);
    this.resetPage();
    this.loadCurrentTab();
  }

  clearFilters() {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.searchQuery.set('');
    this.resetPage();
    this.loadCurrentTab();
  }

  toggleFilters() {
    this.showFilters.update((v) => !v);
  }

  resetPage() {
    if (this.activeServiceTab() === 'experiences') {
      this.experiencePage.set(1);
    } else {
      this.expertisePage.set(1);
    }
  }

  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const items =
      this.activeServiceTab() === 'experiences' ? this.experiences() : this.expertises();
    if (checked) {
      this.selectedIds.set(new Set(items.map((i) => i._id)));
    } else {
      this.selectedIds.set(new Set());
    }
  }

  toggleSelect(id: string) {
    const selected = new Set(this.selectedIds());
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    this.selectedIds.set(selected);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleActionsMenu() {
    this.showActionsMenu.update((v) => !v);
  }

  toggleRowActions(id: string) {
    this.activeRowMenu.update((current) => (current === id ? null : id));
  }

  navigateToDetail(id: string) {
    if (this.activeServiceTab() === 'experiences') {
      this.router.navigate(['/dashboard/services/experiences', id]);
    } else {
      this.router.navigate(['/dashboard/services/expertise', id]);
    }
  }

  // Experience actions
  async updateExperienceStatus(experience: Experience, newStatus: ExperienceStatus) {
    const statusLabels: Record<ExperienceStatus, string> = {
      ACTIVE: 'Active',
      DRAFTED: 'Draft',
      DELETED: 'Deleted',
      EXPIRED: 'Expired',
    };

    const confirmed = await this.dialogService.confirm({
      title: `Change Status to ${statusLabels[newStatus]}`,
      message: `Are you sure you want to change "${experience.experienceTitle}" status to ${statusLabels[newStatus]}?`,
      type: newStatus === 'DELETED' ? 'danger' : 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.servicesService.updateExperienceStatus(experience._id, newStatus).subscribe({
      next: () => {
        this.experiences.update((items) =>
          items.map((i) =>
            i._id === experience._id
              ? { ...i, status: newStatus, isFeatured: newStatus === 'DELETED' ? false : i.isFeatured }
              : i,
          ),
        );
        this.toast.success(`Experience status updated to ${statusLabels[newStatus]}`);
        this.loadExperienceStats();
        this.loadTabStats(true);
        this.activeRowMenu.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }

  async toggleExperienceFeatured(experience: Experience) {
    const action = experience.isFeatured ? 'remove from featured' : 'make featured';
    const confirmed = await this.dialogService.confirm({
      title: experience.isFeatured ? 'Remove Featured' : 'Make Featured',
      message: `Are you sure you want to ${action} "${experience.experienceTitle}"?`,
      type: 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.servicesService.toggleExperienceFeatured(experience._id).subscribe({
      next: () => {
        this.experiences.update((items) =>
          items.map((i) => (i._id === experience._id ? { ...i, isFeatured: !i.isFeatured } : i)),
        );
        this.toast.success(
          experience.isFeatured ? 'Experience removed from featured' : 'Experience is now featured',
        );
        this.loadExperienceStats();
        this.loadTabStats(true);
        this.activeRowMenu.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update featured status');
      },
    });
  }

  async deleteExperience(experience: Experience) {
    const confirmed = await this.dialogService.confirm({
      title: 'Delete Experience',
      message: `Are you sure you want to delete "${experience.experienceTitle}"?`,
      type: 'danger',
      confirmText: 'Delete',
    });

    if (!confirmed) return;

    this.servicesService.deleteExperience(experience._id).subscribe({
      next: () => {
        this.experiences.update((items) =>
          items.map((i) =>
            i._id === experience._id ? { ...i, status: 'DELETED' as ExperienceStatus } : i,
          ),
        );
        this.toast.success('Experience deleted successfully');
        this.loadExperienceStats();
        this.loadTabStats(true);
        this.activeRowMenu.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to delete experience');
      },
    });
  }

  // Expertise actions
  async updateExpertiseStatus(expertise: Expertise, newStatus: ExpertiseStatus) {
    const statusLabels: Record<ExpertiseStatus, string> = {
      draft: 'Draft',
      published: 'Published',
      archived: 'Archived',
    };

    const confirmed = await this.dialogService.confirm({
      title: `Change Status to ${statusLabels[newStatus]}`,
      message: `Are you sure you want to change "${expertise.expertiseTitle}" status to ${statusLabels[newStatus]}?`,
      type: newStatus === 'archived' ? 'danger' : 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.servicesService.updateExpertiseStatus(expertise._id, newStatus).subscribe({
      next: () => {
        this.expertises.update((items) =>
          items.map((i) => (i._id === expertise._id ? { ...i, status: newStatus } : i)),
        );
        this.toast.success(`Expertise status updated to ${statusLabels[newStatus]}`);
        this.loadExpertiseStats();
        this.loadTabStats(true);
        this.activeRowMenu.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }

  async toggleExpertiseDisabled(expertise: Expertise) {
    const action = expertise.isDisabled ? 'enable' : 'disable';
    const confirmed = await this.dialogService.confirm({
      title: expertise.isDisabled ? 'Enable Expertise' : 'Disable Expertise',
      message: `Are you sure you want to ${action} "${expertise.expertiseTitle}"?`,
      type: 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.servicesService.toggleExpertiseDisabled(expertise._id).subscribe({
      next: () => {
        this.expertises.update((items) =>
          items.map((i) => (i._id === expertise._id ? { ...i, isDisabled: !i.isDisabled } : i)),
        );
        this.toast.success(expertise.isDisabled ? 'Expertise enabled' : 'Expertise disabled');
        this.loadExpertiseStats();
        this.loadTabStats(true);
        this.activeRowMenu.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to toggle disabled status');
      },
    });
  }

  async deleteExpertise(expertise: Expertise) {
    const confirmed = await this.dialogService.confirm({
      title: 'Delete Expertise',
      message: `Are you sure you want to permanently delete "${expertise.expertiseTitle}"?`,
      type: 'danger',
      confirmText: 'Delete',
    });

    if (!confirmed) return;

    this.servicesService.deleteExpertise(expertise._id).subscribe({
      next: () => {
        this.expertises.update((items) => items.filter((i) => i._id !== expertise._id));
        this.totalItems.update((t) => t - 1);
        this.toast.success('Expertise deleted successfully');
        this.loadExpertiseStats();
        this.loadTabStats(true);
        this.activeRowMenu.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to delete expertise');
      },
    });
  }

  // Bulk actions
  async bulkUpdateExperienceStatus(status: ExperienceStatus) {
    const count = this.selectedIds().size;
    const selectedIds = [...this.selectedIds()];
    const statusLabels: Record<ExperienceStatus, string> = {
      ACTIVE: 'Active',
      DRAFTED: 'Draft',
      DELETED: 'Deleted',
      EXPIRED: 'Expired',
    };

    const confirmed = await this.dialogService.confirm({
      title: `Bulk Update to ${statusLabels[status]}`,
      message: `Are you sure you want to change ${count} experience(s) to ${statusLabels[status]}?`,
      type: status === 'DELETED' ? 'danger' : 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.servicesService.bulkUpdateExperienceStatus(selectedIds, status).subscribe({
      next: (response) => {
        this.experiences.update((items) =>
          items.map((i) =>
            selectedIds.includes(i._id)
              ? { ...i, status, isFeatured: status === 'DELETED' ? false : i.isFeatured }
              : i,
          ),
        );
        this.toast.success(`${response.data.modifiedCount} experiences updated`);
        this.selectedIds.set(new Set());
        this.showActionsMenu.set(false);
        this.loadExperienceStats();
        this.loadTabStats(true);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to bulk update');
      },
    });
  }

  async bulkUpdateExpertiseStatus(status: ExpertiseStatus) {
    const count = this.selectedIds().size;
    const selectedIds = [...this.selectedIds()];
    const statusLabels: Record<ExpertiseStatus, string> = {
      draft: 'Draft',
      published: 'Published',
      archived: 'Archived',
    };

    const confirmed = await this.dialogService.confirm({
      title: `Bulk Update to ${statusLabels[status]}`,
      message: `Are you sure you want to change ${count} expertise(s) to ${statusLabels[status]}?`,
      type: status === 'archived' ? 'danger' : 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.servicesService.bulkUpdateExpertiseStatus(selectedIds, status).subscribe({
      next: (response) => {
        this.expertises.update((items) =>
          items.map((i) => (selectedIds.includes(i._id) ? { ...i, status } : i)),
        );
        this.toast.success(`${response.data.modifiedCount} expertises updated`);
        this.selectedIds.set(new Set());
        this.showActionsMenu.set(false);
        this.loadExpertiseStats();
        this.loadTabStats(true);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to bulk update');
      },
    });
  }

  // Pagination
  prevPage() {
    if (this.currentPage() > 1) {
      if (this.activeServiceTab() === 'experiences') {
        this.experiencePage.update((p) => p - 1);
        this.loadExperiences();
      } else {
        this.expertisePage.update((p) => p - 1);
        this.loadExpertises();
      }
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      if (this.activeServiceTab() === 'experiences') {
        this.experiencePage.update((p) => p + 1);
        this.loadExperiences();
      } else {
        this.expertisePage.update((p) => p + 1);
        this.loadExpertises();
      }
    }
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.resetPage();
    this.loadCurrentTab();
  }

  // Helpers
  getExperienceStatusColor(status: string): string {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      DRAFTED: 'bg-amber-100 text-amber-700',
      EXPIRED: 'bg-gray-100 text-gray-500',
      DELETED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  }

  getExpertiseStatusColor(status: string): string {
    const colors: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      draft: 'bg-amber-100 text-amber-700',
      archived: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      Physical: 'bg-blue-100 text-blue-700',
      Virtual: 'bg-purple-100 text-purple-700',
      Hybrid: 'bg-indigo-100 text-indigo-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  }

  formatStatus(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  getTicketPrice(item: Experience | Expertise): string {
    if ('ticket' in item && item.ticket && item.ticket.length > 0) {
      const ticket = item.ticket[0];
      if ('ticketPrice' in ticket) {
        return `${item.currency} ${ticket.ticketPrice}`;
      }
      if ('standardRate' in ticket) {
        return `${item.currency} ${ticket.standardRate}`;
      }
    }
    return 'Free';
  }

  // Experience priority editing
  editingPriorityId = signal<string | null>(null);
  editingPriorityValue = signal<number>(1000);

  startEditPriority(experience: Experience, event: Event) {
    event.stopPropagation();
    this.editingPriorityId.set(experience._id);
    this.editingPriorityValue.set(experience.priority || 1000);
  }

  cancelEditPriority() {
    this.editingPriorityId.set(null);
  }

  savePriority(experience: Experience) {
    const newPriority = this.editingPriorityValue();
    if (newPriority === experience.priority) {
      this.editingPriorityId.set(null);
      return;
    }

    this.servicesService.updateExperiencePriority(experience._id, newPriority).subscribe({
      next: () => {
        this.experiences.update((items) =>
          items.map((i) => (i._id === experience._id ? { ...i, priority: newPriority } : i)),
        );
        this.toast.success('Priority updated');
        this.editingPriorityId.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update priority');
      },
    });
  }

  onPriorityKeydown(event: KeyboardEvent, experience: Experience) {
    if (event.key === 'Enter') {
      this.savePriority(experience);
    } else if (event.key === 'Escape') {
      this.cancelEditPriority();
    }
  }
}
