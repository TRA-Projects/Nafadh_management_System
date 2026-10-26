import { Component, OnDestroy, computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { CompanyGuideService } from '../../../services/company-guide.service';
import { COMPANY_GUIDE_CONTENT } from '../../data/company-guide-content';
import { CompanyHelpButtonComponent } from '../company-help-button/company-help-button.component';
import { CompanyHelpPanelComponent } from '../company-help-panel/company-help-panel.component';
import { HelpPanelData } from '../../models/company-help-panel.models';
import { CompanyGuidedTour } from '../company-guided-tour/company-guided-tour';

@Component({
  selector: 'app-company-manual-shell',
  standalone: true,
  imports: [CompanyHelpButtonComponent, CompanyHelpPanelComponent, CompanyGuidedTour],
  template: `
    @if (helpPanelData()) {
      <section class="company-user-manual" aria-label="دليل استخدام بوابة الشركة">
        <app-company-help-button
          [isOpen]="guideService.isHelpOpen()"
          (toggle)="toggleHelp()"
        />
        <app-company-help-panel
          [isOpen]="guideService.isHelpOpen()"
          [pageKey]="guideService.currentGuide()?.title ?? ''"
          [data]="helpPanelData()"
          (close)="guideService.closeHelp()"
          (startTour)="startTour()"
        />
        <app-company-guided-tour />
      </section>
    }
  `,
})
export class CompanyManualShell implements OnDestroy {
  readonly guideService = inject(CompanyGuideService);
  private readonly router = inject(Router);
  private readonly routeSubscription: Subscription;

  readonly helpPanelData = computed<HelpPanelData | null>(() => {
    const key = this.guideService.currentPageKey();
    const guide = key ? COMPANY_GUIDE_CONTENT[key] : undefined;
    if (!guide) return null;
    return {
      pageTitle: guide.title,
      pageDescription: guide.description,
      sections: [...guide.steps]
        .sort((a, b) => a.order - b.order)
        .map((step, index) => ({
          id: `company-${key}-${index}`,
          title: step.title,
          description: step.description,
          icon: 'clip',
        })),
      faqs: guide.faqs.map((faq, index) => ({
        id: `company-${key}-faq-${index}`,
        question: faq.question,
        answer: faq.answer,
      })),
    };
  });

  constructor() {
    this.updateForUrl(this.router.url);
    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateForUrl(event.urlAfterRedirects));
  }

  private updateForUrl(url: string): void {
    const parts = url.split(/[?#]/)[0].split('/').filter(Boolean);
    if (parts[0] !== 'company') {
      this.guideService.setPage(null);
      return;
    }
    const section = parts[1] || 'dashboard';
    let key: string | null = null;
    if (section === 'dashboard' && parts.length === 2) key = 'dashboard';
    else if (section === 'specialties' && parts.length === 2) key = 'programs';
    else if (section === 'specialties' && parts.length === 3) key = 'program-details';
    else if (section === 'tasks' && parts.length === 2) key = 'tasks';
    else if (section === 'tasks' && parts.length === 3) key = 'workspace';
    this.guideService.setPage(key);
  }

  toggleHelp(): void {
    if (this.guideService.isHelpOpen()) this.guideService.closeHelp();
    else this.guideService.openHelp();
  }

  startTour(): void {
    this.guideService.closeHelp();
    this.guideService.startTour();
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
    this.guideService.stopTour();
  }
}
