import { Component } from '@angular/core';
import { AppShell, ShellNavItem } from '../../../shared/ui/app-shell/app-shell';

@Component({
  selector: 'app-admin-layout',
  imports: [AppShell],
  template: `<app-shell portalTitle="بوابة الإدارة المركزية" accountLabel="مدير النظام" [navItems]="navItems" />`,
})
export class AdminLayout {
  navItems: ShellNavItem[] = [
    { path: 'dashboard', label: 'لوحة التحكم التنفيذية', icon: 'home' },
    {
      path: '',
      label: 'الهوية والصلاحيات',
      icon: 'shield',
      children: [
        { path: 'external-system/identity/users', label: 'المستخدمون', icon: 'user' },
        { path: 'external-system/identity/template-roles', label: 'قوالب الأدوار', icon: 'shield' },
        { path: 'external-system/identity/roles', label: 'الأدوار المخصصة', icon: 'shield' },
        { path: 'external-system/identity/groups', label: 'المجموعات', icon: 'folder' },
      ],
    },
    { path: 'users', label: 'المستخدمون والصلاحيات', icon: 'shield' },
    { path: 'trainees', label: 'إدارة المتدربين', icon: 'graduation' },
    { path: 'companies', label: 'الشركات المستضيفة', icon: 'building' },
    { path: 'programs', label: 'البرامج والدفعات', icon: 'book' },
    { path: 'certificates', label: 'إصدار الشهادات', icon: 'check-square' },
    { path: 'warnings', label: 'إنذارات الشركات', icon: 'alert' },
    { path: 'communications', label: 'التواصل والمراسلات', icon: 'chat' },
    { path: 'reports', label: 'التقارير والتحليلات', icon: 'chart' },
    { path: 'notifications', label: 'الإشعارات', icon: 'bell' },
    { path: 'external-system/constants', label: 'إدارة الثوابت', icon: 'book' },
    { path: 'audit', label: 'سجل التدقيق', icon: 'history' },
    
  ];
}
