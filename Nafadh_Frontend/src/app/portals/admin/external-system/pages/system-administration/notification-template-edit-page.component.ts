
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuillModule } from 'ngx-quill';

import { AdminSystemApiService } from '../../legacy/core/api/services/admin-system-api.service';
import type { UpdateNotificationTemplateDto } from '../../legacy/core/api/models/admin-system.models';

@Component({
  selector: 'app-notification-template-edit-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuillModule],
  templateUrl: './notification-template-edit-page.component.html',
  styleUrl: './notification-template-edit-page.component.css',
})
export class NotificationTemplateEditPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminSystemApiService);

  templateId: string | null = null;
  templateName = '';
  activeTab: 'main' | 'ar' | 'en' = 'main';

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  readonly isCreateMode =
    this.route.snapshot.data['mode'] === 'create';

  variables = [
    '{jobseeker_name}',
    '{job_title}',
    '{company_name}',
    '{operator_name}',
    '{portal_link}',
  ];

  quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  quills: Record<string, any> = {};
  private focusedKey: string | null = null;
  private focusedEl: HTMLInputElement | HTMLTextAreaElement | null =
    null;

  editForm = this.fb.nonNullable.group({
    code: [''],
    nameAr: ['', Validators.required],
    nameEn: ['', Validators.required],
    isActive: [true],
    hasEmail: [true],
    hasSms: [true],

    subjectAr: ['', Validators.required],
    bodyAr: [''],
    smsAr: ['', [Validators.required, Validators.maxLength(500)]],

    subjectEn: ['', Validators.required],
    bodyEn: [''],
    smsEn: ['', [Validators.required, Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.templateId = this.route.snapshot.paramMap.get('id');

    if (this.isCreateMode) {
      this.templateName = 'إضافة قالب إشعارات';
      return;
    }

    const stateData =
      history.state?.['template'];

    // نفضّل ActionCode المرسل من القائمة،
    // ثم نستخدم قيمة المسار إذا كانت تمثل ActionCode.
    const actionCode =
      stateData?.code || this.templateId;

    if (!actionCode) {
      this.errorMessage = 'لم يتم تحديد رمز القالب المطلوب.';
      return;
    }

    this.loadTemplate(actionCode);
  }

  private loadTemplate(actionCode: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.api.getNotificationTemplate(actionCode).subscribe({
      next: (template) => {
        this.editForm.patchValue({
          code: template.ActionCode,
          nameAr: template.LabelAr,
          nameEn: template.LabelEn,
          isActive: template.IsActive,
          hasEmail: template.EmailEnabled,
          hasSms: template.SmsEnabled,

          subjectAr: template.EmailSubjectAr ?? '',
          bodyAr: template.EmailBodyAr ?? '',
          smsAr: template.SmsBodyAr ?? '',

          subjectEn: template.EmailSubjectEn ?? '',
          bodyEn: template.EmailBodyEn ?? '',
          smsEn: template.SmsBodyEn ?? '',
        });

        this.templateName =
          template.LabelAr || template.LabelEn || template.ActionCode;

        this.templateId = template.ActionCode;
        this.isLoading = false;
      },
      error: (error: unknown) => {
        console.error('Failed to load notification template:', error);

        this.errorMessage =
          'تعذر تحميل بيانات القالب. تحققي من رمز القالب واتصال الـ Backend.';

        this.isLoading = false;
      },
    });
  }

  len(key: string): number {
    const value = this.editForm.get(key)?.value as
      | string
      | undefined;

    return value?.length ?? 0;
  }

  onFocus(key: string, event: Event): void {
    this.focusedKey = key;
    this.focusedEl = event.target as
      | HTMLInputElement
      | HTMLTextAreaElement;
  }

  onQuillFocus(key: string): void {
    this.focusedKey = key;
    this.focusedEl = null;
  }

  insertVariable(v: string, language: 'Ar' | 'En'): void {
    const key = this.focusedKey?.endsWith(language)
      ? this.focusedKey
      : 'body' + language;

    const quill = this.quills[key];

    if (quill) {
      const index =
        quill.getSelection(true)?.index ?? quill.getLength() - 1;

      quill.insertText(index, v, 'user');
      quill.setSelection(index + v.length, 0);
      return;
    }

    const element = this.focusedEl;
    const control = this.editForm.get(key);

    if (!element || !control) {
      return;
    }

    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? start;

    control.setValue(
      element.value.slice(0, start) +
        v +
        element.value.slice(end),
    );

    queueMicrotask(() => {
      element.focus();
      element.setSelectionRange(
        start + v.length,
        start + v.length,
      );
    });
  }

  goBack(): void {
    this.router.navigate([
      '/admin/external-system/notification-templates',
    ]);
  }

  preview(): void {
    const actionCode = this.editForm.controls.code.value;

    if (!actionCode) {
      this.errorMessage = 'رمز القالب غير متوفر للمعاينة.';
      return;
    }

    const locale = this.activeTab === 'en' ? 'en' : 'ar';

    this.api
      .previewNotificationTemplate(actionCode, locale)
      .subscribe({
        next: (result) => {
          // يمكن عرض النتيجة داخل نافذة معاينة مخصصة.
          console.log('Notification template preview:', result);
          this.successMessage = 'تم إنشاء المعاينة بنجاح.';
          this.errorMessage = '';
        },
        error: (error: unknown) => {
          console.error('Template preview failed:', error);
          this.errorMessage = 'تعذرت معاينة القالب.';
          this.successMessage = '';
        },
      });
  }

  save(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isCreateMode) {
      this.errorMessage =
        'إضافة القوالب غير مفعّلة بعد؛ يجب توفير endpoint للإنشاء في الـ Backend أولًا.';
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.errorMessage =
        'يرجى تعبئة الحقول المطلوبة والتحقق من طول الرسائل النصية.';
      return;
    }

    const form = this.editForm.getRawValue();
    const actionCode = form.code;

    if (!actionCode) {
      this.errorMessage = 'رمز القالب غير متوفر.';
      return;
    }

    const payload: UpdateNotificationTemplateDto = {
      LabelEn: form.nameEn,
      LabelAr: form.nameAr,
      EmailSubjectEn: form.subjectEn,
      EmailSubjectAr: form.subjectAr,
      EmailBodyEn: form.bodyEn,
      EmailBodyAr: form.bodyAr,
      SmsBodyEn: form.smsEn,
      SmsBodyAr: form.smsAr,
      IsActive: form.isActive,
      EmailEnabled: form.hasEmail,
      SmsEnabled: form.hasSms,
    };

    this.isSaving = true;

    this.api
      .updateNotificationTemplate(actionCode, payload)
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.successMessage = 'تم حفظ تعديلات القالب بنجاح.';

          this.router.navigate([
            '/admin/external-system/notification-templates',
          ]);
        },
        error: (error: unknown) => {
          console.error('Failed to update notification template:', error);

          this.isSaving = false;
          this.errorMessage =
            'تعذر حفظ التعديلات. تحققي من بيانات الطلب واستجابة الـ Backend.';
        },
      });
  }
}
