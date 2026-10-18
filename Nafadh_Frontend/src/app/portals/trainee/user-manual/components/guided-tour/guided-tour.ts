
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

  constructor() {
    effect(() => {
      const isActive = this.guideService.isTourActive();
      const guide = this.guideService.currentGuide();

      if (!isActive) {
        this.stopDriver();
        return;
      }

      this.startDriver(guide?.steps ?? []);
    });
  }

  private startDriver(steps: GuideStep[]): void {
    console.log('Guided Tour STARTED', steps);

    this.stopDriver();

    const validSteps: DriveStep[] = [...steps]
      .sort((a, b) => a.order - b.order)
      .map(step => {
        let element: Element | undefined;

        if (step.target) {
          try {
            element =
              document.querySelector(step.target) ?? undefined;
          } catch {
            console.warn(
              'Guided Tour: Invalid selector:',
              step.target
            );
          }
        }

        // إذا العنصر غير موجود، تظهر نافذة الشرح بدون تحديد عنصر
        return {
          ...(element ? { element } : {}),
          popover: {
            title: step.title,
            description: step.description,
          },
        };
      });

    if (!validSteps.length) {
      console.warn('Guided Tour: No steps available.');
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

      // إضافة زر تخطي مستقل
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
    this.tour.drive();
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
    this.stopDriver();
  }
}
