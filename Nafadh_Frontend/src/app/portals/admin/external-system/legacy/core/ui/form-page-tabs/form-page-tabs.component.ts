/// <reference types="@angular/localize" />

import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';

import { resolvePublicUrl } from '../../public-url';

export interface FormPageTabItem {
  id: string;
  label: string;
  disabled?: boolean;
  /** Optional project asset path (`/images/...`). Decorative; omitted tabs stay text-only. */
  iconSrc?: string;
}

const MOBILE_WINDOW = 3;

/**
 * Shared form/wizard tabs: desktop `irf-tabs` strip; mobile shows 3 tabs with side arrows
 * and recenters the active tab in the middle when possible.
 */
@Component({
  selector: 'app-form-page-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-page-tabs.component.html',
  styleUrl: './form-page-tabs.component.scss',
})
export class FormPageTabsComponent {
  readonly tabs = input.required<FormPageTabItem[]>();
  readonly activeId = input.required<string>();
  /** Tighter white strip for catalog-style selectors that sit as the only content in a card. */
  readonly compact = input(false);
  readonly tabSelect = output<string>();

  readonly prevTabAria = $localize`:@@jobseeker.common.prev:Prev`;
  readonly nextTabAria = $localize`:@@jobseeker.common.next:Next`;

  /** Manual window offset override while arrows scroll before selection settles. */
  private readonly windowStartOverride = signal<number | null>(null);

  readonly activeIndex = computed(() => {
    const id = this.activeId();
    const idx = this.tabs().findIndex((t) => t.id === id);
    return idx >= 0 ? idx : 0;
  });

  readonly windowStart = computed(() => {
    const n = this.tabs().length;
    if (n <= MOBILE_WINDOW) {
      return 0;
    }
    const override = this.windowStartOverride();
    if (override !== null) {
      return Math.min(Math.max(0, override), n - MOBILE_WINDOW);
    }
    const active = this.activeIndex();
    return Math.min(Math.max(0, active - 1), n - MOBILE_WINDOW);
  });

  readonly visibleTabs = computed(() => {
    const all = this.tabs();
    if (all.length <= MOBILE_WINDOW) {
      return all;
    }
    const start = this.windowStart();
    return all.slice(start, start + MOBILE_WINDOW);
  });

  readonly canStepPrev = computed(() => this.activeIndex() > 0);
  readonly canStepNext = computed(() => this.activeIndex() < this.tabs().length - 1);
  readonly showMobileArrows = computed(() => this.tabs().length > MOBILE_WINDOW);

  isCenterVisible(tabId: string): boolean {
    const visible = this.visibleTabs();
    if (visible.length < MOBILE_WINDOW) {
      return tabId === this.activeId();
    }
    return visible[1]?.id === tabId;
  }

  /** CSS mask URL so the asset inherits the tab button's `currentColor` (active/muted). */
  iconMaskUrl(src: string): string {
    return `url("${resolvePublicUrl(src)}")`;
  }

  selectTab(tab: FormPageTabItem): void {
    if (tab.disabled) {
      this.tabSelect.emit(tab.id);
      return;
    }
    this.windowStartOverride.set(null);
    this.tabSelect.emit(tab.id);
  }

  step(delta: -1 | 1): void {
    const all = this.tabs();
    if (all.length === 0) {
      return;
    }
    let idx = this.activeIndex() + delta;
    while (idx >= 0 && idx < all.length && all[idx]?.disabled) {
      idx += delta;
    }
    if (idx < 0 || idx >= all.length) {
      return;
    }
    const tab = all[idx];
    if (!tab) {
      return;
    }
    this.windowStartOverride.set(null);
    this.tabSelect.emit(tab.id);
  }
}
