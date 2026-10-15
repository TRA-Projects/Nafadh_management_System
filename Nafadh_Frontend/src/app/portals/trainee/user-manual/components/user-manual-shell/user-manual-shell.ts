
import { Component, OnDestroy, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { GuideService } from '../../../services/guide.service';

@Component({
  selector: 'app-user-manual-shell',
  standalone: true,
  templateUrl: './user-manual-shell.html',
  styleUrl: './user-manual-shell.scss',
})
export class UserManualShell implements OnDestroy {
  readonly guideService = inject(GuideService);

  private readonly router = inject(Router);
  private routeSubscription?: Subscription;

  private readonly pageKeys: Record<string, string> = {
    dashboard: 'dashboard',
    profile: 'profile',
    program: 'program',
    tasks: 'tasks',
    attendance: 'attendance',
    notifications: 'notifications',
    support: 'support',
    achievements: 'achievements',
  };

  constructor() {
    this.updateCurrentPage(this.router.url);

    this.routeSubscription = this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        this.updateCurrentPage(event.urlAfterRedirects);
      });
  }

  private updateCurrentPage(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const segments = cleanUrl.split('/').filter(Boolean);

    if (segments[0] !== 'trainee') {
      return;
    }

    const route = segments[1] || 'dashboard';
    const pageKey = this.pageKeys[route];

    if (!pageKey) {
      this.guideService.setGuide(null);
      this.guideService.stopTour();
      return;
    }

    this.guideService.setPage(pageKey);
    this.guideService.setGuide(null);
    this.guideService.stopTour();
  }

  toggleHelp(): void {
    if (this.guideService.isHelpOpen()) {
      this.guideService.closeHelp();
    } else {
      this.guideService.openHelp();
    }
  }

  closeHelp(): void {
    this.guideService.closeHelp();
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }
}
