import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'header-filter-bar, [header-filter-bar], common-header-filter-bar, [common-header-filter-bar]',
  imports: [],
  templateUrl: './header-filter-bar.component.html',
  styleUrl: './header-filter-bar.component.scss',
  host: {
    class: 'common-header-filter-bar',
  },
  encapsulation: ViewEncapsulation.None,
})
export class HeaderFilterBarComponent {}
