import { environment } from '../environments/environment';

/** Deploy-time overrides loaded from `/runtime-config.json` (editable on IIS without rebuild). */
export interface RuntimeConfig {
  apiBaseUrl?: string;
  /** Freelancer MVC host for `Account/Register*` (SME/operator) links. */
  freelancerMvcOrigin?: string;
  /**
   * AuthModule / TRA PKI gateway origin for `Integrations/RedirectToPkiSso`
   * (e.g. `https://nafadhpki.tra.gov.om` or local AuthModule URL).
   */
  authModuleOrigin?: string;
}

let loaded: RuntimeConfig | null = null;

function normalizeBaseUrl(url: string): string {
  const trimmed = (url ?? '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

/**
 * Fetches `/runtime-config.json` once before bootstrap.
 * Missing/invalid file falls back to `environment.*` (dev / baked prod defaults).
 */
export async function loadRuntimeConfig(): Promise<void> {
  try {
    const res = await fetch(`runtime-config.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      loaded = {};
      return;
    }
    const json = (await res.json()) as RuntimeConfig;
    loaded = json && typeof json === 'object' ? json : {};
  } catch {
    loaded = {};
  }
}

export function getRuntimeApiBaseUrl(): string {
  const fromFile = loaded?.apiBaseUrl?.trim();
  if (fromFile) {
    return normalizeBaseUrl(fromFile);
  }
  return normalizeBaseUrl(environment.apiBaseUrl ?? '');
}

export function getRuntimeFreelancerMvcOrigin(): string {
  const fromFile = loaded?.freelancerMvcOrigin;
  if (fromFile != null && String(fromFile).trim() !== '') {
    return String(fromFile).trim();
  }
  return (environment.freelancerMvcOrigin ?? '').trim();
}

/** AuthModule origin used to start PKI SSO (`/Integrations/RedirectToPkiSso`). */
export function getRuntimeAuthModuleOrigin(): string {
  const fromFile = loaded?.authModuleOrigin;
  if (fromFile != null && String(fromFile).trim() !== '') {
    return String(fromFile).trim();
  }
  const fromEnv = (environment as { authModuleOrigin?: string }).authModuleOrigin;
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    return String(fromEnv).trim();
  }
  // Fallback: historically PKI was pointed at freelancerMvcOrigin.
  return getRuntimeFreelancerMvcOrigin();
}
