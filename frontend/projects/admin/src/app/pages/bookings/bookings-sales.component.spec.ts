import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingsSalesComponent } from './bookings-sales.component';

describe('BookingsSalesComponent', () => {
  let component: BookingsSalesComponent;
  let fixture: ComponentFixture<BookingsSalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingsSalesComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsSalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have transactions data', () => {
    const transactions = component.transactions();
    expect(transactions.length).toBeGreaterThan(0);
  });

  it('should calculate summary correctly', () => {
    const summary = component.summary();
    expect(summary.totalSales).toBeGreaterThan(0);
    expect(summary.totalCommission).toBeGreaterThan(0);
    expect(summary.totalTransactions).toBeGreaterThan(0);
    expect(summary.avgTransactionValue).toBeGreaterThan(0);
  });

  it('should initialize with default filters', () => {
    expect(component.dateRange).toBe('month');
    expect(component.statusFilter).toBe('all');
    expect(component.paymentFilter).toBe('all');
    expect(component.searchQuery).toBe('');
  });

  it('should filter transactions', () => {
    component.statusFilter = 'completed';
    component.filterData();
    const filtered = component.filteredTransactions();
    expect(filtered.every(tx => tx.status === 'completed')).toBe(true);
  });

  it('should paginate transactions', () => {
    const paginated = component.paginatedTransactions();
    expect(paginated.length).toBeLessThanOrEqual(component.pageSize);
  });

  it('should return correct payment label', () => {
    expect(component.getPaymentLabel('card')).toBe('Card');
    expect(component.getPaymentLabel('bank_transfer')).toBe('Bank');
    expect(component.getPaymentLabel('ewallet')).toBe('E-Wallet');
  });

  it('should calculate total pages correctly', () => {
    const totalPages = component.totalPages();
    const expectedPages = Math.ceil(component.filteredTransactions().length / component.pageSize);
    expect(totalPages).toBe(expectedPages);
  });
});
