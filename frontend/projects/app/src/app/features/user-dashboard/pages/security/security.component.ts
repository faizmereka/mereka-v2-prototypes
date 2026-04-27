import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface LoginHistory {
  id: string;
  device: string;
  location: string;
  ip: string;
  date: string;
  isCurrent: boolean;
}

@Component({
  selector: 'app-user-security',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './security.component.html',
})
export class UserSecurityComponent {
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showChangePasswordModal = signal(false);

  readonly twoFactorEnabled = signal(false);
  readonly emailNotifications = signal(true);

  readonly loginHistory = signal<LoginHistory[]>([
    {
      id: '1',
      device: 'Chrome on macOS',
      location: 'Kuala Lumpur, Malaysia',
      ip: '175.143.xxx.xxx',
      date: '2024-12-09T10:30:00',
      isCurrent: true,
    },
    {
      id: '2',
      device: 'Safari on iPhone',
      location: 'Petaling Jaya, Malaysia',
      ip: '115.164.xxx.xxx',
      date: '2024-12-08T15:45:00',
      isCurrent: false,
    },
    {
      id: '3',
      device: 'Firefox on Windows',
      location: 'Singapore',
      ip: '202.156.xxx.xxx',
      date: '2024-12-05T09:20:00',
      isCurrent: false,
    },
  ]);

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  toggleTwoFactor() {
    this.twoFactorEnabled.update((v) => !v);
    // TODO: Implement 2FA toggle
  }

  toggleEmailNotifications() {
    this.emailNotifications.update((v) => !v);
    // TODO: Implement email notifications toggle
  }

  openChangePasswordModal() {
    this.showChangePasswordModal.set(true);
  }

  closeChangePasswordModal() {
    this.showChangePasswordModal.set(false);
  }

  changePassword() {
    this.saving.set(true);
    // TODO: Implement change password
    setTimeout(() => {
      this.saving.set(false);
      this.showChangePasswordModal.set(false);
    }, 1000);
  }

  revokeSession(id: string) {
    // TODO: Implement revoke session
    console.log('Revoke session:', id);
  }

  revokeAllSessions() {
    // TODO: Implement revoke all sessions
    console.log('Revoke all sessions');
  }
}
