import type { ColDef, GetRowIdFunc, GridOptions } from 'ag-grid-community';

export type PagedListLoadState = 'loading' | 'ready' | 'error';

/** One item in the shared ⋮ actions menu (built by the host page). */
export interface PagedListActionItem {
  id: string;
  label: string;
  /** Absolute/public asset path, e.g. `/images/general/edit.svg`. */
  iconSrc?: string;
  /** Built-in SVG when no `iconSrc` (view / users). */
  iconKind?: 'view' | 'users';
  disabled?: boolean;
  onSelect: () => void;
}

/**
 * Injected into AG Grid `context` so cell renderers stay reusable.
 * Host pages supply paging + actions; shell attaches menu sync helpers.
 */
export interface PagedListAgGridContext {
  pageIndex: number;
  pageSize: number;
  getOpenActionsRowId: () => string | number | null;
  toggleActionsMenu: (rowId: string | number, event: Event) => void;
  getActionItems: (row: unknown) => PagedListActionItem[];
  /**
   * Register a cell to receive open-id updates without AG Grid `refreshCells`
   * (force-refresh destroys the open menu). Returns an unregister fn.
   */
  registerActionsMenuSync?: (fn: (openId: string | null) => void) => () => void;
  /** @deprecated Prefer registerActionsMenuSync — kept for older hosts. */
  refreshActionsColumn?: () => void;
  /** Host-specific extras for custom cell renderers. */
  [key: string]: unknown;
}

/** Optional extras merged into the grid (host-controlled). */
export type PagedListGridOptions = Partial<
  Pick<
    GridOptions,
    | 'defaultColDef'
    | 'suppressCellFocus'
    | 'animateRows'
    | 'domLayout'
    | 'rowHeight'
    | 'headerHeight'
    | 'floatingFiltersHeight'
    | 'enableCellTextSelection'
    | 'quickFilterText'
    | 'localeText'
  >
>;

export type PagedListColDef = ColDef;
export type PagedListGetRowId = GetRowIdFunc;
