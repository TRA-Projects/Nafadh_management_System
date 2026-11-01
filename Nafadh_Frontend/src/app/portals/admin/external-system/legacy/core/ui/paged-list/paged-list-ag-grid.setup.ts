import { AG_GRID_LOCALE_EG } from '@ag-grid-community/locale';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';

let registered = false;

/** Idempotent Community module registration (call once before first grid). */
export function ensurePagedListAgGridModules(): void {
  if (registered) return;
  ModuleRegistry.registerModules([AllCommunityModule]);
  registered = true;
}

/** AG Grid chrome strings (filters, sort, etc.). `ar` uses Egyptian Arabic pack. */
export function pagedListAgGridLocaleText(
  locale: 'en' | 'ar' | string | null | undefined
): { [key: string]: string } | undefined {
  if (locale !== 'ar') return undefined;
  return AG_GRID_LOCALE_EG as unknown as { [key: string]: string };
}

/**
 * Theme matched to JobseekerModule HTML list tables
 * (notification-templates `ntpl-table`, job-seekers list).
 */
export const pagedListAgGridTheme = themeQuartz.withParams({
  accentColor: '#4361ee',
  backgroundColor: '#ffffff',
  borderColor: '#ebedf2',
  borderRadius: 0,
  browserColorScheme: 'light',
  cellHorizontalPadding: 16,
  chromeBackgroundColor: 'rgba(67, 97, 238, 0.08)',
  columnBorder: false,
  fontFamily: 'inherit',
  fontSize: 14,
  foregroundColor: '#1f2937',
  headerBackgroundColor: 'rgba(67, 97, 238, 0.08)',
  headerColumnBorder: false,
  headerFontSize: 13,
  headerFontWeight: 600,
  headerTextColor: '#6b7280',
  headerVerticalPaddingScale: 1.15,
  oddRowBackgroundColor: 'transparent',
  rowBorder: { style: 'solid', width: 1, color: '#f0f1f5' },
  rowHoverColor: 'transparent',
  spacing: 8,
  wrapperBorder: false,
  wrapperBorderRadius: 0,
});
