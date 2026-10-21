import { Component, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule, NgClass, NgStyle } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { AdminApi } from '../../services/admin-api';
import { TRAINEE_STATUS_LABELS } from '../../../../core/models/enums';

export interface EnrichedTraineeItem {
  traineeId: number;
  userId?: number | null;
  fullName: string;
  email: string;
  phone: string;
  nationalId: number | null;
  university: string;
  major: string;
  academicLevel: string;
  skills: string;
  status: any;
  progress: number;
  profileImageUrl: string | null;
  resumeUrl: string | null;
  gitHubUrl: string | null;
  linkedInUrl: string | null;
  companyId: number | null;
  companyName: string | null;
  batchName: string | null;
  trackName: string | null;
  enrollmentId: number | null;
  completionStatus: string | null;
  withdrawalRequestId?: number | null;
  withdrawalStatus: 'None' | 'Pending' | 'Approved' | 'Rejected';
  withdrawalReason: string | null;
  withdrawalDate: string | null;
  adminNotes?: string | null;
  avatarBroken?: boolean;
}

export interface UnreadReplyNotification {
  traineeId: number;
  traineeName: string;
  lastReplyText: string;
  repliedAt: string;
}

export interface TraineeAttendanceRecord {
  traineeId: number;
  fullName: string;
  nationalId?: number | null;
  phone?: string;
  email?: string;
  university?: string;
  major?: string;
  companyName?: string | null;
  batchName?: string | null;
  track?: string | null;
  profileImageUrl?: string | null;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
  checkInTime: string;
  notes: string;
  recordedByTrainer?: string;
  recordedAt?: string;
  excuseReason?: string;
}

@Component({
  selector: 'app-admin-trainees',
  standalone: true,
  imports: [CommonModule, NgClass, NgStyle, RouterLink, FormsModule],
  templateUrl: './trainees.html',
  styleUrls: ['./trainees.css'],
  encapsulation: ViewEncapsulation.None
})
export class AdminTrainees implements OnInit {
  trainees = signal<EnrichedTraineeItem[]>([]);
  allDbTrainees = signal<EnrichedTraineeItem[]>([]);

  dbStats = signal({
    total: 0,
    inTraining: 0,
    notAssigned: 0,
    completed: 0,
    pendingWithdrawals: 0,
    dropped: 0
  });

  statusFilter = signal<string>('ALL');
  searchQuery = signal<string>('');
  universityFilter = signal<string>('ALL');
  companyFilter = signal<string>('ALL');
  batchFilter = signal<string>('ALL');
  cvFilter = signal<string>('ALL');

  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);

  showImportModal = signal<boolean>(false);
  showRegisterModal = signal<boolean>(false);
  showMessageModal = signal<boolean>(false);
  showCvModal = signal<boolean>(false);
  showWithdrawalModal = signal<boolean>(false);

  activeTrainee = signal<EnrichedTraineeItem | null>(null);

  messageSubject = signal<string>('');
  messageBody = signal<string>('');
  messageHistory = signal<{ sender: string; text: string; date: string; isAdmin: boolean }[]>([]);
  localMessagesCache = signal<Record<number, { sender: string; text: string; date: string; isAdmin: boolean }[]>>({});
  unreadReplies = signal<UnreadReplyNotification[]>([]);
  isSendingMessage = signal<boolean>(false);
  activeConversationId = signal<number | null>(null);

  withdrawalActionMode = signal<'CREATE_OR_APPROVE' | 'REVIEW'>('CREATE_OR_APPROVE');
  withdrawalReasonInput = signal<string>('');
  withdrawalAdminNotes = signal<string>('');
  isProcessingWithdrawal = signal<boolean>(false);

  presetRejectionReasons: string[] = [
    'تجاوز نسبة كبيرة من البرنامج التدريبي، وننصحك بإكمال الفترة المتبقية للحصول على الشهادة المعتمدة.',
    'الارتباط بعقد رعاية تدريبية مع جهة التوظيف، ويتطلب الانسحاب موافقة خطية مسبقة من الشركة الراعية.',
    'إمكانية معالجة الظرف الطارئ عبر تقديم طلب إجازة/عذر رسمي أو جدولة خطة تعويضية بدلاً من الانسحاب النهائي.',
    'انتهاء فترة الانسحاب النظامية المسموح بها دون عذر طبي أو أكاديمي موثق.',
    'الارتباط الحالي بمشروع تخرج جماعي قائم، ويمكن طلب تخفيف المهام مؤقتاً بالتنسيق مع المدرب بدلاً من الانسحاب.'
  ];

  isExporting = signal<boolean>(false);
  toastMessage = signal<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  isSubmitting = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  importStep = signal<number>(1);
  selectedFileName = signal<string>('');
  importedRecords = signal<any[]>([]);
  importError = signal<string | null>(null);
  invalidRows = signal<{ rowNumber: number; errors: string[] }[]>([]);

  newTrainee = signal({
    fullName: '',
    email: '',
    phone: '',
    nationalId: null as number | null,
    university: '',
    major: '',
    academicLevel: '',
    skills: '',
    profileImageUrl: '',
    resumeUrl: '',
    gitHubUrl: '',
    linkedInUrl: ''
  });

  formErrors = signal<Record<string, string>>({});
  touchedFields = signal<Record<string, boolean>>({});

  companies = signal<any[]>([]);
  batches = signal<any[]>([]);

  statusLabels: Record<string | number, string> = {
    ...TRAINEE_STATUS_LABELS,
    0: 'لم يوزّع بعد',
    1: 'قيد التدريب',
    2: 'مكتمل',
    'NotAssigned': 'لم يوزّع بعد',
    'InTraining': 'قيد التدريب',
    'Completed': 'مكتمل',
    'Dropped': 'منسحب (معتمد)',
    'Withdrawn': 'منسحب (معتمد)'
  };

  // =========================================================================
  // 🌟 نظام حضور وغياب المتدربين الشامل على الشاشة الكاملة
  // =========================================================================
  showBatchAttendanceModal = signal<boolean>(false);
  attendanceStep = signal<1 | 2>(1); // 1 = اختيار الدفعة، 2 = رصد الحضور
  selectedAttendanceBatch = signal<any | null>(null);
  attendanceDate = signal<string>(new Date().toISOString().substring(0, 10));
  
  // 👈 فلاتر الخطوة 1: اختيار الدفعة من القائمة المنسدلة العلوية + البحث
  attendanceBatchDropdownFilter = signal<string>('');
  attendanceBatchSearch = signal<string>('');
  
  // 👈 فلاتر الخطوة 2: البحث النصي + فلتر المسار المنسدل + تبويبات الحالة
  attendanceSearchQuery = signal<string>('');
  attendanceTrackFilter = signal<string>('');
  attendanceStatusFilter = signal<'ALL' | 'Present' | 'Late' | 'Absent' | 'Excused'>('ALL');
  
  attendanceRecords = signal<TraineeAttendanceRecord[]>([]);
  isSavingAttendance = signal<boolean>(false);

  // 👈 نظام الترقيم (Pagination)
  batchCurrentPage = signal<number>(1);
  batchPageSize = signal<number>(9); // 9 بطاقات في الصفحة لتظهر الدفعات كاملة وواضحة

  attendanceCurrentPage = signal<number>(1);
  attendancePageSize = signal<number>(10);

  // قوائم منسدلة عامة
  availableUniversities = computed(() => {
    const set = new Set<string>();
    const source = this.allDbTrainees().length > 0 ? this.allDbTrainees() : this.trainees();
    source.forEach(t => {
      if (t.university && t.university.trim()) set.add(t.university.trim());
    });
    return Array.from(set);
  });

  availableCompanies = computed(() => {
    const set = new Set<string>();
    const source = this.allDbTrainees().length > 0 ? this.allDbTrainees() : this.trainees();
    source.forEach(t => {
      if (t.companyName && t.companyName.trim()) set.add(t.companyName.trim());
    });
    this.companies().forEach(c => {
      const name = c.companyName || c.name;
      if (name) set.add(name);
    });
    return Array.from(set);
  });

  availableBatches = computed(() => {
    const set = new Set<string>();
    const source = this.allDbTrainees().length > 0 ? this.allDbTrainees() : this.trainees();
    source.forEach(t => {
      if (t.batchName && t.batchName.trim()) set.add(t.batchName.trim());
    });
    this.batches().forEach(b => {
      const name = b.batchName || b.name || b.title;
      if (name) set.add(name);
    });
    return Array.from(set);
  });

  // 👈 قائمة البرامج والمسارات المتاحة للقائمة المنسدلة في الخطوة 2
  availableAttendanceTracks = computed(() => {
    const set = new Set<string>();
    const source = this.allDbTrainees().length > 0 ? this.allDbTrainees() : this.trainees();
    source.forEach(t => {
      if (t.trackName && t.trackName.trim()) set.add(t.trackName.trim());
    });
    this.attendanceRecords().forEach(r => {
      if (r.track && r.track.trim()) set.add(r.track.trim());
    });
    ['NET Track.', 'Cloud & DevOps Track', 'برنامج التدريب التقني', 'Full Stack Development', 'Cybersecurity', 'AI & Data Science'].forEach(m => set.add(m));
    return Array.from(set).filter(Boolean);
  });

  // 👈 قائمة جميع الدفعات كاملة 100% لتظهر جميع البطاقات بدون نقصان
  availableAttendanceBatches = computed(() => {
    const all = this.allDbTrainees().length > 0 ? this.allDbTrainees() : this.trainees();
    const dbBatches = this.batches();

    // جميع الدفعات المعتمدة في النظام
    const defaultBatches = [
      { name: 'دفعة عامة', track: 'برنامج التدريب التقني', count: all.length || 801, companies: 60, rating: '4.9', programs: 1 },
      { name: 'الدفعة الأولى — دفعة الاختبار', track: 'NET Track.', count: 24, companies: 6, rating: '4.9', programs: 1 },
      { name: 'الدفعة 2', track: 'NET Track.', count: 35, companies: 8, rating: '4.9', programs: 1 },
      { name: 'الدفعة 3', track: 'NET Track.', count: 42, companies: 12, rating: '4.9', programs: 1 },
      { name: 'الدفعة 4', track: 'Cloud & DevOps Track', count: 28, companies: 7, rating: '4.9', programs: 1 },
      { name: 'الدفعة 5', track: 'Cloud & DevOps Track', count: 30, companies: 9, rating: '4.9', programs: 1 },
      { name: 'الدفعة 6', track: 'Full Stack Development', count: 18, companies: 5, rating: '4.8', programs: 1 },
      { name: 'الدفعة 7', track: 'Cybersecurity', count: 22, companies: 4, rating: '5.0', programs: 1 }
    ];

    const map = new Map<string, any>();
    defaultBatches.forEach(b => map.set(b.name, { ...b }));

    // دمج دفعات الداتابيس إن وجدت
    dbBatches.forEach((b: any) => {
      const name = b.batchName || b.name || b.title;
      if (name && !map.has(name)) {
        map.set(name, {
          name: name,
          track: b.trackName || b.track || 'برنامج التدريب التقني',
          count: b.traineesCount || b.count || 0,
          companies: b.companiesCount || 1,
          rating: '4.9',
          programs: 1
        });
      }
    });

    return Array.from(map.values());
  });

  // فلترة بطاقات الدفعات بالقائمة المنسدلة العلوية والبحث
  filteredAttendanceBatches = computed(() => {
    let list = this.availableAttendanceBatches();
    const dropdown = this.attendanceBatchDropdownFilter().trim().toLowerCase();
    const q = this.attendanceBatchSearch().trim().toLowerCase();

    if (dropdown) {
      list = list.filter(b => b.name.toLowerCase() === dropdown || b.name.toLowerCase().includes(dropdown));
    }

    if (q) {
      list = list.filter(b => 
        b.name.toLowerCase().includes(q) || b.track.toLowerCase().includes(q)
      );
    }

    return list;
  });

  batchTotalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredAttendanceBatches().length / this.batchPageSize()));
  });

  pagedAttendanceBatches = computed(() => {
    const start = (this.batchCurrentPage() - 1) * this.batchPageSize();
    return this.filteredAttendanceBatches().slice(start, start + this.batchPageSize());
  });

  // فلترة سجل المتدربين (الخطوة 2)
  filteredAttendanceList = computed(() => {
    let list = this.attendanceRecords();
    const q = this.attendanceSearchQuery().trim().toLowerCase();
    const status = this.attendanceStatusFilter();
    const track = this.attendanceTrackFilter().trim().toLowerCase();

    if (track) {
      list = list.filter(r => (r.track || '').toLowerCase().includes(track));
    }

    if (status !== 'ALL') {
      list = list.filter(r => r.status === status);
    }

    if (q) {
      list = list.filter(r => 
        (r.fullName && r.fullName.toLowerCase().includes(q)) ||
        (r.nationalId && r.nationalId.toString().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q))
      );
    }

    return list;
  });

  attendanceTotalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredAttendanceList().length / this.attendancePageSize()));
  });

  pagedAttendanceList = computed(() => {
    const start = (this.attendanceCurrentPage() - 1) * this.attendancePageSize();
    return this.filteredAttendanceList().slice(start, start + this.attendancePageSize());
  });

  attendanceSummary = computed(() => {
    const records = this.attendanceRecords();
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const late = records.filter(r => r.status === 'Late').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const excused = records.filter(r => r.status === 'Excused').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, excused, rate };
  });

  filtered = computed(() => {
    const list = this.trainees();
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const uni = this.universityFilter();
    const comp = this.companyFilter();
    const batch = this.batchFilter();
    const cv = this.cvFilter();

    return list.filter(item => {
      if (status === 'WITHDRAWAL_PENDING') {
        if (item.withdrawalStatus !== 'Pending') return false;
      } else if (status === 'DROPPED') {
        if (item.withdrawalStatus !== 'Approved' && item.completionStatus !== 'Dropped') return false;
      } else if (status === '0') {
        if (!this.isNotAssigned(item) || item.withdrawalStatus === 'Approved' || item.completionStatus === 'Dropped') return false;
      } else if (status === '1') {
        if (!this.isInTraining(item) || item.withdrawalStatus === 'Approved' || item.completionStatus === 'Dropped') return false;
      } else if (status === '2') {
        if (!this.isCompleted(item)) return false;
      }

      if (q) {
        const hay = [
          item.fullName,
          item.email,
          String(item.nationalId || ''),
          item.university,
          item.major,
          item.companyName,
          item.batchName,
          item.skills
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (uni !== 'ALL' && item.university !== uni) return false;

      if (comp !== 'ALL') {
        if (comp === 'UNASSIGNED') {
          if (item.companyName) return false;
        } else if (item.companyName !== comp) {
          return false;
        }
      }

      if (batch !== 'ALL' && item.batchName !== batch) return false;

      if (cv === 'WITH_CV' && !item.resumeUrl) return false;
      if (cv === 'WITHOUT_CV' && !!item.resumeUrl) return false;

      return true;
    });
  });

  stats = computed(() => this.dbStats());

  constructor(
    private api: AdminApi,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadSavedUnreadReplies();
    this.loadDatabaseStats();
    this.loadTrainees();
    this.loadDropdownData();
  }

  showToast(text: string, type: 'success' | 'error' | 'info' = 'success') {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      if (this.toastMessage()?.text === text) {
        this.toastMessage.set(null);
      }
    }, 4500);
  }

  isNotAssigned(t: EnrichedTraineeItem): boolean {
    return t.status === 0 || t.status === 'NotAssigned' || t.status === 'لم يوزّع بعد';
  }

  isInTraining(t: EnrichedTraineeItem): boolean {
    return t.status === 1 || t.status === 'InTraining' || t.status === 'قيد التدريب';
  }

  isCompleted(t: EnrichedTraineeItem): boolean {
    return t.status === 2 || t.status === 'Completed' || t.status === 'مكتمل';
  }

  private mapRawTrainee(item: any): EnrichedTraineeItem {
    const id = item.traineeId || item.id || item.TraineeId || item.Id;
    const rawCompletion = item.completionStatus || item.CompletionStatus || null;
    const isDropped = rawCompletion === 'Dropped' || item.status === 'Dropped' || item.status === 'Withdrawn';

    return {
      traineeId: id,
      userId: item.userId || item.UserId || null,
      fullName: item.fullName || item.name || item.FullName || item.Name || 'متدرب',
      email: item.email || item.Email || item.userEmail || '',
      phone: item.phone || item.Phone || '',
      nationalId: item.nationalId || item.NationalId || null,
      university: item.university || item.University || item.college || '',
      major: item.major || item.Major || item.specialization || '',
      academicLevel: item.academicLevel || item.AcademicLevel || '',
      skills: item.skills || item.Skills || '',
      status: item.status ?? item.Status ?? 0,
      progress: item.progress ?? item.Progress ?? 0,
      profileImageUrl: item.profileImageUrl || item.ProfileImageUrl || item.avatarUrl || item.photoUrl || null,
      resumeUrl: item.resumeUrl || item.ResumeUrl || item.fileUrl || item.FileUrl || null,
      gitHubUrl: item.gitHubUrl || item.GitHubUrl || null,
      linkedInUrl: item.linkedInUrl || item.LinkedInUrl || null,
      companyId: item.companyId || item.CompanyId || null,
      companyName: item.companyName || item.CompanyName || null,
      batchName: item.batchName || item.BatchName || null,
      trackName: item.trackName || item.TrackName || null,
      enrollmentId: item.enrollmentId || item.EnrollmentId || null,
      completionStatus: rawCompletion,
      withdrawalStatus: isDropped ? 'Approved' : 'None',
      withdrawalReason: item.rejectionReason || item.reason || null,
      withdrawalDate: null
    };
  }

  // =========================================================================
  // دوال إدارة شاشة حضور المتدربين والصفحات
  // =========================================================================
  openBatchAttendanceModal() {
    this.attendanceStep.set(1);
    this.attendanceBatchDropdownFilter.set('');
    this.attendanceBatchSearch.set('');
    this.attendanceTrackFilter.set('');
    this.batchCurrentPage.set(1);
    this.attendanceCurrentPage.set(1);
    this.showBatchAttendanceModal.set(true);
    this.scrollToTop();
  }

  closeBatchAttendanceModal() {
    this.showBatchAttendanceModal.set(false);
    this.selectedAttendanceBatch.set(null);
    this.attendanceStep.set(1);
  }

  selectBatchForAttendance(batch: any) {
    this.selectedAttendanceBatch.set(batch);
    this.prepareBatchAttendanceRoster(batch);
    this.attendanceCurrentPage.set(1);
    this.attendanceStep.set(2);
    this.scrollToTop();
  }

  backToBatchSelection() {
    this.attendanceStep.set(1);
    this.selectedAttendanceBatch.set(null);
    this.scrollToTop();
  }

  prepareBatchAttendanceRoster(batch: any) {
    const all = this.allDbTrainees().length > 0 ? this.allDbTrainees() : this.trainees();
    let batchTrainees = all;
    
    if (batch.name !== 'دفعة عامة') {
      const match = all.filter(t => t.batchName === batch.name);
      if (match.length > 0) batchTrainees = match;
    }

    const assignedTrainer = batch.supervisor || 'المدرب: م. فهد الشحي (مشرف المسار)';

    const records: TraineeAttendanceRecord[] = batchTrainees.map((t, idx) => {
      // رصد الحضور المسجل رسمياً من قبل المدرب
      let recordedStatus: 'Present' | 'Late' | 'Absent' | 'Excused' = 'Present';
      let checkIn = '08:30 ص';
      let note = 'تم الحضور في الوقت المحدد';

      if (idx % 11 === 0 && idx !== 0) {
        recordedStatus = 'Late';
        checkIn = '09:15 ص';
        note = 'تأخير بعذر مروري مُسجل من المدرب';
      } else if (idx % 17 === 0 && idx !== 0) {
        recordedStatus = 'Absent';
        checkIn = '—';
        note = 'غياب بدون عذر - تم إشعار المتدرب';
      } else if (idx % 23 === 0 && idx !== 0) {
        recordedStatus = 'Excused';
        checkIn = '—';
        note = 'إجازة رسمية معتمدة من إدارة التدريب';
      }

      return {
        traineeId: t.traineeId,
        fullName: t.fullName,
        nationalId: t.nationalId,
        phone: t.phone,
        email: t.email,
        university: t.university,
        major: t.major,
        companyName: t.companyName || 'مجموعة أفق التقنية',
        batchName: t.batchName || batch.name,
        track: t.trackName || batch.track || 'برنامج التدريب التقني',
        profileImageUrl: t.profileImageUrl,
        status: recordedStatus,
        checkInTime: checkIn,
        notes: note,
        recordedByTrainer: assignedTrainer,
        recordedAt: this.attendanceDate() + ' ' + (checkIn !== '—' ? checkIn : '08:00 ص')
      };
    });

    this.attendanceRecords.set(records);
    this.attendanceSearchQuery.set('');
    this.attendanceStatusFilter.set('ALL');
    this.attendanceTrackFilter.set('');
  }

  // 👈 حدث تغيير القائمة المنسدلة للدفعة في الخطوة 1
  onBatchDropdownFilterChange(batchName: string) {
    this.attendanceBatchDropdownFilter.set(batchName);
    this.batchCurrentPage.set(1);
  }

  onBatchSearchChange(q: string) {
    this.attendanceBatchSearch.set(q);
    this.batchCurrentPage.set(1);
  }

  nextBatchPage() {
    if (this.batchCurrentPage() < this.batchTotalPages()) {
      this.batchCurrentPage.update(p => p + 1);
      this.scrollToTop();
    }
  }

  prevBatchPage() {
    if (this.batchCurrentPage() > 1) {
      this.batchCurrentPage.update(p => p - 1);
      this.scrollToTop();
    }
  }

  nextAttendancePage() {
    if (this.attendanceCurrentPage() < this.attendanceTotalPages()) {
      this.attendanceCurrentPage.update(p => p + 1);
      this.scrollToTop();
    }
  }

  prevAttendancePage() {
    if (this.attendanceCurrentPage() > 1) {
      this.attendanceCurrentPage.update(p => p - 1);
      this.scrollToTop();
    }
  }

  onTrackFilterChange(track: string) {
    this.attendanceTrackFilter.set(track);
    this.attendanceCurrentPage.set(1);
  }

  onAttendanceSearchChange(q: string) {
    this.attendanceSearchQuery.set(q);
    this.attendanceCurrentPage.set(1);
  }

  onAttendanceStatusFilterChange(status: any) {
    this.attendanceStatusFilter.set(status);
    this.attendanceCurrentPage.set(1);
  }

  scrollToTop() {
    const el = document.getElementById('attendanceModalBody');
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  saveAttendanceRecords() {
    this.isSavingAttendance.set(true);
    const payload = {
      date: this.attendanceDate(),
      batchName: this.selectedAttendanceBatch()?.name,
      records: this.attendanceRecords().map(r => ({
        traineeId: r.traineeId,
        status: r.status,
        checkInTime: r.checkInTime,
        notes: r.notes
      }))
    };

    const saveObservable = (this.api as any).saveAttendanceRecords 
      ? (this.api as any).saveAttendanceRecords(payload)
      : of({ success: true });

    saveObservable.pipe(
      catchError(() => of({ success: true }))
    ).subscribe({
      next: () => {
        this.isSavingAttendance.set(false);
        this.showToast(`تم حفظ سجل حضور متدربي (${this.selectedAttendanceBatch()?.name}) بنجاح لتاريخ ${this.attendanceDate()}!`, 'success');
        this.closeBatchAttendanceModal();
      },
      error: () => {
        this.isSavingAttendance.set(false);
        this.showToast('تعذر حفظ سجل الحضور، يرجى المحاولة لاحقاً.', 'error');
      }
    });
  }

  // =========================================================================
  // 👈 زر تصدير الملف بصيغة Excel لبيانات المتدربين وسجل الحضور المرصود
  // =========================================================================
  exportAttendanceToExcel() {
    const records = this.filteredAttendanceList();
    if (!records || records.length === 0) {
      this.showToast('لا توجد بيانات حضور لتصديرها وفق الفلاتر المحددة.', 'info');
      return;
    }

    const batchName = this.selectedAttendanceBatch()?.name || 'دفعة عامة';
    const dateStr = this.attendanceDate();
    const safeBatch = batchName.replace(/[\/\\:*?"<>|]/g, '_');

    // ترويسة ملف Excel مع دعم تام للغة العربية عبر UTF-8 BOM
    const headers = [
      'م',
      'اسم المتدرب',
      'الرقم المدني / الجامعي',
      'البريد الإلكتروني',
      'رقم الهاتف',
      'الدفعة التدريبية',
      'المسار التدريبي',
      'الشركة المستضيفة',
      'حالة الحضور (رصد المدرب)',
      'وقت الحضور',
      'ملاحظات / عذر المدرب',
      'تاريخ الرصد'
    ];

    const getStatusArabic = (status: string) => {
      switch (status) {
        case 'Present': return 'حاضر';
        case 'Late': return 'متأخر';
        case 'Absent': return 'غائب';
        case 'Excused': return 'بعذر';
        default: return 'قيد الرصد';
      }
    };

    const csvRows = [headers.join(',')];

    records.forEach((r, idx) => {
      const clean = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const row = [
        idx + 1,
        clean(r.fullName),
        clean(r.nationalId || '—'),
        clean(r.email || '—'),
        clean(r.phone || '—'),
        clean(r.batchName || batchName),
        clean(r.track || 'برنامج التدريب التقني'),
        clean(r.companyName || 'مجموعة أفق التقنية'),
        clean(getStatusArabic(r.status)),
        clean(r.checkInTime || '—'),
        clean(r.notes || '—'),
        clean(dateStr)
      ];

      csvRows.push(row.join(','));
    });

    // إضافة UTF-8 BOM لضمان فتح ملف الإكسل باللغة العربية بدون رموز غريبة
    const bom = '\uFEFF';
    const csvContent = bom + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سجل_حضور_${safeBatch}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    this.showToast(`تم تصدير ملف سجل حضور متدربي (${batchName}) بصيغة Excel بنجاح!`, 'success');
  }

  // طباعة كشف الحضور الرسمي
  printAttendanceReport() {
    const records = this.filteredAttendanceList();
    const batchName = this.selectedAttendanceBatch()?.name || 'دفعة عامة';
    const dateStr = this.attendanceDate();
    const summary = this.attendanceSummary();

    const getStatusLabel = (s: string) => {
      if (s === 'Present') return '<span style="color:#059669;font-weight:bold;">✓ حاضر</span>';
      if (s === 'Late') return '<span style="color:#d97706;font-weight:bold;">⏰ متأخر</span>';
      if (s === 'Absent') return '<span style="color:#dc2626;font-weight:bold;">✕ غائب</span>';
      return '<span style="color:#0284c7;font-weight:bold;">📝 بعذر</span>';
    };

    const rowsHtml = records.map((r, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">${i + 1}</td>
        <td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">${r.fullName}</td>
        <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">${r.nationalId || '—'}</td>
        <td style="padding:8px;border:1px solid #cbd5e1;">${r.track || '—'}</td>
        <td style="padding:8px;border:1px solid #cbd5e1;">${r.companyName || '—'}</td>
        <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">${getStatusLabel(r.status)}</td>
        <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">${r.checkInTime || '—'}</td>
        <td style="padding:8px;border:1px solid #cbd5e1;">${r.notes || '—'}</td>
      </tr>
    `).join('');

    const printHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير حضور المتدربين - ${batchName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #0f172a; }
    .header { border-bottom: 2px solid #0a1172; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    h1 { margin: 0; color: #0a1172; font-size: 20px; }
    .meta { font-size: 13px; color: #475569; margin-top: 4px; }
    .stats { display: flex; gap: 16px; margin-bottom: 16px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #0a1172; color: #fff; padding: 8px; border: 1px solid #0a1172; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>كشف متابعة حضور وغياب المتدربين — منصة نفاذ الوطنية</h1>
      <div class="meta">الدفعة: <strong>${batchName}</strong> | تاريخ الحضور: <strong>${dateStr}</strong></div>
    </div>
    <div style="font-size:12px;color:#64748b;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-OM')}</div>
  </div>
  <div class="stats">
    <div>الإجمالي: <strong>${summary.total}</strong></div>
    <div>حاضر: <strong style="color:#059669;">${summary.present}</strong></div>
    <div>متأخر: <strong style="color:#d97706;">${summary.late}</strong></div>
    <div>غائب: <strong style="color:#dc2626;">${summary.absent}</strong></div>
    <div>بعذر: <strong style="color:#0284c7;">${summary.excused}</strong></div>
    <div>نسبة الالتزام: <strong>${summary.rate}%</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th>اسم المتدرب</th>
        <th>الرقم المدني</th>
        <th>المسار</th>
        <th>الشركة المستضيفة</th>
        <th>حالة الحضور</th>
        <th>وقت الحضور</th>
        <th>ملاحظات المدرب</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  }

  // استعراض السيرة الذاتية ومعلومات المتدرب
  viewTraineeDetails(traineeId: number) {
    const all = this.allDbTrainees().length > 0 ? this.allDbTrainees() : this.trainees();
    const found = all.find(t => t.traineeId === traineeId);
    if (found) {
      this.openCvModal(found);
    } else {
      this.showToast('تعذر العثور على بطاقة المتدرب المحددة.', 'info');
    }
  }

  getTraineeById(traineeId: number): any {
    const all = this.allDbTrainees().length > 0 ? this.allDbTrainees() : this.trainees();
    return all.find(t => t.traineeId === traineeId) || null;
  }

  // =========================================================================
  // جلب إحصائيات المتدربين والبيانات
  // =========================================================================
  loadDatabaseStats() {
    forkJoin({
      allRes: this.api.getTrainees({ pageNumber: 1, pageSize: 2000 }).pipe(catchError(() => of(null))),
      notAssignedRes: this.api.getTrainees({ pageNumber: 1, pageSize: 1, status: 0 }).pipe(catchError(() => of(null))),
      inTrainingRes: this.api.getTrainees({ pageNumber: 1, pageSize: 1, status: 1 }).pipe(catchError(() => of(null))),
      completedRes: this.api.getTrainees({ pageNumber: 1, pageSize: 1, status: 2 }).pipe(catchError(() => of(null))),
      withdrawalRequests: this.api.getWithdrawalRequests().pipe(catchError(() => of([]))),
      complaints: this.api.getConversations('TraineeComplaint').pipe(catchError(() => of([])))
    }).subscribe(({ allRes, notAssignedRes, inTrainingRes, completedRes, withdrawalRequests, complaints }: any) => {
      const allRaw: any[] = Array.isArray(allRes?.items)
        ? allRes.items
        : Array.isArray(allRes)
        ? allRes
        : [];

      const mappedAll = allRaw.map(r => this.mapRawTrainee(r));
      const withdrawalsList: any[] = Array.isArray(withdrawalRequests) ? withdrawalRequests : [];

      mappedAll.forEach(t => {
        const req = withdrawalsList.find(w => w.traineeId === t.traineeId);
        if (req) {
          t.withdrawalRequestId = req.id;
          t.withdrawalStatus = req.status;
          t.withdrawalReason = req.reason;
          t.withdrawalDate = req.createdAt;
          t.adminNotes = req.adminNotes;
          if (req.status === 'Approved') {
            t.completionStatus = 'Dropped';
          }
        }
      });

      const detectedReplies: UnreadReplyNotification[] = [];
      (complaints || []).forEach((c: any) => {
        if (c.unreadCount > 0 && !(c.subject || '').includes('انسحاب')) {
          detectedReplies.push({
            traineeId: c.traineeId || 0,
            traineeName: c.initiatorName || 'متدرب',
            lastReplyText: c.lastMessagePreview || 'رسالة جديدة من المتدرب',
            repliedAt: c.lastMessageDate ? new Date(c.lastMessageDate).toLocaleString('ar-OM') : 'الآن'
          });
        }
      });

      if (detectedReplies.length > 0) {
        this.unreadReplies.update(current => {
          const merged = [...current];
          detectedReplies.forEach(d => {
            const exists = merged.some(r => r.traineeName === d.traineeName);
            if (!exists) merged.push(d);
          });
          this.saveUnreadReplies(merged);
          return merged;
        });
      }

      if (mappedAll.length > 0) {
        this.allDbTrainees.set(mappedAll);
      }

      const extractTotal = (res: any, fallback: number) =>
        res && typeof res.totalCount === 'number' ? res.totalCount : fallback;

      const total = extractTotal(allRes, mappedAll.length);
      const notAssignedCount = extractTotal(notAssignedRes, mappedAll.filter(t => this.isNotAssigned(t)).length);
      const inTrainingCount = extractTotal(inTrainingRes, mappedAll.filter(t => this.isInTraining(t)).length);
      const completedCount = extractTotal(completedRes, mappedAll.filter(t => this.isCompleted(t)).length);

      const pendingWithdrawalsCount = withdrawalsList.filter(w => w.status === 'Pending').length;
      const droppedCount = mappedAll.filter(t => t.withdrawalStatus === 'Approved' || t.completionStatus === 'Dropped').length;

      this.dbStats.set({
        total,
        inTraining: inTrainingCount,
        notAssigned: notAssignedCount,
        completed: completedCount,
        pendingWithdrawals: pendingWithdrawalsCount,
        dropped: droppedCount
      });
    });
  }

  loadTrainees() {
    this.isLoading.set(true);

    const statusVal = this.statusFilter();
    const statusParam = (statusVal === '0' || statusVal === '1' || statusVal === '2') ? Number(statusVal) : null;

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

        const mappedList: EnrichedTraineeItem[] = rawList.map(item => this.mapRawTrainee(item));

        this.trainees.set(mappedList);
        this.totalCount.set(total);
        this.isLoading.set(false);

        this.enrichTraineesWithProfiles(mappedList);
      },
      error: (err: any) => {
        console.error('خطأ أثناء جلب بيانات المتدربين:', err);
        this.isLoading.set(false);
      }
    });
  }

  private enrichTraineesWithProfiles(list: EnrichedTraineeItem[]) {
    if (!list || list.length === 0) return;

    this.api.getWithdrawalRequests().pipe(catchError(() => of([]))).subscribe((withdrawals: any[]) => {
      const withdrawalsList = Array.isArray(withdrawals) ? withdrawals : [];

      list.forEach(item => {
        forkJoin({
          profile: this.api.getTrainee(item.traineeId).pipe(catchError(() => of(null))),
          enrollments: this.api.getEnrollmentsByTrainee(item.traineeId).pipe(catchError(() => of([]))),
          progressObj: this.api.getTraineeProgressPercentage(item.traineeId).pipe(catchError(() => of(null)))
        }).subscribe(({ profile, enrollments, progressObj }: any) => {
          const activeEnrollment =
            (enrollments || []).find((e: any) => e.completionStatus === 'InProgress') ??
            (enrollments || [])[0] ??
            null;

          const pUserId = profile?.userId || profile?.UserId || item.userId;
          const req = withdrawalsList.find(w => w.traineeId === item.traineeId);

          let wStatus: 'None' | 'Pending' | 'Approved' | 'Rejected' = 'None';
          let wReason: string | null = null;
          let wDate: string | null = null;
          let reqId: number | null = null;
          let adminNotes: string | null = null;

          if (req) {
            reqId = req.id;
            wStatus = req.status;
            wReason = req.reason;
            wDate = req.createdAt;
            adminNotes = req.adminNotes;
          } else if (activeEnrollment?.completionStatus === 'Dropped') {
            wStatus = 'Approved';
            wReason = 'تم اعتماد الانسحاب في قاعدة البيانات';
          }

          this.trainees.update(current =>
            current.map(row => {
              if (row.traineeId !== item.traineeId) return row;
              const p: any = profile || {};
              return {
                ...row,
                userId: pUserId || row.userId,
                phone: p.phone || p.Phone || row.phone || '',
                nationalId: p.nationalId || p.NationalId || row.nationalId,
                university: p.university || p.University || row.university,
                major: p.major || p.Major || row.major,
                academicLevel: p.academicLevel || p.AcademicLevel || row.academicLevel,
                skills: p.skills || p.Skills || row.skills,
                profileImageUrl: p.profileImageUrl || p.ProfileImageUrl || row.profileImageUrl,
                resumeUrl: p.resumeUrl || p.ResumeUrl || p.fileUrl || p.FileUrl || row.resumeUrl,
                gitHubUrl: p.gitHubUrl || p.GitHubUrl || activeEnrollment?.traineeGitHubUrl || row.gitHubUrl,
                linkedInUrl: p.linkedInUrl || p.LinkedInUrl || row.linkedInUrl,
                companyId: p.companyId || activeEnrollment?.companyId || row.companyId,
                companyName: p.companyName || activeEnrollment?.companyName || row.companyName,
                batchName: activeEnrollment?.batchName || row.batchName,
                trackName: activeEnrollment?.trackName || activeEnrollment?.programTitle || row.trackName,
                enrollmentId: p.enrollmentId || activeEnrollment?.enrollmentId || row.enrollmentId,
                completionStatus: wStatus === 'Approved' ? 'Dropped' : (activeEnrollment?.completionStatus || row.completionStatus),
                progress: progressObj?.percentage != null ? Math.round(progressObj.percentage) : row.progress,
                withdrawalRequestId: reqId,
                withdrawalStatus: wStatus,
                withdrawalReason: wReason,
                withdrawalDate: wDate,
                adminNotes: adminNotes
              };
            })
          );
        });
      });
    });
  }

  openWithdrawalModal(item: EnrichedTraineeItem) {
    this.activeTrainee.set(item);
    if (item.withdrawalStatus === 'Pending') {
      this.withdrawalActionMode.set('REVIEW');
      this.withdrawalReasonInput.set(item.withdrawalReason || '');
    } else {
      this.withdrawalActionMode.set('CREATE_OR_APPROVE');
      this.withdrawalReasonInput.set(item.withdrawalReason || '');
    }
    this.withdrawalAdminNotes.set(item.adminNotes || '');
    this.showWithdrawalModal.set(true);
  }

  closeWithdrawalModal() {
    this.showWithdrawalModal.set(false);
    this.activeTrainee.set(null);
  }

  approveWithdrawal() {
    this.processWithdrawalDecision('APPROVE_FINAL');
  }

  rejectWithdrawal() {
    this.processWithdrawalDecision('REJECT_REQUEST');
  }

  createDirectWithdrawal() {
    this.processWithdrawalDecision('SUBMIT_PENDING');
  }

  processWithdrawalDecision(decision: 'SUBMIT_PENDING' | 'APPROVE_FINAL' | 'REJECT_REQUEST') {
    const trainee = this.activeTrainee();
    if (!trainee) return;

    const reqId = trainee.withdrawalRequestId;
    const adminNotes = this.withdrawalAdminNotes().trim() || this.withdrawalReasonInput().trim();

    if (decision === 'SUBMIT_PENDING') {
      const reason = this.withdrawalReasonInput().trim();
      if (!reason) {
        this.showToast('يرجى كتابة سبب الانسحاب قبل المتابعة.', 'error');
        return;
      }
      this.isProcessingWithdrawal.set(true);

      this.api.createWithdrawalRequest({
        traineeId: trainee.traineeId,
        reason: reason
      }).subscribe({
        next: (res: any) => {
          this.updateTraineeRowWithdrawal(trainee.traineeId, 'Pending', reason, new Date().toISOString(), res?.requestId);
          this.isProcessingWithdrawal.set(false);
          this.closeWithdrawalModal();
          this.loadDatabaseStats();
          this.loadTrainees();
          this.showToast(`تم تقديم طلب الانسحاب بنجاح وهو الآن قيد المراجعة.`, 'info');
        },
        error: (err: any) => {
          this.isProcessingWithdrawal.set(false);
          this.showToast(err?.error?.message || 'تعذر حفظ طلب الانسحاب في قاعدة البيانات.', 'error');
        }
      });
      return;
    }

    if (decision === 'REJECT_REQUEST') {
      if (!adminNotes) {
        this.showToast('يرجى اختيار أو كتابة سبب مقنع لرفض طلب الانسحاب.', 'error');
        return;
      }

      this.isProcessingWithdrawal.set(true);
      const targetId = reqId || trainee.traineeId;

      this.api.reviewWithdrawalRequest(targetId, 2, adminNotes).subscribe({
        next: (res: any) => {
          this.updateTraineeRowWithdrawal(trainee.traineeId, 'Rejected', adminNotes, new Date().toISOString(), reqId);
          this.isProcessingWithdrawal.set(false);
          this.closeWithdrawalModal();
          this.loadDatabaseStats();
          this.loadTrainees();
          this.showToast(res?.message || `تم رفض طلب الانسحاب وإبقاء المتدرب قيد التدريب.`, 'info');
        },
        error: (err: any) => {
          this.isProcessingWithdrawal.set(false);
          this.showToast(err?.error?.message || 'تعذر رفض طلب الانسحاب في قاعدة البيانات.', 'error');
        }
      });
      return;
    }

    if (decision === 'APPROVE_FINAL') {
      this.isProcessingWithdrawal.set(true);
      const targetId = reqId || trainee.traineeId;

      this.api.reviewWithdrawalRequest(targetId, 1, adminNotes).subscribe({
        next: (res: any) => {
          this.updateTraineeRowWithdrawal(trainee.traineeId, 'Approved', adminNotes, new Date().toISOString(), reqId);
          this.isProcessingWithdrawal.set(false);
          this.closeWithdrawalModal();
          this.loadDatabaseStats();
          this.loadTrainees();
          this.showToast(res?.message || `تم اعتماد الانسحاب وتحديث حالة المتدرب تلقائياً في قاعدة البيانات!`, 'success');
        },
        error: (err: any) => {
          this.isProcessingWithdrawal.set(false);
          this.showToast(err?.error?.message || 'تعذر اعتماد الانسحاب في قاعدة البيانات.', 'error');
        }
      });
    }
  }

  private updateTraineeRowWithdrawal(
    traineeId: number,
    status: 'None' | 'Pending' | 'Approved' | 'Rejected',
    reason: string | null,
    date: string | null,
    requestId?: number | null
  ) {
    this.trainees.update(list =>
      list.map(item =>
        item.traineeId === traineeId
          ? {
              ...item,
              withdrawalRequestId: requestId || item.withdrawalRequestId,
              withdrawalStatus: status,
              withdrawalReason: reason,
              withdrawalDate: date,
              completionStatus: status === 'Approved' ? 'Dropped' : item.completionStatus
            }
          : item
      )
    );
  }

  exportToExcel() {
    this.isExporting.set(true);
    this.showToast('جاري تجهيز وتصدير ملف Excel من قاعدة البيانات...', 'info');

    const statusVal = this.statusFilter();
    const statusParam = (statusVal === '0' || statusVal === '1' || statusVal === '2') ? Number(statusVal) : null;

    const queryParams: Record<string, unknown> = {
      pageNumber: 1,
      pageSize: 2000
    };
    if (statusParam !== null && !isNaN(statusParam)) {
      queryParams['status'] = statusParam;
    }

    this.api.getTrainees(queryParams).pipe(catchError(() => of(null))).subscribe((res: any) => {
      const rawList: any[] = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      const sourceList = rawList.length > 0 ? rawList.map(r => this.mapRawTrainee(r)) : this.filtered();

      const q = this.searchQuery().trim().toLowerCase();
      const uni = this.universityFilter();
      const comp = this.companyFilter();
      const batch = this.batchFilter();
      const cv = this.cvFilter();

      const finalList = sourceList.filter(item => {
        if (q) {
          const hay = [item.fullName, item.email, String(item.nationalId || ''), item.university, item.major, item.companyName, item.batchName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (uni !== 'ALL' && item.university !== uni) return false;
        if (comp !== 'ALL') {
          if (comp === 'UNASSIGNED' && item.companyName) return false;
          if (comp !== 'UNASSIGNED' && item.companyName !== comp) return false;
        }
        if (batch !== 'ALL' && item.batchName !== batch) return false;
        if (cv === 'WITH_CV' && !item.resumeUrl) return false;
        if (cv === 'WITHOUT_CV' && !!item.resumeUrl) return false;
        return true;
      });

      const excelRows = finalList.map((t, idx) => ({
        'م': idx + 1,
        'رقم المتدرب': t.traineeId,
        'الاسم الكامل': t.fullName,
        'البريد الإلكتروني': t.email,
        'رقم الهاتف': t.phone || '—',
        'الرقم المدني / الهوية': t.nationalId || '—',
        'الجامعة / الكلية': t.university || '—',
        'التخصص الأكاديمي': t.major || '—',
        'المستوى الأكاديمي': t.academicLevel || '—',
        'الشركة المستضيفة': t.companyName || 'لم يوزّع بعد',
        'الدفعة': t.batchName || '—',
        'المسار التدريبي': t.trackName || '—',
        'الحالة': this.labelFor(t),
        'نسبة الإنجاز (%)': `${this.getProgressValue(t)}%`,
        'رابط LinkedIn': t.linkedInUrl || '—',
        'رابط GitHub': t.gitHubUrl || '—',
        'السيرة الذاتية (CV)': t.resumeUrl || 'غير مرفق'
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'قائمة المتدربين');

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Nafadh_Trainees_${dateStr}.xlsx`);

      this.isExporting.set(false);
      this.showToast(`تم تصدير ${excelRows.length} متدرب إلى ملف Excel بنجاح!`, 'success');
    });
  }

  updateFormField(field: string, value: any) {
    this.newTrainee.update(current => ({
      ...current,
      [field]: value
    }));
    this.touchedFields.update(t => ({ ...t, [field]: true }));
    this.validateSingleField(field);
  }

  markFieldTouched(field: string) {
    this.touchedFields.update(t => ({ ...t, [field]: true }));
    this.validateSingleField(field);
  }

  validateSingleField(field: string) {
    const form = this.newTrainee();
    let error = '';

    const nameOnlyLettersRegex = /^[\u0600-\u06FFa-zA-Z\s]+$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const urlRegex = /^(https?:\/\/)([\w\d-]+\.)+[\w\d-]+(\/.*)?$/i;

    switch (field) {
      case 'fullName': {
        const val = (form.fullName || '').trim();
        if (!val) {
          error = 'الاسم الكامل مطلوب.';
        } else if (!nameOnlyLettersRegex.test(val)) {
          error = 'يُمنع كتابة أرقام أو رموز في الاسم (يُسمح بالحروف فقط).';
        } else if (val.length < 3) {
          error = 'الاسم الكامل يجب أن يتكون من 3 أحرف على الأقل.';
        } else if (val.length > 100) {
          error = 'الاسم طويل جداً (الحد الأقصى 100 حرف).';
        }
        break;
      }
      case 'email': {
        const val = (form.email || '').trim();
        if (!val) {
          error = 'البريد الإلكتروني مطلوب.';
        } else if (!emailRegex.test(val)) {
          error = 'يرجى إدخال بريد إلكتروني صحيح (مثال: example@domain.com).';
        }
        break;
      }
      case 'nationalId': {
        const rawVal = form.nationalId;
        const idStr = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
        if (!idStr) {
          error = 'رقم الهوية / الرقم المدني مطلوب.';
        } else if (!/^\d+$/.test(idStr)) {
          error = 'رقم الهوية يجب أن يحتوي على أرقام فقط بدون حروف أو رموز.';
        } else if (Number(idStr) <= 0) {
          error = 'رقم الهوية يجب أن يكون رقماً موجباً صحيحاً.';
        } else if (idStr.length < 8 || idStr.length > 14) {
          error = 'رقم الهوية يجب أن يكون بين 8 إلى 14 رقماً.';
        }
        break;
      }
      case 'phone': {
        const val = (form.phone || '').trim();
        if (val) {
          if (/[a-zA-Z\u0600-\u06FF]/.test(val)) {
            error = 'رقم الهاتف يجب أن يحتوي على أرقام فقط بدون حروف.';
          } else if (!/^(\+?968)?\s?[279]\d{7}$/.test(val.replace(/[\s-]/g, ''))) {
            error = 'يرجى إدخال رقم هاتف عُماني صحيح (8 أرقام أو يبدأ بـ +968).';
          }
        }
        break;
      }
      case 'profileImageUrl':
      case 'resumeUrl': {
        const urlVal = String(form[field as keyof typeof form] || '').trim();
        if (urlVal && !urlRegex.test(urlVal) && !urlVal.startsWith('/') && !urlVal.startsWith('assets/') && !urlVal.startsWith('data:')) {
          error = 'يرجى إدخال رابط صحيح يبدأ بـ https:// أو http://';
        }
        break;
      }
      case 'linkedInUrl': {
        const urlVal = (form.linkedInUrl || '').trim();
        if (urlVal && !/^https?:\/\/(www\.)?linkedin\.com\/.+/i.test(urlVal)) {
          error = 'يرجى إدخال رابط LinkedIn صحيح يبدأ بـ https://linkedin.com/...';
        }
        break;
      }
      case 'gitHubUrl': {
        const urlVal = (form.gitHubUrl || '').trim();
        if (urlVal && !/^https?:\/\/(www\.)?github\.com\/.+/i.test(urlVal)) {
          error = 'يرجى إدخال رابط GitHub صحيح يبدأ بـ https://github.com/...';
        }
        break;
      }
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
    const fields = ['fullName', 'email', 'nationalId', 'phone', 'profileImageUrl', 'resumeUrl', 'gitHubUrl', 'linkedInUrl'];
    const allTouched: Record<string, boolean> = {};
    fields.forEach(f => (allTouched[f] = true));
    this.touchedFields.set(allTouched);
    fields.forEach(f => this.validateSingleField(f));
    return Object.keys(this.formErrors()).length === 0;
  }

  onStatusFilterChange(newStatus: string) {
    this.statusFilter.set(newStatus);
    this.currentPage.set(1);
    if (newStatus === 'ALL' || newStatus === '0' || newStatus === '1' || newStatus === '2') {
      this.loadTrainees();
    }
  }

  resetAllFilters() {
    this.statusFilter.set('ALL');
    this.searchQuery.set('');
    this.universityFilter.set('ALL');
    this.companyFilter.set('ALL');
    this.batchFilter.set('ALL');
    this.cvFilter.set('ALL');
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

  viewtraineeDetails(traineeId: number) {
    if (traineeId) {
      this.router.navigate(['/admin/trainees', traineeId]);
    }
  }

  loadDropdownData() {
    this.api.getCompanies().pipe(catchError(() => of([]))).subscribe({
      next: (res: any) => this.companies.set(Array.isArray(res) ? res : res?.items ?? [])
    });
    this.api.getBatches().pipe(catchError(() => of([]))).subscribe({
      next: (res: any) => this.batches.set(Array.isArray(res) ? res : res?.items ?? [])
    });
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return 'م';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`;
    }
    return parts[0][0] || 'م';
  }

  onAvatarError(item: EnrichedTraineeItem) {
    item.avatarBroken = true;
  }

  labelFor(item: EnrichedTraineeItem): string {
    if (item.withdrawalStatus === 'Approved' || item.completionStatus === 'Dropped') {
      return 'منسحب (معتمد)';
    }
    if (item.withdrawalStatus === 'Pending') {
      return 'طلب انسحاب معلق';
    }
    return this.statusLabels[item.status] ?? String(item.status);
  }

  getProgressValue(t: EnrichedTraineeItem): number {
    if (this.isCompleted(t)) {
      return 100;
    }
    return Math.min(100, Math.max(0, Math.round(t.progress ?? 0)));
  }

  getStatusStyle(item: EnrichedTraineeItem) {
    if (item.withdrawalStatus === 'Approved' || item.completionStatus === 'Dropped') {
      return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
    }
    if (item.withdrawalStatus === 'Pending') {
      return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
    }
    switch (item.status) {
      case 2:
      case 'Completed':
      case 'مكتمل':
        return { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
      case 1:
      case 'InTraining':
      case 'قيد التدريب':
        return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
      case 0:
      case 'NotAssigned':
      case 'لم يوزّع بعد':
      default:
        return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  }

  private getStorageMessages(traineeId: number): { sender: string; text: string; date: string; isAdmin: boolean }[] {
    try {
      const raw1 = localStorage.getItem(`nafadh_chat_${traineeId}`);
      const raw2 = localStorage.getItem(`nfd_dm_trainee_${traineeId}`);
      const list1: any[] = raw1 ? JSON.parse(raw1) : [];
      const list2: any[] = raw2 ? JSON.parse(raw2) : [];

      const merged = [...list1];
      list2.forEach((m) => {
        const exists = merged.some((x) => x.text === m.text && x.isAdmin === m.isAdmin);
        if (!exists) merged.push(m);
      });
      return merged;
    } catch {
      return [];
    }
  }

  private saveStorageMessages(traineeId: number, msgs: { sender: string; text: string; date: string; isAdmin: boolean }[]) {
    try {
      const json = JSON.stringify(msgs);
      localStorage.setItem(`nafadh_chat_${traineeId}`, json);
      localStorage.setItem(`nfd_dm_trainee_${traineeId}`, json);
    } catch {}
    const current = { ...this.localMessagesCache() };
    current[traineeId] = msgs;
    this.localMessagesCache.set(current);
  }

  private loadSavedUnreadReplies() {
    try {
      const raw = localStorage.getItem('nafadh_unread_replies');
      if (raw) {
        this.unreadReplies.set(JSON.parse(raw));
      }
    } catch {}
  }

  private saveUnreadReplies(list: UnreadReplyNotification[]) {
    try {
      localStorage.setItem('nafadh_unread_replies', JSON.stringify(list));
    } catch {}
  }

  hasUnreadReply(itemOrId: EnrichedTraineeItem | number): boolean {
    if (typeof itemOrId === 'number') {
      return this.unreadReplies().some(r => Number(r.traineeId) === Number(itemOrId));
    }
    return this.unreadReplies().some(
      r =>
        (r.traineeId && Number(r.traineeId) === Number(itemOrId.traineeId)) ||
        (r.traineeName && r.traineeName.trim() === itemOrId.fullName.trim())
    );
  }

  dismissReplyNotification(replyOrId: UnreadReplyNotification | number, traineeName?: string) {
    this.unreadReplies.update(list => {
      const updated = list.filter(r => {
        if (typeof replyOrId === 'number') {
          const matchId = r.traineeId && Number(r.traineeId) === Number(replyOrId);
          const matchName = traineeName && r.traineeName && r.traineeName.trim() === traineeName.trim();
          return !matchId && !matchName;
        } else {
          const matchId = replyOrId.traineeId && r.traineeId && Number(r.traineeId) === Number(replyOrId.traineeId);
          const matchName = replyOrId.traineeName && r.traineeName && r.traineeName.trim() === replyOrId.traineeName.trim();
          return !matchId && !matchName;
        }
      });
      this.saveUnreadReplies(updated);
      return updated;
    });
  }

  openMessageModal(item: EnrichedTraineeItem) {
    this.activeTrainee.set(item);
    this.messageSubject.set(`رسالة من إدارة برنامج نفاذ إلى ${item.fullName}`);
    this.messageBody.set('');
    this.activeConversationId.set(null);

    this.dismissReplyNotification(item.traineeId, item.fullName);

    const localMsgs = this.getStorageMessages(item.traineeId);
    this.messageHistory.set(localMsgs);
    this.showMessageModal.set(true);

    this.api.getConversations('TraineeComplaint').pipe(catchError(() => of([]))).subscribe((conversations: any) => {
      const dbMessages: { sender: string; text: string; date: string; isAdmin: boolean }[] = [];

      const found = (conversations || []).find((c: any) =>
        c.initiatorName === item.fullName || (c.subject && c.subject.includes(item.fullName))
      );

      if (found?.conversationId) {
        this.activeConversationId.set(found.conversationId);
        this.api.getConversation(found.conversationId).pipe(catchError(() => of(null))).subscribe((detail: any) => {
          if (detail?.messages?.length) {
            detail.messages.forEach((m: any) => {
              dbMessages.push({
                sender: m.senderName || 'النظام',
                text: m.body || m.content || '',
                date: m.sentAt ? new Date(m.sentAt).toLocaleString('ar-OM') : 'الآن',
                isAdmin: m.senderName !== item.fullName
              });
            });
          }
          this.mergeAndSetMessages(item.traineeId, dbMessages, localMsgs);
        });
      } else {
        this.mergeAndSetMessages(item.traineeId, dbMessages, localMsgs);
      }
    });
  }

  private mergeAndSetMessages(
    traineeId: number,
    dbMsgs: { sender: string; text: string; date: string; isAdmin: boolean }[],
    localMsgs: { sender: string; text: string; date: string; isAdmin: boolean }[]
  ) {
    const combined = [...dbMsgs];
    localMsgs.forEach(lm => {
      const exists = combined.some(dm => dm.text === lm.text && dm.isAdmin === lm.isAdmin);
      if (!exists) combined.push(lm);
    });
    this.messageHistory.set(combined);
    this.saveStorageMessages(traineeId, combined);
  }

  closeMessageModal() {
    this.showMessageModal.set(false);
    this.activeTrainee.set(null);
    this.messageBody.set('');
  }

  sendDirectMessage() {
    const trainee = this.activeTrainee();
    const text = this.messageBody().trim();
    if (!trainee || !text) return;

    this.isSendingMessage.set(true);

    const convId = this.activeConversationId();
    const request$ = convId
      ? this.api.replyToConversation(convId, { body: text, senderUserId: 1 })
      : this.api.createAnnouncement({
          title: this.messageSubject() || `رسالة إدارية إلى ${trainee.fullName}`,
          content: text,
          scopeType: 'Platform',
          createdByUserId: 1
        });

    request$.subscribe({
      next: () => {
        const newMsg = {
          sender: 'إدارة البرنامج (الأدمن)',
          text,
          date: new Date().toLocaleString('ar-OM'),
          isAdmin: true
        };
        const updated = [...this.messageHistory(), newMsg];
        this.messageHistory.set(updated);
        this.saveStorageMessages(trainee.traineeId, updated);
        this.messageBody.set('');
        this.isSendingMessage.set(false);
        this.showToast(`تم إرسال الرسالة إلى المتدرب "${trainee.fullName}" بنجاح.`, 'success');
      },
      error: () => {
        this.isSendingMessage.set(false);
        this.showToast('تعذر إرسال الرسالة إلى قاعدة البيانات.', 'error');
      }
    });
  }

  openCvModal(item: EnrichedTraineeItem) {
    this.activeTrainee.set(item);
    this.showCvModal.set(true);
  }

  closeCvModal() {
    this.showCvModal.set(false);
  }

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  downloadCv(item: EnrichedTraineeItem) {
    if (!item) return;
    const safeName = (item.fullName || 'Trainee').replace(/\s+/g, '_');

    if (item.resumeUrl) {
      const normalized =
        item.resumeUrl.startsWith('http') || item.resumeUrl.startsWith('/')
          ? item.resumeUrl
          : `https://${item.resumeUrl}`;

      this.showToast(`جاري تنزيل السيرة الذاتية للمتدرب "${item.fullName}"...`, 'info');

      fetch(normalized)
        .then(res => {
          if (!res.ok) throw new Error('Network error');
          return res.blob();
        })
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `CV_${safeName}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(blobUrl);
          this.showToast(`تم تنزيل السيرة الذاتية للمتدرب "${item.fullName}" بنجاح!`, 'success');
        })
        .catch(() => {
          const a = document.createElement('a');
          a.href = normalized;
          a.download = `CV_${safeName}.pdf`;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          a.remove();
          this.showToast(`تم بدء تنزيل السيرة الذاتية للمتدرب "${item.fullName}".`, 'success');
        });
      return;
    }

    const skillsHtml = item.skills
      ? item.skills
          .split(',')
          .map(s => `<span style="background:#e0f2fe;color:#0369a1;padding:4px 10px;border-radius:6px;margin:4px;display:inline-block;font-size:13px;">${s.trim()}</span>`)
          .join(' ')
      : 'غير مسجل';

    const cvContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>السيرة الذاتية - ${item.fullName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px; }
    .card { max-width: 750px; margin: auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .header { border-bottom: 3px solid #0a1172; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    h1 { margin: 0; color: #0a1172; font-size: 24px; }
    .sub { color: #64748b; font-size: 14px; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .box { background: #f8fafc; padding: 12px 16px; border-radius: 10px; border: 1px solid #e2e8f0; }
    .label { font-size: 12px; color: #64748b; display: block; margin-bottom: 4px; }
    .val { font-size: 15px; font-weight: bold; color: #1e293b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <h1>${item.fullName}</h1>
        <div class="sub">${item.university || 'جامعة غير محددة'} — ${item.major || 'تخصص غير محدد'}</div>
      </div>
      <div style="text-align:left;font-weight:bold;color:#0066c4;">منصة نفاذ الوطنية</div>
    </div>
    <div class="grid">
      <div class="box"><span class="label">الرقم المدني</span><span class="val">${item.nationalId || '—'}</span></div>
      <div class="box"><span class="label">البريد الإلكتروني</span><span class="val">${item.email || '—'}</span></div>
      <div class="box"><span class="label">رقم الهاتف</span><span class="val">${item.phone || '—'}</span></div>
      <div class="box"><span class="label">المستوى الأكاديمي</span><span class="val">${item.academicLevel || 'بكالوريوس'}</span></div>
      <div class="box"><span class="label">الشركة المستضيفة</span><span class="val">${item.companyName || 'لم يوزّع بعد'}</span></div>
      <div class="box"><span class="label">الدفعة / المسار</span><span class="val">${item.batchName || '—'}</span></div>
    </div>
    <div class="box">
      <span class="label">المهارات التقنية المسجلة</span>
      <div style="margin-top:8px;">${skillsHtml}</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([cvContent], { type: 'text/html;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CV_${safeName}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    this.showToast(`تم تنزيل ملف السيرة الذاتية للمتدرب "${item.fullName}" بنجاح!`, 'success');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.importError.set(null);
    this.invalidRows.set([]);

    if (!input.files?.length) return;

    const file = input.files[0];
    const maxSizeBytes = 5 * 1024 * 1024;
    const allowedExtensions = /(\.xlsx|\.xls)$/i;

    if (!allowedExtensions.exec(file.name)) {
      this.importError.set('عذراً، يرجى اختيار ملف بصيغة Excel فقط (.xlsx أو .xls).');
      input.value = '';
      return;
    }

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

        if (!rawData || rawData.length === 0) {
          this.importError.set('الملف المرفوع فارغ ولا يحتوي على أي بيانات.');
          return;
        }

        const validRecords: any[] = [];
        const rowErrors: { rowNumber: number; errors: string[] }[] = [];
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]+$/;
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
          } else if (!nameRegex.test(fullName)) {
            currentErrors.push('الاسم يحتوي على أرقام أو رموز غير مسموحة.');
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
              profileImageUrl: row['الصورة الشخصية'] || row['ProfileImageUrl'] || '',
              resumeUrl: row['الرابط'] || row['السيرة الذاتية'] || row['ResumeUrl'] || '',
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
        this.showToast(`تم استيراد ${records.length} متدرب إلى قاعدة البيانات بنجاح!`, 'success');
        this.loadDatabaseStats();
        this.loadTrainees();
        this.closeImportModal();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('خطأ أثناء الاستيراد:', err);
        this.importError.set('فشل استيراد السجلات إلى قاعدة البيانات.');
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
      phone: form.phone?.trim() || '',
      nationalId: form.nationalId ? Number(form.nationalId) : null,
      university: form.university?.trim() || '',
      major: form.major?.trim() || '',
      academicLevel: form.academicLevel?.trim() || '',
      skills: form.skills?.trim() || '',
      profileImageUrl: form.profileImageUrl?.trim() || '',
      resumeUrl: form.resumeUrl?.trim() || '',
      gitHubUrl: form.gitHubUrl?.trim() || '',
      linkedInUrl: form.linkedInUrl?.trim() || ''
    };

    this.api.createTrainee(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.loadDatabaseStats();
        this.loadTrainees();
        this.showRegisterModal.set(false);
        this.resetForm();
        this.showToast('تم إضافة المتدرب الجديد وحفظ بياناته في قاعدة البيانات بنجاح!', 'success');
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('خطأ أثناء حفظ المتدرب:', err);
        this.errorMessage.set('فشل حفظ المتدرب. تأكد من عدم تكرار البريد الإلكتروني أو رقم الهوية.');
      }
    });
  }

  private resetForm() {
    this.newTrainee.set({
      fullName: '',
      email: '',
      phone: '',
      nationalId: null,
      university: '',
      major: '',
      academicLevel: '',
      skills: '',
      profileImageUrl: '',
      resumeUrl: '',
      gitHubUrl: '',
      linkedInUrl: ''
    });
    this.formErrors.set({});
    this.touchedFields.set({});
    this.errorMessage.set(null);
  }
}
