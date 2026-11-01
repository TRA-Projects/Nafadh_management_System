import type { ColDef, ValueGetterParams } from 'ag-grid-community';

import type { PagedListAgGridContext } from './paged-list.models';
import { PagedListActionsCellRenderer } from './paged-list-actions.cell';

/** Page-aware `#` column (uses `context.pageIndex` / `context.pageSize`). */
export function pagedListRowNumberColDef(headerName = '#'): ColDef {
  return {
    colId: '__rowNum',
    headerName,
    width: 72,
    maxWidth: 88,
    minWidth: 56,
    sortable: false,
    filter: false,
    floatingFilter: false,
    resizable: false,
    suppressMovable: true,
    suppressHeaderMenuButton: true,
    valueGetter: (p: ValueGetterParams) => {
      const ctx = (p.context ?? {}) as PagedListAgGridContext;
      const pageIndex = Number(ctx.pageIndex) || 0;
      const pageSize = Number(ctx.pageSize) || 5;
      return pageIndex * pageSize + (p.node?.rowIndex ?? 0) + 1;
    },
    cellClass: 'paged-list-ag-rownum',
  };
}

/** Centered Actions column — ⋮ menu via {@link PagedListActionsCellRenderer}. */
export function pagedListActionsColDef(headerName = 'Actions'): ColDef {
  return {
    colId: '__actions',
    headerName,
    width: 96,
    maxWidth: 112,
    minWidth: 80,
    // Pin side is applied by `app-paged-list` from `enableRtl`
    // (LTR → right / end, RTL → left / end). Do not hardcode here.
    sortable: false,
    filter: false,
    floatingFilter: false,
    resizable: false,
    suppressMovable: true,
    suppressHeaderMenuButton: true,
    cellRenderer: PagedListActionsCellRenderer,
    cellClass: 'paged-list-ag-actions-cell',
    headerClass: 'paged-list-ag-actions-header',
    cellStyle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
      pointerEvents: 'auto',
    },
  };
}
