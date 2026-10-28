
import { Component, OnDestroy, computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { GuideService } from '../../../services/guide.service';

// استيراد المكونات
import { HelpButtonComponent } from '../../components/help-button/help-button.component';
import { HelpPanelComponent } from '../../components/help-panel/help-panel.component';
import {
  HelpFaqItem,
  HelpPanelData,
  HelpSection,
} from '../../models/help-panel.models';

// Guided Tour - الإضافة الجديدة
import { GuidedTour } from '../guided-tour/guided-tour';

// ✅ استيراد البيانات مباشرة
import { GUIDE_CONTENT } from '../../data/guide-content';

@Component({
  selector: 'app-user-manual-shell',
  standalone: true,
  imports: [
    HelpButtonComponent,
    HelpPanelComponent,
    GuidedTour,
  ],
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
    quizzes: 'quizzes',
  };

  // =========================================================
  // ✅ الحل الجذري: نقرأ البيانات مباشرة من GUIDE_CONTENT
  // =========================================================
  readonly helpPanelData = computed<HelpPanelData | null>(() => {
    // 1. نأخذ مفتاح الصفحة الحالية
    const pageKey = this.guideService.currentPageKey();

    // 2. نقرأ الدليل مباشرة من الملف (بدون الاعتماد على currentGuide)
    const guide = GUIDE_CONTENT[pageKey];

    if (!guide) {
      return null;
    }

    const sections: HelpSection[] = (guide.steps ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((step, index) => ({
        id: `step-${index}-${step.target}`,
        title: step.title,
        description: step.description,
        icon: 'clip',
      }));

    const faqs: HelpFaqItem[] = (guide.faqs ?? []).map((faq, index) => ({
      id: `faq-${index}`,
      question: faq.question,
      answer: faq.answer,
    }));

    return {
      pageTitle: guide.title,
      pageDescription: guide.description,
      sections,
      faqs,
    };
  });

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

    // هذا السطر يحدث المفتاح في الـ Service (مهم جداً)
    this.guideService.setPage(pageKey);

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

  // =========================================================
  // Guided Tour - الإضافة الجديدة فقط
  // =========================================================
  startGuidedTour(): void {
    this.guideService.closeHelp();
    this.guideService.startTour();
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }
}
