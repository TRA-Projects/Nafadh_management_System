/// <reference types="@angular/localize" />

import { CommonModule, NgStyle } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

let tableColumnFilterIdSequence = 0;
const openTableColumnFilters = new Set<TableColumnFilterComponent>();

function notifyTableColumnFilterOpened(instance: TableColumnFilterComponent): void {
  for (const other of [...openTableColumnFilters]) {
    if (other !== instance) {
      other.close();
    }
  }
  openTableColumnFilters.add(instance);
}

function notifyTableColumnFilterClosed(instance: TableColumnFilterComponent): void {
  openTableColumnFilters.delete(instance);
}

export type TableColumnFilterType = 'text' | 'select';

export interface TableColumnFilterOption {
  value: string;
  label: string;
}

/**
 * Generic table-header filter trigger + popover.
 * Presentational only: no HTTP, domain catalogs, NgRx, or URL logic.
 */
@Component({
  selector: 'app-table-column-filter',
  standalone: true,
  imports: [CommonModule, NgStyle],
  templateUrl: './table-column-filter.component.html',
  styleUrl: './table-column-filter.component.scss',
  host: {
    class: 'table-column-filter',
    '[class.table-column-filter--active]': 'active()',
    '[class.table-column-filter--open]': 'open()',
  },
})
export class TableColumnFilterComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly panelId = `table-column-filter-panel-${tableColumnFilterIdSequence++}`;

  readonly type = input<TableColumnFilterType>('text');
  readonly value = input('');
  readonly active = input(false);
  readonly options = input<readonly TableColumnFilterOption[]>([]);
  readonly columnLabel = input('');
  readonly placeholder = input('');

  readonly apply = output<string>();
  readonly clear = output<void>();

  readonly open = signal(false);
  readonly draft = signal('');
  readonly panelStyle = signal<Record<string, string>>({});

  readonly triggerButton = viewChild<ElementRef<HTMLButtonElement>>('triggerButton');
  readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  readonly textInput = viewChild<ElementRef<HTMLInputElement>>('textInput');

  readonly filterWord = computed(() => $localize`:@@jobseeker.tableColumnFilter.filter:Filter`);
  readonly applyLabel = computed(() => $localize`:@@jobseeker.tableColumnFilter.apply:Apply`);
  readonly clearLabel = computed(() => $localize`:@@jobseeker.tableColumnFilter.clear:Clear`);
  readonly searchLabel = computed(() => $localize`:@@jobseeker.tableColumnFilter.search:Search`);

  readonly filterAriaLabel = computed(() => {
    const column = this.columnLabel().trim();
    const filter = this.filterWord();
    return column ? `${filter}: ${column}` : filter;
  });

  readonly triggerTitle = computed(() => {
    const applied = this.value().trim();
    if (this.active() && applied) {
      return applied;
    }
    return this.filterAriaLabel();
  });

  constructor() {
    this.destroyRef.onDestroy(() => notifyTableColumnFilterClosed(this));
    effect((onCleanup) => {
      if (!this.open()) {
        this.panelStyle.set({});
        return;
      }
      queueMicrotask(() => {
        this.reposition();
        this.focusPanelControl();
      });
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
    if (this.open()) {
      this.close();
      return;
    }
    this.syncDraftFromApplied();
    this.open.set(true);
    notifyTableColumnFilterOpened(this);
  }

  onTextInput(value: string): void {
    this.draft.set(value);
  }

  onTextKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.applyText();
    }
  }

  applyText(): void {
    const next = this.draft().trim();
    if (!next) {
      this.clear.emit();
    } else {
      this.apply.emit(next);
    }
    this.close();
  }

  onSelectChange(value: string): void {
    this.draft.set(value);
    if (!value) {
      this.clear.emit();
    } else {
      this.apply.emit(value);
    }
    this.close();
  }

  clearFilter(event?: Event): void {
    event?.stopPropagation();
    this.draft.set('');
    this.clear.emit();
    this.close();
  }

  close(): void {
    if (this.open()) {
      this.open.set(false);
      notifyTableColumnFilterClosed(this);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  private syncDraftFromApplied(): void {
    this.draft.set(this.value() ?? '');
  }

  /** Native `<select [value]>` is applied before `<option>`s exist; rewrite after render. */
  private writeDraftToNativeControl(): void {
    const next = this.draft();
    if (this.type() === 'text') {
      const input = this.textInput()?.nativeElement;
      if (input) input.value = next;
      return;
    }
    const select = this.panel()?.nativeElement.querySelector('select') as HTMLSelectElement | null;
    if (select) select.value = next;
  }

  private focusPanelControl(): void {
    this.writeDraftToNativeControl();
    if (this.type() === 'text') {
      this.textInput()?.nativeElement.focus();
      this.textInput()?.nativeElement.select();
      return;
    }
    const select = this.panel()?.nativeElement.querySelector('select') as HTMLSelectElement | null;
    select?.focus();
  }

  private reposition(): void {
    const trigger = this.triggerButton()?.nativeElement;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const pad = 12;
    const preferredWidth = 268;
    const width = Math.min(preferredWidth, window.innerWidth - pad * 2);
    const height = this.panel()?.nativeElement.offsetHeight || 160;
    const rtl = getComputedStyle(document.documentElement).direction === 'rtl';

    let top = rect.bottom + gap;
    if (top + height > window.innerHeight - pad && rect.top > height + gap) {
      top = rect.top - gap - height;
    }
    top = Math.max(pad, Math.min(top, window.innerHeight - height - pad));

    // Inline-start of the panel tracks the trigger so the popover sits under the icon,
    // not end-aligned (which shifted a 268px panel toward unrelated columns).
    let left = rtl ? rect.right - width : rect.left;
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));

    this.panelStyle.set({
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${Math.round(width)}px`,
      'z-index': '80',
    });
  }
}
