import {
  Component,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { TrainerDto } from '../../../../core/models/dtos';


@Component({
  selector: 'app-trainer-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class TrainerProfile
  implements OnInit, OnDestroy {

  // =====================================================
  // DATA
  // =====================================================

  trainer =
    signal<TrainerDto | null>(null);


  // =====================================================
  // PAGE STATE
  // =====================================================

  loading =
    signal(false);

  isSaving =
    signal(false);

  showSuccessToast =
    signal(false);

  showErrorToast =
    signal(false);

  errorToastMessage =
    signal(
      'حدث خطأ أثناء تنفيذ العملية.'
    );


  private toastTimer?:
    ReturnType<typeof setTimeout>;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    private auth: AuthService
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.loadTrainer();

  }


  ngOnDestroy(): void {

    this.clearToastTimer();

  }


  // =====================================================
  // LOAD CURRENT TRAINER
  // =====================================================

  loadTrainer(): void {

    const userId =
      this.auth.session()?.userId;


    if (!userId) {

      console.error(
        'لا يوجد مستخدم مسجل حالياً'
      );


      this.trainer.set(null);

      this.showError(
        'تعذر تحديد المستخدم الحالي.'
      );

      return;
    }


    this.loading.set(true);


    this.api
      .getTrainerByUserId(userId)
      .subscribe({

        next: (data) => {

          this.trainer.set(
            data
          );

          this.loading.set(false);

        },


        error: (err) => {

          console.error(
            'خطأ في تحميل بيانات المدرب الحالي:',
            err
          );


          this.trainer.set(null);

          this.loading.set(false);

          this.showError(
            'تعذر تحميل بيانات الملف الشخصي.'
          );

        }

      });

  }


  // =====================================================
  // SAVE TRAINER PROFILE
  // =====================================================

  save(): void {

    const trainer =
      this.trainer();


    if (
      !trainer ||
      this.isSaving()
    ) {

      return;

    }


    // Basic validation
    if (
      !trainer.fullName?.trim()
    ) {

      this.showError(
        'الاسم الكامل مطلوب.'
      );

      return;
    }


    if (
      trainer.experienceYears < 0 ||
      trainer.experienceYears > 100
    ) {

      this.showError(
        'سنوات الخبرة يجب أن تكون بين 0 و100.'
      );

      return;
    }


    this.isSaving.set(true);

    this.showErrorToast.set(false);

    this.showSuccessToast.set(false);


    const payload = {

      fullName:
        trainer.fullName.trim(),

      email:
        trainer.email?.trim() ?? '',

      phone:
        trainer.phone?.trim() ?? '',

      specialty:
        trainer.specialty?.trim() ?? '',

      experienceYears:
        trainer.experienceYears ?? 0,

      biography:
        trainer.biography?.trim() ?? '',

      cvUrl:
        trainer.cvUrl?.trim() ?? ''

    };


    this.api
      .updateTrainer(
        trainer.trainerId,
        payload
      )
      .subscribe({

        next: () => {

          this.isSaving.set(false);

          this.showSuccess();

          // نجيب النسخة المحدثة
          // من قاعدة البيانات
          this.loadTrainer();

        },


        error: (err) => {

          console.error(
            'خطأ في حفظ بيانات المدرب:',
            err
          );


          this.isSaving.set(false);

          this.showError(
            'حدث خطأ أثناء تحديث بيانات الملف الشخصي.'
          );

        }

      });

  }


  // =====================================================
  // TOASTS
  // =====================================================

  private showSuccess(): void {

    this.clearToastTimer();

    this.showErrorToast.set(false);

    this.showSuccessToast.set(true);


    this.toastTimer =
      setTimeout(
        () => {

          this.showSuccessToast.set(
            false
          );

        },
        3000
      );

  }


  private showError(
    message: string
  ): void {

    this.clearToastTimer();

    this.errorToastMessage.set(
      message
    );

    this.showSuccessToast.set(false);

    this.showErrorToast.set(true);


    this.toastTimer =
      setTimeout(
        () => {

          this.showErrorToast.set(
            false
          );

        },
        3000
      );

  }


  private clearToastTimer(): void {

    if (
      this.toastTimer
    ) {

      clearTimeout(
        this.toastTimer
      );

      this.toastTimer =
        undefined;

    }

  }

}