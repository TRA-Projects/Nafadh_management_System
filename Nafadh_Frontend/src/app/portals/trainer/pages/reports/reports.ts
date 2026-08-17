import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainerApi } from '../../services/trainer-api';
import { TrainerKpisDto, FeedbackSummaryDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrls: ['./report.scss']
})
export class TrainerReports implements OnInit {
  trainerId = 1;

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
      error: (err) => console.error('خطأ في جلب مؤشرات الأداء:', err),
    });
  }

 loadFeedback(): void {
  this.api.getTrainerFeedback(this.trainerId).subscribe({
    next: (res) => this.feedback.set(res),
    error: (err) => console.error('خطأ في جلب التقييمات:', err),
  });
}
}