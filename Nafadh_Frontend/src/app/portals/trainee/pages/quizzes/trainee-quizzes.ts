import { Component, OnInit, signal, computed, ElementRef, ViewChild, HostListener, OnDestroy } from '@angular/core';
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

type StateFilter = 'all' | 'Available' | 'InProgress' | 'PendingGrading' | 'Completed' | 'Upcoming' | 'Missed';

@Component({
  selector: 'app-trainee-quizzes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainee-quizzes.html',
  styleUrl: './trainee-quizzes.scss',
})
export class TraineeQuizzes implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('hiddenVideo') hiddenVideo!: ElementRef<HTMLVideoElement>;

  currentStep = signal<Step>(1);
  loading = signal(false);
  errorMessage = signal('');
  traineeId = signal<number | null>(null);
  overview = signal<TraineeQuizzesOverviewDto | null>(null);
  searchTerm = signal('');
  stateFilter = signal<StateFilter>('all');

  // Step 2: Terms & Camera
  selectedQuiz = signal<TraineeQuizListItemDto | null>(null);
  isCameraReady = signal(false);
  cameraError = signal('');
  agreedToTerms = false;
  private mediaStream: MediaStream | null = null;
  private snapshotInterval: any;
  private hiddenCanvas: HTMLCanvasElement;

  // Step 3: Exam
  attempt = signal<QuizAttemptDto | null>(null);
  questions = signal<AttemptQuestionDto[]>([]);
  answers: Record<number, { selectedOptionId: number | null, textAnswer: string | null }> = {};
  timeRemaining = signal<number>(0);
  private timerInterval: any;

  // Modals
  showSubmitModal = signal(false);
  showAutoSubmitModal = signal(false);
  showViolationModal = signal(false);

  // Step 4: Result
  result = signal<any>(null);

  // Computed
  quizzes = computed(() => this.overview()?.quizzes ?? []);
  availableCount = computed(() => this.overview()?.available ?? 0);
  upcomingCount = computed(() => this.overview()?.upcoming ?? 0);
  pendingGradingCount = computed(() => this.overview()?.pendingGrading ?? 0);
  completedCount = computed(() => this.overview()?.completed ?? 0);

  filteredQuizzes = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.stateFilter();
    return this.quizzes().filter((q) => {
      const matchesTerm = !term || q.title.toLowerCase().includes(term) || (q.batchName ?? '').toLowerCase().includes(term);
      const matchesState = filter === 'all' || q.state === filter;
      return matchesTerm && matchesState;
    });
  });

  hasActiveFilter = computed(() => this.searchTerm().trim() !== '' || this.stateFilter() !== 'all');

  totalPossiblePoints = computed(() => {
    const res = this.result();
    if (!res || !res.answers) return 0;
    return res.answers.reduce((total: number, ans: any) => {
      const points = ans.points !== undefined ? ans.points : ans.maxPoints;
      return total + (Number(points) || 0);
    }, 0);
  });

  constructor(private api: TraineeApi, public auth: AuthService) {
    this.hiddenCanvas = document.createElement('canvas');
  }

  ngOnInit(): void {
    this.loadTrainee();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.clearTimer();
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
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
      error: () => {
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
      error: () => {
        this.errorMessage.set('تعذر تحميل الاختبارات');
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    const id = this.traineeId();
    if (id) this.loadQuizzes(id);
  }

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

  getStateClass(state: string): string { return state.toLowerCase(); }

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
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(date);
  }

  getAttemptsProgressPercent(quiz: TraineeQuizListItemDto): number {
    if (quiz.maxAttempts <= 0) return 0;
    return Math.min(100, Math.round((quiz.attemptsUsed / quiz.maxAttempts) * 100));
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
    if (!attemptId || !tId) return;

    this.loading.set(true);
    this.api.getQuizAttempt(attemptId, tId).subscribe({
      next: (res: QuizAttemptDto) => {
        this.loading.set(false);
        this.attempt.set(res);
        this.setupQuestions(res);
      },
      error: (err: any) => {
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
      error: () => {
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
    this.refresh();
  }

  // =====================================================
  // Camera & Snapshot Logic
  // =====================================================

  async turnOnCamera() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
      }
      this.isCameraReady.set(true);
      this.cameraError.set('');
      
      // أخذ لقطة فورية عند التشغيل
      setTimeout(() => this.takeSnapshot('IdentityVerified'), 2000);
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
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
  }

  private takeSnapshot(eventType: string = 'Snapshot') {
    const attemptId = this.attempt()?.attemptId;
    if (!attemptId || !this.isCameraReady()) return;

    const video = this.videoElement?.nativeElement;
    if (!video || video.videoWidth === 0) return;

    this.hiddenCanvas.width = video.videoWidth;
    this.hiddenCanvas.height = video.videoHeight;
    const ctx = this.hiddenCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    this.hiddenCanvas.toBlob((blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('EventType', eventType);
      formData.append('Snapshot', blob, 'snapshot.jpg');
      
      this.api.sendProctoringEvent(attemptId, formData).subscribe({
        error: (err) => console.error('Snapshot failed:', err)
      });
    }, 'image/jpeg', 0.8);
  }

  // =====================================================
  // Begin Attempt
  // =====================================================

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
        this.api.getQuizAttempt(res.attemptId, tId).subscribe({
          next: (fullAttempt) => {
            this.loading.set(false);
            this.attempt.set(fullAttempt);
            this.setupQuestions(fullAttempt);
          },
          error: () => {
            this.loading.set(false);
            this.errorMessage.set('تعذر تحميل خيارات الأسئلة');
          }
        });
      },
      error: (err: any) => {
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
    res.questions.forEach(q => {
      this.answers[q.attemptQuestionId] = {
        selectedOptionId: q.selectedOptionId || null,
        textAnswer: q.textAnswer || null
      };
    });

    const seconds = res.remainingSeconds > 0 ? res.remainingSeconds : res.durationMinutes * 60;
    this.startTimer(seconds);
    
    // أخذ لقطة كل دقيقة أثناء الاختبار
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
    this.snapshotInterval = setInterval(() => this.takeSnapshot('Snapshot'), 60000);

    this.currentStep.set(3);
  }

  private startTimer(totalSeconds: number) {
    this.timeRemaining.set(totalSeconds);
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      const current = this.timeRemaining();
      if (current <= 1) {
        this.timeRemaining.set(0);
        this.autoSubmit();
      } else {
        this.timeRemaining.set(current - 1);
      }
    }, 1000);
  }

  private clearTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

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
  // Submit & Violations
  // =====================================================

  submitQuiz() { this.showSubmitModal.set(true); }
  cancelSubmit() { this.showSubmitModal.set(false); }
  
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
    this.clearTimer();
    
    this.api.submitQuizAttempt({ attemptId }).subscribe({
      next: () => {
        this.loading.set(false);
        this.stopCamera();
        this.showAutoSubmitModal.set(false);
        this.loadResult();
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('حدث خطأ أثناء التسليم.');
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
    
    this.api.getAttemptDetails(attemptId).subscribe({
      next: (details) => {
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
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('تعذر تحميل النتيجة');
      }
    });
  }

  // =====================================================
  // Anti-Cheat & Tab Switching (Violation)
  // =====================================================

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.hidden && this.currentStep() === 3) {
      this.handleViolation();
    }
  }

  @HostListener('window:blur')
  onWindowBlur() {
    if (this.currentStep() === 3) {
      this.handleViolation();
    }
  }

  private handleViolation() {
    const attemptId = this.attempt()?.attemptId;
    if (!attemptId) return;

    this.api.registerViolation(attemptId).subscribe({
      next: (res: any) => {
        this.showViolationModal.set(true);
        if (res.isTerminated) {
          this.clearTimer();
          this.stopCamera();
          setTimeout(() => {
            this.showViolationModal.set(false);
            this.goToQuizzesList();
          }, 4000);
        }
      },
      error: (err) => console.error('Violation error', err)
    });
  }
    // في قسم State (أسفل المتغيرات)
  showAttemptsModal = signal(false);
  quizAttempts = signal<any[]>([]);
  selectedQuizForAttempts = signal<TraineeQuizListItemDto | null>(null);

  // دالة لجلب المحاولات
  openAttemptsModal(quiz: TraineeQuizListItemDto) {
    const tId = this.traineeId();
    if (!tId) return;

    this.selectedQuizForAttempts.set(quiz);
    this.loading.set(true);

    // جلب كل النتائج ثم فلترتها لهذا الاختبار
    this.api.getMyResults(tId).subscribe({
      next: (results) => {
        const filtered = results.filter(r => r.quizId === quiz.quizId)
          .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        this.quizAttempts.set(filtered);
        this.loading.set(false);
        this.showAttemptsModal.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('تعذر تحميل سجل المحاولات');
      }
    });
  }

  // دالة لعرض تفاصيل محاولة محددة
  viewSpecificAttempt(attemptId: number) {
    this.showAttemptsModal.set(false);
    const tId = this.traineeId();
    if (!tId) return;
    
    this.loading.set(true);
    this.api.getAttemptDetails(attemptId).subscribe({
      next: (details) => {
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
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('تعذر تحميل تفاصيل المحاولة');
      }
    });
  }
}