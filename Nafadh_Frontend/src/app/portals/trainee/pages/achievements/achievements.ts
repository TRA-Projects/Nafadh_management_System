import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { BadgeDto, CertificateDto, FeedbackCriterionDto, TraineeBadgeDto, TraineeModuleProgressDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-achievements',
  imports: [CommonModule, FormsModule],
  templateUrl: './achievements.html',
})
export class TraineeAchievements implements OnInit {
  traineeId = 1;
  moduleId = 1;
  batchId = 1;
  trainerId = 1;

  allBadges = signal<BadgeDto[]>([]);
  myBadges = signal<TraineeBadgeDto[]>([]);
  certificates = signal<CertificateDto[]>([]);
  moduleResults = signal<TraineeModuleProgressDto[]>([]);

  showFeedback = signal(false);
  feedbackType = signal<'TrainerRating' | 'BatchExperienceRating'>('TrainerRating');
  criteria = signal<FeedbackCriterionDto[]>([]);
  scores: Record<number, number> = {};
  comment = '';

  constructor(private api: TraineeApi) {}

  ngOnInit() {
    this.api.getAllBadges().subscribe((d) => this.allBadges.set(d ?? []));
    this.api.getMyBadges(this.traineeId).subscribe((d) => this.myBadges.set(d ?? []));
    this.api.getCertificates(this.traineeId).subscribe((d) => this.certificates.set(d ?? []));
    this.api.getModuleProgress(this.traineeId).subscribe((d) => this.moduleResults.set(d ?? []));
  }

  isEarned(badgeId: number) { return this.myBadges().some((b) => b.badgeId === badgeId); }

  openFeedback(type: 'TrainerRating' | 'BatchExperienceRating') {
    this.feedbackType.set(type);
    this.scores = {};
    this.api.getFeedbackCriteria(type).subscribe((d) => this.criteria.set(d ?? []));
    this.showFeedback.set(true);
  }

  submitFeedback() {
    const scores = Object.entries(this.scores).map(([criterionId, score]) => ({ criterionId: Number(criterionId), score }));
    this.api.submitFeedback({
      type: this.feedbackType(), traineeId: this.traineeId, moduleId: this.moduleId,
      trainerId: this.feedbackType() === 'TrainerRating' ? this.trainerId : undefined,
      batchId: this.feedbackType() === 'BatchExperienceRating' ? this.batchId : undefined,
      comment: this.comment, scores,
    }).subscribe(() => {
      this.showFeedback.set(false);
      this.comment = '';
    });
  }
}
