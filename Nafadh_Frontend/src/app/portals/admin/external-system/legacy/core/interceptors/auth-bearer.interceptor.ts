import { HttpInterceptorFn } from '@angular/common/http';

import { getAccessToken } from '../auth/auth-token.storage';
import { hasActiveMockUserSession, isFullMockBackend } from '../environment/environment-flags';

function shouldSkipBearer(url: string, method: string): boolean {
  const path = url.replace(/^https?:\/\/[^/]+/i, '');
  const m = method.toUpperCase();

  if (path.includes('/api/v2/registration/') || path.includes('/api/jobseekers/auth/register/')) {
    return true;
  }

  if (m === 'GET' && path.includes('/api/jobseekers/admin/system-config/values/')) {
    return true;
  }

  return false;
}

/** Attaches `Authorization: Bearer` for real API calls */
export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  if (isFullMockBackend()) {
    return next(req);
  }
  if (shouldSkipBearer(req.url, req.method)) {
    return next(req);
  }

  // 1. محاولة قراءة التوكن من جلسة نفاذ المسجلة
  let token: string | null = null;
  const nafadhSession = localStorage.getItem('nafadh_session');
  if (nafadhSession) {
    try {
      const parsed = JSON.parse(nafadhSession);
      token = parsed.token || parsed.accessToken || null;
    } catch {
      token = null;
    }
  }

  // 2. إذا لم يجد جلسة نفاذ، يجرب getAccessToken أو المفاتيح الأخرى
  if (!token) {
    const rawToken = getAccessToken();
    // تجاهل التوكن الوهمي eyJhbGciOiJub25l
    if (rawToken && !rawToken.startsWith('eyJhbGciOiJub25l')) {
      token = rawToken;
    } else {
      token = localStorage.getItem('token') || localStorage.getItem('access_token');
    }
  }

  if (token) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }

  if (hasActiveMockUserSession()) {
    return next(req.clone({ setHeaders: { Authorization: 'Bearer mock-dev-session' } }));
  }

  return next(req);
};