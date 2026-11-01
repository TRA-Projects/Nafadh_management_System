/** Match Freelancer `consumer.js` token keys for shared auth storage. */
export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';

export function clearAuthTokens(): void {
  for (const k of [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]) {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
}
