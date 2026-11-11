
import { NafadhConstantsService } from '../../../../core/services/nafadh-constants.service';
import { certificateDocument } from '../../../../core/models/enums';
import { moduleProgressKey } from '../../../../core/models/administrative-constants';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TraineeApi,
  OfficialCertificateDetailsDto
} from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';

import html2pdf from 'html2pdf.js';

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
  styleUrl: './achievements.scss',

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

      /* =====================================================
         BADGES CARD
      ===================================================== */

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

      /* =====================================================
         CERTIFICATE CARD
      ===================================================== */

      .certificate-card {
        padding: 13px 15px;
      }

      .certificate-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
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
        line-height: 1.6;
      }

      /* =====================================================
         CERTIFICATE STATUS
      ===================================================== */

      .certificate-status span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }

      .certificate-status .available {
        background: #dcfce7;
        color: #166534;
      }

      .certificate-status .pending {
        background: #fef3c7;
        color: #b45309;
      }

      /* =====================================================
         CERTIFICATE PREVIEW
      ===================================================== */

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

      /* =====================================================
         CERTIFICATE ACTION BUTTONS
      ===================================================== */

      .certificate-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 8px;
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

      .certificate-actions .download-btn {
        flex: 1;
        min-width: 150px;
        width: auto;
        margin-top: 0;
      }

      .download-btn.enabled {
        background: #0d9488;
        cursor: pointer;
      }

      .download-btn.enabled:hover {
        background: #0f766e;
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(13, 148, 136, 0.18);
      }

      .download-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      /* =====================================================
         EMPTY STATE
      ===================================================== */

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

      /* =====================================================
         MODAL BACKGROUND
      ===================================================== */

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

      /* =====================================================
         FEEDBACK FORM
      ===================================================== */

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

      /* =====================================================
         SUCCESS TOAST
      ===================================================== */

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

      /* =====================================================
         RESPONSIVE DESIGN
      ===================================================== */

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

        .certificate-info {
          align-items: flex-start;
          flex-direction: column;
        }

        .certificate-actions {
          flex-direction: column;
        }

        .certificate-actions .download-btn {
          width: 100%;
          min-width: 0;
          flex: none;
        }
      }
    `,
  ],
})

/* ============================================================
   TRAINEE ACHIEVEMENTS COMPONENT
============================================================ */

export class TraineeAchievements implements OnInit {

  readonly constants = inject(NafadhConstantsService);

  private api = inject(TraineeApi);
  public auth = inject(AuthService);

  // ============================================================
  // USER AND ENROLLMENT
  // ============================================================

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

  overallEvaluation = signal<any | null>(null);
readonly overallEvaluationDetailsOpen = signal(false);

openOverallEvaluationDetails(): void {
  this.overallEvaluationDetailsOpen.set(true);
}

closeOverallEvaluationDetails(): void {
  this.overallEvaluationDetailsOpen.set(false);
}

// ============================================================
// OFFICIAL CERTIFICATE - ADMIN GRADE SOURCE
// ============================================================

readonly officialCertificateDetails =
  signal<OfficialCertificateDetailsDto | null>(null);

readonly certificateFinalScore = computed<string>(() => {
  const details = this.officialCertificateDetails();
  const certificate = this.issuedCertificate();

  if (
    !details ||
    !certificate ||
    Number(details.certificateId) !==
      Number(certificate.certificateId) ||
    !details.hasGrade ||
    details.grade === null ||
    details.grade === undefined
  ) {
    return 'غير متاح';
  }

  const grade = Number(details.grade);

  return Number.isFinite(grade)
    ? `${grade.toFixed(2)}%`
    : 'غير متاح';
});

readonly certificateFinalGrade = computed<string>(() => {
  const details = this.officialCertificateDetails();
  const certificate = this.issuedCertificate();

  if (
    !details ||
    !certificate ||
    Number(details.certificateId) !==
      Number(certificate.certificateId)
  ) {
    return 'غير متاح';
  }

  return details.gradeLabel || 'غير متاح';
});

readonly certificateTrainingHours = computed(() => {
  const batch = this.certificateBatch();

  if (!batch?.startDate || !batch?.endDate) {
    return null;
  }

  // لا نفترض عدد ساعات أسبوعية ثابتًا.
  // ستُربط ساعات الشهادة بإعدادات التدريب المعتمدة.
  return null;
});
  // ============================================================
  // BADGES
  // ============================================================

  allBadges = signal<BadgeDto[]>([]);
  myBadges = signal<TraineeBadgeDto[]>([]);


  // ============================================================
  // CERTIFICATES - ADMIN ISSUED ONLY
  // ============================================================

  readonly certificateDocument = certificateDocument;

  certificates = signal<CertificateDto[]>([]);

  readonly certificateBatch = signal<BatchDto | null>(null);

  readonly certificatePreviewOpen = signal(false);

  readonly certificatePrintId =
    'trainee-printable-certificate';

  issuedCertificate = computed<CertificateDto | null>(() => {
    const enrollmentId = Number(
      this.enrollment()?.enrollmentId ??
      this.enrollmentId() ??
      0
    );

    if (!enrollmentId) {
      return null;
    }

    return this.certificates().find(
      certificate =>
        Number(certificate.enrollmentId) === enrollmentId &&
        Number(certificate.certificateId) > 0
    ) ?? null;
  });


  // ============================================================
  // FEEDBACK
  // ============================================================

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

  // ============================================================
  // UI STATES
  // ============================================================

  showSuccessToast = signal(false);
  successMessage = signal('');

  loading = signal(false);
  errorMessage = signal('');

  // ============================================================
  // PROGRESS STATISTICS
  // ============================================================

  stats = signal({
    totalModules: 0,
    completedModules: 0,
    totalLessons: 0,
    completedLessons: 0,
    overallProgress: 0,
  });

  progressPercentage = computed(() => {
    return this.stats().overallProgress || 0;
  });


  // ============================================================
  // CERTIFICATE AVAILABILITY
  // ============================================================

  canDownloadCertificate = computed(() => {
    return this.issuedCertificate() !== null;
  });



  // ============================================================
  // TRAINEE NAME
  // ============================================================

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

  // ============================================================
  // PROGRAM TITLE
  // ============================================================

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

  // ============================================================
  // DISPLAY MODULES
  // ============================================================

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

  // ============================================================
  // BADGES STATISTICS
  // ============================================================

  totalBadges = computed(() => {
    return this.allBadges().length;
  });

  earnedBadgesCount = computed(() => {
    return this.myBadges().length;
  });

  // ============================================================
  // MODULE STATUS
  // ============================================================

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

  // ============================================================
  // CHECK IF BADGE IS EARNED
  // ============================================================

  isEarned = (
    badgeId: number
  ): boolean => {
    return this.myBadges().some(
      (badge) => badge.badgeId === badgeId
    );
  };

  // ============================================================
  // PROGRESS BAR COLOR
  // ============================================================

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

  // ============================================================
  // COMPONENT INITIALIZATION
  // ============================================================

  ngOnInit(): void {
    this.constants.ensure('NFD_FBK_TYPE');

    const session = this.auth.session?.();

    if (session?.userId) {
      this.userId.set(session.userId);
      this.loadAllData();
      return;
    }

    const userIdFromStorage =
      this.getUserIdFromStorage();

    if (userIdFromStorage) {
      this.userId.set(userIdFromStorage);
      this.loadAllData();
    } else {
      this.errorMessage.set(
        'يرجى تسجيل الدخول أولاً.'
      );
    }
  }

  // ============================================================
  // GET USER ID FROM STORAGE
  // ============================================================

  private getUserIdFromStorage(): number | null {
    const localUserId =
      localStorage.getItem('userId');

    if (localUserId) {
      const id = Number(localUserId);

      if (id && !Number.isNaN(id)) {
        return id;
      }
    }

    const sessionUserId =
      sessionStorage.getItem('userId');

    if (sessionUserId) {
      const id = Number(sessionUserId);

      if (id && !Number.isNaN(id)) {
        return id;
      }
    }

    const userData =
      localStorage.getItem('userData');

    if (userData) {
      try {
        const user = JSON.parse(userData);

        const id = Number(
          user.userId ?? user.id
        );

        if (id && !Number.isNaN(id)) {
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

  // ============================================================
  // LOAD ALL TRAINEE DATA
  // ============================================================

  loadAllData(): void {
    const userId = this.userId();

    if (!userId) {
      this.errorMessage.set(
        'يرجى تسجيل الدخول أولاً.'
      );
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    // Reset certificate state before loading new data.
    
this.certificates.set([]);
this.certificateBatch.set(null);
this.certificatePreviewOpen.set(false);


    // ==========================================================
    // LOAD TRAINEE PROFILE
    // ==========================================================

    this.api
      .getTrainee(userId)
      .subscribe({
        next: (
          trainee: TraineeProfileDto
        ) => {
          this.traineeProfile.set(trainee);
          this.traineeId.set(
            trainee.traineeId
          );

          // Load current enrollment.
          this.loadEnrollment(
            trainee.traineeId
          );

          // Load certificates issued for this trainee.
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

              error: (err: any) => {
                console.warn(
                  '⚠️ فشل جلب الشهادات:',
                  err
                );

                this.certificates.set([]);
              },
            });
        },

        error: (err: any) => {
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

    // ==========================================================
    // LOAD ALL BADGES
    // ==========================================================

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

        error: (err: any) => {
          console.warn(
            '⚠️ فشل جلب الأوسمة:',
            err
          );
        },
      });

    // ==========================================================
    // LOAD TRAINEE BADGES
    // ==========================================================

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

        error: (err: any) => {
          console.warn(
            '⚠️ فشل جلب أوسمة المتدرب:',
            err
          );
        },
      });

    // ==========================================================
    // LOAD PENDING FEEDBACK
    // ==========================================================

    this.api
      .getFeedbackPending(
        1,
        userId
      )
      .subscribe({
        next: (data) => {
          this.pendingFeedback.set(
            data ?? null
          );
        },

        error: () => {},
      });
  }

  // ============================================================
  // LOAD TRAINEE ENROLLMENT
  // ============================================================

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

          // Prefer an active enrollment.
          const activeEnrollment =
            enrollments.find((e) => {
              const status = String(
                e.completionStatus ?? ''
              ).toLowerCase();

              return (
                status === 'active' ||
                status === 'inprogress'
              );
            }) || enrollments[0];

          this.enrollment.set(
            activeEnrollment
          );

    this.enrollmentId.set(
  activeEnrollment.enrollmentId
);

this.batchId.set(
  activeEnrollment.batchId
);

// Official certificate details.
this.loadOfficialCertificateDetails(
  activeEnrollment.enrollmentId
);

// Overall evaluation remains separate.
this.loadOverallEvaluation(
  activeEnrollment.enrollmentId
);

          // Load batch and training program.
          this.loadBatchAndProgram(
            activeEnrollment.batchId
          );
        },

        error: (err: any) => {
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

        
next: (batch: BatchDto) => {

  // Store the batch information for the official certificate.
  this.certificateBatch.set(batch);

  const programId = Number(batch.programId);

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
              moduleProgressKey(
                progress.status
              );

            if (
              status === 'Completed'
            ) {

              percentage = 100;

            } else if (
              status === 'InProgress'
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
// LOAD OFFICIAL CERTIFICATE DETAILS
// ============================================================

private loadOfficialCertificateDetails(
  enrollmentId: number
): void {
  this.officialCertificateDetails.set(null);

  if (!enrollmentId) {
    return;
  }

  this.api
    .getOfficialCertificateDetails(enrollmentId)
    .subscribe({
      next: (details) => {
        // Ignore stale responses if enrollment changes.
        if (
          Number(this.enrollmentId()) !==
          Number(details.enrollmentId)
        ) {
          return;
        }

        this.officialCertificateDetails.set(details);

        console.log(
          'Official Certificate Details:',
          details
        );
      },

      error: (err) => {
        if (Number(this.enrollmentId()) !== enrollmentId) {
          return;
        }

        console.warn(
          'Failed to load official certificate details:',
          err
        );

        this.officialCertificateDetails.set(null);
      }
    });
}
  // ============================================================
  // OVERALL EVALUATION
  // ============================================================

  private loadOverallEvaluation(
    enrollmentId: number
  ): void {

    this.api
      .getOverallEvaluation(
        enrollmentId
      )
      .subscribe({

        next: (data) => {

          this.overallEvaluation.set(
            data
          );

        },

        error: (err) => {

          console.warn(
            '⚠️ لم يتم العثور على التقييم الكلي أو حدث خطأ:',
            err
          );

          this.overallEvaluation.set(
            null
          );

        },

      });

  }


  // ============================================================
  // FEEDBACK AVAILABILITY
  // ============================================================

  // Weekly evaluation is available on any day.
  // Duplicate submissions are validated by the backend.

  isWeeklyEvaluationDay(): boolean {
    return true;
  }

  // Monthly evaluation is available on any day.
  // Duplicate submissions are validated by the backend.

  isMonthlyEvaluationDay(): boolean {
    return true;
  }

  // Trainer evaluation supports Weekly and Monthly periods.

  canSubmitTrainerEvaluation(): boolean {
    return (
      this.evaluationPeriod() === 'Weekly' ||
      this.evaluationPeriod() === 'Monthly'
    );
  }

  // Final program evaluation requires 100% completion.

  canSubmitProgramFeedback(): boolean {
    return this.progressPercentage() >= 100;
  }

  // Determine submission availability by feedback type.

  canSubmitCurrentFeedback(): boolean {

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

  submitFeedback(): void {
    const isTrainer =
      this.feedbackType() === 'TrainerRating';

    const isProgram =
      this.feedbackType() === 'BatchExperienceRating';

    // Prevent multiple submissions
    if (this.isSubmitting()) {
      return;
    }

    // Final program evaluation requires 100% completion
    if (isProgram && !this.canSubmitProgramFeedback()) {
      this.showSuccessToast.set(true);
      this.successMessage.set(
        '⚠️ التقييم النهائي متاح بعد إكمال البرنامج التدريبي بنسبة 100%.'
      );

      setTimeout(() => {
        this.showSuccessToast.set(false);
      }, 3000);

      return;
    }

    // Validate trainee
    const traineeId = Number(this.traineeId() ?? 0);

    if (!traineeId || Number.isNaN(traineeId)) {
      this.showSuccessToast.set(true);
      this.successMessage.set(
        '⚠️ لم يتم العثور على رقم المتدرب'
      );

      setTimeout(() => {
        this.showSuccessToast.set(false);
      }, 3000);

      return;
    }

    let moduleId = 0;
    let trainerId = 0;
    let batchId = 0;

    // ============================================================
    // TRAINER EVALUATION
    // ============================================================

    if (isTrainer) {
      moduleId = Number(this.selectedModuleId() ?? 0);

      if (!moduleId || Number.isNaN(moduleId)) {
        this.showSuccessToast.set(true);
        this.successMessage.set(
          '⚠️ يرجى اختيار الكورس'
        );

        setTimeout(() => {
          this.showSuccessToast.set(false);
        }, 3000);

        return;
      }

      trainerId = Number(this.selectedTrainerId() ?? 0);

      if (!trainerId || Number.isNaN(trainerId)) {
        this.showSuccessToast.set(true);
        this.successMessage.set(
          '⚠️ لم يتم تحديد المدرب المرتبط بهذا الكورس'
        );

        setTimeout(() => {
          this.showSuccessToast.set(false);
        }, 3000);

        return;
      }
    }

    // ============================================================
    // FINAL PROGRAM EVALUATION
    // ============================================================

    if (isProgram) {
      batchId = Number(this.batchId() ?? 0);

      if (!batchId || Number.isNaN(batchId)) {
        this.showSuccessToast.set(true);
        this.successMessage.set(
          '⚠️ لم يتم العثور على رقم الدفعة'
        );

        setTimeout(() => {
          this.showSuccessToast.set(false);
        }, 3000);

        return;
      }

      const availableModules = this.modules();

      if (availableModules.length > 0) {
        moduleId = Number(availableModules[0].moduleId);
      }

      if (!moduleId || Number.isNaN(moduleId)) {
        this.showSuccessToast.set(true);
        this.successMessage.set(
          '⚠️ لم يتم العثور على وحدة تدريبية مرتبطة بالبرنامج'
        );

        setTimeout(() => {
          this.showSuccessToast.set(false);
        }, 3000);

        return;
      }
    }

    // ============================================================
    // VALIDATE SCORES
    // ============================================================

    const comment = this.buildFeedbackComment();
    const scores = this.buildFeedbackScores();

    if (!scores.length) {
      this.showSuccessToast.set(true);
      this.successMessage.set(
        '⚠️ يرجى اختيار درجة التقييم'
      );

      setTimeout(() => {
        this.showSuccessToast.set(false);
      }, 3000);

      return;
    }

    // ============================================================
    // PREPARE PAYLOAD
    // ============================================================

    const feedbackData: any = {
      type: isTrainer ? 0 : 1,
      traineeId: traineeId,
      moduleId: moduleId,
      trainerId: isTrainer ? trainerId : null,
      batchId: isProgram ? batchId : null,

      // Weekly or Monthly for trainer evaluation
      evaluationPeriod: isTrainer
        ? this.evaluationPeriod()
        : null,

      comment: comment,
      scores: scores
    };

    console.log(
      '📤 Submitting Feedback:',
      feedbackData
    );

    // ============================================================
    // SEND REQUEST
    // ============================================================

    this.isSubmitting.set(true);

    this.api.submitFeedback(feedbackData).subscribe({
      next: (response: any) => {
        console.log(
          '✅ Feedback submitted successfully:',
          response
        );

        this.isSubmitting.set(false);
        this.showFeedback.set(false);

        // Reset evaluation form
        this.scores = {};
        this.criterionComments = {};
        this.selectedModuleId.set(null);
        this.selectedTrainerId.set(null);
        this.trainers.set([]);

        this.showSuccessToast.set(true);
        this.successMessage.set(
          'تم إرسال التقييم بنجاح!'
        );

        setTimeout(() => {
          this.showSuccessToast.set(false);
        }, 3000);

        // Refresh pending feedback
        const userId = this.userId();

        if (userId && moduleId > 0) {
          this.api
            .getFeedbackPending(moduleId, userId)
            .subscribe({
              next: (data) => {
                this.pendingFeedback.set(data ?? null);
              },
              error: (err: any) => {
                console.warn(
                  '⚠️ Failed to refresh feedback:',
                  err
                );
              }
            });
        }
      },

      error: (err: any) => {
        console.error(
          '❌ Feedback submission failed:',
          err
        );

        this.isSubmitting.set(false);

        let errorMessage =
          'حدث خطأ في إرسال التقييم، يرجى المحاولة مرة أخرى.';

        const serverError = err?.error;

        // Display backend validation messages
        if (
          typeof serverError?.message === 'string' &&
          serverError.message.trim()
        ) {
          errorMessage = serverError.message;
        } else if (
          typeof serverError?.title === 'string' &&
          serverError.title.trim()
        ) {
          errorMessage = serverError.title;
        } else if (
          typeof serverError === 'string' &&
          serverError.trim()
        ) {
          errorMessage = serverError;
        } else if (err?.status === 409) {
          errorMessage =
            'تم إرسال هذا التقييم مسبقًا خلال الفترة المحددة.';
        }

        this.showSuccessToast.set(true);
        this.successMessage.set(
          '⚠️ ' + errorMessage
        );

        setTimeout(() => {
          this.showSuccessToast.set(false);
        }, 4000);
      }
    });
  }


  // ============================================================
  // OFFICIAL CERTIFICATE - VIEW
  // ============================================================

  private showCertificateMessage(message: string): void {
    this.successMessage.set(message);
    this.showSuccessToast.set(true);

    setTimeout(() => {
      this.showSuccessToast.set(false);
    }, 4000);
  }

viewCertificate(): void {
  const certificate = this.issuedCertificate();

  if (!certificate) {
    this.showCertificateMessage(
      'الشهادة بانتظار إصدار الإدارة.'
    );
    return;
  }

  this.certificatePreviewOpen.set(true);
}

  closeCertificatePreview(): void {
    this.certificatePreviewOpen.set(false);
  }


  // ============================================================
  // OFFICIAL CERTIFICATE - DOWNLOAD
  // ============================================================



async downloadCertificate(): Promise<void> {
  const certificate = this.issuedCertificate();

  if (!certificate) {
    this.showCertificateMessage(
      'لا توجد شهادة صادرة لهذا التسجيل.'
    );
    return;
  }

  this.certificatePreviewOpen.set(true);

  const element = await this.waitForCertificateElement();

  if (!element) {
    this.showCertificateMessage(
      'تعذر العثور على قالب الشهادة.'
    );
    return;
  }

  const options = {
    margin: 0,
    filename: `Nafadh-Certificate-${certificate.certificateId}.pdf`,
    image: {
      type: 'jpeg' as const,
      quality: 0.98
    },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'landscape' as const
    }
  };

  try {
    await html2pdf()
      .set(options)
      .from(element)
      .save();
  } catch (error) {
    console.error(
      'Certificate PDF generation failed:',
      error
    );

    this.showCertificateMessage(
      'تعذر إنشاء ملف PDF للشهادة.'
    );
  }
}

private waitForCertificateElement(
  attempt = 0
): Promise<HTMLElement | null> {

  return new Promise(resolve => {
    const element = document.getElementById(
      this.certificatePrintId
    );

    if (element) {
      resolve(element);
      return;
    }

    if (attempt >= 20) {
      resolve(null);
      return;
    }

    setTimeout(async () => {
      resolve(
        await this.waitForCertificateElement(attempt + 1)
      );
    }, 100);
  });
}


  // ============================================================
  // OFFICIAL CERTIFICATE - PRINT / SAVE AS PDF
  // ============================================================

  printIssuedCertificate(): void {
    const certEl = document.getElementById(
      this.certificatePrintId
    );

    if (!certEl) {
      this.showCertificateMessage(
        'تعذر العثور على قالب الشهادة.'
      );
      return;
    }

    const frame = document.createElement('iframe');

    frame.style.cssText =
      'position:fixed;width:0;height:0;border:0;right:0;bottom:0';

    document.body.appendChild(frame);

    const doc = frame.contentDocument;

    if (!doc) {
      frame.remove();
      return;
    }

    const styles = Array.from(
      document.querySelectorAll(
        'style,link[rel="stylesheet"]'
      )
    )
      .map(element => element.outerHTML)
      .join('\n');

    doc.open();

    doc.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>شهادة نفاذ</title>

        ${styles}

        <style>
          @page {
            size: A4 landscape;
            margin: 6mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: white;
            direction: rtl;
            overflow: hidden;
          }

          .official-certificate-paper {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            break-inside: avoid;
          }

          .cert-outer-border {
            padding: 10px !important;
          }

          .cert-inner-gold-border {
            padding: 16px 24px !important;
          }

          .official-cert-header {
            padding-bottom: 10px !important;
          }

          .official-cert-body {
            padding: 10px 6px !important;
          }

          .cert-trainee-full-name {
            margin: 4px 0 8px !important;
            font-size: 24px !important;
          }

          .cert-completion-paragraph {
            margin: 0 auto 10px !important;
            line-height: 1.65 !important;
          }

          .cert-scores-strip {
            margin: 0 auto 10px !important;
          }

          .official-cert-footer {
            padding-top: 10px !important;
          }
        </style>
      </head>

      <body>
        ${certEl.outerHTML}
      </body>
      </html>
    `);

    doc.close();

    const printWindow = frame.contentWindow;

    if (!printWindow) {
      frame.remove();
      return;
    }

    const print = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } finally {
        setTimeout(() => {
          frame.remove();
        }, 3000);
      }
    };

    setTimeout(print, 650);
  }

}
