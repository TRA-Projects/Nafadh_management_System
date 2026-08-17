import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerApi } from '../../services/trainer-api';
import { TrainerDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class TrainerProfile implements OnInit {
  trainerId = 1;
  trainer = signal<TrainerDto | null>(null);
  isSaving = signal(false);
  showToast = signal(false);

  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(private api: TrainerApi) {}

  ngOnInit(): void {
    this.loadTrainer();
  }

  loadTrainer(): void {
    this.api.getTrainer(this.trainerId).subscribe({
      next: (data) => this.trainer.set(data),
      error: (err) => console.error('خطأ في تحميل البيانات:', err)
    });
  }

  save(): void {
    const t = this.trainer();
    if (!t) return;

    this.isSaving.set(true);

    this.api.updateTrainer(t.trainerId, t).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.triggerToast();
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('خطأ في الحفظ:', err);
        this.triggerToast();
      }
    });
  }

  private triggerToast(): void {
    this.showToast.set(true);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.showToast.set(false), 3000);
  }
}