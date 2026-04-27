import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationsComponent } from './notifications.component';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockActivatedRoute = {
      snapshot: {
        data: {}
      }
    };

    await TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with templates tab by default', () => {
    expect(component.activeTab()).toBe('templates');
  });

  it('should initialize with logs tab when route data specifies logs', () => {
    mockActivatedRoute.snapshot.data = { tab: 'logs' };
    component.ngOnInit();
    expect(component.activeTab()).toBe('logs');
  });

  it('should have overview statistics', () => {
    expect(component.totalNotifications()).toBeGreaterThan(0);
    expect(component.deliveredNotifications()).toBeGreaterThan(0);
    expect(component.readNotifications()).toBeGreaterThan(0);
    expect(component.failedNotifications()).toBeGreaterThan(0);
  });

  it('should have notification templates', () => {
    expect(component.templates().length).toBeGreaterThan(0);
  });

  it('should have notification logs', () => {
    expect(component.notificationLogs().length).toBeGreaterThan(0);
  });

  it('should filter templates by search query', () => {
    component.searchQuery = 'booking';
    const filtered = component.filteredTemplates();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(t =>
      t.name.toLowerCase().includes('booking') ||
      t.trigger.toLowerCase().includes('booking')
    )).toBe(true);
  });

  it('should return all templates when search query is empty', () => {
    component.searchQuery = '';
    const filtered = component.filteredTemplates();
    expect(filtered.length).toBe(component.templates().length);
  });

  it('should toggle add modal visibility', () => {
    expect(component.showAddModal()).toBe(false);
    component.showAddModal.set(true);
    expect(component.showAddModal()).toBe(true);
    component.showAddModal.set(false);
    expect(component.showAddModal()).toBe(false);
  });
});
