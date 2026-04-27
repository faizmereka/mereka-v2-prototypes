import { Component, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

export type ExpertisePackageType = 'Paid' | 'Free';
export type ExpertisePackageMode = 'online' | 'physical' | 'hybrid';
export type DurationUnit = 'minutes' | 'hours';

export interface ExpertisePackage {
  id: string;
  ticketType: ExpertisePackageType;
  ticketName: string;
  sessionDuration: number;
  durationUnit: DurationUnit;
  ticketPrice: number;
  expertiseMode: ExpertisePackageMode;
  asapBookings: boolean;
  hasBufferTime: boolean;
  bufferTime: number;
  description: string;
  isEditing: boolean;
  isSaved: boolean;
}

@Component({
  selector: 'ui-expertise-ticket-form',
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './expertise-ticket-form.component.html',
})
export class UiExpertiseTicketFormComponent implements OnInit {
  // Inputs
  readonly currency = input<string>('MYR');
  readonly maxPackages = input<number>(10);
  readonly serviceFeePercent = input<number>(3);
  readonly serviceFeeFixed = input<number>(1);
  readonly hidePackageSettings = input<boolean>(false);

  // Outputs
  readonly packagesChange = output<ExpertisePackage[]>();

  // State
  readonly packages = signal<ExpertisePackage[]>([]);

  readonly packageTypes: ExpertisePackageType[] = ['Paid', 'Free'];
  readonly packageModes: { value: ExpertisePackageMode; label: string }[] = [
    { value: 'online', label: 'Online' },
    { value: 'physical', label: 'In-Person' },
    { value: 'hybrid', label: 'Both' },
  ];
  readonly durationUnits: { value: DurationUnit; label: string }[] = [
    { value: 'minutes', label: 'Minutes' },
    { value: 'hours', label: 'Hours' },
  ];
  readonly sessionDurationOptions = [
    { value: 15, label: '15 mins' },
    { value: 30, label: '30 mins' },
    { value: 45, label: '45 mins' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
  ];
  readonly bufferTimeOptions = [5, 10, 15, 30, 45, 60];

  readonly hasUnsavedPackages = computed(() =>
    this.packages().some(p => p.isEditing && !p.isSaved)
  );

  readonly canAddPackage = computed(() =>
    this.packages().length < this.maxPackages() && !this.hasUnsavedPackages()
  );

  private generateId(): string {
    return `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  ngOnInit(): void {
    // Initialize with one default package if empty
    if (this.packages().length === 0) {
      this.addPackage('Paid');
    }
  }

  addPackage(type: ExpertisePackageType): void {
    const newPackage: ExpertisePackage = {
      id: this.generateId(),
      ticketType: type,
      ticketName: '',
      sessionDuration: 30,
      durationUnit: 'minutes',
      ticketPrice: type === 'Free' ? 0 : 0,
      expertiseMode: 'online',
      asapBookings: false,
      hasBufferTime: false,
      bufferTime: 15,
      description: '',
      isEditing: true,
      isSaved: false,
    };
    this.packages.update(p => [...p, newPackage]);
  }

  updatePackage(id: string, field: keyof ExpertisePackage, value: unknown): void {
    this.packages.update(packages =>
      packages.map(p => p.id === id ? { ...p, [field]: value } : p)
    );
  }

  onPackageTypeChange(id: string, type: ExpertisePackageType): void {
    this.packages.update(packages =>
      packages.map(p => {
        if (p.id === id) {
          return {
            ...p,
            ticketType: type,
            ticketPrice: type === 'Free' ? 0 : p.ticketPrice,
          };
        }
        return p;
      })
    );
  }

  savePackage(id: string): void {
    const pkg = this.packages().find(p => p.id === id);
    if (pkg && this.isPackageValid(pkg)) {
      this.packages.update(packages =>
        packages.map(p => p.id === id ? { ...p, isEditing: false, isSaved: true } : p)
      );
      this.emitChanges();
    }
  }

  editPackage(id: string): void {
    this.packages.update(packages =>
      packages.map(p => p.id === id ? { ...p, isEditing: true } : p)
    );
  }

  removePackage(id: string): void {
    if (this.packages().length > 1) {
      this.packages.update(p => p.filter(pkg => pkg.id !== id));
      this.emitChanges();
    }
  }

  duplicatePackage(id: string): void {
    const pkg = this.packages().find(p => p.id === id);
    if (pkg && pkg.isSaved) {
      const newPackage: ExpertisePackage = {
        ...pkg,
        id: this.generateId(),
        ticketName: `${pkg.ticketName} (Copy)`,
        isEditing: true,
        isSaved: false,
      };
      this.packages.update(p => [...p, newPackage]);
    }
  }

  toggleExpand(id: string): void {
    this.packages.update(packages =>
      packages.map(p => p.id === id ? { ...p, isEditing: !p.isEditing } : p)
    );
  }

  onDrop(event: CdkDragDrop<ExpertisePackage[]>): void {
    const packages = [...this.packages()];
    moveItemInArray(packages, event.previousIndex, event.currentIndex);
    this.packages.set(packages);
    this.emitChanges();
  }

  calculateBuyerTotal(price: number): string {
    if (!price || price === 0) return '0.00';
    // Formula: ((price + fixed) / (100 - percent)) * 100
    const total = ((price + this.serviceFeeFixed()) / (100 - this.serviceFeePercent())) * 100;
    return total.toFixed(2);
  }

  isPackageValid(pkg: ExpertisePackage): boolean {
    if (!pkg.ticketName.trim()) return false;
    if (pkg.ticketType !== 'Free' && pkg.ticketPrice <= 0) return false;
    if (pkg.sessionDuration < 1) return false;
    return true;
  }

  getPackageErrors(pkg: ExpertisePackage): string[] {
    const errors: string[] = [];
    if (!pkg.ticketName.trim()) errors.push('Package name is required');
    if (pkg.ticketType !== 'Free' && pkg.ticketPrice <= 0) {
      errors.push('Price is required for paid packages');
    }
    if (pkg.sessionDuration < 1) errors.push('Duration must be at least 1');
    return errors;
  }

  private emitChanges(): void {
    this.packagesChange.emit(this.packages().filter(p => p.isSaved));
  }

  // Initialize with existing packages
  setPackages(packages: ExpertisePackage[]): void {
    this.packages.set(packages.map(p => ({ ...p, isEditing: false, isSaved: true })));
  }

  formatDuration(pkg: ExpertisePackage): string {
    const unit = pkg.durationUnit === 'hours' ? 'hr' : 'min';
    return `${pkg.sessionDuration} ${unit}`;
  }

  formatPrice(pkg: ExpertisePackage): string {
    if (pkg.ticketType === 'Free') {
      return 'Free';
    }
    return `${this.currency()} ${pkg.ticketPrice.toFixed(2)}`;
  }

  formatMode(pkg: ExpertisePackage): string {
    if (pkg.expertiseMode === 'physical') return 'In-Person';
    if (pkg.expertiseMode === 'hybrid') return 'Both';
    return 'Online';
  }
}
