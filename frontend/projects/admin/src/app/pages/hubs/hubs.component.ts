import { Component, OnInit, OnDestroy, signal, inject, computed, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, TitleCasePipe, NgClass } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { HubsService, Hub, HubStats, HubStatus, Plan } from './hubs.service';
import { DialogService } from '../../shared/dialog';
import { ToastService, AvatarComponent } from '../../shared/ui';

type FilterTab = 'all' | HubStatus;

@Component({
  selector: 'app-hubs',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, TitleCasePipe, NgClass, AvatarComponent],
  templateUrl: './hubs.component.html',
})
export class HubsComponent implements OnInit, OnDestroy {
  private readonly hubsService = inject(HubsService);
  private readonly dialogService = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  // State
  hubs = signal<Hub[]>([]);
  stats = signal<HubStats | null>(null);
  loading = signal(false);
  searchQuery = signal('');
  activeFilter = signal<FilterTab>('all');
  selectedPlan = signal<string>('');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  currentPage = signal(1);
  pageSize = signal(20);
  totalPages = signal(1);
  totalItems = signal(0);
  showActionsMenu = signal(false);
  activeRowMenu = signal<string | null>(null);
  showFilters = signal(false);

  // Selection
  selectedHubIds = signal<Set<string>>(new Set());

  filterTabs: { label: string; value: FilterTab; color?: string; }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active', color: 'text-green-600' },
    { label: 'Pending Review', value: 'pending_review', color: 'text-amber-600' },
    { label: 'Approved', value: 'approved', color: 'text-blue-600' },
    { label: 'Rejected', value: 'rejected', color: 'text-red-600' },
    { label: 'Draft', value: 'draft', color: 'text-gray-500' },
  ];

  // Dynamic plan options loaded from API (lazy loaded)
  planOptions = signal<{ label: string; value: string; }[]>([{ label: 'All Plans', value: '' }]);
  plansLoaded = signal(false);

  // Computed
  hasSelection = computed(() => this.selectedHubIds().size > 0);
  allSelected = computed(() => {
    const hubIds = this.hubs().map((h) => h._id);
    return hubIds.length > 0 && hubIds.every((id) => this.selectedHubIds().has(id));
  });
  paginationStart = computed(() => (this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1));
  paginationEnd = computed(() => Math.min(this.currentPage() * this.pageSize(), this.totalItems()));
  hasActiveFilters = computed(() => this.selectedPlan() || this.dateFrom() || this.dateTo());

  ngOnInit() {
    this.loadStats();
    this.loadHubs();

    // Setup debounced search
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.loadHubs();
      });
  }

  // Lazy load plans when filter dropdown is clicked
  onPlanFilterFocus() {
    if (!this.plansLoaded()) {
      this.loadPlans();
    }
  }

  loadPlans() {
    if (this.plansLoaded()) return;

    this.hubsService.getPlans().subscribe({
      next: (response) => {
        const activePlans = response.data
          .filter((p) => p.status === 'active')
          .map((p) => ({ label: p.name, value: p.planCode }));

        // Add 'Free' option if not in the plans list (for hubs without subscription)
        const hasFree = activePlans.some((p) => p.value === 'free');
        const options = [
          { label: 'All Plans', value: '' },
          ...(hasFree ? [] : [{ label: 'Free', value: 'free' }]),
          ...activePlans,
        ];
        this.planOptions.set(options);
        this.plansLoaded.set(true);
      },
      error: (err) => {
        console.error('Failed to load plans:', err);
        // Keep default options on error
      },
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  loadStats() {
    this.hubsService.getStats().subscribe({
      next: (response) => {
        this.stats.set(response.data);
      },
      error: (err) => {
        console.error('Failed to load hub stats:', err);
      },
    });
  }

  loadHubs() {
    this.loading.set(true);
    const filter = this.activeFilter();

    this.hubsService
      .listHubs({
        page: this.currentPage(),
        limit: this.pageSize(),
        status: filter === 'all' ? undefined : filter,
        search: this.searchQuery() || undefined,
        plan: this.selectedPlan() || undefined,
        dateFrom: this.dateFrom() || undefined,
        dateTo: this.dateTo() || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      .subscribe({
        next: (response) => {
          this.hubs.set(response.data);
          this.totalPages.set(response.meta?.totalPages || 1);
          this.totalItems.set(response.meta?.total || 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error('Failed to load hubs');
          console.error('Failed to load hubs:', err);
        },
      });
  }

  setFilter(filter: FilterTab) {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
    this.selectedHubIds.set(new Set());
    this.loadHubs();
  }

  setPlanFilter(plan: string) {
    this.selectedPlan.set(plan);
    this.currentPage.set(1);
    this.loadHubs();
  }

  setDateRange(from: string, to: string) {
    this.dateFrom.set(from);
    this.dateTo.set(to);
    this.currentPage.set(1);
    this.loadHubs();
  }

  clearFilters() {
    this.selectedPlan.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadHubs();
  }

  toggleFilters() {
    this.showFilters.update((v) => !v);
  }

  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedHubIds.set(new Set(this.hubs().map((h) => h._id)));
    } else {
      this.selectedHubIds.set(new Set());
    }
  }

  toggleSelect(hubId: string) {
    const selected = new Set(this.selectedHubIds());
    if (selected.has(hubId)) {
      selected.delete(hubId);
    } else {
      selected.add(hubId);
    }
    this.selectedHubIds.set(selected);
  }

  isSelected(hubId: string): boolean {
    return this.selectedHubIds().has(hubId);
  }

  toggleActionsMenu() {
    this.showActionsMenu.update((v) => !v);
  }

  toggleRowActions(hubId: string) {
    this.activeRowMenu.update((current) => (current === hubId ? null : hubId));
  }

  navigateToHub(hubId: string) {
    this.router.navigate(['/dashboard/hubs', hubId]);
  }

  async updateStatus(hub: Hub, newStatus: HubStatus) {
    const statusLabels: Record<HubStatus, string> = {
      draft: 'Draft',
      pending_review: 'Pending Review',
      approved: 'Approved',
      active: 'Active',
      rejected: 'Rejected',
      inactive: 'Inactive',
    };

    const confirmed = await this.dialogService.confirm({
      title: `Change Status to ${statusLabels[newStatus]}`,
      message: `Are you sure you want to change "${hub.name}" status to ${statusLabels[newStatus]}?`,
      type: newStatus === 'rejected' || newStatus === 'inactive' ? 'danger' : 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.hubsService.updateStatus(hub._id, newStatus).subscribe({
      next: () => {
        // Optimistic update - update local state instead of reloading
        this.hubs.update((hubs) =>
          hubs.map((h) =>
            h._id === hub._id
              ? {
                ...h,
                status: newStatus,
                isFeatured: newStatus === 'rejected' || newStatus === 'inactive' ? false : h.isFeatured,
              }
              : h
          )
        );
        this.toast.success(`Hub status updated to ${statusLabels[newStatus]}`);
        this.loadStats(); // Only reload stats for counts
        this.activeRowMenu.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }

  async toggleFeatured(hub: Hub) {
    const action = hub.isFeatured ? 'remove from featured' : 'make featured';
    const confirmed = await this.dialogService.confirm({
      title: hub.isFeatured ? 'Remove Featured' : 'Make Featured',
      message: `Are you sure you want to ${action} "${hub.name}"?`,
      type: 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.hubsService.toggleFeatured(hub._id).subscribe({
      next: () => {
        // Optimistic update - toggle featured locally
        this.hubs.update((hubs) =>
          hubs.map((h) => (h._id === hub._id ? { ...h, isFeatured: !h.isFeatured } : h))
        );
        this.toast.success(hub.isFeatured ? 'Hub removed from featured' : 'Hub is now featured');
        this.loadStats(); // Only reload stats for counts
        this.activeRowMenu.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update featured status');
      },
    });
  }

  async deleteHub(hub: Hub) {
    const confirmed = await this.dialogService.confirm({
      title: 'Delete Hub',
      message: `Are you sure you want to delete "${hub.name}"? This will set the hub to inactive.`,
      type: 'danger',
      confirmText: 'Delete',
    });

    if (!confirmed) return;

    this.hubsService.deleteHub(hub._id).subscribe({
      next: () => {
        // Optimistic update - update hub status locally instead of removing
        this.hubs.update((hubs) =>
          hubs.map((h) =>
            h._id === hub._id ? { ...h, status: 'inactive' as HubStatus, isActive: false, isFeatured: false } : h
          )
        );
        this.totalItems.update((t) => t - 1);
        this.toast.success('Hub deleted successfully');
        this.loadStats(); // Only reload stats for counts
        this.activeRowMenu.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to delete hub');
      },
    });
  }

  async bulkUpdateStatus(status: HubStatus) {
    const count = this.selectedHubIds().size;
    const selectedIds = [...this.selectedHubIds()];
    const statusLabels: Record<HubStatus, string> = {
      draft: 'Draft',
      pending_review: 'Pending Review',
      approved: 'Approved',
      active: 'Active',
      rejected: 'Rejected',
      inactive: 'Inactive',
    };

    const confirmed = await this.dialogService.confirm({
      title: `Bulk Update to ${statusLabels[status]}`,
      message: `Are you sure you want to change ${count} hub(s) to ${statusLabels[status]}?`,
      type: status === 'rejected' || status === 'inactive' ? 'danger' : 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.hubsService.bulkUpdateStatus(selectedIds, status).subscribe({
      next: (response) => {
        // Optimistic update - update all selected hubs locally
        this.hubs.update((hubs) =>
          hubs.map((h) =>
            selectedIds.includes(h._id)
              ? {
                ...h,
                status,
                isActive: status === 'active' || status === 'approved',
                isFeatured: status === 'rejected' || status === 'inactive' ? false : h.isFeatured,
              }
              : h
          )
        );
        this.toast.success(`${response.data.modifiedCount} hubs updated`);
        this.selectedHubIds.set(new Set());
        this.showActionsMenu.set(false);
        this.loadStats(); // Only reload stats for counts
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to bulk update');
      },
    });
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadHubs();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadHubs();
    }
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadHubs();
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      approved: 'bg-blue-100 text-blue-700',
      pending_review: 'bg-amber-100 text-amber-700',
      rejected: 'bg-red-100 text-red-700',
      draft: 'bg-gray-100 text-gray-600',
      inactive: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  }

  getPlanColor(plan?: string): string {
    if (!plan || plan === 'Free') return 'bg-gray-100 text-gray-600';
    const colors: Record<string, string> = {
      Scale: 'bg-blue-100 text-blue-700',
      Soar: 'bg-purple-100 text-purple-700',
      scale: 'bg-blue-100 text-blue-700',
      soar: 'bg-purple-100 text-purple-700',
    };
    return colors[plan] || 'bg-indigo-100 text-indigo-700';
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  // Track which hub is being edited for order
  editingOrderHubId = signal<string | null>(null);
  editingOrderValue = signal<number>(1000);

  startEditOrder(hub: Hub, event: Event) {
    event.stopPropagation();
    this.editingOrderHubId.set(hub._id);
    this.editingOrderValue.set(hub.displayOrder || 1000);
  }

  cancelEditOrder() {
    this.editingOrderHubId.set(null);
  }

  saveOrder(hub: Hub) {
    const newOrder = this.editingOrderValue();
    if (newOrder === hub.displayOrder) {
      this.editingOrderHubId.set(null);
      return;
    }

    this.hubsService.updateOrder(hub._id, newOrder).subscribe({
      next: () => {
        // Update local state
        this.hubs.update((hubs) =>
          hubs.map((h) => (h._id === hub._id ? { ...h, displayOrder: newOrder } : h))
        );
        this.toast.success('Display order updated');
        this.editingOrderHubId.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update order');
      },
    });
  }

  onOrderInputKeydown(event: KeyboardEvent, hub: Hub) {
    if (event.key === 'Enter') {
      this.saveOrder(hub);
    } else if (event.key === 'Escape') {
      this.cancelEditOrder();
    }
  }
}
