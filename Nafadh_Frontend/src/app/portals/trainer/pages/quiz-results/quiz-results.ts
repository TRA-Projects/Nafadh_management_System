
import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  TrainerApi,
  QuizResultDto,
  QuizAttemptDetailsDto,
  QuizAnswerDetailsDto
} from '../../services/trainer-api';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-quiz-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-results.html',
  styleUrl: './quiz-results.scss'
})
export class QuizResults implements OnInit {

  // =====================================
  // RESULTS
  // =====================================

  results = signal<QuizResultDto[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  quizId: number | undefined;
  trainerId: number | null = null;

  // =====================================
  // ATTEMPT DETAILS
  // =====================================

  selectedAttempt = signal<QuizAttemptDetailsDto | null>(null);

  showAttemptDetails = signal(false);
  detailsLoading = signal(false);
  grading = signal(false);

  detailsError = signal('');
  detailsSuccess = signal('');

  // Store the entered grade for each answer
  awardedPoints: { [answerId: number]: number } = {};

  constructor(
    private api: TrainerApi,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  // =====================================
  // INITIALIZATION
  // =====================================

  ngOnInit(): void {

    const id = this.route.snapshot.queryParamMap.get('quizId');

    if (id !== null) {
      const parsedId = Number(id);

      if (Number.isInteger(parsedId) && parsedId > 0) {
        this.quizId = parsedId;
      }
    }

    const userId = this.auth.session()?.userId;

    if (!userId) {
      this.errorMessage.set('تعذر تحديد المستخدم الحالي.');
      return;
    }

    this.loading.set(true);

    this.api.getTrainerByUserId(userId).subscribe({
      next: trainer => {

        this.trainerId = trainer.trainerId;

        this.loadResults();
      },

      error: () => {
        this.errorMessage.set('تعذر تحميل بيانات المدرب.');
        this.loading.set(false);
      }
    });
  }

  // =====================================
  // LOAD RESULTS
  // =====================================

  loadResults(): void {

    if (!this.trainerId) {
      this.errorMessage.set('تعذر تحديد المدرب.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.api.getTrainerQuizResults(
      this.trainerId,
      this.quizId
    ).subscribe({

      next: data => {
        this.results.set(data ?? []);
        this.loading.set(false);
      },

      error: () => {
        this.errorMessage.set('تعذر تحميل نتائج الاختبار.');
        this.loading.set(false);
      }
    });
  }

  // =====================================
  // OPEN ATTEMPT DETAILS
  // =====================================

  openAttemptDetails(attemptId: number): void {

    if (!this.trainerId) {
      this.errorMessage.set('تعذر تحديد المدرب.');
      return;
    }

    this.showAttemptDetails.set(true);
    this.selectedAttempt.set(null);

    this.detailsLoading.set(true);
    this.detailsError.set('');
    this.detailsSuccess.set('');

    this.awardedPoints = {};

    this.api.getQuizAttemptDetails(
      this.trainerId,
      attemptId
    ).subscribe({

      next: details => {

        this.selectedAttempt.set(details);

        for (const answer of details.answers) {
          this.awardedPoints[answer.answerId] =
            answer.awardedPoints;
        }

        this.detailsLoading.set(false);
      },

      error: () => {
        this.detailsError.set(
          'تعذر تحميل تفاصيل المحاولة.'
        );

        this.detailsLoading.set(false);
      }
    });
  }

  // =====================================
  // CLOSE ATTEMPT DETAILS
  // =====================================

  closeAttemptDetails(): void {

    if (this.grading()) {
      return;
    }

    this.showAttemptDetails.set(false);
    this.selectedAttempt.set(null);

    this.detailsError.set('');
    this.detailsSuccess.set('');

    this.awardedPoints = {};
  }

  // =====================================
  // CHECK ESSAY QUESTION
  // =====================================

  isEssayQuestion(answer: QuizAnswerDetailsDto): boolean {

    return String(answer.questionType)
      .trim()
      .toLowerCase() === 'essay';
  }

  // =====================================
  // SAVE ESSAY GRADE
  // =====================================

  gradeEssay(answer: QuizAnswerDetailsDto): void {

    if (!this.trainerId || this.grading()) {
      return;
    }

    this.detailsError.set('');
    this.detailsSuccess.set('');

    if (!this.isEssayQuestion(answer)) {
      this.detailsError.set(
        'يمكن تصحيح الأسئلة المقالية فقط.'
      );
      return;
    }

    if (answer.answerId <= 0) {
      this.detailsError.set(
        'لا توجد إجابة محفوظة لهذا السؤال.'
      );
      return;
    }

    const points = Number(
      this.awardedPoints[answer.answerId]
    );

    if (
      !Number.isFinite(points) ||
      points < 0 ||
      points > answer.maxPoints
    ) {
      this.detailsError.set(
        `الدرجة يجب أن تكون بين 0 و ${answer.maxPoints}.`
      );
      return;
    }

    this.grading.set(true);

    this.api.gradeEssayAnswer({
      answerId: answer.answerId,
      trainerId: this.trainerId,
      awardedPoints: points
    }).subscribe({

      next: () => {

        this.grading.set(false);

        this.detailsSuccess.set(
          'تم حفظ التصحيح وتحديث درجة المتدرب بنجاح.'
        );

        const attemptId = this.selectedAttempt()?.attemptId;

        if (attemptId) {
          this.refreshAttemptDetails(attemptId);
        }

        this.loadResults();
      },

      error: error => {

        this.grading.set(false);

        this.detailsError.set(
          error.error?.message ||
          'تعذر حفظ التصحيح. حاولي مرة أخرى.'
        );
      }
    });
  }

  // =====================================
  // REFRESH ATTEMPT DETAILS
  // =====================================

  refreshAttemptDetails(attemptId: number): void {

    if (!this.trainerId) {
      return;
    }

    this.detailsLoading.set(true);

    this.api.getQuizAttemptDetails(
      this.trainerId,
      attemptId
    ).subscribe({

      next: details => {

        this.selectedAttempt.set(details);

        this.awardedPoints = {};

        for (const answer of details.answers) {
          this.awardedPoints[answer.answerId] =
            answer.awardedPoints;
        }

        this.detailsLoading.set(false);
      },

      error: () => {

        this.detailsError.set(
          'تم حفظ التصحيح، لكن تعذر تحديث تفاصيل المحاولة.'
        );

        this.detailsLoading.set(false);
      }
    });
  }

  // =====================================
  // GRADING STATUS
  // =====================================

  getGradingStatusLabel(
    completed: boolean
  ): string {

    return completed
      ? 'اكتمل التصحيح'
      : 'بانتظار التصحيح';
  }

  // =====================================
  // PASS / FAIL
  // =====================================

  getPassStatusLabel(
    isPassed: boolean | null
  ): string {

    if (isPassed === null) {
      return 'لم تكتمل النتيجة';
    }

    return isPassed ? 'ناجح' : 'راسب';
  }

  // =====================================
  // ATTEMPT STATUS
  // =====================================

  getAttemptStatusLabel(
    status: string | number
  ): string {

    switch (String(status).trim().toLowerCase()) {

      case 'started':
        return 'بدأت المحاولة';

      case 'inprogress':
        return 'قيد التقدم';

      case 'submitted':
        return 'تم التسليم';

      case 'expired':
        return 'انتهت المدة';

      case 'terminated':
        return 'تم إنهاء المحاولة';

      default:
        return 'غير معروف';
    }
  }

  // =====================================
  // BACK
  // =====================================

  goBack(): void {
    this.router.navigate(['/trainer/quizzes']);
  }
}
