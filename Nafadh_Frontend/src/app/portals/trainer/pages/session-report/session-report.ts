import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import {
  TrainerApi,
  TrainerLiveSessionReport,
} from '../../services/trainer-api';

@Component({
  selector: 'app-trainer-session-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-report.html',
  styleUrl: './session-report.scss',
})
export class TrainerSessionReportComponent implements OnInit {
  report = signal<TrainerLiveSessionReport | null>(null);
  loading = signal(true);
  errorMessage = signal('');

  constructor(
    private route: ActivatedRoute,
    private trainerApi: TrainerApi,
  ) {}

  ngOnInit(): void {
    const sessionId = Number(
      this.route.snapshot.paramMap.get('sessionId'),
    );

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      this.errorMessage.set('معرّف الجلسة في الرابط غير صحيح.');
      this.loading.set(false);
      return;
    }

    this.trainerApi.getTrainerLiveSessionReport(sessionId).subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to load session report:', error);
        this.errorMessage.set(
          error.error?.message ?? 'تعذر تحميل تقرير الجلسة.',
        );
        this.loading.set(false);
      },
    });
  }

  exportExcel(): void {
    const data = this.report();

    if (!data) {
      return;
    }

    // تجهيز صفوف جدول الحضور والتقييم للإكسل
    const attendanceRows = (data.attendanceList && data.attendanceList.length > 0)
      ? data.attendanceList.map((trainee: any) => ({
          'اسم المتدرب': trainee.fullName,
          'حالة الحضور': trainee.isPresent ? 'حاضر المحاضرة' : 'غائب',
          'تقييم الجلسة': trainee.evaluationScore ?? 'لم يقيم',
        }))
      : [{ ملاحظة: 'لا توجد بيانات مسجلة للمتدربين' }];

    const workbook = XLSX.utils.book_new();

    const attendanceSheet = XLSX.utils.json_to_sheet(attendanceRows);
    XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'تقرير الحضور والتقييم');

    XLSX.writeFile(workbook, `session-report-${data.sessionId}.xlsx`);
  }

  exportPdf(): void {
    const data = this.report();
    const element = document.getElementById('session-report-content');

    if (!data || !element) {
      return;
    }

    const options = {
      margin: 10,
      filename: `session-report-${data.sessionId}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait' as const,
      },
    };

    html2pdf().set(options).from(element).save();
  }
}