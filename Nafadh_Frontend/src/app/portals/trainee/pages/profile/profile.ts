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
  // Validation signals
  // =========================================================

  phoneError = signal<string | null>(null);

  gitHubError = signal<string | null>(null);

  linkedInError = signal<string | null>(null);

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
  // Validation Methods
  // =========================================================

  /**
   * التحقق من صحة رقم الهاتف
   * يجب أن يبدأ بـ +968 وبعده 8 أرقام فقط
   */
  validatePhone(phone: string): void {

    if (!phone || phone.trim() === '') {

      this.phoneError.set(null);

      return;

    }

    const cleanPhone = phone.trim();

    // نمط رقم الهاتف: +968 متبوعاً بـ 8 أرقام فقط
    const phoneRegex = /^\+968\d{8}$/;

    if (!phoneRegex.test(cleanPhone)) {

      this.phoneError.set('رقم الهاتف يجب أن يبدأ بـ +968 ويتبعه 8 أرقام فقط (مثال: +96812345678)');

    } else {

      this.phoneError.set(null);

    }

  }


  validateGitHub(url: string): void {

    if (!url || url.trim() === '') {

      this.gitHubError.set(null);

      return;

    }

    const cleanUrl = url.trim();

    // نمط رابط GitHub صحيح
    const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?$/;

    if (!githubRegex.test(cleanUrl)) {

      this.gitHubError.set('الرجاء إدخال رابط GitHub صحيح (مثال: https://github.com/username)');

    } else {

      // التأكد من وجود https:// في البداية
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {

        const currentTrainee = this.trainee();

        if (currentTrainee) {

          this.trainee.update((curr) => ({

            ...curr,

            gitHubUrl: 'https://' + cleanUrl

          }));

        }

      }

      this.gitHubError.set(null);

    }

  }


  validateLinkedIn(url: string): void {

    if (!url || url.trim() === '') {

      this.linkedInError.set(null);

      return;

    }

    const cleanUrl = url.trim();

    // نمط رابط LinkedIn صحيح
    const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company|school)\/[a-zA-Z0-9-]+$/;

    if (!linkedinRegex.test(cleanUrl)) {

      this.linkedInError.set('الرجاء إدخال رابط LinkedIn صحيح (مثال: https://www.linkedin.com/in/username)');

    } else {

      // التأكد من وجود https:// في البداية
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {

        const currentTrainee = this.trainee();

        if (currentTrainee) {

          this.trainee.update((curr) => ({

            ...curr,

            linkedInUrl: 'https://' + cleanUrl

          }));

        }

      }

      this.linkedInError.set(null);

    }

  }


  /**
   * دالة للتحقق من صحة جميع الحقول قبل الحفظ
   * تعيد true إذا كانت جميع الحقول صحيحة أو فارغة (اختيارية)
   */
  private isFormValid(): boolean {

    const t = this.trainee();

    if (!t) return false;

    let hasError = false;

    // التحقق من صحة رقم الهاتف إذا كان موجوداً
    if (t.phone && t.phone.trim() !== '') {

      this.validatePhone(t.phone);

      if (this.phoneError()) {

        hasError = true;

      }

    } else {

      // إذا كان الهاتف فارغاً، نزيل أي خطأ سابق
      this.phoneError.set(null);

    }

    // التحقق من صحة رابط GitHub إذا كان موجوداً
    if (t.gitHubUrl && t.gitHubUrl.trim() !== '') {

      this.validateGitHub(t.gitHubUrl);

      if (this.gitHubError()) {

        hasError = true;

      }

    } else {

      this.gitHubError.set(null);

    }

    // التحقق من صحة رابط LinkedIn إذا كان موجوداً
    if (t.linkedInUrl && t.linkedInUrl.trim() !== '') {

      this.validateLinkedIn(t.linkedInUrl);

      if (this.linkedInError()) {

        hasError = true;

      }

    } else {

      this.linkedInError.set(null);

    }

    return !hasError;

  }


  /**
   * التحقق من وجود تغييرات في الحقول القابلة للتعديل فقط
   */
  private hasEditableChanges(t: any): boolean {

    if (!this.originalProfile) {

      return true;

    }

    const current = {

      phone: t.phone?.toString().trim() || '',

      academicLevel: t.academicLevel?.toString().trim() || '',

      skills: this.getSkillsList(t.skills).join(', '),

      resumeUrl: t.resumeUrl?.toString().trim() || '',

      gitHubUrl: t.gitHubUrl?.toString().trim() || '',

      linkedInUrl: t.linkedInUrl?.toString().trim() || ''

    };

    return (

      current.phone !== (this.originalProfile.phone || '') ||

      current.academicLevel !== (this.originalProfile.academicLevel || '') ||

      current.skills !== (this.originalProfile.skills || '') ||

      current.resumeUrl !== (this.originalProfile.resumeUrl || '') ||

      current.gitHubUrl !== (this.originalProfile.gitHubUrl || '') ||

      current.linkedInUrl !== (this.originalProfile.linkedInUrl || '')

    );

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

            // Phone يأتي مباشرة من NFD_Users.Phone
            const traineeData: any = {
              ...t,
              phone: t.phone ?? ''
            };

            this.trainee.set(
              traineeData
            );

            if (traineeData.traineeId) {

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
              'Phone from Database:',
              traineeData.phone
            );

            // إعادة تعيين رسائل الخطأ
            this.phoneError.set(null);
            this.gitHubError.set(null);
            this.linkedInError.set(null);

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

      // إعادة تعيين رسائل الخطأ
      this.phoneError.set(null);
      this.gitHubError.set(null);
      this.linkedInError.set(null);

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
    // الخطوة 1: التحقق من صحة الحقول
    // =======================================================

    if (!this.isFormValid()) {

      console.warn('Form validation failed');

      // جمع رسائل الأخطاء
      let errorMessages: string[] = [];

      if (this.phoneError()) {
        errorMessages.push('• ' + this.phoneError());
      }

      if (this.gitHubError()) {
        errorMessages.push('• ' + this.gitHubError());
      }

      if (this.linkedInError()) {
        errorMessages.push('• ' + this.linkedInError());
      }

      alert(
        'يرجى تصحيح الأخطاء التالية قبل الحفظ:\n\n' +
        errorMessages.join('\n')
      );

      return;

    }


    // =======================================================
    // الخطوة 2: التحقق من وجود تغييرات
    // =======================================================

    if (!this.hasEditableChanges(t)) {

      console.log(
        'No changes detected. Nothing to update.'
      );

      this.editing.set(false);

      this.originalProfile = null;

      // رسالة للمستخدم
      alert('لم يتم إجراء أي تغييرات لحفظها.');

      return;

    }


    // =======================================================
    // الخطوة 3: التحقق من وجود UserId
    // =======================================================

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
    // الخطوة 4: بناء الـ payload
    // =======================================================

    const currentProfile = this.createProfileSnapshot(t);

    const payload: any = {
      email: currentProfile.email
    };

    // إضافة الحقول التي تغيرت فقط (باستثناء الـ email)
    if (currentProfile.phone !== this.originalProfile?.phone) {
      payload.phone = currentProfile.phone || undefined;
    }

    if (currentProfile.academicLevel !== this.originalProfile?.academicLevel) {
      payload.academicLevel = currentProfile.academicLevel || undefined;
    }

    if (currentProfile.skills !== this.originalProfile?.skills) {
      payload.skills = currentProfile.skills;
    }

    if (currentProfile.resumeUrl !== this.originalProfile?.resumeUrl) {
      payload.resumeUrl = currentProfile.resumeUrl || undefined;
    }

    if (currentProfile.gitHubUrl !== this.originalProfile?.gitHubUrl) {
      payload.gitHubUrl = currentProfile.gitHubUrl || undefined;
    }

    if (currentProfile.linkedInUrl !== this.originalProfile?.linkedInUrl) {
      payload.linkedInUrl = currentProfile.linkedInUrl || undefined;
    }


    console.log(
      'Saving profile using UserId:',
      this.userId
    );

    console.log(
      'Update payload (only changed fields):',
      payload
    );


    // =======================================================
    // الخطوة 5: إرسال الطلب
    // =======================================================

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

                user?: {
                  phone?: string;
                };
              }>;


            const updatedData: any = {

              ...updatedTrainee,

              phone:
                updated.phone ??
                updated.phoneNumber ??
                updated.mobileNumber ??
                updated.user?.phone ??
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

          // إعادة تعيين رسائل الخطأ
          this.phoneError.set(null);
          this.gitHubError.set(null);
          this.linkedInError.set(null);

          // إعادة الجلب من Backend للتأكد من أن البيانات محفوظة فعليًا
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