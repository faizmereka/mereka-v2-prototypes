import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardHomeComponent } from './dashboard-home.component';

describe('DashboardHomeComponent', () => {
  let component: DashboardHomeComponent;
  let fixture: ComponentFixture<DashboardHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardHomeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 4 stats', () => {
    expect(component.stats.length).toBe(4);
  });

  it('should have correct stat labels', () => {
    const labels = component.stats.map(stat => stat.label);
    expect(labels).toContain('Total Hubs');
    expect(labels).toContain('Total Bookings');
    expect(labels).toContain('Active Services');
    expect(labels).toContain('Total Users');
  });

  it('should have 5 quick links', () => {
    expect(component.quickLinks.length).toBe(5);
  });

  it('should have correct quick link labels', () => {
    const labels = component.quickLinks.map(link => link.label);
    expect(labels).toContain('Hubs');
    expect(labels).toContain('Bookings');
    expect(labels).toContain('Services');
    expect(labels).toContain('Users');
    expect(labels).toContain('Email');
  });

  it('should have valid routes for quick links', () => {
    component.quickLinks.forEach(link => {
      expect(link.route).toMatch(/^\/dashboard\//);
    });
  });
});
