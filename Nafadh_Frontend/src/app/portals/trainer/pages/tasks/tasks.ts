import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainerApi } from '../../services/trainer-api';
import { TaskDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-tasks',
  imports: [CommonModule],
  templateUrl: './tasks.html',
})
export class TrainerTasks implements OnInit {
  batchIdInput = 1;
  tasks = signal<TaskDto[]>([]);
  constructor(private api: TrainerApi) {}
  ngOnInit() { this.api.getTasksByBatch(this.batchIdInput).subscribe((d) => this.tasks.set(d ?? [])); }

  col(status: string) { return this.tasks().filter((t) => t.status === status); }
}
