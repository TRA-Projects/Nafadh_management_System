import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TraineeApi } from '../../services/trainee-api';

import { TraineeProfileDto } from '../../../../core/models/dtos';


interface TraineeUpdateDto {

  email: string;

  phone?: string;

  skills?: string;

  resumeUrl?: string;

  gitHubUrl?: string;

  linkedInUrl?: string;

  academicLevel?: string;

}


@Component({

  selector: 'app-trainee-profile',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './profile.html'

})


export class TraineeProfile implements OnInit {


  userId = 0;

  traineeId = 1;

  trainee = signal<any>(null);

  editing = signal(false);

  avatarUrl = signal<string | null>(null);


  // =========================================================
  // Validation
  // =========================================================

  phoneError = signal<string | null>(null);

  gitHubError = signal<string | null>(null);

  linkedInError = signal<string | null>(null);


  // =========================================================
  // Popup
  // =========================================================

  popupVisible = signal(false);

  popupTitle = signal('تنبيه');

  popupMessage = signal('');

  popupType = signal<'success' | 'error' | 'info'>('info');

  popupInputMode = signal(false);

  popupInputValue = '';


  // =========================================================
  // Original profile snapshot
  // =========================================================

  private originalProfile: any = null;


  constructor(
    private api: TraineeApi
  ) {}


  // =========================================================
  // Init
  // =========================================================

  ngOnInit(): void {

    this.getLoggedInUserId();

    this.loadTraineeData();

  }


  // =========================================================
  // Popup Methods
  // =========================================================

  showPopup(
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    title?: string
  ): void {

    this.popupType.set(type);

    this.popupTitle.set(
      title ??
      (
        type === 'success'
          ? 'تم بنجاح'
          : type === 'error'
            ? 'حدث خطأ'
            : 'تنبيه'
      )
    );

    this.popupMessage.set(message);

    this.popupInputMode.set(false);

    this.popupInputValue = '';

    this.popupVisible.set(true);

  }


  closePopup(): void {

    this.popupVisible.set(false);

    this.popupInputMode.set(false);

    this.popupInputValue = '';

  }


  openSkillPopup(): void {

    this.popupType.set('info');

    this.popupTitle.set('إضافة مهارة');

    this.popupMessage.set(
      'أدخل اسم المهارة التي تريد إضافتها إلى ملفك الشخصي.'
    );

    this.popupInputValue = '';

    this.popupInputMode.set(true);

    this.popupVisible.set(true);

  }


  confirmPopupInput(): void {

    const skill = this.popupInputValue.trim();

    if (!skill) {

      this.popupType.set('error');

      this.popupTitle.set('تنبيه');

      this.popupMessage.set(
        'يرجى إدخال اسم المهارة أولاً.'
      );

      return;

    }

    this.addSkillValue(skill);

  }


  // =========================================================
  // Phone Validation
  // =========================================================

  validatePhone(phone: string): void {

    if (!phone || phone.trim() === '') {

      this.phoneError.set(null);

      return;

    }

    const cleanPhone = phone.trim();

    const phoneWithoutSpaces =
      cleanPhone.replace(/\s/g, '');

    const phoneRegex =
      /^\+968\d{8}$/;


    if (!phoneRegex.test(phoneWithoutSpaces)) {

      this.phoneError.set(
        'رقم الهاتف يجب أن يبدأ بـ +968 ويتبعه 8 أرقام فقط (مثال: +968 12345678)'
      );

    } else {

      this.phoneError.set(null);


      if (
        cleanPhone !== phoneWithoutSpaces
      ) {

        this.trainee.update((current) => {

          if (!current) {

            return current;

          }

          return {

            ...current,

            phone: phoneWithoutSpaces

          };

        });

      }

    }

  }


  // =========================================================
  // GitHub Validation
  // =========================================================

  validateGitHub(url: string): void {

    if (!url || url.trim() === '') {

      this.gitHubError.set(null);

      return;

    }

    const cleanUrl = url.trim();

    const githubRegex =
      /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?$/;


    if (!githubRegex.test(cleanUrl)) {

      this.gitHubError.set(
        'الرجاء إدخال رابط GitHub صحيح (مثال: https://github.com/username)'
      );

      return;

    }


    if (
      !cleanUrl.startsWith('http://') &&
      !cleanUrl.startsWith('https://')
    ) {

      this.trainee.update((current) => {

        if (!current) {

          return current;

        }

        return {

          ...current,

          gitHubUrl:
            'https://' + cleanUrl

        };

      });

    }


    this.gitHubError.set(null);

  }


  // =========================================================
  // LinkedIn Validation
  // =========================================================

  validateLinkedIn(url: string): void {

    if (!url || url.trim() === '') {

      this.linkedInError.set(null);

      return;

    }


    const cleanUrl = url.trim();

    const linkedinRegex =
      /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company|school)\/[a-zA-Z0-9-]+$/;


    if (!linkedinRegex.test(cleanUrl)) {

      this.linkedInError.set(
        'الرجاء إدخال رابط LinkedIn صحيح (مثال: https://www.linkedin.com/in/username)'
      );

      return;

    }


    if (
      !cleanUrl.startsWith('http://') &&
      !cleanUrl.startsWith('https://')
    ) {

      this.trainee.update((current) => {

        if (!current) {

          return current;

        }

        return {

          ...current,

          linkedInUrl:
            'https://' + cleanUrl

        };

      });

    }


    this.linkedInError.set(null);

  }


  // =========================================================
  // Validate Form
  // =========================================================

  private isFormValid(): boolean {

    const t = this.trainee();

    if (!t) {

      return false;

    }


    let hasError = false;


    // Phone

    if (
      t.phone &&
      t.phone.trim() !== ''
    ) {

      this.validatePhone(t.phone);

      if (this.phoneError()) {

        hasError = true;

      }

    } else {

      this.phoneError.set(null);

    }


    // GitHub

    if (
      t.gitHubUrl &&
      t.gitHubUrl.trim() !== ''
    ) {

      this.validateGitHub(
        t.gitHubUrl
      );

      if (this.gitHubError()) {

        hasError = true;

      }

    } else {

      this.gitHubError.set(null);

    }


    // LinkedIn

    if (
      t.linkedInUrl &&
      t.linkedInUrl.trim() !== ''
    ) {

      this.validateLinkedIn(
        t.linkedInUrl
      );

      if (this.linkedInError()) {

        hasError = true;

      }

    } else {

      this.linkedInError.set(null);

    }


    return !hasError;

  }


  // =========================================================
  // Create normalized snapshot
  // =========================================================

  private createProfileSnapshot(
    t: any
  ): any {

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

      cvFileName:
        t.cvFileName?.toString().trim() || '',

      gitHubUrl:
        t.gitHubUrl?.toString().trim() || '',

      linkedInUrl:
        t.linkedInUrl?.toString().trim() || ''

    };

  }


  // =========================================================
  // Check if anything changed
  // =========================================================

  private hasEditableChanges(
    t: any
  ): boolean {

    if (!this.originalProfile) {

      return true;

    }


    const current =
      this.createProfileSnapshot(t);

    const original =
      this.originalProfile;


    return (

      current.phone !== original.phone ||

      current.academicLevel !==
        original.academicLevel ||

      current.skills !==
        original.skills ||

      current.resumeUrl !==
        original.resumeUrl ||

      current.cvFileName !==
        original.cvFileName ||

      current.gitHubUrl !==
        original.gitHubUrl ||

      current.linkedInUrl !==
        original.linkedInUrl

    );

  }


  // =========================================================
  // Get logged in UserId
  // =========================================================

  private getLoggedInUserId(): void {

    try {

      // -----------------------------------------------------
      // nafadh_session
      // -----------------------------------------------------

      const session =
        localStorage.getItem(
          'nafadh_session'
        );


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


      // -----------------------------------------------------
      // Search localStorage
      // -----------------------------------------------------

      for (
        let i = 0;
        i < localStorage.length;
        i++
      ) {

        const key =
          localStorage.key(i);


        if (!key) {

          continue;

        }


        const value =
          localStorage.getItem(key);


        if (!value) {

          continue;

        }


        try {

          const parsed =
            JSON.parse(value);


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

          // Not JSON

        }

      }


      // -----------------------------------------------------
      // JWT
      // -----------------------------------------------------

      const token =
        localStorage.getItem(
          'auth_token'
        ) ||

        localStorage.getItem(
          'token'
        ) ||

        localStorage.getItem(
          'user_session'
        );


      if (
        token &&
        token.includes('.')
      ) {

        try {

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

        } catch (jwtError) {

          console.error(
            'خطأ في قراءة JWT:',
            jwtError
          );

        }

      }


      console.warn(
        'لم يتم العثور على UserId للمستخدم الحالي'
      );


    } catch (error) {

      console.error(
        'خطأ في قراءة UserId:',
        error
      );

    }

  }


  // =========================================================
  // Load trainee
  // =========================================================

  loadTraineeData(): void {

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


          if (!t) {

            return;

          }


          const traineeData: any = {

            ...t,

            phone:
              t.phone ?? '',

            skills:
              t.skills ?? '',

            gitHubUrl:
              t.gitHubUrl ?? '',

            linkedInUrl:
              t.linkedInUrl ?? '',

            resumeUrl:
              t.resumeUrl ?? '',

            cvFileName:
              (
                t as TraineeProfileDto & {
                  cvFileName?: string;
                }
              ).cvFileName ?? '',

            academicLevel:
              t.academicLevel ?? ''

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


          this.phoneError.set(null);

          this.gitHubError.set(null);

          this.linkedInError.set(null);

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
  // Toggle Edit / Save
  // =========================================================

  toggleEdit(): void {


    // =======================================================
    // ENTER EDIT MODE
    // =======================================================

    if (!this.editing()) {

      const t =
        this.trainee();


      if (!t) {

        return;

      }


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
    // Validate
    // =======================================================

    if (!this.isFormValid()) {

      const errorMessages: string[] = [];


      if (this.phoneError()) {

        errorMessages.push(
          '• ' + this.phoneError()
        );

      }


      if (this.gitHubError()) {

        errorMessages.push(
          '• ' + this.gitHubError()
        );

      }


      if (this.linkedInError()) {

        errorMessages.push(
          '• ' + this.linkedInError()
        );

      }


      this.showPopup(

        'يرجى تصحيح الأخطاء التالية قبل الحفظ:\n\n' +
        errorMessages.join('\n'),

        'error',

        'بيانات غير صحيحة'

      );


      return;

    }


    // =======================================================
    // Check changes
    // =======================================================

    if (!this.hasEditableChanges(t)) {

      console.log(
        'No changes detected.'
      );


      this.editing.set(false);

      this.originalProfile = null;


      this.showPopup(

        'لم يتم إجراء أي تغييرات لحفظها.',

        'info',

        'لا توجد تغييرات'

      );


      return;

    }


    // =======================================================
    // Check UserId
    // =======================================================

    if (
      !this.userId ||
      this.userId <= 0
    ) {

      console.error(
        'لا يمكن الحفظ: UserId غير موجود',
        this.userId
      );


      this.showPopup(

        'تعذر حفظ التعديلات. لم يتم العثور على UserId للمستخدم الحالي.',

        'error',

        'تعذر الحفظ'

      );


      return;

    }


    // =======================================================
    // Current snapshot
    // =======================================================

    const currentProfile =
      this.createProfileSnapshot(t);


    const payload: TraineeUpdateDto = {

      email:
        currentProfile.email,

      phone:
        currentProfile.phone,

      skills:
        currentProfile.skills,

      resumeUrl:
        currentProfile.resumeUrl,

      gitHubUrl:
        currentProfile.gitHubUrl,

      linkedInUrl:
        currentProfile.linkedInUrl,

      academicLevel:
        currentProfile.academicLevel

    };


    console.log(
      'Saving profile using UserId:',
      this.userId
    );


    console.log(
      'Original profile:',
      this.originalProfile
    );


    console.log(
      'Current profile:',
      currentProfile
    );


    console.log(
      'Update payload:',
      payload
    );


    // =======================================================
    // Send update
    // =======================================================

    this.api

      .updateTrainee(
        this.userId,
        payload
      )

      .subscribe({

        next: (updatedTrainee: any) => {


          console.log(
            'تم حفظ التعديلات بنجاح:',
            updatedTrainee
          );


          const currentData =
            this.trainee();


          const mergedData: any = {

            ...currentData,

            ...(updatedTrainee || {}),


            fullName:
              updatedTrainee?.fullName ??
              currentData?.fullName ??
              '',


            email:
              updatedTrainee?.email ??
              currentData?.email ??
              '',


            phone:
              updatedTrainee?.phone ??
              updatedTrainee?.phoneNumber ??
              updatedTrainee?.mobileNumber ??
              updatedTrainee?.user?.phone ??
              currentData?.phone ??
              '',


            skills:
              updatedTrainee?.skills ??
              currentData?.skills ??
              '',


            resumeUrl:
              updatedTrainee?.resumeUrl ??
              currentData?.resumeUrl ??
              '',


            cvFileName:
              updatedTrainee?.cvFileName ??
              currentData?.cvFileName ??
              '',


            gitHubUrl:
              updatedTrainee?.gitHubUrl ??
              currentData?.gitHubUrl ??
              '',


            linkedInUrl:
              updatedTrainee?.linkedInUrl ??
              currentData?.linkedInUrl ??
              '',


            academicLevel:
              updatedTrainee?.academicLevel ??
              currentData?.academicLevel ??
              '',


            nationalId:
              updatedTrainee?.nationalId ??
              currentData?.nationalId ??
              '',


            university:
              updatedTrainee?.university ??
              currentData?.university ??
              '',


            major:
              updatedTrainee?.major ??
              currentData?.major ??
              ''

          };


          this.trainee.set(
            mergedData
          );


          if (mergedData.traineeId) {

            this.traineeId =
              Number(
                mergedData.traineeId
              );

          }


          // Exit edit mode

          this.editing.set(false);


          // Clear snapshot

          this.originalProfile = null;


          // Clear validation errors

          this.phoneError.set(null);

          this.gitHubError.set(null);

          this.linkedInError.set(null);


          // Popup بدل alert

          this.showPopup(

            'تم حفظ التعديلات بنجاح.',

            'success',

            'تم الحفظ'

          );

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


          this.showPopup(

            err.error?.message ||
            'حدث خطأ أثناء حفظ التعديلات.',

            'error',

            'فشل حفظ التعديلات'

          );

        }

      });

  }


  // =========================================================
  // Avatar Upload
  // =========================================================

  onAvatarUpload(event: Event): void {

    const input =
      event.target as HTMLInputElement;


    if (
      !input.files ||
      input.files.length === 0
    ) {

      return;

    }


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


    this.trainee.update((current) => {

      if (!current) {

        return current;

      }


      return {

        ...current,

        avatar: file.name

      };

    });

  }


  // =========================================================
  // CV Upload
  // =========================================================

  onCvUpload(event: Event): void {

    const input =
      event.target as HTMLInputElement;


    if (
      !input.files ||
      input.files.length === 0
    ) {

      return;

    }


    const file =
      input.files[0];


    // -------------------------------------------------------
    // Validate size
    // -------------------------------------------------------

    const maxSize =
      5 * 1024 * 1024;


    if (file.size > maxSize) {

      this.showPopup(

        'حجم الملف يجب ألا يتجاوز 5 ميغا.',

        'error',

        'حجم الملف غير صالح'

      );


      input.value = '';

      return;

    }


    // -------------------------------------------------------
    // Validate extension
    // -------------------------------------------------------

    const fileName =
      file.name.toLowerCase();


    const validExtension =
      fileName.endsWith('.pdf') ||
      fileName.endsWith('.docx');


    if (!validExtension) {

      this.showPopup(

        'يسمح فقط بملفات PDF أو DOCX.',

        'error',

        'نوع الملف غير صالح'

      );


      input.value = '';

      return;

    }


    // -------------------------------------------------------
    // Update ONLY CV fields
    // -------------------------------------------------------

    this.trainee.update((current) => {

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

    });


    console.log(
      'CV selected:',
      file.name
    );


    console.log(
      'Current trainee after CV selection:',
      this.trainee()
    );

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


    if (typeof skills === 'string') {

      return skills

        .split(',')

        .map(
          (s) => s.trim()
        )

        .filter(Boolean);

    }


    return [];

  }


  // =========================================================
  // Add Skill
  // =========================================================

  addSkill(): void {

    this.openSkillPopup();

  }


  // =========================================================
  // Add Skill Value
  // =========================================================

  private addSkillValue(
    skill: string
  ): void {

    this.trainee.update((current) => {

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

        this.popupInputMode.set(false);

        this.popupType.set('error');

        this.popupTitle.set(
          'المهارة موجودة'
        );

        this.popupMessage.set(
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

    });


    // إذا تمت الإضافة
    const current =
      this.trainee();


    if (current) {

      const skills =
        this.getSkillsList(
          current.skills
        );


      if (
        skills.some(
          (item) =>
            item.toLowerCase() ===
            skill.toLowerCase()
        )
      ) {

        this.popupInputMode.set(false);

        this.popupType.set('success');

        this.popupTitle.set(
          'تمت الإضافة'
        );

        this.popupMessage.set(
          `تمت إضافة المهارة "${skill}" بنجاح.`
        );

      }

    }

  }


  // =========================================================
  // Remove Skill
  // =========================================================

  removeSkill(
    index: number
  ): void {

    this.trainee.update((current) => {

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

    });

  }

}