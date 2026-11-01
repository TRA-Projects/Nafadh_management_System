import { HttpInterceptorFn } from '@angular/common/http';
import { isFullMockBackend } from '../environment/environment-flags';
import { getRuntimeApiBaseUrl } from '../runtime-config';

/**
 * Prepends the runtime API base URL to relative API paths (e.g. `/api/jobseekers/...`).
 * Prefer `/runtime-config.json` (`apiBaseUrl`); falls back to `environment.apiBaseUrl`.
 */
export const apiBaseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (isFullMockBackend()) {
    return next(req);
  }
  if (/^https?:\/\//i.test(req.url)) {
    return next(req);
  }
  const base = getRuntimeApiBaseUrl().replace(/\/$/, '');
  const path = req.url.startsWith('/') ? req.url : `/${req.url}`;
  return next(req.clone({ url: `${base}${path}` }));
};
