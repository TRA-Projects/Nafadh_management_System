
import '@angular/localize/init';
import { loadTranslations } from '@angular/localize';

import arabicMessages from './app/portals/admin/external-system/legacy/locale/messages.ar.json';
import adminSystemMessages from './app/portals/admin/external-system/legacy/core/translations/admin-system/messages.ar.json';
import commonMessages from './app/portals/admin/external-system/legacy/core/translations/common/messages.ar.json';

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { loadRuntimeConfig } from './app/portals/admin/external-system/legacy/core/runtime-config';

// Load Arabic translations before Angular starts.
loadTranslations({
  ...arabicMessages.translations,
  ...commonMessages.translations,
  ...adminSystemMessages.translations,
});

loadRuntimeConfig()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
