import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AnnouncementDto, AuditLogDto, BatchDto, BatchPerformanceReportDto, CertificateDto, CompanyDto,
  ConversationDetailDto, ConversationListItemDto, ConversationMessageDto, EvaluationBucketRollupDto,
  EvaluationDto, NotificationDto, ProgramDto, TraineeListItemDto, TraineeProfileDto,
  TraineeDashboardSummaryDto, UserResponseDto, WarningDto, RoleDto, DashboardChartsDto,
} from '../../../core/models/dtos';

// Real backend calls only — every route below matches the actual controller
// action exactly (verified against Nafadh_Backend/Controllers/*.cs). No mocks.
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  // ---- Dashboard ----
  getDashboardCharts(): Observable<DashboardChartsDto> {
    return this.http.get<DashboardChartsDto>(`${this.base}/Report/dashboard-charts`);
  }
  getRecentAudit(): Observable<AuditLogDto[]> {
    return this.http.get<AuditLogDto[]>(`${this.base}/AuditLog`);
  }
  getTrainees(params?: Record<string, unknown>): Observable<{ items: TraineeListItemDto[]; totalCount: number }> {
    let httpParams = new HttpParams();
    if (params) for (const k of Object.keys(params)) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, String(v));
    }
    return this.http.get<{ items: TraineeListItemDto[]; totalCount: number }>(`${this.base}/Trainee`, { params: httpParams });
  }
  getCompanies(): Observable<CompanyDto[]> {
    return this.http.get<CompanyDto[]>(`${this.base}/Company`);
  }
  getBatches(): Observable<BatchDto[]> {
    return this.http.get<BatchDto[]>(`${this.base}/Batch`);
  }

  // ---- Users & Permissions ----
  getUsers(): Observable<UserResponseDto[]> {
    return this.http.get<UserResponseDto[]>(`${this.base}/User`);
  }
  getRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(`${this.base}/Role`);
  }
  createUser(dto: unknown) { return this.http.post(`${this.base}/User/register`, dto); }
  updateUserStatus(id: number, status: string) { return this.http.put(`${this.base}/User/${id}/status`, { status }); }
  resetPassword(id: number, dto: unknown) { return this.http.put(`${this.base}/User/${id}/reset-password`, dto); }

  // ---- Trainees ----
  getTrainee(id: number): Observable<TraineeProfileDto> {
    return this.http.get<TraineeProfileDto>(`${this.base}/Trainee/${id}`);
  }
  getTraineeDashboardSummary(id: number): Observable<TraineeDashboardSummaryDto> {
    return this.http.get<TraineeDashboardSummaryDto>(`${this.base}/Trainee/${id}/dashboard-summary`);
  }
  createTrainee(dto: unknown) { return this.http.post(`${this.base}/Trainee`, dto); }
  importTrainees(items: unknown[]) { return this.http.post(`${this.base}/Trainee/import`, items); }
  updateTraineeStatus(id: number, dto: unknown) { return this.http.put(`${this.base}/Trainee/${id}/status`, dto); }
  assignCompany(id: number, dto: unknown) { return this.http.put(`${this.base}/Trainee/${id}/assign-company`, dto); }
  getPendingVerification(): Observable<TraineeListItemDto[]> {
    return this.http.get<TraineeListItemDto[]>(`${this.base}/Trainee/pending-verification`);
  }
  verifyTrainee(id: number, dto: unknown) { return this.http.put(`${this.base}/Trainee/${id}/verification`, dto); }
  getEvaluationsForEnrollment(enrollmentId: number): Observable<EvaluationDto[]> {
    return this.http.get<EvaluationDto[]>(`${this.base}/Evaluation/enrollment/${enrollmentId}`);
  }

  // ---- Companies ----
  getCompany(id: number): Observable<CompanyDto> { return this.http.get<CompanyDto>(`${this.base}/Company/${id}`); }
  createCompany(dto: unknown) { return this.http.post(`${this.base}/Company`, dto); }
  updateCompany(id: number, dto: unknown) { return this.http.put(`${this.base}/Company/${id}`, dto); }
  approveCompany(id: number) { return this.http.put(`${this.base}/Company/${id}/approve`, {}); }
  suspendCompany(id: number) { return this.http.put(`${this.base}/Company/${id}/suspend`, {}); }

  // ---- Programs & Batches ----
  createBatch(dto: unknown) { return this.http.post(`${this.base}/Batch`, dto); }
  updateBatch(id: number, dto: unknown) { return this.http.put(`${this.base}/Batch/${id}`, dto); }
  getPrograms(): Observable<ProgramDto[]> { return this.http.get<ProgramDto[]>(`${this.base}/Program`); }
  createProgram(dto: unknown) { return this.http.post(`${this.base}/Program`, dto); }

  // ---- Certificates ----
  getCertificatesByTrainee(traineeId: number): Observable<CertificateDto[]> {
    return this.http.get<CertificateDto[]>(`${this.base}/Certificate/trainee/${traineeId}`);
  }
  issueCertificate(dto: unknown) { return this.http.post(`${this.base}/Certificate`, dto); }

  // ---- Warnings (company-only on this page) ----
  getWarnings(params: Record<string, unknown>): Observable<WarningDto[]> {
    let httpParams = new HttpParams();
    for (const k of Object.keys(params)) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, String(v));
    }
    return this.http.get<WarningDto[]>(`${this.base}/Warning`, { params: httpParams });
  }
  createWarning(dto: unknown) { return this.http.post(`${this.base}/Warning`, dto); }
  resolveWarning(id: number, dto: unknown) { return this.http.put(`${this.base}/Warning/${id}/resolve`, dto); }

  // ---- Communications hub ----
  getConversations(type: string): Observable<ConversationListItemDto[]> {
    return this.http.get<ConversationListItemDto[]>(`${this.base}/Conversation`, { params: { type } });
  }
  getConversation(id: number): Observable<ConversationDetailDto> {
    return this.http.get<ConversationDetailDto>(`${this.base}/Conversation/${id}`);
  }
  replyToConversation(id: number, dto: unknown): Observable<ConversationMessageDto> {
    return this.http.post<ConversationMessageDto>(`${this.base}/Conversation/${id}/messages`, dto);
  }

  // ---- Reports ----
  getBatchPerformanceReport(batchId: number): Observable<BatchPerformanceReportDto> {
    return this.http.get<BatchPerformanceReportDto>(`${this.base}/Report/batch-performance/${batchId}`);
  }
  getEvaluationBucketRollup(enrollmentId: number): Observable<EvaluationBucketRollupDto> {
    return this.http.get<EvaluationBucketRollupDto>(`${this.base}/Evaluation/enrollment/${enrollmentId}/by-bucket`);
  }

  // ---- Notifications & Announcements ----
  getNotifications(userId: number): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(`${this.base}/Notification/user/${userId}`);
  }
  markNotificationRead(id: number) { return this.http.put(`${this.base}/Notification/${id}/read`, {}); }
  markAllNotificationsRead(userId: number) { return this.http.put(`${this.base}/Notification/user/${userId}/read-all`, {}); }
  createAnnouncement(dto: unknown) { return this.http.post(`${this.base}/Announcement`, dto); }

  // ---- Audit ----
  getAuditLog(): Observable<AuditLogDto[]> { return this.http.get<AuditLogDto[]>(`${this.base}/AuditLog`); }

  // ---- Badges ----
  getAllBadges() { return this.http.get<unknown[]>(`${this.base}/Badge`); }
}
