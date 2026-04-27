import {
  Component,
  OnInit,
  input,
  output,
  signal,
  computed,
  ElementRef,
  ViewChild,
  HostListener,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Country data interface
export interface Country {
  iso2: string;
  name: string;
  dialCode: string;
  flag: string;
  priority?: number;
}

// Phone data output interface
export interface PhoneData {
  countryCode: string;
  dialCode: string;
  number: string;
  fullNumber: string;
  isValid: boolean;
}

// Popular countries list with flags (emoji)
const COUNTRIES: Country[] = [
  { iso2: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', priority: 1 },
  { iso2: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', priority: 2 },
  { iso2: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', priority: 3 },
  { iso2: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', priority: 4 },
  { iso2: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', priority: 5 },
  { iso2: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', priority: 6 },
  { iso2: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', priority: 7 },
  { iso2: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', priority: 8 },
  { iso2: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', priority: 9 },
  { iso2: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', priority: 10 },
  { iso2: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { iso2: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { iso2: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { iso2: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },
  { iso2: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼' },
  { iso2: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { iso2: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { iso2: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { iso2: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { iso2: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { iso2: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { iso2: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { iso2: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { iso2: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { iso2: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { iso2: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { iso2: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { iso2: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { iso2: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
  { iso2: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { iso2: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { iso2: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { iso2: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { iso2: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { iso2: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { iso2: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { iso2: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { iso2: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { iso2: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { iso2: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { iso2: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
  { iso2: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
  { iso2: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭' },
  { iso2: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲' },
  { iso2: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { iso2: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { iso2: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { iso2: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { iso2: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { iso2: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
  { iso2: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
  { iso2: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵' },
  { iso2: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲' },
  { iso2: 'KH', name: 'Cambodia', dialCode: '+855', flag: '🇰🇭' },
  { iso2: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦' },
  { iso2: 'BN', name: 'Brunei', dialCode: '+673', flag: '🇧🇳' },
];

@Component({
  selector: 'ui-phone-input',
  imports: [CommonModule, FormsModule],
  templateUrl: './phone-input.component.html',
})
export class UiPhoneInputComponent implements OnInit {
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;

  // Inputs
  readonly placeholder = input<string>('Enter phone number');
  readonly defaultCountry = input<string>('MY');
  readonly preferredCountries = input<string[]>(['MY', 'SG', 'ID', 'TH', 'PH']);
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly initialValue = input<string>('');
  readonly initialCountry = input<string>('');

  // Outputs
  readonly phoneChange = output<PhoneData>();
  readonly inputFocused = output<void>();
  readonly inputBlurred = output<void>();

  // State
  readonly isDropdownOpen = signal(false);
  readonly phoneNumber = signal('');
  readonly selectedCountry = signal<Country>(COUNTRIES[0]);
  readonly isFocused = signal(false);

  // Track last initial value to detect changes
  private lastInitialValue = '';

  constructor() {
    // Watch for initialValue changes
    effect(() => {
      const value = this.initialValue();
      // Only update if the initial value changed and is not empty
      if (value && value !== this.lastInitialValue) {
        this.parseAndSetInitialValue(value);
        this.lastInitialValue = value;
      }
    });
  }

  // Computed
  readonly filteredCountries = computed(() => {
    const preferred = this.preferredCountries();
    const countries = [...COUNTRIES];

    // Sort by preferred countries first, then alphabetically
    countries.sort((a, b) => {
      const aPreferred = preferred.includes(a.iso2);
      const bPreferred = preferred.includes(b.iso2);
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      if (a.priority && b.priority) return a.priority - b.priority;
      return a.name.localeCompare(b.name);
    });

    return countries;
  });

  readonly fullPhoneNumber = computed(() => {
    const country = this.selectedCountry();
    const number = this.phoneNumber().replace(/\D/g, '');
    return number ? `${country.dialCode}${number}` : '';
  });

  readonly isValidPhone = computed(() => {
    const number = this.phoneNumber().replace(/\D/g, '');
    return number.length >= 7 && number.length <= 15;
  });

  ngOnInit(): void {
    // Set initial country
    const initialCountryCode = this.initialCountry() || this.defaultCountry();
    const country = COUNTRIES.find((c) => c.iso2 === initialCountryCode);
    if (country) {
      this.selectedCountry.set(country);
    }
  }

  /**
   * Parse phone number with country code and set the values
   * Handles formats like: +60123456789, +1234567890, 123456789
   */
  private parseAndSetInitialValue(value: string): void {
    if (!value) return;

    // Check if value starts with +
    if (value.startsWith('+')) {
      // Try to match against known country dial codes
      // Sort by dial code length (longest first) to match +852 before +8
      const sortedCountries = [...COUNTRIES].sort(
        (a, b) => b.dialCode.length - a.dialCode.length
      );

      for (const country of sortedCountries) {
        if (value.startsWith(country.dialCode)) {
          this.selectedCountry.set(country);
          // Extract the number part after the dial code
          const numberPart = value.slice(country.dialCode.length);
          this.phoneNumber.set(numberPart);
          return;
        }
      }
    }

    // If no country code matched, just set the number as-is
    this.phoneNumber.set(value.replace(/^\+/, ''));
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.dropdownContainer && !this.dropdownContainer.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
    }
  }

  toggleDropdown(): void {
    if (this.disabled()) return;
    this.isDropdownOpen.update((v) => !v);
  }

  selectCountry(country: Country): void {
    this.selectedCountry.set(country);
    this.isDropdownOpen.set(false);
    this.emitPhoneChange();
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Only allow digits, spaces, and dashes
    const cleaned = input.value.replace(/[^\d\s\-]/g, '');
    this.phoneNumber.set(cleaned);
    this.emitPhoneChange();
  }

  onFocus(): void {
    this.isFocused.set(true);
    this.inputFocused.emit();
  }

  onBlur(): void {
    this.isFocused.set(false);
    this.inputBlurred.emit();
  }

  private emitPhoneChange(): void {
    const country = this.selectedCountry();
    const number = this.phoneNumber();
    const cleanNumber = number.replace(/\D/g, '');

    this.phoneChange.emit({
      countryCode: country.iso2,
      dialCode: country.dialCode,
      number: cleanNumber,
      fullNumber: cleanNumber ? `${country.dialCode}${cleanNumber}` : '',
      isValid: this.isValidPhone(),
    });
  }
}
