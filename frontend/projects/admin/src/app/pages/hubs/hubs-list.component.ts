import { Component, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BadgeComponent } from '../../shared/ui';

type HubStatus = 'all' | 'active' | 'pending' | 'rejected';

interface Hub {
    id: string;
    name: string;
    logo: string;
    email: string;
    createdBy: string;
    createdOn: Date;
    lastUpdated: Date;
    plan: string;
    status: string;
    isActive: boolean;
    isApproved: boolean;
    isRejected: boolean;
    isFeatured: boolean;
    selected?: boolean;
}

@Component({
    selector: 'app-hubs-list',
    imports: [RouterLink, FormsModule, DatePipe, BadgeComponent],
    templateUrl: './hubs-list.component.html',
    styleUrl: './hubs-list.component.scss'
})
export class HubsListComponent {
    searchQuery = '';
    activeFilter = signal<HubStatus>('all');
    showActionsMenu = signal(false);
    activeRowMenu = signal<string | null>(null);
    currentPage = signal(1);
    pageSize = signal(10);

    filterTabs: { label: string; value: HubStatus; }[] = [
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Under review', value: 'pending' },
        { label: 'Rejected', value: 'rejected' },
    ];

    hubs = signal<Hub[]>([
        { id: '1', name: 'REXKL', logo: 'imgs/Ellipse 51.png', email: 'hello@rexkl.com', createdBy: 'Admin', createdOn: new Date('2024-01-15'), lastUpdated: new Date('2024-03-20'), plan: 'Business Starter', status: 'active', isActive: true, isApproved: true, isRejected: false, isFeatured: true },
        { id: '2', name: 'TDIH Miri', logo: 'imgs/Ellipse 51 (1).png', email: 'contact@tdih-miri.com', createdBy: 'John Doe', createdOn: new Date('2024-02-10'), lastUpdated: new Date('2024-03-18'), plan: 'Freemium', status: 'pending', isActive: false, isApproved: false, isRejected: false, isFeatured: false },
        { id: '3', name: 'TDIH Kuching', logo: 'imgs/Ellipse 52 (1).png', email: 'info@tdih-kuching.com', createdBy: 'Jane Smith', createdOn: new Date('2024-01-20'), lastUpdated: new Date('2024-03-15'), plan: 'Hubs', status: 'active', isActive: true, isApproved: true, isRejected: false, isFeatured: false },
        { id: '4', name: 'The Other School', logo: 'imgs/Ellipse 52 (2).png', email: 'hello@otherschool.edu', createdBy: 'Admin', createdOn: new Date('2024-03-01'), lastUpdated: new Date('2024-03-22'), plan: 'Academic Institution', status: 'rejected', isActive: false, isApproved: false, isRejected: true, isFeatured: false },
        { id: '5', name: 'Haus Kuching', logo: 'imgs/Group.png', email: 'contact@hauskuching.com', createdBy: 'Mike Wilson', createdOn: new Date('2024-02-28'), lastUpdated: new Date('2024-03-21'), plan: 'Business Starter', status: 'active', isActive: true, isApproved: true, isRejected: false, isFeatured: true },
    ]);

    filteredHubs = computed(() => {
        let result = this.hubs();
        const filter = this.activeFilter();
        if (filter !== 'all') result = result.filter(hub => hub.status === filter);
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            result = result.filter(hub => hub.name.toLowerCase().includes(query) || hub.email.toLowerCase().includes(query));
        }
        return result;
    });

    paginatedHubs = computed(() => {
        const start = (this.currentPage() - 1) * this.pageSize();
        return this.filteredHubs().slice(start, start + this.pageSize());
    });

    totalPages = computed(() => Math.ceil(this.filteredHubs().length / this.pageSize()) || 1);
    paginationStart = computed(() => this.filteredHubs().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
    paginationEnd = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredHubs().length));
    allSelected = computed(() => this.paginatedHubs().length > 0 && this.paginatedHubs().every(hub => hub.selected));
    hasSelection = computed(() => this.hubs().some(hub => hub.selected));

    setFilter(filter: HubStatus) { this.activeFilter.set(filter); this.currentPage.set(1); }
    onSearch() { this.currentPage.set(1); }
    toggleSelectAll(event: Event) { const checked = (event.target as HTMLInputElement).checked; this.hubs.update(hubs => hubs.map(hub => ({ ...hub, selected: checked }))); }
    toggleSelect(hub: Hub) { this.hubs.update(hubs => hubs.map(h => h.id === hub.id ? { ...h, selected: !h.selected } : h)); }
    toggleActionsMenu() { this.showActionsMenu.update(v => !v); }
    toggleRowActions(hubId: string) { this.activeRowMenu.update(current => current === hubId ? null : hubId); }
    bulkAction(action: string) { console.log('Bulk action:', action); this.showActionsMenu.set(false); }
    rowAction(hub: Hub, action: string) { console.log('Row action:', action, hub); this.activeRowMenu.set(null); }
    exportData() { console.log('Exporting data...'); }
    prevPage() { this.currentPage.update(p => Math.max(1, p - 1)); }
    nextPage() { this.currentPage.update(p => Math.min(this.totalPages(), p + 1)); }
    setPageSize(size: number) { this.pageSize.set(size); this.currentPage.set(1); }
}
