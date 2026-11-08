
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { getRuntimeApiBaseUrl } from '../portals/admin/external-system/legacy/core/runtime-config';

export interface SystemVariableDto {
  id: number;
  variableKey: string;
  variableName: string;
  valueType: string;
  value: string;
  description?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SystemVariablesService {
  private readonly http = inject(HttpClient);
private readonly apiUrl =
  `${getRuntimeApiBaseUrl().replace(/\/$/, '')}/api/system-variables`;

  // جلب جميع إعدادات النظام
  getAllVariables(): Observable<SystemVariableDto[]> {
    return this.http.get<SystemVariableDto[]>(this.apiUrl);
  }

  // جلب إعداد معين
  getVariable(key: string): Observable<SystemVariableDto> {
    return this.http.get<SystemVariableDto>(
      `${this.apiUrl}/${encodeURIComponent(key)}`
    );
  }

  // تعديل قيمة إعداد من واجهة الأدمن
  updateVariable(
    key: string,
    value: string
  ): Observable<{
    message: string;
    variable: SystemVariableDto;
  }> {
    return this.http.put<{
      message: string;
      variable: SystemVariableDto;
    }>(
      `${this.apiUrl}/${encodeURIComponent(key)}`,
      { value }
    );
  }

  // الامتدادات المسموحة
  getAllowedExtensions(): Observable<string[]> {
    return this.getVariable('ATTACHMENT_ALLOWED_EXTENSIONS').pipe(
      map(variable =>
        variable.value
          .split(',')
          .map(extension =>
            extension.trim().replace(/^\./, '').toLowerCase()
          )
          .filter(Boolean)
      )
    );
  }

  // الحد الأقصى للمرفقات
  getMaxAttachmentSizeMb(): Observable<number> {
    return this.getVariable('ATTACHMENT_MAX_SIZE_MB').pipe(
      map(variable => {
        const size = Number(variable.value);

        if (!Number.isFinite(size) || size <= 0) {
          throw new Error('Invalid attachment size setting');
        }

        return size;
      })
    );
  }

  // جلب رسالة الخطأ من قاعدة البيانات
  getErrorMessage(key: string): Observable<string> {
    return this.getVariable(key).pipe(
      map(variable => variable.value)
    );
  }
}
