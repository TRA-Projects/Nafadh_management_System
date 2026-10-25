
import {
  Component,
  OnDestroy,
  ViewEncapsulation,
  effect,
  inject
} from '@angular/core';

import { driver, Driver, DriveStep } from 'driver.js';

import { GuideService } from '../../../services/guide.service';
import { GuideStep } from '../../models/guide.models';

@Component({
  selector: 'app-guided-tour',
  standalone: true,
  templateUrl: './guided-tour.html',
  styleUrl: './guided-tour.scss',
  encapsulation: ViewEncapsulation.None,
})
export class GuidedTour implements OnDestroy {
  readonly guideService = inject(GuideService);

  private tour?: Driver;
  private isStoppingProgrammatically = false;

  private startTimer?: ReturnType<typeof setTimeout>;
  private readonly retryDelay = 300;
  private readonly maxAttempts = 12;
  private attempts = 0;

  constructor() {
    effect(() => {
      const isActive = this.guideService.isTourActive();
      const guide = this.guideService.currentGuide();

      this.clearPendingStart();

      if (!isActive) {
        this.stopDriver();
        return;
      }

      if (!guide?.steps?.length) {
        this.stopDriver();
        return;
      }

      this.attempts = 0;
      this.scheduleStart(guide.steps);
    });
  }

  private clearPendingStart(): void {
    if (this.startTimer !== undefined) {
      clearTimeout(this.startTimer);
      this.startTimer = undefined;
    }
  }

  private scheduleStart(steps: GuideStep[]): void {
    this.clearPendingStart();

    this.startTimer = setTimeout(() => {
      this.startTimer = undefined;

      if (!this.guideService.isTourActive()) {
        return;
      }

      const orderedSteps = [...steps].sort(
        (a, b) => a.order - b.order
      );

      const availableSteps = orderedSteps.filter(
        step => !!this.findTourElement(step.target)
      );

      if (
        availableSteps.length === 0 &&
        this.attempts < this.maxAttempts
      ) {
        this.attempts++;
        this.scheduleStart(steps);
        return;
      }

      if (!availableSteps.length) {
        console.warn(
          'Guided Tour: No matching elements found.'
        );
        this.guideService.stopTour();
        return;
      }

      this.startDriver(availableSteps);
    }, this.retryDelay);
  }

  private findTourElement(
    target: string
  ): Element | undefined {
    if (!target) return undefined;

    try {
      // أولاً: استخدام Selector القادم من منار
      const directElement = document.querySelector(target);

      if (directElement) {
        return directElement;
      }

      // Dashboard: الحفاظ على التحديد الأصلي
      if (target === '[data-guide="dashboard-summary"]') {
        return (
          document.querySelector(
            '.dashboard-viewport-container > div[style*="grid-template-columns: repeat(4, 1fr)"]'
          ) ?? undefined
        );
      }

      if (target === '[data-guide="dashboard-notifications"]') {
        const heading = Array.from(
          document.querySelectorAll(
            '.dashboard-viewport-container h3'
          )
        ).find(el =>
          el.textContent?.includes('التنبيهات الأخيرة')
        );

        return (
          heading?.parentElement?.parentElement?.parentElement ??
          undefined
        );
      }

      if (target === '[data-guide="dashboard-menu"]') {
        return (
          document.querySelector(
            'app-shell aside.sidebar nav .nav-item'
          ) ?? undefined
        );
      }

      // بدائل الصفحات الأخرى
      const fallbackSelectors: Record<string, string[]> = {

        // Profile
        '[data-guide="profile-info"]': [
          '.nfd-card:has(h3)',
          '.nfd-card:has(input[readonly])'
        ],

        '[data-guide="profile-edit"]': [
          '.nfd-card button.nfd-btn',
          'button.nfd-btn'
        ],

        // Training Program
        '[data-guide="training-program"]': [
          '.program-container .program-header',
          '.program-container .modules-container'
        ],

        '[data-guide="program-progress"]': [
          '.program-container .progress-wrapper',
          '.program-container .progress-circle'
        ],

        // Tasks
        '[data-guide="tasks-list"]': [
          '[dir="rtl"] .nfd-card',
          '.nfd-card'
        ],

        '[data-guide="tasks-filter"]': [
          '[dir="rtl"] button.nfd-btn',
          'button.nfd-btn'
        ],

        // Attendance
        '[data-guide="attendance-records"]': [
          '.attendance-page .attendance-record-card',
          '.attendance-page .attendance-list'
        ],

        '[data-guide="attendance-summary"]': [
          '.attendance-page .top-dashboard',
          '.attendance-page .stats-grid'
        ],

        // Notifications
        '[data-guide="notifications-list"]': [
          '.page .notification-list',
          '.page .filters-row'
        ],

        // Support
        '[data-guide="support-options"]': [
          '.support-page .support-card',
          '.support-page .receiver-form-group'
        ],

        '[data-guide="support-messages"]': [
          '.support-page .conversation-list',
          '.support-page .conversation-detail'
        ],

        // Achievements
        '[data-guide="achievements-list"]': [
          '.achievements-page .badges-card',
          '.achievements-page .badges-grid'
        ],

        '[data-guide="achievements-certificates"]': [
          '.achievements-page .certificate-card',
          '.achievements-page .certificate-preview'
        ],
      };

      const selectors = fallbackSelectors[target] ?? [];

      for (const selector of selectors) {
        const element = document.querySelector(selector);

        if (element) {
          return element;
        }
      }

      console.warn(
        'Guided Tour: Element not found:',
        target
      );

      return undefined;
    } catch {
      console.warn(
        'Guided Tour: Invalid selector:',
        target
      );

      return undefined;
    }
  }

  private startDriver(steps: GuideStep[]): void {
    console.log('Guided Tour STARTED', steps);

    this.stopDriver();

    const validSteps: DriveStep[] = [];

    const orderedSteps = [...steps].sort(
      (a, b) => a.order - b.order
    );

    for (const step of orderedSteps) {
      const element = this.findTourElement(step.target);

      // لا نعرض خطوة بدون عنصر
      if (!element) {
        continue;
      }

      const driveStep: DriveStep = {
        element,
        popover: {
          title: step.title,
          description: step.description,

          ...(step.target === '[data-guide="dashboard-menu"]'
            ? {
                side: 'left' as const,
                align: 'start' as const,
              }
            : {}),
        },
      };

      validSteps.push(driveStep);
    }

    if (!validSteps.length) {
      console.warn(
        'Guided Tour: No matching steps available.'
      );
      this.guideService.stopTour();
      return;
    }

    const newTour = driver({
      showProgress: true,
      showButtons: ['previous', 'next', 'close'],

      nextBtnText: 'التالي',
      prevBtnText: 'السابق',
      doneBtnText: 'إنهاء',
      progressText: '{{current}} من {{total}}',

      allowClose: true,

      popoverClass: 'nafadh-guided-popover',

      onPopoverRender: (popover, { driver: tourDriver }) => {
        const skipButton = document.createElement('button');

        skipButton.type = 'button';
        skipButton.textContent = 'تخطي';
        skipButton.className = 'nafadh-tour-skip-btn';

        skipButton.addEventListener('click', () => {
          tourDriver.destroy();
        });

        popover.footerButtons.appendChild(skipButton);
      },

      onDestroyed: () => {
        if (
          !this.isStoppingProgrammatically &&
          this.tour === newTour
        ) {
          this.tour = undefined;
          this.guideService.stopTour();
        }
      },

      steps: validSteps,
    });

    this.tour = newTour;
    newTour.drive();
  }

  private stopDriver(): void {
    const activeTour = this.tour;

    if (!activeTour) return;

    this.tour = undefined;
    this.isStoppingProgrammatically = true;

    try {
      activeTour.destroy();
    } finally {
      this.isStoppingProgrammatically = false;
    }
  }

  ngOnDestroy(): void {
    this.clearPendingStart();
    this.stopDriver();
  }
}
