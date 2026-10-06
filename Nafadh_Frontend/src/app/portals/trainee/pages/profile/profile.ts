import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { TraineeApi } from '../../services/trainee-api';
import { TraineeProfileDto } from '../../../../core/models/dtos';
import { environment } from '../../../../../environments/environment';


interface TraineeUpdateDto {
  email: string;
  phone?: string;
  skills?: string;
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

  userId = 0;
  traineeId = 1;
  trainee = signal<any>(null);
  editing = signal(false);

  // PROFILE IMAGE
  avatarUrl = signal<string | null>(null);
  selectedProfileImage: File | null = null;
  avatarViewerOpen = signal(false);

  // Validation
  phoneError = signal<string | null>(null);
  gitHubError = signal<string | null>(null);
  linkedInError = signal<string | null>(null);

  // Popup
  popupVisible = signal(false);
  popupTitle = signal('تنبيه');
  popupMessage = signal('');
  popupType = signal<'success' | 'error' | 'info'>('info');
  popupInputMode = signal(false);
  popupInputValue = '';

  // Original profile snapshot
  private originalProfile: any = null;

  constructor(
    private api: TraineeApi,
    private http: HttpClient
  ) {}

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
    this.popupTitle.set(title ?? (type === 'success' ? 'تم بنجاح' : type === 'error' ? 'حدث خطأ' : 'تنبيه'));
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
    this.popupMessage.set('أدخل اسم المهارة التي تريد إضافتها إلى ملفك الشخصي.');
    this.popupInputValue = '';
    this.popupInputMode.set(true);
    this.popupVisible.set(true);
  }

  confirmPopupInput(): void {
    const skill = this.popupInputValue.trim();
    if (!skill) {
      this.popupType.set('error');
      this.popupTitle.set('تنبيه');
      this.popupMessage.set('يرجى إدخال اسم المهارة أولاً.');
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
    const phoneWithoutSpaces = cleanPhone.replace(/\s/g, '');
    const phoneRegex = /^\+968\d{8}$/;
    if (!phoneRegex.test(phoneWithoutSpaces)) {
      this.phoneError.set('رقم الهاتف يجب أن يبدأ بـ +968 ويتبعه 8 أرقام فقط (مثال: +968 12345678)');
    } else {
      this.phoneError.set(null);
      if (cleanPhone !== phoneWithoutSpaces) {
        this.trainee.update(current => {
          if (!current) return current;
          return { ...current, phone: phoneWithoutSpaces };
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
    const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?$/;
    if (!githubRegex.test(cleanUrl)) {
      this.gitHubError.set('الرجاء إدخال رابط GitHub صحيح (مثال: https://github.com/username)');
      return;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      this.trainee.update(current => {
        if (!current) return current;
        return { ...current, gitHubUrl: 'https://' + cleanUrl };
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
    const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company|school)\/[a-zA-Z0-9-]+$/;
    if (!linkedinRegex.test(cleanUrl)) {
      this.linkedInError.set('الرجاء إدخال رابط LinkedIn صحيح (مثال: https://www.linkedin.com/in/username)');
      return;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      this.trainee.update(current => {
        if (!current) return current;
        return { ...current, linkedInUrl: 'https://' + cleanUrl };
      });
    }
    this.linkedInError.set(null);
  }

  // =========================================================
  // Validate Form
  // =========================================================

  private isFormValid(): boolean {
    const t = this.trainee();
    if (!t) return false;
    let hasError = false;

    if (t.phone && t.phone.trim() !== '') {
      this.validatePhone(t.phone);
      if (this.phoneError()) hasError = true;
    } else {
      this.phoneError.set(null);
    }

    if (t.gitHubUrl && t.gitHubUrl.trim() !== '') {
      this.validateGitHub(t.gitHubUrl);
      if (this.gitHubError()) hasError = true;
    } else {
      this.gitHubError.set(null);
    }

    if (t.linkedInUrl && t.linkedInUrl.trim() !== '') {
      this.validateLinkedIn(t.linkedInUrl);
      if (this.linkedInError()) hasError = true;
    } else {
      this.linkedInError.set(null);
    }

    return !hasError;
  }

  // =========================================================
  // Create normalized snapshot
  // =========================================================

  private createProfileSnapshot(t: any): any {
    return {
      email: t.email?.toString().trim() || '',
      phone: t.phone?.toString().trim() || '',
      academicLevel: t.academicLevel?.toString().trim() || '',
      skills: this.getSkillsList(t.skills).join(', '),
      resumeUrl: t.resumeUrl?.toString().trim() || '',
      cvFileName: t.cvFileName?.toString().trim() || '',
      gitHubUrl: t.gitHubUrl?.toString().trim() || '',
      linkedInUrl: t.linkedInUrl?.toString().trim() || '',
      governorate: t.governorate?.toString().trim() || '',
      wilaya: t.wilaya?.toString().trim() || '',
      village: t.village?.toString().trim() || '',
      bankName: t.bankName?.toString().trim() || '',
      accountHolderName: t.accountHolderName?.toString().trim() || '',
      accountNumber: t.accountNumber?.toString().trim() || '',
      iban: t.iban?.toString().trim() || '',
      bankBranch: t.bankBranch?.toString().trim() || ''
    };
  }

  // =========================================================
  // Check if profile information changed
  // =========================================================

  private hasEditableChanges(t: any): boolean {
    if (!this.originalProfile) return true;
    const current = this.createProfileSnapshot(t);
    const original = this.originalProfile;
    return (
      current.phone !== original.phone ||
      current.academicLevel !== original.academicLevel ||
      current.skills !== original.skills ||
      current.resumeUrl !== original.resumeUrl ||
      current.cvFileName !== original.cvFileName ||
      current.gitHubUrl !== original.gitHubUrl ||
      current.linkedInUrl !== original.linkedInUrl ||
      current.governorate !== original.governorate ||
      current.wilaya !== original.wilaya ||
      current.village !== original.village ||
      current.bankName !== original.bankName ||
      current.accountHolderName !== original.accountHolderName ||
      current.accountNumber !== original.accountNumber ||
      current.iban !== original.iban ||
      current.bankBranch !== original.bankBranch
    );
  }

  // =========================================================
  // Get logged in UserId
  // =========================================================

  private getLoggedInUserId(): void {
    try {
      const session = localStorage.getItem('nafadh_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed?.userId) {
            this.userId = Number(parsed.userId);
            console.log('Logged UserId from nafadh_session:', this.userId);
            return;
          }
        } catch {
          console.warn('تعذر قراءة nafadh_session');
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const value = localStorage.getItem(key);
        if (!value) continue;
        try {
          const parsed = JSON.parse(value);
          if (parsed?.userId) {
            this.userId = Number(parsed.userId);
            console.log('Logged UserId from localStorage:', this.userId);
            return;
          }
        } catch {
          // Not JSON
        }
      }

      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || localStorage.getItem('user_session');
      if (token && token.includes('.')) {
        try {
          const payload = JSON.parse(
            atob(
              token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
            )
          );
          const foundUserId = payload.userId || payload.nameid || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
          if (foundUserId) {
            this.userId = Number(foundUserId);
            console.log('Logged UserId from JWT:', this.userId);
            return;
          }
        } catch (jwtError) {
          console.error('خطأ في قراءة JWT:', jwtError);
        }
      }
      console.warn('لم يتم العثور على UserId للمستخدم الحالي');
    } catch (error) {
      console.error('خطأ في قراءة UserId:', error);
    }
  }

  // =========================================================
  // Load trainee
  // =========================================================

  loadTraineeData(): void {
    if (!this.userId || this.userId <= 0) {
      console.error('UserId غير صالح:', this.userId);
      return;
    }

    console.log('Loading trainee using UserId:', this.userId);

    this.api.getTrainee(this.userId).subscribe({
      next: (t) => {
        console.log('Trainee data received:', t);
        if (!t) return;

        const profileImageUrl = (t as TraineeProfileDto & { profileImageUrl?: string | null }).profileImageUrl ?? null;

        const traineeData: any = {
          ...t,
          phone: t.phone ?? '',
          skills: t.skills ?? '',
          gitHubUrl: t.gitHubUrl ?? '',
          linkedInUrl: t.linkedInUrl ?? '',
          resumeUrl: t.resumeUrl ?? '',
          cvFileName: (t as TraineeProfileDto & { cvFileName?: string }).cvFileName ?? '',
          academicLevel: t.academicLevel ?? '',
          governorate: (t as any).governorate ?? '',
          wilaya: (t as any).wilaya ?? '',
          village: (t as any).village ?? '',
          bankName: (t as any).bankName ?? '',
          accountHolderName: (t as any).accountHolderName ?? '',
          accountNumber: (t as any).accountNumber ?? '',
          iban: (t as any).iban ?? '',
          bankBranch: (t as any).bankBranch ?? '',
          profileImageUrl
        };

        this.trainee.set(traineeData);
        this.avatarUrl.set(this.getProfileImageUrl(profileImageUrl));
        this.selectedProfileImage = null;

        if (traineeData.traineeId) {
          this.traineeId = Number(traineeData.traineeId);
        }

        console.log('TraineeId:', this.traineeId);
        console.log('UserId:', this.userId);

        this.phoneError.set(null);
        this.gitHubError.set(null);
        this.linkedInError.set(null);
      },
      error: (err) => {
        console.error('خطأ في جلب البيانات:', err);
        console.error('Status:', err.status);
        console.error('Error:', err.error);
      }
    });
  }

  // =========================================================
  // Build full profile image URL
  // =========================================================

  private getProfileImageUrl(imageUrl?: string | null): string | null {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    const backendBaseUrl = environment.apiBaseUrl.replace(/\/api\/?$/, '');
    return `${backendBaseUrl}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
  }

  // =========================================================
  // Toggle Edit / Save
  // =========================================================

  toggleEdit(): void {
    if (!this.editing()) {
      const t = this.trainee();
      if (!t) return;
      this.phoneError.set(null);
      this.gitHubError.set(null);
      this.linkedInError.set(null);
      this.originalProfile = this.createProfileSnapshot(t);
      this.selectedProfileImage = null;
      console.log('Original profile snapshot:', this.originalProfile);
      this.editing.set(true);
      return;
    }

    const t = this.trainee();
    if (!t) {
      this.editing.set(false);
      return;
    }

    if (!this.isFormValid()) {
      const errorMessages: string[] = [];
      if (this.phoneError()) errorMessages.push('• ' + this.phoneError());
      if (this.gitHubError()) errorMessages.push('• ' + this.gitHubError());
      if (this.linkedInError()) errorMessages.push('• ' + this.linkedInError());
      this.showPopup('يرجى تصحيح الأخطاء التالية قبل الحفظ:\n\n' + errorMessages.join('\n'), 'error', 'بيانات غير صحيحة');
      return;
    }

    const profileChanged = this.hasEditableChanges(t);
    const imageChanged = this.selectedProfileImage !== null;

    if (!profileChanged && !imageChanged) {
      console.log('No changes detected.');
      this.editing.set(false);
      this.originalProfile = null;
      this.showPopup('لم يتم إجراء أي تغييرات لحفظها.', 'info', 'لا توجد تغييرات');
      return;
    }

    if (!this.userId || this.userId <= 0) {
      console.error('لا يمكن الحفظ: UserId غير موجود', this.userId);
      this.showPopup('تعذر حفظ التعديلات. لم يتم العثور على UserId للمستخدم الحالي.', 'error', 'تعذر الحفظ');
      return;
    }

    if (!profileChanged && imageChanged) {
      this.saveSelectedProfileImage();
      return;
    }

    const currentProfile = this.createProfileSnapshot(t);
    const payload: TraineeUpdateDto = {
      email: currentProfile.email,
      phone: currentProfile.phone,
      skills: currentProfile.skills,
      resumeUrl: currentProfile.resumeUrl,
      gitHubUrl: currentProfile.gitHubUrl,
      linkedInUrl: currentProfile.linkedInUrl,
      academicLevel: currentProfile.academicLevel,
      governorate: currentProfile.governorate,
      wilaya: currentProfile.wilaya,
      village: currentProfile.village,
      bankName: currentProfile.bankName,
      accountHolderName: currentProfile.accountHolderName,
      accountNumber: currentProfile.accountNumber,
      iban: currentProfile.iban,
      bankBranch: currentProfile.bankBranch
    };

    console.log('Saving profile using UserId:', this.userId);

    this.api.updateTrainee(this.userId, payload).subscribe({
      next: (updatedTrainee: any) => {
        console.log('تم حفظ التعديلات بنجاح:', updatedTrainee);
        const currentData = this.trainee();
        const mergedData: any = {
          ...currentData,
          ...(updatedTrainee || {}),
          fullName: updatedTrainee?.fullName ?? currentData?.fullName ?? '',
          email: updatedTrainee?.email ?? currentData?.email ?? '',
          phone: updatedTrainee?.phone ?? updatedTrainee?.phoneNumber ?? updatedTrainee?.mobileNumber ?? updatedTrainee?.user?.phone ?? currentData?.phone ?? '',
          skills: updatedTrainee?.skills ?? currentData?.skills ?? '',
          resumeUrl: updatedTrainee?.resumeUrl ?? currentData?.resumeUrl ?? '',
          cvFileName: updatedTrainee?.cvFileName ?? currentData?.cvFileName ?? '',
          gitHubUrl: updatedTrainee?.gitHubUrl ?? currentData?.gitHubUrl ?? '',
          linkedInUrl: updatedTrainee?.linkedInUrl ?? currentData?.linkedInUrl ?? '',
          academicLevel: updatedTrainee?.academicLevel ?? currentData?.academicLevel ?? '',
          governorate: updatedTrainee?.governorate ?? currentData?.governorate ?? '',
          wilaya: updatedTrainee?.wilaya ?? currentData?.wilaya ?? '',
          village: updatedTrainee?.village ?? currentData?.village ?? '',
          bankName: updatedTrainee?.bankName ?? currentData?.bankName ?? '',
          accountHolderName: updatedTrainee?.accountHolderName ?? currentData?.accountHolderName ?? '',
          accountNumber: updatedTrainee?.accountNumber ?? currentData?.accountNumber ?? '',
          iban: updatedTrainee?.iban ?? currentData?.iban ?? '',
          bankBranch: updatedTrainee?.bankBranch ?? currentData?.bankBranch ?? '',
          nationalId: updatedTrainee?.nationalId ?? currentData?.nationalId ?? '',
          university: updatedTrainee?.university ?? currentData?.university ?? '',
          major: updatedTrainee?.major ?? currentData?.major ?? '',
          profileImageUrl: updatedTrainee?.profileImageUrl ?? currentData?.profileImageUrl ?? null
        };

        this.trainee.set(mergedData);
        if (mergedData.traineeId) {
          this.traineeId = Number(mergedData.traineeId);
        }
        this.originalProfile = this.createProfileSnapshot(mergedData);

        if (this.selectedProfileImage) {
          this.saveSelectedProfileImage();
          return;
        }
        this.finishSuccessfulSave();
      },
      error: (err) => {
        console.error('فشل حفظ التعديلات:', err);
        console.error('Status:', err.status);
        console.error('Backend Error:', err.error);
        this.showPopup(err.error?.message || 'حدث خطأ أثناء حفظ التعديلات.', 'error', 'فشل حفظ التعديلات');
      }
    });
  }

  // =========================================================
  // Avatar Upload / Preview
  // =========================================================

  onAvatarUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.showPopup('يسمح فقط بصور JPG أو PNG أو WEBP.', 'error', 'نوع الصورة غير صالح');
      input.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showPopup('حجم الصورة يجب ألا يتجاوز 5 ميغا.', 'error', 'حجم الصورة غير صالح');
      input.value = '';
      return;
    }

    this.selectedProfileImage = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarUrl.set(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  // =========================================================
  // Upload selected image to backend
  // =========================================================

  private saveSelectedProfileImage(): void {
    const file = this.selectedProfileImage;
    if (!file) {
      this.finishSuccessfulSave();
      return;
    }

    if (!this.traineeId || this.traineeId <= 0) {
      this.showPopup('تعذر رفع الصورة. لم يتم العثور على TraineeId.', 'error', 'تعذر رفع الصورة');
      return;
    }

    const formData = new FormData();
    formData.append('File', file);

    this.http.post<{ profileImageUrl: string }>(
      `${environment.apiBaseUrl}/Trainee/${this.traineeId}/profile-image`,
      formData
    ).subscribe({
      next: (result) => {
        const fullImageUrl = this.getProfileImageUrl(result.profileImageUrl);
        this.trainee.update(current => {
          if (!current) return current;
          return { ...current, profileImageUrl: result.profileImageUrl };
        });
        this.avatarUrl.set(fullImageUrl);
        this.selectedProfileImage = null;
        this.finishSuccessfulSave();
      },
      error: (err) => {
        console.error('فشل رفع صورة المتدرب:', err);
        this.showPopup(err.error?.message || 'تعذر رفع صورة الملف الشخصي.', 'error', 'فشل رفع الصورة');
      }
    });
  }

  // =========================================================
  // Finish successful save
  // =========================================================

  private finishSuccessfulSave(): void {
    const current = this.trainee();
    this.editing.set(false);
    this.originalProfile = current ? this.createProfileSnapshot(current) : null;
    this.phoneError.set(null);
    this.gitHubError.set(null);
    this.linkedInError.set(null);
    this.showPopup('تم حفظ التعديلات بنجاح.', 'success', 'تم الحفظ');
  }

  // =========================================================
  // Profile Image Viewer
  // =========================================================

  openAvatarViewer(): void {
    if (!this.avatarUrl()) return;
    this.avatarViewerOpen.set(true);
  }

  closeAvatarViewer(): void {
    this.avatarViewerOpen.set(false);
  }

  // =========================================================
  // CV Upload
  // =========================================================

  onCvUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      this.showPopup('حجم الملف يجب ألا يتجاوز 5 ميغا.', 'error', 'حجم الملف غير صالح');
      input.value = '';
      return;
    }

    const fileName = file.name.toLowerCase();
    const validExtension = fileName.endsWith('.pdf') || fileName.endsWith('.docx');

    if (!validExtension) {
      this.showPopup('يسمح فقط بملفات PDF أو DOCX.', 'error', 'نوع الملف غير صالح');
      input.value = '';
      return;
    }

    this.trainee.update(current => {
      if (!current) return current;
      return { ...current, cvFileName: file.name, resumeUrl: file.name };
    });

    console.log('CV selected:', file.name);
  }

  // =========================================================
  // Skills
  // =========================================================

  getSkillsList(skills: any): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') {
      return skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }

  // =========================================================
  // Proof State (إثبات المهارة)
  // =========================================================

  proofMode = signal<'file' | 'serial'>('file');
  certificateFileName = signal<string>('');
  certificateFile = signal<File | null>(null);
  certificateSerial = signal<string>('');
  skillProofs = signal<{ [key: string]: any }>({});

  // =========================================================
  // Set Proof Mode
  // =========================================================

  setProofMode(mode: 'file' | 'serial'): void {
    this.proofMode.set(mode);
    if (mode === 'file') {
      this.certificateSerial.set('');
    } else {
      this.certificateFileName.set('');
      this.certificateFile.set(null);
    }
  }

  // =========================================================
  // Certificate File Selected
  // =========================================================

  onCertificateFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.certificateFile.set(file);
    this.certificateFileName.set(file.name);
  }

  // =========================================================
  // Reset Proof Fields
  // =========================================================

  private resetProofFields(): void {
    this.proofMode.set('file');
    this.certificateFileName.set('');
    this.certificateFile.set(null);
    this.certificateSerial.set('');
  }

  // =========================================================
  // Validate Proof
  // =========================================================

  private isProofValid(): boolean {
    if (this.proofMode() === 'file') {
      return this.certificateFile() !== null;
    }
    if (this.proofMode() === 'serial') {
      return this.certificateSerial().trim().length > 0;
    }
    return false;
  }

  // =========================================================
  // Open Certificate File (يعرض الملف أو يحمله)
  // =========================================================

  openCertificateFile(file: File | null): void {
    if (file) {
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
    }
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

  private addSkillValue(skill: string): void {
    if (!this.isProofValid()) {
      this.popupInputMode.set(false);
      this.popupType.set('error');
      this.popupTitle.set('إثبات مطلوب');
      this.popupMessage.set(
        this.proofMode() === 'file'
          ? 'الرجاء رفع شهادة المهارة.'
          : 'الرجاء كتابة الرقم التسلسلي للشهادة.'
      );
      return;
    }

    this.trainee.update(current => {
      if (!current) return current;
      const skillsArr = this.getSkillsList(current.skills);
      const exists = skillsArr.some(item => item.toLowerCase() === skill.toLowerCase());

      if (exists) {
        this.popupInputMode.set(false);
        this.popupType.set('error');
        this.popupTitle.set('المهارة موجودة');
        this.popupMessage.set('هذه المهارة موجودة بالفعل.');
        return current;
      }

      const proofData = this.proofMode() === 'file'
        ? { type: 'file', fileName: this.certificateFileName(), file: this.certificateFile() }
        : { type: 'serial', serial: this.certificateSerial() };

      this.skillProofs.update(prev => ({ ...prev, [skill]: proofData }));

      return {
        ...current,
        skills: [...skillsArr, skill].join(', ')
      };
    });

    const current = this.trainee();
    if (current) {
      const skills = this.getSkillsList(current.skills);
      if (skills.some(item => item.toLowerCase() === skill.toLowerCase())) {
        this.popupInputMode.set(false);
        this.popupType.set('success');
        this.popupTitle.set('تمت الإضافة');
        this.popupMessage.set(`تمت إضافة المهارة "${skill}" بنجاح.`);
      }
    }

    this.resetProofFields();
  }

  // =========================================================
  // Remove Skill
  // =========================================================

  removeSkill(index: number): void {
    this.trainee.update(current => {
      if (!current) return current;
      const skillsArr = this.getSkillsList(current.skills);
      const removedSkill = skillsArr[index];
      skillsArr.splice(index, 1);

      if (removedSkill) {
        this.skillProofs.update(prev => {
          const newProofs = { ...prev };
          delete newProofs[removedSkill];
          return newProofs;
        });
      }

      return {
        ...current,
        skills: skillsArr.join(', ')
      };
    });
  }
}