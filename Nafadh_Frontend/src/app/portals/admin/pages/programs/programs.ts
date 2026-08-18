import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminApi } from '../../services/admin-api';
import { BatchDto, ProgramDto, TrackDto } from '../../../../core/models/dtos';

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
  readonly tracks = signal<TrackDto[]>([]);
  readonly statusFilter = signal<string>('الكل');

  // UI Modal & Form State
  isBatchModalOpen = false;
  isProgramModalOpen = false;
  batchForm!: FormGroup;
  programForm!: FormGroup;

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
    this.initProgramForm();
    this.loadInitialData();
  }

  // --- Data Fetching ---
  private loadInitialData(): void {
    this.fetchBatches();
    this.fetchPrograms();
    this.fetchTracks();
    // this.api.getPrograms()
    //   .pipe(takeUntilDestroyed(this.destroyRef))
    //   .subscribe({
    //     next: (data) => this.programs.set(data)
    //   });
  }

  private fetchBatches(): void {
    this.api.getBatches()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.batches.set(data),
        error: (err: unknown) => console.error('Error fetching batches:', err)
      });
  }

  private fetchPrograms(): void {
    this.api.getPrograms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: ProgramDto[]) => this.programs.set(data),
        error: (err: unknown) => console.error('Error fetching programs:', err)
      });
  }

  private fetchTracks(): void {
    this.api.getTracks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: TrackDto[]) => this.tracks.set(data),
        error: (err: unknown) => console.error('Error fetching tracks:', err)
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
      title: ['', Validators.required],
      trackId: ['', Validators.required],
      durationWeeks: [10, [Validators.required, Validators.min(1)]],
      description: ['']
    });
  }

  // --- UI Actions ---
  getCountByStatus(status: string): number {
    return this.batches().filter((b) => b.status === status).length;
  }

  onCreateProgram(): void {
    this.isProgramModalOpen = true;
  }

  onCloseProgramModal(): void {
    this.isProgramModalOpen = false;
    this.programForm.reset({ durationWeeks: 10, trackId: '' });
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

 // --- Form Submissions ---
  onSubmitProgram(): void {
    if (this.programForm.invalid) {
      this.programForm.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.programForm.value,
      trackId: Number(this.programForm.value.trackId),
      durationWeeks: Number(this.programForm.value.durationWeeks)
    };

    this.api.createProgram(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.fetchPrograms();
          this.onCloseProgramModal();
        },
        error: (err: unknown) => console.error('Error creating program:', err)
      });
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
        },
        error: (err: unknown) => console.error('Error creating batch:', err)
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