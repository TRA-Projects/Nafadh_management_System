/// <reference types="@angular/localize" />

import { Component, input, output } from '@angular/core';

/** Admin table footer pager — matches TRA verification layout. */
@Component({
  selector: 'app-table-pager',
  standalone: true,
  templateUrl: './table-pager.component.html',
})
export class TablePagerComponent {
  readonly footerLabel = input.required<string>();
  readonly pageSize = input.required<number>();
  readonly pageSizeOptions = input.required<readonly number[]>();
  readonly canPrev = input.required<boolean>();
  readonly canNext = input.required<boolean>();
  /** 1-based page indicator shown between prev/next controls. */
  readonly pageNumber = input.required<number>();

  readonly pageSizeChange = output<number>();
  readonly prev = output<void>();
  readonly next = output<void>();

  onPageSizeChange(event: Event): void {
    const raw = Number((event.target as HTMLSelectElement).value);
    if (Number.isFinite(raw)) {
      this.pageSizeChange.emit(raw);
    }
  }
}
