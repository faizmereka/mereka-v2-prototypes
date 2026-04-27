import { Routes } from '@angular/router';

export const routes: Routes = [
  // Experience Checkout
  {
    path: 'experience/:slug',
    loadComponent: () =>
      import('./features/experience/pages/experience-checkout.page').then(
        (m) => m.ExperienceCheckoutPage
      ),
  },

  // Expertise Checkout
  {
    path: 'expertise/:slug',
    loadComponent: () =>
      import('./features/expertise/pages/expertise-checkout.page').then(
        (m) => m.ExpertiseCheckoutPage
      ),
  },

  // Confirmation Page
  {
    path: 'success/:bookingId',
    loadComponent: () =>
      import('./features/confirmation/pages/confirmation.page').then(
        (m) => m.ConfirmationPage
      ),
  },

  // Proposal Checkout
  {
    path: 'proposal/:jobId',
    loadComponent: () =>
      import('./features/proposal/pages/proposal-checkout.page').then(
        (m) => m.ProposalCheckoutPage
      ),
  },

  // Proposal Success
  {
    path: 'proposal/success/:proposalId',
    loadComponent: () =>
      import('./features/proposal/pages/proposal-success.page').then(
        (m) => m.ProposalSuccessPage
      ),
  },

  // Error Pages
  {
    path: 'expired',
    loadComponent: () =>
      import('./features/error/pages/expired.page').then((m) => m.ExpiredPage),
  },
  {
    path: 'sold-out',
    loadComponent: () =>
      import('./features/error/pages/sold-out.page').then((m) => m.SoldOutPage),
  },

  // Fallback - redirect to web app
  {
    path: '**',
    redirectTo: '/',
  },
];
