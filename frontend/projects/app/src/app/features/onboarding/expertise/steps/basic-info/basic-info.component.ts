import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  UiCollapsibleComponent,
  UiInputComponent,
  UiTextareaComponent,
  UiSelectComponent,
  UiFormGroupComponent,
  UiFormLabelComponent,
  UiFormHintComponent,
  UiCharacterCountComponent,
} from '@mereka/ui';
import { ExpertiseOnboardingService, ExpertiseHost } from '../../services/expertise-onboarding.service';
import { AuthStateService } from '../../../../../core/services/auth-state.service';
import { HubTeamService, type HubTeamMember, type HubRole } from '../../../../../core/services';

@Component({
  selector: 'app-expertise-basic-info',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    UiCollapsibleComponent,
    UiInputComponent,
    UiTextareaComponent,
    UiSelectComponent,
    UiFormGroupComponent,
    UiFormLabelComponent,
    UiFormHintComponent,
    UiCharacterCountComponent,
  ],
  templateUrl: './basic-info.component.html',
})
export class ExpertiseBasicInfoComponent implements OnInit {
  private readonly onboardingService = inject(ExpertiseOnboardingService);
  private readonly authState = inject(AuthStateService);
  private readonly hubTeamService = inject(HubTeamService);

  // Expose form from service
  readonly form = this.onboardingService.basicInfoForm;

  // Host state
  readonly hostDescription = signal('');
  readonly currentHost = signal<ExpertiseHost | null>(null);
  readonly teamMembers = signal<HubTeamMember[]>([]);
  readonly hubRoles = signal<HubRole[]>([]);
  readonly loadingTeamMembers = signal(false);

  // Language options
  readonly languageOptions = [
    { value: 'English', label: 'English' },
    { value: 'Malay', label: 'Bahasa Malaysia' },
    { value: 'Mandarin', label: 'Mandarin' },
    { value: 'Tamil', label: 'Tamil' },
    { value: 'Hindi', label: 'Hindi' },
    { value: 'Spanish', label: 'Spanish' },
    { value: 'French', label: 'French' },
    { value: 'Japanese', label: 'Japanese' },
    { value: 'Korean', label: 'Korean' },
    { value: 'Arabic', label: 'Arabic' },
  ];


  // Computed values
  readonly titleLength = computed(() => this.form.get('expertiseTitle')?.value?.length || 0);
  readonly summaryLength = computed(() => this.form.get('expertiseSummary')?.value?.length || 0);
  readonly hasHost = computed(() => !!this.currentHost());

  // Tag input
  newTag = '';

  ngOnInit(): void {
    // Subscribe to title changes to generate slug
    this.form.get('expertiseTitle')?.valueChanges.subscribe((title) => {
      if (title && !this.form.get('slug')?.dirty) {
        this.onboardingService.generateSlugFromTitle(title);
      }
    });

    // Initialize host from form (for edit mode)
    const existingHost = this.form.get('host')?.value as ExpertiseHost | null;
    if (existingHost) {
      this.currentHost.set(existingHost);
      if (existingHost.description) {
        this.hostDescription.set(existingHost.description);
      }
    }

    // Load team members for host selection
    void this.loadTeamMembers();
  }

  private async loadTeamMembers(): Promise<void> {
    this.loadingTeamMembers.set(true);
    try {
      const hubId = this.authState.selectedHub()?.id;
      if (!hubId) {
        this.teamMembers.set([]);
        this.hubRoles.set([]);
        return;
      }

      // Load members and roles in parallel
      const [members, roles] = await Promise.all([
        this.hubTeamService.listActiveMembers(hubId, { limit: 100 }),
        this.hubTeamService.listRoles(hubId),
      ]);

      this.teamMembers.set(members);
      this.hubRoles.set(roles);

      // Auto-select current user as host if not already set and user is in team members
      if (!this.form.get('host')?.value) {
        const user = this.authState.user();
        const currentUserMember = members.find(m => m.userId === user?.id);
        if (currentUserMember) {
          this.selectHostFromMember(currentUserMember);
        } else {
          this.selectCurrentUserAsHost();
        }
      }
    } catch {
      this.teamMembers.set([]);
      this.hubRoles.set([]);
      // Fallback to current user if team loading fails
      if (!this.form.get('host')?.value) {
        this.selectCurrentUserAsHost();
      }
    } finally {
      this.loadingTeamMembers.set(false);
    }
  }

  selectHostFromMember(member: HubTeamMember): void {
    const memberRoleKey = member.roleKeys?.[0];
    const matchingRole = this.hubRoles().find(r => r.key === memberRoleKey);

    const host: ExpertiseHost = {
      userId: member.userId,
      name: member.name,
      email: member.email,
      photoUrl: member.avatar || undefined,
      roleId: matchingRole?.id,
      description: member.bio || this.hostDescription(),
    };
    this.form.patchValue({ host });
    this.currentHost.set(host);
    this.hostDescription.set(host.description || '');
  }

  onTeamMemberSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const memberId = target.value;
    if (!memberId) return;

    const member = this.teamMembers().find(m => m.id === memberId);
    if (member) {
      this.selectHostFromMember(member);
    }
    target.value = '';
  }

  getRoleName(roleId?: string): string {
    if (!roleId) return 'Member';
    const role = this.hubRoles().find(r => r.id === roleId);
    return role?.name || 'Member';
  }

  clearHost(): void {
    this.form.patchValue({ host: null });
    this.currentHost.set(null);
    this.hostDescription.set('');
  }

  selectCurrentUserAsHost(): void {
    const user = this.authState.user();
    if (user) {
      const host: ExpertiseHost = {
        userId: user.id,
        name: user.name,
        email: user.email,
        photoUrl: user.profilePhoto || undefined,
        description: this.hostDescription(),
      };
      this.form.patchValue({ host });
      this.currentHost.set(host);
    }
  }

  updateHostDescription(description: string): void {
    this.hostDescription.set(description);
    const host = this.currentHost();
    if (host) {
      const updatedHost = { ...host, description };
      this.form.patchValue({ host: updatedHost });
      this.currentHost.set(updatedHost);
    }
  }

  isLanguageSelected(lang: string): boolean {
    const languages = this.form.get('secondaryLanguages')?.value || [];
    return languages.includes(lang);
  }

  toggleSecondaryLanguage(lang: string): void {
    const languages = [...(this.form.get('secondaryLanguages')?.value || [])];
    const index = languages.indexOf(lang);
    if (index === -1) {
      languages.push(lang);
    } else {
      languages.splice(index, 1);
    }
    this.form.patchValue({ secondaryLanguages: languages });
  }

  copySlug(): void {
    const slug = this.form.get('slug')?.value;
    if (slug) {
      const fullUrl = `mereka.io/expertise/${slug}`;
      navigator.clipboard.writeText(fullUrl).then(() => {
        console.log('Link copied to clipboard');
      });
    }
  }

  // Tag management methods
  getTags(): string[] {
    return this.form.get('tags')?.value || [];
  }

  addTag(): void {
    const tag = this.newTag.trim();
    if (tag && !this.getTags().includes(tag)) {
      const tags = [...this.getTags(), tag];
      this.form.patchValue({ tags });
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    const tags = this.getTags().filter((t) => t !== tag);
    this.form.patchValue({ tags });
  }
}
