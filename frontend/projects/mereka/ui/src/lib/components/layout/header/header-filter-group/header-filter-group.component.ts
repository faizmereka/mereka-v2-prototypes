/* eslint-disable @angular-eslint/component-selector */

import { Component } from '@angular/core';

@Component({
  selector: 'header-filter-group, [header-filter-group]',
  imports: [],
  templateUrl: './header-filter-group.component.html',
  styleUrl: './header-filter-group.component.scss',
  host: {
      class: 'header-filter-group',
  }
})
export class HeaderFilterGroupComponent {

}
