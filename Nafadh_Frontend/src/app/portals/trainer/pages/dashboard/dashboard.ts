import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { TrainerBatchDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
})
export class TrainerDashboard implements OnInit {
  trainerId = 1;
  batches = signal<TrainerBatchDto[]>([]);
  constructor(private api: TrainerApi, public auth: AuthService) {}
  ngOnInit() { this.api.getMyBatches(this.trainerId).subscribe((d) => this.batches.set(d ?? [])); }
}
