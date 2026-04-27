import type { Routes } from '@angular/router';
import { HubListPage } from './pages/hub-list/hub-list.page';
import { HubDetailPage } from './pages/hub-detail/hub-detail.page';
import { hubListResolver, hubDetailResolver } from './resolvers/hub.resolver';

export const HUBS_ROUTES: Routes = [
  {
    path: '',
    component: HubListPage,
    resolve: { hubs: hubListResolver },
  },
  {
    path: ':slug',
    component: HubDetailPage,
    resolve: { hub: hubDetailResolver },
  },
];
