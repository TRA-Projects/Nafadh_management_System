import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, from, switchMap } from 'rxjs';

import { getAccessToken } from '../auth/auth-token.storage';
import { hasActiveMockUserSession, isFullMockBackend } from '../environment/environment-flags';

let cachedBiddingToken: string | null = null;
let cachedForNafadhToken: string | null = null;
let cachedExpiresAtMs = 0;
let pendingBiddingTokenPromise: Promise<string> | null = null;

function getBiddingSsoToken(nafadhToken: string): Promise<string> {
  const now = Date.now();
  if (
    cachedBiddingToken &&
    cachedForNafadhToken === nafadhToken &&
    now < cachedExpiresAtMs - 60_000
  ) {
    return Promise.resolve(cachedBiddingToken);
  }

  if (pendingBiddingTokenPromise && cachedForNafadhToken === nafadhToken) {
    return pendingBiddingTokenPromise;
  }

  cachedForNafadhToken = nafadhToken;
  pendingBiddingTokenPromise = fetch('https://localhost:7082/api/BiddingSso/token', {
    method: 'GET',
    headers: { Authorization: `Bearer ${nafadhToken}` }
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`SSO token failed: ${res.status}`);
      }
      const data: { token: string; expiresAtUtc?: string } = await res.json();
      cachedBiddingToken = data.token;
      cachedExpiresAtMs = data.expiresAtUtc
        ? new Date(data.expiresAtUtc).getTime()
        : Date.now() + 55 * 60_000;
      return data.token;
    })
    .finally(() => {
      pendingBiddingTokenPromise = null;
    });

  return pendingBiddingTokenPromise;
}

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
    // للطلبات المتجهة فقط إلى باكند المناقصات (58888) نستبدل التوكن بتوكن التوافق
    if (req.url.includes('localhost:58888')) {
      return from(getBiddingSsoToken(token)).pipe(
        switchMap((biddingToken) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${biddingToken}` } }))
        ),
        catchError(() => {
          cachedBiddingToken = null;
          cachedForNafadhToken = null;
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
        })
      );
    }

    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }

  if (hasActiveMockUserSession()) {
    return next(req.clone({ setHeaders: { Authorization: 'Bearer mock-dev-session' } }));
  }

  return next(req);
};