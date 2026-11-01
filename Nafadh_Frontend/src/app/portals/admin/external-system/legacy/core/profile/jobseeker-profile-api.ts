import type { SocialState } from './jobseeker-profile.models';

/** Backend often wraps payloads in `{ Data: T }`. */
export type ApiData<T> = { Data: T };

export function unwrapData<T>(body: ApiData<T> | T): T {
  if (body && typeof body === 'object' && 'Data' in body) {
    return (body as ApiData<T>).Data as T;
  }
  return body as T;
}

export function emptySocial(): SocialState {
  return {
    linkedin: { val: '' },
    github: { val: '' },
    twitter: { val: '' },
    facebook: { val: '' },
  };
}

export interface SocialProfileRow {
  Id: number;
  /** Preferred key for matching to form fields (e.g. `linkedin`). */
  SocialProfileName?: string;
  SocialProfileUrl: string;
  /** Some backends use this instead of {@link SocialProfileName}. */
  SocialProfileType?: string;
}

/** Maps `GET profile/social-profile/:id` array to form state. */
export function socialArrayToState(rows: SocialProfileRow[]): SocialState {
  const s = emptySocial();
  for (const row of rows) {
    const raw = (row.SocialProfileName ?? row.SocialProfileType ?? '').trim();
    const key = raw.toLowerCase() as keyof SocialState;
    if (key in s) {
      s[key] = { id: row.Id, val: row.SocialProfileUrl };
    }
  }
  return s;
}

export function hasAnySocialId(social: SocialState): boolean {
  return Object.values(social).some((f) => f.id != null);
}
