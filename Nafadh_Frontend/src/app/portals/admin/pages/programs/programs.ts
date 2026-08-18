import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminApi } from '../../services/admin-api';
import { BatchDto, ProgramDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-programs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './programs.html',
})
export class AdminPrograms implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  // State Management (Signals)
  readonly batches = signal<BatchDto[]>([]);
  readonly programs = signal<ProgramDto[]>([]);
  readonly statusFilter = signal<string>('الكل');

  // UI Modal & Form State
  isBatchModalOpen = false;
  batchForm!: FormGroup;

  // Static Data
  readonly companies = [
    { id: 1, name: 'Codeline' },
    { id: 2, name: 'TRA' }
  ] as const;

  // Computed Values
  readonly filteredBatches = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'الكل') return this.batches();
    return this.batches().filter((b) => b.status === filter);
  });

  ngOnInit(): void {
    this.initBatchForm();
    this.loadInitialData();
  }

  // --- Data Fetching ---
  private loadInitialData(): void {
    this.fetchBatches();
    
    this.api.getPrograms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.programs.set(data)
      });
  }

  private fetchBatches(): void {
    this.api.getBatches()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.batches.set(data)
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

  // --- UI Actions ---
  getCountByStatus(status: string): number {
    return this.batches().filter((b) => b.status === status).length;
  }

  onCreateProgram(): void {
    // Logic for creating a program
  }

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

  // --- Form Submission ---
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

  // --- Helpers ---
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