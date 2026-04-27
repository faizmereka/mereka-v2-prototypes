import { Component, OnInit, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearnerAccountService, type UpdateAccountInput } from '../../services/learner-account.service';

@Component({
  selector: 'app-user-account',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class UserAccountComponent implements OnInit {
  private readonly accountService = inject(LearnerAccountService);

  // Service signals
  readonly loading = this.accountService.loading;
  readonly saving = this.accountService.saving;
  readonly error = this.accountService.error;

  // Form values (local state for editing)
  readonly accountType = signal('User');
  readonly displayName = signal('');
  readonly dob = signal('');
  readonly userName = signal('');
  readonly email = signal('');
  readonly phoneNo = signal('');
  readonly language = signal('');
  readonly currency = signal('');
  readonly timeZone = signal('');
  readonly emailVerified = computed(() => this.accountService.emailVerified());

  // Edit mode toggles
  readonly displayNameEditable = signal(true);
  readonly dobEditable = signal(true);
  readonly usernameEditable = signal(true);
  readonly languageEditable = signal(true);
  readonly currencyEditable = signal(true);
  readonly timeZoneEditable = signal(true);

  // Dropdown options
  readonly languagesList = [
    { value: 'en', label: 'English' },
    { value: 'ms', label: 'Malay' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ta', label: 'Tamil' },
  ];

  readonly currencyList = [
    { value: 'MYR', label: 'MYR' },
    { value: 'USD', label: 'USD' },
    { value: 'SGD', label: 'SGD' },
    { value: 'IDR', label: 'IDR' },
  ];

  readonly timeZoneList = [
    { value: 'Asia/Kuala_Lumpur', label: 'Asia/Kuala_Lumpur' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore' },
    { value: 'Asia/Jakarta', label: 'Asia/Jakarta' },
    { value: 'Australia/Melbourne', label: 'Australia/Melbourne' },
    { value: 'UTC', label: 'UTC' },
  ];

  constructor() {
    // Sync service data to local form signals when data changes
    effect(() => {
      const data = this.accountService.data();
      if (data) {
        this.accountType.set(data.accountType);
        this.displayName.set(data.displayName);
        this.dob.set(data.birthDate || '');
        this.userName.set(data.username || '');
        this.email.set(data.email);
        this.phoneNo.set(data.phoneNumber || '');
        this.language.set(data.language || '');
        this.currency.set(data.currency);
        this.timeZone.set(data.timeZone);
      }
    });
  }

  ngOnInit(): void {
    void this.accountService.loadAccount();
  }

  toggleDisplayName(): void {
    this.displayNameEditable.update((v) => !v);
  }

  toggleDob(): void {
    this.dobEditable.update((v) => !v);
  }

  toggleUsername(): void {
    this.usernameEditable.update((v) => !v);
  }

  toggleLanguage(): void {
    this.languageEditable.update((v) => !v);
  }

  toggleCurrency(): void {
    this.currencyEditable.update((v) => !v);
  }

  toggleTimeZone(): void {
    this.timeZoneEditable.update((v) => !v);
  }

  async saveField(field: keyof UpdateAccountInput): Promise<void> {
    const updateData: UpdateAccountInput = {};

    switch (field) {
      case 'displayName':
        updateData.displayName = this.displayName();
        break;
      case 'username':
        updateData.username = this.userName();
        break;
      case 'birthDate':
        updateData.birthDate = this.dob();
        break;
      case 'language':
        updateData.language = this.language();
        break;
      case 'currency':
        updateData.currency = this.currency();
        break;
      case 'timeZone':
        updateData.timeZone = this.timeZone();
        break;
    }

    await this.accountService.updateAccount(updateData);
  }

  async saveAndUpdate(): Promise<void> {
    const updateData: UpdateAccountInput = {
      displayName: this.displayName(),
      username: this.userName() || undefined,
      birthDate: this.dob() || undefined,
      language: this.language() || undefined,
      currency: this.currency(),
      timeZone: this.timeZone(),
    };

    await this.accountService.updateAccount(updateData);
  }

  verifyEmail(): void {
    // TODO: Implement email verification
    console.log('Sending verification email...');
  }

  refresh(): void {
    void this.accountService.refresh();
  }

  getLanguageLabel(value: string): string {
    const lang = this.languagesList.find((l) => l.value === value);
    return lang?.label || value || '';
  }

  getTimeZoneLabel(value: string): string {
    const tz = this.timeZoneList.find((t) => t.value === value);
    return tz?.label || value || '';
  }
}
