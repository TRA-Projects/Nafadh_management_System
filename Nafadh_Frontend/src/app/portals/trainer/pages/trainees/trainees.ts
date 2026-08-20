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
  // REPORT EXPORT STATE
  // =====================================================

  isExportingReport =
    signal(false);


  // =====================================================
  // NEW EVALUATION PICKER
  // =====================================================

  showTraineePicker =
    signal(false);


  // =====================================================
  // KPI
  // =====================================================

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

  evaluationAverages =
    signal<Record<number, number | null>>({});


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
  // ATTENDANCE
  // =====================================================

  attendancePercentages =
    signal<Record<number, number | null>>({});


  attendancePercentage(
    enrollmentId: number
  ): number | null {

    const percentage =
      this.attendancePercentages()[
        enrollmentId
      ];


    if (
      typeof percentage !== 'number' ||
      !Number.isFinite(percentage)
    ) {

      return null;
    }


    return percentage;
  }


  // =====================================================
  // TECHNICAL LEVEL
  // =====================================================

  technicalScore(
    enrollmentId: number
  ): number | null {

    const score =
      this.evaluationAverages()[
        enrollmentId
      ];


    if (
      typeof score !== 'number' ||
      !Number.isFinite(score)
    ) {

      return null;
    }


    return score;
  }


  technicalLevel(
    enrollmentId: number
  ): string {

    const score =
      this.technicalScore(
        enrollmentId
      );


    if (score === null) {

      return '—';
    }


    if (score >= 85) {

      return 'ممتاز';
    }


    if (score >= 70) {

      return 'جيد';
    }


    if (score >= 60) {

      return 'متوسط';
    }


    return 'يحتاج تطوير';
  }


  technicalProgress(
    enrollmentId: number
  ): number {

    const score =
      this.technicalScore(
        enrollmentId
      );


    if (score === null) {

      return 0;
    }


    return Math.min(
      100,
      Math.max(
        0,
        score
      )
    );
  }


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

  private loadCurrentTrainer(): void {

    const userId =
      this.auth.session()?.userId;


    if (!userId) {

      console.error(
        'لم يتم العثور على UserId للمستخدم الحالي'
      );

      this.enrollments.set([]);

      this.evaluationAverages.set({});

      this.attendancePercentages.set({});

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

          this.attendancePercentages.set({});
        }

      });
  }


  // =====================================================
  // TRAINER BATCHES
  // =====================================================

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

              this.attendancePercentages.set({});

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

          this.attendancePercentages.set({});
        }

      });
  }


  // =====================================================
  // ENROLLMENTS
  // =====================================================

  private loadEnrollmentsForBatches(
    batchIds: number[]
  ): void {

    if (batchIds.length === 0) {

      this.enrollments.set([]);

      this.evaluationAverages.set({});

      this.attendancePercentages.set({});

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


          // تحميل متوسط التقييم لكل متدرب
          this.loadEvaluationAverages(
            enrollments
          );


          // تحميل نسبة الحضور لكل متدرب
          this.loadAttendancePercentages(
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

          this.attendancePercentages.set({});
        }

      });
  }


  // =====================================================
  // LOAD EVALUATION AVERAGES
  // =====================================================

  private loadEvaluationAverages(
    enrollments: EnrollmentDto[]
  ): void {

    if (enrollments.length === 0) {

      this.evaluationAverages.set({});

      return;
    }


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
  // LOAD ATTENDANCE PERCENTAGES
  // =====================================================

  private loadAttendancePercentages(
    enrollments: EnrollmentDto[]
  ): void {

    if (enrollments.length === 0) {

      this.attendancePercentages.set({});

      return;
    }


    this.attendancePercentages.set({});


    const requests =
      enrollments.map(
        enrollment =>

          this.api
            .getAttendanceComplianceRate(
              enrollment.enrollmentId
            )
            .pipe(

              catchError(err => {

                console.warn(
                  `تعذر تحميل نسبة حضور التسجيل ${enrollment.enrollmentId}:`,
                  err
                );


                return of({

                  enrollmentId:
                    enrollment.enrollmentId,

                  totalDays:
                    0,

                  presentDays:
                    0,

                  compliancePercentage:
                    null as number | null

                });
              })

            )
      );


    forkJoin(requests)
      .subscribe({

        next: (results) => {

          const percentages:
            Record<number, number | null> = {};


          for (const result of results) {

            percentages[
              result.enrollmentId
            ] =
              result.compliancePercentage;
          }


          this.attendancePercentages.set(
            percentages
          );
        },


        error: (err) => {

          console.error(
            'خطأ في تحميل نسب حضور المتدربين:',
            err
          );

          this.attendancePercentages.set({});
        }

      });
  }


  // =====================================================
  // EXPORT TRAINEES REPORT
  // =====================================================

  exportTraineesReport(): void {

    const trainer =
      this.trainer();

    const userId =
      this.auth.session()?.userId;


    if (
      !trainer ||
      !userId
    ) {

      console.error(
        'تعذر تصدير الكشف لعدم توفر بيانات المدرب الحالي'
      );

      return;
    }


    if (this.isExportingReport()) {

      return;
    }


    this.isExportingReport.set(
      true
    );


    this.api
      .generateTrainerTraineesReport({

        trainerId:
          trainer.trainerId,

        batchId:
          this.batchId,

        generatedByUserId:
          userId

      })
      .subscribe({

        next: (report) => {

          this.api
            .downloadReport(
              report.reportId
            )
            .subscribe({

              next: (blob) => {

                const url =
                  window.URL.createObjectURL(
                    blob
                  );


                const link =
                  document.createElement(
                    'a'
                  );


                link.href =
                  url;


                link.download =
                  `trainer-trainees-${report.reportId}.pdf`;


                document.body.appendChild(
                  link
                );


                link.click();


                document.body.removeChild(
                  link
                );


                window.URL.revokeObjectURL(
                  url
                );


                this.isExportingReport.set(
                  false
                );
              },


              error: (err) => {

                console.error(
                  'خطأ في تنزيل كشف المتدربين:',
                  err
                );


                this.isExportingReport.set(
                  false
                );
              }

            });
        },


        error: (err) => {

          console.error(
            'خطأ في إنشاء كشف المتدربين:',
            err
          );


          this.isExportingReport.set(
            false
          );
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
  // START NEW EVALUATION
  // =====================================================

  startNewEvaluation(): void {

    this.showTraineePicker.set(
      true
    );
  }


  // =====================================================
  // SELECT TRAINEE FOR EVALUATION
  // =====================================================

  selectTraineeForEvaluation(
    enrollmentId: number
  ): void {

    this.showTraineePicker.set(
      false
    );


    this.openEval(
      enrollmentId
    );
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

        trainerId:
          trainer.trainerId,

        templateId:
          template.templateId,

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


          // تحديث التقييمات بعد حفظ تقييم جديد
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