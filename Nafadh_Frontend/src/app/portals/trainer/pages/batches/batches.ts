import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TrainerApi } from '../../services/trainer-api';
import { TrainerBatchDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-batches',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './batches.html',
})
export class TrainerBatches implements OnInit {
  trainerId = 1;
  batches = signal<TrainerBatchDto[]>([]);
  selected = signal<TrainerBatchDto | null>(null);
  showAnnounce = signal(false);
  announceMsg = '';

  constructor(private api: TrainerApi) {}
  ngOnInit() { this.api.getMyBatches(this.trainerId).subscribe((d) => this.batches.set(d ?? [])); }

  select(b: TrainerBatchDto) { this.selected.set(b); }
  back() { this.selected.set(null); }

  postAnnouncement() {
    const b = this.selected();
    if (!b) return;
    this.api.postAnnouncement({ scopeType: 'Batch', scopeId: b.batchId, message: this.announceMsg, createdByUserId: 3 }).subscribe(() => {
      this.showAnnounce.set(false);
      this.announceMsg = '';
    });
  }
}
