import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent, DialogRef, DIALOG_DATA } from '@mereka/ui';
import { HubTeamService, HubRole, InviteMembersResult } from '../../../../../../../core/services/hub-team.service';

export interface InviteModalData {
  hubId: string;
  roles: HubRole[];
  existingEmails: string[];
}

type InviteTab = 'manual' | 'link' | 'csv';

interface InviteEntry {
  email: string;
  roleId: string;
}

@Component({
  selector: 'app-invite-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="invite-modal">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-neutral-200">
        <h2 class="text-xl font-bold text-neutral-900">Invite Team Members</h2>
        <button
          type="button"
          (click)="close()"
          class="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <ui-icon name="close" size="sm" />
        </button>
      </div>

      <!-- Tabs (hidden on success) -->
      @if (!successResult()) {
        <div class="flex border-b border-neutral-200">
          <button
            type="button"
            (click)="activeTab.set('manual')"
            class="flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2"
            [ngClass]="activeTab() === 'manual'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'"
          >
            <ui-icon name="users" size="sm" />
            <span>Manual</span>
          </button>
          <button
            type="button"
            (click)="activeTab.set('link')"
            class="flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2"
            [ngClass]="activeTab() === 'link'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'"
          >
            <ui-icon name="link" size="sm" />
            <span>Create Link</span>
          </button>
          <button
            type="button"
            (click)="activeTab.set('csv')"
            class="flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2"
            [ngClass]="activeTab() === 'csv'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'"
          >
            <ui-icon name="upload" size="sm" />
            <span>CSV Upload</span>
          </button>
        </div>
      }

      <!-- Content -->
      <div class="p-6">
        <!-- Success State -->
        @if (successResult()) {
          <div class="space-y-4">
            <div class="text-center mb-4">
              <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-neutral-900">Invitations Sent!</h3>
              <p class="text-sm text-neutral-600 mt-1">
                {{ successResult()?.invited }} invitation(s) sent successfully.
              </p>
            </div>

            @if (successResult()?.invitations?.length) {
              <div class="bg-neutral-50 rounded-lg p-4">
                <p class="text-sm font-medium text-neutral-700 mb-3">
                  Invitation URLs (for testing):
                </p>
                <div class="space-y-2">
                  @for (inv of successResult()?.invitations; track inv.email) {
                    <div class="bg-white rounded border border-neutral-200 p-3">
                      <p class="text-xs text-neutral-500 mb-1">{{ inv.email }}</p>
                      <div class="flex gap-2">
                        <input
                          type="text"
                          [value]="inv.invitationUrl"
                          readonly
                          class="flex-1 text-xs px-2 py-1 border border-neutral-200 rounded bg-neutral-50"
                        />
                        <button
                          type="button"
                          (click)="copyInvitationUrl(inv.invitationUrl)"
                          class="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                        >
                          {{ copiedUrl() === inv.invitationUrl ? 'Copied!' : 'Copy' }}
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            @if (successResult()?.failed?.length) {
              <div class="bg-red-50 rounded-lg p-4">
                <p class="text-sm font-medium text-red-700 mb-2">Failed to invite:</p>
                <ul class="text-sm text-red-600">
                  @for (email of successResult()?.failed; track email) {
                    <li>{{ email }}</li>
                  }
                </ul>
              </div>
            }

            <button
              type="button"
              (click)="closeSuccess()"
              class="w-full px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Done
            </button>
          </div>
        }

        <!-- Manual Tab -->
        @if (activeTab() === 'manual' && !successResult()) {
          <div class="space-y-4">
            @for (entry of inviteEntries(); track $index) {
              <div class="flex gap-4 items-start">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                  <input
                    type="email"
                    [ngModel]="entry.email"
                    (ngModelChange)="updateEntry($index, 'email', $event)"
                    placeholder="Enter email address"
                    class="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div class="w-40">
                  <label class="block text-sm font-medium text-neutral-700 mb-1">Role</label>
                  <select
                    [ngModel]="entry.roleId"
                    (ngModelChange)="updateEntry($index, 'roleId', $event)"
                    class="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    @for (role of data.roles; track role.id) {
                      <option [value]="role.id">{{ role.name === 'Expert' ? 'Team Member' : role.name }}</option>
                    }
                  </select>
                </div>
                @if (inviteEntries().length > 1) {
                  <button
                    type="button"
                    (click)="removeEntry($index)"
                    class="mt-7 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <ui-icon name="trash" size="sm" />
                  </button>
                }
              </div>
            }

            <button
              type="button"
              (click)="addEntry()"
              class="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
            >
              <ui-icon name="plus" size="sm" />
              <span>Add another</span>
            </button>
          </div>
        }

        <!-- Create Link Tab -->
        @if (activeTab() === 'link' && !successResult()) {
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">Role</label>
              <select
                [ngModel]="linkRoleId()"
                (ngModelChange)="linkRoleId.set($event)"
                class="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                @for (role of data.roles; track role.id) {
                  <option [value]="role.id">{{ role.name === 'Expert' ? 'Team Member' : role.name }}</option>
                }
              </select>
            </div>

            @if (generatedLink()) {
              <div class="p-4 bg-neutral-50 rounded-lg">
                <label class="block text-sm font-medium text-neutral-700 mb-2">Invitation Link</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    [value]="generatedLink()"
                    readonly
                    class="flex-1 px-4 py-2 border border-neutral-200 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    (click)="copyLink()"
                    class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    {{ copied() ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
                <p class="text-sm text-neutral-500 mt-2">This link will expire in 30 days.</p>
              </div>
            }
          </div>
        }

        <!-- CSV Upload Tab -->
        @if (activeTab() === 'csv' && !successResult()) {
          <div class="space-y-4">
            <div
              class="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center"
              [ngClass]="{ 'border-primary bg-primary/5': isDragging() }"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave()"
              (drop)="onDrop($event)"
            >
              @if (!csvFile()) {
                <ui-icon name="upload" size="lg" class="text-neutral-400 mx-auto mb-4" />
                <p class="text-neutral-600 mb-2">Drag and drop your CSV file here</p>
                <p class="text-sm text-neutral-500 mb-4">or</p>
                <label class="cursor-pointer">
                  <span class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                    Browse Files
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    (change)="onFileSelect($event)"
                    class="hidden"
                  />
                </label>
              } @else {
                <div class="flex items-center justify-center gap-4">
                  <ui-icon name="file" size="lg" class="text-primary" />
                  <div class="text-left">
                    <p class="font-medium text-neutral-900">{{ csvFile()?.name }}</p>
                    <p class="text-sm text-neutral-500">{{ csvEntries().length }} entries found</p>
                  </div>
                  <button
                    type="button"
                    (click)="clearCsv()"
                    class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <ui-icon name="close" size="sm" />
                  </button>
                </div>
              }
            </div>

            <div class="text-sm text-neutral-500">
              <p class="font-medium mb-1">CSV Format:</p>
              <p>email,role (Admin or Team Member)</p>
              <p class="mt-1">Example: john&#64;example.com,Admin</p>
            </div>
          </div>
        }

        <!-- Error Message -->
        @if (error() && !successResult()) {
          <div class="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {{ error() }}
          </div>
        }
      </div>

      <!-- Footer (hidden on success) -->
      @if (!successResult()) {
        <div class="flex justify-end gap-3 p-6 border-t border-neutral-200">
          <button
            type="button"
            (click)="close()"
            class="px-6 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="submit()"
            [disabled]="loading() || !canSubmit()"
            class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading() ? 'Sending...' : getSubmitLabel() }}
          </button>
        </div>
      }
    </div>
  `,
})
export class InviteModalComponent implements OnInit {
  private readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<InviteModalData>(DIALOG_DATA);
  private readonly hubTeamService = inject(HubTeamService);

  activeTab = signal<InviteTab>('manual');
  loading = signal(false);
  error = signal('');

  // Manual tab
  inviteEntries = signal<InviteEntry[]>([{ email: '', roleId: '' }]);

  // Link tab
  linkRoleId = signal('');
  generatedLink = signal('');
  copied = signal(false);

  // Success state - shows invitation URLs after sending
  successResult = signal<InviteMembersResult | null>(null);
  copiedUrl = signal<string | null>(null);

  // CSV tab
  csvFile = signal<File | null>(null);
  csvEntries = signal<InviteEntry[]>([]);
  isDragging = signal(false);

  ngOnInit(): void {
    // Set default role
    if (this.data.roles.length > 0) {
      const defaultRole = this.data.roles.find(r => r.key === 'expert') || this.data.roles[0];
      this.inviteEntries.set([{ email: '', roleId: defaultRole.id }]);
      this.linkRoleId.set(defaultRole.id);
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }

  // Manual tab methods
  addEntry(): void {
    const defaultRole = this.data.roles.find(r => r.key === 'expert') || this.data.roles[0];
    this.inviteEntries.update(entries => [...entries, { email: '', roleId: defaultRole?.id || '' }]);
  }

  removeEntry(index: number): void {
    this.inviteEntries.update(entries => entries.filter((_, i) => i !== index));
  }

  updateEntry(index: number, field: 'email' | 'roleId', value: string): void {
    this.inviteEntries.update(entries => {
      const updated = [...entries];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  // Link tab methods
  async generateLink(): Promise<void> {
    const roleId = this.linkRoleId();
    if (!roleId) return;

    this.loading.set(true);
    this.error.set('');

    try {
      const result = await this.hubTeamService.createInvitationLink(this.data.hubId, roleId);
      this.generatedLink.set(result.link);
    } catch (err) {
      this.error.set('Failed to generate invitation link');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.generatedLink());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  copyInvitationUrl(url: string): void {
    navigator.clipboard.writeText(url);
    this.copiedUrl.set(url);
    setTimeout(() => this.copiedUrl.set(null), 2000);
  }

  // CSV tab methods
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && file.name.endsWith('.csv')) {
      this.parseCsv(file);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.parseCsv(file);
    }
  }

  parseCsv(file: File): void {
    this.csvFile.set(file);
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const lines = content.split('\n').filter(line => line.trim());
      const entries: InviteEntry[] = [];

      for (const line of lines) {
        const [email, roleName] = line.split(',').map(s => s.trim());
        if (email && email.includes('@')) {
          const role = this.data.roles.find(
            r => r.name.toLowerCase() === roleName?.toLowerCase() ||
                 (roleName?.toLowerCase() === 'team member' && r.key === 'expert')
          );
          entries.push({
            email,
            roleId: role?.id || this.data.roles[0]?.id || '',
          });
        }
      }

      this.csvEntries.set(entries);
    };
    reader.readAsText(file);
  }

  clearCsv(): void {
    this.csvFile.set(null);
    this.csvEntries.set([]);
  }

  // Submit
  canSubmit(): boolean {
    const tab = this.activeTab();
    if (tab === 'manual') {
      return this.inviteEntries().some(e => e.email && e.email.includes('@') && e.roleId);
    }
    if (tab === 'link') {
      return !!this.linkRoleId();
    }
    if (tab === 'csv') {
      return this.csvEntries().length > 0;
    }
    return false;
  }

  getSubmitLabel(): string {
    const tab = this.activeTab();
    if (tab === 'link') {
      return this.generatedLink() ? 'Copy & Close' : 'Generate Link';
    }
    return 'Send Invitations';
  }

  async submit(): Promise<void> {
    const tab = this.activeTab();
    this.error.set('');

    if (tab === 'link') {
      if (this.generatedLink()) {
        this.copyLink();
        this.dialogRef.close(true);
      } else {
        await this.generateLink();
      }
      return;
    }

    // Manual or CSV
    const entries = tab === 'manual'
      ? this.inviteEntries().filter(e => e.email && e.email.includes('@') && e.roleId)
      : this.csvEntries();

    if (entries.length === 0) return;

    // Check for existing emails
    const existingEmails = (this.data.existingEmails || [])
      .filter(e => e != null)
      .map(e => e.toLowerCase());
    const duplicates = entries.filter(e => e.email && existingEmails.includes(e.email.toLowerCase()));
    if (duplicates.length > 0) {
      this.error.set(`These emails are already invited: ${duplicates.map(d => d.email).join(', ')}`);
      return;
    }

    this.loading.set(true);

    try {
      // Group by role and send invitations
      const byRole = entries.reduce((acc, entry) => {
        if (!acc[entry.roleId]) acc[entry.roleId] = [];
        acc[entry.roleId].push(entry.email);
        return acc;
      }, {} as Record<string, string[]>);

      // Collect all results
      const allInvitations: InviteMembersResult['invitations'] = [];
      let totalInvited = 0;
      const allFailed: string[] = [];

      for (const [roleId, emails] of Object.entries(byRole)) {
        const result = await this.hubTeamService.inviteMembers(this.data.hubId, emails, roleId);
        totalInvited += result.invited;
        allFailed.push(...result.failed);
        allInvitations.push(...result.invitations);
      }

      // Show success state with invitation URLs
      this.successResult.set({
        success: true,
        invited: totalInvited,
        failed: allFailed,
        invitations: allInvitations,
      });
    } catch (err) {
      this.error.set('Failed to send invitations');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  closeSuccess(): void {
    this.dialogRef.close(true);
  }
}
