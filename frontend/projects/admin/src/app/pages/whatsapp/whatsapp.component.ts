import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, JsonPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  WhatsAppService,
  type WhatsAppTemplate,
  type WhatsAppLog,
  type CreateWhatsAppTemplateInput,
  type UpdateWhatsAppTemplateInput,
  type WhatsAppTemplateCategory,
  type NotificationScope,
  type TargetUserType,
} from './whatsapp.service';
import { ToastService } from '../../shared/ui';

@Component({
  selector: 'app-whatsapp',
  imports: [FormsModule, DatePipe, DecimalPipe, JsonPipe, TitleCasePipe, RouterLink],
  templateUrl: './whatsapp.component.html',
  styleUrl: './whatsapp.component.scss',
})
export class WhatsAppComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly whatsAppService = inject(WhatsAppService);
  private readonly toast = inject(ToastService);

  // Placeholder for body preview textarea
  readonly bodyPreviewPlaceholder = 'Hi {{userName}}, your booking for {{experienceName}} is confirmed!';

  // Available categories
  readonly categories: WhatsAppTemplateCategory[] = [
    'chats',
    'bookings',
    'jobs',
    'promotions',
    'system',
    'experiences',
    'members',
    'payments',
  ];

  // Scope options for dropdown
  readonly scopeOptions: { value: NotificationScope; label: string }[] = [
    { value: 'user', label: 'User (Personal)' },
    { value: 'hub', label: 'Hub (Hub-related)' },
  ];

  // Target user type options for checkboxes
  readonly targetUserTypeOptions: { value: TargetUserType; label: string }[] = [
    { value: 'learner', label: 'Learner' },
    { value: 'expert', label: 'Expert' },
    { value: 'hub_owner', label: 'Hub Owner' },
    { value: 'hub_admin', label: 'Hub Admin' },
    { value: 'hub_collaborator', label: 'Hub Collaborator' },
  ];

  // Tab state
  activeTab = signal<'templates' | 'logs'>('templates');

  // Search and filters
  searchQuery = '';

  // Modal state
  showModal = signal(false);
  isSubmitting = signal(false);
  isEditMode = signal(false);
  editingTemplateId = signal<string | null>(null);

  // Form data for template
  templateForm = signal<Partial<CreateWhatsAppTemplateInput>>({});

  // Expose service signals
  readonly templates = this.whatsAppService.templates;
  readonly templatesLoading = this.whatsAppService.templatesLoading;
  readonly templatesError = this.whatsAppService.templatesError;

  readonly stats = this.whatsAppService.stats;
  readonly statsLoading = this.whatsAppService.statsLoading;

  // Stats computed
  readonly totalTemplates = this.whatsAppService.totalTemplates;
  readonly activeTemplates = this.whatsAppService.activeTemplates;
  readonly inactiveTemplates = this.whatsAppService.inactiveTemplates;

  // Log signals
  readonly logs = this.whatsAppService.logs;
  readonly logsLoading = this.whatsAppService.logsLoading;
  readonly logsError = this.whatsAppService.logsError;
  readonly logsMeta = this.whatsAppService.logsMeta;

  readonly logStats = this.whatsAppService.logStats;
  readonly logStatsLoading = this.whatsAppService.logStatsLoading;
  readonly totalLogs = this.whatsAppService.totalLogs;
  readonly logsLast24Hours = this.whatsAppService.logsLast24Hours;
  readonly sentLogs = this.whatsAppService.sentLogs;
  readonly deliveredLogs = this.whatsAppService.deliveredLogs;
  readonly failedLogs = this.whatsAppService.failedLogs;

  // Log search and filters
  logSearchQuery = '';
  logStartDate = '';
  logEndDate = '';
  logCurrentPage = 1;
  logPageLimit = 20;

  // Filtered templates based on search
  filteredTemplates = computed(() => {
    const templates = this.templates();
    if (!this.searchQuery) return templates;
    const query = this.searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.templateId.toLowerCase().includes(query) ||
        t.whatsAppTemplateName.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query),
    );
  });

  ngOnInit() {
    const tab = this.route.snapshot.data['tab'];
    if (tab === 'logs') {
      this.activeTab.set('logs');
    } else {
      this.activeTab.set('templates');
    }

    // Load data
    this.loadData();
  }

  async loadData() {
    try {
      if (this.activeTab() === 'logs') {
        // Load logs and log stats with filters
        await Promise.all([
          this.whatsAppService.getLogsAsync({
            startDate: this.logStartDate || undefined,
            endDate: this.logEndDate || undefined,
            page: this.logCurrentPage,
            limit: this.logPageLimit,
          }),
          this.whatsAppService.getLogStatsAsync(),
        ]);
      } else {
        // Load templates and stats
        await Promise.all([
          this.whatsAppService.getTemplatesAsync(),
          this.whatsAppService.getStatsAsync(),
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  // Apply log filters
  applyLogFilters() {
    this.logCurrentPage = 1; // Reset to first page when filters change
    this.loadData();
  }

  // Clear log filters
  clearLogFilters() {
    this.logSearchQuery = '';
    this.logStartDate = '';
    this.logEndDate = '';
    this.logCurrentPage = 1;
    this.loadData();
  }

  // Pagination methods
  goToPage(page: number) {
    const meta = this.logsMeta();
    if (meta && page >= 1 && page <= meta.totalPages) {
      this.logCurrentPage = page;
      this.loadData();
    }
  }

  nextPage() {
    const meta = this.logsMeta();
    if (meta && this.logCurrentPage < meta.totalPages) {
      this.logCurrentPage++;
      this.loadData();
    }
  }

  prevPage() {
    if (this.logCurrentPage > 1) {
      this.logCurrentPage--;
      this.loadData();
    }
  }

  // Get page numbers for pagination
  getPageNumbers(): number[] {
    const meta = this.logsMeta();
    if (!meta) return [];

    const totalPages = meta.totalPages;
    const current = this.logCurrentPage;
    const pages: number[] = [];

    // Show max 5 page numbers
    let start = Math.max(1, current - 2);
    const end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  onTabChange(tab: 'templates' | 'logs') {
    this.activeTab.set(tab);
    this.loadData();
  }

  // Open add modal
  openAddModal() {
    this.templateForm.set({ languageCode: 'en' });
    this.isEditMode.set(false);
    this.editingTemplateId.set(null);
    this.showModal.set(true);
  }

  // Open edit modal
  openEditModal(template: WhatsAppTemplate) {
    this.templateForm.set({
      templateId: template.templateId,
      name: template.name,
      title: template.title,
      description: template.description,
      category: template.category,
      scope: template.scope,
      targetUserTypes: template.targetUserTypes,
      whatsAppTemplateName: template.whatsAppTemplateName,
      languageCode: template.languageCode,
      bodyPreview: template.bodyPreview,
    });
    this.isEditMode.set(true);
    this.editingTemplateId.set(template._id);
    this.showModal.set(true);
  }

  // Close modal
  closeModal() {
    this.showModal.set(false);
    this.templateForm.set({});
    this.isEditMode.set(false);
    this.editingTemplateId.set(null);
  }

  // Update form field
  updateFormField(field: keyof CreateWhatsAppTemplateInput, value: string) {
    this.templateForm.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // Save template (create or update)
  async saveTemplate() {
    const data = this.templateForm();

    if (this.isEditMode()) {
      // Edit mode - all fields except templateId can be updated
      if (!data.name || !data.title || !data.whatsAppTemplateName || !data.bodyPreview) {
        this.toast.warning('Please fill in all required fields');
        return;
      }
    } else {
      // Create mode - all fields required
      if (
        !data.templateId ||
        !data.name ||
        !data.title ||
        !data.description ||
        !data.category ||
        !data.whatsAppTemplateName ||
        !data.bodyPreview
      ) {
        this.toast.warning('Please fill in all required fields');
        return;
      }
    }

    this.isSubmitting.set(true);
    try {
      if (this.isEditMode() && this.editingTemplateId()) {
        const updateData: UpdateWhatsAppTemplateInput = {
          name: data.name,
          title: data.title,
          description: data.description,
          category: data.category,
          scope: data.scope,
          targetUserTypes: data.targetUserTypes,
          whatsAppTemplateName: data.whatsAppTemplateName,
          languageCode: data.languageCode,
          bodyPreview: data.bodyPreview,
        };
        await this.whatsAppService.updateTemplateAsync(this.editingTemplateId()!, updateData);
        this.closeModal();
        this.toast.success('Template updated successfully');
      } else {
        await this.whatsAppService.createTemplateAsync(data as CreateWhatsAppTemplateInput);
        this.closeModal();
        this.toast.success('Template created successfully');
        // Refresh stats
        await this.whatsAppService.getStatsAsync();
      }
    } catch (error) {
      console.error('Error saving template:', error);
      this.toast.error(this.isEditMode() ? 'Failed to update template' : 'Failed to create template');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Toggle template status
  async toggleTemplateStatus(template: WhatsAppTemplate) {
    try {
      await this.whatsAppService.toggleTemplateStatus(template._id, !template.isActive).toPromise();
      this.toast.success(`Template ${!template.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling status:', error);
      this.toast.error('Failed to update status');
    }
  }

  // Delete template
  async deleteTemplate(template: WhatsAppTemplate) {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await this.whatsAppService.deleteTemplateAsync(template._id);
      this.toast.success('Template deleted successfully');
      // Refresh stats
      await this.whatsAppService.getStatsAsync();
    } catch (error) {
      console.error('Error deleting template:', error);
      this.toast.error('Failed to delete template');
    }
  }

  // ============ WHATSAPP LOGS ============

  // Get status badge class
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'DELIVERED':
      case 'READ':
        return 'bg-green-100 text-green-700';
      case 'SENT':
        return 'bg-blue-100 text-blue-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  // Get category badge class
  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'bookings':
        return 'bg-blue-100 text-blue-700';
      case 'payments':
        return 'bg-green-100 text-green-700';
      case 'jobs':
        return 'bg-purple-100 text-purple-700';
      case 'members':
        return 'bg-orange-100 text-orange-700';
      case 'system':
        return 'bg-gray-100 text-gray-700';
      case 'promotions':
        return 'bg-pink-100 text-pink-700';
      case 'experiences':
        return 'bg-cyan-100 text-cyan-700';
      case 'chats':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  // Delete WhatsApp log
  async deleteLog(log: WhatsAppLog) {
    if (!confirm(`Are you sure you want to delete this WhatsApp log to "${log.toPhone}"?`)) {
      return;
    }

    try {
      await this.whatsAppService.deleteLogAsync(log._id);
      this.toast.success('WhatsApp log deleted successfully');
    } catch (error) {
      console.error('Error deleting log:', error);
      this.toast.error('Failed to delete WhatsApp log');
    }
  }

  // Selected log for detail view
  selectedLog = signal<WhatsAppLog | null>(null);

  // View log details
  viewLogDetails(log: WhatsAppLog) {
    this.selectedLog.set(log);
  }

  // Close log details
  closeLogDetails() {
    this.selectedLog.set(null);
  }

  // Helper to check if data object has keys
  hasData(data: Record<string, unknown>): boolean {
    return Object.keys(data).length > 0;
  }

  // Get scope label
  getScopeLabel(scope: NotificationScope | undefined): string {
    if (!scope) return 'User';
    const option = this.scopeOptions.find((o) => o.value === scope);
    return option?.label || scope;
  }

  // Get target user type labels
  getTargetUserTypesLabel(types: TargetUserType[] | undefined): string {
    if (!types || types.length === 0) return 'All Users';
    return types
      .map((t) => this.targetUserTypeOptions.find((o) => o.value === t)?.label || t)
      .join(', ');
  }

  // Toggle target user type in form
  toggleTargetUserType(type: TargetUserType) {
    this.templateForm.update((current) => {
      const currentTypes = current.targetUserTypes || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type];
      return { ...current, targetUserTypes: newTypes };
    });
  }

  // Check if target user type is selected
  isTargetUserTypeSelected(type: TargetUserType): boolean {
    return this.templateForm().targetUserTypes?.includes(type) || false;
  }
}
