import { Component, inject, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { UIAnchor } from '@mereka/ui/ui-button/ui-button';
import { RouterModule } from '@angular/router';
import { ViewBreakpointService } from '@mereka/core';

@Component({
  selector: 'ui-banner-profile, [ui-banner-profile]',
  imports: [MatIcon, RouterModule, UIAnchor],
  templateUrl: './ui-banner-profile.html',
  styleUrl: './ui-banner-profile.scss'
})
/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any */
export class UIBannerProfile {
  readonly view = inject(ViewBreakpointService);

  readonly shareUrl = input<string>('');
  readonly btnUpdateText = input<string>('');
  readonly previewText = input<string>('');
  readonly url = input<string>('');
  readonly backUrl = input<string>('');

  
}
