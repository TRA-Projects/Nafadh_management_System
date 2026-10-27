import { Component } from '@angular/core';
import { AppShell, ShellNavItem } from '../../../shared/ui/app-shell/app-shell';
import { TrainerGuideHelp } from '../user-guide/components/trainer-guide-help';
@Component({
  selector: 'app-trainer-layout',
 imports: [AppShell, TrainerGuideHelp],
 template: `
  <app-shell  portalTitle="بوابة المدرب" accountLabel="مدرب"  [navItems]="navItems" />
  <app-trainer-guide-help />
`,
})
export class TrainerLayout {
  navItems: ShellNavItem[] = [
    { path: 'dashboard', label: 'لوحة التحكم', icon: 'home' },
    { path: 'batches', label: 'إدارة الدفعات', icon: 'cal' },
    { path: 'content', label: 'إدارة المحتوى', icon: 'folder' },
    { path: 'quizzes', label: 'الاختبارات', icon: 'clip' },
    { path: 'attendance', label: 'تسجيل الحضور', icon: 'check-square' },
    { path: 'tasks', label: 'المهام والمشروعات', icon: 'clip' },
    { path: 'trainees', label: 'تقييم ومتابعة المتدربين', icon: 'graduation' },
    { path: 'reports', label: 'التقارير', icon: 'chart' },
    { path: 'messages', label: 'التواصل والدعم', icon: 'chat' },
    { path: 'profile', label: 'ملفي الشخصي', icon: 'user' },
    { path: 'notifications', label: 'الإشعارات', icon: 'bell' },
    
  ];
}
