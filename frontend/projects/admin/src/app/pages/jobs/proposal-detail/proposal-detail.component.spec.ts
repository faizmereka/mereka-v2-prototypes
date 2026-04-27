import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProposalDetailComponent } from './proposal-detail.component';
import { ActivatedRoute } from '@angular/router';

describe('ProposalDetailComponent', () => {
  let component: ProposalDetailComponent;
  let fixture: ComponentFixture<ProposalDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProposalDetailComponent],
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

    fixture = TestBed.createComponent(ProposalDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load proposal details on init', () => {
    expect(component.isLoading()).toBeFalsy();
    expect(component.proposal()).toBeTruthy();
  });

  it('should calculate total milestone amount', () => {
    expect(component.totalMilestoneAmount()).toBeGreaterThanOrEqual(0);
  });

  it('should return correct status classes', () => {
    const pendingClass = component.getStatusClasses('pending');
    expect(pendingClass).toContain('yellow');
  });
});
