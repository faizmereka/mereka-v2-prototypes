import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with amenities as default section', () => {
    expect(component.activeSection()).toBe('amenities');
  });

  it('should filter items based on search query', () => {
    component.searchQuery = 'WiFi';
    const filtered = component.filteredItems();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(item =>
      item.name.toLowerCase().includes('wifi') ||
      item.slug?.toLowerCase().includes('wifi') ||
      item.description?.toLowerCase().includes('wifi')
    )).toBe(true);
  });

  it('should toggle modal visibility', () => {
    expect(component.showModal()).toBe(false);
    component.openAddModal();
    expect(component.showModal()).toBe(true);
    component.closeModal();
    expect(component.showModal()).toBe(false);
  });

  it('should get correct item count for each section', () => {
    const amenitiesCount = component.getItemCount('amenities');
    expect(amenitiesCount).toBeGreaterThan(0);
  });
});
