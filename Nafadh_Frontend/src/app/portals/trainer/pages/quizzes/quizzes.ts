
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  TrainerDto,
  TrainerBatchDto
} from '../../../../core/models/dtos';

interface QuizDto {
  quizId: number;
  title: string;
  description?: string | null;
  batchId: number;
  batchName?: string | null;
  startDateTime: string;
  endDateTime: string;
  durationMinutes: number;
  status: number;
  randomizeQuestions: boolean;
  maxAttempts: number;
  cameraRequired: boolean;
  createdAt: string;
}

interface QuizForm {
  title: string;
  description: string;
  batchId: number | null;
  startDateTime: string;
  endDateTime: string;
  durationMinutes: number;
  status: number;
  randomizeQuestions: boolean;
  maxAttempts: number;
  cameraRequired: boolean;
}

@Component({
  selector: 'app-trainer-quizzes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quizzes.html',
  styleUrl: './quizzes.scss'
})
export class TrainerQuizzes implements OnInit {
  trainer = signal<TrainerDto | null>(null);
  batches = signal<TrainerBatchDto[]>([]);
  quizzes = signal<QuizDto[]>([]);

  loading = signal(false);
  saving = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  searchTerm = signal('');
  statusFilter = signal('all');

  showForm = signal(false);
  editingQuizId = signal<number | null>(null);

  form: QuizForm = this.emptyForm();

  draftCount = computed(
    () => this.quizzes().filter(q => q.status === 0).length
  );

  filteredQuizzes = computed(() => {
    const term = this.searchTerm()
      .trim()
      .toLocaleLowerCase();

    const filter = this.statusFilter();

    return this.quizzes().filter(quiz => {
      const matchesTerm =
        !term ||
        quiz.title.toLocaleLowerCase().includes(term) ||
        (quiz.batchName ?? '')
          .toLocaleLowerCase()
          .includes(term);

      const matchesStatus =
        filter === 'all' ||
        (filter === 'draft' && quiz.status === 0);

      return matchesTerm && matchesStatus;
    });
  });

  constructor(
    private api: TrainerApi,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.session()?.userId;

    if (!userId) {
      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي.'
      );
      return;
    }

    this.loading.set(true);

    this.api.getTrainerByUserId(userId).subscribe({
      next: trainer => {
        this.trainer.set(trainer);

        this.loadBatches(trainer.trainerId);
        this.loadQuizzes(trainer.trainerId);
      },
      error: error => {
        console.error(
          'Error loading trainer profile:',
          error
        );

        this.loading.set(false);

        this.errorMessage.set(
          'تعذر تحميل بيانات المدرب.'
        );
      }
    });
  }

  private loadBatches(trainerId: number): void {
    this.api.getMyBatches(trainerId).subscribe({
      next: batches => {
        this.batches.set(batches ?? []);
      },
      error: error => {
        console.error(
          'Error loading trainer batches:',
          error
        );

        this.batches.set([]);

        this.errorMessage.set(
          'تعذر تحميل الدفعات. يمكنك تحديث الصفحة والمحاولة مرة أخرى.'
        );
      }
    });
  }

  private loadQuizzes(trainerId: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.api.getTrainerQuizzes(trainerId).subscribe({
      next: quizzes => {
        this.quizzes.set(quizzes ?? []);
        this.loading.set(false);
      },
      error: error => {
        console.error(
          'Error loading quizzes:',
          error
        );

        this.quizzes.set([]);
        this.loading.set(false);

        this.errorMessage.set(
          'تعذر تحميل الاختبارات. تأكدي من تشغيل الـ Backend وصحة عنوان API.'
        );
      }
    });
  }

  openCreateForm(): void {
    this.editingQuizId.set(null);
    this.form = this.emptyForm();

    this.successMessage.set('');
    this.errorMessage.set('');

    this.showForm.set(true);
  }

  openEditForm(quiz: QuizDto): void {
    this.editingQuizId.set(quiz.quizId);

    this.form = {
      title: quiz.title,
      description: quiz.description ?? '',
      batchId: quiz.batchId,

      startDateTime: this.toDateTimeLocal(
        quiz.startDateTime
      ),

      endDateTime: this.toDateTimeLocal(
        quiz.endDateTime
      ),

      durationMinutes: quiz.durationMinutes,
      status: quiz.status,
      randomizeQuestions: quiz.randomizeQuestions,
      maxAttempts: quiz.maxAttempts,
      cameraRequired: quiz.cameraRequired
    };

    this.successMessage.set('');
    this.errorMessage.set('');

    this.showForm.set(true);
  }

  closeForm(): void {
    if (!this.saving()) {
      this.showForm.set(false);
    }
  }

  saveQuiz(): void {
    const trainerId = this.trainer()?.trainerId;

    if (!trainerId) {
      this.errorMessage.set(
        'تعذر تحديد المدرب الحالي.'
      );
      return;
    }

    if (!this.form.title.trim()) {
      this.errorMessage.set(
        'يرجى إدخال اسم الاختبار.'
      );
      return;
    }

    if (!this.form.batchId) {
      this.errorMessage.set(
        'يرجى اختيار الدفعة.'
      );
      return;
    }

    if (
      !this.form.startDateTime ||
      !this.form.endDateTime
    ) {
      this.errorMessage.set(
        'يرجى تحديد وقت بداية الاختبار ونهايته.'
      );
      return;
    }

    if (
      new Date(this.form.endDateTime) <=
      new Date(this.form.startDateTime)
    ) {
      this.errorMessage.set(
        'يجب أن يكون وقت الانتهاء بعد وقت البداية.'
      );
      return;
    }

    if (
      this.form.durationMinutes < 1 ||
      this.form.durationMinutes > 600
    ) {
      this.errorMessage.set(
        'مدة الاختبار يجب أن تكون بين دقيقة و600 دقيقة.'
      );
      return;
    }

    if (
      this.form.maxAttempts < 1 ||
      this.form.maxAttempts > 10
    ) {
      this.errorMessage.set(
        'عدد المحاولات يجب أن يكون بين 1 و10.'
      );
      return;
    }

    const payload = {
      title: this.form.title.trim(),

      description:
        this.form.description.trim() || null,

      batchId: Number(this.form.batchId),

      startDateTime: new Date(
        this.form.startDateTime
      ).toISOString(),

      endDateTime: new Date(
        this.form.endDateTime
      ).toISOString(),

      durationMinutes: Number(
        this.form.durationMinutes
      ),

      status: Number(this.form.status),

      randomizeQuestions:
        this.form.randomizeQuestions,

      maxAttempts: Number(this.form.maxAttempts),

      cameraRequired: this.form.cameraRequired
    };

    this.saving.set(true);
    this.errorMessage.set('');

    const quizId = this.editingQuizId();

    const request =
      quizId === null
        ? this.api.createQuiz(trainerId, payload)
        : this.api.updateQuiz(quizId, payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);

        this.successMessage.set(
          quizId === null
            ? 'تم إنشاء الاختبار بنجاح.'
            : 'تم تحديث الاختبار بنجاح.'
        );

        this.loadQuizzes(trainerId);
      },

      error: error => {
        console.error(
          'Error saving quiz:',
          error
        );

        this.saving.set(false);

        this.errorMessage.set(
          error?.error?.message ||
          'تعذر حفظ الاختبار. راجعي البيانات وحاولي مرة أخرى.'
        );
      }
    });
  }

  refresh(): void {
    const trainerId = this.trainer()?.trainerId;

    if (trainerId) {
      this.loadQuizzes(trainerId);
    }
  }

  getStatusLabel(status: number): string {
    return status === 0
      ? 'مسودة'
      : `حالة ${status}`;
  }

  getStatusClass(status: number): string {
    return status === 0 ? 'draft' : 'other';
  }

  formatDate(value: string): string {
    if (!value) {
      return 'غير محدد';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'غير محدد';
    }

    return new Intl.DateTimeFormat('ar-OM', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private emptyForm(): QuizForm {
    const now = new Date();

    const start = new Date(
      now.getTime() + 60 * 60 * 1000
    );

    const end = new Date(
      start.getTime() + 60 * 60 * 1000
    );

    return {
      title: '',
      description: '',
      batchId: null,

      startDateTime: this.toDateTimeLocal(
        start.toISOString()
      ),

      endDateTime: this.toDateTimeLocal(
        end.toISOString()
      ),

      durationMinutes: 60,
      status: 0,
      randomizeQuestions: true,
      maxAttempts: 1,
      cameraRequired: false
    };
  }

  private toDateTimeLocal(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const local = new Date(
      date.getTime() -
      date.getTimezoneOffset() * 60000
    );

    return local.toISOString().slice(0, 16);
  }
}
