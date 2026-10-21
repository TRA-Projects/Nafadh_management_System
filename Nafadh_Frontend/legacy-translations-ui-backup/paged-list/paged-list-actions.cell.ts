import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';

import { AssetUrlPipe } from '../asset-url.pipe';
import type { PagedListActionItem, PagedListAgGridContext } from './paged-list.models';
import { RowActionsMenuComponent } from './row-actions-menu.component';

@Component({
  selector: 'app-paged-list-actions-cell',
  standalone: true,
  imports: [CommonModule, AssetUrlPipe, RowActionsMenuComponent],
  template: `
    <div class="paged-list-ag-actions-inner">
      @if (items.length > 0) {
        <app-row-actions-menu [open]="menuOpen" [ariaLabel]="ariaLabel" (toggle)="onToggle($event)">
          @for (item of items; track item.id) {
            <button
              type="button"
              class="paged-list-actions-menu__item"
              role="menuitem"
              [disabled]="!!item.disabled"
              (click)="onSelect(item, $event)"
            >
              <span class="paged-list-actions-menu__icon" aria-hidden="true">
                @if (item.iconSrc) {
                  <img [src]="item.iconSrc | assetUrl" alt="" class="h-4 w-4" />
                } @else if (item.iconKind === 'users') {
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                }
              </span>
              <span>{{ item.label }}</span>
            </button>
          }
        </app-row-actions-menu>
      } @else {
        <span class="text-white-dark">—</span>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
        overflow: visible;
        position: relative;
        z-index: 3;
        pointer-events: auto;
      }
      .paged-list-ag-actions-inner {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: center;
        overflow: visible;
        pointer-events: auto;
      }
    `,
  ],
})
export class PagedListActionsCellRenderer implements ICellRendererAngularComp {
  private readonly cdr = inject(ChangeDetectorRef);
  private params!: ICellRendererParams;
  private rowId: string | number = '';
  private unregisterSync: (() => void) | null = null;
  items: PagedListActionItem[] = [];
  menuOpen = false;
  ariaLabel = '';

  agInit(params: ICellRendererParams): void {
    this.bind(params);
  }

  refresh(params: ICellRendererParams): boolean {
    this.bind(params);
    return true;
  }

  destroy(): void {
    this.unregisterSync?.();
    this.unregisterSync = null;
  }

  onToggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const ctx = (this.params.context ?? {}) as PagedListAgGridContext;
    ctx.toggleActionsMenu?.(this.rowId, event);
    const openId = typeof ctx.getOpenActionsRowId === 'function' ? ctx.getOpenActionsRowId() : null;
    this.menuOpen = openId != null && String(openId) === String(this.rowId);
    this.cdr.detectChanges();
    // Other rows sync via registerActionsMenuSync — never refreshCells.
  }

  onSelect(item: PagedListActionItem, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (item.disabled) return;
    item.onSelect();
  }

  private bind(params: ICellRendererParams): void {
    this.params = params;
    const data = params.data;
    const ctx = (params.context ?? {}) as PagedListAgGridContext;
    this.rowId = this.resolveRowId(params);
    this.items = typeof ctx.getActionItems === 'function' ? ctx.getActionItems(data) : [];
    const openId = typeof ctx.getOpenActionsRowId === 'function' ? ctx.getOpenActionsRowId() : null;
    this.menuOpen = openId != null && String(openId) === String(this.rowId);
    const aria = ctx['actionsMenuAria'];
    this.ariaLabel = typeof aria === 'string' && aria.trim() ? aria : '';

    this.unregisterSync?.();
    this.unregisterSync = null;
    if (typeof ctx.registerActionsMenuSync === 'function') {
      this.unregisterSync = ctx.registerActionsMenuSync((id) => {
        const next = id != null && String(id) === String(this.rowId);
        if (next === this.menuOpen) return;
        this.menuOpen = next;
        this.cdr.detectChanges();
      });
    }

    this.cdr.detectChanges();
  }

  private resolveRowId(params: ICellRendererParams): string | number {
    const data = params.data as { Id?: number; id?: string | number } | null;
    if (data?.Id != null) return data.Id;
    if (data?.id != null) return data.id;
    return params.node?.id ?? params.node?.rowIndex ?? 0;
  }
}
