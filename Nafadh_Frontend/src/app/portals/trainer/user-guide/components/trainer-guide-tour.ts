
import {
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal
} from '@angular/core';

import { TrainerGuideService } from '../services/trainer-guide.service';

@Component({
  selector: 'app-trainer-guide-tour',
  standalone: true,
  template: '',
})
export class TrainerGuideTour implements OnDestroy {

  readonly guideService = inject(TrainerGuideService);
  readonly currentStepIndex = signal(0);

  private readonly highlightedClass = 'trainer-guide-highlight';
  private highlightedElement: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const active = this.guideService.isTourActive();
      const guide = this.guideService.currentGuide();

      if (!active || !guide) {
        this.clearHighlight();
        this.currentStepIndex.set(0);
      }
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
      this.highlightCurrentStep();
    } else {
      this.finishTour();
    }
  }

  previousStep(): void {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update(index => index - 1);
      this.highlightCurrentStep();
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

  highlightCurrentStep(): void {
    this.clearHighlight();

    const step = this.currentStep;

    if (!step) {
      return;
    }

    const element = document.querySelector<HTMLElement>(
      step.target
    );

    if (!element) {
      return;
    }

    this.highlightedElement = element;
    element.classList.add(this.highlightedClass);

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  private clearHighlight(): void {
    if (this.highlightedElement) {
      this.highlightedElement.classList.remove(
        this.highlightedClass
      );
      this.highlightedElement = null;
    }
  }

  ngOnDestroy(): void {
    this.clearHighlight();
  }
}
