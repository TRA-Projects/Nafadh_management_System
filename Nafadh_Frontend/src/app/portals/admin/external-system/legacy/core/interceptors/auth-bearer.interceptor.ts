import { HttpInterceptorFn } from '@angular/common/http';

import { getAccessToken } from '../auth/auth-token.storage';
import { hasActiveMockUserSession, isFullMockBackend } from '../environment/environment-flags';

/**
 * Public registration / bootstrap lookups must stay anonymous.
 * A leftover JWT (e.g. email-not-verified) would otherwise hit the onboarding gate
 * and 403 nationality / auth-settings calls on `/register/jobseeker`.
 */
function shouldSkipBearer(url: string, method: string): boolean {
  const path = url.replace(/^https?:\/\/[^/]+/i, '');
  const m = method.toUpperCase();

  if (path.includes('/api/v2/registration/') || path.includes('/api/jobseekers/auth/register/')) {
    return true;
  }

  // Registration form dropdowns (nationality, primary specification). Mutations stay authenticated.
  if (m === 'GET' && path.includes('/api/jobseekers/admin/system-config/values/')) {
    return true;
  }

  return false;
}

/** Attaches `Authorization: Bearer` for real API calls (same sources as Freelancer `consumer.js`). */
export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  if (isFullMockBackend()) {
    return next(req);
  }
  if (shouldSkipBearer(req.url, req.method)) {
    return next(req);
  }
  const token = getAccessToken();
  if (token) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  if (hasActiveMockUserSession()) {
    // Mock persona against real API: opaque token accepted when API `BypassJwtValidation` is true.
    return next(req.clone({ setHeaders: { Authorization: 'Bearer mock-dev-session' } }));
  }
  return next(req);
};
