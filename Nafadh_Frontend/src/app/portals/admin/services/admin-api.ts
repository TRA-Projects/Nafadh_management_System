import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AnnouncementDto, AuditLogDto, BatchDto, BatchPerformanceReportDto, CertificateDto, CompanyDto,
  ConversationDetailDto, ConversationListItemDto, ConversationMessageDto, EvaluationBucketRollupDto,
  EvaluationDto, NotificationDto, ProgramDto, TraineeListItemDto, TraineeProfileDto,
  TraineeDashboardSummaryDto, UserResponseDto, WarningDto, RoleDto, DashboardChartsDto, ModuleDto,AdminBatchGroupDto
} from '../../../core/models/dtos';

export interface TraineeCertificateStatusDto {
  traineeId: number;
  enrollmentId: number;
  fullName: string;
  isIssued: boolean;
  certificateId: number | null;
  fileUrl: string | null;
  grade: number | null;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // ==========================================================
  // 1. Helper Methods
  // ==========================================================
  private sanitizeId(id: any): number {
    if (id === null || id === undefined) return 0;
    const cleanStr = String(id).split(':')[0].trim();
    const parsed = parseInt(cleanStr, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // ==========================================================
  // 2. Dashboard & Statistics
  // ==========================================================
  getAdminDashboardSummary(): Observable<any> {
    return this.http.get<any>(`${this.base}/AdminDashboard`);
  }

  getDashboardCharts(): Observable<DashboardChartsDto> {
    return this.http.get<DashboardChartsDto>(`${this.base}/Report/dashboard-charts`);
  }

  getRecentAudit(): Observable<AuditLogDto[]> {
    return this.http.get<AuditLogDto[]>(`${this.base}/AuditLog`);
  }

  // ==========================================================
  // 3. Users & Permissions
  // ==========================================================
  getUsers(): Observable<UserResponseDto[]> {
    return this.http.get<any>(`${this.base}/User`, {
      params: { page: 1, pageSize: 10000 }
    }).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        return res?.items || res?.data || res?.results || [];
      })
    );
  }

  getRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(`${this.base}/Role`);
  }

  createUser(dto: unknown) { return this.http.post(`${this.base}/User/register`, dto); }
  updateUser(id: number, dto: unknown) { return this.http.put(`${this.base}/User/${this.sanitizeId(id)}`, dto); }
  updateUserStatus(id: number, status: string) { return this.http.put(`${this.base}/User/${this.sanitizeId(id)}/status`, { status }); }
  resetPassword(id: number, dto: unknown) { return this.http.put(`${this.base}/User/${this.sanitizeId(id)}/reset-password`, dto); }

  // ==========================================================
  // 4. Trainees Management & Quiz Results
  // ==========================================================
  getTrainees(params?: Record<string, unknown>): Observable<{ items: TraineeListItemDto[]; totalCount: number }> {
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
    return this.http.get<{ items: TraineeListItemDto[]; totalCount: number }>(`${this.base}/Trainee`, { params: httpParams });
  }

  // 🟢 دالة جلب سجل نتائج الاختبارات الخاصة بالمتدرب (مطابقة لـ QuizResultDto في الباك إند)
  getTraineeExams(traineeId: number): Observable<any[]> {
    const cleanId = this.sanitizeId(traineeId);
    return this.http.get<any[]>(`${this.base}/QuizResult/trainee/${cleanId}`);
  }

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

  getEnrollmentsByTrainee(traineeId: number): Observable<any[]> {
    const cleanId = this.sanitizeId(traineeId);
    return this.http.get<any[]>(`${this.base}/Enrollment/trainee/${cleanId}`);
  }

  getTraineeProgressPercentage(traineeId: number): Observable<{ traineeId: number; percentage: number }> {
    const cleanId = this.sanitizeId(traineeId);
    return this.http.get<{ traineeId: number; percentage: number }>(`${this.base}/TraineeModuleProgress/trainee/${cleanId}/percentage`);
  }

  getTraineeModuleProgress(traineeId: number): Observable<any[]> {
    const cleanId = this.sanitizeId(traineeId);
    return this.http.get<any[]>(`${this.base}/TraineeModuleProgress/trainee/${cleanId}`);
  }

  // ==========================================================
  // 5. Companies
  // ==========================================================
  getCompanies(search?: string, city?: string, workField?: string): Observable<CompanyDto[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (city && city !== 'ALL') params = params.set('city', city);
    if (workField && workField !== 'ALL') params = params.set('workField', workField);

    return this.http.get<CompanyDto[]>(`${this.base}/Company`, { params });
  }

  getCompany(id: number): Observable<CompanyDto> { return this.http.get<CompanyDto>(`${this.base}/Company/${this.sanitizeId(id)}`); }
  createCompany(dto: unknown) { return this.http.post(`${this.base}/Company`, dto); }
  updateCompany(id: number, dto: unknown) { return this.http.put(`${this.base}/Company/${this.sanitizeId(id)}`, dto); }
  approveCompany(id: number) { return this.http.put(`${this.base}/Company/${this.sanitizeId(id)}/approve`, {}); }
  suspendCompany(id: number) { return this.http.put(`${this.base}/Company/${this.sanitizeId(id)}/suspend`, {}); }

  // ==========================================================
  // 6. Programs & Batches
  // ==========================================================
  getBatches(): Observable<BatchDto[]> {
    return this.http.get<BatchDto[]>(`${this.base}/Batch`);
  }

  createBatch(dto: unknown) { return this.http.post(`${this.base}/Batch`, dto); }
  updateBatch(id: number, dto: unknown) { return this.http.put(`${this.base}/Batch/${this.sanitizeId(id)}`, dto); }
  
  getPrograms(): Observable<ProgramDto[]> { return this.http.get<ProgramDto[]>(`${this.base}/Program`); }
  createProgram(dto: unknown) { return this.http.post(`${this.base}/Program`, dto); }

  getBatchTrainees(batchId: number): Observable<any[]> {
    const cleanId = this.sanitizeId(batchId);
    return this.http.get<any[]>(`${this.base}/Batch/${cleanId}/trainees`);
  }

  getModulesByProgram(programId: number): Observable<ModuleDto[]> {
    const cleanId = this.sanitizeId(programId);
    return this.http.get<ModuleDto[]>(`${this.base}/Module/program/${cleanId}`);
  }

  getTracks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/Track`);
  }

  getTrainers(params?: any): Observable<any> {
    return this.http.get(`${this.base}/Trainer`, { params });
  }

  // ==========================================================
  // 7. خطط تدريب الشركات واعتمادها (Course Plans Approval)
  // ==========================================================
  getCompanyCoursePlans(companyId: number): Observable<any> {
    const cleanId = this.sanitizeId(companyId);
    return this.http.get<any>(`${this.base}/CompanyCoursePlan/company/${cleanId}/plans`);
  }

  getPendingCoursePlans(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/CoursePlanApproval`);
  }

  getCoursePlanDetails(param1: number, param2?: number): Observable<any> {
    const planId = param2 !== undefined ? this.sanitizeId(param2) : this.sanitizeId(param1);
    return this.http.get<any>(`${this.base}/CoursePlanApproval/${planId}`);
  }

  reviewCoursePlan(param1: number, param2: any, param3?: any): Observable<any> {
    let planId: number;
    let payload: any;

    if (param3 !== undefined) {
      planId = this.sanitizeId(param2);
      payload = param3;
    } else {
      planId = this.sanitizeId(param1);
      payload = param2;
    }

    return this.http.put(`${this.base}/CoursePlanApproval/${planId}/decision`, payload);
  }

  // ==========================================================
  // 8. Attendance & Evaluations
  // ==========================================================
  getDailyAttendanceByEnrollment(enrollmentId: number): Observable<any[]> {
    const cleanId = this.sanitizeId(enrollmentId);
    return this.http.get<any[]>(`${this.base}/DailyAttendance/enrollment/${cleanId}`);
  }

  getSessionAttendanceByTrainee(traineeId: number): Observable<any[]> {
    const cleanId = this.sanitizeId(traineeId);
    return this.http.get<any[]>(`${this.base}/SessionAttendance/trainee/${cleanId}`);
  }

  getEvaluationsByEnrollment(enrollmentId: number): Observable<any[]> {
    const cleanId = this.sanitizeId(enrollmentId);
    return this.http.get<any[]>(`${this.base}/Evaluation/enrollment/${cleanId}`);
  }

  getEvaluationsForEnrollment(enrollmentId: number): Observable<EvaluationDto[]> {
    return this.http.get<EvaluationDto[]>(`${this.base}/Evaluation/enrollment/${this.sanitizeId(enrollmentId)}`);
  }

  getAttendance(enrollmentId: number): Observable<any[]> {
    const cleanId = this.sanitizeId(enrollmentId);
    return this.http.get<any[]>(`${this.base}/DailyAttendance/enrollment/${cleanId}`);
  }

  // ==========================================================
  // 9. Certificates
  // ==========================================================
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

  getCertificatesByTrainee(traineeId: number): Observable<CertificateDto[]> {
    return this.http.get<CertificateDto[]>(`${this.base}/Certificate/trainee/${traineeId}`);
  }

  getBatchCertificatesStatus(batchId: any): Observable<TraineeCertificateStatusDto[]> {
    const cleanId = this.sanitizeId(batchId);
    return this.http.get<TraineeCertificateStatusDto[]>(`${this.base}/Certificate/batch/${cleanId}/status`);
  }

  updateCertificateStatus(enrollmentId: any, isIssued: boolean) {
    const cleanId = this.sanitizeId(enrollmentId);
    return this.http.patch(`${this.base}/Certificate/enrollment/${cleanId}/status`, { isIssued });
  }

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

  // ==========================================================
  // 10. Warnings & Remediation
  // ==========================================================
  getWarnings(params?: Record<string, unknown>): Observable<WarningDto[]> {
    let httpParams = new HttpParams();
    if (params) {
      for (const k of Object.keys(params)) {
        const v = params[k];
        if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, String(v));
      }
    }
    return this.http.get<WarningDto[]>(`${this.base}/Warning`, { params: httpParams });
  }

  createWarning(dto: unknown) { return this.http.post(`${this.base}/Warning`, dto); }
  resolveWarning(id: number, dto: unknown) { return this.http.put(`${this.base}/Warning/${this.sanitizeId(id)}/resolve`, dto); }

  getRemediationRequests(params?: { searchTerm?: string; status?: number }): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params?.searchTerm) httpParams = httpParams.set('searchTerm', params.searchTerm);
    if (params?.status !== undefined && params?.status !== null) httpParams = httpParams.set('status', params.status.toString());

    return this.http.get<any[]>(`${this.base}/admin/remediation-requests`, { params: httpParams });
  }

  getRemediationRequestById(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/remediation-requests/${this.sanitizeId(id)}`);
  }

  createRemediationRequest(dto: any): Observable<any> {
    return this.http.post<any>(`${this.base}/admin/remediation-requests`, dto);
  }

  reviewRemediationRequest(id: number, dto: { status: number; reviewNotes?: string; reviewedByUserId: number }): Observable<any> {
    return this.http.put<any>(`${this.base}/admin/remediation-requests/${this.sanitizeId(id)}/review`, dto);
  }

  // ==========================================================
  // 11. Communications & Conversations
  // ==========================================================
  getConversations(type: string): Observable<ConversationListItemDto[]> {
    return this.http.get<ConversationListItemDto[]>(`${this.base}/Conversation`, { params: { type } });
  }

  getConversation(id: number): Observable<ConversationDetailDto> {
    return this.http.get<ConversationDetailDto>(`${this.base}/Conversation/${this.sanitizeId(id)}`);
  }

  // 🌟 NEW: Get all training batch groups for Admin
getAdminBatchGroups(): Observable<AdminBatchGroupDto[]> {
  return this.http.get<AdminBatchGroupDto[]>(
    `${this.base}/admin/batch-groups`
  );
}

  replyToConversation(id: number, dto: unknown): Observable<ConversationMessageDto> {
    return this.http.post<ConversationMessageDto>(`${this.base}/Conversation/${this.sanitizeId(id)}/messages`, dto);
  }

  // ==========================================================
  // 12. Reports & Audit
  // ==========================================================
  getBatchPerformanceReport(batchId: number, pageNumber: number = 1, pageSize: number = 15): Observable<BatchPerformanceReportDto> {
    const params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));
    return this.http.get<BatchPerformanceReportDto>(
      `${this.base}/Report/batch-performance/${this.sanitizeId(batchId)}`,
      { params }
    );
  }

  getEvaluationBucketRollup(enrollmentId: number): Observable<EvaluationBucketRollupDto> {
    return this.http.get<EvaluationBucketRollupDto>(`${this.base}/Evaluation/enrollment/${this.sanitizeId(enrollmentId)}/by-bucket`);
  }

  getAuditLog(): Observable<AuditLogDto[]> { return this.http.get<AuditLogDto[]>(`${this.base}/AuditLog`); }
  getAllBadges() { return this.http.get<unknown[]>(`${this.base}/Badge`); }

  // ==========================================================
  // 13. Notifications & Announcements
  // ==========================================================
  getNotifications(userId: number): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(`${this.base}/Notification/user/${this.sanitizeId(userId)}`);
  }

  markNotificationRead(id: number) { return this.http.put(`${this.base}/Notification/${this.sanitizeId(id)}/read`, {}); }
  markAllNotificationsRead(userId: number) { return this.http.put(`${this.base}/Notification/user/${this.sanitizeId(userId)}/read-all`, {}); }

  getAnnouncements(): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(`${this.base}/Announcement`);
  }

  createAnnouncement(dto: unknown) {
    return this.http.post(`${this.base}/Announcement`, dto, { responseType: 'text' as 'json' });
  }

  deleteAnnouncement(id: number): Observable<any> {
    return this.http.delete(`${this.base}/Announcement/${this.sanitizeId(id)}`);
  }

  // ==========================================================
  // 14. Withdrawal & Support Tickets
  // ==========================================================
  getOpenSupportTickets(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/SupportTicket/open`);
  }

  submitWithdrawalDecision(traineeId: number, dto: { approved: boolean; adminReason?: string }): Observable<any> {
    const cleanId = this.sanitizeId(traineeId);
    return this.http.put<any>(`${this.base}/Trainee/${cleanId}/withdrawal-decision`, dto);
  }

  getWithdrawalRequests(status?: string): Observable<any[]> {
    const params: any = status ? { status } : {};
    return this.http.get<any[]>(`${this.base}/WithdrawalRequests`, { params });
  }

  reviewWithdrawalRequest(id: number, status: number, adminNotes?: string): Observable<any> {
    return this.http.put(`${this.base}/WithdrawalRequests/${id}/review`, {
      status,
      adminNotes
    });
  }

  createWithdrawalRequest(payload: { traineeId: number; reason: string }): Observable<any> {
    return this.http.post(`${this.base}/WithdrawalRequests`, payload);
  }
}