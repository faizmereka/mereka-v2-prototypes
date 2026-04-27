import type { Routes } from '@angular/router';
import { ExpertListPage } from './pages/expert-list/expert-list.page';
import { ExpertDetailPage } from './pages/expert-detail/expert-detail.page';
import { expertListResolver, expertDetailResolver } from './resolvers/expert.resolver';

export const EXPERTS_ROUTES: Routes = [
  {
    path: '',
    component: ExpertListPage,
    resolve: { experts: expertListResolver },
  },
  {
    path: ':slug',
    component: ExpertDetailPage,
    resolve: { expert: expertDetailResolver },
  },
];
