import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { TraineeProfileDto } from '../../../../core/models/dtos';

interface TraineeUpdateDto {

  email: string;

  phone?: string;

  skills: string;

  resumeUrl?: string;

  gitHubUrl?: string;

  linkedInUrl?: string;

  academicLevel?: string;
}

@Component({
  selector: 'app-trainee-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
})
export class TraineeProfile implements OnInit {

  userId = 0;

  traineeId = 1;

  trainee = signal<any>(null);

  editing = signal(false);

  avatarUrl = signal<string | null>(null);

  // =========================================================
  // Snapshot for detecting changes
  // =========================================================

  private originalProfile: any = null;

  constructor(private api: TraineeApi) {}

  ngOnInit() {

    this.getLoggedInUserId();

    this.loadTraineeData();
  }


  // =========================================================
  // Get logged-in UserId
  // =========================================================

  private getLoggedInUserId() {

    try {

      const session =
        localStorage.getItem('nafadh_session');

      if (session) {

        try {

          const parsed =
            JSON.parse(session);

          if (parsed?.userId) {

            this.userId =
              Number(parsed.userId);

            console.log(
              'Logged UserId from nafadh_session:',
              this.userId
            );

            return;
          }

        } catch {

          console.warn(
            'تعذر قراءة nafadh_session'
          );

        }

      }


      for (
        let i = 0;
        i < localStorage.length;
        i++
      ) {

        const key =
          localStorage.key(i);

        if (!key) continue;

        const val =
          localStorage.getItem(key);

        if (!val) continue;

        try {

          const parsed =
            JSON.parse(val);

          if (parsed?.userId) {

            this.userId =
              Number(parsed.userId);

            console.log(
              'Logged UserId from localStorage:',
              this.userId
            );

            return;
          }

        } catch {

          // القيمة ليست JSON

        }

      }


      const token =
        localStorage.getItem('auth_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('user_session');


      if (
        token &&
        token.includes('.')
      ) {

        const payload =
          JSON.parse(
            atob(
              token
                .split('.')[1]
                .replace(/-/g, '+')
                .replace(/_/g, '/')
            )
          );


        const foundUserId =
          payload.userId ||
          payload.nameid ||
          payload[
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
          ];


        if (foundUserId) {

          this.userId =
            Number(foundUserId);

          console.log(
            'Logged UserId from JWT:',
            this.userId
          );

          return;

        }

      }


      console.warn(
        'لم يتم العثور على UserId للمستخدم الحالي'
      );

    } catch (e) {

      console.error(
        'خطأ في قراءة UserId:',
        e
      );

    }

  }


  // =========================================================
  // Load trainee
  // =========================================================

  loadTraineeData() {

    if (
      !this.userId ||
      this.userId <= 0
    ) {

      console.error(
        'UserId غير صالح:',
        this.userId
      );

      return;

    }


    console.log(
      'Loading trainee using UserId:',
      this.userId
    );


    this.api
      .getTrainee(this.userId)
      .subscribe({

        next: (t) => {

          console.log(
            'Trainee data received:',
            t
          );


          if (t) {

            /*
             * =====================================================
             * IMPORTANT:
             * Make sure phone is available in the object.
             *
             * Supports:
             * phone
             * phoneNumber
             * mobileNumber
             *
             * This does NOT change the backend.
             * It only normalizes the response for the UI.
             * =====================================================
             */

            const traineeData: any = {
              ...t,

              phone:
                t.phone ??
                (t as any).phoneNumber ??
                (t as any).mobileNumber ??
                ''
            };


            this.trainee.set(
              traineeData
            );


            if (
              traineeData.traineeId
            ) {

              this.traineeId =
                Number(
                  traineeData.traineeId
                );

            }


            console.log(
              'TraineeId:',
              this.traineeId
            );


            console.log(
              'UserId:',
              this.userId
            );


            console.log(
              'Phone from Backend:',
              traineeData.phone
            );

          }

        },


        error: (err) => {

          console.error(
            'خطأ في جلب البيانات:',
            err
          );


          console.error(
            'Status:',
            err.status
          );


          console.error(
            'Error:',
            err.error
          );

        }

      });

  }


  // =========================================================
  // Create snapshot when entering edit mode
  // =========================================================

  private createProfileSnapshot(t: any) {

    return {

      email:
        t.email?.toString().trim() || '',

      phone:
        t.phone?.toString().trim() || '',

      academicLevel:
        t.academicLevel?.toString().trim() || '',

      skills:
        this.getSkillsList(
          t.skills
        ).join(', '),

      resumeUrl:
        t.resumeUrl?.toString().trim() || '',

      gitHubUrl:
        t.gitHubUrl?.toString().trim() || '',

      linkedInUrl:
        t.linkedInUrl?.toString().trim() || ''
    };

  }


  // =========================================================
  // Check whether user changed anything
  // =========================================================

  private hasProfileChanges(t: any): boolean {

    if (!this.originalProfile) {

      return true;

    }


    const current =
      this.createProfileSnapshot(t);


    return (
      JSON.stringify(
        current
      ) !==
      JSON.stringify(
        this.originalProfile
      )
    );

  }


  // =========================================================
  // Edit / Save
  // =========================================================

  toggleEdit() {

    // =======================================================
    // ENTER EDIT MODE
    // =======================================================

    if (!this.editing()) {

      const t =
        this.trainee();

      if (!t) {

        return;

      }


      // Save the original values before editing
      this.originalProfile =
        this.createProfileSnapshot(t);


      console.log(
        'Original profile snapshot:',
        this.originalProfile
      );


      this.editing.set(true);

      return;

    }


    // =======================================================
    // SAVE
    // =======================================================

    const t =
      this.trainee();


    if (!t) {

      this.editing.set(false);

      return;

    }


    // =======================================================
    // IMPORTANT:
    // If nothing changed, DO NOT call backend.
    // Simply leave edit mode.
    // =======================================================

    if (
      !this.hasProfileChanges(t)
    ) {

      console.log(
        'No changes detected. Nothing to update.'
      );

      this.editing.set(false);

      this.originalProfile = null;

      return;

    }


    if (
      !this.userId ||
      this.userId <= 0
    ) {

      console.error(
        'لا يمكن الحفظ: UserId غير موجود',
        this.userId
      );


      alert(
        'تعذر حفظ التعديلات. لم يتم العثور على UserId للمستخدم الحالي.'
      );

      return;

    }


    // =======================================================
    // فقط الحقول المسموح للمستخدم تعديلها
    // =======================================================

    const payload: TraineeUpdateDto = {

      email:
        t.email?.toString().trim() || '',


      // =====================================================
      // Phone
      // =====================================================

      phone:
        t.phone?.toString().trim() || undefined,


      academicLevel:
        t.academicLevel
          ?.toString()
          .trim() || undefined,


      skills:
        this.getSkillsList(
          t.skills
        ).join(', '),


      resumeUrl:
        t.resumeUrl
          ?.toString()
          .trim() || undefined,


      gitHubUrl:
        t.gitHubUrl
          ?.toString()
          .trim() || undefined,


      linkedInUrl:
        t.linkedInUrl
          ?.toString()
          .trim() || undefined

    };


    console.log(
      'Saving profile using UserId:',
      this.userId
    );


    console.log(
      'Update payload:',
      payload
    );


    this.api
      .updateTrainee(
        this.userId,
        payload
      )
      .subscribe({

        next: (updatedTrainee) => {

          console.log(
            'تم حفظ التعديلات بنجاح:',
            updatedTrainee
          );


          if (updatedTrainee) {

            const updated =
              updatedTrainee as Partial<{
                traineeId:
                  number | string;

                phone:
                  string;

                phoneNumber:
                  string;

                mobileNumber:
                  string;
              }>;


            /*
             * Normalize phone again after update
             */

            const updatedData: any = {

              ...updatedTrainee,

              phone:
                updated.phone ??
                updated.phoneNumber ??
                updated.mobileNumber ??
                t.phone ??
                ''

            };


            this.trainee.set(
              updatedData
            );


            if (
              updatedData.traineeId
            ) {

              this.traineeId =
                Number(
                  updatedData.traineeId
                );

            }

          }


          this.editing.set(false);

          this.originalProfile = null;


          // إعادة الجلب من Backend
          // حتى نتأكد أن البيانات محفوظة فعليًا.

          this.loadTraineeData();

        },


        error: (err) => {

          console.error(
            'فشل حفظ التعديلات:',
            err
          );


          console.error(
            'Status:',
            err.status
          );


          console.error(
            'Backend Error:',
            err.error
          );


          alert(
            err.error?.message ||
            'حدث خطأ أثناء حفظ التعديلات.'
          );

        }

      });

  }


  // =========================================================
  // Avatar
  // =========================================================

  onAvatarUpload(event: Event) {

    const input =
      event.target as HTMLInputElement;


    if (
      input.files &&
      input.files.length > 0
    ) {

      const file =
        input.files[0];


      const reader =
        new FileReader();


      reader.onload = () => {

        this.avatarUrl.set(
          reader.result as string
        );

      };


      reader.readAsDataURL(file);


      this.trainee.update(
        (current) => {

          if (!current) {

            return current;

          }


          return {

            ...current,

            avatar:
              file.name

          };

        }
      );

    }

  }


  // =========================================================
  // CV
  // =========================================================

  onCvUpload(event: Event) {

    const input =
      event.target as HTMLInputElement;


    if (
      input.files &&
      input.files.length > 0
    ) {

      const file =
        input.files[0];


      this.trainee.update(
        (current) => {

          if (!current) {

            return current;

          }


          return {

            ...current,

            cvFileName:
              file.name,

            resumeUrl:
              file.name

          };

        }
      );

    }

  }


  // =========================================================
  // Skills
  // =========================================================

  getSkillsList(
    skills: any
  ): string[] {

    if (!skills) {

      return [];

    }


    if (Array.isArray(skills)) {

      return skills;

    }


    if (
      typeof skills === 'string'
    ) {

      return skills
        .split(',')
        .map(
          (s) =>
            s.trim()
        )
        .filter(
          Boolean
        );

    }


    return [];

  }


  // =========================================================
  // Add skill
  // =========================================================

  addSkill() {

    const newSkill =
      prompt(
        'أدخل اسم المهارة الجديدة:'
      );


    if (
      !newSkill ||
      !newSkill.trim()
    ) {

      return;

    }


    const skill =
      newSkill.trim();


    this.trainee.update(
      (current) => {

        if (!current) {

          return current;

        }


        const skillsArr =
          this.getSkillsList(
            current.skills
          );


        const exists =
          skillsArr.some(
            (item) =>
              item.toLowerCase() ===
              skill.toLowerCase()
          );


        if (exists) {

          alert(
            'هذه المهارة موجودة بالفعل.'
          );

          return current;

        }


        return {

          ...current,

          skills:
            [
              ...skillsArr,
              skill
            ].join(', ')

        };

      }
    );

  }


  // =========================================================
  // Remove skill
  // =========================================================

  removeSkill(
    index: number
  ) {

    this.trainee.update(
      (current) => {

        if (!current) {

          return current;

        }


        const skillsArr =
          this.getSkillsList(
            current.skills
          );


        skillsArr.splice(
          index,
          1
        );


        return {

          ...current,

          skills:
            skillsArr.join(', ')

        };

      }
    );

  }

}