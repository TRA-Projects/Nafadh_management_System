import { AdministrativeGroup, administrativeValue, constantEditKey, isAdministrativeGroup, lookupLabel, lookupValueKey } from '../models/administrative-constants';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** One value of a Nafadh enum-backed constants group (e.g. NFD_TSK_PRI → Low / Medium / High). */
export interface NafadhConstantOption {
  /** Stable enum key sent to and stored by the backend. Never edited from the UI. */
  key: string;
  label: string;
  labelEn?: string;
  isActive: boolean;
}

/**
 * Generic, read-only access to the admin-managed labels of any NFD_* constants group.
 *
 * - Names come from the shared database through GET /management/nafadh-lookups/groups/{code},
 *   so a label edited in Management → Constants shows everywhere this service is used.
 * - Inactive values are kept for label() so historical records stay readable, but are removed
 *   from options() so they are not offered for new records.
 * - Safe by design: until a group loads (or if the request fails) label() returns the supplied
 *   fallback, so a page never renders blank because of this service.
 *
 * Usage: call ensure('NFD_TSK_PRI') once (constructor / ngOnInit), then read
 * label('NFD_TSK_PRI', task.priority, 'متوسطة') or options('NFD_TSK_PRI') in the template.
 */
@Injectable({ providedIn: 'root' })
export class NafadhConstantsService {
  private readonly http = inject(HttpClient);
  private readonly rowsByGroup = signal<Record<string, readonly NafadhConstantOption[]>>({});
  private readonly requested = new Set<string>();
  /** Existing exported label maps (e.g. TRAINEE_STATUS_LABELS) kept in sync with the database labels. */
  private readonly liveMaps = new Map<string, Array<Record<string, string>>>();

  /** Loads the given groups once. Pass force = true to refresh after an admin edit. */
  ensure(...groups: string[]): void {
    for (const group of groups) this.load(group, false);
  }

  refresh(...groups: string[]): void {
    for (const group of groups) this.load(group, true);
  }

  /** Current admin-defined label for a stored key, or the fallback / raw key when unknown. */
  label(group: string, value: unknown, fallback?: string): string {
    group = group.toUpperCase();
    const key = this.normalize(group, value);
    const found = this.rowsByGroup()[group]?.find(row => row.key === key);
    const text = found?.label?.trim();
    return text || fallback || (value == null || value === '' ? '—' : String(value));
  }

  administrativeLabel(group: AdministrativeGroup, value: unknown, fallback?: string): string {
    const row = administrativeValue(group, value);
    return this.label(group, row?.key ?? value, fallback ?? row?.label);
  }

  /** All values, including inactive ones (for filters and historical display). */
  all(group: string): readonly NafadhConstantOption[] {
    return this.rowsByGroup()[group.toUpperCase()] ?? [];
  }

  /** Only active values: use for dropdowns that create or edit records. */
  options(group: string): readonly NafadhConstantOption[] {
    return this.all(group).filter(row => row.isActive);
  }

  choices(group: string, historical = false) {
    return (historical ? this.all(group) : this.options(group)).map(row => ({
      value: row.key, label: row.label || row.key, labelEn: row.labelEn
    }));
  }

  /** Keep the screen's supported keys and order. History survives a catalog outage;
   * new choices require a confirmed active row from the matching group. */
  supportedChoices<K extends string>(group: string, supported: readonly { value: K; label: string }[], historical = false) {
    const rows = this.all(group);
    return supported.flatMap(option => {
      const row = rows.find(r => r.key === option.value);
      return historical || row?.isActive === true
        ? [{ ...option, label: row?.label || option.label, labelEn: row?.labelEn }]
        : [];
    });
  }

  /** True when the key may be chosen for new records. Unknown / not-yet-loaded groups cannot authorize a new choice. */
  isSelectable(group: string, value: unknown): boolean {
    group = group.toUpperCase();
    const rows = this.rowsByGroup()[group];
    if (!rows) return false;
    const key = this.normalize(group, value);
    const row = rows.find(r => r.key === key);
    return row?.isActive === true;
  }

  /**
   * Keeps an existing label map up to date in place. Pages that already read
   * MAP[key] show the admin-edited name without any change on their side.
   * Only keys already present in the map are overwritten, and only with non-empty labels.
   */
  bindLabelMap(group: string, map: Record<string, string>): void {
    const code = group.toUpperCase();
    const list = this.liveMaps.get(code) ?? [];
    list.push(map);
    this.liveMaps.set(code, list);
    const rows = this.rowsByGroup()[code];
    if (rows) this.applyToMaps(code, rows);
  }

  private applyToMaps(code: string, rows: readonly NafadhConstantOption[]): void {
    for (const map of this.liveMaps.get(code) ?? []) {
      for (const row of rows) {
        if (row.label && Object.prototype.hasOwnProperty.call(map, row.key)) map[row.key] = row.label;
      }
    }
  }

  private load(group: string, force: boolean): void {
    const code = String(group ?? '').trim().toUpperCase();
    if (!code.startsWith('NFD_')) return;
    if (!force && this.requested.has(code)) return;
    this.requested.add(code);

    this.http
      .get<unknown>(`${environment.apiBaseUrl}/management/nafadh-lookups/groups/${encodeURIComponent(code)}`)
      .subscribe({
        next: payload => {
          const source = this.extractRows(payload);
          if (!source) {
            this.requested.delete(code);
            console.warn(`Nafadh constants ${code}: unsupported response shape; keeping previous labels`);
            return;
          }
          const rows: NafadhConstantOption[] = [];
          for (const item of source) {
            if (!item || typeof item !== 'object') continue;
            const data = item as Record<string, unknown>;
            const key = isAdministrativeGroup(code) ? constantEditKey(code, data)
              : lookupValueKey(data);
            if (!key || rows.some(row => row.key.toLowerCase() === key.toLowerCase())) continue;
            const label = lookupLabel(data);
            const active = data['IsActive'] ?? data['isActive'] ?? data['is_active'] ?? data['active'];
            rows.push({
              key,
              label,
              labelEn: String(data['label_en'] ?? data['labelEn'] ?? data['LabelEn'] ?? '') || undefined,
              isActive: active === true || active === 1 || String(active).toLowerCase() === 'true'
            });
          }
          this.rowsByGroup.update(current => ({ ...current, [code]: rows }));
          this.applyToMaps(code, rows);
        },
        error: error => {
          // Allow a later ensure() to retry; pages keep showing their built-in fallback labels.
          this.requested.delete(code);
          console.warn(`Nafadh constants ${code}: unable to load current labels`, error);
        }
      });
  }

  /** Matches the stored value to the group's real key, ignoring case. */
  private normalize(group: string, value: unknown): string {
    const raw = String(value ?? '').trim();
    const rows = this.rowsByGroup()[group];
    return rows?.find(row => row.key.toLowerCase() === raw.toLowerCase())?.key ?? raw;
  }

  private extractRows(payload: unknown, depth = 0): unknown[] | null {
    if (depth > 8) return null;
    if (typeof payload === 'string') {
      try { return this.extractRows(JSON.parse(payload), depth + 1); } catch { return null; }
    }
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return null;
    const obj = payload as Record<string, unknown>;
    for (const key of ['data', 'rows', 'items', 'values', 'results', 'result', 'records',
      'content', 'payload', 'response', '$values', 'Data', 'Rows', 'Items', 'Values', 'Results', 'Result']) {
      if (obj[key] == null) continue;
      const rows = this.extractRows(obj[key], depth + 1);
      if (rows !== null) return rows;
    }
    return null;
  }
}
