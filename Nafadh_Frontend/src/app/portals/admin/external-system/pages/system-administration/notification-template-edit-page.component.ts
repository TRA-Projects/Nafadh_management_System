import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-notification-template-edit-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  editForm = this.fb.nonNullable.group({
    code: ['ASK_TO_APPLY'],
    nameAr: ['دعوة للتقديم', Validators.required],
    nameEn: ['Ask to apply', Validators.required],
    isActive: [true],
    hasEmail: [true],
    hasSms: [true]
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