import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';

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
  totalEmail: number;
  totalWhatsApp: number;
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
// Hub Communication Log Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class HubCommunicationLogService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

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
  // Computed Signals
  // ============================================================================

  readonly emailLogs = computed(() => this._logs().filter((log) => log.channel === 'email'));
  readonly whatsAppLogs = computed(() => this._logs().filter((log) => log.channel === 'whatsApp'));

  readonly hasLogs = computed(() => this._logs().length > 0);
  readonly totalEmailCount = computed(() => this._summary()?.totalEmail ?? 0);
  readonly totalWhatsAppCount = computed(() => this._summary()?.totalWhatsApp ?? 0);

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getApiUrl(): string {
    const hubId = this.authState.selectedHub()?.id;
    return `${environment.apiUrl}/hub/${hubId}/settings/communication-logs`;
  }

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

    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
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
        this.http.get<ApiResponse<CommunicationLogsResponse>>(this.getApiUrl(), {
          params,
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._logs.set(response.data.logs);
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
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return;

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<LogSummary>>(`${this.getApiUrl()}/summary`, {
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

  /**
   * Reset state (call when hub changes)
   */
  reset(): void {
    this._logs.set([]);
    this._pagination.set(null);
    this._summary.set(null);
    this._error.set(null);
    this._filters.set({ channel: 'all', page: 1, limit: 20 });
  }
}
