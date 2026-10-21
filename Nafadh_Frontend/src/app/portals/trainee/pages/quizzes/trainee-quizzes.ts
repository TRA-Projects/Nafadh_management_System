import { Component, OnInit, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  TraineeQuizzesOverviewDto,
  TraineeQuizListItemDto,
  TraineeProfileDto,
  QuizAttemptDto,
  StartQuizAttemptDto,
  AttemptQuestionDto
} from '../../../../core/models/dtos';

type Step = 1 | 2 | 3 | 4;

type StateFilter =
  | 'all'
  | 'Available'
  | 'InProgress'
  | 'PendingGrading'
  | 'Completed'
  | 'Upcoming'
  | 'Missed';

@Component({
  selector: 'app-trainee-quizzes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainee-quizzes.html',
  styleUrl: './trainee-quizzes.scss',
})
export class TraineeQuizzes implements OnInit {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  // =====================================================
  // State
  // =====================================================

  currentStep = signal<Step>(1);

  loading = signal(false);
  errorMessage = signal('');

  traineeId = signal<number | null>(null);
  overview = signal<TraineeQuizzesOverviewDto | null>(null);

  searchTerm = signal('');
  stateFilter = signal<StateFilter>('all');

  // =====================================================
  // Step 2 State (Terms & Camera)
  // =====================================================
  
  selectedQuiz = signal<TraineeQuizListItemDto | null>(null);
  isCameraReady = signal(false);
  cameraError = signal('');
  agreedToTerms = false;
  private mediaStream: MediaStream | null = null;

  // =====================================================
  // Step 3 State (Exam)
  // =====================================================
  
  attempt = signal<QuizAttemptDto | null>(null);
  questions = signal<AttemptQuestionDto[]>([]);
  answers: Record<number, { selectedOptionId: number | null, textAnswer: string | null }> = {};
  timeRemaining = signal<number>(0);
  private timerInterval: any;

  // Modals State
  showSubmitModal = signal(false);
  showAutoSubmitModal = signal(false);

  // =====================================================
  // Step 4 State (Result)
  // =====================================================
  
  result = signal<any>(null);

  // =====================================================
  // Computed
  // =====================================================

  quizzes = computed(() => this.overview()?.quizzes ?? []);

  availableCount = computed(() => this.overview()?.available ?? 0);
  upcomingCount = computed(() => this.overview()?.upcoming ?? 0);
  pendingGradingCount = computed(
    () => this.overview()?.pendingGrading ?? 0
  );
  completedCount = computed(() => this.overview()?.completed ?? 0);

  filteredQuizzes = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.stateFilter();

    return this.quizzes().filter((q) => {
      const matchesTerm =
        !term ||
        q.title.toLowerCase().includes(term) ||
        (q.batchName ?? '').toLowerCase().includes(term);

      const matchesState = filter === 'all' || q.state === filter;

      return matchesTerm && matchesState;
    });
  });

  hasActiveFilter = computed(
    () => this.searchTerm().trim() !== '' || this.stateFilter() !== 'all'
  );

  // =====================================================
  // Constructor
  // =====================================================

  constructor(
    private api: TraineeApi,
    public auth: AuthService
  ) {}

  // =====================================================
  // Init
  // =====================================================

  ngOnInit(): void {
    this.loadTrainee();
  }

  private loadTrainee(): void {
    const uid = this.auth.userId;

    if (!uid) {
      this.errorMessage.set('تعذر تحديد المستخدم الحالي');
      return;
    }

    this.loading.set(true);

    this.api.getTrainee(uid).subscribe({
      next: (t: TraineeProfileDto) => {
        const id = Number(t.traineeId);

        if (!id || Number.isNaN(id)) {
          this.errorMessage.set('تعذر تحديد رقم المتدرب');
          this.loading.set(false);
          return;
        }

        this.traineeId.set(id);
        this.loadQuizzes(id);
      },
      error: (err: any) => {
        console.error('Error loading trainee:', err);
        this.errorMessage.set('تعذر تحميل بيانات المتدرب');
        this.loading.set(false);
      },
    });
  }

  private loadQuizzes(traineeId: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.api.getTraineeQuizzesOverview(traineeId).subscribe({
      next: (data) => {
        this.overview.set(data);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading quizzes:', err);
        this.errorMessage.set('تعذر تحميل الاختبارات');
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    const id = this.traineeId();
    if (id) this.loadQuizzes(id);
  }

  // =====================================================
  // Helpers
  // =====================================================

  getStateLabel(state: string): string {
    switch (state) {
      case 'Available': return 'متاح';
      case 'InProgress': return 'قيد التقدم';
      case 'PendingGrading': return 'بانتظار التصحيح';
      case 'Completed': return 'مكتمل';
      case 'Upcoming': return 'قادم';
      case 'Missed': return 'فائت';
      default: return 'غير معروف';
    }
  }

  getStateClass(state: string): string {
    return state.toLowerCase();
  }

  getStateIcon(state: string): string {
    switch (state) {
      case 'Available': return 'fa-circle-play';
      case 'InProgress': return 'fa-spinner';
      case 'PendingGrading': return 'fa-hourglass-half';
      case 'Completed': return 'fa-circle-check';
      case 'Upcoming': return 'fa-clock';
      case 'Missed': return 'fa-circle-xmark';
      default: return 'fa-question';
    }
  }

  formatDate(value: string): string {
    if (!value) return '—';

    const hasTz = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
    const date = new Date(hasTz ? value : value + 'Z');

    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('ar-OM', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  getAttemptsProgressPercent(quiz: TraineeQuizListItemDto): number {
    if (quiz.maxAttempts <= 0) return 0;
    return Math.min(
      100,
      Math.round((quiz.attemptsUsed / quiz.maxAttempts) * 100)
    );
  }

  // =====================================================
  // Actions (Step 2)
  // =====================================================

  onStartQuiz(quiz: TraineeQuizListItemDto): void {
    this.selectedQuiz.set(quiz);
    this.agreedToTerms = false;
    this.cameraError.set('');
    this.currentStep.set(2);
  }

  onResumeQuiz(quiz: TraineeQuizListItemDto): void {
    const attemptId = quiz.inProgressAttemptId;
    const tId = this.traineeId();

    if (!attemptId || !tId) {
      this.errorMessage.set('تعذر العثور على المحاولة الجارية');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    // جلب المحاولة السابقة مع الإجابات المحفوظة مسبقاً
    this.api.getQuizAttempt(attemptId, tId).subscribe({
      next: (res: QuizAttemptDto) => {
        this.loading.set(false);
        this.attempt.set(res);
        this.setupQuestions(res); // هذه الدالة ستبدأ المؤقت وتنقلك لـ Step 3
      },
      error: (err: any) => {
        console.error('Resume error:', err);
        this.errorMessage.set(err?.error?.message || 'تعذر استئناف الاختبار');
        this.loading.set(false);
      }
    });
  }

  onViewResult(quiz: TraineeQuizListItemDto): void {
    const tId = this.traineeId();
    if (!tId || !quiz.latestAttemptId) return;

    this.loading.set(true);

    this.api.getAttemptDetails(quiz.latestAttemptId).subscribe({
      next: (details) => {
        this.api.getMyResults(tId).subscribe({
          next: (results) => {
            const myResult = results.find(r => r.attemptId === quiz.latestAttemptId);
            this.result.set({ ...details, ...myResult });
            this.loading.set(false);
            this.currentStep.set(4);
          },
          error: () => {
            this.result.set(details);
            this.loading.set(false);
            this.currentStep.set(4);
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('تعذر تحميل النتيجة');
      }
    });
  }

  onRetryQuiz(quiz: TraineeQuizListItemDto): void {
    this.selectedQuiz.set(quiz);
    this.agreedToTerms = false;
    this.cameraError.set('');
    this.currentStep.set(2);
  }

  goBack(): void {
    this.stopCamera();
    this.currentStep.set(1);
    this.selectedQuiz.set(null);
  }

  goToQuizzesList() {
    this.currentStep.set(1);
    this.result.set(null);
    this.attempt.set(null);
    this.refresh(); // تحديث القائمة
  }

  async turnOnCamera() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
      }
      this.isCameraReady.set(true);
      this.cameraError.set('');
    } catch (err) {
      this.cameraError.set('تعذر الوصول إلى الكاميرا. يرجى التأكد من إعطاء الصلاحيات.');
      this.isCameraReady.set(false);
    }
  }

  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
      this.isCameraReady.set(false);
    }
  }

  beginAttempt() {
    const quiz = this.selectedQuiz();
    const tId = this.traineeId();
    
    if (!quiz || !tId) return;
    if (quiz.cameraRequired && !this.isCameraReady()) return;
    if (!this.agreedToTerms) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const dto: StartQuizAttemptDto = {
      traineeId: tId,
      quizId: quiz.quizId,
      cameraConsent: this.isCameraReady(),
      identityCheckStatus: 'Passed'
    };

    this.api.startQuizAttempt(dto).subscribe({
      next: (res: QuizAttemptDto) => {
        // الباك اند يرجع الأسئلة بدون خيارات في البداية، لذا نستدعي getQuizAttempt لجلبها
        this.api.getQuizAttempt(res.attemptId, tId).subscribe({
          next: (fullAttempt) => {
            this.loading.set(false);
            this.attempt.set(fullAttempt);
            this.setupQuestions(fullAttempt);
          },
          error: (err) => {
            this.loading.set(false);
            this.errorMessage.set('تعذر تحميل خيارات الأسئلة');
            console.error(err);
          }
        });
      },
      error: (err: any) => {
        console.error(err);
        this.errorMessage.set(err?.error?.message || 'تعذر بدء الاختبار');
        this.loading.set(false);
      }
    });
  }

  // =====================================================
  // Step 3: Exam Logic
  // =====================================================

  private setupQuestions(res: QuizAttemptDto) {
    this.questions.set(res.questions);
    
    // تجهيز مصفوفة الإجابات الفارغة
    res.questions.forEach(q => {
      this.answers[q.attemptQuestionId] = {
        selectedOptionId: q.selectedOptionId || null,
        textAnswer: q.textAnswer || null
      };
    });

    // بدء المؤقت (من الباك اند أو المدة الأساسية)
    const seconds = res.remainingSeconds > 0 ? res.remainingSeconds : res.durationMinutes * 60;
    this.startTimer(seconds);
    
    this.currentStep.set(3);
  }

  private startTimer(totalSeconds: number) {
    this.timeRemaining.set(totalSeconds);
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      const current = this.timeRemaining();
      if (current <= 1) {
        this.timeRemaining.set(0);
        this.autoSubmit(); // تسليم تلقائي عند انتهاء الوقت
      } else {
        this.timeRemaining.set(current - 1);
      }
    }, 1000);
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // حفظ الإجابة عند التغيير
  onSelectOption(qId: number, optId: number) {
    this.answers[qId].selectedOptionId = optId;
    this.saveAnswer(qId);
  }

  onEssayChange(qId: number, text: string) {
    this.answers[qId].textAnswer = text;
  }

  onEssayBlur(qId: number) {
    this.saveAnswer(qId);
  }

  private saveAnswer(qId: number) {
    const attemptId = this.attempt()?.attemptId;
    if (!attemptId) return;

    const ans = this.answers[qId];
    const payload = {
      attemptQuestionId: qId,
      selectedOptionId: ans.selectedOptionId,
      textAnswer: ans.textAnswer,
      isMarkedForReview: false
    };

    this.api.saveQuizAnswer(attemptId, payload).subscribe({
      error: (err) => console.error('Auto-save failed:', err)
    });
  }

  // =====================================================
  // Submit Modals Logic
  // =====================================================

  submitQuiz() {
    this.showSubmitModal.set(true);
  }

  cancelSubmit() {
    this.showSubmitModal.set(false);
  }

  confirmSubmit() {
    this.showSubmitModal.set(false);
    this.finalSubmit();
  }

  private autoSubmit() {
    this.showAutoSubmitModal.set(true);
    this.finalSubmit();
  }

  private finalSubmit() {
    const attemptId = this.attempt()?.attemptId;
    if (!attemptId) return;

    this.loading.set(true);
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.api.submitQuizAttempt({ attemptId }).subscribe({
      next: () => {
        this.loading.set(false);
        this.stopCamera();
        this.showAutoSubmitModal.set(false);
        this.loadResult(); // الانتقال للخطوة 4 وعرض النتيجة
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('حدث خطأ أثناء التسليم. يرجى المحاولة مرة أخرى.');
      }
    });
  }

  // =====================================================
  // Step 4: Result
  // =====================================================
  
  private loadResult() {
    const attemptId = this.attempt()?.attemptId;
    const tId = this.traineeId();
    if (!attemptId || !tId) return;

    this.loading.set(true);
    
    // جلب تفاصيل المحاولة
    this.api.getAttemptDetails(attemptId).subscribe({
      next: (details) => {
        // جلب نتيجة المتدرب لمعرفة هل نجح أم لا (لأن التفاصيل لا تحتوي isPassed)
        this.api.getMyResults(tId).subscribe({
          next: (results) => {
            const myResult = results.find(r => r.attemptId === attemptId);
            this.result.set({ ...details, ...myResult });
            this.loading.set(false);
            this.currentStep.set(4);
          },
          error: () => {
            this.result.set(details);
            this.loading.set(false);
            this.currentStep.set(4);
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('تعذر تحميل النتيجة');
      }
    });
  }

  // منع الخروج من الصفحة أثناء الاختبار
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.currentStep() === 3) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
    // حساب الدرجة الكاملة للاختبار من مجموع درجات الأسئلة
  totalPossiblePoints = computed(() => {
    const res = this.result();
    if (!res || !res.answers) return 0;
    
    return res.answers.reduce((total: number, ans: any) => {
      // الباك اند يرسل الدرجة الكاملة للسؤال في حقل points أو maxPoints
      const points = ans.points !== undefined ? ans.points : ans.maxPoints;
      return total + (Number(points) || 0);
    }, 0);
  });
}