import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AnnouncementScopeType = 0 | 1 | 2;

export interface AnnouncementDto {
  announcementId: number;
  scopeType: AnnouncementScopeType;
  scopeId: number | null;
  message: string;
  date: string;
  createdByUserId: number;
}

export interface CreateAnnouncementDto {
  scopeType: AnnouncementScopeType;
  scopeId: number | null;
  message: string;
  createdByUserId: number;
}

export type UpdateAnnouncementDto = Omit<
  CreateAnnouncementDto,
  'createdByUserId'
>;

@Injectable({ providedIn: 'root' })
export class AnnouncementApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    'https://localhost:7082/api/Announcement';

  // جلب جميع الإعلانات
  getAll(): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(this.baseUrl);
  }

  // 0 = Platform, 1 = Company, 2 = Batch
  getByScope(
    scopeType: AnnouncementScopeType,
    scopeId?: number | null,
  ): Observable<AnnouncementDto[]> {
    const scopeUrl =
      `${this.baseUrl}/scope/${scopeType}` +
      (scopeId != null ? `/${scopeId}` : '');

    return this.http.get<AnnouncementDto[]>(scopeUrl);
  }

  // جلب إعلان محدد
  getById(id: number): Observable<AnnouncementDto> {
    return this.http.get<AnnouncementDto>(
      `${this.baseUrl}/${id}`,
    );
  }

  // إضافة إعلان
  create(dto: CreateAnnouncementDto): Observable<string> {
    return this.http.post(this.baseUrl, dto, {
      responseType: 'text',
    });
  }

  // تعديل إعلان
  update(
    id: number,
    dto: UpdateAnnouncementDto,
  ): Observable<string> {
    return this.http.put(
      `${this.baseUrl}/${id}`,
      dto,
      { responseType: 'text' },
    );
  }

  // حذف إعلان
  delete(id: number): Observable<string> {
    return this.http.delete(
      `${this.baseUrl}/${id}`,
      { responseType: 'text' },
    );
  }
}