/// <reference types="@angular/localize" />

import { NgStyle } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/** Shared centered ⋮ row-actions trigger + dropdown panel. */
@Component({
  selector: 'app-row-actions-menu',
  standalone: true,
  imports: [NgStyle],
  templateUrl: './row-actions-menu.component.html',
  styleUrl: './row-actions-menu.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class RowActionsMenuComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly open = input(false);
  readonly ariaLabel = input(
    $localize`:@@jobseeker.jobSeekersList.rowActionsMenu:Row actions`
  );
  /** Emitted with the click event when the ⋮ trigger is pressed. */
  readonly toggle = output<Event>();

  /** Fixed-viewport coords so the menu is not clipped by AG Grid / overflow parents. */
  readonly menuStyle = signal<Record<string, string>>({});

  constructor() {
    effect((onCleanup) => {
      if (!this.open()) {
        this.menuStyle.set({});
        return;
      }
      queueMicrotask(() => this.reposition());
      const onScrollOrResize = (): void => this.reposition();
      window.addEventListener('resize', onScrollOrResize);
      window.addEventListener('scroll', onScrollOrResize, true);
      onCleanup(() => {
        window.removeEventListener('resize', onScrollOrResize);
        window.removeEventListener('scroll', onScrollOrResize, true);
      });
    });
  }

  onTriggerClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    this.toggle.emit(event);
  }

  private reposition(): void {
    const trigger = this.host.nativeElement.querySelector(
      '.paged-list-actions-trigger'
    ) as HTMLElement | null;
    // `offsetParent` is null when an ancestor is `display:none` (e.g. the hidden card/table
    // twin at the current breakpoint) — skip positioning a trigger that isn't actually on
    // screen so only the currently visible layout instance ever computes real coordinates.
    if (!trigger || trigger.offsetParent === null) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 192;
    const gap = 4;
    const rtl = getComputedStyle(document.documentElement).direction === 'rtl';

    let top = rect.bottom + gap;
    const estimatedHeight = 220;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - gap - estimatedHeight);
    }

    const style: Record<string, string> = {
      position: 'fixed',
      top: `${Math.round(top)}px`,
      'z-index': '1100',
      'min-width': `${menuWidth}px`,
      'inset-inline-end': 'auto',
    };

    if (rtl) {
      style['left'] = `${Math.round(Math.max(8, rect.left))}px`;
      style['right'] = 'auto';
    } else {
      style['right'] = `${Math.round(Math.max(8, window.innerWidth - rect.right))}px`;
      style['left'] = 'auto';
    }

    this.menuStyle.set(style);
  }
}
