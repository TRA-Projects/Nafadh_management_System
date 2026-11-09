import { Component, computed, inject } from '@angular/core';
import { AppShell, ShellNavItem } from '../../../shared/ui/app-shell/app-shell';
import { CompanyManualShell } from '../user-manual/components/company-manual-shell/company-manual-shell';
import {
  NavItemWithPermission,
  PagePermissionService,
} from '../../../core/auth/page-permission.service';

@Component({
  selector: 'app-company-layout',
  imports: [AppShell, CompanyManualShell],
  template: `<app-shell portalTitle="بوابة الشركة المستضيفة" accountLabel="مسؤول التدريب والتطوير" [navItems]="navItems()" /><app-company-manual-shell />`,
})
export class CompanyLayout {
  private readonly pagePermissions: PagePermissionService = inject(PagePermissionService);

  private readonly allNavItems: NavItemWithPermission<ShellNavItem>[] = [
    { path: 'dashboard', label: 'لوحة التحكم', icon: 'home', pageCode: 'nf.company.dashboard' },
    { path: 'supervisors', label: 'إدارة الموظفين', icon: 'shield', pageCode: 'nf.company.supervisors' },
    { path: 'trainees', label: 'المتدربون', icon: 'graduation', pageCode: 'nf.company.trainees' },
    { path: 'specialties', label: 'البرامج', icon: 'book', pageCode: 'nf.company.programs' },
    { path: 'tasks', label: 'المهام والمشروعات', icon: 'clip', pageCode: 'nf.company.tasks-projects' },
    { path: 'daily-attendance', label: 'سجل حضور المدربين', icon: 'calendar-check', pageCode: 'nf.company.trainer-attendance' },
    { path: 'profile', label: 'ملف الشركة', icon: 'building', pageCode: 'nf.company.profile' },
    { path: 'my-account', label: 'حسابي', icon: 'user', pageCode: 'nf.company.account' },
    { path: 'reports', label: 'التقارير', icon: 'chart', pageCode: 'nf.company.reports' },
    { path: 'contact', label: 'التواصل والمراسلات', icon: 'chat', pageCode: 'nf.company.communications' },
    { path: 'notifications', label: 'الإشعارات', icon: 'bell', pageCode: 'nf.company.notifications' },
    { path: 'warnings', label: 'الإنذارات', icon: 'shield', pageCode: 'nf.company.warnings' },
  ];

  readonly navItems = computed(() =>
    this.pagePermissions.filterNavItems(this.allNavItems)
  );
}