/** Local / dev: real ASP.NET Core API at Bidding_API (same auth as Freelancer module). */
export const environment = {
  production: false,
  /** When true, all API traffic is mocked in the interceptor. Default dev uses the real API. */
  useMockBackend: false,
  /** When true, login uses mock personas instead of `POST /api/v2/auth/login`. Keep false for DB login. */
  useMockLogin: false,
  /** Admin system administration lists use in-memory mock repository (no HTTP). */
  useAdminSystemMock: false,
  /** Job seeker profile completion wizard (`/api/jobseekers/jobseeker/…`) — C# until `useJobseekerProfileMock` intercepts. */
  useJobseekerProfileMock: false,
  apiBaseUrl: 'http://localhost:58888/',
  /** Optional MVC base for `Account/Register*` links from the Sign In modal. */
  freelancerMvcOrigin: '',
  /** AuthModule / TRA PKI gateway (RedirectToPkiSso). Overridden by runtime-config.json. */
  authModuleOrigin: 'https://nafadhpki.tra.gov.om',
};
