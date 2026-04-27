import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingsComponent } from './bookings.component';
import { provideRouter } from '@angular/router';

describe('BookingsComponent', () => {
  let component: BookingsComponent;
  let fixture: ComponentFixture<BookingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingsComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with overview view mode', () => {
    expect(component.viewMode()).toBe('overview');
  });

  it('should initialize with pie chart type', () => {
    expect(component.chartType()).toBe('pie');
  });

  it('should switch to detailed view mode', () => {
    component.setViewMode('detailed');
    expect(component.viewMode()).toBe('detailed');
  });

  it('should switch to line chart type', () => {
    component.setChartType('line');
    expect(component.chartType()).toBe('line');
  });

  it('should calculate bookings chart total correctly', () => {
    const total = component.bookingsChartTotal();
    expect(total).toBeGreaterThan(0);
  });

  it('should have breakdown data', () => {
    const breakdown = component.breakdown();
    expect(breakdown.totalBookings).toBeGreaterThan(0);
  });
});
