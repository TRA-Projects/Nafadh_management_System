import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminApi } from '../../services/admin-api';

@Component({
  selector: 'app-admin-programs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './programs.html',
  styleUrls: ['./programs.css']
})
export class AdminPrograms implements OnInit {
  private fb = inject(FormBuilder);
  private adminApi = inject(AdminApi);
  private router = inject(Router);

  // ==========================================================
  // 1. Data Signals
  // ==========================================================
  batches = signal<any[]>([]);
  programs = signal<any[]>([]);
  companies = signal<any[]>([]);
  tracks = signal<any[]>([]);
  selectedBatchTrainees = signal<any[]>([]);

  statusFilter = signal<string>('الكل');
  planFilter = signal<string>('الكل');
  batchesError = signal<string | null>(null);

  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // فلاتر البحث والتصفية
  searchTerm = signal<string>('');
  selectedYear = signal<string>('الكل');
  selectedProgram = signal<string>('الكل');
  fromDate = signal<string>('');
  toDate = signal<string>('');

  // ==========================================================
  // 2. Navigation & Modals Flags
  // ==========================================================
  isTraineesPageOpen = signal<boolean>(false);
  isDetailsPageOpen = signal<boolean>(false);

  isBatchModalOpen = false;
  isProgramModalOpen = false;
  isEditModalOpen = false;
  selectedBatch: any = null;

  // فحص إرسال النماذج لتفعيل الفاليديشن
  isSubmittingProgram = false;
  programFormSubmitted = false;
  programErrorMessage: string | null = null;

  isSubmittingBatch = false;
  batchFormSubmitted = false;
  batchErrorMessage: string | null = null;

  isSubmittingEditBatch = false;
  editBatchFormSubmitted = false;
  editBatchErrorMessage: string | null = null;

  batchForm!: FormGroup;
  editBatchForm!: FormGroup;
  programForm!: FormGroup;

  // ==========================================================
  // 3. Course Plan Review Modal Signals
  // ==========================================================
  isPlanModalOpen = signal<boolean>(false);
  isLoadingPlan = signal<boolean>(false);
  selectedPlan = signal<any>(null);
  selectedPlanBatch = signal<any>(null);
  planErrorMessage = signal<string | null>(null);

  activePlanTab = signal<'curriculum' | 'trainers' | 'decision'>('curriculum');

  isSubmittingDecision = signal<boolean>(false);
  approvalNotes: string = '';
  rejectionNotes: string = '';
  selectedModifications: string[] = [];
  customModText: string = '';

  defaultModSuggestions: string[] = [
    'زيادة الساعات التطبيقية والعملية لمشروع التخرج',
    'تحديد آلية واضحة ومقاييس رقمية لتقييم المتدربين أسبوعياً',
    'إضافة شهادة مهنية معتمدة ضمن مخرجات الدورة',
    'توفير مدرب مساند معتمد لتغطية فترات التطبيق المعملي',
    'رفع نسبة الحضور الإلزامي الحضوري في مقر الشركة إلى 70% كحد أدنى'
  ];

  decisionErrorMessage = signal<string | null>(null);
  toast = signal<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    this.toast.set({ message, type });
    setTimeout(() => {
      this.toast.set(null);
    }, 3500); // يختفي تلقائياً بعد 3.5 ثوانٍ
  }

  // ==========================================================
  // 4. Lifecycle Hook
  // ==========================================================
  ngOnInit(): void {
    this.initBatchForm();
    this.initEditBatchForm();
    this.initProgramForm();
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.adminApi.getBatches().subscribe({
      next: (res: any) => this.batches.set(res || []),
      error: () => this.batchesError.set('فشل تحميل قائمة الدفعات من قاعدة البيانات')
    });

    this.adminApi.getPrograms().subscribe({
      next: (res: any) => this.programs.set(res || [])
    });

    this.adminApi.getCompanies().subscribe({
      next: (res: any) => this.companies.set(res || [])
    });

    this.adminApi.getTracks().subscribe({
      next: (res: any) => this.tracks.set(res || [])
    });
  }

  // ==========================================================
  // 5. Course Plan Logic (معالجة ذكية لجلب بيانات الخطة)
  // ==========================================================
  pendingPlansCount = computed(() => {
    return this.batches().filter(b => {
      const planStatus = this.getBatchPlanStatus(b);
      return planStatus === 'PendingApproval' || planStatus === 'بانتظار الاعتماد';
    }).length;
  });

  getBatchPlanStatus(batch: any): string {
    const s = batch?.coursePlanStatus ?? batch?.planStatus ?? batch?.CoursePlanStatus;
    if (s === 1 || s === 'PendingApproval' || s === 'Pending') return 'بانتظار الاعتماد';
    if (s === 2 || s === 'Approved') return 'معتمدة';
    if (s === 3 || s === 'Rejected' || s === 'NeedsRevision') return 'مرفوضة';
    if (s === 0 || s === 'Draft') return 'مسودة';
    return batch?.hasCoursePlan ? 'بانتظار الاعتماد' : 'لم تُرفع بعد';
  }

  onViewPlan(batch: any): void {
    if (!batch) return;

    this.selectedPlan.set(null);
    this.selectedPlanBatch.set(batch);
    this.planErrorMessage.set(null);
    this.isLoadingPlan.set(true);
    this.isPlanModalOpen.set(true);
    this.activePlanTab.set('curriculum');
    this.approvalNotes = '';
    this.rejectionNotes = '';
    this.selectedModifications = [];

    let companyId = Number(batch.companyId ?? batch.CompanyId);
    if (!companyId && batch.companyName) {
      const comp = this.companies().find(c => c.companyName?.trim() === batch.companyName?.trim());
      if (comp) companyId = comp.companyId;
    }
    const programId = Number(batch.programId ?? batch.ProgramId);

    // 1. نستدعي كنترولر الآدمن CoursePlanApproval
    this.adminApi.getPendingCoursePlans().subscribe({
      next: (pendingList: any[]) => {
        const rawList = Array.isArray(pendingList) ? pendingList : [];
        
        // البحث عن خطة هذه الشركة أو هذا البرنامج
        let matched = rawList.find(p => 
          (companyId && Number(p.companyId ?? p.CompanyId) === companyId) ||
          (programId && Number(p.programId ?? p.ProgramId) === programId)
        ) || rawList[0];

        if (matched) {
          const planId = Number(matched.planId ?? matched.PlanId ?? matched.id);
          // 2. جلب التفاصيل الكاملة (المراحل، المهام الـ 9، والمدربين)
          this.adminApi.getCoursePlanDetails(planId).subscribe({
            next: (detailedPlan: any) => {
              this.selectedPlan.set(detailedPlan);
              this.isLoadingPlan.set(false);
            },
            error: () => {
              this.selectedPlan.set(matched);
              this.isLoadingPlan.set(false);
            }
          });
        } else {
          // إذا لم تكن معلقة، نجلبها من خطط الشركة مباشرة
          this.fallbackToCompany(companyId, programId);
        }
      },
      error: () => {
        this.fallbackToCompany(companyId, programId);
      }
    });
  }

  private fallbackToCompany(companyId: number, programId: number): void {
    if (!companyId) {
      this.isLoadingPlan.set(false);
      this.planErrorMessage.set('لا توجد خطة مرفوعة لهذه الدفعة.');
      return;
    }

    this.adminApi.getCompanyCoursePlans(companyId).subscribe({
      next: (res: any) => {
        const plans = res?.plans || res?.Plans || (Array.isArray(res) ? res : []);
        const matched = plans.find((p: any) => Number(p.programId ?? p.ProgramId) === programId) || plans[0];
        
        if (matched) {
          const planId = Number(matched.planId ?? matched.PlanId ?? matched.id);
          this.adminApi.getCoursePlanDetails(planId).subscribe({
            next: (detailed: any) => {
              this.selectedPlan.set(detailed || matched);
              this.isLoadingPlan.set(false);
            },
            error: () => {
              this.selectedPlan.set(matched);
              this.isLoadingPlan.set(false);
            }
          });
        } else {
          this.isLoadingPlan.set(false);
          this.planErrorMessage.set('لم تقم الشركة برفع خطة تدريبية بعد.');
        }
      },
      error: () => {
        this.isLoadingPlan.set(false);
        this.planErrorMessage.set('تعذر تحميل خطة الدورة من الخادم.');
      }
    });
  }

  private loadDetailedPlan(planId: number, fallback: any): void {
    this.adminApi.getCoursePlanDetails(planId).subscribe({
      next: (detail: any) => {
        this.selectedPlan.set(detail || fallback);
        this.isLoadingPlan.set(false);
        this.planErrorMessage.set(null);
      },
      error: () => {
        // حتى لو تعذر جلب تفاصيل المراحل، نعرض الخطة الأساسية
        this.selectedPlan.set(fallback);
        this.isLoadingPlan.set(false);
        this.planErrorMessage.set(null);
      }
    });
  }

  private loadFromCompanyPlans(companyId: number, programId: number): void {
    this.adminApi.getCompanyCoursePlans(companyId).subscribe({
      next: (res: any) => {
        const plans = res?.plans || res?.Plans || (Array.isArray(res) ? res : []);
        if (plans.length > 0) {
          const matched = plans.find((p: any) => Number(p.programId ?? p.ProgramId) === programId) || plans[0];
          const planId = Number(matched.planId ?? matched.PlanId ?? matched.id);
          this.loadDetailedPlan(planId, matched);
        } else {
          this.isLoadingPlan.set(false);
          this.planErrorMessage.set('لم تقم الشركة برفع خطة تفصيلية لهذه الدفعة بعد.');
        }
      },
      error: () => {
        this.isLoadingPlan.set(false);
        this.planErrorMessage.set('تعذر تحميل خطة الدورة من الخادم.');
      }
    });
  }

  closePlanModal(): void {
    this.isPlanModalOpen.set(false);
    this.selectedPlan.set(null);
    this.selectedPlanBatch.set(null);
  }

  toggleModification(mod: string): void {
    if (this.selectedModifications.includes(mod)) {
      this.selectedModifications = this.selectedModifications.filter(m => m !== mod);
    } else {
      this.selectedModifications.push(mod);
    }
  }

  addCustomModification(): void {
    if (this.customModText.trim() && !this.selectedModifications.includes(this.customModText.trim())) {
      this.selectedModifications.push(this.customModText.trim());
      this.customModText = '';
    }
  }

 executeApproval(): void {
    const plan = this.selectedPlan();
    const planId = Number(plan?.planId ?? plan?.PlanId ?? plan?.id);

    if (!planId) return;

    this.isSubmittingDecision.set(true);

    const payload = {
      decision: 0, // 0 = Approve
      note: this.approvalNotes?.trim() || 'تم اعتماد الخطة التدريبية رسمياً من قِبل الإدارة.'
    };

    this.adminApi.reviewCoursePlan(planId, payload).subscribe({
      next: () => {
        this.isSubmittingDecision.set(false);
        alert('تم اعتماد خطة الدورة بنجاح!');
        this.closePlanModal();
        this.loadInitialData();
      },
      error: (err: any) => {
        this.isSubmittingDecision.set(false);
        console.error('خطأ الاعتماد:', err);
        alert(err?.error?.message || 'حدث خطأ أثناء اعتماد الخطة.');
      }
    });
  }

 executeRejection(): void {
    if (!this.rejectionNotes.trim() && this.selectedModifications.length === 0) {
      alert('يرجى تحديد الملاحظات المطلوبة أو كتابة سبب الرفض/طلب التعديل.');
      return;
    }

    const plan = this.selectedPlan();
    const planId = Number(plan?.planId ?? plan?.PlanId ?? plan?.id);

    if (!planId) return;

    const fullReason = [
      this.rejectionNotes.trim(),
      this.selectedModifications.length > 0 ? ('التعديلات المطلوبة:\n- ' + this.selectedModifications.join('\n- ')) : ''
    ].filter(Boolean).join('\n\n');

    this.isSubmittingDecision.set(true);

    const payload = {
      decision: 1, // 1 = Reject
      note: fullReason // ◄ بالمفرد note ليتعرف عليه السيرفر فوراً
    };

    this.adminApi.reviewCoursePlan(planId, payload).subscribe({
      next: () => {
        this.isSubmittingDecision.set(false);
        alert('تم إرجاع الخطة إلى الشركة مع الملاحظات المطلوبة.');
        this.closePlanModal();
        this.loadInitialData();
      },
      error: (err: any) => {
        this.isSubmittingDecision.set(false);
        console.error('خطأ الرفض:', err);
        alert(err?.error?.message || 'حدث خطأ أثناء محاولة إرجاع الخطة.');
      }
    });
  }

  // ==========================================================
  // 6. Navigation Handlers
  // ==========================================================
  onView(batch: any): void {
    this.selectedBatch = batch;
    this.isDetailsPageOpen.set(true);
    this.isTraineesPageOpen.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onBackFromDetails(): void {
    this.isDetailsPageOpen.set(false);
    this.selectedBatch = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onViewTrainees(batch: any): void {
    this.selectedBatch = batch;
    this.isTraineesPageOpen.set(true);
    this.isDetailsPageOpen.set(false);
    this.selectedBatchTrainees.set([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const bId = Number(batch?.batchId || batch?.id);
    this.adminApi.getBatchTrainees(bId).subscribe({
      next: (res: any) => {
        const trainees = Array.isArray(res) ? res : (res?.items || []);
        this.selectedBatchTrainees.set(trainees);
      },
      error: (err) => {
        console.error('خطأ في جلب المتدربين:', err);
        this.selectedBatchTrainees.set([]);
      }
    });
  }

  onBackFromTrainees(): void {
    this.isTraineesPageOpen.set(false);
    this.selectedBatchTrainees.set([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onViewTraineesFromDetails(): void { this.onViewTrainees(this.selectedBatch); }
  onEditFromDetails(): void { this.onEdit(this.selectedBatch); }

  onMessageTrainee(trainee: any): void {
    this.router.navigate(['/admin/communications'], {
      queryParams: { 
        traineeId: trainee?.traineeId || trainee?.id, 
        traineeName: trainee?.fullName || trainee?.name,
        tab: 'complaints'
      }
    });
  }

  // ==========================================================
  // 7. Forms Setup & Form Controls Getters (Validation)
  // ==========================================================
  get bf() { return this.batchForm.controls; }
  get ebf() { return this.editBatchForm.controls; }
  get pf() { return this.programForm.controls; }

  dateRangeValidator(group: FormGroup) {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    if (start && end && new Date(end) < new Date(start)) {
      group.get('endDate')?.setErrors({ dateRangeInvalid: true });
      return { dateRangeInvalid: true };
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

  preventNegative(event: KeyboardEvent): void {
    if (['-', 'e', 'E', '+'].includes(event.key)) event.preventDefault();
  }

  onCreateBatch(): void {
    this.batchForm.reset({ capacity: 15 });
    this.batchFormSubmitted = false;
    this.batchErrorMessage = null;
    this.isBatchModalOpen = true;
  }

  onCloseBatchModal(): void {
    this.isBatchModalOpen = false;
    this.batchFormSubmitted = false;
  }

  onCreateProgram(): void {
    this.programForm.reset({ durationWeeks: 10, trackId: null });
    this.programFormSubmitted = false;
    this.programErrorMessage = null;
    this.isProgramModalOpen = true;
  }

  onCloseProgramModal(): void {
    this.isProgramModalOpen = false;
    this.programFormSubmitted = false;
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
    this.editBatchFormSubmitted = false;
    this.editBatchErrorMessage = null;
    this.isEditModalOpen = true;
  }

  onCloseEditModal(): void {
    this.isEditModalOpen = false;
    this.editBatchFormSubmitted = false;
    this.selectedBatch = null;
  }

  onSubmit(): void {
    this.batchFormSubmitted = true;
    if (this.batchForm.invalid) {
      this.batchForm.markAllAsTouched();
      return;
    }
    this.isSubmittingBatch = true;
    this.adminApi.createBatch(this.batchForm.value).subscribe({
      next: () => {
        this.isSubmittingBatch = false;
        this.loadInitialData();
        this.onCloseBatchModal();
      },
      error: () => {
        this.isSubmittingBatch = false;
        this.batchErrorMessage = 'فشل إنشاء الدفعة في قاعدة البيانات.';
      }
    });
  }

  onSubmitProgram(): void {
    this.programFormSubmitted = true;
    if (this.programForm.invalid) {
      this.programForm.markAllAsTouched();
      return;
    }
    this.isSubmittingProgram = true;
    this.adminApi.createProgram(this.programForm.value).subscribe({
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
    this.editBatchFormSubmitted = true;
    if (this.editBatchForm.invalid) {
      this.editBatchForm.markAllAsTouched();
      return;
    }
    const batchId = Number(this.selectedBatch?.batchId || this.selectedBatch?.id);
    this.isSubmittingEditBatch = true;

    const payload = {
      ...this.editBatchForm.value,
      batchId,
      status: this.selectedBatch?.status || 'Ongoing'
    };

    this.adminApi.updateBatch(batchId, payload).subscribe({
      next: () => {
        this.isSubmittingEditBatch = false;
        this.loadInitialData();
        this.onCloseEditModal();
      },
      error: (err: any) => {
        this.isSubmittingEditBatch = false;
        this.editBatchErrorMessage = err?.error?.message || 'فشل تحديث بيانات الدفعة.';
      }
    });
  }

  // ==========================================================
  // 8. Filters & Computed
  // ==========================================================
  normalizeStatus(status: any): string {
    if (!status) return '';
    const s = String(status).trim().toLowerCase();
    if (s === 'ongoing' || s === 'جارية' || s === 'active') return 'جارية';
    if (s === 'upcoming' || s === 'قادمة') return 'قادمة';
    if (s === 'completed' || s === 'مكتملة') return 'مكتملة';
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
    ['2027', '2026', '2025'].forEach(y => yearsSet.add(y));
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
    if (this.planFilter() !== 'الكل') count++;
    if (this.fromDate()) count++;
    if (this.toDate()) count++;
    return count;
  });

  filteredBatches = computed(() => {
    const status = this.statusFilter();
    const planF = this.planFilter();
    const search = this.searchTerm().trim().toLowerCase();
    const year = this.selectedYear();
    const prog = this.selectedProgram();
    const from = this.fromDate();
    const to = this.toDate();

    return this.batches().filter(batch => {
      if (status !== 'الكل' && this.normalizeStatus(batch.status) !== status) return false;

      if (planF !== 'الكل') {
        const batchPlan = this.getBatchPlanStatus(batch);
        if (batchPlan !== planF) return false;
      }

      if (search) {
        const bName = (batch.batchName || '').toLowerCase();
        const pName = this.getProgramName(batch).toLowerCase();
        const cName = (batch.companyName || '').toLowerCase();
        if (!bName.includes(search) && !pName.includes(search) && !cName.includes(search)) return false;
      }

      if (prog !== 'الكل' && String(batch.programId) !== prog) return false;

      if (year !== 'الكل' && batch.startDate) {
        if (new Date(batch.startDate).getFullYear().toString() !== year) return false;
      }

      if (from && batch.startDate && batch.startDate.split('T')[0] < from) return false;
      if (to && batch.startDate && batch.startDate.split('T')[0] > to) return false;

      return true;
    });
  });

  paginatedBatches = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredBatches().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredBatches().length / this.pageSize()) || 1);
  totalBatchesCount = computed(() => this.filteredBatches().length);

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onResetFilters(): void {
    this.searchTerm.set('');
    this.selectedYear.set('الكل');
    this.selectedProgram.set('الكل');
    this.planFilter.set('الكل');
    this.fromDate.set('');
    this.toDate.set('');
    this.statusFilter.set('الكل');
    this.currentPage.set(1);
  }

  setQuickPreset(preset: 'all' | '2026' | '2027'): void {
    if (preset === 'all') this.onResetFilters();
    else {
      this.selectedYear.set(preset);
      this.currentPage.set(1);
    }
  }

  exportToExcel(): void {
    const data = this.filteredBatches();
    if (!data.length) return;
    const headers = ['الدفعة', 'البرنامج', 'الشركة', 'البداية', 'النهاية', 'المسجلين', 'السعة', 'حالة الدفعة', 'حالة الخطة'];
    const rows = data.map(b => [
      `"${b.batchName}"`,
      `"${this.getProgramName(b)}"`,
      `"${b.companyName || '-'}"`,
      `"${b.startDate ? b.startDate.split('T')[0] : ''}"`,
      `"${b.endDate ? b.endDate.split('T')[0] : ''}"`,
      b.totalTraineesCount || 0,
      b.capacity || 0,
      `"${this.getStatusLabel(b.status)}"`,
      `"${this.getBatchPlanStatus(b)}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `batches_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  getBatchDuration(start?: string, end?: string): string {
    if (!start || !end) return '-';
    const diffDays = Math.ceil(Math.abs(new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
    return `${Math.ceil(diffDays / 7)} أسابيع`;
  }

  getProgramName(batch: any): string {
    const prog = this.programs().find(p => p.programId === batch?.programId);
    return prog ? (prog.title || prog.name) : (batch?.programName || '-');
  }

  getTrackName(batch: any): string {
    const track = this.tracks().find(t => t.trackId === batch?.trackId);
    return track ? (track.name || track.title) : '-';
  }

  getOccupancyPercentage(current: number = 0, capacity: number = 1): number {
    return Math.min(Math.round(((current || 0) / (capacity || 1)) * 100), 100);
  }

  getStatusBadgeClass(status: string): string {
    const s = this.normalizeStatus(status);
    if (s === 'جارية') return 'status-ongoing';
    if (s === 'قادمة') return 'status-upcoming';
    return 'status-completed';
  }

  getStatusLabel(status: string): string {
    return this.normalizeStatus(status) || 'غير محددة';
  }
}