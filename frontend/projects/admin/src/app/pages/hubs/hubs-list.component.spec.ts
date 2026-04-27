import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HubsListComponent } from './hubs-list.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('HubsListComponent', () => {
  let component: HubsListComponent;
  let fixture: ComponentFixture<HubsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HubsListComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HubsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with all filter active', () => {
    expect(component.activeFilter()).toBe('all');
  });

  it('should have initial hubs data', () => {
    const hubs = component.hubs();
    expect(hubs.length).toBe(5);
  });

  it('should filter hubs by status', () => {
    component.setFilter('active');
    const filtered = component.filteredHubs();
    expect(filtered.every(hub => hub.status === 'active')).toBeTruthy();
  });

  it('should search hubs by name', () => {
    component.searchQuery = 'REXKL';
    component.onSearch();
    const filtered = component.filteredHubs();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('REXKL');
  });

  it('should paginate hubs', () => {
    component.pageSize.set(2);
    const paginated = component.paginatedHubs();
    expect(paginated.length).toBe(2);
  });

  it('should calculate total pages correctly', () => {
    component.pageSize.set(2);
    const totalPages = component.totalPages();
    expect(totalPages).toBe(3); // 5 hubs / 2 per page = 3 pages
  });

  it('should toggle select all', () => {
    const event = { target: { checked: true } } as any;
    component.toggleSelectAll(event);
    const allSelected = component.hubs().every(hub => hub.selected);
    expect(allSelected).toBeTruthy();
  });

  it('should toggle individual hub selection', () => {
    const hub = component.hubs()[0];
    component.toggleSelect(hub);
    const updatedHub = component.hubs().find(h => h.id === hub.id);
    expect(updatedHub?.selected).toBeTruthy();
  });

  it('should navigate to next page', () => {
    component.nextPage();
    expect(component.currentPage()).toBe(2);
  });

  it('should navigate to previous page', () => {
    component.currentPage.set(2);
    component.prevPage();
    expect(component.currentPage()).toBe(1);
  });

  it('should change page size', () => {
    component.setPageSize(25);
    expect(component.pageSize()).toBe(25);
    expect(component.currentPage()).toBe(1); // Should reset to page 1
  });
});
