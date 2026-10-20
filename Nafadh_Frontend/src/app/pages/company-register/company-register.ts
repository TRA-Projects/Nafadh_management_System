import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { RegistrationApi } from '../../portals/company/services/registration-api';
import { describeRegistrationError } from '../../portals/company/services/registration-messages';
import { CompanyRegistrationRequest } from '../../portals/company/models/company-registration.models';

// صفحة عامة (بدون توكن): تسجيل شركة جديدة. تنتظر اعتماد الهيئة قبل أول دخول.
@Component({
  selector: 'app-company-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './company-register.html',
  styleUrls: ['./company-register.scss'],
})
export class CompanyRegister {
  private fb = inject(FormBuilder);
  private api = inject(RegistrationApi);
  private route = inject(ActivatedRoute);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly workFields = [
    'تقنية المعلومات', 'التصنيع والصناعة', 'النفط والغاز والطاقة', 'المالية والمصرفية',
    'الاستشارات والأعمال', 'الإنشاءات والعقار', 'الصحة', 'التعليم', 'الخدمات اللوجستية',
  ];
  form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.maxLength(150)]],
    commercialRegister: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{4,50}$/)]],
    workField: ['', [Validators.required, Validators.maxLength(100)]],
    address: ['', [Validators.required, Validators.maxLength(250)]],
    phone: ['', [Validators.required, Validators.pattern(/^(\+968\s?)?\d{8}$/)]],
    capacity: [0, [Validators.min(0), Validators.max(100000)]],
    contactName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
  });

  loading = signal(false);
  submitted = signal(false);
  formError = signal<string | null>(null);
  submittedEmail = signal('');

  constructor() {
    // عند "إعادة التقديم" من صفحة الدخول يصل الإيميل في الرابط
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) this.form.controls.email.setValue(email);

    // نمسح خطأ السيرفر عن الحقل لما تعدّل المستخدمة قيمته
    (Object.values(this.form.controls) as AbstractControl[]).forEach((c) =>
      c.valueChanges.subscribe(() => {
        if (c.hasError('server')) {
          const { server, ...rest } = c.errors ?? {};
          c.setErrors(Object.keys(rest).length ? rest : null);
        }
      })
    );
  }

  /** يرجع نص الخطأ للحقل إن كان تم لمسه أو حاولت المستخدمة الإرسال */
  errorOf(name: keyof typeof this.form.controls): string | null {
    const c: AbstractControl = this.form.controls[name];
    if (!c.invalid || !(c.touched || c.dirty)) return null;
    if (c.hasError('server')) return c.getError('server');
    if (c.hasError('required')) return 'هذا الحقل مطلوب';
    if (c.hasError('email')) return 'اكتب بريدًا إلكترونيًا صحيحًا';
    if (c.hasError('maxlength')) return 'النص أطول من المسموح';
    if (c.hasError('min') || c.hasError('max')) return 'اكتب عددًا بين 0 و 100000';
    if (c.hasError('pattern')) {
      if (name === 'phone') return 'رقم الهاتف 8 أرقام، ويمكن أن يبدأ بـ 968+';
      if (name === 'commercialRegister') return 'أحرف إنجليزية وأرقام وشرطة فقط، 4 خانات على الأقل';
    }
    return 'القيمة غير صحيحة';
  }

  submit(): void {
    if (this.loading()) return;
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // نركّز على أول حقل فيه خطأ
      queueMicrotask(() =>
        this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      );
      return;
    }

    const v = this.form.getRawValue();
    const payload: CompanyRegistrationRequest = {
      companyName: v.companyName.trim(),
      commercialRegister: v.commercialRegister.trim(),
      workField: v.workField.trim(),
      address: v.address.trim(),
      capacity: Number(v.capacity) || 0,
      phone: v.phone.replace(/\s/g, ''),
      contactName: v.contactName.trim(),
      email: v.email.trim().toLowerCase(),
    };

    this.loading.set(true);
    this.api
      .register(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.submittedEmail.set(payload.email);
          this.submitted.set(true);
          window.scrollTo({ top: 0 });
        },
        error: (err) => {
          const { text, fieldErrors } = describeRegistrationError(err);
          Object.entries(fieldErrors).forEach(([field, msg]) => {
            const c = this.form.get(field);
            if (c) {
              c.setErrors({ server: msg });
              c.markAsTouched();
            }
          });
          this.formError.set(text || (Object.keys(fieldErrors).length ? 'راجع الحقول المحددة أدناه.' : null));
          queueMicrotask(() =>
            this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
          );
        },
      });
  }
}
