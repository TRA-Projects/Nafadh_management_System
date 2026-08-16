import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminApi } from '../../services/admin-api';
import { TraineeProfileDto, EvaluationDto } from '../../../../core/models/dtos';
import { TRAINEE_STATUS_LABELS } from '../../../../core/models/enums';

@Component({
  selector: 'app-admin-trainee-profile',
  imports: [CommonModule, RouterLink],
  templateUrl: './trainee-profile.html',
})
export class AdminTraineeProfile implements OnInit {
  trainee = signal<TraineeProfileDto | null>(null);
  evaluations = signal<EvaluationDto[]>([]);
  statusLabels = TRAINEE_STATUS_LABELS;

  constructor(private route: ActivatedRoute, private api: AdminApi) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getTrainee(id).subscribe((t) => this.trainee.set(t));
    this.api.getTraineeDashboardSummary(id).subscribe();
  }

  loadEvaluations(enrollmentId: number) {
    this.api.getEvaluationsForEnrollment(enrollmentId).subscribe((e) => this.evaluations.set(e));
  }
}
