import { Component } from '@angular/core';
import { AppShell, ShellNavItem } from '../../../shared/ui/app-shell/app-shell';
import { UserManualShell } from '../user-manual/components/user-manual-shell/user-manual-shell';

@Component({
  selector: 'app-trainee-layout',
  imports: [AppShell, UserManualShell],
  template: `
    <app-shell
      portalTitle="بوابة المتدرب"
      accountLabel="متدرب"
      [navItems]="navItems"
    />

    <app-user-manual-shell />
  `,
})
export class TraineeLayout {
  navItems: ShellNavItem[] = [
    { path: 'dashboard', label: 'الرئيسية', icon: 'home' },
    { path: 'profile', label: 'الملف الشخصي', icon: 'user' },
    { path: 'program', label: 'البرنامج التدريبي', icon: 'book' },
    { path: 'tasks', label: 'المهام والمشاريع', icon: 'clip' },
    { path: 'quizzes', label: 'الاختبارات', icon: 'clip' }, // 👈 السطر الجديد هنا
    { path: 'attendance', label: 'الحضور', icon: 'cal' },
    { path: 'notifications', label: 'التنبيهات', icon: 'bell' },
    { path: 'support', label: 'التواصل والمراسلات', icon: 'chat' },
    { path: 'achievements', label: 'الإنجازات والشهادات', icon: 'award' },
  ];
}