import {
  Component,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  DomSanitizer,
  SafeResourceUrl
} from '@angular/platform-browser';
import { forkJoin } from 'rxjs';

import { TrainerApi } from '../../services/trainer-api';

import { AuthService } from '../../../../core/auth/auth.service';

import {
  FeedbackSummaryDto,
  TrainerKpisDto,
  TrainerBatchDto
} from '../../../../core/models/dtos';


type TrainerReportType =
  | 'Attendance'
  | 'Performance'
  | 'Custom';

type ReportTraineeOption = {
  traineeId: number;
  traineeName: string;
};

type TrainerReportHistoryItem = {
  reportId: number;

  type:
    | 'Attendance'
    | 'Performance'
    | 'Financial'
    | 'Enrollment'
    | 'Custom';

  filtersJson?: string | null;

  generatedAt: string;

  fileUrl?: string | null;

  generatedByUserId: number;
};


@Component({
  selector: 'app-trainer-reports',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './reports.html',

  styleUrl: './report.scss'
})
export class TrainerReports
  implements OnInit, OnDestroy {

  // =====================================================
  // CURRENT TRAINER / USER
  // =====================================================

  trainerId:
    number | null =
      null;


  generatedByUserId:
    number | null =
      null;

trainees =
  signal<ReportTraineeOption[]>([]);

selectedTraineeId =
  signal<number | null>(null);
  batches =
  signal<TrainerBatchDto[]>([]);

selectedBatchId =
  signal<number | null>(null);

  // =====================================================
  // DATA
  // =====================================================

  kpis =
    signal<TrainerKpisDto | null>(
      null
    );


  feedback =
    signal<FeedbackSummaryDto | null>(
      null
    );


  reportHistory =
    signal<TrainerReportHistoryItem[]>(
      []
    );


  // =====================================================
  // PAGE STATE
  // =====================================================

  loading =
    signal(false);


  loadingHistory =
    signal(false);


  exporting =
    signal(false);


  // Shows loading only on the report
  // that the trainer selected.
  generatingReportType =
    signal<TrainerReportType | null>(
      null
    );


  errorMessage =
    signal('');


  successMessage =
    signal('');


  // =====================================================
  // REPORT PREVIEW STATE
  // =====================================================

  showReportPreview =
    signal(false);


  reportPreviewUrl =
    signal<SafeResourceUrl | null>(
      null
    );


  previewReportId =
    signal<number | null>(
      null
    );


  previewReportType =
    signal<TrainerReportType | null>(
      null
    );


  // Browser Blob URL used for preview,
  // new tab and manual download.
  private previewObjectUrl:
    string | null =
      null;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    private auth: AuthService,
    private sanitizer: DomSanitizer
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.loadCurrentTrainer();

  }


  ngOnDestroy(): void {

    this.clearPreviewUrl();

  }


  // =====================================================
  // LOAD CURRENT TRAINER
  // =====================================================

  private loadCurrentTrainer(): void {

    const userId =
      this.auth.session()?.userId;


    if (!userId) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي.'
      );

      return;
    }


    this.generatedByUserId =
      userId;


    // Load Trainer Portal report history
    // for the logged-in user.
    this.loadReportHistory();


    this.loading.set(
      true
    );


    this.errorMessage.set(
      ''
    );


    this.api
      .getTrainerByUserId(
        userId
      )
      .subscribe({

        next: (trainer) => {

          this.trainerId =
            trainer.trainerId;

          this.loadReportTrainees(
  trainer.trainerId
);

          this.loadKpis();

          this.loadFeedback();

        },


        error: (err) => {

          console.error(
            'خطأ في جلب بيانات المدرب:',
            err
          );


          this.loading.set(
            false
          );


          this.errorMessage.set(
            'تعذر تحميل بيانات المدرب.'
          );

        }

      });

  }


  // =====================================================
  // LOAD KPIs
  // =====================================================

  private loadKpis(): void {

    if (!this.trainerId) {
      return;
    }


    this.api
      .getTrainerKpis(
        this.trainerId
      )
      .subscribe({

        next: (res) => {

          this.kpis.set(
            res
          );


          this.loading.set(
            false
          );

        },


        error: (err) => {

          console.error(
            'خطأ في جلب مؤشرات الأداء:',
            err
          );


          this.kpis.set(
            null
          );


          this.loading.set(
            false
          );


          this.errorMessage.set(
            'تعذر تحميل مؤشرات الأداء.'
          );

        }

      });

  }


  // =====================================================
  // LOAD TRAINER FEEDBACK
  // =====================================================

  private loadFeedback(): void {

    if (!this.trainerId) {
      return;
    }


    this.api
      .getTrainerFeedback(
        this.trainerId
      )
      .subscribe({

        next: (res) => {

          this.feedback.set(
            res
          );

        },


        error: (err) => {

          console.error(
            'خطأ في جلب تقييمات المدرب:',
            err
          );


          this.feedback.set(
            null
          );

        }

      });

  }


  // =====================================================
  // LOAD REPORT HISTORY
  // =====================================================
private loadReportTrainees(
  trainerId: number
): void {

  this.api
    .getMyBatches(trainerId)
    .subscribe({

      next: (batches) => {
        this.batches.set(
  batches ?? []
);

        const batchIds =
          (batches ?? [])
            .map(batch => batch.batchId)
            .filter(id => id > 0);


        if (batchIds.length === 0) {

          this.trainees.set([]);

          return;
        }


        const requests =
          batchIds.map(batchId =>
            this.api.getEnrollments(
              undefined,
              batchId
            )
          );


        forkJoin(requests)
          .subscribe({

            next: (results) => {

              const traineeMap =
                new Map<number, string>();


              for (
                const enrollments of results
              ) {

                for (
                  const enrollment
                  of enrollments ?? []
                ) {

                  if (
                    enrollment.traineeId > 0
                  ) {

                    traineeMap.set(
                      enrollment.traineeId,
                      enrollment.traineeName ||
                        `متدرب #${enrollment.traineeId}`
                    );

                  }

                }

              }


              const options =
                Array.from(
                  traineeMap.entries()
                )
                .map(
                  ([traineeId, traineeName]) => ({
                    traineeId,
                    traineeName
                  })
                )
                .sort(
                  (a, b) =>
                    a.traineeName.localeCompare(
                      b.traineeName,
                      'ar'
                    )
                );


              this.trainees.set(
                options
              );

            },

            error: (err) => {

              console.error(
                'خطأ في تحميل قائمة المتدربين:',
                err
              );

              this.trainees.set([]);

            }

          });

      },
      

      error: (err) => {

        console.error(
          'خطأ في تحميل دفعات المدرب للتقرير:',
          err
        );

        this.trainees.set([]);

      }

    });}
onReportBatchChange(rawValue: string): void {

  const batchId = rawValue
    ? Number(rawValue)
    : null;

  this.selectedBatchId.set(batchId);
  this.selectedTraineeId.set(null);
  this.loadTraineesForBatch(batchId);
}


private loadTraineesForBatch(
  batchId: number | null
): void {

  if (batchId === null) {

    if (this.trainerId) {
      this.loadReportTrainees(this.trainerId);
    }

    return;
  }

  this.api
    .getEnrollments(
      undefined,
      batchId
    )
    .subscribe({

      next: (enrollments) => {

        const traineeMap =
          new Map<number, string>();

        for (
          const enrollment of enrollments ?? []
        ) {

          if (
            enrollment.traineeId > 0
          ) {

            traineeMap.set(
              enrollment.traineeId,
              enrollment.traineeName ||
                `متدرب #${enrollment.traineeId}`
            );

          }

        }

        const options =
          Array.from(
            traineeMap.entries()
          )
          .map(
            ([traineeId, traineeName]) => ({
              traineeId,
              traineeName
            })
          )
          .sort(
            (a, b) =>
              a.traineeName.localeCompare(
                b.traineeName,
                'ar'
              )
          );

        this.trainees.set(
          options
        );

      },

      error: (err) => {

        console.error(
          'خطأ في تحميل طلاب الدفعة:',
          err
        );

        this.trainees.set([]);

      }

    });
}
resetReportFilters(): void {

  this.selectedBatchId.set(null);

  this.selectedTraineeId.set(null);

  if (this.trainerId) {
    this.loadReportTrainees(
      this.trainerId
    );
  }

}

  private loadReportHistory(): void {

    if (!this.generatedByUserId) {
      return;
    }


    this.loadingHistory.set(
      true
    );


    this.api
      .getTrainerReports(
        this.generatedByUserId
      )
      .subscribe({

        next: (reports) => {

          // Keep only reports created
          // through Trainer Portal.
          const trainerReports =
            (reports ?? [])
              .filter(report => {

                if (
                  report.type !== 'Attendance' &&
                  report.type !== 'Performance' &&
                  report.type !== 'Custom'
                ) {
                  return false;
                }


                if (!report.filtersJson) {
                  return false;
                }


                try {

                  const filters =
                    JSON.parse(
                      report.filtersJson
                    );


                  return (
                    filters?.source ===
                    'TrainerPortal'
                  );

                } catch {

                  return false;

                }

              });


          // Newest reports first.
          const sortedReports =
            [...trainerReports]
              .sort(
                (a, b) =>
                  new Date(
                    b.generatedAt
                  ).getTime() -
                  new Date(
                    a.generatedAt
                  ).getTime()
              );


          // Keep only the latest report
          // from each report type.
          const latestReports =
            sortedReports.filter(
              (
                report,
                index,
                items
              ) =>
                items.findIndex(
                  item =>
                    item.type ===
                    report.type
                ) === index
            );


          this.reportHistory.set(
            latestReports
          );


          this.loadingHistory.set(
            false
          );

        },


        error: (err) => {

          console.error(
            'خطأ في تحميل سجل التقارير:',
            err
          );


          this.reportHistory.set(
            []
          );


          this.loadingHistory.set(
            false
          );

        }

      });

  }


  // =====================================================
  // DISMISS PAGE MESSAGE
  // =====================================================

  dismissMessage(): void {

    this.errorMessage.set(
      ''
    );


    this.successMessage.set(
      ''
    );

  }


  // =====================================================
  // GENERATE + PREVIEW REPORT
  // =====================================================

  previewReport(
    type: TrainerReportType
  ): void {

    if (
      !this.trainerId ||
      !this.generatedByUserId
    ) {

      this.errorMessage.set(
        'تعذر تحديد بيانات المدرب لتوليد التقرير.'
      );

      return;
    }


    this.exporting.set(
      true
    );


    this.generatingReportType.set(
      type
    );


    this.errorMessage.set(
      ''
    );


    this.successMessage.set(
      ''
    );


    const dto = {

      type,

      trainerId:
        this.trainerId,

      generatedByUserId:
        this.generatedByUserId,

  filtersJson:

  JSON.stringify({

    source:

      'TrainerPortal',

    ...(this.selectedBatchId() !== null
      ? {
          batchId:
            this.selectedBatchId()
        }
      : {}),

    ...(this.selectedTraineeId() !== null
      ? {
          traineeId:
            this.selectedTraineeId()
        }
      : {})

  })

    };


    // Generate using the dedicated
    // Trainer Portal endpoint.
    this.api
      .generateTrainerPortalReport(
        dto
      )
      .subscribe({

        next: (report) => {

          this.loadReportPreview(
            report.reportId,
            type
          );

        },


        error: (err) => {

          console.error(
            'خطأ في توليد التقرير:',
            err
          );


          this.exporting.set(
            false
          );


          this.generatingReportType.set(
            null
          );


          this.successMessage.set(
            ''
          );


          this.errorMessage.set(
            'تعذر توليد التقرير.'
          );

        }

      });

  }


  // =====================================================
  // LOAD PDF FOR PREVIEW
  // =====================================================

  private loadReportPreview(
    reportId: number,
    type: TrainerReportType
  ): void {

    this.api
      .getTrainerPortalReportFile(
        reportId
      )
      .subscribe({

        next: (blob) => {

          // Remove the previous browser Blob URL
          // before creating the new preview.
          this.clearPreviewUrl();


          this.previewObjectUrl =
            window.URL.createObjectURL(
              blob
            );


          const safeUrl =
            this.sanitizer
              .bypassSecurityTrustResourceUrl(
                this.previewObjectUrl
              );


          this.reportPreviewUrl.set(
            safeUrl
          );


          this.previewReportId.set(
            reportId
          );


          this.previewReportType.set(
            type
          );


          this.showReportPreview.set(
            true
          );


          this.exporting.set(
            false
          );


          this.generatingReportType.set(
            null
          );


          this.errorMessage.set(
            ''
          );


          this.successMessage.set(
            'تم تجهيز التقرير بنجاح.'
          );


          // Refresh Recent Reports so the
          // new report appears immediately.
          this.loadReportHistory();

        },


        error: (err) => {

          console.error(
            'خطأ في تحميل معاينة التقرير:',
            err
          );


          this.exporting.set(
            false
          );


          this.generatingReportType.set(
            null
          );


          this.successMessage.set(
            ''
          );


          // The database record may already exist,
          // so refresh the list even if its PDF
          // could not be opened.
          this.loadReportHistory();


          this.errorMessage.set(
            'تعذر فتح ملف التقرير. حاولي إنشاء التقرير مرة أخرى.'
          );

        }

      });

  }


  // =====================================================
  // PREVIEW EXISTING REPORT
  // =====================================================

  previewExistingReport(
    _reportId: number,
    type: string
  ): void {

    if (
      type !== 'Attendance' &&
      type !== 'Performance' &&
      type !== 'Custom'
    ) {
      return;
    }


    /*
     * Some older reports were generated before
     * Trainer Portal PDFs were moved to external storage.
     *
     * Generate a fresh report using the current flow
     * instead of trying to open an old missing PDF.
     */
    this.previewReport(
      type
    );

  }


  // =====================================================
  // OPEN REPORT IN NEW TAB
  // =====================================================

  openPreviewInNewTab(): void {

    if (!this.previewObjectUrl) {
      return;
    }


    const previewWindow =
      window.open(
        this.previewObjectUrl,
        '_blank'
      );


    if (previewWindow) {

      previewWindow.opener =
        null;

    }

  }


  // =====================================================
  // DOWNLOAD REPORT
  // =====================================================

  downloadPreviewedReport(): void {

    const reportId =
      this.previewReportId();


    if (
      !this.previewObjectUrl ||
      !reportId
    ) {
      return;
    }


    const link =
      document.createElement(
        'a'
      );


    link.href =
      this.previewObjectUrl;


    link.download =
      `trainer-report-${reportId}.pdf`;


    document.body
      .appendChild(
        link
      );


    link.click();

    link.remove();


    this.successMessage.set(
      'تم تنزيل التقرير بنجاح.'
    );

  }


  // =====================================================
  // CLOSE REPORT PREVIEW
  // =====================================================

  closeReportPreview(): void {

    this.showReportPreview.set(
      false
    );


    this.previewReportId.set(
      null
    );


    this.previewReportType.set(
      null
    );


    this.clearPreviewUrl();

  }


  // =====================================================
  // CLEAR BLOB URL
  // =====================================================

  private clearPreviewUrl(): void {

    if (this.previewObjectUrl) {

      window.URL.revokeObjectURL(
        this.previewObjectUrl
      );


      this.previewObjectUrl =
        null;

    }


    this.reportPreviewUrl.set(
      null
    );

  }


// =====================================================
// REPORT HISTORY TITLE
// =====================================================

getHistoryReportTitle(
  type: string
): string {

  switch (type) {

    case 'Attendance':
      return 'تقرير الحضور والغياب';

    case 'Performance':
      return 'تقرير أداء الدفعات والمهام';

    case 'Custom':
      return 'التقرير الشامل للأداء التدريبي';

    default:
      return 'تقرير';

  }

}


// =====================================================
// PREVIEW REPORT TITLE
// =====================================================

getReportTitle(): string {

  switch (
    this.previewReportType()
  ) {

    case 'Attendance':
      return 'تقرير الحضور والغياب';

    case 'Performance':
      return 'تقرير أداء الدفعات والمهام';

    case 'Custom':
      return 'التقرير الشامل للأداء التدريبي';

    default:
      return 'معاينة التقرير';

  }

}}