import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./auth-pages/login/login').then((m) => m.Login),
  },
  {
    path: 'admin',
    loadChildren: () => import('./portals/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'company',
    loadChildren: () => import('./portals/company/company.routes').then((m) => m.COMPANY_ROUTES),
  },
  {
    path: 'trainer',
    loadChildren: () => import('./portals/trainer/trainer.routes').then((m) => m.TRAINER_ROUTES),
  },
  {
    path: 'trainee',
    loadChildren: () => import('./portals/trainee/trainee.routes').then((m) => m.TRAINEE_ROUTES),
  },
  { path: '**', redirectTo: 'login' },
];
