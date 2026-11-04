
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  NotificationTemplateApiService,
  type NotificationTemplateDto,
  type NotificationTemplateRequest,
} from './notification-template-api.service';

@Component({
  selector: 'app-notification-template-edit-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './notification-template-edit-page.component.html',
  styleUrl: './notification-template-edit-page.component.css',
})
export class NotificationTemplateEditPageComponent
  implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(NotificationTemplateApiService);

  templateId: number | null = null;
  templateName = 'قالب إشعار';

  isLoading = false;
  isSaving = false;

  errorMessage = '';
  successMessage = '';

  // جميع البوابات المدعومة من Backend
  readonly portalOptions = [
    {
      value: 'Admin',
      label: 'بوابة الإدارة المركزية',
    },
    {
      value: 'Company',
      label: 'بوابة الشركة',
    },
    {
      value: 'Trainer',
      label: 'بوابة المدرب',
    },
    {
      value: 'Trainee',
      label: 'بوابة المتدرب',
    },
  ];

  readonly isCreateMode =
    this.route.snapshot.data['mode'] === 'create';

  readonly editForm = this.fb.nonNullable.group({
    code: [
      '',
      [
        Validators.required,
        Validators.maxLength(100),
      ],
    ],
    name: [
      '',
      [
        Validators.required,
        Validators.maxLength(200),
      ],
    ],
    portalCode: ['', Validators.required],
    subject: [
      '',
      [
        Validators.required,
        Validators.maxLength(500),
      ],
    ],
    body: ['', Validators.required],
    isActive: [true],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.templateId = idParam ? Number(idParam) : null;

    if (this.isCreateMode) {
      this.templateName = 'إضافة قالب إشعار';
      return;
    }

    if (
      !this.templateId ||
      !Number.isInteger(this.templateId)
    ) {
      this.errorMessage = 'معرّف القالب غير صحيح.';
      return;
    }

    this.loadTemplate(this.templateId);
  }

  private loadTemplate(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.api.getById(id).subscribe({
      next: (template) => {
        this.patchForm(template);

        this.templateName =
          template.name || 'تعديل قالب إشعار';

        this.isLoading = false;
      },
      error: (error: unknown) => {
        console.error(
          'Failed to load notification template:',
          error,
        );

        this.errorMessage =
          'تعذر تحميل بيانات القالب المطلوب.';

        this.isLoading = false;
      },
    });
  }

  private patchForm(template: NotificationTemplateDto): void {
    this.editForm.patchValue({
      code: template.code,
      name: template.name,
      portalCode: template.portalCode,
      subject: template.subject ?? '',
      body: template.body ?? '',
      isActive: template.isActive,
    });
  }

  goBack(): void {
    this.router.navigate([
      '/admin/external-system/notification-templates',
    ]);
  }

  save(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();

      this.errorMessage =
        'يرجى تعبئة جميع الحقول المطلوبة والتحقق من البيانات.';

      return;
    }

    const value = this.editForm.getRawValue();

    const request: NotificationTemplateRequest = {
      code: value.code.trim(),
      name: value.name.trim(),

      // نرسل القيمة المعتمدة للـ Backend وليس الاسم العربي
      portalCode: value.portalCode,

      type: 'Email',
      subject: value.subject.trim(),
      body: value.body.trim(),
      isActive: value.isActive,
    };

    this.isSaving = true;

    const operation = this.isCreateMode
      ? this.api.create(request)
      : this.templateId !== null
        ? this.api.update(this.templateId, request)
        : null;

    if (!operation) {
      this.isSaving = false;
      this.errorMessage =
        'تعذر تحديد عملية الحفظ المطلوبة.';
      return;
    }

    operation.subscribe({
      next: () => {
        this.isSaving = false;

        this.successMessage = this.isCreateMode
          ? 'تمت إضافة قالب البريد الإلكتروني بنجاح.'
          : 'تم تحديث قالب البريد الإلكتروني بنجاح.';

        this.router.navigate([
          '/admin/external-system/notification-templates',
        ]);
      },
      error: (error: unknown) => {
        console.error(
          'Failed to save notification template:',
          error,
        );

        this.isSaving = false;

        this.errorMessage =
          'تعذر حفظ القالب. تحققي من البيانات واستجابة الـ Backend.';
      },
    });
  }
}
