import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map, timeout, tap } from 'rxjs/operators';

import { type ApiData, unwrapData } from '../../profile/jobseeker-profile-api';
import { ApiPaths } from '../api-paths';
import type { PlatformAuthSettings } from '../models/platform-auth-settings.models';

@Injectable({ providedIn: 'root' })
export class PlatformAuthSettingsService {
  private readonly http = inject(HttpClient);

  readonly settings = signal<PlatformAuthSettings | null>(null);
  readonly loaded = signal(false);

  readonly pkiEnabled = signal(false);
  readonly loginOtpEnabled = signal(false);
  readonly registrationSmsEnabled = signal(false);
  readonly registrationEmailEnabled = signal(false);

  load(): Observable<PlatformAuthSettings> {
    return this.http.get<ApiData<PlatformAuthSettings>>(ApiPaths.authSettings).pipe(
      timeout(8000),
      map(unwrapData),
      tap((s) => this.apply(s))
    );
  }

  private apply(data: PlatformAuthSettings): void {
    this.settings.set(data);
    this.pkiEnabled.set(data.PkiEnabled === true);
    this.loginOtpEnabled.set(data.LoginOtpEnabled === true);
    this.registrationSmsEnabled.set(data.RegistrationSmsEnabled === true);
    this.registrationEmailEnabled.set(data.RegistrationEmailEnabled === true);
    this.loaded.set(true);
  }
}
