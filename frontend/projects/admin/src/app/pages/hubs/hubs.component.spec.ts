import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HubsComponent } from './hubs.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('HubsComponent', () => {
  let component: HubsComponent;
  let fixture: ComponentFixture<HubsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HubsComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HubsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial stats', () => {
    const stats = component.stats();
    expect(stats.totalHubs).toBe(1234);
    expect(stats.toReview).toBe(12);
    expect(stats.drafted).toBe(5);
    expect(stats.loading).toBe(false);
  });

  it('should initialize with today as active time tab', () => {
    expect(component.activeTimeTab()).toBe('Today');
  });

  it('should initialize with today as active sales tab', () => {
    expect(component.activeSalesTab()).toBe('Today');
  });

  it('should update active time tab', () => {
    component.setActiveTimeTab('This Week');
    expect(component.activeTimeTab()).toBe('This Week');
  });

  it('should update active sales tab', () => {
    component.setActiveSalesTab('This Month');
    expect(component.activeSalesTab()).toBe('This Month');
  });

  it('should have recent hubs data', () => {
    const recentHubs = component.recentHubs();
    expect(recentHubs.length).toBe(4);
    expect(recentHubs[0].name).toBe('TDIH Miri');
  });

  it('should have most profitable hub data', () => {
    const profitable = component.mostProfitable();
    expect(profitable.name).toBe('REXKL');
    expect(profitable.profit).toBe('RM 3201.00');
  });
});
