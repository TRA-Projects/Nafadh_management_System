import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';

import { unwrapData, type ApiData } from '../../profile/jobseeker-profile-api';
import { ApiPaths } from '../api-paths';
import type {
  IdentityAccessAccountRowDto,
  IdentityAccessPermissionDto,
} from '../models/identity-access.models';

export interface AuthSwitchTokens {
  AccessToken: string;
  RefreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthAccountsApiService {
  private readonly http = inject(HttpClient);

  getAccounts() {
    return this.http
      .get<ApiData<IdentityAccessAccountRowDto[]>>(ApiPaths.authAccounts)
      .pipe(map((body) => unwrapData(body) ?? []));
  }

  switchAccount(userId: string) {
    return this.http
      .post<ApiData<AuthSwitchTokens>>(ApiPaths.authSwitchAccount, { UserId: userId })
      .pipe(map(unwrapData));
  }

  getPermissions() {
    return this.http
      .get<ApiData<IdentityAccessPermissionDto>>(ApiPaths.authPermissions)
      .pipe(map((body) => unwrapData(body)));
  }
}
