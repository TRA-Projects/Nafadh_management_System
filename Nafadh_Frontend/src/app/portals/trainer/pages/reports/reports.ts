import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainerApi } from '../../services/trainer-api';
import { FeedbackSummaryDto, TrainerKpisDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-reports',
  imports: [CommonModule],
  templateUrl: './reports.html',
})
export class TrainerReports implements OnInit {
  trainerId = 1;
  kpis = signal<TrainerKpisDto | null>(null);
  feedback = signal<FeedbackSummaryDto | null>(null);

  constructor(private api: TrainerApi) {}
  ngOnInit() {
    this.api.getTrainerKpis(this.trainerId).subscribe((d) => this.kpis.set(d));
    this.api.getTrainerFeedback(this.trainerId).subscribe((d) => this.feedback.set(d));
  }
}
