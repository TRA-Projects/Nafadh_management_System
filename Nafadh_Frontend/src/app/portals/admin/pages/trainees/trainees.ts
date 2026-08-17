import { Component, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { TRAINEE_STATUS_LABELS } from '../../../../core/models/enums';

@Component({
  selector: 'app-admin-trainees',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './trainees.html',
  styleUrls: ['./trainees.css'],
  encapsulation: ViewEncapsulation.None
})
export class AdminTrainees implements OnInit {
  trainees = signal<any[]>([]);
  statusFilter = signal<string>('الكل');

  showImportModal = signal<boolean>(false);
  showRegisterModal = signal<boolean>(false);

  // إدارة مراحل نافذة الاستيراد
  importStep = signal<number>(1); // 1 = اختيار الملف, 2 = المعاينة
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

  companies = signal([
    { id: '1', name: 'مؤسسة القمة للتكنولوجيا' },
    { id: '2', name: 'مجموعة التمكين الرقمي' },
    { id: '3', name: 'مؤسسة النخبة للتكنولوجيا' },
    { id: '4', name: 'شركة الريادة للبرمجيات' },
    { id: '5', name: 'شركة نفاذ للحلول الذكية' }
  ]);

  programs = signal([
    { id: '101', name: 'برنامج تطوير تطبيقات الويب (Full-Stack)' },
    { id: '102', name: 'برنامج الأمن السيبراني والحماية' },
    { id: '103', name: 'برنامج تحليل البيانات والذكاء الاصطناعي' },
    { id: '104', name: 'برنامج إدارة الشبكات والحوسبة السحابية' },
    { id: '105', name: 'برنامج تصميم واجهات المستخدم (UI/UX)' }
  ]);

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
    this.api.getTrainees().subscribe((r) => this.trainees.set(r.items ?? []));
  }

  filtered() {
    const f = this.statusFilter();
    if (f === 'الكل') return this.trainees();
    return this.trainees().filter((t) => t.status === f);
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

  // عند اختيار ملف انتقال تلقائي للمرحلة الثانية
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFileName.set(input.files[0].name);
      this.importStep.set(2);
    }
  }

  confirmImport() {
    // تنفيذ عملية الحفظ وإغلاق النافذة
    this.closeImportModal();
  }

  closeImportModal() {
    this.showImportModal.set(false);
    this.importStep.set(1); // إعادة الضبط للمرحلة الأولى عند الإغلاق
  }

  submitNewTrainee() {
    this.showRegisterModal.set(false);
    this.resetForm();
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
  }
}