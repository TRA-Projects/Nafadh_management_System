import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';

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
  
  // Modals Visibility
  isBatchModalOpen = false;
  isProgramModalOpen = false;
  isViewModalOpen = false;
  isEditModalOpen = false;
  isTraineesModalOpen = signal<boolean>(false); // نافذة متدربي الدفعة

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
    
    // جلب كل البيانات مباشرة من جداول الداتابيس عبر الـ API
    this.loadInitialData();
  }

  // --- دوال استدعاء الداتابيس عبر AdminApi ---
  loadInitialData(): void {
    // 1. الدفعات
    this.adminApi.getBatches?.().subscribe({
      next: (res: any) => this.batches.set(res || []),
      error: () => this.batchesError.set('فشل تحميل قائمة الدفعات من قاعدة البيانات')
    });

    // 2. البرامج
    this.adminApi.getPrograms?.().subscribe({
      next: (res: any) => this.programs.set(res || [])
    });

    // 3. الشركات المستضيفة
    this.adminApi.getCompanies?.().subscribe({
      next: (res: any) => this.companies.set(res || [])
    });

    // 4. المسارات التدريبية
    this.adminApi.getTracks?.().subscribe({
      next: (res: any) => this.tracks.set(res || [])
    });
  }

  // --- التحقق من صحة تاريخ النهاية والبداية ---
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

  // --- دالة توحيد الحالات ---
  normalizeStatus(status: any): string {
    if (!status) return '';
    const s = String(status).trim().toLowerCase();
    if (s === 'ongoing' || s === 'جارية' || s === 'جاري' || s === 'active') return 'جارية';
    if (s === 'upcoming' || s === 'قادمة' || s === 'قادم' || s === 'pending') return 'قادمة';
    if (s === 'completed' || s === 'مكتملة' || s === 'مكتمل') return 'مكتملة';
    return status;
  }

  // --- استخراج السنوات ديناميكياً من تواريخ الداتابيس ---
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

  // --- حساب أعداد الدفعات من قاعدة البيانات ---
  getCountByStatus(status: string): number {
    if (status === 'الكل') return this.batches().length;
    return this.batches().filter(b => this.normalizeStatus(b.status) === status).length;
  }

  // --- عدد الفلاتر المطبقة حالياً ---
  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.searchTerm().trim()) count++;
    if (this.selectedYear() !== 'الكل') count++;
    if (this.selectedProgram() !== 'الكل') count++;
    if (this.fromDate()) count++;
    if (this.toDate()) count++;
    return count;
  });

  // --- محرك التصفية الشامل للبيانات ---
  filteredBatches = computed(() => {
    const status = this.statusFilter();
    const search = this.searchTerm().trim().toLowerCase();
    const year = this.selectedYear();
    const prog = this.selectedProgram();
    const from = this.fromDate();
    const to = this.toDate();

    return this.batches().filter(batch => {
      // 1. فلترة الحالة
      if (status !== 'الكل' && this.normalizeStatus(batch.status) !== status) {
        return false;
      }

      // 2. البحث النصي العام
      if (search) {
        const batchName = (batch.batchName || '').toLowerCase();
        const progName = this.getProgramName(batch).toLowerCase();
        const trackName = this.getTrackName(batch).toLowerCase();
        const compName = (batch.companyName || '').toLowerCase();
        if (!batchName.includes(search) && !progName.includes(search) && !trackName.includes(search) && !compName.includes(search)) {
          return false;
        }
      }

      // 3. فلترة البرنامج
      if (prog !== 'الكل') {
        if (batch.programId?.toString() !== prog && batch.programName !== prog) {
          return false;
        }
      }

      // 4. فلترة السنة
      if (year !== 'الكل' && batch.startDate) {
        const batchYear = new Date(batch.startDate).getFullYear().toString();
        if (batchYear !== year) {
          return false;
        }
      }

      // 5. فلترة من تاريخ
      if (from && batch.startDate) {
        const bStart = batch.startDate.split('T')[0];
        if (bStart < from) {
          return false;
        }
      }

      // 6. فلترة إلى تاريخ
      if (to && batch.startDate) {
        const bDate = batch.startDate.split('T')[0];
        if (bDate > to) {
          return false;
        }
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

  totalBatchesCount = computed(() => {
    return this.filteredBatches().length;
  });

  // --- دوال أزرار الفلترة ---
  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.currentPage.set(1);
  }

  onYearChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedYear.set(val);
    this.currentPage.set(1);
  }

  onProgramFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedProgram.set(val);
    this.currentPage.set(1);
  }

  onFromDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.fromDate.set(val);
    this.currentPage.set(1);
  }

  onToDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.toDate.set(val);
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

  // --- دالة تصدير بيانات الداتابيس المفلترة إلى Excel / CSV ---
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

  // --- دالة عرض متدربي الدفعة من الـ API مباشرة ---
  onViewTrainees(batch: any): void {
    this.selectedBatch = batch;
    this.isTraineesModalOpen.set(true);
    this.selectedBatchTrainees.set([]);

    const bId = batch?.batchId || batch?.id;

    // استدعاء الـ API مع تمرير batchId لفلترة متدربي الدفعة من الداتابيس
    this.adminApi.getTrainees({ batchId: bId, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const list = res?.items || (Array.isArray(res) ? res : []);
        this.selectedBatchTrainees.set(list);
      },
      error: () => {
        this.selectedBatchTrainees.set([]);
      }
    });
  }

  onCloseTraineesModal(): void {
    this.isTraineesModalOpen.set(false);
    this.selectedBatchTrainees.set([]);
  }

  onMessageTrainee(trainee: any): void {
    alert(`سيتم فتح محادثة مراسلة فورية مع: ${trainee.fullName || trainee.name}`);
  }

  // --- Modal Handlers ---
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

  // --- Form Submissions للـ API والداتابيس ---
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
    
    this.isSubmittingEditBatch = true;
    this.editBatchErrorMessage = null;

    const batchId = this.selectedBatch?.batchId || this.selectedBatch?.id;
    this.adminApi.updateBatch?.(batchId, this.editBatchForm.value).subscribe({
      next: () => {
        this.isSubmittingEditBatch = false;
        this.loadInitialData();
        this.onCloseEditModal();
      },
      error: () => {
        this.isSubmittingEditBatch = false;
        this.editBatchErrorMessage = 'فشل تحديث بيانات الدفعة في قاعدة البيانات';
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

  // --- دوال الربط مع الداتابيس ---

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