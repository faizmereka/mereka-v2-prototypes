import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { HeaderComponent } from './header.component';
import { ToastContainerComponent } from '../shared/ui';

@Component({
    selector: 'app-main-layout',
    imports: [RouterOutlet, SidebarComponent, HeaderComponent, ToastContainerComponent],
    templateUrl: './main-layout.component.html',
    styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent { }

