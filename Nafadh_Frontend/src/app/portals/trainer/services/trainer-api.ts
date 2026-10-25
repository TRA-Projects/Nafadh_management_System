
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

import {
  DailyAttendanceDto,
  EnrollmentDto,
  EvaluationTemplateDto,
  EvaluationTemplateDetailDto,
  ExcuseDto,
  FeedbackSummaryDto,
  SessionDto,
  SubmissionDto,
  TaskDto,
  TrainingMaterialDto,
  TrainerBatchDto,
  TrainerDto,
  TrainerCertificateDto,
  TrainerKpisDto,
  BatchDto,
  ProgramDto,
  ModuleDto,
  LessonDto,

} from '../../../core/models/dtos';
export interface QuestionOptionDto {
  optionId: number;
  optionText: string;
  optionCode: string;
  sortOrder: number;
  isCorrect: boolean;
}

export interface QuestionBankDto {
  questionId: number;
  questionText: string;
  questionType: number;
  difficulty: number;
  points: number;
  explanation?: string | null;
  isActive: boolean;
  createdAt: string;
  options: QuestionOptionDto[];
}

export interface QuizResultDto {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  batchId: number;
  batchName: string;
  traineeId: number;
  traineeName: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  score: number;
  percentage: number;
  status: string;
  // نتيجة التقييم
  passingPercentage: number;

  // هل اكتمل تصحيح جميع الأسئلة؟
  isGradingCompleted: boolean;

  // null عندما لم يكتمل التصحيح
  isPassed: boolean | null;

}
export interface AttemptAnswerDetailsDto {
  attemptQuestionId: number;
  questionId: number;
  questionOrder: number;
  questionText: string;
  questionType: string;
  points: number;

  selectedOptionId?: number | null;
  selectedOptionText?: string | null;

  textAnswer?: string | null;

  isCorrect?: boolean | null;

  awardedPoints: number;

  isManuallyGraded: boolean;

  isMarkedForReview: boolean;
}

export interface QuizAttemptFullDetailsDto {
  attemptId: number;
  quizId: number;
  quizTitle: string;

  attemptNumber: number;

  status: string;

  score: number;
  percentage: number;

  startedAt: string;
  submittedAt: string | null;

  answers: AttemptAnswerDetailsDto[];
}

export interface CreateQuestionOptionDto {
  optionText: string;
  optionCode: string;
  sortOrder: number;
  isCorrect: boolean;
}

export interface CreateQuestionDto {
  questionText: string;
  questionType: number;
  difficulty: number;
  points: number;
  explanation?: string | null;
  options: CreateQuestionOptionDto[];
}

export interface GradeQuizAnswerDto {
  answerId: number;
  trainerId: number;
  awardedPoints: number;
}

export interface QuizAnswerDetailsDto {
  answerId: number;
  attemptQuestionId: number;
  questionId: number;
  questionOrder: number;
  questionText: string;
  questionType: string;
  selectedOptionId: number | null;
  selectedOptionText: string | null;
  textAnswer: string | null;
  maxPoints: number;
  awardedPoints: number;
  isCorrect: boolean | null;
  isManuallyGraded: boolean;
  isMarkedForReview: boolean;
  requiresManualGrading: boolean;
}

export interface QuizAttemptDetailsDto {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  traineeId: number;
  traineeName: string;
  attemptNumber: number;
  status: string;
  score: number;
  percentage: number;
  passingPercentage: number;
  isGradingCompleted: boolean;
  isPassed: boolean | null;
  answers: QuizAnswerDetailsDto[];
}

export interface TrainerLiveSessionDto {
  sessionId: number;
  batchId: number;
  trainerId: number;
  topic: string | null;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
  meetingLink: string | null;
  learningObjectives: string | null;
  summary: string | null;
  recordingUrl: string | null;
  status: number | string;
  isLive: boolean | null;
  isRecordingVisibleToTrainees: boolean;
}

export interface TrainerLiveSessionPageDto {
  items: TrainerLiveSessionDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface TrainerLiveSessionFormDto {
  topic: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  meetingLink?: string | null;
  learningObjectives: string;
}

export type TrainerAttendanceStatus = 0 | 1 | 2 | 3;

export interface TrainerSessionAttendanceDto {
  attendanceId: number;
  sessionId: number;
  traineeId: number;
  status: TrainerAttendanceStatus | null;
  note: string | null;
}

export interface UpdateTrainerSessionAttendanceDto {
  status: TrainerAttendanceStatus;
  note: string | null;
}

export interface TrainerLiveRoomStartResponse {
  success: boolean;
  message: string;
}

export interface TrainerLiveRoomJoinResponse {
  sessionId: number;
  roomName: string;
  serverUrl: string;
  participantToken: string;
  tokenExpiresAtUtc: string;
}

export interface TrainerLiveRoomDetailsResponse {
  sessionId: number;
  roomName: string;
  topic: string;
  isLive: boolean;
  participantCount: number;
  isRecording: boolean;
}

export interface LiveAttendanceResponse {
  sessionId: number;
  connectedTraineeCount: number;
  participantIdentities: string[];
  enrolledConnectedTrainees: Array<{
    userId: number;
    traineeId: number;
  }>;
}
export interface TrainerLivePollOption {
  optionId: number;
  optionText: string;
  sortOrder: number;
}

export interface TrainerLivePoll {
  pollId: number;
  sessionId: number;
  question: string;
  isOpen: boolean;
  createdAtUtc: string;
  closedAtUtc: string | null;
  totalVotes: number;
  options: TrainerLivePollOption[];
}

export interface TrainerLivePollListResponse {
  sessionId: number;
  polls: TrainerLivePoll[];
}

export interface TrainerLivePollResultsResponse {
  pollId: number;
  sessionId: number;
  question: string;
  isOpen: boolean;
  closedAtUtc: string | null;
  totalVotes: number;
  results: Array<{
    optionId: number;
    optionText: string;
    sortOrder: number;
    voteCount: number;
    percentage: number;
  }>;
}
export interface TrainerLiveSessionReport {
  sessionId: number;
  topic: string | null;
  status: number | string;
  attendance: {
    totalEnrolled: number;
    recordedCount: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    notRecordedCount: number;
    presentPercentage: number;
  };
  totalPolls: number;
  polls: Array<{
    pollId: number;
    question: string;
    isOpen: boolean;
    closedAtUtc: string | null;
    totalVotes: number;
    options: Array<{
      optionId: number;
      optionText: string;
      voteCount: number;
    }>;
  }>;
}
@Injectable({ providedIn: 'root' })
export class TrainerApi {

  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  // =====================================================
  // Dashboard / Batches
  // =====================================================

  /**
   * Retrieves the trainer profile associated with
   * the currently logged-in user's UserId.
   */
  getTrainerByUserId(
    userId: number
  ): Observable<TrainerDto> {

    return this.http.get<TrainerDto>(
      `${this.base}/Trainer/by-user/${userId}`
    );
  }

  /**
   * Retrieves all batches assigned to a trainer.
   */
  getMyBatches(
    trainerId: number
  ): Observable<TrainerBatchDto[]> {

    return this.http.get<TrainerBatchDto[]>(
      `${this.base}/BatchTrainer/trainer/${trainerId}`
    );
  }

  /**
   * Retrieves full batch details.
   */
  getBatch(
    batchId: number
  ): Observable<BatchDto> {

    return this.http.get<BatchDto>(
      `${this.base}/Batch/${batchId}`
    );
  }

  /**
   * Retrieves program details.
   */
  getProgram(
    programId: number
  ): Observable<ProgramDto> {

    return this.http.get<ProgramDto>(
      `${this.base}/Program/${programId}`
    );
  }

  /**
   * Retrieves all sessions assigned to a trainer.
   */
  getTrainerSessions(
    trainerId: number
  ): Observable<SessionDto[]> {

    const params = new HttpParams()
      .set(
        'trainerId',
        trainerId.toString()
      );

    return this.http.get<SessionDto[]>(
      `${this.base}/Session`,
      { params }
    );
  }

  updateSessionStatus(
    sessionId: number,
    status: number
  ): Observable<void> {
    return this.http.put<void>(
      `${this.base}/Session/${sessionId}/status`,
      { status }
    );
  }

  createSession(dto: unknown) {
    return this.http.post(
      `${this.base}/Session`,
      dto
    );
  }


  // ============================================
  // LIVE SESSIONS - GET BY BATCH
  // ============================================

  getBatchLiveSessions(
    batchId: number
  ): Observable<SessionDto[]> {

    const params = new HttpParams()
      .set('batchId', batchId.toString());

    return this.http.get<SessionDto[]>(
      `${this.base}/Session`,
      { params }
    );
  }

  // ============================================
  // LIVE SESSIONS - UPDATE
  // ============================================

  updateSession(
    sessionId: number,
    dto: {
      topic?: string | null;
      meetingLink?: string | null;
      learningObjectives?: string | null;
      recordingUrl?: string | null;
      summary?: string | null;
    }
  ): Observable<void> {

    return this.http.put<void>(
      `${this.base}/Session/${sessionId}`,
      dto
    );
  }

  /**
   * Retrieves trainees assigned to a specific batch.
   */
  getBatchTrainees(
    batchId: number
  ) {

    return this.http.get<unknown[]>(
      `${this.base}/Batch/${batchId}/trainees`
    );
  }

  /**
   * Creates a new announcement.
   */
  postAnnouncement(
    dto: unknown
  ) {

    return this.http.post(
      `${this.base}/Announcement`,
      dto
    );
  }


  // =====================================================
  // Content
  // =====================================================
  getBatchProgress(
    batchId: number
  ): Observable<{
    batchId: number;
    totalTrainees: number;
    totalModules: number;
    completedModules: number;
    progressPercentage: number;
  }> {

    return this.http.get<{
      batchId: number;
      totalTrainees: number;
      totalModules: number;
      completedModules: number;
      progressPercentage: number;
    }>(
      `${this.base}/Batch/${batchId}/progress`
    );
  }

  getModulesByProgram(
    programId: number
  ): Observable<ModuleDto[]> {

    return this.http.get<ModuleDto[]>(
      `${this.base}/Module/program/${programId}`
    );
  }

  getLessonsByModule(
    moduleId: number
  ): Observable<LessonDto[]> {

    return this.http.get<LessonDto[]>(
      `${this.base}/Lesson/module/${moduleId}`
    );
  }

  createModule(
    dto: {
      programId: number;
      title: string;
      orderIndex: number;
      availableFrom?: string | null;
      availableTo?: string | null;
      prerequisiteModuleId?: number | null;
    }
  ): Observable<ModuleDto> {

    return this.http.post<ModuleDto>(
      `${this.base}/Module`,
      dto
    );
  }
  // =====================================================
  // UPDATE MODULE
  // Used for archiving and restoring modules.
  // =====================================================

  updateModule(
    moduleId: number,
    dto: {
      title: string;
      orderIndex: number;
      availableFrom?: string | null;
      availableTo?: string | null;
      isArchived: boolean;
      prerequisiteModuleId?: number | null;
    }
  ): Observable<void> {

    return this.http.put<void>(
      `${this.base}/Module/${moduleId}`,
      dto
    );

  }

  createLesson(
    dto: {
      moduleId: number;
      title: string;
      contentBody?: string | null;
      orderIndex: number;
    }
  ): Observable<LessonDto> {

    return this.http.post<LessonDto>(
      `${this.base}/Lesson`,
      dto
    );
  }

  createMaterial(
    dto: {
      fileUrl: string;
      fileType:
      | 'Pdf'
      | 'Video'
      | 'Image'
      | 'Document'
      | 'Link'
      | 'Other';
      lessonId: number;
      uploadedByUserId: number;
    }
  ): Observable<unknown> {

    return this.http.post(
      `${this.base}/TrainingMaterial`,
      dto
    );
  }

  uploadTrainingMaterial(
    file: File,
    fileType:
      | 'Pdf'
      | 'Video'
      | 'Image'
      | 'Document'
      | 'Other',
    lessonId: number,
    uploadedByUserId: number
  ): Observable<unknown> {

    const formData =
      new FormData();

    formData.append(
      'File',
      file
    );

    formData.append(
      'FileType',
      fileType
    );

    formData.append(
      'LessonId',
      lessonId.toString()
    );

    formData.append(
      'UploadedByUserId',
      uploadedByUserId.toString()
    );

    return this.http.post(
      `${this.base}/TrainingMaterial/upload`,
      formData
    );
  }

  getTrainingMaterialsByLesson(
    lessonId: number
  ): Observable<TrainingMaterialDto[]> {

    return this.http.get<TrainingMaterialDto[]>(
      `${this.base}/TrainingMaterial/lesson/${lessonId}`
    );
  }
  // =====================================================
  // DELETE TRAINING MATERIAL
  // =====================================================

  deleteTrainingMaterial(
    materialId: number
  ): Observable<void> {

    return this.http.delete<void>(
      `${this.base}/TrainingMaterial/${materialId}`
    );
  }
  // =====================================================
  // Attendance
  // =====================================================

  // No batch-scoped "today" endpoint exists on the backend,
  // so this reads company-scoped attendance for the day.

  getTodayAttendanceForCompany(
    companyId: number
  ): Observable<DailyAttendanceDto[]> {

    return this.http.get<DailyAttendanceDto[]>(
      `${this.base}/DailyAttendance/company/${companyId}/today`
    );
  }

  checkIn(
    dto: unknown
  ) {

    return this.http.post(
      `${this.base}/DailyAttendance/check-in`,
      dto
    );
  }

  updateAttendance(
    id: number,
    dto: unknown
  ) {

    return this.http.put(
      `${this.base}/DailyAttendance/${id}`,
      dto
    );
  }

  getPendingExcuses(): Observable<ExcuseDto[]> {

    return this.http.get<ExcuseDto[]>(
      `${this.base}/Excuse/pending`
    );
  }

  reviewExcuse(
    id: number,
    dto: unknown
  ) {

    return this.http.put(
      `${this.base}/Excuse/${id}/review`,
      dto
    );
  }

  reportRepeatedAbsence(
    dto: unknown
  ) {

    return this.http.post(
      `${this.base}/Warning`,
      dto
    );
  }


  // =====================================================
  // Tasks
  // =====================================================

  getTasksByBatch(
    batchId: number
  ): Observable<TaskDto[]> {

    return this.http.get<TaskDto[]>(
      `${this.base}/Task/batch/${batchId}`
    );
  }

  createTask(
    dto: unknown
  ) {

    return this.http.post(
      `${this.base}/Task`,
      dto
    );
  }

  // Updates task information or status.
  updateTask(
    id: number,
    dto: unknown
  ) {

    return this.http.put(
      `${this.base}/Task/${id}`,
      dto
    );
  }

  // Deletes a task.
  deleteTask(
    id: number
  ) {

    return this.http.delete(
      `${this.base}/Task/${id}`
    );
  }

  gradeSubmission(
    id: number,
    dto: unknown
  ) {

    return this.http.put(
      `${this.base}/Submission/${id}/grade`,
      dto
    );
  }

  reopenSubmission(
    id: number
  ) {

    return this.http.put(
      `${this.base}/Submission/${id}/reopen`,
      {}
    );
  }

  getSubmissionsByTask(
    taskId: number
  ): Observable<SubmissionDto[]> {

    return this.http.get<SubmissionDto[]>(
      `${this.base}/Submission/task/${taskId}`
    );
  }

  // =====================================================
  // TRAINER TASK SUBMISSIONS
  // =====================================================

  getTrainerTaskSubmissions(
    taskId: number
  ): Observable<SubmissionDto[]> {

    return this.http.get<SubmissionDto[]>(
      `${this.base}/Submission/task/${taskId}/trainer-view`
    );
  }

  // =====================================================
  // GET REAL SUBMISSION FILE
  // =====================================================

  getSubmissionFile(
    submissionId: number
  ): Observable<Blob> {

    return this.http.get(
      `${this.base}/Submission/${submissionId}/file`,
      {
        responseType: 'blob'
      }
    );

  }

  // =====================================================
  // Trainee Evaluation
  // =====================================================

  getEnrollments(
    companyId?: number,
    batchId?: number
  ): Observable<EnrollmentDto[]> {

    let params = new HttpParams();

    if (companyId) {

      params = params.set(
        'companyId',
        companyId.toString()
      );
    }

    if (batchId) {

      params = params.set(
        'batchId',
        batchId.toString()
      );
    }

    return this.http.get<EnrollmentDto[]>(
      `${this.base}/Enrollment`,
      { params }
    );
  }

  getEvaluationAverage(
    enrollmentId: number
  ): Observable<{
    enrollmentId: number;
    averageScore: number;
  }> {

    return this.http.get<{
      enrollmentId: number;
      averageScore: number;
    }>(
      `${this.base}/Evaluation/enrollment/${enrollmentId}/average`
    );
  }
  /**
   * Retrieves the average evaluation score
   * for a specific enrollment.
   */
  getAttendanceComplianceRate(
    enrollmentId: number
  ): Observable<{
    enrollmentId: number;
    totalDays: number;
    presentDays: number;
    compliancePercentage: number;
  }> {

    return this.http.get<{
      enrollmentId: number;
      totalDays: number;
      presentDays: number;
      compliancePercentage: number;
    }>(
      `${this.base}/DailyAttendance/enrollment/${enrollmentId}/compliance-rate`
    );
  }

  getEvaluationTemplates(
    moduleId?: number,
    stage?: number
  ): Observable<EvaluationTemplateDto[]> {

    let params = new HttpParams();

    if (moduleId) {

      params = params.set(
        'moduleId',
        moduleId.toString()
      );
    }

    if (stage) {

      params = params.set(
        'stage',
        stage.toString()
      );
    }

    return this.http.get<EvaluationTemplateDto[]>(
      `${this.base}/EvaluationTemplate/GetTemplates`,
      { params }
    );
  }

  getTemplateDetail(
    templateId: number
  ): Observable<EvaluationTemplateDetailDto> {

    return this.http.get<EvaluationTemplateDetailDto>(
      `${this.base}/EvaluationTemplate/GetTemplateById/${templateId}`
    );
  }
  // =====================================================
  // CHECK EVALUATION TEMPLATE WEIGHTS
  // =====================================================

  checkTemplateWeights(
    templateId: number
  ): Observable<{
    templateId: number;
    isValid: boolean;
  }> {

    return this.http.get<{
      templateId: number;
      isValid: boolean;
    }>(
      `${this.base}/EvaluationCriterion/CheckWeights/${templateId}`
    );

  }

  createTemplate(
    dto: unknown
  ) {

    return this.http.post(
      `${this.base}/EvaluationTemplate/CreateTemplate`,
      dto
    );
  }

  createCriterion(
    dto: unknown
  ): Observable<string> {

    return this.http.post(
      `${this.base}/EvaluationCriterion/CreateCriterion`,
      dto,
      {
        responseType: 'text'
      }
    );
  }
  // =====================================================
  // UPDATE EVALUATION CRITERION
  // =====================================================

  updateCriterion(
    criteriaId: number,
    dto: {
      templateId: number;
      name: string;
      weight: number;
      maxPoints: number;
    }
  ): Observable<string> {

    return this.http.put(
      `${this.base}/EvaluationCriterion/UpdateCriterion/${criteriaId}`,
      dto,
      {
        responseType: 'text'
      }
    );

  }

  // =====================================================
  // DELETE EVALUATION CRITERION
  // =====================================================

  deleteCriterion(
    criteriaId: number
  ): Observable<string> {

    return this.http.delete(
      `${this.base}/EvaluationCriterion/DeleteCriterion/${criteriaId}`,
      {
        responseType: 'text'
      }
    );

  }

  submitEvaluation(
    dto: unknown
  ) {

    return this.http.post(
      `${this.base}/Evaluation`,
      dto
    );
  }

  getTrainerFeedback(
    trainerId: number
  ): Observable<FeedbackSummaryDto> {

    return this.http.get<FeedbackSummaryDto>(
      `${this.base}/Feedback/trainer/${trainerId}`
    );
  }

  // =====================================================
  // Reports
  // =====================================================

  getTrainerKpis(
    trainerId: number
  ): Observable<TrainerKpisDto> {

    return this.http.get<TrainerKpisDto>(
      `${this.base}/Report/trainer-kpis/${trainerId}`
    );
  }

  // =====================================================
  // TRAINER REPORT HISTORY
  // =====================================================

  // Retrieves reports generated by the current trainer user.
  getTrainerReports(
    userId: number
  ): Observable<{
    reportId: number;
    type:
    | 'Attendance'
    | 'Performance'
    | 'Financial'
    | 'Enrollment'
    | 'Custom';
    filtersJson?: string | null;
    generatedAt: string;
    fileUrl?: string | null;
    generatedByUserId: number;
  }[]> {

    const params =
      new HttpParams()
        .set(
          'userId',
          userId.toString()
        );

    return this.http.get<{
      reportId: number;
      type:
      | 'Attendance'
      | 'Performance'
      | 'Financial'
      | 'Enrollment'
      | 'Custom';
      filtersJson?: string | null;
      generatedAt: string;
      fileUrl?: string | null;
      generatedByUserId: number;
    }[]>(
      `${this.base}/Report`,
      { params }
    );
  }

  // Shared report generator.
  // Keep this unchanged because other portals may use it.
  generateReport(
    dto: {
      type:
      | 'Attendance'
      | 'Performance'
      | 'Financial'
      | 'Enrollment'
      | 'Custom';
      filtersJson?: string;
      generatedByUserId: number;
      trainerId?: number;
    }
  ) {

    return this.http.post<{
      reportId: number;
      type: string;
      filtersJson?: string;
      generatedAt: string;
      fileUrl?: string;
      generatedByUserId: number;
    }>(
      `${this.base}/Report/generate`,
      dto
    );
  }

  // =====================================================
  // TRAINER PORTAL REPORT
  // =====================================================

  // Uses the dedicated Trainer Portal report endpoint
  // without affecting reports used by other portals.
  generateTrainerPortalReport(
    dto: {
      type:
      | 'Attendance'
      | 'Performance'
      | 'Financial'
      | 'Enrollment'
      | 'Custom';
      filtersJson?: string;
      generatedByUserId: number;
      trainerId?: number;
    }
  ) {

    return this.http.post<{
      reportId: number;
      type: string;
      filtersJson?: string;
      generatedAt: string;
      fileUrl?: string;
      generatedByUserId: number;
    }>(
      `${this.base}/Report/trainer-generate`,
      dto
    );
  }

  // =====================================================
  //  GENERATE TRAINER TRAINEES REPORT
  // =====================================================

  generateTrainerTraineesReport(
    dto: {
      trainerId: number;
      batchId?: number | null;
      generatedByUserId: number;
    }
  ): Observable<{
    reportId: number;
    type: string;
    filtersJson?: string | null;
    generatedAt: string;
    fileUrl?: string | null;
    generatedByUserId: number;
  }> {

    return this.http.post<{
      reportId: number;
      type: string;
      filtersJson?: string | null;
      generatedAt: string;
      fileUrl?: string | null;
      generatedByUserId: number;
    }>(
      `${this.base}/Report/trainer-trainees`,
      dto
    );
  }


  downloadReport(
    reportId: number
  ): Observable<Blob> {

    return this.http.get(
      `${this.base}/Report/${reportId}/download`,
      {
        responseType: 'blob'
      }
    );
  }

  // =====================================================
  // TRAINER PORTAL REPORT FILE
  // =====================================================

  // Loads a Trainer Portal PDF from the dedicated
  // external-storage endpoint without affecting
  // the shared report download behavior.
  getTrainerPortalReportFile(
    reportId: number
  ): Observable<Blob> {
    return this.http.get(
      `${this.base}/Report/trainer/${reportId}/file`,
      {
        responseType: 'blob'
      }
    );
  }
  // =====================================================
  // SESSIONS FOR BATCH
  // =====================================================
  getSessions(batchId: number): Observable<any[]> {
    const params = new HttpParams().set('batchId', batchId.toString());
    return this.http.get<any[]>(`${this.base}/Session`, { params });
  }
  // =====================================================
  // Messaging
  // =====================================================

  getConversations(
    participantUserId: number
  ): Observable<any[]> {

    const params = new HttpParams()
      .set(
        'type',
        'Other'
      )
      .set(
        'participantUserId',
        participantUserId.toString()
      );

    return this.http.get<any[]>(
      `${this.base}/Conversation`,
      { params }
    );
  }

  getConversation(
    conversationId: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.base}/Conversation/${conversationId}`
    );
  }
  createConversation(dto: {
    type: string;
    category: string;
    subject: string;
    startedByUserId: number;
    firstMessage: string;
    receiverUserId: number;
  }): Observable<any> {
    const formData = new FormData();

    formData.append('Type', dto.type);
    formData.append('Category', dto.category);
    formData.append('Subject', dto.subject);
    formData.append(
      'StartedByUserId',
      String(dto.startedByUserId)
    );
    formData.append('FirstMessage', dto.firstMessage);
    formData.append('ReceiverUserId', String(dto.receiverUserId));

    return this.http.post<any>(
      `${this.base}/Conversation`,
      formData
    );
  }

  createBatchGroup(dto: {
    batchId: number;
    trainerUserId: number;
  }): Observable<any> {

    return this.http.post<any>(
      `${this.base}/Conversation/batch-group`,
      dto
    );
  }
  sendMessage(
    conversationId: number,
    dto: {
      senderId: number;
      receiverUserId: number | null;
      content: string;
    }
  ): Observable<any> {

    return this.http.post<any>(
      `${this.base}/Conversation/${conversationId}/messages`,
      dto
    );
  }

  markConversationAsRead(
    conversationId: number,
    userId: number
  ): Observable<void> {

    return this.http.put<void>(
      `${this.base}/Conversation/${conversationId}/read?userId=${userId}`,
      {}
    );
  }
  // =====================================================
  // Profile
  // =====================================================

  getTrainer(
    id: number
  ): Observable<TrainerDto> {

    return this.http.get<TrainerDto>(
      `${this.base}/Trainer/${id}`
    );
  }

  updateTrainer(
    id: number,
    dto: unknown
  ) {

    return this.http.put(
      `${this.base}/Trainer/${id}`,
      dto
    );
  }
  // =====================================================
  // TRAINER PROFILE IMAGE
  // =====================================================

  uploadTrainerProfileImage(
    trainerId: number,
    file: File
  ): Observable<{ profileImageUrl: string }> {

    const formData =
      new FormData();

    formData.append(
      'File',
      file
    );

    return this.http.post<{
      profileImageUrl: string;
    }>(
      `${this.base}/Trainer/${trainerId}/profile-image`,
      formData
    );
  }
  // =====================================================
  // TRAINER CERTIFICATES
  // =====================================================

  getTrainerCertificates(
    trainerId: number
  ): Observable<TrainerCertificateDto[]> {
    return this.http.get<TrainerCertificateDto[]>(
      `${this.base}/TrainerCertificate/trainer/${trainerId}`
    );
  }

  uploadTrainerCertificate(
    trainerId: number,
    certificateName: string,
    issuer: string,
    issueDate: string,
    expiryDate: string,
    file: File
  ): Observable<TrainerCertificateDto> {
    const formData = new FormData();

    formData.append('CertificateName', certificateName);
    formData.append('Issuer', issuer || '');
    formData.append('IssueDate', issueDate || '');
    formData.append('ExpiryDate', expiryDate || '');
    formData.append('File', file);

    return this.http.post<TrainerCertificateDto>(
      `${this.base}/TrainerCertificate/trainer/${trainerId}`,
      formData
    );
  }

  deleteTrainerCertificate(
    certificateId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/TrainerCertificate/${certificateId}`
    );
  }

  // =====================================
  // QUIZZES - الاختبارات
  // =====================================

  getTrainerQuizzes(trainerId: number) {
    return this.http.get<any[]>(
      `${this.base}/Quizzes/trainer/${trainerId}`
    );
  }

  createQuiz(trainerId: number, dto: any) {
    const params = new HttpParams()
      .set('trainerId', trainerId.toString());

    return this.http.post(
      `${this.base}/Quizzes`,
      dto,
      { params }
    );
  }

  updateQuiz(
    quizId: number,
    trainerId: number,
    dto: any
  ) {
    const params = new HttpParams()
      .set('trainerId', trainerId.toString());

    return this.http.put(
      `${this.base}/Quizzes/${quizId}`,
      dto,
      { params }
    );
  }
  // =====================================
  // QUESTION BANK - بنك الأسئلة
  // =====================================

  getTrainerQuestions(
    trainerId: number
  ): Observable<QuestionBankDto[]> {
    return this.http.get<QuestionBankDto[]>(
      `${this.base}/question-bank/trainer/${trainerId}`
    );
  }

  getQuestion(
    questionId: number,
    trainerId: number
  ): Observable<QuestionBankDto> {

    const params = new HttpParams()
      .set('trainerId', trainerId.toString());

    return this.http.get<QuestionBankDto>(
      `${this.base}/question-bank/${questionId}`,
      { params }
    );
  }

  createQuestion(
    trainerId: number,
    dto: CreateQuestionDto
  ): Observable<QuestionBankDto> {

    const params = new HttpParams()
      .set('trainerId', trainerId.toString());

    return this.http.post<QuestionBankDto>(
      `${this.base}/question-bank`,
      dto,
      { params }
    );
  }

  updateQuestion(
    questionId: number,
    trainerId: number,
    dto: CreateQuestionDto
  ): Observable<{ message: string }> {

    const params = new HttpParams()
      .set('trainerId', trainerId.toString());

    return this.http.put<{ message: string }>(
      `${this.base}/question-bank/${questionId}`,
      dto,
      { params }
    );
  }

  deactivateQuestion(
    questionId: number,
    trainerId: number
  ): Observable<{ message: string }> {

    const params = new HttpParams()
      .set('trainerId', trainerId.toString());

    return this.http.delete<{ message: string }>(
      `${this.base}/question-bank/${questionId}`,
      { params }
    );
  }

  addQuestionsToQuiz(
    quizId: number,
    trainerId: number,
    questionIds: number[]
  ): Observable<{ message: string }> {

    const params = new HttpParams()
      .set('trainerId', trainerId.toString());

    return this.http.post<{ message: string }>(
      `${this.base}/quizzes/${quizId}/questions`,
      { questionIds },
      { params }
    );
  }

  getQuizQuestions(
    quizId: number,
    trainerId: number
  ): Observable<any[]> {

    const params = new HttpParams()
      .set('trainerId', trainerId.toString());

    return this.http.get<any[]>(
      `${this.base}/quizzes/${quizId}/questions`,
      { params }
    );
  }

  // =====================================
  // QUIZ RESULTS
  // =====================================

  getTrainerQuizResults(
    trainerId: number,
    quizId?: number
  ): Observable<QuizResultDto[]> {

    let params = new HttpParams();

    if (quizId !== undefined) {
      params = params.set(
        'quizId',
        quizId.toString()
      );
    }

    return this.http.get<QuizResultDto[]>(
      `${this.base}/quiz-results/trainer/${trainerId}`,
      { params }
    );

  }



  gradeEssayAnswer(dto: GradeQuizAnswerDto): Observable<{ message: string }> {

    return this.http.post<{ message: string }>(
      `${this.base}/quiz-attempts/grade-essay`,
      dto
    );
  }

  getQuizAttemptDetails(
    trainerId: number,
    attemptId: number
  ): Observable<QuizAttemptDetailsDto> {

    return this.http.get<QuizAttemptDetailsDto>(
      `${this.base}/quiz-results/trainer/${trainerId}/attempts/${attemptId}`
    );
  }

  // ==========================================
  // TRAINER LIVE SESSIONS
  // ==========================================

  getLiveSessionsByBatch(
    batchId: number,
    page = 1,
    pageSize = 100
  ): Observable<TrainerLiveSessionPageDto> {
    const params = new HttpParams()
      .set('batchId', String(batchId))
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    return this.http.get<TrainerLiveSessionPageDto>(
      `${this.base}/trainer/live-sessions`,
      { params }
    );
  }

  createTrainerLiveSession(
    dto: TrainerLiveSessionFormDto & { batchId: number }
  ): Observable<TrainerLiveSessionDto> {
    return this.http.post<TrainerLiveSessionDto>(
      `${this.base}/trainer/live-sessions`,
      dto
    );
  }

  updateTrainerLiveSession(
    sessionId: number,
    dto: TrainerLiveSessionFormDto
  ): Observable<TrainerLiveSessionDto> {
    return this.http.put<TrainerLiveSessionDto>(
      `${this.base}/trainer/live-sessions/${sessionId}`,
      dto
    );
  }

  changeTrainerLiveSessionStatus(
    sessionId: number,
    status: number
  ): Observable<TrainerLiveSessionDto> {
    return this.http.put<TrainerLiveSessionDto>(
      `${this.base}/trainer/live-sessions/${sessionId}/status`,
      { status }
    );
  }

  getTrainerSessionAttendance(
    sessionId: number
  ): Observable<TrainerSessionAttendanceDto[]> {
    return this.http.get<TrainerSessionAttendanceDto[]>(
      `${this.base}/trainer/live-sessions/${sessionId}/attendance`
    );
  }
getLiveAttendance(
  sessionId: number
): Observable<LiveAttendanceResponse> {
  return this.http.get<LiveAttendanceResponse>(
    `${this.base}/trainer/live-sessions/${sessionId}/room/attendance/live`
  );
}

  updateTrainerSessionAttendance(
    sessionId: number,
    traineeId: number,
    dto: UpdateTrainerSessionAttendanceDto
  ): Observable<TrainerSessionAttendanceDto> {
    return this.http.put<TrainerSessionAttendanceDto>(
      `${this.base}/trainer/live-sessions/${sessionId}/attendance/${traineeId}`,
      dto
    );
  }

  startTrainerLiveRoom(
    sessionId: number
  ): Observable<TrainerLiveRoomStartResponse> {
    return this.http.post<TrainerLiveRoomStartResponse>(
      `${this.base}/trainer/live-sessions/${sessionId}/room/start`,
      {}
    );
  }

  joinTrainerLiveRoom(
    sessionId: number
  ): Observable<TrainerLiveRoomJoinResponse> {
    return this.http.post<TrainerLiveRoomJoinResponse>(
      `${this.base}/trainer/live-sessions/${sessionId}/room/join`,
      {}
    );
  }

  getTrainerLiveRoom(
    sessionId: number
  ): Observable<TrainerLiveRoomDetailsResponse> {
    return this.http.get<TrainerLiveRoomDetailsResponse>(
      `${this.base}/trainer/live-sessions/${sessionId}/room`
    );
  }
getTrainerLivePolls(
  sessionId: number
): Observable<TrainerLivePollListResponse> {
  return this.http.get<TrainerLivePollListResponse>(
    `${this.base}/trainer/live-sessions/${sessionId}/polls`
  );
}

createTrainerLivePoll(
  sessionId: number,
  dto: { question: string; options: string[] }
): Observable<TrainerLivePoll> {
  return this.http.post<TrainerLivePoll>(
    `${this.base}/trainer/live-sessions/${sessionId}/polls`,
    dto
  );
}

openTrainerLivePoll(
  sessionId: number,
  pollId: number
): Observable<unknown> {
  return this.http.post(
    `${this.base}/trainer/live-sessions/${sessionId}/polls/${pollId}/open`,
    {}
  );
}

closeTrainerLivePoll(
  sessionId: number,
  pollId: number
): Observable<unknown> {
  return this.http.post(
    `${this.base}/trainer/live-sessions/${sessionId}/polls/${pollId}/close`,
    {}
  );
}

getTrainerLivePollResults(
  sessionId: number,
  pollId: number
): Observable<TrainerLivePollResultsResponse> {
  return this.http.get<TrainerLivePollResultsResponse>(
    `${this.base}/trainer/live-sessions/${sessionId}/polls/${pollId}/results`
  );
}
getTrainerLiveSessionReport(
  sessionId: number
): Observable<TrainerLiveSessionReport> {
  return this.http.get<TrainerLiveSessionReport>(
    `${this.base}/trainer/live-sessions/${sessionId}/report`
  );
}
}
