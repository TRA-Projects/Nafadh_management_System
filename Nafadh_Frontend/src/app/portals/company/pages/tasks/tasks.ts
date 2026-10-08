import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  APPROVAL_LABELS,
  CoursePlanSummaryDto,
  CoursePlansCountsDto,
  EXECUTION_LABELS,
  PlanApprovalStatus,
  CoursePlanProgramOptionDto,
} from '../../models/company-tasks.models';
import { formatDate, messageOf, toInputDate } from './plan-utils';

type PlanFilter =
  | 'all'
  | 'Draft'
  | 'PendingApproval'
  | 'Approved'
  | 'Rejected'
  | 'InProgress'
  | 'Completed';

interface PlanForm {
  programId: number | null;
  trackId: number | null;
  price: number | null;
  trainerIds: number[];
  title: string;
  description: string;
  category: string;
  durationHours: number | null;
  startDate: string;
  endDate: string;
}

/** Company Portal — Tasks & Projects: the company's course plans. */
@Component({
  selector: 'app-company-tasks',
  imports: [FormsModule],
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss',
})
export class CompanyTasks implements OnInit {
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly companyId: number = this.auth.companyId ?? 0;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly plans = signal<CoursePlanSummaryDto[]>([]);

  readonly counts = signal<CoursePlansCountsDto>({
    total: 0,
    draft: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
    inProgress: 0,
    completed: 0,
    delayedPlans: 0,
  });

  readonly filter = signal<PlanFilter>('all');
  readonly search = signal('');

  /**
   * Course Plans filtered by the selected status.
   *
   * Existing company programs are handled separately because
   * they are approved source courses and are not Course Plans.
   */
  readonly filtered = computed(() => {
    const f = this.filter();
    const term = this.search().trim().toLowerCase();

    return this.plans().filter((p) => {
      if (
        term &&
        !`${p.title} ${p.category ?? ''} ${p.description ?? ''}`
          .toLowerCase()
          .includes(term)
      ) {
        return false;
      }

      switch (f) {
        case 'all':
          return true;

        case 'Draft':
          return p.approvalStatus === 'Draft';

        case 'PendingApproval':
          return p.approvalStatus === 'PendingApproval';

        case 'Rejected':
          return p.approvalStatus === 'Rejected';

        case 'Approved':
          return (
            p.approvalStatus === 'Approved' &&
            p.executionStatus === 'NotStarted'
          );

        case 'InProgress':
          return (
            p.approvalStatus === 'Approved' &&
            p.executionStatus === 'InProgress'
          );

        case 'Completed':
          return p.executionStatus === 'Completed';

        default:
          return false;
      }
    });
  });

  /**
   * Existing company programs that should be displayed as approved courses.
   *
   * A program is excluded here if it already has a Course Plan,
   * because the Course Plan itself is the item that should be shown
   * and prevents duplicate cards for the same program.
   */
  readonly availableApprovedCourses = computed(() => {
    const plannedProgramIds = new Set(
      this.plans()
        .map((plan) => plan.programId)
        .filter(
          (id): id is number =>
            id !== null && id !== undefined
        )
    );

    const term = this.search().trim().toLowerCase();

    return this.approvedCourses().filter((course) => {
      // Do not duplicate a program that already has a Course Plan.
      if (plannedProgramIds.has(course.programId)) {
        return false;
      }

      if (!term) {
        return true;
      }

      return `${course.title} ${course.category ?? ''} ${
        course.description ?? ''
      }`
        .toLowerCase()
        .includes(term);
    });
  });

  /**
   * Existing company programs are visible only for:
   * - All
   * - Approved
   *
   * They must not appear in Draft, Pending, Rejected,
   * InProgress or Completed.
   */
  readonly filteredApprovedCourses = computed(() => {
    const f = this.filter();

    if (f !== 'all' && f !== 'Approved') {
      return [];
    }

    return this.availableApprovedCourses();
  });

  /**
   * Total number of approved source courses available to the company.
   *
   * This is used only for the dashboard/stat card.
   */
  readonly approvedCourseCount = computed(() => {
    return this.approvedCourses().length;
  });

  /**
   * Determines whether the current filter has anything to display.
   */
  readonly hasFilteredResults = computed(() => {
    return (
      this.filtered().length > 0 ||
      this.filteredApprovedCourses().length > 0
    );
  });

  // ── Create modal ──

  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly categories = signal<string[]>([]);
  readonly programs = signal<CoursePlanProgramOptionDto[]>([]);

  /**
   * Existing company programs that can be used
   * as approved course sources.
   */
  readonly approvedCourses =
    signal<CoursePlanProgramOptionDto[]>([]);

  readonly tracks = signal<
    { trackId: number; name: string }[]
  >([]);

  readonly trainers = signal<
    {
      trainerId: number;
      fullName: string;
      specialty?: string | null;
    }[]
  >([]);

  form: PlanForm = this.emptyForm();

  readonly today = toInputDate(new Date());

  readonly filters: {
    key: PlanFilter;
    label: string;
  }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'Draft', label: 'مسودات' },
    { key: 'PendingApproval', label: 'بانتظار الاعتماد' },
    { key: 'Rejected', label: 'مرفوضة' },
    { key: 'Approved', label: 'معتمدة' },
    { key: 'InProgress', label: 'قيد التنفيذ' },
    { key: 'Completed', label: 'مكتملة' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.companyId) {
      this.error.set(
        'لا يمكن تحديد الشركة الحالية من جلسة الدخول.'
      );
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    // Load Course Plans.
    this.api.getCoursePlans(this.companyId).subscribe({
      next: (overview) => {
        this.plans.set(overview.plans);
        this.counts.set(overview.counts);
        this.loading.set(false);
      },

      error: (err) => {
        console.error(
          'Failed to load course plans:',
          err
        );

        this.error.set(
          messageOf(
            err,
            'تعذر تحميل خطط الكورسات من الخادم.'
          )
        );

        this.loading.set(false);
      },
    });

    /**
     * Load company programs immediately.
     *
     * This allows the approved courses to appear
     * without opening the create modal first.
     */
    this.api.getCoursePlanLookups(this.companyId).subscribe({
      next: (lookups) => {
        this.approvedCourses.set(lookups.programs);
      },

      error: (err) => {
        console.warn(
          'Failed to load approved company courses:',
          err
        );

        this.approvedCourses.set([]);
      },
    });
  }

  // ── Create ──

  openCreate(programId: number | null = null): void {
    this.form = this.emptyForm();
    this.formError.set('');
    this.formOpen.set(true);

    this.api.getCoursePlanLookups(this.companyId).subscribe({
      next: (lookups) => {
        this.categories.set(lookups.categories);
        this.programs.set(lookups.programs);
        this.approvedCourses.set(lookups.programs);
        this.tracks.set(lookups.tracks);
        this.trainers.set(lookups.trainers);

        if (programId !== null) {
          this.onProgramChange(programId);
        }
      },

      error: () => {
        this.formError.set(
          'تعذر تحميل قائمة الكورسات والمدربين والمسارات.'
        );
      },
    });
  }

  closeForm(): void {
    if (!this.saving()) {
      this.formOpen.set(false);
    }
  }

  save(): void {
    const f = this.form;
    const title = f.title.trim();

    if (!title) {
      return this.formError.set(
        'عنوان الكورس مطلوب.'
      );
    }

    if (!f.programId && !f.trackId) {
      return this.formError.set(
        'اختر المسار عند إنشاء كورس جديد يدوياً.'
      );
    }

    if (!f.durationHours || f.durationHours < 1) {
      return this.formError.set(
        'أدخل عدد ساعات الكورس.'
      );
    }

    if (!f.startDate || !f.endDate) {
      return this.formError.set(
        'تاريخا البدء والانتهاء مطلوبان.'
      );
    }

    if (f.endDate < f.startDate) {
      return this.formError.set(
        'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.'
      );
    }

    this.saving.set(true);
    this.formError.set('');

    this.api
      .createCoursePlan(this.companyId, {
        programId: f.programId,
        trackId: f.trackId,
        price: f.price ?? 0,
        trainerIds: f.trainerIds,
        title,
        description: f.description.trim() || null,
        category: f.category.trim() || null,
        durationHours: f.durationHours,
        startDate: f.startDate,
        endDate: f.endDate,
      })
      .subscribe({
        next: (plan) => {
          this.saving.set(false);
          this.formOpen.set(false);

          this.router.navigate([
            '/company/tasks',
            plan.planId,
          ]);
        },

        error: (err) => {
          console.error(
            'Failed to create plan:',
            err
          );

          this.saving.set(false);

          this.formError.set(
            messageOf(
              err,
              'تعذر إنشاء الخطة.'
            )
          );
        },
      });
  }

  onProgramChange(programId: number | null): void {
    this.form.programId = programId;

    const program = this.programs().find(
      (p) => p.programId === programId
    );

    if (program) {
      this.form.title = program.title;
      this.form.description =
        program.description ?? '';
      this.form.category =
        program.category ?? '';
      this.form.durationHours =
        program.durationHours;
      this.form.price = program.price;
      this.form.trackId =
        program.trackId;
    } else {
      this.form.title = '';
      this.form.description = '';
      this.form.category = '';
      this.form.durationHours = null;
      this.form.price = 0;
      this.form.trackId = null;
    }
  }

  isExistingProgram(): boolean {
    return this.form.programId !== null;
  }

  open(plan: CoursePlanSummaryDto): void {
    this.router.navigate([
      '/company/tasks',
      plan.planId,
    ]);
  }

  // ── Presentation ──

  approvalLabel(
    status: PlanApprovalStatus
  ): string {
    return APPROVAL_LABELS[status];
  }

  /** Badge text for the execution phase; only relevant after approval. */
  executionLabel(
    plan: CoursePlanSummaryDto
  ): string | null {
    return plan.approvalStatus === 'Approved'
      ? EXECUTION_LABELS[plan.executionStatus]
      : null;
  }

  readonly formatDate = formatDate;

  trackPlan(
    _: number,
    plan: CoursePlanSummaryDto
  ): number {
    return plan.planId;
  }

  trackCourse(
    _: number,
    course: CoursePlanProgramOptionDto
  ): number {
    return course.programId;
  }

  setFilter(key: PlanFilter): void {
    this.filter.set(key);
  }

  onSearch(event: Event): void {
    this.search.set(
      (event.target as HTMLInputElement).value
    );
  }

  private emptyForm(): PlanForm {
    return {
      programId: null,
      trackId: null,
      price: 0,
      trainerIds: [],
      title: '',
      description: '',
      category: '',
      durationHours: null,
      startDate: '',
      endDate: '',
    };
  }
}