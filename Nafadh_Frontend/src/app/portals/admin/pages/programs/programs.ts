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

  // --- Signals & States ---
  batches = signal<any[]>([]);
  programs = signal<any[]>([]);
  companies = signal<any[]>([]);
  tracks = signal<any[]>([]);
  
  statusFilter = signal<string>('الكل');
  batchesError = signal<string | null>(null);
  
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  
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

  ngOnInit(): void {
    this.initBatchForm();
    this.initEditBatchForm();
    this.initProgramForm();
    
    // جلب البيانات من الـ API عند تحميل المكون
    this.loadInitialData();
  }

  // --- Data Loading from AdminApi ---
  loadInitialData(): void {
    this.adminApi.getBatches?.().subscribe({
      next: (res: any) => this.batches.set(res || []),
      error: () => this.batchesError.set('فشل تحميل قائمة الدفعات')
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

  // --- Form Initializations & Validators ---
  
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
      companyId: ['', [Validators.required]],
      instructorName: ['', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      capacity: [15, [Validators.required, Validators.min(1)]]
    }, { validators: this.dateRangeValidator });
  }

  private initEditBatchForm(): void {
    this.editBatchForm = this.fb.group({
      batchName: ['', [Validators.required]],
      programId: ['', [Validators.required]],
      companyId: ['', [Validators.required]],
      instructorName: ['', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      capacity: [15, [Validators.required, Validators.min(1)]]
    }, { validators: this.dateRangeValidator });
  }

  private initProgramForm(): void {
    this.programForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]], // تم التعديل إلى title ليطابق قاعدة البيانات
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

  // --- Computed Properties & Filtering ---
  
  filteredBatches = computed(() => {
    const filter = this.statusFilter();
    const allBatches = this.batches();
    if (filter === 'الكل') return allBatches;
    return allBatches.filter(b => b.status === filter);
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

  getCountByStatus(status: string): number {
    return this.batches().filter(b => b.status === status).length;
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
      instructorName: batch.instructorName,
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

  // --- Form Submissions ---

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
      error: (err) => {
        this.isSubmittingBatch = false;
        this.batchErrorMessage = 'فشل إنشاء الدفعة، يرجى المحاولة لاحقاً.';
        console.error('Failed to create batch', err);
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
      error: (err) => {
        this.isSubmittingProgram = false;
        this.programErrorMessage = 'فشل حفظ البرنامج، يجدر المحاولة لاحقاً';
        console.error('Failed to create program', err);
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
      error: (err) => {
        this.isSubmittingEditBatch = false;
        this.editBatchErrorMessage = 'فشل تعديل الدفعة، يرجى المحاولة لاحقاً.';
        console.error('Failed to update batch', err);
      }
    });
  }

  // --- Pagination Actions ---

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // --- UI Helpers & Formatters ---

  trackByBatchId(index: number, batch: any): any {
    return batch.batchId || index;
  }

  getProgramName(batch: any): string {
    if (!batch) return '-';
    if (batch.programName) return batch.programName;
    const prog = this.programs().find(p => p.programId === batch.programId);
    return prog ? (prog.title || prog.name) : '-';
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
    switch (status) {
      case 'جارية': return 'badge-ongoing';
      case 'قادمة': return 'badge-upcoming';
      case 'مكتملة': return 'badge-completed';
      default: return 'badge-default';
    }
  }

  getStatusLabel(status: string): string {
    return status || 'غير محددة';
  }
}