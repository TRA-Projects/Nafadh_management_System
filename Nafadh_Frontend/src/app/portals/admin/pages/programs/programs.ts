import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminApi } from '../../services/admin-api';
import { BatchDto, ProgramDto, CompanyDto} from '../../../../core/models/dtos';
import {
  BatchStatus
} from '../../../../core/models/enums';
/**
 * حالات الدفعة الأربع كما هي في الباكند (NFD_BatchStatus):
 * Upcoming | Ongoing | Completed | Cancelled
 * كل حالة لها تسمية عربية + كلاس تصميم خاص بها — لا نفترض أن غير "جارية" تعني "قادمة".
 */
type BatchStatusKey = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';

const STATUS_LABELS: Record<BatchStatusKey, string> = {
  Upcoming: 'قادمة',
  Ongoing: 'جارية',
  Completed: 'مكتملة',
  Cancelled: 'ملغاة',
};

const STATUS_BADGE_CLASSES: Record<BatchStatusKey, string> = {
  Upcoming: 'bg-slate-100 text-slate-500 border-slate-200/70',
  Ongoing: 'bg-blue-50/90 text-blue-500 border-blue-200/80',
  Completed: 'bg-emerald-50/90 text-emerald-600 border-emerald-200/80',
  Cancelled: 'bg-red-50/90 text-red-500 border-red-200/80',
};

@Component({
  selector: 'app-admin-programs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './programs.html',
  styleUrls: ['./programs.css']
})
export class AdminPrograms implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  // State Management (Signals)
  readonly batches = signal<BatchDto[]>([]);
  readonly programs = signal<ProgramDto[]>([]);
  readonly tracks = signal<any[]>([]);
  readonly companies = signal<CompanyDto[]>([]);
  readonly statusFilter = signal<string>('الكل');

  // Error state (لعرضها في الواجهة بدل الفشل الصامت)
  readonly batchesError = signal<string | null>(null);
  readonly programsError = signal<string | null>(null);

  // UI Modal & Form State - Batch Modal
  isBatchModalOpen = false;
  batchForm!: FormGroup;

  // UI Modal & Form State - Program Modal
  isProgramModalOpen = false;
  isSubmittingProgram = false;
  programForm!: FormGroup;
  programErrorMessage: string | null = null;

  // --- UI Modal State - View Details Modal ---
  isViewModalOpen = false;
  selectedBatch: BatchDto | null = null;
  readonly Math = Math;

  // Dynamic Filtering Computed Signal
  readonly filteredBatches = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'الكل') return this.batches();
    return this.batches().filter((b) => {
      if (filter === 'جارية') return this.isInProgress(b.status);
      if (filter === 'قادمة') return this.isUpcoming(b.status);
      return this.getStatusKey(b.status) === filter;
    });
  });

  ngOnInit(): void {
    this.initBatchForm();
    this.initProgramForm();
    this.loadInitialData();
  }

  // --- Status Filter Handler ---
  setStatusFilter(filter: string): void {
    this.statusFilter.set(filter);
  }

  // --- Table Helpers ---
  onEdit(batch: BatchDto): void {
    console.log('Edit batch clicked:', batch);
  }

  onView(batch: BatchDto): void {
    this.selectedBatch = batch;
    this.isViewModalOpen = true;
  }

  onCloseViewModal(): void {
    this.isViewModalOpen = false;
    this.selectedBatch = null;
  }

  trackByBatchId(_index: number, batch: BatchDto): number | string {
    return (batch as any).batchId ?? (batch as any).id ?? _index;
  }

  getFormattedSubtext(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  /** يحسب نسبة الإشغال بأمان — يمنع القسمة على صفر */
  getOccupancyPercentage(count: number | null | undefined, capacity: number | null | undefined): number {
    const safeCount = count ?? 0;
    const safeCapacity = capacity ?? 0;
    if (safeCapacity <= 0) return 0;
    return Math.min((safeCount / safeCapacity) * 100, 100);
  }

  /** يحوّل قيمة status (نص/رقم/enum) إلى مفتاح موحّد BatchStatusKey */
  private getStatusKey(status: BatchStatus | string | number | null | undefined): BatchStatusKey {
    const s = status?.toString();
    switch (s) {
      case '0':
      case 'Upcoming':
        return 'Upcoming';
      case '1':
      case 'Ongoing':
      case 'InProgress':
      case 'جارية':
        return 'Ongoing';
      case '2':
      case 'Completed':
        return 'Completed';
      case '3':
      case 'Cancelled':
        return 'Cancelled';
      default:
        return 'Upcoming';
    }
  }

  isInProgress(status: BatchStatus | string | number | null | undefined): boolean {
    return this.getStatusKey(status) === 'Ongoing';
  }

  isUpcoming(status: BatchStatus | string | number | null | undefined): boolean {
    return this.getStatusKey(status) === 'Upcoming';
  }

  isCompleted(status: BatchStatus | string | number | null | undefined): boolean {
    return this.getStatusKey(status) === 'Completed';
  }

  isCancelled(status: BatchStatus | string | number | null | undefined): boolean {
    return this.getStatusKey(status) === 'Cancelled';
  }

  getStatusLabel(status: BatchStatus | string | number | null | undefined): string {
    return STATUS_LABELS[this.getStatusKey(status)];
  }

  getStatusBadgeClass(status: BatchStatus | string | number | null | undefined): string {
    return STATUS_BADGE_CLASSES[this.getStatusKey(status)];
  }

  getCountByStatus(status: string): number {
    if (status === 'الكل') return this.batches().length;
    return this.batches().filter((b) => {
      if (status === 'جارية') return this.isInProgress(b.status);
      if (status === 'قادمة') return this.isUpcoming(b.status);
      return this.getStatusKey(b.status) === status;
    }).length;
  }

  // --- Data Fetching ---
  private loadInitialData(): void {
    this.fetchBatches();
    this.fetchPrograms();
    this.fetchTracks();
    this.fetchCompanies();
  }

  private fetchBatches(): void {
    this.batchesError.set(null);
    this.api.getBatches()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.batches.set(data),
        error: (err) => {
          console.error('Error fetching batches:', err);
          this.batchesError.set('تعذّر تحميل الدفعات. حاول تحديث الصفحة.');
        }
      });
  }

  private fetchPrograms(): void {
    this.programsError.set(null);
    this.api.getPrograms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.programs.set(data),
        error: (err) => {
          console.error('Error fetching programs:', err);
          this.programsError.set('تعذّر تحميل البرامج.');
        }
      });
  }

  private fetchTracks(): void {
    this.api.getTracks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.tracks.set(data),
        error: (err) => console.error('Error fetching tracks:', err)
      });
  }

  private fetchCompanies(): void {
    this.api.getCompanies()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.companies.set(data),
        error: (err) => console.error('Error fetching companies:', err)
      });
  }

  // --- Form Initialization ---
  private initBatchForm(): void {
    this.batchForm = this.fb.group({
      batchName: ['', Validators.required],
      programId: ['', Validators.required],
      companyId: [''],
      instructorName: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      capacity: [15, [Validators.required, Validators.min(1)]]
    });
  }

  private initProgramForm(): void {
    this.programForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      trackId: [null, [Validators.required]],
      durationWeeks: [null, [Validators.required, Validators.min(1)]],
      description: ['']
    });
  }

  get pf() {
    return this.programForm.controls;
  }

  // --- Actions: Program Modal ---
  onCreateProgram(): void {
    this.programForm.reset();
    this.programErrorMessage = null;
    this.isProgramModalOpen = true;
  }

  onCloseProgramModal(): void {
    this.isProgramModalOpen = false;
    this.programErrorMessage = null;
  }

  onSubmitProgram(): void {
    if (this.programForm.invalid) {
      this.programForm.markAllAsTouched();
      return;
    }

    this.isSubmittingProgram = true;
    this.programErrorMessage = null;
    const rawValues = this.programForm.value;

    const payload: Partial<ProgramDto> = {
      name: rawValues.name,
      title: rawValues.name,
      trackId: Number(rawValues.trackId),
      durationHours: Number(rawValues.durationWeeks) * 40,
      description: rawValues.description || '',
      status: 'Active'
    };

    this.api.createProgram(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmittingProgram = false;
          this.fetchPrograms();
          this.onCloseProgramModal();
        },
        error: (err) => {
          this.isSubmittingProgram = false;
          this.programErrorMessage = 'حدث خطأ أثناء إنشاء البرنامج.';
          console.error('Error creating program:', err);
        }
      });
  }

  // --- Actions: Batch Modal ---
  onCreateBatch(): void {
    this.isBatchModalOpen = true;
  }

  onCloseBatchModal(): void {
    this.isBatchModalOpen = false;
    this.batchForm.reset({ capacity: 15, programId: '', companyId: '' });
  }

  onCancel(): void {
    this.onCloseBatchModal();
  }

  onSubmit(): void {
    if (this.batchForm.invalid) {
      this.batchForm.markAllAsTouched();
      return;
    }

    const payload = this.prepareBatchPayload();
    this.api.createBatch(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.fetchBatches();
          this.onCloseBatchModal();
        }
      });
  }

  private prepareBatchPayload(): Partial<BatchDto> {
    const rawValues = this.batchForm.value;
    return {
      ...rawValues,
      programId: Number(rawValues.programId),
      companyId: rawValues.companyId ? Number(rawValues.companyId) : null,
      capacity: Number(rawValues.capacity)
    };
  }
}