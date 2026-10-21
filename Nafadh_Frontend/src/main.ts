
import '@angular/localize/init';
import { loadTranslations } from '@angular/localize';
import arabicMessages from './app/portals/admin/external-system/legacy/locale/messages.ar.json';

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Load Arabic translations before Angular starts.
loadTranslations(arabicMessages.translations);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
