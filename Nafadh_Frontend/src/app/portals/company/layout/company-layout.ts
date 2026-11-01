import { Component } from '@angular/core';
import { AppShell, ShellNavItem } from '../../../shared/ui/app-shell/app-shell';
import { CompanyManualShell } from '../user-manual/components/company-manual-shell/company-manual-shell';

@Component({
  selector: 'app-company-layout',
  imports: [AppShell, CompanyManualShell],
  template: `<app-shell portalTitle="بوابة الشركة المستضيفة" accountLabel="مسؤول التدريب والتطوير" [navItems]="navItems" /><app-company-manual-shell />`,
})
export class CompanyLayout {
  navItems: ShellNavItem[] = [
    { path: 'dashboard', label: 'لوحة التحكم', icon: 'home' },
    { path: 'supervisors', label: 'إدارة المشرفين', icon: 'shield' },
    { path: 'trainees', label: 'المتدربون', icon: 'graduation' },
    { path: 'specialties', label: 'البرامج', icon: 'book' },

    { path: 'tasks', label: 'المهام والمشروعات', icon: 'clip' },

    { path: 'daily-attendance', label: 'سجل حضور المدربين', icon: 'calendar-check' },

    { path: 'profile', label: 'ملف الشركة', icon: 'building' },
    { path: 'my-account', label: 'حسابي', icon: 'user' },
    { path: 'reports', label: 'التقارير', icon: 'chart' },
    { path: 'contact', label: 'التواصل والمراسلات', icon: 'chat' },
    { path: 'notifications', label: 'الإشعارات', icon: 'bell' },
    { path: 'warnings', label: 'الإنذارات', icon: 'shield' },
  ];
}
