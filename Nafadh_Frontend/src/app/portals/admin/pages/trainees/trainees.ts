import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../services/admin-api';
import { TraineeListItemDto } from '../../../../core/models/dtos';
import { TRAINEE_STATUS_LABELS, TraineeStatus } from '../../../../core/models/enums';

@Component({
  selector: 'app-admin-trainees',
  imports: [CommonModule, RouterLink],
  templateUrl: './trainees.html',
})
export class AdminTrainees implements OnInit {
  trainees = signal<TraineeListItemDto[]>([]);
  pendingVerification = signal<TraineeListItemDto[]>([]);
  statusFilter = signal<string>('الكل');
  statusLabels = TRAINEE_STATUS_LABELS;

  constructor(private api: AdminApi) {}

  ngOnInit() {
    this.api.getTrainees().subscribe((r) => this.trainees.set(r.items ?? []));
    this.api.getPendingVerification().subscribe((d) => this.pendingVerification.set(d ?? []));
  }

  filtered() {
    const f = this.statusFilter();
    if (f === 'الكل') return this.trainees();
    return this.trainees().filter((t) => t.status === f);
  }

  labelFor(s: string): string {
    return (this.statusLabels as Record<string, string>)[s] ?? s;
  }

  verify(t: TraineeListItemDto, approve: boolean) {
    this.api.verifyTrainee(t.traineeId, { status: approve ? 'Verified' : 'Rejected', reviewedByUserId: 1 }).subscribe(() => {
      this.pendingVerification.update((list) => list.filter((x) => x.traineeId !== t.traineeId));
    });
  }
}
