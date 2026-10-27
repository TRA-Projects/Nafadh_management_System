
import {
  Component,
  OnDestroy,
  effect,
  inject,
  signal,
} from '@angular/core';

import { TrainerGuideService } from '../services/trainer-guide.service';

@Component({
  selector: 'app-trainer-guide-tour',
  standalone: true,
  templateUrl: './trainer-guide-tour.html',
  styleUrl: './trainer-guide-tour.scss',
})
export class TrainerGuideTour implements OnDestroy {
  readonly guideService = inject(TrainerGuideService);
  readonly currentStepIndex = signal(0);

  // موقع العنصر المستهدف داخل الشاشة
  readonly highlightRect = signal<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  private readonly highlightedClass = 'trainer-guide-highlight';
  private highlightedElement: HTMLElement | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    effect(() => {
      const active = this.guideService.isTourActive();
      const guide = this.guideService.currentGuide();

      if (!active || !guide) {
        this.clearHighlight();
        this.currentStepIndex.set(0);
        return;
      }

      this.currentStepIndex.set(0);
      this.scheduleHighlight();
    });
  }

  get steps() {
    return this.guideService.currentGuide()?.steps ?? [];
  }

  get currentStep() {
    return this.steps[this.currentStepIndex()] ?? null;
  }

  nextStep(): void {
    if (this.currentStepIndex() < this.steps.length - 1) {
      this.currentStepIndex.update(index => index + 1);
      this.scheduleHighlight();
    } else {
      this.finishTour();
    }
  }

  previousStep(): void {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update(index => index - 1);
      this.scheduleHighlight();
    }
  }

  finishTour(): void {
    this.clearHighlight();
    this.guideService.completeTour();
  }

  skipTour(): void {
    this.clearHighlight();
    this.guideService.skipTour();
  }

  private scheduleHighlight(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;

      if (this.guideService.isTourActive()) {
        this.highlightCurrentStep();
      }
    });
  }

  highlightCurrentStep(): void {
    this.clearHighlight();

    const step = this.currentStep;
    if (!step) return;

    const element = document.querySelector<HTMLElement>(step.target);
    if (!element) return;

    this.highlightedElement = element;
    element.classList.add(this.highlightedClass);

    element.scrollIntoView({
      behavior: 'instant',
      block: 'center',
    });

    const rect = element.getBoundingClientRect();
    const padding = 8;

    this.highlightRect.set({
      top: Math.max(0, rect.top - padding),
      left: Math.max(0, rect.left - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });
  }

  private clearHighlight(): void {
    if (this.highlightedElement) {
      this.highlightedElement.classList.remove(this.highlightedClass);
      this.highlightedElement = null;
    }

    this.highlightRect.set(null);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.clearHighlight();
  }
}
