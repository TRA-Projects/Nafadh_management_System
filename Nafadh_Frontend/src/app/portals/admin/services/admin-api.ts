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

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // ---- Helper Method: تنظيف وتقليم المعرفات لمنع أخطاء الـ URL (مثل 16:1) ----
  private sanitizeId(id: any): number {
    if (id === null || id === undefined) return 0;
    // أخذ الجزء الأول قبل النقطتين : وتحويله لرقم صحسح
    const cleanStr = String(id).split(':')[0].trim();
    const parsed = parseInt(cleanStr, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // ---- Dashboard ----
  getDashboardCharts(): Observable<DashboardChartsDto> {
    return this.http.get<DashboardChartsDto>(`${this.base}/Report/dashboard-charts`);
  }
  getRecentAudit(): Observable<AuditLogDto[]> {
    return this.http.get<AuditLogDto[]>(`${this.base}/AuditLog`);
  }
  getTrainees(params?: Record<string, unknown>): Observable<{ items: TraineeListItemDto[]; totalCount: number }> {
    let httpParams = new HttpParams();
    if (params) {
      for (const k of Object.keys(params)) {
        const v = params[k];
        if (v !== undefined && v !== null && v !== '') {
          // تنظيف batchId بشكل خاص إذا كان موجوداً ضمن المتغيرات
          const cleanValue = k.toLowerCase().includes('id') ? this.sanitizeId(v) : String(v);
          httpParams = httpParams.set(k, String(cleanValue));
        }
      }
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
  updateUser(id: number, dto: unknown) { return this.http.put(`${this.base}/User/${this.sanitizeId(id)}`, dto); }
  updateUserStatus(id: number, status: string) { return this.http.put(`${this.base}/User/${this.sanitizeId(id)}/status`, { status }); }
  resetPassword(id: number, dto: unknown) { return this.http.put(`${this.base}/User/${this.sanitizeId(id)}/reset-password`, dto); }

  // ---- Trainees ----
  getTrainee(id: number): Observable<TraineeProfileDto> {
    return this.http.get<TraineeProfileDto>(`${this.base}/Trainee/${this.sanitizeId(id)}`);
  }
  getTraineeDashboardSummary(id: number): Observable<TraineeDashboardSummaryDto> {
    return this.http.get<TraineeDashboardSummaryDto>(`${this.base}/Trainee/${this.sanitizeId(id)}/dashboard-summary`);
  }
  createTrainee(dto: unknown) { return this.http.post(`${this.base}/Trainee`, dto); }
  importTrainees(items: unknown[]) { return this.http.post(`${this.base}/Trainee/import`, items); }
  updateTraineeStatus(id: number, dto: unknown) { return this.http.put(`${this.base}/Trainee/${this.sanitizeId(id)}/status`, dto); }
  assignCompany(id: number, dto: unknown) { return this.http.put(`${this.base}/Trainee/${this.sanitizeId(id)}/assign-company`, dto); }
  getPendingVerification(): Observable<TraineeListItemDto[]> {
    return this.http.get<TraineeListItemDto[]>(`${this.base}/Trainee/pending-verification`);
  }
  verifyTrainee(id: number, dto: unknown) { return this.http.put(`${this.base}/Trainee/${this.sanitizeId(id)}/verification`, dto); }
  getEvaluationsForEnrollment(enrollmentId: number): Observable<EvaluationDto[]> {
    return this.http.get<EvaluationDto[]>(`${this.base}/Evaluation/enrollment/${this.sanitizeId(enrollmentId)}`);
  }


  // ---- Certificates Special Endpoint ----
  getTraineesForCertificates(params?: Record<string, unknown>): Observable<{ items: TraineeListItemDto[]; totalCount: number }> {
    let httpParams = new HttpParams();
    if (params) {
      for (const k of Object.keys(params)) {
        const v = params[k];
        if (v !== undefined && v !== null && v !== '') {
          const cleanValue = k.toLowerCase().includes('id') ? this.sanitizeId(v) : String(v);
          httpParams = httpParams.set(k, String(cleanValue));
        }
      }
    }
    return this.http.get<{ items: TraineeListItemDto[]; totalCount: number }>(`${this.base}/Trainee/certificates-dashboard`, { params: httpParams });
  }

  
  // ---- Companies ----
  getCompany(id: number): Observable<CompanyDto> { return this.http.get<CompanyDto>(`${this.base}/Company/${this.sanitizeId(id)}`); }
  createCompany(dto: unknown) { return this.http.post(`${this.base}/Company`, dto); }
  updateCompany(id: number, dto: unknown) { return this.http.put(`${this.base}/Company/${this.sanitizeId(id)}`, dto); }
  approveCompany(id: number) { return this.http.put(`${this.base}/Company/${this.sanitizeId(id)}/approve`, {}); }
  suspendCompany(id: number) { return this.http.put(`${this.base}/Company/${this.sanitizeId(id)}/suspend`, {}); }

  // ---- Programs & Batches ----
  createBatch(dto: unknown) { return this.http.post(`${this.base}/Batch`, dto); }
  updateBatch(id: number, dto: unknown) { return this.http.put(`${this.base}/Batch/${this.sanitizeId(id)}`, dto); }
  getPrograms(): Observable<ProgramDto[]> { return this.http.get<ProgramDto[]>(`${this.base}/Program`); }
  createProgram(dto: unknown) { return this.http.post(`${this.base}/Program`, dto); }


  // ---- Tracks ----
  getTracks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/Track`);
  }

  // ---- Certificates ----
  getCertificatesByTrainee(traineeId: number): Observable<CertificateDto[]> {
    return this.http.get<CertificateDto[]>(`${this.base}/Certificate/trainee/${traineeId}`);
  }
  
  // ---- Certificates (معدلة للحماية من أخطاء الـ 404) ----
  issueCertificate(dto: unknown) {
    return this.http.post(`${this.base}/Certificate`, dto);
  }

  getCertificateByEnrollment(enrollmentId: any) {
    const cleanId = this.sanitizeId(enrollmentId);
    return this.http.get(`${this.base}/Certificate/enrollment/${cleanId}`);
  }

  getCertificateByTrainee(traineeId: any) {
    const cleanId = this.sanitizeId(traineeId);
    return this.http.get(`${this.base}/Certificate/trainee/${cleanId}`);
  }

  downloadCertificate(id: any) {
    const cleanId = this.sanitizeId(id);
    return this.http.get(`${this.base}/Certificate/${cleanId}/download`, { responseType: 'blob' });
  }

  // ---- Warnings ----
  getWarnings(params: Record<string, unknown>): Observable<WarningDto[]> {
    let httpParams = new HttpParams();
    for (const k of Object.keys(params)) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, String(v));
    }
    return this.http.get<WarningDto[]>(`${this.base}/Warning`, { params: httpParams });
  }
  createWarning(dto: unknown) { return this.http.post(`${this.base}/Warning`, dto); }
  resolveWarning(id: number, dto: unknown) { return this.http.put(`${this.base}/Warning/${this.sanitizeId(id)}/resolve`, dto); }

  // ---- Communications hub ----
  getConversations(type: string): Observable<ConversationListItemDto[]> {
    return this.http.get<ConversationListItemDto[]>(`${this.base}/Conversation`, { params: { type } });
  }
  getConversation(id: number): Observable<ConversationDetailDto> {
    return this.http.get<ConversationDetailDto>(`${this.base}/Conversation/${this.sanitizeId(id)}`);
  }
  replyToConversation(id: number, dto: unknown): Observable<ConversationMessageDto> {
    return this.http.post<ConversationMessageDto>(`${this.base}/Conversation/${this.sanitizeId(id)}/messages`, dto);
  }

  // ---- Reports ----
  getBatchPerformanceReport(batchId: number): Observable<BatchPerformanceReportDto> {
    return this.http.get<BatchPerformanceReportDto>(`${this.base}/Report/batch-performance/${this.sanitizeId(batchId)}`);
  }
  getEvaluationBucketRollup(enrollmentId: number): Observable<EvaluationBucketRollupDto> {
    return this.http.get<EvaluationBucketRollupDto>(`${this.base}/Evaluation/enrollment/${this.sanitizeId(enrollmentId)}/by-bucket`);
  }

  // ---- Notifications & Announcements ----
  getNotifications(userId: number): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(`${this.base}/Notification/user/${this.sanitizeId(userId)}`);
  }
  markNotificationRead(id: number) { return this.http.put(`${this.base}/Notification/${this.sanitizeId(id)}/read`, {}); }
  markAllNotificationsRead(userId: number) { return this.http.put(`${this.base}/Notification/user/${this.sanitizeId(userId)}/read-all`, {}); }
  createAnnouncement(dto: unknown) { return this.http.post(`${this.base}/Announcement`, dto); }

  // ---- Audit ----
  getAuditLog(): Observable<AuditLogDto[]> { return this.http.get<AuditLogDto[]>(`${this.base}/AuditLog`); }

// ---- Badges ----
  getAllBadges() { return this.http.get<unknown[]>(`${this.base}/Badge`); }

  // ---- Announcements ----
  getAnnouncements(): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(`${this.base}/Announcement`);
  }
}