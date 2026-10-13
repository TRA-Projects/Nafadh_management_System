import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  APPROVAL_LABELS,
  CoursePlanDetailDto,
  CoursePlanItemDto,
  CoursePlanNoteDto,
  CoursePlanStageDto,
  CoursePlanTrainerOptionDto,
  EXECUTION_LABELS,
  ITEM_TYPE_LABELS,
  PRIORITY_LABELS,
  PROGRESS_LABELS,
  PlanItemType,
  PlanPriority,
  PlanProgressStatus,
} from '../../models/company-tasks.models';
import { formatDate, formatDateTime, messageOf, toInputDate } from './plan-utils';

type ConfirmKind = 'submit' | 'withdraw' | 'delete' | 'hold' | 'resume' | 'deleteStage' | 'deleteItem';

interface ConfirmState {
  kind: ConfirmKind;
  title: string;
  text: string;
  danger: boolean;
  confirmLabel: string;
  stageId?: number;
  itemId?: number;
}

interface PlanForm {
  title: string;
  description: string;
  category: string;
  durationHours: number | null;
  startDate: string;
  endDate: string;
  trainerIds: number[];
}

interface StageForm {
  stageId: number | null;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  trainerId: number | null;
  trainerIds: number[];
}

interface ItemForm {
  itemId: number | null;
  stageId: number;
  itemType: PlanItemType;
  title: string;
  description: string;
  dueDate: string;
  priority: PlanPriority;
  trainerId: number | null;
}

interface GanttBar {
  stage: CoursePlanStageDto;
  left: number;
  width: number;
}

interface ReadinessCheck {
  ok: boolean;
  label: string;
}

/** Company Portal — one course plan: stages, tasks/projects, approval and execution tracking. */
@Component({
  selector: 'app-company-plan-workspace',
  imports: [FormsModule, RouterLink],
  templateUrl: './plan-workspace.html',
  styleUrl: './tasks.scss',
})
export class CompanyPlanWorkspace implements OnInit {
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly companyId: number = this.auth.companyId ?? 0;
  private planId = 0;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly plan = signal<CoursePlanDetailDto | null>(null);
  readonly trainers = signal<CoursePlanTrainerOptionDto[]>([]);
  readonly categories = signal<string[]>([]);
  readonly busy = signal(false);

  // ── dialogs ──
  readonly planFormOpen = signal(false);
  readonly trainerFormOpen = signal(false);
  readonly stageFormOpen = signal(false);
  readonly itemFormOpen = signal(false);
  readonly confirm = signal<ConfirmState | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');
  planForm: PlanForm = this.emptyPlanForm();
  stageForm: StageForm = this.emptyStageForm();
  itemForm: ItemForm = this.emptyItemForm(0);

  // ── notes ──
  noteText = '';
  noteTarget = 'plan'; // plan | s:<id> | i:<id>
  readonly noteSaving = signal(false);
  readonly noteError = signal('');

  readonly toast = signal<{ text: string; kind: 'ok' | 'err' } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly today = toInputDate(new Date());
  readonly priorities: PlanPriority[] = ['Low', 'Medium', 'High', 'Critical'];
  readonly progressOptions: PlanProgressStatus[] = ['NotStarted', 'InProgress', 'Completed'];
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  // ── derived ──
  readonly steps = computed(() => {
    const p = this.plan();
    if (!p) return [];

    const approvalIndex: Record<string, number> = { Draft: 0, Rejected: 0, PendingApproval: 1, Approved: 2 };
    let current = approvalIndex[p.approvalStatus];

    if (p.approvalStatus === 'Approved') {
      if (p.executionStatus === 'InProgress' || p.executionStatus === 'OnHold') current = 3;
      if (p.executionStatus === 'Completed') current = 4;
    }

    const labels = ['مسودة', 'اعتماد الهيئة', 'معتمدة', 'قيد التنفيذ', 'مكتمل'];
    return labels.map((label, i) => ({
      label,
      state: i < current ? 'done' : i === current ? 'current' : 'todo',
      rejected: i === 0 && p.approvalStatus === 'Rejected',
    }));
  });

  readonly gantt = computed<GanttBar[]>(() => {
    const p = this.plan();
    if (!p) return [];

    const start = new Date(p.startDate).getTime();
    const total = Math.max(1, new Date(p.endDate).getTime() - start);

    return p.stages.map((stage) => {
      const left = ((new Date(stage.startDate).getTime() - start) / total) * 100;
      const width = ((new Date(stage.endDate).getTime() - new Date(stage.startDate).getTime()) / total) * 100;
      return {
        stage,
        left: Math.min(100, Math.max(0, left)),
        width: Math.max(2, Math.min(100 - Math.max(0, left), width)),
      };
    });
  });

  /** Position of "today" on the plan timeline (null when outside the plan window). */
  readonly todayMarker = computed(() => {
    const p = this.plan();
    if (!p) return null;

    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();
    const now = Date.now();
    if (now < start || now > end) return null;

    return ((now - start) / Math.max(1, end - start)) * 100;
  });

  /** Mirrors the server-side submission rules so the user sees what is missing before sending. */
  readonly readiness = computed<ReadinessCheck[]>(() => {
    const p = this.plan();
    if (!p) return [];

    const checks: ReadinessCheck[] = [
      { ok: new Date(p.startDate) >= new Date(this.today + 'T00:00:00'), label: 'تاريخ بدء الكورس لم يمضِ' },
      { ok: !!p.description?.trim(), label: 'وصف الكورس مكتوب' },
      { ok: p.stages.length > 0, label: 'أُضيفت مرحلة واحدة على الأقل' },
    ];

    for (const stage of p.stages) {
      checks.push({ ok: true, label: `المرحلة «${stage.title}» يمكن إسنادها لمدرب لاحقاً` });
      checks.push({ ok: stage.items.length > 0, label: `المرحلة «${stage.title}» فيها مهمة أو مشروع` });
    }

    return checks;
  });

  readonly ready = computed(() => this.readiness().every((c) => c.ok));

  readonly noteTargets = computed(() => {
    const p = this.plan();
    if (!p) return [];

    const list: { value: string; label: string }[] = [{ value: 'plan', label: 'الكورس كاملاً' }];
    for (const stage of p.stages) {
      list.push({ value: `s:${stage.stageId}`, label: `مرحلة: ${stage.title}` });
      for (const item of stage.items) {
        list.push({ value: `i:${item.itemId}`, label: `${ITEM_TYPE_LABELS[item.itemType]}: ${item.title}` });
      }
    }
    return list;
  });

  readonly stageTrainerOptions = computed(() => this.trainers());

  // ── lifecycle ──
  ngOnInit(): void {
    this.planId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();

    this.api.getCoursePlanLookups(this.companyId).subscribe({
      next: (lookups) => {
        this.trainers.set(lookups.trainers);
        this.categories.set(lookups.categories);
      },
      error: (err) => console.error('Failed to load trainers:', err),
    });
  }

  load(): void {
    if (!this.companyId || !this.planId) {
      this.error.set('تعذر تحديد الخطة أو الشركة الحالية.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.api.getCoursePlan(this.companyId, this.planId).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load plan:', err);
        this.error.set(messageOf(err, 'تعذر تحميل الخطة.'));
        this.loading.set(false);
      },
    });
  }

  // ============================================================
  // Generic action runner (every endpoint answers with the fresh plan)
  // ============================================================

  private run(request$: Observable<CoursePlanDetailDto>, okText: string, after?: () => void): void {
    this.busy.set(true);
    request$.subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.busy.set(false);
        this.showToast(okText, 'ok');
        after?.();
      },
      error: (err) => {
        console.error('Plan action failed:', err);
        this.busy.set(false);
        this.showToast(messageOf(err, 'تعذر تنفيذ الإجراء.'), 'err');
        // The server is the source of truth: reload when the state changed under us.
        if (err?.status === 409) this.load();
      },
    });
  }

  // ============================================================
  // Confirm dialog
  // ============================================================

  ask(kind: ConfirmKind, extra: Partial<ConfirmState> = {}): void {
    const map: Record<ConfirmKind, Omit<ConfirmState, 'kind'>> = {
      submit: {
        title: 'إرسال الخطة لاعتماد الهيئة',
        text: 'بعد الإرسال لن تتمكن من تعديل الكورس أو مراحله أو مهامه حتى تقرر الهيئة، ويمكنك سحب الخطة قبل البت فيها.',
        danger: false,
        confirmLabel: 'إرسال للاعتماد',
      },
      withdraw: {
        title: 'سحب الخطة من الاعتماد',
        text: 'ستعود الخطة إلى مسودة ويمكنك تعديلها ثم إعادة إرسالها.',
        danger: false,
        confirmLabel: 'سحب الخطة',
      },
      delete: {
        title: 'حذف المسودة',
        text: 'سيتم حذف الخطة بكل مراحلها ومهامها وملاحظاتها نهائياً.',
        danger: true,
        confirmLabel: 'حذف نهائياً',
      },
      hold: {
        title: 'إيقاف الكورس مؤقتاً',
        text: 'يتوقف تحديث الحالات حتى تستأنف الكورس.',
        danger: false,
        confirmLabel: 'إيقاف مؤقت',
      },
      resume: {
        title: 'استئناف الكورس',
        text: 'سيعود الكورس إلى حالة قيد التنفيذ.',
        danger: false,
        confirmLabel: 'استئناف',
      },
      deleteStage: {
        title: 'حذف المرحلة',
        text: 'ستُحذف المرحلة مع كل مهامها ومشروعاتها وملاحظاتها.',
        danger: true,
        confirmLabel: 'حذف المرحلة',
      },
      deleteItem: {
        title: 'حذف العنصر',
        text: 'ستُحذف المهمة أو المشروع وملاحظاته.',
        danger: true,
        confirmLabel: 'حذف',
      },
    };

    this.confirm.set({ kind, ...map[kind], ...extra });
  }

  cancelConfirm(): void {
    if (!this.busy()) this.confirm.set(null);
  }

  doConfirm(): void {
    const c = this.confirm();
    if (!c) return;

    const id = this.companyId;
    const pid = this.planId;
    const close = () => this.confirm.set(null);

    switch (c.kind) {
      case 'submit':
        return this.run(this.api.submitCoursePlan(id, pid), 'أُرسلت الخطة لاعتماد الهيئة.', close);
      case 'withdraw':
        return this.run(this.api.withdrawCoursePlan(id, pid), 'سُحبت الخطة وعادت مسودة.', close);
      case 'hold':
        return this.run(this.api.holdCoursePlan(id, pid), 'أُوقف الكورس مؤقتاً.', close);
      case 'resume':
        return this.run(this.api.resumeCoursePlan(id, pid), 'استُؤنف الكورس.', close);
      case 'deleteStage':
        return this.run(this.api.deleteCoursePlanStage(id, pid, c.stageId!), 'حُذفت المرحلة.', close);
      case 'deleteItem':
        return this.run(this.api.deleteCoursePlanItem(id, pid, c.itemId!), 'حُذف العنصر.', close);
      case 'delete':
        this.busy.set(true);
        this.api.deleteCoursePlan(id, pid).subscribe({
          next: () => {
            this.busy.set(false);
            close();
            this.router.navigate(['/company/tasks']);
          },
          error: (err) => {
            this.busy.set(false);
            close();
            this.showToast(messageOf(err, 'تعذر حذف الخطة.'), 'err');
          },
        });
    }
  }

  // ============================================================
  // Plan header form
  // ============================================================

  openPlanForm(): void {
    const p = this.plan();
    if (!p) return;

    this.planForm = {
      title: p.title,
      description: p.description ?? '',
      category: p.category ?? '',
      durationHours: p.durationHours,
      startDate: toInputDate(p.startDate),
      endDate: toInputDate(p.endDate),
      trainerIds: p.trainers.map(t => t.trainerId),
    };
    this.formError.set('');
    this.planFormOpen.set(true);
  }

  openTrainerForm(): void {
    const p = this.plan();
    if (!p) return;
    this.stageFormOpen.set(false);
    this.planFormOpen.set(false);
    this.formError.set('');
    this.planForm = {
      ...this.planForm,
      trainerIds: p.trainers.map(t => t.trainerId),
    };
    this.trainerFormOpen.set(true);
  }

  savePlanTrainers(): void {
    const p = this.plan();
    if (!p) return;

    this.submitForm(
      this.api.setCoursePlanTrainers(this.companyId, this.planId, this.planForm.trainerIds),
      'تم تحديث مدربي الكورس.',
      this.trainerFormOpen
    );
  }

  savePlan(): void {
    const f = this.planForm;
    const title = f.title.trim();

    if (!title) return this.formError.set('عنوان الكورس مطلوب.');
    if (!f.durationHours || f.durationHours < 1) return this.formError.set('أدخل عدد ساعات الكورس.');
    if (!f.startDate || !f.endDate) return this.formError.set('تاريخا البدء والانتهاء مطلوبان.');
    if (f.endDate < f.startDate) return this.formError.set('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.');

    this.submitForm(
      this.api.updateCoursePlan(this.companyId, this.planId, {
        programId: this.plan()?.programId ?? null,
        trackId: null,
        price: 0,
        trainerIds: f.trainerIds,
        title,
        description: f.description.trim() || null,
        category: f.category.trim() || null,
        durationHours: f.durationHours,
        startDate: f.startDate,
        endDate: f.endDate,
      }),
      'حُفظت بيانات الكورس.',
      this.planFormOpen
    );
  }

  // ============================================================
  // Stage form
  // ============================================================

  openStageForm(stage?: CoursePlanStageDto): void {
    const p = this.plan();
    if (!p) return;

    if (stage) {
      this.stageForm = {
        stageId: stage.stageId,
        title: stage.title,
        description: stage.description ?? '',
        startDate: toInputDate(stage.startDate),
        endDate: toInputDate(stage.endDate),
        trainerId: stage.trainerId ?? null,
        trainerIds: stage.trainers?.map(t => t.trainerId) ?? (stage.trainerId ? [stage.trainerId] : []),
      };
    } else {
      // Suggest the day after the last stage (or the course start) as the new stage's start.
      const last = p.stages.length ? p.stages[p.stages.length - 1] : null;
      const suggested = last ? new Date(new Date(last.endDate).getTime() + 86400000) : new Date(p.startDate);
      const startDate = toInputDate(suggested) <= toInputDate(p.endDate) ? toInputDate(suggested) : toInputDate(p.endDate);

      this.stageForm = { stageId: null, title: '', description: '', startDate, endDate: '', trainerId: null, trainerIds: [] };
    }

    this.formError.set('');
    this.stageFormOpen.set(true);
  }

  saveStage(): void {
    const p = this.plan();
    const f = this.stageForm;
    if (!p) return;

    if (!f.title.trim()) return this.formError.set('عنوان المرحلة مطلوب.');
    if (!f.startDate || !f.endDate) return this.formError.set('تاريخا بدء وانتهاء المرحلة مطلوبان.');
    if (f.endDate < f.startDate) return this.formError.set('تاريخ انتهاء المرحلة يجب أن يكون بعد تاريخ بدئها.');
    if (f.startDate < toInputDate(p.startDate) || f.endDate > toInputDate(p.endDate)) {
      return this.formError.set(
        `تواريخ المرحلة يجب أن تقع ضمن فترة الكورس (${formatDate(p.startDate)} – ${formatDate(p.endDate)}).`
      );
    }

    if (f.stageId && !p.canEditStructure) {
      this.submitForm(
        this.api.setCoursePlanStageTrainers(this.companyId, this.planId, f.stageId, f.trainerIds),
        'تم تحديث مدربي المرحلة.',
        this.stageFormOpen
      );
      return;
    }

    const body = {
      title: f.title.trim(),
      description: f.description.trim() || null,
      startDate: f.startDate,
      endDate: f.endDate,
      trainerId: f.trainerIds[0] ?? f.trainerId,
      trainerIds: f.trainerIds,
    };

    this.submitForm(
      f.stageId
        ? this.api.updateCoursePlanStage(this.companyId, this.planId, f.stageId, body)
        : this.api.addCoursePlanStage(this.companyId, this.planId, body),
      f.stageId ? 'حُدّثت المرحلة.' : 'أُضيفت المرحلة.',
      this.stageFormOpen
    );
  }

  // ============================================================
  // Task / project form
  // ============================================================

  openItemForm(stage: CoursePlanStageDto, item?: CoursePlanItemDto, type: PlanItemType = 'Task'): void {
    if (item) {
      this.itemForm = {
        itemId: item.itemId,
        stageId: stage.stageId,
        itemType: item.itemType,
        title: item.title,
        description: item.description ?? '',
        dueDate: toInputDate(item.dueDate),
        priority: item.priority,
        trainerId: item.trainerId ?? null,
      };
    } else {
      this.itemForm = {
        ...this.emptyItemForm(stage.stageId),
        itemType: type,
        dueDate: toInputDate(stage.endDate),
        trainerId: stage.trainerId ?? null,
      };
    }

    this.formError.set('');
    this.itemFormOpen.set(true);
  }

  saveItem(): void {
    const p = this.plan();
    const f = this.itemForm;
    const stage = p?.stages.find((s) => s.stageId === f.stageId);
    if (!p || !stage) return;

    if (!f.title.trim()) return this.formError.set('العنوان مطلوب.');
    if (!f.dueDate) return this.formError.set('الموعد النهائي مطلوب.');
    if (f.dueDate < toInputDate(stage.startDate) || f.dueDate > toInputDate(stage.endDate)) {
      return this.formError.set(
        `الموعد النهائي يجب أن يقع ضمن فترة المرحلة (${formatDate(stage.startDate)} – ${formatDate(stage.endDate)}).`
      );
    }

    const body = {
      itemType: f.itemType,
      title: f.title.trim(),
      description: f.description.trim() || null,
      dueDate: f.dueDate,
      priority: f.priority,
      trainerId: f.trainerId,
    };

    const label = ITEM_TYPE_LABELS[f.itemType];

    this.submitForm(
      f.itemId
        ? this.api.updateCoursePlanItem(this.companyId, this.planId, f.itemId, body)
        : this.api.addCoursePlanItem(this.companyId, this.planId, f.stageId, body),
      f.itemId ? `حُدّثت ${label}.` : `أُضيفت ${label}.`,
      this.itemFormOpen
    );
  }

  private submitForm(
    request$: Observable<CoursePlanDetailDto>,
    okText: string,
    dialog: { set(value: boolean): void }
  ): void {
    this.saving.set(true);
    this.formError.set('');

    request$.subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.saving.set(false);
        dialog.set(false);
        this.showToast(okText, 'ok');
      },
      error: (err) => {
        console.error('Save failed:', err);
        this.saving.set(false);
        this.formError.set(messageOf(err, 'تعذر الحفظ.'));
      },
    });
  }

  closeForms(): void {
    if (this.saving()) return;
    this.planFormOpen.set(false);
    this.trainerFormOpen.set(false);
    this.stageFormOpen.set(false);
    this.itemFormOpen.set(false);
  }

  // ============================================================
  // Execution tracking
  // ============================================================

  onStageStatus(stage: CoursePlanStageDto, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as PlanProgressStatus;
    this.run(this.api.setCoursePlanStageStatus(this.companyId, this.planId, stage.stageId, status), 'حُدّثت حالة المرحلة.');
    // Re-sync the select when the server rejects the change (the plan signal keeps the old value).
    (event.target as HTMLSelectElement).value = stage.status;
  }

  onItemStatus(item: CoursePlanItemDto, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as PlanProgressStatus;
    this.run(this.api.setCoursePlanItemStatus(this.companyId, this.planId, item.itemId, status), 'حُدّثت الحالة.');
    (event.target as HTMLSelectElement).value = item.status;
  }

  // ============================================================
  // Notes
  // ============================================================

  noteFor(target: string): void {
    this.noteTarget = target;
    this.noteText = '';
    setTimeout(() => document.getElementById('notes-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  addNote(): void {
    const text = this.noteText.trim();
    if (!text) {
      this.noteError.set('اكتب نص الملاحظة.');
      return;
    }

    let stageId: number | null = null;
    let itemId: number | null = null;

    if (this.noteTarget.startsWith('s:')) stageId = Number(this.noteTarget.slice(2));
    if (this.noteTarget.startsWith('i:')) itemId = Number(this.noteTarget.slice(2));

    this.noteSaving.set(true);
    this.noteError.set('');

    this.api.addCoursePlanNote(this.companyId, this.planId, { text, stageId, itemId }).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.noteText = '';
        this.noteSaving.set(false);
        this.showToast('أُضيفت الملاحظة.', 'ok');
      },
      error: (err) => {
        this.noteSaving.set(false);
        this.noteError.set(messageOf(err, 'تعذر إضافة الملاحظة.'));
      },
    });
  }

  // ============================================================
  // Presentation helpers
  // ============================================================

  approvalLabel = (s: keyof typeof APPROVAL_LABELS) => APPROVAL_LABELS[s];
  executionLabel = (s: keyof typeof EXECUTION_LABELS) => EXECUTION_LABELS[s];
  progressLabel = (s: PlanProgressStatus) => PROGRESS_LABELS[s];
  priorityLabel = (s: PlanPriority) => PRIORITY_LABELS[s];
  typeLabel = (s: PlanItemType) => ITEM_TYPE_LABELS[s];

  trackStage(_: number, s: CoursePlanStageDto): number {
    return s.stageId;
  }

  trackItem(_: number, i: CoursePlanItemDto): number {
    return i.itemId;
  }

  trackNote(_: number, n: CoursePlanNoteDto): number {
    return n.noteId;
  }

  private showToast(text: string, kind: 'ok' | 'err'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ text, kind });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }

  private emptyPlanForm(): PlanForm {
    return { title: '', description: '', category: '', durationHours: null, startDate: '', endDate: '', trainerIds: [] };
  }

  private emptyStageForm(): StageForm {
    return { stageId: null, title: '', description: '', startDate: '', endDate: '', trainerId: null, trainerIds: [] };
  }

  private emptyItemForm(stageId: number): ItemForm {
    return {
      itemId: null,
      stageId,
      itemType: 'Task',
      title: '',
      description: '',
      dueDate: '',
      priority: 'Medium',
      trainerId: null,
    };
  }
}
