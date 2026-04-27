import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExperienceApiService, type Experience as ApiExperience } from '../../../../onboarding/experience/services/experience-api.service';
import { environment } from '../../../../../../environments/environment';
import { HasPermissionDirective } from '../../../../../core/directives/has-permission.directive';
import { PermissionService } from '../../../../../core/services/permission.service';

type ServiceStatus = 'active' | 'draft' | 'pending' | 'unlisted' | 'inactive' | 'express';
type SortField = 'title' | 'host' | 'createdDate' | 'modifiedDate' | 'status';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'active' | 'inactive' | 'drafted' | 'express';

interface SidebarFilter {
  id: FilterType;
  label: string;
  hasInfo?: boolean;
}

interface Experience {
  id: string;
  title: string;
  host: string;
  hostId: string;
  image: string | null;
  price: number;
  currency: string;
  status: ServiceStatus;
  createdDate: Date;
  modifiedDate: Date;
  totalProfit: number;
  isFeatured: boolean;
  isShowCaseOnProfile: boolean;
  isSelected?: boolean;
  listingType?: 'platform' | 'express';
  slug?: string;
}

@Component({
  selector: 'app-hub-experiences',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HasPermissionDirective],
  templateUrl: './experiences.component.html',
})
export class HubExperiencesComponent implements OnInit {
  private readonly experienceApi = inject(ExperienceApiService);
  private readonly router = inject(Router);
  readonly permissions = inject(PermissionService);

  readonly loading = signal(false);
  readonly searchText = signal('');
  readonly sortBy = signal<SortField>('createdDate');
  readonly sortType = signal<SortDirection>('desc');
  readonly selectAllExperiences = signal(false);
  readonly showActionsDropdown = signal<string | null>(null);
  readonly showMobileFilter = signal(false);
  readonly showExportDropdown = signal(false);

  // Sidebar filter
  readonly activeFilter = signal<FilterType>('all');
  readonly sidebarFilters: SidebarFilter[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'drafted', label: 'Drafted' },
    { id: 'express', label: 'Express' },
    { id: 'inactive', label: 'Inactive', hasInfo: true },
  ];

  // Pagination
  readonly currentPage = signal(1);
  readonly recordsPerPage = signal(20);
  readonly totalItems = signal(0);

  // Data
  readonly experiences = signal<Experience[]>([]);

  // Computed: client-side filtering for search (API handles status filter)
  readonly filteredData = computed(() => {
    let data = [...this.experiences()];

    // Apply search filter (client-side)
    const search = this.searchText().toLowerCase();
    if (search) {
      data = data.filter(
        (exp) =>
          exp.title.toLowerCase().includes(search) || exp.host.toLowerCase().includes(search)
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
        case 'host':
          comparison = a.host.localeCompare(b.host);
          break;
        case 'createdDate':
          comparison = a.createdDate.getTime() - b.createdDate.getTime();
          break;
        case 'modifiedDate':
          comparison = a.modifiedDate.getTime() - b.modifiedDate.getTime();
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

  ngOnInit(): void {
    this.loadExperiences();
  }

  async loadExperiences(): Promise<void> {
    this.loading.set(true);
    try {
      const filter = this.activeFilter();
      const params: { status?: string; listingType?: string; page: number; limit: number; } = {
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
      } else if (filter === 'express') {
        params.listingType = 'express';
      }

      const result = await this.experienceApi.list(params);

      // Map API response to component interface
      const mapped = result.experiences.map((exp: ApiExperience) => this.mapExperience(exp));
      this.experiences.set(mapped);
      this.totalItems.set(result.total);
    } catch (error) {
      console.error('Error loading experiences:', error);
      this.experiences.set([]);
      this.totalItems.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  private mapExperience(exp: ApiExperience): Experience {
    // Get first ticket price or 0
    const firstTicket = exp.ticket?.[0];
    const price = firstTicket?.ticketPrice || 0;

    // Get first host name or 'No Host'
    const firstHost = exp.hostDetails?.[0];
    const hostName = firstHost?.name || (exp.noHost ? 'No Host' : 'Hub Host');

    // Map API status to UI status
    let status: ServiceStatus = 'active';
    if (exp.listingType === 'express') {
      status = 'express';
    } else if (exp.status === 'DRAFTED') {
      status = 'draft';
    } else if (exp.status === 'DELETED') {
      status = 'inactive';
    } else if (exp.status === 'ACTIVE') {
      status = 'active';
    }

    return {
      id: exp._id || '',
      title: exp.experienceTitle,
      host: hostName,
      hostId: firstHost?.userId || '',
      image: exp.coverPhoto || null,
      price,
      currency: exp.currency || 'MYR',
      status,
      createdDate: exp.createdAt ? new Date(exp.createdAt) : new Date(),
      modifiedDate: exp.updatedAt ? new Date(exp.updatedAt) : new Date(),
      totalProfit: 0, // Would come from analytics
      isFeatured: exp.isFeatured,
      isShowCaseOnProfile: false,
      listingType: exp.listingType,
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
    this.selectAllExperiences.update((v) => !v);
    const isSelected = this.selectAllExperiences();
    this.experiences.update((list) => list.map((e) => ({ ...e, isSelected })));
  }

  setFilter(filter: FilterType): void {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
    this.loadExperiences();
  }

  openMobileFilters(): void {
    this.showMobileFilter.set(true);
  }

  closeMobileFilters(): void {
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
      case 'express':
        return 'bg-[rgba(52,168,83,0.3)] text-black';
      case 'draft':
        return 'bg-[#1A1623] text-white';
      case 'pending':
      case 'under review':
        return 'bg-[rgba(250,196,33,0.3)] text-black';
      case 'unlisted':
        return 'bg-[rgba(158,158,158,0.3)] text-black/40';
      case 'inactive':
        return 'bg-[#F7BFAF] text-black';
      default:
        return 'bg-neutral-100 text-black';
    }
  }

  getStatusLabel(exp: Experience): string {
    if (exp.listingType === 'express') return 'express';
    if (exp.status === 'pending') return 'under review';
    return exp.status;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  handlePageChange(page: number): void {
    this.currentPage.set(page);
    this.loadExperiences();
  }

  // Actions
  manageExperience(exp: Experience): void {
    this.router.navigate(['/hub/services/experiences', exp.id, 'manage']);
  }

  editExperience(exp: Experience): void {
    // Navigate to edit mode with returnUrl to come back to experiences listing
    if (exp.listingType === 'express') {
      this.router.navigate(['/onboarding/experience/express', exp.id], {
        queryParams: { returnUrl: '/hub/services/experiences' }
      });
    } else {
      this.router.navigate(['/onboarding/experience/platform', exp.id, 'basic-info'], {
        queryParams: { returnUrl: '/hub/services/experiences' }
      });
    }
  }

  duplicateExperience(exp: Experience): void {
    console.log('Duplicate:', exp.id);
  }

  viewExperience(exp: Experience): void {
    if (exp.slug) {
      // Express experiences go to checkout directly, platform experiences go to web detail page
      if (exp.listingType === 'express') {
        window.open(`${environment.checkoutUrl}/experience/${exp.slug}`, '_blank');
      } else {
        window.open(`${environment.webUrl}/experience/${exp.slug}`, '_blank');
      }
    }
  }

  shareExperience(exp: Experience): void {
    if (exp.slug) {
      const url = `${environment.webUrl}/experience/${exp.slug}`;
      navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  }

  shareReviewLink(exp: Experience): void {
    console.log('Share Review Link:', exp.id);
  }

  toggleFeature(exp: Experience): void {
    this.experiences.update((list) =>
      list.map((e) => (e.id === exp.id ? { ...e, isFeatured: !e.isFeatured } : e))
    );
    // TODO: Call API to update feature status
  }

  toggleList(exp: Experience): void {
    const newStatus: ServiceStatus = exp.status === 'unlisted' ? 'active' : 'unlisted';
    this.experiences.update((list) =>
      list.map((e) => (e.id === exp.id ? { ...e, status: newStatus } : e))
    );
    // TODO: Call API to update status
  }

  async deleteExperience(exp: Experience): Promise<void> {
    if (confirm('Are you sure you want to delete this experience?')) {
      const success = await this.experienceApi.delete(exp.id);
      if (success) {
        this.loadExperiences();
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
