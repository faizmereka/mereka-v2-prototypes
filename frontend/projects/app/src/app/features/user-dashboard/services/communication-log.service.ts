import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

/**
 * Communication log item
 */
export interface CommunicationLogItem {
  _id: string;
  channel: 'inApp' | 'email' | 'whatsApp';
  templateId: string;
  title?: string;
  message?: string;
  recipient: string;
  status: string;
  isRead?: boolean;
  data?: Record<string, unknown>;
  sentAt?: string;
  createdAt: string;
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Summary counts
 */
export interface LogSummary {
  totalInApp: number;
  totalEmail: number;
  totalWhatsApp: number;
  unreadInApp: number;
}

/**
 * Communication logs response
 */
export interface CommunicationLogsResponse {
  logs: CommunicationLogItem[];
  pagination: PaginationInfo;
  summary: LogSummary;
}

/**
 * Filter options
 */
export interface LogFilters {
  channel?: 'email' | 'whatsApp' | 'all';
  templateId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// User Communication Log Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class UserCommunicationLogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/me/communication-logs`;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _logs = signal<CommunicationLogItem[]>([]);
  private readonly _pagination = signal<PaginationInfo | null>(null);
  private readonly _summary = signal<LogSummary | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _filters = signal<LogFilters>({ channel: 'all', page: 1, limit: 20 });

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly logs = this._logs.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly filters = this._filters.asReadonly();

  // ============================================================================
  // Computed Signals - Filter out InApp (show only Email and WhatsApp)
  // ============================================================================

  readonly filteredLogs = computed(() => {
    const allLogs = this._logs();
    // Filter out InApp notifications - only show Email and WhatsApp
    return allLogs.filter((log) => log.channel === 'email' || log.channel === 'whatsApp');
  });

  readonly emailLogs = computed(() => this._logs().filter((log) => log.channel === 'email'));
  readonly whatsAppLogs = computed(() => this._logs().filter((log) => log.channel === 'whatsApp'));

  readonly hasLogs = computed(() => this.filteredLogs().length > 0);
  readonly totalEmailCount = computed(() => this._summary()?.totalEmail ?? 0);
  readonly totalWhatsAppCount = computed(() => this._summary()?.totalWhatsApp ?? 0);

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load communication logs with filters
   */
  async loadLogs(filters?: Partial<LogFilters>): Promise<void> {
    if (this._loading()) {
      return;
    }

    // Merge filters
    const currentFilters = this._filters();
    const newFilters = { ...currentFilters, ...filters };
    this._filters.set(newFilters);

    this._loading.set(true);
    this._error.set(null);

    try {
      let params = new HttpParams();

      // Only fetch email and whatsApp (exclude inApp)
      if (newFilters.channel && newFilters.channel !== 'all') {
        params = params.set('channel', newFilters.channel);
      }
      if (newFilters.templateId) {
        params = params.set('templateId', newFilters.templateId);
      }
      if (newFilters.status) {
        params = params.set('status', newFilters.status);
      }
      if (newFilters.startDate) {
        params = params.set('startDate', newFilters.startDate);
      }
      if (newFilters.endDate) {
        params = params.set('endDate', newFilters.endDate);
      }
      if (newFilters.page) {
        params = params.set('page', newFilters.page.toString());
      }
      if (newFilters.limit) {
        params = params.set('limit', newFilters.limit.toString());
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<CommunicationLogsResponse>>(this.apiUrl, {
          params,
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        // Filter out inApp logs from the response
        const filteredLogs = response.data.logs.filter(
          (log) => log.channel === 'email' || log.channel === 'whatsApp'
        );
        this._logs.set(filteredLogs);
        this._pagination.set(response.data.pagination);
        this._summary.set(response.data.summary);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load communication logs');
      }
    } catch (error) {
      console.error('Failed to fetch communication logs:', error);
      this._error.set('Failed to load communication logs');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Load summary only
   */
  async loadSummary(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<LogSummary>>(`${this.apiUrl}/summary`, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._summary.set(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  }

  /**
   * Change page
   */
  async changePage(page: number): Promise<void> {
    await this.loadLogs({ page });
  }

  /**
   * Change channel filter
   */
  async filterByChannel(channel: 'email' | 'whatsApp' | 'all'): Promise<void> {
    await this.loadLogs({ channel, page: 1 });
  }

  /**
   * Clear filters
   */
  async clearFilters(): Promise<void> {
    await this.loadLogs({ channel: 'all', page: 1, templateId: undefined, status: undefined });
  }

  /**
   * Refresh logs
   */
  async refresh(): Promise<void> {
    await this.loadLogs();
  }
}
