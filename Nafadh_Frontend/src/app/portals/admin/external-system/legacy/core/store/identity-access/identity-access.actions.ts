import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type {
  IdentityAccessRolePagesDto,
  IdentityAccessRoleRowDto,
  IdentityAccessUserRowDto,
  IdentityAccessUserTypeDto,
} from '../../api/models/identity-access.models';
import type { PagedListResponse } from '../../api/models/paged-list.models';

export const identityAccessActions = createActionGroup({
  source: 'Identity Access',
  events: {
    'Cache Users Page': props<{ page: PagedListResponse<IdentityAccessUserRowDto> }>(),
    'User Group Changed': props<{ row: IdentityAccessUserRowDto }>(),
    'Cache Groups': props<{ groups: IdentityAccessUserTypeDto[] }>(),
    'Cache Roles Page': props<{ page: PagedListResponse<IdentityAccessRoleRowDto> }>(),
    'Cache Template Roles Page': props<{ page: PagedListResponse<IdentityAccessRoleRowDto> }>(),
    'Cache Role Pages': props<{ rolePages: IdentityAccessRolePagesDto }>(),
    'Clear Cache': emptyProps(),
  },
});
