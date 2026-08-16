import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { TraineeProfileDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
})
export class TraineeProfile implements OnInit {
  traineeId = 1;
  trainee = signal<TraineeProfileDto | null>(null);
  editing = signal(false);

  constructor(private api: TraineeApi) {}
  ngOnInit() { this.api.getTrainee(this.traineeId).subscribe((t) => this.trainee.set(t)); }

  toggleEdit() {
    if (this.editing()) {
      const t = this.trainee();
      if (t) this.api.updateTrainee(t.traineeId, t).subscribe();
    }
    this.editing.update((v) => !v);
  }
}
