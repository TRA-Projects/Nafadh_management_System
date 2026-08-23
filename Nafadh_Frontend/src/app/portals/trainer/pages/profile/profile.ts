import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  TrainerBatchDto,
  TrainerDto
} from '../../../../core/models/dtos';


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
    signal<TrainerDto | null>(
      null
    );

  trainerBatches =
    signal<TrainerBatchDto[]>(
      []
    );


  // =====================================================
  // PROFILE SUMMARY
  // =====================================================

  assignedBatchesCount =
    computed(() => {

      return this.trainerBatches()
        .length;

    });


  ongoingBatchesCount =
    computed(() => {

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );


      return this.trainerBatches()
        .filter(
          batch => {

            if (!batch.startDate) {

              return false;

            }


            const startDate =
              new Date(
                batch.startDate
              );


            if (
              Number.isNaN(
                startDate.getTime()
              )
            ) {

              return false;

            }


            startDate.setHours(
              0,
              0,
              0,
              0
            );


            let endDate:
              Date | null = null;


            if (batch.endDate) {

              endDate =
                new Date(
                  batch.endDate
                );


              if (
                Number.isNaN(
                  endDate.getTime()
                )
              ) {

                endDate = null;

              }
              else {

                endDate.setHours(
                  0,
                  0,
                  0,
                  0
                );

              }

            }


            return (
              today >= startDate &&
              (
                !endDate ||
                today <= endDate
              )
            );

          }
        )
        .length;

    });


  // =====================================================
  // PAGE STATE
  // =====================================================

  loading =
    signal(false);

  isSaving =
    signal(false);

  hasUnsavedChanges =
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


      this.trainer.set(
        null
      );

      this.trainerBatches.set(
        []
      );

      this.hasUnsavedChanges.set(
        false
      );


      this.showError(
        'تعذر تحديد المستخدم الحالي.'
      );

      return;
    }


    this.loading.set(
      true
    );


    this.api
      .getTrainerByUserId(
        userId
      )
      .subscribe({

        next: (data) => {

          this.trainer.set(
            data
          );


          this.hasUnsavedChanges.set(
            false
          );


          this.loading.set(
            false
          );


          this.loadTrainerBatches(
            data.trainerId
          );

        },


        error: (err) => {

          console.error(
            'خطأ في تحميل بيانات المدرب الحالي:',
            err
          );


          this.trainer.set(
            null
          );

          this.trainerBatches.set(
            []
          );

          this.hasUnsavedChanges.set(
            false
          );

          this.loading.set(
            false
          );


          this.showError(
            'تعذر تحميل بيانات الملف الشخصي.'
          );

        }

      });

  }


  // =====================================================
  // LOAD TRAINER BATCHES
  // =====================================================

  private loadTrainerBatches(
    trainerId: number
  ): void {

    this.api
      .getMyBatches(
        trainerId
      )
      .subscribe({

        next: (batches) => {

          this.trainerBatches.set(
            batches ?? []
          );

        },


        error: (err) => {

          console.error(
            'خطأ في تحميل دفعات المدرب:',
            err
          );


          this.trainerBatches.set(
            []
          );

        }

      });

  }


  // =====================================================
  // PROFILE CHANGE STATE
  // =====================================================

  markProfileChanged(): void {

    this.hasUnsavedChanges.set(
      true
    );


    this.showSuccessToast.set(
      false
    );

    this.showErrorToast.set(
      false
    );

  }


  // =====================================================
  // SAVE TRAINER PROFILE
  // =====================================================

  save(): void {

    const trainer =
      this.trainer();


    if (
      !trainer ||
      this.isSaving() ||
      !this.hasUnsavedChanges()
    ) {

      return;

    }


    // ===================================================
    // FULL NAME VALIDATION
    // ===================================================

    const fullName =
      trainer.fullName?.trim() ?? '';


    if (!fullName) {

      this.showError(
        'الاسم الكامل مطلوب.'
      );

      return;
    }


    // ===================================================
    // EMAIL VALIDATION
    // ===================================================

    const email =
      trainer.email?.trim() ?? '';


    if (email) {

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


      if (
        !emailPattern.test(
          email
        )
      ) {

        this.showError(
          'أدخلي بريدًا إلكترونيًا صحيحًا.'
        );

        return;
      }

    }


    // ===================================================
    // PHONE VALIDATION
    // ===================================================

    const phone =
      trainer.phone?.trim() ?? '';


    if (phone) {

      const normalizedPhone =
        phone.replace(
          /[\s\-()]/g,
          ''
        );


      const phonePattern =
        /^\+?[0-9]{8,15}$/;


      if (
        !phonePattern.test(
          normalizedPhone
        )
      ) {

        this.showError(
          'أدخلي رقم هاتف صحيحًا.'
        );

        return;
      }

    }


    // ===================================================
    // EXPERIENCE VALIDATION
    // ===================================================

    const experienceYears =
      Number(
        trainer.experienceYears
      );


    if (
      !Number.isFinite(
        experienceYears
      ) ||
      !Number.isInteger(
        experienceYears
      ) ||
      experienceYears < 0 ||
      experienceYears > 100
    ) {

      this.showError(
        'سنوات الخبرة يجب أن تكون رقمًا صحيحًا بين 0 و100.'
      );

      return;
    }


    // ===================================================
    // PAYLOAD
    // ===================================================

    const payload = {

      fullName,

      email,

      phone,

      specialty:
        trainer.specialty?.trim() ?? '',

      experienceYears,

      biography:
        trainer.biography?.trim() ?? '',

      cvUrl:
        trainer.cvUrl?.trim() ?? ''

    };


    // ===================================================
    // SAVE
    // ===================================================

    this.isSaving.set(
      true
    );

    this.showSuccessToast.set(
      false
    );

    this.showErrorToast.set(
      false
    );


    this.api
      .updateTrainer(
        trainer.trainerId,
        payload
      )
      .subscribe({

        next: () => {

          // نحدث النسخة المحلية
          // بدون إعادة تحميل الصفحة.
          this.trainer.update(
            current => {

              if (!current) {

                return current;

              }


              return {
                ...current,
                ...payload
              };

            }
          );


          this.isSaving.set(
            false
          );

          this.hasUnsavedChanges.set(
            false
          );


          this.showSuccess();

        },


        error: (err) => {

          console.error(
            'خطأ في حفظ بيانات المدرب:',
            err
          );


          this.isSaving.set(
            false
          );


          this.showError(
            'حدث خطأ أثناء تحديث بيانات الملف الشخصي.'
          );

        }

      });

  }


  // =====================================================
  // SUCCESS TOAST
  // =====================================================

  private showSuccess(): void {

    this.clearToastTimer();


    this.showErrorToast.set(
      false
    );

    this.showSuccessToast.set(
      true
    );


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


  // =====================================================
  // ERROR TOAST
  // =====================================================

  private showError(
    message: string
  ): void {

    this.clearToastTimer();


    this.errorToastMessage.set(
      message
    );


    this.showSuccessToast.set(
      false
    );

    this.showErrorToast.set(
      true
    );


    this.toastTimer =
      setTimeout(
        () => {

          this.showErrorToast.set(
            false
          );

        },
        3500
      );

  }


  // =====================================================
  // CLEAR TOAST TIMER
  // =====================================================

  private clearToastTimer(): void {

    if (!this.toastTimer) {

      return;

    }


    clearTimeout(
      this.toastTimer
    );


    this.toastTimer =
      undefined;

  }

}