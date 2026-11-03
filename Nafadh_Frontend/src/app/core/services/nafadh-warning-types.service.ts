import { lookupValueKey } from '../models/administrative-constants';
import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Shared names and active choices for the existing, fixed NFD_WarningType identities. */
export interface NafadhWarningTypeOption {
  value: string;
  label: string;
  isActive: boolean;
}

const WARNING_KEYS = ['Attendance', 'Performance', 'Behavioral', 'Other'] as const;
const FALLBACK_LABELS: Record<string, string> = {
  Attendance: 'الحضور', Performance: 'الأداء', Behavioral: 'سلوكي', Other: 'أخرى'
};

@Injectable({ providedIn: 'root' })
export class NafadhWarningTypesService {
  private readonly http = inject(HttpClient);
  private readonly allRows = signal<NafadhWarningTypeOption[]>([]);
  readonly loaded = signal(false);
  /** Only active values may be used for new selections; historical labels remain available. */
  readonly activeOptions = computed(() => this.allRows().filter(row => row.isActive));

  refresh(): void {
    this.http.get<unknown>(`${environment.apiBaseUrl}/management/nafadh-lookups/warning-types`)
      .subscribe({
        next: payload => {
          const source = this.extractRows(payload);
          if (!source) {
            console.warn('Warning constants: invalid response; preserving existing labels');
            return;
          }
          const rows: NafadhWarningTypeOption[] = [];
          for (const item of source) {
            if (!item || typeof item !== 'object') continue;
            const v = item as Record<string, unknown>;
            const key = this.key(lookupValueKey(v));
            if (!WARNING_KEYS.includes(key as typeof WARNING_KEYS[number])) continue;
            const label = String(v['label_ar'] ?? v['labelAr'] ?? v['LabelAr'] ??
              v['label_en'] ?? v['labelEn'] ?? FALLBACK_LABELS[key]).trim();
            const active = v['isActive'] ?? v['IsActive'] ?? true;
            if (rows.some(row => row.value === key)) continue;
            rows.push({ value: key, label: label || FALLBACK_LABELS[key],
              isActive: active === true || active === 1 || active === 'true' || active === 'True' });
          }
          this.allRows.set(rows);
          this.loaded.set(true);
        },
        error: error => console.warn('Warning constants: unable to refresh labels', error)
      });
  }

  label(value: unknown): string {
    const key = this.key(value);
    return this.allRows().find(row => row.value === key)?.label
      ?? FALLBACK_LABELS[key] ?? String(value ?? '—');
  }

  selectable(value: unknown): boolean {
    const key = this.key(value);
    return this.loaded() && this.activeOptions().some(row => row.value === key);
  }

  private key(value: unknown): string {
    const raw = String(value ?? '').trim();
    // Existing NFD_WarningType enum uses 0=Attendance, 1=Performance, 2=Behavioral, 3=Other.
    if (/^[0-3]$/.test(raw)) return WARNING_KEYS[Number(raw)];
    return WARNING_KEYS.find(key => key.toLowerCase() === raw.toLowerCase()) ?? raw;
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
