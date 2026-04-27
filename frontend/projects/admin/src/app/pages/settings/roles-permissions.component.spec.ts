import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RolesPermissionsComponent } from './roles-permissions.component';

describe('RolesPermissionsComponent', () => {
  let component: RolesPermissionsComponent;
  let fixture: ComponentFixture<RolesPermissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesPermissionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolesPermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with roles tab as default', () => {
    expect(component.activeTab()).toBe('roles');
  });

  it('should filter roles based on search query', () => {
    component.searchQuery = 'Admin';
    const filtered = component.filteredRoles();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(role =>
      role.name.toLowerCase().includes('admin') ||
      role.description.toLowerCase().includes('admin')
    )).toBe(true);
  });

  it('should filter permissions by module', () => {
    component.selectedModule.set('Users');
    const filtered = component.filteredPermissions();
    expect(filtered.every(permission => permission.module === 'Users')).toBe(true);
  });

  it('should toggle role modal visibility', () => {
    expect(component.showRoleModal()).toBe(false);
    component.showRoleModal.set(true);
    expect(component.showRoleModal()).toBe(true);
    component.closeRoleModal();
    expect(component.showRoleModal()).toBe(false);
  });

  it('should toggle permission selection', () => {
    const permissionId = 'users.view';
    const initialLength = component.roleForm.permissions.length;

    component.togglePermission(permissionId);
    expect(component.roleForm.permissions.includes(permissionId)).toBe(true);

    component.togglePermission(permissionId);
    expect(component.roleForm.permissions.includes(permissionId)).toBe(false);
  });

  it('should get permissions by module', () => {
    const usersPermissions = component.getPermissionsByModule('Users');
    expect(usersPermissions.every(p => p.module === 'Users')).toBe(true);
  });

  it('should get roles with specific permission', () => {
    const rolesWithPermission = component.getRolesWithPermission('users.view');
    expect(rolesWithPermission.every(r => r.permissions.includes('users.view'))).toBe(true);
  });
});
