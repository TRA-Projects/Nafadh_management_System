
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

  private readonly baseUrl = this.buildBaseUrl(
    environment.apiBaseUrl,
  );

  private buildBaseUrl(apiBaseUrl: string): string {
    const normalizedUrl = apiBaseUrl.replace(/\/+$/, '');

    const urlWithApi = /\/api$/i.test(normalizedUrl)
      ? normalizedUrl
      : `${normalizedUrl}/api`;

    return `${urlWithApi}/Announcement`;
  }

  getAll(): Observable<AnnouncementDto[]> {
    return this.http.get<AnnouncementDto[]>(this.baseUrl);
  }

  getById(id: number): Observable<AnnouncementDto> {
    return this.http.get<AnnouncementDto>(
      `${this.baseUrl}/${id}`,
    );
  }

  create(dto: CreateAnnouncementDto): Observable<string> {
    return this.http.post(this.baseUrl, dto, {
      responseType: 'text',
    });
  }

  update(
    id: number,
    dto: UpdateAnnouncementDto,
  ): Observable<string> {
    return this.http.put(`${this.baseUrl}/${id}`, dto, {
      responseType: 'text',
    });
  }

  delete(id: number): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${id}`, {
      responseType: 'text',
    });
  }
}
