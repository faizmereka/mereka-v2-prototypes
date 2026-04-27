import { Component } from '@angular/core';
import { UIAnchor } from '@mereka/ui/ui-button/ui-button';

/**
 * Home Corporate Section
 * Migrated from mereka-web-ssr.
 *
 * @figma https://www.figma.com/design/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Search-and-Collections?node-id=6243-117811&m=dev
 *
 * Static section — no data inputs required.
 */
@Component({
  selector: 'home-section-corporate, [home-section-corporate]',
  imports: [UIAnchor],
  templateUrl: './home-section-corporate.component.html',
  styleUrl: './home-section-corporate.component.scss',
  host: {
    'class': 'layout-section bg-underlay corporate',
  },
})
export class HomeSectionCorporateComponent {}
