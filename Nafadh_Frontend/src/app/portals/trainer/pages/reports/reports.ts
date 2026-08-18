import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainerApi } from '../../services/trainer-api';
import {
  TrainerKpisDto,
  FeedbackSummaryDto
} from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './report.scss'
})
export class TrainerReports implements OnInit {

  trainerId = 1;

  // مؤقت للاختبار فقط
  generatedByUserId = 1;

  kpis = signal<TrainerKpisDto | null>(null);
  feedback = signal<FeedbackSummaryDto | null>(null);

  constructor(private api: TrainerApi) {}

  ngOnInit(): void {
    this.loadKpis();
    this.loadFeedback();
  }

  loadKpis(): void {
    this.api.getTrainerKpis(this.trainerId).subscribe({
      next: (res) => this.kpis.set(res),
      error: (err) =>
        console.error('خطأ في جلب مؤشرات الأداء:', err),
    });
  }

  loadFeedback(): void {
    this.api.getTrainerFeedback(this.trainerId).subscribe({
      next: (res) => this.feedback.set(res),
      error: (err) =>
        console.error('خطأ في جلب التقييمات:', err),
    });
  }

  exportReport(
    type: 'Attendance' | 'Performance' | 'Custom'
  ): void {

    const dto = {
      type,
      trainerId: this.trainerId,
      generatedByUserId: this.generatedByUserId,
      filtersJson: JSON.stringify({
        source: 'TrainerPortal'
      })
    };

    this.api.generateReport(dto).subscribe({
      next: (report) => {
        this.downloadGeneratedReport(report.reportId);
      },

      error: (err) => {
        console.error('خطأ في توليد التقرير:', err);
      }
    });
  }

  private downloadGeneratedReport(reportId: number): void {

    this.api.downloadReport(reportId).subscribe({
      next: (blob) => {

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');

        a.href = url;
        a.download = `trainer-report-${reportId}.pdf`;

        document.body.appendChild(a);

        a.click();

        a.remove();

        window.URL.revokeObjectURL(url);
      },

      error: (err) => {
        console.error('خطأ في تنزيل التقرير:', err);
      }
    });
  }
}