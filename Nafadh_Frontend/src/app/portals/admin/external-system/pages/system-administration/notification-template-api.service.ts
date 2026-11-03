import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface NotificationTemplateDto {
  id: number;
  code: string;
  name: string;
  portalCode: string;
  type: 'Email';
  subject: string | null;
  body: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface NotificationTemplateRequest {
  code: string;
  name: string;
  portalCode: string;
  type: 'Email';
  subject: string;
  body: string;
  isActive: boolean;
}

type ApiEnvelope<T> = T | { data?: T; Data?: T };

function unwrap<T>(response: ApiEnvelope<T>): T {
  if (
    response &&
    typeof response === 'object' &&
    !Array.isArray(response)
  ) {
    const envelope = response as { data?: T; Data?: T };

    if (envelope.data !== undefined) return envelope.data;
    if (envelope.Data !== undefined) return envelope.Data;
  }

  return response as T;
}

function normalizeTemplate(
  raw: Record<string, unknown>,
): NotificationTemplateDto {
  return {
    id: Number(raw['id'] ?? raw['Id']),
    code: String(raw['code'] ?? raw['Code'] ?? ''),
    name: String(raw['name'] ?? raw['Name'] ?? ''),
    portalCode: String(
      raw['portalCode'] ?? raw['PortalCode'] ?? '',
    ),
    type: 'Email',
    subject: String(raw['subject'] ?? raw['Subject'] ?? ''),
    body: String(raw['body'] ?? raw['Body'] ?? ''),
    isActive: Boolean(raw['isActive'] ?? raw['IsActive']),
    createdAt: (raw['createdAt'] ?? raw['CreatedAt']) as
      | string
      | undefined,
    updatedAt: (raw['updatedAt'] ?? raw['UpdatedAt'] ?? null) as
      | string
      | null,
  };
}

@Injectable()
export class NotificationTemplateApiService {
  private readonly http = inject(HttpClient);

  // apiBaseUrlInterceptor adds the Backend origin automatically.
  private readonly baseUrl = '/api/NotificationTemplate';

  // GET: /api/NotificationTemplate
  getAll(): Observable<NotificationTemplateDto[]> {
    return this.http
      .get<ApiEnvelope<Record<string, unknown>[]>>(this.baseUrl)
      .pipe(
        map((response) =>
          (unwrap(response) ?? []).map(normalizeTemplate),
        ),
      );
  }

  // GET: /api/NotificationTemplate/{id}
  getById(id: number): Observable<NotificationTemplateDto> {
    return this.http
      .get<ApiEnvelope<Record<string, unknown>>>(
        `${this.baseUrl}/${id}`,
      )
      .pipe(
        map((response) => normalizeTemplate(unwrap(response))),
      );
  }

  // POST: /api/NotificationTemplate
  create(
    request: NotificationTemplateRequest,
  ): Observable<unknown> {
    return this.http.post(this.baseUrl, request);
  }

  // PUT: /api/NotificationTemplate/{id}
  update(
    id: number,
    request: NotificationTemplateRequest,
  ): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}`, request);
  }
}