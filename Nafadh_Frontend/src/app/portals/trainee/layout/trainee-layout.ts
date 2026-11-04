import { Component, OnInit, computed, inject } from '@angular/core';
import { AppShell, ShellNavItem } from '../../../shared/ui/app-shell/app-shell';
import { UserManualShell } from '../user-manual/components/user-manual-shell/user-manual-shell';
import { MeetingNotificationToast } from '../components/meeting-notification-toast/meeting-notification-toast';
import { MeetingSessionWatcher } from '../components/meeting-notification-toast/meeting-session-watcher';
import {
  NavItemWithPermission,
  PagePermissionService,
} from '../../../core/auth/page-permission.service';

@Component({
  selector: 'app-trainee-layout',
  imports: [AppShell, UserManualShell, MeetingNotificationToast],
  template: `
    <app-shell
      portalTitle="بوابة المتدرب"
      accountLabel="متدرب"
      [navItems]="navItems()"
    />

    <app-user-manual-shell />

    <app-meeting-notification-toast
      [visible]="meetingWatcher.activeMeeting() !== null"
      [title]="meetingWatcher.activeMeeting()?.topic || 'حان موعد الحصة المباشرة'"
      message="حان موعد الحصة المجدولة، يمكنك الانضمام الآن."
      [meetingLink]="meetingWatcher.activeMeeting()?.meetingLink || ''"
      [sessionId]="meetingWatcher.activeMeeting()?.sessionId ?? null"
      (dismissed)="meetingWatcher.dismiss()"
    />
  `,
})
export class TraineeLayout implements OnInit {
  readonly meetingWatcher = inject(MeetingSessionWatcher);
  private readonly pagePermissions: PagePermissionService = inject(PagePermissionService);

  ngOnInit(): void {
    this.meetingWatcher.start();
  }

  private readonly allNavItems: NavItemWithPermission<ShellNavItem>[] = [
    { path: 'dashboard', label: 'الرئيسية', icon: 'home', pageCode: 'nf.trainee.dashboard' },
    { path: 'profile', label: 'الملف الشخصي', icon: 'user', pageCode: 'nf.trainee.profile' },
    { path: 'program', label: 'البرنامج التدريبي', icon: 'book', pageCode: 'nf.trainee.program' },
    { path: 'tasks', label: 'المهام والمشاريع', icon: 'clip', pageCode: 'nf.trainee.tasks-projects' },
    { path: 'quizzes', label: 'الاختبارات', icon: 'clip', pageCode: 'nf.trainee.quizzes' },
    { path: 'attendance', label: 'الحضور', icon: 'cal', pageCode: 'nf.trainee.attendance' },
    { path: 'notifications', label: 'التنبيهات', icon: 'bell', pageCode: 'nf.trainee.notifications' },
    { path: 'support', label: 'التواصل والمراسلات', icon: 'chat', pageCode: 'nf.trainee.communications' },
    { path: 'achievements', label: 'الإنجازات والشهادات', icon: 'award', pageCode: 'nf.trainee.evaluations-badges' },
  ];

  readonly navItems = computed(() =>
    this.pagePermissions.filterNavItems(this.allNavItems)
  );
}