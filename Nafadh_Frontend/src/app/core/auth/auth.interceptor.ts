
import {
  HttpInterceptorFn,
  HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  if (token && req.url.includes('/api/')) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // Maintenance Mode
      if (
        error.status === 503 &&
        req.url.includes('/api/')
      ) {
        router.navigate(['/maintenance'], {
          state: {
            message:
              error.error?.message ??
              'النظام تحت الصيانة حاليًا. يرجى المحاولة لاحقًا.'
          }
        });
      }

      return throwError(() => error);
    })
  );
};
