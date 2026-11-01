import { Injectable, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';

import { jobseekerProfileActions } from '../store/jobseeker-profile/jobseeker-profile.actions';
import { adminSystemActions } from '../store/admin-system/admin-system.actions';
import { registrationActions } from '../store/registration/registration.actions';
import { notificationsActions } from '../store/notifications/notifications.actions';
import { showcaseActions } from '../store/showcase/showcase.actions';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  clearAuthTokens,
  getAccessToken,
} from './auth-token.storage';
import { vendorTypeFromAccessToken, navVendorTypeFromProfileType } from './auth-jwt.util';
import { MOCK_USER_ID_STORAGE_KEY } from './mock-user.storage';
import { PROFILE_COMPLETION_PENDING_KEY } from './profile-completion-pending.storage';
import { EMAIL_VERIFICATION_PENDING_KEY } from './email-verification-pending.storage';
import { clearRegistrationStorage } from './registration.storage';
import { isFullMockBackend, isMockLoginEnabled } from '../environment/environment-flags';

const STORAGE_KEY = 'jobseeker_session';
/** Same string values as NAFADH JWT `VendorType` / sidebar `userType`. */
const VENDOR_TYPE_KEY = 'jobseeker_vendor_type';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly store = inject(Store);

  /** Mirrors session so UI updates on login/logout without full reload. */
  readonly loggedIn = signal(this.readSession());

  /**
   * Active persona for nav (`'0'` admin, `'1'` job seeker, `'2'|'4'` operator).
   */
  readonly vendorType = signal<string>(this.readVendorTypeFromStorage());

  readonly isAdminNav = computed(() => this.vendorType() === '0');
  readonly isOperatorNav = computed(() => {
    const v = this.vendorType();
    // 2 = SME, 4 = Operator company, 5 = company user (OUser), 6 = Staff.
    return v === '2' || v === '4' || v === '5' || v === '6';
  });
  readonly isJobSeekerNav = computed(() => this.vendorType() === '1');

  /**
   * When true, guards keep the job seeker on `/register/jobseeker/verify-email`
   * until email is confirmed (JWT may already exist).
   */
  readonly emailVerificationPending = signal(this.readEmailVerificationPending());

  /**
   * When true, {@link authGuard} keeps job seekers on `/complete-profile`
   * until the profile wizard is finished.
   */
  readonly profileCompletionPending = signal(this.readProfileCompletionPending());

  /** Default route after login / logo home (per role). */
  readonly homePath = computed(() => (this.vendorType() === '0' ? '/admin/users' : '/dashboard'));

  /** Header / “who am I” (admin / operator / job seeker). */
  readonly uiRoleLabel = computed(() => {
    const v = this.vendorType();
    if (v === '0') {
      return { en: 'Administrator', ar: 'مسؤول' };
    }
    if (v === '2' || v === '4') {
      return { en: 'Operator', ar: 'مشغّل' };
    }
    return { en: 'Job seeker', ar: 'باحث عن عمل' };
  });

  /** Breadcrumb title on the shared dashboard page. */
  readonly dashboardBreadcrumbLabel = computed(() => {
    const v = this.vendorType();
    if (v === '0') {
      return { en: 'Admin Dashboard', ar: 'لوحة الإدارة' };
    }
    if (v === '2' || v === '4') {
      return { en: 'Operator Dashboard', ar: 'لوحة المشغّل' };
    }
    return { en: 'Dashboard', ar: 'لوحة التحكم' };
  });

  isLoggedIn(): boolean {
    return this.loggedIn();
  }

  /**
   * Restore session after refresh when JWTs remain in storage (Freelancer `SignIn.init()` parity).
   */
  restoreSessionFromTokens(): void {
    if (isMockLoginEnabled() || isFullMockBackend() || this.loggedIn()) {
      return;
    }
    const token = getAccessToken();
    if (!token) {
      return;
    }
    const vt = navVendorTypeFromProfileType(vendorTypeFromAccessToken(token));
    if (vt == null) {
      return;
    }
    this.setLoggedIn(true, { vendorType: vt });
  }

  setEmailVerificationPending(value: boolean): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    if (value) {
      sessionStorage.setItem(EMAIL_VERIFICATION_PENDING_KEY, '1');
    } else {
      sessionStorage.removeItem(EMAIL_VERIFICATION_PENDING_KEY);
    }
    this.emailVerificationPending.set(value);
  }

  setProfileCompletionPending(value: boolean): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    if (value) {
      sessionStorage.setItem(PROFILE_COMPLETION_PENDING_KEY, '1');
    } else {
      sessionStorage.removeItem(PROFILE_COMPLETION_PENDING_KEY);
    }
    this.profileCompletionPending.set(value);
  }

  /**
   * Store JWTs like Freelancer `SignIn` (localStorage when remember-me, else sessionStorage).
   */
  persistTokens(accessToken: string, refreshToken: string, remember: boolean): void {
    clearAuthTokens();
    sessionStorage.removeItem(MOCK_USER_ID_STORAGE_KEY);
    if (remember) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  setLoggedIn(
    value: boolean,
    options?: {
      /** JWT `VendorType` string. */
      vendorType?: string;
      mockUserId?: string;
    }
  ): void {
    if (value) {
      sessionStorage.setItem(STORAGE_KEY, '1');
      if (options?.vendorType != null) {
        sessionStorage.setItem(VENDOR_TYPE_KEY, options.vendorType);
        this.vendorType.set(options.vendorType);
      } else if (!sessionStorage.getItem(VENDOR_TYPE_KEY)) {
        sessionStorage.setItem(VENDOR_TYPE_KEY, '1');
        this.vendorType.set('1');
      } else {
        this.vendorType.set(sessionStorage.getItem(VENDOR_TYPE_KEY)!);
      }
      if (options?.mockUserId) {
        sessionStorage.setItem(MOCK_USER_ID_STORAGE_KEY, options.mockUserId);
      } else {
        sessionStorage.removeItem(MOCK_USER_ID_STORAGE_KEY);
      }
      this.loggedIn.set(true);
    } else {
      clearAuthTokens();
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(VENDOR_TYPE_KEY);
      sessionStorage.removeItem(MOCK_USER_ID_STORAGE_KEY);
      this.vendorType.set('1');
      this.loggedIn.set(false);
      this.setEmailVerificationPending(false);
      this.setProfileCompletionPending(false);
      this.store.dispatch(jobseekerProfileActions.clearCache());
      this.store.dispatch(adminSystemActions.clearCache());
      this.store.dispatch(notificationsActions.clearCache());
      this.store.dispatch(showcaseActions.clearCache());
      this.store.dispatch(registrationActions.clearRegistration());
      clearRegistrationStorage();
    }
  }

  private readSession(): boolean {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  }

  private readVendorTypeFromStorage(): string {
    return sessionStorage.getItem(VENDOR_TYPE_KEY) ?? '1';
  }

  private readProfileCompletionPending(): boolean {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }
    return sessionStorage.getItem(PROFILE_COMPLETION_PENDING_KEY) === '1';
  }

  private readEmailVerificationPending(): boolean {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }
    return sessionStorage.getItem(EMAIL_VERIFICATION_PENDING_KEY) === '1';
  }
}
