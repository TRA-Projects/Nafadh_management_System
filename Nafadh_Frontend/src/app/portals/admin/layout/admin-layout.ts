import { Component, computed, inject } from '@angular/core';
import {
  AppShell,
  ShellNavItem,
} from '../../../shared/ui/app-shell/app-shell';
import {
  NavItemWithPermission,
  PagePermissionService,
} from '../../../core/auth/page-permission.service';
@Component({
  selector: 'app-admin-layout',
  imports: [AppShell],
  template: `
    <app-shell
      portalTitle="بوابة الإدارة المركزية"
      accountLabel="مدير النظام"
      [navItems]="navItems()"
    />
  `,
})
export class AdminLayout {
private readonly pagePermissions: PagePermissionService = inject(PagePermissionService);

  private readonly allNavItems: NavItemWithPermission<ShellNavItem>[] = [
    {
      path: 'dashboard',
      label: 'لوحة التحكم التنفيذية',
      icon: 'home',
      pageCode: 'nf.admin.dashboard',
    },
    {
      path: '',
      label: 'الهوية والصلاحيات',
      icon: 'shield',
      children: [
        {
          path: 'external-system/identity/users',
          label: 'المستخدمون',
          icon: 'user',
          pageCode: 'nf.admin.identity.users',
        },
        {
          path: 'external-system/identity/template-roles',
          label: 'قوالب الأدوار',
          icon: 'shield',
          pageCode: 'nf.admin.identity.templates',
        },
        {
          path: 'external-system/identity/roles',
          label: 'الأدوار المخصصة',
          icon: 'shield',
          pageCode: 'nf.admin.identity.custom-roles',
        },
        {
          path: 'external-system/identity/groups',
          label: 'المجموعات',
          icon: 'folder',
          pageCode: 'nf.admin.identity.groups',
        },
      ],
    },
    {
      path: 'users',
      label: 'المستخدمون والصلاحيات',
      icon: 'shield',
      pageCode: 'nf.admin.users-permissions',
    },
    {
      path: 'trainees',
      label: 'إدارة المتدربين',
      icon: 'graduation',
      pageCode: 'nf.admin.trainees',
    },
    {
      path: 'companies',
      label: 'الشركات المستضيفة',
      icon: 'building',
      pageCode: 'nf.admin.companies',
    },
    {
      path: 'programs',
      label: 'البرامج والدفعات',
      icon: 'book',
      pageCode: 'nf.admin.programs-batches',
    },
    {
      path: 'certificates',
      label: 'إصدار الشهادات',
      icon: 'check-square',
      pageCode: 'nf.admin.certificates',
    },
    {
      path: 'warnings',
      label: 'إنذارات الشركات',
      icon: 'alert',
      pageCode: 'nf.admin.warnings',
    },
    {
      path: 'communications',
      label: 'التواصل والمراسلات',
      icon: 'chat',
      pageCode: 'nf.admin.communications',
    },
    {
      path: 'reports',
      label: 'التقارير والتحليلات',
      icon: 'chart',
      pageCode: 'nf.admin.reports',
    },
    {
      path: 'notifications',
      label: 'الإشعارات',
      icon: 'bell',
      pageCode: 'nf.admin.notifications',
    },
    {
      path: 'external-system/system-configuration',
      label: 'إدارة النظام',
      icon: 'settings',
      children: [
        {
          path: 'external-system/system-configuration',
          label: 'إعدادات النظام',
          icon: 'settings',
          pageCode: 'nf.admin.system-settings',
        },
        {
          path: 'external-system/constants',
          label: 'إدارة الثوابت',
          icon: 'book',
          pageCode: 'nf.admin.system-settings',
        },
        {
          path: 'external-system/notification-templates',
          label: 'القوالب',
          icon: 'bell',
          pageCode: 'nf.admin.system-settings',
        },
      ],
    },
    {
      path: 'audit',
      label: 'سجل التدقيق',
      icon: 'history',
      pageCode: 'nf.admin.audit-logs',
    },
  ];

  readonly navItems = computed(() =>
    this.pagePermissions.filterNavItems(this.allNavItems)
  );
}