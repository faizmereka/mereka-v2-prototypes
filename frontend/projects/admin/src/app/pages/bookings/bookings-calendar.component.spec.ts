import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingsCalendarComponent } from './bookings-calendar.component';

describe('BookingsCalendarComponent', () => {
  let component: BookingsCalendarComponent;
  let fixture: ComponentFixture<BookingsCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingsCalendarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with current date', () => {
    const currentDate = component.currentDate();
    expect(currentDate).toBeInstanceOf(Date);
  });

  it('should initialize with month view mode', () => {
    expect(component.viewMode()).toBe('month');
  });

  it('should navigate to previous month', () => {
    const initialDate = new Date(component.currentDate());
    component.previousMonth();
    const newDate = component.currentDate();
    expect(newDate.getMonth()).toBe(initialDate.getMonth() - 1 < 0 ? 11 : initialDate.getMonth() - 1);
  });

  it('should navigate to next month', () => {
    const initialDate = new Date(component.currentDate());
    component.nextMonth();
    const newDate = component.currentDate();
    expect(newDate.getMonth()).toBe((initialDate.getMonth() + 1) % 12);
  });

  it('should generate calendar days', () => {
    const days = component.calendarDays();
    expect(days.length).toBeGreaterThan(0);
    expect(days.length % 7).toBe(0); // Should be multiple of 7 (weeks)
  });

  it('should have weekDays array', () => {
    expect(component.weekDays).toHaveLength(7);
  });

  it('should have bookings data', () => {
    expect(component.bookings.length).toBeGreaterThan(0);
  });
});
