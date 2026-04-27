import { Routes } from '@angular/router';
import { experienceResolver } from './resolvers/experience.resolver';
import { ExperienceListPage } from './pages/experience-list/experience-list.page';
import { ExperienceDetailPage } from './pages/experience-detail/experience-detail.page';

export const EXPERIENCE_ROUTES: Routes = [
  {
    path: '',
    component: ExperienceListPage,
  },
  {
    path: ':slug',
    component: ExperienceDetailPage,
    resolve: {
      experience: experienceResolver,
    },
  },
];
