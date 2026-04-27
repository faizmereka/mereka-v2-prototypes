import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderFilterGroupComponent } from './header-filter-group.component';
import { HeaderFilterGroupListComponent } from './header-filter-group-list.component';
import { HeaderFilterGroupLabelComponent } from './header-filter-group-label.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HeaderFilterGroupComponent,
    HeaderFilterGroupListComponent,
    HeaderFilterGroupLabelComponent,
  ],
  exports: [
    HeaderFilterGroupComponent,
    HeaderFilterGroupListComponent,
    HeaderFilterGroupLabelComponent,
  ],
})
export class HeaderFilterGroupModule { }
