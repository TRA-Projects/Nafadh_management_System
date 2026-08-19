import {
  Component,
  OnInit,
  computed,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import {
  catchError,
  forkJoin,
  of
} from 'rxjs';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  EnrollmentDto,
  EvaluationCriterionDto,
  EvaluationTemplateDetailDto,
  TrainerDto
} from '../../../../core/models/dtos';


@Component({
  selector: 'app-trainer-trainees',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './trainees.html',
  styleUrl: './trainees.scss',
})
export class TrainerTrainees implements OnInit {

  // =====================================================
  // STATE
  // =====================================================

  trainer =
    signal<TrainerDto | null>(null);

  enrollments =
    signal<EnrollmentDto[]>([]);

  batchId: number | null = null;

  taskId: number | null = null;


  // =====================================================
  // KPI
  // =====================================================

  /**
   * Number of unique trainees across the trainer's batches.
   *
   * If the same trainee has more than one enrollment,
   * the trainee is counted only once in the KPI.
   */
  totalTrainees = computed(() => {

    const traineeIds =
      new Set(
        this.enrollments().map(
          enrollment =>
            enrollment.traineeId
        )
      );

    return traineeIds.size;
  });


  // =====================================================
  // EVALUATION AVERAGES
  // =====================================================

  /**
   * Stores the evaluation average for each enrollment.
   *
   * Example:
   * {
   *   25: 90,
   *   58: 72.5,
   *   78: null
   * }
   */
  evaluationAverages =
    signal<Record<number, number | null>>({});


  /**
   * Number of trainees that currently have
   * an available evaluation average.
   */
  evaluatedTraineesCount =
    computed(() => {

      return Object
        .values(
          this.evaluationAverages()
        )
        .filter(
          (score): score is number =>
            typeof score === 'number' &&
            Number.isFinite(score)
        )
        .length;
    });


  /**
   * Average technical performance
   * across evaluated trainees only.
   */
  averageTechnicalPerformance =
    computed(() => {

      const scores =
        Object
          .values(
            this.evaluationAverages()
          )
          .filter(
            (score): score is number =>
              typeof score === 'number' &&
              Number.isFinite(score)
          );


      if (scores.length === 0) {

        return null;
      }


      const total =
        scores.reduce(
          (sum, score) =>
            sum + score,
          0
        );


      return total / scores.length;
    });


  /**
   * High-performing trainees.
   *
   * Current rule:
   * Average score >= 85
   */
  highPerformers =
    computed(() => {

      return Object
        .values(
          this.evaluationAverages()
        )
        .filter(
          (score): score is number =>
            typeof score === 'number' &&
            Number.isFinite(score) &&
            score >= 85
        )
        .length;
    });


  /**
   * Trainees who need support.
   *
   * Current rule:
   * Average score < 60
   */
  needsSupport =
    computed(() => {

      return Object
        .values(
          this.evaluationAverages()
        )
        .filter(
          (score): score is number =>
            typeof score === 'number' &&
            Number.isFinite(score) &&
            score < 60
        )
        .length;
    });


  // =====================================================
  // EVALUATION STATE
  // =====================================================

  showEvalModal =
    signal(false);

  templateDetail =
    signal<EvaluationTemplateDetailDto | null>(
      null
    );

  selectedModuleId = 1;

  selectedStage = 1;

  selectedEnrollmentId:
    number | null = null;

  criteriaScores:
    Record<number, number> = {};

  showAddCriterion =
    signal(false);

  newCriterion = {
    name: '',
    weight: 0,
    maxPoints: 0
  };


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    private auth: AuthService,
    private route: ActivatedRoute
  ) {}


  // =====================================================
  // INITIALIZATION
  // =====================================================

  ngOnInit(): void {

    const batchIdParam =
      this.route.snapshot.queryParamMap.get(
        'batchId'
      );

    const taskIdParam =
      this.route.snapshot.queryParamMap.get(
        'taskId'
      );


    this.batchId =
      batchIdParam
        ? Number(batchIdParam)
        : null;


    this.taskId =
      taskIdParam
        ? Number(taskIdParam)
        : null;


    this.loadCurrentTrainer();
  }


  // =====================================================
  // CURRENT TRAINER
  // =====================================================

  /**
   * Gets the real TrainerId using the logged-in UserId.
   */
  private loadCurrentTrainer(): void {

    const userId =
      this.auth.session()?.userId;


    if (!userId) {

      console.error(
        'لم يتم العثور على UserId للمستخدم الحالي'
      );

      this.enrollments.set([]);

      this.evaluationAverages.set({});

      return;
    }


    this.api
      .getTrainerByUserId(userId)
      .subscribe({

        next: (trainer) => {

          this.trainer.set(
            trainer
          );

          this.loadTrainerBatches(
            trainer.trainerId
          );
        },


        error: (err) => {

          console.error(
            'خطأ في تحميل بيانات المدرب:',
            err
          );

          this.enrollments.set([]);

          this.evaluationAverages.set({});
        }

      });
  }


  // =====================================================
  // TRAINER BATCHES
  // =====================================================

  /**
   * Loads batches assigned to the current trainer.
   *
   * If batchId exists in the URL, only that assigned batch
   * is loaded.
   *
   * Otherwise, enrollments from all trainer batches
   * are loaded.
   */
  private loadTrainerBatches(
    trainerId: number
  ): void {

    this.api
      .getMyBatches(trainerId)
      .subscribe({

        next: (data) => {

          const batches =
            data ?? [];


          if (
            this.batchId &&
            this.batchId > 0
          ) {

            const batchIsAssigned =
              batches.some(
                batch =>
                  batch.batchId ===
                  this.batchId
              );


            if (!batchIsAssigned) {

              console.error(
                'الدفعة المطلوبة غير مسندة للمدرب الحالي'
              );

              this.enrollments.set([]);

              this.evaluationAverages.set({});

              return;
            }


            this.loadEnrollmentsForBatches(
              [this.batchId]
            );

            return;
          }


          const batchIds =
            batches.map(
              batch =>
                batch.batchId
            );


          this.loadEnrollmentsForBatches(
            batchIds
          );
        },


        error: (err) => {

          console.error(
            'خطأ في تحميل دفعات المدرب:',
            err
          );

          this.enrollments.set([]);

          this.evaluationAverages.set({});
        }

      });
  }


  // =====================================================
  // ENROLLMENTS
  // =====================================================

  /**
   * Loads enrollment records for the trainer's batches.
   */
  private loadEnrollmentsForBatches(
    batchIds: number[]
  ): void {

    if (batchIds.length === 0) {

      this.enrollments.set([]);

      this.evaluationAverages.set({});

      return;
    }


    const requests =
      batchIds.map(
        batchId =>

          this.api
            .getEnrollments(
              undefined,
              batchId
            )
            .pipe(

              catchError(err => {

                console.error(
                  `خطأ في تحميل متدربي الدفعة ${batchId}:`,
                  err
                );

                return of(
                  [] as EnrollmentDto[]
                );
              })

            )
      );


    forkJoin(requests)
      .subscribe({

        next: (results) => {

          const enrollments =
            results.flat();


          this.enrollments.set(
            enrollments
          );


          // تحميل متوسطات تقييم جميع المتدربين
          // بعد تحميل الـ Enrollments
          this.loadEvaluationAverages(
            enrollments
          );
        },


        error: (err) => {

          console.error(
            'خطأ في تحميل متدربي المدرب:',
            err
          );

          this.enrollments.set([]);

          this.evaluationAverages.set({});
        }

      });
  }


  // =====================================================
  // LOAD EVALUATION AVERAGES
  // =====================================================

  /**
   * Loads the evaluation average for every enrollment.
   *
   * These values are then used to calculate:
   * - Average technical performance
   * - High performers
   * - Trainees who need support
   */
  private loadEvaluationAverages(
    enrollments: EnrollmentDto[]
  ): void {

    if (enrollments.length === 0) {

      this.evaluationAverages.set({});

      return;
    }


    // إزالة القيم القديمة قبل تحميل بيانات الدفعة الجديدة
    this.evaluationAverages.set({});


    const requests =
      enrollments.map(
        enrollment =>

          this.api
            .getEvaluationAverage(
              enrollment.enrollmentId
            )
            .pipe(

              catchError(err => {

                console.warn(
                  `تعذر تحميل متوسط تقييم التسجيل ${enrollment.enrollmentId}:`,
                  err
                );


                return of({

                  enrollmentId:
                    enrollment.enrollmentId,

                  averageScore:
                    null as number | null

                });
              })

            )
      );


    forkJoin(requests)
      .subscribe({

        next: (results) => {

          const averages:
            Record<number, number | null> = {};


          for (const result of results) {

            averages[
              result.enrollmentId
            ] =
              result.averageScore;
          }


          this.evaluationAverages.set(
            averages
          );
        },


        error: (err) => {

          console.error(
            'خطأ في تحميل متوسطات تقييم المتدربين:',
            err
          );

          this.evaluationAverages.set({});
        }

      });
  }


  // =====================================================
  // EVALUATION TEMPLATES
  // =====================================================

  loadTemplates(): void {

    this.api
      .getEvaluationTemplates(
        this.selectedModuleId,
        this.selectedStage
      )
      .subscribe({

        next: (templates) => {

          const first =
            templates?.[0];


          if (!first) {

            this.templateDetail.set(
              null
            );

            this.criteriaScores = {};

            return;
          }


          this.api
            .getTemplateDetail(
              first.templateId
            )
            .subscribe({

              next: (detail) => {

                this.templateDetail.set(
                  detail
                );
              },


              error: (err) => {

                console.error(
                  'خطأ في تحميل تفاصيل نموذج التقييم:',
                  err
                );

                this.templateDetail.set(
                  null
                );
              }

            });


          this.criteriaScores = {};
        },


        error: (err) => {

          console.error(
            'خطأ في تحميل نماذج التقييم:',
            err
          );

          this.templateDetail.set(
            null
          );
        }

      });
  }


  // =====================================================
  // OPEN EVALUATION
  // =====================================================

  openEval(
    enrollmentId: number
  ): void {

    this.selectedEnrollmentId =
      enrollmentId;

    this.loadTemplates();

    this.showEvalModal.set(
      true
    );
  }


  // =====================================================
  // CRITERIA
  // =====================================================

  criteria():
    EvaluationCriterionDto[] {

    return (
      this.templateDetail()
        ?.criteria ?? []
    );
  }


  // =====================================================
  // ADD CRITERION
  // =====================================================

  addCriterion(): void {

    const templateId =
      this.templateDetail()
        ?.templateId;


    if (!templateId) {

      return;
    }


    this.api
      .createCriterion({

        templateId,

        name:
          this.newCriterion.name,

        weight:
          this.newCriterion.weight,

        maxPoints:
          this.newCriterion.maxPoints

      })
      .subscribe({

        next: () => {

          this.showAddCriterion.set(
            false
          );


          this.newCriterion = {

            name: '',

            weight: 0,

            maxPoints: 0

          };


          this.api
            .getTemplateDetail(
              templateId
            )
            .subscribe({

              next: (detail) => {

                this.templateDetail.set(
                  detail
                );
              },


              error: (err) => {

                console.error(
                  'خطأ في إعادة تحميل تفاصيل نموذج التقييم:',
                  err
                );
              }

            });
        },


        error: (err) => {

          console.error(
            'خطأ في إضافة معيار التقييم:',
            err
          );
        }

      });
  }


  // =====================================================
  // SUBMIT EVALUATION
  // =====================================================

  submitEvaluation(): void {

    const trainer =
      this.trainer();

    const userId =
      this.auth.session()?.userId;

    const template =
      this.templateDetail();


    if (
      !this.selectedEnrollmentId ||
      !trainer ||
      !userId ||
      !template
    ) {

      return;
    }


    const criteriaScores =
      Object.entries(
        this.criteriaScores
      )
        .map(
          ([criteriaId, score]) => ({

            criteriaId:
              Number(criteriaId),

            score

          })
        );


    this.api
      .submitEvaluation({

        enrollmentId:
          this.selectedEnrollmentId,

        // المدرب الحالي الحقيقي
        trainerId:
          trainer.trainerId,

        templateId:
          template.templateId,

        // المستخدم الحالي الحقيقي
        evaluatorUserId:
          userId,

        criteriaScores

      })
      .subscribe({

        next: () => {

          this.showEvalModal.set(
            false
          );

          this.criteriaScores = {};

          this.selectedEnrollmentId =
            null;


          // تحديث متوسطات التقييم والـ KPI
          // مباشرة بعد حفظ تقييم جديد
          this.loadEvaluationAverages(
            this.enrollments()
          );
        },


        error: (err) => {

          console.error(
            'خطأ في حفظ التقييم:',
            err
          );
        }

      });
  }

}