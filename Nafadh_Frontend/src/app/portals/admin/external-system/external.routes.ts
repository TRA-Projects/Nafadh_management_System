import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';

import { adminSystemFeature } from './legacy/core/store/admin-system/admin-system.reducer';
import { localeFeature } from './legacy/core/store/locale/locale.reducer';

export const EXTERNAL_ROUTES: Routes = [
  {
    path: 'constants',
    providers: [
      provideState(adminSystemFeature),
      provideState(localeFeature),
    ],
    loadComponent: () =>
      import('./pages/system-administration/constants-manage-page.component')
        .then((m) => m.ConstantsManagePageComponent),
  },
  {
    path: 'system-configuration',
    providers: [
      provideState(adminSystemFeature),
      provideState(localeFeature),
    ],
    loadComponent: () =>
      import('./pages/system-administration/system-configuration-page.component')
        .then((m) => m.SystemConfigurationPageComponent),
  },
  {
    path: 'notification-templates',
    providers: [
      provideState(adminSystemFeature),
      provideState(localeFeature),
    ],
    loadComponent: () =>
      import('./pages/system-administration/notification-templates-page.component')
        .then((m) => m.NotificationTemplatesPageComponent),
  },
];