import { Routes } from '@angular/router';
import { alreadyLoggedInGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    canActivate: [alreadyLoggedInGuard],
    loadComponent: () =>
      import('./features/auth/pages/auth/auth.page').then((m) => m.AuthPage),
  },
  // Email verification route (no auth guard - token-based)
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/verify-email/pages/verify-email/verify-email.page').then(
        (m) => m.VerifyEmailPage,
      ),
  },
  // Invitation routes (no auth guard - handled internally)
  {
    path: 'join',
    children: [
      {
        path: 'invite/:token',
        loadComponent: () =>
          import('./features/join/pages/accept-invite/accept-invite.page').then(
            (m) => m.AcceptInvitePage,
          ),
      },
      {
        path: 'link/:token',
        loadComponent: () =>
          import('./features/join/pages/join-link/join-link.page').then(
            (m) => m.JoinLinkPage,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
