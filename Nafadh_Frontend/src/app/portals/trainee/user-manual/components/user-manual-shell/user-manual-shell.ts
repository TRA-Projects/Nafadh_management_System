import { Component, OnDestroy, computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { GuideService } from '../../../services/guide.service';

// =========================================================
// Help Panel Components (المكوّنات الجديدة)
// =========================================================
import { HelpButtonComponent } from '../../components/help-button/help-button.component';
import { HelpPanelComponent } from '../../components/help-panal/help-panel.component';
import {
  HelpFaqItem,
  HelpPanelData,
  HelpSection,
} from '../../models/help-panel.models';

@Component({
  selector: 'app-user-manual-shell',
  standalone: true,
  imports: [
    // المكوّنات الجديدة
    HelpButtonComponent,
    HelpPanelComponent,
  ],
  templateUrl: './user-manual-shell.html',
  styleUrl: './user-manual-shell.scss',
})
export class UserManualShell implements OnDestroy {
  readonly guideService = inject(GuideService);

  private readonly router = inject(Router);
  private routeSubscription?: Subscription;

  // =========================================================
  // Page Keys (بدون تغيير)
  // =========================================================
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

  // =========================================================
  // Help Panel Data Mapping (جديد)
  // =========================================================
  /**
   * تحويل GuidePage → HelpPanelData.
   *
   * Mapping:
   * - guide.title        → pageTitle
   * - guide.description  → pageDescription
   * - guide.steps[]      → sections[] (كل خطوة تصبح قسماً، مرتّبة حسب order)
   * - guide.faqs[]       → faqs[] (مع توليد id)
   */
  readonly helpPanelData = computed<HelpPanelData | null>(() => {
    const guide = this.guideService.currentGuide();

    if (!guide) {
      return null;
    }

    // -------------------------------------------------------
    // تحويل الخطوات إلى أقسام (مرتّبة حسب order)
    // -------------------------------------------------------
    const sections: HelpSection[] = (guide.steps ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((step, index) => ({
        id: `step-${index}-${step.target}`,
        title: step.title,
        description: step.description,
        icon: 'clip',
      }));

    // -------------------------------------------------------
    // تحويل الأسئلة الشائعة (توليد id من index)
    // -------------------------------------------------------
    const faqs: HelpFaqItem[] = (guide.faqs ?? []).map((faq, index) => ({
      id: `faq-${index}`,
      question: faq.question,
      answer: faq.answer,
    }));

    // -------------------------------------------------------
    // البيانات النهائية
    // -------------------------------------------------------
    return {
      pageTitle: guide.title,
      pageDescription: guide.description,
      sections,
      faqs,
    };
  });

  // =========================================================
  // Constructor (بدون تغيير)
  // =========================================================
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

  // =========================================================
  // updateCurrentPage (بدون تغيير)
  // =========================================================
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

  // =========================================================
  // Help Actions (بدون تغيير)
  // =========================================================
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

  // =========================================================
  // OnDestroy (بدون تغيير)
  // =========================================================
  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }
}