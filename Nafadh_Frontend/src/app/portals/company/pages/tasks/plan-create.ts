import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { from, switchMap, concatMap, toArray, map } from 'rxjs';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CoursePlanProgramOptionDto } from '../../models/company-tasks.models';
import { messageOf } from './plan-utils';

interface StageDraft {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}

/** Company prepares a training plan for one Admin-assigned program/batch. */
@Component({
  selector: 'app-company-plan-create',
  imports: [FormsModule, RouterLink],
  templateUrl: './plan-create.html',
  styleUrl: './plan-create.scss',
})
export class CompanyPlanCreate implements OnInit {
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly companyId = this.auth.companyId ?? 0;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly programs = signal<CoursePlanProgramOptionDto[]>([]);
  readonly selectedBatchId = signal<number | null>(null);
  readonly partialPlanId = signal<number | null>(null);
  readonly selected = computed(() =>
    this.programs().find(p => p.batchId === this.selectedBatchId()) ?? null
  );

  description = '';
  stages: StageDraft[] = [];

  ngOnInit(): void {
    if (!this.companyId) {
      this.error.set('لا يمكن تحديد الشركة الحالية من جلسة الدخول.');
      this.loading.set(false);
      return;
    }

    this.api.getCoursePlanLookups(this.companyId).subscribe({
      next: lookups => {
        this.programs.set(lookups.programs);
        const batchId = Number(this.route.snapshot.queryParamMap.get('batchId'));
        const id = Number(this.route.snapshot.queryParamMap.get('programId'));
        const programMatches = lookups.programs.filter(p => p.programId === id && id > 0);
        const initial = lookups.programs.find(p => batchId > 0 && p.batchId === batchId)
          ?? (batchId <= 0 && programMatches.length === 1 ? programMatches[0] : null)
          ?? (batchId <= 0 && id <= 0 && lookups.programs.length === 1 ? lookups.programs[0] : null);
        if (initial) this.selectProgram(initial.batchId);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(messageOf(err, 'تعذر تحميل البرامج والدفعات المسندة إلى الشركة.'));
        this.loading.set(false);
      },
    });
  }

  selectProgram(batchId: number | null): void {
    if (this.saving() || this.partialPlanId()) return;
    const program = this.programs().find(p => p.batchId === batchId);
    this.selectedBatchId.set(program?.batchId ?? null);
    this.description = program?.description ?? '';
    this.stages = [];
    this.error.set('');
  }

  addStage(): void {
    const program = this.selected();
    if (!program) return;
    this.stages.push({
      title: '',
      description: '',
      startDate: this.dateOnly(program.startDate),
      endDate: this.dateOnly(program.endDate),
    });
  }

  removeStage(index: number): void {
    if (!this.saving()) this.stages.splice(index, 1);
  }

  dateOnly(value: string): string { return value?.slice(0, 10) ?? ''; }

  save(): void {
    if (this.saving() || this.partialPlanId()) return;
    const program = this.selected();
    if (!program) return this.error.set('اختاري البرنامج والدفعة المسندين من الإدارة.');
    if (!this.description.trim()) return this.error.set('أدخلي وصف الخطة وأهدافها.');
    if (!this.stages.length) return this.error.set('أضيفي مرحلة واحدة على الأقل.');

    const start = this.dateOnly(program.startDate);
    const end = this.dateOnly(program.endDate);
    for (const [index, stage] of this.stages.entries()) {
      if (!stage.title.trim()) return this.error.set(`أدخلي عنوان المرحلة رقم ${index + 1}.`);
      if (!stage.startDate || !stage.endDate || stage.startDate < start ||
          stage.endDate > end || stage.endDate < stage.startDate) {
        return this.error.set(`تواريخ المرحلة رقم ${index + 1} يجب أن تقع ضمن مدة الدفعة المسندة.`);
      }
    }

    this.saving.set(true);
    this.error.set('');
    const stages = this.stages.map(stage => ({
      title: stage.title.trim(), description: stage.description.trim() || null,
      startDate: stage.startDate, endDate: stage.endDate,
      trainerId: null, trainerIds: [],
    }));

    this.api.createCoursePlan(this.companyId, {
      programId: program.programId,
      batchId: program.batchId,
      trackId: null,
      trainerIds: [],
      title: program.title,
      description: this.description.trim(),
      category: program.category ?? null,
      durationHours: program.durationHours,
      startDate: start,
      endDate: end,
    }).pipe(
      switchMap(plan => {
        this.partialPlanId.set(plan.planId);
        return from(stages).pipe(
          concatMap(stage => this.api.addCoursePlanStage(this.companyId, plan.planId, stage)),
          toArray(),
          map(() => plan.planId),
        );
      }),
    ).subscribe({
      next: planId => this.router.navigate(['/company/tasks', planId]),
      error: err => {
        this.saving.set(false);
        this.error.set(this.partialPlanId()
          ? 'تم حفظ المسودة، لكن لم تكتمل إضافة كل المراحل. افتحي المسودة وأكملي المراحل قبل إرسالها. ' + messageOf(err, '')
          : messageOf(err, 'تعذر إنشاء مسودة الخطة.'));
      },
    });
  }
}
