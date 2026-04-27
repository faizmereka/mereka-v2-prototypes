import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@mereka/ui';

@Component({
  selector: 'app-hub-settings-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './profile.component.html',
})
export class HubSettingsProfileComponent {
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly hubName = signal('Creative Studios');
  readonly hubDescription = signal('We are a creative studio specializing in workshops and events.');
  readonly hubEmail = signal('contact@creativestudios.com');
  readonly hubPhone = signal('+60 12-345 6789');
  readonly hubWebsite = signal('https://creativestudios.com');
  readonly hubAddress = signal('123 Creative Lane, Kuala Lumpur, Malaysia');
  readonly hubLogo = signal<string | null>(null);
  readonly hubCover = signal<string | null>(null);

  saveProfile() {
    this.saving.set(true);
    // TODO: Implement save profile
    setTimeout(() => {
      this.saving.set(false);
    }, 1000);
  }
}
