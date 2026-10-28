
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

  readonly highlightRect = signal<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  private readonly highlightedClass = 'trainer-guide-highlight';
  private highlightedElement: HTMLElement | null = null;
  private animationFrameId: number | null = null;
  private readonly highlightPadding = 8;

  private readonly updatePosition = () => {
    this.schedulePositionUpdate();
  };

  constructor() {
    effect(() => {
      const active = this.guideService.isTourActive();
      const guide = this.guideService.currentGuide();

      if (!active || !guide) {
        this.clearHighlight();
        this.currentStepIndex.set(0);
        this.removePositionListeners();
        return;
      }

      this.currentStepIndex.set(0);
      this.addPositionListeners();
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
    this.removePositionListeners();
    this.guideService.completeTour();
  }

  skipTour(): void {
    this.clearHighlight();
    this.removePositionListeners();
    this.guideService.skipTour();
  }

  private addPositionListeners(): void {
    window.addEventListener('resize', this.updatePosition);
    window.addEventListener('scroll', this.updatePosition, true);
  }

  private removePositionListeners(): void {
    window.removeEventListener('resize', this.updatePosition);
    window.removeEventListener('scroll', this.updatePosition, true);
  }

  private schedulePositionUpdate(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.updateHighlightPosition();
    });
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

    // إذا العنصر غير موجود، لا تتعطل الجولة
    if (!element) {
      this.highlightRect.set(null);
      return;
    }

    this.highlightedElement = element;
    element.classList.add(this.highlightedClass);

    element.scrollIntoView({
      behavior: 'instant',
      block: 'center',
    });

    this.updateHighlightPosition();
  }

  private updateHighlightPosition(): void {
    if (!this.guideService.isTourActive()) return;

    const element = this.highlightedElement;
    if (!element || !element.isConnected) {
      this.highlightRect.set(null);
      return;
    }

    const rect = element.getBoundingClientRect();

    this.highlightRect.set({
      top: Math.max(0, rect.top - this.highlightPadding),
      left: Math.max(0, rect.left - this.highlightPadding),
      width: rect.width + this.highlightPadding * 2,
      height: rect.height + this.highlightPadding * 2,
    });
  }

  private clearHighlight(): void {
    if (this.highlightedElement) {
      this.highlightedElement.classList.remove(
        this.highlightedClass
      );
      this.highlightedElement = null;
    }

    this.highlightRect.set(null);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.removePositionListeners();
    this.clearHighlight();
  }
}
