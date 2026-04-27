import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with collapsed state', () => {
    expect(component.isExpanded()).toBe(false);
  });

  it('should expand on mouseenter', () => {
    component.expand();
    expect(component.isExpanded()).toBe(true);
  });

  it('should collapse on mouseleave', () => {
    component.expand();
    component.collapse();
    expect(component.isExpanded()).toBe(false);
  });

  it('should have navigation items', () => {
    expect(component.navItems).toBeDefined();
    expect(component.navItems.length).toBeGreaterThan(0);
  });

  it('should render logo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const logo = compiled.querySelector('img[alt="Mereka"]');
    expect(logo).toBeTruthy();
  });
});
