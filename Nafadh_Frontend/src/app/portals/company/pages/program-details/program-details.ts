import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CompanyApi } from '../../services/company-api';

interface ProgramInfo {
  id: number;
  title: string;
  description: string;
  department: string;
  durationWeeks: number;
  capacity: number;
  occupied: number;
  available: number;
  percent: number;
  approved: boolean;
  color: string;
  soft: string;
}

interface TraineeRow {
  enrollmentId: number;
  traineeId: number;
  name: string;
  cohort: string;
  supervisor: string;
  status: string;
  progress: number;
}

@Component({
  selector: 'app-company-program-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './program-details.html',
  styleUrl: './program-details.scss',
})
export class CompanyProgramDetails implements OnInit {
  readonly loading = signal(true);
  readonly error = signal('');
  readonly program = signal<ProgramInfo | null>(null);
  readonly modules = signal<any[]>([]);
  readonly trainees = signal<TraineeRow[]>([]);
  readonly supervisorCount = signal(0);
  readonly averageProgress = signal(0);

  private readonly companyId = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: CompanyApi,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('معرّف البرنامج غير صالح.');
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      program: this.api.getProgram(id).pipe(catchError(() => of(null))),
      capacity: this.api.getCapacity(this.companyId).pipe(catchError(() => of({}))),
      distribution: this.api.getProgramDistribution(this.companyId).pipe(catchError(() => of([]))),
      modules: this.api.getModulesByProgram(id).pipe(catchError(() => of([]))),
      enrollments: this.api.getEnrollmentsByCompany(this.companyId).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ program, capacity, distribution, modules, enrollments }) => {
        if (!program) {
          this.error.set('تعذر تحميل بيانات البرنامج.');
          this.loading.set(false);
          return;
        }

        const title = program.title || program.name || `البرنامج ${program.programId}`;
        const matched = (distribution as any[]).find((x: any) =>
          String(x?.label ?? '').trim().toLowerCase() === title.trim().toLowerCase()
        );
        const used = Number(matched?.value ?? 0);
        const total = Number((capacity as any)?.total ?? 0);
        const share = (distribution as any[]).reduce((sum, x) => sum + Number(x?.value || 0), 0);
        const derivedCapacity = total > 0
          ? Math.max(1, Math.round(total * (used / Math.max(1, share))))
          : Math.max(10, used + 10);
        const cap = Math.max(used, derivedCapacity);
        const percent = Math.min(100, Math.round((used / cap) * 100));
        const color = this.colorFor(title);

        this.program.set({
          id,
          title,
          description: program.description || 'برنامج تدريبي معتمد ضمن برامج الشركة.',
          department: this.departmentFor(title),
          durationWeeks: Math.max(1, Math.round(Number(program.durationHours ?? 0) / 40) || 16),
          capacity: cap,
          occupied: used,
          available: Math.max(0, cap - used),
          percent,
          approved: !program.status || !/pending|draft|inactive|rejected/i.test(program.status),
          color,
          soft: this.softFor(color),
        });
        this.modules.set((modules as any[]) ?? []);

        const all = (enrollments as any[]) ?? [];
        if (!all.length) {
          this.finishRows([]);
          return;
        }

        forkJoin(all.map(e => this.api.getBatch(Number(e.batchId)).pipe(catchError(() => of(null))))).subscribe({
          next: batches => {
            const matching = all.filter((e, i) => Number((batches[i] as any)?.programId) === id);
            if (!matching.length) {
              this.finishRows([]);
              return;
            }

            forkJoin(matching.map(e => this.api.getEnrollmentProgressSummary(Number(e.enrollmentId)).pipe(catchError(() => of(null))))).subscribe({
              next: progress => {
                const rows: TraineeRow[] = matching.map((e, i) => ({
                  enrollmentId: Number(e.enrollmentId),
                  traineeId: Number(e.traineeId),
                  name: e.traineeName || `متدرب ${e.traineeId}`,
                  cohort: e.batchName || '—',
                  supervisor: e.supervisorName || '—',
                  status: this.statusLabel(e.completionStatus),
                  progress: Number(progress[i]?.progressPercentage ?? 0),
                }));
                this.finishRows(rows);
              },
              error: () => this.finishRows([]),
            });
          },
          error: () => this.finishRows([]),
        });
      },
      error: () => {
        this.error.set('تعذر تحميل تفاصيل البرنامج.');
        this.loading.set(false);
      },
    });
  }

  goBack(): void { this.router.navigate(['/company/specialties']); }

  private finishRows(rows: TraineeRow[]): void {
    this.trainees.set(rows);
    this.supervisorCount.set(new Set(rows.map(x => x.supervisor).filter(x => x !== '—')).size);
    this.averageProgress.set(rows.length ? Math.round(rows.reduce((sum, x) => sum + x.progress, 0) / rows.length) : 0);
    this.loading.set(false);
  }

  private statusLabel(value: unknown): string {
    const s = String(value ?? '').toLowerCase();
    if (s.includes('complete')) return 'مكتمل';
    if (s.includes('withdraw') || s.includes('suspend')) return 'متوقف';
    if (s.includes('transfer')) return 'منقول';
    return 'قيد التدريب';
  }

  private departmentFor(title: string): string {
    if (/بيانات|data|إحصاء/i.test(title)) return 'العمليات';
    if (/تصميم|جرافيك|تسويق/i.test(title)) return 'التسويق';
    return 'تقنية المعلومات';
  }

  private colorFor(title: string): string {
    if (/بيانات|data/i.test(title)) return '#007cae';
    if (/أمن|cyber/i.test(title)) return '#00338d';
    if (/دعم/i.test(title)) return '#efbb20';
    if (/تصميم|جرافيك/i.test(title)) return '#1ebbf0';
    return '#00338d';
  }

  private softFor(color: string): string {
    const map: Record<string, string> = {
      '#00338d': '#e7eefb', '#007cae': '#e2f2fb', '#efbb20': '#fbf3d9', '#1ebbf0': '#e2f7fb'
    };
    return map[color] ?? '#e7eefb';
  }
}
// Created the logic for the standalone program details page.
// Reads the program ID from the route parameters.
// Loads the selected program and its related data.
// Loads training phases and trainee information.



