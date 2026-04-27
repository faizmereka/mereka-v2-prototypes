import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobDetailComponent } from './job-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('JobDetailComponent', () => {
  let component: JobDetailComponent;
  let fixture: ComponentFixture<JobDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => '1'
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JobDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load job details on init', () => {
    expect(component.isLoading()).toBeFalsy();
    expect(component.job()).toBeTruthy();
  });

  it('should filter proposals by status', () => {
    component.filterProposals('pending');
    expect(component.selectedProposalStatus()).toBe('pending');
  });

  it('should return correct status classes', () => {
    const activeClass = component.getStatusClasses('ACTIVE');
    expect(activeClass).toContain('green');
  });
});
