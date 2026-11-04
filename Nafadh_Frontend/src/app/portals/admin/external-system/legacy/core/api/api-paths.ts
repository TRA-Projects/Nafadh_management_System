import { environment as managementEnvironment } from '../../../../../../../environments/environment';

/** This API family belongs to Management. */
const MANAGEMENT_REFERENCE_CONSTANTS =
  `${managementEnvironment.apiBaseUrl.replace(/\/api\/?$/, '')}/api/management/reference-constants`;

/** Nafadh_Backend API base URL. */
const NAFADH_API_BASE_URL = 'https://localhost:7082';

/** Evaluation Templates API. */
const NAFADH_EVALUATION_TEMPLATE =
/** Evaluation Templates API. */
const NAFADH_EVALUATION_TEMPLATE =
  `${NAFADH_API_BASE_URL}/api/EvaluationTemplate`;

/** Evaluation Criteria API. */
const NAFADH_EVALUATION_CRITERION =
  `${NAFADH_API_BASE_URL}/api/EvaluationCriterion`;

/** Programs API. */
const NAFADH_PROGRAM =
  `${NAFADH_API_BASE_URL}/api/Program`;

/** Modules API. */
const NAFADH_MODULE =
  `${NAFADH_API_BASE_URL}/api/Module`;

/** Announcements API. */
const NAFADH_ANNOUNCEMENT =
  `${NAFADH_API_BASE_URL}/api/Announcement`;

/** Notification Templates API. */
const NAFADH_NOTIFICATION_TEMPLATE =
  `${NAFADH_API_BASE_URL}/api/NotificationTemplate`;

/** Identity & Access belongs to Nafadh_Backend (no jobseekers / Bidding_API). */
const NAFADH_ADMIN_IDENTITY =
  `${managementEnvironment.apiBaseUrl.replace(/\/api\/?$/, '')}/api/admin/identity`;
/**
 * Single place for relative API paths.
 * Use these everywhere so mock + real use identical calls.
 */
export const API_ROOT = '/api/jobseekers';

export const ApiPaths = {
  health: '/api/jobseekers/health',

  jobseekerProfile: '/api/jobseekers/jobseeker/profile',

  /** Operator/admin: read another job seeker's general profile. */
  jobSeekerProfileByProfileId: (profileId: number) =>
    `/api/jobseekers/jobseeker/profile/${profileId}`,

  /** Mock-only: list of personas. */
  mockUsers: '/api/jobseekers/mock/users',

  // ── Announcements ─────────────────────────────────────────────

  announcement: NAFADH_ANNOUNCEMENT,

  announcementById: (id: number) =>
    `${NAFADH_ANNOUNCEMENT}/${id}`,

  // ── Authentication ────────────────────────────────────────────

  authRegisterJobseeker: '/api/v2/registration/register-jobseeker',

  authRegisterJobseekerValidate:
    '/api/v2/registration/register-jobseeker-validate',

  authRegisterJobseekerCivilLookup: (civilId: string) =>
    `/api/v2/registration/verify-with-mol/${encodeURIComponent(civilId)}`,

  authRegisterJobseekerOtpRequest:
    '/api/v2/registration/register-jobseeker-otp',

  authRegisterJobseekerOtpVerify:
    '/api/v2/registration/validate-registration-otp',

  authRegisterJobseekerVerifyEmail:
    '/api/v2/registration/register-jobseeker-verify-email',

  authRegisterValidation:
    '/api/v2/registration/validate-registeration',

  /** Mock-only registration routes. */
  authRegisterJobseekerMock:
    '/api/jobseekers/auth/register/jobseeker',

  authRegisterJobseekerCivilLookupMock: (civilId: string) =>
    `/api/jobseekers/auth/register/jobseeker/civil-lookup/${encodeURIComponent(civilId)}`,

  authRegisterJobseekerOtpRequestMock:
    '/api/jobseekers/auth/register/jobseeker/otp/request',

  authRegisterJobseekerOtpVerifyMock:
    '/api/jobseekers/auth/register/jobseeker/otp/verify',

  authRegisterJobseekerVerifyEmailMock:
    '/api/jobseekers/auth/register/jobseeker/verify-email',

  /** PKI registration uses authRegisterJobseeker + TempToken. */
  authRegisterJobseekerPki:
    '/api/v2/registration/register-jobseeker',

  profileCompletionDone:
    '/api/jobseekers/users/profile-completion-done',

  authSettings:
    '/api/v2/registration/auth-settings',

  authLogin:
    '/api/v2/auth/login',

  authStaffLogin:
    '/api/v2/auth/staff-login',

  authVerifyLogin:
    '/api/v2/auth/verify-login',

  authMe:
    '/api/v2/auth/me',

  authAccounts:
    '/api/v2/auth/accounts',

  authSwitchAccount:
    '/api/v2/auth/switch-account',

  authPermissions:
    '/api/v2/auth/permissions',

  authProfileById: (profileId: number) =>
    `/api/v2/auth/profiles/${profileId}`,

  authProfileSummaryById: (profileId: number) =>
    `/api/v2/auth/profiles/${profileId}/summary`,

  // ── Profile API ───────────────────────────────────────────────

  v2ProfileCities:
    '/api/v2/profile/City',

  v2ProfileServiceOffering:
    '/api/v2/profile/Service-offering',

  v2ProfileGeneralInfo:
    '/api/v2/profile/general-info',

  v2ProfileSocialRoot:
    '/api/v2/profile/social-profile',

  v2ProfileSocial: (profileId: number) =>
    `/api/v2/profile/social-profile/${profileId}`,

  v2ProfileUploadAvatar:
    '/api/v2/profile/upload-profile-avatar',

  v2ProfileImage: (imageId: string | number) =>
    `/api/v2/profile/Profile-image/${imageId}`,

  // ── Mock Profile API ───────────────────────────────────────────

  profileCities:
    '/api/jobseekers/profile/City',

  profileServiceOffering:
    '/api/jobseekers/profile/Service-offering',

  profileGeneralInfo:
    '/api/jobseekers/profile/general-info',

  profileGeneralInfoByProfileId: (profileId: number) =>
    `/api/jobseekers/profile/general-info/${profileId}`,

  attachmentDownload: (attachmentId: number) =>
    `/api/jobseekers/attachments/${attachmentId}/download`,

  profileSocialRoot:
    '/api/jobseekers/profile/social-profile',

  profileSocial: (profileId: number) =>
    `/api/jobseekers/profile/social-profile/${profileId}`,

  profileUploadAvatar:
    '/api/jobseekers/profile/upload-profile-avatar',

  profileImage: (imageId: string | number) =>
    `/api/jobseekers/profile/Profile-image/${imageId}`,

  suggestionsByCode: (code: string) =>
    `/api/jobseekers/suggestions?code=${encodeURIComponent(code)}`,

  // ── Profile Completion ────────────────────────────────────────

  jobseekerEducationRecords:
    '/api/jobseekers/profile-completion/education-records',

  jobseekerEducationRecord: (id: number) =>
    `/api/jobseekers/profile-completion/education-records/${id}`,

  jobseekerEducationDiplomaCertificate:
    '/api/jobseekers/profile-completion/education-diploma-certificate',

  jobseekerDiplomaMarksVerification:
    '/api/jobseekers/profile-completion/diploma-marks-verification',

  jobseekerPersistNafathDrafts:
    '/api/jobseekers/profile-completion/persist-nafath-drafts',

  jobseekerExperiences:
    '/api/jobseekers/profile-completion/experiences',

  jobseekerExperience: (id: number) =>
    `/api/jobseekers/profile-completion/experiences/${id}`,

  jobseekerCertificates:
    '/api/jobseekers/profile-completion/certificates',

  jobseekerCertificate: (id: number) =>
    `/api/jobseekers/profile-completion/certificates/${id}`,

  jobseekerTrainings:
    '/api/jobseekers/profile-completion/trainings',

  jobseekerTraining: (id: number) =>
    `/api/jobseekers/profile-completion/trainings/${id}`,

  jobseekerPortfolio:
    '/api/jobseekers/profile-completion/portfolio',

  jobseekerPortfolioItem: (id: number) =>
    `/api/jobseekers/profile-completion/portfolio/${id}`,

  jobseekerSelfRating:
    '/api/jobseekers/profile-completion/self-rating',

  // ── Jobs ──────────────────────────────────────────────────────

  jobsByProfile: (profileId: number) =>
    `/api/jobseekers/jobs/${profileId}`,

  jobsCategories:
    '/api/jobseekers/jobs/categories',

  jobsSkills:
    '/api/jobseekers/jobs/skills',

  jobsTechStacks:
    '/api/jobseekers/jobs/tech-stacks',

  jobsCompanies:
    '/api/jobseekers/jobs/companies',

  adminCompanies:
    '/api/jobseekers/admin/companies',

  adminCompanyByProfileId: (profileId: number) =>
    `/api/jobseekers/admin/companies/${profileId}`,

  adminCompanyVerify: (profileId: number) =>
    `/api/jobseekers/admin/companies/${profileId}/verify`,

  adminEducationRecords:
    '/api/jobseekers/admin/education-records',

  adminEducationRecordById: (id: number) =>
    `/api/jobseekers/admin/education-records/${id}`,

  adminDiplomaMarksVerifications:
    '/api/jobseekers/admin/diploma-marks-verifications',

  adminDiplomaMarksVerificationApprove: (id: number) =>
    `/api/jobseekers/admin/diploma-marks-verifications/${id}/approve`,

  adminDiplomaMarksVerificationById: (id: number) =>
    `/api/jobseekers/admin/diploma-marks-verifications/${id}`,
  /** Admin User Management → Jobseekers Directory */
  adminJobseekers: '/api/jobseekers/admin/jobseekers',

  adminJobseekerDecisionHistory: (profileId: number) =>
    `/api/jobseekers/admin/jobseekers/${profileId}/decision-history`,

  adminJobseekerCurrentSituation: (profileId: number) =>
    `/api/jobseekers/admin/jobseekers/${profileId}/current-situation`,

  adminJobseekerActivityOverview: (profileId: number) =>
    `/api/jobseekers/admin/jobseekers/${profileId}/activity-overview`,

  adminJobseekerOpportunityHistory: (profileId: number) =>
    `/api/jobseekers/admin/jobseekers/${profileId}/opportunity-history`,

  adminJobseekerEvaluationHistory: (profileId: number) =>
    `/api/jobseekers/admin/jobseekers/${profileId}/evaluation-history`,

  // Admin Identity & Access — Nafadh_Backend
  adminIdentityUsers: `${NAFADH_ADMIN_IDENTITY}/users`,

  adminIdentityUserGroup: (userId: string) =>
    `${NAFADH_ADMIN_IDENTITY}/users/${encodeURIComponent(userId)}/group`,

  adminIdentityUserAccounts: (userId: string) =>
    `${NAFADH_ADMIN_IDENTITY}/users/${encodeURIComponent(userId)}/accounts`,

  adminIdentityUser: (userId: string) =>
    `${NAFADH_ADMIN_IDENTITY}/users/${encodeURIComponent(userId)}`,

  adminIdentityGroups: `${NAFADH_ADMIN_IDENTITY}/groups`,

  adminIdentityGroup: (id: number) =>
    `${NAFADH_ADMIN_IDENTITY}/groups/${id}`,

  adminIdentityOrganizations: `${NAFADH_ADMIN_IDENTITY}/organizations`,

  adminIdentityPages: `${NAFADH_ADMIN_IDENTITY}/pages`,

  adminIdentityPageRequirements: (pageId: number) =>
    `${NAFADH_ADMIN_IDENTITY}/pages/${pageId}/requirements`,

  adminIdentityRoles: `${NAFADH_ADMIN_IDENTITY}/roles`,

  adminIdentityRole: (roleId: string) =>
    `${NAFADH_ADMIN_IDENTITY}/roles/${encodeURIComponent(roleId)}`,

  adminIdentityRolePages: (roleId: string) =>
    `${NAFADH_ADMIN_IDENTITY}/roles/${encodeURIComponent(roleId)}/pages`,

  jobsFind: '/api/jobseekers/jobs/find',

  jobsFindById: (jobId: number) =>
    `/api/jobseekers/jobs/find/${jobId}`,

  jobsList: '/api/jobseekers/jobs/list',

  jobsNominationEligible: '/api/jobseekers/jobs/nomination-eligible',

  jobsListJob: (jobId: number) =>
    `/api/jobseekers/jobs/list/${jobId}`,

  jobsEditorDraft: (jobId: number) =>
    `/api/jobseekers/jobs/${jobId}/editor-draft`,
  jobsOpportunityAttachment: (jobId: number, linkId?: number) =>
    linkId != null
      ? `/api/jobseekers/jobs/${jobId}/attachments/${linkId}`
      : `/api/jobseekers/jobs/${jobId}/attachments`,

  jobsScreeningQuestion: (jobId: number, questionId?: number) =>
    questionId != null
      ? `/api/jobseekers/jobs/${jobId}/screening-questions/${questionId}`
      : `/api/jobseekers/jobs/${jobId}/screening-questions`,

  jobsJobSeekersList:
    '/api/jobseekers/jobs/jobseekers',

  jobsJobSeekersSearch:
    '/api/jobseekers/jobs/jobseekers/search',

  jobsNominateJobSeeker: (id: number) =>
    `/api/jobseekers/jobs/jobseekers/${id}/nominate`,

  jobsWithdrawJobSeekerNomination: (id: number) =>
    `/api/jobseekers/jobs/jobseekers/${id}/withdraw-nomination`,

  jobsAskJobSeekerToApply: (id: number) =>
    `/api/jobseekers/jobs/jobseekers/${id}/ask-to-apply`,

  // ── Jobseeker Self-Service ─────────────────────────────────────

  jobseekerMeAskToApplyRequests:
    '/api/jobseekers/jobseeker/me/ask-to-apply-requests',

  jobseekerMeAskToApplyRequestReject: (requestId: number) =>
    `/api/jobseekers/jobseeker/me/ask-to-apply-requests/${requestId}/reject`,

  jobseekerMeSavedJobs:
    '/api/jobseekers/jobseeker/me/saved-jobs',

  jobseekerMeSavedJob: (jobId: number) =>
    `/api/jobseekers/jobseeker/me/saved-jobs/${jobId}`,

  jobseekerMeApplications:
    '/api/jobseekers/jobseeker/me/applications',

  jobseekerMeApplicationsOverview:
    '/api/jobseekers/jobseeker/me/applications/overview',

  jobseekerMeInterviews:
    '/api/jobseekers/jobseeker/me/interviews',

  jobseekerMeInterview: (interviewRecordId: string) =>
    `/api/jobseekers/jobseeker/me/interviews/${encodeURIComponent(interviewRecordId)}`,

  jobseekerMeCredentialAppointments:
    '/api/jobseekers/jobseeker/me/credential-appointments',

  jobseekerMeCredentialAppointment: (enrollmentId: string) =>
    `/api/jobseekers/jobseeker/me/credential-appointments/${encodeURIComponent(enrollmentId)}`,

  jobsJobApplications: (jobId: number) =>
    `/api/jobseekers/jobs/${jobId}/applications`,

  jobsJobApplication: (jobId: number, applicationId: number) =>
    `/api/jobseekers/jobs/${jobId}/applications/${applicationId}`,

  // ── System Administration ──────────────────────────────────────

  adminSystemVariables:
    '/api/jobseekers/admin/system-variables',

  adminSystemVariable: (variableKey: string) =>
    `/api/jobseekers/admin/system-variables/${encodeURIComponent(variableKey)}`,

  adminSystemConfigGroups:
    `${MANAGEMENT_REFERENCE_CONSTANTS}/groups`,

  adminSystemConfigValues: (code: string) =>
    `${MANAGEMENT_REFERENCE_CONSTANTS}/values/${encodeURIComponent(code)}`,

  adminSystemConfigValuesSearch: (code: string) =>
    `${MANAGEMENT_REFERENCE_CONSTANTS}/values/${encodeURIComponent(code)}/search`,

  adminSystemConfigValuesEnsure: (code: string) =>
    `${MANAGEMENT_REFERENCE_CONSTANTS}/values/${encodeURIComponent(code)}/ensure`,

  adminSystemConfigValue: (code: string, id: string | number) =>
    `${MANAGEMENT_REFERENCE_CONSTANTS}/values/${encodeURIComponent(code)}/${encodeURIComponent(String(id))}`,

  adminSkillCategories:
    '/api/jobseekers/admin/skill-categories',

  adminSkills:
    '/api/jobseekers/admin/skills',

  // ── Existing Jobseekers Notification Templates ─────────────────

  adminNotificationTemplates:
    '/api/jobseekers/admin/notification-templates',

  adminNotificationTemplate: (actionCode: string) =>
    `/api/jobseekers/admin/notification-templates/${encodeURIComponent(actionCode)}`,

  adminNotificationTemplatePlaceholders: (actionCode: string) =>
    `/api/jobseekers/admin/notification-templates/${encodeURIComponent(actionCode)}/placeholders`,

  adminNotificationTemplatePreview: (actionCode: string) =>
    `/api/jobseekers/admin/notification-templates/${encodeURIComponent(actionCode)}/preview`,

  // ── Nafadh Notification Templates ─────────────────────────────

  /** GET: Retrieve notification templates, with optional portalCode and type filters. */
  nafadhNotificationTemplates:
    NAFADH_NOTIFICATION_TEMPLATE,

  /** GET: Retrieve one notification template by ID. */
  nafadhNotificationTemplateById: (id: number) =>
    `${NAFADH_NOTIFICATION_TEMPLATE}/${id}`,

  /** POST: Create a notification template. */
  createNafadhNotificationTemplate:
    NAFADH_NOTIFICATION_TEMPLATE,

  /** PUT: Update an existing notification template. */
  updateNafadhNotificationTemplate: (id: number) =>
    `${NAFADH_NOTIFICATION_TEMPLATE}/${id}`,

  /** PATCH: Update notification template activation status. */
  updateNafadhNotificationTemplateStatus: (id: number) =>
    `${NAFADH_NOTIFICATION_TEMPLATE}/${id}/status`,

  /** POST: Send a test email (Development only). */
  testNafadhNotificationEmail:
    `${NAFADH_NOTIFICATION_TEMPLATE}/test-email`,

  // ── Evaluation Templates ───────────────────────────────────────

  /** GET: Retrieve evaluation templates with optional filters. */
  evaluationTemplates:
    `${NAFADH_EVALUATION_TEMPLATE}/GetTemplates`,

  /** GET: Retrieve one evaluation template and its criteria. */
  evaluationTemplateById: (templateId: number) =>
    `${NAFADH_EVALUATION_TEMPLATE}/GetTemplateById/${templateId}`,

  /** POST: Create an evaluation template. */
  createEvaluationTemplate:
    `${NAFADH_EVALUATION_TEMPLATE}/CreateTemplate`,

  /** PUT: Update an existing evaluation template. */
  updateEvaluationTemplate: (templateId: number) =>
    `${NAFADH_EVALUATION_TEMPLATE}/UpdateTemplate/${templateId}`,

  /** DELETE: Delete an evaluation template. */
  deleteEvaluationTemplate: (templateId: number) =>
    `${NAFADH_EVALUATION_TEMPLATE}/DeleteTemplate/${templateId}`,

  // ── Evaluation Criteria ────────────────────────────────────────

  /** GET: Retrieve all criteria belonging to an evaluation template. */
  evaluationCriteriaByTemplate: (templateId: number) =>
    `${NAFADH_EVALUATION_CRITERION}/GetCriteriaByTemplate/${templateId}`,

  /** GET: Retrieve one evaluation criterion by ID. */
  evaluationCriterionById: (criteriaId: number) =>
    `${NAFADH_EVALUATION_CRITERION}/GetCriterionById/${criteriaId}`,

  /** GET: Check whether the evaluation criteria weights are valid. */
  checkEvaluationWeights: (templateId: number) =>
    `${NAFADH_EVALUATION_CRITERION}/CheckWeights/${templateId}`,

  /** POST: Create an evaluation criterion. */
  createEvaluationCriterion:
    `${NAFADH_EVALUATION_CRITERION}/CreateCriterion`,

  /** PUT: Update an evaluation criterion. */
  updateEvaluationCriterion: (criteriaId: number) =>
    `${NAFADH_EVALUATION_CRITERION}/UpdateCriterion/${criteriaId}`,

  /** DELETE: Delete an evaluation criterion. */
  deleteEvaluationCriterion: (criteriaId: number) =>
    `${NAFADH_EVALUATION_CRITERION}/DeleteCriterion/${criteriaId}`,

  // ── Nafadh Programs & Modules ──────────────────────────────────

  /** GET /api/Program */
  nafadhPrograms:
    NAFADH_PROGRAM,

  /** GET /api/Module/program/{programId} */
  nafadhProgramModules: (programId: number) =>
    `${NAFADH_MODULE}/program/${programId}`,

  /** GET /api/Module/{id} */
  nafadhModuleById: (moduleId: number) =>
    `${NAFADH_MODULE}/${moduleId}`,

  // ── Audit Trail ───────────────────────────────────────────────

  adminAuditTrail:
    '/api/jobseekers/admin/audit-trail',

  adminAuditValueHistory:
    '/api/jobseekers/admin/audit-trail/value-history',

  // ── Custom Notifications ──────────────────────────────────────

  adminCustomNotifications:
    '/api/jobseekers/admin/custom-notifications',

  adminCustomNotification: (id: number | string) =>
    `/api/jobseekers/admin/custom-notifications/${encodeURIComponent(String(id))}`,

  adminCustomNotificationCancel: (id: number | string) =>
    `/api/jobseekers/admin/custom-notifications/${encodeURIComponent(String(id))}/cancel`,

  adminCustomNotificationsRecipientsPreview:
    '/api/jobseekers/admin/custom-notifications/recipients-preview',

  myNotifications:
    '/api/jobseekers/notifications',

  myNotificationsUnreadCount:
    '/api/jobseekers/notifications/unread-count',

  myNotificationRead: (id: number | string) =>
    `/api/jobseekers/notifications/${encodeURIComponent(String(id))}/read`,

  myNotificationsReadAll:
    '/api/jobseekers/notifications/read-all',

  adminNotificationTransactions:
    '/api/jobseekers/admin/notification-transactions',

  adminNotificationTransactionResend: (id: number | string) =>
    `/api/jobseekers/admin/notification-transactions/${encodeURIComponent(String(id))}/resend`,

  // ── Interview Management ───────────────────────────────────────

  interviewManagementRecords:
    '/api/jobseekers/admin/interview-management/records',

  interviewManagementJobseekerRows:
    '/api/jobseekers/admin/interview-management/jobseeker-rows',

  interviewManagementRecord: (id: string) =>
    `/api/jobseekers/admin/interview-management/records/${encodeURIComponent(id)}`,

  interviewManagementRecordSaveAndResend: (id: string) =>
    `/api/jobseekers/admin/interview-management/records/${encodeURIComponent(id)}/save-and-resend`,

  interviewManagementRegisterCandidates: (id: string) =>
    `/api/jobseekers/admin/interview-management/records/${encodeURIComponent(id)}/register`,

  interviewManagementEnrollmentOutcome: (recordId: string, candidateId: string) =>
    `/api/jobseekers/admin/interview-management/records/${encodeURIComponent(recordId)}/enrollments/${encodeURIComponent(candidateId)}/outcome`,

  interviewManagementRecruiterDecision: (id: string) =>
    `/api/jobseekers/admin/interview-management/records/${encodeURIComponent(id)}/recruiter-decision`,

  interviewManagementCandidates:
    '/api/jobseekers/admin/interview-management/candidates',

  interviewManagementEvaluations:
    '/api/jobseekers/admin/interview-management/evaluations',

  interviewManagementEnrollmentEvaluation: (enrollmentReference: string) =>
    `/api/jobseekers/admin/interview-management/enrollments/${encodeURIComponent(enrollmentReference)}/evaluation`,

  interviewManagementOpportunities:
    '/api/jobseekers/admin/interview-management/opportunities',

  interviewManagementInterviewers:
    '/api/jobseekers/admin/interview-management/interviewers',

  interviewApplicationDocuments: (profileId: number, jobId: number) =>
    `/api/jobseekers/interview-management/applications/${profileId}/${jobId}/documents`,

  // ── Employment Procedures ──────────────────────────────────────

  employmentProceduresRecords:
    '/api/jobseekers/admin/employment-procedures/records',

  employmentMyOffers:
    '/api/jobseekers/employment/my-offers',

  employmentMyOfferInquiryMessages: (recordId: string) =>
    `/api/jobseekers/employment/my-offers/${encodeURIComponent(recordId)}/inquiries`,

  employmentMyOfferSendInquiry: (recordId: string) =>
    `/api/jobseekers/employment/my-offers/${encodeURIComponent(recordId)}/inquiries/send`,

  employmentProceduresOfferPreparation: (recordId: string) =>
    `/api/jobseekers/admin/employment-procedures/records/${encodeURIComponent(recordId)}/offer-preparation`,

  employmentProceduresCreateDraftOffersFromInterview:
    '/api/jobseekers/admin/employment-procedures/records/from-interview-results',

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

  // ── Post-Employment Procedures ─────────────────────────────────

  postEmploymentRecords:
    '/api/jobseekers/admin/post-employment/records',

  postEmploymentRecord: (pepId: string) =>
    `/api/jobseekers/admin/post-employment/records/${encodeURIComponent(pepId)}`,

  postEmploymentTerminationReasons:
    '/api/jobseekers/admin/post-employment/termination-reasons',

  postEmploymentSkills:
    '/api/jobseekers/admin/post-employment/skills',

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

  // ── Withdrawal Requests ────────────────────────────────────────

  withdrawalRequests:
    '/api/jobseekers/withdrawal-requests',

  withdrawalRequestsByEpId: (epId: string) =>
    `/api/jobseekers/withdrawal-requests/by-ep/${encodeURIComponent(epId)}`,

  withdrawalRequestActiveByContractId: (contractId: string) =>
    `/api/jobseekers/withdrawal-requests/active/${encodeURIComponent(contractId)}`,

  withdrawalRequestWithdraw: (requestId: string) =>
    `/api/jobseekers/withdrawal-requests/${encodeURIComponent(requestId)}/withdraw`,

  withdrawalRequestUpdateStatus: (requestId: string) =>
    `/api/jobseekers/withdrawal-requests/${encodeURIComponent(requestId)}/status`,

  // ── Credential Management ──────────────────────────────────────

  credentialManagementHubSummary:
    '/api/jobseekers/admin/credential-management/hub-summary',

  credentialManagementHubDefinitions:
    '/api/jobseekers/admin/credential-management/hub-definitions',

  credentialManagementJobSeekers:
    '/api/jobseekers/admin/credential-management/jobseekers',

  credentialManagementEvaluations:
    '/api/jobseekers/admin/credential-management/evaluations',

  credentialManagementEvaluation: (id: string) =>
    `/api/jobseekers/admin/credential-management/evaluations/${encodeURIComponent(id)}`,

  credentialManagementEvaluationStatus: (id: string) =>
    `/api/jobseekers/admin/credential-management/evaluations/${encodeURIComponent(id)}/status`,

  credentialManagementExams:
    '/api/jobseekers/admin/credential-management/exams',

  credentialManagementExam: (id: string) =>
    `/api/jobseekers/admin/credential-management/exams/${encodeURIComponent(id)}`,

  credentialManagementExamStatus: (id: string) =>
    `/api/jobseekers/admin/credential-management/exams/${encodeURIComponent(id)}/status`,

  credentialManagementCourses:
    '/api/jobseekers/admin/credential-management/courses',

  credentialManagementCourse: (id: string) =>
    `/api/jobseekers/admin/credential-management/courses/${encodeURIComponent(id)}`,

  credentialManagementCourseStatus: (id: string) =>
    `/api/jobseekers/admin/credential-management/courses/${encodeURIComponent(id)}/status`,

  credentialManagementEnrollments:
    '/api/jobseekers/admin/credential-management/enrollments',

  credentialManagementEnrollmentSchedules:
    '/api/jobseekers/admin/credential-management/enrollments/schedule',

  credentialManagementEvaluationSendInvitations:
    '/api/jobseekers/admin/credential-management/evaluations/send-invitations',

  credentialManagementJobSeekersValidate:
    '/api/jobseekers/admin/credential-management/jobseekers/validate',

  credentialManagementEnrollmentStatus: (enrollmentId: string) =>
    `/api/jobseekers/admin/credential-management/enrollments/${encodeURIComponent(enrollmentId)}/status`,

  credentialManagementResults:
    '/api/jobseekers/admin/credential-management/results',

  credentialManagementResult: (enrollmentId: string) =>
    `/api/jobseekers/admin/credential-management/results/${encodeURIComponent(enrollmentId)}`,

  credentialManagementRejectedOffers: (enrollmentId: string) =>
    `/api/jobseekers/admin/credential-management/enrollments/${encodeURIComponent(enrollmentId)}/rejected-offers`,

  credentialManagementRejectedOffer: (enrollmentId: string, id: number) =>
    `/api/jobseekers/admin/credential-management/enrollments/${encodeURIComponent(enrollmentId)}/rejected-offers/${id}`,

  // ── Jobseeker Evaluation Portfolio ─────────────────────────────

  jobSeekerEvaluationPortfolio:
    '/api/jobseekers/admin/evaluation-portfolio/job-seekers',

  jobSeekerEvaluationPortfolioDetail: (profileId: number) =>
    `/api/jobseekers/admin/evaluation-portfolio/job-seekers/${profileId}`,

  jobseekerMyRecommendations:
    '/api/jobseekers/evaluation-portfolio/me/recommendations',

  adminJobseekerRecommendations: (profileId: number) =>
    `/api/jobseekers/admin/evaluation-portfolio/job-seekers/${profileId}/recommendations`,

  // ── Admin Dashboard ────────────────────────────────────────────

  adminDashboardSummary:
    '/api/jobseekers/admin/dashboard/summary',

  adminDashboardTrends:
    '/api/jobseekers/admin/dashboard/trends',

  adminDashboardJobSeekersBySpecialization:
    '/api/jobseekers/admin/dashboard/jobseekers-by-specialization',

  adminDashboardInterviewsByStatus:
    '/api/jobseekers/admin/dashboard/interviews-by-status',

  adminDashboardEmploymentByResponse:
    '/api/jobseekers/admin/dashboard/employment-by-response',

  adminDashboardTopCompanies:
    '/api/jobseekers/admin/dashboard/top-companies',

  adminDashboardJobSeekersByWilayat:
    '/api/jobseekers/admin/dashboard/jobseekers-by-wilayat',

  adminDashboardKpiOverview:
    '/api/jobseekers/admin/dashboard/kpi-overview',

  adminDashboardTopCompaniesByOpportunities:
    '/api/jobseekers/admin/dashboard/top-companies-by-opportunities',

  adminDashboardEvaluationOverview:
    '/api/jobseekers/admin/dashboard/evaluation-overview',

  adminDashboardEmploymentStatusOverview:
    '/api/jobseekers/admin/dashboard/employment-status-overview',

  adminDashboardJobSeekersByGovernorate:
    '/api/jobseekers/admin/dashboard/jobseekers-by-governorate',

  adminDashboardTrainingOverview:
    '/api/jobseekers/admin/dashboard/training-overview',

  adminDashboardContractOutcomes:
    '/api/jobseekers/admin/dashboard/contract-outcomes',

  adminDashboardOpportunityApplicantMatch:
    '/api/jobseekers/admin/dashboard/opportunity-applicant-match',

  adminDashboardExport:
    '/api/jobseekers/admin/dashboard/export',

  // ── Admin Reports ──────────────────────────────────────────────

  adminReportsPreview: (reportId: string) =>
    `/api/jobseekers/admin/reports/${encodeURIComponent(reportId)}/preview`,

  adminReportsExport: (reportId: string) =>
    `/api/jobseekers/admin/reports/${encodeURIComponent(reportId)}/export`,

  // ── Locations ─────────────────────────────────────────────────

  locationGovernorates:
    '/api/Location/GetAllGovernorates',

  locationWilayatsByGovernorate: (governorateId: number) =>
    `/api/Location/GetWilayatByGovernorateid/${governorateId}`,

  locationCitiesByWilayat: (wilayatId: number) =>
    `/api/Location/GetCityByWilayatid/${wilayatId}`,

  // ── Company Users ─────────────────────────────────────────────

  companyUsers:
    '/api/jobseekers/company-users',

  companyUser: (profileId: number) =>
    `/api/jobseekers/company-users/${profileId}`,

  companyUserDistributableRoles:
    '/api/jobseekers/company-users/distributable-roles',

  // ── Support ───────────────────────────────────────────────────

  supportClientErrorReport:
    '/api/jobseekers/support/client-error-report',

  // ── Showcase ──────────────────────────────────────────────────

  showcaseItems:
    '/api/v2/showcase/items',

  showcaseItem: (id: number) =>
    `/api/v2/showcase/items/${id}`,

} as const;