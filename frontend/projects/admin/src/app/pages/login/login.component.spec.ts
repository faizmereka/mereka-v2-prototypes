import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, FormsModule],
      providers: [
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate') }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty email and password', () => {
    expect(component.email).toBe('');
    expect(component.password).toBe('');
  });

  it('should have isLoading signal set to false initially', () => {
    expect(component.isLoading()).toBe(false);
  });

  it('should have error signal set to null initially', () => {
    expect(component.error()).toBeNull();
  });

  it('should set current year', () => {
    expect(component.currentYear).toBe(new Date().getFullYear());
  });

  it('should show error when email or password is empty', () => {
    component.email = '';
    component.password = '';
    component.onSubmit();
    expect(component.error()).toBe('Please enter both email and password');
  });

  it('should set isLoading to true when submitting valid credentials', () => {
    component.email = 'test@example.com';
    component.password = 'password123';
    component.onSubmit();
    expect(component.isLoading()).toBe(true);
  });
});
