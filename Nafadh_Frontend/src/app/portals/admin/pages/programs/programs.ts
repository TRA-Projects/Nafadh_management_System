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
    }, 3500);
  }

  // ==========================================================
  // 🔔 4. الأجندة، التقويم، وإشعارات الاختبارات
  // ==========================================================
  latestBatchQuiz: any = null;
  calendarFilter = signal<'all' | 'quiz' | 'project' | 'task' | 'interview'>('all');
  batchEvents = signal<any[]>([]);

  // مفتاح التبديل بين جدول التقييمات والتقويم الشهري للدفعة
  scheduleViewMode: 'timeline' | 'calendar' = 'timeline';
  calendarViewMode = signal<'timeline' | 'monthly'>('timeline');
  selectedMonth = signal<'June' | 'July'>('June');

  // التقويم الشهري التفاعلي
  activeCalendarDate: Date = new Date();
  calendarMonthDays: any[] = [];

  // فلترة أحداث التقويم بحسب النوع المختار
  filteredBatchEvents = computed(() => {
    const f = this.calendarFilter();
    const events = this.batchEvents();
    if (f === 'all') return events;
    return events.filter(e => e.type === f);
  });

  // ==========================================================
  // 5. كشف درجات ومحضر الاختبار كامل الشاشة (Full-Screen Dossier)
  // ==========================================================
  isQuizTraineesModalOpen = signal<boolean>(false);
  isQuizAuditFullPageOpen = signal<boolean>(false);
  activeQuizForAudit: any = null;
  activeQuizAttempts = signal<any[]>([]);

  // فلتر نتائج تدقيق الاختبار (أزرار مستطيلة بدون إيموجي)
  auditFilter: 'all' | 'passed' | 'failed' | 'absent' | 'cheating' = 'all';

  // نوافذ الأعذار والملاحظات المنبثقة
  isExcuseModalOpen: boolean = false;
  selectedExcuseRow: any = null;

  isNoteModalOpen: boolean = false;
  selectedNoteRow: any = null;

  // المحاولات المفلترة بحسب التبويب المحدد
  filteredQuizAttempts = computed(() => {
    const list = this.activeQuizAttempts();
    const f = this.auditFilter;
    if (f === 'all') return list;
    if (f === 'passed') return list.filter(a => a.status === 'Passed');
    if (f === 'failed') return list.filter(a => a.status === 'Failed');
    if (f === 'absent') return list.filter(a => a.status === 'Absent' || a.status === 'NotAttempted' || !a.submittedAt || a.excuseStatus);
    if (f === 'cheating') return list.filter(a => (a.cheatingRiskPercentage || 0) > 0 || (a.tabSwitchCount || 0) > 0 || (a.cameraDisconnectionsCount || 0) > 0);
    return list;
  });

  // ==========================================================
  // 5.1 سجل مشاريع GitHub وتسليمات الكود والواجبات (Project Dossier)
  // ==========================================================
  isProjectDossierOpen = signal<boolean>(false);
  isProjectAuditFullPageOpen = signal<boolean>(false);
  activeProjectEvent: any = null;
  projectSubmissions = signal<any[]>([]);
  projectFilter = signal<'all' | 'graded' | 'under_review' | 'late'>('all');

  isProjectGradeModalOpen = false;
  selectedProjectForGrading: any = null;
  gradingScoreInput: number = 0;
  gradingFeedbackInput: string = '';

  filteredProjectSubmissions = computed(() => {
    const list = this.projectSubmissions();
    const f = this.projectFilter();
    if (f === 'all') return list;
    if (f === 'graded') return list.filter(p => p.status === 'مكتمل ومعتمد' || p.status === 'يتطلب تحسينات');
    if (f === 'under_review') return list.filter(p => p.status === 'قيد المراجعة والتقييم');
    if (f === 'late') return list.filter(p => p.isLateSubmission);
    return list;
  });

  // ==========================================================
  // 6. Lifecycle Hook
  // ==========================================================
  ngOnInit(): void {
    this.initBatchForm();
    this.initEditBatchForm();
    this.initProgramForm();
    this.loadInitialData();
    this.buildMonthlyCalendarGrid();
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
  // 7. Navigation Handlers & شاشة التفاصيل (زر العين)
  // ==========================================================
  onView(batch: any): void {
    this.selectedBatch = batch;
    this.isDetailsPageOpen.set(true);
    this.isTraineesPageOpen.set(false);
    this.isQuizAuditFullPageOpen.set(false);
    this.isProjectAuditFullPageOpen.set(false);
    this.isProjectDossierOpen.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (batch?.startDate) {
      this.activeCalendarDate = new Date(batch.startDate);
    } else {
      this.activeCalendarDate = new Date();
    }

    this.loadBatchAcademicEvents(batch);
  }

  onBackFromDetails(): void {
    this.isDetailsPageOpen.set(false);
    this.isQuizAuditFullPageOpen.set(false);
    this.isProjectAuditFullPageOpen.set(false);
    this.isProjectDossierOpen.set(false);
    this.selectedBatch = null;
    this.latestBatchQuiz = null;
    this.batchEvents.set([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================================
  // 8. بناء أحداث الدفعة وتقويمها الزمني والشهري
  // ==========================================================
  private loadBatchAcademicEvents(batch: any): void {
    const batchId = Number(batch?.batchId || batch?.id);

    if ((this.adminApi as any).getBatchQuizzes) {
      (this.adminApi as any).getBatchQuizzes(batchId).subscribe({
        next: (quizzes: any[]) => {
          this.buildBatchCalendar(batch, quizzes || []);
        },
        error: () => {
          this.buildBatchCalendar(batch, []);
        }
      });
    } else {
      this.buildBatchCalendar(batch, []);
    }
  }

  private buildBatchCalendar(batch: any, remoteQuizzes: any[]): void {
    const startDate = batch?.startDate ? new Date(batch.startDate) : new Date();

    const quiz1Date = new Date(startDate);
    quiz1Date.setDate(quiz1Date.getDate() + 14);
    quiz1Date.setHours(10, 0, 0);

    const quiz2Date = new Date(startDate);
    quiz2Date.setDate(quiz2Date.getDate() + 45);
    quiz2Date.setHours(11, 30, 0);

    const defaultQuizzes = [
      {
        quizId: 101,
        title: 'اختبار المفاهيم الأساسية والمعمارية (Midterm Quiz)',
        description: 'اختبار تقييمي إجباري يغطي المفاهيم النظرية والتطبيق العملي للمرحلة الأولى.',
        batchId: batch?.batchId,
        trainerName: 'م. أحمد المعمري',
        startDateTime: quiz1Date.toISOString(),
        durationMinutes: 60,
        passingPercentage: 60,
        cameraRequired: true,
        status: 'Active',
        maxScore: 100
      },
      {
        quizId: 102,
        title: 'اختبار الكفاءة والجاهزية لسوق العمل (Final Assessment)',
        description: 'تقييم شامل يقيس مدى استيعاب المتدرب للمشاريع المنجزة وجودة الكود.',
        batchId: batch?.batchId,
        trainerName: 'د. سارة الكندية',
        startDateTime: quiz2Date.toISOString(),
        durationMinutes: 90,
        passingPercentage: 70,
        cameraRequired: true,
        status: 'Scheduled',
        maxScore: 100
      }
    ];

    const activeQuizzes = remoteQuizzes.length > 0 ? remoteQuizzes : defaultQuizzes;
    this.latestBatchQuiz = activeQuizzes[0] || null;

    const events: any[] = [];

    // 1. إضافة الاختبارات
    activeQuizzes.forEach(q => {
      const qDate = new Date(q.startDateTime);
      events.push({
        id: `quiz-${q.quizId}`,
        title: q.title,
        description: q.description,
        type: 'quiz',
        typeLabel: 'اختبار معتمد',
        date: qDate,
        timeString: qDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        rawQuiz: q
      });
    });

    // 2. إضافة المشاريع
    const projDate = new Date(startDate);
    projDate.setDate(projDate.getDate() + 28);
    events.push({
      id: 'proj-1',
      title: 'تسليم النموذج الأولي لمشروع التخرج (Milestone 1)',
      description: 'رفع مخطط قاعدة البيانات وواجهات المستخدم على مستودع GitHub مع تقرير التوثيق.',
      type: 'project',
      typeLabel: 'تسليم مشروع',
      date: projDate,
      timeString: '11:59 م',
      rawQuiz: null
    });

    // 3. إضافة المهام والواجبات
    const taskDate = new Date(startDate);
    taskDate.setDate(taskDate.getDate() + 7);
    events.push({
      id: 'task-1',
      title: 'مهمة بناء واجهات API وتوثيق الـ Endpoints عبر Swagger',
      description: 'تطبيق عملي معتمد يسلّم ككود برمجي للمدرب لمراجعته ورصد الدرجات.',
      type: 'task',
      typeLabel: 'واجب عملي',
      date: taskDate,
      timeString: '05:00 م',
      rawQuiz: null
    });

    // 4. المقابلات والتقييم النهائي
    const interviewDate = new Date(startDate);
    interviewDate.setDate(interviewDate.getDate() + 55);
    events.push({
      id: 'interview-1',
      title: 'المقابلة الفنية ومناقشة مشروع التخرج مع لجنة التقييم',
      description: 'جلسة تقييمية شفوية لعرض مخرجات المشروع ومناقشة التحديات التقنية.',
      type: 'interview',
      typeLabel: 'مقابلة فنية',
      date: interviewDate,
      timeString: '09:00 ص',
      rawQuiz: null
    });

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    this.batchEvents.set(events);

    this.buildMonthlyCalendarGrid();
  }

  // ==========================================================
  // 9. دوال التقويم الشهري (Monthly Calendar)
  // ==========================================================
  onPrevMonth(): void {
    const d = new Date(this.activeCalendarDate);
    d.setMonth(d.getMonth() - 1);
    this.activeCalendarDate = d;
    this.buildMonthlyCalendarGrid();
  }

  onNextMonth(): void {
    const d = new Date(this.activeCalendarDate);
    d.setMonth(d.getMonth() + 1);
    this.activeCalendarDate = d;
    this.buildMonthlyCalendarGrid();
  }

  onTodayMonth(): void {
    this.activeCalendarDate = new Date();
    this.buildMonthlyCalendarGrid();
  }

  getEventsForCurrentMonthCount(): number {
    const year = this.activeCalendarDate.getFullYear();
    const month = this.activeCalendarDate.getMonth();
    return this.batchEvents().filter(e => {
      const ed = new Date(e.date);
      return ed.getFullYear() === year && ed.getMonth() === month;
    }).length;
  }

  onCalendarEventClick(event: any): void {
    if (event.type === 'quiz' && event.rawQuiz) {
      this.openQuizAuditFullPage(event.rawQuiz);
    } else if (event.type === 'project' || event.type === 'task' || event.type === 'interview') {
      this.openProjectDossier(event);
    } else {
      this.showToast(`${event.typeLabel}: ${event.title}`, 'success');
    }
  }

  private buildMonthlyCalendarGrid(): void {
    const year = this.activeCalendarDate.getFullYear();
    const month = this.activeCalendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: any[] = [];
    const today = new Date();

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const dDate = new Date(year, month - 1, dNum);
      days.push({
        dayNumber: dNum,
        date: dDate,
        isCurrentMonth: false,
        isToday: false,
        events: this.getEventsForDate(dDate)
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dDate = new Date(year, month, i);
      const isToday = dDate.getDate() === today.getDate() &&
        dDate.getMonth() === today.getMonth() &&
        dDate.getFullYear() === today.getFullYear();

      days.push({
        dayNumber: i,
        date: dDate,
        isCurrentMonth: true,
        isToday,
        events: this.getEventsForDate(dDate)
      });
    }

    const remaining = 35 - days.length;
    const finalRemaining = remaining < 0 ? (42 - days.length) : remaining;
    for (let i = 1; i <= finalRemaining; i++) {
      const dDate = new Date(year, month + 1, i);
      days.push({
        dayNumber: i,
        date: dDate,
        isCurrentMonth: false,
        isToday: false,
        events: this.getEventsForDate(dDate)
      });
    }

    this.calendarMonthDays = days;
  }

  private getEventsForDate(targetDate: Date): any[] {
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const d = targetDate.getDate();

    return this.batchEvents().filter(ev => {
      const evDate = new Date(ev.date);
      return evDate.getFullYear() === y && evDate.getMonth() === m && evDate.getDate() === d;
    });
  }

  // ==========================================================
  // 10. فتح صفحة كشف درجات ومحضر الاختبار كاملة الشاشة
  // ==========================================================
  openQuizAuditFullPage(quiz: any): void {
    if (!quiz) return;
    this.activeQuizForAudit = quiz;
    this.isQuizAuditFullPageOpen.set(true);
    this.isProjectAuditFullPageOpen.set(false);
    this.isProjectDossierOpen.set(false);
    this.isQuizTraineesModalOpen.set(false);
    this.isDetailsPageOpen.set(false);
    this.auditFilter = 'all';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const quizId = quiz.quizId || 101;
    if ((this.adminApi as any)?.getQuizAttempts) {
      (this.adminApi as any).getQuizAttempts(quizId).subscribe({
        next: (attempts: any[]) => {
          this.activeQuizAttempts.set(attempts && attempts.length > 0 ? attempts : this.generateRichFallbackAttempts(quiz));
        },
        error: () => {
          this.activeQuizAttempts.set(this.generateRichFallbackAttempts(quiz));
        }
      });
    } else {
      this.activeQuizAttempts.set(this.generateRichFallbackAttempts(quiz));
    }
  }

  openQuizTraineesModal(quiz: any): void {
    this.openQuizAuditFullPage(quiz);
  }

  closeQuizAuditFullPage(): void {
    this.isQuizAuditFullPageOpen.set(false);
    this.activeQuizForAudit = null;
    this.activeQuizAttempts.set([]);
    this.isDetailsPageOpen.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeQuizTraineesModal(): void {
    this.closeQuizAuditFullPage();
  }

  /**
   * كشف المحاولات والدرجات لـ 11 متدرب بالتمام:
   * 9 حاضرين (8 ناجحين + 1 راسب) + 2 متغيبين = 11 متدرب
   */
  private generateRichFallbackAttempts(quiz: any): any[] {
    const baseDate = quiz?.startDateTime ? new Date(quiz.startDateTime) : new Date();

    return [
      {
        id: 1,
        traineeId: 201,
        traineeName: 'محمد بن سالم الحارثي',
        traineeAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Mohammed',
        submittedAt: new Date(baseDate.getTime() + 45 * 60000).toISOString(),
        score: 92,
        totalScore: 100,
        percentage: 92,
        status: 'Passed',
        cheatingRiskPercentage: 0,
        tabSwitchCount: 0,
        cameraDisconnectionsCount: 0,
        attendanceStatus: 'attended',
        traineeSubmissionNote: 'تم حل المسائل المعمارية بنجاح وتطبيق نمط Clean Architecture.',
        excuseReason: null,
        excuseStatus: 'None'
      },
      {
        id: 2,
        traineeId: 202,
        traineeName: 'فاطمة بنت ناصر البوسعيدية',
        traineeAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Fatma',
        submittedAt: new Date(baseDate.getTime() + 50 * 60000).toISOString(),
        score: 85,
        totalScore: 100,
        percentage: 85,
        status: 'Passed',
        cheatingRiskPercentage: 10,
        tabSwitchCount: 1,
        cameraDisconnectionsCount: 0,
        attendanceStatus: 'attended',
        traineeSubmissionNote: 'اختبار ممتاز وتنسيق رائع للأسئلة البرمجية.',
        excuseReason: null,
        excuseStatus: 'None'
      },
      {
        id: 3,
        traineeId: 203,
        traineeName: 'عبدالله بن راشد الشكيلي',
        traineeAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Abdullah',
        submittedAt: new Date(baseDate.getTime() + 58 * 60000).toISOString(),
        score: 48,
        totalScore: 100,
        percentage: 48,
        status: 'Failed',
        cheatingRiskPercentage: 65,
        tabSwitchCount: 5,
        cameraDisconnectionsCount: 2,
        attendanceStatus: 'attended',
        traineeSubmissionNote: 'واجهت بطء بسيط في الشبكة أثناء رفع السؤال الأخير.',
        excuseReason: null,
        excuseStatus: 'None'
      },
      {
        id: 4,
        traineeId: 204,
        traineeName: 'ريم بنت خلفان العامرية',
        traineeAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Reem',
        submittedAt: null,
        score: null,
        totalScore: 100,
        percentage: null,
        status: 'Absent',
        cheatingRiskPercentage: 0,
        tabSwitchCount: 0,
        cameraDisconnectionsCount: 0,
        attendanceStatus: 'absent',
        traineeSubmissionNote: null,
        excuseReason: 'عذر مرضي طارئ - مراجعة مستشفى خولة (تقرير طبي مرفق)',
        excuseAttachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        excuseStatus: 'PendingReview'
      },
      {
        id: 5,
        traineeId: 205,
        traineeName: 'يحيى بن سليمان الهنائي',
        traineeAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Yahya',
        submittedAt: null,
        score: null,
        totalScore: 100,
        percentage: null,
        status: 'Absent',
        cheatingRiskPercentage: 0,
        tabSwitchCount: 0,
        cameraDisconnectionsCount: 0,
        attendanceStatus: 'excused',
        traineeSubmissionNote: null,
        excuseReason: 'ظرف عائلي قاهر تم إشعار المدرب به مسبقاً وتزكيته',
        excuseAttachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        excuseStatus: 'Approved'
      },
      {
        id: 6,
        traineeId: 206,
        traineeName: 'خالد بن ناصر المعمري',
        traineeAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Khaled',
        submittedAt: new Date(baseDate.getTime() + 40 * 60000).toISOString(),
        score: 95,
        totalScore: 100,
        percentage: 95,
        status: 'Passed',
        cheatingRiskPercentage: 0,
        tabSwitchCount: 0,
        cameraDisconnectionsCount: 0,
        attendanceStatus: 'attended',
        traineeSubmissionNote: 'تم تسليم الحل بالكامل مع التوثيق البرمجي.',
        excuseReason: null,
        excuseStatus: 'None'
      },
      {
        id: 7,
        traineeId: 207,
        traineeName: 'سارة بنت حمود الغافرية',
        traineeAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sara',
        submittedAt: new Date(baseDate.getTime() + 48 * 60000).toISOString(),
        score: 88,
        totalScore: 100,
        percentage: 88,
        status: 'Passed',
        cheatingRiskPercentage: 0,
        tabSwitchCount: 0,
        cameraDisconnectionsCount: 0,
        attendanceStatus: 'attended',
        traineeSubmissionNote: 'تمت مراجعة جميع الإجابات قبل التسليم النهائي.',
        excuseReason: null,
        excuseStatus: 'None'
      },
      {
        id: 8,
        traineeId: 208,
        traineeName: 'سالم بن خميس المقبالي',
        traineeAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Salim',
        submittedAt: new Date(baseDate.getTime() + 52 * 60000).toISOString(),
        score: 76,
        totalScore: 100,
        percentage: 76,
        status: 'Passed',
        cheatingRiskPercentage: 15,
        tabSwitchCount: 1,
        cameraDisconnectionsCount: 0,
        attendanceStatus: 'attended',
        traineeSubmissionNote: 'تم الانتهاء بنجاح في الوقت المحدد.',
        excuseReason: null,
        excuseStatus: 'None'
      },
      {
        id: 9,
        traineeId: 209,
        traineeName: 'مريم بنت سعيد البلوشية',
        traineeAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Maryam',
        submittedAt: new Date(baseDate.getTime() + 42 * 60000).toISOString(),
        score: 91,
        totalScore: 100,
        percentage: 91,
        status: 'Passed',
        cheatingRiskPercentage: 0,
        tabSwitchCount: 0,
        cameraDisconnectionsCount: 0,
        attendanceStatus: 'attended',
        traineeSubmissionNote: 'كل شيء واضح ومباشر ومنظم.',
        excuseReason: null,
        excuseStatus: 'None'
      },
      {
        id: 10,
        traineeId: 210,
        traineeName: 'أحمد بن حمدان الفارسي',
        traineeAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Ahmed',
        submittedAt: new Date(baseDate.getTime() + 55 * 60000).toISOString(),
        score: 82,
        totalScore: 100,
        percentage: 82,
        status: 'Passed',
        cheatingRiskPercentage: 0,
        tabSwitchCount: 0,
        cameraDisconnectionsCount: 0,
        attendanceStatus: 'attended',
        traineeSubmissionNote: 'شكراً للجنة الإشراف والمدرب على التوجيه المستمر.',
        excuseReason: null,
        excuseStatus: 'None'
      },
      {
        id: 11,
        traineeId: 211,
        traineeName: 'أروى بنت علي الخروصية',
        traineeAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Arwa',
        submittedAt: new Date(baseDate.getTime() + 47 * 60000).toISOString(),
        score: 79,
        totalScore: 100,
        percentage: 79,
        status: 'Passed',
        cheatingRiskPercentage: 0,
        tabSwitchCount: 0,
        cameraDisconnectionsCount: 0,
        attendanceStatus: 'attended',
        traineeSubmissionNote: 'تم تطبيق معايير الـ Database والـ WebRTC بنجاح.',
        excuseReason: null,
        excuseStatus: 'None'
      }
    ];
  }

  // ==========================================================
  // 11. إحصائيات كشف الدرجات ومؤشرات الغش والغياب
  // ==========================================================
  getQuizAttendeesCount(): number {
    return this.activeQuizAttempts().filter(a => a.submittedAt || (a.score !== null && a.score !== undefined) || a.attendanceStatus === 'attended').length;
  }

  getQuizPassedCount(): number {
    return this.activeQuizAttempts().filter(a => a.status === 'Passed').length;
  }

  getQuizFailedCount(): number {
    return this.activeQuizAttempts().filter(a => a.status === 'Failed').length;
  }

  getQuizPassingRate(): number {
    const attendees = this.getQuizAttendeesCount();
    if (!attendees) return 0;
    return Math.round((this.getQuizPassedCount() / attendees) * 100);
  }

  getQuizAverageScore(): number {
    const scores = this.activeQuizAttempts()
      .filter(a => a.percentage !== null && a.percentage !== undefined)
      .map(a => Number(a.percentage));
    if (!scores.length) return 0;
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / scores.length);
  }

  getQuizAbsentCount(): number {
    return this.activeQuizAttempts().filter(a => a.status === 'Absent' || a.status === 'NotAttempted' || !a.submittedAt).length;
  }

  getCheatingSuspectsCount(): number {
    return this.activeQuizAttempts().filter(a => (a.cheatingRiskPercentage || 0) > 20 || (a.tabSwitchCount || 0) > 2).length;
  }

  // ==========================================================
  // 12. استعراض الأعذار الطبية (للاطلاع فقط للأدمن)
  // ==========================================================
  onOpenExcuseModal(row: any): void {
    this.selectedExcuseRow = row;
    this.isExcuseModalOpen = true;
  }

  onCloseExcuseModal(): void {
    this.isExcuseModalOpen = false;
    this.selectedExcuseRow = null;
  }



  onViewSubmissionNote(row: any): void {
    this.selectedNoteRow = row;
    this.isNoteModalOpen = true;
  }

  // ==========================================================
  // 13. طباعة المحضر الرسمي A4
  // ==========================================================
  // ==========================================================
  // 13. طباعة المحضر الرسمي A4 (مع إخفاء الشريط الجانبي والهيدر 100%)
  // ==========================================================
  onPrintAuditReport(): void {
    this.executeCleanPrint();
  }

  printOfficialReport(): void {
    this.executeCleanPrint();
  }

  private executeCleanPrint(): void {
    const styleId = 'nafadh-dynamic-print-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          
          /* إخفاء القائمة الجانبية والشريط العلوي وأزرار التحكم بالكامل */
          app-sidebar, app-header, app-navbar, aside, nav, header,
          .sidebar, .main-sidebar, .app-sidebar, .nfd-sidebar,
          .btn-back-nav, .audit-top-actions-bar, .audit-header-buttons,
          .action-header-bar, .modal-overlay, button, .filter-buttons-group {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
          }

          /* جعل محتوى المحضر والكشف يملأ عرض الصفحة 100% بدون أي فراغ جانبي */
          body, html, main, .main-content, .content-wrapper,
          .quiz-audit-full-page-container, .project-eval-full-page {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            position: static !important;
            background: #ffffff !important;
          }
        }
      `;
      document.head.appendChild(styleEl);
    }
    window.print();
  }
  // ==========================================================
  // 13.1 سجل ومحضر مشاريع GitHub والواجبات (Full-Page Dossier)
  // ==========================================================
  openProjectDossier(event: any): void {
    this.activeProjectEvent = event;
    this.projectFilter.set('all');
    this.projectSubmissions.set(this.generateSampleProjectSubmissions(event));
    this.isProjectAuditFullPageOpen.set(true);
    this.isProjectDossierOpen.set(true);
    this.isQuizAuditFullPageOpen.set(false);
    this.isDetailsPageOpen.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeProjectAuditFullPage(): void {
    this.isProjectAuditFullPageOpen.set(false);
    this.isProjectDossierOpen.set(false);
    this.activeProjectEvent = null;
    this.isDetailsPageOpen.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeProjectDossier(): void {
    this.closeProjectAuditFullPage();
  }

  onCopyText(text: string, label: string = 'النص'): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(`تم نسخ ${label} إلى الحافظة بنجاح ✔️`, 'success');
      }).catch(() => {
        this.showToast(`الرابط: ${text}`, 'warning');
      });
    } else {
      this.showToast(`الرابط: ${text}`, 'warning');
    }
  }

  onOpenProjectGradeModal(sub: any): void {
    this.selectedProjectForGrading = sub;
    this.gradingScoreInput = sub?.score || 85;
    this.gradingFeedbackInput = sub?.reviewerFeedback || '';
    this.isProjectGradeModalOpen = true;
  }

  onCloseProjectGradeModal(): void {
    this.isProjectGradeModalOpen = false;
    this.selectedProjectForGrading = null;
  }

  copyGitHubUrl(url: string): void {
    this.onCopyText(url, 'رابط مستودع GitHub');
  }

  onSaveProjectGrade(submissionId?: number, newScore?: number, feedback?: string): void {
    if (submissionId !== undefined && newScore !== undefined) {
      const list = this.projectSubmissions();
      const target = list.find((s: any) => s.id === submissionId);
      if (target) {
        target.score = Number(newScore);
        target.reviewerFeedback = feedback || '';
        target.status = target.score >= 60 ? 'مكتمل ومعتمد' : 'يتطلب تحسينات';
        target.gradedAt = new Date().toISOString();
        this.projectSubmissions.set([...list]);
      }
      this.showToast('تم حفظ تقييم المشروع واعتماد الدرجة بنجاح ✔️', 'success');
      this.isProjectGradeModalOpen = false;
      return;
    }

    if (!this.selectedProjectForGrading) return;
    const list = this.projectSubmissions();
    const target = list.find((s: any) => s.id === this.selectedProjectForGrading.id);
    if (target) {
      target.score = Number(this.gradingScoreInput);
      target.reviewerFeedback = this.gradingFeedbackInput;
      target.status = target.score >= 60 ? 'مكتمل ومعتمد' : 'يتطلب تحسينات';
      target.gradedAt = new Date().toISOString();
      this.projectSubmissions.set([...list]);
    }
    this.showToast(`✓ تم تحديث تقييم المتدرب ${this.selectedProjectForGrading.traineeName} بنجاح.`, 'success');
    this.onCloseProjectGradeModal();
  }

  getProjectSubmissionsCount(): number {
    return this.projectSubmissions().length;
  }

  getProjectGradedCount(): number {
    return this.projectSubmissions().filter(p => p.score !== null && p.score !== undefined).length;
  }

  getProjectAverageScore(): number {
    const graded = this.projectSubmissions().filter(p => p.score !== null && p.score !== undefined);
    if (!graded.length) return 0;
    const sum = graded.reduce((acc, curr) => acc + (curr.score || 0), 0);
    return Math.round(sum / graded.length);
  }

  getProjectGithubReposCount(): number {
    return this.projectSubmissions().filter(p => !!p.repoUrl).length;
  }

  getLateSubmissionsCount(): number {
    return this.projectSubmissions().filter(p => p.isLateSubmission).length;
  }

  private generateSampleProjectSubmissions(event: any): any[] {
    const isProject = event?.type === 'project';
    return [
      {
        id: 1,
        traineeId: '201',
        traineeName: 'محمد بن سالم الحارثي',
        civilId: '108849201',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Mohammed',
        projectName: isProject ? 'Nafadh E-Services Core Web API' : 'Building RESTful Endpoints & Swagger Docs',
        type: event?.type || 'project',
        repoUrl: 'https://github.com/mh-harthi/nafadh-backend-api',
        repoName: 'mh-harthi/nafadh-backend-api',
        branch: 'main',
        liveDemoUrl: 'https://api.nafadh.om/swagger',
        submittedAt: '2026-06-28T14:30:00Z',
        commitHash: '7f9a2b1',
        commitMessage: 'feat: add Clean Architecture layers and JWT authentication endpoints',
        score: 94,
        maxScore: 100,
        status: 'مكتمل ومعتمد',
        criteria: {
          architecture: { name: 'Clean Architecture & DI', score: 28, max: 30 },
          apiDocs: { name: 'Swagger & Endpoints Documentation', score: 20, max: 20 },
          database: { name: 'EF Core & Migrations', score: 24, max: 25 },
          codeQuality: { name: 'Code Quality & Formatting', score: 22, max: 25 },
        },
        reviewerFeedback: 'تطبيق نموذجي ممتاز لمعايير Clean Architecture مع توثيق شامل للـ Endpoints واختبارات تكاملية متقنة.',
        reviewerName: 'م. أحمد المعمري',
        gradedAt: '2026-06-29T10:15:00Z',
        isLateSubmission: false
      },
      {
        id: 2,
        traineeId: '202',
        traineeName: 'فاطمة بنت ناصر البوسعيدية',
        civilId: '109923847',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Fatma',
        projectName: isProject ? 'Nafadh Trainee Attendance Tracking Microservice' : 'Building RESTful Endpoints & Swagger Docs',
        type: event?.type || 'project',
        repoUrl: 'https://github.com/fatma-dev/attendance-tracking-service',
        repoName: 'fatma-dev/attendance-tracking-service',
        branch: 'feat/jwt-auth',
        liveDemoUrl: 'https://fatma-attendance.nafadh.om',
        submittedAt: '2026-06-28T16:45:00Z',
        commitHash: '3c8e11a',
        commitMessage: 'refactor: enforce repository pattern and fluent validation',
        score: 89,
        maxScore: 100,
        status: 'مكتمل ومعتمد',
        criteria: {
          architecture: { name: 'Clean Architecture & DI', score: 26, max: 30 },
          apiDocs: { name: 'Swagger & Endpoints Documentation', score: 19, max: 20 },
          database: { name: 'EF Core & Migrations', score: 23, max: 25 },
          codeQuality: { name: 'Code Quality & Formatting', score: 21, max: 25 },
        },
        reviewerFeedback: 'هيكلية المشروع منظمة جداً واستخدام رائع لـ FluentValidation والـ DTOs.',
        reviewerName: 'م. أحمد المعمري',
        gradedAt: '2026-06-29T11:00:00Z',
        isLateSubmission: false
      },
      {
        id: 3,
        traineeId: '203',
        traineeName: 'عبدالله بن راشد الشكيلي',
        civilId: '107736482',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Abdullah',
        projectName: isProject ? 'Nafadh Enterprise Assessment Hub' : 'Building RESTful Endpoints & Swagger Docs',
        type: event?.type || 'project',
        repoUrl: 'https://github.com/ashakili/backend-core-microservice',
        repoName: 'ashakili/backend-core-microservice',
        branch: 'develop',
        liveDemoUrl: 'https://staging-api.ashakili.dev',
        submittedAt: '2026-06-29T02:10:00Z',
        commitHash: 'b45c90d',
        commitMessage: 'fix: resolve connection string pooling issue in DbContext',
        score: 72,
        maxScore: 100,
        status: 'يتطلب تحسينات',
        criteria: {
          architecture: { name: 'Clean Architecture & DI', score: 20, max: 30 },
          apiDocs: { name: 'Swagger & Endpoints Documentation', score: 15, max: 20 },
          database: { name: 'EF Core & Migrations', score: 18, max: 25 },
          codeQuality: { name: 'Code Quality & Formatting', score: 19, max: 25 },
        },
        reviewerFeedback: 'الكود يعمل بنجاح ولكن يحتاج فصل طبقة الوصول للبيانات (Repositories) عن الكنترولرز.',
        reviewerName: 'د. سارة الكندية',
        gradedAt: '2026-06-29T13:20:00Z',
        isLateSubmission: true
      },
      {
        id: 4,
        traineeId: '204',
        traineeName: 'ريم بنت خلفان العامرية',
        civilId: '108827361',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Reem',
        projectName: isProject ? 'Nafadh Interactive Quiz & Integrity Monitor' : 'Building RESTful Endpoints & Swagger Docs',
        type: event?.type || 'project',
        repoUrl: 'https://github.com/reem-alamri/nafadh-quiz-engine',
        repoName: 'reem-alamri/nafadh-quiz-engine',
        branch: 'main',
        liveDemoUrl: 'https://quiz-engine.reem.dev',
        submittedAt: '2026-06-27T21:00:00Z',
        commitHash: '91d4e5a',
        commitMessage: 'feat: add camera violation logging and real-time timer sync',
        score: 96,
        maxScore: 100,
        status: 'مكتمل ومعتمد',
        criteria: {
          architecture: { name: 'Clean Architecture & DI', score: 30, max: 30 },
          apiDocs: { name: 'Swagger & Endpoints Documentation', score: 20, max: 20 },
          database: { name: 'EF Core & Migrations', score: 24, max: 25 },
          codeQuality: { name: 'Code Quality & Formatting', score: 22, max: 25 },
        },
        reviewerFeedback: 'إنجاز استثنائي ومستوى احترافي عالٍ جداً! الكود منظم وجاهز للنشر المباشر.',
        reviewerName: 'م. أحمد المعمري',
        gradedAt: '2026-06-29T09:40:00Z',
        isLateSubmission: false
      },
      {
        id: 5,
        traineeId: '205',
        traineeName: 'يحيى بن سليمان الهنائي',
        civilId: '106654321',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Yahya',
        projectName: isProject ? 'Nafadh Identity & Access Management Module' : 'Building RESTful Endpoints & Swagger Docs',
        type: event?.type || 'project',
        repoUrl: 'https://github.com/yahya-hinai/identity-access-system',
        repoName: 'yahya-hinai/identity-access-system',
        branch: 'main',
        liveDemoUrl: undefined,
        submittedAt: '2026-06-29T11:45:00Z',
        commitHash: '4a6b8c1',
        commitMessage: 'initial commit: setup ASP.NET Core Identity with custom user claims',
        score: null,
        maxScore: 100,
        status: 'قيد المراجعة والتقييم',
        criteria: {
          architecture: { name: 'Clean Architecture & DI', score: 0, max: 30 },
          apiDocs: { name: 'Swagger & Endpoints Documentation', score: 0, max: 20 },
          database: { name: 'EF Core & Migrations', score: 0, max: 25 },
          codeQuality: { name: 'Code Quality & Formatting', score: 0, max: 25 },
        },
        reviewerFeedback: 'المشروع قيد الفحص البرمجي من قبل المدرب م. أحمد المعمري.',
        reviewerName: 'م. أحمد المعمري',
        gradedAt: undefined,
        isLateSubmission: false
      },
      {
        id: 6,
        traineeId: '206',
        traineeName: 'خالد بن ناصر المعمري',
        civilId: '109938472',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Khaled',
        projectName: isProject ? 'Nafadh Cloud Notification Gateway' : 'Building RESTful Endpoints & Swagger Docs',
        type: event?.type || 'project',
        repoUrl: 'https://github.com/khaled-maamari/nafadh-services-hub',
        repoName: 'khaled-maamari/nafadh-services-hub',
        branch: 'main',
        liveDemoUrl: 'https://khaled-hub.nafadh.om',
        submittedAt: '2026-06-28T18:00:00Z',
        commitHash: '8b7f12e',
        commitMessage: 'feat: implement background queue processing and notification templates',
        score: 85,
        maxScore: 100,
        status: 'مكتمل ومعتمد',
        criteria: {
          architecture: { name: 'Clean Architecture & DI', score: 25, max: 30 },
          apiDocs: { name: 'Swagger & Endpoints Documentation', score: 18, max: 20 },
          database: { name: 'EF Core & Migrations', score: 22, max: 25 },
          codeQuality: { name: 'Code Quality & Formatting', score: 20, max: 25 },
        },
        reviewerFeedback: 'عمل جيد جداً وتنفيذ سليم لنمط BackgroundService.',
        reviewerName: 'د. سارة الكندية',
        gradedAt: '2026-06-29T14:10:00Z',
        isLateSubmission: false
      },
      {
        id: 7,
        traineeId: '207',
        traineeName: 'سارة بنت حمود الغافرية',
        civilId: '108849207',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sara',
        projectName: isProject ? 'Nafadh Trainee Certificates Issuance Microservice' : 'Building RESTful Endpoints & Swagger Docs',
        type: event?.type || 'project',
        repoUrl: 'https://github.com/sara-ghafri/certificates-service',
        repoName: 'sara-ghafri/certificates-service',
        branch: 'main',
        liveDemoUrl: 'https://sara-cert.nafadh.om',
        submittedAt: '2026-06-28T15:20:00Z',
        commitHash: '5e4d3c2',
        commitMessage: 'feat: add digital signature and PDF generation engine',
        score: 91,
        maxScore: 100,
        status: 'مكتمل ومعتمد',
        criteria: {
          architecture: { name: 'Clean Architecture & DI', score: 27, max: 30 },
          apiDocs: { name: 'Swagger & Endpoints Documentation', score: 19, max: 20 },
          database: { name: 'EF Core & Migrations', score: 23, max: 25 },
          codeQuality: { name: 'Code Quality & Formatting', score: 22, max: 25 },
        },
        reviewerFeedback: 'تصميم متين ومتقن لمخرجات الـ PDF والتوثيق التفاعلي.',
        reviewerName: 'م. أحمد المعمري',
        gradedAt: '2026-06-29T12:00:00Z',
        isLateSubmission: false
      },
      {
        id: 8,
        traineeId: '208',
        traineeName: 'سالم بن خميس المقبالي',
        civilId: '107728193',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Salim',
        projectName: isProject ? 'Nafadh Trainee Real-Time Chat & Collaboration Engine' : 'Building RESTful Endpoints & Swagger Docs',
        type: event?.type || 'project',
        repoUrl: 'https://github.com/salim-mqbali/chat-engine',
        repoName: 'salim-mqbali/chat-engine',
        branch: 'main',
        liveDemoUrl: undefined,
        submittedAt: '2026-06-28T19:10:00Z',
        commitHash: '2b1a0f9',
        commitMessage: 'feat: integrate SignalR hubs with Redis backplane',
        score: 83,
        maxScore: 100,
        status: 'مكتمل ومعتمد',
        criteria: {
          architecture: { name: 'Clean Architecture & DI', score: 24, max: 30 },
          apiDocs: { name: 'Swagger & Endpoints Documentation', score: 17, max: 20 },
          database: { name: 'EF Core & Migrations', score: 21, max: 25 },
          codeQuality: { name: 'Code Quality & Formatting', score: 21, max: 25 },
        },
        reviewerFeedback: 'ربط سليم لـ SignalR مع تفعيل نمط Publish/Subscribe.',
        reviewerName: 'د. سارة الكندية',
        gradedAt: '2026-06-29T15:30:00Z',
        isLateSubmission: false
      },
      {
        id: 9,
        traineeId: '209',
        traineeName: 'مريم بنت سعيد البلوشية',
        civilId: '109938172',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Maryam',
        projectName: isProject ? 'Nafadh Payments & Financial Settlement Gateway' : 'Building RESTful Endpoints & Swagger Docs',
        type: event?.type || 'project',
        repoUrl: 'https://github.com/maryam-balushi/payments-gateway',
        repoName: 'maryam-balushi/payments-gateway',
        branch: 'main',
        liveDemoUrl: 'https://pay.maryam.nafadh.om',
        submittedAt: '2026-06-28T13:40:00Z',
        commitHash: '8a7b6c5',
        commitMessage: 'feat: add payment intent validation and webhooks handler',
        score: 93,
        maxScore: 100,
        status: 'مكتمل ومعتمد',
        criteria: {
          architecture: { name: 'Clean Architecture & DI', score: 28, max: 30 },
          apiDocs: { name: 'Swagger & Endpoints Documentation', score: 20, max: 20 },
          database: { name: 'EF Core & Migrations', score: 23, max: 25 },
          codeQuality: { name: 'Code Quality & Formatting', score: 22, max: 25 },
        },
        reviewerFeedback: 'كود عالي الأمان مع معالجة استثنائية لـ Webhooks وتشفير البيانات الحساسة.',
        reviewerName: 'م. أحمد المعمري',
        gradedAt: '2026-06-29T09:10:00Z',
        isLateSubmission: false
      },
      {
        id: 10,
        traineeId: '210',
        traineeName: 'أحمد بن حمدان الفارسي',
        civilId: '105529184',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Ahmed',
        projectName: isProject ? 'Nafadh Analytics & Reporting BI Pipeline' : 'Building RESTful Endpoints & Swagger Docs',
        type: event?.type || 'project',
        repoUrl: 'https://github.com/ahmed-farsi/analytics-pipeline',
        repoName: 'ahmed-farsi/analytics-pipeline',
        branch: 'main',
        liveDemoUrl: undefined,
        submittedAt: '2026-06-28T17:15:00Z',
        commitHash: '3f2e1d0',
        commitMessage: 'feat: aggregate monthly KPIs and export high-res charts',
        score: 86,
        maxScore: 100,
        status: 'مكتمل ومعتمد',
        criteria: {
          architecture: { name: 'Clean Architecture & DI', score: 25, max: 30 },
          apiDocs: { name: 'Swagger & Endpoints Documentation', score: 18, max: 20 },
          database: { name: 'EF Core & Migrations', score: 22, max: 25 },
          codeQuality: { name: 'Code Quality & Formatting', score: 21, max: 25 },
        },
        reviewerFeedback: 'تجميع إحصائي متقن وسرعة ممتازة في تنفيذ استعلامات EF Core المجمعة.',
        reviewerName: 'د. سارة الكندية',
        gradedAt: '2026-06-29T16:00:00Z',
        isLateSubmission: false
      },
      {
        id: 11,
        traineeId: '211',
        traineeName: 'أروى بنت علي الخروصية',
        civilId: '109928374',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Arwa',
        projectName: isProject ? 'Nafadh Smart Proctoring & Anti-Cheat System' : 'Building RESTful Endpoints & Swagger Docs',
        type: event?.type || 'project',
        repoUrl: 'https://github.com/arwa-kharousi/smart-proctoring',
        repoName: 'arwa-kharousi/smart-proctoring',
        branch: 'main',
        liveDemoUrl: 'https://proctor.arwa.dev',
        submittedAt: '2026-06-28T14:10:00Z',
        commitHash: '7c6b5a4',
        commitMessage: 'feat: add WebRTC face tracking and tab switch detection',
        score: 95,
        maxScore: 100,
        status: 'مكتمل ومعتمد',
        criteria: {
          architecture: { name: 'Clean Architecture & DI', score: 29, max: 30 },
          apiDocs: { name: 'Swagger & Endpoints Documentation', score: 20, max: 20 },
          database: { name: 'EF Core & Migrations', score: 24, max: 25 },
          codeQuality: { name: 'Code Quality & Formatting', score: 22, max: 25 },
        },
        reviewerFeedback: 'إبداع تقني ملحوظ في استخدام WebRTC مع استهلاك منخفض للذاكرة.',
        reviewerName: 'م. أحمد المعمري',
        gradedAt: '2026-06-29T10:45:00Z',
        isLateSubmission: false
      }
    ];
  }

  // ==========================================================
  // 14. متدربو الدفعة والنماذج ومراجعة الخطط الأصلية
  // ==========================================================
  onViewTrainees(batch: any): void {
    this.selectedBatch = batch;
    this.isTraineesPageOpen.set(true);
    this.isDetailsPageOpen.set(false);
    this.isQuizAuditFullPageOpen.set(false);
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

    this.adminApi.getPendingCoursePlans().subscribe({
      next: (pendingList: any[]) => {
        const rawList = Array.isArray(pendingList) ? pendingList : [];
        let matched = rawList.find(p =>
          (companyId && Number(p.companyId ?? p.CompanyId) === companyId) ||
          (programId && Number(p.programId ?? p.ProgramId) === programId)
        ) || rawList[0];

        if (matched) {
          const planId = Number(matched.planId ?? matched.PlanId ?? matched.id);
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
    this.decisionErrorMessage.set(null);

    const payload = {
      decision: 0,
      note: this.approvalNotes?.trim() || 'تم اعتماد الخطة التدريبية رسمياً من قِبل الإدارة.'
    };

    this.adminApi.reviewCoursePlan(planId, payload).subscribe({
      next: () => {
        this.isSubmittingDecision.set(false);
        this.closePlanModal();
        this.showToast('✓ تم اعتماد خطة الدورة التدريبية بنجاح!', 'success');
        this.loadInitialData();
      },
      error: (err: any) => {
        this.isSubmittingDecision.set(false);
        this.decisionErrorMessage.set(err?.error?.message || 'حدث خطأ أثناء اعتماد الخطة.');
      }
    });
  }

  executeRejection(): void {
    if (!this.rejectionNotes.trim() && this.selectedModifications.length === 0) {
      this.decisionErrorMessage.set('⚠️ يرجى تحديد ملاحظة واحدة على الأقل أو كتابة سبب الرفض/طلب التعديل.');
      return;
    }

    const plan = this.selectedPlan();
    const planId = Number(plan?.planId ?? plan?.PlanId ?? plan?.id);
    if (!planId) return;

    this.decisionErrorMessage.set(null);
    this.isSubmittingDecision.set(true);

    const fullReason = [
      this.rejectionNotes.trim(),
      this.selectedModifications.length > 0 ? ('التعديلات المطلوبة:\n- ' + this.selectedModifications.join('\n- ')) : ''
    ].filter(Boolean).join('\n\n');

    const payload = {
      decision: 1,
      note: fullReason
    };

    this.adminApi.reviewCoursePlan(planId, payload).subscribe({
      next: () => {
        this.isSubmittingDecision.set(false);
        this.closePlanModal();
        this.showToast('✓ تم إرجاع الخطة إلى الشركة مع الملاحظات المطلوبة.', 'warning');
        this.loadInitialData();
      },
      error: (err: any) => {
        this.isSubmittingDecision.set(false);
        this.decisionErrorMessage.set(err?.error?.message || 'حدث خطأ أثناء محاولة إرجاع الخطة.');
      }
    });
  }

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

  // استعراض كشف تقييم المشروع (للاطلاع الإداري والتدقيق فقط)
  isProjectEvaluationModalOpen = false;
  selectedProjectForView: any = null;

  onOpenProjectEvaluationModal(sub: any): void {
    this.selectedProjectForView = sub;
    this.isProjectEvaluationModalOpen = true;
  }

  onCloseProjectEvaluationModal(): void {
    this.isProjectEvaluationModalOpen = false;
    this.selectedProjectForView = null;
  }
  getRubricPercentage(score: any, max: any): number {
    const s = Number(score) || 0;
    const m = Number(max) || 100;
    if (m <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((s / m) * 100)));
  }

  // صفحة كشف التقييم التفصيلي كاملة الشاشة
  isProjectEvaluationFullPageOpen = signal<boolean>(false);

  onOpenProjectEvaluation(sub: any): void {
    this.selectedProjectForView = sub;
    this.selectedProjectForGrading = sub;
    this.gradingScoreInput = sub?.score || 85;
    this.gradingFeedbackInput = sub?.reviewerFeedback || '';
    this.isProjectEvaluationFullPageOpen.set(true);
    this.isProjectAuditFullPageOpen.set(false);
    this.isProjectDossierOpen.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeProjectEvaluation(): void {
    this.isProjectEvaluationFullPageOpen.set(false);
    this.isProjectAuditFullPageOpen.set(true);
    this.isProjectDossierOpen.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}