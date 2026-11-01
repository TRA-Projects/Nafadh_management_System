import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { COMPLETE_PROFILE_PATH, VERIFY_EMAIL_PATH } from './post-login-destination.util';
import { readRegistrationEmail } from './registration.storage';

function pathOnly(url: string): string {
  return url.split('?')[0] ?? '';
}

function isCompleteProfilePath(path: string): boolean {
  return path === COMPLETE_PROFILE_PATH || path.startsWith(`${COMPLETE_PROFILE_PATH}/`);
}

function isVerifyEmailPath(path: string): boolean {
  return path === VERIFY_EMAIL_PATH || path.startsWith(`${VERIFY_EMAIL_PATH}/`);
}

/** Public marketing landing (`/landing`): skip if already authenticated. */
export const landingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    if (auth.isJobSeekerNav() && auth.emailVerificationPending()) {
      return router.parseUrl(VERIFY_EMAIL_PATH);
    }
    if (auth.isJobSeekerNav() && auth.profileCompletionPending()) {
      return router.parseUrl(COMPLETE_PROFILE_PATH);
    }
    return router.parseUrl(auth.homePath());
  }
  return true;
};

/** Require login for shell routes (dashboard, etc.). */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.isJobSeekerNav() && auth.emailVerificationPending()) {
    return router.parseUrl(VERIFY_EMAIL_PATH);
  }
  if (auth.isJobSeekerNav() && auth.profileCompletionPending()) {
    const path = pathOnly(state.url);
    if (!isCompleteProfilePath(path)) {
      return router.parseUrl(COMPLETE_PROFILE_PATH);
    }
  }
  return true;
};

/**
 * Routes only for **Administrator** (`VendorType` `0`) or **Operator** (`2` / `4`).
 * Job seekers and other roles are redirected to their {@link AuthService.homePath}.
 */
export const operatorOrAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.isAdminNav() || auth.isOperatorNav()) {
    return true;
  }
  return router.createUrlTree([auth.homePath()]);
};

/** System administration — **Administrator only** (`VendorType` `0`). */
export const adminOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.isAdminNav()) {
    return true;
  }
  return router.createUrlTree([auth.homePath()]);
};

/** Operator workspace only (`VendorType` `2` / `4`). Admins use `/admin/...` read-only routes instead. */
export const operatorOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.isOperatorNav()) {
    return true;
  }
  return router.createUrlTree([auth.homePath()]);
};

/** If already logged in, skip login page. */
export const loginGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const path = pathOnly(state.url);

  if (!auth.isLoggedIn()) {
    // Allow login/register while a registration session is open; only force the public
    // complete-profile route when they are already past verify and still pending (mock).
    if (auth.profileCompletionPending()) {
      const allowWhilePending =
        path.includes('/login') ||
        path.includes('/register/jobseeker') ||
        isVerifyEmailPath(path);
      if (!allowWhilePending && !path.includes('/register/jobseeker/complete-profile')) {
        return router.parseUrl('/register/jobseeker/complete-profile');
      }
    }
    return true;
  }

  // Unverified email still has a JWT (needed for verify-email APIs). Visiting /login
  // must clear that session so the user is not stuck bouncing off the login route.
  if (auth.isJobSeekerNav() && auth.emailVerificationPending()) {
    if (path.includes('/login')) {
      auth.setLoggedIn(false);
      return true;
    }
    return router.parseUrl(VERIFY_EMAIL_PATH);
  }

  if (auth.isJobSeekerNav() && auth.profileCompletionPending()) {
    if (!isCompleteProfilePath(path)) {
      return router.parseUrl(COMPLETE_PROFILE_PATH);
    }
    return true;
  }
  return router.parseUrl(auth.homePath());
};

/**
 * Email verification page — allowed when:
 * - logged in with email verification pending, or
 * - registration email is in session / legacy profile-completion pending (pre-login).
 */
export const registrationVerifyEmailGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    if (auth.isJobSeekerNav() && auth.emailVerificationPending()) {
      return true;
    }
    if (auth.isJobSeekerNav() && auth.profileCompletionPending()) {
      return router.parseUrl(COMPLETE_PROFILE_PATH);
    }
    return router.parseUrl(auth.homePath());
  }
  if (readRegistrationEmail() || auth.profileCompletionPending()) {
    return true;
  }
  return router.parseUrl('/register/jobseeker');
};

/** Public route for in-registration profile completion (before first login — mock-oriented). */
export const registrationProfileCompletionGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    if (auth.emailVerificationPending()) {
      return router.parseUrl(VERIFY_EMAIL_PATH);
    }
    return router.parseUrl(COMPLETE_PROFILE_PATH);
  }
  if (!auth.profileCompletionPending()) {
    return router.parseUrl('/register/jobseeker');
  }
  return true;
};

/**
 * Authenticated bare complete-profile wizard (no MainLayout).
 * Job seekers with pending completion stay here; completed seekers use `/profile`.
 */
export const completeProfileGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }
  if (!auth.isJobSeekerNav()) {
    return router.parseUrl(auth.homePath());
  }
  if (auth.emailVerificationPending()) {
    return router.parseUrl(VERIFY_EMAIL_PATH);
  }
  if (auth.profileCompletionPending()) {
    return true;
  }
  return router.parseUrl('/profile');
};
