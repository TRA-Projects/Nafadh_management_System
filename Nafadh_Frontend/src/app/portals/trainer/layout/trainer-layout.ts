import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AppShell, ShellNavItem } from '../../../shared/ui/app-shell/app-shell';
import { TrainerGuideHelp } from '../user-guide/components/trainer-guide-help';
import { TrainerGuideService } from '../user-guide/services/trainer-guide.service';
import { TRAINER_GUIDE_CONTENT } from '../user-guide/data/trainer-guide-content';
import { TrainerGuideTour } from '../user-guide/components/trainer-guide-tour';
import {
  NavItemWithPermission,
  PagePermissionService,
} from '../../../core/auth/page-permission.service';

@Component({
  selector: 'app-trainer-layout',
  imports: [AppShell, TrainerGuideHelp, TrainerGuideTour],
  template: `
    <app-shell
      portalTitle="بوابة المدرب"
      accountLabel="مدرب"
      [navItems]="navItems()"
    />
    <app-trainer-guide-help />
    <app-trainer-guide-tour />
  `,
})
export class TrainerLayout implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly guideService = inject(TrainerGuideService);
  private readonly pagePermissions: PagePermissionService = inject(PagePermissionService);

  private navigationSubscription?: Subscription;

  ngOnInit(): void {
    this.updateCurrentGuide();

    this.navigationSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateCurrentGuide();
      });
  }

  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
    this.guideService.closeHelp();
    this.guideService.stopTour();
  }

  private updateCurrentGuide(): void {
    const segments = this.router.url
      .split('?')[0]
      .split('#')[0]
      .split('/')
      .filter(Boolean);

    const trainerIndex = segments.indexOf('trainer');

    if (trainerIndex === -1) {
      this.guideService.setGuide(null);
      return;
    }

    const section = segments[trainerIndex + 1] ?? 'dashboard';

    const pageKey =
      section === 'quizzes' &&
      segments[trainerIndex + 2] !== undefined &&
      segments[trainerIndex + 3] === 'questions'
        ? 'question-bank'
        : section;

    const guide = TRAINER_GUIDE_CONTENT[pageKey] ?? null;

    this.guideService.closeHelp();
    this.guideService.stopTour();
    this.guideService.setGuide(guide);
  }

  private readonly allNavItems: NavItemWithPermission<ShellNavItem>[] = [
    { path: 'dashboard', label: 'لوحة التحكم', icon: 'home', pageCode: 'nf.trainer.dashboard' },
    { path: 'batches', label: 'إدارة الدفعات', icon: 'cal', pageCode: 'nf.trainer.batches-programs' },
    { path: 'content', label: 'إدارة المحتوى', icon: 'folder', pageCode: 'nf.trainer.curriculum' },
    { path: 'quizzes', label: 'الاختبارات', icon: 'clip', pageCode: 'nf.trainer.quizzes' },
    { path: 'attendance', label: 'تسجيل الحضور', icon: 'check-square', pageCode: 'nf.trainer.attendance' },
    { path: 'trainer-attendance', label: 'حضوري', icon: 'check-square', pageCode: 'nf.trainer.attendance' },
    { path: 'tasks', label: 'المهام والمشروعات', icon: 'clip', pageCode: 'nf.trainer.tasks-projects' },
    { path: 'trainees', label: 'تقييم ومتابعة المتدربين', icon: 'graduation', pageCode: 'nf.trainer.trainees' },
    { path: 'reports', label: 'التقارير', icon: 'chart', pageCode: 'nf.trainer.reports' },
    { path: 'messages', label: 'التواصل والدعم', icon: 'chat', pageCode: 'nf.trainer.communications' },
    { path: 'profile', label: 'ملفي الشخصي', icon: 'user', pageCode: 'nf.trainer.profile' },
    { path: 'notifications', label: 'الإشعارات', icon: 'bell', pageCode: 'nf.trainer.notifications' },
  ];

  readonly navItems = computed(() =>
    this.pagePermissions.filterNavItems(this.allNavItems)
  );
}