import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SocialLogin {
  name: string;
  icon: string;
  enabled: boolean;
}

interface DeviceInfo {
  id: string;
  os: string;
  browser: string;
  location: string;
  lastActive: string;
}

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
})
export class UserSettingsComponent {
  readonly loading = signal(false);

  // User data
  readonly userEmail = signal('john@example.com');
  readonly userPhone = signal('+60 12-345 6789');
  readonly isEmailVerified = signal(true);
  readonly isPhoneVerified = signal(true);
  readonly hasPassword = signal(true);

  // Edit states
  readonly editEmail = signal(false);
  readonly editPhone = signal(false);
  readonly editPassword = signal(false);

  // Social logins
  readonly socialLogins = signal<SocialLogin[]>([
    { name: 'Google', icon: 'google', enabled: true },
    { name: 'Facebook', icon: 'facebook', enabled: false },
    { name: 'Apple', icon: 'apple', enabled: false },
  ]);

  // Device history
  readonly deviceHistory = signal<DeviceInfo[]>([
    {
      id: '1',
      os: 'Windows 11',
      browser: 'Chrome 120',
      location: 'Kuala Lumpur, Malaysia',
      lastActive: 'Dec 15, 2024',
    },
    {
      id: '2',
      os: 'macOS Sonoma',
      browser: 'Safari 17',
      location: 'Petaling Jaya, Malaysia',
      lastActive: 'Dec 14, 2024',
    },
    {
      id: '3',
      os: 'iOS 17',
      browser: 'Safari Mobile',
      location: 'Kuala Lumpur, Malaysia',
      lastActive: 'Dec 12, 2024',
    },
  ]);

  toggleEditEmail() {
    this.editEmail.update(v => !v);
  }

  toggleEditPhone() {
    this.editPhone.update(v => !v);
  }

  toggleEditPassword() {
    this.editPassword.update(v => !v);
  }

  toggleSocialLogin(social: SocialLogin) {
    social.enabled = !social.enabled;
    console.log('Toggle social login:', social);
  }

  saveEmail() {
    console.log('Save email');
    this.editEmail.set(false);
  }

  savePhone() {
    console.log('Save phone');
    this.editPhone.set(false);
  }

  savePassword() {
    console.log('Save password');
    this.editPassword.set(false);
  }

  resendVerification() {
    console.log('Resend verification email');
  }
}
