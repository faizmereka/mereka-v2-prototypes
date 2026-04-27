import type { Routes } from '@angular/router';
import { ExpertiseListPage } from './pages/expertise-list/expertise-list.page';
import { ExpertiseDetailPage } from './pages/expertise-detail/expertise-detail.page';
import { expertiseResolver } from './resolvers/expertise.resolver';

export const EXPERTISE_ROUTES: Routes = [
  {
    path: '',
    component: ExpertiseListPage,
  },
  {
    path: ':slug',
    component: ExpertiseDetailPage,
    resolve: { expertise: expertiseResolver },
  },
];
