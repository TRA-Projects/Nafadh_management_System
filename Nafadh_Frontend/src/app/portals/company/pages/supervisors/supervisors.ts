import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { CompanyApi } from '../../services/company-api';

interface SupervisorStats {
  monthlyEvaluations: number;
  attendanceRate: number;
  assignedTrainees: number;
}

interface Supervisor {
  supervisorId: number;
  id: number;
  fullName: string;
  phone: string;
  email: string;
  department: string;
  position: string;
  status: string;
  companyId?: number;
  userId?: number;
  permissions?: string[];
  avatarColor?: string;
  isInactive?: boolean;
  showMenu?: boolean;
  lastActivity?: string;
  stats?: SupervisorStats;
}

interface Trainee {
  id: number;
  name: string;
  email?: string;
  assigned: boolean;
  color: string;
  initials: string;
  track: string;
  batch: string;
}

interface CompanyTrainer {
  id: number;
  name: string;
  specialty: string;
  status: string;
  email: string;
  phone: string;
}

interface EvaluationTrainer {
  id: number;
  name: string;
  color: string;
  initials: string;
  track: string;
  currentRating: string;
  explanationClarity: number;
  interactionAndSupport: number;
  evaluationComment: string;
}

type ToastType = 'success' | 'error' | 'info';

@Component({
  selector: 'app-company-supervisors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supervisors.html',
  styleUrls: ['./supervisors.scss']
})
export class CompanySupervisors implements OnInit {
  private readonly companyApi = inject(CompanyApi);
  private readonly cdr = inject(ChangeDetectorRef);

  /** رقم شركة المستخدم الحالي، يُحمَّل من حسابه (CompanyAccount/me) ولا يوجد له قيمة افتراضية. */
  companyId = 0;
  loading = false;
  errorMessage = '';

  activeView: 'supervisors' | 'evaluations' | 'trainers' = 'supervisors';
  evaluationSearch = '';
  editingSavedEvaluation = false;
  evaluationTrainerId: number | null = null;
  evaluationSaved = false;
  savingEvaluation = false;

  supervisors: Supervisor[] = [];

  departments = [
    'تقنية المعلومات',
    'الموارد البشرية',
    'التسويق',
    'المالية',
    'التدريب والتطوير',
    'الجودة',
    'الشؤون الإدارية'
  ];

  selectedDept = 'all';
  searchQuery = '';

  totalAssignedTrainees = 0;
  averageAttendance = 0;
  supervisorsNeedingAttention = 0;

  // نافذة إضافة وتعديل المشرف
  showAddModal = false;
  editingSupervisor = false;

  // نافذة إضافة مدرب مستقلة
  showTrainerModal = false;
  savingTrainer = false;
  companyTrainers: CompanyTrainer[] = [];
  trainerAttendanceSummary: { rate: number; recorded: number; absent: number } | null = null;
  trainerSummaryLoading = false;
  trainerSearch = '';
  trainerSpecialtyFilter = '';
  trainerIdFilter: number | null = null;
  trainerColumnFilter: 'name' | 'specialty' | null = null;
  trainerPageSize = 5;
  trainerPage = 1;
  selectedTrainerDetails: CompanyTrainer | null = null;
  selectedCompanyTrainer: CompanyTrainer | null = null;
  trainerAttendanceRates: Partial<Record<number, number>> = {};
  trainerEvaluationsById: Partial<Record<number, { supervisorId: number; supervisorName: string; rating: number; comment?: string | null; savedAt?: string }[]>> = {};
  private trainerEvaluationsRequestId = 0;
  trainerEvaluationsState: 'loading' | 'ready' | 'error' = 'loading';
  trainerAttendance: {
    trainerAttendanceId: number;
    trainerId?: number | string | null;
    date: string;
    status: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    reason?: string | null;
  }[] = [];
  private recentTrainerAttendance: {
    companyId: number;
    from: string;
    to: string;
    records: CompanySupervisors['trainerAttendance'];
  } | null = null;
  trainerAttendanceFrom = '';
  trainerAttendanceTo = '';
  trainerAttendanceState: 'loading' | 'ready' | 'error' = 'loading';
  private attendanceRequestId = 0;
  trainersLoading = false;
  trainersLoadFailed = false;
  private trainersRequestId = 0;

  newTrainer = {
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    specialty: '', experienceYears: 0, biography: '', cvUrl: ''
  };

  showProfileModal = false;
  selectedProfileSupervisor: Supervisor | null = null;

  selectedSupervisor: Supervisor | null = null;

  isEvaluationModalOpen = false;
  evaluationLoading = false;
  supervisorTrainers: EvaluationTrainer[] = [];

  isDistributeModalOpen = false;
  distributionLoading = false;
  traineesList: Trainee[] = [];

  distributionMap: Record<number, number[]> = {};

  savingSupervisor = false;

  newSupervisor = {
    fullName: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    isInactive: false
  };

  toast: {
    visible: boolean;
    type: ToastType;
    message: string;
  } = {
    visible: false,
    type: 'info',
    message: ''
  };

  private readonly avatarColors = [
    'navy',
    'cyan',
    'gold',
    'red',
    'purple',
    'green',
    'orange',
    'pink'
  ];

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadCurrentCompany();
  }

  /** تحديد شركة المستخدم الحالي من حسابه ثم تحميل بياناتها. */
  private loadCurrentCompany(): void {
    this.loading = true;
    this.errorMessage = '';

    this.companyApi.getCurrentAccount().subscribe({
      next: (account: any) => {
        const id = Number(
          account?.companyId ??
          account?.CompanyId ??
          account?.company?.companyId ??
          account?.company?.id ??
          0
        );

        if (!Number.isFinite(id) || id <= 0) {
          this.loading = false;
          this.errorMessage = 'تعذر تحديد الشركة المرتبطة بحسابك';
          this.cdr.detectChanges();
          return;
        }

        this.companyId = id;
        this.loadSupervisors();
      },
      error: (error: unknown) => {
        console.error('Error loading current company account:', error);
        this.loading = false;
        this.errorMessage = 'تعذر تحميل بيانات حساب الشركة';
        this.cdr.detectChanges();
      }
    });
  }

  /** مفاتيح التخزين المحلي مفصولة لكل شركة حتى لا تختلط البيانات. */
  private storageKey(base: string): string {
    return `${base}:company-${this.companyId}`;
  }

  private normalizeTrainers(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    for (const value of [
      response?.items,
      response?.data,
      response?.trainers,
      response?.data?.items
    ]) {
      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  }

  private trainerId(item: any): number {
    return Number(
      item.trainerId ??
      item.TrainerId ??
      item.id ??
      item.Id
    );
  }

  private trainerName(item: any): string {
    return String(
      item.fullName ??
      item.FullName ??
      item.trainerName ??
      item.TrainerName ??
      item.name ??
      item.Name ??
      ''
    );
  }

  // تحميل المشرفين
  loadSupervisors(): void {
    if (!this.companyId) {
      this.loadCurrentCompany();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.companyApi.getSupervisors(this.companyId).subscribe({
      next: (response: any) => {
        const data: any[] = Array.isArray(response)
          ? response
          : (response?.items ?? response?.data ?? []);

        this.supervisors = data.map((item, index) => {
          const id = Number(item.supervisorId ?? item.id ?? index + 1);
          const status = item.status ?? 'Active';
          const stats = item.stats ?? { monthlyEvaluations: 0, attendanceRate: 0, assignedTrainees: 0 };

          return {
            supervisorId: id,
            id,
            fullName: item.fullName ?? item.name ?? 'مشرف',
            phone: item.phone ?? '',
            email: item.email ?? '',
            department: item.department ?? 'القسم العام',
            position: item.position ?? 'مشرف',
            status,
            companyId: item.companyId ?? this.companyId,
            userId: item.userId,
            permissions: item.permissions ?? [],
            avatarColor: this.avatarColors[index % this.avatarColors.length],
            isInactive: [
              'Inactive',
              'Frozen',
              'غير نشط',
              'مجمد'
            ].includes(status),
            showMenu: false,
            lastActivity: item.lastActivity,
            stats: {
              monthlyEvaluations: Number(stats.monthlyEvaluations ?? 0),
              attendanceRate: Number(stats.attendanceRate ?? 0),
              assignedTrainees: Number(stats.assignedTrainees ?? 0)
            }
          } as Supervisor;
        });

        for (const supervisor of this.supervisors) {
          const id = supervisor.supervisorId;
          const previous = this.distributionMap[id];
          this.companyApi.getSupervisorTrainers(id).subscribe({
            next: response => {
              if (!this.supervisors.includes(supervisor) || this.distributionMap[id] !== previous) return;
              this.updateSupervisorDistribution(supervisor, this.assignedTrainerIds(response));
              this.cdr.detectChanges();
            },
            error: error => console.error('Error restoring trainer distribution:', error)
          });
        }

        this.calculateStatistics();
        this.loading = false;
        this.cdr.detectChanges();
      },

      error: (error: unknown) => {
        console.error('Error loading supervisors:', error);

        this.loading = false;
        this.errorMessage = 'حدث خطأ أثناء تحميل بيانات المشرفين';

        this.showToast('error', this.errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  refreshData(): void {
    if (this.activeView === 'trainers') {
      this.loadCompanyTrainers();
      return;
    }

    this.loadSupervisors();
  }

  showTrainersView(): void {
    this.activeView = 'trainers';
    this.loadCompanyTrainers();
  }

  readonly trainerStatusLabels: Record<string, string> = {
    Active: 'نشط', Inactive: 'غير نشط', Suspended: 'موقوف'
  };

  toggleTrainerColumnFilter(column: 'name' | 'specialty'): void {
    this.trainerColumnFilter = this.trainerColumnFilter === column ? null : column;

  }

  closeTrainerFilterOnOutsideClick(event: MouseEvent): void {
    if (this.trainerColumnFilter === null) return;

    const target = event.target;
    if (target instanceof Element && target.closest('.trainer-filter-menu, .trainer-filter-toggle')) return;

    this.trainerColumnFilter = null;
  }

  get hasTrainerFilters(): boolean {
    return !!this.trainerSearch.trim() || this.trainerIdFilter !== null || !!this.trainerSpecialtyFilter;
  }

  clearTrainerFilters(): void {
    this.trainerSearch = '';
    this.trainerIdFilter = null;
    this.trainerSpecialtyFilter = '';
    this.trainerColumnFilter = null;
    this.trainerPage = 1;
  }

  get trainerSpecialties(): string[] {
    return [...new Set(this.companyTrainers.map(trainer => trainer.specialty))]
      .sort((a, b) => a.localeCompare(b, 'ar'));
  }

  get filteredCompanyTrainers(): CompanyTrainer[] {
    const query = this.trainerSearch.trim().toLowerCase();
    return this.companyTrainers.filter(trainer =>
      (this.trainerIdFilter === null || trainer.id === this.trainerIdFilter) &&
      (!this.trainerSpecialtyFilter || trainer.specialty === this.trainerSpecialtyFilter) &&
      (trainer.name.toLowerCase().includes(query) ||
        trainer.specialty.toLowerCase().includes(query))
    );
  }

  get trainerPageCount(): number {
    return Math.max(1, Math.ceil(this.filteredCompanyTrainers.length / this.trainerPageSize));
  }

  get visibleTrainerPage(): number {
    return Math.min(this.trainerPage, this.trainerPageCount);
  }

  get pagedCompanyTrainers(): CompanyTrainer[] {
    const start = (this.visibleTrainerPage - 1) * this.trainerPageSize;
    return this.filteredCompanyTrainers.slice(start, start + this.trainerPageSize);
  }

  openTrainerProfile(trainer: CompanyTrainer): void {
    this.selectedCompanyTrainer = { ...trainer };
    const range = this.currentAttendanceWeek();
    this.trainerAttendanceFrom = range.from;
    this.trainerAttendanceTo = range.to;
    this.loadTrainerAttendance();
    this.loadCompanyTrainerEvaluations();
  }

  private loadCompanyTrainerEvaluations(): void {
    const requestId = ++this.trainerEvaluationsRequestId;
    this.trainerEvaluationsState = 'loading';
    this.companyApi.getSupervisors(this.companyId).pipe(
      switchMap(supervisors => {
        const requests = supervisors.flatMap(supervisor => {
          const id = Number(supervisor.supervisorId ?? supervisor.id);
          if (!Number.isSafeInteger(id) || id <= 0) return [];

          const supervisorName = supervisor.fullName?.trim() || 'مشرف غير محدد';
          return [this.companyApi.getSupervisorTrainerEvaluations(id).pipe(
            map(records => records.map(record => ({
              ...record,
              supervisorId: id,
              supervisorName,
              savedAt: record.evaluatedAt ?? record.updatedAt ?? record.createdAt
            })))
          )];
        });

        return requests.length ? forkJoin(requests) : of([]);
      })
    ).subscribe({
      next: groups => {
        if (requestId !== this.trainerEvaluationsRequestId) return;
        this.trainerEvaluationsById = {};
        for (const evaluation of groups.flat()) {
          (this.trainerEvaluationsById[Number(evaluation.trainerId)] ??= []).push(evaluation);
        }
        this.trainerEvaluationsState = 'ready';
        this.cdr.detectChanges();
      },
      error: () => {
        if (requestId !== this.trainerEvaluationsRequestId) return;
        this.trainerEvaluationsState = 'error';
        this.cdr.detectChanges();
      }
    });
  }

  get selectedTrainerEvaluationRecords(): {
    supervisorId: number; supervisorName: string; rating: number; comment?: string | null; savedAt?: string;
  }[] {
    return this.selectedCompanyTrainer ? this.trainerEvaluationRecords(this.selectedCompanyTrainer.id) : [];
  }

  trainerEvaluationCount(trainerId: number): number | string {
    const count = this.trainerEvaluationRecords(trainerId).length;
    return count || this.trainerEvaluationsState === 'ready' ? count : '—';
  }

  private trainerEvaluationRecords(trainerId: number) {
    const records = this.trainerEvaluationsById[trainerId] ?? [];
    const sharedSupervisorIds = new Set(records.map(record => record.supervisorId));
    const localRecords = this.readLocalEvaluations()
      .filter(record => Number(record.trainerId) === trainerId &&
        !sharedSupervisorIds.has(Number(record.supervisorId)))
      .map(record => ({
        supervisorId: Number(record.supervisorId),
        supervisorName: record.supervisorName || 'مشرف غير محدد',
        rating: Number(this.getHistoryAverage(record)),
        comment: record.evaluationComment,
        savedAt: record.savedAt
      }));

    return [...records, ...localRecords];
  }

  private storeTrainerEvaluation(trainerId: number, evaluation: {
    supervisorId: number; supervisorName: string; rating: number; comment?: string | null; savedAt?: string;
  }): void {
    const records = this.trainerEvaluationsById[trainerId] ?? [];
    this.trainerEvaluationsById[trainerId] = [
      ...records.filter(record => record.supervisorId !== evaluation.supervisorId),
      evaluation
    ];
  }

  loadTrainerAttendance(): void {
    const trainer = this.selectedCompanyTrainer;
    if (!trainer || !this.trainerAttendanceFrom || !this.trainerAttendanceTo ||
      this.trainerAttendanceFrom > this.trainerAttendanceTo) return;

    const requestId = ++this.attendanceRequestId;
    const cached = this.recentTrainerAttendance;
    if (cached && cached.companyId === this.companyId &&
      cached.from === this.trainerAttendanceFrom && cached.to === this.trainerAttendanceTo) {
      this.showTrainerAttendance(cached.records, trainer.id);
      return;
    }

    this.trainerAttendance = [];
    this.trainerAttendanceState = 'loading';
    this.companyApi.getTrainerAttendance(
      this.companyId, this.trainerAttendanceFrom, this.trainerAttendanceTo, trainer.id
    ).subscribe({
      next: records => {
        if (this.selectedCompanyTrainer !== trainer || requestId !== this.attendanceRequestId) return;
        this.showTrainerAttendance(records, trainer.id);
        this.cdr.detectChanges();
      },
      error: () => {
        if (this.selectedCompanyTrainer !== trainer || requestId !== this.attendanceRequestId) return;
        this.trainerAttendanceState = 'error';
        this.cdr.detectChanges();
      }
    });
  }

  private showTrainerAttendance(records: CompanySupervisors['trainerAttendance'], trainerId: number): void {
    this.trainerAttendance = records.filter(record => Number(record.trainerId) === trainerId)
      .sort((a, b) => b.date.localeCompare(a.date));
    this.trainerAttendanceState = 'ready';
  }

  readonly attendanceLabels: Record<string, string> = {
    Present: 'حاضر', Late: 'متأخر', Absent: 'غائب', EarlyLeave: 'انصراف مبكر'
  };

  closeTrainerProfile(): void {
    this.selectedCompanyTrainer = null;
  }

  private currentAttendanceWeek(): { from: string; to: string } {
    const today = new Date();
    const sunday = today.getDate() - today.getDay();
    const start = new Date(today.getFullYear(), today.getMonth(), sunday);
    const end = new Date(today.getFullYear(), today.getMonth(), sunday + 4);
    const format = new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    return { from: format.format(start), to: format.format(end) };
  }

  private recentAttendanceRange(): { from: string; to: string } {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
    const dateFormat = new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    return { from: dateFormat.format(from), to: dateFormat.format(today) };
  }

  loadCompanyTrainers(): void {
    if (!this.companyId) {
      return;
    }

    const requestId = ++this.trainersRequestId;
    this.trainersLoading = true;
    this.trainersLoadFailed = false;

    this.loadCompanyTrainerEvaluations();
    this.trainerAttendanceRates = {};
    this.trainerAttendanceSummary = null;
    this.trainerSummaryLoading = true;
    this.recentTrainerAttendance = null;
    const { from, to } = this.recentAttendanceRange();
    const companyId = this.companyId;
    this.companyApi.getTrainerAttendance(companyId, from, to).subscribe({
      next: records => {
        if (requestId !== this.trainersRequestId) return;

        this.recentTrainerAttendance = { companyId, from, to, records };
        let present = 0;
        let absent = 0;
        const totalsByTrainer = new Map<number, { present: number; total: number }>();
        for (const record of records) {
          const attended = record.status === 'Present' || record.status === 'Late' || record.status === 'EarlyLeave';
          if (!attended && record.status !== 'Absent') continue;

          const totals = totalsByTrainer.get(record.trainerId) ?? { present: 0, total: 0 };
          totals.total++;
          if (attended) {
            totals.present++;
            present++;
          } else {
            absent++;
          }
          totalsByTrainer.set(record.trainerId, totals);
        }
        for (const [id, totals] of totalsByTrainer) {
          this.trainerAttendanceRates[id] = Math.round(totals.present * 100 / totals.total);
        }
        const recorded = present + absent;
        this.trainerAttendanceSummary = {
          rate: recorded ? Math.round(present * 100 / recorded) : 0,
          recorded,
          absent
        };
        this.trainerSummaryLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        if (requestId !== this.trainersRequestId) return;

        this.trainerSummaryLoading = false;
        this.cdr.detectChanges();
      }
    });

    this.companyApi.getCompanyTrainers(this.companyId).subscribe({
      next: (response: unknown) => {
        if (requestId !== this.trainersRequestId) return;

        this.companyTrainers = this.normalizeTrainers(response)
          .filter(item => item != null)
          .map(item => {
            const id = this.trainerId(item);
            return {
              id,
              name: this.trainerName(item).trim() || `مدرب رقم ${id}`,
              specialty: String(item.specialty ?? item.Specialty ?? '').trim() || 'التخصص غير محدد',
              status: String(item.status ?? item.Status ?? ''),
              email: String(item.email ?? item.Email ?? '').trim(),
              phone: String(item.phoneNumber ?? item.PhoneNumber ?? item.phone ?? item.Phone ?? '').trim()
            };
          })
          .filter(trainer => Number.isSafeInteger(trainer.id) && trainer.id > 0);

        if (!this.companyTrainers.some(trainer => trainer.id === this.trainerIdFilter)) {
          this.trainerIdFilter = null;
        }
        if (!this.trainerSpecialties.includes(this.trainerSpecialtyFilter)) {
          this.trainerSpecialtyFilter = '';
        }

        this.trainersLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        if (requestId !== this.trainersRequestId) return;

        console.error('Error loading company trainers:', error);
        this.companyTrainers = [];
        this.trainersLoadFailed = true;
        this.trainersLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get filteredSupervisors(): Supervisor[] {
    const query = this.searchQuery.trim().toLowerCase();

    return this.supervisors.filter(s =>
      (this.selectedDept === 'all' || s.department === this.selectedDept) &&
      (
        !query ||
        [s.fullName, s.email, s.phone, s.department, s.position]
          .some(value =>
            String(value ?? '').toLowerCase().includes(query)
          )
      )
    );
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedDept = 'all';
  }

  selectDepartment(department: string): void {
    this.selectedDept = department;
  }

  calculateStatistics(): void {
    this.totalAssignedTrainees = this.supervisors.reduce(
      (sum, s) => sum + (s.stats?.assignedTrainees ?? 0),
      0
    );

    this.averageAttendance = this.supervisors.length
      ? Math.round(
          this.supervisors.reduce(
            (sum, s) => sum + (s.stats?.attendanceRate ?? 0),
            0
          ) / this.supervisors.length
        )
      : 0;

    this.supervisorsNeedingAttention = this.supervisors.filter(
      s => (s.stats?.attendanceRate ?? 0) < 70 || s.isInactive
    ).length;
  }

  initials(name: string): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);

    if (!parts.length) {
      return 'م';
    }

    return parts.length === 1
      ? parts[0].slice(0, 2)
      : parts[0][0] + parts[1][0];
  }

  // فتح نافذة إضافة مدرب
  openAddTrainerModal(): void {
    this.newTrainer = {
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
      specialty: '', experienceYears: 0, biography: '', cvUrl: ''
    };

    this.showTrainerModal = true;
  }

  // إغلاق نافذة إضافة مدرب
  closeTrainerModal(): void {
    if (this.savingTrainer) return;

    this.showTrainerModal = false;
  }

  // إرسال بيانات المدرب إلى API
  submitTrainer(): void {
    if (this.savingTrainer) return;

    if (!this.newTrainer.fullName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newTrainer.email.trim())) {
      this.showToast('error', 'يرجى إدخال اسم المدرب وبريد إلكتروني صحيح');
      return;
    }

    if (!this.newTrainer.specialty.trim()) {
      this.showToast('error', 'يرجى إدخال تخصص المدرب');
      return;
    }

    if (
      !Number.isFinite(Number(this.newTrainer.experienceYears)) ||
      (Number(this.newTrainer.experienceYears) < 0 || Number(this.newTrainer.experienceYears) > 100)
    ) {
      this.showToast('error', 'يرجى إدخال سنوات خبرة صحيحة');
      return;
    }

    const dto = {
      fullName: this.newTrainer.fullName.trim(),
      email: this.newTrainer.email.trim(),
      phone: this.newTrainer.phone.trim(),
      specialty: this.newTrainer.specialty.trim(),
      experienceYears: Number(this.newTrainer.experienceYears),
      biography: this.newTrainer.biography.trim(),
      cvUrl: this.newTrainer.cvUrl.trim() || null
    };

    this.savingTrainer = true;

    this.companyApi.addTrainer(dto).subscribe({
      next: (result: any) => {
        this.savingTrainer = false;
        this.closeTrainerModal();

        this.showToast(
          'success',
          result?.emailSent ? 'تم إنشاء المدرب وإرسال بيانات الدخول إلى بريده' : 'تم إنشاء المدرب لكن تعذر إرسال البريد؛ يرجى التواصل مع الدعم'
        );

        this.loadCompanyTrainers();
        this.cdr.detectChanges();
      },

      error: (error: any) => {
        this.savingTrainer = false;

        console.error('Add trainer error:', error);
        console.error('Server response:', error?.error);

        if (error?.status === 409) {
          this.showToast(
            'error',
            'هذا المستخدم لديه ملف مدرب مسبقاً'
          );
        } else if (error?.status === 400) {
          this.showToast(
            'error',
            error?.error?.message || 'البيانات المرسلة غير صحيحة'
          );
        } else {
          this.showToast(
            'error',
            'تعذر إنشاء ملف المدرب. راجعي بيانات الطلب والباك إند.'
          );
        }

        this.cdr.detectChanges();
      }
    });
  }

  // الملف الشخصي للمشرف
  openSupervisorProfile(s: Supervisor): void {
    this.selectedProfileSupervisor = s;
    this.showProfileModal = true;
    s.showMenu = false;
  }

  closeSupervisorProfile(): void {
    this.showProfileModal = false;
    this.selectedProfileSupervisor = null;
  }

  // فتح تقييمات مدرب تابع لمشرف
  get evaluationTrainer(): EvaluationTrainer | undefined {
    return this.supervisorTrainers.find(trainer => trainer.id === this.evaluationTrainerId);
  }

  openSupervisorEvaluations(supervisor: Supervisor, event?: Event): void {
    event?.stopPropagation();

    this.selectedSupervisor = supervisor;
    supervisor.showMenu = false;

    this.editingSavedEvaluation = false;
    this.resetEvaluationSelection();
    this.isEvaluationModalOpen = true;
    this.evaluationLoading = true;
    this.supervisorTrainers = [];

    this.companyApi.getSupervisorTrainers(supervisor.supervisorId).subscribe({
      next: (response: any) => {
        if (!this.isEvaluationModalOpen || this.selectedSupervisor !== supervisor) return;
        this.supervisorTrainers = this.normalizeTrainers(response)
          .map((item, index): EvaluationTrainer => {
            const name = this.trainerName(item);

            return {
              id: this.trainerId(item),
              name,
              track:
                item.specialty ??
                item.Specialty ??
                item.program ??
                item.Program ??
                'مدرب',
              color: this.avatarColors[index % this.avatarColors.length],
              initials: this.initials(name),
              currentRating: String(
                item.currentRating ??
                item.CurrentRating ??
                ''
              ),
              explanationClarity: this.toEvaluationScore(
                item.explanationClarity ?? item.ExplanationClarity,
                3
              ),
              interactionAndSupport: this.toEvaluationScore(
                item.interactionAndSupport ?? item.InteractionAndSupport,
                3
              ),
              evaluationComment: String(
                item.evaluationComment ??
                item.EvaluationComment ??
                ''
              )
            };
          })
          .filter(
            t => Number.isFinite(t.id) &&
              t.id > 0
          );

        const savedEvaluations = this.readLocalEvaluations();

        this.supervisorTrainers = this.supervisorTrainers.map(trainer => {
          const saved = savedEvaluations.find(item =>
            Number(item.trainerId) === trainer.id &&
            Number(item.supervisorId) === supervisor.supervisorId
          );

          if (!saved) {
            return trainer;
          }

          return {
            ...trainer,
            currentRating: String(
              saved.currentRating ?? trainer.currentRating
            ),
            explanationClarity: this.toEvaluationScore(
              saved.explanationClarity,
              trainer.explanationClarity
            ),
            interactionAndSupport: this.toEvaluationScore(
              saved.interactionAndSupport,
              trainer.interactionAndSupport
            ),
            evaluationComment: String(
              saved.evaluationComment ??
              trainer.evaluationComment ??
              ''
            )
          };
        });

        this.evaluationLoading = false;
        this.cdr.detectChanges();
      },

      error: (error: unknown) => {
        console.error('Error loading supervisor trainers:', error);

        this.evaluationLoading = false;

        this.showToast(
          'error',
          'تعذر تحميل المدربين التابعين للمشرف'
        );

        this.cdr.detectChanges();
      }
    });
  }

  startNewTrainerEvaluation(): void {
    if (this.editingSavedEvaluation && this.selectedSupervisor) {
      this.openSupervisorEvaluations(this.selectedSupervisor);
      return;
    }

    this.resetEvaluationSelection();
  }

  private resetEvaluationSelection(): void {
    this.evaluationSaved = false;
    this.evaluationTrainerId = null;
  }

  closeEvaluationModal(): void {
    if (this.savingEvaluation) return;
    this.resetEvaluationSelection();
    this.isEvaluationModalOpen = false;
    this.supervisorTrainers = [];
    this.editingSavedEvaluation = false;
  }

  private toEvaluationScore(value: unknown, fallback = 3): number {
    const score = Number(value);

    return Number.isFinite(score) && score >= 1 && score <= 5
      ? score
      : fallback;
  }

  getEvaluationAverage(trainer: EvaluationTrainer): string {
    const clarity = this.toEvaluationScore(trainer.explanationClarity);
    const interaction = this.toEvaluationScore(trainer.interactionAndSupport);

    return ((clarity + interaction) / 2).toFixed(2);
  }

  readEvaluationCount(): number {
    return this.readLocalEvaluations().length;
  }

  getHistoryAverage(evaluation: any): string {
    const clarity = Number(evaluation?.explanationClarity ?? 0);
    const interaction = Number(evaluation?.interactionAndSupport ?? 0);

    return Number.isFinite(clarity) && Number.isFinite(interaction)
      ? ((clarity + interaction) / 2).toFixed(2)
      : '0.00';
  }

  get evaluationHistory(): any[] {
    const query = this.evaluationSearch.trim().toLowerCase();

    return this.readLocalEvaluations()
      .filter(item =>
        !query ||
        [
          item.trainerName,
          item.supervisorName,
          item.currentRating,
          item.evaluationComment
        ].some(value =>
          String(value ?? '').toLowerCase().includes(query)
        )
      )
      .sort(
        (a, b) =>
          new Date(b.savedAt ?? 0).getTime() -
          new Date(a.savedAt ?? 0).getTime()
      );
  }

  showSupervisorsView(): void {
    this.activeView = 'supervisors';
  }

  showEvaluationHistory(): void {
    this.activeView = 'evaluations';
  }

  editSavedEvaluation(evaluation: any): void {
    const supervisor = this.supervisors.find(
      item => item.supervisorId === Number(evaluation.supervisorId)
    );

    if (!supervisor) {
      this.showToast(
        'error',
        'تعذر العثور على المشرف المرتبط بهذا التقييم'
      );
      return;
    }

    this.selectedSupervisor = supervisor;

    this.supervisorTrainers = [{
      id: Number(evaluation.trainerId),
      name: String(evaluation.trainerName ?? 'مدرب'),
      color: this.avatarColors[0],
      initials: this.initials(
        String(evaluation.trainerName ?? 'مدرب')
      ),
      track: 'مدرب',
      currentRating: String(evaluation.currentRating ?? ''),
      explanationClarity: this.toEvaluationScore(
        evaluation.explanationClarity
      ),
      interactionAndSupport: this.toEvaluationScore(
        evaluation.interactionAndSupport
      ),
      evaluationComment: String(
        evaluation.evaluationComment ?? ''
      )
    }];

    this.evaluationSaved = false;
    this.evaluationTrainerId = this.supervisorTrainers[0].id;
    this.editingSavedEvaluation = true;
    this.isEvaluationModalOpen = true;
    this.evaluationLoading = false;
  }

  formatEvaluationDate(value: string | undefined): string {
    if (!value) {
      return 'غير محدد';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? 'غير محدد'
      : date.toLocaleString('ar-OM');
  }

  private readLocalEvaluations(): any[] {
    try {
      if (!this.companyId) {
        return [];
      }

      const current = JSON.parse(
        localStorage.getItem(this.storageKey('company_supervisor_evaluations')) || '[]'
      );

      const records = Array.isArray(current) ? current : [];

      const unique = new Map<string, any>();

      records.forEach(item => {
        const key =
          `${Number(item.trainerId)}-${Number(item.supervisorId)}`;

        const previous = unique.get(key);

        if (
          !previous ||
          new Date(item.savedAt ?? 0).getTime() >=
          new Date(previous.savedAt ?? 0).getTime()
        ) {
          unique.set(key, item);
        }
      });

      return Array.from(unique.values());
    } catch (error) {
      console.warn('Could not read local trainer evaluations:', error);
      return [];
    }
  }

  saveTrainerEvaluation(trainer: EvaluationTrainer): void {
    if (this.savingEvaluation) return;

    if (!this.selectedSupervisor || !trainer.currentRating) {
      this.showToast(
        'error',
        'يرجى اختيار التقييم العام أولاً'
      );
      return;
    }

    const clarity = Number(trainer.explanationClarity);
    const interaction = Number(trainer.interactionAndSupport);

    if (
      !Number.isFinite(clarity) ||
      clarity < 1 ||
      clarity > 5 ||
      !Number.isFinite(interaction) ||
      interaction < 1 ||
      interaction > 5
    ) {
      this.showToast(
        'error',
        'يرجى إدخال درجات صحيحة من 1 إلى 5'
      );
      return;
    }

    const supervisor = this.selectedSupervisor;
    const averageRating = Number(
      ((clarity + interaction) / 2).toFixed(2)
    );
    const savedAt = new Date().toISOString();

    const evaluation = {
      trainerId: trainer.id,
      trainerName: trainer.name,
      supervisorId: supervisor.supervisorId,
      supervisorName: supervisor.fullName,
      currentRating: trainer.currentRating,
      explanationClarity: clarity,
      interactionAndSupport: interaction,
      averageRating,
      evaluationComment: String(
        trainer.evaluationComment ?? ''
      ).trim(),
      savedAt
    };

    const rating = Math.round(averageRating);
    this.savingEvaluation = true;
    this.companyApi.saveSupervisorTrainerEvaluation(
      supervisor.supervisorId, trainer.id, rating, evaluation.evaluationComment
    ).subscribe({
      next: () => {
        try {
          const evaluations = this.readLocalEvaluations();

          const existingIndex = evaluations.findIndex(item =>
            Number(item.trainerId) === trainer.id &&
            Number(item.supervisorId) === supervisor.supervisorId
          );

          if (existingIndex >= 0) {
            evaluations[existingIndex] = evaluation;
          } else {
            evaluations.unshift(evaluation);
          }

          localStorage.setItem(
            this.storageKey('company_supervisor_evaluations'),
            JSON.stringify(evaluations)
          );

          const key = this.storageKey('company_supervisor_activities');

          let previous: unknown;

          try {
            previous = JSON.parse(localStorage.getItem(key) || '[]');
          } catch {
            previous = [];
          }

          const activities = Array.isArray(previous)
            ? previous as any[]
            : [];

          activities.unshift({
            message:
              `تم تقييم المدرب (${trainer.name}) بتقدير: ` +
              `[${trainer.currentRating}] بواسطة المشرف: ` +
              `(${supervisor.fullName})`,
            date: new Date(savedAt).toLocaleString('ar-OM'),
            type: 'evaluation',
            ...evaluation
          });

          localStorage.setItem(
            key,
            JSON.stringify(activities)
          );
        } catch (error) {
          console.warn('Could not update local evaluation history:', error);
        }

        this.storeTrainerEvaluation(trainer.id, {
          supervisorId: supervisor.supervisorId,
          supervisorName: supervisor.fullName,
          rating,
          comment: evaluation.evaluationComment,
          savedAt
        });
        this.savingEvaluation = false;
        this.evaluationTrainerId = null;
        this.evaluationSaved = true;
        this.showToast('success', 'تم حفظ التقييم بنجاح.');
        this.cdr.detectChanges();
      },
      error: error => {
        this.savingEvaluation = false;
        this.showToast('error', error?.error?.message || 'تعذر حفظ التقييم في النظام.');
        this.cdr.detectChanges();
      }
    });
  }

  // قائمة خيارات المشرف
  toggleDropdown(s: Supervisor, event?: MouseEvent): void {
    event?.stopPropagation();

    this.supervisors.forEach(item => {
      if (item !== s) {
        item.showMenu = false;
      }
    });

    s.showMenu = !s.showMenu;
  }

  // تعديل بيانات المشرف
  editSupervisor(s: Supervisor): void {
    this.selectedSupervisor = s;
    this.editingSupervisor = true;
    this.showAddModal = true;

    this.newSupervisor = {
      fullName: s.fullName,
      department: s.department,
      position: s.position,
      email: s.email,
      phone: s.phone,
      password: '',
    confirmPassword: '',
      isInactive: s.isInactive ?? false
    };

    s.showMenu = false;
  }

  // فتح نافذة إضافة مشرف
  openAddModal(): void {
    this.editingSupervisor = false;
    this.selectedSupervisor = null;
    this.showAddModal = true;

    this.newSupervisor = {
      fullName: '',
      department: 'تقنية المعلومات',
      position: 'مشرف تقنية المعلومات',
      email: '',
      phone: '',
      password: '',
    confirmPassword: '',
    isInactive: false
    };
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.editingSupervisor = false;
    this.selectedSupervisor = null;
  }

  // إضافة مشرف أو حفظ تعديلاته
  submitSupervisor(): void {
    if (this.savingSupervisor) return;
    if (!this.newSupervisor.fullName.trim()) {
      this.showToast('error', 'يرجى إدخال اسم المشرف');
      return;
    }

    const dto = {
      fullName: this.newSupervisor.fullName,
      phone: this.newSupervisor.phone,
      email: this.newSupervisor.email,
      department: this.newSupervisor.department,
      position: this.newSupervisor.position,
      companyId: this.companyId,
      status: this.newSupervisor.isInactive ? 'Inactive' : 'Active'
    };

    if (!this.editingSupervisor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newSupervisor.email.trim())) {
      this.showToast('error', 'يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    const editing =
      this.editingSupervisor && !!this.selectedSupervisor;

    const request = editing
      ? this.companyApi.updateSupervisor(
          this.selectedSupervisor!.supervisorId,
          dto
        )
      : this.companyApi.registerCompanySupervisor(dto);

    this.savingSupervisor = true;
    request.subscribe({
      next: (result: any) => {
        this.savingSupervisor = false;
        this.showToast(
          'success',
          editing
            ? 'تم تحديث بيانات المشرف بنجاح'
            : (result?.emailSent ? 'تمت إضافة المشرف وإرسال بيانات الدخول إلى بريده' : 'تمت إضافة المشرف لكن تعذر إرسال البريد؛ يرجى التواصل مع الدعم')
        );

        this.closeAddModal();
        this.loadSupervisors();
      },

      error: (error: unknown) => {
        this.savingSupervisor = false;

        this.showToast(
          'error',
          editing
            ? 'تعذر تحديث بيانات المشرف'
            : ((error as any)?.error?.message || 'تعذر إضافة المشرف')
        );
      }
    });
  }

  // تجميد الحساب أو تنشيطه
  toggleStatus(s: Supervisor): void {
    const dto = {
      fullName: s.fullName,
      phone: s.phone,
      email: s.email,
      department: s.department,
      position: s.position,
      status: s.isInactive ? 'Active' : 'Inactive',
      companyId: s.companyId ?? this.companyId,
      userId: s.userId
    };

    this.companyApi.updateSupervisor(
      s.supervisorId,
      dto
    ).subscribe({
      next: () => {
        this.showToast(
          'success',
          s.isInactive
            ? 'تم تنشيط الحساب بنجاح'
            : 'تم تجميد الحساب بنجاح'
        );

        this.loadSupervisors();
      },

      error: (error: unknown) => {
        console.error('Toggle status error:', error);
        this.showToast('error', 'تعذر تغيير حالة الحساب');
      }
    });

    s.showMenu = false;
  }

  // حذف المشرف
  deleteSupervisor(s: Supervisor): void {
    if (!confirm(`هل أنت متأكد من حذف المشرف ${s.fullName}؟`)) {
      return;
    }

    this.companyApi.deleteSupervisor(s.supervisorId).subscribe({
      next: () => {
        this.showToast('success', 'تم حذف المشرف بنجاح');
        this.loadSupervisors();
      },

      error: (error: unknown) => {
        console.error('Delete supervisor error:', error);
        this.showToast('error', 'تعذر حذف المشرف');
      }
    });

    s.showMenu = false;
  }

  // فتح نافذة توزيع المدربين
  private assignedTrainerIds(response: unknown): number[] {
    return [...new Set(this.normalizeTrainers(response)
      .map(item => this.trainerId(item))
      .filter(id => Number.isSafeInteger(id) && id > 0))];
  }

  private updateSupervisorDistribution(supervisor: Supervisor, ids: number[]): void {
    this.distributionMap[supervisor.supervisorId] = ids;
    const current = this.supervisors.find(item => item.supervisorId === supervisor.supervisorId);
    if (supervisor.stats) supervisor.stats.assignedTrainees = ids.length;
    if (current?.stats) current.stats.assignedTrainees = ids.length;
    this.calculateStatistics();
  }

  openDistributeModal(s: Supervisor): void {
    this.selectedSupervisor = s;
    this.isDistributeModalOpen = true;
    this.distributionLoading = true;
    this.traineesList = [];
    s.showMenu = false;

    forkJoin({
      assigned: this.companyApi.getSupervisorTrainers(s.supervisorId),
      trainers: this.companyApi.getCompanyTrainers(this.companyId)
    }).subscribe({
      next: ({ assigned, trainers }) => {
        if (!this.isDistributeModalOpen || this.selectedSupervisor !== s) return;
        const selected = this.assignedTrainerIds(assigned);
        this.updateSupervisorDistribution(s, selected);
        this.traineesList = this.normalizeTrainers(trainers)
          .map((item, index): Trainee => {
            const id = this.trainerId(item);
            const name = this.trainerName(item);

            return {
              id,
              name,
              email: item.email ?? item.Email ?? '',
              assigned: selected.includes(id),
              color: this.avatarColors[index % this.avatarColors.length],
              initials: this.initials(name),
              track:
                item.specialty ??
                item.Specialty ??
                item.program ??
                item.Program ??
                'مدرب',
              batch: item.department ?? item.Department ?? ''
            };
          })
          .filter(
            t => Number.isFinite(t.id) &&
              t.id > 0 &&
              !!t.name.trim()
          );

        this.distributionLoading = false;
        this.cdr.detectChanges();
      },

      error: (error: unknown) => {
        console.error('Error loading company trainers:', error);

        this.distributionLoading = false;
        this.traineesList = [];

        this.showToast('error', 'تعذر تحميل قائمة المدربين');
        this.cdr.detectChanges();
      }
    });
  }

  closeDistributeModal(): void {
    this.isDistributeModalOpen = false;
    this.selectedSupervisor = null;
    this.traineesList = [];
  }

  get selectedAssignedCount(): number {
    return this.traineesList.filter(t => t.assigned).length;
  }

  get allTraineesSelected(): boolean {
    return this.traineesList.length > 0 &&
      this.traineesList.every(t => t.assigned);
  }

  toggleAllTrainees(): void {
    const value = !this.allTraineesSelected;

    this.traineesList.forEach(t => {
      t.assigned = value;
    });
  }

  // حفظ توزيع المدربين عبر API
  saveDistribution(): void {
    if (!this.selectedSupervisor || this.distributionLoading) {
      return;
    }

    const supervisor = this.selectedSupervisor;
    const id = supervisor.supervisorId;

    const selectedIds = this.traineesList
      .filter(t => t.assigned)
      .map(t => t.id);

    this.distributionLoading = true;

    this.companyApi.assignTrainersToSupervisor(
      id,
      selectedIds
    ).subscribe({
      next: () => {
        this.updateSupervisorDistribution(supervisor, selectedIds);

        this.showToast(
          'success',
          'تم حفظ توزيع المدربين بنجاح'
        );

        this.closeDistributeModal();
        this.distributionLoading = false;
        this.cdr.detectChanges();
      },

      error: (error: unknown) => {
        console.error('Backend distribution save failed:', error);

        this.distributionLoading = false;

        this.showToast(
          'error',
          'فشل حفظ التوزيع في قاعدة البيانات، لم يتم اعتماد التغيير'
        );

        this.cdr.detectChanges();
      }
    });
  }

  getAttendanceValue(value?: number): number {
    return Number.isFinite(Number(value))
      ? Math.max(0, Math.min(100, Number(value)))
      : 0;
  }

  getAttendanceClass(value?: number): string {
    const n = Number(value ?? 0);

    return n >= 90
      ? 'excellent'
      : n >= 70
        ? 'warning'
        : 'danger';
  }

  // رسائل التنبيه
  showToast(type: ToastType, message: string): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toast = {
      visible: true,
      type,
      message
    };

    this.toastTimer = setTimeout(() => {
      this.toast.visible = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  hideToast(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toast.visible = false;
  }
}