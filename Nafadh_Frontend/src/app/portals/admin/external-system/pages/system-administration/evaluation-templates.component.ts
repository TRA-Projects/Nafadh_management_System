
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
  errorMessage = '';
  successMessage = '';

  filterType: EvaluationTemplateType | '' = '';
  filterModuleId: number | null = null;
  filterStage: number | null = null;

  formVisible = false;
  editingId: number | null = null;

  form: EvaluationTemplateForm = this.emptyForm();

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
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

  deleteTemplate(template: EvaluationTemplateDto): void {
    const confirmed = window.confirm(
      `هل أنت متأكدة من حذف قالب التقييم رقم ${template.templateId}؟`
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.api.deleteEvaluationTemplate(template.templateId).subscribe({
      next: () => {
        this.successMessage = 'تم حذف القالب بنجاح.';

        if (this.details?.templateId === template.templateId) {
          this.details = null;
        }

        this.loadTemplates();
      },
      error: (error: { status?: number; error?: unknown }) => {
        if (error.status === 500) {
          this.errorMessage =
            'لا يمكن حذف هذا القالب حاليًا؛ قد تكون هناك درجات أو سجلات تقييم مرتبطة به. تم الاحتفاظ بالقالب لتجنب فقدان السجلات.';
          return;
        }

        if (error.status === 409) {
          this.errorMessage =
            'لا يمكن حذف القالب لوجود سجلات تقييم مرتبطة به.';
          return;
        }

        if (error.status === 404) {
          this.errorMessage =
            'القالب غير موجود أو تم حذفه مسبقًا. حدّثي القائمة.';
          return;
        }

        this.errorMessage =
          'تعذر حذف القالب. تحققي من اتصال الـ API وحاولي مرة أخرى.';
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
}
