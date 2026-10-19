
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { CompanyApi } from '../../services/company-api';

import {
  EnrollmentDto,
  EvaluationDto,
  ProgressSummaryDto
} from '../../../../core/models/dtos';

import { NfdIcon } from '../../../../shared/ui/icon/icon';

const STATUS_LABELS: Record<string, string> = {
  InProgress: 'نشط',
  Completed: 'مكتمل',
  Dropped: 'موقوف',
  Failed: 'متعثر'
};

const STATUS_CHIP_CLASS: Record<string, string> = {
  InProgress: 'ok',
  Completed: 'info',
  Dropped: 'bad',
  Failed: 'warn'
};

const PHASE_DEFS = [
  { n: 1, name: 'الاندماج والتأسيس', weight: 15, weeks: 'الأسابيع 1–8' },
  { n: 2, name: 'بناء المهارات', weight: 25, weeks: 'الأسابيع 9–16' },
  { n: 3, name: 'التطبيق العملي', weight: 30, weeks: 'الأسابيع 17–24' },
  { n: 4, name: 'المشروع النهائي والتقييم', weight: 30, weeks: 'الأسابيع 25–32' }
];

const AVATAR_PALETTE = [
  '#00338d',
  '#007cae',
  '#00bbc2',
  '#efbb20',
  '#1ebbf0',
  '#000692',
  '#5b6fb8',
  '#475569'
];

const DONUT_R = 65;
const DONUT_CIRC = 2 * Math.PI * DONUT_R;

@Component({
  selector: 'app-company-trainee-progress',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NfdIcon],
  templateUrl: './trainee-progress.html',
  styleUrls: ['./trainee-progress.scss']
})
export class CompanyTraineeProgress implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CompanyApi);
  private readonly http = inject(HttpClient);

  enrollment = signal<EnrollmentDto | null>(null);
  evaluations = signal<EvaluationDto[]>([]);
  progressSummary = signal<ProgressSummaryDto | null>(null);

  phaseDefs = PHASE_DEFS;
  donutCirc = DONUT_CIRC;

  activeTab = 1;

  searchTerm = '';
  selectedBatch = '';
  selectedProgram = '';
  selectedStatus = '';
  selectedDate = '';

  ngOnInit(): void {
    const enrollmentId = Number(
      this.route.snapshot.paramMap.get('id')
    );

    if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
      console.error('رقم التسجيل الموجود في الرابط غير صالح.');
      return;
    }

    this.loadData(enrollmentId);
  }

  loadData(enrollmentId: number): void {
    if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
      return;
    }

    // تحميل بيانات التسجيل والاسم الصحيح من الـ API
    this.api.getEnrollment(enrollmentId).subscribe({
      next: (data) => {
        this.enrollment.set(data);
      },
      error: (error) => {
        console.error('تعذر تحميل بيانات التسجيل:', error);
        this.enrollment.set(null);
      }
    });

    // تحميل التقييمات المرتبطة بالتسجيل نفسه
    this.api.getEvaluationsForEnrollment(enrollmentId).subscribe({
      next: (data) => {
        this.evaluations.set(data ?? []);
      },
      error: (error) => {
        console.error('تعذر تحميل تقييمات المتدرب:', error);
        this.evaluations.set([]);
      }
    });

    // تحميل ملخص التقدم المرتبط بالتسجيل نفسه
    this.api.getProgressSummary(enrollmentId).subscribe({
      next: (data) => {
        this.progressSummary.set(data);
      },
      error: (error) => {
        console.error('تعذر تحميل ملخص التقدم:', error);
        this.progressSummary.set(null);
      }
    });
  }

  onFileSelected(event: Event, traineeId: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!Number.isInteger(traineeId) || traineeId <= 0) {
      alert('رقم المتدرب غير صالح.');
      input.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.http
      .post(
        `/api/Enrollment/trainee/${traineeId}/upload-image`,
        formData
      )
      .subscribe({
        next: () => {
          alert('تم تحديث الصورة الشخصية بنجاح!');

          const enrollmentId = Number(
            this.route.snapshot.paramMap.get('id')
          );

          if (Number.isInteger(enrollmentId) && enrollmentId > 0) {
            this.loadData(enrollmentId);
          }

          input.value = '';
        },
        error: (error) => {
          console.error('خطأ أثناء رفع الصورة:', error);
          alert('حدث خطأ أثناء رفع الصورة الشخصية.');
          input.value = '';
        }
      });
  }

  selectPhase(phaseNum: number): void {
    this.activeTab = phaseNum;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedBatch = '';
    this.selectedProgram = '';
    this.selectedStatus = '';
    this.selectedDate = '';
  }

  phases = computed(() => {
    const evals = this.evaluations();

    return this.phaseDefs.map((def, index) => {
      const ev = evals[index] ?? null;

      const status: 'done' | 'cur' | 'todo' = ev
        ? 'done'
        : index === evals.length
          ? 'cur'
          : 'todo';

      return { def, ev, status };
    });
  });

  getSelectedPhaseData() {
    return (
      this.phases().find((phase) => phase.def.n === this.activeTab) ??
      null
    );
  }

  avgScore = computed(() => {
    const scored = this.evaluations().filter(
      (evaluation) => evaluation.score > 0
    );

    if (!scored.length) {
      return 0;
    }

    return Math.round(
      scored.reduce((total, evaluation) => total + evaluation.score, 0) /
        scored.length
    );
  });

  donutOffset = computed(
    () => this.donutCirc * (1 - this.avgScore() / 100)
  );

  currentPhaseLabel = computed(() => {
    const current = this.phases().find(
      (phase) => phase.status === 'cur'
    );

    return current ? `الفترة ${current.def.n}` : 'مكتملة';
  });

  phasesDoneCount = computed(
    () => this.phases().filter((phase) => phase.status === 'done').length
  );

  pendingCount = computed(
    () => Math.max(0, 4 - this.evaluations().length)
  );

  statusLabel(status?: string): string {
    return status ? STATUS_LABELS[status] ?? status : '—';
  }

  statusChipClass(status?: string): string {
    return status ? STATUS_CHIP_CLASS[status] ?? 'gray' : 'gray';
  }

  initials(name?: string): string {
    if (!name) {
      return '؟';
    }

    const parts = name
      .replace(' بن ', ' ')
      .replace(' بنت ', ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return parts
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('');
  }

  avatarColor(name?: string): string {
    if (!name) {
      return AVATAR_PALETTE[0];
    }

    let hash = 0;

    for (let index = 0; index < name.length; index++) {
      hash =
        (hash + name.charCodeAt(index)) % AVATAR_PALETTE.length;
    }

    return AVATAR_PALETTE[hash];
  }

  ensureUrl(url?: string): string | null {
    if (!url?.trim()) {
      return null;
    }

    const value = url.trim();

    return /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;
  }

  criterionPct(score: number, maxPoints: number): number {
    return maxPoints
      ? Math.round((score / maxPoints) * 100)
      : 0;
  }

  padId(id: number): string {
    return String(id).padStart(4, '0');
  }
}
