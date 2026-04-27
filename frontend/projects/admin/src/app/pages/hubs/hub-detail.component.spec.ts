import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HubDetailComponent } from './hub-detail.component';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

describe('HubDetailComponent', () => {
  let component: HubDetailComponent;
  let fixture: ComponentFixture<HubDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HubDetailComponent, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '123' })
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HubDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set hub ID from route params', () => {
    expect(component.hubId()).toBe('123');
  });

  it('should have hub data', () => {
    const hub = component.hub();
    expect(hub.name).toBe('Creative Workshop Hub');
    expect(hub.status).toBe('active');
  });

  it('should have hub members', () => {
    const members = component.hubMembers();
    expect(members.length).toBe(4);
    expect(members[0].role).toBe('owner');
  });

  it('should return correct role classes', () => {
    expect(component.getRoleClasses('owner')).toContain('purple');
    expect(component.getRoleClasses('admin')).toContain('blue');
    expect(component.getRoleClasses('staff')).toContain('gray');
  });

  it('should have operating hours', () => {
    const hub = component.hub();
    expect(hub.operatingHours.length).toBe(7);
    expect(hub.operatingHours[6].closed).toBeTruthy(); // Sunday closed
  });

  it('should have location information', () => {
    const hub = component.hub();
    expect(hub.location.city).toBe('San Francisco');
    expect(hub.location.country).toBe('United States');
  });

  it('should have contact information', () => {
    const hub = component.hub();
    expect(hub.contact.email).toBe('hello@creativehub.com');
    expect(hub.contact.phone).toBe('+1 (555) 123-4567');
  });

  it('should have statistics', () => {
    const hub = component.hub();
    expect(hub.stats.totalRevenue).toBe(145678);
    expect(hub.stats.totalBookings).toBe(342);
  });

  it('should have service flags', () => {
    const hub = component.hub();
    expect(hub.hasExperiences).toBeTruthy();
    expect(hub.hasSpaces).toBeTruthy();
    expect(hub.hasExpertise).toBeTruthy();
  });
});
