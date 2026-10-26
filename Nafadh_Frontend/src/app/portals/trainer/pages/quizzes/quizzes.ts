import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { Router } from '@angular/router';
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
  status: number | string;
  randomizeQuestions: boolean;
  maxAttempts: number;
  cameraRequired: boolean;
  passingPercentage: number;
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
  passingPercentage: number;
}

interface QuestionOptionDto {
  optionId: number;
  optionText: string;
  optionCode: string;
  sortOrder: number;
  isCorrect: boolean;
}

interface QuestionBankDto {
  questionId: number;
  questionText: string;
  questionType: number;
  difficulty: number;
  points: number;
  explanation?: string | null;
  isActive: boolean;
  createdAt: string;
  options: QuestionOptionDto[];
}


interface QuizQuestionDto {
  questionId: number;
  questionText: string;
  questionType: number | string;
  points: number;
}

interface QuestionOptionForm {
  optionText: string;
  optionCode: string;
  sortOrder: number;
  isCorrect: boolean;
}

interface QuestionForm {
  questionText: string;
  questionType: number;
  difficulty: number;
  points: number;
  explanation: string;
  options: QuestionOptionForm[];
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

  // =====================================================
  // QUESTION BANK
  // =====================================================

  questions = signal<QuestionBankDto[]>([]);

  selectedQuiz = signal<QuizDto | null>(null);

  quizQuestions = signal<QuizQuestionDto[]>([]);

  quizQuestionsLoading = signal(false);

  quizTotalPoints = computed(() => {
    return this.getQuizTotalPoints(this.quizQuestions());
  });


  showQuestionBank = signal(false);

  questionFormOpen = signal(false);

  questionLoading = signal(false);

  questionSaving = signal(false);

  editingQuestionId = signal<number | null>(null);

  questionSearch = signal('');

  questionTypeFilter = signal('all');

  questionDifficultyFilter = signal('all');

  questionStatusFilter = signal('active');

  questionError = signal('');

  questionSuccess = signal('');

  selectedQuestionIds = signal<Set<number>>(new Set());

  questionForm: QuestionForm =
    this.emptyQuestionForm();

  draftCount = computed(() => {
    return this.quizzes().filter(
      quiz => this.getStatusNumber(quiz.status) === 0
    ).length;
  });

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


      const statusNumber = this.getStatusNumber(quiz.status);

const matchesStatus =
  filter === 'all' ||
  (filter === 'draft' && statusNumber === 0) ||
  (filter === 'scheduled' && statusNumber === 1) ||
  (filter === 'open' && statusNumber === 2) ||
  (filter === 'closed' && statusNumber === 3) ||
  (filter === 'archived' && statusNumber === 4);

      return matchesTerm && matchesStatus;
    });
  });

  filteredQuestions = computed(() => {
    const term = this.questionSearch()
      .trim()
      .toLocaleLowerCase();

    const type = this.questionTypeFilter();

    const difficulty =
      this.questionDifficultyFilter();

    const status =
      this.questionStatusFilter();

    return this.questions().filter(question => {
      const matchesSearch =
        !term ||
        question.questionText
          .toLocaleLowerCase()
          .includes(term);

      const matchesType =
        type === 'all' ||
        question.questionType.toString() === type;

      const matchesDifficulty =
        difficulty === 'all' ||
        question.difficulty.toString() === difficulty;

      const matchesStatus =
        status === 'all' ||
        (
          status === 'active' &&
          question.isActive
        ) ||
        (
          status === 'inactive' &&
          !question.isActive
        );

      return (
        matchesSearch &&
        matchesType &&
        matchesDifficulty &&
        matchesStatus
      );
    });
  });

  constructor(
    private api: TrainerApi,
    private auth: AuthService,
    private router: Router
  ) { }

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
      status: this.getStatusNumber(quiz.status),
      randomizeQuestions: quiz.randomizeQuestions,
      maxAttempts: quiz.maxAttempts,
      cameraRequired: quiz.cameraRequired,
      passingPercentage: quiz.passingPercentage
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

    if (
      this.form.passingPercentage < 0 ||
      this.form.passingPercentage > 100
    ) {
      this.errorMessage.set(
        'نسبة النجاح يجب أن تكون بين 0 و100.'
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

      // status: Number(this.form.status),

      randomizeQuestions:
        this.form.randomizeQuestions,

      maxAttempts: Number(this.form.maxAttempts),

      cameraRequired:
        this.form.cameraRequired,

      passingPercentage:
        Number(this.form.passingPercentage)
    };

    this.saving.set(true);
    this.errorMessage.set('');

    const quizId = this.editingQuizId();

    const request =
      quizId === null
        ? this.api.createQuiz(trainerId, payload)
        : this.api.updateQuiz(quizId, trainerId, payload);

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

  // =====================================================
// PUBLISH QUIZ
// =====================================================

publishQuiz(quiz: QuizDto): void {
  const trainerId = this.trainer()?.trainerId;

  if (!trainerId) {
    this.errorMessage.set(
      'تعذر تحديد المدرب الحالي.'
    );
    return;
  }

  if (this.getStatusNumber(quiz.status) !== 0) {
    return;
  }

  // التأكد من وجود أسئلة قبل النشر
  this.api
    .getQuizQuestions(quiz.quizId, trainerId)
    .subscribe({
      next: questions => {

        if (!questions || questions.length === 0) {
          this.errorMessage.set(
            'لا يمكن نشر الاختبار قبل إضافة سؤال واحد على الأقل.'
          );
          return;
        }

        const confirmed = window.confirm(
          'هل أنت متأكد من نشر الاختبار؟ بعد النشر لن تتمكن من تعديل الأسئلة.'
        );

        if (!confirmed) {
          return;
        }

        this.saving.set(true);
        this.errorMessage.set('');
        this.successMessage.set('');

        this.api
          .publishQuiz(
            quiz.quizId,
            trainerId
          )
          .subscribe({
            next: () => {
              this.saving.set(false);

              this.successMessage.set(
                'تم نشر الاختبار بنجاح.'
              );

              this.loadQuizzes(trainerId);
            },

            error: error => {
              console.error(
                'Error publishing quiz:',
                error
              );

              this.saving.set(false);

              this.errorMessage.set(
                error?.error?.message ||
                'تعذر نشر الاختبار. تأكدي من اكتمال بيانات الاختبار والأسئلة.'
              );
            }
          });
      },

      error: error => {
        console.error(
          'Error checking quiz questions:',
          error
        );

        this.errorMessage.set(
          'تعذر التحقق من أسئلة الاختبار.'
        );
      }
    });
}
  // =====================================================
  // QUESTION BANK
  // =====================================================

loadQuizQuestions(quizId: number): void {
  const trainerId = this.trainer()?.trainerId;

  if (!trainerId) {
    return;
  }

  this.quizQuestionsLoading.set(true);
  this.quizQuestions.set([]);

  this.api.getQuizQuestions(quizId, trainerId).subscribe({
    next: questions => {
      this.quizQuestions.set(questions ?? []);
      this.quizQuestionsLoading.set(false);
    },

    error: error => {
      console.error('Error loading quiz questions:', error);

      this.quizQuestionsLoading.set(false);
      this.questionError.set(
        'تعذر تحميل أسئلة الاختبار.'
      );
    }
  });
}

  openQuestionBank(quiz: QuizDto): void {
    this.selectedQuiz.set(quiz);

    this.showQuestionBank.set(true);

    this.questionError.set('');

    this.questionSuccess.set('');

    this.selectedQuestionIds.set(
      new Set()
    );

    this.loadQuestions();
    this.loadQuizQuestions(quiz.quizId);
  }

  closeQuestionBank(): void {
    if (this.questionSaving()) {
      return;
    }

    this.showQuestionBank.set(false);

    this.questionFormOpen.set(false);

    this.selectedQuiz.set(null);

    this.questionError.set('');

    this.questionSuccess.set('');

    this.selectedQuestionIds.set(
      new Set()
    );
  }

  private loadQuestions(): void {
    const trainerId =
      this.trainer()?.trainerId;

    if (!trainerId) {
      this.questionError.set(
        'تعذر تحديد المدرب الحالي.'
      );
      return;
    }

    this.questionLoading.set(true);

    this.questionError.set('');

    this.api
      .getTrainerQuestions(trainerId)
      .subscribe({
        next: questions => {
          this.questions.set(
            questions ?? []
          );

          this.questionLoading.set(false);
        },

        error: error => {
          console.error(
            'Error loading question bank:',
            error
          );

          this.questions.set([]);

          this.questionLoading.set(false);

          this.questionError.set(
            'تعذر تحميل بنك الأسئلة.'
          );
        }
      });
  }

  toggleQuestionSelection(
    questionId: number
  ): void {
    this.selectedQuestionIds.update(
      current => {
        const next =
          new Set(current);

        if (next.has(questionId)) {
          next.delete(questionId);
        } else {
          next.add(questionId);
        }

        return next;
      }
    );
  }

  isQuestionSelected(
    questionId: number
  ): boolean {
    return this.selectedQuestionIds()
      .has(questionId);
  }

  clearQuestionSelection(): void {
    this.selectedQuestionIds.set(
      new Set()
    );
  }

  // =====================================================
  // QUESTION SELECTION HELPERS
  // =====================================================

  getSelectedQuestionsCount(): number {
    return this.selectedQuestionIds().size;
  }

  selectAllQuestions(): void {
    const questions = this.filteredQuestions()
      .filter(question => question.isActive);

    this.selectedQuestionIds.set(
      new Set(
        questions.map(question => question.questionId)
      )
    );
  }

  areAllQuestionsSelected(): boolean {
    const questions = this.filteredQuestions()
      .filter(question => question.isActive);

    if (!questions.length) {
      return false;
    }

    return questions.every(question =>
      this.selectedQuestionIds().has(question.questionId)
    );
  }

  // =====================================================
  // CREATE QUESTION
  // =====================================================

  openCreateQuestion(): void {
    this.editingQuestionId.set(null);

    this.questionForm =
      this.emptyQuestionForm();

    this.questionError.set('');

    this.questionSuccess.set('');

    this.questionFormOpen.set(true);
  }

  // =====================================================
  // EDIT QUESTION
  // =====================================================

  openEditQuestion(
    question: QuestionBankDto
  ): void {
    this.editingQuestionId.set(
      question.questionId
    );

    this.questionForm = {
      questionText:
        question.questionText,

      questionType:
        question.questionType,

      difficulty:
        question.difficulty,

      points:
        question.points,

      explanation:
        question.explanation ?? '',

      options:
        [...(question.options ?? [])]
          .sort(
            (a, b) =>
              a.sortOrder - b.sortOrder
          )
          .map(option => ({
            optionText:
              option.optionText,

            optionCode:
              option.optionCode,

            sortOrder:
              option.sortOrder,

            isCorrect:
              option.isCorrect
          }))
    };

    this.questionError.set('');

    this.questionSuccess.set('');

    this.questionFormOpen.set(true);
  }

  closeQuestionForm(): void {
    if (this.questionSaving()) {
      return;
    }

    this.questionFormOpen.set(false);

    this.questionError.set('');
  }

  // =====================================================
  // OPTIONS
  // =====================================================

  addQuestionOption(): void {
    if (
      this.questionForm.options.length >= 6
    ) {
      return;
    }

    const index =
      this.questionForm.options.length;

    this.questionForm.options.push({
      optionText: '',
      optionCode:
        String.fromCharCode(65 + index),
      sortOrder: index,
      isCorrect: false
    });

    this.questionForm = {
      ...this.questionForm
    };
  }

  removeQuestionOption(
    index: number
  ): void {
    if (
      this.questionForm.options.length <= 2
    ) {
      return;
    }

    this.questionForm.options.splice(
      index,
      1
    );

    this.questionForm.options =
      this.questionForm.options.map(
        (option, i) => ({
          ...option,

          sortOrder: i,

          optionCode:
            String.fromCharCode(65 + i)
        })
      );

    this.questionForm = {
      ...this.questionForm
    };
  }

  setCorrectOption(
    index: number
  ): void {
    this.questionForm.options =
      this.questionForm.options.map(
        (option, i) => ({
          ...option,

          isCorrect:
            i === index
        })
      );
  }

  questionTypeChanged(): void {
    const type =
      Number(
        this.questionForm.questionType
      );

    // Multiple Choice
    if (type === 0) {
      if (
        this.questionForm.options.length === 0
      ) {
        this.questionForm.options = [
          {
            optionText: '',
            optionCode: 'A',
            sortOrder: 0,
            isCorrect: true
          },

          {
            optionText: '',
            optionCode: 'B',
            sortOrder: 1,
            isCorrect: false
          }
        ];
      }

      return;
    }

    // True / False
    if (type === 1) {
      this.questionForm.options = [
        {
          optionText: 'صح',
          optionCode: 'A',
          sortOrder: 0,
          isCorrect: true
        },

        {
          optionText: 'خطأ',
          optionCode: 'B',
          sortOrder: 1,
          isCorrect: false
        }
      ];

      return;
    }

    // Essay
    if (type === 2) {
      this.questionForm.options = [];
    }
  }

  // =====================================================
  // SAVE QUESTION
  // =====================================================

  saveQuestion(): void {
    const trainerId =
      this.trainer()?.trainerId;

    if (!trainerId) {
      this.questionError.set(
        'تعذر تحديد المدرب الحالي.'
      );
      return;
    }

    const form =
      this.questionForm;

    if (!form.questionText.trim()) {
      this.questionError.set(
        'يرجى كتابة نص السؤال.'
      );
      return;
    }

    if (
      form.points <= 0 ||
      form.points > 100
    ) {
      this.questionError.set(
        'درجة السؤال يجب أن تكون بين 0.1 و100.'
      );
      return;
    }

    if (
      form.questionType === 0 ||
      form.questionType === 1
    ) {
      if (
        form.options.length < 2
      ) {
        this.questionError.set(
          'يجب إضافة خيارين على الأقل.'
        );
        return;
      }

      const correctCount =
        form.options.filter(
          option =>
            option.isCorrect
        ).length;

      if (correctCount !== 1) {
        this.questionError.set(
          'يجب تحديد إجابة صحيحة واحدة فقط.'
        );
        return;
      }

      const hasEmptyOption =
        form.options.some(
          option =>
            !option.optionText.trim()
        );

      if (hasEmptyOption) {
        this.questionError.set(
          'يرجى كتابة جميع الخيارات.'
        );
        return;
      }
    }

    const payload = {
      questionText:
        form.questionText.trim(),

      questionType:
        Number(
          form.questionType
        ),

      difficulty:
        Number(
          form.difficulty
        ),

      points:
        Number(
          form.points
        ),

      explanation:
        form.explanation.trim() ||
        null,

      options:
        form.questionType === 2
          ? []
          : form.options.map(
            (option, index) => ({
              optionText:
                option.optionText.trim(),

              optionCode:
                option.optionCode,

              sortOrder:
                index,

              isCorrect:
                option.isCorrect
            })
          )
    };

    this.questionSaving.set(true);

    this.questionError.set('');

    const questionId =
      this.editingQuestionId();

    const request: Observable<any> =
      questionId === null
        ? this.api.createQuestion(
          trainerId,
          payload
        )
        : this.api.updateQuestion(
          questionId,
          trainerId,
          payload
        );

    request.subscribe({
      next: () => {
        this.questionSaving.set(false);

        this.questionFormOpen.set(false);

        this.questionSuccess.set(
          questionId === null
            ? 'تمت إضافة السؤال بنجاح.'
            : 'تم تحديث السؤال بنجاح.'
        );

        this.loadQuestions();
      },

      error: (error: any) => {
        console.error(
          'Error saving question:',
          error
        );

        this.questionSaving.set(false);

        this.questionError.set(
          error?.error?.message ||
          'تعذر حفظ السؤال.'
        );
      }
    });
  }

  // =====================================================
  // DEACTIVATE QUESTION
  // =====================================================

  deactivateQuestion(
    question: QuestionBankDto
  ): void {
    if (!question.isActive) {
      return;
    }

    const trainerId =
      this.trainer()?.trainerId;

    if (!trainerId) {
      return;
    }

    this.api
      .deactivateQuestion(
        question.questionId,
        trainerId
      )
      .subscribe({
        next: () => {
          this.questionSuccess.set(
            'تم تعطيل السؤال بنجاح.'
          );

          this.loadQuestions();
        },

        error: error => {
          console.error(
            'Error deactivating question:',
            error
          );

          this.questionError.set(
            error?.error?.message ||
            'تعذر تعطيل السؤال.'
          );
        }
      });
  }


  // =====================================================
// ADD QUESTIONS TO QUIZ
// =====================================================

addSelectedQuestionsToQuiz(): void {

  const quiz = this.selectedQuiz();

  if (!quiz) {
    return;
  }

  const questionIds =
    Array.from(
      this.selectedQuestionIds()
    );

  if (!questionIds.length) {

    this.questionError.set(
      'اختاري سؤالًا واحدًا على الأقل.'
    );

    return;
  }

  const trainerId =
    this.trainer()?.trainerId;

  if (!trainerId) {

    this.questionError.set(
      'تعذر تحديد المدرب الحالي.'
    );

    return;
  }

  this.questionSaving.set(true);

  this.questionError.set('');
  this.questionSuccess.set('');

  this.api
    .addQuestionsToQuiz(
      quiz.quizId,
      trainerId,
      questionIds
    )
    .subscribe({

      next: () => {

        this.questionSaving.set(false);

        this.questionSuccess.set(
          'تمت إضافة الأسئلة إلى الاختبار بنجاح. يمكنك الآن نشر الاختبار.'
        );

        // إلغاء التحديد
        this.clearQuestionSelection();

        // تحديث أسئلة الاختبار مباشرة
        // بدون إغلاق بنك الأسئلة
        this.loadQuizQuestions(
          quiz.quizId
        );

        // تحديث قائمة الاختبارات في الخلفية
        this.loadQuizzes(trainerId);

      },

      error: error => {

        console.error(
          'Error adding questions to quiz:',
          error
        );

        this.questionSaving.set(false);

        this.questionError.set(
          error?.error?.message ||
          'تعذر إضافة الأسئلة إلى الاختبار.'
        );
      }

    });
}
  // =====================================================
  // EMPTY QUESTION FORM
  // =====================================================

  private emptyQuestionForm(): QuestionForm {
    return {
      questionText: '',
      questionType: 0,
      difficulty: 0,
      points: 1,
      explanation: '',
      options: [
        {
          optionText: '',
          optionCode: 'A',
          sortOrder: 0,
          isCorrect: true
        },

        {
          optionText: '',
          optionCode: 'B',
          sortOrder: 1,
          isCorrect: false
        }
      ]
    };
  }

  refresh(): void {
    const trainerId =
      this.trainer()?.trainerId;

    if (trainerId) {
      this.loadQuizzes(trainerId);
    }
  }


  getStatusLabel(status: number | string): string {

    const value = String(status).trim().toLowerCase();

    switch (value) {
      case '0':
      case 'draft':
        return 'مسودة';

      case '1':
      case 'scheduled':
        return 'مجدول';

      case '2':
      case 'open':
        return 'مفتوح';

      case '3':
      case 'closed':
        return 'مغلق';

      case '4':
      case 'archived':
        return 'مؤرشف';

      default:
        console.log('Unknown quiz status:', status);
        return 'غير معروف';
    }
  }


  getStatusClass(status: number | string): string {

  switch (this.getStatusNumber(status)) {

    case 0:
      return 'draft';

    case 1:
      return 'scheduled';

    case 2:
      return 'open';

    case 3:
      return 'closed';

    case 4:
      return 'archived';

    default:
      return 'unknown';
  }
}
canEditQuiz(status: number | string): boolean {
  const statusNumber = this.getStatusNumber(status);

  return statusNumber === 0 || statusNumber === 1;
}

canManageQuestions(status: number | string): boolean {
  const statusNumber = this.getStatusNumber(status);

  return statusNumber === 0;
}

  formatDate(value: string): string {

    if (!value) {
      return 'غير محدد';
    }

    // إذا جاء التاريخ بدون منطقة زمنية، نتعامل معه كـ UTC
    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);

    const dateValue = hasTimezone ? value : value + 'Z';

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return 'غير محدد';
    }

    return new Intl.DateTimeFormat('ar-OM', {
      timeZone: 'Asia/Muscat',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
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
      cameraRequired: false,
      passingPercentage: 50
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


  openQuizResults(quizId: number): void {
    this.router.navigate(
      ['/trainer/quiz-results'],
      {
        queryParams: {
          quizId: quizId
        }
      }
    );
  }

  // =====================================
  // QUESTION TYPE LABEL
  // =====================================

  getQuestionTypeLabel(type: number | string): string {
    switch (String(type).trim().toLowerCase()) {
      case '0':
      case 'multiplechoice':
        return 'اختيار من متعدد';

      case '1':
      case 'truefalse':
        return 'صح أو خطأ';

      case '2':
      case 'essay':
        return 'سؤال مقالي';

      default:
        return 'غير معروف';
    }
  }

  // =====================================
  // QUESTION DIFFICULTY LABEL
  // =====================================

  getDifficultyLabel(difficulty: number | string): string {
    switch (String(difficulty).trim().toLowerCase()) {
      case '0':
      case 'easy':
        return 'سهل';

      case '1':
      case 'medium':
        return 'متوسط';

      case '2':
      case 'hard':
        return 'صعب';

      default:
        return 'غير معروف';
    }
  }

  getStatusNumber(status: number | string): number {
    const value = String(status).trim().toLowerCase();

    switch (value) {
      case '0':
      case 'draft':
        return 0;

      case '1':
      case 'scheduled':
        return 1;

      case '2':
      case 'open':
        return 2;

      case '3':
      case 'closed':
        return 3;

      case '4':
      case 'archived':
        return 4;

      default:
        return -1;
    }
  }

  getQuizTotalPoints(questions: QuizQuestionDto[]): number {
    let total = 0;

    for (const question of questions) {
      total += Number(question.points) || 0;
    }

    return total;
  }

}