import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { homeResolver } from './resolvers/home.resolver';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    // Direct import instead of lazy-load to prevent hydration blink
    component: HomePage,
    resolve: {
      homeData: homeResolver,
    },
  },
];
