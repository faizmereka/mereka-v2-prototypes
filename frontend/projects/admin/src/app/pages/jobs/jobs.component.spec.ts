import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobsComponent } from './jobs.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('JobsComponent', () => {
  let component: JobsComponent;
  let fixture: ComponentFixture<JobsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobsComponent],
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

    fixture = TestBed.createComponent(JobsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default active tab as jobs', () => {
    expect(component.activeTab()).toBe('jobs');
  });

  it('should switch tabs correctly', () => {
    component.setActiveTab('proposals');
    expect(component.activeTab()).toBe('proposals');

    component.setActiveTab('contracts');
    expect(component.activeTab()).toBe('contracts');
  });

  it('should reset page when changing tabs', () => {
    component.currentPage.set(5);
    component.setActiveTab('proposals');
    expect(component.currentPage()).toBe(1);
  });

  it('should filter jobs by search query', () => {
    component.jobSearchQuery = 'Developer';
    component.filterJobs();
    expect(component.currentPage()).toBe(1);
  });
});
