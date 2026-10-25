import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, delay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CompanyRegistrationRequest,
  CompanyRegistrationResponse,
} from '../models/company-registration.models';

// true = بيانات تجريبية (لين يجهز endpoint نورة). غيّريها إلى false عند الربط.
// في الوضع التجريبي: إيميل يحتوي dup => تكرار إيميل، cr9999 => تكرار سجل،
// pending => طلب قيد المراجعة، fail => فشل خادم. غير ذلك => نجاح.
export const REGISTRATION_USE_MOCK = true;

@Injectable({ providedIn: 'root' })
export class RegistrationApi {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/company-registration`;

  register(req: CompanyRegistrationRequest): Observable<CompanyRegistrationResponse> {
    if (REGISTRATION_USE_MOCK) return this.mock(req);
    return this.http.post<CompanyRegistrationResponse>(this.url, req);
  }

  private mock(req: CompanyRegistrationRequest): Observable<CompanyRegistrationResponse> {
    const fail = (status: number, error: object) =>
      throwError(() => new HttpErrorResponse({ status, error })).pipe(delay(700));

    if (req.email.includes('dup')) return fail(409, { code: 'DUPLICATE_EMAIL' });
    if (req.commercialRegister === '9999') return fail(409, { code: 'DUPLICATE_COMMERCIAL_REGISTER' });
    if (req.email.includes('pending')) return fail(409, { code: 'COMPANY_PENDING_APPROVAL' });
    if (req.email.includes('fail')) return fail(500, { message: 'Server error' });

    return of({
      message: 'تم استلام طلبك',
      companyId: 1,
      status: 'PendingApproval' as const,
    }).pipe(delay(700));
  }
}
