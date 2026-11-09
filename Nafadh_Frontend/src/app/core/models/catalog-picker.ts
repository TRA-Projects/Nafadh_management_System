import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface CatalogChoice<K extends string = string> {
  value: K;
  label: string;
  labelEn?: string;
}

/** Text is only a search query. Only choosing a row emits its stable key. */
@Component({
  selector: 'app-catalog-picker',
  standalone: true,
  template: `
    <input type="search" role="combobox" autocomplete="off" [id]="inputId"
      [attr.aria-label]="caption" [placeholder]="caption" [disabled]="disabled"
      [attr.aria-expanded]="open" [attr.aria-controls]="listId"
      [attr.aria-activedescendant]="open && cursor >= 0 ? listId + '-' + cursor : null"
      [value]="open ? query : selectedLabel" (focus)="begin()" (click)="begin()"
      (input)="search($any($event.target).value)" (keydown)="onKey($event)" (blur)="close()" />
    @if (showArrow) {
      <svg class="arrow" viewBox="0 0 12 8" aria-hidden="true"><path d="m1 1 5 5 5-5" /></svg>
    }
    @if (open) {
      <ul role="listbox" [id]="listId" [attr.aria-label]="caption">
        @for (option of results; track option.value; let i = $index) {
          <li role="option" [id]="listId + '-' + i" [attr.aria-selected]="value === option.value"
            [class.highlight]="cursor === i" (mousedown)="$event.preventDefault()" (click)="choose(option)">
            {{ option.label }} @if (ambiguous(option)) { <small>({{ option.value }})</small> }
          </li>
        }
      </ul>
      @if (!results.length) { <span role="status">لا توجد نتائج مطابقة</span> }
    }
  `,
  host: { '[class.catalog-disabled]': 'disabled' },
  styles: [`
    /* The host keeps the original page's select classes, dimensions and states. */
    :host{display:inline-flex;align-items:center;position:relative;box-sizing:border-box;min-width:0;text-align:start}
    input{appearance:none;box-sizing:border-box;display:block;flex:1;width:100%;min-width:0;
      margin:0;padding:0;border:0;border-radius:0;outline:0;background:transparent;color:inherit;
      font:inherit;line-height:inherit;text-align:inherit;direction:inherit;box-shadow:none}
    input::-webkit-search-cancel-button,input::-webkit-search-decoration{appearance:none}
    .arrow{width:12px;height:8px;flex:none;margin-inline-start:8px;pointer-events:none;fill:none;stroke:currentColor;stroke-width:1.5}
    :host(.catalog-disabled){opacity:.6;cursor:not-allowed}
    input:disabled{cursor:not-allowed}
    ul{position:absolute;inset-inline-start:0;top:100%;z-index:1000;box-sizing:border-box;
      min-width:100%;width:max-content;max-width:min(32rem,90vw);max-height:14rem;overflow:auto;
      background:var(--surface,#fff);color:var(--text-primary,#182335);margin:4px 0 0;padding:4px;
      list-style:none;border:1px solid #cbd5e1;border-radius:inherit;text-align:start;
      box-shadow:0 4px 12px rgb(15 23 42 / 12%)}
    li{padding:8px 12px;cursor:pointer;white-space:normal}
    li:hover,li.highlight{background:#e5f0ff}
    [role=status]{position:absolute;inset-inline-start:0;top:100%;z-index:1000;background:#fff;
      color:#475569;padding:8px 12px;border:1px solid #cbd5e1;min-width:100%;box-sizing:border-box}
  `]
})
export class CatalogPicker<K extends string = string> {
  private static nextId = 0;
  readonly listId = 'catalog-choices-' + CatalogPicker.nextId++;
  @Input() inputId = this.listId + '-input';
  @Input() options: readonly CatalogChoice<K>[] = [];
  @Input() value: string | null = null;
  @Input() caption = 'ابحث واختر قيمة';
  @Input() fallbackLabel = '';
  @Input() disabled = false;
  @Input() showArrow = true;
  @Output() readonly valueChange = new EventEmitter<K>();
  open = false;
  query = '';
  cursor = -1;

  get selectedLabel(): string {
    const row = this.options.find(x => x.value === this.value);
    return row ? row.label + (this.ambiguous(row) ? ' (' + row.value + ')' : '') : this.fallbackLabel;
  }

  ambiguous(row: CatalogChoice<K>): boolean {
    return this.options.some(x => x.value !== row.value && x.label === row.label);
  }

  get results(): readonly CatalogChoice<K>[] {
    const term = this.query.trim().toLocaleLowerCase();
    return this.options.filter(x => [x.label, x.labelEn, x.value].some(
      text => text?.toLocaleLowerCase().includes(term)));
  }

  begin(): void { if (!this.open && !this.disabled) { this.search(''); this.open = true; } }
  close(): void { this.open = false; this.cursor = -1; }
  search(query: string): void { if (this.disabled) return; this.open = true; this.query = query; this.cursor = -1; }
  choose(row: CatalogChoice<K>): void {
    if (this.disabled || !this.options.some(x => x.value === row.value)) return;
    this.valueChange.emit(row.value);
    this.close();
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') { this.close(); return; }
    if (event.key === 'Enter' && this.open) {
      event.preventDefault();
      const row = this.results[this.cursor];
      if (row) this.choose(row);
      return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    this.begin();
    const last = this.results.length - 1;
    this.cursor = event.key === 'ArrowDown' ? Math.min(last, this.cursor + 1)
      : this.cursor <= 0 ? last : this.cursor - 1;
    document.getElementById(this.listId + '-' + this.cursor)?.scrollIntoView({ block: 'nearest' });
  }
}
