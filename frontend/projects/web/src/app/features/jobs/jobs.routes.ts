import { Routes } from '@angular/router';
import { jobResolver } from './resolvers/job.resolver';
import { JobDetailPage } from './pages/job-detail/job-detail.page';
import { JobListPage } from './pages/job-list/job-list.page';

export const JOBS_ROUTES: Routes = [
  {
    path: '',
    component: JobListPage,
  },
  {
    path: ':id',
    component: JobDetailPage,
    resolve: {
      job: jobResolver,
    },
  },
];
