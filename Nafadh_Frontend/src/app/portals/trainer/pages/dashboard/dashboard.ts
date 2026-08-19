import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  EnrollmentDto,
  SessionDto,
  TrainerBatchDto,
  TrainerDto
} from '../../../../core/models/dtos';


@Component({
  selector: 'app-trainer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class TrainerDashboard implements OnInit {

  // =====================================================
  // STATE
  // =====================================================

  // بيانات المدرب الحالي
  trainer = signal<TrainerDto | null>(null);

  // جميع الدفعات المسندة للمدرب
  batches = signal<TrainerBatchDto[]>([]);

  // جميع جلسات المدرب
  sessions = signal<SessionDto[]>([]);

  // عدد المتدربين الفريدين في جميع دفعات المدرب
  traineeCount = signal(0);


  // =====================================================
  // UPCOMING SESSIONS
  // =====================================================

  /**
   * Returns only future scheduled/postponed sessions,
   * ordered by session date and start time.
   */
  upcomingSessions = computed(() => {

    const now = Date.now();

    return [...this.sessions()]
      .filter(session => {

        const isUpcomingStatus =
          session.status === 'Scheduled' ||
          session.status === 'Postponed';

        const sessionDateTime =
          this.getSessionDateTime(session);

        return (
          isUpcomingStatus &&
          sessionDateTime >= now
        );
      })
      .sort(
        (a, b) =>
          this.getSessionDateTime(a) -
          this.getSessionDateTime(b)
      );
  });


  // =====================================================
  // DASHBOARD BATCHES
  // =====================================================

  /**
   * Shows the two most relevant trainer batches.
   *
   * Priority:
   * 1. Ongoing
   * 2. Upcoming
   * 3. Completed
   * 4. Cancelled
   */
  dashboardBatches = computed(() => {

  const priority: Record<
    TrainerBatchDto['status'],
    number
  > = {
    Ongoing: 0,
    Upcoming: 1,
    Completed: 2,
    Cancelled: 3
  };


  return [...this.batches()]
    .sort((a, b) => {

      const statusDifference =
        priority[a.status] -
        priority[b.status];


      // أولاً نرتب حسب حالة الدفعة
      if (statusDifference !== 0) {
        return statusDifference;
      }


      // إذا كانت نفس الحالة
      // نرتب حسب تاريخ البداية
      const aDate =
        a.startDate
          ? new Date(a.startDate).getTime()
          : Number.MAX_SAFE_INTEGER;


      const bDate =
        b.startDate
          ? new Date(b.startDate).getTime()
          : Number.MAX_SAFE_INTEGER;


      return aDate - bDate;

    })
    .slice(0, 2);

});


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    public auth: AuthService
  ) {}


  // =====================================================
  // INITIALIZATION
  // =====================================================

  ngOnInit(): void {
    this.loadCurrentTrainer();
  }


  // =====================================================
  // CURRENT TRAINER
  // =====================================================

  /**
   * Loads the trainer profile associated with the
   * currently logged-in user.
   *
   * Login UserId
   *      ↓
   * Trainer profile
   *      ↓
   * Real TrainerId
   *      ↓
   * Batches + Sessions
   */
  private loadCurrentTrainer(): void {

    const userId =
      this.auth.session()?.userId;

    if (!userId) {

      console.error(
        'لم يتم العثور على UserId للمستخدم الحالي'
      );

      return;
    }


    this.api
      .getTrainerByUserId(userId)
      .subscribe({

        next: (trainer) => {

          this.trainer.set(trainer);

          // تحميل دفعات المدرب الحقيقي
          this.loadBatches(
            trainer.trainerId
          );

          // تحميل جلسات المدرب الحقيقي
          this.loadSessions(
            trainer.trainerId
          );
        },


        error: (err) => {

          console.error(
            'خطأ في تحميل بيانات المدرب:',
            err
          );
        }

      });
  }


  // =====================================================
  // BATCHES
  // =====================================================

  /**
   * Loads all batches assigned to the current trainer.
   *
   * The batch status is recalculated from the start
   * and end dates before storing the data.
   */
  private loadBatches(
    trainerId: number
  ): void {

    this.api
      .getMyBatches(trainerId)
      .subscribe({

        next: (data) => {

          const batches =
            (data ?? []).map(batch => ({
              ...batch,

              status:
                this.calculateBatchStatus(batch)
            }));

          this.batches.set(
            batches
          );

          // بعد معرفة دفعات المدرب،
          // نحسب المتدربين الموجودين داخلها
          this.loadTraineeCount(
            batches
          );
        },


        error: (err) => {

          console.error(
            'خطأ في تحميل دفعات المدرب:',
            err
          );

          this.batches.set([]);

          this.traineeCount.set(0);
        }

      });
  }


  // =====================================================
  // BATCH STATUS
  // =====================================================

  /**
   * Calculates the batch status using its dates.
   *
   * Cancelled batches always remain cancelled.
   *
   * Before StartDate  -> Upcoming
   * During batch      -> Ongoing
   * After EndDate     -> Completed
   */
  private calculateBatchStatus(
    batch: TrainerBatchDto
  ): TrainerBatchDto['status'] {

    // إذا كانت الدفعة ملغاة، تبقى ملغاة
    if (batch.status === 'Cancelled') {
      return 'Cancelled';
    }


    // إذا ما كانت التواريخ موجودة،
    // نستخدم الحالة القادمة من الـ API
    if (!batch.startDate || !batch.endDate) {
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


    // إذا التاريخ الحالي قبل بداية الدفعة
    if (today < startDate) {
      return 'Upcoming';
    }


    // إذا التاريخ الحالي بعد نهاية الدفعة
    if (today > endDate) {
      return 'Completed';
    }


    // إذا اليوم بين البداية والنهاية
    return 'Ongoing';
  }


  // =====================================================
  // TRAINEES
  // =====================================================

  /**
   * Calculates the number of unique trainees
   * enrolled in all batches assigned to the trainer.
   *
   * A trainee is counted only once even if the trainee
   * appears in more than one enrollment/batch.
   */
  private loadTraineeCount(
    batches: TrainerBatchDto[]
  ): void {

    // لا توجد دفعات
    if (batches.length === 0) {

      this.traineeCount.set(0);

      return;
    }


    // نطلب Enrollment لكل دفعة
    const requests =
      batches.map(batch =>

        this.api
          .getEnrollments(
            undefined,
            batch.batchId
          )
          .pipe(

            // إذا فشل طلب دفعة واحدة
            // لا نخلي بقية Dashboard تفشل
            catchError(err => {

              console.error(
                `خطأ في تحميل متدربي الدفعة ${batch.batchId}:`,
                err
              );

              return of(
                [] as EnrollmentDto[]
              );
            })
          )
      );


    // تنفيذ جميع الطلبات معًا
    forkJoin(requests)
      .subscribe({

        next: (results) => {

          const uniqueTraineeIds =
            new Set<number>();


          results
            .flat()
            .forEach(enrollment => {

              uniqueTraineeIds.add(
                enrollment.traineeId
              );

            });


          this.traineeCount.set(
            uniqueTraineeIds.size
          );
        },


        error: (err) => {

          console.error(
            'خطأ في حساب عدد المتدربين:',
            err
          );

          this.traineeCount.set(0);
        }

      });
  }


  // =====================================================
  // SESSIONS
  // =====================================================

  /**
   * Loads all sessions assigned to the current trainer.
   */
  private loadSessions(
    trainerId: number
  ): void {

    this.api
      .getTrainerSessions(trainerId)
      .subscribe({

        next: (data) => {

          this.sessions.set(
            data ?? []
          );
        },


        error: (err) => {

          console.error(
            'خطأ في تحميل جلسات المدرب:',
            err
          );

          this.sessions.set([]);
        }

      });
  }


  /**
   * Combines SessionDate and StartTime into one timestamp
   * so sessions can be filtered and sorted correctly.
   */
  private getSessionDateTime(
    session: SessionDto
  ): number {

    // Backend may return:
    // 2026-08-19
    // or:
    // 2026-08-19T00:00:00

    const datePart =
      session.sessionDate.split('T')[0];


    let timePart =
      session.startTime ||
      '23:59:59';


    // Handles HH:mm values
    if (timePart.length === 5) {

      timePart += ':00';
    }


    const timestamp =
      new Date(
        `${datePart}T${timePart}`
      ).getTime();


    return Number.isNaN(timestamp)
      ? 0
      : timestamp;
  }


  // =====================================================
  // DISPLAY LABELS
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


  getSessionStatusLabel(
    status: string
  ): string {

    switch (status) {

      case 'Scheduled':
        return 'مجدولة';

      case 'Postponed':
        return 'مؤجلة';

      case 'Completed':
        return 'مكتملة';

      case 'Cancelled':
        return 'ملغاة';

      default:
        return status;
    }
  }

}