
import { Injectable, signal, inject } from '@angular/core';

import { TrainerGuidePage } from '../models/trainer-guide.models';
import { TrainerGuideProgressService } from './trainer-guide-progress.service';

@Injectable({
  providedIn: 'root'
})
export class TrainerGuideService {

  private readonly progressService =
    inject(TrainerGuideProgressService);

  readonly currentPageKey = signal('dashboard');
  readonly currentGuide = signal<TrainerGuidePage | null>(null);

  readonly isHelpOpen = signal(false);
  readonly isTourActive = signal(false);

  setPage(pageKey: string): void {
    this.currentPageKey.set(pageKey);
  }

  setGuide(guide: TrainerGuidePage | null): void {
    this.currentGuide.set(guide);

    if (guide) {
      this.currentPageKey.set(guide.pageKey);
    }
  }

  openHelp(): void {
    this.isHelpOpen.set(true);
  }

  closeHelp(): void {
    this.isHelpOpen.set(false);
  }

  startTour(): void {
    if (!this.currentGuide()?.steps.length) {
      return;
    }

    this.isTourActive.set(true);
  }

  stopTour(): void {
    this.isTourActive.set(false);
  }

  completeTour(): void {
    this.saveTourProgress('Completed');
  }

  skipTour(): void {
    this.saveTourProgress('Skipped');
  }

  private saveTourProgress(
    status: 'Completed' | 'Skipped'
  ): void {
    const guideKey = this.currentGuide()?.pageKey;

    if (!guideKey) {
      return;
    }

    this.progressService
      .saveProgress(guideKey, status)
      .subscribe({
        next: () => {
          console.log(
            `Trainer guide ${guideKey}: ${status}`
          );
        },
        error: (error) => {
          console.error(
            'Failed to save trainer guide progress',
            error
          );
        }
      });

    this.stopTour();
  }
}
