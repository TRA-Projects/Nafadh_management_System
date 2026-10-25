
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { EvaluationDto } from '../../../../core/models/dtos';

interface QuizResultRow {
  evaluationId: number;
  traineeName: string;
  enrollmentId: number;
  testName: string;
  score: number;
  evaluationDate: string;
  evaluatorName: string;
}

interface ProgramTrainee {
  enrollmentId: number;
  traineeName: string;
}

interface TraineePerformance {
  enrollmentId: number;
  traineeName: string;
  averageScore: number | null;
  evaluationCount: number;
  hasEvaluations: boolean;
}

interface EvaluatedTraineePerformance extends TraineePerformance {
  averageScore: number;
}

@Component({
  selector: 'app-company-quiz-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-results.html',
  styleUrl: './quiz-results.scss',
})
export class CompanyQuizResults implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly results = signal<QuizResultRow[]>([]);
  readonly programTitle = signal('نتائج الاختبارات');

  // جميع المتدربين المسجلين في البرنامج، بمن فيهم من لا يملكون تقييمات
  readonly programTrainees = signal<ProgramTrainee[]>([]);

  // فلاتر البحث والتاريخ
  readonly searchTerm = signal('');
  readonly fromDate = signal('');
  readonly toDate = signal('');

  // إعدادات الصفحات
  readonly pageSize = signal(5);
  readonly currentPage = signal(1);

  // عدد المتدربين في كل قائمة
  readonly topCount = signal(5);
  readonly riskCount = signal(5);

  readonly traineeCountOptions = [3, 4, 5, 6, 7, 8, 9, 10];

  // النتائج بعد تطبيق البحث والتاريخ
  readonly filteredResults = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase();
    const from = this.fromDate();
    const to = this.toDate();

    return this.results()
      .filter((result) => {
        const trainee = (result.traineeName || '').toLocaleLowerCase();
        const testName = (result.testName || '').toLocaleLowerCase();

        const matchesSearch =
          !search ||
          trainee.includes(search) ||
          testName.includes(search);

        const date = this.getDateKey(result.evaluationDate);

        const matchesFrom = !from || (!!date && date >= from);
        const matchesTo = !to || (!!date && date <= to);

        return matchesSearch && matchesFrom && matchesTo;
      })
      .sort(
        (a, b) =>
          this.getTimestamp(b.evaluationDate) -
          this.getTimestamp(a.evaluationDate)
      );
  });

  // تجميع التقييمات حسب رقم التسجيل، مع الاحتفاظ بجميع المتدربين
  readonly traineePerformance = computed<TraineePerformance[]>(() => {
    const grouped = new Map<number, QuizResultRow[]>();

    for (const result of this.results()) {
      if (
        !Number.isFinite(result.enrollmentId) ||
        !Number.isFinite(result.score)
      ) {
        continue;
      }

      const evaluations = grouped.get(result.enrollmentId) ?? [];
      evaluations.push(result);
      grouped.set(result.enrollmentId, evaluations);
    }

    return this.programTrainees().map((trainee) => {
      const evaluations = grouped.get(trainee.enrollmentId) ?? [];
      const evaluationCount = evaluations.length;

      const totalScore = evaluations.reduce(
        (sum, evaluation) => sum + evaluation.score,
        0
      );

      return {
        enrollmentId: trainee.enrollmentId,
        traineeName: trainee.traineeName,
        averageScore:
          evaluationCount > 0 ? totalScore / evaluationCount : null,
        evaluationCount,
        hasEvaluations: evaluationCount > 0,
      };
    });
  });

  // المتدربون الذين لم يحصلوا على أي تقييم
  readonly traineesWithoutResults = computed(() =>
    this.traineePerformance().filter(
      (trainee) => !trainee.hasEvaluations
    )
  );

  // أفضل المتدربين: أصحاب التقييمات فقط، مرتبين حسب أعلى متوسط
  readonly topPerformers = computed<EvaluatedTraineePerformance[]>(() =>
    this.traineePerformance()
      .filter(
        (trainee): trainee is EvaluatedTraineePerformance =>
          trainee.averageScore !== null && trainee.hasEvaluations
      )
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, this.topCount())
  );

  // المتعثرون: أصحاب التقييمات الذين يقل متوسطهم عن 60
  readonly atRiskTrainees = computed<EvaluatedTraineePerformance[]>(() =>
    this.traineePerformance()
      .filter(
        (trainee): trainee is EvaluatedTraineePerformance =>
          trainee.averageScore !== null &&
          trainee.hasEvaluations &&
          trainee.averageScore < 60
      )
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, this.riskCount())
  );

  // عدد الصفحات
  readonly totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(this.filteredResults().length / this.pageSize())
    )
  );

  // النتائج المعروضة في الصفحة الحالية
  readonly paginatedResults = computed(() => {
    const rows = this.filteredResults();
    const start = (this.currentPage() - 1) * this.pageSize();

    return rows.slice(start, start + this.pageSize());
  });

  readonly filteredCount = computed(() => this.filteredResults().length);

  // عدد المتدربين أصحاب النتائج المطابقة للفلاتر
  readonly traineeCount = computed(
    () =>
      new Set(
        this.filteredResults().map((result) => result.enrollmentId)
      ).size
  );

  // متوسط درجات التقييمات المطابقة للفلاتر
  readonly averageScore = computed(() => {
    const rows = this.filteredResults();

    if (rows.length === 0) {
      return null;
    }

    return (
      rows.reduce((sum, result) => sum + result.score, 0) / rows.length
    );
  });

  ngOnInit(): void {
    const programId = Number(this.route.snapshot.paramMap.get('id'));
    const companyId = this.auth.companyId;

    if (
      !companyId ||
      !Number.isFinite(programId) ||
      programId <= 0
    ) {
      this.error.set('تعذر تحديد البرنامج أو الشركة الحالية.');
      this.loading.set(false);
      return;
    }

    this.api
      .getCompanyProgramDetails(companyId, programId)
      .pipe(
        switchMap((details) => {
          this.programTitle.set(details.title || 'نتائج الاختبارات');

          const trainees = details.enrollments ?? [];

          // حفظ جميع التسجيلات حتى لو لم يكن لدى بعضها تقييمات
          this.programTrainees.set(
            trainees.map((trainee) => ({
              enrollmentId: Number(trainee.enrollmentId),
              traineeName:
                trainee.traineeName?.trim() || 'متدرب بدون اسم',
            }))
          );

          console.log(
            'عدد تسجيلات المتدربين في البرنامج:',
            trainees.length
          );

          if (trainees.length === 0) {
            return of([] as QuizResultRow[]);
          }

          const requests = trainees.map((trainee) =>
            this.api
              .getEvaluationsForEnrollment(trainee.enrollmentId)
              .pipe(
                map((evaluations: EvaluationDto[]) => {
                  const safeEvaluations = evaluations ?? [];

                  console.log(
                    `التسجيل ${trainee.enrollmentId}: عدد التقييمات`,
                    safeEvaluations.length
                  );

                  return safeEvaluations
                    .map((evaluation): QuizResultRow | null => {
                      const score = Number(evaluation.score);
                      const evaluationId = Number(
                        evaluation.evaluationId
                      );

                      if (
                        !Number.isFinite(score) ||
                        !Number.isFinite(evaluationId)
                      ) {
                        return null;
                      }

                      return {
                        evaluationId,
                        traineeName:
                          trainee.traineeName?.trim() ||
                          'متدرب بدون اسم',
                        enrollmentId: Number(trainee.enrollmentId),
                        testName:
                          evaluation.moduleTitle ||
                          evaluation.templateType ||
                          'تقييم',
                        score,
                        evaluationDate: evaluation.evaluationDate || '',
                        evaluatorName:
                          evaluation.evaluatorName || 'غير محدد',
                      };
                    })
                    .filter(
                      (row): row is QuizResultRow => row !== null
                    );
                }),
                catchError((err) => {
                  console.error(
                    `تعذر تحميل تقييمات التسجيل ${trainee.enrollmentId}:`,
                    err
                  );

                  return of([] as QuizResultRow[]);
                })
              )
          );

          return forkJoin(requests).pipe(
            map((groups) => groups.flat())
          );
        })
      )
      .subscribe({
        next: (rows) => {
          const sortedRows = [...rows].sort(
            (a, b) =>
              this.getTimestamp(b.evaluationDate) -
              this.getTimestamp(a.evaluationDate)
          );

          this.results.set(sortedRows);
          this.currentPage.set(1);
          this.loading.set(false);

          console.log('إجمالي نتائج الاختبارات:', sortedRows.length);
          console.log(
            'ملخص أداء المتدربين:',
            this.traineePerformance()
          );
          console.log('أفضل المتدربين:', this.topPerformers());
          console.log('المتعثرون:', this.atRiskTrainees());
          console.log(
            'المتدربون بلا نتائج:',
            this.traineesWithoutResults()
          );
        },

        error: (err) => {
          console.error(
            'تعذر تحميل تفاصيل البرنامج أو نتائجه:',
            err
          );

          this.error.set(
            'تعذر تحميل نتائج الاختبارات. يرجى المحاولة مرة أخرى.'
          );

          this.loading.set(false);
        },
      });
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  setFromDate(value: string): void {
    this.fromDate.set(value);
    this.currentPage.set(1);
  }

  setToDate(value: string): void {
    this.toDate.set(value);
    this.currentPage.set(1);
  }

  setPageSize(value: string | number): void {
    const size = Number(value);

    if ([5, 10, 20].includes(size)) {
      this.pageSize.set(size);
      this.currentPage.set(1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.currentPage.set(1);
  }

  formatDate(value: string): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('en-GB');
  }

  formatScore(score: number): string {
    return Number(score).toLocaleString('en-GB', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  getScoreClass(score: number): string {
    if (score >= 80) {
      return 'score-high';
    }

    if (score >= 60) {
      return 'score-medium';
    }

    return 'score-low';
  }

  private getTimestamp(value: string): number {
    if (!value) {
      return 0;
    }

    const timestamp = new Date(value).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private getDateKey(value: string): string {
    if (!value) {
      return '';
    }

    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);

    if (match) {
      return match[1];
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  goBack(): void {
    const programId = this.route.snapshot.paramMap.get('id');

    if (programId) {
      this.router.navigate(['/company/specialties', programId]);
    } else {
      this.router.navigate(['/company/specialties']);
    }
  }
}
