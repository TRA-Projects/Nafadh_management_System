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

    const summaryRows = [
      { البيان: 'رقم الجلسة', القيمة: data.sessionId },
      { البيان: 'عنوان الجلسة', القيمة: data.topic ?? 'بدون عنوان' },
      { البيان: 'إجمالي المسجلين', القيمة: data.attendance.totalEnrolled },
      { البيان: 'الحضور', القيمة: data.attendance.presentCount },
      { البيان: 'الغياب', القيمة: data.attendance.absentCount },
      { البيان: 'المتأخرون', القيمة: data.attendance.lateCount },
      { البيان: 'المعذورون', القيمة: data.attendance.excusedCount },
      {
        البيان: 'غير المسجل حضورهم',
        القيمة: data.attendance.notRecordedCount,
      },
      {
        البيان: 'نسبة الحضور %',
        القيمة: data.attendance.presentPercentage,
      },
      { البيان: 'عدد الاستطلاعات', القيمة: data.totalPolls },
    ];

    const pollRows = data.polls.flatMap((poll) =>
      poll.options.map((option) => ({
        السؤال: poll.question,
        الخيار: option.optionText,
        الأصوات: option.voteCount,
        'إجمالي أصوات الاستطلاع': poll.totalVotes,
      })),
    );

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'ملخص الجلسة');

    const pollsSheet = XLSX.utils.json_to_sheet(
      pollRows.length > 0
        ? pollRows
        : [{ ملاحظة: 'لا توجد استطلاعات للجلسة' }],
    );
    XLSX.utils.book_append_sheet(
      workbook,
      pollsSheet,
      'نتائج الاستطلاعات',
    );

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