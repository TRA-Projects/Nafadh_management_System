
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

import {
  AnnouncementDto,
  CompanyAccountDto,
  CompanyBranchDto,
  CompanyCapacityDto,
  CompanyDto,
  CompanySupervisorDto,
  CompanyDashboardDto,
  ConversationDetailDto,
  ConversationListItemDto,
  ConversationMessageDto,
  EnrollmentDto,
  EvaluationDto,
  FeedbackSummaryDto,
  WarningDto,
  AttendanceReportDto,
  ChartPointDto,
  TraineeListItemDto,
  ProgramDto,
  ProgressSummaryDto,
  CompanyProgramLinkDto,
  CompanyProgramSummaryDto,
  CompanyProgramDetailsDto,
} from '../../../core/models/dtos';

import {
  AddCoursePlanNoteRequest,
  CoursePlanDetailDto,
  CoursePlanLookupsDto,
  CoursePlansOverviewDto,
  PlanProgressStatus,
  SaveCoursePlanItemRequest,
  SaveCoursePlanRequest,
  SaveCoursePlanStageRequest,
} from '../models/company-tasks.models';

import {
  CompanyTrainerDto,
  TrainerAttendanceConfirmDto,
  TrainerAttendanceDto,
  TrainerAttendanceUpsertDto,
} from '../../../core/models/trainer-attendance.models';

/** بيانات معيار واحد في التقييم. */
export interface CriterionScoreInputDto {
  criteriaId: number;
  score: number;
}

/** إنشاء تقييم جديد حسب CreateEvaluationDTO في الباك إند. */
export interface CreateEvaluationDto {
  enrollmentId: number;
  trainerId?: number | null;
  templateId: number;
  notes?: string | null;
  evaluatorUserId: number;
  criteriaScores: CriterionScoreInputDto[];
}

/** تعديل الملاحظات ودرجات معايير تقييم موجود. */
export interface UpdateEvaluationDto {
  notes?: string | null;
  criteriaScores: CriterionScoreInputDto[];
}

export interface CompanyQuizResult {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  traineeId: number;
  attemptNumber: number;
  submittedAt: string | null;
  score: number;
  percentage: number;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class CompanyApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  // ============================================================
  // Dashboard
  // ============================================================

  getDashboard(companyId: number): Observable<CompanyDashboardDto> {
    return this.http.get<CompanyDashboardDto>(
      `${this.base}/CompanyDashboard/${companyId}`
    );
  }

  getCapacity(companyId: number): Observable<CompanyCapacityDto> {
    return this.http.get<CompanyCapacityDto>(
      `${this.base}/Company/${companyId}/capacity`
    );
  }

  getCompanyCapacitySummary(
    companyId: number
  ): Observable<{ total: number; used: number; remaining: number }> {
    return this.http.get<{ total: number; used: number; remaining: number }>(
      `${this.base}/CompanyProgram/company/${companyId}/capacity`
    );
  }

  getAttendanceChart(
    companyId: number
  ): Observable<{ weeks: ChartPointDto[] }> {
    return this.http.get<{ weeks: ChartPointDto[] }>(
      `${this.base}/Report/company-attendance-chart/${companyId}`
    );
  }

  getProgramDistribution(companyId: number): Observable<ChartPointDto[]> {
    return this.http.get<ChartPointDto[]>(
      `${this.base}/Report/company-program-distribution/${companyId}`
    );
  }

  getTopPerformers(companyId: number): Observable<TraineeListItemDto[]> {
    return this.http.get<TraineeListItemDto[]>(
      `${this.base}/Report/company-top-performers/${companyId}`
    );
  }

  getAtRiskTrainees(companyId: number): Observable<TraineeListItemDto[]> {
    return this.http.get<TraineeListItemDto[]>(
      `${this.base}/Report/company-at-risk-trainees/${companyId}`
    );
  }

  getCompanyWarnings(companyId: number): Observable<WarningDto[]> {
    const params = new HttpParams()
      .set('scope', 'Company')
      .set('companyId', companyId);

    return this.http.get<WarningDto[]>(`${this.base}/Warning`, { params });
  }

  getPlatformAnnouncements(): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(
      `${this.base}/Announcement/scope/Platform`
    );
  }


  // ============================================================
  // Supervisor
  // ============================================================

  /**
   * جلب المدربين الموزعين فعليًا على مشرف معين
   * من قاعدة البيانات عبر الباك إند.
   *
   * GET /api/CompanySupervisor/{supervisorId}/trainers
   */
  getSupervisorTrainers(supervisorId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.base}/CompanySupervisor/${supervisorId}/trainers`
    );
  }

  /**
   * حفظ توزيع المدربين على مشرف معين.
   *
   * PUT /api/CompanySupervisor/{supervisorId}/trainers
   */
  assignTrainersToSupervisor(
    supervisorId: number,
    trainerIds: number[]
  ): Observable<any> {
    return this.http.put(
      `${this.base}/CompanySupervisor/${supervisorId}/trainers`,
      { trainerIds }
    );
  }


  // ============================================================
  // Trainees
  // ============================================================

  getEnrollmentsByCompany(companyId: number): Observable<EnrollmentDto[]> {
    const params = new HttpParams().set('companyId', companyId);

    return this.http.get<EnrollmentDto[]>(
      `${this.base}/Enrollment`,
      { params }
    );
  }

  registerTrainee(dto: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/Trainee`, dto);
  }

  createEnrollment(dto: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/Enrollment`, dto);
  }

  // ============================================================
  // Specialties / Programs
  // ============================================================

  getCompanyPrograms(companyId: number): Observable<CompanyProgramLinkDto[]> {
    return this.http.get<CompanyProgramLinkDto[]>(
      `${this.base}/CompanyProgram/company/${companyId}`
    );
  }

  getCompanyProgramSummaries(
    companyId: number
  ): Observable<CompanyProgramSummaryDto[]> {
    return this.http.get<CompanyProgramSummaryDto[]>(
      `${this.base}/CompanyProgram/company/${companyId}/details`
    );
  }

  getCompanyProgramDetails(
    companyId: number,
    programId: number
  ): Observable<CompanyProgramDetailsDto> {
    return this.http.get<CompanyProgramDetailsDto>(
      `${this.base}/CompanyProgram/company/${companyId}/program/${programId}/details`
    );
  }

  getProgram(id: number): Observable<ProgramDto> {
    return this.http.get<ProgramDto>(`${this.base}/Program/${id}`);
  }

  getBatch(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/Batch/${id}`);
  }

  getModulesByProgram(programId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.base}/Module/program/${programId}`
    );
  }

  getEnrollmentProgressSummary(enrollmentId: number): Observable<any> {
    return this.http.get<any>(
      `${this.base}/Enrollment/${enrollmentId}/progress-summary`
    );
  }

  // ============================================================
  // Company Profile
  // ============================================================

  getCompany(id: number): Observable<CompanyDto> {
    return this.http.get<CompanyDto>(`${this.base}/Company/${id}`);
  }

  updateCompany(id: number, dto: unknown): Observable<unknown> {
    return this.http.put<unknown>(`${this.base}/Company/${id}`, dto);
  }

  getBranches(companyId: number): Observable<CompanyBranchDto[]> {
    return this.http.get<CompanyBranchDto[]>(
      `${this.base}/CompanyBranch/company/${companyId}`
    );
  }

  addBranch(dto: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/CompanyBranch`, dto);
  }

  getSupervisors(companyId: number): Observable<CompanySupervisorDto[]> {
    return this.http.get<CompanySupervisorDto[]>(
      `${this.base}/CompanySupervisor/company/${companyId}`
    );
  }

  addSupervisor(dto: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/CompanySupervisor`, dto);
  }

  deleteSupervisor(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/CompanySupervisor/${id}`);
  }

  getSupervisorAssignedTrainees(id: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.base}/CompanySupervisor/${id}/trainees`
    );
  }

  // ============================================================
  // My Account
  // ============================================================

  getCurrentAccount(): Observable<CompanyAccountDto> {
    return this.http.get<CompanyAccountDto>(
      `${this.base}/CompanyAccount/me`
    );
  }

  updateMyAccount(dto: { phone: string }): Observable<CompanyAccountDto> {
    return this.http.put<CompanyAccountDto>(
      `${this.base}/CompanyAccount/me`,
      dto
    );
  }

  downloadMyAccountPdf(): Observable<Blob> {
    return this.http.get(`${this.base}/CompanyAccount/me/export-pdf`, {
      responseType: 'blob',
    });
  }

  exportCurrentAccountPdf(): Observable<Blob> {
    return this.http.get(`${this.base}/CompanyAccount/me/pdf`, {
      responseType: 'blob',
    });
  }

  getSupervisorProfile(id: number): Observable<CompanySupervisorDto> {
    return this.http.get<CompanySupervisorDto>(
      `${this.base}/CompanySupervisor/${id}`
    );
  }

  updateSupervisor(id: number, dto: unknown): Observable<unknown> {
    return this.http.put<unknown>(
      `${this.base}/CompanySupervisor/${id}`,
      dto
    );
  }

  // ============================================================
  // Trainee Progress
  // ============================================================

  getQuizResultsForEnrollment(
    enrollmentId: number
  ): Observable<CompanyQuizResult[]> {
    return this.http.get<CompanyQuizResult[]>(
      `${this.base}/quiz-results/company/enrollment/${enrollmentId}`
    );
  }

  getEnrollment(enrollmentId: number): Observable<EnrollmentDto> {
    return this.http.get<EnrollmentDto>(
      `${this.base}/Enrollment/${enrollmentId}`
    );
  }

  updateEnrollmentAssignment(
    enrollmentId: number,
    dto: {
      departmentId?: number | null;
      supervisorId?: number | null;
    }
  ): Observable<EnrollmentDto> {
    return this.http.put<EnrollmentDto>(
      `${this.base}/Enrollment/${enrollmentId}`,
      dto
    );
  }

  getProgressSummary(
    enrollmentId: number
  ): Observable<ProgressSummaryDto> {
    return this.http.get<ProgressSummaryDto>(
      `${this.base}/Enrollment/${enrollmentId}/progress-summary`
    );
  }

  getEvaluationsForEnrollment(
    enrollmentId: number
  ): Observable<EvaluationDto[]> {
    return this.http.get<EvaluationDto[]>(
      `${this.base}/Evaluation/enrollment/${enrollmentId}`
    );
  }

  getEvaluationBuckets(
    enrollmentId: number
  ): Observable<Record<string, number | null>> {
    return this.http.get<Record<string, number | null>>(
      `${this.base}/Evaluation/enrollment/${enrollmentId}/by-bucket`
    );
  }

  uploadTraineeImage(
    traineeId: number,
    file: File
  ): Observable<unknown> {
    const form = new FormData();
    form.append('file', file);

    return this.http.post(
      `${this.base}/Enrollment/trainee/${traineeId}/upload-image`,
      form
    );
  }

  // ============================================================
  // Trainer Evaluation
  // ============================================================

  /** جلب التقييمات المرتبطة بمدرب معيّن. */
  getEvaluationsForTrainer(
    trainerId: number
  ): Observable<EvaluationDto[]> {
    return this.http.get<EvaluationDto[]>(
      `${this.base}/Evaluation/trainer/${trainerId}`
    );
  }

  /** جلب تقييم واحد مع تفاصيله. */
  getEvaluationById(evaluationId: number): Observable<EvaluationDto> {
    return this.http.get<EvaluationDto>(
      `${this.base}/Evaluation/${evaluationId}`
    );
  }

  /** إنشاء تقييم جديد وحفظه عبر الباك إند. */
  createEvaluation(
    payload: CreateEvaluationDto
  ): Observable<EvaluationDto> {
    return this.http.post<EvaluationDto>(
      `${this.base}/Evaluation`,
      payload
    );
  }

  /** تعديل تقييم محفوظ مسبقًا. */
  updateEvaluation(
    evaluationId: number,
    payload: UpdateEvaluationDto
  ): Observable<unknown> {
    return this.http.put(
      `${this.base}/Evaluation/${evaluationId}`,
      payload
    );
  }

  /** حذف تقييم عند الحاجة وبعد التحقق من صلاحيات المستخدم. */
  deleteEvaluation(evaluationId: number): Observable<unknown> {
    return this.http.delete(
      `${this.base}/Evaluation/${evaluationId}`
    );
  }

  // ============================================================
  // Reports
  // ============================================================

  getCompanyAttendanceReport(
    companyId: number
  ): Observable<AttendanceReportDto> {
    return this.http.get<AttendanceReportDto>(
      `${this.base}/Report/company-attendance/${companyId}`
    );
  }

  // ============================================================
  // Contact — Company Conversations
  // ============================================================

  getConversations(
    _userId?: number
  ): Observable<ConversationListItemDto[]> {
    return this.http.get<ConversationListItemDto[]>(
      `${this.base}/Conversation`,
      { params: { type: 'CompanyThread' } }
    );
  }

  startConversation(dto: {
    type: string;
    category: string;
    subject: string;
    firstMessage: string;
    startedByUserId?: number;
  }): Observable<ConversationDetailDto> {
    const form = new FormData();
    form.set('Type', dto.type);
    form.set('Category', dto.category);
    form.set('Subject', dto.subject.trim());
    form.set('FirstMessage', dto.firstMessage.trim());

    return this.http.post<ConversationDetailDto>(
      `${this.base}/Conversation`,
      form
    );
  }

  getConversation(id: number): Observable<ConversationDetailDto> {
    return this.http.get<ConversationDetailDto>(
      `${this.base}/Conversation/${id}`
    );
  }

  sendMessage(
    id: number,
    dto: { content: string; senderId?: number }
  ): Observable<ConversationMessageDto> {
    return this.http.post<ConversationMessageDto>(
      `${this.base}/Conversation/${id}/messages`,
      { content: dto.content.trim() }
    );
  }

  markConversationRead(id: number, _userId?: number): Observable<unknown> {
    return this.http.put(
      `${this.base}/Conversation/${id}/read`,
      {}
    );
  }

  // ============================================================
  // Announcements
  // ============================================================

  postAnnouncement(dto: unknown): Observable<unknown> {
    return this.http.post(`${this.base}/Announcement`, dto);
  }

  // ============================================================
  // Warnings
  // ============================================================

  createWarning(dto: unknown): Observable<unknown> {
    return this.http.post(`${this.base}/Warning`, dto);
  }

  replyToCompanyWarning(
    warningId: number,
    companyId: number,
    reply: string
  ): Observable<unknown> {
    return this.http.put(
      `${this.base}/Warning/${warningId}/reply?companyId=${companyId}`,
      { reply }
    );
  }

  // ============================================================
  // Feedback
  // ============================================================

  getTrainerFeedback(
    trainerId: number
  ): Observable<FeedbackSummaryDto> {
    return this.http.get<FeedbackSummaryDto>(
      `${this.base}/Feedback/trainer/${trainerId}`
    );
  }

  // ============================================================
  // Tasks & Projects — course plans
  // ============================================================

  private planUrl(companyId: number, suffix = ''): string {
    return `${this.base}/CompanyCoursePlan/company/${companyId}${suffix}`;
  }

  getCoursePlans(companyId: number): Observable<CoursePlansOverviewDto> {
    return this.http.get<CoursePlansOverviewDto>(
      this.planUrl(companyId, '/plans')
    );
  }

  getCoursePlanLookups(companyId: number): Observable<CoursePlanLookupsDto> {
    return this.http.get<CoursePlanLookupsDto>(
      this.planUrl(companyId, '/lookups')
    );
  }

  getCoursePlan(
    companyId: number,
    planId: number
  ): Observable<CoursePlanDetailDto> {
    return this.http.get<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}`)
    );
  }

  createCoursePlan(
    companyId: number,
    dto: SaveCoursePlanRequest
  ): Observable<CoursePlanDetailDto> {
    return this.http.post<CoursePlanDetailDto>(
      this.planUrl(companyId, '/plans'),
      dto
    );
  }

  updateCoursePlan(
    companyId: number,
    planId: number,
    dto: SaveCoursePlanRequest
  ): Observable<CoursePlanDetailDto> {
    return this.http.put<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}`),
      dto
    );
  }

  setCoursePlanTrainers(
    companyId: number,
    planId: number,
    trainerIds: number[]
  ): Observable<CoursePlanDetailDto> {
    return this.http.put<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/trainers`),
      { trainerIds }
    );
  }

  setCoursePlanStageTrainers(
    companyId: number,
    planId: number,
    stageId: number,
    trainerIds: number[]
  ): Observable<CoursePlanDetailDto> {
    return this.http.put<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/stages/${stageId}/trainers`),
      { trainerIds }
    );
  }

  deleteCoursePlan(companyId: number, planId: number): Observable<unknown> {
    return this.http.delete(
      this.planUrl(companyId, `/plans/${planId}`)
    );
  }

  addCoursePlanStage(
    companyId: number,
    planId: number,
    dto: SaveCoursePlanStageRequest
  ): Observable<CoursePlanDetailDto> {
    return this.http.post<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/stages`),
      dto
    );
  }

  updateCoursePlanStage(
    companyId: number,
    planId: number,
    stageId: number,
    dto: SaveCoursePlanStageRequest
  ): Observable<CoursePlanDetailDto> {
    return this.http.put<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/stages/${stageId}`),
      dto
    );
  }

  deleteCoursePlanStage(
    companyId: number,
    planId: number,
    stageId: number
  ): Observable<CoursePlanDetailDto> {
    return this.http.delete<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/stages/${stageId}`)
    );
  }

  addCoursePlanItem(
    companyId: number,
    planId: number,
    stageId: number,
    dto: SaveCoursePlanItemRequest
  ): Observable<CoursePlanDetailDto> {
    return this.http.post<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/stages/${stageId}/items`),
      dto
    );
  }

  updateCoursePlanItem(
    companyId: number,
    planId: number,
    itemId: number,
    dto: SaveCoursePlanItemRequest
  ): Observable<CoursePlanDetailDto> {
    return this.http.put<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/items/${itemId}`),
      dto
    );
  }

  deleteCoursePlanItem(
    companyId: number,
    planId: number,
    itemId: number
  ): Observable<CoursePlanDetailDto> {
    return this.http.delete<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/items/${itemId}`)
    );
  }

  submitCoursePlan(
    companyId: number,
    planId: number
  ): Observable<CoursePlanDetailDto> {
    return this.http.post<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/submit`),
      {}
    );
  }

  withdrawCoursePlan(
    companyId: number,
    planId: number
  ): Observable<CoursePlanDetailDto> {
    return this.http.post<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/withdraw`),
      {}
    );
  }

  holdCoursePlan(
    companyId: number,
    planId: number
  ): Observable<CoursePlanDetailDto> {
    return this.http.post<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/hold`),
      {}
    );
  }

  resumeCoursePlan(
    companyId: number,
    planId: number
  ): Observable<CoursePlanDetailDto> {
    return this.http.post<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/resume`),
      {}
    );
  }

  setCoursePlanStageStatus(
    companyId: number,
    planId: number,
    stageId: number,
    status: PlanProgressStatus
  ): Observable<CoursePlanDetailDto> {
    return this.http.put<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/stages/${stageId}/status`),
      { status }
    );
  }

  setCoursePlanItemStatus(
    companyId: number,
    planId: number,
    itemId: number,
    status: PlanProgressStatus
  ): Observable<CoursePlanDetailDto> {
    return this.http.put<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/items/${itemId}/status`),
      { status }
    );
  }

  addCoursePlanNote(
    companyId: number,
    planId: number,
    dto: AddCoursePlanNoteRequest
  ): Observable<CoursePlanDetailDto> {
    return this.http.post<CoursePlanDetailDto>(
      this.planUrl(companyId, `/plans/${planId}/notes`),
      dto
    );
  }

  // ============================================================
  // Trainer Attendance
  // ============================================================

  getCompanyTrainers(companyId: number): Observable<CompanyTrainerDto[]> {
    return this.http.get<CompanyTrainerDto[]>(
      `${this.base}/TrainerAttendance/company/${companyId}/trainers`
    );
  }

  getTrainerAttendance(
    companyId: number,
    from: string,
    to: string
  ): Observable<TrainerAttendanceDto[]> {
    return this.http.get<TrainerAttendanceDto[]>(
      `${this.base}/TrainerAttendance/company/${companyId}`,
      { params: { from, to } }
    );
  }

  saveTrainerAttendance(
    dto: TrainerAttendanceUpsertDto
  ): Observable<TrainerAttendanceDto> {
    return this.http.put<TrainerAttendanceDto>(
      `${this.base}/TrainerAttendance`,
      dto
    );
  }

  uploadTrainerAttendanceProof(
    attendanceId: number,
    file: File
  ): Observable<{ excuseProofUrl: string }> {
    const form = new FormData();
    form.append('file', file);

    return this.http.post<{ excuseProofUrl: string }>(
      `${this.base}/TrainerAttendance/${attendanceId}/proof`,
      form
    );
  }

  removeTrainerAttendanceProof(attendanceId: number): Observable<unknown> {
    return this.http.delete(
      `${this.base}/TrainerAttendance/${attendanceId}/proof`
    );
  }

  confirmTrainerAttendanceDay(
    dto: TrainerAttendanceConfirmDto
  ): Observable<{ confirmedRecords: number }> {
    return this.http.post<{ confirmedRecords: number }>(
      `${this.base}/TrainerAttendance/confirm`,
      dto
    );
  }

  resolveFileUrl(path?: string | null): string {
    if (!path) return '';
    if (/^(https?:|data:|blob:)/i.test(path)) return path;

    const origin = new URL(this.base, window.location.origin).origin;
    return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  // Dedicated routes for the four Company pages. Existing methods above are unchanged.
  private readonly portalBase = `${this.base}/CompanyPortal`;
  getPortalCompany(id: number): Observable<CompanyDto> {
    return this.http.get<CompanyDto>(`${this.portalBase}/company/${id}`);
  }
  updatePortalCompanyContact(id: number, dto: {phone: string; email: string}): Observable<{phone: string; email: string}> {
    return this.http.patch<{phone: string; email: string}>(`${this.portalBase}/company/${id}/contact`, {phone: dto.phone, email: dto.email});
  }
  getPortalBranches(id: number): Observable<CompanyBranchDto[]> {
    return this.http.get<CompanyBranchDto[]>(`${this.portalBase}/company/${id}/branches`);
  }
  addPortalBranch(dto: {companyId: number; location: string; contactPoint: string}): Observable<CompanyBranchDto> {
    return this.http.post<CompanyBranchDto>(`${this.portalBase}/company/${dto.companyId}/branches`, {location: dto.location, contactPoint: dto.contactPoint});
  }
  getPortalSupervisors(id: number): Observable<CompanySupervisorDto[]> {
    return this.http.get<CompanySupervisorDto[]>(`${this.portalBase}/company/${id}/supervisors`);
  }
  getPortalEnrollments(id: number): Observable<EnrollmentDto[]> {
    return this.http.get<EnrollmentDto[]>(`${this.portalBase}/company/${id}/enrollments`);
  }
  getPortalCapacity(id: number): Observable<{total: number; used: number; remaining: number}> {
    return this.http.get<{total: number; used: number; remaining: number}>(`${this.portalBase}/company/${id}/capacity`);
  }
  getPortalAttendance(id: number): Observable<AttendanceReportDto> {
    return this.http.get<AttendanceReportDto>(`${this.portalBase}/company/${id}/attendance`);
  }
  getPortalConversations(): Observable<ConversationListItemDto[]> {
    return this.http.get<ConversationListItemDto[]>(`${this.portalBase}/conversations`);
  }
  getPortalConversation(id: number): Observable<ConversationDetailDto> {
    return this.http.get<ConversationDetailDto>(`${this.portalBase}/conversations/${id}`);
  }
  startPortalConversation(dto: {type: string; category: string; subject: string; firstMessage: string}): Observable<ConversationDetailDto> {
    const form = new FormData();
    form.set('Category', dto.category); form.set('Subject', dto.subject.trim()); form.set('FirstMessage', dto.firstMessage.trim());
    return this.http.post<ConversationDetailDto>(`${this.portalBase}/conversations`, form);
  }
  sendPortalMessage(id: number, dto: {content: string}): Observable<ConversationMessageDto> {
    return this.http.post<ConversationMessageDto>(`${this.portalBase}/conversations/${id}/messages`, {content: dto.content.trim()});
  }
  markPortalConversationRead(id: number): Observable<unknown> {
    return this.http.put(`${this.portalBase}/conversations/${id}/read`, {});
  }

  // Compatibility for the current profile.ts; uses only the isolated Company endpoint.
  updateCompanyContact(
    id: number,
    dto: { phone: string; email: string }
  ): Observable<{ phone: string; email: string }> {
    return this.updatePortalCompanyContact(id, dto);
  }
}
