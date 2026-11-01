import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TraineeApi } from '../../services/trainee-api';
import { ATTENDANCE_STATUS_LABELS } from '../../../../core/models/enums';
import { ExcuseDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.html',
  styleUrl: './attendance.scss',
})
export class TraineeAttendance implements OnInit {

  enrollmentId = 0;
  traineeId = 1;

  trainee = signal<any>(null);

  rows = signal<any[]>([]);
  rate = signal(0);

  // =========================================================
  // ATTENDANCE FILTER
  // =========================================================

  attendanceFilter =
    signal<'All' | 'Present' | 'Absent' | 'Late'>('All');

  filteredRows = computed(() => {
    const filter = this.attendanceFilter();

    if (filter === 'All') {
      return this.rows();
    }

    return this.rows().filter(
      (row) => row.status === filter
    );
  });

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
  // POPUP MESSAGE (نفس صفحة البروفايل)
  // =========================================================

  popupVisible = signal(false);
  popupTitle = signal('تنبيه');
  popupMessage = signal('');
  popupType = signal<'success' | 'error' | 'info'>('info');

  // الرابط الحالي لعرض المرفق (إن وجد)
  popupAttachmentUrl = signal<string | null>(null);

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
  // ATTENDANCE FILTER FUNCTIONS
  // =========================================================

  setAttendanceFilter(
    filter: 'All' | 'Present' | 'Absent' | 'Late'
  ): void {
    this.attendanceFilter.set(filter);
  }

  getFilterCount(
    filter: 'All' | 'Present' | 'Absent' | 'Late'
  ): number {
    if (filter === 'All') {
      return this.rows().length;
    }

    return this.rows().filter(
      (row) => row.status === filter
    ).length;
  }

  // =========================================================
  // POPUP FUNCTIONS (نمط صفحة البروفايل)
  // =========================================================

  openPopup(
    message: string,
    type: 'success' | 'error' | 'info',
    title: string,
    attachmentUrl: string | null = null
  ): void {
    if (this.popupTimer) {
      clearTimeout(this.popupTimer);
    }

    this.popupTitle.set(title);
    this.popupMessage.set(message);
    this.popupType.set(type);
    this.popupAttachmentUrl.set(attachmentUrl);
    this.popupVisible.set(true);

    this.popupTimer = setTimeout(() => {
      this.closePopup();
    }, 6000);
  }

  closePopup(): void {
    this.popupVisible.set(false);
    this.popupAttachmentUrl.set(null);

    if (this.popupTimer) {
      clearTimeout(this.popupTimer);
      this.popupTimer = null;
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
  // LOAD ATTENDANCE (ينتظر كل الأعذار قبل عرض الواجهة)
  // =========================================================

  async loadAttendanceData(): Promise<void> {
    if (!this.enrollmentId) {
      return;
    }

    try {
      const d = await firstValueFrom(
        this.api.getAttendance(this.enrollmentId)
      );

      const dataArray: any[] = (d as any[]) ?? [];

      const formattedRows = dataArray.map((item: any) => ({
        dailyAttendanceId: item.dailyAttendanceId || item.id,
        date: item.date || item.attendanceDate,
        checkInTime: item.checkInTime || item.checkIn || item.clockIn,
        checkOutTime: item.checkOutTime || item.checkOut || item.clockOut,
        status: item.status || item.attendanceStatus || 'Present',
        note: item.note || item.notes || item.remarks || '',
      }));

      // جلب جميع الأعذار أولاً (قبل تحديث الواجهة) حتى لا يظهر زر خاطئ
      if (formattedRows.length > 0) {
        this.excusesCache.clear();

        const excusePromises = formattedRows.map(async (row: any) => {
          try {
            const excuse = await firstValueFrom(
              this.api.getExcuse(row.dailyAttendanceId).pipe(
                catchError(() => of(null))
              )
            );

            if (excuse && excuse.excuseId) {
              this.excusesCache.set(row.dailyAttendanceId, excuse);
            }
          } catch {
            // لا يوجد عذر
          }
        });

        await Promise.all(excusePromises);
      }

      // الآن بعد أن أصبحت كل البيانات جاهزة، نحدّث الواجهة دفعة واحدة
      this.rows.set(formattedRows);

    } catch (err) {
      console.error('خطأ في جلب سجلات الحضور:', err);
      this.rows.set([]);
    }

    // جلب نسبة الالتزام بشكل منفصل
    this.api
      .getComplianceRate(this.enrollmentId)
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
  // VIEW EXCUSE (Popup نفس البروفايل + زر المرفق)
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

      this.openPopup(
        `تفاصيل العذر\n\nالسبب: ${excuse.reason}\nالحالة: ${statusInfo.emoji} ${statusInfo.text}`,
        excuse.status === 'Approved'
          ? 'success'
          : excuse.status === 'Rejected'
            ? 'error'
            : 'info',
        'تفاصيل العذر',
        excuse.proofUrl || null
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
              this.openPopup(
                'لا توجد تفاصيل إضافية للعذر',
                'info',
                'تفاصيل العذر'
              );
            }
          },

          error: () => {
            this.openPopup(
              'لا توجد تفاصيل إضافية للعذر',
              'info',
              'تفاصيل العذر'
            );
          },
        });
    }
  }

  // =========================================================
  // OPEN EXCUSE FILE
  // =========================================================

  openExcuseFile(dailyAttendanceId: number): void {
    const excuse = this.excusesCache.get(dailyAttendanceId);
    if (excuse && excuse.proofUrl) {
      window.open(this.api.getFileUrl(excuse.proofUrl), '_blank');
    } else {
      this.openPopup('لا يوجد مرفق لهذا العذر', 'info', 'المرفق');
    }
  }

  // =========================================================
  // OPEN EXCUSE FILE BY URL (من داخل Popup)
  // =========================================================

  openExcuseFileByUrl(url: string | null): void {
    if (!url) {
      return;
    }
    window.open(this.api.getFileUrl(url), '_blank');
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

    // Maximum file size: 5 MB
    const maxFileSize =
      5 * 1024 * 1024;

    if (
      file.size >
      maxFileSize
    ) {
      this.openPopup(
        'حجم المرفق يجب ألا يتجاوز 5 MB',
        'error',
        'تنبيه'
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
      this.openPopup(
        'يسمح فقط بملفات PDF أو صور JPG و PNG و WEBP',
        'error',
        'تنبيه'
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
      this.openPopup(
        'يرجى كتابة سبب العذر',
        'error',
        'تنبيه'
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
      this.openPopup(
        'يوجد عذر مسبق لهذا اليوم، لا يمكن إرسال عذر جديد',
        'error',
        'تنبيه'
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

          this.openPopup(
            proofFile
              ? 'تم إرسال العذر والمرفق بنجاح، وهو الآن قيد المراجعة'
              : 'تم إرسال العذر بنجاح، وهو الآن قيد المراجعة',
            'success',
            'تم بنجاح'
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

          this.openPopup(
            errorMessage,
            'error',
            'فشل الإرسال'
          );

          // Remove the temporary excuse
          this.excusesCache.delete(
            currentDailyAttendanceId
          );

          this.loadAttendanceData();
        },
      });
  }
}