import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Quiz {
  quizId?: number;
  title: string;
  description?: string;
  batchId: number;
  trainerId: number; // تم التعديل هنا من int إلى number
  startDateTime: string;
  endDateTime: string;
  durationMinutes: number;
  status: string;
  randomizeQuestions: boolean;
  maxAttempts: number;
  cameraRequired: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private apiUrl = 'https://localhost:xxxx/api/quizzes'; // استبدلي الـ URL برابط الـ API الفعلي لديكم

  constructor(private http: HttpClient) {}

  getTrainerQuizzes(trainerId: number): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.apiUrl}/trainer/${trainerId}`);
  }

  createQuiz(quiz: Quiz, trainerId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}?trainerId=${trainerId}`, quiz);
  }

  updateQuiz(id: number, quiz: Quiz): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, quiz);
  }
}