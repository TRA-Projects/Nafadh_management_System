
import {
  Component,
  OnDestroy,
  effect,
  inject
} from '@angular/core';

import { driver, Driver } from 'driver.js';


import { GuideService } from '../../../services/guide.service';
import { GuideStep } from '../../models/guide.models';

@Component({
  selector: 'app-guided-tour',
  standalone: true,
  templateUrl: './guided-tour.html',
  styleUrl: './guided-tour.scss',
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
    this.stopDriver();

    const validSteps = [...steps]
      .sort((a, b) => a.order - b.order)
      .filter(step => {
        if (!step.target) return false;

        try {
          return !!document.querySelector(step.target);
        } catch {
          console.warn(
            'Guided Tour: Invalid selector:',
            step.target
          );
          return false;
        }
      });

    if (!validSteps.length) {
      console.warn('Guided Tour: No valid steps found.');
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

      onDestroyed: () => {
        if (
          !this.isStoppingProgrammatically &&
          this.tour === newTour
        ) {
          this.tour = undefined;
          this.guideService.stopTour();
        }
      },

      steps: validSteps.map(step => ({
        element: step.target,
        popover: {
          title: step.title,
          description: step.description,
        },
      })),
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
