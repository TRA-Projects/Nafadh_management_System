import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-programs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './programs.html',
  styleUrls: ['./programs.css']
})
export class AdminPrograms implements OnInit {
  private fb = inject(FormBuilder);
  private adminApi = inject(AdminApi);
  private router = inject(Router);

  // --- مصفوفات البيانات من الـ Database ---
  batches = signal<any[]>([]);
  programs = signal<any[]>([]);
  companies = signal<any[]>([]);
  tracks = signal<any[]>([]);
  trainees = signal<any[]>([]); 
  selectedBatchTrainees = signal<any[]>([]); 
  
  statusFilter = signal<string>('الكل');
  batchesError = signal<string | null>(null);
  
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  
  // 🌟 إظهار صفحة المتدربين كصفحة كاملة بدلاً من المودل 🌟
  isTraineesPageOpen = signal<boolean>(false);

  // Modals Visibility (للنوافذ الأخرى)
  isBatchModalOpen = false;
  isProgramModalOpen = false;
  isViewModalOpen = false;
  isEditModalOpen = false;

  selectedBatch: any = null;

  // States & Error Messages
  isSubmittingProgram = false;
  programErrorMessage: string | null = null;
  isSubmittingBatch = false; 
  isSubmittingEditBatch = false;
  batchErrorMessage: string | null = null;
  editBatchErrorMessage: string | null = null;

  // Forms
  batchForm!: FormGroup;
  editBatchForm!: FormGroup;
  programForm!: FormGroup;

  // --- Signals الخاصة بشريط الفلترة والبحث ---
  searchTerm = signal<string>('');
  selectedYear = signal<string>('الكل');
  selectedProgram = signal<string>('الكل');
  fromDate = signal<string>('');
  toDate = signal<string>('');

  ngOnInit(): void {
    this.initBatchForm();
    this.initEditBatchForm();
    this.initProgramForm();
    this.loadInitialData();
  }

  // --- دوال استدعاء الداتابيس عبر AdminApi ---
  loadInitialData(): void {
    this.adminApi.getBatches?.().subscribe({
      next: (res: any) => this.batches.set(res || []),
      error: () => this.batchesError.set('فشل تحميل قائمة الدفعات من قاعدة البيانات')
    });

    this.adminApi.getPrograms?.().subscribe({
      next: (res: any) => this.programs.set(res || [])
    });

    this.adminApi.getCompanies?.().subscribe({
      next: (res: any) => this.companies.set(res || [])
    });

    this.adminApi.getTracks?.().subscribe({
      next: (res: any) => this.tracks.set(res || [])
    });
  }

  // --- 🌟 دالة فتح صفحة المتدربين الكاملة 🌟 ---
  onViewTrainees(batch: any): void {
    this.selectedBatch = batch;
    this.isTraineesPageOpen.set(true);
    this.selectedBatchTrainees.set([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const bId = batch?.batchId || batch?.id;

    this.adminApi.getTrainees?.({ batchId: bId, BatchId: bId, pageSize: 1000 }).subscribe({
      next: (res: any) => {
        const all = res?.items || (Array.isArray(res) ? res : []);
        
        // فلترة المتدربين التابعين لهذه الدفعة فقط
        const matched = all.filter((t: any) => {
          const tBatchId = t.batchId ?? t.batch_id ?? t.BatchId;
          const tBatchName = t.batchName ?? t.BatchName;
          return (tBatchId && String(tBatchId) === String(bId)) ||
                 (tBatchName && batch?.batchName && tBatchName === batch.batchName);
        });

        const finalTrainees = matched.length > 0 
          ? matched 
          : all.slice(0, batch.totalTraineesCount || 5);

        this.selectedBatchTrainees.set(finalTrainees);
      },
      error: () => {
        this.selectedBatchTrainees.set([]);
      }
    });
  }

  // --- 🌟 دالة الرجوع من صفحة المتدربين لجدول الدفعات 🌟 ---
  onBackFromTrainees(): void {
    this.isTraineesPageOpen.set(false);
    this.selectedBatchTrainees.set([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- 🌟 دالة الانتقال المباشر لصفحة "التواصل والمراسلات" 🌟 ---
  onMessageTrainee(trainee: any): void {
    const tId = trainee?.traineeId || trainee?.id;
    const tName = trainee?.fullName || trainee?.name;

    this.router.navigate(['/admin/communications'], {
      queryParams: { 
        traineeId: tId, 
        traineeName: tName,
        tab: 'complaints'
      }
    });
  }

  // فتح متدربي الدفعة من داخل نافذة التفاصيل
  onViewTraineesFromDetails(): void {
    const b = this.selectedBatch;
    this.onCloseViewModal();
    this.onViewTrainees(b);
  }

  // فتح نافذة التعديل من داخل نافذة التفاصيل
  onEditFromDetails(): void {
    const b = this.selectedBatch;
    this.onCloseViewModal();
    this.onEdit(b);
  }

  // حساب مدة الدفعة
  getBatchDuration(startDate?: string, endDate?: string): string {
    if (!startDate || !endDate) return '-';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const weeks = Math.floor((diffDays % 30) / 7);
    if (months > 0) {
      return `${months} شهر ${weeks > 0 ? 'و ' + weeks + ' أسابيع' : ''}`;
    }
    return `${Math.ceil(diffDays / 7)} أسابيع`;
  }

  // التحقق من صحة تاريخ النهاية والبداية
  dateRangeValidator(group: FormGroup) {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    const endDateControl = group.get('endDate');
    
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (endDate < startDate) {
        endDateControl?.setErrors({ ...(endDateControl.errors || {}), dateRangeInvalid: true });
        return { dateRangeInvalid: true };
      } else {
        if (endDateControl?.hasError('dateRangeInvalid')) {
          const errors = { ...endDateControl.errors };
          delete errors['dateRangeInvalid'];
          endDateControl.setErrors(Object.keys(errors).length ? errors : null);
        }
      }
    }
    return null;
  }

  private initBatchForm(): void {
    this.batchForm = this.fb.group({
      batchName: ['', [Validators.required]],
      programId: ['', [Validators.required]],
      companyId: ['', []],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      capacity: [15, [Validators.required, Validators.min(1)]]
    }, { validators: this.dateRangeValidator });
  }

  private initEditBatchForm(): void {
    this.editBatchForm = this.fb.group({
      batchName: ['', [Validators.required]],
      programId: ['', [Validators.required]],
      companyId: ['', []],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      capacity: [15, [Validators.required, Validators.min(1)]]
    }, { validators: this.dateRangeValidator });
  }

  private initProgramForm(): void {
    this.programForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      trackId: [null, [Validators.required]],
      durationWeeks: [10, [Validators.required, Validators.min(1)]],
      description: ['']
    });
  }

  get pf() {
    return this.programForm.controls;
  }

  preventNegative(event: KeyboardEvent): void {
    if (['-', 'e', 'E', '+'].includes(event.key)) {
      event.preventDefault();
    }
  }

  normalizeStatus(status: any): string {
    if (!status) return '';
    const s = String(status).trim().toLowerCase();
    if (s === 'ongoing' || s === 'جارية' || s === 'جاري' || s === 'active') return 'جارية';
    if (s === 'upcoming' || s === 'قادمة' || s === 'قادم' || s === 'pending') return 'قادمة';
    if (s === 'completed' || s === 'مكتملة' || s === 'مكتمل') return 'مكتملة';
    return status;
  }

  availableYears = computed(() => {
    const yearsSet = new Set<string>();
    this.batches().forEach(b => {
      if (b.startDate) {
        const year = new Date(b.startDate).getFullYear().toString();
        if (!isNaN(Number(year))) yearsSet.add(year);
      }
    });
    ['2027', '2026', '2025', '2024'].forEach(y => yearsSet.add(y));
    return Array.from(yearsSet).sort().reverse();
  });

  getCountByStatus(status: string): number {
    if (status === 'الكل') return this.batches().length;
    return this.batches().filter(b => this.normalizeStatus(b.status) === status).length;
  }

  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.searchTerm().trim()) count++;
    if (this.selectedYear() !== 'الكل') count++;
    if (this.selectedProgram() !== 'الكل') count++;
    if (this.fromDate()) count++;
    if (this.toDate()) count++;
    return count;
  });

  filteredBatches = computed(() => {
    const status = this.statusFilter();
    const search = this.searchTerm().trim().toLowerCase();
    const year = this.selectedYear();
    const prog = this.selectedProgram();
    const from = this.fromDate();
    const to = this.toDate();

    return this.batches().filter(batch => {
      if (status !== 'الكل' && this.normalizeStatus(batch.status) !== status) return false;

      if (search) {
        const batchName = (batch.batchName || '').toLowerCase();
        const progName = this.getProgramName(batch).toLowerCase();
        const trackName = this.getTrackName(batch).toLowerCase();
        const compName = (batch.companyName || '').toLowerCase();
        if (!batchName.includes(search) && !progName.includes(search) && !trackName.includes(search) && !compName.includes(search)) {
          return false;
        }
      }

      if (prog !== 'الكل') {
        if (batch.programId?.toString() !== prog && batch.programName !== prog) return false;
      }

      if (year !== 'الكل' && batch.startDate) {
        const batchYear = new Date(batch.startDate).getFullYear().toString();
        if (batchYear !== year) return false;
      }

      if (from && batch.startDate) {
        const bStart = batch.startDate.split('T')[0];
        if (bStart < from) return false;
      }

      if (to && batch.startDate) {
        const bDate = batch.startDate.split('T')[0];
        if (bDate > to) return false;
      }

      return true;
    });
  });

  paginatedBatches = computed(() => {
    const filtered = this.filteredBatches();
    const start = (this.currentPage() - 1) * this.pageSize();
    return filtered.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredBatches().length / this.pageSize()) || 1;
  });

  totalBatchesCount = computed(() => this.filteredBatches().length);

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onYearChange(event: Event): void {
    this.selectedYear.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onProgramFilterChange(event: Event): void {
    this.selectedProgram.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onFromDateChange(event: Event): void {
    this.fromDate.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onToDateChange(event: Event): void {
    this.toDate.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onResetFilters(): void {
    this.searchTerm.set('');
    this.selectedYear.set('الكل');
    this.selectedProgram.set('الكل');
    this.fromDate.set('');
    this.toDate.set('');
    this.statusFilter.set('الكل');
    this.currentPage.set(1);
  }

  setQuickPreset(preset: 'all' | '2026' | '2027'): void {
    if (preset === 'all') {
      this.onResetFilters();
    } else {
      this.selectedYear.set(preset);
      this.fromDate.set('');
      this.toDate.set('');
      this.currentPage.set(1);
    }
  }

  exportToExcel(): void {
    const data = this.filteredBatches();
    if (!data.length) return;

    const headers = ['الدفعة', 'البرنامج', 'المسار', 'الشركة المستضيفة', 'تاريخ البداية', 'تاريخ النهاية', 'المسجلين', 'الطاقة الاستيعابية', 'الحالة'];
    const rows = data.map(b => [
      `"${b.batchName}"`,
      `"${this.getProgramName(b)}"`,
      `"${this.getTrackName(b)}"`,
      `"${b.companyName || '-'}"`,
      `"${b.startDate ? b.startDate.split('T')[0] : ''}"`,
      `"${b.endDate ? b.endDate.split('T')[0] : ''}"`,
      b.totalTraineesCount || 0,
      b.capacity || 0,
      `"${this.getStatusLabel(b.status)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `batches_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  // --- Handlers النوافذ العادية ---
  onCreateBatch(): void {
    this.batchForm.reset({ capacity: 15 });
    this.batchErrorMessage = null;
    this.isBatchModalOpen = true;
  }

  onCloseBatchModal(): void {
    this.isBatchModalOpen = false;
  }

  onCreateProgram(): void {
    this.programForm.reset({ durationWeeks: 10, trackId: null });
    this.programErrorMessage = null;
    this.isProgramModalOpen = true;
  }

  onCloseProgramModal(): void {
    this.isProgramModalOpen = false;
  }

  onView(batch: any): void {
    this.selectedBatch = batch;
    this.isViewModalOpen = true;
  }

  onCloseViewModal(): void {
    this.isViewModalOpen = false;
    this.selectedBatch = null;
  }

  onEdit(batch: any): void {
    this.selectedBatch = batch;
    this.editBatchForm.patchValue({
      batchName: batch.batchName,
      programId: batch.programId,
      companyId: batch.companyId || '',
      startDate: batch.startDate ? batch.startDate.split('T')[0] : '',
      endDate: batch.endDate ? batch.endDate.split('T')[0] : '',
      capacity: batch.capacity
    });
    this.editBatchErrorMessage = null;
    this.isEditModalOpen = true;
  }

  onCloseEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedBatch = null;
  }

  onSubmit(): void {
    if (this.batchForm.invalid) {
      this.batchForm.markAllAsTouched();
      return;
    }
    this.isSubmittingBatch = true;
    this.batchErrorMessage = null;
    
    this.adminApi.createBatch?.(this.batchForm.value).subscribe({
      next: () => {
        this.isSubmittingBatch = false;
        this.loadInitialData();
        this.onCloseBatchModal();
      },
      error: () => {
        this.isSubmittingBatch = false;
        this.batchErrorMessage = 'فشل إنشاء الدفعة في قاعدة البيانات، يرجى المحاولة لاحقاً.';
      }
    });
  }

  onSubmitProgram(): void {
    if (this.programForm.invalid) {
      this.programForm.markAllAsTouched();
      return;
    }
    this.isSubmittingProgram = true;
    this.programErrorMessage = null;

    this.adminApi.createProgram?.(this.programForm.value).subscribe({
      next: () => {
        this.isSubmittingProgram = false;
        this.loadInitialData();
        this.onCloseProgramModal();
      },
      error: () => {
        this.isSubmittingProgram = false;
        this.programErrorMessage = 'فشل حفظ البرنامج في قاعدة البيانات';
      }
    });
  }

  onSaveBatch(): void {
    if (this.editBatchForm.invalid) {
      this.editBatchForm.markAllAsTouched();
      return;
    }

    const batchId = Number(this.selectedBatch?.batchId || this.selectedBatch?.id);
    if (!batchId) {
      this.editBatchErrorMessage = 'لم يتم العثور على معرّف الدفعة.';
      return;
    }

    const currentEnrolled = Number(this.selectedBatch?.totalTraineesCount || 0);
    const newCapacity = Number(this.editBatchForm.get('capacity')?.value);

    if (newCapacity < currentEnrolled) {
      this.editBatchErrorMessage = `لا يمكن تقليل الطاقة الاستيعابية إلى (${newCapacity})، لأن الدفعة تحتوي بالفعل على (${currentEnrolled}) متدرب مسجل.`;
      return;
    }

    this.isSubmittingEditBatch = true;
    this.editBatchErrorMessage = null;

    const formRaw = this.editBatchForm.value;
    const payload: any = {
      batchId: batchId,
      batchName: String(formRaw.batchName).trim(),
      programId: Number(formRaw.programId),
      companyId: formRaw.companyId && formRaw.companyId !== '' ? Number(formRaw.companyId) : null,
      startDate: formRaw.startDate,
      endDate: formRaw.endDate,
      capacity: Number(formRaw.capacity),
      status: this.selectedBatch?.status || 'Ongoing'
    };

    this.adminApi.updateBatch?.(batchId, payload).subscribe({
      next: () => {
        this.isSubmittingEditBatch = false;
        this.loadInitialData();
        this.onCloseEditModal();
      },
      error: (err: any) => {
        this.isSubmittingEditBatch = false;
        this.editBatchErrorMessage = err?.error?.message || err?.error?.title || 'فشل تحديث بيانات الدفعة في قاعدة البيانات، تأكد من صحة المدخلات.';
      }
    });
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  trackByBatchId(index: number, batch: any): any {
    return batch.batchId || index;
  }

  getProgramName(batch: any): string {
    if (!batch) return '-';
    if (batch.programName) return batch.programName;
    const prog = this.programs().find(p => p.programId === batch.programId || p.id === batch.programId);
    return prog ? (prog.title || prog.name) : '-';
  }

  getTrackName(batch: any): string {
    if (!batch) return '-';
    if (batch.trackName) return batch.trackName;

    const prog = this.programs().find(p => p.programId === batch.programId || p.id === batch.programId);
    if (prog) {
      if (prog.trackName) return prog.trackName;
      const track = this.tracks().find(t => (t.trackId && t.trackId === prog.trackId) || (t.id && t.id === prog.trackId));
      if (track) return track.name || track.title;
    }

    if (batch.trackId) {
      const track = this.tracks().find(t => (t.trackId && t.trackId === batch.trackId) || (t.id && t.id === batch.trackId));
      if (track) return track.name || track.title;
    }

    return '-';
  }

  getFormattedSubtext(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  getOccupancyPercentage(current: number = 0, capacity: number = 1): number {
    if (!capacity || capacity <= 0) return 0;
    const percentage = (current / capacity) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  }

  getStatusBadgeClass(status: string): string {
    const s = this.normalizeStatus(status);
    switch (s) {
      case 'جارية': return 'status-ongoing';
      case 'قادمة': return 'status-upcoming';
      case 'مكتملة': return 'status-completed';
      default: return 'status-completed';
    }
  }

  getStatusLabel(status: string): string {
    return this.normalizeStatus(status) || status || 'غير محددة';
  }
}