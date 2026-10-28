import { Component, OnDestroy, ViewEncapsulation, effect, inject } from '@angular/core';
import { driver, Driver, DriveStep } from 'driver.js';
import { CompanyGuideService } from '../../../services/company-guide.service';
import { GuideStep } from '../../models/company-guide.models';

/** Keeps guide targeting inside Company; no dependency on TraineeGuideService. */
@Component({
  selector: 'app-company-guided-tour',
  standalone: true,
  template: '',
  styleUrl: './company-guided-tour.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CompanyGuidedTour implements OnDestroy {
  private readonly guideService = inject(CompanyGuideService);
  private tour?: Driver;
  private startTimer?: ReturnType<typeof setTimeout>;
  private retryCount = 0;
  private stopping = false;
  private readonly maxRetries = 10;

  constructor() {
    effect(() => {
      const active = this.guideService.isTourActive();
      const guide = this.guideService.currentGuide();
      this.clearTimer();
      this.stopDriver();
      if (!active || !guide?.steps.length) return;
      this.retryCount = 0;
      this.schedule(guide.steps);
    });
  }

  private clearTimer(): void {
    if (this.startTimer !== undefined) clearTimeout(this.startTimer);
    this.startTimer = undefined;
  }

  private schedule(steps: GuideStep[]): void {
    this.clearTimer();
    this.startTimer = setTimeout(() => {
      this.startTimer = undefined;
      if (!this.guideService.isTourActive()) return;
      const available = [...steps]
        .sort((a, b) => a.order - b.order)
        .filter(step => this.findElement(step.target));
      // The profile renders most anchors only after the company request finishes.
      const pageLoading = steps.some(step =>
        this.findElement(step.target)?.getAttribute('data-guide-loading') === 'true');
      const retryLimit = pageLoading ? 75 : this.maxRetries;
      if ((pageLoading || available.length < 2) && this.retryCount++ < retryLimit) {
        this.schedule(steps);
        return;
      }
      if (pageLoading || !available.length) {
        this.guideService.stopTour();
        return;
      }
      this.startDriver(available);
    }, 300);
  }

  private findElement(selector: string): Element | null {
    try { return document.querySelector(selector); }
    catch { return null; }
  }

  private startDriver(steps: GuideStep[]): void {
    const valid: DriveStep[] = steps.flatMap(step => {
      const element = this.findElement(step.target);
      return element ? [{ element, popover: { title: step.title, description: step.description } }] : [];
    });
    if (!valid.length) {
      this.guideService.stopTour();
      return;
    }

    const nextTour = driver({
      steps: valid,
      showProgress: true,
      showButtons: ['previous', 'next', 'close'],
      nextBtnText: 'التالي',
      prevBtnText: 'السابق',
      doneBtnText: 'إنهاء',
      progressText: '{{current}} من {{total}}',
      allowClose: true,
      popoverClass: 'nafadh-guided-popover',
      onPopoverRender: (popover, { driver: instance }) => {
        const skip = document.createElement('button');
        skip.type = 'button';
        skip.textContent = 'تخطي';
        skip.className = 'nafadh-tour-skip-btn';
        skip.addEventListener('click', () => instance.destroy());
        popover.footerButtons.appendChild(skip);
      },
      onDestroyed: () => {
        if (!this.stopping && this.tour === nextTour) {
          this.tour = undefined;
          this.guideService.stopTour();
        }
      },
    });
    this.tour = nextTour;
    nextTour.drive();
  }

  private stopDriver(): void {
    if (!this.tour) return;
    const current = this.tour;
    this.tour = undefined;
    this.stopping = true;
    try { current.destroy(); }
    finally { this.stopping = false; }
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.stopDriver();
  }
}
