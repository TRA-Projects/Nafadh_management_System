import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, throwError } from 'rxjs';

import { AppHttpError } from '../api/app-http-error';
import { AuthService } from '../auth/auth.service';
import { getAccessToken } from '../auth/auth-token.storage';
import {
  COMPLETE_PROFILE_PATH,
  VERIFY_EMAIL_PATH,
  isEmailNotVerifiedApiError,
  isProfileNotCompletedApiError,
} from '../auth/post-login-destination.util';
import { writeRegistrationContext } from '../auth/registration.storage';
import { ClientErrorReporter } from '../errors/client-error-reporter.service';
import { formatNetworkUnreachableUserMessage } from '../errors/support-ticket.util';
import { isFullMockBackend } from '../environment/environment-flags';
import { registrationActions } from '../store/registration/registration.actions';
import { uiAsyncActions } from '../store/ui-async/ui-async.actions';

export type { AppHttpError };

/** Prevents duplicate redirects when several API calls fail with 401 at once. */
let handlingUnauthorized = false;
let handlingEmailNotVerified = false;
let handlingProfileNotCompleted = false;

function isPublicAuthRequest(url: string): boolean {
  const path = url.toLowerCase();
  return (
    path.includes('/auth/login') ||
    path.includes('/auth/sign') ||
    path.includes('/auth/register') ||
    path.includes('/auth/forgot') ||
    path.includes('/auth/reset') ||
    path.includes('/register-jobseeker-verify-email') ||
    path.includes('/auth/me')
  );
}

function clearSessionAndRedirectToLogin(auth: AuthService, router: Router): void {
  if (handlingUnauthorized) {
    return;
  }
  handlingUnauthorized = true;
  auth.setLoggedIn(false);
  const onLogin = router.url.split('?')[0] === '/login';
  if (onLogin) {
    handlingUnauthorized = false;
    return;
  }
  void router.navigate(['/login']).finally(() => {
    handlingUnauthorized = false;
  });
}

function redirectToVerifyEmail(auth: AuthService, router: Router, store: Store, emailHint?: string): void {
  if (handlingEmailNotVerified) {
    return;
  }
  handlingEmailNotVerified = true;
  auth.setEmailVerificationPending(true);
  const email = (emailHint ?? '').trim().toLowerCase();
  if (email) {
    writeRegistrationContext(email, null);
    store.dispatch(registrationActions.setRegistrationContext({ email, mockUserId: null }));
  }
  const onVerify = router.url.split('?')[0] === VERIFY_EMAIL_PATH;
  if (onVerify) {
    handlingEmailNotVerified = false;
    return;
  }
  void router.navigateByUrl(VERIFY_EMAIL_PATH).finally(() => {
    handlingEmailNotVerified = false;
  });
}

function redirectToCompleteProfile(auth: AuthService, router: Router, store: Store): void {
  if (handlingProfileNotCompleted) {
    return;
  }
  handlingProfileNotCompleted = true;
  auth.setEmailVerificationPending(false);
  auth.setProfileCompletionPending(true);
  store.dispatch(uiAsyncActions.resetPending());
  const onComplete = router.url.split('?')[0] === COMPLETE_PROFILE_PATH;
  if (onComplete) {
    handlingProfileNotCompleted = false;
    return;
  }
  void router.navigateByUrl(COMPLETE_PROFILE_PATH).finally(() => {
    handlingProfileNotCompleted = false;
  });
}

function buildErrorCode(error: HttpErrorResponse): string | undefined {
  if (error.error && typeof error.error === 'object') {
    const body = error.error as Record<string, unknown>;
    for (const key of ['Code', 'code'] as const) {
      const value = body[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  return undefined;
}

function buildTicketId(error: HttpErrorResponse): string | undefined {
  if (error.error && typeof error.error === 'object') {
    const body = error.error as Record<string, unknown>;
    for (const key of ['TicketId', 'ticketId'] as const) {
      const value = body[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  return undefined;
}

function buildOccurredAtUtc(error: HttpErrorResponse): string | undefined {
  if (error.error && typeof error.error === 'object') {
    const body = error.error as Record<string, unknown>;
    for (const key of ['OccurredAtUtc', 'occurredAtUtc'] as const) {
      const value = body[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  return undefined;
}

function buildErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return formatNetworkUnreachableUserMessage();
  }

  if (typeof error.error === 'string' && error.error.trim()) {
    return error.error;
  }

  if (error.error && typeof error.error === 'object') {
    const body = error.error as Record<string, unknown>;
    for (const key of ['Description', 'Message', 'message', 'error'] as const) {
      const value = body[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }

  if (error.message?.trim()) {
    return error.message;
  }

  return `Request failed with status ${error.status}`;
}

/**
 * Normalizes API errors so components/services can handle one consistent shape.
 * UI notifications can be plugged in here later via an injected toast/snackbar service.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const store = inject(Store);
  const clientErrors = inject(ClientErrorReporter);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (
          error.status === 401 &&
          !isFullMockBackend() &&
          !isPublicAuthRequest(req.url) &&
          (getAccessToken() || auth.isLoggedIn())
        ) {
          clearSessionAndRedirectToLogin(auth, router);
        }

        const normalizedError: AppHttpError = {
          status: error.status,
          code: buildErrorCode(error),
          message: buildErrorMessage(error),
          details: error.error,
          ticketId: buildTicketId(error),
          occurredAtUtc: buildOccurredAtUtc(error),
        };

        if (error.status === 403 && !isFullMockBackend() && auth.isLoggedIn()) {
          if (isEmailNotVerifiedApiError(normalizedError)) {
            redirectToVerifyEmail(auth, router, store);
          } else if (isProfileNotCompletedApiError(normalizedError)) {
            redirectToCompleteProfile(auth, router, store);
          }
        }

        console.error('[HTTP Error]', req.method, req.url, normalizedError);
        return throwError(() => normalizedError);
      }

      let fallbackError: AppHttpError = {
        status: -1,
        message: 'An unexpected request error occurred.',
        details: error,
      };
      fallbackError = clientErrors.attachLocalTicket(fallbackError);
      clientErrors.reportNetworkFailure(fallbackError);
      console.error('[HTTP Error]', req.method, req.url, fallbackError);
      return throwError(() => fallbackError);
    })
  );
};
