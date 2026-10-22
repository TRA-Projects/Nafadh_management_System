
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';

import { ExternalSystemHostComponent } from './external-system-host.component';
import { apiBaseUrlInterceptor } from './legacy/core/interceptors/api-base-url.interceptor';
import { authBearerInterceptor } from './legacy/core/interceptors/auth-bearer.interceptor';
import { httpErrorInterceptor } from './legacy/core/interceptors/http-error.interceptor';
import { AdminSystemApiService } from './legacy/core/api/services/admin-system-api.service';
import { IdentityAccessApiService } from './legacy/core/api/services/identity-access-api.service';
import { LocaleService } from './legacy/core/locale/locale.service';
import { AsyncExecutorService } from './legacy/core/ui/async-executor.service';
import { FormPipelineService } from './legacy/core/ui/form-pipeline.service';
import { adminSystemFeature } from './legacy/core/store/admin-system/admin-system.reducer';
import { identityAccessFeature } from './legacy/core/store/identity-access/identity-access.reducer';
import { localeFeature } from './legacy/core/store/locale/locale.reducer';
import { uiAsyncFeature } from './legacy/core/store/ui-async/ui-async.reducer';

const usersPage = () =>
  import('./pages/identity-access/admin-identity-users-page.component').then((m) => m.AdminIdentityUsersPageComponent);
const rolesPage = () =>
  import('./pages/identity-access/admin-identity-roles-page.component').then((m) => m.AdminIdentityRolesPageComponent);
const roleCreatePage = () =>
  import('./pages/identity-access/admin-identity-role-create-page.component').then((m) => m.AdminIdentityRoleCreatePageComponent);
const groupsPage = () =>
  import('./pages/identity-access/admin-identity-groups-page.component').then((m) => m.AdminIdentityGroupsPageComponent);
const groupCreatePage = () =>
  import('./pages/identity-access/admin-identity-group-create-page.component').then((m) => m.AdminIdentityGroupCreatePageComponent);
const groupEditPage = () =>
  import('./pages/identity-access/admin-identity-group-edit-page.component').then((m) => m.AdminIdentityGroupEditPageComponent);
const groupPagesPage = () =>
  import('./pages/identity-access/admin-identity-group-pages-page.component').then((m) => m.AdminIdentityGroupPagesPageComponent);


export const EXTERNAL_ROUTES: Routes = [
  {
    path: '',
    component: ExternalSystemHostComponent,
    providers: [
      provideHttpClient(
        withInterceptors([
          apiBaseUrlInterceptor,
          authBearerInterceptor,
          httpErrorInterceptor,
        ]),
      ),
      AdminSystemApiService,
      IdentityAccessApiService,
      AsyncExecutorService,
      FormPipelineService,
      LocaleService,
      provideState(adminSystemFeature),
      provideState(localeFeature),
      provideState(identityAccessFeature),
      provideState(uiAsyncFeature),
    ],
    children: [
      {
        path: 'constants',
        loadComponent: () =>
          import('./pages/system-administration/constants-manage-page.component')
            .then((m) => m.ConstantsManagePageComponent),
      },
      {
        path: 'system-configuration',
        loadComponent: () =>
          import('./pages/system-administration/system-configuration-page.component')
            .then((m) => m.SystemConfigurationPageComponent),
      },
      { path: 'identity', pathMatch: 'full', redirectTo: 'identity/users' },
      {
        path: 'identity/users',
        loadComponent: usersPage,
        data: { title: 'Users', titleAr: 'المستخدمون' },
      },
      {
        path: 'identity/roles',
        loadComponent: rolesPage,
        data: {
          title: 'Custom roles',
          titleAr: 'الأدوار المخصصة',
          rolesMode: 'custom',
        },
      },
      {
        path: 'identity/template-roles',
        loadComponent: rolesPage,
        data: {
          title: 'Template roles',
          titleAr: 'قوالب الأدوار',
          rolesMode: 'template',
        },
      },
      {
        path: 'identity/roles/create',
        loadComponent: roleCreatePage,
        data: { title: 'Create role', titleAr: 'إنشاء دور' },
      },
      {
        path: 'identity/roles/pages',
        loadComponent: groupPagesPage,
        data: { title: 'Role pages', titleAr: 'صفحات الدور' },
      },
      {
        path: 'identity/groups',
        loadComponent: groupsPage,
        data: { title: 'Groups', titleAr: 'المجموعات' },
      },
      {
        path: 'identity/groups/create',
        loadComponent: groupCreatePage,
        data: { title: 'Create group', titleAr: 'إنشاء مجموعة' },
      },
      {
        path: 'identity/groups/edit',
        loadComponent: groupEditPage,
        data: { title: 'Edit group', titleAr: 'تعديل المجموعة' },
      },
      {
        path: 'identity/groups/pages',
        loadComponent: groupPagesPage,
        data: { title: 'Group pages', titleAr: 'صفحات المجموعة' },
      },
    ],
  },
  {
    path: 'notification-templates/:id',
    providers: [
      provideState(adminSystemFeature),
      provideState(localeFeature),
    ],
    loadComponent: () =>
      import('./pages/system-administration/notification-templates-page.component')
        .then((m) => m.NotificationTemplatesPageComponent),
  },
];