import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

  companyId = 1;
  loading = false;
  errorMessage = '';

  activeView: 'supervisors' | 'evaluations' = 'supervisors';
  evaluationSearch = '';
  editingSavedEvaluation = false;

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

  showAddModal = false;
  editingSupervisor = false;

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

  newSupervisor = {
    fullName: '',
    department: '',
    position: '',
    email: '',
    phone: '',
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
    this.loadSupervisors();
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
    this.loading = true;
    this.errorMessage = '';

    this.companyApi.getSupervisors(this.companyId).subscribe({
      next: (response: any) => {
        const data: any[] = Array.isArray(response)
          ? response
          : (response?.items ?? response?.data ?? []);

        const fakeStats: SupervisorStats[] = [
          { monthlyEvaluations: 4, attendanceRate: 94, assignedTrainees: 0 },
          { monthlyEvaluations: 3, attendanceRate: 88, assignedTrainees: 0 },
          { monthlyEvaluations: 6, attendanceRate: 96, assignedTrainees: 0 },
          { monthlyEvaluations: 2, attendanceRate: 72, assignedTrainees: 0 },
          { monthlyEvaluations: 5, attendanceRate: 91, assignedTrainees: 0 },
          { monthlyEvaluations: 3, attendanceRate: 79, assignedTrainees: 0 },
          { monthlyEvaluations: 7, attendanceRate: 97, assignedTrainees: 0 },
          { monthlyEvaluations: 4, attendanceRate: 85, assignedTrainees: 0 }
        ];

        this.supervisors = data.map((item, index) => {
          const id = Number(item.supervisorId ?? item.id ?? index + 1);
          const status = item.status ?? 'Active';
          const stats = item.stats ?? fakeStats[index % fakeStats.length];

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
            lastActivity: item.lastActivity ?? 'نشط مؤخراً',
            stats: {
              monthlyEvaluations: Number(stats.monthlyEvaluations ?? 0),
              attendanceRate: Number(stats.attendanceRate ?? 0),
              assignedTrainees: Number(stats.assignedTrainees ?? 0)
            }
          } as Supervisor;
        });

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
    this.loadSupervisors();
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
  openSupervisorEvaluations(supervisor: Supervisor, event?: Event): void {
    event?.stopPropagation();

    this.selectedSupervisor = supervisor;
    supervisor.showMenu = false;

    this.editingSavedEvaluation = false;
    this.isEvaluationModalOpen = true;
    this.evaluationLoading = true;
    this.supervisorTrainers = [];

    const assignedIds = this.distributionMap[supervisor.supervisorId];

    if (!assignedIds) {
      this.evaluationLoading = false;

      this.showToast(
        'info',
        'يجب تحميل توزيع المدربين لهذا المشرف أولاً. التوزيع المحلي غير متوفر بعد تحديث الصفحة.'
      );

      this.cdr.detectChanges();
      return;
    }

    this.companyApi.getCompanyTrainers(this.companyId).subscribe({
      next: (response: any) => {
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
              t.id > 0 &&
              assignedIds.includes(t.id)
          );

        // استرجاع التقييم المحفوظ لكل مدرب ومشرف
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

  closeEvaluationModal(): void {
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

  // حساب المتوسط تلقائياً
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

  // التقييمات المعروضة في تبويب السجل
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

  // فتح التقييم المحفوظ في نافذة التعديل
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

  // قراءة التقييمات الحالية والسابقة من التخزين المحلي
  private readLocalEvaluations(): any[] {
    try {
      const current = JSON.parse(
        localStorage.getItem('company_supervisor_evaluations') || '[]'
      );

      const legacy = JSON.parse(
        localStorage.getItem('nafadh_company_supervisor_evaluations') || '[]'
      );

      const records = [
        ...(Array.isArray(current) ? current : []),
        ...(Array.isArray(legacy) ? legacy : [])
      ];

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

  // حفظ التقييم أو تحديث التقييم السابق
  saveTrainerEvaluation(trainer: EvaluationTrainer): void {
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

    try {
      // تحديث التقييم الموجود أو إضافة تقييم جديد
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
        'company_supervisor_evaluations',
        JSON.stringify(evaluations)
      );

      localStorage.setItem(
        'nafadh_company_supervisor_evaluations',
        JSON.stringify(evaluations)
      );

      // إضافة سجل نشاط منفصل دون الانتقال إلى صفحة سجل النشاطات
      const key = 'company_supervisor_activities';

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

      this.editingSavedEvaluation = false;

      this.showToast(
        'success',
        'تم حفظ التقييم بنجاح. يمكنك مراجعته وتعديله من تبويب سجل التقييمات.'
      );

      // تبقى نافذة التقييم مفتوحة ولا يتم الانتقال لسجل النشاطات
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Evaluation local save failed:', error);

      this.showToast(
        'error',
        'تعذر حفظ التقييم في التخزين المحلي'
      );
    }
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

    const editing =
      this.editingSupervisor && !!this.selectedSupervisor;

    const request = editing
      ? this.companyApi.updateSupervisor(
          this.selectedSupervisor!.supervisorId,
          dto
        )
      : this.companyApi.addSupervisor(dto);

    request.subscribe({
      next: () => {
        this.showToast(
          'success',
          editing
            ? 'تم تحديث بيانات المشرف بنجاح'
            : 'تمت إضافة المشرف بنجاح'
        );

        this.closeAddModal();
        this.loadSupervisors();
      },

      error: (error: unknown) => {
        console.error('Supervisor save error:', error);

        this.showToast(
          'error',
          editing
            ? 'تعذر تحديث بيانات المشرف'
            : 'تعذر إضافة المشرف'
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
  openDistributeModal(s: Supervisor): void {
    this.selectedSupervisor = s;
    this.isDistributeModalOpen = true;
    this.distributionLoading = true;
    this.traineesList = [];
    s.showMenu = false;

    const selected = this.distributionMap[s.supervisorId] ?? [];

    this.companyApi.getCompanyTrainers(this.companyId).subscribe({
      next: (response: any) => {
        this.traineesList = this.normalizeTrainers(response)
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
        this.distributionMap[id] = [...selectedIds];

        if (supervisor.stats) {
          supervisor.stats.assignedTrainees = selectedIds.length;
        }

        this.calculateStatistics();

        this.showToast(
          'success',
          'تم حفظ توزيع المدربين في الباك إند بنجاح'
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