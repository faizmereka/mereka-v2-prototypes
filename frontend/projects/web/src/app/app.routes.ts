import { Routes } from '@angular/router';
import { HOME_ROUTES } from './features/home/home.routes';
import { EXPERIENCE_ROUTES } from './features/experience/experience.routes';
import { EXPERTISE_ROUTES } from './features/expertise/expertise.routes';
import { EXPERTS_ROUTES } from './features/experts/experts.routes';
import { HUBS_ROUTES } from './features/hubs/hubs.routes';
import { JOBS_ROUTES } from './features/jobs/jobs.routes';
import { AI_FUNDAMENTALS_ROUTES } from './features/ai-fundamentals/ai-fundamentals.routes';

export const routes: Routes = [
  {
    path: '',
    // Direct import instead of lazy-load to prevent hydration blink
    children: HOME_ROUTES,
  },
  {
    path: 'experience',
    children: EXPERIENCE_ROUTES,
  },
  {
    path: 'experiences',
    children: EXPERIENCE_ROUTES,
  },
  {
    path: 'expertise',
    children: EXPERTISE_ROUTES,
  },
  {
    path: 'expertises',
    children: EXPERTISE_ROUTES,
  },
  {
    path: 'experts',
    children: EXPERTS_ROUTES,
  },
  {
    path: 'expert',
    children: EXPERTS_ROUTES,
  },
  {
    path: 'hubs',
    children: HUBS_ROUTES,
  },
  {
    path: 'hub',
    children: HUBS_ROUTES,
  },
  {
    path: 'jobs',
    children: JOBS_ROUTES,
  },
  {
    path: 'job',
    children: JOBS_ROUTES,
  },
  {
    path: 'new',
    children: AI_FUNDAMENTALS_ROUTES,
  },
];
