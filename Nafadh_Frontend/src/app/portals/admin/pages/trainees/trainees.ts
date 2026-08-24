import { Component, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule, NgClass, NgStyle } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { AdminApi } from '../../services/admin-api';
import { TRAINEE_STATUS_LABELS } from '../../../../core/models/enums';

@Component({
  selector: 'app-admin-trainees',
  standalone: true,
  imports: [CommonModule, NgClass, NgStyle, RouterLink, FormsModule],
  templateUrl: './trainees.html',
  styleUrls: ['./trainees.css'],
  encapsulation: ViewEncapsulation.None
})
export class AdminTrainees implements OnInit {
  trainees = signal<any[]>([]);
  filtered = computed(() => this.trainees());

  statusFilter = signal<string>('ALL');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);

  showImportModal = signal<boolean>(false);
  showRegisterModal = signal<boolean>(false);

  isSubmitting = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  importStep = signal<number>(1);
  selectedFileName = signal<string>('');
  importedRecords = signal<any[]>([]);

  // Signals الخاصة بأخطاء الاستيراد من Excel
  importError = signal<string | null>(null);
  invalidRows = signal<{ rowNumber: number; errors: string[] }[]>([]);

  // نموذج بيانات المتدرب الجديد
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

  // Signals الخاصة بإدارة الفالديشن
  formErrors = signal<Record<string, string>>({});
  touchedFields = signal<Record<string, boolean>>({});

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

  updateFormField(field: string, value: any) {
    if (field === 'nationalId' && value !== null && value !== '' && Number(value) < 0) {
      return;
    }

    this.newTrainee.update(current => ({
      ...current,
      [field]: value
    }));

    if (this.touchedFields()[field]) {
      this.validateSingleField(field);
    }
  }

  markFieldTouched(field: string) {
    this.touchedFields.update(t => ({ ...t, [field]: true }));
    this.validateSingleField(field);
  }

  validateSingleField(field: string) {
    const form = this.newTrainee();
    let error = '';

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const urlRegex = /^(https?:\/\/)?([\w\d]+\.)+[\w\d]+(\/.*)?$/i;

    switch (field) {
      case 'fullName':
        if (!form.fullName || !form.fullName.trim()) {
          error = 'الاسم الكامل مطلوب.';
        } else if (form.fullName.trim().length < 3) {
          error = 'الاسم يجب أن يتكون من 3 أحرف على الأقل.';
        } else if (form.fullName.trim().length > 100) {
          error = 'الاسم طويل جداً (الحد الأقصى 100 حرف).';
        }
        break;

      case 'email':
        if (!form.email || !form.email.trim()) {
          error = 'البريد الإلكتروني مطلوب.';
        } else if (!emailRegex.test(form.email.trim())) {
          error = 'يرجى إدخال بريد إلكتروني صحيح يحتوي على (@).';
        }
        break;

      case 'nationalId':
        if (form.nationalId !== null && form.nationalId !== undefined && form.nationalId !== ('' as any)) {
          const idStr = String(form.nationalId);
          if (Number(form.nationalId) <= 0) {
            error = 'رقم الهوية يجب أن يكون رقماً موجباً.';
          } else if (idStr.length < 8 || idStr.length > 14) {
            error = 'رقم الهوية يجب أن يكون بين 8 إلى 14 رقم.';
          }
        }
        break;

      case 'resumeUrl':
      case 'gitHubUrl':
      case 'linkedInUrl':
        const urlVal = form[field as keyof typeof form];
        if (urlVal && typeof urlVal === 'string' && urlVal.trim() !== '') {
          if (!urlRegex.test(urlVal.trim())) {
            error = 'يرجى إدخال رابط صحيح (URL).';
          }
        }
        break;
    }

    this.formErrors.update(errors => {
      const updated = { ...errors };
      if (error) {
        updated[field] = error;
      } else {
        delete updated[field];
      }
      return updated;
    });
  }

  validateForm(): boolean {
    const fields = ['fullName', 'email', 'nationalId', 'resumeUrl', 'gitHubUrl', 'linkedInUrl'];
    
    const allTouched: Record<string, boolean> = {};
    fields.forEach(f => allTouched[f] = true);
    this.touchedFields.set(allTouched);

    fields.forEach(f => this.validateSingleField(f));

    return Object.keys(this.formErrors()).length === 0;
  }

  loadTrainees() {
    this.isLoading.set(true);

    const statusVal = this.statusFilter();
    const statusParam = statusVal === 'ALL' ? null : Number(statusVal);

    const queryParams: Record<string, unknown> = {
      pageNumber: this.currentPage(),
      pageSize: this.pageSize()
    };

    if (statusParam !== null && !isNaN(statusParam)) {
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

  onStatusFilterChange(newStatus: string) {
    this.statusFilter.set(newStatus);
    this.currentPage.set(1);
    this.loadTrainees();
  }

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

  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
  }

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

  // --- دالة قراءة وفحص ملف الـ Excel المحدثة ---
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.importError.set(null);
    this.invalidRows.set([]);

    if (!input.files?.length) return;

    const file = input.files[0];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    const allowedExtensions = /(\.xlsx|\.xls)$/i;

    // 1. التحقق من الامتداد
    if (!allowedExtensions.exec(file.name)) {
      this.importError.set('عذراً، يرجى اختيار ملف بصيغة Excel فقط (.xlsx أو .xls).');
      input.value = '';
      return;
    }

    // 2. التحقق من الحجم
    if (file.size > maxSizeBytes) {
      this.importError.set('حجم الملف يتجاوز الحد المسموح به (5 ميجابايت).');
      input.value = '';
      return;
    }

    this.selectedFileName.set(file.name);

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          this.importError.set('ملف Excel لا يحتوي على أي أوراق عمل.');
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

        // 3. التحقق من البيانات داخل الشيت
        if (!rawData || rawData.length === 0) {
          this.importError.set('الملف المرفوع فارغ ولا يحتوي على أي بيانات.');
          return;
        }

        const validRecords: any[] = [];
        const rowErrors: { rowNumber: number; errors: string[] }[] = [];
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const seenEmails = new Set<string>();

        rawData.forEach((row, index) => {
          const rowNum = index + 2;
          const currentErrors: string[] = [];

          const fullName = (row['الاسم'] || row['FullName'] || row['الاسم الكامل'] || '').toString().trim();
          const email = (row['البريد'] || row['Email'] || row['البريد الإلكتروني'] || '').toString().trim();
          const rawId = row['رقم الهوية'] || row['NationalId'] || row['الهوية'];
          const nationalId = rawId ? Number(rawId) : null;

          if (!fullName) {
            currentErrors.push('الاسم الكامل مطلوب.');
          } else if (fullName.length < 3) {
            currentErrors.push('الاسم قصير جداً.');
          }

          if (!email) {
            currentErrors.push('البريد الإلكتروني مطلوب.');
          } else if (!emailRegex.test(email)) {
            currentErrors.push('صيغة البريد الإلكتروني غير صحيحة.');
          } else if (seenEmails.has(email.toLowerCase())) {
            currentErrors.push('البريد الإلكتروني مكرر داخل الشيت.');
          } else {
            seenEmails.add(email.toLowerCase());
          }

          if (nationalId !== null) {
            const idStr = String(nationalId);
            if (isNaN(nationalId) || nationalId <= 0) {
              currentErrors.push('رقم الهوية غير صحيح.');
            } else if (idStr.length < 8 || idStr.length > 14) {
              currentErrors.push('رقم الهوية يجب أن يكون بين 8 إلى 14 رقم.');
            }
          }

          if (currentErrors.length > 0) {
            rowErrors.push({ rowNumber: rowNum, errors: currentErrors });
          } else {
            validRecords.push({
              fullName,
              email,
              nationalId,
              university: row['الجامعة'] || row['University'] || '',
              major: row['التخصص'] || row['Major'] || '',
              academicLevel: row['المستوى الأكاديمي'] || row['AcademicLevel'] || 'غير محدد',
              skills: row['المهارات'] || row['Skills'] || '',
              resumeUrl: row['الرابط'] || row['ResumeUrl'] || '',
              gitHubUrl: row['رابط GitHub'] || row['GitHubUrl'] || '',
              linkedInUrl: row['رابط LinkedIn'] || row['LinkedInUrl'] || ''
            });
          }
        });

        if (rowErrors.length > 0) {
          this.invalidRows.set(rowErrors);
        }

        if (validRecords.length === 0) {
          this.importError.set('لم يتم العثور على أي سجل صالحة بياناته داخل الملف.');
          return;
        }

        this.importedRecords.set(validRecords);
        this.importStep.set(2);

      } catch (err) {
        console.error('خطأ أثناء قراءة ملف Excel:', err);
        this.importError.set('حدث خطأ أثناء معالجة الملف. يرجى التأكد من أن الملف غير تالف.');
      }
    };

    reader.readAsArrayBuffer(file);
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
    this.importError.set(null);
    this.invalidRows.set([]);
  }

  submitNewTrainee() {
    if (!this.validateForm()) {
      return;
    }

    const form = this.newTrainee();
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      nationalId: form.nationalId ? Number(form.nationalId) : null,
      university: form.university?.trim() || '',
      major: form.major?.trim() || '',
      academicLevel: form.academicLevel?.trim() || '',
      skills: form.skills || '',
      resumeUrl: form.resumeUrl?.trim() || '',
      gitHubUrl: form.gitHubUrl?.trim() || '',
      linkedInUrl: form.linkedInUrl?.trim() || ''
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
    this.formErrors.set({});
    this.touchedFields.set({});
    this.errorMessage.set(null);
  }
}