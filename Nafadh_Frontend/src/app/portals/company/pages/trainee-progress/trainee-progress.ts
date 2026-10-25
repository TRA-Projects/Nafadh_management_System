import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { CompanyApi } from '../../services/company-api';
import { EnrollmentDto, ProgressSummaryDto } from '../../../../core/models/dtos';
import { NfdIcon } from '../../../../shared/ui/icon/icon';

/* ------------------------------------------------------------------ */
/*  View models (mirror the backend EvaluationDTO / criteria breakdown) */
/* ------------------------------------------------------------------ */

interface CriterionView {
  criteriaId: number;
  criterionName?: string | null;
  score: number;
  maxPoints: number;
  weight: number;
}

interface EvaluationView {
  evaluationId: number;
  moduleId?: number | null;
  moduleTitle?: string | null;
  templateType?: string | null;
  trainerName?: string | null;
  evaluatorName?: string | null;
  score: number;
  notes?: string | null;
  evaluationDate?: string | null;
  criteriaBreakdown: CriterionView[];
}

interface ModuleLite {
  id: number;
  title: string;
  order: number;
}

export interface ModuleSection {
  key: string;
  moduleId: number | null;
  title: string;
  evaluations: EvaluationView[];
  score: number | null;
}

type LoadState = 'loading' | 'ready' | 'error';
type Tone = 'high' | 'good' | 'mid' | 'low';

/* ------------------------------------------------------------------ */
/*  Presentation constants only — no business data lives here           */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  InProgress: 'نشط',
  Completed: 'مكتمل',
  Dropped: 'موقوف',
  Failed: 'متعثر'
};

const STATUS_TONE: Record<string, string> = {
  InProgress: 'ok',
  Completed: 'info',
  Dropped: 'bad',
  Failed: 'warn'
};

// Labels for the NFD_EvaluationType enum names returned by the API.
const TYPE_LABELS: Record<string, string> = {
  Technical: 'تقييم تقني',
  Behavioral: 'تقييم سلوكي',
  Final: 'التقييم النهائي',
  CompanyEvaluation: 'تقييم الشركة',
  TrainerPerformance: 'أداء المدرب'
};

// Types that describe the trainer, not the trainee, so they stay out of this page.
const EXCLUDED_TYPES = new Set(['TrainerPerformance']);

const BUCKET_ORDER = ['Technical', 'Behavioral', 'Final', 'CompanyEvaluation'];

const TONE_LABELS: Record<Tone, string> = {
  high: 'ممتاز',
  good: 'جيد',
  mid: 'مقبول',
  low: 'يحتاج إلى دعم'
};

const AVATAR_PALETTE = ['#00338d', '#007cae', '#00a3a9', '#5b6fb8', '#475569', '#000692'];

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const GENERAL_KEY = 'general';

const dateFormatter = new Intl.DateTimeFormat('ar-OM-u-nu-latn', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

@Component({
  selector: 'app-company-trainee-progress',
  standalone: true,
  imports: [RouterLink, NfdIcon],
  templateUrl: './trainee-progress.html',
  styleUrls: ['./trainee-progress.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyTraineeProgress {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CompanyApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly ringCircumference = RING_CIRCUMFERENCE;
  readonly ringRadius = RING_RADIUS;

  // ---- raw state, all of it loaded from the backend ----
  readonly state = signal<LoadState>('loading');
  readonly enrollment = signal<EnrollmentDto | null>(null);
  readonly evaluations = signal<EvaluationView[]>([]);
  readonly modules = signal<ModuleLite[]>([]);
  readonly progressSummary = signal<ProgressSummaryDto | null>(null);
  readonly buckets = signal<Record<string, number | null> | null>(null);

  // ---- UI state ----
  readonly selectedKey = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly imageVersion = signal(Date.now());
  // 0 = resolved API url, 1 = raw stored url, 2 = give up and show initials
  readonly imageStage = signal<0 | 1 | 2>(0);
  readonly toast = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private currentEnrollmentId = 0;

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        tap((id) => {
          this.currentEnrollmentId = id;
          this.state.set('loading');
        }),
        switchMap((id) => this.fetchAll(id)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((ok) => this.state.set(ok ? 'ready' : 'error'));
  }

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                      */
  /* ---------------------------------------------------------------- */

  retry(): void {
    this.state.set('loading');
    this.fetchAll(this.currentEnrollmentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => this.state.set(ok ? 'ready' : 'error'));
  }

  /** Enrollment + evaluations are required; the rest degrades gracefully. */
  private fetchAll(enrollmentId: number) {
    if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
      return of(false);
    }

    return this.api.getEnrollment(enrollmentId).pipe(
      switchMap((enrollment) =>
        forkJoin({
          enrollment: of(enrollment),
          evaluations: this.api.getEvaluationsForEnrollment(enrollmentId),
          progress: this.api.getProgressSummary(enrollmentId).pipe(catchError(() => of(null))),
          buckets: this.api.getEvaluationBuckets(enrollmentId).pipe(catchError(() => of(null))),
          modules: this.loadModules(enrollment)
        })
      ),
      tap(({ enrollment, evaluations, progress, buckets, modules }) => {
        this.enrollment.set(enrollment);
        this.evaluations.set((evaluations ?? []) as unknown as EvaluationView[]);
        this.progressSummary.set(progress);
        this.buckets.set(buckets);
        this.modules.set(modules);
        this.selectedKey.set(null);
        this.imageStage.set(0);
      }),
      map(() => true),
      catchError((error) => {
        console.error('Failed to load trainee progress', error);
        return of(false);
      })
    );
  }

  private loadModules(enrollment: EnrollmentDto) {
    const programId = Number((enrollment as unknown as { programId?: number }).programId);

    if (!Number.isInteger(programId) || programId <= 0) {
      return of<ModuleLite[]>([]);
    }

    return this.api.getModulesByProgram(programId).pipe(
      map((raw) => this.normalizeModules(raw)),
      catchError(() => of<ModuleLite[]>([]))
    );
  }

  private normalizeModules(raw: any[]): ModuleLite[] {
    return (raw ?? [])
      .map((m, index) => ({
        id: Number(m.moduleId ?? m.id),
        title: String(m.title ?? m.name ?? `الوحدة ${index + 1}`),
        order: Number(m.orderIndex ?? m.sequence ?? m.order ?? m.position ?? index)
      }))
      .filter((m) => Number.isFinite(m.id))
      .sort((a, b) => a.order - b.order);
  }

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                      */
  /* ---------------------------------------------------------------- */

  /** Evaluations that belong on a trainee's progress page. */
  private readonly relevant = computed(() =>
    this.evaluations().filter((e) => !EXCLUDED_TYPES.has(e.templateType ?? ''))
  );

  readonly sections = computed<ModuleSection[]>(() => {
    const evals = this.relevant();
    const byModule = new Map<number, EvaluationView[]>();
    const general: EvaluationView[] = [];

    for (const ev of evals) {
      if (ev.moduleId == null) {
        general.push(ev);
      } else {
        byModule.set(ev.moduleId, [...(byModule.get(ev.moduleId) ?? []), ev]);
      }
    }

    const sections: ModuleSection[] = [];
    const seen = new Set<number>();

    for (const m of this.modules()) {
      seen.add(m.id);
      sections.push(this.buildSection(`m-${m.id}`, m.id, m.title, byModule.get(m.id) ?? []));
    }

    // Evaluations whose module is not in the program list (or the list failed to load).
    for (const [moduleId, list] of byModule) {
      if (!seen.has(moduleId)) {
        const title = list[0].moduleTitle || `وحدة ${moduleId}`;
        sections.push(this.buildSection(`m-${moduleId}`, moduleId, title, list));
      }
    }

    if (general.length) {
      sections.push(this.buildSection(GENERAL_KEY, null, 'تقييمات عامة', general));
    }

    return sections;
  });

  private buildSection(
    key: string,
    moduleId: number | null,
    title: string,
    list: EvaluationView[]
  ): ModuleSection {
    const evaluations = [...list].sort(
      (a, b) => this.time(a.evaluationDate) - this.time(b.evaluationDate)
    );
    const score = evaluations.length
      ? this.round(evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length)
      : null;

    return { key, moduleId, title, evaluations, score };
  }

  readonly activeSection = computed<ModuleSection | null>(() => {
    const sections = this.sections();
    const key = this.selectedKey();

    return (
      sections.find((s) => s.key === key) ??
      [...sections].reverse().find((s) => s.evaluations.length) ??
      sections[0] ??
      null
    );
  });

  readonly avgScore = computed<number | null>(() => {
    const evals = this.relevant();
    if (!evals.length) return null;
    return this.round(evals.reduce((sum, e) => sum + e.score, 0) / evals.length);
  });

  readonly evaluatedCount = computed(() => this.sections().filter((s) => s.evaluations.length).length);

  readonly pendingCount = computed(
    () => this.sections().filter((s) => s.moduleId !== null && !s.evaluations.length).length
  );

  readonly totalModules = computed(() => this.sections().filter((s) => s.moduleId !== null).length);

  readonly lastEvaluationDate = computed(() => {
    const dates = this.relevant()
      .map((e) => this.time(e.evaluationDate))
      .filter((t) => t > 0);
    return dates.length ? this.formatDate(new Date(Math.max(...dates)).toISOString()) : null;
  });

  readonly progressPercent = computed(() => {
    const value = Number(this.progressSummary()?.progressPercentage ?? 0);
    return Math.min(100, Math.max(0, Math.round(value)));
  });

  readonly bucketRows = computed(() => {
    const data = this.buckets();
    if (!data) return [];

    const read = (name: string): number | null => {
      const key = Object.keys(data).find((k) => k.toLowerCase() === name.toLowerCase());
      const value = key ? data[key] : null;
      return value == null ? null : this.round(Number(value));
    };

    return BUCKET_ORDER.map((name) => ({ name, label: TYPE_LABELS[name], value: read(name) })).filter(
      (row) => row.value !== null
    );
  });

  readonly ringOffset = computed(
    () => this.ringCircumference * (1 - (this.avgScore() ?? 0) / 100)
  );

  readonly avatarUrl = computed(() => {
    const raw = this.enrollment()?.profileImageUrl;
    const stage = this.imageStage();
    if (!raw || stage === 2) return null;

    const base = stage === 0 ? this.api.resolveFileUrl(raw) : raw;
    if (!base) return null;
    if (/^(data:|blob:)/i.test(base)) return base;
    return `${base}${base.includes('?') ? '&' : '?'}v=${this.imageVersion()}`;
  });

  /** Real batch dates from the enrollment: start, end, elapsed share and what is left. */
  readonly period = computed(() => {
    const e = this.enrollment();
    const start = e?.batchStartDate ? new Date(e.batchStartDate) : null;
    const end = e?.batchEndDate ? new Date(e.batchEndDate) : null;

    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return null;
    }

    const day = 86_400_000;
    const now = Date.now();
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / day));
    const percent = Math.min(100, Math.max(0, ((now - start.getTime()) / (end.getTime() - start.getTime())) * 100));

    let label: string;
    if (now < start.getTime()) {
      label = `تبدأ بعد ${this.daysLabel(Math.ceil((start.getTime() - now) / day))}`;
    } else if (now > end.getTime()) {
      label = `انتهت قبل ${this.daysLabel(Math.floor((now - end.getTime()) / day))}`;
    } else {
      label = `متبقي ${this.daysLabel(Math.ceil((end.getTime() - now) / day))}`;
    }

    return {
      start: this.formatDate(e!.batchStartDate),
      end: this.formatDate(e!.batchEndDate),
      totalLabel: this.daysLabel(totalDays),
      percent: Math.round(percent),
      label
    };
  });

  /** Flags records that contradict each other, e.g. evaluations dated before the batch starts. */
  readonly dateWarning = computed(() => {
    const e = this.enrollment();
    const start = e?.batchStartDate ? new Date(e.batchStartDate).getTime() : NaN;
    if (Number.isNaN(start)) return null;

    const dates = this.relevant()
      .map((ev) => this.time(ev.evaluationDate))
      .filter((t) => t > 0);

    return dates.length && Math.min(...dates) < start
      ? 'تنبيه: توجد تقييمات مسجلة بتاريخ قبل بداية الدفعة. راجع تواريخ الدفعة أو تواريخ التقييمات في النظام.'
      : null;
  });

  readonly completedModules = computed(() => {
    const s = this.progressSummary();
    return s ? { done: s.completedModules, total: s.totalModules } : null;
  });

  /* ---------------------------------------------------------------- */
  /*  Interaction                                                       */
  /* ---------------------------------------------------------------- */

  onAvatarError(): void {
    const raw = this.enrollment()?.profileImageUrl;
    // Retry with the raw stored url only when it actually differs from the resolved one;
    // otherwise the src never changes, no new event fires and the broken image stays.
    const canRetryRaw = !!raw && this.api.resolveFileUrl(raw) !== raw;
    this.imageStage.update((stage) => (stage === 0 && canRetryRaw ? 1 : 2));
  }

  select(key: string): void {
    this.selectedKey.set(key);
  }

  onTabKeydown(event: KeyboardEvent): void {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;

    event.preventDefault();
    const sections = this.sections();
    const current = sections.findIndex((s) => s.key === this.activeSection()?.key);
    const next = sections[(current + step + sections.length) % sections.length];

    this.select(next.key);
    queueMicrotask(() => document.getElementById('tab-' + next.key)?.focus());
  }

  onFileSelected(event: Event, traineeId: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.showToast('error', 'الصيغة غير مدعومة. اختر صورة بصيغة JPG أو PNG أو WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showToast('error', 'حجم الصورة أكبر من 5 ميجابايت. اختر صورة أصغر.');
      return;
    }

    this.uploading.set(true);

    this.api
      .uploadTraineeImage(traineeId, file)
      .pipe(
        switchMap(() => this.api.getEnrollment(this.currentEnrollmentId)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (enrollment) => {
          this.enrollment.set(enrollment);
          this.imageStage.set(0);
          this.imageVersion.set(Date.now());
          this.uploading.set(false);
          this.showToast('ok', 'تم حفظ الصورة الشخصية.');
        },
        error: (error) => {
          console.error('Image upload failed', error);
          this.uploading.set(false);
          this.showToast('error', 'تعذر رفع الصورة. حاول مرة أخرى.');
        }
      });
  }

  private showToast(kind: 'ok' | 'error', text: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ kind, text });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }

  /* ---------------------------------------------------------------- */
  /*  Template helpers                                                  */
  /* ---------------------------------------------------------------- */

  statusLabel(status?: string): string {
    return status ? STATUS_LABELS[status] ?? status : '—';
  }

  statusTone(status?: string): string {
    return status ? STATUS_TONE[status] ?? 'gray' : 'gray';
  }

  typeLabel(type?: string | null): string {
    return type ? TYPE_LABELS[type] ?? type : 'تقييم';
  }

  tone(score: number | null): Tone | 'none' {
    if (score === null) return 'none';
    return score >= 85 ? 'high' : score >= 70 ? 'good' : score >= 50 ? 'mid' : 'low';
  }

  toneLabel(score: number | null): string {
    const tone = this.tone(score);
    return tone === 'none' ? '' : TONE_LABELS[tone];
  }

  evaluatorOf(ev: EvaluationView): string {
    return ev.trainerName || ev.evaluatorName || 'الهيئة التدريبية';
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
  }

  daysLabel(n: number): string {
    if (n === 1) return 'يوم';
    if (n === 2) return 'يومين';
    if (n >= 3 && n <= 10) return `${n} أيام`;
    return `${n} يومًا`;
  }

  formatScore(value: number | null | undefined): string {
    return value == null ? '—' : String(this.round(value));
  }

  criterionPct(score: number, maxPoints: number): number {
    return maxPoints ? Math.min(100, Math.round((score / maxPoints) * 100)) : 0;
  }

  initials(name?: string): string {
    if (!name) return '؟';
    return name
      .replace(' بن ', ' ')
      .replace(' بنت ', ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('');
  }

  avatarColor(name?: string): string {
    if (!name) return AVATAR_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash + name.charCodeAt(i)) % AVATAR_PALETTE.length;
    }
    return AVATAR_PALETTE[hash];
  }

  ensureUrl(url?: string | null): string | null {
    const value = url?.trim();
    if (!value) return null;
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }

  padId(id: number): string {
    return String(id).padStart(4, '0');
  }

  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private time(value?: string | null): number {
    const t = value ? new Date(value).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  }
}
