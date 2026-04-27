import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubProfileFormComponent } from '../components/hub-profile-form.component';

@Component({
  selector: 'app-hub-form',
  imports: [CommonModule, HubProfileFormComponent],
  templateUrl: './hub-form.component.html',
})
export class HubFormComponent {
  @ViewChild(HubProfileFormComponent) profileForm!: HubProfileFormComponent;

  // Expose methods for parent component
  validateForm(): boolean {
    return this.profileForm?.validateForm() ?? false;
  }

  isFormValid(): boolean {
    return this.profileForm?.isFormValid() ?? false;
  }

  isSaving(): boolean {
    return this.profileForm?.isSaving() ?? false;
  }

  async saveProfile(): Promise<void> {
    await this.profileForm?.saveProfile();
  }
}
