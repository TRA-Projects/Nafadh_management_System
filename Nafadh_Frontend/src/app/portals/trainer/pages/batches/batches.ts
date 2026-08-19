import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
    CommonModule
  ],
  templateUrl: './batches.html',
  styleUrl: './batch.scss'
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


  // =====================================================
  // EXTRA BATCH DATA
  // =====================================================

  traineeCounts =
    signal<Record<number, number>>({});

  programNames =
    signal<Record<number, string>>({});


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

  private loadCurrentTrainer(): void {

    const userId =
      this.auth.session()?.userId;


    if (!userId) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي.'
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
            'تعذر تحميل بيانات المدرب.'
          );

          this.batches.set([]);

        }

      });

  }


  // =====================================================
  // LOAD BATCHES
  // =====================================================

  private loadBatches(
    trainerId: number
  ): void {

    this.api
      .getMyBatches(trainerId)
      .subscribe({

        next: (data) => {

          const result =
            (data ?? [])
              .map(batch => ({

                ...batch,

                status:
                  this.calculateBatchStatus(
                    batch
                  )

              }))
              .sort(
                (a, b) =>
                  this.compareBatches(
                    a,
                    b
                  )
              );


          this.batches.set(
            result
          );


          this.traineeCounts.set({});

          this.programNames.set({});


          result.forEach(batch => {

            this.loadBatchTraineeCount(
              batch.batchId
            );

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
            'تعذر تحميل دفعات المدرب.'
          );

        }

      });

  }


  // =====================================================
  // SORT BATCHES
  // =====================================================

  private compareBatches(
    a: TrainerBatchDto,
    b: TrainerBatchDto
  ): number {

    const priority: Record<
      TrainerBatchDto['status'],
      number
    > = {

      Ongoing: 0,
      Upcoming: 1,
      Completed: 2,
      Cancelled: 3

    };


    const statusDifference =
      priority[a.status] -
      priority[b.status];


    if (
      statusDifference !== 0
    ) {

      return statusDifference;

    }


    const aDate =
      a.startDate
        ? new Date(
            a.startDate
          ).getTime()
        : Number.MAX_SAFE_INTEGER;


    const bDate =
      b.startDate
        ? new Date(
            b.startDate
          ).getTime()
        : Number.MAX_SAFE_INTEGER;


    return aDate - bDate;

  }


  // =====================================================
  // TRAINEE COUNT
  // =====================================================

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
  // PROGRAM NAME
  // =====================================================

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
                  `Error loading program ${programId}:`,
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
            `Error loading batch ${batchId}:`,
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
      new Date(
        batch.startDate
      );

    startDate.setHours(
      0,
      0,
      0,
      0
    );


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
      new Date(
        batch.startDate
      );

    startDate.setHours(
      0,
      0,
      0,
      0
    );


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


    if (
      today <= startDate
    ) {

      return 0;

    }


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
  // TIME LABEL
  // =====================================================

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
        ? new Date(
            batch.startDate
          )
        : new Date(
            batch.endDate
          );


    targetDate.setHours(
      0,
      0,
      0,
      0
    );


    const millisecondsPerDay =
      1000 *
      60 *
      60 *
      24;


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

  }


  back(): void {

    this.selected.set(
      null
    );

  }


  // =====================================================
  // NAVIGATION
  // =====================================================

  openSection(
    sectionName:
      | 'content'
      | 'tasks'
      | 'evaluations'
      | 'trainees'
  ): void {

    const batch =
      this.selected();


    if (!batch) {

      return;

    }


    const routes = {

      content:
        '/trainer/content',

      tasks:
        '/trainer/tasks',

      evaluations:
        '/trainer/trainees',

      trainees:
        '/trainer/trainees'

    };


    this.router.navigate(
      [
        routes[
          sectionName
        ]
      ],
      {
        queryParams: {

          batchId:
            batch.batchId

        }
      }
    );

  }


  // =====================================================
  // BATCH IMAGE
  // =====================================================

getBatchImage(
  batchId: number
): string {

  const images = [

    // Laptop / Programming
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=85',

    // Cyber / Matrix
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=85',

    // Cybersecurity
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=900&q=85',

    // Team Programming
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=85',

    // Code Screen
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=85',

    // Developer Workspace
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=85',

    // Laptop Coding
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=900&q=85',

    // Programming Screen
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=85',

    // Technology
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85',

    // Software Development
    'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=900&q=85',

    // Coding
    'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=900&q=85',

    // Computer Workspace
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=900&q=85'

  ];


  const imageIndex =
    Math.abs(batchId) %
    images.length;


  return images[imageIndex];

}

}