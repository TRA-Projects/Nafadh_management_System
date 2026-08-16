import { Component } from '@angular/core';
import { AppShell, ShellNavItem } from '../../../shared/ui/app-shell/app-shell';

// Now identical in structure to every other portal's layout — dark mode,
// language toggle, and the accessibility panel all live inside the shared
// AppShell itself (not a Trainee-only wrapper anymore), matching the
// reference design exactly across all four portals.
@Component({
  selector: 'app-trainee-layout',
  imports: [AppShell],
  template: `<app-shell portalTitle="بوابة المتدرب" accountLabel="متدرب" [navItems]="navItems" />`,
})
export class TraineeLayout {
  navItems: ShellNavItem[] = [
    { path: 'dashboard', label: 'الرئيسية', icon: 'home' },
    { path: 'profile', label: 'الملف الشخصي', icon: 'user' },
    { path: 'program', label: 'البرنامج التدريبي', icon: 'book' },
    { path: 'tasks', label: 'المهام والمشاريع', icon: 'clip' },
    { path: 'attendance', label: 'الحضور', icon: 'cal' },
    { path: 'notifications', label: 'التنبيهات', icon: 'bell' },
    { path: 'support', label: 'الدعم', icon: 'chat' },
    { path: 'achievements', label: 'الإنجازات', icon: 'award' },
  ];
}
