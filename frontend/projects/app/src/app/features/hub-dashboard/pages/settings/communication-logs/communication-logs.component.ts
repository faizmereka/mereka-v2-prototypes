import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HubCommunicationLogService,
  type CommunicationLogItem,
} from '../../../services/hub-communication-log.service';

@Component({
  selector: 'app-hub-communication-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './communication-logs.component.html',
})
export class HubCommunicationLogsComponent implements OnInit {
  private readonly logService = inject(HubCommunicationLogService);

  // Expose Math for template use
  protected readonly Math = Math;

  // Service state
  readonly loading = this.logService.loading;
  readonly error = this.logService.error;
  readonly logs = this.logService.logs;
  readonly pagination = this.logService.pagination;
  readonly summary = this.logService.summary;
  readonly filters = this.logService.filters;
  readonly hasLogs = this.logService.hasLogs;

  // Local state
  readonly activeTab = signal<'all' | 'email' | 'whatsApp'>('all');

  // Computed
  readonly displayedLogs = computed(() => {
    const tab = this.activeTab();
    const allLogs = this.logs();

    if (tab === 'all') {
      return allLogs;
    }
    return allLogs.filter((log) => log.channel === tab);
  });

  async ngOnInit() {
    await this.logService.loadLogs();
  }

  /**
   * Switch tab and filter logs
   */
  async switchTab(tab: 'all' | 'email' | 'whatsApp') {
    this.activeTab.set(tab);
    if (tab === 'all') {
      await this.logService.filterByChannel('all');
    } else {
      await this.logService.filterByChannel(tab);
    }
  }

  /**
   * Change page
   */
  async goToPage(page: number) {
    await this.logService.changePage(page);
  }

  /**
   * Refresh logs
   */
  async refresh() {
    await this.logService.refresh();
  }

  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
      case 'read':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'bounced':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  /**
   * Get channel badge class
   */
  getChannelClass(channel: string): string {
    switch (channel) {
      case 'email':
        return 'bg-blue-100 text-blue-800';
      case 'whatsApp':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  /**
   * Get channel label
   */
  getChannelLabel(channel: string): string {
    switch (channel) {
      case 'email':
        return 'Email';
      case 'whatsApp':
        return 'WhatsApp';
      default:
        return channel;
    }
  }

  /**
   * Format template ID to readable title
   */
  formatTemplateTitle(templateId: string): string {
    if (!templateId) return 'Notification';
    return templateId
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Get page numbers for pagination
   */
  getPageNumbers(): number[] {
    const pag = this.pagination();
    if (!pag) return [];

    const pages: number[] = [];
    const totalPages = pag.totalPages;
    const currentPage = pag.page;

    // Show max 5 pages centered on current page
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }
}
