import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';


import {
  TrainerApi,
  QuizResultDto,
  QuizAttemptDetailsDto
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

  // =========================================
  // DATA
  // =========================================

  results = signal<QuizResultDto[]>([]);
  searchTerm = signal('');

statusFilter = signal('all');

filteredResults = computed(() => {

  const search = this.searchTerm()
    .trim()
    .toLowerCase();

  const status = this.statusFilter();

  return this.results().filter(result => {

    const matchesSearch =
      !search ||
      String(result.traineeName ?? '')
        .toLowerCase()
        .includes(search);

    let matchesStatus = true;

    if (status === 'pending') {

      matchesStatus =
        result.status?.toLowerCase() === 'submitted' &&
        !result.isGradingCompleted;

    }

    else if (status === 'passed') {

      matchesStatus =
        result.isGradingCompleted &&
        result.isPassed === true;

    }

    else if (status === 'failed') {

      matchesStatus =
        result.isGradingCompleted &&
        result.isPassed === false;

    }

    else if (status === 'submitted') {

      matchesStatus =
        result.status?.toLowerCase() === 'submitted';

    }

    return matchesSearch && matchesStatus;

  });

});

  loading = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  attemptDetails = signal<QuizAttemptDetailsDto | null>(null);
  detailsLoading = signal(false);

  gradingPoints: { [answerId: number]: number } = {};
  gradingSaving = signal(false);

  quizId: number | undefined;
  trainerId: number | null = null;


  // =========================================
  // CONSTRUCTOR
  // =========================================

  constructor(
    private api: TrainerApi,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) { }


  // =========================================
  // INIT
  // =========================================

  ngOnInit(): void {

    const id =
      this.route.snapshot.queryParamMap.get('quizId');


    if (id !== null) {

      this.quizId = Number(id);

    }


    const userId =
      this.auth.session()?.userId;


    if (!userId) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي.'
      );

      return;

    }


    this.loading.set(true);


    this.api.getTrainerByUserId(userId).subscribe({

      next: trainer => {

        this.api.getTrainerQuizResults(
          trainer.trainerId,
          this.quizId
        ).subscribe({

          next: data => {

            console.log(
              'Quiz Results from API:',
              data
            );

            this.results.set(
              data ?? []
            );

            this.loading.set(false);

          },

          error: error => {

            console.error(
              'Quiz Results API Error:',
              error
            );

            this.errorMessage.set(
              'تعذر تحميل نتائج الاختبار.'
            );

            this.loading.set(false);

          }

        });

      },

      error: error => {

        console.error(
          'Trainer API Error:',
          error
        );

        this.errorMessage.set(
          'تعذر تحميل بيانات المدرب.'
        );

        this.loading.set(false);

      }

    });

  }


  // =========================================
  // BACK
  // =========================================

  goBack(): void {

    this.router.navigate(
      ['/trainer/quizzes']
    );

  }
  // =========================================
  // ATTEMPT DETAILS
  // =========================================

  viewAttemptDetails(result: QuizResultDto): void {

    const userId =
      this.auth.session()?.userId;

    if (!userId) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي.'
      );

      return;

    }

    this.detailsLoading.set(true);

    this.errorMessage.set('');

    this.api.getTrainerByUserId(userId).subscribe({

      next: trainer => {

        this.trainerId = trainer.trainerId;

        this.api.getQuizAttemptDetails(
          trainer.trainerId,
          result.attemptId
        ).subscribe({

          next: details => {

            console.log(
              'Quiz Attempt Details:',
              details
            );

            this.attemptDetails.set(details);

            this.detailsLoading.set(false);

          },

          error: error => {

            console.error(
              'Quiz Attempt Details API Error:',
              error
            );

            this.errorMessage.set(
              'تعذر تحميل تفاصيل المحاولة.'
            );

            this.detailsLoading.set(false);

          }

        });

      },

      error: error => {

        console.error(
          'Trainer API Error:',
          error
        );

        this.errorMessage.set(
          'تعذر تحميل بيانات المدرب.'
        );

        this.detailsLoading.set(false);

      }

    });

  }
  closeAttemptDetails(): void {

    this.attemptDetails.set(null);

  }
  // =========================================
// MANUAL ESSAY GRADING
// =========================================

gradeEssayAnswer(answer: any): void {

  if (!this.trainerId) {

    this.errorMessage.set(
      'تعذر تحديد المدرب الحالي.'
    );

    return;

  }

  const awardedPoints =
    Number(this.gradingPoints[answer.answerId]);

  if (
    isNaN(awardedPoints) ||
    awardedPoints < 0 ||
    awardedPoints > Number(answer.maxPoints)
  ) {

    this.errorMessage.set(
      `الدرجة يجب أن تكون بين 0 و ${answer.maxPoints}.`
    );

    return;

  }

  this.gradingSaving.set(true);

  this.errorMessage.set('');
  this.successMessage.set('');

  this.api.gradeEssayAnswer({

    answerId: answer.answerId,

    trainerId: this.trainerId,

    awardedPoints: awardedPoints

  }).subscribe({

    next: response => {

      console.log(
        'Essay grading success:',
        response
      );

      this.successMessage.set(
        'تم تصحيح الإجابة المقالية بنجاح.'
      );

      // إعادة تحميل تفاصيل المحاولة
      this.api.getQuizAttemptDetails(
        this.trainerId!,
        this.attemptDetails()!.attemptId
      ).subscribe({

        next: details => {

          this.attemptDetails.set(details);

          this.gradingSaving.set(false);

        },

        error: error => {

          console.error(
            'Reload attempt details error:',
            error
          );

          this.gradingSaving.set(false);

        }

      });

    },

    error: error => {

      console.error(
        'Essay grading error:',
        error
      );

      this.errorMessage.set(
        error?.error?.message ||
        'تعذر حفظ تصحيح الإجابة.'
      );

      this.gradingSaving.set(false);

    }

  });

}
  // =========================================
  // STATISTICS
  // =========================================

  submittedCount(): number {

    return this.results()
      .filter(result =>
        String(result.status)
          .trim()
          .toLowerCase() === 'submitted'
      )
      .length;

  }





  averagePercentage(): number {

    const submittedResults =
      this.results()
        .filter(result =>
          result.percentage !== null &&
          result.percentage !== undefined &&
          !isNaN(Number(result.percentage))
        );


    if (submittedResults.length === 0) {

      return 0;

    }


    const total =
      submittedResults.reduce(
        (sum, result) =>
          sum + Number(result.percentage),
        0
      );


    return Math.round(
      (total / submittedResults.length) * 10
    ) / 10;

  }

  inProgressCount(): number {

    return this.results()
      .filter(result =>
        ['started', 'inprogress'].includes(
          String(result.status).trim().toLowerCase()
        )
      )
      .length;

  }

  gradingPendingCount(): number {

    return this.results()
      .filter(result =>
        result.status?.toLowerCase() === 'submitted' &&
        !result.isGradingCompleted
      )
      .length;

  }


  passedCount(): number {

    return this.results()
      .filter(result =>
        result.isGradingCompleted &&
        result.isPassed === true
      )
      .length;

  }


  failedCount(): number {

    return this.results()
      .filter(result =>
        result.isGradingCompleted &&
        result.isPassed === false
      )
      .length;

  }


  getResultStatusLabel(result: QuizResultDto): string {

    if (
      result.status?.toLowerCase() === 'submitted' &&
      !result.isGradingCompleted
    ) {
      return 'بانتظار التصحيح';
    }

    if (
      result.isGradingCompleted &&
      result.isPassed === true
    ) {
      return 'ناجح';
    }

    if (
      result.isGradingCompleted &&
      result.isPassed === false
    ) {
      return 'راسب';
    }

    return this.getAttemptStatusLabel(result.status);
  }


  getResultStatusClass(result: QuizResultDto): string {

    if (
      result.status?.toLowerCase() === 'submitted' &&
      !result.isGradingCompleted
    ) {
      return 'status-pending';
    }

    if (
      result.isGradingCompleted &&
      result.isPassed === true
    ) {
      return 'status-passed';
    }

    if (
      result.isGradingCompleted &&
      result.isPassed === false
    ) {
      return 'status-failed';
    }

    return this.getStatusClass(result.status);
  }


  getResultStatusIcon(result: QuizResultDto): string {

    if (
      result.status?.toLowerCase() === 'submitted' &&
      !result.isGradingCompleted
    ) {
      return 'fa-hourglass-half';
    }

    if (
      result.isGradingCompleted &&
      result.isPassed === true
    ) {
      return 'fa-circle-check';
    }

    if (
      result.isGradingCompleted &&
      result.isPassed === false
    ) {
      return 'fa-circle-xmark';
    }

    return this.getStatusIcon(result.status);
  }

  // =========================================
  // STATUS
  // =========================================

  getAttemptStatusLabel(
    status: string | number
  ): string {

    switch (
    String(status)
      .trim()
      .toLowerCase()
    ) {

      case 'started':

        return 'بدأت المحاولة';


      case 'inprogress':

        return 'قيد التقدم';


      case 'submitted':

        return 'تم التسليم';


      case 'expired':

        return 'انتهت المدة';


      default:

        return 'غير معروف';

    }

  }


  getStatusClass(
    status: string | number
  ): string {

    switch (
    String(status)
      .trim()
      .toLowerCase()
    ) {

      case 'submitted':

        return 'status-submitted';


      case 'expired':

        return 'status-expired';


      case 'inprogress':

        return 'status-progress';


      case 'started':

        return 'status-started';


      default:

        return 'status-unknown';

    }

  }


  getStatusIcon(
    status: string | number
  ): string {

    switch (
    String(status)
      .trim()
      .toLowerCase()
    ) {

      case 'submitted':

        return 'fa-circle-check';


      case 'expired':

        return 'fa-clock';


      case 'inprogress':

        return 'fa-spinner';


      case 'started':

        return 'fa-play';


      default:

        return 'fa-circle-question';

    }

  }



}