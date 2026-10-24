import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuillModule } from 'ngx-quill';

@Component({
  selector: 'app-notification-template-edit-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuillModule],
  templateUrl: './notification-template-edit-page.component.html',
  styleUrl: './notification-template-edit-page.component.css'
})
export class NotificationTemplateEditPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  templateId: string | null = null;
  templateName = '';
  activeTab: 'main' | 'ar' | 'en' = 'main';

  variables = ['{jobseeker_name}', '{job_title}', '{company_name}', '{operator_name}', '{portal_link}'];

  quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  // تتبّع آخر حقل تم التركيز عليه لإدراج المتغيرات فيه
  quills: Record<string, any> = {};
  private focusedKey: string | null = null;
  private focusedEl: HTMLInputElement | HTMLTextAreaElement | null = null;

  editForm = this.fb.nonNullable.group({
    code: ['ASK_TO_APPLY'],
    nameAr: ['دعوة للتقديم', Validators.required],
    nameEn: ['Ask to apply', Validators.required],
    isActive: [true],
    hasEmail: [true],
    hasSms: [true],

    // العربية
    subjectAr: ['دعوة للتقديم على {job_title}', Validators.required],
    bodyAr: [
      '<p>عزيزي {jobseeker_name}،</p>' +
      '<p>تدعوك {company_name} للتقديم على <strong>{job_title}</strong>.</p>' +
      '<p><a href="{portal_link}">عرض الفرصة</a></p>'
    ],
    smsAr: [
      'عزيزي {jobseeker_name}، تمت دعوتك للتقديم على {job_title}. {portal_link}',
      [Validators.required, Validators.maxLength(500)]
    ],

    // الإنجليزية
    subjectEn: ['You are invited to apply for {job_title}', Validators.required],
    bodyEn: [
      '<p>Dear {jobseeker_name},</p>' +
      '<p>{company_name} invites you to apply for <strong>{job_title}</strong>.</p>' +
      '<p><a href="{portal_link}">View opportunity</a></p>'
    ],
    smsEn: [
      'Dear {jobseeker_name}, you are invited to apply for {job_title}. {portal_link}',
      [Validators.required, Validators.maxLength(500)]
    ]
  });

  ngOnInit(): void {
    this.templateId = this.route.snapshot.paramMap.get('id');

    // استقبال البيانات المرسلة من الـ State إن وجدت
    const navigation = this.router.getCurrentNavigation();
    const stateData = navigation?.extras?.state?.['template'] || history.state?.['template'];

    if (stateData) {
      this.templateName = stateData.name;
      this.editForm.patchValue({
        code: stateData.code,
        nameAr: stateData.name,
        nameEn: stateData.code === 'ASK_TO_APPLY' ? 'Ask to apply' : stateData.name,
        isActive: stateData.active,
        hasEmail: stateData.email,
        hasSms: stateData.sms
      });
    }
  }

  /** طول النص لعدّاد الرسالة النصية */
  len(key: string): number {
    const v = this.editForm.get(key)?.value as string | undefined;
    return v?.length ?? 0;
  }

  onFocus(key: string, ev: Event): void {
    this.focusedKey = key;
    this.focusedEl = ev.target as HTMLInputElement | HTMLTextAreaElement;
  }

  onQuillFocus(key: string): void {
    this.focusedKey = key;
    this.focusedEl = null;
  }

  /** إدراج متغير في الحقل النشط (أو في المحتوى إن لم يوجد حقل نشط) */
  insertVariable(v: string, s: 'Ar' | 'En'): void {
    const key = this.focusedKey?.endsWith(s) ? this.focusedKey : 'body' + s;

    const quill = this.quills[key];
    if (quill) {
      const idx = quill.getSelection(true)?.index ?? quill.getLength() - 1;
      quill.insertText(idx, v, 'user');
      quill.setSelection(idx + v.length, 0);
      return;
    }

    const el = this.focusedEl;
    const ctrl = this.editForm.get(key);
    if (!el || !ctrl) return;

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    ctrl.setValue(el.value.slice(0, start) + v + el.value.slice(end));
    queueMicrotask(() => {
      el.focus();
      el.setSelectionRange(start + v.length, start + v.length);
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/external-system/notification-templates']);
  }

  preview(): void {
    // منطق معاينة القالب
  }

  save(): void {
    if (this.editForm.invalid) return;
    // منطق حفظ التعديلات وإرسالها للـ Backend
    this.goBack();
  }
}