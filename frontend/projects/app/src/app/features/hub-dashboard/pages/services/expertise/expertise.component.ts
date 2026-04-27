import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExpertiseApiService, type Expertise as ApiExpertise } from '../../../../../core/services/expertise-api.service';
import { environment } from '../../../../../../environments/environment';
import { HasPermissionDirective } from '../../../../../core/directives/has-permission.directive';
import { PermissionService } from '../../../../../core/services/permission.service';

type ServiceStatus = 'active' | 'draft' | 'pending' | 'unlisted' | 'inactive' | 'archived';
type SortField = 'title' | 'expert' | 'mode' | 'createdDate' | 'modifiedDate' | 'price' | 'status';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'active' | 'inactive' | 'drafted';

interface SidebarFilter {
  id: FilterType;
  label: string;
  hasInfo?: boolean;
}

interface Expertise {
  id: string;
  title: string;
  expert: string;
  expertId: string;
  image: string | null;
  price: number;
  currency: string;
  mode: 'online' | 'offline' | 'both';
  status: ServiceStatus;
  createdDate: Date;
  modifiedDate: Date;
  isDisabled?: boolean;
  slug?: string;
  isSelected?: boolean;
}

@Component({
  selector: 'app-hub-expertise',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HasPermissionDirective],
  templateUrl: './expertise.component.html',
})
export class HubExpertiseComponent implements OnInit {
  private readonly expertiseApi = inject(ExpertiseApiService);
  private readonly router = inject(Router);
  readonly permissions = inject(PermissionService);

  readonly loading = signal(false);
  readonly searchText = signal('');
  readonly sortBy = signal<SortField>('createdDate');
  readonly sortType = signal<SortDirection>('desc');
  readonly selectAllExpertise = signal(false);
  readonly showActionsDropdown = signal<string | null>(null);
  readonly showMobileFilter = signal(false);
  readonly showExportDropdown = signal(false);

  // Sidebar filter
  readonly activeFilter = signal<FilterType>('all');
  readonly sidebarFilters: SidebarFilter[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'drafted', label: 'Drafted' },
    { id: 'inactive', label: 'Inactive', hasInfo: true },
  ];

  // Pagination
  readonly currentPage = signal(1);
  readonly recordsPerPage = signal(20);
  readonly totalItems = signal(0);

  // Data
  readonly expertiseList = signal<Expertise[]>([]);

  // Computed: client-side filtering for search (API handles status filter)
  readonly filteredData = computed(() => {
    let data = [...this.expertiseList()];

    // Apply search filter (client-side)
    const search = this.searchText().toLowerCase();
    if (search) {
      data = data.filter(
        (exp) =>
          exp.title.toLowerCase().includes(search) || exp.expert.toLowerCase().includes(search)
      );
    }

    // Apply sorting (client-side)
    const field = this.sortBy();
    const direction = this.sortType();
    data.sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'expert':
          comparison = a.expert.localeCompare(b.expert);
          break;
        case 'mode':
          comparison = a.mode.localeCompare(b.mode);
          break;
        case 'createdDate':
          comparison = a.createdDate.getTime() - b.createdDate.getTime();
          break;
        case 'modifiedDate':
          comparison = a.modifiedDate.getTime() - b.modifiedDate.getTime();
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return direction === 'asc' ? comparison : -comparison;
    });

    return data;
  });

  readonly totalPages = computed(() =>
    Math.ceil(this.totalItems() / this.recordsPerPage())
  );

  // Table headers with sort configuration
  readonly tableHeaders = [
    { title: 'Title', sortableKey: 'title' as SortField, isSortable: true },
    { title: 'Expert', sortableKey: 'expert' as SortField, isSortable: true },
    { title: 'Mode', sortableKey: 'mode' as SortField, isSortable: true },
    { title: 'Created', sortableKey: 'createdDate' as SortField, isSortable: true },
    { title: 'Modified', sortableKey: 'modifiedDate' as SortField, isSortable: true },
    { title: 'Price', sortableKey: 'price' as SortField, isSortable: true },
    { title: 'Status', sortableKey: 'status' as SortField, isSortable: true },
    { title: '', sortableKey: '' as SortField, isSortable: false },
  ];

  ngOnInit(): void {
    this.loadExpertise();
  }

  async loadExpertise(): Promise<void> {
    this.loading.set(true);
    try {
      const filter = this.activeFilter();
      const params: { status?: string; isDisabled?: boolean; page: number; limit: number } = {
        page: this.currentPage(),
        limit: this.recordsPerPage(),
      };

      // Map filter to API params
      if (filter === 'active') {
        params.status = 'ACTIVE';
      } else if (filter === 'drafted') {
        params.status = 'DRAFTED';
      } else if (filter === 'inactive') {
        params.status = 'DELETED';
      }

      const result = await this.expertiseApi.list(params);

      // Map API response to component interface
      const mapped = result.expertises.map((exp: ApiExpertise) => this.mapExpertise(exp));
      this.expertiseList.set(mapped);
      this.totalItems.set(result.total);
    } catch (error) {
      console.error('Error loading expertise:', error);
      this.expertiseList.set([]);
      this.totalItems.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  private mapExpertise(exp: ApiExpertise): Expertise {
    // Get first ticket price or 0
    const firstTicket = exp.ticket?.[0];
    const price = firstTicket?.standardRate || 0;

    // Get host name
    const hostName = exp.host?.name || 'No Host';

    // Get mode from first ticket
    const mode = firstTicket?.expertiseMode || 'online';

    // Map API status to UI status
    let status: ServiceStatus = 'active';
    if (exp.status === 'draft') {
      status = 'draft';
    } else if (exp.status === 'archived') {
      status = 'archived';
    } else if (exp.status === 'published') {
      status = 'active';
    }

    return {
      id: exp._id || '',
      title: exp.expertiseTitle,
      expert: hostName,
      expertId: exp.host?.id || '',
      image: exp.coverPhoto || null,
      price,
      currency: exp.currency || 'MYR',
      mode: mode as 'online' | 'offline' | 'both',
      status,
      createdDate: exp.createdAt ? new Date(exp.createdAt) : new Date(),
      modifiedDate: exp.updatedAt ? new Date(exp.updatedAt) : new Date(),
      isDisabled: exp.isDisabled,
      slug: exp.slug,
    };
  }

  getItemsCountString(): string {
    const selectedItems = this.filteredData().filter((d) => d.isSelected).length;
    const total = this.filteredData().length;
    return total > 0 ? `${selectedItems} - ${total} of ${this.totalItems()} item(s)` : '0 item';
  }

  searchByServiceName(text: string): void {
    this.searchText.set(text);
  }

  sortServiceData(field: SortField): void {
    if (!field) return;
    if (this.sortBy() === field) {
      this.sortType.update((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(field);
      this.sortType.set('asc');
    }
  }

  toggleSelectAll(): void {
    this.selectAllExpertise.update((v) => !v);
    const isSelected = this.selectAllExpertise();
    this.expertiseList.update((list) => list.map((e) => ({ ...e, isSelected })));
  }

  setFilter(filter: FilterType): void {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
    this.loadExpertise();
  }

  openMobileFilters(): void {
    this.showMobileFilter.set(true);
  }

  closeMobileFilters(): void {
    this.showMobileFilter.set(false);
  }

  clearFilters(): void {
    this.activeFilter.set('all');
    this.searchText.set('');
    this.showMobileFilter.set(false);
    this.loadExpertise();
  }

  applyFilters(): void {
    this.showMobileFilter.set(false);
  }

  toggleActionsDropdown(id: string): void {
    if (this.showActionsDropdown() === id) {
      this.showActionsDropdown.set(null);
    } else {
      this.showActionsDropdown.set(id);
    }
  }

  closeActionsDropdown(): void {
    this.showActionsDropdown.set(null);
  }

  toggleExportDropdown(): void {
    this.showExportDropdown.update((v) => !v);
  }

  closeExportDropdown(): void {
    this.showExportDropdown.set(false);
  }

  // Status colors
  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-[rgba(52,168,83,0.3)] text-black';
      case 'draft':
        return 'bg-[#1A1623] text-white';
      case 'pending':
      case 'under review':
        return 'bg-[rgba(250,196,33,0.3)] text-black';
      case 'unlisted':
        return 'bg-[rgba(158,158,158,0.3)] text-black/40';
      case 'inactive':
      case 'archived':
        return 'bg-[#F7BFAF] text-black';
      default:
        return 'bg-neutral-100 text-black';
    }
  }

  getStatusLabel(exp: Expertise): string {
    if (exp.status === 'pending') return 'under review';
    return exp.status;
  }

  getModeLabel(mode: string): string {
    switch (mode) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'In-person';
      case 'both':
        return 'Online & In-person';
      default:
        return mode;
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatPrice(exp: Expertise): string {
    return `${exp.currency} ${exp.price.toFixed(2)}`;
  }

  handlePageChange(page: number): void {
    this.currentPage.set(page);
    this.loadExpertise();
  }

  // Actions
  manageExpertise(exp: Expertise): void {
    this.router.navigate(['/hub/services/expertise', exp.id, 'manage']);
  }

  editExpertise(exp: Expertise): void {
    this.router.navigate(['/onboarding/expertise', exp.id, 'your-expertise']);
  }

  duplicateExpertise(exp: Expertise): void {
    console.log('Duplicate:', exp.id);
  }

  viewExpertise(exp: Expertise): void {
    if (exp.slug) {
      window.open(`${environment.webUrl}/expertise/${exp.slug}`, '_blank');
    }
  }

  shareExpertise(exp: Expertise): void {
    if (exp.slug) {
      const url = `${environment.webUrl}/expertise/${exp.slug}`;
      navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  }

  toggleList(exp: Expertise): void {
    const newStatus: ServiceStatus = exp.status === 'unlisted' ? 'active' : 'unlisted';
    this.expertiseList.update((list) =>
      list.map((e) => (e.id === exp.id ? { ...e, status: newStatus } : e))
    );
    // TODO: Call API to update status
  }

  async deleteExpertise(exp: Expertise): Promise<void> {
    if (confirm('Are you sure you want to delete this expertise?')) {
      const success = await this.expertiseApi.delete(exp.id);
      if (success) {
        this.loadExpertise();
      }
    }
  }

  openCsvExportDialog(): void {
    console.log('Open CSV export dialog');
  }

  openEmbedListingDialog(): void {
    console.log('Open embed listing dialog');
  }

  // Helper for template
  readonly Math = Math;
}
