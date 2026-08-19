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
  TrainerBatchDto,
  TrainerDto,
  TrainerKpisDto,
  BatchDto,
  ProgramDto,
  ModuleDto,
  LessonDto,
} from '../../../core/models/dtos';


@Injectable({ providedIn: 'root' })
export class TrainerApi {

  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}


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
): Observable<unknown[]> {

  return this.http.get<unknown[]>(
    `${this.base}/TrainingMaterial/lesson/${lessonId}`
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
  ) {

    return this.http.post(
      `${this.base}/EvaluationCriterion/CreateCriterion`,
      dto
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

}