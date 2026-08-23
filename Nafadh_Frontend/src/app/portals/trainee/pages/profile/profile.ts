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
}

@Component({
  selector: 'app-trainee-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
})
export class TraineeProfile implements OnInit {

  // مهم:
  // هذا أصبح UserId لأن API التعديل والجلب المستخدم هنا يعتمد على UserId
  userId = 0;

  // نخليه موجود حتى لا يتأثر أي جزء آخر من الصفحة يعتمد عليه
  traineeId = 1;

  trainee = signal<any>(null);

  editing = signal(false);

  avatarUrl = signal<string | null>(null);

  // جديد فقط: حفظ رابط الملف المرفوع مؤقتًا للتحميل
  cvDownloadUrl = signal<string | null>(null);

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

      // -------------------------------------------------------
      // 1. nafadh_session
      // -------------------------------------------------------

      const session = localStorage.getItem('nafadh_session');

      if (session) {
        try {
          const parsed = JSON.parse(session);

          if (parsed?.userId) {
            this.userId = Number(parsed.userId);

            console.log(
              'Logged UserId from nafadh_session:',
              this.userId
            );

            return;
          }
        } catch {
          console.warn('تعذر قراءة nafadh_session');
        }
      }

      // -------------------------------------------------------
      // 2. Search other localStorage JSON objects
      // -------------------------------------------------------

      for (let i = 0; i < localStorage.length; i++) {

        const key = localStorage.key(i);

        if (!key) continue;

        const val = localStorage.getItem(key);

        if (!val) continue;

        try {

          const parsed = JSON.parse(val);

          if (parsed?.userId) {

            this.userId = Number(parsed.userId);

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

      // -------------------------------------------------------
      // 3. Search JWT token
      // -------------------------------------------------------

      const token =
        localStorage.getItem('auth_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('user_session');

      if (token && token.includes('.')) {

        const payload = JSON.parse(
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

          this.userId = Number(foundUserId);

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

    if (!this.userId || this.userId <= 0) {

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

    this.api.getTrainee(this.userId).subscribe({

      next: (t) => {

        console.log(
          'Trainee data received:',
          t
        );

        if (t) {

          this.trainee.set(t);

          // نحتفظ بـ TraineeId الحقيقي أيضًا
          if (t.traineeId) {
            this.traineeId = Number(t.traineeId);
          }

          console.log(
            'TraineeId:',
            this.traineeId
          );

          console.log(
            'UserId:',
            this.userId
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
  // Edit / Save
  // =========================================================

  toggleEdit() {

    // -------------------------------------------------------
    // Start editing
    // -------------------------------------------------------

    if (!this.editing()) {

      this.editing.set(true);

      return;
    }

    // -------------------------------------------------------
    // Save changes
    // -------------------------------------------------------

    const t = this.trainee();

    if (!t) {

      this.editing.set(false);

      return;
    }

    if (!this.userId || this.userId <= 0) {

      console.error(
        'لا يمكن الحفظ: UserId غير موجود',
        this.userId
      );

      alert(
        'تعذر حفظ التعديلات. لم يتم العثور على UserId للمستخدم الحالي.'
      );

      return;
    }

    // -------------------------------------------------------
    // Build ONLY the fields that the backend allows updating
    // -------------------------------------------------------

    const payload: TraineeUpdateDto = {

      email:
        t.email?.toString().trim() || '',

      phone:
        t.phone?.toString().trim() || undefined,

      skills:
        this.getSkillsList(t.skills).join(', '),

      resumeUrl:
        t.resumeUrl?.toString().trim() || undefined,

      gitHubUrl:
        t.gitHubUrl?.toString().trim() || undefined,

      linkedInUrl:
        t.linkedInUrl?.toString().trim() || undefined
    };

    console.log(
      'Saving profile using UserId:',
      this.userId
    );

    console.log(
      'Update payload:',
      payload
    );

    // -------------------------------------------------------
    // PUT api/Trainee/traineeByUserID/{userId}
    // -------------------------------------------------------

    this.api.updateTrainee(
      this.userId,
      payload
    ).subscribe({

      next: (updatedTrainee) => {

        console.log(
          'تم حفظ التعديلات بنجاح:',
          updatedTrainee
        );

        // إذا الـAPI رجع البيانات المحدثة
        if (updatedTrainee) {

          const updated = updatedTrainee as Partial<{
            traineeId: number | string;
          }>;

          this.trainee.set(updatedTrainee);

          if (updated.traineeId) {

            this.traineeId =
              Number(updated.traineeId);
          }
        }

        // إغلاق وضع التعديل
        this.editing.set(false);

        // إعادة الجلب من الـBackend
        // للتأكد أن البيانات أصبحت محفوظة فعليًا
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
            avatar: file.name
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

      // جديد:
      // إنشاء رابط مؤقت للملف حتى يمكن تحميله مباشرة
      // بدون تغيير منطق الرفع القديم
      const objectUrl =
        URL.createObjectURL(file);

      this.cvDownloadUrl.set(
        objectUrl
      );

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
  // Download CV
  // =========================================================

  downloadCv() {

    const t = this.trainee();

    if (!t) {
      return;
    }

    // -------------------------------------------------------
    // إذا تم رفع الملف الآن
    // -------------------------------------------------------

    const localUrl =
      this.cvDownloadUrl();

    if (localUrl) {

      const link =
        document.createElement('a');

      link.href =
        localUrl;

      link.download =
        t.cvFileName ||
        'CV.pdf';

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      return;
    }

    // -------------------------------------------------------
    // إذا كان الملف موجودًا من الـ Backend
    // -------------------------------------------------------

    const resumeUrl =
      t.resumeUrl;

    if (
      resumeUrl &&
      typeof resumeUrl === 'string' &&
      (
        resumeUrl.startsWith('http://') ||
        resumeUrl.startsWith('https://') ||
        resumeUrl.startsWith('/')
      )
    ) {

      window.open(
        resumeUrl,
        '_blank'
      );

      return;
    }

    alert(
      'لا يوجد ملف سيرة ذاتية متاح للتحميل.'
    );
  }

  // =========================================================
  // Skills
  // =========================================================

  getSkillsList(skills: any): string[] {

    if (!skills) {
      return [];
    }

    if (Array.isArray(skills)) {
      return skills;
    }

    if (typeof skills === 'string') {

      return skills
        .split(',')
        .map(
          (s) => s.trim()
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

        // منع تكرار المهارة
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

  removeSkill(index: number) {

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
getCvDownloadUrl(resumeUrl: string): string {
  if (!resumeUrl) {
    return '';
  }

  // إذا كان Backend يرجع رابط كامل
  if (
    resumeUrl.startsWith('http://') ||
    resumeUrl.startsWith('https://')
  ) {
    return resumeUrl;
  }

  // إذا كان يرجع مسار مثل /uploads/cv/file.pdf
  if (resumeUrl.startsWith('/')) {
    return `${window.location.origin}${resumeUrl}`;
  }

  // إذا كان يرجع اسم/مسار نسبي
  return `${window.location.origin}/${resumeUrl}`;
}



}