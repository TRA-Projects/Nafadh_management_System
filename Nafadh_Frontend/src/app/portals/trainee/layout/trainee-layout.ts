
import { Component, OnInit, inject } from '@angular/core';
import { AppShell, ShellNavItem } from '../../../shared/ui/app-shell/app-shell';
import { UserManualShell } from '../user-manual/components/user-manual-shell/user-manual-shell';
import { MeetingNotificationToast } from '../components/meeting-notification-toast/meeting-notification-toast';
import { MeetingSessionWatcher } from '../components/meeting-notification-toast/meeting-session-watcher';

@Component({
  selector: 'app-trainee-layout',
  imports: [AppShell, UserManualShell, MeetingNotificationToast],
  template: `
    <app-shell
      portalTitle="بوابة المتدرب"
      accountLabel="متدرب"
      [navItems]="navItems"
    />

    <app-user-manual-shell />

    <app-meeting-notification-toast
      [visible]="meetingWatcher.activeMeeting() !== null"
      [title]="meetingWatcher.activeMeeting()?.topic || 'حان موعد الحصة المباشرة'"
      message="حان موعد الحصة المجدولة، يمكنك الانضمام الآن."
      [meetingLink]="meetingWatcher.activeMeeting()?.meetingLink || ''"
      (dismissed)="meetingWatcher.dismiss()"
    />
  `,
})
export class TraineeLayout implements OnInit {
  readonly meetingWatcher = inject(MeetingSessionWatcher);

  ngOnInit(): void {
    this.meetingWatcher.start();
  }

  navItems: ShellNavItem[] = [
    { path: 'dashboard', label: 'الرئيسية', icon: 'home' },
    { path: 'profile', label: 'الملف الشخصي', icon: 'user' },
    { path: 'program', label: 'البرنامج التدريبي', icon: 'book' },
    { path: 'tasks', label: 'المهام والمشاريع', icon: 'clip' },
    { path: 'attendance', label: 'الحضور', icon: 'cal' },
    { path: 'notifications', label: 'التنبيهات', icon: 'bell' },
    { path: 'support', label: 'التواصل والمراسلات', icon: 'chat' },
    { path: 'achievements', label: 'الإنجازات والشهادات', icon: 'award' },
  ];
}
