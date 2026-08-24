import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TraineeApi } from '../../services/trainee-api';
import { ATTENDANCE_STATUS_LABELS } from '../../../../core/models/enums';
import { ExcuseDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.html',
})
export class TraineeAttendance implements OnInit {

  enrollmentId = 0;
  traineeId = 1;

  trainee = signal<any>(null);

  rows = signal<any[]>([]);
  rate = signal(0);

  excuseOpenFor = signal<number | null>(null);
  excuseReason = '';

  labels = ATTENDANCE_STATUS_LABELS;

  selectedFileName = signal<string>('');
  selectedFile = signal<File | null>(null);

  // =========================================================
  // EXCUSES CACHE
  // =========================================================

  excusesCache = new Map<number, ExcuseDto>();


  // =========================================================
  // POPUP MESSAGE
  // =========================================================

  popupVisible = signal(false);

  popupMessage = signal('');

  popupType =
    signal<'success' | 'error' | 'warning' | 'info'>(
      'info'
    );

  private popupTimer: any;


  constructor(
    private api: TraineeApi
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    this.getLoggedInUserId();

    this.loadTraineeData();

  }


  // =========================================================
  // POPUP FUNCTIONS
  // =========================================================

  showPopup(
    message: string,
    type:
      | 'success'
      | 'error'
      | 'warning'
      | 'info' = 'info'
  ): void {

    if (this.popupTimer) {
      clearTimeout(this.popupTimer);
    }

    this.popupMessage.set(message);

    this.popupType.set(type);

    this.popupVisible.set(true);

    this.popupTimer =
      setTimeout(() => {

        this.closePopup();

      }, 3500);

  }


  closePopup(): void {

    this.popupVisible.set(false);

    if (this.popupTimer) {

      clearTimeout(this.popupTimer);

      this.popupTimer = null;

    }

  }


  getPopupIcon(): string {

    switch (this.popupType()) {

      case 'success':
        return '✓';

      case 'error':
        return '×';

      case 'warning':
        return '!';

      default:
        return 'i';

    }

  }


  // =========================================================
  // GET LOGGED USER
  // =========================================================

  private getLoggedInUserId(): void {

    try {

      for (
        let i = 0;
        i < localStorage.length;
        i++
      ) {

        const key =
          localStorage.key(i);

        if (key) {

          const val =
            localStorage.getItem(key);

          if (
            val &&
            val.startsWith('{')
          ) {

            const parsed =
              JSON.parse(val);

            const foundId =
              parsed.traineeId ||
              parsed.userId ||
              parsed.id;

            if (foundId) {

              this.traineeId =
                Number(foundId);

              return;

            }

          }

        }

      }


      const token =
        localStorage.getItem(
          'auth_token'
        ) ||
        localStorage.getItem(
          'token'
        ) ||
        localStorage.getItem(
          'user_session'
        );


      if (
        token &&
        token.includes('.')
      ) {

        const payload =
          JSON.parse(
            atob(
              token
                .split('.')[1]
                .replace(/-/g, '+')
                .replace(/_/g, '/')
            )
          );


        const id =
          payload.traineeId ||
          payload.userId ||
          payload.nameid ||
          payload[
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
          ];


        if (id) {

          this.traineeId =
            Number(id);

        }

      }

    } catch (e) {

      console.warn(
        'تنبيه قراءة التوكن:',
        e
      );

    }

  }


  // =========================================================
  // LOAD TRAINEE
  // =========================================================

  loadTraineeData(): void {

    this.api
      .getTrainee(
        this.traineeId
      )
      .subscribe({

        next: (t) => {

          if (t) {

            this.trainee.set(t);

            this.enrollmentId =
              t.enrollmentId ?? 0;

            this.loadAttendanceData();

          }

        },


        error: (err) => {

          console.error(
            'خطأ في جلب البيانات:',
            err
          );


          if (
            this.traineeId !== 2
          ) {

            this.traineeId = 2;

            this.loadTraineeData();

          }

        },

      });

  }


  // =========================================================
  // LOAD ATTENDANCE
  // =========================================================

  loadAttendanceData(): void {

    if (!this.enrollmentId) {
      return;
    }


    this.api
      .getAttendance(
        this.enrollmentId
      )
      .subscribe({

        next: (d) => {

          const formattedRows =
            (d ?? []).map(
              (item: any) => ({

                dailyAttendanceId:
                  item.dailyAttendanceId ||
                  item.id,

                date:
                  item.date ||
                  item.attendanceDate,

                checkInTime:
                  item.checkInTime ||
                  item.checkIn ||
                  item.clockIn,

                checkOutTime:
                  item.checkOutTime ||
                  item.checkOut ||
                  item.clockOut,

                status:
                  item.status ||
                  item.attendanceStatus ||
                  'Present',

                note:
                  item.note ||
                  item.notes ||
                  item.remarks ||
                  '',

              })
            );


          this.rows.set(
            formattedRows
          );


          // =============================================
          // LOAD EXCUSES FOR EACH ATTENDANCE ROW
          // =============================================

          formattedRows.forEach(
            (row) => {

              this.api
                .getExcuse(
                  row.dailyAttendanceId
                )
                .subscribe({

                  next: (
                    excuse: ExcuseDto
                  ) => {

                    if (
                      excuse &&
                      excuse.excuseId
                    ) {

                      this.excusesCache.set(
                        row.dailyAttendanceId,
                        excuse
                      );

                    }

                  },


                  error: () => {},

                });

            }
          );

        },


        error: () => {

          this.rows.set([]);

        },

      });


    this.api
      .getComplianceRate(
        this.enrollmentId
      )
      .subscribe({

        next: (r) => {

          this.rate.set(r);

        },

        error: () => {},

      });

  }


  // =========================================================
  // EXCUSES
  // =========================================================

  hasExcuse(
    dailyAttendanceId: number
  ): boolean {

    return this.excusesCache.has(
      dailyAttendanceId
    );

  }


  getExcuse(
    dailyAttendanceId: number
  ): ExcuseDto | undefined {

    return this.excusesCache.get(
      dailyAttendanceId
    );

  }


  getExcuseStatus(
    dailyAttendanceId: number
  ): string | null {

    const excuse =
      this.excusesCache.get(
        dailyAttendanceId
      );

    return excuse
      ? excuse.status
      : null;

  }


  canSubmitExcuse(
    row: any
  ): boolean {

    if (
      this.hasExcuse(
        row.dailyAttendanceId
      )
    ) {

      return false;

    }


    if (
      row.status === 'Present'
    ) {

      return false;

    }


    return (
      row.status === 'Absent' ||
      row.status === 'Late'
    );

  }


  // =========================================================
  // VIEW EXCUSE
  // =========================================================

  viewExcuse(
    dailyAttendanceId: number
  ): void {

    const excuse =
      this.excusesCache.get(
        dailyAttendanceId
      );


    if (excuse) {

      const statusMap: {
        [key: string]: {
          text: string;
          emoji: string;
        };
      } = {

        Pending: {
          text: 'قيد المراجعة',
          emoji: '⏳',
        },

        Approved: {
          text: 'مقبول',
          emoji: '✓',
        },

        Rejected: {
          text: 'مرفوض',
          emoji: '×',
        },

      };


      const statusInfo =
        statusMap[
          excuse.status
        ] || {

          text:
            excuse.status,

          emoji: '',

        };


      const attachmentMessage =
        excuse.proofUrl
          ? '\n📎 يوجد مرفق'
          : '';


      this.showPopup(
        `تفاصيل العذر\n\nالسبب: ${excuse.reason}\nالحالة: ${statusInfo.emoji} ${statusInfo.text}${attachmentMessage}`,
        excuse.status === 'Approved'
          ? 'success'
          : excuse.status ===
              'Rejected'
            ? 'error'
            : 'warning'
      );

    } else {

      // =============================================
      // FETCH FROM API IF NOT FOUND IN CACHE
      // =============================================

      this.api
        .getExcuse(
          dailyAttendanceId
        )
        .subscribe({

          next: (
            excuse: ExcuseDto
          ) => {

            if (
              excuse &&
              excuse.excuseId
            ) {

              this.excusesCache.set(
                dailyAttendanceId,
                excuse
              );

              this.viewExcuse(
                dailyAttendanceId
              );

            } else {

              this.showPopup(
                'لا توجد تفاصيل إضافية للعذر',
                'info'
              );

            }

          },


          error: () => {

            this.showPopup(
              'لا توجد تفاصيل إضافية للعذر',
              'info'
            );

          },

        });

    }

  }


  // =========================================================
  // STATISTICS
  // =========================================================

  totalPresent =
    computed(() =>

      this.rows().filter(
        (r) =>
          r.status === 'Present'
      ).length

    );


  totalAbsent =
    computed(() =>

      this.rows().filter(
        (r) =>
          r.status === 'Absent'
      ).length

    );


  totalLate =
    computed(() =>

      this.rows().filter(
        (r) =>
          r.status === 'Late'
      ).length

    );


  totalExcused =
    computed(() => {

      let count = 0;


      this.rows().forEach(
        (row) => {

          const excuse =
            this.excusesCache.get(
              row.dailyAttendanceId
            );


          if (
            excuse &&
            excuse.status ===
              'Approved'
          ) {

            count++;

          }

        }
      );


      return count;

    });


  commitmentPercentage =
    computed(() => {

      const total =
        this.rows().length;


      if (
        total === 0
      ) {

        return 0;

      }


      const presentCount =
        this.rows().filter(
          (r) =>
            r.status ===
            'Present'
        ).length;


      return Math.round(
        (
          presentCount /
          total
        ) * 100
      );

    });


  // =========================================================
  // FILE
  // =========================================================

  onFileSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    if (
      !input.files ||
      input.files.length === 0
    ) {

      return;

    }


    const file =
      input.files[0];


    // Maximum file size:
    // 5 MB
    const maxFileSize =
      5 * 1024 * 1024;


    if (
      file.size >
      maxFileSize
    ) {

      this.showPopup(
        'حجم المرفق يجب ألا يتجاوز 5 MB',
        'warning'
      );

      input.value = '';

      this.selectedFileName.set('');

      this.selectedFile.set(null);

      return;

    }


    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      this.showPopup(
        'يسمح فقط بملفات PDF أو صور JPG و PNG و WEBP',
        'warning'
      );

      input.value = '';

      this.selectedFileName.set('');

      this.selectedFile.set(null);

      return;

    }


    this.selectedFileName.set(
      file.name
    );


    this.selectedFile.set(
      file
    );

  }


  // =========================================================
  // RESET EXCUSE FORM
  // =========================================================

  private resetExcuseForm(): void {

    this.excuseOpenFor.set(
      null
    );

    this.excuseReason = '';

    this.selectedFileName.set('');

    this.selectedFile.set(
      null
    );

  }


  // =========================================================
  // SUBMIT EXCUSE
  // =========================================================

  submitExcuse(
    row: any
  ): void {

    const reason =
      this.excuseReason.trim();


    if (!reason) {

      this.showPopup(
        'يرجى كتابة سبب العذر',
        'warning'
      );

      return;

    }


    // =============================================
    // CHECK EXISTING EXCUSE
    // =============================================

    if (
      this.hasExcuse(
        row.dailyAttendanceId
      )
    ) {

      this.showPopup(
        'يوجد عذر مسبق لهذا اليوم، لا يمكن إرسال عذر جديد',
        'warning'
      );

      this.resetExcuseForm();

      return;

    }


    // =============================================
    // KEEP THE SELECTED FILE BEFORE RESETTING FORM
    // =============================================

    const proofFile =
      this.selectedFile();


    const currentDailyAttendanceId =
      row.dailyAttendanceId;


    // =============================================
    // PREPARE FORM DATA FOR TRAINEE API
    // =============================================

    const excuseData = {

      dailyAttendanceId:
        currentDailyAttendanceId,

      reason: reason,

      file:
        proofFile,

    };


    // =============================================
    // TEMPORARY EXCUSE FOR IMMEDIATE UI UPDATE
    // =============================================

    const tempExcuse:
      ExcuseDto = {

        excuseId:
          Date.now(),

        dailyAttendanceId:
          currentDailyAttendanceId,

        reason:
          reason,

        status:
          'Pending' as any,

        proofUrl:
          proofFile
            ? 'pending-upload'
            : undefined,

      };


    this.excusesCache.set(
      currentDailyAttendanceId,
      tempExcuse
    );


    // Close the form.
    // proofFile is still stored in the local variable above.
    this.resetExcuseForm();


    // =============================================
    // SEND EXCUSE + FILE TO BACKEND
    // =============================================

    this.api
      .submitExcuse(
        excuseData
      )
      .subscribe({

        next: (
          response: ExcuseDto
        ) => {

          console.log(
            '✅ تم إرسال العذر بنجاح:',
            response
          );


          this.excusesCache.set(
            currentDailyAttendanceId,
            {
              ...response,
              status:
                'Pending' as any,
            }
          );


          this.showPopup(
            proofFile
              ? 'تم إرسال العذر والمرفق بنجاح، وهو الآن قيد المراجعة'
              : 'تم إرسال العذر بنجاح، وهو الآن قيد المراجعة',
            'success'
          );


          setTimeout(
            () => {

              this.loadAttendanceData();

            },
            500
          );

        },


        error: (err) => {

          console.error(
            '❌ خطأ في إرسال العذر:',
            err
          );


          let errorMessage =
            'حدث خطأ في إرسال العذر، يرجى المحاولة مرة أخرى';


          if (
            err.error &&
            typeof err.error ===
              'string'
          ) {

            errorMessage =
              err.error;

          } else if (
            err.error &&
            err.error.message
          ) {

            errorMessage =
              err.error.message;

          } else if (
            err.message
          ) {

            errorMessage =
              err.message;

          }


          if (
            errorMessage.includes(
              'already exists'
            ) ||
            errorMessage.includes(
              'موجود'
            )
          ) {

            errorMessage =
              'يوجد عذر مسبق لهذا اليوم';

          }


          this.showPopup(
            errorMessage,
            'error'
          );


          // Remove the temporary excuse
          // because the backend request failed.
          this.excusesCache.delete(
            currentDailyAttendanceId
          );


          this.loadAttendanceData();

        },

      });

  }

}