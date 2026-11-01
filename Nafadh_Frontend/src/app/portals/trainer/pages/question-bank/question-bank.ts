import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
    TrainerDto
} from '../../../../core/models/dtos';

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
    questionType: number | string;
    difficulty: number | string;
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
    selector: 'app-question-bank',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './question-bank.html',
    styleUrl: './question-bank.scss'
})
export class QuestionBank implements OnInit {

    trainer = signal<TrainerDto | null>(null);

    quizId = signal<number | null>(null);

    quizTitle = signal('إدارة أسئلة الاختبار');

    quizStatus = signal<number | string | null>(null);
    questions = signal<QuestionBankDto[]>([]);

    quizQuestions = signal<QuizQuestionDto[]>([]);

    selectedQuestionIds = signal<Set<number>>(new Set());

    loading = signal(false);

    quizQuestionsLoading = signal(false);

    saving = signal(false);
    questionFormOpen = signal(false);
    questionSaving = signal(false);
    editingQuestionId = signal<number | null>(null);

    questionError = signal('');
    questionSuccess = signal('');

    questionForm: QuestionForm = this.emptyQuestionForm();

    errorMessage = signal('');

    successMessage = signal('');

    searchTerm = signal('');

    typeFilter = signal('all');

    difficultyFilter = signal('all');

    statusFilter = signal('active');
    showDeactivateConfirm = signal(false);

    questionToDeactivate = signal<QuestionBankDto | null>(null);

    filteredQuestions = computed(() => {
        const search = this.searchTerm().trim().toLowerCase();
        const type = this.typeFilter();
        const difficulty = this.difficultyFilter();
        const status = this.statusFilter();

        return this.questions().filter(question => {

            const matchesSearch =
                !search ||
                question.questionText
                    .toLowerCase()
                    .includes(search);

            const normalizedType =
                typeof question.questionType === 'string'
                    ? question.questionType
                    : String(question.questionType);

            const normalizedDifficulty =
                typeof question.difficulty === 'string'
                    ? question.difficulty
                    : String(question.difficulty);

            const matchesType =
                type === 'all' ||
                (type === '0' && ['0', 'MultipleChoice'].includes(normalizedType)) ||
                (type === '1' && ['1', 'TrueFalse'].includes(normalizedType)) ||
                (type === '2' && ['2', 'Essay'].includes(normalizedType));

            const matchesDifficulty =
                difficulty === 'all' ||
                (difficulty === '0' && ['0', 'Easy'].includes(normalizedDifficulty)) ||
                (difficulty === '1' && ['1', 'Medium'].includes(normalizedDifficulty)) ||
                (difficulty === '2' && ['2', 'Hard'].includes(normalizedDifficulty));

            const matchesStatus =
                status === 'all' ||
                (status === 'active' && question.isActive) ||
                (status === 'inactive' && !question.isActive);

            return (
                matchesSearch &&
                matchesType &&
                matchesDifficulty &&
                matchesStatus
            );
        });
    });

    selectedCount = computed(
        () => this.selectedQuestionIds().size
    );

    quizQuestionIds = computed(
        () =>
            new Set(
                this.quizQuestions().map(
                    question => question.questionId
                )
            )
    );

    totalQuizPoints = computed(() =>
        this.quizQuestions().reduce(
            (total, question) =>
                total + Number(question.points || 0),
            0
        )
    );

    availableQuestionsCount = computed(() =>
        this.questions().filter(
            question =>
                question.isActive &&
                !this.quizQuestionIds().has(question.questionId)
        ).length
    );

    constructor(
        private api: TrainerApi,
        private auth: AuthService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {

        const quizId = Number(
            this.route.snapshot.paramMap.get('quizId')
        );

        if (!quizId) {
            this.errorMessage.set(
                'تعذر تحديد الاختبار.'
            );
            return;
        }

        this.quizId.set(quizId);

        this.loadTrainer();
    }

    private loadTrainer(): void {

        const userId =
            this.auth.session()?.userId;

        if (!userId) {
            this.errorMessage.set(
                'تعذر تحديد المستخدم الحالي.'
            );
            return;
        }

        this.loading.set(true);

        this.api
            .getTrainerByUserId(userId)
            .subscribe({

                next: trainer => {

                    this.trainer.set(trainer);

                    this.loadQuestions(
                        trainer.trainerId
                    );

                    this.loadQuizQuestions(
                        trainer.trainerId
                    );
                },

                error: error => {

                    console.error(
                        'Error loading trainer:',
                        error
                    );

                    this.loading.set(false);

                    this.errorMessage.set(
                        'تعذر تحميل بيانات المدرب.'
                    );
                }
            });
    }

    private loadQuestions(
        trainerId: number
    ): void {

        this.api
            .getTrainerQuestions(trainerId)
            .subscribe({

                next: questions => {

                    this.questions.set(
                        questions ?? []
                    );

                    this.loading.set(false);
                },

                error: error => {

                    console.error(
                        'Error loading question bank:',
                        error
                    );

                    this.questions.set([]);

                    this.loading.set(false);

                    this.errorMessage.set(
                        'تعذر تحميل بنك الأسئلة.'
                    );
                }
            });
    }

    private loadQuizQuestions(
        trainerId: number
    ): void {

        const quizId = this.quizId();

        if (!quizId) {
            return;
        }

        this.quizQuestionsLoading.set(true);

        this.api
            .getQuizQuestions(
                quizId,
                trainerId
            )
            .subscribe({

                next: questions => {

                    this.quizQuestions.set(
                        questions ?? []
                    );

                    this.quizQuestionsLoading.set(false);
                },

                error: error => {

                    console.error(
                        'Error loading quiz questions:',
                        error
                    );

                    this.quizQuestions.set([]);

                    this.quizQuestionsLoading.set(false);

                    this.errorMessage.set(
                        'تعذر تحميل أسئلة الاختبار.'
                    );
                }
            });
    }

    toggleQuestionSelection(
        questionId: number
    ): void {

        if (
            this.quizQuestionIds()
                .has(questionId)
        ) {
            return;
        }

        this.selectedQuestionIds.update(
            current => {

                const next = new Set(current);

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

    isAlreadyAdded(
        questionId: number
    ): boolean {

        return this.quizQuestionIds()
            .has(questionId);
    }

    selectAll(): void {

        const selectableQuestions =
            this.filteredQuestions()
                .filter(
                    question =>
                        question.isActive &&
                        !this.isAlreadyAdded(
                            question.questionId
                        )
                );

        this.selectedQuestionIds.set(
            new Set(
                selectableQuestions.map(
                    question =>
                        question.questionId
                )
            )
        );
    }

    clearSelection(): void {

        this.selectedQuestionIds.set(
            new Set()
        );
    }

    addSelectedQuestions(): void {

        const quizId = this.quizId();

        const trainerId =
            this.trainer()?.trainerId;

        const questionIds =
            Array.from(
                this.selectedQuestionIds()
            );

        if (!quizId || !trainerId) {
            this.errorMessage.set(
                'تعذر تحديد الاختبار أو المدرب.'
            );
            return;
        }

        if (questionIds.length === 0) {
            return;
        }

        this.saving.set(true);

        this.errorMessage.set('');

        this.successMessage.set('');

        this.api
            .addQuestionsToQuiz(
                quizId,
                trainerId,
                questionIds
            )
            .subscribe({

                next: response => {

                    this.saving.set(false);

                    this.selectedQuestionIds.set(
                        new Set()
                    );

                    this.successMessage.set(
                        response?.message ||
                        'تمت إضافة الأسئلة إلى الاختبار بنجاح.'
                    );

                    this.loadQuizQuestions(
                        trainerId
                    );
                },

                error: error => {

                    console.error(
                        'Error adding questions:',
                        error
                    );

                    this.saving.set(false);

                    this.errorMessage.set(
                        error?.error?.message ||
                        'تعذر إضافة الأسئلة إلى الاختبار.'
                    );
                }
            });
    }
    openCreateQuestion(): void {
        this.editingQuestionId.set(null);
        this.questionForm = this.emptyQuestionForm();

        this.questionError.set('');
        this.questionSuccess.set('');

        this.questionFormOpen.set(true);
    }

    openEditQuestion(question: QuestionBankDto): void {
        this.editingQuestionId.set(question.questionId);

        const questionTypeMap: Record<string, number> = {
            MultipleChoice: 0,
            TrueFalse: 1,
            Essay: 2
        };

        const difficultyMap: Record<string, number> = {
            Easy: 0,
            Medium: 1,
            Hard: 2
        };

        const rawQuestionType = question.questionType as number | string;
        const rawDifficulty = question.difficulty as number | string;

        const questionType =
            typeof rawQuestionType === 'string'
                ? questionTypeMap[rawQuestionType] ?? 0
                : Number(rawQuestionType);

        const difficulty =
            typeof rawDifficulty === 'string'
                ? difficultyMap[rawDifficulty] ?? 0
                : Number(rawDifficulty);

        this.questionForm = {
            questionText: question.questionText,
            questionType,
            difficulty,
            points: Number(question.points),
            explanation: question.explanation ?? '',
            options: [...(question.options ?? [])]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map(option => ({
                    optionText: option.optionText,
                    optionCode: option.optionCode,
                    sortOrder: option.sortOrder,
                    isCorrect: option.isCorrect
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

    addQuestionOption(): void {
        if (this.questionForm.options.length >= 6) {
            return;
        }

        const index = this.questionForm.options.length;

        this.questionForm.options.push({
            optionText: '',
            optionCode: String.fromCharCode(65 + index),
            sortOrder: index,
            isCorrect: false
        });

        this.questionForm = {
            ...this.questionForm
        };
    }

    removeQuestionOption(index: number): void {
        if (this.questionForm.options.length <= 2) {
            return;
        }

        this.questionForm.options.splice(index, 1);

        this.questionForm.options =
            this.questionForm.options.map((option, i) => ({
                ...option,
                sortOrder: i,
                optionCode: String.fromCharCode(65 + i)
            }));

        this.questionForm = {
            ...this.questionForm
        };
    }

    setCorrectOption(index: number): void {
        this.questionForm.options =
            this.questionForm.options.map((option, i) => ({
                ...option,
                isCorrect: i === index
            }));

        this.questionForm = {
            ...this.questionForm
        };
    }

    questionTypeChanged(): void {
        const type = Number(this.questionForm.questionType);

        if (type === 0) {
            if (this.questionForm.options.length === 0) {
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

            this.questionForm = {
                ...this.questionForm
            };

            return;
        }

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

            this.questionForm = {
                ...this.questionForm
            };

            return;
        }

        if (type === 2) {
            this.questionForm.options = [];

            this.questionForm = {
                ...this.questionForm
            };
        }
    }

    saveQuestion(): void {
        const trainerId = this.trainer()?.trainerId;

        if (!trainerId) {
            this.questionError.set('تعذر تحديد المدرب الحالي.');
            return;
        }

        const form = this.questionForm;

        if (!form.questionText.trim()) {
            this.questionError.set('يرجى كتابة نص السؤال.');
            return;
        }

        if (form.points <= 0 || form.points > 100) {
            this.questionError.set('درجة السؤال يجب أن تكون بين 0.1 و100.');
            return;
        }

        if (form.questionType === 0 || form.questionType === 1) {
            if (form.options.length < 2) {
                this.questionError.set('يجب إضافة خيارين على الأقل.');
                return;
            }

            const correctCount =
                form.options.filter(option => option.isCorrect).length;

            if (correctCount !== 1) {
                this.questionError.set(
                    'يجب تحديد إجابة صحيحة واحدة فقط.'
                );
                return;
            }

            const hasEmptyOption =
                form.options.some(
                    option => !option.optionText.trim()
                );

            if (hasEmptyOption) {
                this.questionError.set(
                    'يرجى كتابة جميع الخيارات.'
                );
                return;
            }
        }

        const payload = {
            questionText: form.questionText.trim(),

            questionType: Number(form.questionType),

            difficulty: Number(form.difficulty),

            points: Number(form.points),

            explanation:
                form.explanation.trim() || null,

            options:
                form.questionType === 2
                    ? []
                    : form.options.map((option, index) => ({
                        optionText: option.optionText.trim(),
                        optionCode: option.optionCode,
                        sortOrder: index,
                        isCorrect: option.isCorrect
                    }))
        };

        this.questionSaving.set(true);
        this.questionError.set('');

        const questionId = this.editingQuestionId();

        if (questionId === null) {
            this.api.createQuestion(trainerId, payload).subscribe({
                next: () => {
                    this.questionSaving.set(false);
                    this.questionFormOpen.set(false);

                    this.questionSuccess.set(
                        'تمت إضافة السؤال بنجاح.'
                    );

                    this.loadQuestions(trainerId);
                },

                error: (error: any) => {
                    console.error(
                        'Error creating question:',
                        error
                    );

                    this.questionSaving.set(false);

                    this.questionError.set(
                        error?.error?.message ||
                        'تعذر إضافة السؤال.'
                    );
                }
            });

            return;
        }

        this.api.updateQuestion(
            questionId,
            trainerId,
            payload
        ).subscribe({
            next: () => {
                this.questionSaving.set(false);
                this.questionFormOpen.set(false);

                this.questionSuccess.set(
                    'تم تحديث السؤال بنجاح.'
                );

                this.loadQuestions(trainerId);
            },

            error: (error: any) => {
                console.error(
                    'Error updating question:',
                    error
                );

                this.questionSaving.set(false);

                this.questionError.set(
                    error?.error?.message ||
                    'تعذر تحديث السؤال.'
                );
            }
        });
    }

    deactivateQuestion(question: QuestionBankDto): void {
        if (!question.isActive) {
            return;
        }

        this.questionToDeactivate.set(question);
        this.showDeactivateConfirm.set(true);
    }
    cancelDeactivate(): void {
        this.showDeactivateConfirm.set(false);
        this.questionToDeactivate.set(null);
    }

    confirmDeactivate(): void {
        const question = this.questionToDeactivate();
        const trainerId = this.trainer()?.trainerId;

        if (!question || !trainerId) {
            return;
        }

        this.showDeactivateConfirm.set(false);

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

                    this.loadQuestions(trainerId);
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
    publishQuiz(): void {
        const quizId = this.quizId();
        const trainerId = this.trainer()?.trainerId;

        if (!quizId || !trainerId) {
            this.errorMessage.set('تعذر تحديد الاختبار أو المدرب.');
            return;
        }

        if (this.quizQuestions().length === 0) {
            this.errorMessage.set(
                'لا يمكن نشر الاختبار قبل إضافة سؤال واحد على الأقل.'
            );
            return;
        }

        this.saving.set(true);
        this.errorMessage.set('');
        this.successMessage.set('');

        this.api.publishQuiz(
            quizId,
            trainerId
        ).subscribe({
            next: () => {
                this.saving.set(false);

                this.successMessage.set(
                    'تم نشر الاختبار بنجاح.'
                );

                this.router.navigate([
                    '/trainer/quizzes'
                ]);
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
    }
    goBack(): void {

        this.router.navigate([
            '/trainer/quizzes'
        ]);
    }

    getQuestionTypeLabel(type: number | string): string {
        const value =
            typeof type === 'string'
                ? type
                : Number(type);

        switch (value) {
            case 0:
            case 'MultipleChoice':
                return 'اختيار متعدد';

            case 1:
            case 'TrueFalse':
                return 'صح أو خطأ';

            case 2:
            case 'Essay':
                return 'سؤال مقالي';

            default:
                return 'سؤال';
        }
    }

    getDifficultyLabel(difficulty: number | string): string {
        const value =
            typeof difficulty === 'string'
                ? difficulty
                : Number(difficulty);

        switch (value) {
            case 0:
            case 'Easy':
                return 'سهل';

            case 1:
            case 'Medium':
                return 'متوسط';

            case 2:
            case 'Hard':
                return 'صعب';

            default:
                return 'غير محدد';
        }
    }
}