import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard('Admin')],
    loadComponent: () => import('./layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.AdminDashboard) },
      { path: 'users', loadComponent: () => import('./pages/users/users').then((m) => m.AdminUsers) },
      { path: 'trainees', loadComponent: () => import('./pages/trainees/trainees').then((m) => m.AdminTrainees) },
      { path: 'trainees/:id', loadComponent: () => import('./pages/trainee-profile/trainee-profile').then((m) => m.AdminTraineeProfile) },
      { path: 'companies', loadComponent: () => import('./pages/companies/companies').then((m) => m.AdminCompanies) },
      { path: 'programs', loadComponent: () => import('./pages/programs/programs').then((m) => m.AdminPrograms) },
      { path: 'certificates', loadComponent: () => import('./pages/certificates/certificates').then((m) => m.AdminCertificates) },
      { path: 'warnings', loadComponent: () => import('./pages/warnings/warnings').then((m) => m.AdminWarnings) },
      { path: 'communications', loadComponent: () => import('./pages/communications/communications').then((m) => m.AdminCommunications) },
      { path: 'reports', loadComponent: () => import('./pages/reports/reports').then((m) => m.AdminReports) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications').then((m) => m.AdminNotifications) },
      { path: 'audit', loadComponent: () => import('./pages/audit/audit').then((m) => m.AdminAudit) },
    ],
  },
];
