import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/auth.guard';

export const TRAINER_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard('Trainer')],
    loadComponent: () => import('./layout/trainer-layout').then((m) => m.TrainerLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.TrainerDashboard) },
      { path: 'batches', loadComponent: () => import('./pages/batches/batches').then((m) => m.TrainerBatches) },
      { path: 'content', loadComponent: () => import('./pages/content/content').then((m) => m.TrainerContent) },
      { path: 'attendance', loadComponent: () => import('./pages/attendance/attendance').then((m) => m.TrainerAttendance) },
      { path: 'tasks', loadComponent: () => import('./pages/tasks/tasks').then((m) => m.TrainerTasks) },
      { path: 'trainees', loadComponent: () => import('./pages/trainees/trainees').then((m) => m.TrainerTrainees) },
      { path: 'reports', loadComponent: () => import('./pages/reports/reports').then((m) => m.TrainerReports) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile').then((m) => m.TrainerProfile) },
    ],
  },
];
