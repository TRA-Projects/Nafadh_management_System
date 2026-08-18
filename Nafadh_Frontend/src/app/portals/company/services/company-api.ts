import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AnnouncementDto, CompanyBranchDto, CompanyCapacityDto, CompanyDto, CompanySupervisorDto,
  ConversationDetailDto, ConversationListItemDto, ConversationMessageDto, EnrollmentDto, EvaluationDto,
  FeedbackSummaryDto, TrainerKpisDto, WarningDto, AttendanceReportDto, ChartPointDto,
  TraineeListItemDto, ProgramDto, ProgressSummaryDto,
} from '../../../core/models/dtos';

@Injectable({ providedIn: 'root' })
export class CompanyApi {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  // Dashboard
  getCapacity(companyId: number): Observable<CompanyCapacityDto> {
    return this.http.get<CompanyCapacityDto>(`${this.base}/Company/${companyId}/capacity`);
  }
  getAttendanceChart(companyId: number): Observable<{ weeks: ChartPointDto[] }> {
    return this.http.get<{ weeks: ChartPointDto[] }>(`${this.base}/Report/company-attendance-chart/${companyId}`);
  }
  getProgramDistribution(companyId: number): Observable<ChartPointDto[]> {
    return this.http.get<ChartPointDto[]>(`${this.base}/Report/company-program-distribution/${companyId}`);
  }
  getTopPerformers(companyId: number): Observable<TraineeListItemDto[]> {
    return this.http.get<TraineeListItemDto[]>(`${this.base}/Report/company-top-performers/${companyId}`);
  }
  getAtRiskTrainees(companyId: number): Observable<TraineeListItemDto[]> {
    return this.http.get<TraineeListItemDto[]>(`${this.base}/Report/company-at-risk-trainees/${companyId}`);
  }
  getCompanyWarnings(companyId: number): Observable<WarningDto[]> {
    return this.http.get<WarningDto[]>(`${this.base}/Warning`, { params: { scope: 'Company', companyId } });
  }
  getPlatformAnnouncements(): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(`${this.base}/Announcement/scope/Platform`);
  }

  // Trainees
  getEnrollmentsByCompany(companyId: number): Observable<EnrollmentDto[]> {
    let params = new HttpParams().set('companyId', companyId);
    return this.http.get<EnrollmentDto[]>(`${this.base}/Enrollment`, { params });
  }
  registerTrainee(dto: unknown) { return this.http.post(`${this.base}/Trainee`, dto); }
  createEnrollment(dto: unknown) { return this.http.post(`${this.base}/Enrollment`, dto); }

  // Specialties / Programs
  getCompanyPrograms(companyId: number): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/CompanyProgram/company/${companyId}`);
  }
  getProgram(id: number): Observable<ProgramDto> { return this.http.get<ProgramDto>(`${this.base}/Program/${id}`); }

  // Company Profile
  getCompany(id: number): Observable<CompanyDto> { return this.http.get<CompanyDto>(`${this.base}/Company/${id}`); }
  updateCompany(id: number, dto: unknown) { return this.http.put(`${this.base}/Company/${id}`, dto); }
  getBranches(companyId: number): Observable<CompanyBranchDto[]> {
    return this.http.get<CompanyBranchDto[]>(`${this.base}/CompanyBranch/company/${companyId}`);
  }
  addBranch(dto: unknown) { return this.http.post(`${this.base}/CompanyBranch`, dto); }
  getSupervisors(companyId: number): Observable<CompanySupervisorDto[]> {
    return this.http.get<CompanySupervisorDto[]>(`${this.base}/CompanySupervisor/company/${companyId}`);
  }
  addSupervisor(dto: unknown) { return this.http.post(`${this.base}/CompanySupervisor`, dto); }

  // My Account
  getSupervisorProfile(id: number): Observable<CompanySupervisorDto> {
    return this.http.get<CompanySupervisorDto>(`${this.base}/CompanySupervisor/${id}`);
  }
  updateSupervisor(id: number, dto: unknown) { return this.http.put(`${this.base}/CompanySupervisor/${id}`, dto); }

  // Trainee Progress
  getEnrollment(enrollmentId: number): Observable<EnrollmentDto> {
    return this.http.get<EnrollmentDto>(`${this.base}/Enrollment/${enrollmentId}`);
  }
  getProgressSummary(enrollmentId: number): Observable<ProgressSummaryDto> {
    return this.http.get<ProgressSummaryDto>(`${this.base}/Enrollment/${enrollmentId}/progress-summary`);
  }
  getEvaluationsForEnrollment(enrollmentId: number): Observable<EvaluationDto[]> {
    return this.http.get<EvaluationDto[]>(`${this.base}/Evaluation/enrollment/${enrollmentId}`);
  }

  // Reports
  getCompanyAttendanceReport(companyId: number): Observable<AttendanceReportDto> {
    return this.http.get<AttendanceReportDto>(`${this.base}/Report/company-attendance/${companyId}`);
  }

  // Contact — Company Conversations
  getConversations(userId: number): Observable<ConversationListItemDto[]> {
    return this.http.get<ConversationListItemDto[]>(`${this.base}/Conversation`, { params: { type: 'CompanyThread', participantUserId: userId } });
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

  // Announcements — send to own trainees
  postAnnouncement(dto: unknown) { return this.http.post(`${this.base}/Announcement`, dto); }

  // Issue warnings to trainees
  createWarning(dto: unknown) { return this.http.post(`${this.base}/Warning`, dto); }

  // Feedback visibility
  getTrainerFeedback(trainerId: number): Observable<FeedbackSummaryDto> {
    return this.http.get<FeedbackSummaryDto>(`${this.base}/Feedback/trainer/${trainerId}`);
  }
}
