import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  EmailService,
  type EmailTemplate,
  type EmailLog,
  type EmailTemplateCategory,
  type NotificationScope,
  type TargetUserType,
  type CreateEmailTemplateInput,
  type UpdateEmailTemplateInput,
} from './email.service';
import { ToastService } from '../../shared/ui';

@Component({
  selector: 'app-email',
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './email.component.html',
  styleUrl: './email.component.scss',
})
export class EmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly emailService = inject(EmailService);
  private readonly toast = inject(ToastService);

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
  templateForm = signal<Partial<CreateEmailTemplateInput>>({});

  // Category options for dropdown
  readonly categoryOptions: { value: EmailTemplateCategory; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'bookings', label: 'Bookings' },
    { value: 'experiences', label: 'Experiences' },
    { value: 'jobs', label: 'Jobs' },
    { value: 'members', label: 'Team & Members' },
    { value: 'payments', label: 'Payments' },
    { value: 'chats', label: 'Chats' },
    { value: 'promotions', label: 'Promotions' },
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

  // Expose service signals
  readonly templates = this.emailService.templates;
  readonly templatesLoading = this.emailService.templatesLoading;
  readonly templatesError = this.emailService.templatesError;

  readonly stats = this.emailService.stats;
  readonly statsLoading = this.emailService.statsLoading;

  // Stats computed
  readonly totalTemplates = this.emailService.totalTemplates;
  readonly activeTemplates = this.emailService.activeTemplates;
  readonly inactiveTemplates = this.emailService.inactiveTemplates;

  // Log signals
  readonly logs = this.emailService.logs;
  readonly logsLoading = this.emailService.logsLoading;
  readonly logsError = this.emailService.logsError;
  readonly logsMeta = this.emailService.logsMeta;

  readonly logStats = this.emailService.logStats;
  readonly logStatsLoading = this.emailService.logStatsLoading;
  readonly totalLogs = this.emailService.totalLogs;
  readonly logsLast24Hours = this.emailService.logsLast24Hours;
  readonly deliveredLogs = this.emailService.deliveredLogs;
  readonly failedLogs = this.emailService.failedLogs;
  readonly bouncedLogs = this.emailService.bouncedLogs;

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
        t.sendGridTemplateId.toLowerCase().includes(query)
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
          this.emailService.getLogsAsync({
            startDate: this.logStartDate || undefined,
            endDate: this.logEndDate || undefined,
            page: this.logCurrentPage,
            limit: this.logPageLimit,
          }),
          this.emailService.getLogStatsAsync(),
        ]);
      } else {
        // Load templates
        await this.emailService.getTemplatesAsync();
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
    this.templateForm.set({});
    this.isEditMode.set(false);
    this.editingTemplateId.set(null);
    this.showModal.set(true);
  }

  // Open edit modal
  openEditModal(template: EmailTemplate) {
    this.templateForm.set({
      templateId: template.templateId,
      name: template.name,
      title: template.title,
      description: template.description,
      category: template.category,
      scope: template.scope,
      targetUserTypes: template.targetUserTypes,
      sendGridTemplateId: template.sendGridTemplateId,
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
  updateFormField(field: keyof CreateEmailTemplateInput, value: string) {
    this.templateForm.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // Save template (create or update)
  async saveTemplate() {
    const data = this.templateForm();

    if (this.isEditMode()) {
      // Edit mode - name, title, sendGridTemplateId required
      if (!data.name || !data.title || !data.sendGridTemplateId) {
        this.toast.warning('Please fill in all required fields (Name, Title, SendGrid Template ID)');
        return;
      }
    } else {
      // Create mode - all fields required
      if (!data.templateId || !data.name || !data.title || !data.sendGridTemplateId) {
        this.toast.warning('Please fill in all required fields (Template ID, Name, Title, SendGrid Template ID)');
        return;
      }
    }

    this.isSubmitting.set(true);
    try {
      if (this.isEditMode() && this.editingTemplateId()) {
        const updateData: UpdateEmailTemplateInput = {
          name: data.name,
          title: data.title,
          description: data.description,
          category: data.category,
          scope: data.scope,
          targetUserTypes: data.targetUserTypes,
          sendGridTemplateId: data.sendGridTemplateId,
        };
        await this.emailService.updateTemplateAsync(this.editingTemplateId()!, updateData);
        this.closeModal();
        this.toast.success('Template updated successfully');
      } else {
        await this.emailService.createTemplateAsync(data as CreateEmailTemplateInput);
        this.closeModal();
        this.toast.success('Template created successfully');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      this.toast.error(this.isEditMode() ? 'Failed to update template' : 'Failed to create template');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Toggle template status
  async toggleTemplateStatus(template: EmailTemplate) {
    try {
      await this.emailService.toggleTemplateStatus(template._id, !template.isActive).toPromise();
      this.toast.success(`Template ${!template.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling status:', error);
      this.toast.error('Failed to update status');
    }
  }

  // Delete template
  async deleteTemplate(template: EmailTemplate) {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await this.emailService.deleteTemplateAsync(template._id);
      this.toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      this.toast.error('Failed to delete template');
    }
  }

  // ============ EMAIL LOGS ============

  // Get status badge class
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-700';
      case 'OPENED':
      case 'CLICKED':
        return 'bg-blue-100 text-blue-700';
      case 'SENT':
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'FAILED':
      case 'BOUNCED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  // Delete email log
  async deleteLog(log: EmailLog) {
    if (!confirm(`Are you sure you want to delete this email log to "${log.toEmail}"?`)) {
      return;
    }

    try {
      await this.emailService.deleteLogAsync(log._id);
      this.toast.success('Email log deleted successfully');
    } catch (error) {
      console.error('Error deleting log:', error);
      this.toast.error('Failed to delete email log');
    }
  }

  // Selected log for detail view
  selectedLog = signal<EmailLog | null>(null);

  // View log details
  viewLogDetails(log: EmailLog) {
    this.selectedLog.set(log);
  }

  // Close log details
  closeLogDetails() {
    this.selectedLog.set(null);
  }

  // Get category label
  getCategoryLabel(category: EmailTemplateCategory | undefined): string {
    if (!category) return 'Uncategorized';
    const option = this.categoryOptions.find((o) => o.value === category);
    return option?.label || category;
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
