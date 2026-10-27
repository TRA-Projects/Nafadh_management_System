import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import {
  TrainerApi,
  TrainerSessionSurveyReport,
} from '../../services/trainer-api';

@Component({
  selector: 'app-session-survey-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-survey-results.html',
  styleUrl: './session-survey-results.scss',
})
export class SessionSurveyResultsComponent implements OnInit {
  report = signal<TrainerSessionSurveyReport | null>(null);
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

    this.trainerApi.getTrainerSessionSurveyResults(sessionId).subscribe({
      next: (result) => {
        this.report.set(result);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to load session survey results:', error);
        this.errorMessage.set(
          error.error?.message ?? 'تعذر تحميل نتائج تقييم الجلسة.',
        );
        this.loading.set(false);
      },
    });
  }
}
