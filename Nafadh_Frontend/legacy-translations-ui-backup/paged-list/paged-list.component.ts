/// <reference types="@angular/localize" />

import { Component, computed, effect, input, output, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GetRowIdFunc, GridApi, GridReadyEvent } from 'ag-grid-community';

import { TablePagerComponent } from '../table-pager/table-pager.component';
import { PagedListActionsCellRenderer } from './paged-list-actions.cell';
import {
  ensurePagedListAgGridModules,
  pagedListAgGridLocaleText,
  pagedListAgGridTheme,
} from './paged-list-ag-grid.setup';
import type {
  PagedListAgGridContext,
  PagedListGridOptions,
  PagedListLoadState,
} from './paged-list.models';

ensurePagedListAgGridModules();

/**
 * Shared responsive list shell:
 * - cards below `lg` (project `[pagedListCards]`)
 * - AG Grid on `lg+` when `columnDefs` are provided (injectable)
 * - optional projected `[pagedListTable]` fallback when no columnDefs
 * - external tinted pager (backend paging stays on the host)
 */
@Component({
  selector: 'app-paged-list',
  standalone: true,
  /** Include cell renderers so AG Grid can create Angular ⋮ / custom cells. */
  imports: [TablePagerComponent, AgGridAngular, PagedListActionsCellRenderer],
  templateUrl: './paged-list.component.html',
  styleUrl: './paged-list.component.scss',
})
export class PagedListComponent {
  readonly loadState = input<PagedListLoadState>('ready');
  readonly empty = input(false);
  readonly showPager = input(true);

  readonly footerLabel = input('');
  readonly pageSize = input(5);
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 15]);
  readonly canPrev = input(false);
  readonly canNext = input(false);
  readonly pageNumber = input(1);

  readonly loadingLabel = input($localize`:@@jobseeker.common.loading:Loading…`);
  readonly errorLabel = input(
    $localize`:@@jobseeker.jobsList.loadError:Could not load opportunities. Try again.`
  );
  readonly emptyLabel = input($localize`:@@jobseeker.jobsList.noData:No opportunities found.`);

  /** When non-empty, desktop uses AG Grid instead of projected HTML table. */
  readonly columnDefs = input<ColDef[]>([]);
  readonly rowData = input<unknown[]>([]);
  readonly getRowId = input<GetRowIdFunc | null>(null);
  readonly gridContext = input<PagedListAgGridContext | Record<string, unknown> | null>(null);
  readonly gridOptions = input<PagedListGridOptions>({});
  readonly enableRtl = input(false);
  /** App locale — drives AG Grid `localeText` (filter/sort chrome). */
  readonly locale = input<'en' | 'ar' | string>('en');
  /** Bump / pass open ⋮ row id so action cells sync open state. */
  readonly actionsMenuRowId = input<string | number | null>(null);

  readonly pageSizeChange = output<number>();
  readonly prev = output<void>();
  readonly next = output<void>();
  readonly gridReady = output<GridReadyEvent>();

  readonly theme = pagedListAgGridTheme;
  private readonly gridApi = signal<GridApi | null>(null);
  private readonly actionsMenuSyncFns = new Set<(openId: string | null) => void>();

  readonly useAgGrid = computed(() => (this.columnDefs()?.length ?? 0) > 0);

  /**
   * Pin the shared ⋮ Actions column to the trailing edge:
   * LTR → physical right, RTL → physical left (matches card header actions).
   */
  readonly resolvedColumnDefs = computed((): ColDef[] => {
    const rtl = this.enableRtl();
    const pin: 'left' | 'right' = rtl ? 'left' : 'right';
    return (this.columnDefs() ?? []).map((col) =>
      col.colId === '__actions' ? { ...col, pinned: pin, lockPinned: true } : col
    );
  });

  readonly mergedDefaultColDef = computed<ColDef>(() => ({
    sortable: false,
    filter: false,
    floatingFilter: false,
    resizable: true,
    suppressHeaderMenuButton: true,
    ...(this.gridOptions().defaultColDef ?? {}),
  }));

  readonly resolvedLocaleText = computed(() => {
    const fromHost = this.gridOptions().localeText;
    if (fromHost) return fromHost;
    return pagedListAgGridLocaleText(this.locale());
  });

  readonly resolvedContext = computed(() => {
    const base = { ...(this.gridContext() ?? {}) } as PagedListAgGridContext;
    base.pageIndex = Number(base.pageIndex) || Math.max(0, this.pageNumber() - 1);
    base.pageSize = Number(base.pageSize) || this.pageSize();
    base.refreshActionsColumn = () => this.syncActionsMenuCells();
    base.registerActionsMenuSync = (fn) => {
      this.actionsMenuSyncFns.add(fn);
      return () => this.actionsMenuSyncFns.delete(fn);
    };
    return base;
  });

  constructor() {
    effect(() => {
      const open = this.actionsMenuRowId();
      const id = open == null ? null : String(open);
      // Sync open state into live cell renderers — never force-refreshCells (that
      // destroys the open ⋮ menu and makes it disappear immediately).
      queueMicrotask(() => this.syncActionsMenuCells(id));
    });
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi.set(event.api);
    this.gridReady.emit(event);
  }

  private syncActionsMenuCells(openId?: string | null): void {
    const id =
      openId !== undefined
        ? openId
        : (() => {
            const cur = this.actionsMenuRowId();
            return cur == null ? null : String(cur);
          })();
    this.actionsMenuSyncFns.forEach((fn) => fn(id));
  }
}
