import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe, UpperCasePipe, NgClass, DatePipe } from '@angular/common';
import { BankService, Bank, CreateBankInput } from './bank.service';
import { DialogService } from '../../shared/dialog';
import { ToastService } from '../../shared/ui';

type TabType = 'all' | 'pending';

@Component({
  selector: 'app-banks',
  imports: [FormsModule, TitleCasePipe, UpperCasePipe, NgClass, DatePipe],
  templateUrl: './banks.component.html',
  styleUrl: './banks.component.scss'
})
export class BanksComponent implements OnInit {
  private readonly bankService = inject(BankService);
  private readonly dialogService = inject(DialogService);
  private readonly toast = inject(ToastService);

  searchQuery = '';
  activeTab: TabType = 'all';
  countryFilter = '';
  showAddModal = signal(false);
  showEditModal = signal(false);
  loading = signal(false);

  banks = signal<Bank[]>([]);
  pendingBanks = signal<Bank[]>([]);
  selectedBank = signal<Bank | null>(null);

  // Form fields
  formData = signal<CreateBankInput>({
    name: '',
    routingNumber: '',
    logoUrl: '',
    countryCode: 'MY',
    priority: 0
  });

  countries = [
    { code: 'MY', name: 'Malaysia' },
    { code: 'SG', name: 'Singapore' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'IN', name: 'India' },
  ];

  ngOnInit() {
    this.loadBanks();
    this.loadPendingBanks();
  }

  loadBanks() {
    this.loading.set(true);
    this.bankService.listBanks().subscribe({
      next: (response) => {
        this.banks.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Failed to load banks');
        console.error('Failed to load banks:', err);
      }
    });
  }

  loadPendingBanks() {
    this.bankService.listPendingBanks().subscribe({
      next: (response) => {
        this.pendingBanks.set(response.data);
      },
      error: (err) => {
        this.toast.error('Failed to load pending banks');
        console.error('Failed to load pending banks:', err);
      }
    });
  }

  filteredBanks() {
    let result = this.banks();

    if (this.countryFilter) {
      result = result.filter(b => b.countryCode === this.countryFilter);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(b =>
        b.name.toLowerCase().includes(query) ||
        b.routingNumber?.toLowerCase().includes(query)
      );
    }

    return result;
  }

  openAddModal() {
    this.formData.set({
      name: '',
      routingNumber: '',
      logoUrl: '',
      countryCode: 'MY',
      priority: 0
    });
    this.showAddModal.set(true);
  }

  openEditModal(bank: Bank) {
    this.selectedBank.set(bank);
    this.formData.set({
      name: bank.name,
      routingNumber: bank.routingNumber || '',
      logoUrl: bank.logoUrl || '',
      countryCode: bank.countryCode,
      priority: bank.priority
    });
    this.showEditModal.set(true);
  }

  createBank() {
    const data = this.formData();
    if (!data.name || !data.countryCode) {
      this.toast.error('Name and country are required');
      return;
    }

    this.loading.set(true);
    this.bankService.createBank(data).subscribe({
      next: () => {
        this.showAddModal.set(false);
        this.loadBanks();
        this.loading.set(false);
        this.toast.success('Bank created successfully');
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Failed to create bank');
        console.error('Failed to create bank:', err);
      }
    });
  }

  updateBank() {
    const bank = this.selectedBank();
    if (!bank) return;

    const data = this.formData();
    this.loading.set(true);
    this.bankService.updateBank(bank._id, data).subscribe({
      next: () => {
        this.showEditModal.set(false);
        this.selectedBank.set(null);
        this.loadBanks();
        this.loading.set(false);
        this.toast.success('Bank updated successfully');
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Failed to update bank');
        console.error('Failed to update bank:', err);
      }
    });
  }

  async deleteBank(bank: Bank) {
    const confirmed = await this.dialogService.confirm({
      title: 'Deactivate Bank',
      message: `Are you sure you want to deactivate "${bank.name}"? This will hide the bank from users.`,
      type: 'danger',
      confirmText: 'Deactivate',
    });

    if (!confirmed) return;

    this.bankService.deleteBank(bank._id).subscribe({
      next: () => {
        this.loadBanks();
        this.toast.success('Bank deactivated successfully');
      },
      error: (err) => {
        this.toast.error('Failed to deactivate bank');
        console.error('Failed to deactivate bank:', err);
      }
    });
  }

  approveBank(bank: Bank) {
    this.bankService.approveBank(bank._id).subscribe({
      next: () => {
        this.loadBanks();
        this.loadPendingBanks();
        this.toast.success(`Bank "${bank.name}" approved successfully`);
      },
      error: (err) => {
        this.toast.error('Failed to approve bank');
        console.error('Failed to approve bank:', err);
      }
    });
  }

  async rejectBank(bank: Bank) {
    const confirmed = await this.dialogService.confirm({
      title: 'Reject Bank',
      message: `Are you sure you want to reject "${bank.name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Reject',
    });

    if (!confirmed) return;

    this.bankService.rejectBank(bank._id).subscribe({
      next: () => {
        this.loadPendingBanks();
        this.toast.success(`Bank "${bank.name}" rejected`);
      },
      error: (err) => {
        this.toast.error('Failed to reject bank');
        console.error('Failed to reject bank:', err);
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  updateFormField(field: keyof CreateBankInput, value: string | number) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }
}
