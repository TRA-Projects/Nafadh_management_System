/// <reference types="@angular/localize" />

import { ValidationErrors } from '@angular/forms';

/**
 * Maps `AbstractControl.errors` to a single user-facing string (first match by priority).
 * Uses `$localize` so strings are extracted to `messages.*.json` and work with runtime Arabic.
 *
 * **Customize:** replace this function in a feature, use template `@if` branches, or add
 * field-specific messages by checking `control.path` before calling this.
 */
export function firstValidationMessage(errors: ValidationErrors | null): string | null {
  if (!errors) {
    return null;
  }

  const e = errors;

  if (e['required']) {
    return $localize`:@@validation.required:This field is required`;
  }
  if (e['email']) {
    return $localize`:@@validation.emailBuiltin:Enter a valid email address`;
  }
  if (e['invalidEmail']) {
    return $localize`:@@validation.invalidEmail:Enter a valid email address`;
  }
  if (e['backendError']) {
    return $localize`:@@validation.backendError:Could not verify this field`;
  }
  if (e['invalidName']) {
    return $localize`:@@validation.invalidName:Use letters and spaces only`;
  }
  if (e['passwordMinReq']) {
    return $localize`:@@validation.passwordMinReq:Password must include a special character and an uppercase letter`;
  }
  if (e['invalidPhone']) {
    return $localize`:@@validation.invalidPhone:Enter a valid phone number`;
  }
  if (e['requiredTrimmed']) {
    return $localize`:@@validation.requiredTrimmed:This field is required`;
  }
  if (e['checkRequired']) {
    return $localize`:@@validation.checkRequired:You must accept this`;
  }
  if (e['fileRequired']) {
    return $localize`:@@validation.fileRequired:Please select a file`;
  }
  if (e['invalidFileType']) {
    return $localize`:@@validation.invalidFileType:File type is not allowed`;
  }
  if (e['selectRequired']) {
    return $localize`:@@validation.selectRequired:Please make a selection`;
  }
  if (e['noItemsRequired']) {
    return $localize`:@@validation.noItemsRequired:Select at least one item`;
  }
  if (e['interviewEnrollmentUnmapped']) {
    return $localize`:@@validation.interviewEnrollmentUnmapped:Each selected applicant must match an interview candidate profile`;
  }
  if (e['duplicateCredentialTitle']) {
    return $localize`:@@validation.duplicateCredentialTitle:Another assessment already uses this title`;
  }
  if (e['credentialJobSeekersRequired']) {
    return $localize`:@@validation.credentialJobSeekersRequired:Please select at least one jobseeker`;
  }
  if (e['invalidCredentialJobSeeker']) {
    return $localize`:@@validation.invalidCredentialJobSeeker:One or more selected job seekers are not valid`;
  }
  if (e['credentialEnrollmentSchedulesIncomplete']) {
    return $localize`:@@validation.credentialEnrollmentSchedulesIncomplete:Each selected job seeker needs a date and time before saving.`;
  }
  if (e['credentialScheduleNotAllowed']) {
    return $localize`:@@validation.credentialScheduleNotAllowed:Scheduling is not available for this assessment status.`;
  }
  if (e['credentialJobSeekerValidationFailed']) {
    return $localize`:@@validation.credentialJobSeekerValidationFailed:Could not verify job seeker selection. Try again.`;
  }
  if (e['credentialSkillRatingsIncomplete']) {
    return $localize`:@@validation.credentialSkillRatingsIncomplete:Please rate all associated skills before submitting.`;
  }
  if (e['credentialPersonalRatingsIncomplete']) {
    return $localize`:@@validation.credentialPersonalRatingsIncomplete:Please rate all personal evaluation criteria before submitting.`;
  }
  if (e['credentialDefinitionTabsIncomplete']) {
    return $localize`:@@validation.credentialDefinitionTabsIncomplete:Please complete the required tabs before continuing.`;
  }
  if (e['invalidDate']) {
    return $localize`:@@validation.invalidDate:Enter a valid date`;
  }
  if (e['duplicateScheduleTime']) {
    return $localize`:@@validation.duplicateScheduleTime:This date and time is already used by another job seeker`;
  }
  if (e['duplicateInterviewOpportunity']) {
    return $localize`:@@validation.duplicateInterviewOpportunity:An interview record already exists for this opportunity`;
  }
  if (e['interviewSlotsIncomplete']) {
    return $localize`:@@validation.interviewSlotsIncomplete:Each selected applicant must have a date and time for the interview`;
  }
  if (e['interviewDatetimeInvalid']) {
    return $localize`:@@validation.interviewDatetimeInvalid:Enter a valid date and time`;
  }
  if (e['numberBelowRange']) {
    const min = (e['numberBelowRange'] as { min?: number })?.min;
    return min != null
      ? $localize`:@@validation.numberBelowRange:Value must be at least ${min}:min:`
      : $localize`:@@validation.numberBelowRangeGeneric:Value is too low`;
  }
  if (e['numberAboveSibling']) {
    return $localize`:@@validation.numberAboveSibling:Minimum cannot be greater than maximum.`;
  }
  if (e['numberBelowSibling']) {
    return $localize`:@@validation.numberBelowSibling:Maximum cannot be less than minimum.`;
  }
  if (e['invalidYear']) {
    const min = (e['invalidYear'] as { min?: number })?.min;
    const max = (e['invalidYear'] as { max?: number })?.max;
    if (min != null && max != null) {
      return $localize`:@@validation.invalidYearRange:Enter a year between ${min}:min: and ${max}:max:`;
    }
    return $localize`:@@validation.invalidYear:Enter a valid year`;
  }
  if (e['yearRangeOrder']) {
    return $localize`:@@validation.yearRangeOrder:End year must be on or after start year`;
  }
  if (e['invalidNumberFormat']) {
    return $localize`:@@validation.invalidNumberFormat:Enter a valid number`;
  }
  if (e['invalidNumberVal']) {
    return $localize`:@@validation.invalidNumberVal:Enter a non-zero value`;
  }
  if (e['invalidLink']) {
    return $localize`:@@validation.invalidLink:Enter a valid URL`;
  }
  if (e['earlierDate']) {
    return $localize`:@@validation.earlierDate:Date must be before the allowed limit`;
  }
  if (e['olderDate']) {
    return $localize`:@@validation.olderDate:Date must not be before the allowed limit`;
  }
  if (e['oneSelected']) {
    return $localize`:@@validation.oneSelected:Select at least one option`;
  }
  if (e['emailNotUnique']) {
    return $localize`:@@validation.emailNotUnique:This email is already registered`;
  }
  if (e['notUnique']) {
    return $localize`:@@validation.notUnique:This value is not allowed`;
  }
  if (e['alreadyRegistered']) {
    return $localize`:@@jobseeker.registration.civilLookupRegistered:This civil ID is already registered.`;
  }
  if (e['notFound']) {
    return $localize`:@@jobseeker.registration.civilLookupNotFound:No data found for this civil ID.`;
  }
  if (e['civilLookupFailed']) {
    return $localize`:@@jobseeker.registration.civilLookupFailed:Could not fetch civil ID details. Please try again.`;
  }
  if (e['invalidIdNumber']) {
    return $localize`:@@validation.invalidIdNumber:Enter a valid ID (5–12 digits)`;
  }
  if (e['richTextRequired']) {
    return $localize`:@@validation.richTextRequired:This field is required`;
  }
  if (e['mismatch']) {
    return $localize`:@@validation.mismatch:Values do not match`;
  }
  if (e['dateRangeOrder']) {
    return $localize`:@@validation.dateRangeOrder:End date must be on or after start date`;
  }
  if (e['seatDistributionMismatch']) {
    return $localize`:@@validation.seatDistributionMismatch:Seat distribution must match total openings`;
  }
  if (e['dateBefore']) {
    return $localize`:@@validation.dateBefore:Date must be before the related date`;
  }
  if (e['dateAfter']) {
    return $localize`:@@validation.dateAfter:Date must be after the related date`;
  }
  if (e['dateOnOrBefore']) {
    return $localize`:@@validation.dateOnOrBefore:Date is too late`;
  }
  if (e['dateOnOrAfter']) {
    return $localize`:@@validation.dateOnOrAfter:Please select a future date and time.`;
  }
  if (e['fileTooLarge']) {
    return $localize`:@@validation.fileTooLarge:File is too large`;
  }
  if (e['notificationChannelRequired']) {
    return $localize`:@@validation.notificationChannelRequired:Select at least one channel`;
  }
  if (e['notificationTargetRequired']) {
    return $localize`:@@validation.notificationTargetRequired:Select at least one user, group or organization`;
  }
  if (e['notificationSchedulePast']) {
    return $localize`:@@validation.notificationSchedulePast:The schedule time cannot be in the past`;
  }

  if (e['minlength']) {
    const x = e['minlength'] as { requiredLength: number; actualLength: number };
    return $localize`:@@validation.minlength:Enter at least ${x.requiredLength}:requiredLength: characters`;
  }
  if (e['maxlength']) {
    const x = e['maxlength'] as { requiredLength: number; actualLength: number };
    return $localize`:@@validation.maxlength:At most ${x.requiredLength}:requiredLength: characters`;
  }
  if (e['min']) {
    const x = e['min'] as { min: number; actual: number };
    return $localize`:@@validation.min:Minimum is ${x.min}:min:`;
  }
  if (e['max']) {
    const x = e['max'] as { max: number; actual: number };
    return $localize`:@@validation.max:Maximum is ${x.max}:max:`;
  }
  if (e['pattern']) {
    return $localize`:@@validation.pattern:Invalid format`;
  }

  return $localize`:@@validation.generic:Invalid value`;
}
