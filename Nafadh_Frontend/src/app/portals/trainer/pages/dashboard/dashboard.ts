import {
  Component,
  OnInit,
  computed,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  forkJoin,
  of
} from 'rxjs';

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
  imports: [
    CommonModule,
    RouterLink,
    FormsModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class TrainerDashboard implements OnInit {

  // =====================================================
  // STATE
  // =====================================================

  trainer =
    signal<TrainerDto | null>(null);

  batches =
    signal<TrainerBatchDto[]>([]);

  sessions =
    signal<SessionDto[]>([]);

  traineeCount =
    signal(0);

  // =====================================================
  // MONTHLY CALENDAR
  // =====================================================

  calendarDate = signal(new Date());

  selectedCalendarDate =
    signal<string | null>(null);


  calendarMonthTitle = computed(() => {

    return this.calendarDate().toLocaleDateString(
      'ar-OM',
      {
        month: 'long',
        year: 'numeric'
      }
    );

  });


  calendarDays = computed(() => {

    const currentDate =
      this.calendarDate();

    const year =
      currentDate.getFullYear();

    const month =
      currentDate.getMonth();

    const firstDay =
      new Date(
        year,
        month,
        1
      );

    const lastDay =
      new Date(
        year,
        month + 1,
        0
      );

    /*
     * JavaScript:
     * Sunday = 0
     *
     * We want Saturday -> Friday
     * because the interface is Arabic.
     *
     * Convert:
     * Saturday = 0
     * Sunday   = 1
     * ...
     * Friday   = 6
     */

    const firstDayIndex =
      (firstDay.getDay() + 1) % 7;

    const daysInMonth =
      lastDay.getDate();

    const days: Array<{
      date: Date;
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      sessions: SessionDto[];
    }> = [];


    // Previous month days
    for (
      let i = firstDayIndex - 1;
      i >= 0;
      i--
    ) {

      const date =
        new Date(
          year,
          month,
          -i
        );

      days.push(
        this.createCalendarDay(
          date,
          false
        )
      );

    }


    // Current month days
    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {

      const date =
        new Date(
          year,
          month,
          day
        );

      days.push(
        this.createCalendarDay(
          date,
          true
        )
      );

    }


    // Next month days
    let nextDay = 1;

    while (
      days.length < 42
    ) {

      const date =
        new Date(
          year,
          month + 1,
          nextDay++
        );

      days.push(
        this.createCalendarDay(
          date,
          false
        )
      );

    }


    return days;

  });


  selectedDaySessions = computed(() => {

    const selectedDate =
      this.selectedCalendarDate();

    if (!selectedDate) {

      return [];

    }

    return this.sessions()
      .filter(session =>
        this.getSessionDateKey(session) ===
        selectedDate
      )
      .sort(
        (a, b) =>
          this.getSessionDateTime(a) -
          this.getSessionDateTime(b)
      );

  });

  completeSession(session: SessionDto): void {
    if (session.status === 'Completed') {
      return;
    }

    this.api.updateSessionStatus(session.sessionId, 1).subscribe({
      next: () => {
        this.sessions.update(sessions =>
          sessions.map(item =>
            item.sessionId === session.sessionId
              ? { ...item, status: 'Completed' }
              : item
          )
        );
      },
      error: (error) => {
        console.error('Failed to complete session:', error);
      }
    });
  }

  private createCalendarDay(
    date: Date,
    isCurrentMonth: boolean
  ) {

    const dateKey =
      this.formatDateKey(date);

    return {

      date,

      dateKey,

      dayNumber:
        date.getDate(),

      isCurrentMonth,

      isToday:
        dateKey ===
        this.formatDateKey(
          new Date()
        ),

      sessions:
        this.sessions().filter(
          session =>
            this.getSessionDateKey(session) ===
            dateKey
        )

    };

  }


  private formatDateKey(
    date: Date
  ): string {

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;

  }


  private getSessionDateKey(
    session: SessionDto
  ): string {

    if (!session.sessionDate) {
      return '';
    }

    const value =
      String(session.sessionDate).trim();

    // ISO:
    // 2026-10-07T00:00:00
    if (value.includes('T')) {
      return value.split('T')[0];
    }

    // ISO with space:
    // 2026-10-07 00:00:00
    if (value.includes(' ')) {
      return value.split(' ')[0];
    }

    // Date only:
    // 2026-10-07
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const parsed =
      new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return this.formatDateKey(parsed);
  }


  selectCalendarDate(
    dateKey: string
  ): void {

    this.selectedCalendarDate.set(
      dateKey
    );

  }


  previousMonth(): void {

    const current =
      this.calendarDate();

    this.calendarDate.set(
      new Date(
        current.getFullYear(),
        current.getMonth() - 1,
        1
      )
    );

  }


  nextMonth(): void {

    const current =
      this.calendarDate();

    this.calendarDate.set(
      new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        1
      )
    );

  }


  goToToday(): void {

    const today =
      new Date();

    this.calendarDate.set(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    this.selectedCalendarDate.set(
      this.formatDateKey(today)
    );

  }

  // =====================================================
  // UPCOMING SESSIONS
  // =====================================================

  upcomingSessions = computed(() => {
    const now = Date.now();

    return [...this.sessions()]
      .filter((session) => {
        const status = String(session.status).toLowerCase();

        const isUpcomingStatus =
          status === '0' ||
          status === '1' ||
          status === 'scheduled' ||
          status === 'postponed';

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

  dashboardBatches =
    computed(() => {

      const priority: Record<
        TrainerBatchDto['status'],
        number
      > = {

        Ongoing: 0,
        Upcoming: 1,
        Completed: 2,
        Cancelled: 3

      };


      return [
        ...this.batches()
      ]
        .sort((a, b) => {

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

        })
        .slice(
          0,
          2
        );

    });


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    public auth: AuthService
  ) { }


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

      console.error(
        'لم يتم العثور على UserId للمستخدم الحالي'
      );

      return;
    }


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

  private loadBatches(
    trainerId: number
  ): void {

    this.api
      .getMyBatches(trainerId)
      .subscribe({

        next: (data) => {

          const batches =
            (data ?? [])
              .map(batch => ({

                ...batch,

                status:
                  this.calculateBatchStatus(
                    batch
                  )

              }));


          this.batches.set(
            batches
          );


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
  // TRAINEES
  // =====================================================

  private loadTraineeCount(
    batches: TrainerBatchDto[]
  ): void {

    if (
      batches.length === 0
    ) {

      this.traineeCount.set(0);

      return;
    }


    const requests =
      batches.map(batch =>

        this.api
          .getEnrollments(
            undefined,
            batch.batchId
          )
          .pipe(

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


    forkJoin(requests)
      .subscribe({

        next: (results) => {

          const uniqueTraineeIds =
            new Set<number>();


          results
            .flat()
            .forEach(
              enrollment => {

                uniqueTraineeIds.add(
                  enrollment.traineeId
                );

              }
            );


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

  private loadSessions(
    trainerId: number
  ): void {

    this.api
      .getTrainerSessions(
        trainerId
      )
      .subscribe({

        next: (data) => {

          const sessions =
            data ?? [];

          this.sessions.set(
            sessions
          );

          // =========================================
          // فتح التقويم على أقرب جلسة قادمة
          // =========================================

          const now =
            Date.now();

          const upcoming =
            sessions
              .filter(session => {

                const status =
                  String(session.status)
                    .toLowerCase();

                const isUpcomingStatus =
                  status === 'scheduled' ||
                  status === 'postponed';

                return (
                  isUpcomingStatus &&
                  this.getSessionDateTime(session) >= now
                );

              })
              .sort(
                (a, b) =>
                  this.getSessionDateTime(a) -
                  this.getSessionDateTime(b)
              );

          if (upcoming.length > 0) {

            const nextSession =
              upcoming[0];

            const sessionDate =
              new Date(
                nextSession.sessionDate
              );

            this.calendarDate.set(
              new Date(
                sessionDate.getFullYear(),
                sessionDate.getMonth(),
                1
              )
            );

            this.selectedCalendarDate.set(
              this.getSessionDateKey(
                nextSession
              )
            );

          } else {

            // لا توجد جلسات قادمة:
            // نعرض الشهر الحالي

            const today =
              new Date();

            this.calendarDate.set(
              new Date(
                today.getFullYear(),
                today.getMonth(),
                1
              )
            );

            this.selectedCalendarDate.set(
              this.formatDateKey(today)
            );

          }

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


  private getSessionDateTime(
    session: SessionDto
  ): number {

    const datePart =
      session.sessionDate
        .split('T')[0];


    let timePart =
      session.startTime ||
      '23:59:59';


    if (
      timePart.length === 5
    ) {

      timePart += ':00';

    }


    const timestamp =
      new Date(
        `${datePart}T${timePart}`
      )
        .getTime();


    return Number.isNaN(
      timestamp
    )
      ? 0
      : timestamp;

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