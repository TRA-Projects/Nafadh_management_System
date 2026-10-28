
import { Injectable, signal, inject } from '@angular/core';

import {
  TrainerGuidePage,
  TrainerGuideProgress
} from '../models/trainer-guide.models';

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

  // حالة تقدم المدرب
  readonly currentProgress = signal<TrainerGuideProgress | null>(null);
  readonly isProgressLoading = signal(false);
  readonly progressError = signal<string | null>(null);

  private progressRequestId = 0;

  setPage(pageKey: string): void {
    this.currentPageKey.set(pageKey);
  }

  setGuide(guide: TrainerGuidePage | null): void {
    this.currentGuide.set(guide);

    if (guide) {
      this.currentPageKey.set(guide.pageKey);
    }

    this.loadProgress();
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

    this.progressError.set(null);
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

  loadProgress(): void {
    const guideKey = this.currentGuide()?.pageKey;
    const requestId = ++this.progressRequestId;

    this.currentProgress.set(null);
    this.progressError.set(null);

    if (!guideKey) {
      this.isProgressLoading.set(false);
      return;
    }

    this.isProgressLoading.set(true);

    this.progressService.getByGuide(guideKey).subscribe({
      next: (progress) => {
        if (requestId !== this.progressRequestId) return;

        this.currentProgress.set(progress);
        this.isProgressLoading.set(false);
      },
      error: (error) => {
        if (requestId !== this.progressRequestId) return;

        // عدم وجود تقدم سابق ليس خطأ في الدليل
        if (error.status === 404) {
          this.currentProgress.set(null);
          this.isProgressLoading.set(false);
          return;
        }

        this.progressError.set(
          'تعذر تحميل حالة الدليل الإرشادي.'
        );

        this.isProgressLoading.set(false);
        console.error('Failed to load trainer guide progress', error);
      }
    });
  }

  private saveTourProgress(
    status: 'Completed' | 'Skipped'
  ): void {
    const guideKey = this.currentGuide()?.pageKey;

    if (!guideKey) {
      return;
    }

    this.progressError.set(null);

    this.progressService
      .saveProgress(guideKey, status)
      .subscribe({
        next: () => {
          // تحديث الحالة بعد الحفظ الناجح
          if (this.currentGuide()?.pageKey === guideKey) {
            this.loadProgress();
          }
        },
        error: (error) => {
          if (this.currentGuide()?.pageKey === guideKey) {
            this.progressError.set(
              'تعذر حفظ تقدم الدليل الإرشادي. يرجى المحاولة مرة أخرى.'
            );
          }

          console.error(
            'Failed to save trainer guide progress',
            error
          );
        }
      });

    this.stopTour();
  }
}
