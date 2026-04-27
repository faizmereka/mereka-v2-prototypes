import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, KeyValuePipe, TitleCasePipe } from '@angular/common';
import {
  MonitoringService,
  ApiLog,
  ApiStats,
  SuspiciousActivity,
  LogLevel,
  ApiModule,
  CronJobRun,
  CronJobStatus,
  CronJobCategory,
  RegisteredJob,
} from './monitoring.service';
import { ToastService } from '../../shared/ui';
import { DialogService } from '../../shared/dialog';

@Component({
  selector: 'app-monitoring',
  imports: [FormsModule, DatePipe, DecimalPipe, KeyValuePipe, TitleCasePipe],
  templateUrl: './monitoring.component.html',
  styleUrl: './monitoring.component.scss'
})
export class MonitoringComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly monitoringService = inject(MonitoringService);
  private readonly toast = inject(ToastService);
  private readonly dialogService = inject(DialogService);

  activeTab = signal<'logs' | 'alerts' | 'stats' | 'config' | 'cron-jobs'>('logs');
  searchQuery = '';
  logLevelFilter = signal<'all' | LogLevel>('all');
  statusCodeFilter = signal<'all' | 'success' | 'client-error' | 'server-error'>('all');
  moduleFilter = signal<'all' | ApiModule>('all');

  loading = signal(false);
  logsLoading = signal(false);
  statsLoading = signal(false);
  suspiciousLoading = signal(false);

  logLevels: ('all' | LogLevel)[] = ['all', 'info', 'warn', 'error'];
  statusCodes: ('all' | 'success' | 'client-error' | 'server-error')[] = ['all', 'success', 'client-error', 'server-error'];
  modules: ('all' | ApiModule)[] = ['all', 'auth', 'web', 'admin', 'hub', 'payments', 'other'];

  tabs = [
    { id: 'logs' as const, label: 'API Logs' },
    { id: 'cron-jobs' as const, label: 'Cron Jobs' },
    { id: 'alerts' as const, label: 'Alerts & Security' },
    { id: 'stats' as const, label: 'Statistics' },
    { id: 'config' as const, label: 'Rate Limits' },
  ];

  // Stats
  totalRequests = signal(0);
  errorRate = signal(0);
  avgResponseTime = signal(0);
  blockedAttempts = signal(0);

  // Data
  apiLogs = signal<ApiLog[]>([]);
  stats = signal<ApiStats | null>(null);
  suspiciousActivity = signal<SuspiciousActivity>({
    highVolumeIPs: [],
    highErrorRateIPs: [],
    blockedAttempts: 0,
  });
  // Rate Limit Configuration
  rateLimitConfig = signal<{
    skipPaths: string[];
    skipSuperAdmin: boolean;
    unauthenticated: { perMinute: number; perDay: number };
    authenticated: { perMinute: number; perDay: number };
  }>({
    skipPaths: ['/health'],
    skipSuperAdmin: true,
    unauthenticated: { perMinute: 30, perDay: 500 },
    authenticated: { perMinute: 100, perDay: 5000 },
  });
  configLoading = signal(false);
  configSaving = signal(false);
  newSkipPath = '';

  // Cron Jobs
  cronJobRuns = signal<CronJobRun[]>([]);
  registeredJobs = signal<RegisteredJob[]>([]);
  recentJobRuns = signal<CronJobRun[]>([]);
  cronJobsLoading = signal(false);
  cronJobTriggering = signal<string | null>(null);
  cronJobNameFilter = signal<'all' | string>('all');
  cronJobStatusFilter = signal<'all' | CronJobStatus>('all');
  cronJobCategoryFilter = signal<'all' | CronJobCategory>('all');
  cronJobsPagination = signal({ page: 1, limit: 20, total: 0, totalPages: 0 });
  cronJobStatuses: ('all' | CronJobStatus)[] = ['all', 'running', 'completed', 'failed', 'skipped'];
  cronJobCategories: ('all' | CronJobCategory)[] = ['all', 'payment', 'notification', 'maintenance', 'data_sync', 'cleanup'];

  // Pagination
  logsPagination = signal({ page: 1, limit: 50, total: 0, totalPages: 0 });

  // Server handles all filtering now - this just returns the API response
  // Keep computed for compatibility with template bindings
  filteredLogs = computed(() => this.apiLogs());

  // Track which tabs have been loaded
  private logsLoaded = false;
  private alertsLoaded = false;
  private statsLoaded = false;
  private configLoaded = false;
  private cronJobsLoaded = false;

  ngOnInit() {
    const tab = this.route.snapshot.data['tab'];
    const initialTab = tab === 'alerts' ? 'alerts'
      : tab === 'stats' ? 'stats'
      : tab === 'config' ? 'config'
      : tab === 'cron-jobs' ? 'cron-jobs'
      : 'logs';

    this.activeTab.set(initialTab);

    // Load only top stats cards on init (single API call)
    this.loadStats();

    // Load data for the initial active tab
    this.loadTabData(initialTab);
  }

  setActiveTab(tab: 'logs' | 'alerts' | 'stats' | 'config' | 'cron-jobs') {
    this.activeTab.set(tab);
    this.loadTabData(tab);
  }

  /**
   * Lazy load data for specific tab (only loads once per session unless forced)
   */
  private loadTabData(tab: string, force = false) {
    switch (tab) {
      case 'logs':
        if (!this.logsLoaded || force) {
          this.loadLogs();
          this.logsLoaded = true;
        }
        break;
      case 'alerts':
        if (!this.alertsLoaded || force) {
          this.loadSuspiciousActivity();
          this.alertsLoaded = true;
        }
        break;
      case 'stats':
        // Stats tab uses the same stats data from top cards
        // Just mark as loaded - data already fetched in loadStats()
        this.statsLoaded = true;
        break;
      case 'config':
        if (!this.configLoaded || force) {
          this.loadRateLimitConfig();
          this.configLoaded = true;
        }
        break;
      case 'cron-jobs':
        if (!this.cronJobsLoaded || force) {
          this.loadCronJobs();
          this.loadRegisteredJobs();
          this.loadRecentJobRuns();
          this.cronJobsLoaded = true;
        }
        break;
    }
  }

  loadStats() {
    this.statsLoading.set(true);
    this.monitoringService.getLogStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.stats.set(response.data);
          this.totalRequests.set(response.data.totalRequests || 0);
          this.errorRate.set(response.data.errorRate || 0);
          this.avgResponseTime.set(Math.round(response.data.avgResponseTime || 0));
        }
        this.statsLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load stats:', err);
        this.statsLoading.set(false);
      }
    });
  }

  loadLogs(page = 1) {
    this.logsLoading.set(true);
    const params: Record<string, unknown> = { page, limit: 50 };

    // Log level filter
    if (this.logLevelFilter() !== 'all') {
      params['level'] = this.logLevelFilter();
    }

    // Status code range filter (server-side)
    const statusFilter = this.statusCodeFilter();
    if (statusFilter !== 'all') {
      if (statusFilter === 'success') {
        params['statusCodeGte'] = 200;
        params['statusCodeLte'] = 299;
      } else if (statusFilter === 'client-error') {
        params['statusCodeGte'] = 400;
        params['statusCodeLte'] = 499;
      } else if (statusFilter === 'server-error') {
        params['statusCodeGte'] = 500;
        params['statusCodeLte'] = 599;
      }
    }

    // Module filter
    if (this.moduleFilter() !== 'all') {
      params['module'] = this.moduleFilter();
    }

    // Search query (server-side text search)
    if (this.searchQuery?.trim()) {
      params['search'] = this.searchQuery.trim();
    }

    this.monitoringService.queryLogs(params as Parameters<typeof this.monitoringService.queryLogs>[0]).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.apiLogs.set(response.data.items || []);
          this.logsPagination.set(response.data.pagination);
        }
        this.logsLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load logs:', err);
        this.toast.error('Failed to load API logs');
        this.logsLoading.set(false);
      }
    });
  }

  loadSuspiciousActivity() {
    this.suspiciousLoading.set(true);
    this.monitoringService.getSuspiciousActivity().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.suspiciousActivity.set(response.data);
          this.blockedAttempts.set(response.data.blockedAttempts || 0);
        }
        this.suspiciousLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load suspicious activity:', err);
        this.suspiciousLoading.set(false);
      }
    });
  }

  getLogLevelClasses(level: LogLevel): string {
    const classes: Record<LogLevel, string> = {
      info: 'bg-blue-100 text-blue-700',
      warn: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
    };
    return classes[level];
  }

  getStatusCodeClasses(statusCode: number): string {
    if (statusCode >= 500) return 'bg-red-100 text-red-700';
    if (statusCode >= 400) return 'bg-yellow-100 text-yellow-700';
    if (statusCode >= 300) return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
  }

  getMethodClasses(method: string): string {
    const classes: Record<string, string> = {
      GET: 'bg-green-100 text-green-700',
      POST: 'bg-blue-100 text-blue-700',
      PUT: 'bg-orange-100 text-orange-700',
      PATCH: 'bg-purple-100 text-purple-700',
      DELETE: 'bg-red-100 text-red-700',
    };
    return classes[method] || 'bg-gray-100 text-gray-700';
  }

  getModuleClasses(module: ApiModule | undefined): string {
    if (!module) return 'bg-gray-100 text-gray-700';
    const classes: Record<ApiModule, string> = {
      auth: 'bg-indigo-100 text-indigo-700',
      web: 'bg-cyan-100 text-cyan-700',
      admin: 'bg-purple-100 text-purple-700',
      hub: 'bg-amber-100 text-amber-700',
      payments: 'bg-emerald-100 text-emerald-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return classes[module];
  }

  blockIP(ip: string) {
    this.toast.info(`IP blocking feature coming soon: ${ip}`);
  }

  investigateIP(ip: string) {
    // Filter logs by IP
    this.searchQuery = ip;
    this.setActiveTab('logs');
    this.loadLogs();
  }

  refreshLogs() {
    this.logsLoaded = false;
    this.loadTabData('logs', true);
    this.toast.success('Logs refreshed');
  }

  refreshAlerts() {
    this.alertsLoaded = false;
    this.loadTabData('alerts', true);
    this.toast.success('Alerts refreshed');
  }

  refreshStats() {
    this.loadStats();
    this.toast.success('Statistics refreshed');
  }

  exportLogs() {
    this.toast.info('Export feature coming soon');
  }

  // Server-side filtering - reload from API with filters
  onLogLevelChange() {
    this.loadLogs(1); // Reset to page 1 when filter changes
  }

  onStatusCodeChange() {
    this.loadLogs(1); // Reset to page 1 when filter changes
  }

  onModuleChange() {
    this.loadLogs(1); // Reset to page 1 when filter changes
  }

  onSearchChange() {
    // Debounce search to avoid too many API calls
    // For now, trigger on enter key or button click
    this.loadLogs(1);
  }

  // Logs pagination methods
  getLogsPageNumbers(): number[] {
    const pagination = this.logsPagination();
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToLogsPage(page: number): void {
    this.loadLogs(page);
  }

  prevLogsPage(): void {
    const currentPage = this.logsPagination().page;
    if (currentPage > 1) {
      this.loadLogs(currentPage - 1);
    }
  }

  nextLogsPage(): void {
    const pagination = this.logsPagination();
    if (pagination.page < pagination.totalPages) {
      this.loadLogs(pagination.page + 1);
    }
  }

  // ============================================
  // RATE LIMIT CONFIG METHODS
  // ============================================

  loadRateLimitConfig() {
    this.configLoading.set(true);
    this.monitoringService.getRateLimitConfig().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.rateLimitConfig.set(response.data);
        }
        this.configLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load rate limit config:', err);
        this.toast.error('Failed to load rate limit configuration');
        this.configLoading.set(false);
      }
    });
  }

  saveRateLimitConfig() {
    this.configSaving.set(true);
    this.monitoringService.updateRateLimitConfig(this.rateLimitConfig()).subscribe({
      next: (response) => {
        if (response.success) {
          this.toast.success('Rate limit configuration saved');
        }
        this.configSaving.set(false);
      },
      error: (err) => {
        console.error('Failed to save rate limit config:', err);
        this.toast.error('Failed to save rate limit configuration');
        this.configSaving.set(false);
      }
    });
  }

  updateLimit(type: 'unauthenticated' | 'authenticated', field: 'perMinute' | 'perDay', value: number) {
    const config = this.rateLimitConfig();
    this.rateLimitConfig.set({
      ...config,
      [type]: {
        ...config[type],
        [field]: value
      }
    });
  }

  addSkipPath() {
    if (!this.newSkipPath.trim()) return;

    const config = this.rateLimitConfig();
    const path = this.newSkipPath.trim();

    if (config.skipPaths.includes(path)) {
      this.toast.warning('Path already exists');
      return;
    }

    this.rateLimitConfig.set({
      ...config,
      skipPaths: [...config.skipPaths, path]
    });
    this.newSkipPath = '';
  }

  removeSkipPath(path: string) {
    const config = this.rateLimitConfig();
    this.rateLimitConfig.set({
      ...config,
      skipPaths: config.skipPaths.filter(p => p !== path)
    });
  }

  toggleSkipSuperAdmin() {
    const config = this.rateLimitConfig();
    this.rateLimitConfig.set({
      ...config,
      skipSuperAdmin: !config.skipSuperAdmin
    });
  }

  refreshConfig() {
    this.configLoaded = false;
    this.loadRateLimitConfig();
    this.toast.success('Configuration refreshed');
  }

  // ============================================
  // CRON JOB METHODS
  // ============================================

  loadCronJobs(page = 1) {
    this.cronJobsLoading.set(true);
    const limit = 20;
    const offset = (page - 1) * limit;

    const params: {
      jobName?: string;
      status?: CronJobStatus;
      category?: CronJobCategory;
      limit: number;
      offset: number;
    } = { limit, offset };

    if (this.cronJobNameFilter() !== 'all') {
      params.jobName = this.cronJobNameFilter() as string;
    }
    if (this.cronJobStatusFilter() !== 'all') {
      params.status = this.cronJobStatusFilter() as CronJobStatus;
    }
    if (this.cronJobCategoryFilter() !== 'all') {
      params.category = this.cronJobCategoryFilter() as CronJobCategory;
    }

    this.monitoringService.getCronJobRuns(params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.cronJobRuns.set(response.data.runs || []);
          const total = response.data.total || 0;
          this.cronJobsPagination.set({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          });
        }
        this.cronJobsLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load cron jobs:', err);
        this.toast.error('Failed to load cron job runs');
        this.cronJobsLoading.set(false);
      }
    });
  }

  loadRegisteredJobs() {
    this.monitoringService.getRegisteredJobs().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.registeredJobs.set(response.data);
        }
      },
      error: (err) => {
        console.error('Failed to load registered jobs:', err);
      }
    });
  }

  loadRecentJobRuns() {
    this.monitoringService.getRecentJobRuns().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.recentJobRuns.set(response.data);
        }
      },
      error: (err) => {
        console.error('Failed to load recent job runs:', err);
      }
    });
  }

  getLastRunForJob(jobName: string): CronJobRun | undefined {
    return this.recentJobRuns().find(run => run.jobName === jobName);
  }

  triggerCronJob(jobName: string) {
    this.cronJobTriggering.set(jobName);
    this.monitoringService.triggerJob(jobName).subscribe({
      next: (response) => {
        if (response.success) {
          this.toast.success(`Job "${jobName}" triggered successfully`);
          // Reload jobs to show the new run
          setTimeout(() => this.loadCronJobs(), 1000);
        }
        this.cronJobTriggering.set(null);
      },
      error: (err) => {
        console.error('Failed to trigger job:', err);
        this.toast.error(`Failed to trigger job "${jobName}"`);
        this.cronJobTriggering.set(null);
      }
    });
  }

  refreshCronJobs() {
    this.cronJobsLoaded = false;
    this.loadCronJobs();
    this.loadRegisteredJobs();
    this.loadRecentJobRuns();
    this.toast.success('Cron jobs refreshed');
  }

  resetStuckJobs() {
    this.monitoringService.resetStuckJobs().subscribe({
      next: (response) => {
        if (response.success) {
          const count = response.data?.markedAsFailed || 0;
          if (count > 0) {
            this.toast.success(`Reset ${count} stuck job(s). You can now re-trigger them.`);
            this.loadCronJobs();
            this.loadRecentJobRuns();
          } else {
            this.toast.info('No stuck jobs found to reset');
          }
        }
      },
      error: (err) => {
        console.error('Failed to reset stuck jobs:', err);
        this.toast.error('Failed to reset stuck jobs');
      }
    });
  }

  onCronJobNameFilterChange() {
    this.loadCronJobs(1);
  }

  onCronJobStatusFilterChange() {
    this.loadCronJobs(1);
  }

  onCronJobCategoryFilterChange() {
    this.loadCronJobs(1);
  }

  getCronJobStatusClasses(status: CronJobStatus): string {
    const classes: Record<CronJobStatus, string> = {
      running: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      skipped: 'bg-gray-100 text-gray-700',
    };
    return classes[status];
  }

  getCronJobCategoryClasses(category: CronJobCategory): string {
    const classes: Record<CronJobCategory, string> = {
      payment: 'bg-emerald-100 text-emerald-700',
      notification: 'bg-purple-100 text-purple-700',
      maintenance: 'bg-orange-100 text-orange-700',
      data_sync: 'bg-cyan-100 text-cyan-700',
      cleanup: 'bg-gray-100 text-gray-700',
    };
    return classes[category];
  }

  formatDuration(ms: number | undefined): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  // Cron Jobs pagination methods
  getCronJobsPageNumbers(): number[] {
    const pagination = this.cronJobsPagination();
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToCronJobsPage(page: number): void {
    this.loadCronJobs(page);
  }

  prevCronJobsPage(): void {
    const currentPage = this.cronJobsPagination().page;
    if (currentPage > 1) {
      this.loadCronJobs(currentPage - 1);
    }
  }

  nextCronJobsPage(): void {
    const pagination = this.cronJobsPagination();
    if (pagination.page < pagination.totalPages) {
      this.loadCronJobs(pagination.page + 1);
    }
  }
}
