import {
  Component,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { NfdIcon } from '../icon/icon';
import { NotificationSummaryService } from '../../services/notification-summary.service';

export interface ShellNavItem {
  path: string;
  label: string;
  icon: string;
}

type BellSource = 'notifications' | 'communication' | 'messages';

@Component({
  selector: 'app-shell',
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NfdIcon,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  portalTitle = input.required<string>();
  accountLabel = input.required<string>();
  navItems = input.required<ShellNavItem[]>();

  dark = signal(false);
  lang = signal<'ar' | 'en'>('ar');
  notifOpen = signal(false);
  accessOpen = signal(false);
  fontSize = signal(16);
  fontScale = computed(() => this.fontSize() / 16);
  showBackToTop = signal(false);

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly notificationSummaryService = inject(NotificationSummaryService);

  /** Shared backend summary consumed by the common notification bell. */
  readonly rawNotificationSummary = this.notificationSummaryService.summary;

  /**
   * Communication is capability-driven: a portal exposes it only when its
   * own navigation contains the communication destination.
   */
  readonly communicationRoute = computed(() => {
    const item = this.navItems().find((navItem) => {
      const label = navItem.label.toLowerCase();

      return (
        navItem.icon === 'chat' ||
        label.includes('التواصل') ||
        label.includes('المراسلات') ||
        label.includes('الدعم')
      );
    });

    return item?.path ?? null;
  });

  /** Find a dedicated notification page when the current portal provides one. */
  readonly notificationRoute = computed(() => {
    const item = this.navItems().find((navItem) => {
      const label = navItem.label.toLowerCase();

      return (
        navItem.icon === 'bell' ||
        label.includes('الإشعارات') ||
        label.includes('التنبيهات')
      );
    });

    return item?.path ?? null;
  });

  /**
   * Hide communication/message counters in portals that do not expose that
   * capability, while keeping system notifications independent.
   */
  readonly notificationSummary = computed(() => {
    const summary = this.rawNotificationSummary();
    const communicationEnabled = !!this.communicationRoute();

    const conversationsCount = communicationEnabled
      ? summary.conversationsCount
      : 0;

    const directMessagesCount = communicationEnabled
      ? summary.directMessagesCount
      : 0;

    return {
      notificationsCount: summary.notificationsCount,
      conversationsCount,
      directMessagesCount,
      totalCount:
        summary.notificationsCount +
        conversationsCount +
        directMessagesCount,
    };
  });

  constructor() {
    // The backend resolves the authenticated user from the JWT.
    if (this.auth.userId) {
      this.notificationSummaryService.load();
    }
  }

  toggleDark(): void {
    this.dark.update((value) => !value);
  }

  toggleLang(): void {
    this.lang.update((value) => (value === 'ar' ? 'en' : 'ar'));
  }

  /** Open/close the bell and refresh its real database counters when opened. */
  toggleNotifications(): void {
    this.notifOpen.update((value) => !value);

    if (this.notifOpen()) {
      this.notificationSummaryService.refresh();
    }
  }

  /** Navigate using only routes available in the current portal. */
  openBellItem(source: BellSource): void {
    let targetRoute: string | null = null;

    if (source === 'communication' || source === 'messages') {
      targetRoute = this.communicationRoute();
    }

    if (source === 'notifications') {
      targetRoute = this.notificationRoute();
    }

    // Do not navigate to a nonexistent destination in portals without it.
    if (!targetRoute) {
      return;
    }

    this.notifOpen.set(false);
    this.router.navigate([targetRoute], {
      relativeTo: this.activatedRoute,
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showBackToTop.set(
      (window.scrollY || document.documentElement.scrollTop) > 280
    );
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
}
