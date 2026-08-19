import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { TrainerApi } from '../../services/trainer-api';

import { AuthService } from '../../../../core/auth/auth.service';

import {
  TrainerKpisDto,
  FeedbackSummaryDto
} from '../../../../core/models/dtos';


@Component({
  selector: 'app-trainer-reports',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './reports.html',
  styleUrl: './report.scss'
})
export class TrainerReports implements OnInit {

  // =====================================================
  // CURRENT TRAINER / USER
  // =====================================================

  trainerId:
    number | null =
      null;

  generatedByUserId:
    number | null =
      null;


  // =====================================================
  // DATA
  // =====================================================

  kpis =
    signal<TrainerKpisDto | null>(null);

  feedback =
    signal<FeedbackSummaryDto | null>(null);


  // =====================================================
  // PAGE STATE
  // =====================================================

  loading =
    signal(false);

  exporting =
    signal(false);

  errorMessage =
    signal('');

  successMessage =
    signal('');


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    private auth: AuthService
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.loadCurrentTrainer();

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


    // المستخدم الذي يقوم بتوليد التقرير
    this.generatedByUserId =
      userId;


    this.loading.set(true);

    this.errorMessage.set('');


    this.api
      .getTrainerByUserId(userId)
      .subscribe({

        next: (trainer) => {

          this.trainerId =
            trainer.trainerId;


          this.loadKpis();

          this.loadFeedback();

        },


        error: (err) => {

          console.error(
            'خطأ في جلب بيانات المدرب:',
            err
          );


          this.loading.set(false);

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


          this.loading.set(false);

        },


        error: (err) => {

          console.error(
            'خطأ في جلب مؤشرات الأداء:',
            err
          );


          this.kpis.set(
            null
          );

          this.loading.set(false);

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
  // GENERATE REPORT
  // =====================================================

  exportReport(
    type:
      | 'Attendance'
      | 'Performance'
      | 'Custom'
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


    this.exporting.set(true);

    this.errorMessage.set('');

    this.successMessage.set('');


    const dto = {

      type,

      trainerId:
        this.trainerId,

      generatedByUserId:
        this.generatedByUserId,

      filtersJson:
        JSON.stringify({
          source:
            'TrainerPortal'
        })

    };


    this.api
      .generateReport(dto)
      .subscribe({

        next: (report) => {

          this.downloadGeneratedReport(
            report.reportId
          );

        },


        error: (err) => {

          console.error(
            'خطأ في توليد التقرير:',
            err
          );


          this.exporting.set(false);

          this.errorMessage.set(
            'تعذر توليد التقرير.'
          );

        }

      });

  }


  // =====================================================
  // DOWNLOAD GENERATED REPORT
  // =====================================================

  private downloadGeneratedReport(
    reportId: number
  ): void {

    this.api
      .downloadReport(reportId)
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
            `trainer-report-${reportId}.pdf`;


          document.body
            .appendChild(
              link
            );


          link.click();


          link.remove();


          window.URL
            .revokeObjectURL(
              url
            );


          this.exporting.set(false);

          this.successMessage.set(
            'تم إنشاء التقرير وتنزيله بنجاح.'
          );

        },


        error: (err) => {

          console.error(
            'خطأ في تنزيل التقرير:',
            err
          );


          this.exporting.set(false);

          this.errorMessage.set(
            'تم إنشاء التقرير ولكن تعذر تنزيل الملف.'
          );

        }

      });

  }

}