
import { Injectable, signal } from '@angular/core';
import { GuidePage } from '../user-manual/models/guide.models';
import { GUIDE_CONTENT } from '../user-manual/data/guide-content';

@Injectable({
  providedIn: 'root',
})
export class GuideService {
  readonly currentPageKey = signal('dashboard');
  readonly currentGuide = signal<GuidePage | null>(null);

  readonly isHelpOpen = signal(false);
  readonly isTourActive = signal(false);
  
setPage(pageKey: string): void {
  this.currentPageKey.set(pageKey);
  this.currentGuide.set(GUIDE_CONTENT[pageKey] ?? null);
}

  setGuide(guide: GuidePage | null): void {
    this.currentGuide.set(guide);
  }

  openHelp(): void {
    this.isHelpOpen.set(true);
  }

  closeHelp(): void {
    this.isHelpOpen.set(false);
  }

  startTour(): void {
    this.isTourActive.set(true);
  }

  stopTour(): void {
    this.isTourActive.set(false);
  }
}
