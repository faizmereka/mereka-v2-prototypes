import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  NotificationService,
  type NotificationTemplate,
  type Notification,
  type NotificationStatus,
  type NotificationCategory,
  type NotificationScope,
  type TargetUserType,
  type CreateNotificationTemplateInput,
  type UpdateNotificationTemplateInput,
} from './notification.service';
import { ToastService } from '../../shared/ui';

@Component({
  selector: 'app-notifications',
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);
  private readonly toast = inject(ToastService);

  // Tab state
  activeTab = signal<'templates' | 'logs'>('templates');

  // Search and filters
  searchQuery = '';
  logSearchQuery = '';
  statusFilter = signal<NotificationStatus | 'all'>('all');

  // Date range and pagination
  logStartDate = '';
  logEndDate = '';
  logCurrentPage = 1;
  logPageLimit = 20;

  // Modal state
  showModal = signal(false);
  isSubmitting = signal(false);
  isEditMode = signal(false);
  editingTemplateId = signal<string | null>(null);

  // Form data for template
  templateForm = signal<Partial<CreateNotificationTemplateInput>>({});

  // Category options for dropdown
  readonly categoryOptions: { value: NotificationCategory; label: string }[] = [
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
  readonly templates = this.notificationService.templates;
  readonly templatesLoading = this.notificationService.templatesLoading;
  readonly templatesError = this.notificationService.templatesError;

  readonly notifications = this.notificationService.notifications;
  readonly notificationsLoading = this.notificationService.notificationsLoading;
  readonly notificationsError = this.notificationService.notificationsError;
  readonly notificationsMeta = this.notificationService.notificationsMeta;

  readonly stats = this.notificationService.stats;
  readonly statsLoading = this.notificationService.statsLoading;

  // Stats computed
  readonly totalNotifications = this.notificationService.totalNotifications;
  readonly deliveredNotifications = this.notificationService.deliveredCount;
  readonly readNotifications = this.notificationService.readCount;
  readonly failedNotifications = this.notificationService.failedCount;

  // Filtered templates based on search
  filteredTemplates = computed(() => {
    const templates = this.templates();
    if (!this.searchQuery) return templates;
    const query = this.searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.title.toLowerCase().includes(query) ||
        t.templateId.toLowerCase().includes(query)
    );
  });

  // Filtered notifications based on search and filters
  filteredNotifications = computed(() => {
    let notifications = this.notifications();

    // Apply status filter
    if (this.statusFilter() !== 'all') {
      notifications = notifications.filter((n) => n.status === this.statusFilter());
    }

    // Apply search
    if (this.logSearchQuery) {
      const query = this.logSearchQuery.toLowerCase();
      notifications = notifications.filter((n) => {
        const userEmail = typeof n.userId === 'object' ? n.userId.email : '';
        return (
          n.title.toLowerCase().includes(query) ||
          userEmail.toLowerCase().includes(query) ||
          (n.templateId?.toLowerCase().includes(query) ?? false)
        );
      });
    }

    return notifications;
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
      // Load stats
      await this.notificationService.getStatsAsync();

      // Load based on active tab
      if (this.activeTab() === 'templates') {
        await this.notificationService.getTemplatesAsync();
      } else {
        await this.notificationService.getNotificationsAsync({
          startDate: this.logStartDate || undefined,
          endDate: this.logEndDate || undefined,
          page: this.logCurrentPage,
          limit: this.logPageLimit,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  onTabChange(tab: 'templates' | 'logs') {
    this.activeTab.set(tab);
    this.loadData();
  }

  // Apply log filters
  applyLogFilters() {
    this.logCurrentPage = 1;
    this.loadData();
  }

  // Clear log filters
  clearLogFilters() {
    this.logSearchQuery = '';
    this.logStartDate = '';
    this.logEndDate = '';
    this.logCurrentPage = 1;
    this.statusFilter.set('all');
    this.loadData();
  }

  // Pagination methods
  goToPage(page: number) {
    const meta = this.notificationsMeta();
    if (meta && page >= 1 && page <= meta.totalPages) {
      this.logCurrentPage = page;
      this.loadData();
    }
  }

  nextPage() {
    const meta = this.notificationsMeta();
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
    const meta = this.notificationsMeta();
    if (!meta) return [];

    const totalPages = meta.totalPages;
    const current = this.logCurrentPage;
    const pages: number[] = [];

    let start = Math.max(1, current - 2);
    const end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Status display helper
  getStatusDisplay(status: string): string {
    return status.toLowerCase().replace('_', ' ');
  }

  // Get user email from notification
  getUserEmail(notification: Notification): string {
    if (typeof notification.userId === 'object') {
      return notification.userId.email;
    }
    return notification.userId || 'Unknown';
  }

  // Open add modal
  openAddModal() {
    this.templateForm.set({});
    this.isEditMode.set(false);
    this.editingTemplateId.set(null);
    this.showModal.set(true);
  }

  // Open edit modal
  openEditModal(template: NotificationTemplate) {
    this.templateForm.set({
      templateId: template.templateId,
      name: template.name,
      title: template.title,
      body: template.body,
      description: template.description,
      category: template.category,
      scope: template.scope,
      targetUserTypes: template.targetUserTypes,
    });
    this.isEditMode.set(true);
    this.editingTemplateId.set(template._id);
    this.showModal.set(true);
  }

  // Get category label
  getCategoryLabel(category: NotificationCategory | undefined): string {
    if (!category) return 'Uncategorized';
    const option = this.categoryOptions.find((o) => o.value === category);
    return option?.label || category;
  }

  // Close modal
  closeModal() {
    this.showModal.set(false);
    this.templateForm.set({});
    this.isEditMode.set(false);
    this.editingTemplateId.set(null);
  }

  // Update form field
  updateFormField(field: keyof CreateNotificationTemplateInput, value: string) {
    this.templateForm.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // Save template (create or update)
  async saveTemplate() {
    const data = this.templateForm();

    if (this.isEditMode()) {
      // Edit mode - name, title, body required
      if (!data.name || !data.title || !data.body) {
        this.toast.warning('Please fill in all required fields (Name, Title, Body)');
        return;
      }
    } else {
      // Create mode - all fields required
      if (!data.templateId || !data.name || !data.title || !data.body) {
        this.toast.warning('Please fill in all required fields (Template ID, Name, Title, Body)');
        return;
      }
    }

    this.isSubmitting.set(true);
    try {
      if (this.isEditMode() && this.editingTemplateId()) {
        const updateData: UpdateNotificationTemplateInput = {
          name: data.name,
          title: data.title,
          body: data.body,
          description: data.description,
          category: data.category,
          scope: data.scope,
          targetUserTypes: data.targetUserTypes,
        };
        await this.notificationService.updateTemplateAsync(this.editingTemplateId()!, updateData);
        this.closeModal();
        this.toast.success('Template updated successfully');
      } else {
        await this.notificationService.createTemplateAsync(data as CreateNotificationTemplateInput);
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
  async toggleTemplateStatus(template: NotificationTemplate) {
    try {
      await this.notificationService.toggleTemplateStatus(template._id, !template.isActive).toPromise();
      this.toast.success(`Template ${!template.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling status:', error);
      this.toast.error('Failed to update status');
    }
  }

  // Delete template
  async deleteTemplate(template: NotificationTemplate) {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await this.notificationService.deleteTemplateAsync(template._id);
      this.toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      this.toast.error('Failed to delete template');
    }
  }

  // Delete notification
  async deleteNotification(notification: Notification) {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      await this.notificationService.deleteNotification(notification._id).toPromise();
      this.toast.success('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      this.toast.error('Failed to delete notification');
    }
  }

  // Filter change handlers
  onStatusFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as NotificationStatus | 'all';
    this.statusFilter.set(value);
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
