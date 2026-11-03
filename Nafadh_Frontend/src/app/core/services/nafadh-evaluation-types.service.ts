import { lookupValueKey } from '../models/administrative-constants';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Current labels for NFD_EVL_TYPE. Inactive options remain readable for historical records. */
const EVALUATION_KEYS = ['Technical', 'Behavioral', 'CompanyEvaluation', 'Final', 'TrainerPerformance'] as const;
const FALLBACK: Record<string, string> = {
  Technical: 'تقني', Behavioral: 'سلوكي', CompanyEvaluation: 'تقييم الشركة',
  Final: 'نهائي', TrainerPerformance: 'أداء المدرب'
};

@Injectable({ providedIn: 'root' })
export class NafadhEvaluationTypesService {
  private readonly http = inject(HttpClient);
  private readonly labels = signal<Record<string, string>>({});
  readonly loaded = signal(false);

  refresh(): void {
    this.http.get<unknown>(`${environment.apiBaseUrl}/management/nafadh-lookups/evaluation-types`)
      .subscribe({
        next: payload => {
          const rows = this.extractRows(payload);
          if (!rows) {
            console.warn('Evaluation types: unsupported response shape; keeping previous labels');
            return;
          }
          const labels: Record<string, string> = {};
          for (const item of rows) {
            if (!item || typeof item !== 'object') continue;
            const data = item as Record<string, unknown>;
            const key = this.key(lookupValueKey(data));
            if (!EVALUATION_KEYS.includes(key as typeof EVALUATION_KEYS[number])) continue;
            labels[key] = String(data['label_ar'] ?? data['labelAr'] ?? data['LabelAr'] ??
              data['label_en'] ?? data['labelEn'] ?? FALLBACK[key]).trim() || FALLBACK[key];
          }
          this.labels.set(labels);
          this.loaded.set(true);
        },
        error: error => console.warn('Evaluation types: unable to load current labels', error)
      });
  }


  /** Active options for new evaluations. Inactive types remain available through label() for old records. */
  getActiveTypes(): Observable<ReadonlySet<string>> {
    return this.http.get<unknown>(`${environment.apiBaseUrl}/management/nafadh-lookups/evaluation-types`)
      .pipe(map(payload => {
        const rows = this.extractRows(payload);
        if (!rows) throw new Error('Unexpected evaluation-types response');
        const result = new Set<string>();
        for (const item of rows) {
          if (!item || typeof item !== 'object') continue;
          const data = item as Record<string, unknown>;
          const key = this.key(lookupValueKey(data));
          if (!EVALUATION_KEYS.includes(key as typeof EVALUATION_KEYS[number])) continue;
          const active = data['IsActive'] ?? data['isActive'] ?? data['active'];
          if (active === true || active === 1 || String(active).toLowerCase() === 'true') {
            result.add(key);
          }
        }
        return result;
      }));
  }

  isActiveType(type: unknown, active: ReadonlySet<string>): boolean {
    return active.has(this.key(type));
  }

  label(value: unknown): string {
    const key = this.key(value);
    return this.labels()[key] ?? FALLBACK[key] ?? String(value ?? '—');
  }

  private key(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (/^[0-4]$/.test(raw)) return EVALUATION_KEYS[Number(raw)];
    return EVALUATION_KEYS.find(key => key.toLowerCase() === raw.toLowerCase()) ?? raw;
  }

  private extractRows(payload: unknown, depth = 0): unknown[] | null {
    if (depth > 8) return null;
    if (typeof payload === 'string') {
      try { return this.extractRows(JSON.parse(payload), depth + 1); } catch { return null; }
    }
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return null;
    const obj = payload as Record<string, unknown>;
    for (const key of ['rows', 'data', 'items', 'values', 'results', 'result', 'records',
      'content', 'payload', 'response', '$values', 'Rows', 'Data', 'Items', 'Values']) {
      if (obj[key] == null) continue;
      const rows = this.extractRows(obj[key], depth + 1);
      if (rows !== null) return rows;
    }
    return null;
  }
}
