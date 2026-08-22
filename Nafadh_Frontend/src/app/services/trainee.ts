import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TraineeService {
  // رابط الـ API الخاص بـ Backend
  private apiUrl = 'https://localhost:7001/api'; 

  constructor(private http: HttpClient) {}

  getTraineeByUserId(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Trainee/traineeByUserID/${userId}`);
  }
}