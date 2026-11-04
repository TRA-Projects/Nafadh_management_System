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
  styles: [`:host{display:block;position:relative}input{width:100%;font:inherit;padding:.45em}
    ul{position:absolute;z-index:10;max-height:14rem;overflow:auto;background:white;color:#182335;width:100%;
    margin:0;padding:0;list-style:none;border:1px solid #aaa}li{padding:.4em;cursor:pointer}
    li:hover,li.highlight{background:#e5f0ff}`]
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
