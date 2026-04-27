import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface PaymentMethod {
  id: string;
  title: string;
  subTitle: string;
  image?: string;
  last4?: string;
  isDefault?: boolean;
}

@Component({
  selector: 'app-user-billing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './billing.component.html',
})
export class UserBillingComponent implements OnInit {
  readonly loading = signal(false);
  readonly paymentMethods = signal<PaymentMethod[]>([]);
  readonly selectedPaymentMethod = signal<PaymentMethod | null>(null);
  readonly showDropdown = signal(false);
  readonly showRemoveDialog = signal(false);
  readonly paymentMethodToDelete = signal<PaymentMethod | null>(null);

  ngOnInit() {
    this.loadPaymentMethods();
  }

  async loadPaymentMethods() {
    this.loading.set(true);
    try {
      // TODO: Replace with actual API call
      // const response = await this.billingService.getPaymentMethods();
      // this.paymentMethods.set(response);

      // Mock data for demonstration
      this.paymentMethods.set([
        {
          id: '1',
          title: 'Visa',
          subTitle: '**** **** **** 4242',
          image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png',
          last4: '4242',
          isDefault: true,
        },
        {
          id: '2',
          title: 'Mastercard',
          subTitle: '**** **** **** 5555',
          image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png',
          last4: '5555',
          isDefault: false,
        },
      ]);

      // Set default selected
      const methods = this.paymentMethods();
      if (methods.length > 0) {
        const defaultMethod = methods.find(m => m.isDefault) || methods[0];
        this.selectedPaymentMethod.set(defaultMethod);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      this.loading.set(false);
    }
  }

  toggleDropdown() {
    this.showDropdown.update(v => !v);
  }

  selectPaymentMethod(method: PaymentMethod) {
    this.selectedPaymentMethod.set(method);
    this.showDropdown.set(false);
    // TODO: Save preference to API
  }

  openAddPaymentDialog() {
    this.showDropdown.set(false);
    // TODO: Open add payment method dialog/modal
    console.log('Open add payment method dialog');
  }

  removePaymentMethod(event: Event, method: PaymentMethod) {
    event.stopPropagation();
    this.paymentMethodToDelete.set(method);
    this.showRemoveDialog.set(true);
    this.showDropdown.set(false);
  }

  confirmRemovePaymentMethod() {
    const methodToDelete = this.paymentMethodToDelete();
    if (methodToDelete) {
      // TODO: Call API to remove payment method
      this.paymentMethods.update(methods =>
        methods.filter(m => m.id !== methodToDelete.id)
      );

      // Update selected if deleted was selected
      if (this.selectedPaymentMethod()?.id === methodToDelete.id) {
        const remaining = this.paymentMethods();
        this.selectedPaymentMethod.set(remaining.length > 0 ? remaining[0] : null);
      }
    }
    this.showRemoveDialog.set(false);
    this.paymentMethodToDelete.set(null);
  }
}
