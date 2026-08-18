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

  showSuccessToast = signal(false);
  showErrorToast = signal(false);

  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(private api: TrainerApi) {}

  ngOnInit(): void {
    this.loadTrainer();
  }

  // =========================================================
  // Load trainer profile
  // =========================================================

  loadTrainer(): void {

    this.api.getTrainer(this.trainerId).subscribe({

      next: (data) => {
        this.trainer.set(data);
      },

      error: (err) => {
        console.error('خطأ في تحميل بيانات المدرب:', err);
      }

    });
  }


  // =========================================================
  // Save trainer profile
  // =========================================================

  save(): void {

    const t = this.trainer();

    if (!t || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    const payload = {

      fullName: t.fullName ?? '',

      email: t.email ?? '',

      phone: t.phone ?? '',

      specialty: t.specialty ?? '',

      experienceYears: t.experienceYears ?? 0,

      biography: t.biography ?? '',

      cvUrl: t.cvUrl ?? ''

    };


    this.api.updateTrainer(t.trainerId, payload).subscribe({

      next: () => {

        this.isSaving.set(false);

        this.showSuccess();

        // نعيد تحميل البيانات من الباك إند
        // للتأكد أن المعروض هو ما تم حفظه فعلياً
        this.loadTrainer();

      },

      error: (err) => {

        this.isSaving.set(false);

        console.error('خطأ في حفظ بيانات المدرب:', err);

        this.showError();

      }

    });
  }


  // =========================================================
  // Toasts
  // =========================================================

  private showSuccess(): void {

    this.clearToastTimer();

    this.showErrorToast.set(false);

    this.showSuccessToast.set(true);

    this.toastTimer = setTimeout(() => {

      this.showSuccessToast.set(false);

    }, 3000);
  }


  private showError(): void {

    this.clearToastTimer();

    this.showSuccessToast.set(false);

    this.showErrorToast.set(true);

    this.toastTimer = setTimeout(() => {

      this.showErrorToast.set(false);

    }, 3000);
  }


  private clearToastTimer(): void {

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }
}