import { HttpClient } from '@angular/common/http';
import { extractApiErrorMessage } from '../api-error.util';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';

import { ApiPaths } from '../api-paths';
import type {
  CivilIdLookupResponse,
  RegisterJobseekerDto,
  RegisterJobseekerResponse,
  RequestRegistrationOtpResponse,
  VerifyRegistrationOtpResponse,
  VerifyJobseekerEmailResponse,
} from '../models/jobseeker-registration.models';
import { type ApiData, unwrapData } from '../../profile/jobseeker-profile-api';

interface V2MolLookupData {
  Name?: string;
  Name_en?: string;
  Name_ar?: string;
  MobileNumber?: string;
  PrimarySpecification_ar?: string;
}

interface V2JobseekerOtpData {
  SessionId?: string;
  OtpCode?: string;
  ExpiresInSeconds?: number;
}

interface ValidateRegistrationData {
  phone?: boolean;
  email?: boolean;
  refNumber?: boolean;
}

/** Read ASP.NET `Description` / `Message` from error responses. */
export function registrationApiErrorMessage(err: unknown): string | null {
  return extractApiErrorMessage(err);
}

@Injectable({ providedIn: 'root' })
export class JobseekerRegistrationHttpService {
  private readonly http = inject(HttpClient);

  private otpConfirmed = '';
  private lastOtp = '';
  private readonly civilLookupCache = new Map<string, CivilIdLookupResponse>();

  registerJobseeker(body: RegisterJobseekerDto): Observable<RegisterJobseekerResponse> {
    return this.http
      .post<ApiData<RegisterJobseekerResponse>>(ApiPaths.authRegisterJobseeker, {
        ...body,
        OTP: this.lastOtp,
        OtpConfirmed: this.otpConfirmed,
      })
      .pipe(timeout(15000), map(unwrapData));
  }

  validateRegistration(body: RegisterJobseekerDto): Observable<void> {
    return this.http.post<ApiData<{ ok?: boolean }>>(ApiPaths.authRegisterJobseekerValidate, body).pipe(
      timeout(10000),
      map(() => undefined)
    );
  }

  lookupCivilId(civilId: string): Observable<CivilIdLookupResponse> {
    const trimmed = civilId.trim();
    const availableFromMol = (mol: V2MolLookupData | null | undefined): CivilIdLookupResponse => {
      const cached = this.civilLookupCache.get(trimmed);
      const response: CivilIdLookupResponse = {
        Status: 'available',
        CivilId: trimmed,
        Name_en: mol?.Name_en?.trim() || mol?.Name?.trim() || cached?.Name_en,
        Name_ar: mol?.Name_ar?.trim() || cached?.Name_ar,
        MobileNumber: mol?.MobileNumber?.trim() || cached?.MobileNumber,
        PrimarySpecification_ar:
          mol?.PrimarySpecification_ar?.trim() || cached?.PrimarySpecification_ar,
      };
      this.civilLookupCache.set(trimmed, response);
      return response;
    };

    // Live Nafath/MOL often exceeds 15s from local/dev; keep below API HttpClient (60s).
    return this.http.get<ApiData<V2MolLookupData>>(ApiPaths.authRegisterJobseekerCivilLookup(trimmed)).pipe(
      timeout(55000),
      switchMap((molBody) => {
        const mol = unwrapData(molBody);
        return this.http
          .post<{ Data?: ValidateRegistrationData }>(ApiPaths.authRegisterValidation, {
            Email: '',
            PhoneNumber: '',
            refNumber: trimmed,
          })
          .pipe(
            timeout(15000),
            map((validationBody) => {
              const flags = validationBody?.Data ?? {};
              if (flags.refNumber) {
                return { Status: 'already_registered' as const, CivilId: trimmed };
              }
              return availableFromMol(mol);
            }),
            // Nafath succeeded — do not hide that if the "already registered?" check fails.
            catchError(() => of(availableFromMol(mol)))
          );
      }),
      catchError((err: unknown) => {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status?: unknown }).status)
            : NaN;
        // 404 from verify-with-mol → treat as not found (empty MOL payload).
        // 400/406 (failed fetch / inactive jobseeker) bubble to the UI with API message.
        if (status === 404) {
          return of({ Status: 'not_found' as const, CivilId: trimmed });
        }
        return throwError(() => err);
      })
    );
  }

  requestOtp(civilId: string, phoneNumber?: string, email?: string): Observable<RequestRegistrationOtpResponse> {
    const payload = {
      CivilId: civilId.trim(),
      PhoneNumber: phoneNumber?.trim() ?? '',
      Email: email?.trim() ?? '',
    };
    return this.http.post<ApiData<V2JobseekerOtpData>>(ApiPaths.authRegisterJobseekerOtpRequest, payload).pipe(
      timeout(10000),
      map((body) => {
        const data = unwrapData(body);
        this.otpConfirmed = String(data?.SessionId ?? '');
        return {
          SessionId: this.otpConfirmed,
          OtpCode: data?.OtpCode ? String(data.OtpCode) : undefined,
          ExpiresInSeconds: data?.ExpiresInSeconds ?? 300,
        };
      })
    );
  }

  verifyOtp(sessionId: string, otpCode: string): Observable<VerifyRegistrationOtpResponse> {
    const entered = otpCode.trim();
    const confirmed = (sessionId || this.otpConfirmed).trim();
    this.lastOtp = entered;
    return this.http
      .post<ApiData<VerifyRegistrationOtpResponse>>(ApiPaths.authRegisterJobseekerOtpVerify, {
        OTP: entered,
        OtpConfirmed: confirmed,
      })
      .pipe(timeout(5000), map((body) => unwrapData(body)));
  }

  verifyJobseekerEmail(email: string): Observable<VerifyJobseekerEmailResponse> {
    const trimmed = email.trim();
    return this.http
      .post<ApiData<VerifyJobseekerEmailResponse>>(ApiPaths.authRegisterJobseekerVerifyEmail, { Email: trimmed })
      .pipe(timeout(10000), map(unwrapData));
  }

  notifyProfileWizardComplete(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(ApiPaths.profileCompletionDone, {});
  }
}
