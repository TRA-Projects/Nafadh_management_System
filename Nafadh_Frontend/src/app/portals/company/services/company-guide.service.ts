import { Injectable, signal } from '@angular/core';
import { COMPANY_GUIDE_CONTENT } from '../user-manual/data/company-guide-content';
import { GuidePage } from '../user-manual/models/company-guide.models';

@Injectable({ providedIn: 'root' })
export class CompanyGuideService {
  readonly currentPageKey = signal<string | null>(null);
  readonly currentGuide = signal<GuidePage | null>(null);
  readonly isHelpOpen = signal(false);
  readonly isTourActive = signal(false);

  setPage(pageKey: string | null): void {
    this.currentPageKey.set(pageKey);
    this.currentGuide.set(pageKey ? (COMPANY_GUIDE_CONTENT[pageKey] ?? null) : null);
    this.closeHelp();
    this.stopTour();
  }

  openHelp(): void { this.isHelpOpen.set(true); }
  closeHelp(): void { this.isHelpOpen.set(false); }
  startTour(): void {
    if (this.currentGuide()?.steps.length) this.isTourActive.set(true);
  }
  stopTour(): void { this.isTourActive.set(false); }
}
