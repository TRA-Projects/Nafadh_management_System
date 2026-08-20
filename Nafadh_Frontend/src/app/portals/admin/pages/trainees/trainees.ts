import { Component, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { AdminApi } from '../../services/admin-api';
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
  // البيانات الرئيسية
  trainees = signal<any[]>([]);

  // خاصية محسوبة لتوافق ملف الـ HTML وتفادي خطأ TS2339
  filtered = computed(() => this.trainees());
  
  // متغيرات الفلترة والترقيم
  statusFilter = signal<string>('ALL'); // ALL | 0 | 1 | 2
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);

  // النوافذ المنبثقة
  showImportModal = signal<boolean>(false);
  showRegisterModal = signal<boolean>(false);

  // حالات التحميل والأخطاء
  isSubmitting = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // استيراد ملفات Excel
  importStep = signal<number>(1);
  selectedFileName = signal<string>('');
  importedRecords = signal<any[]>([]);

  // نموذج تسجيل متدرب جديد
  newTrainee = signal({
    fullName: '',
    email: '',
    nationalId: null as number | null,
    university: '',
    major: '',
    academicLevel: '',
    skills: '',
    resumeUrl: '',
    gitHubUrl: '',
    linkedInUrl: ''
  });

  companies = signal<any[]>([]);

  statusLabels: Record<string | number, string> = {
    ...TRAINEE_STATUS_LABELS,
    0: 'لم يوزّع بعد',
    1: 'قيد التدريب',
    2: 'مكتمل',
    'NotAssigned': 'لم يوزّع بعد',
    'InTraining': 'قيد التدريب',
    'Completed': 'مكتمل'
  };

  constructor(
    private api: AdminApi,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTrainees();
    this.loadDropdownData();
  }

  // تحديث حقول النموذج عند التغيير عبر Signal
  updateFormField(field: string, value: any) {
    this.newTrainee.update(current => ({
      ...current,
      [field]: value
    }));
  }

  // 1️⃣ جلب قائمة المتدربين مع تطبيق الفلترة والـ Pagination
  loadTrainees() {
    this.isLoading.set(true);

    const statusVal = this.statusFilter();
    const statusParam = statusVal === 'ALL' ? null : Number(statusVal);

    // تجميع المعاملات في كائن واحد يتوافق مع تعريف getTrainees في AdminApi
    const queryParams: Record<string, unknown> = {
      pageNumber: this.currentPage(),
      pageSize: this.pageSize()
    };

    if (statusParam !== null) {
      queryParams['status'] = statusParam;
    }

    this.api.getTrainees(queryParams).subscribe({
      next: (res: any) => {
        let rawList: any[] = [];
        let total = 0;

        if (res && Array.isArray(res.items)) {
          rawList = res.items;
          total = res.totalCount ?? rawList.length;
        } else if (Array.isArray(res)) {
          rawList = res;
          total = res.length;
        }

        const mappedList = rawList.map(item => ({
          traineeId: item.traineeId || item.id || item.TraineeId || item.Id,
          fullName: item.fullName || item.name || item.FullName || item.Name || 'متدرب',
          email: item.email || item.Email || item.userEmail || '',
          university: item.university || item.University || item.college || '',
          major: item.major || item.Major || item.specialization || '',
          status: item.status ?? item.Status ?? 0,
          progress: item.progress ?? item.Progress ?? 0
        }));

        this.trainees.set(mappedList);
        this.totalCount.set(total);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('خطأ أثناء جلب بيانات المتدربين:', err);
        this.isLoading.set(false);
      }
    });
  }

  // تغيير الفلترة وإعادة الضبط للصفحة الأولى
  onStatusFilterChange(newStatus: string) {
    this.statusFilter.set(newStatus);
    this.currentPage.set(1);
    this.loadTrainees();
  }

  // أزرار التنقل بين الصفحات
  nextPage() {
    if (this.currentPage() * this.pageSize() < this.totalCount()) {
      this.currentPage.update(p => p + 1);
      this.loadTrainees();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadTrainees();
    }
  }

  // حساب إجمالي عدد الصفحات
  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
  }

  // الانتقال لصفحة تفاصيل المتدرب
  viewTraineeDetails(traineeId: number) {
    if (traineeId) {
      this.router.navigate(['/admin/trainees', traineeId]);
    }
  }

  loadDropdownData() {
    this.api.getCompanies().subscribe({
      next: (res: any) => this.companies.set(Array.isArray(res) ? res : res?.items ?? []),
      error: (err: any) => console.error('خطأ أثناء جلب الشركات:', err)
    });
  }

  labelFor(s: any): string {
    return this.statusLabels[s] ?? s;
  }

  getProgressValue(t: any): number {
    if (t.status === 2 || t.status === 'Completed' || t.status === 'مكتمل') {
      return 100;
    }
    return t.progress ?? 0;
  }

  getStatusStyle(status: any) {
    switch (status) {
      case 2:
      case 'Completed':
      case 'مكتمل':
        return { background: '#dcfce7', color: '#15803d' };
      case 1:
      case 'InTraining':
      case 'قيد التدريب':
        return { background: '#e0f2fe', color: '#0369a1' };
      case 0:
      case 'NotAssigned':
      case 'لم يوزّع بعد':
      default:
        return { background: '#f1f5f9', color: '#475569' };
    }
  }

  // قراءة واستيراد ملفات Excel
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      this.selectedFileName.set(file.name);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

          const mappedRecords = rawData.map(row => ({
            fullName: row['الاسم'] || row['FullName'] || row['الاسم الكامل'] || '',
            email: row['البريد'] || row['Email'] || row['البريد الإلكتروني'] || '',
            nationalId: Number(row['رقم الهوية'] || row['NationalId'] || row['الهوية'] || 0),
            university: row['الجامعة'] || row['University'] || '',
            major: row['التخصص'] || row['Major'] || '',
            academicLevel: row['المستوى الأكاديمي'] || row['AcademicLevel'] || 'غير محدد',
            skills: row['المهارات'] || row['Skills'] || '',
            resumeUrl: row['الرابط'] || row['ResumeUrl'] || '',
            gitHubUrl: row['رابط GitHub'] || row['GitHubUrl'] || '',
            linkedInUrl: row['رابط LinkedIn'] || row['LinkedInUrl'] || ''
          }));

          this.importedRecords.set(mappedRecords);
          this.importStep.set(2);
        } catch (err) {
          console.error('خطأ أثناء قراءة ملف Excel:', err);
          alert('تعذر قراءة الملف. يرجى التأكد من اختيار ملف Excel صالحة صيغته.');
        }
      };

      reader.readAsArrayBuffer(file);
    }
  }

  confirmImport() {
    const records = this.importedRecords();
    if (!records || records.length === 0) return;

    this.isSubmitting.set(true);

    this.api.importTrainees(records).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        alert('تم استيراد المتدربين بنجاح!');
        this.loadTrainees();
        this.closeImportModal();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('خطأ أثناء الاستيراد:', err);
        alert('فشل استيراد السجلات.');
      }
    });
  }

  closeImportModal() {
    this.showImportModal.set(false);
    this.importStep.set(1);
    this.importedRecords.set([]);
    this.selectedFileName.set('');
  }

  submitNewTrainee() {
    const form = this.newTrainee();
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      fullName: form.fullName,
      email: form.email,
      nationalId: Number(form.nationalId),
      university: form.university,
      major: form.major,
      academicLevel: form.academicLevel,
      skills: form.skills,
      resumeUrl: form.resumeUrl,
      gitHubUrl: form.gitHubUrl,
      linkedInUrl: form.linkedInUrl
    };

    this.api.createTrainee(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.loadTrainees();
        this.showRegisterModal.set(false);
        this.resetForm();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('خطأ أثناء حفظ المتدرب:', err);
        this.errorMessage.set('فشل حفظ المتدرب.');
      }
    });
  }

  private resetForm() {
    this.newTrainee.set({
      fullName: '',
      email: '',
      nationalId: null,
      university: '',
      major: '',
      academicLevel: '',
      skills: '',
      resumeUrl: '',
      gitHubUrl: '',
      linkedInUrl: ''
    });
    this.errorMessage.set(null);
  }
}