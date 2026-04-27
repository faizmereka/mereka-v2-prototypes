import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SubscriptionsComponent } from './subscriptions.component';

describe('SubscriptionsComponent', () => {
  let component: SubscriptionsComponent;
  let fixture: ComponentFixture<SubscriptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionsComponent],
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

    fixture = TestBed.createComponent(SubscriptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default view as subscriptions', () => {
    expect(component.activeView()).toBe('subscriptions');
  });

  it('should calculate MRR correctly', () => {
    const mrr = component.calculateMRR();
    expect(mrr).toBeGreaterThanOrEqual(0);
  });

  it('should filter items by status', () => {
    component.setStatus('active');
    expect(component.currentStatus()).toBe('active');
    expect(component.currentPage()).toBe(1);
  });

  it('should count subscriptions by plan', () => {
    const scaleCount = component.getScaleCount();
    const soarCount = component.getSoarCount();
    expect(scaleCount).toBeGreaterThanOrEqual(0);
    expect(soarCount).toBeGreaterThanOrEqual(0);
  });

  it('should calculate revenue by plan', () => {
    const scaleRevenue = component.getScaleRevenue();
    const soarRevenue = component.getSoarRevenue();
    expect(scaleRevenue).toBeGreaterThanOrEqual(0);
    expect(soarRevenue).toBeGreaterThanOrEqual(0);
  });

  it('should filter items and reset page', () => {
    component.currentPage.set(2);
    component.filterItems();
    expect(component.currentPage()).toBe(1);
  });

  it('should open Stripe dashboard for subscription management', () => {
    const openSpy = vi.fn();
    const originalOpen = window.open;
    window.open = openSpy as any;

    component.manageSubscription('sub_123');
    expect(openSpy).toHaveBeenCalledWith('https://dashboard.stripe.com/subscriptions/sub_123', '_blank');

    window.open = originalOpen;
  });
});
