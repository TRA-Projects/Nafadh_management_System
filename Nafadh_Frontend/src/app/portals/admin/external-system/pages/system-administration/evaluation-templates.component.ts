
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AdminSystemApiService,
  type EvaluationTemplateDto,
  type EvaluationTemplateDetailsDto,
  type EvaluationTemplateInputDto,
  type EvaluationTemplateType,
  type EvaluationCriterionDto,
  type EvaluationCriterionInputDto,
} from '../../legacy/core/api/services/admin-system-api.service';

interface EvaluationTemplateForm {
  type: EvaluationTemplateType;
  moduleId: number | null;
  stage: number | null;
  createdByUserId: number | null;
}

interface CriterionForm {
  name: string;
  weight: number;
  maxPoints: number;
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

  readonly types: {
    value: EvaluationTemplateType;
    label: string;
  }[] = [
    { value: 'Technical', label: 'تقييم فني' },
    { value: 'Behavioral', label: 'تقييم سلوكي' },
    { value: 'CompanyEvaluation', label: 'تقييم الشركة' },
    { value: 'Final', label: 'التقييم النهائي' },
    { value: 'TrainerPerformance', label: 'تقييم أداء المدرب' },
    { value: 'TraineePerformance', label: 'تقييم أداء المتدرب' },
  ];

  templates: EvaluationTemplateDto[] = [];
  details: EvaluationTemplateDetailsDto | null = null;

  loading = false;
  saving = false;
  savingCriterion = false;
  deletingCriterionId: number | null = null;

  errorMessage = '';
  successMessage = '';

  filterType: EvaluationTemplateType | '' = '';
  filterModuleId: number | null = null;
  filterStage: number | null = null;

  pageIndex = 0;
  pageSize = 5;

  readonly pageSizeOptions = [5, 10, 15, 20, 25, 30];
  readonly maxVisiblePages = 5;

  formVisible = false;
  editingId: number | null = null;

  form: EvaluationTemplateForm = this.emptyForm();

  // Details editor
  detailsLoading = false;
  detailsSaving = false;
  showCriterionForm = false;
  weightValidation: boolean | null = null;

  criterionForm: CriterionForm = this.emptyCriterionForm();

  ngOnInit(): void {
    this.loadTemplates();
  }

  get totalTemplates(): number {
    return this.templates.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalTemplates / this.pageSize);
  }

  get safePageIndex(): number {
    if (this.totalPages === 0) return 0;

    return Math.min(
      Math.max(this.pageIndex, 0),
      this.totalPages - 1,
    );
  }

  get paginatedTemplates(): EvaluationTemplateDto[] {
    const start = this.safePageIndex * this.pageSize;
    return this.templates.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;

    if (total <= this.maxVisiblePages) {
      return Array.from({ length: total }, (_, index) => index);
    }

    let start = Math.max(
      0,
      this.safePageIndex - Math.floor(this.maxVisiblePages / 2),
    );

    start = Math.min(start, total - this.maxVisiblePages);

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

  get totalWeight(): number {
    return this.details?.criteria.reduce(
      (total, item) => total + Number(item.weight || 0),
      0,
    ) ?? 0;
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
        this.errorMessage = 'تعذر تحميل قوالب التقييم.';
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
    this.form = this.emptyForm();
    this.formVisible = true;
    this.details = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditForm(template: EvaluationTemplateDto): void {
    this.editingId = template.templateId;

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
  }

  saveTemplate(): void {
    const createdByUserId = this.form.createdByUserId;

    if (
      !this.form.type ||
      createdByUserId == null ||
      !Number.isInteger(createdByUserId) ||
      createdByUserId <= 0
    ) {
      this.errorMessage = 'يرجى إدخال بيانات القالب بصورة صحيحة.';
      return;
    }

    const payload: EvaluationTemplateInputDto = {
      type: this.form.type,
      moduleId: this.form.moduleId,
      stage: this.form.stage,
      createdByUserId,
    };

    const id = this.editingId;
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = id == null
      ? this.api.createEvaluationTemplate(payload)
      : this.api.updateEvaluationTemplate(id, payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.formVisible = false;
        this.editingId = null;

        this.successMessage = id == null
          ? 'تم إنشاء القالب بنجاح.'
          : 'تم تحديث القالب بنجاح.';

        this.loadTemplates();
      },
      error: () => {
        this.saving = false;
        this.errorMessage = 'تعذر حفظ القالب.';
      },
    });
  }

  // Open editable template details
  viewDetails(template: EvaluationTemplateDto): void {
    this.details = null;
    this.detailsLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.showCriterionForm = false;
    this.weightValidation = null;

    this.api.getEvaluationTemplateById(template.templateId).subscribe({
      next: (result) => {
        this.details = {
          ...result,
          criteria: result.criteria ?? [],
        };

        this.detailsLoading = false;
      },
      error: () => {
        this.detailsLoading = false;
        this.errorMessage = 'تعذر تحميل تفاصيل قالب التقييم.';
      },
    });
  }

  // Save template information from details editor
  saveDetails(): void {
    if (!this.details) return;

    const payload: EvaluationTemplateInputDto = {
      type: this.details.type,
      moduleId: this.details.moduleId,
      stage: this.details.stage,
      createdByUserId: this.details.createdByUserId,
    };

    this.detailsSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.updateEvaluationTemplate(
      this.details.templateId,
      payload,
    ).subscribe({
      next: () => {
        this.detailsSaving = false;
        this.successMessage = 'تم تحديث بيانات قالب التقييم بنجاح.';
        this.loadTemplates();
      },
      error: () => {
        this.detailsSaving = false;
        this.errorMessage = 'تعذر تحديث بيانات القالب.';
      },
    });
  }

  // Add criterion form
  openCriterionForm(): void {
    this.criterionForm = this.emptyCriterionForm();
    this.showCriterionForm = true;
    this.errorMessage = '';
  }

  cancelCriterionForm(): void {
    this.showCriterionForm = false;
  }

  // Create criterion
  addCriterion(): void {
    if (!this.details) return;

    const name = this.criterionForm.name.trim();
    const weight = Number(this.criterionForm.weight);
    const maxPoints = Number(this.criterionForm.maxPoints);

    if (
      !name ||
      name.length > 100 ||
      !Number.isFinite(weight) ||
      weight < 0 ||
      weight > 100 ||
      !Number.isFinite(maxPoints) ||
      maxPoints < 0
    ) {
      this.errorMessage = 'تحققي من اسم المعيار والوزن والدرجة القصوى.';
      return;
    }

    const payload: EvaluationCriterionInputDto = {
      templateId: this.details.templateId,
      name,
      weight,
      maxPoints,
    };

    this.savingCriterion = true;
    this.errorMessage = '';

    this.api.createEvaluationCriterion(payload).subscribe({
      next: () => {
        this.savingCriterion = false;
        this.showCriterionForm = false;
        this.successMessage = 'تمت إضافة معيار التقييم.';
        this.reloadDetails();
      },
      error: () => {
        this.savingCriterion = false;
        this.errorMessage = 'تعذرت إضافة معيار التقييم.';
      },
    });
  }

  // Update existing criterion
  saveCriterion(criterion: EvaluationCriterionDto): void {
    if (!this.details) return;

    const name = criterion.name.trim();

    if (
      !name ||
      name.length > 100 ||
      !Number.isFinite(Number(criterion.weight)) ||
      Number(criterion.weight) < 0 ||
      Number(criterion.weight) > 100 ||
      !Number.isFinite(Number(criterion.maxPoints)) ||
      Number(criterion.maxPoints) < 0
    ) {
      this.errorMessage = 'تحققي من بيانات المعيار قبل الحفظ.';
      return;
    }

    const payload: EvaluationCriterionInputDto = {
      templateId: this.details.templateId,
      name,
      weight: Number(criterion.weight),
      maxPoints: Number(criterion.maxPoints),
    };

    this.savingCriterion = true;
    this.errorMessage = '';

    this.api.updateEvaluationCriterion(
      criterion.criteriaId,
      payload,
    ).subscribe({
      next: () => {
        this.savingCriterion = false;
        this.successMessage = 'تم تحديث المعيار بنجاح.';
        this.reloadDetails();
      },
      error: () => {
        this.savingCriterion = false;
        this.errorMessage = 'تعذر تحديث المعيار.';
      },
    });
  }

  // Delete criterion
  deleteCriterion(criterion: EvaluationCriterionDto): void {
    const confirmed = window.confirm(
      `هل تريدين حذف المعيار "${criterion.name}"؟`,
    );

    if (!confirmed) return;

    this.deletingCriterionId = criterion.criteriaId;
    this.errorMessage = '';

    this.api.deleteEvaluationCriterion(
      criterion.criteriaId,
    ).subscribe({
      next: () => {
        this.deletingCriterionId = null;
        this.successMessage = 'تم حذف المعيار بنجاح.';
        this.reloadDetails();
      },
      error: () => {
        this.deletingCriterionId = null;
        this.errorMessage = 'تعذر حذف المعيار.';
      },
    });
  }

  // Check if criteria weights equal 100
  checkWeights(): void {
    if (!this.details) return;

    this.api.checkEvaluationWeights(
      this.details.templateId,
    ).subscribe({
      next: (result) => {
        this.weightValidation = result.isValid;
      },
      error: () => {
        this.errorMessage = 'تعذر التحقق من أوزان المعايير.';
      },
    });
  }

  private reloadDetails(): void {
    if (!this.details) return;

    const id = this.details.templateId;

    this.api.getEvaluationTemplateById(id).subscribe({
      next: (result) => {
        this.details = {
          ...result,
          criteria: result.criteria ?? [],
        };
      },
      error: () => {
        this.errorMessage = 'تم تنفيذ العملية، لكن تعذر تحديث التفاصيل.';
      },
    });
  }

  typeLabel(type: EvaluationTemplateType | string): string {
    return this.types.find((item) => item.value === type)?.label ?? type;
  }

  private emptyForm(): EvaluationTemplateForm {
    return {
      type: 'Technical',
      moduleId: null,
      stage: null,
      createdByUserId: null,
    };
  }

  private emptyCriterionForm(): CriterionForm {
    return {
      name: '',
      weight: 0,
      maxPoints: 0,
    };
  }
}