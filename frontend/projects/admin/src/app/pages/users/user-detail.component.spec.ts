import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserDetailComponent } from './user-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('UserDetailComponent', () => {
  let component: UserDetailComponent;
  let fixture: ComponentFixture<UserDetailComponent>;

  const mockActivatedRoute = {
    params: of({ id: '123' })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDetailComponent],
      providers: [
        { provide: ActivatedRoute, use: mockActivatedRoute }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set userId from route params', () => {
    expect(component.userId()).toBe('123');
  });

  it('should have user data', () => {
    expect(component.user()).toBeDefined();
    expect(component.user().name).toBe('Sarah Johnson');
  });

  it('should have bank accounts', () => {
    expect(component.bankAccounts().length).toBeGreaterThan(0);
  });

  it('should have stripe account', () => {
    expect(component.stripeAccount()).toBeDefined();
  });

  it('should get correct stripe status classes', () => {
    expect(component.getStripeStatusClasses('active')).toContain('green');
    expect(component.getStripeStatusClasses('pending')).toContain('yellow');
    expect(component.getStripeStatusClasses('restricted')).toContain('orange');
    expect(component.getStripeStatusClasses('disabled')).toContain('red');
  });

  it('should have user statistics', () => {
    expect(component.user().stats).toBeDefined();
    expect(component.user().stats.bookings).toBe(45);
    expect(component.user().stats.totalSpent).toBe(3450);
  });

  it('should have recent bookings', () => {
    expect(component.user().recentBookings.length).toBeGreaterThan(0);
  });
});
