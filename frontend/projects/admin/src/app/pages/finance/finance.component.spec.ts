import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { FinanceComponent } from './finance.component';

describe('FinanceComponent', () => {
  let component: FinanceComponent;
  let fixture: ComponentFixture<FinanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {}
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FinanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have withdrawals as default active tab', () => {
    expect(component.activeTab()).toBe('withdrawals');
  });

  it('should switch tabs correctly', () => {
    component.setActiveTab('pending');
    expect(component.activeTab()).toBe('pending');

    component.setActiveTab('transactions');
    expect(component.activeTab()).toBe('transactions');

    component.setActiveTab('accounts');
    expect(component.activeTab()).toBe('accounts');
  });

  it('should filter withdrawals by status', () => {
    component.withdrawalFilter.set('pending');
    const filtered = component.filteredWithdrawals();
    expect(filtered.every(w => w.status === 'pending')).toBe(true);
  });

  it('should filter pending payments by status', () => {
    component.pendingPaymentFilter.set('failed');
    const filtered = component.filteredPendingPayments();
    expect(filtered.every(p => p.status === 'failed')).toBe(true);
  });

  it('should return correct status classes for withdrawals', () => {
    expect(component.getWithdrawalStatusClasses('pending')).toContain('yellow');
    expect(component.getWithdrawalStatusClasses('completed')).toContain('green');
    expect(component.getWithdrawalStatusClasses('rejected')).toContain('red');
  });

  it('should return correct status classes for pending payments', () => {
    expect(component.getPendingPaymentStatusClasses('pending')).toContain('yellow');
    expect(component.getPendingPaymentStatusClasses('failed')).toContain('red');
    expect(component.getPendingPaymentStatusClasses('completed')).toContain('green');
  });
});
