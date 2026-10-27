
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  TrainerGuideProgress,
  TrainerGuideProgressStatus
} from '../models/trainer-guide.models';

@Injectable({
  providedIn: 'root'
})
export class TrainerGuideProgressService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    '/api/trainer/user-guide-progress';

  getAll(): Observable<TrainerGuideProgress[]> {
    return this.http.get<TrainerGuideProgress[]>(
      this.apiUrl
    );
  }

  getByGuide(
    guideKey: string
  ): Observable<TrainerGuideProgress> {
    return this.http.get<TrainerGuideProgress>(
      `${this.apiUrl}/${encodeURIComponent(guideKey)}`
    );
  }

  saveProgress(
    guideKey: string,
    status: Extract<
      TrainerGuideProgressStatus,
      'Completed' | 'Skipped'
    >
  ): Observable<TrainerGuideProgress> {
    return this.http.put<TrainerGuideProgress>(
      `${this.apiUrl}/${encodeURIComponent(guideKey)}`,
      { status }
    );
  }
}
