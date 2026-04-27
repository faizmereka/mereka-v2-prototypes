import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { RouterTestingModule } from '@angular/router/testing';
import { ComponentRef } from '@angular/core';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let componentRef: ComponentRef<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default title', () => {
    expect(component.title()).toBe('Dashboard');
  });

  it('should accept title input', () => {
    componentRef.setInput('title', 'Test Title');
    fixture.detectChanges();
    expect(component.title()).toBe('Test Title');
  });

  it('should render title in h1', () => {
    componentRef.setInput('title', 'My Title');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const h1 = compiled.querySelector('h1');
    expect(h1?.textContent).toContain('My Title');
  });

  it('should have empty subMenu by default', () => {
    expect(component.subMenu()).toEqual([]);
  });

  it('should accept subMenu input', () => {
    const testSubMenu = [
      { label: 'Item 1', route: '/route1' },
      { label: 'Item 2', route: '/route2' }
    ];
    componentRef.setInput('subMenu', testSubMenu);
    fixture.detectChanges();
    expect(component.subMenu()).toEqual(testSubMenu);
  });

  it('should render submenu when provided', () => {
    const testSubMenu = [
      { label: 'Overview', route: '/overview' }
    ];
    componentRef.setInput('subMenu', testSubMenu);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const nav = compiled.querySelector('nav');
    expect(nav).toBeTruthy();
  });
});
