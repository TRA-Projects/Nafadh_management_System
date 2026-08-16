import { Component } from '@angular/core';
import { AppShell, ShellNavItem } from '../../../shared/ui/app-shell/app-shell';

@Component({
  selector: 'app-trainer-layout',
  imports: [AppShell],
  template: `<app-shell portalTitle="بوابة المدرب" accountLabel="مدرب" [navItems]="navItems" />`,
})
export class TrainerLayout {
  navItems: ShellNavItem[] = [
    { path: 'dashboard', label: 'لوحة التحكم', icon: 'home' },
    { path: 'batches', label: 'إدارة الدفعات', icon: 'cal' },
    { path: 'content', label: 'إدارة المحتوى', icon: 'folder' },
    { path: 'attendance', label: 'تسجيل الحضور', icon: 'check-square' },
    { path: 'tasks', label: 'المهام والمشروعات', icon: 'clip' },
    { path: 'trainees', label: 'تقييم ومتابعة المتدربين', icon: 'graduation' },
    { path: 'reports', label: 'التقارير', icon: 'chart' },
    { path: 'profile', label: 'ملفي الشخصي', icon: 'user' },
  ];
}
