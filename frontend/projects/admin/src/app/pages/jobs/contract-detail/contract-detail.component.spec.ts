import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractDetailComponent } from './contract-detail.component';
import { ActivatedRoute } from '@angular/router';

describe('ContractDetailComponent', () => {
  let component: ContractDetailComponent;
  let fixture: ComponentFixture<ContractDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractDetailComponent],
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

    fixture = TestBed.createComponent(ContractDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load contract details on init', () => {
    expect(component.isLoading()).toBeFalsy();
    expect(component.contract()).toBeTruthy();
  });

  it('should calculate financial summary correctly', () => {
    const summary = component.financialSummary();
    expect(summary.totalContractValue).toBeGreaterThanOrEqual(0);
  });

  it('should switch tabs correctly', () => {
    component.setActiveTab('milestones');
    expect(component.activeTab()).toBe('milestones');
  });

  it('should return correct status classes', () => {
    const activeClass = component.getStatusClasses('active');
    expect(activeClass).toContain('green');
  });
});
