import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerApi } from '../../services/trainer-api';
import { TrainerDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
})
export class TrainerProfile implements OnInit {
  trainerId = 1;
  trainer = signal<TrainerDto | null>(null);
  constructor(private api: TrainerApi) {}
  ngOnInit() { this.api.getTrainer(this.trainerId).subscribe((t) => this.trainer.set(t)); }
  save() { const t = this.trainer(); if (t) this.api.updateTrainer(t.trainerId, t).subscribe(); }
}
