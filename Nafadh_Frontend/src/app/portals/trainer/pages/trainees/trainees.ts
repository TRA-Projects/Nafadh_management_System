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
  ModuleDto,
  TrainerBatchDto,
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

  trainer = signal<TrainerDto | null>(null);
   

    batches =  signal<TrainerBatchDto[]>(  [] );

  
 

  enrollments =  signal<EnrollmentDto[]>([]);
  

  batchId: number | null = null;

  taskId: number | null = null;


  // =====================================================
  // EVALUABLE ENROLLMENTS
  // =====================================================

 evaluableEnrollments =
  computed(() => {

    return this.enrollments()
      .filter(
        enrollment =>
          this.canEvaluateEnrollment(
            enrollment
          )
      );
  });

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
  // TRAINEE PROFILE STATE
  // =====================================================

  showTraineeProfile =
    signal(false);

  selectedProfileEnrollmentId =
    signal<number | null>(null);


  selectedProfileEnrollment =
    computed(() => {

      const enrollmentId =
        this.selectedProfileEnrollmentId();


      if (enrollmentId === null) {

        return null;
      }


      return (
        this.enrollments()
          .find(
            enrollment =>
              enrollment.enrollmentId === enrollmentId
          ) ?? null
      );
    });

// =====================================================
// TRAINEES TABLE FILTER
// =====================================================

traineeListFilter =
  signal<'all' | 'support'>(
    'all'
  );


filteredEnrollments =
  computed(() => {

    const filter =
      this.traineeListFilter();

    const averages =
      this.evaluationAverages();


    if (filter === 'support') {

      return this.enrollments()
        .filter(
          enrollment => {

            if (
              enrollment.completionStatus ===
                'Dropped' ||
              !this.canShowTrainingMetrics(
                enrollment
              )
            ) {
              return false;
            }


            const score =
              averages[
                enrollment.enrollmentId
              ];


            return (
              typeof score === 'number' &&
              Number.isFinite(score) &&
              score < 60
            );
          }
        );
    }


    return this.enrollments();
  });


showSupportTrainees(): void {

  this.traineeListFilter.set(
    'support'
  );
}


showAllTrainees(): void {

  this.traineeListFilter.set(
    'all'
  );
}
  // =====================================================
  // KPI
  // =====================================================

  totalTrainees =
    computed(() => {

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


  performanceScores =
    computed(() => {

      const averages =
        this.evaluationAverages();


    return this.enrollments()
  .filter(
    enrollment =>
      enrollment.completionStatus !== 'Dropped' &&
      this.canShowTrainingMetrics(
        enrollment
      )
  )
  .map(
    enrollment =>
      averages[
        enrollment.enrollmentId
      ]
  )
        .filter(
          (score): score is number =>
            typeof score === 'number' &&
            Number.isFinite(score)
        );
    });


  evaluatedTraineesCount =
    computed(() => {

      return this.performanceScores()
        .length;
    });


  averageTechnicalPerformance =
    computed(() => {

      const scores =
        this.performanceScores();


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

      return this.performanceScores()
        .filter(
          score =>
            score >= 85
        )
        .length;
    });


  needsSupport =
    computed(() => {

      return this.performanceScores()
        .filter(
          score =>
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
// ENROLLMENT STATUS
// =====================================================

effectiveEnrollmentStatus(
  enrollment: EnrollmentDto
): string {

  const status =
    enrollment.completionStatus;


  // المنسحب يبقى منسحب.
  if (
    status === 'Dropped'
  ) {
    return status;
  }


  const batch =
    this.batches()
      .find(
        item =>
          item.batchId ===
          enrollment.batchId
      );


  if (!batch) {
    return status;
  }


  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );


  // الدفعة لم تبدأ بعد.
  if (batch.startDate) {

    const startDate =
      new Date(
        batch.startDate
      );

    startDate.setHours(
      0,
      0,
      0,
      0
    );


    if (
      today < startDate
    ) {
      return 'NotStarted';
    }

  }


  if (!batch.endDate) {
    return status;
  }


  const endDate =
    new Date(
      batch.endDate
    );

  endDate.setHours(
    0,
    0,
    0,
    0
  );


 // طالما الدفعة مستمرة،
// لا نظهر Completed أو Failed.
if (
  today <= endDate &&
  (
    status === 'Completed' ||
    status === 'Failed'
  )
) {
  return 'InProgress';
}


// إذا انتهت الدفعة وما زالت
// حالة المتدرب InProgress،
// نعرضه كمكتمل.
if (
  today > endDate &&
  status === 'InProgress'
) {
  return 'Completed';
}


return status;
}


enrollmentStatusLabel(
  status: string | null | undefined
): string {

  switch (status) {

    case 'NotStarted':

      return 'لم يبدأ';


    case 'InProgress':

      return 'قيد التدريب';


    case 'Completed':

      return 'مكتمل';


    case 'Dropped':

      return 'منسحب';


    case 'Failed':

      return 'لم يجتز';


    default:

      return '—';
  }
}


enrollmentStatusClass(
  status: string | null | undefined
): string {

  switch (status) {

    case 'NotStarted':

      return 'neutral';


    case 'InProgress':

      return 'good';


    case 'Completed':

      return 'excellent';


    case 'Dropped':

      return 'neutral';


    case 'Failed':

      return 'support';


    default:

      return 'neutral';
  }
}


canEvaluateEnrollment(
  enrollment: EnrollmentDto
): boolean {

  return (
    this.effectiveEnrollmentStatus(
      enrollment
    ) === 'InProgress'
  );
}
canShowTrainingMetrics(
  enrollment: EnrollmentDto
): boolean {

  return (
    this.effectiveEnrollmentStatus(
      enrollment
    ) !== 'NotStarted'
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

  evaluationModules =
  signal<ModuleDto[]>([]);

selectedModuleId:
  number | null = null;

evaluationStages =
  signal<number[]>([]);

selectedStage:
  number | null = null;

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
// EDIT CRITERION STATE
// =====================================================

editingCriterionId =
  signal<number | null>(
    null
  );

criterionEditForm = {
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

         this.batches.set(
             batches
                  );
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
          this.batches.set(  []);

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


          this.loadEvaluationAverages(
            enrollments
          );


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
  // TRAINEE PROFILE METHODS
  // =====================================================

  openTraineeProfile(
    enrollmentId: number
  ): void {

    this.selectedProfileEnrollmentId.set(
      enrollmentId
    );

    this.showTraineeProfile.set(
      true
    );
  }


  closeTraineeProfile(): void {

    this.showTraineeProfile.set(
      false
    );

    this.selectedProfileEnrollmentId.set(
      null
    );
  }


 startEvaluationFromProfile(): void {

  const enrollment =
    this.selectedProfileEnrollment();


  if (
    !enrollment ||
    !this.canEvaluateEnrollment(enrollment)
  ) {
    return;
  }


  const enrollmentId =
    enrollment.enrollmentId;


  this.closeTraineeProfile();


  this.openEval(
    enrollmentId
  );
}
// =====================================================
// LOAD EVALUATION MODULES
// =====================================================

private loadEvaluationModules(
  batchId: number
): void {

  this.evaluationModules.set(
    []
  );

  this.selectedModuleId =
    null;

  this.templateDetail.set(
    null
  );

  this.criteriaScores = {};


  this.api
    .getBatch(
      batchId
    )
    .subscribe({

      next: (batch) => {

        this.api
          .getModulesByProgram(
            batch.programId
          )
          .subscribe({

            next: (modules) => {

              const activeModules =
                (modules ?? [])
                  .filter(
                    module =>
                      !module.isArchived
                  )
                  .sort(
                    (a, b) =>
                      a.orderIndex -
                      b.orderIndex
                  );


              this.evaluationModules.set(
                activeModules
              );


              const firstModule =
                activeModules[0];


              if (!firstModule) {

                this.templateDetail.set(
                  null
                );

                return;
              }


              this.selectedModuleId =
                firstModule.moduleId;


              this.loadEvaluationStages();

            },


            error: (err) => {

              console.error(
                'خطأ في تحميل وحدات التقييم:',
                err
              );

              this.evaluationModules.set(
                []
              );

            }

          });

      },


      error: (err) => {

        console.error(
          'خطأ في تحميل بيانات الدفعة للتقييم:',
          err
        );

      }

    });

}
// =====================================================
// LOAD EVALUATION STAGES
// =====================================================

loadEvaluationStages(): void {

  if (!this.selectedModuleId) {

    this.evaluationStages.set([]);

    this.selectedStage = null;

    this.templateDetail.set(null);

    this.criteriaScores = {};

    return;
  }


  this.api
    .getEvaluationTemplates(
      this.selectedModuleId
    )
    .subscribe({

      next: (templates) => {

        const stages =
          [
            ...new Set(
              (templates ?? [])
                .map(
                  template =>
                    template.stage
                )
                .filter(
                  (stage):
                    stage is number =>
                      typeof stage ===
                      'number'
                )
            )
          ]
            .sort(
              (a, b) =>
                a - b
            );


        this.evaluationStages.set(
          stages
        );


        this.selectedStage =
          stages[0] ?? null;


        if (
          this.selectedStage !== null
        ) {

          this.loadTemplates();

        }
        else {

          this.templateDetail.set(
            null
          );

          this.criteriaScores = {};

        }

      },


      error: (err) => {

        console.error(
          'خطأ في تحميل فترات التقييم:',
          err
        );

        this.evaluationStages.set([]);

        this.selectedStage = null;

        this.templateDetail.set(null);

        this.criteriaScores = {};

      }

    });

}
  // =====================================================
  // EVALUATION TEMPLATES
  // =====================================================

  loadTemplates(): void {


       if (
    !this.selectedModuleId ||
    this.selectedStage === null
  ) {

    this.templateDetail.set(
      null
    );

    this.criteriaScores = {};

    return;
  }


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

    const enrollment =
      this.enrollments()
        .find(
          item =>
            item.enrollmentId ===
            enrollmentId
        );


   if (
  !enrollment ||
  !this.canEvaluateEnrollment(
    enrollment
  )
) {

  console.warn(
    'لا يمكن تقييم هذا المتدرب حاليًا'
  );

  return;
}


   this.selectedEnrollmentId =
  enrollmentId;


this.loadEvaluationModules(
  enrollment.batchId
);


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
// CRITERIA TOTAL WEIGHT
// =====================================================

criteriaTotalWeight(
  excludeCriteriaId?: number
): number {

  return this.criteria()
    .filter(
      criterion =>
        criterion.criteriaId !==
        excludeCriteriaId
    )
    .reduce(
      (total, criterion) =>
        total +
        Number(
          criterion.weight ?? 0
        ),
      0
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


  const name =
    this.newCriterion.name.trim();

  const weight =
    Number(
      this.newCriterion.weight
    );

  const maxPoints =
    Number(
      this.newCriterion.maxPoints
    );


  if (!name) {

    window.alert(
      'أدخلي اسم المعيار.'
    );

    return;
  }


  if (
    !Number.isFinite(weight) ||
    weight <= 0 ||
    weight > 100
  ) {

    window.alert(
      'أدخلي وزنًا صحيحًا من 1 إلى 100.'
    );

    return;
  }


  if (
    !Number.isFinite(maxPoints) ||
    maxPoints <= 0
  ) {

    window.alert(
      'أدخلي الحد الأقصى للدرجة بشكل صحيح.'
    );

    return;
  }
const currentWeight =
  this.criteriaTotalWeight();

const remainingWeight =
  100 - currentWeight;


if (
  currentWeight + weight > 100
) {

  window.alert(
    `لا يمكن إضافة المعيار. الوزن المتبقي هو ${remainingWeight}% فقط.`
  );

  return;
}

  this.api
    .createCriterion({

      templateId,

      name,

      weight,

      maxPoints

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


        window.alert(
          'تمت إضافة معيار التقييم بنجاح.'
        );


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


        window.alert(
          'تعذر إضافة معيار التقييم.'
        );

      }

    });

}
// =====================================================
// CANCEL ADD CRITERION
// =====================================================

cancelAddCriterion(): void {

  this.showAddCriterion.set(
    false
  );

  this.newCriterion = {
    name: '',
    weight: 0,
    maxPoints: 0
  };

}
// =====================================================
// DELETE CRITERION
// =====================================================

deleteCriterion(
  criteriaId: number,
  criterionName: string
): void {

  const templateId =
    this.templateDetail()
      ?.templateId;


  if (!templateId) {
    return;
  }


  const confirmed =
    window.confirm(
      `هل تريدين حذف معيار "${criterionName}"؟`
    );


  if (!confirmed) {
    return;
  }


  this.api
    .deleteCriterion(
      criteriaId
    )
    .subscribe({

      next: () => {

        // Reload the template so the deleted
        // criterion disappears immediately.
        this.api
          .getTemplateDetail(
            templateId
          )
          .subscribe({

            next: (detail) => {

              this.templateDetail.set(
                detail
              );


              delete this.criteriaScores[
                criteriaId
              ];

            },


            error: (err) => {

              console.error(
                'خطأ في إعادة تحميل نموذج التقييم:',
                err
              );

            }

          });

      },


      error: (err) => {

        console.error(
          'خطأ في حذف معيار التقييم:',
          err
        );


        window.alert(
          'تعذر حذف المعيار. قد يكون مستخدمًا في تقييم محفوظ.'
        );

      }

    });

}
// =====================================================
// START EDIT CRITERION
// =====================================================

startEditCriterion(
  criterion: EvaluationCriterionDto
): void {

  this.editingCriterionId.set(
    criterion.criteriaId
  );


  this.criterionEditForm = {
    name:
      criterion.name,

    weight:
      Number(
        criterion.weight
      ),

    maxPoints:
      Number(
        criterion.maxPoints
      )
  };
}


// =====================================================
// CANCEL EDIT CRITERION
// =====================================================

cancelCriterionEdit(): void {

  this.editingCriterionId.set(
    null
  );


  this.criterionEditForm = {
    name: '',
    weight: 0,
    maxPoints: 0
  };
}


// =====================================================
// SAVE CRITERION EDIT
// =====================================================

saveCriterionEdit(
  criteriaId: number
): void {

  const templateId =
    this.templateDetail()
      ?.templateId;


  if (!templateId) {
    return;
  }


  const name =
    this.criterionEditForm
      .name
      .trim();

  const weight =
    Number(
      this.criterionEditForm.weight
    );

  const maxPoints =
    Number(
      this.criterionEditForm.maxPoints
    );


  if (
    !name ||
    !Number.isFinite(weight) ||
    !Number.isFinite(maxPoints) ||
    weight <= 0 ||
    weight > 100 ||
    maxPoints <= 0
  ) {

    window.alert(
      'تأكدي من اسم المعيار والوزن والحد الأقصى.'
    );

    return;
  }

const otherCriteriaWeight =
  this.criteriaTotalWeight(
    criteriaId
  );

const remainingWeight =
  100 - otherCriteriaWeight;


if (
  otherCriteriaWeight + weight > 100
) {

  window.alert(
    `لا يمكن حفظ التعديل. أقصى وزن مسموح لهذا المعيار هو ${remainingWeight}%.`
  );

  return;
}
  this.api
    .updateCriterion(
      criteriaId,
      {
        templateId,
        name,
        weight,
        maxPoints
      }
    )
    .subscribe({

      next: () => {

        this.api
          .getTemplateDetail(
            templateId
          )
          .subscribe({

            next: (detail) => {

              this.templateDetail.set(
                detail
              );


              this.cancelCriterionEdit();

            },


            error: (err) => {

              console.error(
                'خطأ في إعادة تحميل نموذج التقييم:',
                err
              );

            }

          });

      },


      error: (err) => {

        console.error(
          'خطأ في تعديل معيار التقييم:',
          err
        );


        window.alert(
          'تعذر تعديل المعيار.'
        );

      }

    });

}// =====================================================
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


  const enrollment =
    this.enrollments()
      .find(
        item =>
          item.enrollmentId ===
          this.selectedEnrollmentId
      );


  if (
    !enrollment ||
    !this.canEvaluateEnrollment(
      enrollment
    )
  ) {

    window.alert(
      'لا يمكن تقييم هذا المتدرب حاليًا.'
    );

    return;
  }


  // First make sure criterion
  // weights total exactly 100%.
  this.api
    .checkTemplateWeights(
      template.templateId
    )
    .subscribe({

      next: (result) => {

        if (!result.isValid) {

          window.alert(
            'مجموع أوزان معايير التقييم يجب أن يساوي 100%.'
          );

          return;
        }


        const criteria =
          this.criteria();


        // There must be at least one criterion.
        if (criteria.length === 0) {

          window.alert(
            'لا توجد معايير تقييم لهذا النموذج.'
          );

          return;
        }


        // Make sure every criterion has a score.
        const hasMissingScore =
          criteria.some(
            criterion => {

              const score =
                this.criteriaScores[
                  criterion.criteriaId
                ];


              return (
                score === undefined ||
                score === null
              );
            }
          );


        if (hasMissingScore) {

          window.alert(
            'يجب إدخال درجة لكل معيار قبل حفظ التقييم.'
          );

          return;
        }


        // Make sure every score is valid
        // and does not exceed max points.
        const hasInvalidScore =
          criteria.some(
            criterion => {

              const score =
                Number(
                  this.criteriaScores[
                    criterion.criteriaId
                  ]
                );


              return (
                !Number.isFinite(score) ||
                score < 0 ||
                score >
                  criterion.maxPoints
              );
            }
          );


        if (hasInvalidScore) {

          window.alert(
            'تأكدي أن كل درجة بين 0 والحد الأقصى للمعيار.'
          );

          return;
        }


        const criteriaScores =
          criteria.map(
            criterion => ({

              criteriaId:
                criterion.criteriaId,

              score:
                Number(
                  this.criteriaScores[
                    criterion.criteriaId
                  ]
                )

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


              this.loadEvaluationAverages(
                this.enrollments()
              );


              window.alert(
                'تم حفظ التقييم بنجاح.'
              );

            },


            error: (err) => {

              console.error(
                'خطأ في حفظ التقييم:',
                err
              );


              window.alert(
                'تعذر حفظ التقييم.'
              );

            }

          });

      },


      error: (err) => {

        console.error(
          'خطأ في التحقق من أوزان التقييم:',
          err
        );


        window.alert(
          'تعذر التحقق من مجموع أوزان معايير التقييم.'
        );

      }

    });

}
}