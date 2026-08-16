import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { ProjectDto, SubmissionDto, TaskDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-tasks',
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.html',
})
export class TraineeTasks implements OnInit {
  traineeId = 1;
  batchId = 1;
  programId = 1;
  tab = signal<'assignments' | 'projects'>('assignments');
  tasks = signal<TaskDto[]>([]);
  submissions = signal<SubmissionDto[]>([]);
  projects = signal<ProjectDto[]>([]);
  selected = signal<TaskDto | null>(null);
  submissionLink = '';

  constructor(private api: TraineeApi) {}
  ngOnInit() {
    this.api.getTasks(this.batchId).subscribe((d) => this.tasks.set(d ?? []));
    this.api.getSubmissions(this.traineeId).subscribe((d) => this.submissions.set(d ?? []));
    this.api.getProjectsByProgram(this.programId).subscribe((d) => this.projects.set(d ?? []));
  }

  submissionFor(taskId: number) { return this.submissions().find((s) => s.taskId === taskId); }

  submit() {
    const t = this.selected();
    if (!t || !this.submissionLink.trim()) return;
    this.api.submitAssignment({ taskId: t.taskId, traineeId: this.traineeId, fileUrl: this.submissionLink }).subscribe(() => {
      this.selected.set(null);
      this.submissionLink = '';
      this.api.getSubmissions(this.traineeId).subscribe((d) => this.submissions.set(d ?? []));
    });
  }
}
