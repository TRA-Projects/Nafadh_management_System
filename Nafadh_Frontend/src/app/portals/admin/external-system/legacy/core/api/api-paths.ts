/**
 * Single place for relative API paths. Use these everywhere so mock + real use identical calls.
 * Host/origin is applied once in `apiBaseUrlInterceptor` via runtime config / `environment.apiBaseUrl`
 * (e.g. `http://localhost:58888` + `/api/jobseekers/jobs/find`).
 */
export const API_ROOT = '/api/jobseekers';

export const ApiPaths = {
  health: '/api/jobseekers/health',
  jobseekerProfile: '/api/jobseekers/jobseeker/profile',
  /** Operator/admin: read another job seeker’s general profile (same `MeResponse` shape as `auth/me`). */
  jobSeekerProfileByProfileId: (profileId: number) => `/api/jobseekers/jobseeker/profile/${profileId}`,
  /** Mock-only: list of personas (see `assets/mocks/mock-users.json`). */
  mockUsers: '/api/jobseekers/mock/users',

  /** Normal jobseeker self-registration when `PKI_ENABLED` = N. */
  authRegisterJobseeker: '/api/v2/registration/register-jobseeker',
  authRegisterJobseekerValidate: '/api/v2/registration/register-jobseeker-validate',
  authRegisterJobseekerCivilLookup: (civilId: string) =>
    `/api/v2/registration/verify-with-mol/${encodeURIComponent(civilId)}`,
  authRegisterJobseekerOtpRequest: '/api/v2/registration/register-jobseeker-otp',
  authRegisterJobseekerOtpVerify: '/api/v2/registration/validate-registration-otp',
  authRegisterJobseekerVerifyEmail: '/api/v2/registration/register-jobseeker-verify-email',
  authRegisterValidation: '/api/v2/registration/validate-registeration',
  /** Mock-only registration routes (offline demo). */
  authRegisterJobseekerMock: '/api/jobseekers/auth/register/jobseeker',
  authRegisterJobseekerCivilLookupMock: (civilId: string) =>
    `/api/jobseekers/auth/register/jobseeker/civil-lookup/${encodeURIComponent(civilId)}`,
  authRegisterJobseekerOtpRequestMock: '/api/jobseekers/auth/register/jobseeker/otp/request',
  authRegisterJobseekerOtpVerifyMock: '/api/jobseekers/auth/register/jobseeker/otp/verify',
  authRegisterJobseekerVerifyEmailMock: '/api/jobseekers/auth/register/jobseeker/verify-email',
  /** PKI jobseeker registration uses `authRegisterJobseeker` + `TempToken` (not a separate endpoint). */
  authRegisterJobseekerPki: '/api/v2/registration/register-jobseeker',
  /** Final wizard confirm step — real API (validates profile in DB, returns ok). */
  profileCompletionDone: '/api/jobseekers/users/profile-completion-done',

  /** Public auth mode (`PKI_ENABLED` system variable). */
  authSettings: '/api/v2/registration/auth-settings',

  /** Normal email/password login when `PKI_ENABLED` = N. */
  authLogin: '/api/v2/auth/login',
  /** Internal staff password login (Admin/Operator/SME). Hidden route `/staff/login`. */
  authStaffLogin: '/api/v2/auth/staff-login',
  /** Complete staff OTP login when `LOGIN_OTP_ENABLED` = Y. */
  authVerifyLogin: '/api/v2/auth/verify-login',
  /** Current user (`auth/me`), shared with Freelancer / NAFADH profile APIs. */
  authMe: '/api/v2/auth/me',
  authAccounts: '/api/v2/auth/accounts',
  authSwitchAccount: '/api/v2/auth/switch-account',
  authPermissions: '/api/v2/auth/permissions',
  authProfileById: (profileId: number) => `/api/v2/auth/profiles/${profileId}`,
  /** MOL read-only snapshot (sidebar + education summary fields) — same as Freelancer `business.js`. */
  authProfileSummaryById: (profileId: number) => `/api/v2/auth/profiles/${profileId}/summary`,

  /** Shared profile API (`ProfileController`) — real backend when not in full mock mode. */
  v2ProfileCities: '/api/v2/profile/City',
  v2ProfileServiceOffering: '/api/v2/profile/Service-offering',
  v2ProfileGeneralInfo: '/api/v2/profile/general-info',
  v2ProfileSocialRoot: '/api/v2/profile/social-profile',
  v2ProfileSocial: (profileId: number) => `/api/v2/profile/social-profile/${profileId}`,
  v2ProfileUploadAvatar: '/api/v2/profile/upload-profile-avatar',
  v2ProfileImage: (imageId: string | number) => `/api/v2/profile/Profile-image/${imageId}`,

  /** Full-mock-only profile routes (offline demo; mirror v2 shape under `/api/jobseekers/profile/`). */
  profileCities: '/api/jobseekers/profile/City',
  profileServiceOffering: '/api/jobseekers/profile/Service-offering',
  profileGeneralInfo: '/api/jobseekers/profile/general-info',
  profileGeneralInfoByProfileId: (profileId: number) =>
    `/api/jobseekers/profile/general-info/${profileId}`,
  /** Stored attachment binary download (see `AttachmentDownloadService`). */
  attachmentDownload: (attachmentId: number) =>
    `/api/jobseekers/attachments/${attachmentId}/download`,
  profileSocialRoot: '/api/jobseekers/profile/social-profile',
  profileSocial: (profileId: number) => `/api/jobseekers/profile/social-profile/${profileId}`,
  profileUploadAvatar: '/api/jobseekers/profile/upload-profile-avatar',
  profileImage: (imageId: string | number) => `/api/jobseekers/profile/Profile-image/${imageId}`,

  /** Typeahead suggestions for free-text fields (e.g. education sub-specialty). */
  suggestionsByCode: (code: string) => `/api/jobseekers/suggestions?code=${encodeURIComponent(code)}`,

  /** Job seeker profile completion tabs — token-scoped (`ProfileId` claim); no profile id in URL. */
  jobseekerEducationRecords: '/api/jobseekers/profile-completion/education-records',
  jobseekerEducationRecord: (id: number) => `/api/jobseekers/profile-completion/education-records/${id}`,
  /** UAT-07 Education Enhancements — optional General Education Diploma supporting certificate. */
  jobseekerEducationDiplomaCertificate: '/api/jobseekers/profile-completion/education-diploma-certificate',
  jobseekerDiplomaMarksVerification: '/api/jobseekers/profile-completion/diploma-marks-verification',
  jobseekerPersistNafathDrafts: '/api/jobseekers/profile-completion/persist-nafath-drafts',
  jobseekerExperiences: '/api/jobseekers/profile-completion/experiences',
  jobseekerExperience: (id: number) => `/api/jobseekers/profile-completion/experiences/${id}`,
  jobseekerCertificates: '/api/jobseekers/profile-completion/certificates',
  jobseekerCertificate: (id: number) => `/api/jobseekers/profile-completion/certificates/${id}`,
  jobseekerTrainings: '/api/jobseekers/profile-completion/trainings',
  jobseekerTraining: (id: number) => `/api/jobseekers/profile-completion/trainings/${id}`,
  jobseekerPortfolio: '/api/jobseekers/profile-completion/portfolio',
  jobseekerPortfolioItem: (id: number) => `/api/jobseekers/profile-completion/portfolio/${id}`,
  jobseekerSelfRating: '/api/jobseekers/profile-completion/self-rating',

  /** Create job posting under operator/admin profile. */
  jobsByProfile: (profileId: number) => `/api/jobseekers/jobs/${profileId}`,
  jobsCategories: '/api/jobseekers/jobs/categories',
  jobsSkills: '/api/jobseekers/jobs/skills',
  jobsTechStacks: '/api/jobseekers/jobs/tech-stacks',
  jobsCompanies: '/api/jobseekers/jobs/companies',
  adminCompanies: '/api/jobseekers/admin/companies',
  adminCompanyByProfileId: (profileId: number) => `/api/jobseekers/admin/companies/${profileId}`,
  adminCompanyVerify: (profileId: number) => `/api/jobseekers/admin/companies/${profileId}/verify`,
  adminEducationRecords: '/api/jobseekers/admin/education-records',
  adminEducationRecordById: (id: number) => `/api/jobseekers/admin/education-records/${id}`,
  adminDiplomaMarksVerifications: '/api/jobseekers/admin/diploma-marks-verifications',
  adminDiplomaMarksVerificationApprove: (id: number) =>
    `/api/jobseekers/admin/diploma-marks-verifications/${id}/approve`,
  adminDiplomaMarksVerificationById: (id: number) =>
    `/api/jobseekers/admin/diploma-marks-verifications/${id}`,
  /** Admin User Management → Jobseekers Directory (Phase 1) — dedicated read path, not the Assessment
   *  evaluation-portfolio endpoint and not the Opportunities candidate-search endpoint. */
  adminJobseekers: '/api/jobseekers/admin/jobseekers',
  /** Admin only: a jobseeker's completed requests/decisions (rejected offers, approved withdrawals). */
  adminJobseekerDecisionHistory: (profileId: number) => `/api/jobseekers/admin/jobseekers/${profileId}/decision-history`,
  /** Admin only: a jobseeker's real current situation (employed / trainee / hiring / jobseeker). */
  adminJobseekerCurrentSituation: (profileId: number) => `/api/jobseekers/admin/jobseekers/${profileId}/current-situation`,
  /** Admin only: upcoming agenda + first pages of the opportunity and evaluation histories. */
  adminJobseekerActivityOverview: (profileId: number) => `/api/jobseekers/admin/jobseekers/${profileId}/activity-overview`,
  /** Admin only: one page of the opportunity history. */
  adminJobseekerOpportunityHistory: (profileId: number) => `/api/jobseekers/admin/jobseekers/${profileId}/opportunity-history`,
  /** Admin only: one page of the evaluation history (optional type / date filters). */
  adminJobseekerEvaluationHistory: (profileId: number) => `/api/jobseekers/admin/jobseekers/${profileId}/evaluation-history`,
  adminIdentityUsers: '/api/jobseekers/admin/identity/users',
  adminIdentityUserGroup: (userId: string) =>
    `/api/jobseekers/admin/identity/users/${encodeURIComponent(userId)}/group`,
  adminIdentityUserAccounts: (userId: string) =>
    `/api/jobseekers/admin/identity/users/${encodeURIComponent(userId)}/accounts`,
  adminIdentityUser: (userId: string) =>
    `/api/jobseekers/admin/identity/users/${encodeURIComponent(userId)}`,
  adminIdentityGroups: '/api/jobseekers/admin/identity/groups',
  adminIdentityGroup: (id: number) => `/api/jobseekers/admin/identity/groups/${id}`,
  adminIdentityOrganizations: '/api/jobseekers/admin/identity/organizations',
  adminIdentityPages: '/api/jobseekers/admin/identity/pages',
  adminIdentityPageRequirements: (pageId: number) =>
    `/api/jobseekers/admin/identity/pages/${pageId}/requirements`,
  adminIdentityRoles: '/api/jobseekers/admin/identity/roles',
  adminIdentityRole: (roleId: string) =>
    `/api/jobseekers/admin/identity/roles/${encodeURIComponent(roleId)}`,
  adminIdentityRolePages: (roleId: string) =>
    `/api/jobseekers/admin/identity/roles/${encodeURIComponent(roleId)}/pages`,
  jobsFind: '/api/jobseekers/jobs/find',
  jobsFindById: (jobId: number) => `/api/jobseekers/jobs/find/${jobId}`,
  jobsList: '/api/jobseekers/jobs/list',
  /** Published opportunities NOT owned by the caller — Operator "Nominate candidate" picker. */
  jobsNominationEligible: '/api/jobseekers/jobs/nomination-eligible',
  /** Operator/admin: update job list row (e.g. withdraw). */
  jobsListJob: (jobId: number) => `/api/jobseekers/jobs/list/${jobId}`,
  /** Operator/admin: load wizard state for editing a saved draft (mock + future API). */
  jobsEditorDraft: (jobId: number) => `/api/jobseekers/jobs/${jobId}/editor-draft`,
  jobsOpportunityAttachment: (jobId: number, linkId?: number) =>
    linkId != null
      ? `/api/jobseekers/jobs/${jobId}/attachments/${linkId}`
      : `/api/jobseekers/jobs/${jobId}/attachments`,
  jobsScreeningQuestion: (jobId: number, questionId?: number) =>
    questionId != null
      ? `/api/jobseekers/jobs/${jobId}/screening-questions/${questionId}`
      : `/api/jobseekers/jobs/${jobId}/screening-questions`,
  jobsJobSeekersList: '/api/jobseekers/jobs/jobseekers',
  jobsJobSeekersSearch: '/api/jobseekers/jobs/jobseekers/search',
  jobsNominateJobSeeker: (id: number) => `/api/jobseekers/jobs/jobseekers/${id}/nominate`,
  jobsWithdrawJobSeekerNomination: (id: number) => `/api/jobseekers/jobs/jobseekers/${id}/withdraw-nomination`,
  jobsAskJobSeekerToApply: (id: number) => `/api/jobseekers/jobs/jobseekers/${id}/ask-to-apply`,
  /** Job seeker: invitations to apply (mock + future API). */
  jobseekerMeAskToApplyRequests: '/api/jobseekers/jobseeker/me/ask-to-apply-requests',
  jobseekerMeAskToApplyRequestReject: (requestId: number) =>
    `/api/jobseekers/jobseeker/me/ask-to-apply-requests/${requestId}/reject`,
  /** Job seeker: saved jobs (paged list + save / unsave). */
  jobseekerMeSavedJobs: '/api/jobseekers/jobseeker/me/saved-jobs',
  jobseekerMeSavedJob: (jobId: number) => `/api/jobseekers/jobseeker/me/saved-jobs/${jobId}`,
  /** Job seeker: submitted applications list + submit. */
  jobseekerMeApplications: '/api/jobseekers/jobseeker/me/applications',
  /** Job seeker: aggregated application analytics for the dashboard (not paged). */
  jobseekerMeApplicationsOverview: '/api/jobseekers/jobseeker/me/applications/overview',
  /** Job seeker: own scheduled job interviews (appointment metadata only). */
  jobseekerMeInterviews: '/api/jobseekers/jobseeker/me/interviews',
  jobseekerMeInterview: (interviewRecordId: string) =>
    `/api/jobseekers/jobseeker/me/interviews/${encodeURIComponent(interviewRecordId)}`,
  /** Job seeker: own scheduled credential / assessment appointments (appointment metadata only). */
  jobseekerMeCredentialAppointments: '/api/jobseekers/jobseeker/me/credential-appointments',
  jobseekerMeCredentialAppointment: (enrollmentId: string) =>
    `/api/jobseekers/jobseeker/me/credential-appointments/${encodeURIComponent(enrollmentId)}`,
  /** Operator/admin: applications for one job. */
  jobsJobApplications: (jobId: number) => `/api/jobseekers/jobs/${jobId}/applications`,
  jobsJobApplication: (jobId: number, applicationId: number) =>
    `/api/jobseekers/jobs/${jobId}/applications/${applicationId}`,

  /** System administration (admin API; mock-backed in dev). */
  adminSystemVariables: '/api/jobseekers/admin/system-variables',
  adminSystemVariable: (variableKey: string) => `/api/jobseekers/admin/system-variables/${encodeURIComponent(variableKey)}`,
  adminSystemConfigValues: (code: string) => `/api/jobseekers/admin/system-config/values/${encodeURIComponent(code)}`,
  adminSystemConfigValuesSearch: (code: string) =>
    `/api/jobseekers/admin/system-config/values/${encodeURIComponent(code)}/search`,
  adminSystemConfigValuesEnsure: (code: string) =>
    `/api/jobseekers/admin/system-config/values/${encodeURIComponent(code)}/ensure`,
  adminSystemConfigValue: (code: string, id: string | number) =>
    `/api/jobseekers/admin/system-config/values/${encodeURIComponent(code)}/${encodeURIComponent(String(id))}`,
  adminSkillCategories: '/api/jobseekers/admin/skill-categories',
  adminSkills: '/api/jobseekers/admin/skills',
  adminNotificationTemplates: '/api/jobseekers/admin/notification-templates',
  adminNotificationTemplate: (actionCode: string) =>
    `/api/jobseekers/admin/notification-templates/${encodeURIComponent(actionCode)}`,
  adminNotificationTemplatePlaceholders: (actionCode: string) =>
    `/api/jobseekers/admin/notification-templates/${encodeURIComponent(actionCode)}/placeholders`,
  adminNotificationTemplatePreview: (actionCode: string) =>
    `/api/jobseekers/admin/notification-templates/${encodeURIComponent(actionCode)}/preview`,
  adminAuditTrail: '/api/jobseekers/admin/audit-trail',
  adminAuditValueHistory: '/api/jobseekers/admin/audit-trail/value-history',
  adminCustomNotifications: '/api/jobseekers/admin/custom-notifications',
  adminCustomNotification: (id: number | string) =>
    `/api/jobseekers/admin/custom-notifications/${encodeURIComponent(String(id))}`,
  adminCustomNotificationCancel: (id: number | string) =>
    `/api/jobseekers/admin/custom-notifications/${encodeURIComponent(String(id))}/cancel`,
  adminCustomNotificationsRecipientsPreview: '/api/jobseekers/admin/custom-notifications/recipients-preview',
  myNotifications: '/api/jobseekers/notifications',
  myNotificationsUnreadCount: '/api/jobseekers/notifications/unread-count',
  myNotificationRead: (id: number | string) =>
    `/api/jobseekers/notifications/${encodeURIComponent(String(id))}/read`,
  myNotificationsReadAll: '/api/jobseekers/notifications/read-all',
  adminNotificationTransactions: '/api/jobseekers/admin/notification-transactions',
  adminNotificationTransactionResend: (id: number | string) =>
    `/api/jobseekers/admin/notification-transactions/${encodeURIComponent(String(id))}/resend`,

  /** Interview Management (admin; mock-backed until real API). */
  interviewManagementRecords: '/api/jobseekers/admin/interview-management/records',
  interviewManagementJobseekerRows: '/api/jobseekers/admin/interview-management/jobseeker-rows',
  interviewManagementRecord: (id: string) => `/api/jobseekers/admin/interview-management/records/${encodeURIComponent(id)}`,
  interviewManagementRecordSaveAndResend: (id: string) =>
    `/api/jobseekers/admin/interview-management/records/${encodeURIComponent(id)}/save-and-resend`,
  interviewManagementRegisterCandidates: (id: string) =>
    `/api/jobseekers/admin/interview-management/records/${encodeURIComponent(id)}/register`,
  interviewManagementEnrollmentOutcome: (recordId: string, candidateId: string) =>
    `/api/jobseekers/admin/interview-management/records/${encodeURIComponent(recordId)}/enrollments/${encodeURIComponent(candidateId)}/outcome`,
  interviewManagementRecruiterDecision: (id: string) =>
    `/api/jobseekers/admin/interview-management/records/${encodeURIComponent(id)}/recruiter-decision`,
  interviewManagementCandidates: '/api/jobseekers/admin/interview-management/candidates',
  interviewManagementEvaluations: '/api/jobseekers/admin/interview-management/evaluations',
  interviewManagementEnrollmentEvaluation: (enrollmentReference: string) =>
    `/api/jobseekers/admin/interview-management/enrollments/${encodeURIComponent(enrollmentReference)}/evaluation`,
  interviewManagementOpportunities: '/api/jobseekers/admin/interview-management/opportunities',
  interviewManagementInterviewers: '/api/jobseekers/admin/interview-management/interviewers',
  /** Mock-backed: job seeker application uploads for conduct (profile + portal job). */
  interviewApplicationDocuments: (profileId: number, jobId: number) =>
    `/api/jobseekers/interview-management/applications/${profileId}/${jobId}/documents`,

  /** Employment Procedures (admin; mock-backed until real API). */
  employmentProceduresRecords: '/api/jobseekers/admin/employment-procedures/records',
  /** Self-service: logged-in jobseeker's own offers (profile id from JWT). */
  employmentMyOffers: '/api/jobseekers/employment/my-offers',
  employmentMyOfferInquiryMessages: (recordId: string) =>
    `/api/jobseekers/employment/my-offers/${encodeURIComponent(recordId)}/inquiries`,
  employmentMyOfferSendInquiry: (recordId: string) =>
    `/api/jobseekers/employment/my-offers/${encodeURIComponent(recordId)}/inquiries/send`,
  employmentProceduresOfferPreparation: (recordId: string) =>
    `/api/jobseekers/admin/employment-procedures/records/${encodeURIComponent(recordId)}/offer-preparation`,
  employmentProceduresCreateDraftOffersFromInterview: '/api/jobseekers/admin/employment-procedures/records/from-interview-results',
  employmentProceduresInquiryMessages: (recordId: string) =>
    `/api/jobseekers/admin/employment-procedures/records/${encodeURIComponent(recordId)}/inquiries`,
  employmentProceduresCandidateResponse: (recordId: string) =>
    `/api/jobseekers/admin/employment-procedures/records/${encodeURIComponent(recordId)}/candidate-response`,
  employmentProceduresContract: (recordId: string) =>
    `/api/jobseekers/admin/employment-procedures/records/${encodeURIComponent(recordId)}/contract`,
  employmentProceduresCancelContract: (recordId: string, contractId: string) =>
    `/api/jobseekers/admin/employment-procedures/records/${encodeURIComponent(recordId)}/contract/${encodeURIComponent(contractId)}/cancel`,
  employmentProceduresSendInquiry: (recordId: string) =>
    `/api/jobseekers/admin/employment-procedures/records/${encodeURIComponent(recordId)}/inquiries/send`,

  /** Post-Employment Procedures (admin; mock-backed until real API). */
  postEmploymentRecords: '/api/jobseekers/admin/post-employment/records',
  postEmploymentRecord: (pepId: string) =>
    `/api/jobseekers/admin/post-employment/records/${encodeURIComponent(pepId)}`,
  postEmploymentTerminationReasons: '/api/jobseekers/admin/post-employment/termination-reasons',
  postEmploymentSkills: '/api/jobseekers/admin/post-employment/skills',
  postEmploymentSaveEvaluation: (pepId: string) =>
    `/api/jobseekers/admin/post-employment/records/${encodeURIComponent(pepId)}/evaluation`,
  postEmploymentSubmitEvaluation: (pepId: string) =>
    `/api/jobseekers/admin/post-employment/records/${encodeURIComponent(pepId)}/evaluation/submit`,
  postEmploymentSaveTermination: (pepId: string) =>
    `/api/jobseekers/admin/post-employment/records/${encodeURIComponent(pepId)}/termination`,
  postEmploymentVoidTermination: (pepId: string) =>
    `/api/jobseekers/admin/post-employment/records/${encodeURIComponent(pepId)}/termination/void`,
  postEmploymentPeriodicEvaluations: (pepId: string) =>
    `/api/jobseekers/admin/post-employment/records/${encodeURIComponent(pepId)}/periodic-evaluations`,
  postEmploymentPeriodicEvaluation: (pepId: string, evalId: string) =>
    `/api/jobseekers/admin/post-employment/records/${encodeURIComponent(pepId)}/periodic-evaluations/${encodeURIComponent(evalId)}`,
  postEmploymentSubmitPeriodicEvaluation: (pepId: string, evalId: string) =>
    `/api/jobseekers/admin/post-employment/records/${encodeURIComponent(pepId)}/periodic-evaluations/${encodeURIComponent(evalId)}/submit`,
  postEmploymentAcknowledgePeriodicEvaluation: (pepId: string, evalId: string) =>
    `/api/jobseekers/admin/post-employment/records/${encodeURIComponent(pepId)}/periodic-evaluations/${encodeURIComponent(evalId)}/acknowledge`,

  // ── Withdrawal Requests (jobseeker-initiated; mock-backed until real API) ─────
  withdrawalRequests: '/api/jobseekers/withdrawal-requests',
  withdrawalRequestsByEpId: (epId: string) =>
    `/api/jobseekers/withdrawal-requests/by-ep/${encodeURIComponent(epId)}`,
  withdrawalRequestActiveByContractId: (contractId: string) =>
    `/api/jobseekers/withdrawal-requests/active/${encodeURIComponent(contractId)}`,
  withdrawalRequestWithdraw: (requestId: string) =>
    `/api/jobseekers/withdrawal-requests/${encodeURIComponent(requestId)}/withdraw`,
  withdrawalRequestUpdateStatus: (requestId: string) =>
    `/api/jobseekers/withdrawal-requests/${encodeURIComponent(requestId)}/status`,

  // ── Credential Management (admin; mock-backed until real API) ─────────────────
  credentialManagementHubSummary: '/api/jobseekers/admin/credential-management/hub-summary',
  credentialManagementHubDefinitions: '/api/jobseekers/admin/credential-management/hub-definitions',
  credentialManagementJobSeekers: '/api/jobseekers/admin/credential-management/jobseekers',
  credentialManagementEvaluations: '/api/jobseekers/admin/credential-management/evaluations',
  credentialManagementEvaluation: (id: string) =>
    `/api/jobseekers/admin/credential-management/evaluations/${encodeURIComponent(id)}`,
  credentialManagementEvaluationStatus: (id: string) =>
    `/api/jobseekers/admin/credential-management/evaluations/${encodeURIComponent(id)}/status`,
  credentialManagementExams: '/api/jobseekers/admin/credential-management/exams',
  credentialManagementExam: (id: string) => `/api/jobseekers/admin/credential-management/exams/${encodeURIComponent(id)}`,
  credentialManagementExamStatus: (id: string) =>
    `/api/jobseekers/admin/credential-management/exams/${encodeURIComponent(id)}/status`,
  credentialManagementCourses: '/api/jobseekers/admin/credential-management/courses',
  credentialManagementCourse: (id: string) =>
    `/api/jobseekers/admin/credential-management/courses/${encodeURIComponent(id)}`,
  credentialManagementCourseStatus: (id: string) =>
    `/api/jobseekers/admin/credential-management/courses/${encodeURIComponent(id)}/status`,
  credentialManagementEnrollments: '/api/jobseekers/admin/credential-management/enrollments',
  credentialManagementEnrollmentSchedules: '/api/jobseekers/admin/credential-management/enrollments/schedule',
  /** DELETE body: { enrollmentIds: string[] } — pending unscheduled seats only. */
  credentialManagementEvaluationSendInvitations:
    '/api/jobseekers/admin/credential-management/evaluations/send-invitations',
  credentialManagementJobSeekersValidate: '/api/jobseekers/admin/credential-management/jobseekers/validate',
  credentialManagementEnrollmentStatus: (enrollmentId: string) =>
    `/api/jobseekers/admin/credential-management/enrollments/${encodeURIComponent(enrollmentId)}/status`,
  credentialManagementResults: '/api/jobseekers/admin/credential-management/results',
  credentialManagementResult: (enrollmentId: string) =>
    `/api/jobseekers/admin/credential-management/results/${encodeURIComponent(enrollmentId)}`,
  credentialManagementRejectedOffers: (enrollmentId: string) =>
    `/api/jobseekers/admin/credential-management/enrollments/${encodeURIComponent(enrollmentId)}/rejected-offers`,
  credentialManagementRejectedOffer: (enrollmentId: string, id: number) =>
    `/api/jobseekers/admin/credential-management/enrollments/${encodeURIComponent(enrollmentId)}/rejected-offers/${id}`,

  /** Job seeker evaluation portfolio (admin / operator; mock-backed). */
  jobSeekerEvaluationPortfolio: '/api/jobseekers/admin/evaluation-portfolio/job-seekers',
  jobSeekerEvaluationPortfolioDetail: (profileId: number) =>
    `/api/jobseekers/admin/evaluation-portfolio/job-seekers/${profileId}`,
  /** Self-service: logged-in jobseeker's recommendations + skill highlights (profile from JWT). */
  jobseekerMyRecommendations: '/api/jobseekers/evaluation-portfolio/me/recommendations',
  /** Admin: recommendations + skills + completed reviews/scores for a selected jobseeker. */
  adminJobseekerRecommendations: (profileId: number) =>
    `/api/jobseekers/admin/evaluation-portfolio/job-seekers/${profileId}/recommendations`,

  // ── Admin dashboard (aggregate KPIs + charts; real API) ─────────────────────
  adminDashboardSummary: '/api/jobseekers/admin/dashboard/summary',
  adminDashboardTrends: '/api/jobseekers/admin/dashboard/trends',
  adminDashboardJobSeekersBySpecialization: '/api/jobseekers/admin/dashboard/jobseekers-by-specialization',
  adminDashboardInterviewsByStatus: '/api/jobseekers/admin/dashboard/interviews-by-status',
  adminDashboardEmploymentByResponse: '/api/jobseekers/admin/dashboard/employment-by-response',
  adminDashboardTopCompanies: '/api/jobseekers/admin/dashboard/top-companies',
  adminDashboardJobSeekersByWilayat: '/api/jobseekers/admin/dashboard/jobseekers-by-wilayat',
  adminDashboardKpiOverview: '/api/jobseekers/admin/dashboard/kpi-overview',
  adminDashboardTopCompaniesByOpportunities: '/api/jobseekers/admin/dashboard/top-companies-by-opportunities',
  adminDashboardEvaluationOverview: '/api/jobseekers/admin/dashboard/evaluation-overview',
  adminDashboardEmploymentStatusOverview: '/api/jobseekers/admin/dashboard/employment-status-overview',
  adminDashboardJobSeekersByGovernorate: '/api/jobseekers/admin/dashboard/jobseekers-by-governorate',
  adminDashboardTrainingOverview: '/api/jobseekers/admin/dashboard/training-overview',
  adminDashboardContractOutcomes: '/api/jobseekers/admin/dashboard/contract-outcomes',
  adminDashboardOpportunityApplicantMatch: '/api/jobseekers/admin/dashboard/opportunity-applicant-match',
  /** POST, `AdminDashboardExportRequest` body, `Blob` response (Excel or PDF). */
  adminDashboardExport: '/api/jobseekers/admin/dashboard/export',

  // ── Admin reports (R2; real API) ─────────────────────────────────────────────
  /** POST, `AdminReportsPreviewRequestDto`-shaped body → `{Code,Data: AdminReportsPreviewResultDto}`. */
  adminReportsPreview: (reportId: string) => `/api/jobseekers/admin/reports/${encodeURIComponent(reportId)}/preview`,
  /** R4: POST, `AdminReportsExportRequestDto`-shaped body → raw XLSX bytes (file response, not the
   *  usual {Code,Data} envelope) — same convention as `adminDashboardExport`. */
  adminReportsExport: (reportId: string) => `/api/jobseekers/admin/reports/${encodeURIComponent(reportId)}/export`,
  /** Shared cross-module catalog (`LocationController`), reused as-is for the Governorate filter's
   *  real options — not a new backend endpoint. */
  locationGovernorates: '/api/Location/GetAllGovernorates',
  /** UAT-07 Phase 6 — same `LocationController`, not a new backend endpoint. Route casing copied
   *  exactly from `LocationController.GetWilayatByGovernorateid`/`GetCityByWilayatid` (verified in
   *  the C# source, not guessed). */
  locationWilayatsByGovernorate: (governorateId: number) => `/api/Location/GetWilayatByGovernorateid/${governorateId}`,
  locationCitiesByWilayat: (wilayatId: number) => `/api/Location/GetCityByWilayatid/${wilayatId}`,

  /** Operator company users (list + register/update under the logged-in company). */
  companyUsers: '/api/jobseekers/company-users',
  companyUser: (profileId: number) => `/api/jobseekers/company-users/${profileId}`,
  companyUserDistributableRoles: '/api/jobseekers/company-users/distributable-roles',

  /** Client crash / network failure report → support ticket + email. */
  supportClientErrorReport: '/api/jobseekers/support/client-error-report',

  /** UI showcase sample records (in-memory mock on the API). */
  showcaseItems: '/api/v2/showcase/items',
  showcaseItem: (id: number) => `/api/v2/showcase/items/${id}`,
} as const;
