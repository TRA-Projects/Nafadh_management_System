
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AdminSystemApiService,
  type EvaluationTemplateDto,
  type EvaluationTemplateDetailsDto,
  type EvaluationTemplateInputDto,
  type EvaluationTemplateType,
} from '../../legacy/core/api/services/admin-system-api.service';

interface EvaluationTemplateForm {
  type: EvaluationTemplateType;
  moduleId: number | null;
  stage: number | null;
  createdByUserId: number | null;
}

@Component({
  selector: 'app-evaluation-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evaluation-templates.component.html',
  styleUrl: './evaluation-templates.component.css',
})
export class EvaluationTemplatesComponent implements OnInit {
  private readonly api = inject(AdminSystemApiService);

  // Only values supported by the current Management Backend enum may be submitted.
  private readonly supportedTypes: EvaluationTemplateType[] = [
    'Technical', 'Behavioral', 'CompanyEvaluation', 'Final', 'TrainerPerformance'
  ];
  private readonly historicalLabels: Record<string, string> = {
    Technical: 'تقييم فني', Behavioral: 'تقييم سلوكي',
    CompanyEvaluation: 'تقييم الشركة', Final: 'التقييم النهائي',
    TrainerPerformance: 'تقييم أداء المدرب', TraineePerformance: 'تقييم أداء المتدرب'
  };
  types: { value: EvaluationTemplateType; label: string }[] = [];
  // Filters also include historical/inactive types; creating new templates only uses active types.
  filterTypes: { value: EvaluationTemplateType; label: string }[] = [];
  private originalEditType: EvaluationTemplateType | null = null;
  typesLoading = true;
  typesError = '';

  private loadEvaluationTypes(): void {
    this.typesLoading = true;
    this.typesError = '';
    // Read ALL rows (including inactive) for labels on existing templates and filtering.
    // Read active rows separately for new-template choices and validation.
    this.api.getValues('NFD_EVL_TYPE', true).subscribe({
      next: (rows) => {
        const historical = rows
          .filter((row) => this.supportedTypes.includes(String(row.id) as EvaluationTemplateType))
          .map((row) => ({
            value: String(row.id) as EvaluationTemplateType,
            label: row.label_ar || row.label_en || String(row.id)
          }));
        for (const row of historical) this.historicalLabels[row.value] = row.label;
        this.filterTypes = historical;
      },
      error: () => {
        // Keep active-only options working even if the historical list is temporarily unavailable.
        this.filterTypes = [];
      }
    });
    this.api.getValues('NFD_EVL_TYPE').subscribe({
      next: (rows) => {
        this.types = rows
          .filter((row) => this.supportedTypes.includes(String(row.id) as EvaluationTemplateType))
          .map((row) => ({
            value: String(row.id) as EvaluationTemplateType,
            label: row.label_ar || row.label_en || String(row.id)
          }));
        this.typesLoading = false;
        if (this.types.length === 0) {
          this.typesError = 'لا توجد أنواع تقييم مفعّلة ومتوافقة مع النظام.';
        }
      },
      error: () => {
        this.types = [];
        this.typesLoading = false;
        this.typesError = 'تعذّر تحميل أنواع التقييم من قاعدة الثوابت.';
      }
    });
  }

  templates: EvaluationTemplateDto[] = [];
  details: EvaluationTemplateDetailsDto | null = null;

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  filterType: EvaluationTemplateType | '' = '';
  filterModuleId: number | null = null;
  filterStage: number | null = null;

  // Pagination
  pageIndex = 0;
  pageSize = 5;

  readonly pageSizeOptions = [5, 10, 15, 20, 25, 30];
  readonly maxVisiblePages = 5;

  formVisible = false;
  editingId: number | null = null;

  form: EvaluationTemplateForm = this.emptyForm();

  ngOnInit(): void {
    this.loadEvaluationTypes();
    this.loadTemplates();
  }

  get totalTemplates(): number {
    return this.templates.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalTemplates / this.pageSize);
  }

  get safePageIndex(): number {
    if (this.totalPages === 0) {
      return 0;
    }

    return Math.min(
      Math.max(this.pageIndex, 0),
      this.totalPages - 1,
    );
  }

  get paginatedTemplates(): EvaluationTemplateDto[] {
    const start = this.safePageIndex * this.pageSize;

    return this.templates.slice(start, start + this.pageSize);
  }

  // Show at most five page numbers at a time.
  get pageNumbers(): number[] {
    const total = this.totalPages;

    if (total <= this.maxVisiblePages) {
      return Array.from({ length: total }, (_, index) => index);
    }

    let start = Math.max(
      0,
      this.safePageIndex - Math.floor(this.maxVisiblePages / 2),
    );

    start = Math.min(
      start,
      total - this.maxVisiblePages,
    );

    return Array.from(
      { length: this.maxVisiblePages },
      (_, index) => start + index,
    );
  }

  getEndIndex(): number {
    return Math.min(
      (this.safePageIndex + 1) * this.pageSize,
      this.totalTemplates,
    );
  }

  canPrev(): boolean {
    return this.safePageIndex > 0;
  }

  canNext(): boolean {
    return this.safePageIndex < this.totalPages - 1;
  }

  prevPage(): void {
    if (this.canPrev()) {
      this.pageIndex = this.safePageIndex - 1;
    }
  }

  nextPage(): void {
    if (this.canNext()) {
      this.pageIndex = this.safePageIndex + 1;
    }
  }

  setPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.pageIndex = page;
    }
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const size = Number(select.value);

    if (this.pageSizeOptions.includes(size)) {
      this.pageSize = size;
      this.pageIndex = 0;
    }
  }

  loadTemplates(): void {
    this.pageIndex = 0;
    this.loading = true;
    this.errorMessage = '';

    this.api.getEvaluationTemplates({
      type: this.filterType || undefined,
      moduleId: this.filterModuleId ?? undefined,
      stage: this.filterStage ?? undefined,
    }).subscribe({
      next: (rows) => {
        this.templates = rows;
        this.loading = false;
      },
      error: () => {
        this.errorMessage =
          'تعذر تحميل قوالب التقييم. تحققي من اتصال الـ API.';
        this.loading = false;
      },
    });
  }

  resetFilters(): void {
    this.filterType = '';
    this.filterModuleId = null;
    this.filterStage = null;
    this.loadTemplates();
  }

  openCreateForm(): void {
    this.editingId = null;
    this.originalEditType = null;
    if (this.typesLoading || this.types.length === 0) {
      this.errorMessage = this.typesError || 'أنواع التقييم غير جاهزة.';
      return;
    }
    this.form = { ...this.emptyForm(), type: this.types[0].value };
    this.formVisible = true;
    this.details = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditForm(template: EvaluationTemplateDto): void {
    this.editingId = template.templateId;
    this.originalEditType = template.type;

    this.form = {
      type: template.type,
      moduleId: template.moduleId,
      stage: template.stage,
      createdByUserId: template.createdByUserId,
    };

    this.formVisible = true;
    this.details = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelForm(): void {
    this.formVisible = false;
    this.editingId = null;
    this.originalEditType = null;
  }

  isEditingInactiveOriginalType(): boolean {
    return this.editingId !== null && this.form.type === this.originalEditType &&
      !this.types.some(item => item.value === this.form.type);
  }

  saveTemplate(): void {
    // Updating non-type fields on a historical template is allowed by the Backend.
    // Switching to an inactive type or creating one is not.
    if (!this.types.some((item) => item.value === this.form.type) &&
        !this.isEditingInactiveOriginalType()) {
      this.errorMessage = 'نوع التقييم غير مفعّل أو غير مدعوم حاليًا.';
      return;
    }
    const createdByUserId = this.form.createdByUserId;

    if (
      !this.form.type ||
      createdByUserId == null ||
      !Number.isInteger(createdByUserId) ||
      createdByUserId <= 0
    ) {
      this.errorMessage =
        'يرجى اختيار نوع التقييم وإدخال رقم المستخدم المنشئ بصورة صحيحة.';
      return;
    }

    const payload: EvaluationTemplateInputDto = {
      type: this.form.type,
      moduleId: this.form.moduleId,
      stage: this.form.stage,
      createdByUserId,
    };

    const editingId = this.editingId;
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = editingId == null
      ? this.api.createEvaluationTemplate(payload)
      : this.api.updateEvaluationTemplate(editingId, payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.formVisible = false;
        this.editingId = null;
        this.originalEditType = null;

        this.successMessage = editingId == null
          ? 'تم إنشاء القالب بنجاح.'
          : 'تم تحديث القالب بنجاح.';

        this.loadTemplates();
      },
      error: () => {
        this.saving = false;
        this.errorMessage =
          'تعذر حفظ القالب. تحققي من البيانات واستجابة الـ Backend.';
      },
    });
  }

  viewDetails(template: EvaluationTemplateDto): void {
    this.errorMessage = '';
    this.details = null;

    this.api.getEvaluationTemplateById(template.templateId).subscribe({
      next: (result) => {
        this.details = result;
      },
      error: () => {
        this.errorMessage = 'تعذر تحميل تفاصيل القالب.';
      },
    });
  }

  typeLabel(type: EvaluationTemplateType | string): string {
    // The admin-edited label is authoritative even if the type is now inactive.
    return this.historicalLabels[type] ?? this.types.find((item) => item.value === type)?.label ?? type;
  }

  private emptyForm(): EvaluationTemplateForm {
    return {
      type: 'Technical',
      moduleId: null,
      stage: null,
      createdByUserId: null,
    };
  }
}
