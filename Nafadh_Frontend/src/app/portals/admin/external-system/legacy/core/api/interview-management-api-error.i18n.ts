/// <reference types="@angular/localize" />

import { extractApiErrorMessage } from './api-error.util';

const ENROLLMENTS_REQUIRED_ON_UPDATE =
  'At least one enrolled candidate is required when updating interview enrollments.';
const ENROLLMENTS_REQUIRED_BEFORE_SEND_RESULTS =
  'At least one enrolled candidate is required before sending results.';

/** Map known interview-management ASP.NET messages to localized copy. */
export function translateInterviewManagementApiError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return message;
  }

  if (trimmed === ENROLLMENTS_REQUIRED_ON_UPDATE) {
    return $localize`:@@jobseeker.interviewManagement.error.enrollmentsRequiredOnUpdate:At least one enrolled candidate is required when updating interview enrollments.`;
  }

  if (trimmed === ENROLLMENTS_REQUIRED_BEFORE_SEND_RESULTS) {
    return $localize`:@@jobseeker.interviewManagement.error.enrollmentsRequiredBeforeSendResults:At least one enrolled candidate is required before sending results.`;
  }

  return trimmed;
}

/** Extract API error text and localize known interview-management messages. */
export function interviewManagementErrorDisplay(err: unknown): string | null {
  const raw = extractApiErrorMessage(err);
  if (!raw) {
    return null;
  }
  return translateInterviewManagementApiError(raw);
}
