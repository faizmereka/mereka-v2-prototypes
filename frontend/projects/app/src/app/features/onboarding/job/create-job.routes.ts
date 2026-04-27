import { Routes } from '@angular/router';

// Child routes for the job creation steps
const JOB_STEP_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full',
  },
  {
    path: 'overview',
    loadComponent: () =>
      import('./steps/overview/overview.component').then((m) => m.JobOverviewComponent),
  },
  {
    path: 'requirements',
    loadComponent: () =>
      import('./steps/requirements/requirements.component').then((m) => m.JobRequirementsComponent),
  },
  {
    path: 'timeline-budget',
    loadComponent: () =>
      import('./steps/timeline-budget/timeline-budget.component').then((m) => m.JobTimelineBudgetComponent),
  },
  {
    path: 'your-detail',
    loadComponent: () =>
      import('./steps/your-detail/your-detail.component').then((m) => m.JobYourDetailComponent),
  },
  {
    path: 'confirmation',
    loadComponent: () =>
      import('./steps/confirmation/confirmation.component').then((m) => m.JobConfirmationComponent),
  },
];

export const CREATE_JOB_ROUTES: Routes = [
  // Edit mode (with ID) - must come first to avoid matching step paths as IDs
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./create-job.component').then((m) => m.CreateJobComponent),
    children: JOB_STEP_ROUTES,
  },
  // Create mode (no ID)
  {
    path: '',
    loadComponent: () =>
      import('./create-job.component').then((m) => m.CreateJobComponent),
    children: JOB_STEP_ROUTES,
  },
];
