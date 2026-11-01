import adminSystemAr from './admin-system/messages.ar.json';
import identityAccessAr from './identity-access/messages.ar.json';
import commonAr from './common/messages.ar.json';
import layoutAr from './layout/messages.ar.json';
import loginAr from './login/messages.ar.json';
import placeholderAr from './placeholder/messages.ar.json';
import registrationAr from './registration/messages.ar.json';
import customNotificationsAr from './custom-notifications/messages.ar.json';
import showcaseAr from './showcase/messages.ar.json';
import validationAr from './validation/messages.ar.json';

function extractMap(data: unknown): Record<string, string> {
  if (data && typeof data === 'object' && data !== null && 'translations' in data) {
    const t = (data as { translations?: unknown }).translations;
    if (t && typeof t === 'object' && !Array.isArray(t)) {
      return { ...(t as Record<string, string>) };
    }
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return { ...(data as Record<string, string>) };
  }
  return {};
}

/** Merged Arabic message map for `loadTranslations()` when persisted locale is `ar`. */
export function mergeArTranslations(): Record<string, string> {
  return {
    ...extractMap(validationAr),
    ...extractMap(registrationAr),
    ...extractMap(commonAr),
    ...extractMap(layoutAr),
    ...extractMap(loginAr),
    ...extractMap(placeholderAr),
    ...extractMap(adminSystemAr),
    ...extractMap(identityAccessAr),
    ...extractMap(customNotificationsAr),
    ...extractMap(showcaseAr),
  };
}
