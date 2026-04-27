import { Component, signal, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@mereka/ui';
import { UserNotificationSettingsComponent } from '../notification-settings/notification-settings.component';
import {
  UserNotificationService,
  type UserNotification,
} from '../../services/user-notification.service';

@Component({
  selector: 'app-user-notifications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    UserNotificationSettingsComponent,
    DatePipe,
  ],
  templateUrl: './notifications.component.html',
})
export class UserNotificationsComponent implements OnInit {
  private readonly notificationService = inject(UserNotificationService);

  readonly loading = this.notificationService.loading;
  readonly loadingMore = this.notificationService.loadingMore;
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = this.notificationService.unreadCount;
  readonly hasMore = this.notificationService.hasMore;
  readonly error = this.notificationService.error;

  readonly activeTab = signal<'all' | 'settings'>('all');

  ngOnInit() {
    this.notificationService.loadNotifications();
  }

  @HostListener('window:scroll')
  onScroll() {
    // Infinite scroll - load more when near bottom
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= documentHeight - 200 && this.hasMore() && !this.loadingMore()) {
      this.notificationService.loadMore();
    }
  }

  markAsRead(notification: UserNotification) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification._id);
    }
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(event: Event, notification: UserNotification) {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification._id);
  }

  loadMore() {
    this.notificationService.loadMore();
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  }

  getNotificationIcon(templateId?: string): 'check-circle' | 'error' | 'clock' | 'info' | 'bell' {
    if (!templateId) return 'bell';

    const lowerTemplateId = templateId.toLowerCase();
    if (lowerTemplateId.includes('booking') || lowerTemplateId.includes('confirmed'))
      return 'check-circle';
    if (lowerTemplateId.includes('cancelled') || lowerTemplateId.includes('rejected'))
      return 'error';
    if (lowerTemplateId.includes('reminder')) return 'clock';
    if (lowerTemplateId.includes('password') || lowerTemplateId.includes('otp'))
      return 'info';
    return 'info';
  }

  getNotificationClasses(templateId?: string): string {
    if (!templateId) return 'bg-info/10 text-info';

    const lowerTemplateId = templateId.toLowerCase();
    if (lowerTemplateId.includes('confirmed') || lowerTemplateId.includes('approved') || lowerTemplateId.includes('success'))
      return 'bg-success/10 text-success';
    if (lowerTemplateId.includes('cancelled') || lowerTemplateId.includes('rejected') || lowerTemplateId.includes('failed'))
      return 'bg-error/10 text-error';
    if (lowerTemplateId.includes('reminder') || lowerTemplateId.includes('pending'))
      return 'bg-warning/10 text-warning';
    return 'bg-info/10 text-info';
  }
}
