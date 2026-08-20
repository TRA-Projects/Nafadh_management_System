import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AnnouncementDto, BadgeDto, CertificateDto, ConversationDetailDto, ConversationListItemDto,
  ConversationMessageDto, DailyAttendanceDto, ExcuseDto, FeedbackCriterionDto, FeedbackPendingDto,
  LessonDto, ModuleDto, NotificationDto, ProjectDto, SubmissionDto, TaskDto,
  TraineeBadgeDto, TraineeDashboardSummaryDto, TraineeModuleProgressDto, TraineeProfileDto, WarningDto,
  EnrollmentDto, BatchDto, ProgramDto, TrainerDto, CompanySupervisorDto, ProgressSummaryDto
} from '../../../core/models/dtos';

@Injectable({ providedIn: 'root' })
export class TraineeApi {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  // =========================================================
  // Dashboard
  // =========================================================

  getDashboardSummary(id: number): Observable<TraineeDashboardSummaryDto> {
    return this.http.get<TraineeDashboardSummaryDto>(`${this.base}/Trainee/${id}/dashboard-summary`);
  }

  getPlatformAnnouncements(): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(`${this.base}/Announcement/scope/Platform`);
  }

  getCompanyAnnouncements(companyId: number): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(`${this.base}/Announcement/scope/Company/${companyId}`);
  }

  getBatchAnnouncements(batchId: number): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(`${this.base}/Announcement/scope/Batch/${batchId}`);
  }

  // =========================================================
// Tasks - جلب المهام الخاصة بالمتدرّب
// =========================================================

// جلب مهام المتدرّب المخصصة له فقط
getTraineeTasks(traineeId: number): Observable<TaskDto[]> {
  return this.http.get<TaskDto[]>(`${this.base}/Task/trainee/${traineeId}`);
}

// جلب حالة مهمة معينة للمتدرّب
getTaskStatus(taskId: number, traineeId: number): Observable<any> {
  return this.http.get<any>(`${this.base}/Task/${taskId}/status/${traineeId}`);
}

// جلب تسليمات المتدرّب للمهام
getTraineeSubmissions(traineeId: number): Observable<SubmissionDto[]> {
  return this.http.get<SubmissionDto[]>(`${this.base}/Submission/trainee/${traineeId}`);
}
  // =========================================================
  // Profile
  // =========================================================

  getTrainee(id: number): Observable<TraineeProfileDto> {
    return this.http.get<TraineeProfileDto>(`${this.base}/Trainee/traineeByUserID/${id}`);
  }

  updateTrainee(id: number, dto: unknown) { 
    return this.http.put(`${this.base}/Trainee/traineeByUserID/${id}`, dto); 
  }

  // =========================================================
  // Enrollment
  // =========================================================

  getEnrollmentsByTrainee(traineeId: number): Observable<EnrollmentDto[]> {
    return this.http.get<EnrollmentDto[]>(`${this.base}/Enrollment/trainee/${traineeId}`);
  }

  // =========================================================
  // Batch
  // =========================================================

  getBatch(id: number): Observable<BatchDto> {
    return this.http.get<BatchDto>(`${this.base}/Batch/${id}`);
  }

  // =========================================================
  // BatchTrainer - جلب مدرب الدفعة
  // GET /api/BatchTrainer/batch/{batchId}
  // =========================================================

  getBatchTrainers(batchId: number): Observable<TrainerDto[]> {
    return this.http.get<TrainerDto[]>(`${this.base}/BatchTrainer/batch/${batchId}`);
  }

  // =========================================================
  // Trainer - جلب بيانات مدرب معين
  // GET /api/Trainer/{id}
  // =========================================================

  getTrainer(id: number): Observable<TrainerDto> {
    return this.http.get<TrainerDto>(`${this.base}/Trainer/${id}`);
  }

  // =========================================================
  // CompanySupervisor - جلب بيانات المشرف
  // GET /api/CompanySupervisor/{id}
  // =========================================================

  getCompanySupervisor(id: number): Observable<CompanySupervisorDto> {
    return this.http.get<CompanySupervisorDto>(`${this.base}/CompanySupervisor/${id}`);
  }

  // =========================================================
  // Program
  // =========================================================

  getProgram(id: number): Observable<ProgramDto> {
    return this.http.get<ProgramDto>(`${this.base}/Program/${id}`);
  }

  getProgramModules(programId: number): Observable<ModuleDto[]> {
    return this.http.get<ModuleDto[]>(`${this.base}/Program/${programId}/modules`);
  }

  getModuleLessons(moduleId: number): Observable<LessonDto[]> {
    return this.http.get<LessonDto[]>(`${this.base}/Module/${moduleId}/lessons`);
  }

  getTraineeProgramProgress(traineeId: number, programId: number): Observable<any> {
    return this.http.get<any>(`${this.base}/Trainee/${traineeId}/program/${programId}/progress`);
  }

  markAchievement(traineeId: number, programId: number): Observable<any> {
    return this.http.post(`${this.base}/Trainee/${traineeId}/program/${programId}/achievement`, {});
  }

  // =========================================================
  // Program Modules
  // =========================================================

  getModulesByProgram(programId: number): Observable<ModuleDto[]> {
    return this.http.get<ModuleDto[]>(`${this.base}/Module/program/${programId}`);
  }

  getLessons(moduleId: number): Observable<LessonDto[]> {
    return this.http.get<LessonDto[]>(`${this.base}/Module/${moduleId}/lessons`);
  }

  checkPrerequisite(moduleId: number, traineeId: number) {
    return this.http.get<boolean>(`${this.base}/Module/${moduleId}/check-prerequisite/${traineeId}`);
  }

  getModuleProgress(traineeId: number): Observable<TraineeModuleProgressDto[]> {
    return this.http.get<TraineeModuleProgressDto[]>(`${this.base}/TraineeModuleProgress/trainee/${traineeId}`);
  }

  getModuleProgressPercentage(traineeId: number): Observable<number> {
    return this.http.get<number>(`${this.base}/TraineeModuleProgress/trainee/${traineeId}/percentage`);
  }

  // =========================================================
  // Enrollment Progress
  // =========================================================

  getEnrollmentProgress(enrollmentId: number): Observable<ProgressSummaryDto> {
    return this.http.get<ProgressSummaryDto>(`${this.base}/Enrollment/${enrollmentId}/progress-summary`);
  }

  // =========================================================
  // Tasks & Projects
  // =========================================================

  getTasks(batchId: number): Observable<TaskDto[]> {
    return this.http.get<TaskDto[]>(`${this.base}/Task/batch/${batchId}`);
  }

  submitAssignment(dto: unknown) { 
    return this.http.post(`${this.base}/Submission`, dto); 
  }

  getSubmissions(traineeId: number): Observable<SubmissionDto[]> {
    return this.http.get<SubmissionDto[]>(`${this.base}/Submission/trainee/${traineeId}`);
  }

  getProjectsByProgram(programId: number): Observable<ProjectDto[]> {
    return this.http.get<ProjectDto[]>(`${this.base}/Project/program/${programId}`);
  }

  // =========================================================
  // Attendance
  // =========================================================
/**
 * جلب سجل الحضور لمتدرب معين حسب enrollmentId
 */
getAttendance(enrollmentId: number): Observable<DailyAttendanceDto[]> {
  return this.http.get<DailyAttendanceDto[]>(`${this.base}/DailyAttendance/enrollment/${enrollmentId}`);
}

/**
 * جلب نسبة الالتزام لمتدرب معين
 */
getComplianceRate(enrollmentId: number): Observable<number> {
  return this.http.get<number>(`${this.base}/DailyAttendance/enrollment/${enrollmentId}/compliance-rate`);
}

/**
 * إرسال عذر جديد - يستقبل JSON
 */
submitExcuse(dto: { dailyAttendanceId: number; reason: string }): Observable<ExcuseDto> {
  return this.http.post<ExcuseDto>(`${this.base}/Excuse`, dto);
}

/**
 * جلب العذر حسب attendanceId
 */
getExcuse(attendanceId: number): Observable<ExcuseDto> {
  return this.http.get<ExcuseDto>(`${this.base}/Excuse/attendance/${attendanceId}`);
}
  // =========================================================
  // Notifications & warnings
  // =========================================================

  getNotifications(userId: number): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(`${this.base}/Notification/user/${userId}`);
  }

  markRead(id: number) { 
    return this.http.put(`${this.base}/Notification/${id}/read`, {}); 
  }

  getMyWarnings(enrollmentId: number): Observable<WarningDto[]> {
    return this.http.get<WarningDto[]>(`${this.base}/Warning`, { params: { scope: 'Trainee', enrollmentId } });
  }

  // =========================================================
  // Support (threaded complaint conversation)
  // =========================================================

  getConversations(userId: number): Observable<ConversationListItemDto[]> {
    return this.http.get<ConversationListItemDto[]>(`${this.base}/Conversation`, { 
      params: { type: 'TraineeComplaint', participantUserId: userId } 
    });
  }

  startConversation(dto: unknown): Observable<ConversationDetailDto> {
    return this.http.post<ConversationDetailDto>(`${this.base}/Conversation`, dto);
  }

  getConversation(id: number): Observable<ConversationDetailDto> {
    return this.http.get<ConversationDetailDto>(`${this.base}/Conversation/${id}`);
  }

  sendMessage(id: number, dto: unknown): Observable<ConversationMessageDto> {
    return this.http.post<ConversationMessageDto>(`${this.base}/Conversation/${id}/messages`, dto);
  }

  // =========================================================
  // Achievements & Certificates
  // =========================================================

  getMyBadges(traineeId: number): Observable<TraineeBadgeDto[]> {
    return this.http.get<TraineeBadgeDto[]>(`${this.base}/TraineeBadge/trainee/${traineeId}`);
  }

  getAllBadges(): Observable<BadgeDto[]> { 
    return this.http.get<BadgeDto[]>(`${this.base}/Badge`); 
  }

  getCertificates(traineeId: number): Observable<CertificateDto[]> {
    return this.http.get<CertificateDto[]>(`${this.base}/Certificate/trainee/${traineeId}`);
  }

  // =========================================================
  // Feedback at module completion
  // =========================================================

  getFeedbackPending(moduleId: number, traineeId: number): Observable<FeedbackPendingDto> {
    return this.http.get<FeedbackPendingDto>(`${this.base}/Feedback/module/${moduleId}/trainee/${traineeId}/pending`);
  }

  getFeedbackCriteria(appliesTo: string): Observable<FeedbackCriterionDto[]> {
    return this.http.get<FeedbackCriterionDto[]>(`${this.base}/Feedback/criteria`, { params: { appliesTo } });
  }

  submitFeedback(dto: unknown) { 
    return this.http.post(`${this.base}/Feedback`, dto); 
  }
}