import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'ui-nav-tabs',
  template: `
    <nav class="flex items-center gap-3 mb-4">
      <ng-content></ng-content>
    </nav>
  `,
  styles: ``,
})
export class NavTabsComponent {}

@Component({
  selector: 'ui-nav-tab',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <a
      [routerLink]="link()"
      routerLinkActive="text-primary"
      class="font-bold text-gray-400 px-2 py-2 transition-colors hover:text-gray-600"
    >
      <ng-content></ng-content>
    </a>
  `,
  styles: ``,
})
export class NavTabComponent {
  link = input.required<string | string[]>();
}
