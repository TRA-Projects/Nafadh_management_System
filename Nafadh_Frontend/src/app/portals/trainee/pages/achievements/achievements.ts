import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { jsPDF } from 'jspdf';

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
  EnrollmentDto,
  LessonDto,
} from '../../../../core/models/dtos';

export interface LessonWithProgressDto extends LessonDto {
  progressPercentage?: number;
}

export interface ModuleWithLessonsDto extends ModuleDto {
  progressPercentage?: number;
  lessons?: LessonWithProgressDto[];
  isLocked?: boolean;
  prerequisitePassed?: boolean;
}

export interface TrainerOptionDto {
  trainerId?: number;
  id?: number;
  userId?: number;
  fullName?: string;
  name?: string;
  trainerName?: string;
  firstName?: string;
  lastName?: string;

  moduleId?: number;
  courseId?: number;
  trainingModuleId?: number;
  batchModuleId?: number;
  traineeId?: number;
  traineeIds?: number[];
  traineeUserId?: number;
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
        font-size: 15px;
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
        font-size: 15px;
        font-weight: 500;
        color: #64748b;
      }

      .achievement-summary {
        display: flex;
        gap: 8px;
      }

      .summary-item {
        min-width: 135px;
        padding: 10px 13px;
        background: #fff;
        border: 1px solid #e8edf3;
        border-radius: 11px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 7px rgba(15, 23, 42, 0.03);
        transition: 0.2s;
      }

      .summary-item:hover {
        background: #eff6ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
      }

      .summary-item span {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #64748b;
        margin-bottom: 2px;
      }

      .summary-item strong {
        font-size: 17px;
        color: #172554;
      }

      .summary-icon {
        width: 33px;
        height: 33px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 15px;
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
        font-size: 14px;
        font-weight: 700;
        color: #172554;
      }

      .feedback-info small {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #64748b;
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
        padding: 7px 13px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: 0.2s;
      }

      .feedback-btn:hover {
        background: #eff6ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
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
        transition: 0.2s;
      }

      .nfd-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 14px rgba(15, 23, 42, 0.08);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .card-header h3 {
        margin: 0;
        font-size: 18px;
        color: #172554;
      }

      .card-header span {
        display: block;
        margin-top: 3px;
        font-size: 13px;
        font-weight: 500;
        color: #64748b;
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
        font-size: 14px;
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
        font-size: 12px;
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
        font-size: 13px;
        font-weight: 700;
        text-align: left;
        color: #475569;
      }

      .badges-card {
        padding: 15px;
      }

      .badge-counter {
        background: #eef2ff;
        color: #3730a3;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 13px;
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
        min-height: 100px;
        padding: 9px 6px;
        border-radius: 9px;
        border: 1px solid #e2e8f0;
        text-align: center;
        transition: 0.2s;
        box-sizing: border-box;
        cursor: default;
      }

      .badge-item:hover {
        background: #f8fafc;
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
        border-color: #cbd5e1;
      }

      .badge-item.earned {
        background: #fffbeb;
        border-color: #fbbf24;
      }

      .badge-item.earned:hover {
        background: #fff7ed;
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
        border-color: #f59e0b;
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
        font-size: 12px;
        font-weight: 700;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .badge-item small {
        display: block;
        margin-top: 2px;
        font-size: 11px;
        font-weight: 500;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .badge-status {
        display: inline-block;
        margin-top: 4px;
        font-size: 11px;
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
        font-size: 16px;
        color: #172554;
      }

      .certificate-title p {
        margin: 3px 0 0;
        font-size: 12px;
        font-weight: 500;
        color: #64748b;
      }

      .certificate-status span {
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
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

      .certificate-preview {
        min-height: 70px;
        border-radius: 10px;
        padding: 10px 20px;
        box-sizing: border-box;
        background:
          radial-gradient(
            circle at 10% 20%,
            rgba(255, 255, 255, 0.08),
            transparent 30%
          ),
          linear-gradient(120deg, #0b1f64, #030b2e);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #fff;
      }

      .certificate-brand {
        font-size: 18px;
        font-weight: 900;
        letter-spacing: 2px;
        margin-bottom: 4px;
      }

      .certificate-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }

      .certificate-text span {
        font-size: 11px;
        font-weight: 500;
        color: #94a3b8;
        letter-spacing: 1px;
      }

      .certificate-text strong {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
      }

      .certificate-text small {
        font-size: 12px;
        font-weight: 500;
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
        font-size: 14px;
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
        font-size: 13px;
        font-weight: 500;
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
        font-size: 19px;
        color: #172554;
      }

      .modal-header p {
        margin: 4px 0 0;
        font-size: 13px;
        font-weight: 500;
        color: #64748b;
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

      .criterion-row {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 5px;
        margin-bottom: 11px;
      }

      .criterion-row label {
        font-size: 14px;
        color: #334155;
        font-weight: 700;
      }

      .comment-label {
        display: block;
        margin-top: 14px;
        margin-bottom: 5px;
        font-size: 14px;
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
        font-size: 14px;
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

      .cancel-btn,
      .submit-feedback-btn {
        border-radius: 7px;
        padding: 7px 15px;
        font-size: 14px;
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

      .toast-success {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #0d9488;
        color: #fff;
        padding: 12px 28px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        box-shadow: 0 8px 30px rgba(13, 148, 136, 0.3);
        z-index: 2000;
        animation: slideUp 0.4s ease;
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
  ],
})
export class TraineeAchievements implements OnInit {

  private api = inject(TraineeApi);
  public auth = inject(AuthService);

  userId = signal<number | null>(null);
  traineeId = signal<number | null>(null);
  enrollmentId = signal<number | null>(null);
  programId = signal<number | null>(null);
  batchId = signal<number | null>(null);

  traineeProfile = signal<TraineeProfileDto | null>(null);
  program = signal<ProgramDto | null>(null);
  modules = signal<ModuleWithLessonsDto[]>([]);
  enrollment = signal<EnrollmentDto | null>(null);
  moduleProgress = signal<TraineeModuleProgressDto[]>([]);

  allBadges = signal<BadgeDto[]>([]);
  myBadges = signal<TraineeBadgeDto[]>([]);
  certificates = signal<CertificateDto[]>([]);

  showFeedback = signal(false);

  feedbackType =
    signal<'TrainerRating' | 'BatchExperienceRating'>(
      'TrainerRating'
    );

  criteria = signal<FeedbackCriterionDto[]>([]);

  scores: Record<number, number> = {};
  criterionComments: Record<number, string> = {};

  isSubmitting = signal(false);

  pendingFeedback =
    signal<FeedbackPendingDto | null>(null);

  evaluationPeriod =
    signal<'Weekly' | 'Monthly'>('Weekly');

  selectedModuleId =
    signal<number | null>(null);

  selectedTrainerId =
    signal<number | null>(null);

  trainers =
    signal<TrainerOptionDto[]>([]);

  showSuccessToast = signal(false);
  successMessage = signal('');
  loading = signal(false);
  errorMessage = signal('');

  stats = signal({
    totalModules: 0,
    completedModules: 0,
    totalLessons: 0,
    completedLessons: 0,
    overallProgress: 0,
  });

  progressPercentage =
    computed(() =>
      this.stats().overallProgress || 0
    );

  canDownloadCertificate = computed(() => {
    return this.progressPercentage() >= 50;
  });

  traineeName = computed(() => {

    const enrollment = this.enrollment();
    const profile = this.traineeProfile();

    if (enrollment?.traineeName) {
      return enrollment.traineeName;
    }

    if (profile) {

      if (profile.fullName) {
        return profile.fullName;
      }

      const profileAny = profile as any;

      if (profileAny.name) {
        return profileAny.name;
      }

      if (profileAny.user?.fullName) {
        return profileAny.user.fullName;
      }

      if (profileAny.user?.name) {
        return profileAny.user.name;
      }
    }

    return 'اسم المتدرب';
  });

  programTitle = computed(() => {

    const enrollment = this.enrollment();
    const program = this.program();

    if (enrollment?.programTitle) {
      return enrollment.programTitle;
    }

    if (enrollment?.batchName) {
      return enrollment.batchName;
    }

    if (program?.title) {
      return program.title;
    }

    if (program?.name) {
      return program.name;
    }

    return 'التدريب';
  });

  displayModules = computed(() => {

    return this.modules().map((module) => ({

      moduleId: module.moduleId,

      title:
        module.title ||
        `وحدة ${module.moduleId}`,

      status:
        this.getModuleStatus(module),

      progress:
        module.progressPercentage || 0,

    }));

  });

  totalBadges =
    computed(() => this.allBadges().length);

  earnedBadgesCount =
    computed(() => this.myBadges().length);


  private getModuleStatus(
    module: ModuleWithLessonsDto
  ): string {

    const progress =
      module.progressPercentage || 0;

    if (progress >= 100) {
      return 'Completed';
    }

    if (progress > 0) {
      return 'InProgress';
    }

    return 'NotStarted';
  }


  isEarned = (
    badgeId: number
  ): boolean => {

    return this.myBadges().some(
      (b) =>
        b.badgeId === badgeId
    );

  };


  getBarColor = (
    progress: number
  ): string => {

    if (progress >= 80) {
      return '#22c55e';
    }

    if (progress >= 50) {
      return '#eab308';
    }

    return '#3b82f6';
  };


  ngOnInit() {

    const session =
      this.auth.session?.();

    if (session?.userId) {

      this.userId.set(
        session.userId
      );

      this.loadAllData();

    } else {

      const userIdFromStorage =
        this.getUserIdFromStorage();

      if (userIdFromStorage) {

        this.userId.set(
          userIdFromStorage
        );

        this.loadAllData();

      } else {

        this.errorMessage.set(
          'يرجى تسجيل الدخول أولاً.'
        );

      }

    }

  }


  private getUserIdFromStorage():
    number | null {

    const localUserId =
      localStorage.getItem('userId');

    if (localUserId) {

      const id =
        Number(localUserId);

      if (
        id &&
        !Number.isNaN(id)
      ) {
        return id;
      }
    }


    const sessionUserId =
      sessionStorage.getItem('userId');

    if (sessionUserId) {

      const id =
        Number(sessionUserId);

      if (
        id &&
        !Number.isNaN(id)
      ) {
        return id;
      }
    }


    const userData =
      localStorage.getItem('userData');

    if (userData) {

      try {

        const user =
          JSON.parse(userData);

        const id =
          Number(
            user.userId ??
            user.id
          );

        if (
          id &&
          !Number.isNaN(id)
        ) {
          return id;
        }

      } catch {

        console.warn(
          '⚠️ Invalid userData'
        );

      }

    }

    return null;
  }


  loadAllData() {

    const userId =
      this.userId();

    if (!userId) {

      this.errorMessage.set(
        'يرجى تسجيل الدخول أولاً.'
      );

      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');


    this.api
      .getTrainee(userId)
      .subscribe({

        next: (
          trainee: TraineeProfileDto
        ) => {

          this.traineeProfile.set(
            trainee
          );

          this.traineeId.set(
            trainee.traineeId
          );

          this.loadEnrollment(
            trainee.traineeId
          );


          this.api
            .getCertificates(
              trainee.traineeId
            )
            .subscribe({

              next: (
                certs: CertificateDto[]
              ) => {

                this.certificates.set(
                  certs ?? []
                );

              },

              error: (
                err: any
              ) => {

                console.warn(
                  '⚠️ فشل جلب الشهادات:',
                  err
                );

                this.certificates.set([]);

              },

            });

        },

        error: (
          err: any
        ) => {

          console.error(
            '❌ فشل جلب بيانات المتدرب:',
            err
          );

          this.loading.set(false);

          this.errorMessage.set(
            'تعذر تحميل بيانات المتدرب.'
          );

        },

      });


    this.api
      .getAllBadges()
      .subscribe({

        next: (
          badges: BadgeDto[]
        ) => {

          this.allBadges.set(
            badges ?? []
          );

        },

        error: (
          err: any
        ) => {

          console.warn(
            '⚠️ فشل جلب الأوسمة:',
            err
          );

        },

      });


    this.api
      .getMyBadges(userId)
      .subscribe({

        next: (
          badges: TraineeBadgeDto[]
        ) => {

          this.myBadges.set(
            badges ?? []
          );

        },

        error: (
          err: any
        ) => {

          console.warn(
            '⚠️ فشل جلب أوسمة المتدرب:',
            err
          );

        },

      });


    this.api
      .getFeedbackPending(
        1,
        userId
      )
      .subscribe({

        next: (d) =>
          this.pendingFeedback.set(
            d ?? null
          ),

        error: () => {},

      });

  }


  private loadEnrollment(
    traineeId: number
  ): void {

    this.api
      .getEnrollmentsByTrainee(
        traineeId
      )
      .subscribe({

        next: (
          enrollments: EnrollmentDto[]
        ) => {

          if (
            !enrollments ||
            enrollments.length === 0
          ) {

            this.errorMessage.set(
              'لا توجد تسجيلات للمتدرب.'
            );

            this.loading.set(false);

            return;
          }


          const activeEnrollment =
            enrollments.find(
              (e) => {

                const status =
                  String(
                    e.completionStatus ?? ''
                  ).toLowerCase();

                return (
                  status === 'active' ||
                  status === 'inprogress'
                );

              }
            ) || enrollments[0];


          this.enrollment.set(
            activeEnrollment
          );

          this.enrollmentId.set(
            activeEnrollment.enrollmentId
          );

          this.batchId.set(
            activeEnrollment.batchId
          );

          this.loadBatchAndProgram(
            activeEnrollment.batchId
          );

        },

        error: (
          err: any
        ) => {

          console.error(
            '❌ فشل جلب التسجيلات:',
            err
          );

          this.errorMessage.set(
            'تعذر تحميل تسجيل المتدرب.'
          );

          this.loading.set(false);

        },

      });

  }


  private loadBatchAndProgram(
    batchId: number
  ): void {

    if (
      !batchId ||
      Number.isNaN(batchId)
    ) {

      this.errorMessage.set(
        'لم يتم العثور على الدفعة.'
      );

      this.loading.set(false);

      return;
    }


    this.api
      .getBatch(batchId)
      .subscribe({

        next: (
          batch: BatchDto
        ) => {

          const programId =
            Number(batch.programId);

          if (
            !programId ||
            Number.isNaN(programId)
          ) {

            this.errorMessage.set(
              'لم يتم العثور على البرنامج المرتبط بالدفعة.'
            );

            this.loading.set(false);

            return;
          }

          this.programId.set(
            programId
          );

          this.loadProgram(
            programId
          );

        },

        error: (
          err: any
        ) => {

          console.error(
            '❌ فشل جلب الدفعة:',
            err
          );

          this.errorMessage.set(
            'تعذر تحميل بيانات الدفعة.'
          );

          this.loading.set(false);

        },

      });

  }


  private loadProgram(
    programId: number
  ): void {

    this.api
      .getProgram(programId)
      .subscribe({

        next: (
          program: ProgramDto
        ) => {

          this.program.set(
            program
          );

          this.loadModules(
            programId
          );

        },

        error: (
          err: any
        ) => {

          console.error(
            '❌ فشل جلب البرنامج:',
            err
          );

          this.errorMessage.set(
            'تعذر تحميل بيانات البرنامج.'
          );

          this.loading.set(false);

        },

      });

  }


  private loadModules(
    programId: number
  ): void {

    this.api
      .getProgramModules(programId)
      .subscribe({

        next: (
          modules: ModuleDto[]
        ) => {

          if (
            !modules ||
            modules.length === 0
          ) {

            this.modules.set([]);

            this.loadModuleProgress();

            return;
          }

          this.loadLessons(
            modules
          );

        },

        error: (
          err: any
        ) => {

          console.error(
            '❌ فشل جلب الوحدات:',
            err
          );

          this.modules.set([]);

          this.loadModuleProgress();

        },

      });

  }


  private loadLessons(
    modules: ModuleDto[]
  ): void {

    const requests =
      modules.map(
        (module) =>
          this.api.getModuleLessons(
            module.moduleId
          )
      );


    import('rxjs').then(
      ({ forkJoin }) => {

        forkJoin(requests)
          .subscribe({

            next: (
              lessonsData
            ) => {

              const result:
                ModuleWithLessonsDto[] =
                modules.map(
                  (
                    module,
                    index
                  ) => {

                    const lessons =
                      lessonsData[index] ?? [];

                    return {

                      ...module,

                      progressPercentage: 0,

                      prerequisitePassed: true,

                      isLocked: false,

                      lessons:
                        lessons.map(
                          (lesson) => ({

                            ...lesson,

                            progressPercentage: 0,

                          })
                        ),

                    };

                  }
                );


              this.modules.set(
                result
              );

              this.loadModuleProgress();

            },

            error: (
              err: any
            ) => {

              console.error(
                '❌ فشل جلب الدروس:',
                err
              );

              const result =
                modules.map(
                  (module) => ({

                    ...module,

                    progressPercentage: 0,

                    prerequisitePassed: true,

                    isLocked: false,

                    lessons: [],

                  })
                );

              this.modules.set(
                result
              );

              this.loadModuleProgress();

            },

          });

      }
    );

  }


  private loadModuleProgress():
    void {

    const traineeId =
      this.traineeId();

    if (
      !traineeId ||
      Number.isNaN(
        Number(traineeId)
      )
    ) {

      this.calculateStats();

      this.loading.set(false);

      return;
    }


    this.api
      .getModuleProgress(
        traineeId
      )
      .subscribe({

        next: (
          progressData:
            TraineeModuleProgressDto[]
        ) => {

          this.moduleProgress.set(
            progressData ?? []
          );

          this.updateModulesWithProgress(
            progressData ?? []
          );

          this.calculateStats();

          this.loading.set(false);

        },

        error: (
          err: any
        ) => {

          console.error(
            '❌ فشل جلب تقدم الوحدات:',
            err
          );

          this.calculateStats();

          this.loading.set(false);

        },

      });

  }


  private updateModulesWithProgress(
    progressData:
      TraineeModuleProgressDto[]
  ): void {

    const updatedModules =
      this.modules().map(
        (module) => {

          const progress =
            progressData.find(
              (p) =>
                p.moduleId ===
                module.moduleId
            );

          let percentage = 0;

          if (progress) {

            const status =
              String(
                progress.status ?? ''
              ).toLowerCase();

            if (
              status === 'completed'
            ) {

              percentage = 100;

            } else if (
              status === 'inprogress' ||
              status === 'in_progress'
            ) {

              percentage = 50;

            }

          }


          const lessons =
            module.lessons ?? [];


          const completedCount =
            percentage === 100
              ? lessons.length
              : percentage > 0
              ? Math.round(
                  (percentage / 100) *
                  lessons.length
                )
              : 0;


          const updatedLessons =
            lessons.map(
              (
                lesson,
                index
              ) => ({

                ...lesson,

                progressPercentage:
                  index < completedCount
                    ? 100
                    : 0,

              })
            );


          return {

            ...module,

            progressPercentage:
              percentage,

            lessons:
              updatedLessons,

          };

        }
      );


    this.modules.set(
      updatedModules
    );

  }


  private calculateStats():
    void {

    const modules =
      this.modules();

    const totalModules =
      modules.length;

    const completedModules =
      modules.filter(
        (m) =>
          m.progressPercentage === 100
      ).length;


    const totalLessons =
      modules.reduce(
        (
          sum,
          module
        ) =>
          sum +
          (
            module.lessons?.length ??
            0
          ),
        0
      );


    const completedLessons =
      modules.reduce(
        (
          sum,
          module
        ) =>
          sum +
          (
            module.lessons
              ?.filter(
                (lesson) =>
                  lesson.progressPercentage === 100
              )
              .length ??
            0
          ),
        0
      );


    let overallProgress = 0;

    if (totalModules > 0) {

      overallProgress =
        Math.round(
          (
            completedModules /
            totalModules
          ) * 100
        );

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
  // FEEDBACK AVAILABILITY
  // ============================================================

  // التقييم الأسبوعي متاح يوم الجمعة فقط
  isWeeklyEvaluationDay():
    boolean {

    const today = new Date();

    // Sunday = 0
    // Monday = 1
    // Tuesday = 2
    // Wednesday = 3
    // Thursday = 4
    // Friday = 5
    // Saturday = 6

    return today.getDay() === 5;

  }


  // التقييم الشهري متاح في آخر يوم من الشهر فقط
  isMonthlyEvaluationDay():
    boolean {

    const today = new Date();

    const tomorrow =
      new Date(today);

    tomorrow.setDate(
      today.getDate() + 1
    );

    return (
      tomorrow.getMonth() !==
      today.getMonth()
    );

  }


  // تحديد إمكانية إرسال تقييم المدرب
  // الأسبوعي = الجمعة
  // الشهري = آخر يوم من الشهر
  canSubmitTrainerEvaluation():
    boolean {

    if (
      this.evaluationPeriod() ===
      'Weekly'
    ) {

      return this.isWeeklyEvaluationDay();

    }

    return this.isMonthlyEvaluationDay();

  }


  // تقييم البرنامج متاح فقط بعد إكمال البرنامج 100%
  canSubmitProgramFeedback():
    boolean {

    return this.progressPercentage() >= 100;

  }


  // تحديد شرط الإرسال حسب نوع التقييم
  canSubmitCurrentFeedback():
    boolean {

    if (
      this.feedbackType() ===
      'TrainerRating'
    ) {

      return this.canSubmitTrainerEvaluation();

    }

    return this.canSubmitProgramFeedback();

  }


  getTrainerId(
    trainer: TrainerOptionDto
  ): number {

    return Number(
      trainer.trainerId ??
      trainer.id ??
      trainer.userId ??
      0
    );

  }


  getTrainerName(
    trainer: TrainerOptionDto
  ): string {

    return (
      trainer.fullName ??
      trainer.name ??
      trainer.trainerName ??
      `${trainer.firstName ?? ''} ${trainer.lastName ?? ''}`.trim()
    ) || 'المدرب';

  }


  onEvaluationPeriodChange(
    period:
      'Weekly' |
      'Monthly'
  ): void {

    this.evaluationPeriod.set(
      period
    );

    this.scores = {};

    this.criterionComments = {};

  }


  private selectTrainerAutomatically(
    trainers:
      TrainerOptionDto[],
    selectedModuleId:
      number
  ): void {

    const traineeId =
      Number(
        this.traineeId() ?? 0
      );


    const moduleMatchedTrainers =
      trainers.filter(
        (trainer: any) => {

          const trainerModuleId =
            Number(
              trainer?.moduleId ??
              trainer?.courseId ??
              trainer?.trainingModuleId ??
              trainer?.batchModuleId ??
              0
            );

          return (
            trainerModuleId > 0 &&
            trainerModuleId ===
            selectedModuleId
          );

        }
      );


    let candidates =
      moduleMatchedTrainers.length > 0
        ? moduleMatchedTrainers
        : trainers;


    const traineeMatchedTrainers =
      candidates.filter(
        (trainer: any) => {

          const trainerTraineeId =
            Number(
              trainer?.traineeId ??
              trainer?.traineeUserId ??
              0
            );


          const trainerTraineeIds =
            Array.isArray(
              trainer?.traineeIds
            )
              ? trainer.traineeIds.map(
                  (id: any) =>
                    Number(id)
                )
              : [];


          const hasTraineeInformation =
            trainerTraineeId > 0 ||
            trainerTraineeIds.length > 0;


          if (
            !hasTraineeInformation
          ) {

            return true;

          }


          return (
            trainerTraineeId ===
              traineeId ||
            trainerTraineeIds.includes(
              traineeId
            )
          );

        }
      );


    if (
      traineeMatchedTrainers.length > 0
    ) {

      candidates =
        traineeMatchedTrainers;

    }


    if (
      candidates.length === 1
    ) {

      const trainerId =
        this.getTrainerId(
          candidates[0]
        );

      if (trainerId > 0) {

        this.selectedTrainerId.set(
          trainerId
        );

        this.trainers.set(
          candidates
        );

        return;

      }

    }


    this.selectedTrainerId.set(
      null
    );

    this.trainers.set(
      candidates
    );

  }


  onModuleSelected(
    moduleId:
      number | null
  ): void {

    this.selectedModuleId.set(
      moduleId
        ? Number(moduleId)
        : null
    );

    this.selectedTrainerId.set(
      null
    );

    this.trainers.set([]);


    const batchId =
      this.batchId();


    if (
      !batchId ||
      !moduleId
    ) {

      return;

    }


    this.api
      .getBatchTrainers(batchId)
      .subscribe({

        next: (
          trainers: any[]
        ) => {

          const selectedModuleId =
            Number(moduleId);

          const allTrainers =
            (
              trainers ?? []
            ) as TrainerOptionDto[];


          this.selectTrainerAutomatically(
            allTrainers,
            selectedModuleId
          );

        },

        error: (
          err: any
        ) => {

          console.error(
            '❌ فشل جلب المدربين:',
            err
          );

          this.selectedTrainerId.set(
            null
          );

          this.trainers.set([]);

        },

      });

  }


  onTrainerSelected(
    trainerId:
      number | null
  ): void {

    this.selectedTrainerId.set(
      trainerId
        ? Number(trainerId)
        : null
    );

  }


  openFeedback(
    type:
      'TrainerRating' |
      'BatchExperienceRating'
  ) {

    this.feedbackType.set(
      type
    );

    this.scores = {};

    this.criterionComments = {};

    this.selectedModuleId.set(
      null
    );

    this.selectedTrainerId.set(
      null
    );

    this.trainers.set([]);

    this.evaluationPeriod.set(
      'Weekly'
    );

    this.showFeedback.set(
      true
    );


    this.api
      .getFeedbackCriteria(type)
      .subscribe({

        next: (
          criteria:
            FeedbackCriterionDto[]
        ) => {

          this.criteria.set(
            criteria ?? []
          );

        },

        error: (
          err: any
        ) => {

          console.warn(
            '⚠️ فشل جلب معايير التقييم:',
            err
          );

          this.criteria.set([]);

        },

      });

  }


  // ============================================================
  // FEEDBACK HELPERS
  // ============================================================

  private buildFeedbackComment():
    string | null {

    const comments =
      Object.values(
        this.criterionComments
      )
        .map(
          (value) =>
            String(
              value ?? ''
            ).trim()
        )
        .filter(
          (value) =>
            value.length > 0
        );


    if (
      comments.length === 0
    ) {

      return null;

    }


    return comments.join(
      '\n'
    );

  }


  private buildFeedbackScores():
    any[] {

    return Object.entries(
      this.scores
    )
      .filter(
        ([_, score]) =>
          Number(score) >= 1 &&
          Number(score) <= 5
      )
      .map(
        ([criterionId, score]) => ({

          criterionId:
            Number(criterionId),

          score:
            Number(score),

        })
      );

  }


  // ============================================================
  // SUBMIT FEEDBACK
  // ============================================================

  submitFeedback() {

    const isTrainer =
      this.feedbackType() ===
      'TrainerRating';

    const isProgram =
      this.feedbackType() ===
      'BatchExperienceRating';


    // ==========================================================
    // VALIDATE TRAINER EVALUATION AVAILABILITY
    // ==========================================================

    if (isTrainer) {

      if (!this.canSubmitTrainerEvaluation()) {

        this.showSuccessToast.set(true);

        this.successMessage.set(
          this.evaluationPeriod() === 'Weekly'
            ? '⚠️ التقييم الأسبوعي متاح يوم الجمعة فقط'
            : '⚠️ التقييم الشهري متاح في آخر يوم من الشهر فقط'
        );

        setTimeout(
          () =>
            this.showSuccessToast.set(false),
          3000
        );

        return;

      }

    }


    // ==========================================================
    // VALIDATE PROGRAM EVALUATION AVAILABILITY
    // ==========================================================

    if (isProgram) {

      if (!this.canSubmitProgramFeedback()) {

        this.showSuccessToast.set(true);

        this.successMessage.set(
          '⚠️ تقييم البرنامج التدريبي متاح بعد إكمال البرنامج بالكامل 100%'
        );

        setTimeout(
          () =>
            this.showSuccessToast.set(false),
          3000
        );

        return;

      }

    }


    // ==========================================================
    // TRAINEE ID
    // ==========================================================

    const traineeId =
      Number(
        this.traineeId() ?? 0
      );


    if (
      !traineeId ||
      Number.isNaN(traineeId)
    ) {

      this.showSuccessToast.set(
        true
      );

      this.successMessage.set(
        '⚠️ لم يتم العثور على رقم المتدرب'
      );

      setTimeout(
        () =>
          this.showSuccessToast.set(
            false
          ),
        3000
      );

      return;

    }


    // ==========================================================
    // VARIABLES
    // ==========================================================

    let moduleId = 0;
    let trainerId = 0;
    let batchId = 0;


    // ==========================================================
    // TRAINER FEEDBACK
    // ==========================================================

    if (isTrainer) {

      moduleId =
        Number(
          this.selectedModuleId() ?? 0
        );


      if (
        !moduleId ||
        Number.isNaN(moduleId)
      ) {

        this.showSuccessToast.set(
          true
        );

        this.successMessage.set(
          '⚠️ يرجى اختيار الكورس'
        );

        setTimeout(
          () =>
            this.showSuccessToast.set(
              false
            ),
          3000
        );

        return;

      }


      trainerId =
        Number(
          this.selectedTrainerId() ?? 0
        );


      if (
        !trainerId ||
        Number.isNaN(trainerId)
      ) {

        this.showSuccessToast.set(
          true
        );

        this.successMessage.set(
          '⚠️ لم يتم تحديد المدرب المرتبط بهذا الكورس، يرجى التأكد من بيانات ربط المدرب بالكورس'
        );

        setTimeout(
          () =>
            this.showSuccessToast.set(
              false
            ),
          3000
        );

        return;

      }

    }


    // ==========================================================
    // PROGRAM / BATCH FEEDBACK
    // ==========================================================

    if (isProgram) {

      batchId =
        Number(
          this.batchId() ?? 0
        );


      if (
        !batchId ||
        Number.isNaN(batchId)
      ) {

        this.showSuccessToast.set(
          true
        );

        this.successMessage.set(
          '⚠️ لم يتم العثور على رقم الدفعة'
        );

        setTimeout(
          () =>
            this.showSuccessToast.set(
              false
            ),
          3000
        );

        return;

      }


      const availableModules =
        this.modules();


      if (
        availableModules &&
        availableModules.length > 0
      ) {

        moduleId =
          Number(
            availableModules[0].moduleId
          );

      }


      if (
        !moduleId ||
        Number.isNaN(moduleId)
      ) {

        moduleId = 1;

      }


      console.log(
        '🧪 Program feedback ModuleId:',
        moduleId
      );

    }


    // ==========================================================
    // PREVENT DOUBLE SUBMISSION
    // ==========================================================

    if (
      this.isSubmitting()
    ) {

      return;

    }

    this.isSubmitting.set(
      true
    );


    // ==========================================================
    // COMMENT
    // ==========================================================

    const comment =
      this.buildFeedbackComment();


    // ==========================================================
    // SCORES
    // ==========================================================

    const scores =
      this.buildFeedbackScores();


    // ==========================================================
    // VALIDATE SCORES
    // ==========================================================

    if (
      !scores ||
      scores.length === 0
    ) {

      this.isSubmitting.set(
        false
      );

      this.showSuccessToast.set(
        true
      );

      this.successMessage.set(
        '⚠️ يرجى اختيار درجة التقييم'
      );

      setTimeout(
        () =>
          this.showSuccessToast.set(
            false
          ),
        3000
      );

      return;

    }


    // ==========================================================
    // FINAL PAYLOAD
    // ==========================================================

    const feedbackData: any = {

      type:
        isTrainer
          ? 0
          : 1,

      traineeId:
        traineeId,

      moduleId:
        moduleId,

      trainerId:
        isTrainer
          ? trainerId
          : null,

      batchId:
        isProgram
          ? batchId
          : null,

      comment:
        comment,

      scores:
        scores,

    };


    // ==========================================================
    // DEBUG
    // ==========================================================

    console.log(
      '========================================'
    );

    console.log(
      '📤 Feedback Data:',
      feedbackData
    );

    console.log(
      '📤 Feedback Type:',
      isTrainer
        ? 'TrainerRating'
        : 'BatchExperienceRating'
    );

    console.log(
      '📤 Trainee ID:',
      feedbackData.traineeId
    );

    console.log(
      '📤 Module ID:',
      feedbackData.moduleId
    );

    console.log(
      '📤 Trainer ID:',
      feedbackData.trainerId
    );

    console.log(
      '📤 Batch ID:',
      feedbackData.batchId
    );

    console.log(
      '📤 Scores:',
      feedbackData.scores
    );

    console.log(
      '========================================'
    );


    // ==========================================================
    // API
    // ==========================================================

    this.api
      .submitFeedback(
        feedbackData
      )
      .subscribe({

        // ======================================================
        // SUCCESS
        // ======================================================

        next: (
          response: any
        ) => {

          console.log(
            '========================================'
          );

          console.log(
            '✅ Feedback submitted successfully:',
            response
          );

          console.log(
            '========================================'
          );


          this.isSubmitting.set(
            false
          );

          this.showFeedback.set(
            false
          );


          this.scores = {};

          this.criterionComments = {};

          this.selectedModuleId.set(
            null
          );

          this.selectedTrainerId.set(
            null
          );

          this.trainers.set([]);


          this.showSuccessToast.set(
            true
          );

          this.successMessage.set(
            'تم إرسال التقييم بنجاح!'
          );


          setTimeout(
            () => {

              this.showSuccessToast.set(
                false
              );

            },
            3000
          );


          this.api
            .getFeedbackPending(
              1,
              this.traineeId() || 0
            )
            .subscribe({

              next: (d) => {

                this.pendingFeedback.set(
                  d ?? null
                );

              },

              error: () => {},

            });

        },


        // ======================================================
        // ERROR
        // ======================================================

        error: (
          err: any
        ) => {

          console.error(
            '========================================'
          );

          console.error(
            '❌ خطأ في إرسال التقييم:',
            err
          );

          console.error(
            '📤 Feedback Data:',
            feedbackData
          );

          console.error(
            '❌ HTTP Status:',
            err?.status
          );

          console.error(
            '❌ Error Message:',
            err?.message
          );

          console.error(
            '❌ Server Error:',
            err?.error
          );

          console.error(
            '========================================'
          );


          this.isSubmitting.set(
            false
          );

          this.showSuccessToast.set(
            true
          );

          this.successMessage.set(
            '❌ حدث خطأ في إرسال التقييم، يرجى المحاولة مرة أخرى'
          );


          setTimeout(
            () =>
              this.showSuccessToast.set(
                false
              ),
            3000
          );

        },

      });

  }

// ============================================================
// CERTIFICATE DOWNLOAD
// ============================================================
// ============================================================
// CERTIFICATE DOWNLOAD
// ============================================================

downloadCertificate() {

  if (!this.canDownloadCertificate()) {

    this.showSuccessToast.set(true);

    this.successMessage.set(
      '⚠️ الشهادة غير متاحة بعد'
    );

    setTimeout(
      () =>
        this.showSuccessToast.set(false),
      3000
    );

    return;

  }

  const cert =
    this.certificates()[0];

  if (!cert) {

    this.showSuccessToast.set(true);

    this.successMessage.set(
      '⚠️ لم يتم العثور على شهادة، يرجى التواصل مع الدعم'
    );

    setTimeout(
      () =>
        this.showSuccessToast.set(false),
      3000
    );

    return;

  }

  this.loading.set(true);

  this.api
    .downloadCertificate(
      cert.certificateId
    )
    .subscribe({

      next: (
        blob: Blob
      ) => {

        try {

          const reader =
            new FileReader();

          reader.onload = () => {

            const result =
              reader.result;

            const bytes =
              result instanceof ArrayBuffer
                ? new Uint8Array(result)
                : null;

            let isValidPdf = false;

            if (bytes && bytes.length >= 4) {

              isValidPdf =
                bytes[0] === 0x25 &&
                bytes[1] === 0x50 &&
                bytes[2] === 0x44 &&
                bytes[3] === 0x46;

            }

            /*
             * إذا كان الملف PDF صالحًا
             * يتم تنزيله مباشرة.
             */
            if (isValidPdf) {

              const pdfBlob =
                new Blob(
                  [blob],
                  {
                    type: 'application/pdf'
                  }
                );

              const url =
                window.URL.createObjectURL(
                  pdfBlob
                );

              const a =
                document.createElement('a');

              a.href = url;

              a.download =
                `شهادة_إتمام_التدريب_${Date.now()}.pdf`;

              document.body.appendChild(a);

              a.click();

              document.body.removeChild(a);

              setTimeout(
                () =>
                  window.URL.revokeObjectURL(url),
                100
              );

              this.loading.set(false);

              return;

            }

            /*
             * إذا لم يكن الملف القادم من الـ API
             * PDF صالحًا، يتم إنشاء PDF من Frontend.
             */
            this.generateCertificatePdf(cert);

            this.loading.set(false);

          };

          reader.onerror = () => {

            console.warn(
              '⚠️ تعذر قراءة ملف الشهادة، سيتم إنشاء PDF من الواجهة.'
            );

            this.generateCertificatePdf(cert);

            this.loading.set(false);

          };

          reader.readAsArrayBuffer(blob);

        } catch (error) {

          console.error(
            '❌ خطأ أثناء معالجة ملف الشهادة:',
            error
          );

          this.generateCertificatePdf(cert);

          this.loading.set(false);

        }

      },

      error: (
        err: any
      ) => {

        console.error(
          '❌ فشل تحميل الشهادة من API:',
          err
        );

        /*
         * في حالة فشل الـ API بالكامل،
         * يتم إنشاء الشهادة من Frontend.
         */
        this.generateCertificatePdf(cert);

        this.loading.set(false);

      },

    });

}


// ============================================================
// GENERATE CERTIFICATE PDF - FRONTEND
// ============================================================

private generateCertificatePdf(
  cert: CertificateDto
): void {

  try {

    const doc =
      new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const certificate =
      cert as any;

    const traineeName =
      certificate.traineeName ??
      certificate.fullName ??
      certificate.studentName ??
      this.traineeName() ??
      'Trainee';

    const programName =
      certificate.programTitle ??
      certificate.programName ??
      certificate.trainingProgramName ??
      this.programTitle() ??
      'Training Program';

    const certificateNumber =
      certificate.certificateNumber ??
      certificate.certificateCode ??
      certificate.number ??
      certificate.certificateId ??
      '';

    const issuedDate =
      certificate.issuedAt ??
      certificate.issueDate ??
      certificate.createdAt ??
      null;

    let formattedDate = '';

    if (issuedDate) {

      const date =
        new Date(issuedDate);

      if (!Number.isNaN(date.getTime())) {

        formattedDate =
          date.toLocaleDateString(
            'en-GB'
          );

      }

    }

    // ========================================================
    // BACKGROUND
    // ========================================================

    doc.setFillColor(
      248,
      250,
      252
    );

    doc.rect(
      0,
      0,
      pageWidth,
      pageHeight,
      'F'
    );

    // ========================================================
    // OUTER BORDER
    // ========================================================

    doc.setDrawColor(
      11,
      31,
      100
    );

    doc.setLineWidth(1.5);

    doc.rect(
      10,
      10,
      pageWidth - 20,
      pageHeight - 20
    );

    // ========================================================
    // INNER BORDER
    // ========================================================

    doc.setDrawColor(
      13,
      148,
      136
    );

    doc.setLineWidth(0.6);

    doc.rect(
      14,
      14,
      pageWidth - 28,
      pageHeight - 28
    );

    // ========================================================
    // HEADER
    // ========================================================

    doc.setTextColor(
      11,
      31,
      100
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(26);

    doc.text(
      'NAFADH',
      pageWidth / 2,
      38,
      {
        align: 'center'
      }
    );

    doc.setTextColor(
      71,
      85,
      105
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(12);

    doc.text(
      'TRAINING AND ACADEMY MANAGEMENT PLATFORM',
      pageWidth / 2,
      46,
      {
        align: 'center'
      }
    );

    // ========================================================
    // CERTIFICATE TITLE
    // ========================================================

    doc.setTextColor(
      13,
      148,
      136
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(25);

    doc.text(
      'CERTIFICATE OF COMPLETION',
      pageWidth / 2,
      66,
      {
        align: 'center'
      }
    );

    // ========================================================
    // DESCRIPTION
    // ========================================================

    doc.setTextColor(
      71,
      85,
      105
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(12);

    doc.text(
      'This certificate is proudly presented to',
      pageWidth / 2,
      82,
      {
        align: 'center'
      }
    );

    // ========================================================
    // TRAINEE NAME
    // ========================================================

    doc.setTextColor(
      23,
      37,
      84
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(23);

    doc.text(
      String(traineeName),
      pageWidth / 2,
      96,
      {
        align: 'center',
        maxWidth: pageWidth - 50
      }
    );

    // ========================================================
    // UNDERLINE
    // ========================================================

    doc.setDrawColor(
      13,
      148,
      136
    );

    doc.setLineWidth(0.8);

    doc.line(
      65,
      101,
      pageWidth - 65,
      101
    );

    // ========================================================
    // PROGRAM
    // ========================================================

    doc.setTextColor(
      71,
      85,
      105
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(12);

    doc.text(
      'for successfully completing the training program',
      pageWidth / 2,
      116,
      {
        align: 'center'
      }
    );

    doc.setTextColor(
      11,
      31,
      100
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(18);

    doc.text(
      String(programName),
      pageWidth / 2,
      130,
      {
        align: 'center',
        maxWidth: pageWidth - 60
      }
    );

    // ========================================================
    // CERTIFICATE DETAILS
    // ========================================================

    doc.setTextColor(
      71,
      85,
      105
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(10);

    if (certificateNumber) {

      doc.text(
        `Certificate No: ${certificateNumber}`,
        pageWidth / 2,
        148,
        {
          align: 'center'
        }
      );

    }

    if (formattedDate) {

      doc.text(
        `Issue Date: ${formattedDate}`,
        pageWidth / 2,
        156,
        {
          align: 'center'
        }
      );

    }

    // ========================================================
    // FOOTER
    // ========================================================

    doc.setDrawColor(
      226,
      232,
      240
    );

    doc.setLineWidth(0.4);

    doc.line(
      45,
      171,
      pageWidth - 45,
      171
    );

    doc.setTextColor(
      100,
      116,
      139
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(9);

    doc.text(
      'Nafadh Training & Academy Management Platform',
      pageWidth / 2,
      181,
      {
        align: 'center'
      }
    );

    doc.setTextColor(
      13,
      148,
      136
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(9);

    doc.text(
      'Official Training Certificate',
      pageWidth / 2,
      188,
      {
        align: 'center'
      }
    );

    // ========================================================
    // SAVE PDF
    // ========================================================

    doc.save(
      `شهادة_إتمام_التدريب_${Date.now()}.pdf`
    );

  } catch (error) {

    console.error(
      '❌ فشل إنشاء ملف PDF:',
      error
    );

    this.showSuccessToast.set(true);

    this.successMessage.set(
      '❌ تعذر إنشاء الشهادة، يرجى المحاولة مرة أخرى'
    );

    setTimeout(
      () =>
        this.showSuccessToast.set(false),
      3000
    );

  }

}

}