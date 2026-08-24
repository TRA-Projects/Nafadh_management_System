import { Component, HostListener, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { NfdIcon } from '../icon/icon';
import { NotificationCenterService } from '../../services/notification-center.service';

export interface ShellNavItem {
  path: string;
  label: string;
  icon: string; // matches an <nfd-icon name="..."> case
}

// THE single shared layout shell — rebuilt to match the reference Trainee
// demo pixel-for-pixel: header with logo on the RTL-start side, centered
// search bar, and a left-side action cluster (dark mode → language →
// accessibility → notifications → profile), plus a navy sidebar with
// line-icon nav items. Every portal renders this exact same shell; only the
// nav item list, portal subtitle, and account label differ per portal.
@Component({
  selector: 'app-shell',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, NfdIcon],
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

  // Feature availability is derived from the portal navigation instead of
  // hardcoding portal names, so the same shell works across all portals.
  hasNotificationCenter = computed(() =>
    this.navItems().some((item) => item.path === 'notifications')
  );

  hasCommunication = computed(() =>
    this.navItems().some((item) =>
      ['contact', 'communications', 'messages', 'support'].includes(item.path)
    )
  );

  bellCount = computed(() => {
    const summary = this.notificationCenter.summary();
    const notificationCount = this.hasNotificationCenter()
      ? summary.notificationsCount
      : 0;
    const communicationCount = this.hasCommunication()
      ? summary.directMessagesCount + summary.conversationsCount
      : 0;

    return notificationCount + communicationCount;
  });

  // Back-to-top: shows once the page is scrolled down past a small
  // threshold, so the user never has to grab the mouse and drag the
  // scrollbar back up manually — one click/tap jumps to the top.
  showBackToTop = signal(false);

  constructor(
    public auth: AuthService,
    public notificationCenter: NotificationCenterService
  ) {
    // The shell is shared, so every portal automatically starts the same
    // authenticated unread-count synchronization.
    if (this.auth.isAuthenticated()) {
      this.notificationCenter.load();
    }
  }

  toggleDark() { this.dark.update((v) => !v); }
  toggleLang() { this.lang.update((v) => (v === 'ar' ? 'en' : 'ar')); }

  toggleNotifications() {
    this.notifOpen.update((open) => !open);
    this.notificationCenter.refresh();
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.showBackToTop.set((window.scrollY || document.documentElement.scrollTop) > 280);
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
