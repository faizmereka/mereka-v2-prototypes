import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsersComponent } from './users.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize user stats', () => {
    expect(component.userStats().length).toBe(3);
    expect(component.userStats()[0].label).toBe('Learners');
  });

  it('should initialize country visits', () => {
    expect(component.countryVisits().length).toBe(5);
    expect(component.countryVisits()[0].country).toBe('Malaysia');
  });

  it('should initialize source visits', () => {
    expect(component.sourceVisits().length).toBe(5);
    expect(component.sourceVisits()[0].source).toBe('Direct Source');
  });

  it('should have live users count', () => {
    expect(component.liveUsers()).toBe(320);
  });
});
