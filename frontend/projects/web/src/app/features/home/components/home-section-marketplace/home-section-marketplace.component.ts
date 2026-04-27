import { Component } from '@angular/core';
import { UIAnchor } from '@mereka/ui/ui-button/ui-button';

/**
 * Home Marketplace Section
 * Migrated from mereka-web-ssr.
 *
 * @figma https://www.figma.com/design/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Search-and-Collections?node-id=6243-117811&m=dev
 *
 * Static section — no data inputs required.
 */
@Component({
  selector: 'home-section-marketplace, [home-section-marketplace]',
  imports: [UIAnchor],
  templateUrl: './home-section-marketplace.component.html',
  styleUrl: './home-section-marketplace.component.scss',
  host: {
    'class': 'layout-section marketplace',
  },
})
export class HomeSectionMarketplaceComponent {}
