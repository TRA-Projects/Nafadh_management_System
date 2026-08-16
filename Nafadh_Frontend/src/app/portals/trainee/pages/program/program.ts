import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TraineeApi } from '../../services/trainee-api';
import { LessonDto, ModuleDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-program',
  imports: [CommonModule],
  templateUrl: './program.html',
})
export class TraineeProgram implements OnInit {
  traineeId = 1;
  programId = 1;
  modules = signal<ModuleDto[]>([]);
  lessonsByModule = signal<Record<number, LessonDto[]>>({});
  openModule = signal<number | null>(null);
  progress = signal(0);

  constructor(private api: TraineeApi) {}
  ngOnInit() {
    this.api.getModulesByProgram(this.programId).subscribe((d) => this.modules.set(d ?? []));
    this.api.getModuleProgressPercentage(this.traineeId).subscribe({ next: (p) => this.progress.set(p), error: () => {} });
  }

  toggle(m: ModuleDto) {
    const isOpen = this.openModule() === m.moduleId;
    this.openModule.set(isOpen ? null : m.moduleId);
    if (!isOpen && !this.lessonsByModule()[m.moduleId]) {
      this.api.getLessons(m.moduleId).subscribe((lessons) => {
        this.lessonsByModule.update((map) => ({ ...map, [m.moduleId]: lessons ?? [] }));
      });
    }
  }
}
