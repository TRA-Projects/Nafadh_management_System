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
      {path: 'live-sessions',loadComponent: () =>import('./pages/live-sessions/live-sessions').then(m => m.TrainerLiveSessions)},
      {
  path: 'live-session-room/:sessionId',
  loadComponent: () =>
    import('./pages/live-session-room/live-session-room')
      .then(m => m.LiveSessionRoom)
},
      { path: 'attendance', loadComponent: () => import('./pages/attendance/attendance').then((m) => m.TrainerAttendance) },
      { path: 'tasks', loadComponent: () => import('./pages/tasks/tasks').then((m) => m.TrainerTasks) },
      { path: 'trainees', loadComponent: () => import('./pages/trainees/trainees').then((m) => m.TrainerTrainees) },
      { path: 'reports', loadComponent: () => import('./pages/reports/reports').then((m) => m.TrainerReports) },
      { path: 'messages', loadComponent: () => import('./pages/messages/messages').then((m) => m.TrainerMessages) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile').then((m) => m.TrainerProfile) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications').then((m) => m.TrainerNotifications) },
      {path: 'quizzes',loadComponent: () =>import('./pages/quizzes/quizzes').then(m => m.TrainerQuizzes)},
      {path: 'quiz-results',loadComponent: () =>import('./pages/quiz-results/quiz-results').then(m => m.QuizResults)},

    ],
  },
];
