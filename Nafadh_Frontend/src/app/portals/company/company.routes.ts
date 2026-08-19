import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/auth.guard';

export const COMPANY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard('CompanySupervisor')],
    loadComponent: () => import('./layout/company-layout').then((m) => m.CompanyLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.CompanyDashboard) },
      { path: 'trainees', loadComponent: () => import('./pages/trainees/trainees').then((m) => m.CompanyTrainees) },
      { path: 'trainees/:id/progress', loadComponent: () => import('./pages/trainee-progress/trainee-progress').then((m) => m.CompanyTraineeProgress) },
      { path: 'specialties', loadComponent: () => import('./pages/specialties/specialties').then((m) => m.CompanySpecialties) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile').then((m) => m.CompanyProfile) },
      { path: 'my-account', loadComponent: () => import('./pages/my-account/my-account').then((m) => m.CompanyMyAccount) },
      
      // التعديل هنا: m.ReportsComponent بدلاً من m.CompanyReports
      { path: 'reports', loadComponent: () => import('./pages/reports/reports').then((m) => m.ReportsComponent) },
      
      { path: 'contact', loadComponent: () => import('./pages/contact/contact').then((m) => m.CompanyContact) },
    ],
  },
];