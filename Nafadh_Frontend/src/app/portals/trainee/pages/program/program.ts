import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TraineeApi } from '../../services/trainee-api';
import { LessonDto, ModuleDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-program',
  standalone: true,
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
    this.api.getModulesByProgram(this.programId).subscribe({
      next: (d) => this.modules.set(d ?? []),
      error: () => this.modules.set([])
    });

    this.api.getModuleProgressPercentage(this.traineeId).subscribe({
      next: (p) => this.progress.set(p),
      error: () => {}
    });
  }

  toggle(m: ModuleDto) {
    const mId = m.moduleId;
    const isOpen = this.openModule() === mId;
    
    this.openModule.set(isOpen ? null : mId);
    
    if (!isOpen && mId && !this.lessonsByModule()[mId]) {
      this.api.getLessons(mId).subscribe({
        next: (lessons) => {
          this.lessonsByModule.update((map) => ({ ...map, [mId]: lessons ?? [] }));
        },
        error: () => {
          this.lessonsByModule.update((map) => ({ ...map, [mId]: [] }));
        }
      });
    }
  }
}