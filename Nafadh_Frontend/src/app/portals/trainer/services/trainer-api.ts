import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DailyAttendanceDto, EnrollmentDto, EvaluationTemplateDto, EvaluationTemplateDetailDto, ExcuseDto,
  FeedbackSummaryDto,   SessionDto,SubmissionDto, TaskDto, TrainerBatchDto, TrainerDto, TrainerKpisDto,
} from '../../../core/models/dtos';

@Injectable({ providedIn: 'root' })
export class TrainerApi {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  // Dashboard / Batches

getMyBatches(trainerId: number): Observable<TrainerBatchDto[]> {
  return this.http.get<TrainerBatchDto[]>(
    `${this.base}/BatchTrainer/trainer/${trainerId}`
  );
}

getTrainerSessions(trainerId: number): Observable<SessionDto[]> {
  const params = new HttpParams()
    .set('trainerId', trainerId.toString());

  return this.http.get<SessionDto[]>(
    `${this.base}/Session`,
    { params }
  );
}

getBatchTrainees(batchId: number) {
  return this.http.get<unknown[]>(
    `${this.base}/Batch/${batchId}/trainees`
  );
}

postAnnouncement(dto: unknown) {
  return this.http.post(
    `${this.base}/Announcement`,
    dto
  );
}

 

  // Content
  createModule(dto: unknown) { return this.http.post(`${this.base}/Module`, dto); }
  createLesson(dto: unknown) { return this.http.post(`${this.base}/Lesson`, dto); }
  createMaterial(dto: unknown) { return this.http.post(`${this.base}/TrainingMaterial`, dto); }

  // Attendance — no batch-scoped "today" endpoint on the real backend, so this
  // reads company-scoped attendance for the day (closest real equivalent).
  getTodayAttendanceForCompany(companyId: number): Observable<DailyAttendanceDto[]> {
    return this.http.get<DailyAttendanceDto[]>(`${this.base}/DailyAttendance/company/${companyId}/today`);
  }
  checkIn(dto: unknown) { return this.http.post(`${this.base}/DailyAttendance/check-in`, dto); }
  updateAttendance(id: number, dto: unknown) { return this.http.put(`${this.base}/DailyAttendance/${id}`, dto); }
  getPendingExcuses(): Observable<ExcuseDto[]> { return this.http.get<ExcuseDto[]>(`${this.base}/Excuse/pending`); }
  reviewExcuse(id: number, dto: unknown) { return this.http.put(`${this.base}/Excuse/${id}/review`, dto); }
  reportRepeatedAbsence(dto: unknown) { return this.http.post(`${this.base}/Warning`, dto); }

  // Tasks
  getTasksByBatch(batchId: number): Observable<TaskDto[]> {
    return this.http.get<TaskDto[]>(`${this.base}/Task/batch/${batchId}`);
  }
  createTask(dto: unknown) { return this.http.post(`${this.base}/Task`, dto); }
  gradeSubmission(id: number, dto: unknown) { return this.http.put(`${this.base}/Submission/${id}/grade`, dto); }
  reopenSubmission(id: number) { return this.http.put(`${this.base}/Submission/${id}/reopen`, {}); }
  getSubmissionsByTask(taskId: number): Observable<SubmissionDto[]> {
    return this.http.get<SubmissionDto[]>(`${this.base}/Submission/task/${taskId}`);
  }

  // Trainee evaluation
  getEnrollments(companyId: number): Observable<EnrollmentDto[]> {
    let params = new HttpParams().set('companyId', companyId);
    return this.http.get<EnrollmentDto[]>(`${this.base}/Enrollment`, { params });
  }
  getEvaluationTemplates(moduleId?: number, stage?: number): Observable<EvaluationTemplateDto[]> {
    let params = new HttpParams();
    if (moduleId) params = params.set('moduleId', moduleId);
    if (stage) params = params.set('stage', stage);
    return this.http.get<EvaluationTemplateDto[]>(`${this.base}/EvaluationTemplate/GetTemplates`, { params });
  }
  getTemplateDetail(templateId: number): Observable<EvaluationTemplateDetailDto> {
    return this.http.get<EvaluationTemplateDetailDto>(`${this.base}/EvaluationTemplate/GetTemplateById/${templateId}`);
  }
  createTemplate(dto: unknown) { return this.http.post(`${this.base}/EvaluationTemplate/CreateTemplate`, dto); }
  createCriterion(dto: unknown) { return this.http.post(`${this.base}/EvaluationCriterion/CreateCriterion`, dto); }
  submitEvaluation(dto: unknown) { return this.http.post(`${this.base}/Evaluation`, dto); }
  getTrainerFeedback(trainerId: number): Observable<FeedbackSummaryDto> {
    return this.http.get<FeedbackSummaryDto>(`${this.base}/Feedback/trainer/${trainerId}`);
  }

  // Reports
getTrainerKpis(trainerId: number): Observable<TrainerKpisDto> {
  return this.http.get<TrainerKpisDto>(
    `${this.base}/Report/trainer-kpis/${trainerId}`
  );
}

generateReport(dto: {
  type: 'Attendance' | 'Performance' | 'Financial' | 'Enrollment' | 'Custom';
  filtersJson?: string;
  generatedByUserId: number;
  trainerId?: number;
}) {
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

downloadReport(reportId: number): Observable<Blob> {
  return this.http.get(
    `${this.base}/Report/${reportId}/download`,
    {
      responseType: 'blob'
    }
  );
}
  // Profile
  getTrainer(id: number): Observable<TrainerDto> { return this.http.get<TrainerDto>(`${this.base}/Trainer/${id}`); }
  updateTrainer(id: number, dto: unknown) { return this.http.put(`${this.base}/Trainer/${id}`, dto); }
}
