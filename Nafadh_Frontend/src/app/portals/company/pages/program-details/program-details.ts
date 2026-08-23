import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyProgramDetailsDto, ProgressSummaryDto } from '../../../../core/models/dtos';

interface ProgramInfo {
  id: number;
  title: string;
  description: string;
  category: string;
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
  templateUrl: './program-details.html',
  styleUrl: './program-details.scss',
})
export class CompanyProgramDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly program = signal<ProgramInfo | null>(null);
  readonly modules = signal<any[]>([]);
  readonly trainees = signal<TraineeRow[]>([]);
  readonly supervisorCount = signal(0);
  readonly averageProgress = signal(0);

  private readonly companyId: number = this.auth.companyId ?? 0;

  get p(): ProgramInfo | null {
    return this.program();
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.companyId) {
      this.error.set('لا يمكن تحديد الشركة الحالية من جلسة الدخول.');
      this.loading.set(false);
      return;
    }

    if (!id) {
      this.error.set('معرّف البرنامج غير صالح.');
      this.loading.set(false);
      return;
    }

    this.load(id);
  }

  load(programId: number): void {
    this.loading.set(true);
    this.error.set('');

    this.api.getCompanyProgramDetails(this.companyId, programId).subscribe({
      next: (details) => this.applyDetails(details),
      error: (error) => {
        console.error('Failed to load company program details:', error);
        this.program.set(null);
        this.modules.set([]);
        this.trainees.set([]);
        this.supervisorCount.set(0);
        this.averageProgress.set(0);
        this.error.set('تعذر تحميل تفاصيل البرنامج من قاعدة البيانات.');
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/company/specialties']);
  }

  private applyDetails(details: CompanyProgramDetailsDto): void {
    const color = this.colorFor(details.title);

    this.program.set({
      id: details.programId,
      title: details.title,
      description: details.description || '—',
      category: details.category || '',
      department: details.departments?.length
        ? details.departments.join('، ')
        : 'غير محدد',
      durationWeeks: this.hoursToWeeks(details.durationHours),
      capacity: Number(details.allocatedCapacity ?? 0),
      occupied: Number(details.usedCapacity ?? details.enrollmentCount ?? 0),
      available: Number(details.remainingCapacity ?? 0),
      percent: this.clamp(Number(details.utilizationPercentage ?? 0)),
      approved: !!details.approvedForCompany && !/suspended|inactive|rejected/i.test(details.status),
      color,
      soft: this.softFor(color),
    });

    this.modules.set(details.modules ?? []);

    const rows = (details.enrollments ?? []).map((e) => ({
      enrollmentId: e.enrollmentId,
      traineeId: e.traineeId,
      name: e.traineeName || '—',
      cohort: e.batchName || '—',
      supervisor: e.supervisorName || '—',
      status: this.statusLabel(e.completionStatus),
      progress: 0,
    }));

    if (!rows.length) {
      this.finishRows([]);
      return;
    }

    forkJoin(
      rows.map((row) =>
        this.api.getProgressSummary(row.enrollmentId).pipe(
          catchError(() => of<ProgressSummaryDto | null>(null))
        )
      )
    ).subscribe({
      next: (progress) => {
        const hydrated = rows.map((row, index) => ({
          ...row,
          progress: Number(progress[index]?.progressPercentage ?? 0),
        }));
        this.finishRows(hydrated);
      },
      error: () => this.finishRows(rows),
    });
  }

  private finishRows(rows: TraineeRow[]): void {
    this.trainees.set(rows);
    this.supervisorCount.set(
      new Set(rows.map((x) => x.supervisor).filter((x) => x && x !== '—')).size
    );
    this.averageProgress.set(
      rows.length
        ? Math.round(rows.reduce((sum, x) => sum + x.progress, 0) / rows.length)
        : 0
    );
    this.loading.set(false);
  }

  private hoursToWeeks(hours: number): number {
    if (!hours || hours <= 0) return 0;
    return Math.ceil(hours / 40);
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private statusLabel(value: unknown): string {
    const s = String(value ?? '').toLowerCase();
    if (s.includes('complete')) return 'مكتمل';
    if (s.includes('drop') || s.includes('withdraw') || s.includes('suspend')) return 'متوقف';
    if (s.includes('fail')) return 'متعثر';
    return 'قيد التدريب';
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
      '#00338d': '#e7eefb',
      '#007cae': '#e2f2fb',
      '#efbb20': '#fbf3d9',
      '#1ebbf0': '#e2f7fb',
    };
    return map[color] ?? '#e7eefb';
  }
}
