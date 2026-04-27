import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsersListComponent } from './users-list.component';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';

describe('UsersListComponent', () => {
  let component: UsersListComponent;
  let fixture: ComponentFixture<UsersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersListComponent, RouterTestingModule, FormsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default status', () => {
    expect(component.currentStatus()).toBe('all');
  });

  it('should have status tabs', () => {
    expect(component.statusTabs.length).toBe(4);
    expect(component.statusTabs[0].label).toBe('All');
  });

  it('should initialize with mock users', () => {
    expect(component.users().length).toBeGreaterThan(0);
  });

  it('should filter users by status', () => {
    component.setStatus('active');
    expect(component.currentStatus()).toBe('active');
  });

  it('should toggle select all', () => {
    component.toggleSelectAll();
    const pageIds = component.paginatedUsers().map(u => u.id);
    expect(component.selectedUsers().length).toBeGreaterThan(0);
  });

  it('should get role label', () => {
    expect(component.getRoleLabel('learner')).toBe('Learner');
    expect(component.getRoleLabel('expert')).toBe('Expert');
    expect(component.getRoleLabel('hub_admin')).toBe('Hub Admin');
  });

  it('should filter users by search query', () => {
    component.searchQuery = 'John';
    component.filterUsers();
    const filtered = component.filteredUsers();
    expect(filtered.every(u =>
      u.name.toLowerCase().includes('john') ||
      u.email.toLowerCase().includes('john')
    )).toBeTruthy();
  });

  it('should paginate users', () => {
    expect(component.paginatedUsers().length).toBeLessThanOrEqual(component.pageSize);
  });
});
