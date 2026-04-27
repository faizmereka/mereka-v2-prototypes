import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { UiLocationAutocompleteComponent, UiLocationPickerComponent, UiCollapsibleComponent, UiLocationFormComponent, type LocationData, type LocationPickerData, type LocationFormData } from '@mereka/ui';
import { ExperienceOnboardingService } from '../../services/experience-onboarding.service';
import type { ExperienceHost } from '../../services/experience-api.service';
import { ReferenceDataService, type ExperienceTheme, type ExperienceTopicItem, type ExperienceType } from '../../../services/reference-data.service';
import { HubTeamService, type HubTeamMember, type HubRole } from '../../../../../core/services';
import { environment } from '../../../../../../environments/environment';

interface TopicSelection {
  theme: string;
  topic: string;
}

@Component({
  selector: 'app-experience-basic-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, UiLocationAutocompleteComponent, UiLocationPickerComponent, UiCollapsibleComponent, UiLocationFormComponent],
  templateUrl: './basic-info.component.html',
})
export class ExperienceBasicInfoComponent implements OnInit, OnDestroy {
  private readonly onboardingService = inject(ExperienceOnboardingService);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly hubTeamService = inject(HubTeamService);
  private readonly destroy$ = new Subject<void>();

  // Form from service
  readonly form: FormGroup = this.onboardingService.basicInfoForm;

  // Reference data
  readonly experienceThemes = this.referenceData.experienceThemes;
  readonly experienceTopics = this.referenceData.experienceTopics;
  readonly categoryOptions = this.referenceData.experienceTypes;  // Categories from API

  // UI state
  readonly showThemeSelection = signal(false);
  readonly showTopicSelection = signal(false);
  readonly selectedThemeId = signal<string>('');
  readonly slugChecking = signal(false);
  readonly slugAvailable = signal<boolean | null>(null);

  // Google Maps API Key
  readonly googleMapsApiKey = environment.google?.maps?.apiKey || 'AIzaSyBxyoaBjlphHZ6OvZf5sy43FMzbWxmYYOQ';

  // Countries list for virtual hosting location
  readonly countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua And Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
    'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
    'Bolivia', 'Bosnia And Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
    'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
    'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
    'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia',
    'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti',
    'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
    'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'North Korea', 'South Korea', 'Kuwait', 'Kyrgyzstan',
    'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
    'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
    'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
    'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama',
    'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
    'Saint Kitts And Nevis', 'Saint Lucia', 'Saint Vincent And The Grenadines', 'Samoa', 'San Marino', 'Sao Tome And Principe',
    'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
    'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria',
    'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad And Tobago', 'Tunisia', 'Turkey',
    'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
    'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
  ];

  // Virtual hosting location
  readonly virtualHostCountry = signal('');
  readonly showCountryDropdown = signal(false);
  readonly countrySearchQuery = signal('');

  // Form values (signals for reactivity - updated via valueChanges)
  readonly title = signal('');
  readonly slug = signal('');
  readonly experienceCategory = signal('');
  readonly selectedTopics = signal<TopicSelection[]>([]);
  readonly experienceType = signal<'Physical' | 'Virtual' | 'Hybrid'>('Physical');
  readonly meetingLink = signal('');
  readonly location = signal<{ locationType?: 'hub' | 'new' | 'other'; venueName?: string; address?: string; city?: string; state?: string; country?: string; lat?: number; lng?: number; autofill?: boolean; } | null>(null);
  readonly hostDetails = signal<ExperienceHost[]>([]);
  readonly noHost = signal(false);
  readonly teamMembers = signal<HubTeamMember[]>([]);
  readonly hubRoles = signal<HubRole[]>([]);
  readonly loadingTeamMembers = signal(false);

  // Editing state for hosts - stores draft while editing
  readonly editingHostIndex = signal<number | null>(null);
  readonly editingHostDraft = signal<Partial<ExperienceHost> | null>(null);

  // Computed for topics by selected theme
  readonly topicsForSelectedTheme = computed(() => {
    const themeId = this.selectedThemeId();
    if (!themeId) return [];
    return this.experienceTopics().filter(t => t.theme === themeId);
  });

  // Filtered countries for dropdown
  readonly filteredCountries = computed(() => {
    const query = this.countrySearchQuery().toLowerCase();
    if (!query) return this.countries;
    return this.countries.filter(c => c.toLowerCase().includes(query));
  });

  // Location state - default to 'hub' to use hub's location
  readonly locationType = signal<'hub' | 'new' | 'other'>('hub');
  readonly meetingType = signal<'zoom' | 'manual'>('manual');
  readonly mapLatitude = signal<number | null>(null);
  readonly mapLongitude = signal<number | null>(null);

  ngOnInit(): void {
    // Set current step
    this.onboardingService.setCurrentStep('basic-info');

    // Initialize all signals from form values (important for edit mode)
    this.initializeSignalsFromForm();

    // Watch for form changes to update signals
    this.setupFormValueSubscriptions();

    // Initialize location from form if exists, or default to hub location for new experiences
    const loc = this.form.get('location')?.value;
    if (loc?.lat && loc?.lng) {
      // Edit mode - use existing location
      this.mapLatitude.set(loc.lat);
      this.mapLongitude.set(loc.lng);
    } else if (!this.onboardingService.isEditMode()) {
      // New experience - default to hub location
      this.onLocationTypeChange('hub');
    }

    // Load hub team members for host selection
    void this.loadTeamMembers();
  }

  private initializeSignalsFromForm(): void {
    this.title.set(this.form.get('experienceTitle')?.value || '');
    this.slug.set(this.form.get('slug')?.value || '');
    this.experienceCategory.set(this.form.get('experienceCategory')?.value || '');
    this.selectedTopics.set(this.form.get('experienceTopics')?.value || []);
    this.experienceType.set(this.form.get('experienceType')?.value || 'Physical');
    this.meetingLink.set(this.form.get('meetingLink')?.value || '');
    this.location.set(this.form.get('location')?.value || null);
    this.hostDetails.set(this.form.get('hostDetails')?.value || []);
    this.noHost.set(this.form.get('noHost')?.value || false);

    // Initialize location type from saved data, default to 'hub' if not set
    const loc = this.form.get('location')?.value;
    if (loc?.locationType) {
      this.locationType.set(loc.locationType);
    } else {
      // Default to 'hub' for new experiences
      this.locationType.set('hub');
    }

    // Initialize virtual hosting location
    const virtualHostLoc = this.form.get('virtualHostingLocation')?.value;
    if (virtualHostLoc?.country) {
      this.virtualHostCountry.set(virtualHostLoc.country);
    }
  }

  private setupFormValueSubscriptions(): void {
    // Title changes - update signal and auto-generate slug in create mode
    this.form.get('experienceTitle')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.title.set(value || '');
      });

    this.form.get('experienceTitle')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(title => {
        // Only auto-generate slug in create mode, not edit mode
        if (title && !this.onboardingService.isEditMode()) {
          this.onboardingService.generateSlugFromTitle(title);
        }
      });

    // Slug changes
    this.form.get('slug')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.slug.set(value || '');
      });

    // Slug availability check with debounce
    this.form.get('slug')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(slug => {
        if (slug) {
          this.checkSlugAvailability(slug);
        }
      });

    // Category changes
    this.form.get('experienceCategory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.experienceCategory.set(value || '');
      });

    // Topics changes
    this.form.get('experienceTopics')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.selectedTopics.set(value || []);
      });

    // Experience type changes
    this.form.get('experienceType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.experienceType.set(value || 'Physical');
      });

    // Meeting link changes
    this.form.get('meetingLink')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.meetingLink.set(value || '');
      });

    // Location changes
    this.form.get('location')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.location.set(value || null);
      });

    // Host details changes
    this.form.get('hostDetails')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.hostDetails.set(value || []);
      });

    // No host changes
    this.form.get('noHost')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.noHost.set(value || false);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // Title & Slug
  // ============================================================================

  onTitleChange(value: string): void {
    this.form.patchValue({ experienceTitle: value });
  }

  onSlugChange(value: string): void {
    // Sanitize slug
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '')
      .replace(/^-|-$/g, '');
    this.form.patchValue({ slug: sanitized });
  }

  async checkSlugAvailability(slug: string): Promise<void> {
    if (!slug) {
      this.slugAvailable.set(null);
      return;
    }

    this.slugChecking.set(true);
    try {
      const available = await this.onboardingService.checkSlugAvailability(slug);
      this.slugAvailable.set(available);
    } finally {
      this.slugChecking.set(false);
    }
  }

  copyLink(): void {
    const fullUrl = `https://mereka.io/experience/${this.slug()}`;
    navigator.clipboard.writeText(fullUrl);
  }

  // ============================================================================
  // Category
  // ============================================================================

  onCategoryChange(categoryId: string): void {
    this.form.patchValue({ experienceCategory: categoryId });
  }

  isCategorySelected(categoryId: string): boolean {
    return this.experienceCategory() === categoryId;
  }

  // ============================================================================
  // Themes & Topics
  // ============================================================================

  openThemeSelection(): void {
    this.showThemeSelection.set(true);
    this.showTopicSelection.set(false);
    this.selectedThemeId.set('');
  }

  selectTheme(theme: ExperienceTheme): void {
    this.selectedThemeId.set(theme._id);
    this.showTopicSelection.set(true);
  }

  selectTopic(topic: ExperienceTopicItem): void {
    const theme = this.experienceThemes().find(t => t._id === this.selectedThemeId());
    if (!theme) return;

    const newTopic: TopicSelection = {
      theme: theme._id,
      topic: topic._id,
    };

    const current = this.selectedTopics();
    if (current.length < 3) {
      this.form.patchValue({
        experienceTopics: [...current, newTopic],
      });
    }

    // Reset selection state
    this.showThemeSelection.set(false);
    this.showTopicSelection.set(false);
    this.selectedThemeId.set('');
  }

  removeTopic(index: number): void {
    const current = this.selectedTopics();
    this.form.patchValue({
      experienceTopics: current.filter((_, i) => i !== index),
    });
  }

  cancelThemeSelection(): void {
    this.showThemeSelection.set(false);
    this.showTopicSelection.set(false);
    this.selectedThemeId.set('');
  }

  getThemeName(themeId: string): string {
    return this.referenceData.getExperienceThemeName(themeId);
  }

  getTopicName(topicId: string): string {
    const topic = this.experienceTopics().find(t => t._id === topicId);
    return topic?.name || '';
  }

  // ============================================================================
  // Experience Type (Mode)
  // ============================================================================

  onModeChange(mode: 'Physical' | 'Virtual' | 'Hybrid'): void {
    this.form.patchValue({ experienceType: mode });
  }

  // ============================================================================
  // Meeting Link (Virtual)
  // ============================================================================

  onMeetingTypeChange(type: 'zoom' | 'manual'): void {
    this.meetingType.set(type);
  }

  onMeetingLinkChange(value: string): void {
    this.form.patchValue({ meetingLink: value });
  }

  // ============================================================================
  // Location (Physical)
  // ============================================================================

  onLocationTypeChange(type: 'hub' | 'new' | 'other'): void {
    this.locationType.set(type);

    if (type === 'hub') {
      // Use selected hub's address (autofill = true, fields disabled)
      const hubLocation = this.onboardingService.getSelectedHubLocation();
      this.form.patchValue({
        location: {
          locationType: 'hub',
          autofill: true,
          venueName: '',
          address: hubLocation?.address || '',
          city: hubLocation?.city || '',
          state: hubLocation?.state || '',
          country: hubLocation?.country || '',
          lat: hubLocation?.lat || null,
          lng: hubLocation?.lng || null,
        },
      });
      // Update map coordinates if available
      if (hubLocation?.lat && hubLocation?.lng) {
        this.mapLatitude.set(hubLocation.lat);
        this.mapLongitude.set(hubLocation.lng);
      }
    } else if (type === 'new') {
      // Clear for new address entry (autofill = false, fields editable)
      this.form.patchValue({
        location: { locationType: 'new', autofill: false, venueName: '', address: '', city: '', state: '', country: '', lat: null, lng: null },
      });
      this.mapLatitude.set(null);
      this.mapLongitude.set(null);
    } else if (type === 'other') {
      // Other venue - user can type venue name and address
      this.form.patchValue({
        location: { locationType: 'other', autofill: false, venueName: '', address: '', city: '', state: '', country: '', lat: null, lng: null },
      });
      this.mapLatitude.set(null);
      this.mapLongitude.set(null);
    }
  }

  // Check if location fields should be disabled (autofill mode)
  isLocationAutofill(): boolean {
    const loc = this.location();
    return loc?.autofill === true;
  }

  // Get selected hub name for display
  selectedHubName(): string {
    return this.onboardingService.getSelectedHub()?.name || '';
  }

  // Get initial location for UiLocationFormComponent
  getInitialLocationFormData(): LocationFormData | null {
    const loc = this.location();
    if (!loc) return null;
    return {
      locationType: loc.locationType || 'hub',
      venueName: loc.venueName,
      address: loc.address,
      city: loc.city,
      state: loc.state,
      country: loc.country,
      lat: loc.lat,
      lng: loc.lng,
    };
  }

  // Get hub location for UiLocationFormComponent
  getHubLocationFormData(): LocationFormData | null {
    const hubLoc = this.onboardingService.getSelectedHubLocation();
    if (!hubLoc) return null;
    return {
      locationType: 'hub',
      address: hubLoc.address,
      city: hubLoc.city,
      state: hubLoc.state,
      country: hubLoc.country,
      lat: hubLoc.lat,
      lng: hubLoc.lng,
    };
  }

  // Handle location change from UiLocationFormComponent
  onLocationFormChange(location: LocationFormData): void {
    this.locationType.set(location.locationType || 'hub');
    this.form.patchValue({
      location: {
        locationType: location.locationType,
        venueName: location.venueName,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        lat: location.lat,
        lng: location.lng,
        autofill: location.locationType === 'hub',
      },
    });
    if (location.lat && location.lng) {
      this.mapLatitude.set(location.lat);
      this.mapLongitude.set(location.lng);
    }
  }

  // Handle marker drag on map - updates coordinates
  onMarkerDragged(coords: { lat: number; lng: number; }): void {
    const current = this.form.get('location')?.value || {};
    this.form.patchValue({
      location: { ...current, lat: coords.lat, lng: coords.lng },
    });
    this.mapLatitude.set(coords.lat);
    this.mapLongitude.set(coords.lng);
  }

  // Handle location selected from picker (includes address details from reverse geocoding)
  onLocationPickerSelected(location: LocationPickerData): void {
    const current = this.form.get('location')?.value || {};
    this.form.patchValue({
      location: {
        ...current,
        address: location.address || location.formattedAddress || '',
        city: location.city || '',
        state: location.state || '',
        country: location.country || '',
        lat: location.lat,
        lng: location.lng,
      },
    });
    this.mapLatitude.set(location.lat);
    this.mapLongitude.set(location.lng);
  }

  updateLocationField(field: string, value: string): void {
    const current = this.form.get('location')?.value || {};
    this.form.patchValue({
      location: { ...current, [field]: value },
    });

    // Trigger geocoding when address changes
    if (['address', 'city', 'country'].includes(field)) {
      this.geocodeAddress();
    }
  }

  getLocationField(field: 'address' | 'city' | 'state' | 'country' | 'venueName'): string {
    const loc = this.location();
    if (!loc) return '';
    return ((loc as Record<string, unknown>)[field] as string) || '';
  }

  // Map methods
  getMapUrl(): SafeResourceUrl {
    const lat = this.mapLatitude();
    const lng = this.mapLongitude();
    if (lat && lng) {
      const url = `https://www.google.com/maps/embed/v1/place?key=${this.googleMapsApiKey}&q=${lat},${lng}&zoom=15`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return '';
  }

  async geocodeAddress(): Promise<void> {
    const loc = this.location();
    if (!loc) return;

    const address = [
      loc.address,
      loc.city,
      loc.state,
      loc.country,
    ].filter(Boolean).join(', ');

    if (!address) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.googleMapsApiKey}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        this.mapLatitude.set(location.lat);
        this.mapLongitude.set(location.lng);

        // Update form with coordinates
        const current = this.form.get('location')?.value || {};
        this.form.patchValue({
          location: {
            ...current,
            lat: location.lat,
            lng: location.lng,
          },
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  }

  // ============================================================================
  // Host
  // ============================================================================

  onNoHostChange(value: boolean): void {
    // When noHost is true, clear all hosts. When false, keep existing hostDetails as-is.
    this.form.patchValue({
      noHost: value,
      hostDetails: value ? [] : this.hostDetails(),
    });
  }

  private async loadTeamMembers(): Promise<void> {
    this.loadingTeamMembers.set(true);
    try {
      const hubId = this.onboardingService.hubId();
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
    } catch {
      // Silent failure - UI will just not show team member selector
      this.teamMembers.set([]);
      this.hubRoles.set([]);
    } finally {
      this.loadingTeamMembers.set(false);
    }
  }

  /**
   * Add a new host with minimal inline details.
   */
  addHost(): void {
    const current = this.hostDetails();
    if (current.length >= 3) {
      return;
    }

    // Get default role (first available role or fallback)
    const defaultRole = this.hubRoles()[0];

    const newHost: ExperienceHost = {
      name: '',
      email: '',
      roleId: defaultRole?.id,
      description: '',
      isNew: true,
      isEditing: true,
    };

    this.form.patchValue({
      hostDetails: [...current, newHost],
    });

    // Start editing the new host
    this.editingHostIndex.set(current.length);
    this.editingHostDraft.set({ ...newHost });
  }

  addHostFromMember(member: HubTeamMember): void {
    const current = this.hostDetails();
    if (current.length >= 3) {
      return;
    }

    // Avoid duplicates (by userId or email)
    if (current.some((h) => (h.userId && h.userId === member.userId) || h.email === member.email)) {
      return;
    }

    // Get the member's first role (or find matching role from hubRoles)
    const memberRoleKey = member.roleKeys[0];
    const matchingRole = this.hubRoles().find(r => r.key === memberRoleKey);

    const newHost: ExperienceHost = {
      userId: member.userId,
      name: member.name,
      email: member.email,
      photoUrl: member.avatar ?? undefined,
      roleId: matchingRole?.id,
      description: member.bio ?? undefined, // Use bio as default description
      isNew: false,
      isEditing: false,
    };

    this.form.patchValue({
      hostDetails: [...current, newHost],
    });
  }

  removeHost(index: number): void {
    const current = this.hostDetails();
    this.form.patchValue({
      hostDetails: current.filter((_, i) => i !== index),
    });
  }

  onAddHostFromMember(memberId: string): void {
    if (!memberId) return;
    const member = this.teamMembers().find((m) => m.id === memberId);
    if (!member) return;
    this.addHostFromMember(member);
  }

  onTeamMemberSelect(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) return;
    const memberId = target.value;
    this.onAddHostFromMember(memberId);
    // Reset back to placeholder
    target.value = '';
  }

  /**
   * Get role name from roleId by looking up in hubRoles
   */
  getRoleName(roleId?: string): string {
    if (!roleId) return 'Member';
    const role = this.hubRoles().find(r => r.id === roleId);
    return role?.name || 'Member';
  }

  updateHostField(_index: number, field: keyof ExperienceHost, value: string): void {
    const draft = this.editingHostDraft();
    if (!draft) return;

    this.editingHostDraft.set({
      ...draft,
      [field]: value,
    });
  }

  startEditingHost(index: number): void {
    const host = this.hostDetails()[index];
    if (!host) return;

    this.editingHostIndex.set(index);
    this.editingHostDraft.set({ ...host });
  }

  cancelEditingHost(): void {
    const index = this.editingHostIndex();
    if (index === null) return;

    const host = this.hostDetails()[index];
    // If this was a new host with no name, remove it
    if (host?.isNew && !host.name) {
      this.removeHost(index);
    }

    this.editingHostIndex.set(null);
    this.editingHostDraft.set(null);
  }

  saveEditingHost(): void {
    const index = this.editingHostIndex();
    const draft = this.editingHostDraft();
    if (index === null || !draft) return;

    const current = this.hostDetails();
    const next = [...current];
    next[index] = {
      ...current[index],
      ...draft,
      isNew: false,
      isEditing: false,
    } as ExperienceHost;

    this.form.patchValue({
      hostDetails: next,
    });

    this.editingHostIndex.set(null);
    this.editingHostDraft.set(null);
  }

  setHostEditing(index: number, editing: boolean): void {
    if (editing) {
      this.startEditingHost(index);
    } else {
      this.saveEditingHost();
    }
  }

  updateHostRole(_index: number, roleId: string): void {
    const draft = this.editingHostDraft();
    if (!draft) return;

    this.editingHostDraft.set({
      ...draft,
      roleId,
    });
  }

  // ============================================================================
  // Virtual Hosting Location
  // ============================================================================

  toggleCountryDropdown(): void {
    this.showCountryDropdown.update(v => !v);
    if (this.showCountryDropdown()) {
      this.countrySearchQuery.set('');
    }
  }

  selectVirtualHostCountry(country: string): void {
    this.virtualHostCountry.set(country);
    this.showCountryDropdown.set(false);
    // Store in form for virtual hosting location
    this.form.patchValue({
      virtualHostingLocation: { country },
    });
  }

  clearVirtualHostCountry(): void {
    this.virtualHostCountry.set('');
    this.showCountryDropdown.set(false);
    this.form.patchValue({
      virtualHostingLocation: null,
    });
  }

  // Handle location autocomplete selection (for physical/hybrid)
  onLocationSelected(location: LocationData): void {
    this.form.patchValue({
      location: {
        address: location.address || location.formattedAddress || '',
        city: location.city || '',
        state: location.state || '',
        country: location.country || '',
        lat: location.lat,
        lng: location.lng,
      },
    });
    this.mapLatitude.set(location.lat);
    this.mapLongitude.set(location.lng);
  }

  onLocationCleared(): void {
    this.form.patchValue({
      location: {
        address: '',
        city: '',
        state: '',
        country: '',
        lat: null,
        lng: null,
      },
    });
    this.mapLatitude.set(null);
    this.mapLongitude.set(null);
  }
}
