import { MOCK_USER_ID_STORAGE_KEY } from '../auth/mock-user.storage';

import { environment } from '../../environments/environment';



/** Full in-memory mock for every API route (GitLab Pages / offline demo). Interceptor-only. */

export function isFullMockBackend(): boolean {

  return environment.useMockBackend;

}



/** Mock persona picker + session identity. Interceptor-only. */

export function isMockLoginEnabled(): boolean {

  return environment.useMockLogin || environment.useMockBackend;

}



/** Admin system lists — intercept when true (or when full mock). Interceptor-only. */

export function isAdminSystemMockEnabled(): boolean {

  if (typeof environment.useAdminSystemMock === 'boolean') {

    return environment.useAdminSystemMock;

  }

  return environment.useMockBackend;

}



/** Job seeker profile completion + general-info mock routes. Interceptor-only. */

export function isJobseekerProfileMockEnabled(): boolean {

  if (typeof environment.useJobseekerProfileMock === 'boolean') {

    return environment.useJobseekerProfileMock;

  }

  return environment.useMockBackend;

}



export function isJobseekerProfileMockPath(path: string): boolean {

  return (
    /^\/api\/jobseekers\/profile-completion\/(education-records|experiences|certificates|trainings|portfolio)(\/|$)/.test(
      path
    ) ||
    path === '/api/jobseekers/profile/general-info'
  );

}



export function hasActiveMockUserSession(): boolean {

  return typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem(MOCK_USER_ID_STORAGE_KEY);

}


