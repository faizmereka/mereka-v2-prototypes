import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Full-screen app loader with Mereka branding
 * Shows while auth state is being initialized
 */
@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-loader.component.html',
})
export class AppLoaderComponent {
  readonly message = input<string>('Loading your workspace...');
  readonly showProgress = input<boolean>(true);
}
