import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

import {
  AnnouncementDto,
  BadgeDto,
  CertificateDto,
  ConversationDetailDto,
  ConversationListItemDto,
  ConversationMessageDto,
  DailyAttendanceDto,
  ExcuseDto,
  FeedbackCriterionDto,
  FeedbackPendingDto,
  LessonDto,
  ModuleDto,
  NotificationDto,
  ProjectDto,
  SubmissionDto,
  TaskDto,
  TraineeBadgeDto,
  TraineeDashboardSummaryDto,
  TraineeModuleProgressDto,
  TraineeProfileDto,
  WarningDto,
  EnrollmentDto,
  BatchDto,
  TrainingMaterialDto,
  SessionDto,
  ProgramDto,
  ProjectMemberDto,
  TrainerDto,
  CompanySupervisorDto,
  ProgressSummaryDto,
  LessonFeedbackDto,
  LessonFeedbackCreateDto,
  LessonFeedbackUpdateDto,
  TraineeSkillDto,
  TraineeQuizzesOverviewDto,
  TraineeQuizListItemDto,
  QuizAttemptDto,
  StartQuizAttemptDto,
  WithdrawalRequestDto,
  CreateWithdrawalRequestDto
} from '../../../core/models/dtos';

// Trainer information returned by BatchTrainer API

export interface TrainerInBatchDto extends TrainerDto {
  trainerName: string;
}

export interface OfficialCertificateDetailsDto {
  enrollmentId: number;
  traineeId: number;
  batchId: number;
  batchName: string;
  traineeName: string;
  startDate: string;
  endDate: string;
  certificateId: number;
  issueDate: string;
  grade: number | null;
  gradeLabel: string | null;
  hasGrade: boolean;
  isIssued: boolean;
  totalHours: number | null;
techHours: number | null;
practicalHours: number | null;
companyId?: number | null;
companyName?: string | null;
verificationUrl?: string | null;
}



@Injectable({
  providedIn: 'root'
})
export class TraineeApi {

  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // =========================================================
  // Dashboard
  // =========================================================

  getDashboardSummary(
    id: number
  ): Observable<TraineeDashboardSummaryDto> {
    return this.http.get<TraineeDashboardSummaryDto>(
      `${this.base}/Trainee/${id}/dashboard-summary`
    );
  }

  getPlatformAnnouncements(): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(
      `${this.base}/Announcement/scope/Platform`
    );
  }

  getCompanyAnnouncements(
    companyId: number
  ): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(
      `${this.base}/Announcement/scope/Company/${companyId}`
    );
  }

  getBatchAnnouncements(
    batchId: number
  ): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(
      `${this.base}/Announcement/scope/Batch/${batchId}`
    );
  }

  // =========================================================
  // Tasks
  // =========================================================

  getTraineeTasks(
    traineeId: number
  ): Observable<TaskDto[]> {
    return this.http.get<TaskDto[]>(
      `${this.base}/Task/trainee/${traineeId}`
    );
  }

  getTaskStatus(
    taskId: number,
    traineeId: number
  ): Observable<any> {
    return this.http.get<any>(
      `${this.base}/Task/${taskId}/status/${traineeId}`
    );
  }

  getTraineeSubmissions(
    traineeId: number
  ): Observable<SubmissionDto[]> {
    return this.http.get<SubmissionDto[]>(
      `${this.base}/Submission/trainee/${traineeId}`
    );
  }

  // =========================================================
  // Attendance Rate
  // =========================================================

  getAttendanceRateByUserId(
    userId: number
  ): Observable<number> {
    return this.http.get<number>(
      `${this.base}/DailyAttendance/user/${userId}/compliance-rate`
    );
  }

  // =========================================================
  // Warnings
  // =========================================================

  getUserWarnings(
    userId: number
  ): Observable<WarningDto[]> {
    return this.http.get<WarningDto[]>(
      `${this.base}/Warning/user/${userId}`
    );
  }

  getUserWarningsCount(
    userId: number
  ): Observable<number> {
    return this.http.get<number>(
      `${this.base}/Warning/user/${userId}/count`
    );
  }

  // =========================================================
  // Profile
  // =========================================================

  getTrainee(
    id: number
  ): Observable<TraineeProfileDto> {
    return this.http.get<TraineeProfileDto>(
      `${this.base}/Trainee/traineeByUserID/${id}`
    );
  }

  updateTrainee(
    id: number,
    dto: Partial<TraineeProfileDto>
  ) {
    return this.http.put(
      `${this.base}/Trainee/traineeByUserID/${id}`,
      dto
    );
  }

  getTraineeSkills(
    traineeId: number
  ): Observable<TraineeSkillDto[]> {
    return this.http.get<TraineeSkillDto[]>(
      `${this.base}/TraineeSkill/trainee/${traineeId}`
    );
  }

  addTraineeSkill(
    traineeId: number,
    skillName: string,
    serialNumber: string,
    certificateFile: File | null
  ): Observable<TraineeSkillDto> {
    const formData = new FormData();

    formData.append('TraineeId', traineeId.toString());
    formData.append('SkillName', skillName);

    if (serialNumber.trim()) {
      formData.append('SerialNumber', serialNumber);
    }

    if (certificateFile) {
      formData.append(
        'CertificateFile',
        certificateFile,
        certificateFile.name
      );
    }

    return this.http.post<TraineeSkillDto>(
      `${this.base}/TraineeSkill`,
      formData
    );
  }

  deleteTraineeSkill(
    traineeSkillId: number
  ): Observable<any> {
    return this.http.delete(
      `${this.base}/TraineeSkill/${traineeSkillId}`
    );
  }

  uploadTraineeResume(
    traineeId: number,
    file: File
  ): Observable<{ resumeUrl: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<{ resumeUrl: string }>(
      `${this.base}/Trainee/${traineeId}/resume`,
      formData
    );
    
  }
downloadTraineeResume(resumeUrl: string): Observable<Blob> {
  const url = this.getFileUrl(resumeUrl);

  return this.http.get(url, {
    responseType: 'blob'
  });
}
  // =========================================================
  // Enrollment
  // =========================================================

  getEnrollmentsByTrainee(
    traineeId: number
  ): Observable<EnrollmentDto[]> {
    return this.http.get<EnrollmentDto[]>(
      `${this.base}/Enrollment/trainee/${traineeId}`
    );
  }

  // =========================================================
  // Batch
  // =========================================================

  getBatch(
    id: number
  ): Observable<BatchDto> {
    return this.http.get<BatchDto>(
      `${this.base}/Batch/${id}`
    );
  }

  // =========================================================
  // BatchTrainer - UPDATED
  // =========================================================

  getBatchTrainers(
    batchId: number
  ): Observable<TrainerInBatchDto[]> {
    return this.http.get<TrainerInBatchDto[]>(
      `${this.base}/BatchTrainer/batch/${batchId}`
    );
  }

  // =========================================================
  // Trainer
  // =========================================================

  getTrainer(
    id: number
  ): Observable<TrainerDto> {
    return this.http.get<TrainerDto>(
      `${this.base}/Trainer/${id}`
    );
  }

  // =========================================================
  // Company Supervisor
  // =========================================================

  getCompanySupervisor(
    id: number
  ): Observable<CompanySupervisorDto> {
    return this.http.get<CompanySupervisorDto>(
      `${this.base}/CompanySupervisor/${id}`
    );
  }

  getCompanySupervisorByUserId(
    userId: number
  ): Observable<CompanySupervisorDto> {
    return this.http.get<CompanySupervisorDto>(
      `${this.base}/CompanySupervisor/user/${userId}`
    );
  }

  // =========================================================
  // Program
  // =========================================================

  getProgram(
    id: number
  ): Observable<ProgramDto> {
    return this.http.get<ProgramDto>(
      `${this.base}/Program/${id}`
    );
  }

  getProgramModules(
    programId: number
  ): Observable<ModuleDto[]> {
    return this.http.get<ModuleDto[]>(
      `${this.base}/Program/${programId}/modules`
    );
  }

  getModuleLessons(
    moduleId: number
  ): Observable<LessonDto[]> {
    return this.http.get<LessonDto[]>(
      `${this.base}/Lesson/module/${moduleId}`
    );
  }

  getTraineeProgramProgress(
    traineeId: number,
    programId: number
  ): Observable<any> {
    return this.http.get<any>(
      `${this.base}/Trainee/${traineeId}/program/${programId}/progress`
    );
  }

  markAchievement(
    traineeId: number,
    programId: number
  ): Observable<any> {
    return this.http.post(
      `${this.base}/Trainee/${traineeId}/program/${programId}/achievement`,
      {}
    );
  }

  // =========================================================
  // Training Materials
  // =========================================================

  getTrainingMaterials(
    lessonId: number
  ): Observable<TrainingMaterialDto[]> {
    return this.http.get<TrainingMaterialDto[]>(
      `${this.base}/TrainingMaterial/lesson/${lessonId}`
    );
  }

   getTrainingMaterialDownloadUrl(
    materialId: number
  ): Observable<{
    DownloadUrl?: string;
    downloadUrl?: string;
  }> {
    return this.http.get<{
      DownloadUrl?: string;
      downloadUrl?: string;
    }>(
      `${this.base}/TrainingMaterial/${materialId}/download`
    );
  }

 getFileUrl(fileUrl: string): string {
    if (!fileUrl || !fileUrl.trim()) {
      return '';
    }

    const url = fileUrl.trim();

    // Absolute URLs
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    // Protocol-relative URLs
    if (url.startsWith('//')) {
      return `${window.location.protocol}${url}`;
    }

    // API root, e.g. https://localhost:7082
    const apiRoot = this.base
      .replace(/\/api\/?$/i, '')
      .replace(/\/$/, '');

    // Normalize relative file paths
    const normalizedPath = url.startsWith('/')
      ? url
      : `/${url}`;

    return `${apiRoot}${normalizedPath}`;
  }

  // =========================================================
  // Sessions
  // =========================================================

  getSessionsByBatch(
    batchId: number
  ): Observable<SessionDto[]> {
    return this.http.get<SessionDto[]>(
      `${this.base}/Session?batchId=${batchId}`
    );
  }

  getSession(
    sessionId: number
  ): Observable<SessionDto> {
    return this.http.get<SessionDto>(
      `${this.base}/Session/${sessionId}`
    );
  }

  // =========================================================
  // Trainee Live Room
  // =========================================================

  joinTraineeLiveRoom(
    sessionId: number
  ): Observable<{
    sessionId: number;
    roomName: string;
    serverUrl: string;
    participantToken: string;
    tokenExpiresAtUtc: string;
  }> {
    return this.http.post<{
      sessionId: number;
      roomName: string;
      serverUrl: string;
      participantToken: string;
      tokenExpiresAtUtc: string;
    }>(
      `${this.base}/trainee/live-sessions/${sessionId}/room/join`,
      {}
    );
  }

  // =========================================================
  // Lesson Feedback
  // =========================================================

  getLessonFeedback(
    lessonId: number
  ): Observable<LessonFeedbackDto> {
    return this.http.get<LessonFeedbackDto>(
      `${this.base}/LessonFeedback/lesson/${lessonId}`
    );
  }

  createLessonFeedback(
    lessonId: number,
    dto: LessonFeedbackCreateDto
  ): Observable<LessonFeedbackDto> {
    return this.http.post<LessonFeedbackDto>(
      `${this.base}/LessonFeedback/lesson/${lessonId}`,
      dto
    );
  }

  updateLessonFeedback(
    lessonId: number,
    dto: LessonFeedbackUpdateDto
  ): Observable<LessonFeedbackDto> {
    return this.http.put<LessonFeedbackDto>(
      `${this.base}/LessonFeedback/lesson/${lessonId}`,
      dto
    );
  }

  // =========================================================
  // Program Modules
  // =========================================================

  getModulesByProgram(
    programId: number
  ): Observable<ModuleDto[]> {
    return this.http.get<ModuleDto[]>(
      `${this.base}/Module/program/${programId}`
    );
  }

  
  getLessons(
    moduleId: number
  ): Observable<LessonDto[]> {
    return this.getModuleLessons(moduleId);
  }


  checkPrerequisite(
    moduleId: number,
    traineeId: number
  ) {
    return this.http.get<boolean>(
      `${this.base}/Module/${moduleId}/check-prerequisite/${traineeId}`
    );
  }

  getModuleProgress(
    traineeId: number
  ): Observable<TraineeModuleProgressDto[]> {
    return this.http.get<TraineeModuleProgressDto[]>(
      `${this.base}/TraineeModuleProgress/trainee/${traineeId}`
    );
  }
getSystemVariables(): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.base}/system-variables`
  );
}
  getModuleProgressPercentage(
    traineeId: number
  ): Observable<number> {
    return this.http.get<number>(
      `${this.base}/TraineeModuleProgress/trainee/${traineeId}/percentage`
    );
  }

  // =========================================================
  // Enrollment Progress
  // =========================================================

  getEnrollmentProgress(
    enrollmentId: number
  ): Observable<ProgressSummaryDto> {
    return this.http.get<ProgressSummaryDto>(
      `${this.base}/Enrollment/${enrollmentId}/progress-summary`
    );
  }

  // =========================================================
  // Tasks & Projects
  // =========================================================

  getTasks(
    batchId: number
  ): Observable<TaskDto[]> {
    return this.http.get<TaskDto[]>(
      `${this.base}/Task/batch/${batchId}`
    );
  }

  submitAssignment(dto: unknown) {
    return this.http.post(
      `${this.base}/Submission`,
      dto
    );
  }

  getSubmissions(
    traineeId: number
  ): Observable<SubmissionDto[]> {
    return this.http.get<SubmissionDto[]>(
      `${this.base}/Submission/trainee/${traineeId}`
    );
  }

  getProjectsByProgram(
    programId: number
  ): Observable<ProjectDto[]> {
    return this.http.get<ProjectDto[]>(
      `${this.base}/Project/program/${programId}`
    );
  }
  // Get project team members (read-only)
getProjectMembers(
  projectId: number
): Observable<ProjectMemberDto[]> {
  return this.http.get<ProjectMemberDto[]>(
    `${this.base}/ProjectMember/project/${projectId}`
  );
}

  // =========================================================
  // Attendance
  // =========================================================

  getAttendance(
    enrollmentId: number
  ): Observable<DailyAttendanceDto[]> {
    return this.http.get<DailyAttendanceDto[]>(
      `${this.base}/DailyAttendance/enrollment/${enrollmentId}`
    );
  }

  getComplianceRate(
    enrollmentId: number
  ): Observable<number> {
    return this.http.get<number>(
      `${this.base}/DailyAttendance/enrollment/${enrollmentId}/compliance-rate`
    );
  }

  // =========================================================
  // Excuses
  // =========================================================

  submitExcuse(
    dto: {
      dailyAttendanceId: number;
      reason: string;
      file?: File | null;
    }
  ): Observable<ExcuseDto> {
    const formData = new FormData();

    formData.append(
      'DailyAttendanceId',
      dto.dailyAttendanceId.toString()
    );

    formData.append('Reason', dto.reason);

    if (dto.file) {
      formData.append('File', dto.file);
    }

    return this.http.post<ExcuseDto>(
      `${this.base}/Excuse`,
      formData
    );
  }

  getExcuse(
    attendanceId: number
  ): Observable<ExcuseDto> {
    return this.http.get<ExcuseDto>(
      `${this.base}/Excuse/attendance/${attendanceId}`
    );
  }

  // =========================================================
  // Notifications & Warnings
  // =========================================================

  getNotifications(
    userId: number
  ): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(
      `${this.base}/Notification/user/${userId}`
    );
  }

  markRead(id: number) {
    return this.http.put(
      `${this.base}/Notification/${id}/read`,
      {}
    );
  }

  getMyWarnings(
    userId: number
  ): Observable<WarningDto[]> {
    return this.http.get<WarningDto[]>(
      `${this.base}/Warning`,
      {
        params: {
          scope: 'Trainee',
          userId: userId.toString()
        }
      }
    );
  }

  // =========================================================
  // Support
  // =========================================================

  getConversations(
    userId: number
  ): Observable<ConversationListItemDto[]> {
    return this.http.get<ConversationListItemDto[]>(
      `${this.base}/Conversation`,
      {
        params: {
          type: 'TraineeComplaint',
          participantUserId: userId
        }
      }
    );
  }

  startConversation(
    dto: {
      type: string;
      category?: string | null;
      subject: string;
      startedByUserId: number;
      firstMessage: string;
      attachment?: File | null;
    }
  ): Observable<ConversationDetailDto> {
    const formData = new FormData();

    formData.append('Type', dto.type);

    if (dto.category) {
      formData.append('Category', dto.category);
    }

    formData.append('Subject', dto.subject);
    formData.append(
      'StartedByUserId',
      dto.startedByUserId.toString()
    );
    formData.append('FirstMessage', dto.firstMessage);

    if (dto.attachment) {
      formData.append(
        'Attachment',
        dto.attachment,
        dto.attachment.name
      );
    }

    return this.http.post<ConversationDetailDto>(
      `${this.base}/Conversation`,
      formData
    );
  }

  getConversation(
    id: number
  ): Observable<ConversationDetailDto> {
    return this.http.get<ConversationDetailDto>(
      `${this.base}/Conversation/${id}`
    );
  }

  sendMessage(
    id: number,
    dto: unknown
  ): Observable<ConversationMessageDto> {
    return this.http.post<ConversationMessageDto>(
      `${this.base}/Conversation/${id}/messages`,
      dto
    );
  }

  getOrCreatePrivateConversation(
    dto: {
      startedByUserId: number;
      receiverUserId: number;
      subject: string;
      firstMessage: string;
      category?: string;
    }
  ): Observable<ConversationDetailDto> {
    const formData = new FormData();

    formData.append('Type', 'Other');
    formData.append(
      'Category',
      dto.category ?? 'TrainerTrainee'
    );
    formData.append('Subject', dto.subject);
    formData.append(
      'StartedByUserId',
      dto.startedByUserId.toString()
    );
    formData.append('FirstMessage', dto.firstMessage);
    formData.append(
      'ReceiverUserId',
      dto.receiverUserId.toString()
    );

    return this.http.post<ConversationDetailDto>(
      `${this.base}/Conversation`,
      formData
    );
  }

  // =========================================================
  // Achievements & Certificates
  // =========================================================

  getMyBadges(
    traineeId: number
  ): Observable<TraineeBadgeDto[]> {
    return this.http.get<TraineeBadgeDto[]>(
      `${this.base}/TraineeBadge/trainee/${traineeId}`
    );
  }

  getAllBadges(): Observable<BadgeDto[]> {
    return this.http.get<BadgeDto[]>(
      `${this.base}/Badge`
    );
  }

 getCertificates(
  traineeId: number
): Observable<CertificateDto[]> {
  return this.http.get<CertificateDto[]>(
    `${this.base}/Certificate/trainee/${traineeId}`
  );
}

// =========================================================
// Official Certificate Details - Trainee Portal
// =========================================================

getOfficialCertificateDetails(
  enrollmentId: number
): Observable<OfficialCertificateDetailsDto> {
  return this.http.get<OfficialCertificateDetailsDto>(
    `${this.base}/Certificate/enrollment/${enrollmentId}/official-details`
  );
}

  downloadCertificate(
    certificateId: number
  ): Observable<Blob> {
    return this.http.get(
      `${this.base}/Certificate/${certificateId}/download`,
      {
        responseType: 'blob'
      }
    );
  }

  getModuleProgressByTrainee(
    traineeId: number
  ): Observable<TraineeModuleProgressDto[]> {
    return this.http.get<TraineeModuleProgressDto[]>(
      `${this.base}/TraineeModuleProgress/trainee/${traineeId}`
    );
  }

  getEnrollment(
    enrollmentId: number
  ): Observable<EnrollmentDto> {
    return this.http.get<EnrollmentDto>(
      `${this.base}/Enrollment/${enrollmentId}`
    );
  }
downloadIssuedCertificate(
  certificateId: number
): Observable<Blob> {
  return this.http.get(
    `${this.base}/Certificate/${certificateId}/download`,
    { responseType: 'blob' }
  );
}
  // =========================================================
  // Feedback at Module Completion
  // =========================================================

  getFeedbackPending(
    moduleId: number,
    traineeId: number
  ): Observable<FeedbackPendingDto> {
    return this.http.get<FeedbackPendingDto>(
      `${this.base}/Feedback/module/${moduleId}/trainee/${traineeId}/pending`
    );
  }

  getFeedbackCriteria(
    appliesTo: string
  ): Observable<FeedbackCriterionDto[]> {
    return this.http.get<FeedbackCriterionDto[]>(
      `${this.base}/Feedback/criteria`,
      {
        params: {
          appliesTo
        }
      }
    );
  }

  submitFeedback(dto: unknown): Observable<any> {
    return this.http.post(
      `${this.base}/Feedback`,
      dto
    );
  }

  // =========================================================
  // Announcements
  // =========================================================

  getUserAnnouncements(
    userId: number
  ): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(
      `${this.base}/Announcement/user/${userId}`
    );
  }

  // =========================================================
  // Notifications
  // =========================================================

  getUserNotifications(
    userId: number
  ): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(
      `${this.base}/Notification/user/${userId}`
    );
  }

  getUnreadNotificationsCount(
    userId: number
  ): Observable<number> {
    return this.http.get<number>(
      `${this.base}/Notification/user/${userId}/unread-count`
    );
  }

  markNotificationAsRead(
    notificationId: number
  ): Observable<void> {
    return this.http.put<void>(
      `${this.base}/Notification/${notificationId}/read`,
      {}
    );
  }

  markAllNotificationsAsRead(
    userId: number
  ): Observable<void> {
    return this.http.put<void>(
      `${this.base}/Notification/user/${userId}/read-all`,
      {}
    );
  }

  uploadTraineeProfileImage(
    traineeId: number,
    file: File
  ): Observable<any> {
    const formData = new FormData();
    formData.append('File', file);

    return this.http.post<any>(
      `${this.base}/Trainee/${traineeId}/profile-image`,
      formData
    );
  }

  // =========================================================
  // Withdrawal Requests
  // =========================================================

  createWithdrawalRequest(
    dto: CreateWithdrawalRequestDto
  ): Observable<{ message: string; requestId: number }> {
    return this.http.post<{
      message: string;
      requestId: number;
    }>(
      `${this.base}/WithdrawalRequests`,
      dto
    );
  }

  getTraineeWithdrawalRequests(
    traineeId: number
  ): Observable<WithdrawalRequestDto[]> {
    return this.http.get<WithdrawalRequestDto[]>(
      `${this.base}/WithdrawalRequests/trainee/${traineeId}`,
      {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }
    );
  }

  // =========================================================
  // Batch Group
  // =========================================================

  getAllParticipantConversations(
    userId: number
  ): Observable<ConversationListItemDto[]> {
    return this.http.get<ConversationListItemDto[]>(
      `${this.base}/Conversation`,
      {
        params: {
          participantUserId: userId.toString()
        }
      }
    );
  }

  getBatchTrainees(
    batchId: number
  ): Observable<TraineeProfileDto[]> {
    return this.http.get<TraineeProfileDto[]>(
      `${this.base}/Batch/${batchId}/trainees`
    );
  }

  markConversationAsRead(
    conversationId: number,
    userId: number
  ): Observable<void> {
    return this.http.put<void>(
      `${this.base}/Conversation/${conversationId}/read`,
      {},
      {
        params: {
          userId: userId.toString()
        }
      }
    );
  }

  // =========================================================
  // Quizzes
  // =========================================================

  getTraineeQuizzesOverview(
    traineeId: number
  ): Observable<TraineeQuizzesOverviewDto> {
    return this.http.get<TraineeQuizzesOverviewDto>(
      `${this.base}/quiz-attempts/trainee/${traineeId}/quizzes`
    );
  }

  startQuizAttempt(
    dto: StartQuizAttemptDto
  ): Observable<QuizAttemptDto> {
    return this.http.post<QuizAttemptDto>(
      `${this.base}/quiz-attempts/start`,
      dto
    );
  }

  // =========================================================
  // Quiz Attempt
  // =========================================================

  getQuizAttempt(
    attemptId: number,
    traineeId: number
  ): Observable<QuizAttemptDto> {
    return this.http.get<QuizAttemptDto>(
      `${this.base}/quiz-attempts/${attemptId}?traineeId=${traineeId}`
    );
  }

  saveQuizAnswer(
    attemptId: number,
    dto: any
  ): Observable<any> {
    return this.http.post<any>(
      `${this.base}/quiz-attempts/${attemptId}/answers`,
      dto
    );
  }

  submitQuizAttempt(dto: any): Observable<any> {
    return this.http.post<any>(
      `${this.base}/quiz-attempts/submit`,
      dto
    );
  }

  // =========================================================
  // Quiz Results & Details
  // =========================================================

  getAttemptDetails(
    attemptId: number
  ): Observable<any> {
    return this.http.get<any>(
      `${this.base}/quiz-attempts/${attemptId}/details`
    );
  }

  getMyResults(
    traineeId: number
  ): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.base}/quiz-results/trainee/${traineeId}`
    );
  }

  registerViolation(
    attemptId: number
  ): Observable<any> {
    return this.http.post<any>(
      `${this.base}/quiz-attempts/${attemptId}/violation`,
      {}
    );
  }

  sendProctoringEvent(
    attemptId: number,
    data: FormData
  ): Observable<any> {
    return this.http.post<any>(
      `${this.base}/quiz-attempts/${attemptId}/proctoring`,
      data
    );
  }

  // =========================================================
  // Quiz File Upload (Added for File Upload Question Type)
  // =========================================================

    uploadAnswerFile(
    attemptId: number,
    formData: FormData
  ): Observable<{
    fileId: number;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    uploadedAt?: string;
  }> {
    return this.http.post<{
      fileId: number;
      fileUrl: string;
      fileName: string;
      fileSize: number;
      uploadedAt?: string;
    }>(
      `${this.base}/quiz-attempts/${attemptId}/answers/file`, // <--- المسار الصحيح
      formData
    );
  }

  deleteAnswerFile(
    attemptId: number,
    questionId: number,
    fileId: number
  ): Observable<any> {
    return this.http.delete<any>(
      `${this.base}/quiz-attempts/${attemptId}/questions/${questionId}/files/${fileId}`
    );
  }

  // =========================================================
  // Overall Evaluation
  // =========================================================

  getOverallEvaluation(
    enrollmentId: number
  ): Observable<any> {
    return this.http.get<any>(
      `${this.base}/TraineeEvaluations/${enrollmentId}/overall-evaluation`
    );
  }

}