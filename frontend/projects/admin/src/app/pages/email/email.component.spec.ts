import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { EmailComponent } from './email.component';

describe('EmailComponent', () => {
  let component: EmailComponent;
  let fixture: ComponentFixture<EmailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {}
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with emails tab as default', () => {
    expect(component.activeTab()).toBe('emails');
  });

  it('should have initial stats', () => {
    expect(component.totalEmails()).toBe(15420);
    expect(component.deliveredEmails()).toBe(14980);
    expect(component.pendingEmails()).toBe(320);
    expect(component.failedEmails()).toBe(120);
  });

  it('should filter templates based on search query', () => {
    component.searchQuery = 'booking';
    const filtered = component.filteredTemplates();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(t =>
      t.name.toLowerCase().includes('booking') ||
      t.subject.toLowerCase().includes('booking')
    )).toBe(true);
  });

  it('should return all templates when search query is empty', () => {
    component.searchQuery = '';
    const filtered = component.filteredTemplates();
    expect(filtered.length).toBe(component.templates().length);
  });

  it('should toggle add modal', () => {
    expect(component.showAddModal()).toBe(false);
    component.showAddModal.set(true);
    expect(component.showAddModal()).toBe(true);
    component.showAddModal.set(false);
    expect(component.showAddModal()).toBe(false);
  });
});
