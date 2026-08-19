import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  TrainerBatchDto,
  TrainerDto
} from '../../../../core/models/dtos';


@Component({
  selector: 'app-trainer-batches',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './batches.html'
})
export class TrainerBatches implements OnInit {

  // =====================================================
  // TRAINER
  // =====================================================

  trainer =
    signal<TrainerDto | null>(null);


  // =====================================================
  // BATCHES
  // =====================================================

  batches =
    signal<TrainerBatchDto[]>([]);

  selected =
    signal<TrainerBatchDto | null>(null);

  loading =
    signal(false);

  errorMessage =
    signal('');


  // عدد المتدربين الحقيقي لكل دفعة
  traineeCounts =
    signal<Record<number, number>>({});


  // اسم البرنامج الحقيقي لكل دفعة
  programNames =
    signal<Record<number, string>>({});


  // =====================================================
  // ACTIVE SECTION
  // =====================================================

  activeSection =
    signal<string | null>(null);


  // =====================================================
  // ANNOUNCEMENT
  // =====================================================

  showAnnounce =
    signal(false);

  announceMsg = '';


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    private auth: AuthService,
    private router: Router
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.loadCurrentTrainer();

  }


  // =====================================================
  // CURRENT TRAINER
  // =====================================================

  /**
   * Loads the trainer linked to the currently
   * logged-in user.
   */
  private loadCurrentTrainer(): void {

    const userId =
      this.auth.session()?.userId;


    if (!userId) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );

      this.batches.set([]);

      return;
    }


    this.loading.set(true);

    this.errorMessage.set('');


    this.api
      .getTrainerByUserId(userId)
      .subscribe({

        next: (trainer) => {

          this.trainer.set(
            trainer
          );

          this.loadBatches(
            trainer.trainerId
          );

        },


        error: (error) => {

          console.error(
            'Error loading trainer:',
            error
          );

          this.loading.set(false);

          this.errorMessage.set(
            'تعذر تحميل بيانات المدرب'
          );

          this.batches.set([]);

        }

      });

  }


  // =====================================================
  // LOAD BATCHES
  // =====================================================

  /**
   * Loads only the batches assigned to the
   * current trainer and recalculates their status
   * using the real start/end dates.
   */
  private loadBatches(
    trainerId: number
  ): void {

    this.api
      .getMyBatches(trainerId)
      .subscribe({

        next: (data) => {

          const result =
            (data ?? []).map(batch => ({

              ...batch,

              status:
                this.calculateBatchStatus(batch)

            }));


          this.batches.set(
            result
          );


          // تنظيف البيانات السابقة
          this.traineeCounts.set({});

          this.programNames.set({});


          // تحميل البيانات الإضافية لكل دفعة
          result.forEach(batch => {

            // عدد المتدربين الحقيقي
            this.loadBatchTraineeCount(
              batch.batchId
            );


            // اسم البرنامج الحقيقي
            this.loadBatchProgramName(
              batch.batchId
            );

          });


          this.loading.set(false);

        },


        error: (error) => {

          console.error(
            'Error loading batches:',
            error
          );

          this.loading.set(false);

          this.batches.set([]);

          this.traineeCounts.set({});

          this.programNames.set({});

          this.errorMessage.set(
            'تعذر تحميل دفعات المدرب'
          );

        }

      });

  }


  // =====================================================
  // BATCH TRAINEE COUNT
  // =====================================================

  /**
   * Loads the real number of unique trainees
   * enrolled in a specific batch.
   */
  private loadBatchTraineeCount(
    batchId: number
  ): void {

    this.api
      .getEnrollments(
        undefined,
        batchId
      )
      .subscribe({

        next: (enrollments) => {

          const uniqueTraineeIds =
            new Set(
              (enrollments ?? [])
                .map(
                  enrollment =>
                    enrollment.traineeId
                )
            );


          this.traineeCounts.update(
            current => ({

              ...current,

              [batchId]:
                uniqueTraineeIds.size

            })
          );

        },


        error: (error) => {

          console.error(
            `Error loading trainees for batch ${batchId}:`,
            error
          );


          this.traineeCounts.update(
            current => ({

              ...current,

              [batchId]: 0

            })
          );

        }

      });

  }


  // =====================================================
  // BATCH PROGRAM NAME
  // =====================================================

  /**
   * First loads the full batch details to get ProgramId,
   * then loads the real program name.
   */
  private loadBatchProgramName(
    batchId: number
  ): void {

    this.api
      .getBatch(batchId)
      .subscribe({

        next: (batchDetails) => {

          const programId =
            batchDetails.programId;


          if (!programId) {

            this.programNames.update(
              current => ({

                ...current,

                [batchId]:
                  'اسم البرنامج غير متوفر'

              })
            );

            return;
          }


          this.api
            .getProgram(programId)
            .subscribe({

              next: (program) => {

                const programName =
                  program.title ||
                  program.name ||
                  'اسم البرنامج غير متوفر';


                this.programNames.update(
                  current => ({

                    ...current,

                    [batchId]:
                      programName

                  })
                );

              },


              error: (error) => {

                console.error(
                  `Error loading program ${programId} for batch ${batchId}:`,
                  error
                );


                this.programNames.update(
                  current => ({

                    ...current,

                    [batchId]:
                      'اسم البرنامج غير متوفر'

                  })
                );

              }

            });

        },


        error: (error) => {

          console.error(
            `Error loading batch details for batch ${batchId}:`,
            error
          );


          this.programNames.update(
            current => ({

              ...current,

              [batchId]:
                'اسم البرنامج غير متوفر'

            })
          );

        }

      });

  }


  // =====================================================
  // BATCH STATUS
  // =====================================================

  /**
   * Calculates the status from the actual batch dates.
   *
   * Before StartDate -> Upcoming
   * Between dates    -> Ongoing
   * After EndDate    -> Completed
   * Cancelled        -> remains Cancelled
   */
  private calculateBatchStatus(
    batch: TrainerBatchDto
  ): TrainerBatchDto['status'] {

    if (
      batch.status === 'Cancelled'
    ) {

      return 'Cancelled';

    }


    if (
      !batch.startDate ||
      !batch.endDate
    ) {

      return batch.status;

    }


    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );


    const startDate =
      new Date(batch.startDate);

    startDate.setHours(
      0,
      0,
      0,
      0
    );


    const endDate =
      new Date(batch.endDate);

    endDate.setHours(
      0,
      0,
      0,
      0
    );


    if (
      today < startDate
    ) {

      return 'Upcoming';

    }


    if (
      today > endDate
    ) {

      return 'Completed';

    }


    return 'Ongoing';

  }


  // =====================================================
  // TIME PROGRESS
  // =====================================================

  /**
   * Calculates the percentage of the batch duration
   * that has already passed.
   */
  getTimeProgress(
    batch: TrainerBatchDto
  ): number {

    if (
      !batch.startDate ||
      !batch.endDate
    ) {

      return 0;

    }


    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );


    const startDate =
      new Date(batch.startDate);

    startDate.setHours(
      0,
      0,
      0,
      0
    );


    const endDate =
      new Date(batch.endDate);

    endDate.setHours(
      0,
      0,
      0,
      0
    );


    // الدفعة لم تبدأ بعد
    if (
      today <= startDate
    ) {

      return 0;

    }


    // الدفعة انتهت
    if (
      today >= endDate
    ) {

      return 100;

    }


    const totalDuration =
      endDate.getTime() -
      startDate.getTime();


    const elapsedDuration =
      today.getTime() -
      startDate.getTime();


    if (
      totalDuration <= 0
    ) {

      return 0;

    }


    return Math.round(
      (
        elapsedDuration /
        totalDuration
      ) * 100
    );

  }


  // =====================================================
  // BATCH TIME LABEL
  // =====================================================

  /**
   * Shows a useful time label depending on
   * the current batch status.
   */
  getBatchTimeLabel(
    batch: TrainerBatchDto
  ): string {

    if (
      !batch.startDate ||
      !batch.endDate
    ) {

      return 'غير محدد';

    }


    if (
      batch.status === 'Cancelled'
    ) {

      return 'ملغاة';

    }


    if (
      batch.status === 'Completed'
    ) {

      return 'انتهت';

    }


    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );


    const targetDate =
      batch.status === 'Upcoming'
        ? new Date(batch.startDate)
        : new Date(batch.endDate);


    targetDate.setHours(
      0,
      0,
      0,
      0
    );


    const millisecondsPerDay =
      1000 * 60 * 60 * 24;


    const days =
      Math.max(
        0,
        Math.ceil(
          (
            targetDate.getTime() -
            today.getTime()
          ) /
          millisecondsPerDay
        )
      );


    if (
      batch.status === 'Upcoming'
    ) {

      if (
        days === 0
      ) {

        return 'تبدأ اليوم';

      }


      return `تبدأ بعد ${days} يوم`;

    }


    if (
      days === 0
    ) {

      return 'تنتهي اليوم';

    }


    return `متبقي ${days} يوم`;

  }


  // =====================================================
  // STATUS LABEL
  // =====================================================

  getBatchStatusLabel(
    status: string
  ): string {

    switch (status) {

      case 'Upcoming':
        return 'قادمة';

      case 'Ongoing':
        return 'نشطة';

      case 'Completed':
        return 'مكتملة';

      case 'Cancelled':
        return 'ملغاة';

      default:
        return status;

    }

  }


  // =====================================================
  // SELECT BATCH
  // =====================================================

  select(
    batch: TrainerBatchDto
  ): void {

    this.selected.set(
      batch
    );

    this.activeSection.set(
      null
    );

  }


  // =====================================================
  // BACK
  // =====================================================

  back(): void {

    if (
      this.activeSection() !== null
    ) {

      this.activeSection.set(
        null
      );

    } else {

      this.selected.set(
        null
      );

    }

  }


  // =====================================================
  // OPEN SECTION
  // =====================================================

  openSection(
    sectionName: string
  ): void {

    const batch =
      this.selected();


    if (!batch) {

      return;

    }


    // CONTENT
    if (
      sectionName === 'content'
    ) {

      this.router.navigate(
        ['/trainer/content'],
        {
          queryParams: {
            batchId:
              batch.batchId
          }
        }
      );

      return;

    }


    // TASKS
    if (
      sectionName === 'tasks'
    ) {

      this.router.navigate(
        ['/trainer/tasks'],
        {
          queryParams: {
            batchId:
              batch.batchId
          }
        }
      );

      return;

    }


    // EVALUATIONS
    if (
      sectionName === 'evaluations'
    ) {

      this.router.navigate(
        ['/trainer/trainees'],
        {
          queryParams: {
            batchId:
              batch.batchId
          }
        }
      );

      return;

    }


    // TRAINEES
    if (
      sectionName === 'trainees'
    ) {

      this.router.navigate(
        ['/trainer/trainees'],
        {
          queryParams: {
            batchId:
              batch.batchId
          }
        }
      );

      return;

    }

  }


  // =====================================================
  // SET SECTION
  // =====================================================

  setSection(
    sectionName: string | null
  ): void {

    this.activeSection.set(
      sectionName
    );

  }


  // =====================================================
  // BATCH IMAGE
  // =====================================================

  getBatchImage(
    index: number
  ): string {

    const images = [

      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',

      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',

      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',

      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80',

      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80'

    ];


    return images[
      index % images.length
    ];

  }


  // =====================================================
  // POST ANNOUNCEMENT
  // =====================================================

  postAnnouncement(): void {

    const batch =
      this.selected();

    const userId =
      this.auth.session()?.userId;


    if (
      !batch ||
      !userId ||
      !this.announceMsg.trim()
    ) {

      return;

    }


    this.api
      .postAnnouncement({

        scopeType:
          'Batch',

        scopeId:
          batch.batchId,

        message:
          this.announceMsg.trim(),

        createdByUserId:
          userId

      })
      .subscribe({

        next: () => {

          this.showAnnounce.set(
            false
          );

          this.announceMsg = '';

        },


        error: (error) => {

          console.error(
            'Error posting announcement:',
            error
          );

        }

      });

  }

}