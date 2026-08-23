// ============================================================
// FILE: trainee-achievements.component.ts (معدّل - إضافة التقييمات)
// ============================================================

import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  BadgeDto,
  CertificateDto,
  FeedbackCriterionDto,
  TraineeBadgeDto,
  TraineeModuleProgressDto,
  FeedbackPendingDto,
  ModuleDto,
  TraineeProfileDto,
  BatchDto,
  ProgramDto,
  TraineeDashboardSummaryDto,
  EnrollmentDto,
  LessonDto,
} from '../../../../core/models/dtos';

// ============================================================
// Extended DTOs
// ============================================================

export interface LessonWithProgressDto extends LessonDto {
  progressPercentage?: number;
}

export interface ModuleWithLessonsDto extends ModuleDto {
  progressPercentage?: number;
  lessons?: LessonWithProgressDto[];
  isLocked?: boolean;
  prerequisitePassed?: boolean;
}

@Component({
  selector: 'app-trainee-achievements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './achievements.html',
  styles: [
    `
    
      .achievements-page {
        width: 100%;
        max-width: 2000px;
        height: 100vh;
        margin: 0 auto;
        padding: 10px 4px;
        box-sizing: border-box;
        color: #1e293b;
      }

      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 12px;
      }

      .nfd-page-title {
        margin: 0;
        font-size: 25px;
        font-weight: 800;
        color: #172554;
      }

      .nfd-page-sub {
        margin: 4px 0 0;
        font-size: 12px;
        color: #94a3b8;
      }

      .achievement-summary {
        display: flex;
        gap: 8px;
      }

      .summary-item {
        min-width: 125px;
        padding: 9px 12px;
        background: #fff;
        border: 1px solid #e8edf3;
        border-radius: 11px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 7px rgba(15, 23, 42, 0.03);
      }

      .summary-item span {
        display: block;
        font-size: 10px;
        color: #94a3b8;
        margin-bottom: 2px;
      }

      .summary-item strong {
        font-size: 15px;
        color: #172554;
      }

      .summary-icon {
        width: 31px;
        height: 31px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 14px;
      }

      .progress-icon {
        background: #e0f2fe;
        color: #0369a1;
      }

      .badge-icon {
        background: #fff7ed;
      }

      .certificate-icon {
        background: #eef2ff;
      }

      .feedback-strip {
        min-height: 48px;
        padding: 8px 14px;
        box-sizing: border-box;
        background: linear-gradient(90deg, #f8fafc, #f0f9ff);
        border: 1px solid #e2e8f0;
        border-right: 4px solid #0d9488;
        border-radius: 11px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .feedback-info {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .feedback-icon {
        width: 31px;
        height: 31px;
        border-radius: 9px;
        background: #e0f2fe;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .feedback-info strong {
        display: block;
        font-size: 12px;
        color: #172554;
      }

      .feedback-info small {
        display: block;
        font-size: 10px;
        color: #94a3b8;
        margin-top: 2px;
      }

      .feedback-buttons {
        display: flex;
        gap: 6px;
      }

      .feedback-btn {
        border: 1px solid #dbeafe;
        background: #fff;
        color: #1e40af;
        border-radius: 7px;
        padding: 6px 12px;
        font-size: 11px;
        cursor: pointer;
        transition: 0.2s;
      }

      .feedback-btn:hover {
        background: #eff6ff;
        transform: translateY(-1px);
      }

      .main-grid {
        display: grid;
        grid-template-columns: 1.25fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }

      .nfd-card {
        background: #fff;
        border: 1px solid #e8edf3;
        border-radius: 12px;
        box-shadow: 0 3px 10px rgba(15, 23, 42, 0.035);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .card-header h3 {
        margin: 0;
        font-size: 15px;
        color: #172554;
      }

      .card-header span {
        display: block;
        margin-top: 3px;
        font-size: 10px;
        color: #94a3b8;
      }

      .progress-card {
        padding: 15px;
      }

      .modules-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
        max-height: 210px;
        overflow-y: auto;
      }

      .modules-list::-webkit-scrollbar {
        width: 4px;
      }

      .modules-list::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 4px;
      }

      .module-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 8px;
        border-radius: 8px;
        transition: 0.2s;
      }

      .module-row:hover {
        background: #f8fafc;
      }

      .module-name {
        width: 42%;
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }

      .module-name span:last-child {
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .module-status {
        width: 22px;
        height: 22px;
        border-radius: 7px;
        background: #f1f5f9;
        color: #94a3b8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        flex-shrink: 0;
      }

      .module-status.completed {
        background: #dcfce7;
        color: #15803d;
      }

      .module-status.in-progress {
        background: #fef3c7;
        color: #d97706;
      }

      .module-progress {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .module-track {
        flex: 1;
        height: 6px;
        background: #f1f5f9;
        border-radius: 8px;
        overflow: hidden;
      }

      .module-fill {
        height: 100%;
        border-radius: 8px;
        transition: width 0.5s ease;
      }

      .module-progress strong {
        width: 35px;
        font-size: 10px;
        text-align: left;
        color: #475569;
      }

      .badges-card {
        padding: 15px;
      }

      .badge-counter {
        background: #eef2ff;
        color: #3730a3;
        padding: 4px 9px;
        border-radius: 15px;
        font-size: 10px;
        font-weight: 700;
      }

      .badges-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 7px;
        max-height: 220px;
        overflow-y: auto;
      }

      .badges-grid::-webkit-scrollbar {
        width: 4px;
      }

      .badges-grid::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 4px;
      }

      .badge-item {
        min-height: 90px;
        padding: 8px 5px;
        border-radius: 9px;
        border: 1px solid #e2e8f0;
        text-align: center;
        transition: 0.2s;
        box-sizing: border-box;
      }

      .badge-item.earned {
        background: #fffbeb;
        border-color: #fbbf24;
      }

      .badge-item.locked {
        opacity: 0.45;
      }

      .badge-symbol {
        position: relative;
        width: 30px;
        height: 30px;
        margin: 0 auto 3px;
        font-size: 23px;
      }

      .earned-check {
        position: absolute;
        right: -5px;
        bottom: -3px;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #16a34a;
        color: #fff;
        font-size: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .badge-item strong {
        display: block;
        font-size: 9px;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .badge-item small {
        display: block;
        margin-top: 2px;
        font-size: 8px;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .badge-status {
        display: inline-block;
        margin-top: 4px;
        font-size: 8px;
        font-weight: 700;
      }

      .earned-status {
        color: #b45309;
      }

      .locked-status {
        color: #94a3b8;
      }

      .certificate-card {
        padding: 13px 15px;
      }

      .certificate-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 9px;
      }

      .certificate-title {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .certificate-title .certificate-icon {
        width: 35px;
        height: 35px;
        background: #eef2ff;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }

      .certificate-title h3 {
        margin: 0;
        font-size: 13px;
        color: #172554;
      }

      .certificate-title p {
        margin: 3px 0 0;
        font-size: 9px;
        color: #94a3b8;
      }

      .certificate-status span {
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 9px;
        font-weight: 700;
      }

      .certificate-status .available {
        background: #dcfce7;
        color: #166534;
      }

      .certificate-status .pending {
        background: #fef3c7;
        color: #b45309;
      }

      /* ============================================================
         تعديل معاينة الشهادة - كل النصوص في المنتصف
         ============================================================ */
      .certificate-preview {
        min-height: 70px;
        border-radius: 10px;
        padding: 10px 20px;
        box-sizing: border-box;
        background: radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.08), transparent 30%),
          linear-gradient(120deg, #0b1f64, #030b2e);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #fff;
      }

      /* تنسيق اسم البرنامج */
      .certificate-brand {
        font-size: 17px;
        font-weight: 900;
        letter-spacing: 2px;
        margin-bottom: 4px;
      }

      /* تنسيق نص الشهادة */
      .certificate-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }

      .certificate-text span {
        font-size: 8px;
        color: #94a3b8;
        letter-spacing: 1px;
      }

      .certificate-text strong {
        font-size: 12px;
        color: #fff;
      }

      .certificate-text small {
        font-size: 9px;
        color: #cbd5e1;
      }

      .download-btn {
        width: 100%;
        height: 35px;
        margin-top: 8px;
        border-radius: 8px;
        border: none;
        color: #fff;
        background: #808baf;
        font-size: 11px;
        font-weight: 700;
        transition: 0.2s;
      }

      .download-btn.enabled {
        background: #0d9488;
        cursor: pointer;
      }

      .download-btn.enabled:hover {
        background: #0f766e;
        transform: translateY(-1px);
      }

      .download-btn:disabled {
        cursor: not-allowed;
      }

      .empty-state {
        width: 100%;
        padding: 18px 0;
        text-align: center;
        color: #94a3b8;
      }

      .empty-state span {
        display: block;
        font-size: 22px;
      }

      .empty-state p {
        margin: 5px 0 0;
        font-size: 10px;
      }

      .nfd-modal-bg {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(3px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .nfd-modal {
        width: min(500px, 92%);
        max-height: 90vh;
        overflow-y: auto;
        background: #fff;
        border-radius: 14px;
        padding: 20px;
        box-sizing: border-box;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 18px;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 16px;
        color: #172554;
      }

      .modal-header p {
        margin: 4px 0 0;
        font-size: 10px;
        color: #94a3b8;
      }

      .modal-close {
        border: none;
        background: #f1f5f9;
        width: 28px;
        height: 28px;
        border-radius: 7px;
        font-size: 20px;
        color: #64748b;
        cursor: pointer;
      }

      .criterion-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 11px;
      }

      .criterion-row label {
        font-size: 11px;
        color: #334155;
      }

      .stars {
        display: flex;
        direction: ltr;
        gap: 1px;
      }

      .stars button {
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0 2px;
        font-size: 21px;
        transition: 0.15s;
      }

      .stars button:hover {
        transform: scale(1.15);
      }

      .comment-label {
        display: block;
        margin-top: 14px;
        margin-bottom: 5px;
        font-size: 11px;
        font-weight: 700;
      }

      .nfd-modal textarea {
        width: 100%;
        box-sizing: border-box;
        resize: none;
        border: 1px solid #e2e8f0;
        border-radius: 7px;
        padding: 9px;
        font-family: inherit;
        font-size: 11px;
        outline: none;
      }

      .nfd-modal textarea:focus {
        border-color: #0d9488;
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 7px;
        margin-top: 15px;
      }
.modal-close {
  border: none;
  background: #f1f5f9;
  width: 28px;
  height: 26px;
  border-radius: 7px;
  font-size: 20px;
  color: #64748b;
  cursor: pointer;
  display: flex;        
  align-items: center;     
  justify-content: center; 
  line-height: 1;          
  padding: 0;              
}
      .cancel-btn,
      .submit-feedback-btn {
        border-radius: 7px;
        padding: 7px 15px;
        font-size: 11px;
        cursor: pointer;
      }

      .cancel-btn {
        background: #fff;
        border: 1px solid #e2e8f0;
        color: #64748b;
      }

      .cancel-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .submit-feedback-btn {
        background: #0d9488;
        border: none;
        color: #fff;
        font-weight: 700;
      }

      .submit-feedback-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* Toast / Success Message */
      .toast-success {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #0d9488;
        color: #fff;
        padding: 12px 28px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 8px 30px rgba(13, 148, 136, 0.3);
        z-index: 2000;
        animation: slideUp 0.4s ease;
      }

      .toast-success .toast-icon {
        margin-left: 8px;
      }

      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }

      @media (max-width: 1000px) {
        .page-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .achievement-summary {
          width: 100%;
        }

        .summary-item {
          flex: 1;
        }

        .main-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 650px) {
        .achievements-page {
          padding: 8px;
        }

        .achievement-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
        }

        .summary-item {
          min-width: 0;
        }

        .summary-icon {
          display: none;
        }

        .feedback-strip {
          align-items: flex-start;
          flex-direction: column;
          gap: 8px;
        }

        .feedback-buttons {
          width: 100%;
        }

        .feedback-btn {
          flex: 1;
        }

        .badges-grid {
          grid-template-columns: repeat(3, 1fr);
        }

        .certificate-preview {
          padding: 10px;
        }
      }
    `,
  ]
})
export class TraineeAchievements implements OnInit {
  private api = inject(TraineeApi);
  public auth = inject(AuthService);

  // ============================================================
  // IDs
  // ============================================================

  userId = signal<number | null>(null);
  traineeId = signal<number | null>(null);
  enrollmentId = signal<number | null>(null);
  programId = signal<number | null>(null);
  batchId = signal<number | null>(null);

  // ============================================================
  // USER / TRAINEE
  // ============================================================

  traineeProfile = signal<TraineeProfileDto | null>(null);

  // ============================================================
  // MAIN DATA
  // ============================================================

  program = signal<ProgramDto | null>(null);
  modules = signal<ModuleWithLessonsDto[]>([]);
  enrollment = signal<EnrollmentDto | null>(null);
  moduleProgress = signal<TraineeModuleProgressDto[]>([]);

  // ============================================================
  // ACHIEVEMENTS DATA
  // ============================================================

  allBadges = signal<BadgeDto[]>([]);
  myBadges = signal<TraineeBadgeDto[]>([]);
  certificates = signal<CertificateDto[]>([]);

  // ============================================================
  // FEEDBACK STATE
  // ============================================================

  showFeedback = signal(false);
  feedbackType = signal<'TrainerRating' | 'BatchExperienceRating'>('TrainerRating');
  criteria = signal<FeedbackCriterionDto[]>([]);
  scores: Record<number, number> = {};
  comment = '';
  isSubmitting = signal(false);
  pendingFeedback = signal<FeedbackPendingDto | null>(null);
  
  // ✅ رسالة النجاح
  showSuccessToast = signal(false);
  successMessage = signal('');

  // ============================================================
  // LOADING / ERROR
  // ============================================================

  loading = signal(false);
  errorMessage = signal('');

  // ============================================================
  // STATISTICS
  // ============================================================

  stats = signal({
    totalModules: 0,
    completedModules: 0,
    totalLessons: 0,
    completedLessons: 0,
    overallProgress: 0,
  });

  // ============================================================
  // COMPUTED SIGNALS
  // ============================================================

  progressPercentage = computed(() => this.stats().overallProgress || 0);

  canDownloadCertificate = computed(() => {
    return this.progressPercentage() >= 85 && this.certificates().length > 0;
  });

  traineeName = computed(() => {
    const enrollment = this.enrollment();
    const profile = this.traineeProfile();

    if (enrollment) {
      if (enrollment.traineeName) {
        return enrollment.traineeName;
      }
    }

    if (profile) {
      if (profile.fullName) {
        return profile.fullName;
      }
      const profileAny = profile as any;
      if (profileAny.name) return profileAny.name;
      if (profileAny.user?.fullName) return profileAny.user?.fullName;
      if (profileAny.user?.name) return profileAny.user?.name;
    }

    return 'اسم المتدرب';
  });

  programTitle = computed(() => {
    const enrollment = this.enrollment();
    const program = this.program();

    if (enrollment) {
      if (enrollment.programTitle) {
        return enrollment.programTitle;
      }
      if (enrollment.batchName) {
        return enrollment.batchName;
      }
    }

    if (program) {
      if (program.title) return program.title;
      if (program.name) return program.name;
    }

    return 'التدريب';
  });

  displayModules = computed(() => {
    return this.modules().map((module) => ({
      moduleId: module.moduleId,
      title: module.title || `وحدة ${module.moduleId}`,
      status: this.getModuleStatus(module),
      progress: module.progressPercentage || 0,
    }));
  });

  totalBadges = computed(() => this.allBadges().length);
  earnedBadgesCount = computed(() => this.myBadges().length);

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  private getModuleStatus(module: ModuleWithLessonsDto): string {
    const progress = module.progressPercentage || 0;
    if (progress >= 100) return 'Completed';
    if (progress > 0) return 'InProgress';
    return 'NotStarted';
  }

  isEarned = (badgeId: number): boolean => {
    return this.myBadges().some((b) => b.badgeId === badgeId);
  };

  getBarColor = (progress: number): string => {
    if (progress >= 80) return '#22c55e';
    if (progress >= 50) return '#eab308';
    return '#3b82f6';
  };

  // ============================================================
  // LIFECYCLE
  // ============================================================

  ngOnInit() {
    const session = this.auth.session?.();
    if (session?.userId) {
      this.userId.set(session.userId);
      this.loadAllData();
    } else {
      const userIdFromStorage = this.getUserIdFromStorage();
      if (userIdFromStorage) {
        this.userId.set(userIdFromStorage);
        this.loadAllData();
      } else {
        this.errorMessage.set('يرجى تسجيل الدخول أولاً.');
      }
    }
  }

  // ============================================================
  // USER ID FROM STORAGE
  // ============================================================

  private getUserIdFromStorage(): number | null {
    const localUserId = localStorage.getItem('userId');
    if (localUserId) {
      const id = Number(localUserId);
      if (id && !Number.isNaN(id)) return id;
    }

    const sessionUserId = sessionStorage.getItem('userId');
    if (sessionUserId) {
      const id = Number(sessionUserId);
      if (id && !Number.isNaN(id)) return id;
    }

    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const id = Number(user.userId ?? user.id);
        if (id && !Number.isNaN(id)) return id;
      } catch {
        console.warn('⚠️ Invalid userData');
      }
    }

    return null;
  }

  // ============================================================
  // LOAD ALL DATA
  // ============================================================

  loadAllData() {
    const userId = this.userId();
    if (!userId) {
      this.errorMessage.set('يرجى تسجيل الدخول أولاً.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    // 1. جلب بيانات المتدرب
    this.api.getTrainee(userId).subscribe({
      next: (trainee: TraineeProfileDto) => {
        this.traineeProfile.set(trainee);
        this.traineeId.set(trainee.traineeId);
        this.loadEnrollment(trainee.traineeId);
      },
      error: (err: any) => {
        console.error('❌ فشل جلب بيانات المتدرب:', err);
        this.loading.set(false);
        this.errorMessage.set('تعذر تحميل بيانات المتدرب.');
      },
    });

    // 2. جلب جميع الأوسمة
    this.api.getAllBadges().subscribe({
      next: (badges: BadgeDto[]) => this.allBadges.set(badges ?? []),
      error: (err: any) => console.warn('⚠️ فشل جلب الأوسمة:', err),
    });

    // 3. جلب أوسمة المتدرب
    this.api.getMyBadges(userId).subscribe({
      next: (badges: TraineeBadgeDto[]) => this.myBadges.set(badges ?? []),
      error: (err: any) => console.warn('⚠️ فشل جلب أوسمة المتدرب:', err),
    });

    // 4. جلب الشهادات
    this.api.getCertificates(userId).subscribe({
      next: (certs: CertificateDto[]) => this.certificates.set(certs ?? []),
      error: (err: any) => console.warn('⚠️ فشل جلب الشهادات:', err),
    });

    // 5. جلب التقييمات المعلقة
    this.api.getFeedbackPending(1, userId).subscribe({
      next: (d) => this.pendingFeedback.set(d ?? null),
      error: () => {},
    });
  }

  // ============================================================
  // LOAD ENROLLMENT
  // ============================================================

  private loadEnrollment(traineeId: number): void {
    this.api.getEnrollmentsByTrainee(traineeId).subscribe({
      next: (enrollments: EnrollmentDto[]) => {
        if (!enrollments || enrollments.length === 0) {
          this.errorMessage.set('لا توجد تسجيلات للمتدرب.');
          this.loading.set(false);
          return;
        }

        const activeEnrollment =
          enrollments.find((e) => {
            const status = String(e.completionStatus ?? '').toLowerCase();
            return status === 'active' || status === 'inprogress';
          }) || enrollments[0];

        this.enrollment.set(activeEnrollment);
        this.enrollmentId.set(activeEnrollment.enrollmentId);
        this.batchId.set(activeEnrollment.batchId);

        this.loadBatchAndProgram(activeEnrollment.batchId);
      },
      error: (err: any) => {
        console.error('❌ فشل جلب التسجيلات:', err);
        this.errorMessage.set('تعذر تحميل تسجيل المتدرب.');
        this.loading.set(false);
      },
    });
  }

  // ============================================================
  // LOAD BATCH & PROGRAM
  // ============================================================

  private loadBatchAndProgram(batchId: number): void {
    if (!batchId || Number.isNaN(batchId)) {
      this.errorMessage.set('لم يتم العثور على الدفعة.');
      this.loading.set(false);
      return;
    }

    this.api.getBatch(batchId).subscribe({
      next: (batch: BatchDto) => {
        const programId = Number(batch.programId);
        if (!programId || Number.isNaN(programId)) {
          this.errorMessage.set('لم يتم العثور على البرنامج المرتبط بالدفعة.');
          this.loading.set(false);
          return;
        }

        this.programId.set(programId);
        this.loadProgram(programId);
      },
      error: (err: any) => {
        console.error('❌ فشل جلب الدفعة:', err);
        this.errorMessage.set('تعذر تحميل بيانات الدفعة.');
        this.loading.set(false);
      },
    });
  }

  // ============================================================
  // LOAD PROGRAM
  // ============================================================

  private loadProgram(programId: number): void {
    this.api.getProgram(programId).subscribe({
      next: (program: ProgramDto) => {
        this.program.set(program);
        this.loadModules(programId);
      },
      error: (err: any) => {
        console.error('❌ فشل جلب البرنامج:', err);
        this.errorMessage.set('تعذر تحميل بيانات البرنامج.');
        this.loading.set(false);
      },
    });
  }

  // ============================================================
  // LOAD MODULES
  // ============================================================

  private loadModules(programId: number): void {
    this.api.getProgramModules(programId).subscribe({
      next: (modules: ModuleDto[]) => {
        if (!modules || modules.length === 0) {
          this.modules.set([]);
          this.loadModuleProgress();
          return;
        }
        this.loadLessons(modules);
      },
      error: (err: any) => {
        console.error('❌ فشل جلب الوحدات:', err);
        this.modules.set([]);
        this.loadModuleProgress();
      },
    });
  }

  // ============================================================
  // LOAD LESSONS
  // ============================================================

  private loadLessons(modules: ModuleDto[]): void {
    const requests = modules.map((module) =>
      this.api.getModuleLessons(module.moduleId)
    );

    import('rxjs').then(({ forkJoin }) => {
      forkJoin(requests).subscribe({
        next: (lessonsData) => {
          const result: ModuleWithLessonsDto[] = modules.map((module, index) => {
            const lessons = lessonsData[index] ?? [];
            return {
              ...module,
              progressPercentage: 0,
              prerequisitePassed: true,
              isLocked: false,
              lessons: lessons.map((lesson) => ({
                ...lesson,
                progressPercentage: 0,
              })),
            };
          });

          this.modules.set(result);
          this.loadModuleProgress();
        },
        error: (err: any) => {
          console.error('❌ فشل جلب الدروس:', err);
          const result = modules.map((module) => ({
            ...module,
            progressPercentage: 0,
            prerequisitePassed: true,
            isLocked: false,
            lessons: [],
          }));
          this.modules.set(result);
          this.loadModuleProgress();
        },
      });
    });
  }

  // ============================================================
  // LOAD MODULE PROGRESS
  // ============================================================

  private loadModuleProgress(): void {
    const traineeId = this.traineeId();
    if (!traineeId || Number.isNaN(Number(traineeId))) {
      this.calculateStats();
      this.loading.set(false);
      return;
    }

    this.api.getModuleProgress(traineeId).subscribe({
      next: (progressData: TraineeModuleProgressDto[]) => {
        this.moduleProgress.set(progressData ?? []);
        this.updateModulesWithProgress(progressData ?? []);
        this.calculateStats();
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('❌ فشل جلب تقدم الوحدات:', err);
        this.calculateStats();
        this.loading.set(false);
      },
    });
  }

  // ============================================================
  // UPDATE MODULES WITH PROGRESS
  // ============================================================

  private updateModulesWithProgress(progressData: TraineeModuleProgressDto[]): void {
    const updatedModules = this.modules().map((module) => {
      const progress = progressData.find((p) => p.moduleId === module.moduleId);

      let percentage = 0;
      if (progress) {
        const status = String(progress.status ?? '').toLowerCase();
        if (status === 'completed') {
          percentage = 100;
        } else if (status === 'inprogress' || status === 'in_progress') {
          percentage = 50;
        }
      }

      const lessons = module.lessons ?? [];
      const completedCount =
        percentage === 100
          ? lessons.length
          : percentage > 0
          ? Math.round((percentage / 100) * lessons.length)
          : 0;

      const updatedLessons = lessons.map((lesson, index) => ({
        ...lesson,
        progressPercentage: index < completedCount ? 100 : 0,
      }));

      return {
        ...module,
        progressPercentage: percentage,
        lessons: updatedLessons,
      };
    });

    this.modules.set(updatedModules);
  }

  // ============================================================
  // CALCULATE STATS
  // ============================================================

  private calculateStats(): void {
    const modules = this.modules();

    const totalModules = modules.length;
    const completedModules = modules.filter((m) => m.progressPercentage === 100)
      .length;

    const totalLessons = modules.reduce(
      (sum, module) => sum + (module.lessons?.length ?? 0),
      0
    );

    const completedLessons = modules.reduce(
      (sum, module) =>
        sum +
        (module.lessons?.filter(
          (lesson) => lesson.progressPercentage === 100
        ).length ?? 0),
      0
    );

    let overallProgress = 0;
    if (totalModules > 0) {
      overallProgress = Math.round((completedModules / totalModules) * 100);
    }

    this.stats.set({
      totalModules,
      completedModules,
      totalLessons,
      completedLessons,
      overallProgress,
    });
  }

  // ============================================================
  // ✅ FEEDBACK METHODS (مأخوذة من الملف المرفق)
  // ============================================================

  openFeedback(type: 'TrainerRating' | 'BatchExperienceRating') {
    this.feedbackType.set(type);
    this.scores = {};
    this.comment = '';
    this.showFeedback.set(true);

    // جلب معايير التقييم حسب النوع
    // في الـ API المرفق: getFeedbackCriteria(type)
    this.api.getFeedbackCriteria(type).subscribe({
      next: (criteria: FeedbackCriterionDto[]) => {
        this.criteria.set(criteria ?? []);
      },
      error: (err: any) => {
        console.warn('⚠️ فشل جلب معايير التقييم:', err);
        this.criteria.set([]);
      },
    });
  }

  submitFeedback() {
    this.isSubmitting.set(true);

    const scores = Object.entries(this.scores).map(([criterionId, score]) => ({
      criterionId: Number(criterionId),
      score,
    }));

    const feedbackData = {
      type: this.feedbackType(),
      traineeId: this.traineeId(),
      enrollmentId: this.enrollmentId(),
      moduleId: 1, // يمكن تعديله حسب الحاجة
      comment: this.comment,
      scores,
    };

    this.api.submitFeedback(feedbackData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showFeedback.set(false);
        this.comment = '';
        this.scores = {};

        // ✅ عرض رسالة نجاح
        this.showSuccessToast.set(true);
        this.successMessage.set('تم إرسال التقييم بنجاح!');

        // إخفاء الرسالة بعد 3 ثواني
        setTimeout(() => {
          this.showSuccessToast.set(false);
        }, 3000);

        // تحديث حالة التقييمات المعلقة
        this.api.getFeedbackPending(1, this.traineeId() || 0).subscribe({
          next: (d) => this.pendingFeedback.set(d ?? null),
          error: () => {},
        });
      },
      error: (err: any) => {
        console.error('❌ خطأ في إرسال التقييم:', err);
        this.isSubmitting.set(false);
        this.showSuccessToast.set(true);
        this.successMessage.set('❌ حدث خطأ في إرسال التقييم، يرجى المحاولة مرة أخرى');
        setTimeout(() => {
          this.showSuccessToast.set(false);
        }, 3000);
      },
    });
  }

  // ============================================================
  // CERTIFICATE DOWNLOAD
  // ============================================================

  downloadCertificate() {
    if (!this.canDownloadCertificate()) return;
    const cert = this.certificates()[0];
    if (!cert) return;

    this.api.downloadCertificate(cert.certificateId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `شهادة_إتمام_التدريب_${Date.now()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        console.error('❌ فشل تحميل الشهادة:', err);
      },
    });
  }
}