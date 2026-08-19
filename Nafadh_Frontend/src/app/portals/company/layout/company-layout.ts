import { Component } from '@angular/core';
import { AppShell, ShellNavItem } from '../../../shared/ui/app-shell/app-shell';

@Component({
  selector: 'app-company-layout',
  imports: [AppShell],
  template: `<app-shell portalTitle="بوابة الشركة المستضيفة" accountLabel="مسؤول التدريب والتطوير" [navItems]="navItems" />`,
})
export class CompanyLayout {
  navItems: ShellNavItem[] = [
    { path: 'dashboard', label: 'لوحة التحكم', icon: 'home' },
    { path: 'trainees', label: 'المتدربون', icon: 'graduation' },
    { path: 'specialties', label: 'البرامج', icon: 'book' },
    { path: 'profile', label: 'ملف الشركة', icon: 'building' },
    { path: 'my-account', label: 'حسابي', icon: 'user' },
    { path: 'reports', label: 'التقارير', icon: 'chart' },
    { path: 'contact', label: 'التواصل والمراسلات', icon: 'chat' },
  ];
}