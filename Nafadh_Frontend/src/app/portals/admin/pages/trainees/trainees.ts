import { Component, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { TraineeListItemDto } from '../../../../core/models/dtos';
import { TRAINEE_STATUS_LABELS } from '../../../../core/models/enums';

@Component({
  selector: 'app-admin-trainees',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './trainees.html',
  styleUrls: ['./trainees.css'],
  encapsulation: ViewEncapsulation.None
})
export class AdminTrainees implements OnInit {
  trainees = signal<TraineeListItemDto[]>([]);
  statusFilter = signal<string>('الكل');

  showImportModal = signal<boolean>(false);
  showRegisterModal = signal<boolean>(false);

  // حالة التحميل والأخطاء
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // إدارة مراحل نافذة الاستيراد
  importStep = signal<number>(1);
  selectedFileName = signal<string>('trainees_batch15.xlsx');
  
  // بيانات نموذجية للعرض في جدول المعاينة
  importedRecords = signal([
    { name: 'Nasser Al-Hinai', university: 'جامعة التقنية', major: 'علوم حاسوب', status: 'جاهز' },
    { name: 'Mariam Al-Balushi', university: 'جامعة نزوى', major: 'هندسة برمجيات', status: 'جاهز' },
    { name: 'Yousef Al-Zaabi', university: 'جامعة صحار', major: 'نظم معلومات', status: 'تحذير: بريد مكرر' }
  ]);

  newTrainee = signal({
    fullName: '',
    nationalId: '',
    phone: '',
    email: '',
    university: '',
    major: '',
    companyId: '',
    programId: '',
    batch: ''
  });

  // مصفوفات ديناميكية تُجلب من الـ API مباشرة بدلاً من البيانات الوهمية
  companies = signal<any[]>([]);
  programs = signal<any[]>([]);

  batches = signal([
    'دفعة خريف 2026',
    'دفعة صيف 2026',
    'دفعة الربيع 2026',
    'دفعة شتاء 2025'
  ]);

  statusLabels: Record<string, string> = {
    ...TRAINEE_STATUS_LABELS,
    'Late': 'تأخر متكرر',
    'Completed': 'مكتمل',
    'InTraining': 'قيد التدريب',
    'NotAssigned': 'لم يوزّع بعد'
  };

  constructor(private api: AdminApi) {}

  ngOnInit() {
    this.loadTrainees();
    this.loadDropdownData();
  }

  // 1️⃣ جلب قائمة المتدربين
  loadTrainees() {
    this.api.getTrainees().subscribe({
      next: (r: any) => {
        const list: TraineeListItemDto[] = r.items ?? r ?? [];
        this.trainees.set(list);
      },
      error: (err) => console.error('خطأ في جلب بيانات المتدربين:', err)
    });
  }

  // 2️⃣ جلب القوائم الحقيقية للشركات والبرامج لحل مشكلة الـ Foreign Key
  loadDropdownData() {
    // جلب الشركات الحقيقية من قاعدة البيانات
    if (typeof (this.api as any).getCompanies === 'function') {
      (this.api as any).getCompanies().subscribe({
        next: (res: any) => this.companies.set(res.items ?? res ?? []),
        error: (err: any) => console.error('خطأ أثناء جلب الشركات:', err)
      });
    }

    // جلب البرامج الحقيقية من قاعدة البيانات
    if (typeof (this.api as any).getPrograms === 'function') {
      (this.api as any).getPrograms().subscribe({
        next: (res: any) => this.programs.set(res.items ?? res ?? []),
        error: (err: any) => console.error('خطأ أثناء جلب البرامج:', err)
      });
    }
  }

  filtered(): any[] {
    const f = this.statusFilter();
    if (f === 'الكل') return this.trainees();
    return this.trainees().filter((t: any) => t.status === f);
  }

  labelFor(s: string): string {
    return this.statusLabels[s] ?? s;
  }

  getProgressValue(t: any): number {
    if (t.status === 'Completed' || t.status === 'مكتمل') {
      return 100;
    }
    return t.progress ?? 0;
  }

  getStatusStyle(status: string) {
    switch (status) {
      case 'Completed':
      case 'مكتمل':
        return { background: '#dcfce7', color: '#15803d' };
      case 'InTraining':
      case 'قيد التدريب':
        return { background: '#e0f2fe', color: '#0369a1' };
      case 'Late':
      case 'تأخر متكرر':
        return { background: '#fef3c7', color: '#b45309' };
      case 'NotAssigned':
      case 'لم يوزّع بعد':
      default:
        return { background: '#f1f5f9', color: '#475569' };
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFileName.set(input.files[0].name);
      this.importStep.set(2);
    }
  }

  confirmImport() {
    this.closeImportModal();
  }

  closeImportModal() {
    this.showImportModal.set(false);
    this.importStep.set(1);
  }

  // 3️⃣ حفظ بيانات المتدرب بعد معالجة المعرفات
  submitNewTrainee() {
    const form = this.newTrainee();
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    // التأكد من إرسال null إذا لم يتم اختيار القيمة لتفادي Foreign Key Error
    const payload = {
      fullName: form.fullName,
      nationalId: form.nationalId,
      phone: form.phone,
      email: form.email,
      university: form.university,
      major: form.major,
      companyId: form.companyId && form.companyId !== '' ? form.companyId : null,
      programId: form.programId && form.programId !== '' ? form.programId : null,
      batch: form.batch && form.batch !== '' ? form.batch : null
    };

    this.api.createTrainee(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.loadTrainees(); // إعادة تحميل القائمة بعد الإضافة بنجاح
        this.showRegisterModal.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('خطأ أثناء حفظ المتدرب:', err);
        this.errorMessage.set('فشل حفظ المتدرب، يرجى التأكد من اختيار شركة وبرنامج صالحين أو تركهم فارغين.');
      }
    });
  }

  private resetForm() {
    this.newTrainee.set({
      fullName: '',
      nationalId: '',
      phone: '',
      email: '',
      university: '',
      major: '',
      companyId: '',
      programId: '',
      batch: ''
    });
    this.errorMessage.set(null);
  }
}