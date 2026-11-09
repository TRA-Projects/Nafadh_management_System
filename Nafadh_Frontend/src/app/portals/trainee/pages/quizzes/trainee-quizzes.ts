import {
  Component, OnInit, OnDestroy,
  AfterViewChecked,
  signal, computed,
  ElementRef, ViewChild,
  HostListener
} from '@angular/core';
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

const SNAPSHOT_INTERVAL_MS = 60_000;
const FIRST_SNAPSHOT_DELAY_MS = 3_000;

export interface UploadedFileInfo {
  fileId: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt?: string;
}

export interface AnswerState {
  selectedOptionId: number | null;
  textAnswer: string | null;
  uploadedFile?: UploadedFileInfo | null;
}

@Component({
  selector: 'app-trainee-quizzes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainee-quizzes.html',
  styleUrl: './trainee-quizzes.scss',
})
export class TraineeQuizzes implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('previewVideo')  previewVideo?:  ElementRef<HTMLVideoElement>;
  @ViewChild('floatingVideo') floatingVideo?: ElementRef<HTMLVideoElement>;

  currentStep = signal<Step>(1);
  loading = signal(false);
  errorMessage = signal('');
  traineeId = signal<number | null>(null);
  overview = signal<TraineeQuizzesOverviewDto | null>(null);
  searchTerm = signal('');
  stateFilter = signal<StateFilter>('all');

  selectedQuiz = signal<TraineeQuizListItemDto | null>(null);
  isCameraReady = signal(false);
  cameraError = signal('');
  agreedToTerms = false;

  private mediaStream: MediaStream | null = null;
  private snapshotInterval: any = null;
  private hiddenCanvas: HTMLCanvasElement;
  private lastBoundStep: 0 | 2 | 3 = 0;

  attempt = signal<QuizAttemptDto | null>(null);
  questions = signal<AttemptQuestionDto[]>([]);

  answers: Record<number, AnswerState> = {};

  timeRemaining = signal<number>(0);
  private timerInterval: any;

  showSubmitModal = signal(false);
  showAutoSubmitModal = signal(false);
  showViolationModal = signal(false);

  result = signal<any>(null);

  showAttemptsModal = signal(false);
  quizAttempts = signal<any[]>([]);
  selectedQuizForAttempts = signal<TraineeQuizListItemDto | null>(null);

  // =========================================
  // FILE UPLOAD STATE
  // =========================================
  uploadingForQuestion: Record<number, boolean> = {};
  uploadProgressForQuestion: Record<number, number> = {};
  draggingForQuestion: Record<number, boolean> = {};
  fileErrors: Record<number, string> = {};

  // 🟢 Grace period: لمنع تسجيل المخالفات أثناء اختيار الملف
  private fileUploadGracePeriodTimeout: any = null;
  private isFileUploadGracePeriod = false;

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  private readonly ALLOWED_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.ppt', '.pptx',
    '.xls', '.xlsx', '.txt', '.csv',
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.zip', '.rar'
  ];

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
  }

  ngAfterViewChecked(): void {
    if (!this.isCameraReady() || !this.mediaStream) return;
    const step = this.currentStep();
    if (this.lastBoundStep === step) return;

    if (step === 2 && this.previewVideo?.nativeElement) {
      this.previewVideo.nativeElement.srcObject = this.mediaStream;
      this.lastBoundStep = 2;
    } else if (step === 3 && this.floatingVideo?.nativeElement) {
      this.floatingVideo.nativeElement.srcObject = this.mediaStream;
      this.lastBoundStep = 3;
    }
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
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(date);
  }

  getAttemptsProgressPercent(quiz: TraineeQuizListItemDto): number {
    if (quiz.maxAttempts <= 0) return 0;
    return Math.min(100, Math.round((quiz.attemptsUsed / quiz.maxAttempts) * 100));
  }

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

    if (quiz.cameraRequired && !this.isCameraReady()) {
      this.selectedQuiz.set(quiz);
      this.agreedToTerms = false;
      this.cameraError.set('');
      this.currentStep.set(2);
      return;
    }

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
    this.stopCamera();
    this.currentStep.set(1);
    this.result.set(null);
    this.attempt.set(null);
    this.refresh();
  }

  async turnOnCamera() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (this.previewVideo) {
        this.previewVideo.nativeElement.srcObject = this.mediaStream;
      }
      this.isCameraReady.set(true);
      this.cameraError.set('');
      this.lastBoundStep = 2;
    } catch (err) {
      this.cameraError.set('تعذر الوصول إلى الكاميرا. يرجى التأكد من إعطاء الصلاحيات.');
      this.isCameraReady.set(false);
      console.error('[Camera] getUserMedia failed:', err);
    }
  }

  stopCamera() {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.previewVideo?.nativeElement) {
      this.previewVideo.nativeElement.srcObject = null;
    }
    if (this.floatingVideo?.nativeElement) {
      this.floatingVideo.nativeElement.srcObject = null;
    }
    this.isCameraReady.set(false);
    this.lastBoundStep = 0;
  }

  private takeSnapshot(eventType: string = 'Snapshot') {
    const attemptId = this.attempt()?.attemptId;
    if (!attemptId || !this.isCameraReady()) return;

    const video = this.currentStep() === 3
      ? this.floatingVideo?.nativeElement
      : this.previewVideo?.nativeElement;

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
        next: () => console.log(`[Snapshot] ✅ ${eventType} saved`),
        error: (err) => console.error(`[Snapshot] ❌ Failed to save ${eventType}:`, err)
      });
    }, 'image/jpeg', 0.8);
  }

  private startSnapshotLoop() {
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
    this.snapshotInterval = setInterval(() => {
      if (this.currentStep() === 3) {
        this.takeSnapshot('Snapshot');
      }
    }, SNAPSHOT_INTERVAL_MS);
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

  private setupQuestions(res: QuizAttemptDto) {
    this.questions.set(res.questions);
    res.questions.forEach(q => {
      this.answers[q.attemptQuestionId] = {
        selectedOptionId: q.selectedOptionId || null,
        textAnswer: q.textAnswer || null,
        uploadedFile: (q as any).uploadedFile ?? null
      };
    });

    const seconds = res.remainingSeconds > 0
      ? res.remainingSeconds
      : res.durationMinutes * 60;
    this.startTimer(seconds);

    this.currentStep.set(3);

    if (this.isCameraReady() && this.selectedQuiz()?.cameraRequired) {
      setTimeout(() => {
        this.takeSnapshot('IdentityVerified');
        this.startSnapshotLoop();
      }, FIRST_SNAPSHOT_DELAY_MS);
    }
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
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
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

  // =========================================
  // FILE UPLOAD METHODS
  // =========================================

  isFileUploadQuestion(q: AttemptQuestionDto): boolean {
    const type = (q as any).questionType;
    return type === 3 || type === 'FileUpload' || type === 'File' || type === 'Fileupload';
  }

  getAcceptedFileTypes(q: AttemptQuestionDto): string {
    const allowed = (q as any).allowedFileTypes;
    if (allowed && Array.isArray(allowed) && allowed.length) {
      return allowed.join(',');
    }
    return this.ALLOWED_EXTENSIONS.join(',');
  }

  getFileUploadHint(q: AttemptQuestionDto): string {
    const maxMb = (q as any).maxFileSizeMB ?? 10;
    return `الأنواع المسموحة: ${this.ALLOWED_EXTENSIONS.join(', ')} — الحجم الأقصى: ${maxMb} ميجابايت`;
  }

  private validateFile(file: File, q: AttemptQuestionDto): string | null {
    const maxMb = (q as any).maxFileSizeMB ?? 10;
    const maxBytes = maxMb * 1024 * 1024;

    if (file.size > maxBytes) {
      return `حجم الملف يجب ألا يتجاوز ${maxMb} ميجابايت (الحجم الحالي: ${(file.size / 1024 / 1024).toFixed(2)} ميجابايت).`;
    }

    if (file.size === 0) {
      return 'الملف فارغ. يرجى اختيار ملف صالح.';
    }

    const name = file.name.toLowerCase();
    const ext = name.substring(name.lastIndexOf('.'));
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      return `امتداد الملف (${ext}) غير مسموح. الأنواع المسموحة: ${this.ALLOWED_EXTENSIONS.join(', ')}`;
    }

    return null;
  }

  // 🟢 دالة تفعيل فترة السماح عند الضغط على منطقة الرفع
  allowFileUploadGracePeriod(): void {
    this.isFileUploadGracePeriod = true;

    if (this.fileUploadGracePeriodTimeout) {
      clearTimeout(this.fileUploadGracePeriodTimeout);
    }

    // إعادة تفعيل المراقبة بعد دقيقتين في حال لم يتم اختيار ملف
    this.fileUploadGracePeriodTimeout = setTimeout(() => {
      this.isFileUploadGracePeriod = false;
    }, 120000);
  }

  onFileSelected(event: Event, q: AttemptQuestionDto): void {
    // 🟢 إيقاف فترة السماح فور اختيار الملف
    this.isFileUploadGracePeriod = false;
    if (this.fileUploadGracePeriodTimeout) {
      clearTimeout(this.fileUploadGracePeriodTimeout);
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadFile(q, file);
    input.value = '';
  }

  onFileDragOver(event: DragEvent, qId: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.draggingForQuestion[qId] = true;
  }

  onFileDragLeave(event: DragEvent, qId: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.draggingForQuestion[qId] = false;
  }

  onFileDrop(event: DragEvent, q: AttemptQuestionDto): void {
    event.preventDefault();
    event.stopPropagation();
    this.draggingForQuestion[q.attemptQuestionId] = false;

    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    this.uploadFile(q, file);
  }

  private uploadFile(q: AttemptQuestionDto, file: File): void {
    const attemptId = this.attempt()?.attemptId;
    const qId = q.attemptQuestionId;

    if (!attemptId) {
      this.fileErrors[qId] = 'تعذر تحديد المحاولة.';
      return;
    }

    const validationError = this.validateFile(file, q);
    if (validationError) {
      this.fileErrors[qId] = validationError;
      return;
    }

    this.fileErrors[qId] = '';
    this.uploadingForQuestion[qId] = true;
    this.uploadProgressForQuestion[qId] = 0;

    const formData = new FormData();
    formData.append('AttemptQuestionId', qId.toString());
    formData.append('File', file, file.name);

    this.api.uploadAnswerFile(attemptId, formData).subscribe({
      next: (response) => {
        this.answers[qId] = {
          ...this.answers[qId],
          uploadedFile: {
            fileId: response.fileId,
            fileUrl: response.fileUrl,
            fileName: response.fileName || file.name,
            fileSize: response.fileSize || file.size,
            uploadedAt: response.uploadedAt || new Date().toISOString()
          }
        };

        this.saveAnswer(qId);

        this.uploadingForQuestion[qId] = false;
        this.uploadProgressForQuestion[qId] = 100;
      },
      error: (err) => {
        this.uploadingForQuestion[qId] = false;
        this.uploadProgressForQuestion[qId] = 0;
        this.fileErrors[qId] =
          err?.error?.message || 'تعذر رفع الملف. يرجى المحاولة مرة أخرى.';
      }
    });
  }

  removeUploadedFile(qId: number): void {
    const attemptId = this.attempt()?.attemptId;
    const fileId = this.answers[qId]?.uploadedFile?.fileId;

    if (!attemptId || !fileId) return;
    if (!confirm('هل أنت متأكد من إزالة الملف المرفوع؟')) return;

    this.uploadingForQuestion[qId] = true;
    this.fileErrors[qId] = '';

    this.api.deleteAnswerFile(attemptId, qId, fileId).subscribe({
      next: () => {
        this.answers[qId] = {
          ...this.answers[qId],
          uploadedFile: null
        };
        this.saveAnswer(qId);
        this.uploadingForQuestion[qId] = false;
      },
      error: (err) => {
        this.uploadingForQuestion[qId] = false;
        this.fileErrors[qId] = err?.error?.message || 'تعذر إزالة الملف.';
      }
    });
  }

  formatFileSize(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  getFileIcon(fileName: string | null | undefined): string {
    if (!fileName) return 'fa-file';
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'fa-file-image';
    if (['.pdf'].includes(ext)) return 'fa-file-pdf';
    if (['.doc', '.docx'].includes(ext)) return 'fa-file-word';
    if (['.xls', '.xlsx', '.csv'].includes(ext)) return 'fa-file-excel';
    if (['.ppt', '.pptx'].includes(ext)) return 'fa-file-powerpoint';
    if (['.zip', '.rar'].includes(ext)) return 'fa-file-zipper';
    if (['.txt'].includes(ext)) return 'fa-file-lines';
    return 'fa-file';
  }

  private validateBeforeSubmit(): boolean {
    const fileQuestions = this.questions().filter(q => this.isFileUploadQuestion(q));

    for (const q of fileQuestions) {
      if (!this.answers[q.attemptQuestionId]?.uploadedFile) {
        const idx = this.questions().indexOf(q) + 1;
        this.errorMessage.set(
          `السؤال رقم ${idx} يتطلب رفع ملف قبل التسليم.`
        );
        return false;
      }
    }
    return true;
  }

  // =========================================
  // SUBMIT
  // =========================================

  submitQuiz() {
    if (!this.validateBeforeSubmit()) return;
    this.showSubmitModal.set(true);
  }

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

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    // 🟢 تجاهل المخالفة إذا كان المتدرب في فترة رفع الملف
    if (document.hidden && this.currentStep() === 3 && !this.isFileUploadGracePeriod) {
      this.handleViolation();
    }
  }

  @HostListener('window:blur')
  onWindowBlur() {
    // 🟢 تجاهل المخالفة إذا كان المتدرب في فترة رفع الملف
    if (this.currentStep() === 3 && !this.isFileUploadGracePeriod) {
      this.handleViolation();
    }
  }

  private handleViolation() {
    if (this.isFileUploadGracePeriod) return;

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

  openAttemptsModal(quiz: TraineeQuizListItemDto) {
    const tId = this.traineeId();
    if (!tId) return;

    this.selectedQuizForAttempts.set(quiz);
    this.loading.set(true);

    this.api.getMyResults(tId).subscribe({
      next: (results) => {
        const filtered = results
          .filter(r => r.quizId === quiz.quizId)
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