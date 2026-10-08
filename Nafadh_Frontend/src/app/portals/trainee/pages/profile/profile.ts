import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TraineeApi } from '../../services/trainee-api';

import {
  TraineeProfileDto,
  TraineeSkillDto
} from '../../../../core/models/dtos';


interface TraineeUpdateDto {

  email: string;

  phone?: string;

  resumeUrl?: string;

  gitHubUrl?: string;

  linkedInUrl?: string;

  academicLevel?: string;

  governorate?: string;

  wilaya?: string;

  village?: string;

  bankName?: string;

  accountHolderName?: string;

  accountNumber?: string;

  iban?: string;

  bankBranch?: string;
}


@Component({
  selector: 'app-trainee-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html'
})


export class TraineeProfile implements OnInit {

  // =========================================================
  // USER / TRAINEE
  // =========================================================

  userId = 0;

  traineeId = 1;

  trainee = signal<any>(null);

  editing = signal(false);


  // =========================================================
  // PROFILE IMAGE
  // =========================================================

  avatarUrl = signal<string | null>(null);

  selectedProfileImage: File | null = null;

  avatarViewerOpen = signal(false);


  // =========================================================
  // VALIDATION
  // =========================================================

  phoneError = signal<string | null>(null);

  gitHubError = signal<string | null>(null);

  linkedInError = signal<string | null>(null);


  // =========================================================
  // PROFILE SNAPSHOT
  // =========================================================

  private originalProfile: any = null;


  // =========================================================
  // SKILLS
  // =========================================================

  traineeSkills = signal<TraineeSkillDto[]>([]);


  // =========================================================
  // SKILL PROOF
  // =========================================================

  proofMode = signal<'file' | 'serial'>('file');

  certificateFileName = signal<string>('');

  certificateFile = signal<File | null>(null);

  certificateSerial = signal<string>('');


  // =========================================================
  // POPUP
  // =========================================================

  popupVisible = signal(false);

  popupTitle = signal('تنبيه');

  popupMessage = signal('');

  popupType = signal<'success' | 'error' | 'info'>('info');

  popupInputMode = signal(false);

  popupInputValue = '';


  // =========================================================
  // CV
  // =========================================================

  cvDownloadUrl = signal<string | null>(null);


  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private api: TraineeApi
  ) {}


  // =========================================================
  // ON INIT
  // =========================================================

  ngOnInit(): void {

    this.getLoggedInUserId();

    this.loadTraineeData();

  }


  // =========================================================
  // GET LOGGED-IN USER ID
  // =========================================================

  private getLoggedInUserId(): void {

    try {

      // -------------------------------------------------------
      // 1. nafadh_session
      // -------------------------------------------------------

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


      // -------------------------------------------------------
      // 2. Search other localStorage JSON objects
      // -------------------------------------------------------

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


        const val =
          localStorage.getItem(key);


        if (!val) {
          continue;
        }


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


      // -------------------------------------------------------
      // 3. Search JWT token
      // -------------------------------------------------------

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
  // LOAD TRAINEE DATA
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


          const profileImageUrl =
            (
              t as TraineeProfileDto & {
                profileImageUrl?: string | null
              }
            ).profileImageUrl ?? null;


          const traineeData: any = {

            ...t,

            phone:
              t.phone ?? '',

            gitHubUrl:
              t.gitHubUrl ?? '',

            linkedInUrl:
              t.linkedInUrl ?? '',

            resumeUrl:
              t.resumeUrl ?? '',

            cvFileName:
              (
                t as TraineeProfileDto & {
                  cvFileName?: string
                }
              ).cvFileName ?? '',

            academicLevel:
              t.academicLevel ?? '',

            governorate:
              (t as any).governorate ?? '',

            wilaya:
              (t as any).wilaya ?? '',

            village:
              (t as any).village ?? '',

            bankName:
              (t as any).bankName ?? '',

            accountHolderName:
              (t as any).accountHolderName ?? '',

            accountNumber:
              (t as any).accountNumber ?? '',

            iban:
              (t as any).iban ?? '',

            bankBranch:
              (t as any).bankBranch ?? '',

            profileImageUrl

          };


          this.trainee.set(
            traineeData
          );


          this.avatarUrl.set(
            this.getProfileImageUrl(
              profileImageUrl
            )
          );


          this.selectedProfileImage =
            null;


          // ---------------------------------------------------
          // IMPORTANT
          // Get real TraineeId
          // ---------------------------------------------------

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


          // ---------------------------------------------------
          // Load skills from NFD_TraineeSkill
          // ---------------------------------------------------

          this.loadTraineeSkills();


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
  // LOAD TRAINEE SKILLS
  // =========================================================

  private loadTraineeSkills(): void {

    if (
      !this.traineeId ||
      this.traineeId <= 0
    ) {

      console.error(
        'TraineeId غير صالح:',
        this.traineeId
      );

      return;

    }


    console.log(
      'Loading skills using TraineeId:',
      this.traineeId
    );


    this.api
      .getTraineeSkills(this.traineeId)
      .subscribe({

        next: (skills) => {

          console.log(
            'Trainee skills:',
            skills
          );


          this.traineeSkills.set(
            skills || []
          );

        },


        error: (err) => {

          console.error(
            'خطأ في جلب المهارات:',
            err
          );

        }

      });

  }


  // =========================================================
  // PROFILE IMAGE URL
  // =========================================================

  private getProfileImageUrl(
    profileImageUrl: string | null
  ): string | null {

    if (!profileImageUrl) {
      return null;
    }


    if (
      profileImageUrl.startsWith('http://') ||
      profileImageUrl.startsWith('https://') ||
      profileImageUrl.startsWith('data:')
    ) {

      return profileImageUrl;

    }


    return this.api.getFileUrl(
      profileImageUrl
    );

  }


  // =========================================================
  // CREATE PROFILE SNAPSHOT
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

      resumeUrl:
        t.resumeUrl?.toString().trim() || '',

      cvFileName:
        t.cvFileName?.toString().trim() || '',

      gitHubUrl:
        t.gitHubUrl?.toString().trim() || '',

      linkedInUrl:
        t.linkedInUrl?.toString().trim() || '',

      governorate:
        t.governorate?.toString().trim() || '',

      wilaya:
        t.wilaya?.toString().trim() || '',

      village:
        t.village?.toString().trim() || '',

      bankName:
        t.bankName?.toString().trim() || '',

      accountHolderName:
        t.accountHolderName?.toString().trim() || '',

      accountNumber:
        t.accountNumber?.toString().trim() || '',

      iban:
        t.iban?.toString().trim() || '',

      bankBranch:
        t.bankBranch?.toString().trim() || ''

    };

  }


  // =========================================================
  // CHECK PROFILE CHANGES
  // =========================================================

  private hasEditableChanges(
    t: any
  ): boolean {

    if (!this.originalProfile) {
      return true;
    }


    const current =
      this.createProfileSnapshot(t);


    return (
      JSON.stringify(current) !==
      JSON.stringify(this.originalProfile)
    );

  }


  // =========================================================
  // EDIT / SAVE
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


    // -------------------------------------------------------
    // Validate phone
    // -------------------------------------------------------

    this.validatePhone(
      t.phone
    );


    // -------------------------------------------------------
    // Validate GitHub
    // -------------------------------------------------------

    this.validateGitHub(
      t.gitHubUrl
    );


    // -------------------------------------------------------
    // Validate LinkedIn
    // -------------------------------------------------------

    this.validateLinkedIn(
      t.linkedInUrl
    );


    if (
      this.phoneError() ||
      this.gitHubError() ||
      this.linkedInError()
    ) {

      return;

    }


    // -------------------------------------------------------
    // No changes
    // -------------------------------------------------------

    if (
      !this.hasEditableChanges(t)
    ) {

      console.log(
        'No profile changes detected.'
      );


      this.editing.set(false);

      this.originalProfile =
        null;

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


      this.openPopup(
        'تعذر حفظ التعديلات. لم يتم العثور على UserId للمستخدم الحالي.',
        'error',
        'خطأ'
      );


      return;

    }


    // =======================================================
    // PROFILE PAYLOAD
    // IMPORTANT:
    // skills is NOT included anymore.
    // Skills are handled by NFD_TraineeSkill.
    // =======================================================

    const payload: TraineeUpdateDto = {

      email:
        t.email?.toString().trim() || '',

      phone:
        t.phone?.toString().trim() || undefined,

      resumeUrl:
        t.resumeUrl?.toString().trim() || undefined,

      gitHubUrl:
        t.gitHubUrl?.toString().trim() || undefined,

      linkedInUrl:
        t.linkedInUrl?.toString().trim() || undefined,

      academicLevel:
        t.academicLevel?.toString().trim() || undefined,

      governorate:
        t.governorate?.toString().trim() || undefined,

      wilaya:
        t.wilaya?.toString().trim() || undefined,

      village:
        t.village?.toString().trim() || undefined,

      bankName:
        t.bankName?.toString().trim() || undefined,

      accountHolderName:
        t.accountHolderName?.toString().trim() || undefined,

      accountNumber:
        t.accountNumber?.toString().trim() || undefined,

      iban:
        t.iban?.toString().trim() || undefined,

      bankBranch:
        t.bankBranch?.toString().trim() || undefined

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

            const updatedData: any = {

              ...updatedTrainee,

              phone:
                (updatedTrainee as any).phone ??
                t.phone ??
                '',

              governorate:
                (updatedTrainee as any).governorate ??
                t.governorate ??
                '',

              wilaya:
                (updatedTrainee as any).wilaya ??
                t.wilaya ??
                '',

              village:
                (updatedTrainee as any).village ??
                t.village ??
                '',

              bankName:
                (updatedTrainee as any).bankName ??
                t.bankName ??
                '',

              accountHolderName:
                (updatedTrainee as any).accountHolderName ??
                t.accountHolderName ??
                '',

              accountNumber:
                (updatedTrainee as any).accountNumber ??
                t.accountNumber ??
                '',

              iban:
                (updatedTrainee as any).iban ??
                t.iban ??
                '',

              bankBranch:
                (updatedTrainee as any).bankBranch ??
                t.bankBranch ??
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

          this.originalProfile =
            null;


          // Reload profile
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


          this.openPopup(
            err.error?.message ||
            'حدث خطأ أثناء حفظ التعديلات.',
            'error',
            'فشل الحفظ'
          );

        }

      });

  }


  // =========================================================
  // PHONE VALIDATION
  // =========================================================

  validatePhone(
    phone: string
  ): void {

    if (!phone || !phone.trim()) {

      this.phoneError.set(
        'رقم الهاتف مطلوب.'
      );

      return;

    }


    const value =
      phone.trim();


    const omanPhonePattern =
      /^\+968\s?[279]\d{7}$/;


    if (!omanPhonePattern.test(value)) {

      this.phoneError.set(
        'يرجى إدخال رقم عماني صحيح مثل +968 XXXXXXXX.'
      );

      return;

    }


    this.phoneError.set(null);

  }


  // =========================================================
  // GITHUB VALIDATION
  // =========================================================

  validateGitHub(
    url: string
  ): void {

    if (!url || !url.trim()) {

      this.gitHubError.set(null);

      return;

    }


    const value =
      url.trim();


    if (
      !/^https?:\/\/(www\.)?github\.com\/.+/i.test(
        value
      )
    ) {

      this.gitHubError.set(
        'يرجى إدخال رابط GitHub صحيح.'
      );

      return;

    }


    this.gitHubError.set(null);

  }


  // =========================================================
  // LINKEDIN VALIDATION
  // =========================================================

  validateLinkedIn(
    url: string
  ): void {

    if (!url || !url.trim()) {

      this.linkedInError.set(null);

      return;

    }


    const value =
      url.trim();


    if (
      !/^https?:\/\/(www\.)?linkedin\.com\/in\/.+/i.test(
        value
      )
    ) {

      this.linkedInError.set(
        'يرجى إدخال رابط LinkedIn صحيح.'
      );

      return;

    }


    this.linkedInError.set(null);

  }


  // =========================================================
  // AVATAR UPLOAD
  // =========================================================

  onAvatarUpload(
    event: Event
  ): void {

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


    this.selectedProfileImage =
      file;


    const reader =
      new FileReader();


    reader.onload = () => {

      this.avatarUrl.set(
        reader.result as string
      );

    };


    reader.readAsDataURL(file);


    this.trainee.update(
      current => {

        if (!current) {
          return current;
        }


        return {

          ...current,

          profileImageFileName:
            file.name

        };

      }
    );

  }


  // =========================================================
  // AVATAR VIEWER
  // =========================================================

  openAvatarViewer(): void {

    if (this.avatarUrl()) {

      this.avatarViewerOpen.set(
        true
      );

    }

  }


  closeAvatarViewer(): void {

    this.avatarViewerOpen.set(
      false
    );

  }


  // =========================================================
  // CV UPLOAD
  // =========================================================

  onCvUpload(
    event: Event
  ): void {

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


    const objectUrl =
      URL.createObjectURL(file);


    this.cvDownloadUrl.set(
      objectUrl
    );


    this.trainee.update(
      current => {

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


  // =========================================================
  // CV DOWNLOAD URL
  // =========================================================

  getCvDownloadUrl(
    resumeUrl: string
  ): string {

    if (!resumeUrl) {
      return '';
    }


    if (
      resumeUrl.startsWith('http://') ||
      resumeUrl.startsWith('https://')
    ) {

      return resumeUrl;

    }


    if (
      resumeUrl.startsWith('/')
    ) {

      return `${window.location.origin}${resumeUrl}`;

    }


    return `${window.location.origin}/${resumeUrl}`;

  }


  // =========================================================
  // SKILL POPUP
  // =========================================================

  addSkill(): void {

    this.openSkillPopup();

  }


  openSkillPopup(): void {

    this.popupType.set(
      'info'
    );


    this.popupTitle.set(
      'إضافة مهارة'
    );


    this.popupMessage.set(
      'أدخل اسم المهارة واختر طريقة إثبات المهارة.'
    );


    this.popupInputValue =
      '';


    this.resetProofFields();


    this.popupInputMode.set(
      true
    );


    this.popupVisible.set(
      true
    );

  }


  // =========================================================
  // CONFIRM SKILL
  // =========================================================

  confirmPopupInput(): void {

    const skill =
      this.popupInputValue.trim();


    if (!skill) {

      this.popupType.set(
        'error'
      );


      this.popupTitle.set(
        'تنبيه'
      );


      this.popupMessage.set(
        'يرجى إدخال اسم المهارة أولاً.'
      );


      return;

    }


    this.addSkillValue(
      skill
    );

  }


  // =========================================================
  // ADD SKILL TO DATABASE
  // =========================================================

  private addSkillValue(
    skill: string
  ): void {

    // -------------------------------------------------------
    // Validate proof
    // -------------------------------------------------------

    if (!this.isProofValid()) {

      this.popupType.set(
        'error'
      );


      this.popupTitle.set(
        'إثبات مطلوب'
      );


      this.popupMessage.set(

        this.proofMode() === 'file'

          ? 'الرجاء رفع ملف أو صورة لإثبات المهارة.'

          : 'الرجاء كتابة الرقم التسلسلي للشهادة.'

      );


      return;

    }


    // -------------------------------------------------------
    // Check duplicate from database-loaded skills
    // -------------------------------------------------------

    const exists =
      this.traineeSkills().some(
        item =>
          item.skillName
            .toLowerCase() ===
          skill.toLowerCase()
      );


    if (exists) {

      this.popupType.set(
        'error'
      );


      this.popupTitle.set(
        'المهارة موجودة'
      );


      this.popupMessage.set(
        'هذه المهارة موجودة بالفعل.'
      );


      return;

    }


    // -------------------------------------------------------
    // Prepare proof
    // -------------------------------------------------------

    const serialNumber =
      this.proofMode() === 'serial'

        ? this.certificateSerial()
            .trim()

        : '';


    const certificateFile =
      this.proofMode() === 'file'

        ? this.certificateFile()

        : null;


    // -------------------------------------------------------
    // Send to Backend
    // -------------------------------------------------------

    this.api
      .addTraineeSkill(
        this.traineeId,
        skill,
        serialNumber,
        certificateFile
      )
      .subscribe({

        next: (result) => {

          console.log(
            'Skill added successfully:',
            result
          );


          this.traineeSkills.update(
            current => [
              ...current,
              result
            ]
          );


          this.popupInputMode.set(
            false
          );


          this.popupType.set(
            'success'
          );


          this.popupTitle.set(
            'تمت الإضافة'
          );


          this.popupMessage.set(
            `تمت إضافة المهارة "${skill}" بنجاح.`
          );


          this.resetProofFields();

        },


        error: (err) => {

          console.error(
            'فشل إضافة المهارة:',
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


          this.popupInputMode.set(
            false
          );


          this.popupType.set(
            'error'
          );


          this.popupTitle.set(
            'فشل الإضافة'
          );


          this.popupMessage.set(
            err.error?.message ||
            'حدث خطأ أثناء إضافة المهارة.'
          );

        }

      });

  }


  // =========================================================
  // DELETE SKILL
  // =========================================================

  removeSkill(
    skillId: number
  ): void {

    this.api
      .deleteTraineeSkill(
        skillId
      )
      .subscribe({

        next: () => {

          console.log(
            'Skill deleted successfully:',
            skillId
          );


          this.traineeSkills.update(
            current =>
              current.filter(
                skill =>
                  skill.traineeSkillId !==
                  skillId
              )
          );


          this.openPopup(
            'تم حذف المهارة بنجاح.',
            'success',
            'تم الحذف'
          );

        },


        error: (err) => {

          console.error(
            'فشل حذف المهارة:',
            err
          );


          this.openPopup(
            err.error?.message ||
            'حدث خطأ أثناء حذف المهارة.',
            'error',
            'فشل الحذف'
          );

        }

      });

  }


  // =========================================================
  // PROOF MODE
  // =========================================================

  setProofMode(
    mode: 'file' | 'serial'
  ): void {

    this.proofMode.set(
      mode
    );


    if (mode === 'file') {

      this.certificateSerial.set(
        ''
      );

    } else {

      this.certificateFileName.set(
        ''
      );

      this.certificateFile.set(
        null
      );

    }

  }


  // =========================================================
  // CERTIFICATE FILE SELECTED
  // =========================================================

  onCertificateFileSelected(
    event: Event
  ): void {

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


    this.certificateFile.set(
      file
    );


    this.certificateFileName.set(
      file.name
    );

  }


  // =========================================================
  // CHECK PROOF
  // =========================================================

  private isProofValid(): boolean {

    if (
      this.proofMode() === 'file'
    ) {

      return (
        this.certificateFile() !==
        null
      );

    }


    if (
      this.proofMode() === 'serial'
    ) {

      return (
        this.certificateSerial()
          .trim()
          .length > 0
      );

    }


    return false;

  }


  // =========================================================
  // RESET PROOF
  // =========================================================

  private resetProofFields(): void {

    this.proofMode.set(
      'file'
    );


    this.certificateFileName.set(
      ''
    );


    this.certificateFile.set(
      null
    );


    this.certificateSerial.set(
      ''
    );

  }


  // =========================================================
  // OPEN CERTIFICATE FILE
  // =========================================================

  openCertificateFile(
    certificateUrl: string | null
  ): void {

    if (!certificateUrl) {
      return;
    }


    const fullUrl =
      this.api.getFileUrl(
        certificateUrl
      );


    window.open(
      fullUrl,
      '_blank'
    );

  }


  // =========================================================
  // POPUP
  // =========================================================

  openPopup(
    message: string,
    type: 'success' | 'error' | 'info',
    title: string
  ): void {

    this.popupMessage.set(
      message
    );


    this.popupType.set(
      type
    );


    this.popupTitle.set(
      title
    );


    this.popupInputMode.set(
      false
    );


    this.popupVisible.set(
      true
    );

  }


  closePopup(): void {

    this.popupVisible.set(
      false
    );


    this.popupInputMode.set(
      false
    );


    this.popupInputValue =
      '';


    this.resetProofFields();

  }

}