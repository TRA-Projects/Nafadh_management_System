import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/auth.guard';

export const TRAINEE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard('Trainee')],
    loadComponent: () => import('./layout/trainee-layout').then((m) => m.TraineeLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.TraineeDashboard) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile').then((m) => m.TraineeProfile) },
      { path: 'program', loadComponent: () => import('./pages/program/program').then((m) => m.TraineeProgram) },
      { path: 'tasks', loadComponent: () => import('./pages/tasks/tasks').then((m) => m.TraineeTasks) },
      { path: 'attendance', loadComponent: () => import('./pages/attendance/attendance').then((m) => m.TraineeAttendance) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications').then((m) => m.TraineeNotifications) },
      { path: 'support', loadComponent: () => import('./pages/support/support').then((m) => m.TraineeSupport) },
      { path: 'achievements', loadComponent: () => import('./pages/achievements/achievements').then((m) => m.TraineeAchievements) },
    ],
  },
];
