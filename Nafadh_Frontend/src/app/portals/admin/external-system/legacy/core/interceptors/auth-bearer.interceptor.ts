import { HttpInterceptorFn } from '@angular/common/http';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { getAccessToken } from '../auth/auth-token.storage';
import { hasActiveMockUserSession, isFullMockBackend } from '../environment/environment-flags';
import { handleNafadhIdentityMerge } from './nafadh-identity-bridge';

const BIDDING_SSO_URL = 'https://localhost:7082/api/BiddingSso/token';

let cachedBiddingToken: string | null = null;
let cachedBiddingTokenExp = 0;
let inflightSsoExchange: Promise<string | null> | null = null;

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

function readNafadhToken(): string | null {
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

  if (!token) {
    const rawToken = getAccessToken();
    if (rawToken && !rawToken.startsWith('eyJhbGciOiJub25l')) {
      token = rawToken;
    } else {
      token = localStorage.getItem('token') || localStorage.getItem('access_token');
    }
  }

  return token;
}

function isBiddingApiRequest(url: string): boolean {
  return url.includes('localhost:58888') || url.includes('/api/jobseekers/');
}

function getBiddingSsoToken(nafadhToken: string): Promise<string | null> {
  const now = Date.now();
  if (cachedBiddingToken && now < cachedBiddingTokenExp) {
    return Promise.resolve(cachedBiddingToken);
  }
  if (inflightSsoExchange) {
    return inflightSsoExchange;
  }

  inflightSsoExchange = fetch(BIDDING_SSO_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${nafadhToken}`,
      Accept: 'application/json',
    },
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const body = await res.json();
      const ssoToken =
        body?.token ?? body?.accessToken ?? body?.Data?.token ?? body?.data?.token ?? null;
      if (ssoToken) {
        cachedBiddingToken = ssoToken;
        cachedBiddingTokenExp = Date.now() + 50 * 60 * 1000;
      }
      return ssoToken;
    })
    .catch(() => null)
    .finally(() => {
      inflightSsoExchange = null;
    });

  return inflightSsoExchange;
}

/** Attaches `Authorization: Bearer` for real API calls and bridges Nafadh + Bidding Identity data */
export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  if (isFullMockBackend()) {
    return next(req);
  }
  if (shouldSkipBearer(req.url, req.method)) {
    return next(req);
  }

  const nafadhToken = readNafadhToken();

  // طلبات النظام الخارجي (58888): تبديل التوكن عبر الجسر + دمج بيانات الهوية والصلاحيات من الداتابيس الاثنين
  if (isBiddingApiRequest(req.url) && nafadhToken) {
    return from(getBiddingSsoToken(nafadhToken)).pipe(
      switchMap((biddingToken) => {
        const finalToken = biddingToken || nafadhToken;
        const authedReq = req.clone({
          setHeaders: { Authorization: `Bearer ${finalToken}` },
        });
        return handleNafadhIdentityMerge(authedReq, next, nafadhToken);
      }),
    );
  }

  if (nafadhToken) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${nafadhToken}` } }));
  }

  if (hasActiveMockUserSession()) {
    const mockReq = req.clone({ setHeaders: { Authorization: 'Bearer mock-dev-session' } });
    return isBiddingApiRequest(req.url)
      ? handleNafadhIdentityMerge(mockReq, next, null)
      : next(mockReq);
  }

  return isBiddingApiRequest(req.url)
    ? handleNafadhIdentityMerge(req, next, null)
    : next(req);
};