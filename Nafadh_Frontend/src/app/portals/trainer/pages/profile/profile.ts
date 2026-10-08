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
import { environment } from '../../../../../environments/environment';

import {
  TrainerBatchDto,
  TrainerCertificateDto,
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
// TRAINER CERTIFICATES
// =====================================================

trainerCertificates = signal<TrainerCertificateDto[]>([]);

certificateName = '';
certificateIssuer = '';
certificateIssueDate = '';
certificateExpiryDate = '';
selectedCertificateFile: File | null = null;
isUploadingCertificate = signal(false);

certificateFileInput: HTMLInputElement | null = null;

  skills =
    signal<any[]>(
      []
    );
  showSkillInput =
    signal(false);

  newSkillName =
    '';

  // جلب الشهادات المخزنة مسبقاً عند تحميل الصفحة لتجنب حذفها عند الـ Refresh
  certificates = signal<any[]>(this.loadCertificatesFromStorage());

  loadCertificatesFromStorage(): any[] {
    const saved = localStorage.getItem('trainer_certificates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  saveCertificatesToStorage(list: any[]): void {
    localStorage.setItem('trainer_certificates', JSON.stringify(list));
  }
  saveSkill(): void {

    const skillName =
      this.newSkillName.trim();

    if (!skillName) {
      this.showError(
        'اكتب اسم المهارة أولًا.'
      );

      return;
    }

    const exists =
      this.skills().some(
        skill =>
          skill.skillName?.trim().toLowerCase() ===
          skillName.toLowerCase()
      );

    if (exists) {
      this.showError(
        'هذه المهارة مضافة مسبقًا.'
      );

      return;
    }

    this.skills.update(
      currentSkills => [
        ...currentSkills,
        {
          trainerSkillId: Date.now(),
          skillName
        }
      ]
    );

    this.newSkillName = '';

    this.showSkillInput.set(false);

    this.markProfileChanged();

  }
  cancelSkill(): void {

    this.newSkillName = '';

    this.showSkillInput.set(false);

  }





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


  // =====================================================
  // EDIT MODE
  // =====================================================

  isEditing =
    signal(false);


  // =====================================================
  // PROFILE IMAGE
  // =====================================================

  profileImagePreview =
    signal<string | null>(
      null
    );

  selectedProfileImage:
    File | null = null;

  // =====================================================
  // TRAINER CERTIFICATE
  // =====================================================
 // selectedCertificateFile: File | null = null;

  isCertificateFormOpen = signal(false);

  //isUploadingCertificate = signal(false);

  certificateForm = {
    certificateName: '',
    issuingOrganization: '',
    certificateNumber: '',
    issueDate: '',
    expiryDate: ''
  };

  openCertificateForm(): void {
    this.isCertificateFormOpen.set(true);
  }

  closeCertificateForm(): void {
    this.isCertificateFormOpen.set(false);
    this.selectedCertificateFile = null;
  }




  
  removeCertificate(id: number): void {
    this.certificates.update(list => {
      const updatedList = list.filter(c => c.id !== id);
      this.saveCertificatesToStorage(updatedList); // تحديث التخزين المحلي بعد الحذف
      return updatedList;
    });

    if (typeof this.markProfileChanged === 'function') {
      this.markProfileChanged();
    }
  }

  // Controls the enlarged profile image viewer.
  isProfileImageOpen =
    signal(false);





  // =====================================================
  // TOASTS
  // =====================================================

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
  ) { }


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

      this.profileImagePreview.set(
        null
      );

      this.selectedProfileImage =
        null;

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


          // Load the saved trainer profile image
          // returned by the backend.
          this.profileImagePreview.set(
            this.getProfileImageUrl(
              data.profileImageUrl
            )
          );


          // No local image is selected
          // after loading from the backend.
          this.selectedProfileImage =
            null;


          this.hasUnsavedChanges.set(
            false
          );


          this.loading.set(
            false
          );


          this.loadTrainerBatches(
            data.trainerId
          );
          this.loadTrainerCertificates(data.trainerId);

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

          this.profileImagePreview.set(
            null
          );

          this.selectedProfileImage =
            null;

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
  // PROFILE IMAGE URL
  // =====================================================

  private getProfileImageUrl(
    imageUrl?: string | null
  ): string | null {

    if (!imageUrl) {
      return null;
    }


    // Keep already absolute URLs unchanged.
    if (
      imageUrl.startsWith('http://') ||
      imageUrl.startsWith('https://')
    ) {
      return imageUrl;
    }


    // apiBaseUrl ends with /api.
    // Static profile images are served
    // outside the API route.
    const backendBaseUrl =
      environment.apiBaseUrl.replace(
        /\/api\/?$/,
        ''
      );


    return `${backendBaseUrl}${imageUrl.startsWith('/')
        ? imageUrl
        : `/${imageUrl}`
      }`;

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
  loadTrainerCertificates(trainerId: number): void {
  this.api.getTrainerCertificates(trainerId).subscribe({
    next: (items) => {
      this.trainerCertificates.set(items ?? []);
    },
    error: (error) => {
      console.error('تعذر تحميل شهادات المدرب:', error);
      this.trainerCertificates.set([]);
    }
  });
}

onCertificateFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.selectedCertificateFile = input.files?.[0] ?? null;
}

uploadCertificate(): void {
  const currentTrainer = this.trainer();

  if (!currentTrainer?.trainerId) {
    this.showError('تعذر تحديد المدرب الحالي.');
    return;
  }

  if (!this.certificateName.trim()) {
    this.showError('اكتبي اسم الشهادة أولاً.');
    return;
  }

  if (!this.selectedCertificateFile) {
    this.showError('اختاري ملف الشهادة أولاً.');
    return;
  }

  this.isUploadingCertificate.set(true);

  this.api.uploadTrainerCertificate(
    currentTrainer.trainerId,
    this.certificateName.trim(),
    this.certificateIssuer.trim(),
    this.certificateIssueDate,
    this.certificateExpiryDate,
    this.selectedCertificateFile
  ).subscribe({
    next: (certificate) => {
      this.trainerCertificates.update(items => [certificate, ...items]);
      this.resetCertificateForm();
      this.isUploadingCertificate.set(false);
      
    },
    error: (error) => {
      console.error('تعذر رفع الشهادة:', error);
      this.isUploadingCertificate.set(false);
      this.showError(error?.error?.message ?? 'تعذر رفع الشهادة.');
    }
  });
}

deleteCertificate(certificate: TrainerCertificateDto): void {
  const confirmed = window.confirm(
    `هل تريدين حذف شهادة "${certificate.certificateName}"؟`
  );

  if (!confirmed) return;

  this.api.deleteTrainerCertificate(
    certificate.trainerCertificateId
  ).subscribe({
    next: () => {
      this.trainerCertificates.update(items =>
        items.filter(x =>
          x.trainerCertificateId !== certificate.trainerCertificateId
        )
      );
      
    },
    error: (error) => {
      console.error('تعذر حذف الشهادة:', error);
      this.showError('تعذر حذف الشهادة.');
    }
  });
}

private resetCertificateForm(): void {
  this.certificateName = '';
  this.certificateIssuer = '';
  this.certificateIssueDate = '';
  this.certificateExpiryDate = '';
  this.selectedCertificateFile = null;

  if (this.certificateFileInput) {
    this.certificateFileInput.value = '';
  }
}

getCertificateFileUrl(fileUrl: string): string {
  if (!fileUrl) return '#';

  if (fileUrl.startsWith('http://' ) || fileUrl.startsWith('https://' )) {
    return fileUrl;
  }

  const backendBaseUrl = environment.apiBaseUrl.replace(/\/api\/?$/, '');
  return `${backendBaseUrl}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
}


  // =====================================================
  // EDIT PROFILE
  // =====================================================

  startEditing(): void {

    this.isEditing.set(
      true
    );

    this.showSuccessToast.set(
      false
    );

    this.showErrorToast.set(
      false
    );

  }
  openSkillInput(): void {

    if (!this.isEditing()) {
      return;
    }

    this.newSkillName = '';

    this.showSkillInput.set(true);

  }


  // =====================================================
  // ADD TRAINER SKILL
  // =====================================================

  addSkill(): void {

    if (!this.isEditing()) {
      return;
    }

    this.newSkillName = '';

    this.showSkillInput.set(true);

  }


  // =====================================================
  // REMOVE TRAINER SKILL
  // =====================================================

  removeSkill(
    skillId: number
  ): void {

    if (!this.isEditing()) {
      return;
    }

    this.skills.update(
      currentSkills =>
        currentSkills.filter(
          skill =>
            skill.trainerSkillId !== skillId
        )
    );

    this.markProfileChanged();

  }




  // =====================================================
  // PROFILE IMAGE SELECT
  // =====================================================

  onProfileImageSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0] ?? null;


    if (!file) {
      return;
    }


    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      this.showError(
        'اختاري صورة بصيغة JPG أو PNG أو WEBP.'
      );

      input.value = '';

      return;
    }


    const maxSize =
      5 * 1024 * 1024;


    if (
      file.size > maxSize
    ) {

      this.showError(
        'حجم الصورة يجب ألا يتجاوز 5 MB.'
      );

      input.value = '';

      return;
    }


    this.selectedProfileImage =
      file;


    const reader =
      new FileReader();


    reader.onload = () => {

      this.profileImagePreview.set(
        typeof reader.result === 'string'
          ? reader.result
          : null
      );


      this.markProfileChanged();

    };


    reader.readAsDataURL(
      file
    );

  }



  // =====================================================
  // PROFILE IMAGE VIEWER
  // =====================================================

  openProfileImage(): void {

    if (!this.profileImagePreview()) {
      return;
    }


    this.isProfileImageOpen.set(
      true
    );

  }


  closeProfileImage(): void {

    this.isProfileImageOpen.set(
      false
    );

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

          // Update profile information locally.
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


          // ===================================================
          // UPLOAD PROFILE IMAGE IF A NEW ONE WAS SELECTED
          // ===================================================

          if (this.selectedProfileImage) {

            const selectedImage =
              this.selectedProfileImage;


            this.api
              .uploadTrainerProfileImage(
                trainer.trainerId,
                selectedImage
              )
              .subscribe({

                next: (result) => {

                  const imageUrl =
                    this.getProfileImageUrl(
                      result.profileImageUrl
                    );


                  // Update stored image URL locally.
                  this.trainer.update(
                    current => {

                      if (!current) {
                        return current;
                      }


                      return {
                        ...current,
                        profileImageUrl:
                          result.profileImageUrl
                      };

                    }
                  );


                  // Display the image returned
                  // from the backend.
                  this.profileImagePreview.set(
                    imageUrl
                  );


                  // Image is now saved.
                  this.selectedProfileImage =
                    null;


                  this.isSaving.set(
                    false
                  );

                  this.hasUnsavedChanges.set(
                    false
                  );

                  this.isEditing.set(
                    false
                  );


                  this.showSuccess();

                },


                error: (err) => {

                  console.error(
                    'خطأ في رفع صورة المدرب:',
                    err
                  );


                  this.isSaving.set(
                    false
                  );


                  // Profile information was saved,
                  // but the image still needs saving.
                  this.hasUnsavedChanges.set(
                    true
                  );


                  this.showError(
                    'تم حفظ البيانات، ولكن تعذر رفع صورة الملف الشخصي.'
                  );

                }

              });


            // Wait for image upload before
            // finishing the save process.
            return;
          }


          // ===================================================
          // NO NEW PROFILE IMAGE
          // ===================================================

          this.isSaving.set(
            false
          );

          this.hasUnsavedChanges.set(
            false
          );

          this.isEditing.set(
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